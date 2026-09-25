<template>
    <div>
        <!-- Title + TOTAL fleet status -->
        <div class="fleet-header mb-4">
            <div class="fleet-title-row">
                <h2 class="fleet-title">Fleet Map</h2>
                <span class="fleet-total">{{ totalPrinterCount }} total</span>
                <div class="status-counters">
                    <span
                        class="status-counter status-counter--total"
                        :title="`${totalWorkerCount} of ${totalPrinterCount} printers are enabled as fleet workers`">
                        <v-icon x-small color="orange">{{ mdiHammer }}</v-icon>
                        Workers {{ totalWorkerCount }}
                    </span>
                    <!-- Same "N need attention" chip as the on-site Farm header / Jobs -> Workers card -->
                    <span
                        class="status-counter status-counter--attention"
                        :class="{ 'status-counter--attention-active': attentionHostnames.length > 0 }"
                        :title="attentionTitle">
                        <v-icon x-small :color="attentionHostnames.length ? 'white' : undefined">{{ mdiExclamationThick }}</v-icon>
                        {{ attentionHostnames.length }} need{{ attentionHostnames.length === 1 ? 's' : '' }} attention
                    </span>
                    <span v-for="s in totalStatusList" :key="'total-' + s.key" class="status-counter">
                        <span class="status-dot" :class="{ square: s.key === 'error' || s.key === 'printing' }"
                              :style="{ backgroundColor: s.color }"></span>
                        {{ s.label }} {{ s.count }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Print Farm map (worker count + stickers come from each printer's fleet_worker payload) -->
        <farm-map-section
            location="farm"
            name="Print Farm"
            show-workers
            :worker-hostnames="enabledHostnames"
            :attention-hostnames="attentionHostnames"
            :attention-reasons="attentionReasons"
            class="mb-8" />

        <!-- Ground Floor map (only for sites that have one) -->
        <farm-map-section
            v-if="showGround"
            location="ground"
            name="Ground Floor"
            show-workers
            :worker-hostnames="enabledHostnames"
            :attention-hostnames="attentionHostnames"
            :attention-reasons="attentionReasons" />
    </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { mdiExclamationThick, mdiHammer } from '@mdi/js'
import BaseMixin from '@/components/mixins/base'
import FarmMapSection from '@/components/panels/FarmMapSection.vue'
import {
    getPrinterStatus as getPrinterStatusUtil,
    PrinterStatus,
} from '@/components/panels/farmPrinterStatus'
import { geometryForSite, localSiteId } from '@/components/panels/farmMapGeometry'
import {
    enabledWorkerHostnames,
    attentionWorkerHostnames,
    attentionWorkerReasons,
    attentionChipTitle,
} from '@/components/panels/fleetWorkerAttention'

@Component({
    components: {
        FarmMapSection,
    },
})
export default class PageFarm extends Mixins(BaseMixin) {
    mdiHammer = mdiHammer
    mdiExclamationThick = mdiExclamationThick

    // Status color/label vocabulary (matches farmPrinterStatus + FarmPrinterGridPanel)
    readonly STATUS_META: Record<PrinterStatus, { color: string; label: string }> = {
        printing: { color: '#2196f3', label: 'Printing' },
        ready: { color: 'hsl(90, 100%, 32%)', label: 'Ready' },
        complete: { color: '#1976d2', label: 'Complete' },
        error: { color: '#d32f2f', label: 'Error' },
        disconnected: { color: '#8a8a8a', label: 'Offline' },
    }
    readonly STATUS_ORDER: PrinterStatus[] = ['printing', 'ready', 'complete', 'error', 'disconnected']

    get fleetDaemonPrinters() {
        return this.$store.state.farm.fleetDaemonPrinters || {}
    }

    get totalPrinterCount(): number {
        return Object.keys(this.fleetDaemonPrinters).length
    }

    // Worker state rides in each printer's payload (fleet_worker), so it is
    // already per-site in cloud mode and needs no extra endpoint.
    get enabledHostnames(): string[] {
        return enabledWorkerHostnames(this.fleetDaemonPrinters)
    }

    get attentionHostnames(): string[] {
        return attentionWorkerHostnames(this.fleetDaemonPrinters)
    }

    get attentionReasons(): Record<string, string> {
        return attentionWorkerReasons(this.fleetDaemonPrinters)
    }

    get attentionTitle(): string {
        return attentionChipTitle(this.attentionHostnames, this.attentionReasons)
    }

    /** Printers currently enabled as workers (same figure as the on-site Workers map header). */
    get totalWorkerCount(): number {
        return this.enabledHostnames.length
    }

    // Ground Floor section: sites without one (old building) hide it, unless a
    // printer is actually placed there (so nothing can ever disappear).
    get showGround(): boolean {
        const site = this.isFleetCloud ? this.cloudActiveSite : localSiteId()
        if (geometryForSite(site).hasGround) return true
        const remotePrinters = this.$store.state.gui?.remoteprinters?.printers || {}
        return Object.values(remotePrinters).some((p: any) => p.location === 'ground')
    }

    getPrinterStatus(printer: any): PrinterStatus {
        return getPrinterStatusUtil(printer, this.$store.state.farm.fleetDaemonConnected)
    }

    get totalStatusList() {
        const counts: Record<PrinterStatus, number> = { printing: 0, ready: 0, complete: 0, error: 0, disconnected: 0 }
        Object.values(this.fleetDaemonPrinters).forEach((printer: any) => {
            counts[this.getPrinterStatus(printer)]++
        })
        return this.STATUS_ORDER.map((k) => ({ key: k, label: this.STATUS_META[k].label, color: this.STATUS_META[k].color, count: counts[k] }))
    }
}
</script>

<style scoped>
/* Header + total status */
.fleet-title-row {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
}
.fleet-title {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
}
.fleet-total {
    font-size: 13px;
    opacity: 0.75;
    font-weight: 600;
    padding-left: 14px;
    border-left: 1px solid rgba(255, 255, 255, 0.15);
}

/* Status counters */
.status-counters {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    align-items: center;
}
.status-counter {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 500;
}
.status-counter--total {
    font-weight: 700;
    padding-right: 12px;
    border-right: 1px solid rgba(128, 128, 128, 0.4);
}
/* "N need attention" chip: red when any enabled worker is blocked (not primed / low filament) */
.status-counter--attention {
    padding: 1px 8px;
    border-radius: 11px;
    border: 1px solid rgba(128, 128, 128, 0.5);
    line-height: 18px;
}
.status-counter--attention-active {
    background: #d32f2f;
    border-color: #d32f2f;
    color: #fff;
    font-weight: 700;
}
.status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
}
.status-dot.square {
    border-radius: 2px;
}
</style>
