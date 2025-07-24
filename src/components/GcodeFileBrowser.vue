<template>
    <div class="gcode-file-browser">
        <!-- Path Navigation -->
        <div class="d-flex align-center mb-3">
            <span class="text-subtitle-2 mr-2">Browse:</span>
            <path-navigation :path="currentPath"
                             :base-directory-label="'/gcodes'"
                             :on-segment-click="clickPathNavGoToDirectory" />
            <v-spacer />
            <v-text-field v-model="search"
                          :append-icon="mdiMagnify"
                          label="Search files"
                          single-line
                          outlined
                          dense
                          clearable
                          hide-details
                          style="max-width: 200px" />
        </div>

        <!-- File List -->
        <div class="file-browser-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px;">
            <!-- Back button -->
            <div v-if="currentPath !== ''"
                 class="file-browser-item d-flex align-center pa-2 file-list-cursor"
                 @click="clickRowGoBack">
                <v-icon class="mr-2">{{ mdiFolderUpload }}</v-icon>
                <span>..</span>
            </div>

            <!-- Files and folders -->
            <div v-for="item in filteredFiles"
                 :key="item.filename || item.name || Math.random()"
                 class="file-browser-item d-flex align-center pa-2 file-list-cursor"
                 :class="{
                    'file-selected': isFileSelected(item),
                    'file-disabled': !isGcodeFile(item) && !item.isDirectory
                }"
                 @click="clickRow(item)"
                 @dblclick="handleDoubleClick(item)">

                <!-- Icon -->
                <div class="mr-2" style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    <v-icon v-if="item.isDirectory">{{ mdiFolder }}</v-icon>
                    <img v-else-if="item.small_thumbnail"
                         :src="item.small_thumbnail"
                         width="24"
                         height="24"
                         :alt="getItemName(item)"
                         style="border-radius: 2px;" />
                    <v-icon v-else>{{ mdiFile }}</v-icon>
                </div>

                <!-- Filename -->
                <div class="flex-grow-1 text-truncate">
                    {{ getItemName(item) }}
                </div>

                <!-- Selection indicator -->
                <v-icon v-if="isFileSelected(item) && !item.isDirectory"
                        color="primary"
                        small>
                    {{ mdiCheckCircle }}
                </v-icon>

                <!-- File info -->
                <div v-if="!item.isDirectory" class="ml-2 text-caption text--secondary">
                    {{ formatFilesize(item.size || 0) }}
                </div>
            </div>

            <!-- No files message -->
            <div v-if="filteredFiles.length === 0" class="text-center pa-4 text--secondary">
                No GCode files found
            </div>
        </div>

        <!-- Selected files summary -->
        <div v-if="selectedFiles.length > 0" class="mt-3">
            <div class="text-subtitle-2 mb-2">Selected Files ({{ selectedFiles.length }}):</div>
            <div class="selected-files-list" style="max-height: 100px; overflow-y: auto;">
                <v-chip v-for="file in selectedFiles"
                        :key="file.filename || file.name || Math.random()"
                        small
                        close
                        class="ma-1"
                        @click:close="removeSelectedFile(file)">
                    {{ getItemName(file) }}
                </v-chip>
            </div>
        </div>

        <!-- Actions -->
        <div class="d-flex justify-end mt-3">
            <v-btn text
                   @click="clearSelection">
                Clear
            </v-btn>
            <v-btn color="primary"
                   :disabled="selectedFiles.length === 0"
                   @click="confirmSelection">
                {{ selectionMode === 'single' ? 'Select File' : `Select ${selectedFiles.length} Files` }}
            </v-btn>
        </div>
    </div>
</template>

<script lang="ts">
    import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
    import BaseMixin from '@/components/mixins/base'
    import { formatFilesize } from '@/plugins/helpers'
    import { validGcodeExtensions } from '@/store/variables'
    import PathNavigation from '@/components/ui/PathNavigation.vue'
    import {
        mdiFolder,
        mdiFolderUpload,
        mdiFile,
        mdiMagnify,
        mdiCheckCircle
    } from '@mdi/js'

    @Component({
        components: { PathNavigation }
    })
    export default class GcodeFileBrowser extends Mixins(BaseMixin) {
        mdiFolder = mdiFolder
        mdiFolderUpload = mdiFolderUpload
        mdiFile = mdiFile
        mdiMagnify = mdiMagnify
        mdiCheckCircle = mdiCheckCircle

        formatFilesize = formatFilesize

        @Prop({ type: String, default: 'single' })
        selectionMode!: 'single' | 'multiple'

        @Prop({ type: Array, default: () => [] })
        preSelectedFiles!: any[]

        @Prop({ type: Number, default: 0 })
        resetKey!: number

        private currentPath = ''
        private search = ''
        private selectedFiles: any[] = []

        mounted() {
            this.selectedFiles = [...this.preSelectedFiles]
            this.refreshFileList()
        }

        get files() {
            return this.$store.getters['files/getGcodeFiles'](this.currentPath, false, true)
        }

        get filteredFiles() {
            let files = this.files.filter((file: any) => {
                // Show directories and GCode files
                return file.isDirectory || this.isGcodeFile(file)
            })

            if (this.search && this.search.trim()) {
                const searchLower = this.search.toLowerCase()
                files = files.filter((file: any) => {
                    const filename = this.getItemName(file).toLowerCase()
                    return filename.includes(searchLower)
                })
            }

            return files
        }

        // Helper method to safely get item name
        getItemName(item: any): string {
            if (!item) return 'Unknown'
            return item.filename || item.name || 'Unknown'
        }

        isGcodeFile(file: any) {
            if (file.isDirectory) return false
            const filename = this.getItemName(file)
            if (!filename || filename === 'Unknown') return false

            const lastDotIndex = filename.lastIndexOf('.')
            if (lastDotIndex === -1) return false

            const format = filename.slice(lastDotIndex)
            return validGcodeExtensions.includes(format)
        }

        isFileSelected(file: any) {
            const filename = this.getItemName(file)
            return this.selectedFiles.some(selected => this.getItemName(selected) === filename)
        }

        clickRow(item: any) {
            if (item.isDirectory) {
                const itemName = this.getItemName(item)
                this.currentPath += '/' + itemName
            } else if (this.isGcodeFile(item)) {
                if (this.selectionMode === 'single') {
                    this.selectedFiles = [item]
                } else {
                    const filename = this.getItemName(item)
                    const index = this.selectedFiles.findIndex(f => this.getItemName(f) === filename)
                    if (index >= 0) {
                        this.selectedFiles.splice(index, 1)
                    } else {
                        this.selectedFiles.push(item)
                    }
                }
            }
        }

        handleDoubleClick(item: any) {
            if (item.isDirectory) {
                const itemName = this.getItemName(item)
                this.currentPath += '/' + itemName
            } else if (this.isGcodeFile(item)) {
                if (this.selectionMode === 'single') {
                    this.selectedFiles = [item]
                    this.confirmSelection()
                }
            }
        }

        clickRowGoBack() {
            this.currentPath = this.currentPath.slice(0, this.currentPath.lastIndexOf('/'))
        }

        clickPathNavGoToDirectory(segment: { location: string }) {
            this.currentPath = segment.location
        }

        removeSelectedFile(file: any) {
            const filename = this.getItemName(file)
            const index = this.selectedFiles.findIndex(f => this.getItemName(f) === filename)
            if (index >= 0) {
                this.selectedFiles.splice(index, 1)
            }
        }

        clearSelection() {
            this.selectedFiles = []
        }

        confirmSelection() {
            this.$emit('files-selected', this.selectedFiles.map(file => ({
                ...file,
                filename: this.getItemName(file), // Ensure filename is always set
                fullPath: this.currentPath + '/' + this.getItemName(file)
            })))
        }

        refreshFileList() {
            this.$socket.emit(
                'server.files.get_directory',
                { path: 'gcodes' + this.currentPath },
                { action: 'files/getDirectory' }
            )
        }

        // Reset functionality to clear selection when resetKey changes
        @Watch('resetKey')
        onResetKeyChanged(newVal: number, oldVal: number) {
            if (newVal !== oldVal) {
                console.log('🔄 GcodeFileBrowser reset via resetKey:', newVal)
                this.selectedFiles = []
                this.currentPath = ''
                this.search = ''
            }
        }

        @Watch('currentPath')
        onPathChanged() {
            this.refreshFileList()
        }
    }
</script>

<style scoped>
    .file-browser-item {
        transition: background-color 0.2s;
        border-bottom: 1px solid #f0f0f0;
    }

        .file-browser-item:hover {
            background-color: #333;
        }

        .file-browser-item:last-child {
            border-bottom: none;
        }

    .file-selected {
        background-color: #1976d2 !important;
    }

    .file-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .file-list-cursor {
        cursor: pointer;
    }

        .file-list-cursor.file-disabled {
            cursor: not-allowed;
        }

    .selected-files-list {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 8px;
        background-color: #2a2a2a;
    }

    /* Dark theme support */
    .theme--dark .file-browser-list {
        border-color: #424242;
    }

    .theme--dark .file-browser-item {
        border-bottom-color: #424242;
    }

    .theme--dark .selected-files-list {
        border-color: #424242;
        background-color: #1e1e1e;
    }
</style>
