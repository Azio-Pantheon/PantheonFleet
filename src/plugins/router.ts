import VueRouter from 'vue-router'
import Vue from 'vue'
import routes from '@/routes'
import { isFleetCloud } from '@/plugins/cloudMode'

Vue.use(VueRouter)
const router = new VueRouter({ mode: 'history', routes })

// Cloud v1 exposes only the farm map, fleet history/parts/analytics, spools and
// login — every other page (console, machine, gcode files, …) needs a local
// Moonraker and is redirected home (FLEET_ONLINE_HANDOFF.md §2/§7).
if (isFleetCloud) {
    const allowed = ['/', '/allPrinters', '/fleet-history', '/spools', '/login']
    router.beforeEach((to, _from, next) => {
        if (allowed.includes(to.path)) next()
        else next('/')
    })
}

export default router
