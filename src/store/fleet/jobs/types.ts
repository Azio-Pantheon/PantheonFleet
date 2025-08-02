export interface FleetJobsState {
    jobs: FleetJob[]
    customers: FleetCustomer[]
    loading: boolean
    queueStatus?: { [gcodeId: string]: FleetGcodeQueueStatus }  // NEW: Track queue status for each gcode
}

export interface FleetJob {
    id: string
    customer_id: string
    name: string
    operator_name?: string
    description?: string
    job_type: string
    priority: string
    status: string
    ready_to_ship: boolean
    shipped: boolean
    fulfilled_date?: string
    due_date?: string
    finished_date?: string
    created_at: string
    updated_at: string
}

export interface FleetCustomer {
    id: string
    name: string
    notes?: string
    created_at: string
    updated_at: string
}

export interface FleetJobGcode {
    id: string
    job_id: string
    gcode_filename: string
    required_runs: number
    preferred_printer: string
    filament_type: string
    created_at: string
    queue_status?: FleetGcodeQueueStatus | null  // UPDATED: Add optional queue status
}


export interface FleetJobGcodeRun {
    id: string
    job_gcode_id: string
    printer_hostname: string
    started_at: string
    completed_at?: string
    status: string  // 'in_progress', 'success', 'fail', 'cancelled'
    moonraker_job_id?: string
    notes?: string
    qc?: string  // 'pass', 'fail', or null
}

export interface FleetJobGcodeRunCreate {
    printer_hostname: string
    moonraker_job_id?: string
    notes?: string
}

export interface FleetJobGcodeRunUpdate {
    printer_hostname?: string
    status?: string
    moonraker_job_id?: string
    notes?: string
    qc?: string
    completed_at?: string
}

export interface FleetJobGcodeWithRuns extends FleetJobGcode {
    runs: FleetJobGcodeRun[]
}

export interface FleetJobCompleteResponse {
    job: FleetJob
    gcode_files: FleetJobGcodeWithRuns[]
}

// Queue-related types
export interface FleetGcodeQueueStatus {
    gcode_id: string
    total_queued: number
    required_runs: number
    queued_per_printer: { [hostname: string]: number }
    last_updated: string
}

export interface FleetEnqueueRequest {
    gcode_filename: string
    printer_hostnames: string[]
    runs_per_printer: number
}

export interface FleetEnqueueResponse {
    success: boolean
    enqueued_count: number
    failed_printers: string[]
    queue_status: {
        gcode_id: string
        total_queued: number
        required_runs: number
        queued_per_printer: { [hostname: string]: number }
    } | null
    error?: string
}

export interface FleetJobEnqueueAllResponse {
    success: boolean
    enqueued_count: number
    failed_printers: string[]
    queue_status: {
        job_id: string
        gcode_status: { [gcodeId: string]: any }
    } | null
    error?: string
}

// Printer compatibility types
export interface FleetPrinterInfo {
    hostname: string
    printerModel: 'HS-3' | 'HS-Pro' | null
    filament_type?: string | null
    status?: string
    state?: string
}

export interface FleetCompatibilityCheck {
    gcode: FleetJobGcode
    compatible_printers: FleetPrinterInfo[]
    incompatible_printers: FleetPrinterInfo[]
    has_compatible: boolean
}
