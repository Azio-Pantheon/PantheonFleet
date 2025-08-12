import Vue from 'vue'
import { ActionTree } from 'vuex'
import { FleetJobsState, FleetJob, FleetCustomer, FleetJobGcode } from './types'
import { FleetJobGcodeRun, FleetJobGcodeRunCreate, FleetJobGcodeRunUpdate } from './types'
// Import new queue types
import { FleetEnqueueRequest, FleetEnqueueResponse, FleetJobEnqueueAllResponse } from './types'
import { FleetGcodeQueueStatus, FleetPrinterInfo, FleetCompatibilityCheck } from './types'
import { RootState } from '@/store/types'
import axios from 'axios'

const FLEET_API_URL = 'http://pantheonfleet2.local:8090'

// Add these new interfaces for the complete response
interface FleetJobGcodeWithRuns extends FleetJobGcode {
    runs: FleetJobGcodeRun[]
}

interface FleetJobCompleteResponse {
    job: FleetJob
    gcode_files: FleetJobGcodeWithRuns[]
}

export const actions: ActionTree<FleetJobsState, RootState> = {
    reset({ commit }) {
        commit('reset')
    },

    async loadJobs({ commit }) {
        commit('setLoading', true)
        try {
            const response = await axios.get(`${FLEET_API_URL}/jobs`)
            commit('setJobs', response.data)
        } catch (error) {
            console.error('Failed to load jobs:', error)
            throw error
        } finally {
            commit('setLoading', false)
        }
    },

    async loadCustomers({ commit }) {
        try {
            const response = await axios.get(`${FLEET_API_URL}/customers`)
            commit('setCustomers', response.data)
        } catch (error) {
            console.error('Failed to load customers:', error)
            throw error
        }
    },

    async createJob({ commit }, jobData) {
        try {
            const response = await axios.post(`${FLEET_API_URL}/jobs`, jobData)
            commit('addJob', response.data)
            return response.data
        } catch (error) {
            console.error('Failed to create job:', error)
            throw error
        }
    },

    async updateJob({ commit }, { jobId, jobData }) {
        try {
            const response = await axios.put(`${FLEET_API_URL}/jobs/${jobId}`, jobData)
            commit('updateJob', response.data)
            return response.data
        } catch (error) {
            console.error('Failed to update job:', error)
            throw error
        }
    },

    async createCustomer({ commit }, customerData) {
        try {
            const response = await axios.post(`${FLEET_API_URL}/customers`, customerData)
            commit('addCustomer', response.data)
            return response.data
        } catch (error) {
            console.error('Failed to create customer:', error)
            throw error
        }
    },

    async updateJobStatus({ commit, state }, { jobId, status }) {
        try {
            await axios.put(`${FLEET_API_URL}/jobs/${jobId}/status?status=${status}`)

            // Update local state
            const job = state.jobs.find(j => j.id === jobId)
            if (job) {
                const updatedJob = { ...job, status, updated_at: new Date().toISOString() }
                commit('updateJob', updatedJob)
            }
        } catch (error) {
            console.error('Failed to update job status:', error)
            throw error
        }
    },

    async deleteJob({ commit }, jobId: string) {
        try {
            await axios.delete(`${FLEET_API_URL}/jobs/${jobId}`)
            commit('removeJob', jobId)
        } catch (error) {
            console.error('Failed to delete job:', error)
            throw error
        }
    },

    // NEW: Load complete job data (job + gcode files + runs) in single API call
    async loadJobComplete({ }, jobId: string): Promise<FleetJobCompleteResponse> {
        try {
            const response = await axios.get(`${FLEET_API_URL}/jobs/${jobId}/complete`)
            return response.data
        } catch (error) {
            console.error('Failed to load complete job data:', error)
            throw error
        }
    },

    async loadJobGcodes({ }, jobId: string): Promise<FleetJobGcode[]> {
        try {
            const response = await axios.get(`${FLEET_API_URL}/jobs/${jobId}/gcode`)
            return response.data
        } catch (error) {
            console.error('Failed to load job gcodes:', error)
            throw error
        }
    },

    async createJobGcode({ }, { jobId, gcode }) {
        try {
            const response = await axios.post(`${FLEET_API_URL}/jobs/${jobId}/gcode`, gcode)
            return response.data
        } catch (error) {
            console.error('Failed to create job gcode:', error)
            throw error
        }
    },

    // NEW: Update job gcode
    async updateJobGcode({ }, { gcodeId, gcode }) {
        try {
            const response = await axios.put(`${FLEET_API_URL}/gcode/${gcodeId}`, gcode)
            return response.data
        } catch (error) {
            console.error('Failed to update job gcode:', error)
            throw error
        }
    },

    // NEW: Delete job gcode
    async deleteJobGcode({ }, gcodeId: string) {
        try {
            await axios.delete(`${FLEET_API_URL}/gcode/${gcodeId}`)
        } catch (error) {
            console.error('Failed to delete job gcode:', error)
            throw error
        }
    },

    async loadJobGcodeRuns({ }, jobGcodeId: string): Promise<FleetJobGcodeRun[]> {
        try {
            const response = await axios.get(`${FLEET_API_URL}/gcode/${jobGcodeId}/runs`)
            return response.data
        } catch (error) {
            console.error('Failed to load job gcode runs:', error)
            throw error
        }
    },

    async createJobGcodeRun({ }, { jobGcodeId, run }: { jobGcodeId: string, run: FleetJobGcodeRunCreate }) {
        try {
            const response = await axios.post(`${FLEET_API_URL}/gcode/${jobGcodeId}/runs`, run)
            return response.data
        } catch (error) {
            console.error('Failed to create job gcode run:', error)
            throw error
        }
    },

    async getJobGcodeRun({ }, runId: string): Promise<FleetJobGcodeRun> {
        try {
            const response = await axios.get(`${FLEET_API_URL}/runs/${runId}`)
            return response.data
        } catch (error) {
            console.error('Failed to get job gcode run:', error)
            throw error
        }
    },

    async updateJobGcodeRun({ }, { runId, updateData }: { runId: string, updateData: FleetJobGcodeRunUpdate }) {
        try {
            const response = await axios.put(`${FLEET_API_URL}/runs/${runId}`, updateData)
            return response.data
        } catch (error) {
            console.error('Failed to update job gcode run:', error)
            throw error
        }
    },

    async updateJobGcodeRunQC({ }, { runId, qc }: { runId: string, qc: string | null }) {
        try {
            await axios.put(`${FLEET_API_URL}/runs/${runId}/qc?qc=${qc || ''}`)
        } catch (error) {
            console.error('Failed to update job gcode run QC:', error)
            throw error
        }
    },

    async deleteJobGcodeRun({ }, runId: string) {
        try {
            await axios.delete(`${FLEET_API_URL}/runs/${runId}`)
        } catch (error) {
            console.error('Failed to delete job gcode run:', error)
            throw error
        }
    },

    async updateCustomer({ commit }, { customerId, customerData }) {
        try {
            const response = await axios.put(`${FLEET_API_URL}/customers/${customerId}`, customerData)
            commit('updateCustomer', response.data)
            return response.data
        } catch (error) {
            console.error('Failed to update customer:', error)
            throw error
        }
    },

    async deleteCustomer({ commit }, customerId: string) {
        try {
            await axios.delete(`${FLEET_API_URL}/customers/${customerId}`)
            commit('removeCustomer', customerId)
        } catch (error) {
            console.error('Failed to delete customer:', error)
            throw error
        }
    },

    async createJobGcodesBatch({ }, { jobId, gcodeFiles }) {
        try {
            const response = await axios.post(`${FLEET_API_URL}/jobs/${jobId}/gcode/batch`, {
                gcode_files: gcodeFiles
            })
            return response.data
        } catch (error) {
            console.error('Failed to create job gcodes batch:', error)
            throw error
        }
    },

    // ===========================================
    // NEW QUEUE MANAGEMENT ACTIONS - IMPLEMENTED
    // ===========================================

    // Enqueue individual gcode file to specific printers
    async enqueueGcodeToprinters({ commit, rootState }, { gcodeId, request }: { gcodeId: string, request: FleetEnqueueRequest }): Promise<FleetEnqueueResponse> {
        try {
            console.log(`🚀 [Queue] Enqueueing gcode ${gcodeId} to printers:`, request.printer_hostnames)

            const response = await axios.post(`${FLEET_API_URL}/gcode/${gcodeId}/enqueue`, request)

            console.log(`✅ [Queue] Enqueue response:`, response.data)

            // Store queue status in local state if success
            if (response.data.success && response.data.queue_status) {
                commit('updateGcodeQueueStatus', {
                    gcodeId,
                    queueStatus: response.data.queue_status
                })
            }

            return response.data
        } catch (error) {
            console.error('❌ [Queue] Failed to enqueue gcode:', error)
            throw error
        }
    },

    // Enqueue all gcode files in a job
    async enqueueAllJobGcodes({ commit, rootState }, { jobId, request }: { jobId: string, request: FleetEnqueueRequest }): Promise<FleetJobEnqueueAllResponse> {
        try {
            console.log(`🚀 [Queue] Enqueueing all job ${jobId} gcodes to printers:`, request.printer_hostnames)

            const response = await axios.post(`${FLEET_API_URL}/jobs/${jobId}/gcode/enqueue-all`, request)

            console.log(`✅ [Queue] Enqueue all response:`, response.data)

            // Update queue status for all gcodes in job if success
            if (response.data.success && response.data.queue_status?.gcode_status) {
                Object.entries(response.data.queue_status.gcode_status).forEach(([gcodeId, queueStatus]) => {
                    commit('updateGcodeQueueStatus', {
                        gcodeId,
                        queueStatus
                    })
                })
            }

            return response.data
        } catch (error) {
            console.error('❌ [Queue] Failed to enqueue all job gcodes:', error)
            throw error
        }
    },

    // Get queue status for specific gcode
    async getGcodeQueueStatus({ commit }, gcodeId: string): Promise<FleetGcodeQueueStatus | null> {
        try {
            const response = await axios.get(`${FLEET_API_URL}/gcode/${gcodeId}/queue-status`)

            // Update store with latest queue status
            commit('updateGcodeQueueStatus', {
                gcodeId,
                queueStatus: response.data
            })

            return response.data
        } catch (error: any) {
            if (error?.response?.status === 404) {
                // No queue status found - clear any existing status
                commit('updateGcodeQueueStatus', {
                    gcodeId,
                    queueStatus: null
                })
                return null
            }
            console.error('❌ [Queue] Failed to get gcode queue status:', error)
            throw error
        }
    },

    // Get queue status for all gcodes in a job
    async getJobQueueStatus({ commit }, jobId: string): Promise<{ [gcodeId: string]: FleetGcodeQueueStatus }> {
        try {
            const response = await axios.get(`${FLEET_API_URL}/jobs/${jobId}/queue-status`)

            // Update store with latest queue statuses
            Object.entries(response.data.gcode_status || {}).forEach(([gcodeId, queueStatus]) => {
                commit('updateGcodeQueueStatus', {
                    gcodeId,
                    queueStatus
                })
            })

            return response.data.gcode_status || {}
        } catch (error) {
            console.error('❌ [Queue] Failed to get job queue status:', error)
            throw error
        }
    },

    async batchUpdateJobGcodeRunsQC({ }, { gcodeId, qcStatus }: { gcodeId: string, qcStatus: string }) {
        try {
            console.log(`🚀 [BatchQC] Batch updating QC for gcode ${gcodeId} to ${qcStatus}`)

            const response = await axios.put(`${FLEET_API_URL}/gcode/${gcodeId}/runs/qc/batch`, {
                qc_status: qcStatus
            })

            console.log(`✅ [BatchQC] Batch update response:`, response.data)
            return response.data
        } catch (error) {
            console.error('❌ [BatchQC] Failed to batch update QC:', error)
            throw error
        }
    },

    // Helper action for printer compatibility checking
    checkPrinterCompatibility(
        { }: any,
        { gcode, rootState }: { gcode: FleetJobGcode; rootState: any }
    ): FleetCompatibilityCheck {
        const remotePrinters = rootState.gui?.remoteprinters?.printers || {}
        const fleetPrinters = rootState.farm?.fleetDaemonPrinters || {}

        const compatible: FleetPrinterInfo[] = []
        const incompatible: FleetPrinterInfo[] = []

        const getPrinterModel = (hostname: string): 'HS-3' | 'HS-Pro' | null => {
            for (const p of Object.values(remotePrinters)) {
                if ((p as any).hostname === hostname) {
                    return (p as any).printerModel ?? null
                }
            }
            return null
        }

        Object.values(remotePrinters).forEach((printer: any) => {
            const hostname = printer.hostname
            if (!hostname) return

            const fleetData = fleetPrinters[hostname]
            const currentFilament = fleetData?.toolhead?.filament_type
            const printerState = fleetData?.print_stats?.state || 'unknown'
            const isFleetConnected = fleetData?.fleet_to_printer_ws === true
            const printerModel = getPrinterModel(hostname)

            // Evaluate each compatibility criterion
            const modelCompatible =
                !gcode.preferred_printer ||
                gcode.preferred_printer === 'any' ||
                printerModel === gcode.preferred_printer

            const filamentCompatible =
                !gcode.filament_type ||
                gcode.filament_type === 'any' ||
                !currentFilament ||
                currentFilament === 'N/A' ||
                currentFilament === '' ||
                currentFilament === gcode.filament_type

            const printerInfo: FleetPrinterInfo = {
                hostname,
                printerModel,
                filament_type: currentFilament,
                status: printerState,
                state: printerState,
            }

            if (modelCompatible && filamentCompatible && isFleetConnected) {
                compatible.push(printerInfo)
            } else {
                incompatible.push(printerInfo)
            }
        })

        return {
            gcode,
            compatible_printers: compatible,
            incompatible_printers: incompatible,
            has_compatible: compatible.length > 0,
        }
    }
}
