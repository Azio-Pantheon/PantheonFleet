<template>
    <div class="qr-lookup-wrap">
        <v-btn
            tile
            :icon="$vuetify.breakpoint.smAndDown"
            :text="$vuetify.breakpoint.mdAndUp"
            color="primary"
            class="button-min-width-auto px-3"
            title="Look up a part or spool by QR code"
            @click="openDialog">
            <v-icon :class="{ 'mr-md-2': $vuetify.breakpoint.mdAndUp }">{{ mdiMagnifyScan }}</v-icon>
            <span class="d-none d-md-inline">QR Lookup</span>
        </v-btn>

        <v-dialog v-model="dialog" max-width="480">
            <v-card>
                <v-card-title class="d-flex align-center">
                    QR Lookup
                    <v-spacer />
                    <v-btn icon small @click="dialog = false">
                        <v-icon small>{{ mdiClose }}</v-icon>
                    </v-btn>
                </v-card-title>
                <v-divider />
                <v-card-text class="pt-4">
                    <!-- Camera capture (phones open the camera; desktops a file picker) -->
                    <input
                        ref="cameraInput"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style="display: none"
                        @change="onCameraCapture" />
                    <v-btn block color="primary" :loading="processing" class="mb-3" @click="openCamera">
                        <v-icon left>{{ mdiCamera }}</v-icon>
                        Scan with Camera
                    </v-btn>
                    <v-text-field
                        v-model="manualCode"
                        label="Or type / scan a code"
                        dense
                        outlined
                        hide-details
                        :append-icon="mdiMagnify"
                        @click:append="submitManual"
                        @keydown.enter="submitManual" />

                    <v-alert v-if="message" :type="messageType" dense text class="mt-3 mb-0">
                        {{ message }}
                    </v-alert>

                    <!-- Part result -->
                    <template v-if="partResult">
                        <div class="text-subtitle-2 font-weight-bold mt-4 mb-1">Part</div>
                        <v-simple-table dense>
                            <tbody>
                                <tr><td class="font-weight-bold" width="120">QR Code</td><td>{{ partResult.qr_code }}</td></tr>
                                <tr v-if="isFleetCloud"><td class="font-weight-bold">Site</td><td><v-chip x-small outlined>{{ partResult.site ? siteLabel(partResult.site) : '—' }}</v-chip></td></tr>
                                <tr><td class="font-weight-bold">Printer</td><td>{{ partResult.printer_hostname }}</td></tr>
                                <tr><td class="font-weight-bold">Model</td><td>{{ partResult.printer_model || '—' }}</td></tr>
                                <tr><td class="font-weight-bold">Filename</td><td>{{ partResult.filename || '—' }}</td></tr>
                                <tr><td class="font-weight-bold">Status</td><td>{{ partResult.status || 'unknown' }}</td></tr>
                                <tr><td class="font-weight-bold">Start</td><td>{{ formatDate(partResult.start_time) }}</td></tr>
                                <tr><td class="font-weight-bold">QC</td><td>
                                    <v-chip
                                        v-if="partResult.qc_status"
                                        x-small
                                        :color="partResult.qc_status === 'pass' ? 'success' : partResult.qc_status === 'fail' ? 'error' : 'warning'"
                                        dark>
                                        {{ partResult.qc_status }}
                                    </v-chip>
                                    <span v-else>—</span>
                                </td></tr>
                                <tr v-if="partResult.qc_inspector"><td class="font-weight-bold">Inspector</td><td>{{ partResult.qc_inspector }}</td></tr>
                                <tr v-if="partResult.qc_date"><td class="font-weight-bold">QC Date</td><td>{{ formatDate(partResult.qc_date) }}</td></tr>
                                <tr v-if="partResult.qc_note"><td class="font-weight-bold">QC Note</td><td>{{ partResult.qc_note }}</td></tr>
                                <tr v-if="partResult.spool_qr_code"><td class="font-weight-bold">Spool QR</td><td>{{ partResult.spool_qr_code }}</td></tr>
                            </tbody>
                        </v-simple-table>
                    </template>

                    <!-- Spool result -->
                    <template v-else-if="spoolResult">
                        <div class="text-subtitle-2 font-weight-bold mt-4 mb-1">Spool</div>
                        <v-simple-table dense>
                            <tbody>
                                <tr><td class="font-weight-bold" width="120">QR Code</td><td>{{ spoolResult.qr_code }}</td></tr>
                                <tr><td class="font-weight-bold">Spool ID</td><td>#{{ spoolResult.id }}</td></tr>
                                <tr><td class="font-weight-bold">Vendor</td><td>{{ (spoolResult.filament && spoolResult.filament.vendor && spoolResult.filament.vendor.name) || '—' }}</td></tr>
                                <tr><td class="font-weight-bold">Filament</td><td>{{ (spoolResult.filament && spoolResult.filament.name) || '—' }}</td></tr>
                                <tr><td class="font-weight-bold">Material</td><td>{{ (spoolResult.filament && spoolResult.filament.material) || '—' }}</td></tr>
                                <tr v-if="spoolResult.filament && spoolResult.filament.color_hex"><td class="font-weight-bold">Color</td><td>
                                    <span
                                        :style="{
                                            width: '14px', height: '14px', borderRadius: '50%',
                                            backgroundColor: '#' + spoolResult.filament.color_hex,
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            display: 'inline-block', verticalAlign: 'middle', marginRight: '6px',
                                        }" />
                                    #{{ spoolResult.filament.color_hex }}
                                </td></tr>
                                <tr><td class="font-weight-bold">Remaining</td><td>{{ spoolResult.remaining_weight != null ? Math.round(spoolResult.remaining_weight) + ' g' : '—' }}</td></tr>
                                <tr><td class="font-weight-bold">Initial</td><td>{{ spoolResult.initial_weight != null ? Math.round(spoolResult.initial_weight) + ' g' : '—' }}</td></tr>
                                <tr><td class="font-weight-bold">Loaded On</td><td>
                                    <v-chip v-if="spoolResult.loaded_on_printer" x-small color="success" dark>{{ spoolResult.loaded_on_printer }}</v-chip>
                                    <span v-else>Not loaded</span>
                                </td></tr>
                                <tr><td class="font-weight-bold">Location</td><td>{{ spoolResult.location || '—' }}</td></tr>
                                <tr v-if="spoolResult.lot_nr"><td class="font-weight-bold">Lot #</td><td>{{ spoolResult.lot_nr }}</td></tr>
                            </tbody>
                        </v-simple-table>
                    </template>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts">
import Component from 'vue-class-component'
import { Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { mdiMagnifyScan, mdiMagnify, mdiCamera, mdiClose } from '@mdi/js'
import { siteLabel } from '@/store/cloud/types'
import axios from 'axios'

/**
 * Topbar QR lookup (read-only): scan a code with the phone camera — same
 * zxing-wasm photo decode the QC/Add-Part modes use — or type it, then look it
 * up as a part (fleet history) and fall back to a spool.
 */
@Component
export default class TheQrLookup extends Mixins(BaseMixin) {
    siteLabel = siteLabel
    mdiMagnifyScan = mdiMagnifyScan
    mdiMagnify = mdiMagnify
    mdiCamera = mdiCamera
    mdiClose = mdiClose

    dialog = false
    processing = false
    manualCode = ''
    message = ''
    messageType: 'success' | 'error' | 'info' | 'warning' = 'info'
    partResult: any = null
    spoolResult: any = null

    declare $refs: {
        cameraInput: HTMLInputElement
    }

    openDialog() {
        this.dialog = true
        this.manualCode = ''
        this.message = ''
        this.partResult = null
        this.spoolResult = null
    }

    openCamera() {
        const input = this.$refs.cameraInput
        if (input) {
            input.value = ''
            input.click()
        }
    }

    async onCameraCapture(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        this.processing = true
        this.message = ''
        try {
            const { readBarcodesFromImageFile } = await import('zxing-wasm')
            const blob = new Blob([await file.arrayBuffer()], { type: file.type })
            const results = await readBarcodesFromImageFile(blob, {
                formats: ['DataMatrix', 'QRCode'],
                tryHarder: true,
                tryRotate: true,
                tryInvert: true,
                tryDownscale: true,
                maxNumberOfSymbols: 1,
            })
            if (results.length && results[0].text) {
                await this.lookup(results[0].text)
            } else {
                this.message = 'No code found in photo. Ensure the code is clearly visible and well-lit.'
                this.messageType = 'warning'
            }
        } catch {
            this.message = 'Failed to process photo. Please try again.'
            this.messageType = 'error'
        } finally {
            this.processing = false
        }
    }

    async submitManual() {
        const code = this.manualCode.trim()
        if (!code) return
        this.manualCode = ''
        this.processing = true
        try {
            await this.lookup(code)
        } finally {
            this.processing = false
        }
    }

    async lookup(rawCode: string) {
        // Strip #1/#0 pass-fail scanner prefixes, like the QC flows do
        let code = rawCode.trim()
        if (code.match(/^#[01]/) && code.length > 2) code = code.slice(2)

        this.message = ''
        this.partResult = null
        this.spoolResult = null

        const baseUrl = this.$store.getters['gui/fleetDaemonUrl'] ?? 'http://pantheonfleet.local:8090'

        // 1) part QR — search across all sites; the local daemon ignores `site`
        try {
            const response = await axios.get(`${baseUrl}/history`, {
                params: { qr_code: code, limit: 1, site: 'all' },
            })
            const records = response.data.records ?? response.data
            if (records.length) {
                this.partResult = records[0]
                return
            }
        } catch {
            // fall through to spool lookup
        }

        // 2) spool QR
        try {
            this.spoolResult = await this.$store.dispatch('fleet/spools/lookupByQr', code)
            return
        } catch {
            // not a spool either
        }

        this.message = `No part or spool found for "${code}"`
        this.messageType = 'warning'
    }
}
</script>

<style scoped>
/* stretch so the button fills the topbar height like its siblings */
.qr-lookup-wrap {
    display: flex;
    align-self: stretch;
}
</style>
