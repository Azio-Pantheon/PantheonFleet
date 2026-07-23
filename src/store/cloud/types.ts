export interface CloudSite {
    site: string
    online: boolean
    printer_count: number
    last_heartbeat: string | null
    daemon_started_at: string | null
}

export interface CloudState {
    sites: CloudSite[]
    activeSite: string
}
