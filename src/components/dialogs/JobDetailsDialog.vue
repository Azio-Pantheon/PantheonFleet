<template>
    <v-dialog v-model="dialogVisible"
              :max-width="1500"
              persistent
              @keydown.esc="closeDialog">
        <panel title="Job Details"
               :icon="mdiBriefcaseOutline"
               card-class="job-details-dialog"
               :margin-bottom="false">
            <template #buttons>
                <!-- Refresh button -->
                <v-btn icon
                       tile
                       :loading="isLoadingJobDetails"
                       @click="refreshJobDetails"
                       title="Refresh job details">
                    <v-icon>{{ mdiRefresh }}</v-icon>
                </v-btn>
                <v-btn icon tile @click="closeDialog">
                    <v-icon>{{ mdiCloseThick }}</v-icon>
                </v-btn>
            </template>
            <v-card-text class="px-0">
                <overlay-scrollbars style="height: 70vh" class="px-6">
                    <v-row v-if="job">
                        <v-col cols="4">
                            <div class="d-flex justify-space-between align-center mb-3">
                                <h3>Job Information</h3>
                                <v-btn color="primary"
                                       small
                                       @click="$emit('edit-job', job)">
                                    <v-icon left small>{{ mdiPencil }}</v-icon>
                                    Edit Job
                                </v-btn>
                            </div>
                            <v-divider class="mb-3" />

                            <!-- Complete Job Information -->
                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Name:</strong></v-col>
                                <v-col cols="8">{{ job.name }}</v-col>
                            </v-row>

                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Customer:</strong></v-col>
                                <v-col cols="8">{{ getCustomerName(job.customer_id) }}</v-col>
                            </v-row>

                            <v-row>
                                <v-col cols="4"><strong>Status:</strong></v-col>
                                <v-col cols="8">
                                    <v-menu offset-y>
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-chip :color="getStatusColor(job.status)"
                                                    :text-color="getStatusTextColor(job.status)"
                                                    small
                                                    v-bind="attrs"
                                                    v-on="on"
                                                    style="cursor: pointer;"
                                                    title="Click to change status">
                                                <v-icon left small>{{ getStatusIcon(job.status) }}</v-icon>
                                                {{ job.status.replace('_', ' ') }}
                                                <v-icon right small>{{ mdiChevronDown }}</v-icon>
                                            </v-chip>
                                        </template>
                                        <v-list dense>
                                            <v-list-item v-if="job.status === 'pending'"
                                                         @click="updateJobStatus('in_progress')">
                                                <v-list-item-icon>
                                                    <v-icon small color="blue">{{ mdiPlay }}</v-icon>
                                                </v-list-item-icon>
                                                <v-list-item-content>
                                                    <v-list-item-title>Start Job</v-list-item-title>
                                                </v-list-item-content>
                                            </v-list-item>

                                            <v-list-item v-if="job.status === 'in_progress'"
                                                         @click="updateJobStatus('complete')">
                                                <v-list-item-icon>
                                                    <v-icon small color="green">{{ mdiCheck }}</v-icon>
                                                </v-list-item-icon>
                                                <v-list-item-content>
                                                    <v-list-item-title>Mark Complete</v-list-item-title>
                                                </v-list-item-content>
                                            </v-list-item>

                                            <v-list-item v-if="['pending', 'in_progress'].includes(job.status)"
                                                         @click="updateJobStatus('cancelled')">
                                                <v-list-item-icon>
                                                    <v-icon small color="red">{{ mdiCancel }}</v-icon>
                                                </v-list-item-icon>
                                                <v-list-item-content>
                                                    <v-list-item-title>Cancel Job</v-list-item-title>
                                                </v-list-item-content>
                                            </v-list-item>

                                            <!-- Options to revert status -->
                                            <v-divider v-if="job.status !== 'pending'" />

                                            <v-list-item v-if="job.status === 'in_progress'"
                                                         @click="updateJobStatus('pending')">
                                                <v-list-item-icon>
                                                    <v-icon small color="orange">{{ mdiAlertOutline }}</v-icon>
                                                </v-list-item-icon>
                                                <v-list-item-content>
                                                    <v-list-item-title>Back to Pending</v-list-item-title>
                                                </v-list-item-content>
                                            </v-list-item>

                                            <v-list-item v-if="job.status === 'complete'"
                                                         @click="updateJobStatus('in_progress')">
                                                <v-list-item-icon>
                                                    <v-icon small color="blue">{{ mdiProgressClock }}</v-icon>
                                                </v-list-item-icon>
                                                <v-list-item-content>
                                                    <v-list-item-title>Reopen Job</v-list-item-title>
                                                </v-list-item-content>
                                            </v-list-item>

                                            <v-list-item v-if="job.status === 'cancelled'"
                                                         @click="updateJobStatus('pending')">
                                                <v-list-item-icon>
                                                    <v-icon small color="orange">{{ mdiAlertOutline }}</v-icon>
                                                </v-list-item-icon>
                                                <v-list-item-content>
                                                    <v-list-item-title>Restore Job</v-list-item-title>
                                                </v-list-item-content>
                                            </v-list-item>
                                        </v-list>
                                    </v-menu>
                                </v-col>
                            </v-row>

                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Type:</strong></v-col>
                                <v-col cols="8">{{ job.job_type }}</v-col>
                            </v-row>

                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Priority:</strong></v-col>
                                <v-col cols="8">
                                    <v-chip :color="getPriorityColor(job.priority)"
                                            text-color="white"
                                            x-small>
                                        {{ getPriorityDisplay(job.priority) }}
                                    </v-chip>
                                </v-col>
                            </v-row>

                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Operator:</strong></v-col>
                                <v-col cols="8">{{ job.operator_name || '--' }}</v-col>
                            </v-row>

                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Due Date:</strong></v-col>
                                <v-col cols="8" :class="getDueDateClass(job.due_date)">
                                    {{ formatDateTime(job.due_date) || '--' }}
                                </v-col>
                            </v-row>

                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Created:</strong></v-col>
                                <v-col cols="8">{{ formatDateTime(job.created_at) }}</v-col>
                            </v-row>

                            <v-row class="mb-2">
                                <v-col cols="4"><strong>Updated:</strong></v-col>
                                <v-col cols="8">{{ formatDateTime(job.updated_at) }}</v-col>
                            </v-row>

                            <v-row class="mb-2" v-if="job.description">
                                <v-col cols="4"><strong>Description:</strong></v-col>
                                <v-col cols="8">{{ job.description }}</v-col>
                            </v-row>
                        </v-col>

                        <v-col cols="8">
                            <div class="d-flex justify-space-between align-center mb-3">
                                <h3>
                                    GCode Files
                                    <!-- Loading indicator for gcode files -->
                                    <v-progress-circular v-if="loadingGcodes"
                                                         indeterminate
                                                         size="16"
                                                         width="2"
                                                         color="primary"
                                                         class="ml-2" />
                                </h3>
                                <div class="d-flex align-center">
                                    <!-- Progress bar legend -->
                                    <v-menu offset-y>
                                        <template #activator="{ on, attrs }">
                                            <v-btn icon
                                                   small
                                                   v-bind="attrs"
                                                   v-on="on"
                                                   title="Progress bar legend">
                                                <v-icon small>{{ mdiInformationOutline }}</v-icon>
                                            </v-btn>
                                        </template>
                                        <v-card class="pa-3" style="max-width: 280px;">
                                            <div class="text-subtitle2 mb-2">Progress Bar Legend</div>
                                            <div class="legend-item mb-1">
                                                <div class="legend-color breathing-blue" style="background-color: #2196f3;"></div>
                                                <span class="text-caption">Rolling blue: In progress</span>
                                            </div>
                                            <div class="legend-item mb-1">
                                                <div class="legend-color" style="background-color: #2196f3;"></div>
                                                <span class="text-caption">Blue: Completed, awaiting QC</span>
                                            </div>
                                            <div class="legend-item mb-1">
                                                <div class="legend-color" style="background-color: #4caf50;"></div>
                                                <span class="text-caption">Green: Passed QC</span>
                                            </div>
                                            <div class="legend-item mb-1">
                                                <div class="legend-color" style="background-color: #bdbdbd;"></div>
                                                <span class="text-caption">Gray: Runs still needed</span>
                                            </div>
                                            <div class="legend-item">
                                                <div class="legend-color" style="background-color: #f44336;"></div>
                                                <span class="text-caption">Red: Failed runs</span>
                                            </div>
                                        </v-card>
                                    </v-menu>

                                    <!-- NEW: Enqueue All button -->
                                    <v-btn color="orange"
                                           small
                                           class="ml-2"
                                           :disabled="loadingGcodes || gcodeFiles.length === 0"
                                           :loading="loadingEnqueueAll"
                                           @click="enqueueAllGcodes">
                                        <v-icon left small>{{ mdiPlay  }}</v-icon>
                                        Enqueue All
                                    </v-btn>

                                    <v-btn color="primary"
                                           small
                                           class="ml-2"
                                           :disabled="loadingGcodes"
                                           @click="$emit('add-gcode', job)">
                                        <v-icon left small>{{ mdiPlus }}</v-icon>
                                        Add GCode
                                    </v-btn>
                                </div>
                            </div>
                            <v-divider class="mb-3" />

                            <!-- Loading skeleton for gcode files -->
                            <div v-if="loadingGcodes">
                                <div v-for="i in 2" :key="`skeleton-${i}`" class="gcode-skeleton mb-4">
                                    <v-skeleton-loader type="list-item-three-line"
                                                       class="pa-3"
                                                       style="border: 1px solid #e0e0e0; border-radius: 8px;">
                                    </v-skeleton-loader>
                                </div>
                            </div>

                            <!-- No gcode files message -->
                            <div v-else-if="gcodeFiles.length === 0" class="text-center text--secondary">
                                No GCode files added yet
                            </div>

                            <!-- Gcode files list -->
                            <div v-else>
                                <div v-for="gcode in gcodeFiles" :key="gcode.id" class="gcode-file-item mb-4 pa-3" style="border: 1px solid #e0e0e0; border-radius: 8px; background-color: #2a2a2a; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                    <!-- File header -->
                                    <div class="d-flex justify-space-between align-center mb-2">
                                        <div class="d-flex align-center">
                                            <!-- QC Status Icon -->
                                            <v-tooltip top>
                                                <template #activator="{ on, attrs }">
                                                    <v-icon :color="getGcodeFileStatusColor(gcode)"
                                                            small
                                                            class="mr-2 qc-status-icon"
                                                            v-bind="attrs"
                                                            v-on="on">
                                                        {{ getGcodeFileStatusIcon(gcode) }}
                                                    </v-icon>
                                                </template>
                                                <span>{{ getGcodeFileStatusTooltip(gcode) }}</span>
                                            </v-tooltip>

                                            <!-- UPDATED: File name now clickable -->
                                            <v-tooltip top>
                                                <template #activator="{ on, attrs }">
                                                    <div :class="[getGcodeFileNameColor(gcode), 'font-weight-bold', 'gcode-filename', 'clickable-filename']"
                                                         :style="`font-size: 14px; transition: color 0.3s ease; cursor: pointer;`"
                                                         v-bind="attrs"
                                                         v-on="on"
                                                         @click="$emit('view-gcode-runs', gcode)">
                                                        {{ gcode.gcode_filename }}
                                                    </div>
                                                </template>
                                                <span>Click to view print runs</span>
                                            </v-tooltip>
                                        </div>
                                        <div class="d-flex align-center">
                                            <!-- NEW: Enqueue GCode button (replaces view button) -->
                                            <v-btn icon
                                                   small
                                                   color="orange"
                                                   class="elevation-1 mr-1"
                                                   style="background-color: #ff9800 !important;"
                                                   :loading="loadingEnqueueGcode[gcode.id]"
                                                   @click="enqueueGcode(gcode)"
                                                   title="Enqueue to printers">
                                                <v-icon small color="white">{{ mdiPlay  }}</v-icon>
                                            </v-btn>

                                            <v-btn icon
                                                   small
                                                   color="primary"
                                                   class="elevation-1 mr-1"
                                                   style="background-color: #1976d2 !important;"
                                                   @click="$emit('edit-gcode', gcode)"
                                                   title="Edit GCode file">
                                                <v-icon small color="white">{{ mdiPencil }}</v-icon>
                                            </v-btn>
                                            <v-btn icon
                                                   small
                                                   :color="getRunStatistics(gcode).totalRuns > 0 ? 'grey' : 'error'"
                                                   :disabled="getRunStatistics(gcode).totalRuns > 0"
                                                   class="elevation-1"
                                                   @click="$emit('delete-gcode', gcode)"
                                                   :title="getRunStatistics(gcode).totalRuns > 0 ? 'Cannot delete - has associated runs' : 'Delete GCode file'">
                                                <v-icon small :color="getRunStatistics(gcode).totalRuns > 0 ? 'grey' : 'white'">{{ mdiDelete }}</v-icon>
                                            </v-btn>
                                        </div>
                                    </div>

                                    <!-- File info chips -->
                                    <div class="mb-3">
                                        <v-chip x-small color="blue" text-color="white" class="mr-1">
                                            {{ gcode.filament_type }}
                                        </v-chip>
                                        <v-chip x-small color="orange" text-color="white" class="mr-1">
                                            {{ gcode.required_runs }} runs
                                        </v-chip>
                                        <v-chip x-small color="green" text-color="white">
                                            {{ gcode.preferred_printer }}
                                        </v-chip>
                                    </div>

                                    <!-- Progress bar section -->
                                    <div class="gcode-progress-container mb-2">
                                        <!-- Loading state for runs -->
                                        <div v-if="loadingRuns" class="d-flex align-center justify-center pa-3">
                                            <v-progress-circular indeterminate
                                                                 size="24"
                                                                 width="3"
                                                                 color="primary"
                                                                 class="mr-2" />
                                            <span class="text-caption text--secondary">Loading print runs...</span>
                                        </div>

                                        <!-- Discrete progress bar (shown when not loading) -->
                                        <div v-else class="d-flex align-center">
                                            <!-- Main discrete progress bar -->
                                            <div class="gcode-discrete-progress-bar"
                                                 style="height: 24px; border-radius: 12px; overflow: hidden; flex: 1; position: relative; background-color: #f5f5f5; border: 1px solid #ddd; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); display: flex;">

                                                <!-- Individual run segments -->
                                                <div v-for="(segment, index) in getRunSegments(gcode)"
                                                     :key="index"
                                                     :class="getSegmentClass(segment)"
                                                     :style="getSegmentStyle(gcode, segment)">

                                                    <!-- Segment content/icon -->
                                                    <div class="segment-content">
                                                        <v-icon v-if="segment.status === 'in_progress'"
                                                                x-small
                                                                color="white"
                                                                class="breathing-icon">
                                                            mdi-cog
                                                        </v-icon>
                                                        <v-icon v-else-if="segment.status === 'passed_qc'"
                                                                x-small
                                                                color="white">
                                                            mdi-check
                                                        </v-icon>
                                                        <v-icon v-else-if="segment.status === 'completed_no_qc'"
                                                                x-small
                                                                color="white">
                                                            mdi-clock-outline
                                                        </v-icon>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Red bar for failures (separate, attached to the right) -->
                                            <div v-if="getRunStatistics(gcode).totalFailed > 0"
                                                 class="failure-bar ml-2"
                                                 :style="`width: ${Math.min(getRunStatistics(gcode).totalFailed * 12 + 24, 80)}px; height: 24px; background-color: #f44336; border-radius: 12px; position: relative; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.2);`"
                                                 :title="`${getRunStatistics(gcode).totalFailed} failed runs (${getRunStatistics(gcode).technicalFailures} technical + ${getRunStatistics(gcode).qcFailures} QC failures)`">
                                                <span style="color: white; font-size: 11px; font-weight: bold;">
                                                    {{ getRunStatistics(gcode).totalFailed }}
                                                </span>
                                            </div>
                                        </div>

                                        <!-- Statistics text below the bar -->
                                        <div v-if="!loadingRuns" class="gcode-progress-stats mt-2" style="font-size: 12px; color: #424242; font-weight: 500;">
                                            <span class="font-weight-bold" style="color: #1976d2;">{{ getRunStatistics(gcode).goodRuns }}/{{ getRunStatistics(gcode).requiredRuns }}</span>
                                            <span v-if="getRunStatistics(gcode).totalFailed > 0" class="ml-2" style="color: #d32f2f;">
                                                {{ getRunStatistics(gcode).totalFailed }} failed
                                            </span>
                                            <span v-if="getRunStatistics(gcode).inProgress > 0" class="ml-2" style="color: #1976d2;">
                                                {{ getRunStatistics(gcode).inProgress }} in progress
                                            </span>
                                            <span v-if="getRunStatistics(gcode).passedQC > 0" class="ml-2" style="color: #388e3c;">
                                                {{ getRunStatistics(gcode).passedQC }} passed QC
                                            </span>
                                            <span v-if="getRunStatistics(gcode).completedNoQC > 0" class="ml-2" style="color: #1976d2;">
                                                {{ getRunStatistics(gcode).completedNoQC }} awaiting QC
                                            </span>
                                        </div>

                                        <!-- Queue status display -->
                                        <div v-if="(getQueueStatus(gcode) && getQueueStatus(gcode).total_queued > 0) || hasActiveRuns(gcode)" class="queue-runs-display mt-3 pa-3" style="border: 1px solid #ff9800; border-radius: 8px; background-color: rgba(255, 152, 0, 0.05);">
                                            <!-- Queue Status Section -->
                                            <div v-if="getQueueStatus(gcode)" class="queue-status-section mb-3">
                                                <div class="d-flex align-center mb-2">
                                                    <v-icon x-small color="orange" class="mr-2">mdi-clock-outline</v-icon>
                                                    <span class="text-subtitle2" style="color: #ff9800; font-weight: 600;">
                                                        Queue: {{ getQueueStatus(gcode).total_queued }} jobs across {{ Object.keys(getQueueStatus(gcode).queued_per_printer).length }} printers
                                                    </span>
                                                </div>
                                                <div class="queue-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                                    <div v-for="(count, hostname) in getQueueStatus(gcode).queued_per_printer"
                                                         :key="hostname"
                                                         class="text-caption d-flex justify-space-between align-center py-1"
                                                         style="border: 1px solid rgba(255, 152, 0, 0.2); border-radius: 4px; padding: 8px;">
                                                        <div class="d-flex align-center">
                                                            <!-- Printer Status Tag -->
                                                            <v-chip x-small
                                                                    :color="getPrinterStatusColor(hostname)"
                                                                    :text-color="getPrinterStatusTextColor(hostname)"
                                                                    class="mr-2"
                                                                    :title="getPrinterStatusTooltip(hostname)">
                                                                {{ getPrinterStatusText(hostname) }}
                                                            </v-chip>
                                                            <span class="font-weight-medium clickable-printer"
                                                                  @click="clickPrinter(hostname)"
                                                                  :title="getPrinterClickTooltip(hostname)">
                                                                {{ hostname }}
                                                            </span>
                                                        </div>
                                                        <v-chip x-small color="orange" text-color="white">{{ count }} queued</v-chip>
                                                    </div>
                                                    <div class="text-caption mt-2 grey--text text-right">
                                                        Last updated: {{ formatQueueTime(getQueueStatus(gcode).last_updated) }}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Active Runs Section - SIMPLIFIED -->
                                            <div v-if="hasActiveRuns(gcode)" class="active-runs-section">
                                                <div class="d-flex align-center justify-space-between mb-2">
                                                    <div class="d-flex align-center">
                                                        <v-icon x-small color="blue" class="mr-2">mdi-play-circle</v-icon>
                                                        <span class="text-subtitle2" style="color: #1976d2; font-weight: 600;">
                                                            Active Runs ({{ getActiveRuns(gcode).length }})
                                                        </span>
                                                    </div>

                                                    <!-- NEW: QC Pass All Button -->
                                                    <div v-if="getEligibleRunsForBatchQC(gcode).length > 0" class="d-flex align-center">
                                                        <v-menu offset-y>
                                                            <template #activator="{ on, attrs }">
                                                                <v-btn small
                                                                       color="green"
                                                                       class="elevation-1 mr-2"
                                                                       style="background-color: #4caf50 !important;"
                                                                       v-bind="attrs"
                                                                       v-on="on"
                                                                       :loading="loadingBatchQC[gcode.id]"
                                                                       :title="`Batch QC update for ${getEligibleRunsForBatchQC(gcode).length} completed runs`">
                                                                    <v-icon left x-small color="white">{{ mdiCheckboxMarkedCircleOutline }}</v-icon>
                                                                    <span style="color: white; font-size: 11px; font-weight: bold;">
                                                                        QC Pass All ({{ getEligibleRunsForBatchQC(gcode).length }})
                                                                    </span>
                                                                    <v-icon right x-small color="white">{{ mdiChevronDown }}</v-icon>
                                                                </v-btn>
                                                            </template>
                                                            <v-list dense>
                                                                <v-list-item @click="batchUpdateQC(gcode, 'pass')">
                                                                    <v-list-item-icon>
                                                                        <v-icon small color="green">{{ mdiCheckboxMarkedCircleOutline }}</v-icon>
                                                                    </v-list-item-icon>
                                                                    <v-list-item-content>
                                                                        <v-list-item-title>Pass All ({{ getEligibleRunsForBatchQC(gcode).length }} runs)</v-list-item-title>
                                                                    </v-list-item-content>
                                                                </v-list-item>
                                                                <v-list-item @click="batchUpdateQC(gcode, 'fail')">
                                                                    <v-list-item-icon>
                                                                        <v-icon small color="red">{{ mdiCloseCircleOutline }}</v-icon>
                                                                    </v-list-item-icon>
                                                                    <v-list-item-content>
                                                                        <v-list-item-title>Fail All ({{ getEligibleRunsForBatchQC(gcode).length }} runs)</v-list-item-title>
                                                                    </v-list-item-content>
                                                                </v-list-item>
                                                            </v-list>
                                                        </v-menu>
                                                    </div>
                                                </div>
                                                <div class="runs-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                                    <div v-for="run in getActiveRuns(gcode)"
                                                         :key="run.id"
                                                         class="run-item pa-2"
                                                         style="border: 1px solid rgba(25, 118, 210, 0.3); border-radius: 6px; background-color: rgba(25, 118, 210, 0.05);">

                                                        <!-- SIMPLIFIED Run Header -->
                                                        <div class="d-flex justify-space-between align-center">
                                                            <!-- Printer Name -->
                                                            <div class="d-flex align-center">
                                                                <v-icon x-small color="blue" class="mr-2">
                                                                    mdi-printer-3d
                                                                </v-icon>
                                                                <span class="text-body-2 font-weight-medium clickable-printer"
                                                                      @click="clickPrinter(run.printer_hostname)"
                                                                      :title="getPrinterClickTooltip(run.printer_hostname)">
                                                                    {{ run.printer_hostname }}
                                                                </span>
                                                            </div>

                                                            <!-- Status and QC Controls -->
                                                            <div class="d-flex align-center">
                                                                <!-- Clickable Status Chip -->
                                                                <v-menu offset-y>
                                                                    <template #activator="{ on, attrs }">
                                                                        <v-chip :color="getRunStatusColor(run.status)"
                                                                                :text-color="getRunStatusTextColor(run.status)"
                                                                                x-small
                                                                                style="cursor: pointer;"
                                                                                class="mr-2"
                                                                                v-bind="attrs"
                                                                                v-on="on">
                                                                            <v-icon left x-small>{{ getRunStatusIcon(run.status) }}</v-icon>
                                                                            {{ run.status.replace('_', ' ') }}
                                                                            <v-icon right x-small>{{ mdiChevronDown }}</v-icon>
                                                                        </v-chip>
                                                                    </template>
                                                                    <v-list dense>
                                                                        <v-list-item @click="updateRunStatus(run, 'in_progress')">
                                                                            <v-list-item-icon>
                                                                                <v-icon small color="blue">{{ mdiProgressClock }}</v-icon>
                                                                            </v-list-item-icon>
                                                                            <v-list-item-content>
                                                                                <v-list-item-title>In Progress</v-list-item-title>
                                                                            </v-list-item-content>
                                                                        </v-list-item>
                                                                        <v-list-item @click="updateRunStatus(run, 'success')">
                                                                            <v-list-item-icon>
                                                                                <v-icon small color="green">{{ mdiCheck }}</v-icon>
                                                                            </v-list-item-icon>
                                                                            <v-list-item-content>
                                                                                <v-list-item-title>Success</v-list-item-title>
                                                                            </v-list-item-content>
                                                                        </v-list-item>
                                                                        <v-list-item @click="updateRunStatus(run, 'fail')">
                                                                            <v-list-item-icon>
                                                                                <v-icon small color="red">{{ mdiAlertOutline }}</v-icon>
                                                                            </v-list-item-icon>
                                                                            <v-list-item-content>
                                                                                <v-list-item-title>Failed</v-list-item-title>
                                                                            </v-list-item-content>
                                                                        </v-list-item>
                                                                        <v-list-item @click="updateRunStatus(run, 'cancelled')">
                                                                            <v-list-item-icon>
                                                                                <v-icon small color="grey">{{ mdiCancel }}</v-icon>
                                                                            </v-list-item-icon>
                                                                            <v-list-item-content>
                                                                                <v-list-item-title>Cancelled</v-list-item-title>
                                                                            </v-list-item-content>
                                                                        </v-list-item>
                                                                    </v-list>
                                                                </v-menu>

                                                                <!-- Clickable QC Chip -->
                                                                <v-menu offset-y>
                                                                    <template #activator="{ on, attrs }">
                                                                        <v-chip :color="getRunQCColor(run.qc)"
                                                                                :text-color="getRunQCTextColor(run.qc)"
                                                                                x-small
                                                                                style="cursor: pointer;"
                                                                                v-bind="attrs"
                                                                                v-on="on">
                                                                            <v-icon left x-small>{{ getRunQCIcon(run.qc) }}</v-icon>
                                                                            {{ getRunQCDisplay(run.qc) }}
                                                                            <v-icon right x-small>{{ mdiChevronDown }}</v-icon>
                                                                        </v-chip>
                                                                    </template>
                                                                    <v-list dense>
                                                                        <v-list-item @click="updateRunQC(run, 'pass')">
                                                                            <v-list-item-icon>
                                                                                <v-icon small color="green">{{ mdiCheckboxMarkedCircleOutline }}</v-icon>
                                                                            </v-list-item-icon>
                                                                            <v-list-item-content>
                                                                                <v-list-item-title>Pass</v-list-item-title>
                                                                            </v-list-item-content>
                                                                        </v-list-item>
                                                                        <v-list-item @click="updateRunQC(run, 'fail')">
                                                                            <v-list-item-icon>
                                                                                <v-icon small color="red">{{ mdiCloseCircleOutline }}</v-icon>
                                                                            </v-list-item-icon>
                                                                            <v-list-item-content>
                                                                                <v-list-item-title>Fail</v-list-item-title>
                                                                            </v-list-item-content>
                                                                        </v-list-item>
                                                                        <v-list-item @click="updateRunQC(run, null)">
                                                                            <v-list-item-icon>
                                                                                <v-icon small color="grey">{{ mdiHelpCircleOutline }}</v-icon>
                                                                            </v-list-item-icon>
                                                                            <v-list-item-content>
                                                                                <v-list-item-title>Not Set</v-list-item-title>
                                                                            </v-list-item-content>
                                                                        </v-list-item>
                                                                    </v-list>
                                                                </v-menu>
                                                            </div>
                                                        </div>

                                                        <!-- Progress Bar (only for in-progress runs) -->
                                                        <div v-if="run.status === 'in_progress'" class="progress-section mt-2">
                                                            <div class="d-flex align-center mb-1">
                                                                <span class="text-caption text--secondary mr-2">Progress:</span>
                                                                <span class="text-caption font-weight-medium">
                                                                    {{ Math.round(getPrinterProgress(run.printer_hostname)) }}% - {{ getPrinterProgressMessage(run.printer_hostname) }}
                                                                </span>
                                                            </div>
                                                            <v-progress-linear :value="getPrinterProgress(run.printer_hostname)"
                                                                               height="12"
                                                                               color="blue"
                                                                               background-color="grey lighten-3"
                                                                               striped
                                                                               rounded>
                                                                <template v-slot:default="{ value }">
                                                                    <small class="progress-mini-text">{{ Math.round(value) }}%</small>
                                                                </template>
                                                            </v-progress-linear>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </v-col>
                    </v-row>
                </overlay-scrollbars>
            </v-card-text>
        </panel>

        <!-- Enqueue Confirmation Dialog -->
        <v-dialog v-model="enqueueDialog.show"
                  :max-width="600"
                  persistent
                  @keydown.esc="closeEnqueueDialog">
            <panel :title="getEnqueueDialogTitle()"
                   :icon="mdiPlay"
                   card-class="enqueue-dialog"
                   :margin-bottom="false">
                <template #buttons>
                    <v-btn icon tile @click="closeEnqueueDialog">
                        <v-icon>{{ mdiCloseThick }}</v-icon>
                    </v-btn>
                </template>
                <v-card-text>
                    <!-- Single GCode File Info -->
                    <div v-if="!enqueueDialog.isEnqueueAll && enqueueDialog.gcode" class="mb-4">
                        <!-- Sequential Processing Progress -->
                        <div v-if="enqueueDialog.isDirtySequence" class="mb-3">
                            <v-progress-linear :value="((enqueueDialog.currentDirtyIndex + 1) / enqueueDialog.dirtyFilesQueue.length) * 100"
                                               height="8"
                                               color="orange"
                                               background-color="grey lighten-3"
                                               rounded>
                            </v-progress-linear>
                            <div class="text-caption text--secondary mt-1 text-center">
                                Processing file {{ enqueueDialog.currentDirtyIndex + 1 }} of {{ enqueueDialog.dirtyFilesQueue.length }}
                            </div>
                        </div>

                        <div class="text-subtitle1 font-weight-bold mb-2">{{ enqueueDialog.gcode.gcode_filename }}</div>
                        <div class="mb-2">
                            <v-chip small color="blue" text-color="white" class="mr-2">
                                {{ enqueueDialog.gcode.filament_type }}
                            </v-chip>
                            <v-chip small color="orange" text-color="white" class="mr-2">
                                {{ enqueueDialog.gcode.required_runs }} required
                            </v-chip>
                            <v-chip small color="green" text-color="white">
                                {{ enqueueDialog.gcode.preferred_printer }}
                            </v-chip>
                        </div>

                        <!-- Current Status -->
                        <div class="current-status pa-3 mb-3" style="background-color: rgba(25, 118, 210, 0.05); border-left: 4px solid #1976d2; border-radius: 4px;">
                            <div class="text-subtitle2 font-weight-bold mb-1" style="color: #1976d2;">Current Status:</div>
                            <div class="text-body-2">{{ getEnqueueCurrentStatus(enqueueDialog.gcode) }}</div>
                        </div>
                    </div>

                    <!-- Runs Input -->
                    <v-form ref="enqueueForm" v-model="enqueueDialog.valid">
                        <v-row>
                            <v-col cols="12">
                                <v-text-field v-model.number="enqueueDialog.form.runs_to_enqueue"
                                              :label="enqueueDialog.isDirtySequence ? 'Runs to enqueue for this file' :
                                                      enqueueDialog.isEnqueueAll ? 'Runs per file to enqueue' : 'Number of runs to enqueue'"
                                              type="number"
                                              min="1"
                                              max="20"
                                              :rules="[
                                              v=>
                                    !!v || 'Number of runs is required',
                                    v => v > 0 || 'Must be greater than 0',
                                    v => v <= 20 || 'Maximum 20 runs at once'
                                    ]"
                                    outlined
                                    denset>
                                    <template v-slot:prepend>
                                        <v-icon color="orange">{{ mdiPlay }}</v-icon>
                                    </template>
                                </v-text-field>
                            </v-col>
                        </v-row>
                    </v-form>

                    <!-- Warning for high numbers -->
                    <v-alert v-if="enqueueDialog.form.runs_to_enqueue > 5"
                             type="warning"
                             outlined
                             dense
                             class="mt-2">
                        <div class="d-flex align-center">
                            <v-icon left small>mdi-alert-outline</v-icon>
                            <div>
                                <strong>High number of runs:</strong>
                                This will enqueue {{ enqueueDialog.form.runs_to_enqueue }} runs for
                                {{ enqueueDialog.isDirtySequence || !enqueueDialog.isEnqueueAll ? 'this file' : `each of ${gcodeFiles.length} files (${enqueueDialog.form.runs_to_enqueue * gcodeFiles.length} total)` }}
                                <br>
                                <span class="text-caption">Make sure your printers can handle this queue load.</span>
                            </div>
                        </div>
                    </v-alert>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <!-- Skip button for sequential processing -->
                    <v-btn v-if="enqueueDialog.isDirtySequence"
                           text
                           color="grey"
                           @click="skipCurrentDirtyFile">
                        Skip This File
                    </v-btn>
                    <v-btn text @click="closeEnqueueDialog">
                        {{ enqueueDialog.isDirtySequence ? 'Cancel All' : 'Cancel' }}
                    </v-btn>
                    <v-btn color="orange"
                           :loading="enqueueDialog.loading"
                           :disabled="!enqueueDialog.valid"
                           @click="confirmEnqueue">
                        <v-icon left>{{ mdiPlay }}</v-icon>
                        {{
 enqueueDialog.isDirtySequence ? 'Enqueue & Next' :
                           enqueueDialog.isEnqueueAll ? 'Enqueue All' : 'Enqueue'
                        }}
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
        mdiBriefcaseOutline,
        mdiRefresh,
        mdiCloseThick,
        mdiPencil,
        mdiChevronDown,
        mdiPlay,
        mdiCheck,
        mdiCancel,
        mdiAlertOutline,
        mdiProgressClock,
        mdiDelete,
        mdiPlus,
        mdiInformationOutline,
        mdiCheckCircle,
        mdiCheckboxMarkedCircleOutline,
        mdiCloseCircleOutline,
        mdiHelpCircleOutline,
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

    interface FleetJobGcode {
        id: string
        job_id: string
        gcode_filename: string
        required_runs: number
        preferred_printer: string
        filament_type: string
        created_at: string
        queue_status?: any
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

    interface FleetGcodeQueueStatus {
        gcode_id: string
        total_queued: number
        required_runs: number
        queued_per_printer: { [hostname: string]: number }
        last_updated: string
    }

    @Component({
        components: { Panel },
    })
    export default class JobDetailsDialog extends Mixins(BaseMixin) {
        mdiBriefcaseOutline = mdiBriefcaseOutline
        mdiRefresh = mdiRefresh
        mdiCloseThick = mdiCloseThick
        mdiPencil = mdiPencil
        mdiChevronDown = mdiChevronDown
        mdiPlay = mdiPlay
        mdiCheck = mdiCheck
        mdiCancel = mdiCancel
        mdiAlertOutline = mdiAlertOutline
        mdiProgressClock = mdiProgressClock
        mdiDelete = mdiDelete
        mdiPlus = mdiPlus
        mdiInformationOutline = mdiInformationOutline
        mdiCheckCircle = mdiCheckCircle
        mdiCheckboxMarkedCircleOutline = mdiCheckboxMarkedCircleOutline
        mdiCloseCircleOutline = mdiCloseCircleOutline
        mdiHelpCircleOutline = mdiHelpCircleOutline

        @Prop({ type: Boolean, default: false })
        readonly value!: boolean

        @Prop({ type: Object, default: null })
        readonly job!: FleetJob | null

        @Prop({ type: Array, default: () => [] })
        readonly gcodeFiles!: FleetJobGcode[]

        @Prop({ type: Object, default: () => ({}) })
        readonly allJobRuns!: { [gcodeId: string]: FleetJobGcodeRun[] }

        @Prop({ type: Boolean, default: false })
        readonly loadingGcodes!: boolean

        @Prop({ type: Boolean, default: false })
        readonly loadingRuns!: boolean

        private runStatisticsCache: { [gcodeId: string]: any } = {}
        private queueStatusCache: { [gcodeId: string]: FleetGcodeQueueStatus } = {}
        private loadingEnqueueGcode: { [gcodeId: string]: boolean } = {}
        private loadingEnqueueAll: boolean = false

        private loadingBatchQC: { [gcodeId: string]: boolean } = {}

        // Progress tracking for auto-refresh
        private printerProgressCache: { [hostname: string]: number } = {}

        // Enqueue confirmation dialog
        private enqueueDialog = {
            show: false,
            loading: false,
            valid: false,
            gcode: null as FleetJobGcode | null,
            isEnqueueAll: false,
            isDirtySequence: false,
            dirtyFilesQueue: [] as FleetJobGcode[],
            currentDirtyIndex: 0,
            form: {
                runs_to_enqueue: 1
            }
        }

        get dialogVisible() {
            return this.value
        }

        set dialogVisible(val: boolean) {
            this.$emit('input', val)
        }

        get customers() {
            return this.$store.state.fleet?.jobs?.customers ?? []
        }

        get isLoadingJobDetails(): boolean {
            return this.loadingGcodes || this.loadingRuns
        }

        mounted() {
            // Load queue status when dialog opens
            if (this.job && this.gcodeFiles.length > 0) {
                this.loadJobQueueStatus()
            }
        }

        @Watch('gcodeFiles')
        onGcodeFilesChanged() {
            // Load queue status when gcode files change
            if (this.job && this.gcodeFiles.length > 0) {
                this.loadJobQueueStatus()
            }
        }

        async loadJobQueueStatus() {
            if (!this.job) return

            try {
                const queueStatus = await this.$store.dispatch('fleet/jobs/getJobQueueStatus', this.job.id)
                this.queueStatusCache = queueStatus || {}
            } catch (error) {
                console.warn('Failed to load queue status:', error)
            }
        }

        closeDialog() {
            this.$emit('close')
            // Clear progress cache when dialog closes
            this.printerProgressCache = {}
        }

        async refreshJobDetails() {
            this.$emit('refresh')
            // Also refresh queue status
            await this.loadJobQueueStatus()
        }

        updateJobStatus(status: string) {
            this.$emit('update-status', status)
        }

        getCustomerName(customerId: string) {
            const customer = this.customers.find((c: any) => c.id === customerId)
            return customer ? customer.name : 'Unknown Customer'
        }

        // NEW: Run status and QC update methods - emit events to parent
        updateRunStatus(run: FleetJobGcodeRun, status: string) {
            this.$emit('update-run-status', { run, status })
            // Also refresh job details after status update
            setTimeout(() => {
                this.refreshJobDetails()
            }, 500) // Small delay to let the API update complete
        }

        updateRunQC(run: FleetJobGcodeRun, qc: string | null) {
            this.$emit('update-run-qc', { run, qc })
            // Also refresh job details after QC update
            setTimeout(() => {
                this.refreshJobDetails()
            }, 500) // Small delay to let the API update complete
        }

        // Printer click methods
        clickPrinter(hostname: string) {
            const printer = this.getPrinterByHostname(hostname)
            if (printer && this.isPrinterConnected(hostname)) {
                window.open(this.getPrinterUrl(hostname))
            } else if (printer) {
                // Attempt to reconnect if printer exists but is disconnected
                this.$store.dispatch('farm/' + printer._namespace + '/reconnect')
                this.$toast.info(`Attempting to reconnect to ${hostname}...`)
            } else {
                this.$toast.warning(`Printer ${hostname} not found`)
            }
        }

        getPrinterUrl(hostname: string): string {
            const printer = this.getPrinterByHostname(hostname)
            if (printer && printer.socket) {
                const protocol = printer.socket.protocol || 'http'
                const port = printer.socket.port || '80'
                return `${protocol}://${hostname}:${port}`
            }
            // Fallback to standard HTTP
            return `http://${hostname}`
        }

        getPrinterByHostname(hostname: string): any {
            // Check fleet daemon printers first
            const fleetPrinter = this.fleetDaemonPrinters[hostname]
            if (fleetPrinter) {
                return fleetPrinter
            }

            // Fallback to remote printers
            const remotePrinters = this.$store.state.gui?.remoteprinters?.printers || {}
            for (const printer of Object.values(remotePrinters)) {
                if ((printer as any).hostname === hostname) {
                    return printer
                }
            }
            return null
        }

        isPrinterConnected(hostname: string): boolean {
            const printer = this.getPrinterByHostname(hostname)
            if (!printer) return false

            // Check fleet daemon connection first
            if (printer.socket?.isConnected !== undefined) {
                return printer.socket.isConnected && printer.fleet_to_printer_ws !== false
            }

            // Fallback to remote printer connection status
            return printer.socket?.isConnected || false
        }

        getPrinterClickTooltip(hostname: string): string {
            if (this.isPrinterConnected(hostname)) {
                return `Click to open ${hostname} in new tab`
            } else {
                return `Click to reconnect to ${hostname}`
            }
        }

        // Enqueue dialog methods
        openEnqueueDialog(gcode: FleetJobGcode, isEnqueueAll: boolean = false) {
            this.enqueueDialog.gcode = gcode
            this.enqueueDialog.isEnqueueAll = isEnqueueAll
            this.enqueueDialog.isDirtySequence = false

            // Calculate recommended number of runs to enqueue
            const stats = this.getRunStatistics(gcode)
            const queueStatus = this.getQueueStatus(gcode)
            const totalQueued = queueStatus?.total_queued || 0
            const totalGoodRuns = stats.passedQC + stats.inProgress + stats.completedNoQC + totalQueued
            const stillNeeded = Math.max(1, gcode.required_runs - totalGoodRuns)

            this.enqueueDialog.form.runs_to_enqueue = stillNeeded
            this.enqueueDialog.show = true
        }

        closeEnqueueDialog() {
            this.enqueueDialog.show = false
            this.enqueueDialog.gcode = null
            this.enqueueDialog.isEnqueueAll = false
            this.enqueueDialog.isDirtySequence = false
            this.enqueueDialog.dirtyFilesQueue = []
            this.enqueueDialog.currentDirtyIndex = 0
            this.enqueueDialog.form.runs_to_enqueue = 1
        }

        getEnqueueDialogTitle(): string {
            if (this.enqueueDialog.isDirtySequence && this.enqueueDialog.gcode) {
                const current = this.enqueueDialog.currentDirtyIndex + 1
                const total = this.enqueueDialog.dirtyFilesQueue.length
                return `Enqueue ${this.enqueueDialog.gcode.gcode_filename} (${current}/${total})`
            } else if (this.enqueueDialog.isEnqueueAll) {
                return 'Enqueue All GCode Files'
            } else if (this.enqueueDialog.gcode) {
                return `Enqueue ${this.enqueueDialog.gcode.gcode_filename}`
            }
            return 'Enqueue GCode'
        }

        getEnqueueCurrentStatus(gcode: FleetJobGcode): string {
            const stats = this.getRunStatistics(gcode)
            const queueStatus = this.getQueueStatus(gcode)
            const totalQueued = queueStatus?.total_queued || 0

            const statusParts = []
            if (stats.passedQC > 0) statusParts.push(`${stats.passedQC} passed QC`)
            if (stats.inProgress > 0) statusParts.push(`${stats.inProgress} in progress`)
            if (stats.completedNoQC > 0) statusParts.push(`${stats.completedNoQC} awaiting QC`)
            if (totalQueued > 0) statusParts.push(`${totalQueued} queued`)
            if (stats.totalFailed > 0) statusParts.push(`${stats.totalFailed} failed`)

            return statusParts.length > 0 ? statusParts.join(', ') : 'No existing runs'
        }

        async confirmEnqueue() {
            if (this.enqueueDialog.isDirtySequence && this.enqueueDialog.gcode) {
                // Process current dirty file and move to next
                await this.performEnqueue(this.enqueueDialog.gcode, this.enqueueDialog.form.runs_to_enqueue)
                await this.moveToNextDirtyFile()
            } else if (this.enqueueDialog.gcode) {
                await this.performEnqueue(this.enqueueDialog.gcode, this.enqueueDialog.form.runs_to_enqueue)
                this.closeEnqueueDialog()
            }
        }

        async skipCurrentDirtyFile() {
            if (this.enqueueDialog.isDirtySequence) {
                this.$toast.info(`Skipped ${this.enqueueDialog.gcode?.gcode_filename}`)
                await this.moveToNextDirtyFile()
            }
        }

        async moveToNextDirtyFile() {
            this.enqueueDialog.currentDirtyIndex++

            if (this.enqueueDialog.currentDirtyIndex >= this.enqueueDialog.dirtyFilesQueue.length) {
                // Finished with all dirty files
                this.$toast.success('Finished processing all files')
                this.closeEnqueueDialog()
                return
            }

            // Set up dialog for next dirty file
            const nextGcode = this.enqueueDialog.dirtyFilesQueue[this.enqueueDialog.currentDirtyIndex]
            this.enqueueDialog.gcode = nextGcode

            // Calculate recommended runs for this file
            const stats = this.getRunStatistics(nextGcode)
            const queueStatus = this.getQueueStatus(nextGcode)
            const totalQueued = queueStatus?.total_queued || 0
            const totalGoodRuns = stats.passedQC + stats.inProgress + stats.completedNoQC + totalQueued
            const stillNeeded = Math.max(1, nextGcode.required_runs - totalGoodRuns)

            this.enqueueDialog.form.runs_to_enqueue = stillNeeded

            // Dialog stays open for next file
        }

        async handleDirtyFilesSequentially(dirtyFiles: FleetJobGcode[]) {
            if (dirtyFiles.length === 0) return

            this.$toast.info(`Found ${dirtyFiles.length} files with existing runs/queue. Processing individually...`)

            // Set up sequential processing
            this.enqueueDialog.isDirtySequence = true
            this.enqueueDialog.dirtyFilesQueue = [...dirtyFiles]
            this.enqueueDialog.currentDirtyIndex = 0

            // Start with first dirty file
            const firstGcode = dirtyFiles[0]
            this.openEnqueueDialog(firstGcode, false)
            this.enqueueDialog.isDirtySequence = true // Set after opening dialog
        }

        async performEnqueueCleanFiles(cleanFiles: FleetJobGcode[]) {
            if (cleanFiles.length === 0) return

            this.$toast.info(`Auto-enqueueing ${cleanFiles.length} clean files...`)
            this.loadingEnqueueAll = true

            try {
                let totalEnqueued = 0
                const results = []

                for (const gcode of cleanFiles) {
                    try {
                        // Check printer compatibility
                        const compatibility = await this.$store.dispatch(
                            'fleet/jobs/checkPrinterCompatibility',
                            { gcode, rootState: this.$store.state }
                        )

                        if (!compatibility.has_compatible) {
                            results.push({
                                filename: gcode.gcode_filename,
                                success: false,
                                error: 'No compatible printers'
                            })
                            continue
                        }

                        // Get hostnames of compatible printers
                        const printerHostnames = compatibility.compatible_printers.map((printer: any) => printer.hostname)

                        // Prepend fleet_gcodes/ directory path
                        const fullGcodePath = gcode.gcode_filename.startsWith('fleet_gcodes/')
                            ? gcode.gcode_filename
                            : `fleet_gcodes/${gcode.gcode_filename}`;

                        // Enqueue with required runs
                        const response = await this.$store.dispatch('fleet/jobs/enqueueGcodeToprinters', {
                            gcodeId: gcode.id,
                            request: {
                                gcode_filename: fullGcodePath,
                                printer_hostnames: printerHostnames,
                                runs_per_printer: gcode.required_runs
                            }
                        })

                        if (response.success) {
                            totalEnqueued += (response.enqueued_count || 0)
                            results.push({
                                filename: gcode.gcode_filename,
                                success: true,
                                count: response.enqueued_count
                            })

                            // Update local queue status cache
                            if (response.queue_status) {
                                this.$set(this.queueStatusCache, gcode.id, response.queue_status)
                            }
                        } else {
                            results.push({
                                filename: gcode.gcode_filename,
                                success: false,
                                error: response.error || 'Unknown error'
                            })
                        }

                    } catch (error) {
                        console.error(`❌ Error enqueueing clean file ${gcode.gcode_filename}:`, error)
                        results.push({
                            filename: gcode.gcode_filename,
                            success: false,
                            error: error.message || 'Unknown error'
                        })
                    }
                }

                // Show results
                const successful = results.filter(r => r.success)
                const failed = results.filter(r => !r.success)

                if (successful.length > 0) {
                    this.$toast.success(
                        `✅ Auto-enqueued ${totalEnqueued} runs for ${successful.length} clean files`
                    )
                }

                if (failed.length > 0) {
                    this.$toast.error(
                        `❌ Failed to enqueue ${failed.length} clean files: ${failed.map(f => f.filename).join(', ')}`
                    )
                }

            } catch (error) {
                console.error('❌ Error in performEnqueueCleanFiles:', error)
                this.$toast.error('Failed to enqueue clean files')
            } finally {
                this.loadingEnqueueAll = false
            }
        }

        async performEnqueue(gcode: FleetJobGcode, runsToEnqueue: number) {
            // Set loading state
            this.$set(this.loadingEnqueueGcode, gcode.id, true)

            try {
                // Check printer compatibility
                const compatibility = await this.$store.dispatch(
                    'fleet/jobs/checkPrinterCompatibility',
                    { gcode, rootState: this.$store.state }
                )

                if (!compatibility.has_compatible) {
                    this.$toast.warning(`No compatible printers available for ${gcode.gcode_filename}. Required: ${gcode.preferred_printer} printer with ${gcode.filament_type} filament.`)
                    return
                }

                // Get hostnames of compatible printers
                const printerHostnames = compatibility.compatible_printers.map((printer: any) => printer.hostname)

                console.log(`🚀 Enqueueing ${runsToEnqueue} runs of ${gcode.gcode_filename} to ${printerHostnames.length} compatible printers`)

                // ✅ FIX: Prepend fleet_gcodes/ directory path
                const fullGcodePath = gcode.gcode_filename.startsWith('fleet_gcodes/')
                    ? gcode.gcode_filename
                    : `fleet_gcodes/${gcode.gcode_filename}`;

                // Enqueue to compatible printers
                const response = await this.$store.dispatch('fleet/jobs/enqueueGcodeToprinters', {
                    gcodeId: gcode.id,
                    request: {
                        gcode_filename: fullGcodePath,  // ✅ Use full path instead of just filename
                        printer_hostnames: printerHostnames,
                        runs_per_printer: runsToEnqueue
                    }
                })

                if (response.success) {
                    this.$toast.success(`✅ Enqueued ${response.enqueued_count} runs for ${gcode.gcode_filename}`)

                    // Update local queue status cache
                    if (response.queue_status) {
                        this.$set(this.queueStatusCache, gcode.id, response.queue_status)
                    }
                } else {
                    this.$toast.error(`❌ Failed to enqueue ${gcode.gcode_filename}: ${response.error || 'Unknown error'}`)
                }

            } catch (error) {
                console.error('❌ Enqueue error:', error)
                this.$toast.error(`❌ Failed to enqueue ${gcode.gcode_filename}`)
            } finally {
                this.$set(this.loadingEnqueueGcode, gcode.id, false)
            }
        }

        async performEnqueueAll(runsPerFile: number = 1) {
            this.loadingEnqueueAll = true

            try {
                const incompatibleFiles = []
                const compatibleFiles = []

                // Check compatibility for each gcode file independently
                for (const gcode of this.gcodeFiles) {
                    const compatibility = await this.$store.dispatch(
                        'fleet/jobs/checkPrinterCompatibility',
                        { gcode, rootState: this.$store.state }
                    ) as {
                        has_compatible: boolean;
                        compatible_printers: Array<{ hostname: string }>;
                    };

                    if (!compatibility.has_compatible) {
                        incompatibleFiles.push(gcode.gcode_filename)
                    } else {
                        compatibleFiles.push({
                            gcode,
                            printers: compatibility.compatible_printers
                        })
                    }
                }

                // Show warning for incompatible files but continue with compatible ones
                if (incompatibleFiles.length > 0) {
                    this.$toast.warning(
                        `⚠️ ${incompatibleFiles.length} file(s) have no compatible printers: ${incompatibleFiles.join(', ')}`
                    )
                }

                // If no files can be processed, exit
                if (compatibleFiles.length === 0) {
                    this.$toast.error('❌ No gcode files have compatible printers')
                    return
                }

                console.log(`🚀 Enqueueing ${runsPerFile} runs each for ${compatibleFiles.length} gcode files (${incompatibleFiles.length} skipped)`)

                // Process each compatible file individually
                let totalEnqueuedRuns = 0
                const processedFiles = []
                const failedFiles = []

                for (const { gcode, printers } of compatibleFiles) {
                    try {
                        const printerHostnames = printers.map(printer => printer.hostname)

                        // ✅ FIX: Prepend fleet_gcodes/ directory path
                        const fullGcodePath = gcode.gcode_filename.startsWith('fleet_gcodes/')
                            ? gcode.gcode_filename
                            : `fleet_gcodes/${gcode.gcode_filename}`;

                        const response = await this.$store.dispatch('fleet/jobs/enqueueGcodeToprinters', {
                            gcodeId: gcode.id,
                            request: {
                                gcode_filename: fullGcodePath,  // ✅ Use full path instead of just filename
                                printer_hostnames: printerHostnames,
                                runs_per_printer: runsPerFile
                            }
                        })

                        if (response.success) {
                            totalEnqueuedRuns += (response.enqueued_count || 0)
                            processedFiles.push(gcode.gcode_filename)

                            // Update local queue status cache
                            if (response.queue_status) {
                                this.$set(this.queueStatusCache, gcode.id, response.queue_status)
                            }
                        } else {
                            failedFiles.push({
                                filename: gcode.gcode_filename,
                                error: response.error || 'Unknown error'
                            })
                        }
                    } catch (error) {
                        console.error(`❌ Error enqueueing ${gcode.gcode_filename}:`, error)
                        failedFiles.push({
                            filename: gcode.gcode_filename,
                            error: error.message || 'Unknown error'
                        })
                    }
                }

                // Show comprehensive results
                if (processedFiles.length > 0) {
                    this.$toast.success(
                        `✅ Successfully enqueued ${totalEnqueuedRuns} runs for ${processedFiles.length} files: ${processedFiles.join(', ')}`
                    )
                }

                if (failedFiles.length > 0) {
                    const failedNames = failedFiles.map(f => f.filename).join(', ')
                    this.$toast.error(
                        `❌ Failed to enqueue ${failedFiles.length} files: ${failedNames}`
                    )
                    // Optionally log detailed errors
                    failedFiles.forEach(f => {
                        console.error(`Failed to enqueue ${f.filename}: ${f.error}`)
                    })
                }

            } catch (error) {
                console.error('❌ Enqueue all error:', error)
                this.$toast.error(`❌ Failed to enqueue gcodes: ${error.message || 'Unknown error'}`)
            } finally {
                this.loadingEnqueueAll = false
            }
        }

        // NEW: Queue-related methods
        getPrinterModel(hostname: string): 'HS-3' | 'HS-Pro' | null {
            const remotePrinters = this.$store.state.gui?.remoteprinters?.printers || {}
            for (const printer of Object.values(remotePrinters)) {
                if ((printer as any).hostname === hostname) {
                    return (printer as any).printerModel ?? null
                }
            }
            return null
        }

        getQueueStatus(gcode: FleetJobGcode): FleetGcodeQueueStatus | null {
            return this.queueStatusCache[gcode.id] || null
        }

        formatQueueTime(timestamp: string): string {
            try {
                return new Date(timestamp).toLocaleTimeString()
            } catch {
                return timestamp
            }
        }

        async enqueueGcode(gcode: FleetJobGcode) {
            // Prevent spam clicking - check if already loading
            if (this.loadingEnqueueGcode[gcode.id]) {
                return;
            }

            // Check if already completed
            const runs = this.allJobRuns[gcode.id] || [];
            const passedCount = runs.filter(r => r.qc === 'pass').length;
            if (passedCount >= gcode.required_runs) {
                this.$toast.warning(
                    `⚠️ Cannot enqueue ${gcode.gcode_filename}: already completed (${passedCount}/${gcode.required_runs} runs passed)`
                );
                return;
            }

            // Check if there are existing runs or queue (ONLY prompt if dirty)
            const stats = this.getRunStatistics(gcode)
            const queueStatus = this.getQueueStatus(gcode)
            const totalQueued = queueStatus?.total_queued || 0

            if (stats.totalRuns > 0 || totalQueued > 0) {
                // File is "dirty" - show dialog to ask how many runs to enqueue
                this.openEnqueueDialog(gcode, false)
            } else {
                // File is "clean" - immediately set loading state and proceed
                this.$set(this.loadingEnqueueGcode, gcode.id, true)
                await this.performEnqueue(gcode, gcode.required_runs)
            }
        }

        async enqueueAllGcodes() {
            if (!this.job || this.gcodeFiles.length === 0) return

            // Prevent spam clicking - check if already loading
            if (this.loadingEnqueueAll) {
                return;
            }

            // Immediately set loading state
            this.loadingEnqueueAll = true

            try {
                // Check for completed files
                const completed = this.gcodeFiles.filter(gcode => {
                    const runs = this.allJobRuns[gcode.id] || [];
                    const passed = runs.filter(r => r.qc === 'pass').length;
                    return passed >= gcode.required_runs;
                });

                if (completed.length > 0) {
                    const names = completed.map(g => g.gcode_filename).join(', ');
                    this.$toast.warning(
                        `⚠️ Skipping completed files: ${names}`
                    );
                }

                // Get non-completed files
                const activeFiles = this.gcodeFiles.filter(gcode => {
                    const runs = this.allJobRuns[gcode.id] || [];
                    const passed = runs.filter(r => r.qc === 'pass').length;
                    return passed < gcode.required_runs;
                });

                if (activeFiles.length === 0) {
                    this.$toast.info('All files are already completed');
                    return;
                }

                // Separate clean vs dirty files
                const cleanFiles = []
                const dirtyFiles = []

                activeFiles.forEach(gcode => {
                    const stats = this.getRunStatistics(gcode)
                    const queueStatus = this.getQueueStatus(gcode)
                    const totalQueued = queueStatus?.total_queued || 0

                    if (stats.totalRuns === 0 && totalQueued === 0) {
                        cleanFiles.push(gcode)
                    } else {
                        dirtyFiles.push(gcode)
                    }
                })

                console.log(`📊 Enqueue All Analysis: ${cleanFiles.length} clean, ${dirtyFiles.length} dirty files`)

                // Auto-enqueue clean files
                if (cleanFiles.length > 0) {
                    await this.performEnqueueCleanFiles(cleanFiles)
                }

                // Handle dirty files individually
                if (dirtyFiles.length > 0) {
                    // Reset loading state since we're opening dialogs
                    this.loadingEnqueueAll = false
                    await this.handleDirtyFilesSequentially(dirtyFiles)
                }

            } catch (error) {
                console.error('Error in enqueueAllGcodes:', error)
                this.$toast.error('Failed to enqueue files')
            } finally {
                // Only reset if not handling dirty files
                if (!this.enqueueDialog.isDirtySequence) {
                    this.loadingEnqueueAll = false
                }
            }
        }

        // Existing methods (unchanged)
        getStatusColor(status: string) {
            const colors = {
                pending: 'orange',
                in_progress: 'blue',
                complete: 'green',
                cancelled: 'red',
            }
            return colors[status] || 'grey'
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
                    return this.mdiCheck
                case 'cancelled':
                    return this.mdiCancel
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

        getRunStatistics(gcode: FleetJobGcode) {
            const cacheKey = `${gcode.id}-${gcode.required_runs}`

            // Use better cache key that includes runs data hash
            const runs = this.allJobRuns[gcode.id] || []
            const runsHash = runs.length ? runs.map(r => `${r.id}-${r.status}-${r.qc}`).join(',') : 'empty'
            const fullCacheKey = `${cacheKey}-${runsHash}`

            if (this.runStatisticsCache[fullCacheKey] && !this.loadingRuns) {
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

            // Calculate all stats in one pass
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

        hasEnoughQCPassedRuns(gcode: FleetJobGcode): boolean {
            const stats = this.getRunStatistics(gcode)
            return stats.passedQC >= stats.requiredRuns
        }

        getGcodeFileNameColor(gcode: FleetJobGcode): string {
            return this.hasEnoughQCPassedRuns(gcode) ? 'green--text' : 'blue--text'
        }

        getGcodeFileStatusColor(gcode: FleetJobGcode): string {
            return this.hasEnoughQCPassedRuns(gcode) ? 'green' : 'blue'
        }

        getGcodeFileStatusTextColor(gcode: FleetJobGcode): string {
            return 'white'
        }

        getGcodeFileStatusIcon(gcode: FleetJobGcode): string {
            return this.hasEnoughQCPassedRuns(gcode) ? this.mdiCheckCircle : this.mdiProgressClock
        }

        getGcodeFileStatusTooltip(gcode: FleetJobGcode): string {
            const stats = this.getRunStatistics(gcode)

            if (this.hasEnoughQCPassedRuns(gcode)) {
                return `✅ QC Complete: ${stats.passedQC}/${stats.requiredRuns} runs passed`
            } else {
                const remaining = stats.requiredRuns - stats.passedQC
                return `🔄 QC Pending: ${stats.passedQC}/${stats.requiredRuns} passed, ${remaining} more needed`
            }
        }

        hasActiveRuns(gcode: FleetJobGcode): boolean {
            const runs = this.allJobRuns[gcode.id] || []
            return runs.some(run =>
                // In progress runs
                run.status === 'in_progress' ||
                // Successful runs without QC (need attention)
                (run.status === 'success' && (!run.qc || run.qc === null))
            )
        }

        getActiveRuns(gcode: FleetJobGcode): FleetJobGcodeRun[] {
            const runs = this.allJobRuns[gcode.id] || []
            return runs.filter(run =>
                // In progress runs
                run.status === 'in_progress' ||
                // Successful runs without QC (need attention)
                (run.status === 'success' && (!run.qc || run.qc === null))
            ).sort((a, b) => {
                // Sort by status priority (in_progress first), then by start time (most recent first)
                if (a.status !== b.status) {
                    return a.status === 'in_progress' ? -1 : 1
                }
                return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            })
        }

        // Run status display methods (similar to PrintRunsDialog)
        getRunStatusColor(status: string): string {
            const colors = {
                in_progress: 'blue',
                success: 'green',
                fail: 'red',
                cancelled: 'grey',
            } as const
            return colors[status as keyof typeof colors] || 'grey'
        }

        getRunStatusTextColor(status: string): string {
            return 'white'
        }

        getRunStatusIcon(status: string): string {
            switch (status) {
                case 'in_progress':
                    return 'mdi-progress-clock'
                case 'success':
                    return 'mdi-check'
                case 'fail':
                    return 'mdi-alert-circle'
                case 'cancelled':
                    return 'mdi-cancel'
                default:
                    return 'mdi-help-circle'
            }
        }

        // QC display methods
        getRunQCColor(qc: string | null): string {
            switch (qc) {
                case 'pass':
                    return 'green'
                case 'fail':
                    return 'red'
                default:
                    return 'grey'
            }
        }

        getRunQCTextColor(qc: string | null): string {
            return 'white'
        }

        getRunQCDisplay(qc: string | null): string {
            switch (qc) {
                case 'pass':
                    return 'Pass'
                case 'fail':
                    return 'Fail'
                default:
                    return 'Pending QC'
            }
        }

        getRunQCIcon(qc: string | null): string {
            switch (qc) {
                case 'pass':
                    return this.mdiCheckboxMarkedCircleOutline
                case 'fail':
                    return this.mdiCloseCircleOutline
                default:
                    return this.mdiHelpCircleOutline
            }
        }

        // Printer progress methods (accessing fleet daemon data)
        get fleetDaemonPrinters() {
            return this.$store.state.farm.fleetDaemonPrinters || {}
        }

        getPrinterProgress(hostname: string): number {
            const printer = this.fleetDaemonPrinters[hostname]
            if (!printer?.display_status?.progress) {
                return 0
            }

            // Convert from 0-1 decimal to 0-100 percentage
            return printer.display_status.progress * 100
        }

        getPrinterProgressMessage(hostname: string): string {
            const printer = this.fleetDaemonPrinters[hostname]
            if (!printer) {
                return 'Unknown'
            }

            // Try display_status message first, then print_stats state
            const displayMessage = printer.display_status?.message
            if (displayMessage && displayMessage.trim() !== '') {
                return displayMessage
            }

            const printState = printer.print_stats?.state
            if (printState) {
                // Capitalize first letter and replace underscores
                return printState.charAt(0).toUpperCase() + printState.slice(1).replace('_', ' ')
            }

            return 'In Progress'
        }

        getPrinterStatusColor(hostname: string): string {
            const printer = this.getPrinterByHostname(hostname)
            if (!printer) return 'grey'

            const fleetDisconnected = printer.fleet_to_printer_ws === false

            if (fleetDisconnected || !printer.socket?.isConnected) {
                return 'grey'
            }

            if (printer.webhooks?.state === 'shutdown') {
                return 'red'
            }

            const state = printer.print_stats?.state
            if (state === 'printing') {
                return 'blue'
            } else if (state === 'error' || state === 'paused' || state === 'cancelled') {
                return 'red'
            } else if (state === 'complete') {
                return 'blue'
            } else if (state === 'standby') {
                return 'green'
            }

            return 'grey'
        }

        getPrinterStatusTextColor(hostname: string): string {
            return 'white'
        }

        getPrinterStatusText(hostname: string): string {
            const printer = this.getPrinterByHostname(hostname)
            if (!printer) return 'Unknown'

            const fleetDisconnected = printer.fleet_to_printer_ws === false
            if (fleetDisconnected) return 'Offline'
            if (!printer.socket?.isConnected) return 'Offline'
            if (printer.webhooks?.state === 'shutdown') return 'Shutdown'

            const state = printer.print_stats?.state
            if (state === 'printing') return 'Printing'
            if (state === 'standby') return 'Ready'
            if (state === 'complete') return 'Complete'
            if (state === 'error') return 'Error'
            if (state === 'paused') return 'Paused'
            if (state === 'cancelled') return 'Cancelled'

            return state || 'Unknown'
        }

        getPrinterStatusTooltip(hostname: string): string {
            const printer = this.getPrinterByHostname(hostname)
            if (!printer) return 'Printer not found'

            const fleetDisconnected = printer.fleet_to_printer_ws === false
            if (fleetDisconnected) return 'Fleet connection disconnected'
            if (!printer.socket?.isConnected) return 'Printer disconnected'
            if (printer.webhooks?.state === 'shutdown') return 'Printer in shutdown state'

            const state = printer.print_stats?.state || 'unknown'
            return `Printer status: ${state.charAt(0).toUpperCase() + state.slice(1)}`
        }

        // Helper method
        getEligibleRunsForBatchQC(gcode: FleetJobGcode): FleetJobGcodeRun[] {
            const runs = this.allJobRuns[gcode.id] || []
            return runs.filter(run =>
                run.status === 'success' &&
                (!run.qc || run.qc === null)
            )
        }

        // Batch QC method - NO CONFIRMATION
        async batchUpdateQC(gcode: FleetJobGcode, qcStatus: 'pass' | 'fail') {
            const eligibleRuns = this.getEligibleRunsForBatchQC(gcode)

            if (eligibleRuns.length === 0) {
                this.$toast.warning('No eligible runs found for batch QC update')
                return
            }

            this.$set(this.loadingBatchQC, gcode.id, true)

            try {
                const response = await this.$store.dispatch('fleet/jobs/batchUpdateJobGcodeRunsQC', {
                    gcodeId: gcode.id,
                    qcStatus: qcStatus
                })

                if (response.updated_count > 0) {
                    this.$toast.success(`✅ Updated ${response.updated_count} runs to QC ${qcStatus.toUpperCase()}`)
                    setTimeout(() => this.refreshJobDetails(), 500)
                } else {
                    this.$toast.info(`ℹ️ No runs were updated`)
                }

            } catch (error) {
                console.error('Failed to batch update QC:', error)
                this.$toast.error(`❌ Failed to batch update QC: ${error.message || 'Unknown error'}`)
            } finally {
                this.$set(this.loadingBatchQC, gcode.id, false)
            }
        }

        getRunSegments(gcode: FleetJobGcode) {
            const runs = this.allJobRuns[gcode.id] || []
            const segments = []

            // Filter out failed runs - they don't appear in the progress bar
            const goodRuns = runs.filter(run => {
                if (run.status === 'in_progress') return true
                if (run.status === 'success') return true
                return false // Exclude failed, cancelled, etc.
            })

            // Sort good runs by status priority for consistent display
            const sortedGoodRuns = [...goodRuns].sort((a, b) => {
                const statusPriority = {
                    'in_progress': 1,
                    'success': 2
                }

                const aPriority = statusPriority[a.status] || 3
                const bPriority = statusPriority[b.status] || 3

                if (aPriority !== bPriority) {
                    return aPriority - bPriority
                }

                // Within same status, sort by start time (newest first)
                return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
            })

            // Add segments for existing good runs
            sortedGoodRuns.forEach((run, index) => {
                let status = 'completed_no_qc'

                if (run.status === 'in_progress') {
                    status = 'in_progress'
                } else if (run.status === 'success') {
                    if (run.qc === 'pass') {
                        status = 'passed_qc'
                    } else {
                        status = 'completed_no_qc' // Default for success without QC or QC fail
                    }
                }

                segments.push({
                    index: index,
                    status: status,
                    run: run,
                    runId: run.id
                })
            })

            // Add empty segments for remaining required runs
            const remainingSlots = Math.max(0, gcode.required_runs - sortedGoodRuns.length)
            for (let i = 0; i < remainingSlots; i++) {
                segments.push({
                    index: sortedGoodRuns.length + i,
                    status: 'remaining',
                    run: null,
                    runId: null
                })
            }

            return segments
        }

        getSegmentStyle(gcode: FleetJobGcode, segment: any): string {
            const totalSegments = Math.max(gcode.required_runs, 1)
            const segmentWidth = 100 / totalSegments // No margins to fill full width

            let backgroundColor = '#bdbdbd' // Default gray for remaining

            switch (segment.status) {
                case 'in_progress':
                    backgroundColor = '#2196f3'
                    break
                case 'completed_no_qc':
                    backgroundColor = '#1976d2'
                    break
                case 'passed_qc':
                    backgroundColor = '#4caf50'
                    break
                case 'remaining':
                    backgroundColor = '#bdbdbd'
                    break
            }

            return `
                width: ${segmentWidth}%;
                height: 100%;
                background-color: ${backgroundColor};
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                border-radius: 2px;
            `
        }

        getSegmentClass(segment: any): string {
            const classes = ['segment-item']

            if (segment.status === 'in_progress') {
                classes.push('breathing-segment')
            }

            return classes.join(' ')
        }

        @Watch('allJobRuns', { deep: true })
        onAllJobRunsChanged() {
            // Clear cache when runs data changes
            setTimeout(() => {
                this.runStatisticsCache = {}
            }, 100)
        }

        @Watch('fleetDaemonPrinters', { deep: true })
        onFleetDaemonPrintersChanged(newPrinters: any, oldPrinters: any) {
            // Only monitor if dialog is open
            if (!this.dialogVisible || !newPrinters) return

            for (const hostname in newPrinters) {
                const printer = newPrinters[hostname]
                const currentProgress = printer?.display_status?.progress || 0
                const currentProgressPercent = currentProgress * 100

                // Get previous progress (default to 0 if not tracked)
                const previousProgress = this.printerProgressCache[hostname] || 0

                // Check if printer just completed (progress reached 100% from <100%)
                if (currentProgressPercent >= 100 && previousProgress < 100 && previousProgress > 0) {
                    console.log(`🎉 Printer ${hostname} completed printing (${previousProgress}% → ${currentProgressPercent}%)`)
                    this.handlePrinterCompletion(hostname)
                }

                // Update cache with current progress
                this.printerProgressCache[hostname] = currentProgressPercent
            }
        }

        // Handle printer completion - trigger full refresh
        async handlePrinterCompletion(hostname: string) {
            console.log(`🔄 Triggering full refresh due to ${hostname} completion`)

            try {
                // Refresh job details dialog
                await this.refreshJobDetails()

                // Also trigger parent refresh (job list panel)
                this.$emit('printer-completed', hostname)

                this.$toast.success(`🎉 ${hostname} completed printing - data refreshed`, {
                    timeout: 3000
                })
            } catch (error) {
                console.error('Failed to refresh after printer completion:', error)
            }
        }
    }
</script>

<style scoped>
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

    /* Clickable filename styling */
    .clickable-filename:hover {
        text-decoration: underline !important;
        opacity: 0.8;
    }

    /* Clickable printer styling */
    .clickable-printer {
        cursor: pointer;
        color: #1976d2;
        transition: all 0.2s ease;
    }

        .clickable-printer:hover {
            text-decoration: underline;
            color: #1565c0;
            transform: translateX(2px);
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

    /* Queue status styling */
    .queue-status-display {
        font-family: 'Roboto Mono', monospace;
        border-left: 3px solid #ff9800;
        padding-left: 8px;
        background-color: rgba(255, 152, 0, 0.1);
        border-radius: 0 4px 4px 0;
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

    .queue-runs-display {
        transition: all 0.3s ease;
    }

        .queue-runs-display:hover {
            box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2);
        }

    /* Queue status section */
    .queue-status-section {
        border-bottom: 1px solid rgba(255, 152, 0, 0.2);
    }

    .queue-details {
        background-color: rgba(255, 152, 0, 0.02);
        border-radius: 4px;
        padding: 8px;
    }

    /* Active runs section */
    .active-runs-section {
        margin-top: 12px;
    }

    .run-item {
        transition: all 0.2s ease;
        position: relative;
    }

        .run-item:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(25, 118, 210, 0.15);
        }

    /* Progress bar styling for runs */
    .progress-section {
        margin-top: 8px;
    }

    .progress-mini-text {
        color: white;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
        font-size: 9px;
    }

    /* Mini progress bar striped animation */
    ::v-deep .queue-runs-display .v-progress-linear__striped {
        background-size: 20px 20px;
        animation: mini-progress-stripes 1s linear infinite;
    }

    @keyframes mini-progress-stripes {
        0% {
            background-position: 0 0;
        }

        100% {
            background-position: 20px 0;
        }
    }

    /* Responsive adjustments */
    @media (max-width: 1200px) {
        .queue-runs-display {
            font-size: 0.9em;
        }

        .run-item {
            padding: 8px !important;
        }
    }

    /* Dark theme adjustments */
    .theme--dark .queue-details {
        background-color: rgba(255, 152, 0, 0.08);
    }

    .gcode-discrete-progress-bar {
        display: flex;
        gap: 1px; /* Adjust to desired gap size */
    }
    .segment-content {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
    }

    /* Breathing animation for in-progress segments */
    .breathing-segment {
        background: linear-gradient(90deg, #1976d2 0%, #2196f3 25%, #64b5f6 50%, #2196f3 75%, #1976d2 100%);
        background-size: 200% 100%;
        animation: breathe 2s linear infinite;
    }

    .breathing-icon {
        animation: spin 2s linear infinite;
    }

    @keyframes breathe {
        0% {
            background-position: 200% 0;
        }

        100% {
            background-position: -200% 0;
        }
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    /* Dark theme support */
    .theme--dark .gcode-discrete-progress-bar {
        background-color: #424242;
        border-color: #616161;
    }

    .theme--dark .empty-dot {
        background-color: rgba(255, 255, 255, 0.3);
    }

    /* Responsive adjustments */
    @media (max-width: 1200px) {
        .gcode-discrete-progress-bar {
            height: 20px;
            border-radius: 10px;
        }
    }
</style>
