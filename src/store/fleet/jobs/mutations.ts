import { getDefaultState } from './index'
import Vue from 'vue'
import { MutationTree } from 'vuex'
import { FleetJobsState, FleetJob, FleetCustomer, FleetGcodeQueueStatus } from './types'

export const mutations: MutationTree<FleetJobsState> = {
    reset(state) {
        Object.assign(state, getDefaultState())
    },

    setLoading(state, loading: boolean) {
        Vue.set(state, 'loading', loading)
    },

    setJobs(state, jobs: FleetJob[]) {
        Vue.set(state, 'jobs', jobs)
    },

    addJob(state, job: FleetJob) {
        const jobs = [...state.jobs]
        jobs.push(job)
        Vue.set(state, 'jobs', jobs)
    },

    updateJob(state, updatedJob: FleetJob) {
        const index = state.jobs.findIndex((job) => job.id === updatedJob.id)
        if (index !== -1) {
            Vue.set(state.jobs, index, updatedJob)
        }
    },

    removeJob(state, jobId: string) {
        const index = state.jobs.findIndex((job) => job.id === jobId)
        if (index !== -1) {
            state.jobs.splice(index, 1)
        }
    },

    setCustomers(state, customers: FleetCustomer[]) {
        Vue.set(state, 'customers', customers)
    },

    addCustomer(state, customer: FleetCustomer) {
        const customers = [...state.customers]
        customers.push(customer)
        Vue.set(state, 'customers', customers)
    },

    updateCustomer(state, updatedCustomer: FleetCustomer) {
        const index = state.customers.findIndex((customer) => customer.id === updatedCustomer.id)
        if (index !== -1) {
            Vue.set(state.customers, index, updatedCustomer)
        }
    },

    removeCustomer(state, customerId: string) {
        const index = state.customers.findIndex((customer) => customer.id === customerId)
        if (index !== -1) {
            state.customers.splice(index, 1)
        }
    },

    // Optimistic update mutations for better UX
    removeCustomerOptimistic(state, customerId: string) {
        const index = state.customers.findIndex((customer) => customer.id === customerId)
        if (index !== -1) {
            state.customers.splice(index, 1)
        }
    },

    updateCustomerOptimistic(state, { customerId, customerData }: { customerId: string, customerData: Partial<FleetCustomer> }) {
        const index = state.customers.findIndex((customer) => customer.id === customerId)
        if (index !== -1) {
            const updatedCustomer = {
                ...state.customers[index],
                ...customerData,
                updated_at: new Date().toISOString() // Update timestamp
            }
            Vue.set(state.customers, index, updatedCustomer)
        }
    },

    addCustomerOptimistic(state, customer: FleetCustomer) {
        const customers = [...state.customers]
        const newCustomer = {
            ...customer,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
        customers.unshift(newCustomer) // Add to beginning for better visibility
        Vue.set(state, 'customers', customers)
    },

    // Batch operations for better performance
    removeCustomersOptimistic(state, customerIds: string[]) {
        const filteredCustomers = state.customers.filter(customer => !customerIds.includes(customer.id))
        Vue.set(state, 'customers', filteredCustomers)
    },

    // ===========================================
    // QUEUE MANAGEMENT MUTATIONS - IMPLEMENTED
    // ===========================================

    // Update queue status for a specific gcode
    updateGcodeQueueStatus(state, { gcodeId, queueStatus }: { gcodeId: string, queueStatus: FleetGcodeQueueStatus | null }) {
        // Initialize queue status tracking in state if it doesn't exist
        if (!state.queueStatus) {
            Vue.set(state, 'queueStatus', {})
        }

        if (queueStatus) {
            // Update or add queue status
            Vue.set(state.queueStatus!, gcodeId, {
                gcode_id: queueStatus.gcode_id || gcodeId,
                total_queued: queueStatus.total_queued || 0,
                required_runs: queueStatus.required_runs || 0,
                queued_per_printer: queueStatus.queued_per_printer || {},
                last_updated: queueStatus.last_updated || new Date().toISOString()
            })

            console.log(`✅ [Queue Mutation] Updated queue status for gcode ${gcodeId}:`, {
                total_queued: queueStatus.total_queued,
                printers: Object.keys(queueStatus.queued_per_printer || {}).length
            })
        } else {
            // Remove queue status (null value)
            if (state.queueStatus && state.queueStatus[gcodeId]) {
                Vue.delete(state.queueStatus, gcodeId)
                console.log(`🗑️ [Queue Mutation] Removed queue status for gcode ${gcodeId}`)
            }
        }
    },

    // Clear all queue statuses (useful for refresh operations)
    clearAllQueueStatuses(state) {
        Vue.set(state, 'queueStatus', {})
        console.log('🗑️ [Queue Mutation] Cleared all queue statuses')
    },

    // Optimistic update for enqueue operations
    updateGcodeQueueStatusOptimistic(state, { gcodeId, enqueuedCount, printerHostnames }: {
        gcodeId: string,
        enqueuedCount: number,
        printerHostnames: string[]
    }) {
        // Initialize queue status tracking in state if it doesn't exist
        if (!state.queueStatus) {
            Vue.set(state, 'queueStatus', {})
        }

        // Get existing status or create new one
        const existingStatus = state.queueStatus![gcodeId] || {
            gcode_id: gcodeId,
            total_queued: 0,
            required_runs: 0,
            queued_per_printer: {},
            last_updated: new Date().toISOString()
        }

        // Calculate new queue counts
        const runsPerPrinter = Math.ceil(enqueuedCount / printerHostnames.length)
        const updatedQueuedPerPrinter = { ...existingStatus.queued_per_printer }

        printerHostnames.forEach(hostname => {
            updatedQueuedPerPrinter[hostname] = (updatedQueuedPerPrinter[hostname] || 0) + runsPerPrinter
        })

        // Update status
        const updatedStatus = {
            ...existingStatus,
            total_queued: existingStatus.total_queued + enqueuedCount,
            queued_per_printer: updatedQueuedPerPrinter,
            last_updated: new Date().toISOString()
        }

        Vue.set(state.queueStatus!, gcodeId, updatedStatus)

        console.log(`🚀 [Queue Mutation] Optimistic update for gcode ${gcodeId}:`, {
            added: enqueuedCount,
            total: updatedStatus.total_queued,
            printers: printerHostnames
        })
    },

    // Batch update for multiple gcode queue statuses
    updateMultipleGcodeQueueStatuses(state, queueStatuses: { [gcodeId: string]: FleetGcodeQueueStatus }) {
        // Initialize queue status tracking in state if it doesn't exist
        if (!state.queueStatus) {
            Vue.set(state, 'queueStatus', {})
        }

        Object.entries(queueStatuses).forEach(([gcodeId, queueStatus]) => {
            if (queueStatus) {
                Vue.set(state.queueStatus!, gcodeId, {
                    gcode_id: queueStatus.gcode_id || gcodeId,
                    total_queued: queueStatus.total_queued || 0,
                    required_runs: queueStatus.required_runs || 0,
                    queued_per_printer: queueStatus.queued_per_printer || {},
                    last_updated: queueStatus.last_updated || new Date().toISOString()
                })
            }
        })

        console.log(`✅ [Queue Mutation] Batch updated ${Object.keys(queueStatuses).length} queue statuses`)
    }
}
