<template>
    <div class="job-list-panel">
        <v-card-text>
            <v-row>
                <v-col class="col-4 d-flex align-center">
                    <v-text-field v-model="search"
                                  :append-icon="mdiMagnify"
                                  label="Search Jobs"
                                  single-line
                                  outlined
                                  clearable
                                  hide-details
                                  dense />
                </v-col>
                <v-col class="col-3 d-flex align-center">
                    <v-select v-model="statusFilter"
                              :items="statusOptions"
                              label="Filter by Status"
                              outlined
                              dense
                              clearable
                              hide-details
                              multiple
                              chips
                              small-chips />
                </v-col>
                <v-col class="col-5 d-flex align-center justify-end">
                    <template v-if="selectedJobs.length">
                        <v-btn title="Delete Selected"
                               color="error"
                               class="px-2 minwidth-0 ml-3"
                               @click="deleteSelectedDialog = true">
                            <v-icon>{{ mdiDelete }}</v-icon>
                        </v-btn>
                    </template>
                    <v-btn color="primary"
                           class="ml-3"
                           @click="openCreateJobDialog">
                        <v-icon left>{{ mdiPlus }}</v-icon>
                        New Job
                    </v-btn>
                    <v-btn :loading="loadings.includes('jobsRefresh')"
                           class="px-2 minwidth-0 ml-3"
                           @click="refreshJobs">
                        <v-icon>{{ mdiRefresh }}</v-icon>
                    </v-btn>
                    <v-menu :offset-y="true" :close-on-content-click="false">
                        <!--
                    <template #activator="{ on, attrs }">
                        <v-btn class="px-2 minwidth-0 ml-3" v-bind="attrs" v-on="on">
                            <v-icon>{{ mdiCog }}</v-icon>
                        </v-btn>
                    </template>
                    -->
                        <v-list>
                            <v-list-item v-for="header of configHeaders" :key="header.value" class="minHeight36">
                                <v-checkbox v-model="header.visible"
                                            class="mt-0"
                                            hide-details
                                            :label="header.text"
                                            @change="changeColumnVisible(header.value)" />
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </v-col>
            </v-row>
        </v-card-text>
        <v-divider class="mb-3" />
        <v-data-table v-model="selectedJobs"
                      :items="filteredJobs"
                      class="job-list-table"
                      :headers="filteredHeaders"
                      :options="options"
                      :custom-sort="sortJobs"
                      :sort-by.sync="sortBy"
                      :sort-desc.sync="sortDesc"
                      :items-per-page.sync="countPerPage"
                      :footer-props="{
                    itemsPerPageText: 'Jobs',
                    itemsPerPageAllText: 'All Jobs',
                    itemsPerPageOptions: [10, 25, 50, 100, -1],
                }"
                      item-key="id"
                      :search="search"
                      :custom-filter="advancedSearch"
                      mobile-breakpoint="0"
                      show-select>
            <template slot="no-data">
                <div class="text-center">No jobs found</div>
            </template>

            <template #item="{ index, item, isSelected, select }">
                <tr :key="`${index} ${item.name}`"
                    v-longpress:600="(e) => showContextMenu(e, item)"
                    :class="'file-list-cursor user-select-none ' + getJobRowClass(item)"
                    @contextmenu="showContextMenu($event, item)"
                    @click="clickRow(item, $event)">
                    <td class="pr-0">
                        <v-simple-checkbox v-ripple
                                           :value="isSelected"
                                           class="pa-0 mr-0"
                                           @click.stop="select(!isSelected)" />
                    </td>
                    <td class="px-2 text-center" style="width: 120px">
                        <v-menu offset-y>
                            <template #activator="{ on, attrs }">
                                <v-tooltip top>
                                    <template #activator="{ on: tooltipOn, attrs: tooltipAttrs }">
                                        <v-chip :color="getStatusColor(item.status)"
                                                :text-color="getStatusTextColor(item.status)"
                                                small
                                                label
                                                style="cursor: pointer;"
                                                v-bind="{ ...attrs, ...tooltipAttrs }"
                                                v-on="{ ...on, ...tooltipOn }"
                                                @click.stop>
                                            <v-icon left small>{{ getStatusIcon(item.status) }}</v-icon>
                                            {{ formatStatusDisplay(item.status) }}
                                            <v-icon right x-small>{{ mdiChevronDown }}</v-icon>
                                        </v-chip>
                                    </template>
                                    <span>Click to change status: {{ item.status.replace('_', ' ') }}</span>
                                </v-tooltip>
                            </template>
                            <v-list dense>
                                <v-list-item v-if="item.status === 'pending'"
                                             @click="updateJobStatusFromTable(item, 'in_progress')">
                                    <v-list-item-icon>
                                        <v-icon small color="blue">{{ mdiPlay }}</v-icon>
                                    </v-list-item-icon>
                                    <v-list-item-content>
                                        <v-list-item-title>Start Job</v-list-item-title>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item v-if="item.status === 'in_progress'"
                                             @click="updateJobStatusFromTable(item, 'complete')">
                                    <v-list-item-icon>
                                        <v-icon small color="green">{{ mdiCheck }}</v-icon>
                                    </v-list-item-icon>
                                    <v-list-item-content>
                                        <v-list-item-title>Mark Complete</v-list-item-title>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item v-if="['pending', 'in_progress'].includes(item.status)"
                                             @click="updateJobStatusFromTable(item, 'cancelled')">
                                    <v-list-item-icon>
                                        <v-icon small color="red">{{ mdiCancel }}</v-icon>
                                    </v-list-item-icon>
                                    <v-list-item-content>
                                        <v-list-item-title>Cancel Job</v-list-item-title>
                                    </v-list-item-content>
                                </v-list-item>

                                <!-- Options to revert status -->
                                <v-divider v-if="item.status !== 'pending'" />

                                <v-list-item v-if="item.status === 'in_progress'"
                                             @click="updateJobStatusFromTable(item, 'pending')">
                                    <v-list-item-icon>
                                        <v-icon small color="orange">{{ mdiAlertOutline }}</v-icon>
                                    </v-list-item-icon>
                                    <v-list-item-content>
                                        <v-list-item-title>Back to Pending</v-list-item-title>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item v-if="item.status === 'complete'"
                                             @click="updateJobStatusFromTable(item, 'in_progress')">
                                    <v-list-item-icon>
                                        <v-icon small color="blue">{{ mdiProgressClock }}</v-icon>
                                    </v-list-item-icon>
                                    <v-list-item-content>
                                        <v-list-item-title>Reopen Job</v-list-item-title>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item v-if="item.status === 'cancelled'"
                                             @click="updateJobStatusFromTable(item, 'pending')">
                                    <v-list-item-icon>
                                        <v-icon small color="orange">{{ mdiAlertOutline }}</v-icon>
                                    </v-list-item-icon>
                                    <v-list-item-content>
                                        <v-list-item-title>Restore Job</v-list-item-title>
                                    </v-list-item-content>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </td>
                    <td class="">{{ item.name }}</td>
                    <td class="">{{ getCustomerName(item.customer_id) }}</td>
                    <td class="text-center">{{ item.job_type }}</td>
                    <td class="text-center">
                        <v-chip :color="getPriorityColor(item.priority)"
                                text-color="white"
                                x-small>
                            {{ getPriorityDisplay(item.priority) }}
                        </v-chip>
                    </td>
                    <td class="">{{ item.operator_name || '--' }}</td>
                    <td class="" :class="getDueDateClass(item.due_date)">
                        {{ formatDateTime(item.due_date) || '--' }}
                    </td>
                    <td class="">{{ formatDateTime(item.created_at) }}</td>
                    <td class="">{{ truncateText(item.description, 50) || '--' }}</td>
                    <td class="text-center">
                        <v-btn icon
                               small
                               color="primary"
                               @click.stop="openActionsMenu($event, item)">
                            <v-icon small>{{ mdiDotsVertical }}</v-icon>
                        </v-btn>
                    </td>
                </tr>
            </template>
        </v-data-table>
        <!-- Context Menu -->
        <v-menu v-model="contextMenu.shown" :position-x="contextMenu.x" :position-y="contextMenu.y" absolute offset-y>
            <v-list>
                <v-list-item @click="viewJobDetails(contextMenu.item)">
                    <v-icon class="mr-1">{{ mdiEye }}</v-icon>
                    View Details
                </v-list-item>
                <v-list-item @click="editJob(contextMenu.item)">
                    <v-icon class="mr-1">{{ mdiPencil }}</v-icon>
                    Edit Job
                </v-list-item>
                <v-divider />
                <v-list-item @click="updateJobStatus(contextMenu.item, 'in_progress')"
                             v-if="contextMenu.item.status === 'pending'">
                    <v-icon class="mr-1">{{ mdiPlay }}</v-icon>
                    Start Job
                </v-list-item>
                <v-list-item @click="updateJobStatus(contextMenu.item, 'complete')"
                             v-if="contextMenu.item.status === 'in_progress'">
                    <v-icon class="mr-1">{{ mdiCheck }}</v-icon>
                    Mark Complete
                </v-list-item>
                <v-list-item @click="updateJobStatus(contextMenu.item, 'cancelled')"
                             v-if="['pending', 'in_progress'].includes(contextMenu.item.status)">
                    <v-icon class="mr-1">{{ mdiCancel }}</v-icon>
                    Cancel Job
                </v-list-item>
                <v-divider />
                <v-list-item class="red--text" @click="deleteDialog = true">
                    <v-icon class="mr-1" color="error">{{ mdiDelete }}</v-icon>
                    Delete Job
                </v-list-item>
            </v-list>
        </v-menu>

        <!-- Job Details Dialog -->
        <job-details-dialog :key="detailsDialog.item?.id || 'no-job'"
                            :value="detailsDialog.show"
                            @input="onJobDetailsToggle"
                            :job="detailsDialog.item"
                            :gcode-files="jobGcodes"
                            :all-job-runs="allJobRuns"
                            :loading-gcodes="detailsDialog.loadingGcodes"
                            :loading-runs="detailsDialog.loadingRuns"
                            @close="onJobDetailsClose"
                            @refresh="onJobDetailsRefresh"
                            @update-status="onJobDetailsUpdateStatus"
                            @edit-job="onJobDetailsEditJob"
                            @add-gcode="onJobDetailsAddGcode"
                            @edit-gcode="onJobDetailsEditGcode"
                            @delete-gcode="onJobDetailsDeleteGcode"
                            @view-gcode-runs="onJobDetailsViewGcodeRuns" />

        <!-- Create/Edit Job Dialog -->
        <create-new-job-dialog ref="createJobDialog"
                               v-model="createJobDialog.show"
                               :job="createJobDialog.isEdit ? createJobDialog.job : null"
                               :customers="customers"
                               @job-created="onJobCreated"
                               @job-updated="onJobUpdated"
                               @add-customer="openAddCustomerFromJob" />

        <!-- Add GCode Dialog -->
        <add-gcode-dialog v-model="addGcodeDialog.show"
                          :job="detailsDialog.item"
                          :is-edit="addGcodeDialog.isEdit"
                          :edit-gcode="addGcodeDialog.editGcode"
                          :printer-options="printerOptions"
                          @gcode-created="onGcodeCreated"
                          @gcode-updated="onGcodeUpdated"
                          @close="onAddGcodeClose" />

        <!-- Delete Confirmation Dialogs -->
        <v-dialog v-model="deleteDialog" max-width="400">
            <panel title="Delete Job" card-class="delete-job-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="deleteDialog = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <p class="mb-0">Are you sure you want to delete this job?</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="" text @click="deleteDialog = false">Cancel</v-btn>
                    <v-btn color="error" text @click="deleteJob">Delete</v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>

        <v-dialog v-model="deleteSelectedDialog" max-width="400">
            <panel title="Delete Jobs" card-class="delete-selected-dialog" :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="deleteSelectedDialog = false">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <p class="mb-0">Are you sure you want to delete {{ selectedJobs.length }} job(s)?</p>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="" text @click="deleteSelectedDialog = false">Cancel</v-btn>
                    <v-btn color="error" text @click="deleteSelectedJobs">Delete</v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>

        <!-- Print Runs Dialog -->
        <print-runs-dialog v-model="gcodeRunsDialog.show"
                           :gcode-file="gcodeRunsDialog.gcodeFile"
                           :runs="gcodeRuns"
                           :loading="gcodeRunsDialog.loading"
                           @refresh="refreshGcodeRuns"
                           @create-run="onCreateRun"
                           @update-run="onUpdateRun"
                           @update-run-status="onUpdateRunStatus"
                           @update-run-qc="onUpdateRunQC"
                           @delete-run="onDeleteRun" />

        <!-- Quick Add Customer Dialog (for job creation workflow) -->
        <v-dialog v-model="quickAddCustomerDialog.show"
                  :max-width="400"
                  persistent
                  @keydown.esc="closeQuickAddCustomerDialog">
            <panel title="Add New Customer"
                   :icon="mdiAccountPlus"
                   card-class="quick-add-customer-dialog"
                   :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="closeQuickAddCustomerDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <p class="text-caption text--secondary mb-3">
                        Quickly add a customer to continue creating your job.
                    </p>
                    <v-form ref="quickCustomerForm" v-model="quickAddCustomerDialog.valid">
                        <v-row>
                            <v-col cols="12">
                                <v-text-field v-model="quickAddCustomerDialog.form.name"
                                              label="Customer Name"
                                              :rules="[v => !!v || 'Customer name is required']"
                                              outlined
                                              dense
                                              required
                                              autofocus />
                            </v-col>
                            <v-col cols="12">
                                <v-textarea v-model="quickAddCustomerDialog.form.notes"
                                            label="Notes (Optional)"
                                            outlined
                                            dense
                                            rows="2" />
                            </v-col>
                        </v-row>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="" text @click="closeQuickAddCustomerDialog">Cancel</v-btn>
                    <v-btn color="success"
                           :loading="quickAddCustomerDialog.loading"
                           :disabled="!quickAddCustomerDialog.valid"
                           @click="saveQuickCustomer">
                        Add Customer
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
    </div>
</template>



<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'
import { caseInsensitiveSort } from '@/plugins/helpers'
import JobDetailsDialog from '@/components/dialogs/JobDetailsDialog.vue'
import CreateNewJobDialog from '@/components/dialogs/CreateNewJobDialog.vue'
import AddGcodeDialog from '@/components/dialogs/AddGcodeDialog.vue'
import PrintRunsDialog from '@/components/dialogs/PrintRunsDialog.vue'

import {
    mdiBriefcaseOutline,
    mdiMagnify,
    mdiDelete,
    mdiPlus,
    mdiRefresh,
    mdiCog,
    mdiEye,
    mdiPencil,
    mdiPlay,
    mdiCheck,
    mdiCancel,
    mdiCloseThick,
    mdiCalendar,
    mdiCodeBraces,
    mdiAccountPlus,
    mdiProgressClock,
    mdiCheckboxMarkedCircleOutline,
    mdiCloseCircleOutline,
    mdiAlertOutline,
    mdiDotsVertical,
    mdiChevronDown,
    mdiHelpCircleOutline,
    mdiInformationOutline,
    mdiCloudUpload,
    mdiFileUpload,
    mdiCheckCircle,
    mdiClose,

} from '@mdi/js'

interface FleetJob {
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

interface FleetCustomer {
    id: string
    name: string
    notes?: string
    created_at: string
    updated_at: string
}

interface FleetJobGcode {
    id: string
    job_id: string
    gcode_filename: string
    required_runs: number
    preferred_printer: string
    filament_type: string
    created_at: string
}

interface FleetJobGcodeRun {
    id: string
    job_gcode_id: string
    printer_hostname: string
    started_at: string
    completed_at?: string
    status: string
    moonraker_job_id?: string
    notes?: string
    qc?: string | null
}

@Component({
    components: {
        Panel,
        JobDetailsDialog,
        CreateNewJobDialog,
        AddGcodeDialog,
        PrintRunsDialog,
    },
})
export default class JobListPanel extends Mixins(BaseMixin) {
    mdiBriefcaseOutline = mdiBriefcaseOutline
    mdiMagnify = mdiMagnify
    mdiDelete = mdiDelete
    mdiPlus = mdiPlus
    mdiRefresh = mdiRefresh
    mdiCog = mdiCog
    mdiEye = mdiEye
    mdiPencil = mdiPencil
    mdiPlay = mdiPlay
    mdiCheck = mdiCheck
    mdiCancel = mdiCancel
    mdiCloseThick = mdiCloseThick
    mdiCalendar = mdiCalendar
    mdiCodeBraces = mdiCodeBraces
    mdiAccountPlus = mdiAccountPlus
    mdiProgressClock = mdiProgressClock
    mdiCheckboxMarkedCircleOutline = mdiCheckboxMarkedCircleOutline
    mdiCloseCircleOutline = mdiCloseCircleOutline
    mdiAlertOutline = mdiAlertOutline
    mdiDotsVertical = mdiDotsVertical
    mdiChevronDown = mdiChevronDown
    mdiHelpCircleOutline = mdiHelpCircleOutline
    mdiInformationOutline = mdiInformationOutline
    mdiCloudUpload = mdiCloudUpload
    mdiFileUpload = mdiFileUpload
    mdiCheckCircle = mdiCheckCircle
    mdiClose = mdiClose

    private search = ''
    private sortBy = 'created_at'
    private sortDesc = true
    private options = {}
    private statusFilter: string[] = []
    private dueDateMenu = false

    private selectedJobs: FleetJob[] = []
    private jobGcodes: FleetJobGcode[] = []
    private gcodeRuns: FleetJobGcodeRun[] = []
    private allJobRuns: { [gcodeId: string]: FleetJobGcodeRun[] } = {}
    private cacheCleanupTimeout: number | null = null

    private gcodeRunsDialog = {
        show: false,
        loading: false,
        gcodeFile: null as FleetJobGcode | null,
    }

    private contextMenu = {
        shown: false,
        x: 0,
        y: 0,
        item: {} as FleetJob,
    }

    private detailsDialog = {
        show: false,
        item: null as FleetJob | null,
        loadingGcodes: false,
        loadingRuns: false,
    }

    private createJobDialog = {
        show: false,
        isEdit: false,
        job: null as FleetJob | null,
    }

    private addGcodeDialog = {
        show: false,
        isEdit: false,
        editGcode: null as FleetJobGcode | null,
    }

    private deleteDialog = false
    private deleteSelectedDialog = false

    private quickAddCustomerDialog = {
        show: false,
        valid: false,
        loading: false,
        onCustomerAdded: null as ((customer: any) => void) | null,
        form: {
            name: '',
            notes: '',
        }
    }

    private runStatisticsCache: { [gcodeId: string]: any } = {}

    get jobs() {
        return this.$store.state.fleet?.jobs?.jobs ?? []
    }

    get customers(): FleetCustomer[] {
        return this.$store.state.fleet?.jobs?.customers ?? []
    }

    get customerOptions() {
        return this.customers
    }

    get headers() {
        const headers = [
            { text: 'Status', value: 'status', align: 'left', configable: false, visible: true, sortable: true },
            { text: 'Job Name', value: 'name', align: 'left', configable: false, visible: true, sortable: true },
            { text: 'Customer', value: 'customer_id', align: 'left', configable: true, visible: true, sortable: true },
            { text: 'Type', value: 'job_type', align: 'center', configable: true, visible: true, sortable: true },
            { text: 'Priority', value: 'priority', align: 'center', configable: true, visible: true, sortable: true },
            { text: 'Operator', value: 'operator_name', align: 'left', configable: true, visible: true, sortable: true },
            { text: 'Due Date', value: 'due_date', align: 'left', configable: true, visible: true, sortable: true },
            { text: 'Created', value: 'created_at', align: 'left', configable: true, visible: true, sortable: true },
            { text: 'Description', value: 'description', align: 'left', configable: true, visible: true, sortable: false },
            { text: 'Actions', value: 'actions', align: 'center', configable: false, visible: true, sortable: false },
        ]

        headers.forEach((header) => {
            if (header.visible && this.hideColumns.includes(header.value)) {
                header.visible = false
            } else if (!header.visible && !this.hideColumns.includes(header.value)) {
                header.visible = true
            }
        })

        return headers
    }

    get configHeaders() {
        return this.headers.filter((header: any) => header.configable === true)
    }

    get filteredHeaders() {
        return this.headers.filter((header: any) => header.visible === true)
    }

    get filteredJobs() {
        if (this.statusFilter.length === 0) return this.jobs
        return this.jobs.filter((job: FleetJob) => this.statusFilter.includes(job.status))
    }

    get statusOptions() {
        return [
            { text: 'Pending', value: 'pending' },
            { text: 'In Progress', value: 'in_progress' },
            { text: 'Complete', value: 'complete' },
            { text: 'Cancelled', value: 'cancelled' },
        ]
    }

    get jobTypeOptions() {
        return [
            { text: 'Sample', value: 'sample' },
            { text: 'Production', value: 'production' },
        ]
    }

    get priorityOptions() {
        return [
            { text: 'Low', value: 'low' },
            { text: 'Medium', value: 'medium' },
            { text: 'High', value: 'high' },
        ]
    }

    get printerOptions() {
        return [
            { text: 'Any Printer', value: 'any' },
            { text: 'HS-3', value: 'HS-3' },
            { text: 'HS-Pro Only', value: 'HS-Pro' },
        ]
    }

    get countPerPage() {
        return this.$store.state.gui.view.history?.countPerPage || 25
    }

    set countPerPage(newVal) {
        this.$store.dispatch('gui/saveSetting', { name: 'view.history.countPerPage', value: newVal })
    }

    get hideColumns() {
        return this.$store.state.gui.view.history?.hideColumns || []
    }

    set hideColumns(newVal) {
        this.$store.dispatch('gui/saveSetting', { name: 'view.history.hideColumns', value: newVal })
    }

    get loadings() {
        return this.$store.state.socket?.loadings ?? []
    }

    get gcodeRunHeaders() {
        return [
            { text: 'Printer', value: 'printer_hostname', align: 'left' },
            { text: 'Status', value: 'status', align: 'center', sortable: false },
            { text: 'QC', value: 'qc', align: 'center', sortable: false },
            { text: 'Started', value: 'started_at', align: 'left' },
            { text: 'Completed', value: 'completed_at', align: 'left' },
            { text: 'Moonraker ID', value: 'moonraker_job_id', align: 'left' },
            { text: 'Notes', value: 'notes', align: 'left' },
            { text: 'Actions', value: 'actions', align: 'center', sortable: false },
        ]
    }

    get customerDropdownOptions() {
        return this.customers.map(customer => ({
            id: customer.id,
            name: customer.name
        }))
    }

    get fleetDaemonPrinters() {
        return this.$store.state.farm.fleetDaemonPrinters || {}
    }

    getPrinterModel(hostname: string): 'HS-3' | 'HS-Pro' | null {
        const remotePrinters = this.$store.state.gui?.remoteprinters?.printers || {}
        for (const printer of Object.values(remotePrinters)) {
            if ((printer as any).hostname === hostname) {
                return (printer as any).printerModel ?? null
            }
        }
        return null
    }

    get currentGcodeFile() {
        return this.gcodeRunsDialog.gcodeFile
    }
    async mounted() {
        await this.refreshJobs()
        await this.loadCustomers()
        this.$root.$on('fullscreen-files-uploaded', this.handleFullscreenUpload)
    }

    async refreshJobs() {
        this.$store.dispatch('socket/addLoading', { name: 'jobsRefresh' })
        try {
            await this.$store.dispatch('fleet/jobs/loadJobs')
        } catch (error) {
            console.error('Failed to load jobs:', error)
            this.$toast.error('Failed to load jobs')
        } finally {
            this.$store.dispatch('socket/removeLoading', { name: 'jobsRefresh' })
        }
    }

    async loadCustomers() {
        try {
            await this.$store.dispatch('fleet/jobs/loadCustomers')
        } catch (error) {
            console.error('Failed to load customers:', error)
        }
    }

    handleCustomerSelection(customerId: string) {
        // This handles regular customer selection
        // The "Add New Customer" option is handled by the @click in the template
    }

    openAddCustomerFromJob() {
        this.quickAddCustomerDialog.onCustomerAdded = (newCustomer: any) => {
            console.log('🚀 IMMEDIATE auto-selection for:', newCustomer.name)

            // No delays, no checks - just do it immediately
            const createJobDialogComponent = this.$refs.createJobDialog as any
            if (createJobDialogComponent?.setSelectedCustomer) {
                createJobDialogComponent.setSelectedCustomer(newCustomer.id)
            }
        }
        this.quickAddCustomerDialog.show = true
    }

    async saveQuickCustomer() {
        if (!this.quickAddCustomerDialog.valid) return
        this.quickAddCustomerDialog.loading = true
        let newCustomer: any = null

        try {
            // Create customer via API
            newCustomer = await this.$store.dispatch('fleet/jobs/createCustomer', this.quickAddCustomerDialog.form)
            console.log('✅ Customer created successfully:', newCustomer.name)

            // Optimistically add to store immediately
            this.$store.commit('fleet/jobs/addCustomerOptimistic', newCustomer)

            // IMMEDIATELY trigger auto-selection
            if (this.quickAddCustomerDialog.onCustomerAdded) {
                this.quickAddCustomerDialog.onCustomerAdded(newCustomer)
            }

            this.$toast.success('Customer added successfully')
            this.closeQuickAddCustomerDialog()

            // Background verification (don't await this)
            this.verifyCustomerExists(newCustomer.id, newCustomer.name)

        } catch (error) {
            console.error('❌ Customer creation failed:', error)
            this.$toast.error('Failed to create customer')

            // Remove optimistic customer on API failure
            if (newCustomer?.id) {
                this.$store.commit('fleet/jobs/removeCustomerOptimistic', newCustomer.id)
                this.clearSelectedCustomerIfMatches(newCustomer.id)
            }
        } finally {
            this.quickAddCustomerDialog.loading = false
        }
    }


    async verifyCustomerExists(customerId: string, customerName: string) {
        try {
            // Wait a moment for server to process, then verify
            setTimeout(async () => {
                console.log('🔍 Verifying customer exists on server...')

                await this.loadCustomers()

                const customerExists = this.customers.some(c => c.id === customerId)

                if (!customerExists) {
                    console.error('❌ Customer verification failed - not found on server')

                    // Remove from store
                    this.$store.commit('fleet/jobs/removeCustomerOptimistic', customerId)

                    // Clear selection if it matches
                    this.clearSelectedCustomerIfMatches(customerId)

                    this.$toast.error(`Customer "${customerName}" creation failed - please try again`)
                } else {
                    console.log('✅ Customer verified on server')
                }
            }, 1000) // Give server a moment to process

        } catch (error) {
            console.warn('⚠️ Customer verification request failed:', error)
            // Don't remove customer on network errors
        }
    }

    // Helper method to clear selection
    clearSelectedCustomerIfMatches(customerId: string) {
        const createJobDialogComponent = this.$refs.createJobDialog as any
        if (createJobDialogComponent?.jobForm?.customer_id === customerId) {
            createJobDialogComponent.jobForm.customer_id = ''
            createJobDialogComponent.$forceUpdate()
            console.log('🧹 Cleared customer selection due to verification failure')
        }
    }
    
    closeQuickAddCustomerDialog() {
        this.quickAddCustomerDialog.show = false
        this.quickAddCustomerDialog.onCustomerAdded = null
        this.quickAddCustomerDialog.form = {
            name: '',
            notes: '',
        }

        if (this.$refs.quickCustomerForm) {
            (this.$refs.quickCustomerForm as any).resetValidation()
        }
    }

    async loadJobGcodesAndRuns(jobId: string) {
        // OPTIMIZATION: Don't reload if already loading
        if (this.detailsDialog.loadingGcodes || this.detailsDialog.loadingRuns) {
            return
        }

        try {
            this.detailsDialog.loadingGcodes = true
            this.detailsDialog.loadingRuns = true

            console.log('🔄 Loading complete job data with single API call...')

            // Single API call to get everything
            const response = await this.$store.dispatch('fleet/jobs/loadJobComplete', jobId)

            console.log('✅ Received complete job data:', response)

            // Extract the data from the complete response
            this.jobGcodes = response.gcode_files || []

            // Build allJobRuns from the complete response
            const newAllJobRuns: { [gcodeId: string]: FleetJobGcodeRun[] } = {}
            response.gcode_files.forEach((gcode: any) => {
                newAllJobRuns[gcode.id] = gcode.runs || []
            })
            this.allJobRuns = newAllJobRuns

            // Clear cache since we have fresh data
            this.runStatisticsCache = {}

            console.log('✅ Job data loaded:', {
                gcodes: this.jobGcodes.length,
                totalRuns: Object.values(newAllJobRuns).reduce((sum, runs) => sum + runs.length, 0)
            })

        } catch (error) {
            console.error('❌ Failed to load complete job data:', error)
            this.$toast.error('Failed to load job details')

            // Fallback to individual API calls if the complete endpoint fails
            console.log('🔄 Falling back to individual API calls...')
            await this.loadJobGcodesAndRunsFallback(jobId)

        } finally {
            this.detailsDialog.loadingGcodes = false
            this.detailsDialog.loadingRuns = false
        }
    }

    async loadJobGcodesAndRunsFallback(jobId: string) {
        try {
            // Load gcode files
            this.jobGcodes = await this.$store.dispatch('fleet/jobs/loadJobGcodes', jobId)

            // Early return if no gcode files to avoid unnecessary API calls
            if (!this.jobGcodes || this.jobGcodes.length === 0) {
                this.allJobRuns = {}
                return
            }

            // Load runs for each gcode file
            await this.loadAllJobRuns()

        } catch (error) {
            console.error('❌ Fallback loading also failed:', error)
            throw error
        }
    }

    async loadAllJobRuns() {
        if (!this.jobGcodes || this.jobGcodes.length === 0) {
            this.allJobRuns = {}
            return
        }

        // Clear cache before loading new data
        this.runStatisticsCache = {}

        try {
            // Load runs in parallel with better error isolation
            const runPromises = this.jobGcodes.map(async (gcode) => {
                try {
                    const runs = await this.$store.dispatch('fleet/jobs/loadJobGcodeRuns', gcode.id)
                    return { gcodeId: gcode.id, runs: runs || [], error: null }
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    console.warn(`Failed to load runs for gcode ${gcode.gcode_filename}:`, error)
                    return { gcodeId: gcode.id, runs: [], error: errorMessage }
                }
            })

            const results = await Promise.all(runPromises)

            // Build new object once instead of multiple Vue.set calls
            const newAllJobRuns: { [gcodeId: string]: FleetJobGcodeRun[] } = {}
            results.forEach(({ gcodeId, runs, error }) => {
                newAllJobRuns[gcodeId] = runs
                if (error) {
                    console.warn(`Error loading runs for ${gcodeId}: ${error}`)
                }
            })

            // Single reactive update
            this.allJobRuns = newAllJobRuns

        } catch (error: unknown) {
            console.error('Failed to load job runs:', error)
            this.allJobRuns = {}
        }
    }

    getCustomerName(customerId: string) {
        const customer = this.customers.find((c: FleetCustomer) => c.id === customerId)
        return customer ? customer.name : 'Unknown Customer'
    }

    getStatusColor(status: string) {
        const colors = {
            pending: 'orange',
            in_progress: 'blue',
            complete: 'green',
            cancelled: 'red',
        } as const

        return colors[status as keyof typeof colors] || 'grey'
    }

    getStatusTextColor(status: string) {
        return 'white'
    }

    getStatusIcon(status: string) {
        switch (status) {
            case 'pending':
                return this.mdiAlertOutline
            case 'in_progress':
                return this.mdiProgressClock
            case 'complete':
                return this.mdiCheckboxMarkedCircleOutline
            case 'cancelled':
                return this.mdiCloseCircleOutline
            default:
                return this.mdiAlertOutline
        }
    }

    getPriorityColor(priority: string) {
        switch (priority) {
            case 'high':
                return 'red'
            case 'medium':
                return 'orange'
            case 'low':
                return 'blue'
            default:
                return 'grey'
        }
    }

    getPriorityDisplay(priority: string) {
        switch (priority) {
            case 'high':
                return 'High'
            case 'medium':
                return 'Medium'
            case 'low':
                return 'Low'
            default:
                return 'Unknown'
        }
    }

    getJobRowClass(item: FleetJob) {
        if (item.status === 'cancelled') return 'text--disabled'
        if (item.due_date && new Date(item.due_date) < new Date()) return 'red--text'
        return ''
    }

    getDueDateClass(dueDate: string) {
        if (!dueDate) return ''
        const due = new Date(dueDate)
        const now = new Date()
        const diffTime = due.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return 'red--text font-weight-bold'
        if (diffDays <= 1) return 'orange--text font-weight-bold'
        if (diffDays <= 3) return 'amber--text'
        return ''
    }

    formatDateTime(dateString: string) {
        if (!dateString) return null
        return new Date(dateString).toLocaleString()
    }

    formatStatusDisplay(status: string) {
        return status.replace('_', ' ')
    }

    truncateText(text: string, length: number) {
        if (!text) return ''
        return text.length > length ? text.substring(0, length) + '...' : text
    }

    clickRow(item: FleetJob, event?: Event) {
        // Don't open details if the click was on an interactive element
        if (event && event.target) {
            const target = event.target as HTMLElement
            const isInteractiveElement = target.closest('.v-chip') || 
                                       target.closest('.v-btn') || 
                                       target.closest('.v-menu') ||
                                       target.closest('input[type="checkbox"]')
    
            if (isInteractiveElement) {
                return
            }
        }

        // Show loading toast for slow connections
        const loadingToast = setTimeout(() => {
            this.$toast.info('Loading job details...')
        }, 500)

        this.viewJobDetails(item).then(() => {
            clearTimeout(loadingToast)
        })
    }

    async viewJobDetails(item: FleetJob) {
        // Clear previous data immediately to show loading state
        this.jobGcodes = []
        this.allJobRuns = {}
        this.runStatisticsCache = {}

        this.detailsDialog.item = item
        this.detailsDialog.show = true

        // Load data asynchronously without blocking UI
        this.loadJobGcodesAndRuns(item.id).catch(error => {
            console.error('Failed to load job details:', error)
            this.$toast.error('Failed to load some job details')
        })
    }

    showContextMenu(e: any, item: FleetJob) {
        if (!this.contextMenu.shown) {
            e?.preventDefault()
        
            // Better positioning logic for both right-click and button click
            let x, y
        
            if (e.type === 'click') {
                // Button click - position relative to the button
                const rect = e.target.getBoundingClientRect()
                x = rect.left + rect.width / 2
                y = rect.bottom + 5
            } else {
                // Right-click - use mouse coordinates
                x = e?.clientX || e?.pageX || window.screenX / 2
                y = e?.clientY || e?.pageY || window.screenY / 2
            }
        
            this.contextMenu.shown = true
            this.contextMenu.x = x
            this.contextMenu.y = y
            this.contextMenu.item = item
        
            this.$nextTick(() => {
                this.contextMenu.shown = true
            })
        }
    }

    editJob(item: FleetJob) {
        this.createJobDialog.isEdit = true
        this.createJobDialog.job = item
        this.createJobDialog.show = true
    }

    async updateJobStatus(item: FleetJob, status: string) {
        try {
            await this.$store.dispatch('fleet/jobs/updateJobStatus', { jobId: item.id, status })
            this.$toast.success(`Job status updated to ${status.replace('_', ' ')}`)
            await this.refreshJobs()
        } catch (error) {
            console.error('Failed to update job status:', error)
            this.$toast.error('Failed to update job status')
        }
    }

    openCreateJobDialog() {
        this.createJobDialog.isEdit = false
        this.createJobDialog.job = null
        this.createJobDialog.show = true
    }

    openAddGcodeDialog() {
        this.addGcodeDialog.isEdit = false
        this.addGcodeDialog.editGcode = null
        this.addGcodeDialog.show = true
    }

    openActionsMenu(event: Event, item: FleetJob) {
        // Prevent the row click event
        event.stopPropagation()
    
        // Use the same showContextMenu method but with the button click coordinates
        this.showContextMenu(event, item)
    }

    async updateJobStatusFromTable(item: FleetJob, status: string) {
        try {
            await this.updateJobStatus(item, status)
        
            // If the details dialog is open and showing the same job, update it too
            if (this.detailsDialog.show && this.detailsDialog.item && this.detailsDialog.item.id === item.id) {
                this.detailsDialog.item = {
                    ...this.detailsDialog.item,
                    status: status,
                    updated_at: new Date().toISOString()
                }
            }
        
            // Refresh the job list to ensure consistency
            await this.refreshJobs()
        
        } catch (error) {
            console.error('Failed to update job status from table:', error)
            this.$toast.error('Failed to update job status')
        }
    }

    async viewGcodeRuns(gcode: FleetJobGcode) {
        this.gcodeRunsDialog.gcodeFile = gcode
        this.gcodeRunsDialog.show = true
        await this.refreshGcodeRuns()
    }

    async refreshGcodeRuns() {
        if (!this.gcodeRunsDialog.gcodeFile || this.gcodeRunsDialog.loading) return

        this.gcodeRunsDialog.loading = true
        try {
            const runs = await this.$store.dispatch('fleet/jobs/loadJobGcodeRuns', this.gcodeRunsDialog.gcodeFile.id)
            this.gcodeRuns = runs || []
        
            // OPTIMIZATION: Update allJobRuns efficiently
            this.allJobRuns = {
                ...this.allJobRuns,
                [this.gcodeRunsDialog.gcodeFile.id]: runs || []
            }
        
            // OPTIMIZATION: Clear cache for this specific gcode
            this.clearRunStatisticsCache(this.gcodeRunsDialog.gcodeFile.id)
        
        } catch (error) {
            console.error('Failed to load gcode runs:', error)
            this.$toast.error('Failed to load print runs')
        } finally {
            this.gcodeRunsDialog.loading = false
        }
    }

    // HELPER METHOD - Clear specific cache entries
    clearRunStatisticsCache(gcodeId?: string) {
        if (gcodeId) {
            // Clear cache entries for specific gcode
            Object.keys(this.runStatisticsCache).forEach(key => {
                if (key.startsWith(`${gcodeId}-`)) {
                    delete this.runStatisticsCache[key]
                }
            })
        } else {
            // Clear all cache
            this.runStatisticsCache = {}
        }
    }
    closeGcodeRunsDialog() {
        this.gcodeRunsDialog.show = false
        this.gcodeRunsDialog.gcodeFile = null
        this.gcodeRuns = []
    }

    updateLocalRunData(runId: string, updates: Partial<FleetJobGcodeRun>) {
        // Update gcodeRuns array if viewing runs dialog
        if (this.gcodeRuns && this.gcodeRuns.length > 0) {
            const runIndex = this.gcodeRuns.findIndex(r => r.id === runId)
            if (runIndex !== -1) {
                // Use Vue.set for proper reactivity in Vue 2
                this.$set(this.gcodeRuns, runIndex, { ...this.gcodeRuns[runIndex], ...updates })
            }
        }

        // Update allJobRuns data
        Object.keys(this.allJobRuns).forEach(gcodeId => {
            const runs = this.allJobRuns[gcodeId]
            const runIndex = runs.findIndex(r => r.id === runId)
            if (runIndex !== -1) {
                // Use Vue.set for proper reactivity in Vue 2
                this.$set(runs, runIndex, { ...runs[runIndex], ...updates })
                // Clear cache for this gcode since data changed
                this.clearRunStatisticsCache(gcodeId)
            }
        })

        // Force update to ensure computed properties recalculate
        this.$forceUpdate()
    }

    getRunStatistics(gcode: FleetJobGcode) {
        const cacheKey = `${gcode.id}-${gcode.required_runs}`
    
        // OPTIMIZATION: Use better cache key that includes runs data hash
        const runs = this.allJobRuns[gcode.id] || []
        const runsHash = runs.length ? runs.map(r => `${r.id}-${r.status}-${r.qc}`).join(',') : 'empty'
        const fullCacheKey = `${cacheKey}-${runsHash}`
    
        if (this.runStatisticsCache[fullCacheKey] && !this.detailsDialog.loadingRuns) {
            return this.runStatisticsCache[fullCacheKey]
        }

        const requiredRuns = gcode.required_runs || 0

        if (!runs || runs.length === 0) {
            const emptyStats = {
                requiredRuns,
                inProgress: 0,
                completedNoQC: 0,
                passedQC: 0,
                totalFailed: 0,
                technicalFailures: 0,
                qcFailures: 0,
                goodRuns: 0,
                remainingNeeded: requiredRuns,
                totalRuns: 0,
                percentages: {
                    remaining: 100,
                    inProgress: 0,
                    completed: 0,
                    passed: 0,
                }
            }
            this.runStatisticsCache[fullCacheKey] = emptyStats
            return emptyStats
        }

        // OPTIMIZATION: Calculate all stats in one pass
        let inProgress = 0, completedNoQC = 0, passedQC = 0, technicalFailures = 0, qcFailures = 0

        runs.forEach(run => {
            if (run.status === 'in_progress') {
                inProgress++
            } else if (run.status === 'success') {
                if (!run.qc || run.qc === null) {
                    completedNoQC++
                } else if (run.qc === 'pass') {
                    passedQC++
                } else if (run.qc === 'fail') {
                    qcFailures++
                }
            } else if (run.status === 'fail' || run.status === 'cancelled') {
                technicalFailures++
            }
        })

        const totalFailed = technicalFailures + qcFailures
        const goodRuns = inProgress + completedNoQC + passedQC
        const remainingNeeded = Math.max(0, requiredRuns - goodRuns)
        const total = Math.max(requiredRuns, goodRuns)
        const safeTotal = total > 0 ? total : 1

        const stats = {
            requiredRuns,
            inProgress,
            completedNoQC,
            passedQC,
            totalFailed,
            technicalFailures,
            qcFailures,
            goodRuns,
            remainingNeeded,
            totalRuns: runs.length,
            percentages: {
                remaining: Math.max(0, (remainingNeeded / safeTotal) * 100),
                inProgress: (inProgress / safeTotal) * 100,
                completed: (completedNoQC / safeTotal) * 100,
                passed: (passedQC / safeTotal) * 100,
            }
        }

        this.runStatisticsCache[fullCacheKey] = stats
        return stats
    }

    get highPriorityJobsCount(): number {
        return this.jobs.filter((job: FleetJob) => job.priority === 'high').length
    }

    get mediumPriorityJobsCount(): number {
        return this.jobs.filter((job: FleetJob) => job.priority === 'medium').length
    }

    get lowPriorityJobsCount(): number {
        return this.jobs.filter((job: FleetJob) => job.priority === 'low').length
    }

    async deleteJob() {
        const jobToDelete = this.contextMenu.item
    
        try {
            // Optimistically remove from jobs list
            const jobIndex = this.jobs.findIndex(j => j.id === jobToDelete.id)
            if (jobIndex >= 0) {
                this.$store.commit('fleet/jobs/removeJob', jobToDelete.id) // You'll need this mutation
            }

            // Close any open dialogs for this job
            if (this.detailsDialog.show && this.detailsDialog.item?.id === jobToDelete.id) {
                this.detailsDialog.show = false
            }

            // Delete from backend
            await this.$store.dispatch('fleet/jobs/deleteJob', jobToDelete.id)
            this.$toast.success('Job deleted successfully')
            this.deleteDialog = false

        } catch (error) {
            console.error('Failed to delete job:', error)
            this.$toast.error('Failed to delete job')
        
            // Restore on error by refreshing
            await this.refreshJobs()
        }
    }

    async deleteSelectedJobs() {
        this.$toast.info('Batch delete will be implemented in phase 2')
        this.deleteSelectedDialog = false
    }

    sortJobs(items: any[], sortBy: string[], sortDesc: boolean[]) {
        const sortByClean = sortBy.length ? sortBy[0] : 'created_at'
        const sortDescClean = sortDesc[0]

        if (items !== undefined) {
            items.sort(function (a, b) {
                if (a[sortByClean] === b[sortByClean]) return 0
                if (a[sortByClean] === null || a[sortByClean] === undefined) return -1
                if (b[sortByClean] === null || b[sortByClean] === undefined) return 1

                if (a[sortByClean].constructor === String && b[sortByClean].constructor === String) {
                    return a[sortByClean].localeCompare(b[sortByClean], undefined, { sensivity: 'base' })
                }

                return a[sortByClean] - b[sortByClean]
            })

            if (sortDescClean) items.reverse()
        }

        return items
    }

    advancedSearch(value: string, search: string) {
        return value != null && search != null && value.toString().toLowerCase().indexOf(search.toLowerCase()) !== -1
    }

    changeColumnVisible(name: string) {
        if (this.headers.filter((header) => header.value === name).length) {
            const value = this.headers.filter((header) => header.value === name)[0].visible
            // Implement column visibility toggle if needed
        }
    }

    editGcodeFile(gcode: FleetJobGcode) {
        this.addGcodeDialog.isEdit = true
        this.addGcodeDialog.editGcode = gcode
        this.addGcodeDialog.show = true
    }

    async deleteGcodeFile(gcode: FleetJobGcode) {
        // Check if there are runs associated
        const stats = this.getRunStatistics(gcode)
        if (stats.totalRuns > 0) {
            this.$toast.error(`Cannot delete GCode file. It has ${stats.totalRuns} associated print runs.`)
            return
        }

        if (!confirm(`Are you sure you want to delete "${gcode.gcode_filename}"?`)) {
            return
        }

        try {
            // Optimistically remove from local state first
            const gcodeIndex = this.jobGcodes.findIndex(g => g.id === gcode.id)
            if (gcodeIndex >= 0) {
                this.jobGcodes.splice(gcodeIndex, 1)
            }

            // Clear cache for this gcode
            this.clearRunStatisticsCache(gcode.id)

            // Delete from backend
            await this.$store.dispatch('fleet/jobs/deleteJobGcode', gcode.id)
            this.$toast.success('GCode file deleted successfully')

        } catch (error) {
            console.error('Failed to delete gcode file:', error)
            this.$toast.error('Failed to delete GCode file')
        
            // Restore on error by reloading
            if (this.detailsDialog.item) {
                await this.loadJobGcodesAndRuns(this.detailsDialog.item.id)
            }
        }
    }

    // Optional: Add a method to get additional printer info for tooltips
    getPrinterInfo(printer: any): string {
        const info = []
    
        if (printer.toolhead?.filament_type) {
            info.push(`Filament: ${printer.toolhead.filament_type}`)
        }
    
        if (printer.current_file?.filename) {
            info.push(`Current File: ${printer.current_file.filename}`)
        }
    
        if (printer.print_stats?.state === 'printing' && printer.virtual_sdcard?.progress) {
            const progress = Math.round(printer.virtual_sdcard.progress * 100)
            info.push(`Progress: ${progress}%`)
        }
    
        return info.join(' • ')
    }
    async onCreateRun(createData: any) {
        try {
            await this.$store.dispatch('fleet/jobs/createJobGcodeRun', {
                jobGcodeId: this.gcodeRunsDialog.gcodeFile!.id,
                run: createData
            })
            this.$toast.success('Print run added successfully')
            await this.refreshGcodeRuns()
        } catch (error: unknown) {
            console.error('Failed to create run:', error)
            this.$toast.error('Failed to add print run')
        }
    }

    async onUpdateRun(data: { runId: string, updateData: any }) {
        try {
            await this.$store.dispatch('fleet/jobs/updateJobGcodeRun', {
                runId: data.runId,
                updateData: data.updateData
            })
            this.$toast.success('Print run updated successfully')
            await this.refreshGcodeRuns()
        } catch (error: unknown) {
            console.error('Failed to update run:', error)
            this.$toast.error('Failed to update print run')
        }
    }

    async onUpdateRunStatus(data: { run: FleetJobGcodeRun, status: string }) {
        const { run, status } = data
        const originalStatus = run.status

        try {
            // OPTIMISTIC UPDATE: Update UI immediately before API call
            this.updateLocalRunData(run.id, { status })

            // Send API request
            await this.$store.dispatch('fleet/jobs/updateJobGcodeRun', {
                runId: run.id,
                updateData: { status }
            })

            // Success - show success toast
            this.$toast.success(`Run status updated to ${status.replace('_', ' ')}`)

        } catch (error) {
            console.error('Failed to update run status:', error)

            // REVERT: Update UI back to original value on failure
            this.updateLocalRunData(run.id, { status: originalStatus })

            // Show error toast
            this.$toast.error('Failed to update run status')
        }
    }

    async onUpdateRunQC(data: { run: FleetJobGcodeRun, qc: string | null }) {
        const { run, qc } = data
        const originalQC = run.qc

        try {
            // OPTIMISTIC UPDATE: Update UI immediately before API call
            this.updateLocalRunData(run.id, { qc })

            // Send API request
            await this.$store.dispatch('fleet/jobs/updateJobGcodeRunQC', {
                runId: run.id,
                qc: qc
            })

            // Success - show success toast
            this.$toast.success(`QC updated to ${qc || 'not set'}`)

        } catch (error) {
            console.error('Failed to update run QC:', error)

            // REVERT: Update UI back to original value on failure
            this.updateLocalRunData(run.id, { qc: originalQC })

            // Show error toast
            this.$toast.error('Failed to update QC')
        }
    }

    async onDeleteRun(run: FleetJobGcodeRun) {
        try {
            // Optimistically remove from local state
            const runIndex = this.gcodeRuns.findIndex(r => r.id === run.id)
            if (runIndex >= 0) {
                this.gcodeRuns.splice(runIndex, 1)
            }

            // Update allJobRuns data
            Object.keys(this.allJobRuns).forEach(gcodeId => {
                const runs = this.allJobRuns[gcodeId]
                const runIndex = runs.findIndex(r => r.id === run.id)
                if (runIndex >= 0) {
                    runs.splice(runIndex, 1)
                    this.clearRunStatisticsCache(gcodeId)
                }
            })

            // Delete from backend
            await this.$store.dispatch('fleet/jobs/deleteJobGcodeRun', run.id)
            this.$toast.success('Print run deleted successfully')

        } catch (error) {
            console.error('Failed to delete run:', error)
            this.$toast.error('Failed to delete print run')

            // Restore on error
            await this.refreshGcodeRuns()
        }
    }

    // Helper method for type-safe error message extraction
    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }
        if (typeof error === 'string') {
            return error
        }
        return 'Unknown error occurred'
    }

    // Helper method for type-safe response detail extraction
    private getResponseDetail(error: unknown): string | null {
        // Check if it's an axios-like error with response.data.detail
        if (
            error &&
            typeof error === 'object' &&
            'response' in error &&
            error.response &&
            typeof error.response === 'object' &&
            'data' in error.response &&
            error.response.data &&
            typeof error.response.data === 'object' &&
            'detail' in error.response.data
        ) {
            return String((error.response.data as any).detail)
        }
        return null
    }

    async refreshJobsInBackground() {
        try {
            await this.refreshJobs()
            console.log('✅ Jobs list refreshed in background')
        } catch (error) {
            console.error('Background refresh failed:', error)
            this.$toast.error('Failed to refresh jobs list')
        }
    }

    onJobDetailsClose() {
        this.detailsDialog.show = false

        // Clear data immediately instead of using setTimeout
        this.detailsDialog.item = null
        this.jobGcodes = []
        this.allJobRuns = {}
        this.detailsDialog.loadingGcodes = false
        this.detailsDialog.loadingRuns = false
        this.runStatisticsCache = {} // Also clear the cache
    }

    async onJobDetailsRefresh() {
        if (!this.detailsDialog.item) return

        this.$toast.info('Refreshing job details...')
        await this.loadJobGcodesAndRuns(this.detailsDialog.item.id)
        this.$toast.success('Job details refreshed')
    }

    async onJobDetailsUpdateStatus(status: string) {
        if (!this.detailsDialog.item) return

        try {
            await this.updateJobStatus(this.detailsDialog.item, status)

            // Update the item in the details dialog to reflect the change immediately
            this.detailsDialog.item = {
                ...this.detailsDialog.item,
                status: status,
                updated_at: new Date().toISOString()
            }

            // Also refresh the job list to ensure consistency
            await this.refreshJobs()

        } catch (error) {
            console.error('Failed to update job status from details:', error)
            this.$toast.error('Failed to update job status')
        }
    }

    onJobDetailsEditJob(job: FleetJob) {
        this.editJob(job)
        this.detailsDialog.show = false // Close the details dialog
    }

    onJobDetailsAddGcode(job: FleetJob) {
        this.addGcodeDialog.isEdit = false
        this.addGcodeDialog.editGcode = null
        this.addGcodeDialog.show = true
    }

    onJobDetailsEditGcode(gcode: FleetJobGcode) {
        this.addGcodeDialog.isEdit = true
        this.addGcodeDialog.editGcode = gcode
        this.addGcodeDialog.show = true
    }

    async onJobDetailsDeleteGcode(gcode: FleetJobGcode) {
        await this.deleteGcodeFile(gcode)
    }

    onJobDetailsViewGcodeRuns(gcode: FleetJobGcode) {
        this.viewGcodeRuns(gcode)
    }

    onJobDetailsToggle(visible: boolean) {
        if (!visible) {
            this.onJobDetailsClose()
        } else {
            this.detailsDialog.show = visible
        }
    }

    async createBatchGcodeFilesInBackground(jobId: string, batchGcodes: any[]) {
        if (batchGcodes.length === 0) return
        this.$toast.info(`Creating ${batchGcodes.length} GCode files...`)

        try {
            // Prepare batch data with validation
            const gcodeFiles = batchGcodes.map((gcodeFile, index) => {
                console.log(`🔍 Processing file ${index + 1}:`, gcodeFile)
                // Ensure all required fields are present and valid
                const processedFile = {
                    gcode_filename: String(gcodeFile.gcode_filename || '').trim(),
                    required_runs: Number(gcodeFile.required_runs) || 1,
                    preferred_printer: String(gcodeFile.preferred_printer || 'any').trim(),
                    filament_type: String(gcodeFile.filament_type || '').trim()
                }
                console.log(`✅ Processed file ${index + 1}:`, processedFile)
                // Validate required fields
                if (!processedFile.gcode_filename) {
                    throw new Error(`File ${index + 1}: Missing filename`)
                }
                if (!processedFile.filament_type) {
                    throw new Error(`File ${index + 1}: Missing filament type`)
                }
                if (processedFile.required_runs <= 0) {
                    throw new Error(`File ${index + 1}: Invalid required runs`)
                }
                if (!['HS-Pro', 'HS-3', 'any'].includes(processedFile.preferred_printer)) {
                    throw new Error(`File ${index + 1}: Invalid printer preference`)
                }
                return processedFile
            })

            console.log('🔧 Final batch data:', { jobId, gcodeFiles })

            // Single batch API call
            const result = await this.$store.dispatch('fleet/jobs/createJobGcodesBatch', {
                jobId: jobId,
                gcodeFiles: gcodeFiles
            })

            console.log('✅ Batch creation result:', result)

            // Handle results
            if (result.created_count > 0) {
                this.$toast.success(`✅ Successfully created ${result.created_count} GCode files`)
            }

            if (result.failed_count > 0) {
                this.$toast.error(`❌ Failed to create ${result.failed_count} GCode files`)
                result.errors.forEach((error: any) => {
                    console.error('GCode creation error:', error)
                })
            }

        } catch (error: unknown) {
            console.error('❌ Batch GCode creation failed:', error)

            // Type-safe error handling
            const errorMessage = this.getErrorMessage(error)
            const responseDetail = this.getResponseDetail(error)

            console.error('❌ Error response:', responseDetail)
            this.$toast.error('Batch GCode creation failed: ' + (responseDetail || errorMessage))

        } finally {
            await this.refreshJobsInBackground()
        }
    }

    async onJobCreated(data: { job: FleetJob, batchGcodes: any[] }) {
        console.log('🎉 Job created:', data.job)

        // Handle batch GCode creation in background
        if (data.batchGcodes.length > 0) {
            console.log('🔧 Creating batch GCodes:', data.batchGcodes)
            this.createBatchGcodeFilesInBackground(data.job.id, data.batchGcodes)
        } else {
            // Just refresh jobs list
            this.refreshJobsInBackground()
        }
    }

    async onJobUpdated(job: FleetJob) {
        console.log('✏️ Job updated:', job)

        // If the details dialog is open and showing the same job, update it
        if (this.detailsDialog.show && this.detailsDialog.item &&
            this.detailsDialog.item.id === job.id) {
            await this.loadJobGcodesAndRuns(this.detailsDialog.item.id)
        }

        await this.refreshJobs()
    }

    onGcodeCreated(gcode: FleetJobGcode) {
        // Refresh the job's gcode list
        if (this.detailsDialog.item) {
            this.loadJobGcodesAndRuns(this.detailsDialog.item.id)
        }
    }

    onGcodeUpdated(gcode: FleetJobGcode) {
        // Update the local gcode in the list
        const index = this.jobGcodes.findIndex(g => g.id === gcode.id)
        if (index >= 0) {
            this.jobGcodes[index] = gcode
        }
    }

    onAddGcodeClose() {
        this.addGcodeDialog.show = false
        this.addGcodeDialog.isEdit = false
        this.addGcodeDialog.editGcode = null
    }

    @Watch('allJobRuns', { deep: true })
    onAllJobRunsChanged() {
        // Use window.setTimeout to get the browser version
        if (this.cacheCleanupTimeout) {
            window.clearTimeout(this.cacheCleanupTimeout)
        }
        this.cacheCleanupTimeout = window.setTimeout(() => {
            this.runStatisticsCache = {}
        }, 100)
    }

    beforeDestroy() {
        this.$root.$off('fullscreen-files-uploaded', this.handleFullscreenUpload)

        if (this.cacheCleanupTimeout) {
            clearTimeout(this.cacheCleanupTimeout)
        }
    }

}
</script>

<style scoped>
::v-deep .job-list-table th {
    white-space: nowrap;
}

::v-deep .job-list-table th.text-start {
    padding-right: 0 !important;
}

.breathing-blue {
    background: linear-gradient(90deg, #1976d2 0%, #2196f3 25%, #64b5f6 50%, #2196f3 75%, #1976d2 100% );
    background-size: 200% 100%;
    animation: roll 2s linear infinite;
    position: relative;
    overflow: hidden;
}

@keyframes roll {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

/* Progress bar styling */
.gcode-progress-bar {
    transition: all 0.3s ease;
}

.progress-segment {
    transition: width 0.3s ease;
}

.gcode-file-item {
    transition: box-shadow 0.2s ease;
}

    .gcode-file-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

/* Failure bar styling */
.failure-bar {
    transition: all 0.3s ease;
}

    .failure-bar:hover {
        transform: scale(1.05);
    }

/* Statistics text styling */
.gcode-progress-stats {
    font-family: 'Roboto Mono', monospace;
}

/* Legend styling */
.legend-item {
    display: flex;
    align-items: center;
}

.legend-color {
    width: 16px;
    height: 12px;
    border-radius: 2px;
    margin-right: 8px;
    display: inline-block;
}

/* GCode Upload Zone Styles */
.gcode-upload-zone {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fafafa;
    transition: all 0.3s ease;
}

/* Dark theme support */
.theme--dark .gcode-upload-zone {
    border-color: #424242;
    background-color: #303030;
}

.gcode-skeleton {
    opacity: 0.7;
    animation: pulse 1.5s ease-in-out infinite alternate;
}

@keyframes pulse {
    0% {
        opacity: 0.6;
    }

    100% {
        opacity: 1;
    }
}

/* Smooth transitions for data loading */
.gcode-file-item {
    transition: all 0.3s ease;
}

    .gcode-file-item.loading {
        opacity: 0.5;
        pointer-events: none;
    }

/* Loading overlay for progress sections */
.progress-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    border-radius: inherit;
}

.theme--dark .progress-loading-overlay {
    background: rgba(0, 0, 0, 0.8);
}

/* Enhanced gcode file item with better loading states */
.gcode-file-item-container {
    position: relative;
    overflow: hidden;
}

/* Shimmer effect for loading */
.loading-shimmer {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0) 100%);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
    0% {
        background-position: -200px 0;
    }

    100% {
        background-position: calc(200px + 100%) 0;
    }
}

.theme--dark .loading-shimmer {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0) 100%);
}

/* Button loading states */
.v-btn.loading {
    pointer-events: none;
    opacity: 0.6;
}

/* Dialog loading overlay */
.dialog-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.theme--dark .dialog-loading-overlay {
    background: rgba(33, 33, 33, 0.9);
}

.v-tabs {
    border-bottom: 1px solid #e0e0e0;
}

.v-tab {
    text-transform: none !important;
}

</style>
