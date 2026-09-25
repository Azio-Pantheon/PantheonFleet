/**
 * Fleet-worker state as carried in each printer's daemon payload
 * (`fleet_worker`, written by fleet_job_scheduler every tick and projected by
 * fleet_manager._project_for_broadcast). Present on both transports: the local
 * daemon WebSocket and the cloud /api/status poll (Neon cloud_fleet_status).
 */
export interface FleetWorkerBlock {
    enabled: boolean
    eligible: boolean
    reason: string | null
    evaluated_at: number | null
}

export function workerBlock(printer: any): FleetWorkerBlock | null {
    const w = printer?.fleet_worker
    return w && typeof w === 'object' ? (w as FleetWorkerBlock) : null
}

/** Enabled worker that could take a job but is held back by something an
 *  operator can fix on the spot: not primed, or not enough filament.
 *  Same rule as the Jobs → Workers panel in the on-site Mainsail. */
export function printerNeedsAttention(printer: any): boolean {
    const w = workerBlock(printer)
    if (!w?.enabled || printer?.fleet_to_printer_ws === false) return false
    const r = (w.reason || '').toLowerCase()
    return r.startsWith('not primed') || (r.startsWith('filament') && r.includes('needed')) || r.startsWith('remaining_weight unknown')
}

/** Hostnames currently enabled as fleet workers. */
export function enabledWorkerHostnames(printers: Record<string, any>): string[] {
    return Object.entries(printers)
        .filter(([, p]) => workerBlock(p)?.enabled)
        .map(([h]) => h)
}

/** Hostnames of workers that need attention (see printerNeedsAttention). */
export function attentionWorkerHostnames(printers: Record<string, any>): string[] {
    return Object.entries(printers)
        .filter(([, p]) => printerNeedsAttention(p))
        .map(([h]) => h)
}

/** hostname -> scheduler reason, for map tooltips and sticker titles. */
export function attentionWorkerReasons(printers: Record<string, any>): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [h, p] of Object.entries(printers)) {
        const reason = workerBlock(p)?.reason
        if (printerNeedsAttention(p) && reason) out[h] = reason
    }
    return out
}

/** Hover text for a "N need attention" chip: `host: reason` per worker, or what the chip means when 0. */
export function attentionChipTitle(hostnames: string[], reasons: Record<string, string>): string {
    if (!hostnames.length) return 'Workers that could run a job but are blocked by low filament or not primed'
    return hostnames.map((h) => (reasons[h] ? `${h}: ${reasons[h]}` : h)).join('\n')
}
