<template>
    <div v-if="isFleetCloud && sites.length" class="site-tabs d-flex align-center ml-2">
        <v-btn
            v-for="s in sites"
            :key="s.site"
            small
            tile
            :color="s.site === cloudActiveSite ? 'primary' : undefined"
            :text="s.site !== cloudActiveSite"
            :title="s.online ? s.site + ' — online' : s.site + ' — offline'"
            class="text-none px-3 site-tab-btn"
            @click="switchSite(s.site)">
            <v-badge :color="s.online ? 'success' : 'error'" dot inline left>
                <span class="site-tab-label">{{ s.site }}</span>
            </v-badge>
        </v-btn>
    </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import { CloudSite } from '@/store/cloud/types'

/** Site switcher for the cloud deployment. Each tab shows that site's own
 *  maps + panels; the farm store only ever holds the active site. */
@Component
export default class TheCloudSiteTabs extends Mixins(BaseMixin) {
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
.site-tab-btn {
    height: 100% !important;
}
.site-tab-label {
    font-weight: 700;
    letter-spacing: 0.04em;
}
</style>
