<template>
    <v-dialog :value="value"
              :max-width="800"
              persistent
              @input="$emit('input', $event)"
              @keydown.esc="closeDialog">
        <panel :title="dialogTitle"
               :icon="isEdit ? mdiPencil : mdiCodeBraces"
               card-class="add-gcode-dialog"
               :margin-bottom="false">
            <template #buttons>
                <v-btn icon tile @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text>
                <!-- Single File Mode -->
                <div v-if="!isBatchMode">
                    <!-- File Upload Section -->
                    <div class="mb-4">
                        <div class="text-subtitle-2 mb-2">
                            {{ isEdit ? 'Replace GCode File (Optional)' : 'Select GCode File' }}
                        </div>

                        <!-- File Selection Tabs -->
                        <v-tabs v-model="activeTab" class="mb-4">
                            <v-tab>Upload File</v-tab>
                            <v-tab>Browse Existing</v-tab>
                        </v-tabs>

                        <v-tabs-items v-model="activeTab">
                            <!-- Upload Tab -->
                            <v-tab-item>
                                <div class="gcode-upload-zone pa-4">
                                    <!-- Upload Area -->
                                    <div v-if="!uploading && !uploadedFile" class="text-center">
                                        <v-icon size="48" color="primary" class="mb-2">{{ mdiCloudUpload }}</v-icon>
                                        <div class="text-body-1 mb-3">
                                            {{ isEdit ? 'Upload a new file to replace the existing one' : 'Choose a GCode file to upload' }}
                                        </div>
                                        <v-btn color="primary"
                                               large
                                               @click="$refs.fileInput.click()">
                                            <v-icon left>{{ mdiFileUpload }}</v-icon>
                                            Choose File
                                        </v-btn>
                                        <input ref="fileInput"
                                               type="file"
                                               accept=".gcode,.g,.gco"
                                               style="display: none"
                                               @change="onFileSelect" />
                                        <div class="text-caption text--secondary mt-3">
                                            {{ isEdit ? 'Leave empty to keep the current file' : 'Supported formats: .gcode, .g, .gco' }}
                                        </div>
                                    </div>

                                    <!-- Upload Progress -->
                                    <div v-if="uploading" class="text-center">
                                        <v-icon size="48" color="primary" class="mb-2">{{ mdiCloudUpload }}</v-icon>
                                        <div class="text-body-1 mb-2">Uploading {{ uploadingFileName }}...</div>
                                        <v-progress-linear v-model="uploadProgress"
                                                           height="8"
                                                           rounded
                                                           color="primary"
                                                           class="mb-2" />
                                        <div class="text-caption">{{ Math.round(uploadProgress) }}%</div>
                                    </div>

                                    <!-- Upload Success -->
                                    <div v-if="uploadedFile" class="d-flex align-center">
                                        <v-icon color="success" class="mr-2">{{ mdiCheckCircle }}</v-icon>
                                        <div class="flex-grow-1">
                                            <div class="text-body-1">{{ uploadedFile.name }}</div>
                                            <div class="text-caption text--secondary">{{ formatFileSize(uploadedFile.size) }}</div>
                                        </div>
                                        <v-btn icon small @click="clearUploadedFile">
                                            <v-icon>{{ mdiClose }}</v-icon>
                                        </v-btn>
                                    </div>
                                </div>
                            </v-tab-item>

                            <!-- Browse Tab -->
                            <v-tab-item>
                                <div class="pa-4">
                                    <gcode-file-browser :key="`add-browse-${dialogKey}`"
                                                        :reset-key="dialogKey"
                                                        selection-mode="multiple"
                                                        @files-selected="onBrowseFileSelected" />
                                </div>
                            </v-tab-item>
                        </v-tabs-items>
                    </div>

                    <!-- Single File Form Fields -->
                    <v-form ref="gcodeForm" v-model="formValid">
                        <v-row>
                            <v-col cols="12">
                                <v-text-field v-model="form.gcode_filename"
                                              label="GCode Filename"
                                              :rules="[v => !!v || 'Filename is required']"
                                              outlined
                                              dense
                                              required
                                              :readonly="!!uploadedFile"
                                              :hint="uploadedFile ? 'Auto-filled from uploaded file' : (isEdit ? 'Edit filename or upload new file to replace' : 'Or enter filename manually')"
                                              persistent-hint />
                            </v-col>
                            <v-col cols="6">
                                <v-text-field v-model.number="form.required_runs"
                                              label="Required Runs"
                                              type="number"
                                              :rules="[v => v > 0 || 'Must be greater than 0']"
                                              outlined
                                              dense
                                              required />
                            </v-col>
                            <v-col cols="6">
                                <v-select v-model="form.preferred_printer"
                                          :items="printerOptions"
                                          label="Preferred Printer"
                                          :rules="[v => !!v || 'Printer preference is required']"
                                          outlined
                                          dense
                                          required />
                            </v-col>
                            <v-col cols="12">
                                <v-text-field v-model="form.filament_type"
                                              label="Filament Type (e.g., PLA, PETG, ABS)"
                                              :rules="[v => !!v || 'Filament type is required']"
                                              outlined
                                              dense
                                              required />
                            </v-col>
                        </v-row>
                    </v-form>
                </div>

                <!-- Batch Mode -->
                <div v-else>
                    <div class="d-flex justify-space-between align-center mb-3">
                        <div class="text-subtitle-2">
                            Selected Files for Batch Creation ({{ batchGcodes.length }})
                        </div>
                        <div class="d-flex align-center">
                            <v-btn small
                                   text
                                   color="primary"
                                   @click="activeTab = 1">
                                <v-icon small left>{{ mdiPlus }}</v-icon>
                                Add More Files
                            </v-btn>
                            <v-btn small
                                   text
                                   color="error"
                                   @click="clearBatchGcodes">
                                <v-icon small left>{{ mdiDelete }}</v-icon>
                                Clear All
                            </v-btn>
                        </div>
                    </div>

                    <!-- Browse Tab for adding more files -->
                    <div v-if="activeTab === 1" class="mb-4 pa-4" style="border: 1px solid #e0e0e0; border-radius: 4px;">
                        <div class="text-subtitle-2 mb-2">Browse for Additional Files</div>
                        <gcode-file-browser :key="`add-batch-browse-${dialogKey}`"
                                            :reset-key="dialogKey"
                                            selection-mode="multiple"
                                            @files-selected="onBrowseFileSelected" />
                    </div>

                    <!-- Batch Files List -->
                    <div class="batch-gcode-items-container" style="max-height: 400px; overflow-y: auto;">
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
                                       @click="removeBatchGcode(index)"
                                       title="Remove file">
                                    <v-icon x-small>{{ mdiClose }}</v-icon>
                                </v-btn>
                            </div>

                            <!-- Wrap each batch item in its own form for individual validation -->
                            <v-form :ref="`batchForm${index}`" v-model="gcode.isValid">
                                <v-row dense>
                                    <v-col cols="6">
                                        <v-text-field v-model.number="gcode.required_runs"
                                                      label="Required Runs *"
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
                                                  :rules="[v => !!v || 'Printer preference is required']"
                                                  outlined
                                                  dense
                                                  required
                                                  hide-details="auto" />
                                    </v-col>
                                    <v-col cols="12">
                                        <v-text-field v-model="gcode.filament_type"
                                                      label="Filament Type *"
                                                      :rules="[v => !!v || 'Filament type is required']"
                                                      outlined
                                                      dense
                                                      required
                                                      hide-details="auto" />
                                    </v-col>
                                </v-row>
                            </v-form>

                            <!-- Auto-parsed info chips -->
                            <div class="mt-2">
                                <v-chip x-small color="blue" text-color="white" class="mr-1">
                                    {{ gcode.filament_type || 'Unknown' }}
                                </v-chip>
                                <v-chip x-small color="orange" text-color="white" class="mr-1">
                                    {{ gcode.required_runs }} runs
                                </v-chip>
                                <v-chip x-small color="green" text-color="white">
                                    {{ gcode.preferred_printer }}
                                </v-chip>
                            </div>
                        </div>
                    </div>
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn color="" text @click="closeDialog">Cancel</v-btn>
                <v-btn color="primary"
                       :loading="loading"
                       :disabled="uploading"
                       @click="handleSaveClick">
                    {{ saveButtonText }}
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
    mdiPencil,
    mdiCodeBraces,
    mdiCloseThick,
    mdiCloudUpload,
    mdiFileUpload,
    mdiCheckCircle,
    mdiClose,
    mdiPlus,
    mdiDelete,
} from '@mdi/js'

interface FleetJob {
    id: string
    name: string
}

interface FleetJobGcode {
    id: string
    gcode_filename: string
    required_runs: number
    preferred_printer: string
    filament_type: string
    isValid?: boolean
}

interface BatchGcodeFile {
    gcode_filename: string
    required_runs: number
    preferred_printer: string
    filament_type: string
    originalFile?: File | null
}

@Component({
    components: {
        Panel,
        GcodeFileBrowser,
    },
})
export default class AddGcodeDialog extends Mixins(BaseMixin) {
    // Icons
    mdiPencil = mdiPencil
    mdiCodeBraces = mdiCodeBraces
    mdiCloseThick = mdiCloseThick
    mdiCloudUpload = mdiCloudUpload
    mdiFileUpload = mdiFileUpload
    mdiCheckCircle = mdiCheckCircle
    mdiClose = mdiClose
    mdiPlus = mdiPlus
    mdiDelete = mdiDelete

    // Props
    @Prop({ type: Boolean, default: false })
    readonly value!: boolean

    @Prop({ type: Object, default: null })
    readonly job!: FleetJob | null

    @Prop({ type: Boolean, default: false })
    readonly isEdit!: boolean

    @Prop({ type: Object, default: null })
    readonly editGcode!: FleetJobGcode | null

    @Prop({ type: Array, default: () => [] })
    readonly printerOptions!: Array<{ text: string; value: string }>

    // Data
    private formValid = false
    private loading = false
    private uploading = false
    private uploadProgress = 0
    private uploadingFileName = ''
    private uploadedFile: File | null = null
    private activeTab = 0
    private dialogKey = 0
    private isBatchMode = false
    private batchGcodes: BatchGcodeFile[] = []

    private form = {
        gcode_filename: '',
        required_runs: 1,
        preferred_printer: '',
        filament_type: '',
    }

    // Computed
    get dialogTitle() {
        if (this.isEdit) {
            return 'Edit GCode File'
        } else if (this.isBatchMode) {
            return `Add ${this.batchGcodes.length} GCode Files`
        } else {
            return 'Add GCode File'
        }
    }

    get saveButtonText() {
        if (this.isEdit) {
            return 'Update GCode'
        } else if (this.isBatchMode) {
            return `Create ${this.batchGcodes.length} GCode Files`
        } else {
            return 'Add GCode'
        }
    }

    get canSave() {
        if (this.uploading) {
            return false
        }

        if (this.isBatchMode) {
            // Batch mode - check if we have files and all are valid
            if (this.batchGcodes.length === 0) {
                return false
            }

            // Check if all batch files have required fields
            return this.batchGcodes.every(file =>
                file.gcode_filename.trim() &&
                file.filament_type.trim() &&
                file.required_runs > 0
            )
        } else {
            // Single mode - use form validation
            return this.formValid
        }
    }

    // Watchers
    @Watch('value')
    onValueChanged(newVal: boolean) {
        if (newVal) {
            this.initializeDialog()
        }
    }

    @Watch('editGcode', { immediate: true })
    onEditGcodeChanged(newVal: FleetJobGcode | null) {
        if (newVal && this.isEdit) {
            this.form = {
                gcode_filename: newVal.gcode_filename,
                required_runs: newVal.required_runs,
                preferred_printer: newVal.preferred_printer,
                filament_type: newVal.filament_type,
            }
        }
    }

    // Methods
    initializeDialog() {
        if (!this.isEdit) {
            this.form = {
                gcode_filename: '',
                required_runs: 1,
                preferred_printer: '',
                filament_type: '',
            }
        }
        this.dialogKey++
    }

    async saveGcode() {
        if (!this.job) return

        if (this.isBatchMode) {
            await this.saveBatchGcodes()
        } else {
            await this.saveSingleGcode()
        }
    }

    async saveSingleGcode() {
        if (!this.formValid || !this.job) return

        this.loading = true
        try {
            if (this.isEdit && this.editGcode) {
                await this.$store.dispatch('fleet/jobs/updateJobGcode', {
                    gcodeId: this.editGcode.id,
                    gcode: this.form
                })
                this.$emit('gcode-updated', { ...this.editGcode, ...this.form })
                this.$toast.success('GCode file updated successfully')
            } else {
                const newGcode = await this.$store.dispatch('fleet/jobs/createJobGcode', {
                    jobId: this.job.id,
                    gcode: this.form
                })
                this.$emit('gcode-created', newGcode)
                this.$toast.success('GCode file added successfully')
            }

            this.closeDialog()
        } catch (error) {
            console.error('Failed to save gcode:', error)
            this.$toast.error(`Failed to ${this.isEdit ? 'update' : 'add'} GCode file`)
        } finally {
            this.loading = false
        }
    }

    async saveBatchGcodes() {
        if (this.batchGcodes.length === 0 || !this.job) {
            this.$toast.error('No files selected for batch creation')
            return
        }

        // Validate all batch files
        const invalidFiles = this.batchGcodes.filter(file =>
            !file.gcode_filename.trim() ||
            !file.filament_type.trim() ||
            file.required_runs <= 0
        )

        if (invalidFiles.length > 0) {
            this.$toast.error(`${invalidFiles.length} file(s) have missing or invalid information`)
            return
        }

        this.loading = true
        try {
            let successCount = 0
            let failCount = 0

            for (const gcodeFile of this.batchGcodes) {
                try {
                    const newGcode = await this.$store.dispatch('fleet/jobs/createJobGcode', {
                        jobId: this.job.id,
                        gcode: {
                            gcode_filename: gcodeFile.gcode_filename,
                            required_runs: gcodeFile.required_runs,
                            preferred_printer: gcodeFile.preferred_printer,
                            filament_type: gcodeFile.filament_type
                        }
                    })
                    this.$emit('gcode-created', newGcode)
                    successCount++
                } catch (error) {
                    console.error(`Failed to create GCode file ${gcodeFile.gcode_filename}:`, error)
                    failCount++
                }
            }

            // Report results
            if (successCount > 0) {
                this.$toast.success(`Successfully created ${successCount} GCode files`)
            }
            if (failCount > 0) {
                this.$toast.error(`Failed to create ${failCount} GCode files`)
            }

            if (successCount > 0) {
                this.closeDialog()
            }

        } catch (error) {
            console.error('Batch GCode creation failed:', error)
            this.$toast.error('Batch GCode creation failed')
        } finally {
            this.loading = false
        }
    }

    closeDialog() {
        this.resetDialog()
        this.$emit('close')
        this.$emit('input', false)
    }

    resetDialog() {
        this.formValid = false
        this.loading = false
        this.uploading = false
        this.uploadProgress = 0
        this.uploadingFileName = ''
        this.uploadedFile = null
        this.activeTab = 0
        this.dialogKey++
        this.isBatchMode = false
        this.batchGcodes = []
        this.form = {
            gcode_filename: '',
            required_runs: 1,
            preferred_printer: '',
            filament_type: '',
        }

        // Reset form validation
        if (this.$refs.gcodeForm) {
            (this.$refs.gcodeForm as any).resetValidation()
        }

        this.$nextTick(() => {
            // Clear any batch form refs that might exist
            Object.keys(this.$refs).forEach(key => {
                if (key.startsWith('batchForm')) {
                    const formRef = this.$refs[key]
                    if (formRef && Array.isArray(formRef) && formRef[0]) {
                        (formRef[0] as any).resetValidation()
                    }
                }
            })
        })
    }

    async onFileSelect(e: Event) {
        const target = e.target as HTMLInputElement
        const files = target.files
        if (files && files.length > 0) {
            await this.handleFileUpload(files[0])
        }
    }

    async handleFileUpload(file: File) {
        // Validate file type
        const validExtensions = ['.gcode', '.g', '.gco']
        const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

        if (!validExtensions.includes(fileExtension)) {
            this.$toast.error('Please select a valid GCode file (.gcode, .g, .gco)')
            return
        }

        // Start upload
        this.uploading = true
        this.uploadProgress = 0
        this.uploadingFileName = file.name

        // Simulate progress for user feedback
        const progressInterval = setInterval(() => {
            if (this.uploadProgress < 90) {
                this.uploadProgress += Math.random() * 20
            }
        }, 200)

        try {
            // Use the files store action to upload
            const uploadedFilename = await this.$store.dispatch('files/uploadFile', {
                file: file,
                path: '', // Upload to root of gcodes directory
                root: 'gcodes'
            })

            clearInterval(progressInterval)
            this.uploadProgress = 100

            if (uploadedFilename) {
                // Success - store the file info and auto-fill filename
                this.uploadedFile = file
                this.form.gcode_filename = uploadedFilename
                this.$toast.success(`File uploaded successfully: ${uploadedFilename}`)

                const parsed = this.parseGcodeFilename(uploadedFilename)
                this.form.preferred_printer = parsed.preferred_printer
                this.form.filament_type = parsed.filament_type
            } else {
                throw new Error('Upload failed')
            }
        } catch (error) {
            clearInterval(progressInterval)
            console.error('Upload failed:', error)
            this.$toast.error('Failed to upload file')
        } finally {
            this.uploading = false
            this.uploadProgress = 0
            this.uploadingFileName = ''
        }
    }

    clearUploadedFile() {
        this.uploadedFile = null
        this.form.gcode_filename = ''
    }

    onBrowseFileSelected(files: any[]) {
        if (files.length === 1) {
            // Single file - auto-fill the form
            const file = files[0]
            const parsed = this.parseGcodeFilename(file.filename)

            this.form = {
                gcode_filename: file.filename,
                required_runs: parsed.required_runs,
                preferred_printer: parsed.preferred_printer,
                filament_type: parsed.filament_type,
            }
            this.isBatchMode = false

            this.$toast.success(`Selected file: ${file.filename}`)
        } else if (files.length > 1) {
            // Multiple files - enter batch mode
            const processedFiles = files.map(file => {
                const parsed = this.parseGcodeFilename(file.filename)
                return {
                    gcode_filename: file.filename,
                    required_runs: parsed.required_runs,
                    preferred_printer: parsed.preferred_printer,
                    filament_type: parsed.filament_type,
                    originalFile: null,
                    isValid: false  // Initialize validation state
                }
            })

            this.batchGcodes = processedFiles
            this.isBatchMode = true

            // Clear single file form since we're in batch mode
            this.form = {
                gcode_filename: '',
                required_runs: 1,
                preferred_printer: '',
                filament_type: '',
            }

            this.$toast.success(`Selected ${files.length} files for batch creation`)
        }
    }

    removeBatchGcode(index: number) {
        this.batchGcodes.splice(index, 1)

        // Exit batch mode if no files left
        if (this.batchGcodes.length === 0) {
            this.isBatchMode = false
        }
        this.$forceUpdate()

    }

    clearBatchGcodes() {
        this.batchGcodes = []
        this.isBatchMode = false
        this.$forceUpdate()

    }

    parseGcodeFilename(filename: string) {
        const filenameLower = filename.toLowerCase()

        // Determine printer model
        let preferred_printer = ''
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

        // Default required runs based on filename
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

    handleSaveClick() {
        // Prevent action if uploading
        if (this.uploading) {
            return
        }

        if (this.isBatchMode) {
            // Batch mode validation
            if (this.batchGcodes.length === 0) {
                this.$toast.warning('Please select at least one GCode file')
                return
            }

            // Validate each batch form individually to trigger red highlighting
            let allValid = true
            let invalidCount = 0

            for (let i = 0; i < this.batchGcodes.length; i++) {
                const formRef = this.$refs[`batchForm${i}`]
                if (formRef && Array.isArray(formRef) && formRef[0]) {
                    // Trigger validation on this specific form
                    const isValid = (formRef[0] as any).validate()
                    if (!isValid) {
                        allValid = false
                        invalidCount++
                    }
                }
            }

            if (!allValid) {
                this.$toast.warning(`${invalidCount} file(s) have missing or invalid information (marked in red)`)
                return
            }

            // All batch files are valid, proceed
            this.saveGcode()
        } else {
            let isValid = true
            if (this.$refs.gcodeForm) {
                isValid = (this.$refs.gcodeForm as any).validate()
            }

            if (isValid) {
                this.saveGcode()
            } else {
                this.$toast.warning('Please fill in all required fields (marked in red)')
            }
        }
    }

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

.batch-gcode-items-container {
    max-height: 400px;
    overflow-y: auto;
}

.batch-gcode-item {
    transition: box-shadow 0.2s ease;
}

.batch-gcode-item:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>
