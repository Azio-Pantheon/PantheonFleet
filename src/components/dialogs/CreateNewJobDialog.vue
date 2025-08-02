<template>
    <v-dialog :value="value"
              :max-width="900"
              persistent
              @keydown.esc="closeDialog"
              @input="$emit('input', $event)">
        <panel :title="isEdit ? 'Edit Job' : 'Create New Job'"
               :icon="isEdit ? mdiPencil : mdiPlus"
               card-class="create-job-dialog"
               :margin-bottom="false">
            <template #buttons>
                <v-btn icon tile @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <v-form ref="jobForm" v-model="formValid">
                    <v-row>
                        <!-- Left Column - Job Details -->
                        <v-col cols="6">
                            <h3 class="mb-3">Job Details</h3>
                            <v-divider class="mb-4" />

                            <v-text-field v-model="jobForm.name"
                                          label="Job Name"
                                          :rules="[v => !!v || 'Job name is required']"
                                          outlined
                                          dense
                                          required />

                            <v-select v-model="jobForm.customer_id"
                                      :items="customerDropdownOptions"
                                      item-text="name"
                                      item-value="id"
                                      label="Customer"
                                      :rules="[v => !!v || 'Customer is required']"
                                      outlined
                                      dense
                                      required
                                      @change="handleCustomerSelection">
                                <template v-slot:prepend-item>
                                    <v-list-item @click="$emit('add-customer')">
                                        <v-list-item-icon>
                                            <v-icon color="success">{{ mdiAccountPlus }}</v-icon>
                                        </v-list-item-icon>
                                        <v-list-item-content>
                                            <v-list-item-title class="success--text">Add New Customer...</v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-divider></v-divider>
                                </template>
                            </v-select>

                            <v-row>
                                <v-col cols="6">
                                    <v-select v-model="jobForm.job_type"
                                              :items="jobTypeOptions"
                                              label="Job Type"
                                              :rules="[v => !!v || 'Job type is required']"
                                              outlined
                                              dense
                                              required />
                                </v-col>
                                <v-col cols="6">
                                    <v-select v-model="jobForm.priority"
                                              :items="priorityOptions"
                                              item-text="text"
                                              item-value="value"
                                              label="Priority"
                                              outlined
                                              dense />
                                </v-col>
                            </v-row>

                            <v-text-field v-model="jobForm.operator_name"
                                          label="Operator"
                                          outlined
                                          dense />

                            <v-textarea v-model="jobForm.description"
                                        label="Description"
                                        outlined
                                        dense
                                        rows="3" />

                            <v-menu v-model="dueDateMenu"
                                    :close-on-content-click="false"
                                    :nudge-right="40"
                                    transition="scale-transition"
                                    offset-y
                                    min-width="auto">
                                <template v-slot:activator="{ on, attrs }">
                                    <v-text-field v-model="jobForm.due_date"
                                                  label="Due Date"
                                                  :prepend-icon="mdiCalendar"
                                                  :rules="[v => !!v || 'Due date is required']"
                                                  readonly
                                                  outlined
                                                  dense
                                                  clearable
                                                  required
                                                  v-bind="attrs"
                                                  v-on="on" />
                                </template>
                                <v-date-picker v-model="jobForm.due_date"
                                               @input="dueDateMenu = false" />
                            </v-menu>
                        </v-col>

                        <!-- Right Column - GCode Files -->
                        <v-col cols="6" v-if="!isEdit">
                            <div class="d-flex justify-space-between align-center mb-3">
                                <h3>GCode Files</h3>
                                <div class="text-caption text--secondary">
                                    {{ batchGcodes.length }} file(s) selected
                                </div>
                            </div>
                            <v-divider class="mb-4" />

                            <!-- File Selection Tabs -->
                            <v-tabs v-model="activeTab" class="mb-4">
                                <v-tab>Upload Files</v-tab>
                                <v-tab>Browse Existing</v-tab>
                            </v-tabs>

                            <v-tabs-items v-model="activeTab">
                                <!-- Upload Tab -->
                                <v-tab-item>
                                    <div class="batch-gcode-upload-zone pa-4 mb-4">
                                        <div v-if="!batchUploading && batchGcodes.length === 0" class="text-center">
                                            <v-icon size="48" color="primary" class="mb-2">{{ mdiCloudUpload }}</v-icon>
                                            <div class="text-body-1 mb-3">Upload GCode files for this job</div>
                                            <v-btn color="primary"
                                                   large
                                                   @click="$refs.batchFileInput.click()">
                                                <v-icon left>{{ mdiFileUpload }}</v-icon>
                                                Choose Files
                                            </v-btn>
                                            <input ref="batchFileInput"
                                                   type="file"
                                                   accept=".gcode,.g,.gco"
                                                   multiple
                                                   style="display: none"
                                                   @change="onBatchFileSelect" />
                                            <div class="text-caption text--secondary mt-3">
                                                Supported: .gcode, .g, .gco files<br>
                                                Auto-parses printer model and filament from filename
                                            </div>
                                        </div>

                                        <!-- Upload Progress -->
                                        <div v-if="batchUploading" class="text-center">
                                            <v-icon size="48" color="primary" class="mb-2">{{ mdiCloudUpload }}</v-icon>
                                            <div class="text-body-1 mb-2">Uploading files...</div>
                                            <v-progress-linear v-model="batchUploadProgress"
                                                               height="8"
                                                               rounded
                                                               color="primary"
                                                               class="mb-2" />
                                            <div class="text-caption">{{ Math.round(batchUploadProgress) }}%</div>
                                        </div>

                                        <!-- Add More Files Button -->
                                        <div v-if="!batchUploading && batchGcodes.length > 0" class="text-center">
                                            <v-btn color="primary"
                                                   outlined
                                                   @click="$refs.batchFileInput.click()">
                                                <v-icon left>{{ mdiPlus }}</v-icon>
                                                Add More Files
                                            </v-btn>
                                        </div>
                                    </div>
                                </v-tab-item>

                                <!-- Browse Tab -->
                                <v-tab-item>
                                    <div class="pa-4">
                                        <gcode-file-browser :key="`create-browse-${dialogKey}`"
                                                            :reset-key="dialogKey"
                                                            selection-mode="multiple"
                                                            @files-selected="onBrowseFilesSelected" />
                                    </div>
                                </v-tab-item>
                            </v-tabs-items>

                            <!-- GCode Files List (shown regardless of tab) -->
                            <div v-if="batchGcodes.length > 0" class="batch-gcode-list">
                                <div class="d-flex justify-space-between align-center mb-2">
                                    <div class="text-subtitle-2">Selected Files</div>
                                    <v-btn small
                                           text
                                           color="error"
                                           @click="clearAllBatchFiles">
                                        <v-icon small left>{{ mdiDelete }}</v-icon>
                                        Clear All
                                    </v-btn>
                                </div>

                                <div class="batch-gcode-items-container" style="max-height: 300px; overflow-y: auto;">
                                    <div v-for="(gcode, index) in batchGcodes"
                                         :key="index"
                                         class="batch-gcode-item pa-3 mb-2"
                                         style="border: 1px solid #e0e0e0; border-radius: 8px; background-color: rgba(0,0,0,0.05);">
                                        <!-- File header -->
                                        <div class="d-flex justify-space-between align-center mb-2">
                                            <div class="font-weight-bold text--primary" style="font-size: 14px;">
                                                {{ gcode.gcode_filename }}
                                            </div>
                                            <v-btn icon
                                                   x-small
                                                   color="error"
                                                   @click="removeBatchGcodeFile(index)"
                                                   title="Remove file">
                                                <v-icon x-small>{{ mdiClose }}</v-icon>
                                            </v-btn>
                                        </div>

                                        <!-- Editable fields -->
                                        <v-row dense>
                                            <v-col cols="6">
                                                <v-text-field v-model.number="gcode.required_runs"
                                                              label="Required Runs"
                                                              type="number"
                                                              :rules="[v => v > 0 || 'Must be > 0']"
                                                              outlined
                                                              dense
                                                              hide-details="auto" />
                                            </v-col>
                                            <v-col cols="6">
                                                <v-select v-model="gcode.preferred_printer"
                                                          :items="printerOptions"
                                                          label="Printer"
                                                          outlined
                                                          dense
                                                          hide-details="auto" />
                                            </v-col>
                                            <v-col cols="12">
                                                <v-text-field v-model="gcode.filament_type"
                                                              label="Filament Type"
                                                              :rules="[v => !!v || 'Filament type is required']"
                                                              outlined
                                                              dense
                                                              required
                                                              hide-details="auto" />
                                            </v-col>
                                        </v-row>

                                        <!-- Auto-parsed info chips -->
                                        <div class="mt-2">
                                            <v-chip x-small color="blue" text-color="white" class="mr-1">
                                                {{ gcode.filament_type || 'Unknown' }}
                                            </v-chip>
                                            <v-chip x-small color="orange" text-color="white" class="mr-1">
                                                {{ gcode.required_runs }} runs
                                            </v-chip>
                                            <v-chip x-small color="green" text-color="white">
                                                {{ gcode.preferred_printer || 'Any' }}
                                            </v-chip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn color="" text @click="closeDialog">Cancel</v-btn>
                <v-btn color="primary"
                       :loading="loading"
                       @click="handleCreateClick">
                    {{ isEdit ? 'Update' : 'Create' }}
                    <span v-if="!isEdit && batchGcodes.length > 0">
                        (+ {{ batchGcodes.length }} GCode files)
                    </span>
                </v-btn>
            </v-card-actions>
        </panel>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import Panel from '@/components/ui/Panel.vue'
import GcodeFileBrowser from '@/components/GcodeFileBrowser.vue'
import {
    mdiPlus,
    mdiPencil,
    mdiCloseThick,
    mdiCalendar,
    mdiAccountPlus,
    mdiCloudUpload,
    mdiFileUpload,
    mdiDelete,
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
    due_date?: string
    created_at: string
    updated_at: string
}

interface BatchGcodeFile {
    gcode_filename: string
    required_runs: number
    preferred_printer: string
    filament_type: string
    originalFile?: File | null
}

interface FleetCustomer {
    id: string
    name: string
    notes?: string
}

@Component({
    components: {
        Panel,
        GcodeFileBrowser,
    },
})
export default class CreateNewJobDialog extends Mixins(BaseMixin) {
    mdiPlus = mdiPlus
    mdiPencil = mdiPencil
    mdiCloseThick = mdiCloseThick
    mdiCalendar = mdiCalendar
    mdiAccountPlus = mdiAccountPlus
    mdiCloudUpload = mdiCloudUpload
    mdiFileUpload = mdiFileUpload
    mdiDelete = mdiDelete
    mdiClose = mdiClose

    @Prop({ type: Boolean, default: false })
    readonly value!: boolean

    @Prop({ type: Object, default: null })
    readonly job!: FleetJob | null

    @Prop({ type: Array, default: () => [] })
    readonly customers!: FleetCustomer[]

    private formValid = false
    private loading = false
    private dueDateMenu = false
    private dialogKey = 0

    // Batch upload state
    private batchGcodes: BatchGcodeFile[] = []
    private batchUploading = false
    private batchUploadProgress = 0
    private activeTab = 0

    // Form data
    private jobForm = {
        id: '',
        name: '',
        customer_id: '',
        job_type: 'sample',
        priority: 'low',
        operator_name: '',
        description: '',
        due_date: '',
    }

    get isEdit(): boolean {
        return !!this.job
    }

    get customerDropdownOptions() {
        return this.customers.map(customer => ({
            id: customer.id,
            name: customer.name
        }))
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
            { text: 'HS-Pro', value: 'HS-Pro' },
        ]
    }

    mounted() {
        this.$root.$on('fullscreen-files-uploaded', this.handleFullscreenUpload)
    }

    beforeDestroy() {
        this.$root.$off('fullscreen-files-uploaded', this.handleFullscreenUpload)
    }

    @Watch('value')
    onDialogToggle(newVal: boolean, oldVal: boolean) {
        if (newVal && !oldVal) {
            // Dialog opened
            this.initializeForm()
        } else if (oldVal && !newVal) {
            // Dialog closed
            this.resetForm()
        }
    }

    @Watch('job', { immediate: true })
    onJobChanged() {
        if (this.value) {
            this.initializeForm()
        }
    }

    initializeForm() {
        this.dialogKey++
        
        if (this.job) {
            // Edit mode
            this.jobForm = {
                id: this.job.id,
                name: this.job.name,
                customer_id: this.job.customer_id,
                job_type: this.job.job_type,
                priority: this.job.priority,
                operator_name: this.job.operator_name || '',
                description: this.job.description || '',
                due_date: this.job.due_date ? this.job.due_date.split('T')[0] : '',
            }
            // Clear batch data for edit mode
            this.batchGcodes = []
        } else {
            // Create mode
            this.jobForm = {
                id: '',
                name: '',
                customer_id: '',
                job_type: 'sample',
                priority: 'low',
                operator_name: '',
                description: '',
                due_date: '',
            }
        }
        
        // Reset batch state
        this.batchUploading = false
        this.batchUploadProgress = 0
        this.activeTab = 0
        this.loading = false
    }

    resetForm() {
        // Clear all state
        this.batchGcodes = []
        this.batchUploading = false
        this.batchUploadProgress = 0
        this.activeTab = 0
        this.loading = false
        this.dueDateMenu = false

        this.jobForm = {
            id: '',
            name: '',
            customer_id: '',
            job_type: 'sample',
            priority: 'low',
            operator_name: '',
            description: '',
            due_date: '',
        }

        // Reset form validation
        if (this.$refs.jobForm) {
            (this.$refs.jobForm as any).resetValidation()
        }
    }

    closeDialog() {
        this.$emit('input', false)
    }

    handleCustomerSelection(customerId: string) {
        // This handles regular customer selection
        // The "Add New Customer" option is handled by the @click in the template
    }

    async saveJob() {
        if (!this.formValid) return
        this.loading = true

        try {
            // Copy form data and normalize the date
            const formData = { ...this.jobForm }
            if (formData.due_date) {
                formData.due_date = new Date(formData.due_date).toISOString()
            }

            if (this.isEdit) {
                // EDIT: pull out id, keep the rest
                const { id: jobId, ...jobData } = formData
                const updatedJob = await this.$store.dispatch('fleet/jobs/updateJob', {
                    jobId,
                    jobData,
                })
                this.$toast.success('Job updated successfully')
                this.$emit('job-updated', updatedJob)
            } else {
                // CREATE: drop id entirely
                const { id: _, ...jobData } = formData
                const newJob = await this.$store.dispatch('fleet/jobs/createJob', jobData)
                this.$toast.success('Job created successfully')
                
                // Store batch data for background processing
                const batchGcodesToCreate = [...this.batchGcodes]
                
                // Emit creation event with job and batch data
                this.$emit('job-created', {
                    job: newJob,
                    batchGcodes: batchGcodesToCreate
                })
            }

            this.closeDialog()

        } catch (error: unknown) {
            console.error('Failed to save job:', error)
            this.$toast.error(`Failed to ${this.isEdit ? 'update' : 'create'} job`)
        } finally {
            this.loading = false
        }
    }

    // Handle batch file selection from upload button
    async onBatchFileSelect(e: Event) {
        const target = e.target as HTMLInputElement
        const files = target.files
        if (files && files.length > 0) {
            await this.handleBatchFileUpload(Array.from(files))
        }
        target.value = ''
    }

    // Handle batch file upload
    async handleBatchFileUpload(files: File[]) {
        // Validate file types
        const validExtensions = ['.gcode', '.g', '.gco']
        const validFiles = files.filter(file => {
            const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
            return validExtensions.includes(fileExtension)
        })

        if (validFiles.length !== files.length) {
            this.$toast.error(`${files.length - validFiles.length} files skipped (invalid format)`)
        }

        if (validFiles.length === 0) {
            this.$toast.error('No valid GCode files selected')
            return
        }

        // Start batch upload
        this.batchUploading = true
        this.batchUploadProgress = 0

        try {
            const successfullyUploadedFiles = []

            // Upload files one by one to better handle errors
            for (let i = 0; i < validFiles.length; i++) {
                const file = validFiles[i]
                try {
                    const uploadedFilename = await this.$store.dispatch('files/uploadFile', {
                        file: file,
                        path: '', // Upload to root of gcodes directory
                        root: 'gcodes'
                    })

                    if (uploadedFilename) {
                        successfullyUploadedFiles.push({
                            name: uploadedFilename,
                            originalFile: file
                        })
                        this.$toast.success(`Uploaded: ${uploadedFilename}`)
                    } else {
                        this.$toast.error(`Failed to upload: ${file.name}`)
                    }

                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error)
                    this.$toast.error(`Upload failed: ${file.name}`)
                }

                // Update progress
                this.batchUploadProgress = ((i + 1) / validFiles.length) * 100
            }

            // Only process successfully uploaded files
            if (successfullyUploadedFiles.length > 0) {
                const filesToProcess = successfullyUploadedFiles.map(result => {
                    return new File([''], result.name, { type: 'text/plain' })
                })
            
                this.processBatchGcodeFiles(filesToProcess)
                this.$toast.success(`Successfully processed ${successfullyUploadedFiles.length} GCode files`)
            }

            // Report overall results
            const failedCount = validFiles.length - successfullyUploadedFiles.length
            if (failedCount > 0) {
                this.$toast.error(`${failedCount} files failed to upload`)
            }

        } catch (error) {
            console.error('Batch upload failed:', error)
            this.$toast.error('Batch upload failed')
        } finally {
            this.batchUploading = false
            this.batchUploadProgress = 0
        }
    }

    // Process batch GCode files (from drag/drop or manual selection)
    processBatchGcodeFiles(files: File[]) {
        console.log('🔧 Processing batch GCode files:', files.length)

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const parsed = this.parseGcodeFilename(file.name)

            const batchFile = {
                gcode_filename: file.name,
                required_runs: parsed.required_runs,
                preferred_printer: parsed.preferred_printer,
                filament_type: parsed.filament_type,
                originalFile: file
            }

            this.batchGcodes.push(batchFile)
        }

        // Show a warning if any files have empty filament types
        const emptyFilamentFiles = this.batchGcodes.filter(f => !f.filament_type.trim())
        if (emptyFilamentFiles.length > 0) {
            this.$toast.warning(`${emptyFilamentFiles.length} file(s) need filament type specified`)
        }

        this.$toast.success(`Added ${files.length} files. Please review and fill in any missing information.`)
    }

    // Parse filename to extract printer model and filament type
    parseGcodeFilename(filename: string) {
        const filenameLower = filename.toLowerCase()
    
        // Determine printer model
        let preferred_printer = 'any'
        if (filenameLower.includes('hs-pro') || filenameLower.includes('hspro')) {
            preferred_printer = 'HS-Pro'
        } else if (filenameLower.includes('hs3') || filenameLower.includes('hs-3')) {
            preferred_printer = 'HS-3'
        }

        // Determine filament type
        let filament_type = ''
        if (filenameLower.includes('pa-cf') || filenameLower.includes('pacf')) {
            filament_type = 'PA-CF'
        } else if (filenameLower.includes('petg-cf') || filenameLower.includes('petgcf')) {
            filament_type = 'PETG-CF'
        } else if (filenameLower.includes('pa-gf') || filenameLower.includes('pagf')) {
            filament_type = 'PA-GF'
        } else if (filenameLower.includes('petg')) {
            filament_type = 'PETG'
        } else if (filenameLower.includes('pla')) {
            filament_type = 'PLA'
        } else if (filenameLower.includes('abs')) {
            filament_type = 'ABS'
        } else if (filenameLower.includes('tpu')) {
            filament_type = 'TPU'
        }

        // Default required runs based on job type or filename
        let required_runs = 1
        const quantityMatch = filename.match(/(?:x|qty|quantity|runs?)[_\s]*(\d+)/i)
        if (quantityMatch) {
            required_runs = parseInt(quantityMatch[1])
        }

        return {
            preferred_printer,
            filament_type,
            required_runs
        }
    }

    // Remove a file from batch GCode list
    removeBatchGcodeFile(index: number) {
        this.batchGcodes.splice(index, 1)
    }

    // Clear all batch files
    clearAllBatchFiles() {
        this.batchGcodes = []
    }

    onBrowseFilesSelected(files: any[]) {
        // Process selected files for batch creation
        const processedFiles = files.map(file => {
            const parsed = this.parseGcodeFilename(file.filename)
            return {
                gcode_filename: file.filename,
                required_runs: parsed.required_runs,
                preferred_printer: parsed.preferred_printer,
                filament_type: parsed.filament_type,
                originalFile: null // Since these are existing files
            }
        })

        // Add to batch (or replace existing)
        this.batchGcodes = [
            ...this.batchGcodes,
            ...processedFiles
        ]

        this.$toast.success(`Added ${files.length} file(s) to job creation`)
    }

    handleFullscreenUpload(uploadedFiles: any[]) {
        console.log('🎯 handleFullscreenUpload called with files:', uploadedFiles)

        // Only handle if this dialog is open and not in edit mode
        if (!this.value || this.isEdit) {
            console.log('❌ Dialog not open or in edit mode, skipping')
            return
        }

        // Filter for GCode files based on extension only
        const gcodeFiles = uploadedFiles.filter(file => {
            const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
            return ['.gcode', '.g', '.gco'].includes(ext)
        })

        console.log('✅ Found gcode files:', gcodeFiles)

        if (gcodeFiles.length > 0) {
            // Convert to File objects for processing
            const filesToProcess = gcodeFiles.map(fileInfo => {
                return new File([''], fileInfo.name, { type: 'text/plain' })
            })
        
            console.log('🔧 Processing files:', filesToProcess)
            this.processBatchGcodeFiles(filesToProcess)
            this.$toast.success(`Added ${gcodeFiles.length} GCode files to job creation`)
        }
    }

    setSelectedCustomer(customerId: string) {
        console.log('🎯 IMMEDIATELY setting selected customer:', customerId)

        // Set immediately without any checks - optimistic approach
        this.jobForm.customer_id = customerId
        console.log('✅ Customer set immediately (optimistic)')

        // Force component update to ensure reactivity
        this.$forceUpdate()

        // Trigger form validation
        this.$nextTick(() => {
            if (this.$refs.jobForm) {
                (this.$refs.jobForm as any).validate()
            }
            console.log('✅ Form validated after customer selection')
        })
    }

    handleCreateClick() {
        // Force validate all fields
        if (this.$refs.jobForm) {
            (this.$refs.jobForm as any).validate()
        }

        // Wait for validation to complete, then check if valid
        this.$nextTick(() => {
            if (this.formValid) {
                this.saveJob()
            } else {
                // Show a helpful message
                this.$toast.warning('Please fill in all required fields (marked in red)')
            }
        })
    }

    @Watch('customers', { immediate: false })
    onCustomersChanged(newCustomers: FleetCustomer[], oldCustomers: FleetCustomer[]) {
        const oldCount = oldCustomers?.length || 0
        const newCount = newCustomers.length

        if (newCount < oldCount) {
            // A customer was removed (possibly due to background verification failure)
            console.log('📉 Customer was removed from list, checking current selection...')

            if (this.jobForm.customer_id) {
                const selectedCustomerExists = newCustomers.some(c => c.id === this.jobForm.customer_id)
                if (!selectedCustomerExists) {
                    console.log('🚨 Selected customer no longer exists, clearing selection')
                    this.jobForm.customer_id = ''
                    this.$forceUpdate()
                }
            }
        }
    }
}
</script>

<style scoped>
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

.v-tabs {
    border-bottom: 1px solid #e0e0e0;
}

.v-tab {
    text-transform: none !important;
}

.batch-gcode-upload-zone {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fafafa;
    transition: all 0.3s ease;
}

.theme--dark .batch-gcode-upload-zone {
    border-color: #424242;
    background-color: #303030;
}
</style>
