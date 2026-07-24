import { Module } from 'vuex'
import { RootState } from '@/store/types'
import Vue from 'vue'
import { CloudSite, CloudState } from '@/store/cloud/types'

const ACTIVE_SITE_KEY = 'cloud.activeSite'

export const getDefaultState = (): CloudState => {
    let activeSite = ''
    try {
        activeSite = localStorage.getItem(ACTIVE_SITE_KEY) ?? ''
    } catch (e) {
        // localStorage unavailable; a default is picked once /api/sites loads
    }
    return {
        sites: [],
        activeSite,
    }
}

// Cloud-mode only (VUE_APP_FLEET_CLOUD): site list from /api/sites + the
// active site tab. The farm store holds ONE site at a time; switching tabs
// clears it (cross-site hostname collisions must never merge).
export const cloud: Module<CloudState, RootState> = {
    namespaced: true,
    state: getDefaultState(),
    getters: {
        getSites: (state) => state.sites,
        getActiveSite: (state) => state.activeSite,
        getActiveSiteOnline: (state) => {
            return state.sites.find((s) => s.site === state.activeSite)?.online ?? false
        },
        getActiveSitePrinterDomain: (state) => {
            return state.sites.find((s) => s.site === state.activeSite)?.printer_domain ?? null
        },
    },
    mutations: {
        setSites(state, sites: CloudSite[]) {
            Vue.set(state, 'sites', sites)
        },
        setActiveSite(state, site: string) {
            Vue.set(state, 'activeSite', site)
            try {
                localStorage.setItem(ACTIVE_SITE_KEY, site)
            } catch (e) {
                // non-fatal; the tab just won't persist across reloads
            }
        },
    },
}
