import store from '@/store'
import router from '@/plugins/router'
import axios from 'axios'
import { CloudSite } from '@/store/cloud/types'
import { isFleetCloud } from '@/plugins/cloudMode'

const POLL_INTERVAL_MS = 30_000

/**
 * Cloud-mode replacement for fleetDaemonClient (see FLEET_ONLINE_HANDOFF.md §5.5).
 *
 * Instead of a fleet_daemon WebSocket it polls the same-origin /api adapter
 * (Neon-backed) every 30s — but only while the tab is visible — and commits
 * the exact same farm-store payloads the WS handler builds today. The store
 * holds ONE site at a time; switching the site tab clears it and re-polls.
 */
class FleetCloudClient {
    private started = false
    private timer: ReturnType<typeof setInterval> | null = null
    private polling = false

    start() {
        if (this.started) return
        this.started = true

        installCloudInterceptors()

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.poll()
        })

        // Site tab switched: drop the old site's printers entirely (both sites
        // can own a cm4-01.local — never merge) and re-poll immediately.
        store.watch(
            () => store.state.cloud?.activeSite,
            () => {
                store.commit('farm/CLEAR_FLEET_DAEMON_PRINTERS')
                store.commit('gui/remoteprinters/reset')
                this.poll()
            }
        )

        this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS)
        this.poll()
    }

    stop() {
        this.started = false
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = null
        }
    }

    /** One polling cycle: refresh the site list + the active site's status. */
    async poll() {
        if (!this.started || this.polling) return
        if (document.visibilityState !== 'visible') return
        this.polling = true
        try {
            await this.fetchSites()
            const site = store.state.cloud?.activeSite
            if (site) await this.fetchStatus(site)
        } catch (e) {
            // 401s are handled by the axios interceptor (redirect to /login);
            // anything else (network blip, cold function) is retried next tick.
            console.warn('[FleetCloud] poll failed:', e)
            store.commit('farm/SET_FLEET_DAEMON_CONNECTED', false)
        } finally {
            this.polling = false
        }
    }

    private async fetchSites() {
        const response = await axios.get('/api/sites')
        const sites: CloudSite[] = response.data ?? []
        store.commit('cloud/setSites', sites)

        // Pick a default / repair a stale selection
        const active = store.state.cloud?.activeSite
        if (sites.length && !sites.some((s) => s.site === active)) {
            store.commit('cloud/setActiveSite', sites[0].site)
        }
    }

    private async fetchStatus(site: string) {
        const response = await axios.get('/api/status', { params: { site } })
        if (store.state.cloud?.activeSite !== site) return // tab switched mid-flight
        const { online, printers, remoteprinters } = response.data

        this.hydrateRemotePrinters(remoteprinters ?? {})

        const seen = new Set<string>()
        for (const printer of printers ?? []) {
            const hostname: string = printer.hostname
            if (!hostname) continue
            seen.add(hostname)

            const update = printer.payload ?? {}
            const meta = this.findRemotePrinterMeta(hostname)
            // Same payload shape the WS handler builds (fleetDaemonClient.ts)
            const printerData = {
                ...update,
                socket: {
                    hostname,
                    isConnected: true,
                    webPort: 80,
                    position: meta?.position ?? { x: 400, y: 400 },
                    printerModel: meta?.printerModel ?? printer.printer_model ?? null,
                },
                current_file: {
                    filename: update?.print_stats?.filename ?? '',
                },
                _namespace: hostname,
            }
            store.commit('farm/SET_FLEET_DAEMON_PRINTER', { hostname, data: printerData })
        }

        // Diff against the previous poll for removals
        for (const hostname of Object.keys(store.state.farm?.fleetDaemonPrinters ?? {})) {
            if (!seen.has(hostname)) store.commit('farm/REMOVE_FLEET_DAEMON_PRINTER', hostname)
        }

        // Site offline ⇒ tiles get the existing disconnected treatment
        store.commit('farm/SET_FLEET_DAEMON_CONNECTED', online === true)
    }

    /** Hydrate gui/remoteprinters (read-only) from the cloud mirror instead of the Moonraker DB. */
    private hydrateRemotePrinters(remoteprinters: Record<string, any>) {
        const current = store.state.gui?.remoteprinters?.printers ?? {}
        if (JSON.stringify(current) === JSON.stringify(remoteprinters)) return

        store.commit('gui/remoteprinters/reset')
        for (const [id, meta] of Object.entries(remoteprinters)) {
            store.commit('gui/remoteprinters/store', { id, values: meta })
        }
    }

    private findRemotePrinterMeta(hostname: string): any | null {
        const key = hostname.toLowerCase()
        for (const printer of Object.values(store.state.gui?.remoteprinters?.printers ?? {})) {
            if ((printer as any).hostname?.toLowerCase() === key) return printer
        }
        return null
    }
}

let interceptorsInstalled = false

/**
 * Global axios wiring for cloud mode:
 * - append `site=<active>` to /api GETs that don't already carry one, so the
 *   existing fleet store actions (history/analytics/spools) work unchanged
 * - on any /api 401, route to the login page
 */
function installCloudInterceptors() {
    if (interceptorsInstalled || !isFleetCloud) return
    interceptorsInstalled = true

    const SITELESS = ['/api/sites', '/api/status', '/api/login', '/api/history/inspectors', '/api/spool/lookup']

    axios.interceptors.request.use((config) => {
        const url = config.url ?? ''
        if (url.startsWith('/api/') && !SITELESS.some((p) => url.startsWith(p))) {
            const u = new URL(url, window.location.origin)
            const site = store.state.cloud?.activeSite
            if (site && !u.searchParams.has('site')) {
                u.searchParams.set('site', site)
                config.url = u.pathname + '?' + u.searchParams.toString()
            }
        }
        return config
    })

    axios.interceptors.response.use(
        (response) => response,
        (error) => {
            const status = error?.response?.status
            const url: string = error?.config?.url ?? ''
            if (status === 401 && url.startsWith('/api/') && !url.startsWith('/api/login')) {
                if (router.currentRoute.path !== '/login') router.push('/login').catch(() => undefined)
            }
            return Promise.reject(error)
        }
    )
}

/** Singleton instance */
export const fleetCloudClient = new FleetCloudClient()
