<template>
    <!-- GCode Runs Dialog -->
    <v-dialog v-model="dialogVisible"
              :max-width="1200"
              persistent
              @keydown.esc="closeDialog">
        <panel :title="`Print Runs: ${gcodeFile?.gcode_filename || ''}`"
               :icon="mdiPlay"
               card-class="gcode-runs-dialog"
               :margin-bottom="false">
            <template #buttons>
                <v-btn icon tile @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text class="px-0">
                <div class="px-6 pb-3">
                    <v-row>
                        <v-col cols="8">
                            <div class="text-h6 mb-2">{{ gcodeFile?.gcode_filename }}</div>
                            <div class="d-flex align-center">
                                <v-chip small color="blue" text-color="white" class="mr-2">
                                    {{ gcodeFile?.filament_type }}
                                </v-chip>
                                <v-chip small color="orange" text-color="white" class="mr-2">
                                    {{ gcodeFile?.required_runs }} required
                                </v-chip>
                                <v-chip small color="green" text-color="white">
                                    {{ gcodeFile?.preferred_printer }}
                                </v-chip>
                            </div>
                        </v-col>
                        <v-col cols="4" class="d-flex justify-end align-center">
                            <v-btn color="success"
                                   @click="openCreateRunDialog">
                                <v-icon left>{{ mdiPlus }}</v-icon>
                                Add Run
                            </v-btn>
                            <v-btn :loading="loading"
                                   class="ml-2"
                                   @click="refreshRuns">
                                <v-icon>{{ mdiRefresh }}</v-icon>
                            </v-btn>
                        </v-col>
                    </v-row>
                </div>
                <v-divider />
                <overlay-scrollbars style="height: 500px">
                    <v-data-table :items="runs"
                                  :headers="runsTableHeaders"
                                  :items-per-page="25"
                                  :loading="loading"
                                  class="gcode-runs-table"
                                  item-key="id"
                                  :sort-by="['started_at']"
                                  :sort-desc="[true]">

                        <template v-slot:item.status="{ item }">
                            <v-menu offset-y>
                                <template #activator="{ on, attrs }">
                                    <v-chip :color="getRunStatusColor(item.status)"
                                            :text-color="getRunStatusTextColor(item.status)"
                                            small
                                            style="cursor: pointer;"
                                            v-bind="attrs"
                                            v-on="on">
                                        <v-icon left x-small>{{ getRunStatusIcon(item.status) }}</v-icon>
                                        {{ item.status.replace('_', ' ') }}
                                        <v-icon right x-small>{{ mdiChevronDown }}</v-icon>
                                    </v-chip>
                                </template>
                                <v-list dense>
                                    <v-list-item @click="updateRunStatus(item, 'in_progress')">
                                        <v-list-item-icon>
                                            <v-icon small color="blue">{{ mdiProgressClock }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title>In Progress</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item @click="updateRunStatus(item, 'success')">
                                        <v-list-item-icon>
                                            <v-icon small color="green">{{ mdiCheck }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title>Success</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item @click="updateRunStatus(item, 'fail')">
                                        <v-list-item-icon>
                                            <v-icon small color="red">{{ mdiAlertOutline }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title>Failed</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item @click="updateRunStatus(item, 'cancelled')">
                                        <v-list-item-icon>
                                            <v-icon small color="grey">{{ mdiCancel }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title>Cancelled</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </template>

                        <template v-slot:item.qc="{ item }">
                            <v-menu offset-y>
                                <template #activator="{ on, attrs }">
                                    <v-chip :color="getQCColor(item.qc)"
                                            :text-color="getQCTextColor(item.qc)"
                                            small
                                            style="cursor: pointer;"
                                            v-bind="attrs"
                                            v-on="on">
                                        <v-icon left x-small>{{ getQCIcon(item.qc) }}</v-icon>
                                        {{ getQCDisplay(item.qc) }}
                                        <v-icon right x-small>{{ mdiChevronDown }}</v-icon>
                                    </v-chip>
                                </template>
                                <v-list dense>
                                    <v-list-item @click="updateRunQC(item, 'pass')">
                                        <v-list-item-icon>
                                            <v-icon small color="green">{{ mdiCheckboxMarkedCircleOutline }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title>Pass</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item @click="updateRunQC(item, 'fail')">
                                        <v-list-item-icon>
                                            <v-icon small color="red">{{ mdiCloseCircleOutline }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title>Fail</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-list-item @click="updateRunQC(item, null)">
                                        <v-list-item-icon>
                                            <v-icon small color="grey">{{ mdiHelpCircleOutline }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title>Not Set</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </template>

                        <template v-slot:item.started_at="{ item }">
                            {{ formatDateTime(item.started_at) }}
                        </template>

                        <template v-slot:item.completed_at="{ item }">
                            {{ item.completed_at ? formatDateTime(item.completed_at) : '--' }}
                        </template>

                        <template v-slot:item.actions="{ item }">
                            <v-btn icon small @click="editRun(item)">
                                <v-icon small>{{ mdiPencil }}</v-icon>
                            </v-btn>
                            <v-btn icon small color="error" @click="deleteRun(item)">
                                <v-icon small>{{ mdiDelete }}</v-icon>
                            </v-btn>
                        </template>

                        <template slot="no-data">
                            <div class="text-center pa-4">
                                <div class="text--secondary mb-2">No print runs found</div>
                                <v-btn color="primary" @click="openCreateRunDialog">
                                    <v-icon left>{{ mdiPlus }}</v-icon>
                                    Add First Run
                                </v-btn>
                            </div>
                        </template>
                    </v-data-table>
                </overlay-scrollbars>
            </v-card-text>
        </panel>

        <!-- Create/Edit Run Dialog -->
        <v-dialog v-model="createRunDialog.show"
                  :max-width="600"
                  persistent
                  @keydown.esc="closeCreateRunDialog">
            <panel :title="createRunDialog.isEdit ? 'Edit Print Run' : 'Add Print Run'"
                   :icon="createRunDialog.isEdit ? mdiPencil : mdiPlus"
                   card-class="create-run-dialog"
                   :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="closeCreateRunDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <v-form ref="runForm" v-model="createRunDialog.valid">
                        <v-row>
                            <v-col cols="12">
                                <v-select v-model="createRunDialog.form.printer_hostname"
                                          :items="sortedPrinterOptions"
                                          item-text="text"
                                          item-value="value"
                                          label="Select Printer"
                                          :rules="[v => !!v || 'Printer selection is required']"
                                          outlined
                                          dense
                                          required
                                          :hint="getPrinterSelectionHint()"
                                          persistent-hint>
                                    <template v-slot:item="{ item }">
                                        <v-list-item-content>
                                            <v-list-item-title>
                                                <div class="d-flex align-center">
                                                    <span :class="{ 'text--disabled': item.disabled }">
                                                        {{ item.printer.socket?.hostname || 'Unknown' }}
                                                    </span>

                                                    <!-- Status Chip -->
                                                    <v-chip :color="getPrinterChipColor(item.printer)"
                                                            :text-color="getPrinterChipTextColor(item.printer)"
                                                            x-small
                                                            class="ml-2">
                                                        {{ getPrinterDisplayStatus(item.printer) }}
                                                    </v-chip>

                                                    <!-- Model Chip -->
                                                    <v-chip color="blue-grey"
                                                            text-color="white"
                                                            x-small
                                                            class="ml-1">
                                                        {{ getPrinterModel(item.printer.socket?.hostname) || 'Unknown' }}
                                                    </v-chip>

                                                    <!-- Filament Warning Icon -->
                                                    <v-icon v-if="item.hasFilamentMismatch"
                                                            color="orange"
                                                            small
                                                            class="ml-2"
                                                            :title="`Filament mismatch: GCode needs ${item.requiredFilament}, printer has ${item.printerFilament}`">
                                                        mdi-alert-outline
                                                    </v-icon>
                                                </div>
                                            </v-list-item-title>
                                            <v-list-item-subtitle>
                                                <div class="d-flex align-center">
                                                    <span v-if="item.printerFilament">
                                                        Current: {{ item.printerFilament }}
                                                    </span>
                                                    <span v-else class="text--disabled">
                                                        No filament detected
                                                    </span>

                                                    <!-- Filament Mismatch Warning -->
                                                    <v-chip v-if="item.hasFilamentMismatch"
                                                            color="orange"
                                                            text-color="white"
                                                            x-small
                                                            class="ml-2">
                                                        <v-icon left x-small>mdi-alert</v-icon>
                                                        Needs {{ item.requiredFilament }}
                                                    </v-chip>

                                                    <!-- Perfect Match Indicator -->
                                                    <v-chip v-else-if="item.requiredFilament && item.printerFilament &&
                                          item.requiredFilament.toLowerCase() === item.printerFilament.toLowerCase()"
                                                            color="green"
                                                            text-color="white"
                                                            x-small
                                                            class="ml-2">
                                                        <v-icon left x-small>mdi-check</v-icon>
                                                        Perfect Match
                                                    </v-chip>
                                                </div>
                                            </v-list-item-subtitle>
                                        </v-list-item-content>
                                        <v-list-item-action v-if="item.disabled">
                                            <v-icon small color="grey">mdi-lock</v-icon>
                                        </v-list-item-action>
                                    </template>

                                    <template v-slot:selection="{ item }">
                                        <div class="d-flex align-center">
                                            <span>{{ item.printer.socket?.hostname || 'Unknown' }}</span>

                                            <!-- Status Chip -->
                                            <v-chip :color="getPrinterChipColor(item.printer)"
                                                    :text-color="getPrinterChipTextColor(item.printer)"
                                                    x-small
                                                    class="ml-2">
                                                {{ getPrinterDisplayStatus(item.printer) }}
                                            </v-chip>

                                            <!-- Filament Warning in Selection -->
                                            <v-icon v-if="item.hasFilamentMismatch"
                                                    color="orange"
                                                    small
                                                    class="ml-1"
                                                    :title="`Filament mismatch: needs ${item.requiredFilament}`">
                                                mdi-alert-outline
                                            </v-icon>
                                        </div>
                                    </template>

                                    <template v-slot:prepend-item>
                                        <v-list-item class="px-3 py-2" style="background-color: rgba(0,0,0,0.05);">
                                            <v-list-item-content>
                                                <v-list-item-subtitle class="text-caption">
                                                    <strong>GCode Requirements:</strong>
                                                    {{ gcodeFile?.preferred_printer || 'Any' }} printer,
                                                    {{ gcodeFile?.filament_type || 'No filament specified' }}
                                                </v-list-item-subtitle>
                                                <v-list-item-subtitle class="text-caption mt-1">
                                                    Showing {{ sortedPrinterOptions.length }} compatible printer(s)
                                                </v-list-item-subtitle>
                                            </v-list-item-content>
                                        </v-list-item>
                                        <v-divider></v-divider>
                                    </template>
                                </v-select>

                                <!-- Filament Mismatch Warning Alert -->
                                <v-alert v-if="getSelectedPrinterMismatch()"
                                         type="warning"
                                         outlined
                                         dense
                                         class="mt-2 mb-0">
                                    <div class="d-flex align-center">
                                        <v-icon left small>mdi-alert-outline</v-icon>
                                        <div>
                                            <strong>Filament Mismatch:</strong>
                                            This GCode file requires <strong>{{ gcodeFile?.filament_type }}</strong>,
                                            but the selected printer currently has <strong>{{ getSelectedPrinterFilament() }}</strong> loaded.
                                            <br>
                                            <span class="text-caption">Please verify filament compatibility or change filament before printing.</span>
                                        </div>
                                    </div>
                                </v-alert>
                            </v-col>
                            <v-col cols="6" v-if="createRunDialog.isEdit">
                                <v-select v-model="createRunDialog.form.status"
                                          :items="runStatusOptions"
                                          label="Status"
                                          outlined
                                          dense />
                            </v-col>
                            <v-col :cols="createRunDialog.isEdit ? 6 : 12" v-if="createRunDialog.isEdit">
                                <v-select v-model="createRunDialog.form.qc"
                                          :items="qcOptions"
                                          label="Quality Control"
                                          outlined
                                          dense />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field v-model="createRunDialog.form.moonraker_job_id"
                                              label="Moonraker Job ID (Optional)"
                                              outlined
                                              dense />
                            </v-col>
                            <v-col cols="12">
                                <v-textarea v-model="createRunDialog.form.notes"
                                            label="Notes (Optional)"
                                            outlined
                                            dense
                                            rows="3" />
                            </v-col>
                        </v-row>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn text @click="closeCreateRunDialog">Cancel</v-btn>
                    <v-btn color="primary"
                           :loading="createRunDialog.loading"
                           :disabled="!createRunDialog.valid"
                           @click="saveRun">
                        {{ createRunDialog.isEdit ? 'Update' : 'Add' }}
                    </v-btn>
                </v-card-actions>
            </panel>
        </v-dialog>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'

import {
    mdiPlay,
    mdiCloseThick,
    mdiPlus,
    mdiRefresh,
    mdiPencil,
    mdiDelete,
    mdiChevronDown,
    mdiProgressClock,
    mdiCheck,
    mdiAlertOutline,
    mdiCancel,
    mdiCheckboxMarkedCircleOutline,
    mdiCloseCircleOutline,
    mdiHelpCircleOutline,
} from '@mdi/js'

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
    components: { Panel },
})
export default class PrintRunsDialog extends Mixins(BaseMixin) {
    mdiPlay = mdiPlay
    mdiCloseThick = mdiCloseThick
    mdiPlus = mdiPlus
    mdiRefresh = mdiRefresh
    mdiPencil = mdiPencil
    mdiDelete = mdiDelete
    mdiChevronDown = mdiChevronDown
    mdiProgressClock = mdiProgressClock
    mdiCheck = mdiCheck
    mdiAlertOutline = mdiAlertOutline
    mdiCancel = mdiCancel
    mdiCheckboxMarkedCircleOutline = mdiCheckboxMarkedCircleOutline
    mdiCloseCircleOutline = mdiCloseCircleOutline
    mdiHelpCircleOutline = mdiHelpCircleOutline

    @Prop({ type: Boolean, default: false })
    readonly value!: boolean

    @Prop({ type: Object, default: null })
    readonly gcodeFile!: FleetJobGcode | null

    @Prop({ type: Array, default: () => [] })
    readonly runs!: FleetJobGcodeRun[]

    @Prop({ type: Boolean, default: false })
    readonly loading!: boolean

    private createRunDialog = {
        show: false,
        isEdit: false,
        valid: false,
        loading: false,
        form: {
            id: '',
            printer_hostname: '',
            status: 'in_progress',
            moonraker_job_id: '',
            notes: '',
            qc: null as string | null,
        }
    }

    get dialogVisible() {
        return this.value
    }

    set dialogVisible(val: boolean) {
        this.$emit('input', val)
    }

    get runsTableHeaders() {
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

    get runStatusOptions() {
        return [
            { text: 'In Progress', value: 'in_progress' },
            { text: 'Success', value: 'success' },
            { text: 'Failed', value: 'fail' },
            { text: 'Cancelled', value: 'cancelled' },
        ]
    }

    get qcOptions() {
        return [
            { text: 'Not Set', value: null },
            { text: 'Pass', value: 'pass' },
            { text: 'Fail', value: 'fail' },
        ]
    }

    get fleetDaemonPrinters() {
        return this.$store.state.farm.fleetDaemonPrinters || {}
    }

    get sortedPrinterOptions() {
        const printers = Object.values(this.fleetDaemonPrinters)
        const requiredPrinterModel = this.gcodeFile?.preferred_printer
        const requiredFilament = this.gcodeFile?.filament_type
    
        // Filter printers by model compatibility first
        const compatiblePrinters = printers.filter((printer: any) => {
            const hostname = printer.socket?.hostname || ''
            const printerModel = this.getPrinterModel(hostname)
        
            // If GCode specifies 'any', all printers are compatible
            if (requiredPrinterModel === 'any') {
                return true
            }
        
            // If GCode specifies a specific model, only show matching printers
            if (requiredPrinterModel === 'HS-Pro') {
                return printerModel === 'HS-Pro'
            }
        
            if (requiredPrinterModel === 'HS-3') {
                return printerModel === 'HS-3'
            }
        
            // Default: show all if we can't determine requirements
            return true
        })
    
        // Sort compatible printers by status priority
        const sortedPrinters = compatiblePrinters.sort((a: any, b: any) => {
            const statusA = this.getPrinterStatusPriority(a)
            const statusB = this.getPrinterStatusPriority(b)
        
            // First sort by status priority, then by hostname alphabetically
            if (statusA !== statusB) {
                return statusA - statusB
            }
            return (a.socket?.hostname || '').localeCompare(b.socket?.hostname || '')
        })
    
        return sortedPrinters.map((printer: any) => {
            const hostname = printer.socket?.hostname || 'Unknown'
            const status = this.getPrinterDisplayStatus(printer)
            const isConnected = printer.socket?.isConnected && printer.fleet_to_printer_ws !== false
            const printerFilament = printer.toolhead?.filament_type
            const hasFilamentMismatch = requiredFilament && printerFilament && 
                                       requiredFilament.toLowerCase() !== printerFilament.toLowerCase()
        
            return {
                text: `${hostname} - ${status}`,
                value: hostname,
                disabled: !isConnected || this.isPrinterBusy(printer),
                printer: printer,
                hasFilamentMismatch: hasFilamentMismatch,
                requiredFilament: requiredFilament,
                printerFilament: printerFilament
            }
        })
    }

    closeDialog() {
        this.$emit('input', false)
    }

    refreshRuns() {
        this.$emit('refresh')
    }

    openCreateRunDialog() {
        this.$toast.error('This is for debugging. Runs should be auto generated')
        /*
        this.createRunDialog.isEdit = false
        this.createRunDialog.show = true
    
        // Auto-select the first available printer if any
        const availablePrinters = this.sortedPrinterOptions.filter(p => !p.disabled)
        if (availablePrinters.length > 0) {
            this.createRunDialog.form.printer_hostname = availablePrinters[0].value
        }
        */
    }

    editRun(run: FleetJobGcodeRun) {
        this.createRunDialog.isEdit = true
        this.createRunDialog.form = {
            id: run.id,
            printer_hostname: run.printer_hostname,
            status: run.status,
            moonraker_job_id: run.moonraker_job_id || '',
            notes: run.notes || '',
            qc: run.qc,
        }
        this.createRunDialog.show = true
    }

    async saveRun() {
        if (!this.createRunDialog.valid || !this.gcodeFile) return
        this.createRunDialog.loading = true

        try {
            if (this.createRunDialog.isEdit) {
                const { id, ...updateData } = this.createRunDialog.form
                this.$emit('update-run', { runId: id, updateData })
            } else {
                const { id, status, qc, ...createData } = this.createRunDialog.form
                this.$emit('create-run', createData)
            }

            this.closeCreateRunDialog()

        } catch (error: unknown) {
            console.error('Failed to save run:', error)
            this.$toast.error(`Failed to ${this.createRunDialog.isEdit ? 'update' : 'add'} print run`)
        } finally {
            this.createRunDialog.loading = false
        }
    }

    closeCreateRunDialog() {
        this.createRunDialog.show = false
        this.createRunDialog.isEdit = false
        this.createRunDialog.form = {
            id: '',
            printer_hostname: '',
            status: 'in_progress',
            moonraker_job_id: '',
            notes: '',
            qc: null,
        }
    }

    async updateRunStatus(run: FleetJobGcodeRun, status: string) {
        this.$emit('update-run-status', { run, status })
    }

    async updateRunQC(run: FleetJobGcodeRun, qc: string | null) {
        this.$emit('update-run-qc', { run, qc })
    }

    async deleteRun(run: FleetJobGcodeRun) {
        if (!confirm(`Are you sure you want to delete this print run from ${run.printer_hostname}?`)) {
            return
        }
        this.$emit('delete-run', run)
    }

    // Status/QC display methods
    getRunStatusColor(status: string) {
        const colors = {
            in_progress: 'blue',
            success: 'green',
            fail: 'red',
            cancelled: 'grey',
        } as const
        return colors[status as keyof typeof colors] || 'grey'
    }

    getRunStatusTextColor(status: string) {
        return 'white'
    }

    getRunStatusIcon(status: string) {
        switch (status) {
            case 'in_progress':
                return this.mdiProgressClock
            case 'success':
                return this.mdiCheck
            case 'fail':
                return this.mdiAlertOutline
            case 'cancelled':
                return this.mdiCancel
            default:
                return this.mdiHelpCircleOutline
        }
    }

    getQCColor(qc: string | null) {
        switch (qc) {
            case 'pass':
                return 'green'
            case 'fail':
                return 'red'
            default:
                return 'grey'
        }
    }

    getQCTextColor(qc: string | null) {
        return 'white'
    }

    getQCIcon(qc: string | null) {
        switch (qc) {
            case 'pass':
                return this.mdiCheckboxMarkedCircleOutline
            case 'fail':
                return this.mdiCloseCircleOutline
            default:
                return this.mdiHelpCircleOutline
        }
    }

    getQCDisplay(qc: string | null) {
        switch (qc) {
            case 'pass':
                return 'Pass'
            case 'fail':
                return 'Fail'
            default:
                return 'Not Set'
        }
    }

    // Printer helper methods
    getPrinterModel(hostname: string): 'HS-3' | 'HS-Pro' | null {
        const remotePrinters = this.$store.state.gui?.remoteprinters?.printers || {}
        for (const printer of Object.values(remotePrinters)) {
            if ((printer as any).hostname === hostname) {
                return (printer as any).printerModel ?? null
            }
        }
        return null
    }

    getPrinterStatusPriority(printer: any): number {
        const fleetDisconnected = printer.fleet_to_printer_ws === false
        const isConnected = printer.socket?.isConnected
        const state = printer.print_stats?.state
    
        if (fleetDisconnected || !isConnected) {
            return 4 // Disconnected
        }
    
        if (printer.webhooks?.state === 'shutdown') {
            return 5 // Error state
        }
    
        switch (state) {
            case 'standby':
            case 'ready':
                return 1 // Best - ready to print
            case 'complete':
                return 2 // Good - just finished
            case 'printing':
                return 3 // Busy - currently printing
            case 'paused':
            case 'error':
            case 'cancelled':
                return 5 // Problems
            default:
                return 4 // Unknown state
        }
    }

    getPrinterDisplayStatus(printer: any): string {
        const fleetDisconnected = printer.fleet_to_printer_ws === false
        const isConnected = printer.socket?.isConnected
        const state = printer.print_stats?.state
    
        if (fleetDisconnected || !isConnected) {
            return 'Disconnected'
        }
    
        if (printer.webhooks?.state === 'shutdown') {
            return 'Shutdown'
        }
    
        switch (state) {
            case 'standby':
                return 'Ready'
            case 'ready':
                return 'Ready'
            case 'printing':
                return 'Printing'
            case 'complete':
                return 'Complete'
            case 'paused':
                return 'Paused'
            case 'error':
                return 'Error'
            case 'cancelled':
                return 'Cancelled'
            default:
                return state || 'Unknown'
        }
    }

    isPrinterBusy(printer: any): boolean {
        const state = printer.print_stats?.state
        return state === 'printing'
    }

    getPrinterChipColor(printer: any): string {
        const fleetDisconnected = printer.fleet_to_printer_ws === false
        const isConnected = printer.socket?.isConnected
        const state = printer.print_stats?.state
    
        if (fleetDisconnected || !isConnected) {
            return 'grey'
        }
    
        if (printer.webhooks?.state === 'shutdown') {
            return 'red'
        }
    
        switch (state) {
            case 'standby':
            case 'ready':
                return 'green'
            case 'printing':
                return 'blue'
            case 'complete':
                return 'teal'
            case 'paused':
                return 'orange'
            case 'error':
            case 'cancelled':
                return 'red'
            default:
                return 'grey'
        }
    }

    getPrinterChipTextColor(printer: any): string {
        return 'white'
    }

    getPrinterSelectionHint(): string {
        const gcodeFile = this.gcodeFile
        if (!gcodeFile) {
            return 'Choose an available printer'
        }
    
        const hints = []
    
        // Model requirement
        if (gcodeFile.preferred_printer && gcodeFile.preferred_printer !== 'any') {
            hints.push(`${gcodeFile.preferred_printer} printers only`)
        }
    
        // Available count
        const availableCount = this.sortedPrinterOptions.filter(p => !p.disabled).length
        hints.push(`${availableCount} available`)
    
        // Filament info
        if (gcodeFile.filament_type) {
            hints.push(`requires ${gcodeFile.filament_type}`)
        }
    
        return hints.join(' • ')
    }

    getSelectedPrinterMismatch(): boolean {
        const selectedHostname = this.createRunDialog.form.printer_hostname
        if (!selectedHostname || !this.gcodeFile?.filament_type) {
            return false
        }
    
        const selectedOption = this.sortedPrinterOptions.find(p => p.value === selectedHostname)
        return selectedOption?.hasFilamentMismatch || false
    }

    getSelectedPrinterFilament(): string {
        const selectedHostname = this.createRunDialog.form.printer_hostname
        if (!selectedHostname) {
            return 'Unknown'
        }
    
        const selectedOption = this.sortedPrinterOptions.find(p => p.value === selectedHostname)
        return selectedOption?.printerFilament || 'None detected'
    }

    formatDateTime(dateString: string) {
        if (!dateString) return null
        return new Date(dateString).toLocaleString()
    }
}
</script>

<style scoped>
.gcode-runs-table th {
    white-space: nowrap;
}

.gcode-runs-table th.text-start {
    padding-right: 0 !important;
}
</style>