<template>
    <div v-if="isFleetCloud && sites.length" class="site-tabs d-flex align-center ml-2">
        <v-btn
            v-for="s in sites"
            :key="s.site"
            text
            tile
            class="text-none px-4 site-tab-btn"
            :class="{ 'site-tab-active': s.site === cloudActiveSite }"
            :title="siteLabel(s.site) + (s.online ? ' — online' : ' — offline')"
            @click="switchSite(s.site)">
            <v-badge :color="s.online ? 'success' : 'error'" dot inline left>
                <span class="site-tab-label">{{ siteLabel(s.site) }}</span>
            </v-badge>
        </v-btn>
    </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { CloudSite, siteLabel } from '@/store/cloud/types'

/** Site switcher for the cloud deployment. Each tab shows that site's own
 *  maps + panels; the farm store only ever holds the active site. */
@Component
export default class TheCloudSiteTabs extends Mixins(BaseMixin) {
    siteLabel = siteLabel

    get sites(): CloudSite[] {
        return this.$store.state.cloud?.sites ?? []
    }

    switchSite(site: string) {
        if (site === this.cloudActiveSite) return
        this.$store.commit('cloud/setActiveSite', site)
    }
}
</script>

<style scoped>
.site-tabs {
    align-self: stretch;
}
.site-tab-btn {
    height: 100% !important;
    opacity: 0.6;
    border-bottom: 2px solid transparent !important;
    border-radius: 0 !important;
}
.site-tab-btn::before {
    background-color: transparent;
}
/* active tab: underline + full-strength label, no filled box */
.site-tab-active {
    opacity: 1;
    border-bottom: 2px solid var(--v-primary-base) !important;
    color: var(--v-primary-base);
}
.site-tab-label {
    font-weight: 700;
    letter-spacing: 0.04em;
}
</style>
