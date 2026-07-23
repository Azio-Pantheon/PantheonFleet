<template>
    <v-container fill-height fluid>
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4" lg="3">
                <v-card>
                    <v-card-title class="justify-center">
                        <pantheon-logo :color="logoColor" style="height: 40px" class="mb-2" />
                    </v-card-title>
                    <v-card-subtitle class="text-center">Pantheon Fleet — Cloud Dashboard</v-card-subtitle>
                    <v-card-text class="d-flex flex-column align-center pb-6">
                        <v-progress-circular v-if="loading" indeterminate color="primary" class="my-4" />
                        <!-- Google renders its button into this node -->
                        <div v-show="!loading" ref="googleButton" class="my-2" />
                        <v-alert v-if="errorMessage" type="error" dense text class="mt-4 mb-0" style="width: 100%">
                            {{ errorMessage }}
                        </v-alert>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import PantheonLogo from '@/components/ui/PantheonLogo.vue'
import axios from 'axios'

@Component({
    components: { PantheonLogo },
})
export default class PageCloudLogin extends Mixins(BaseMixin) {
    loading = true
    errorMessage = ''

    declare $refs: {
        googleButton: HTMLElement
    }

    get logoColor(): string {
        return this.$store.state.gui.uiSettings.logo
    }

    async mounted() {
        try {
            const { data } = await axios.get('/api/login')
            if (!data.clientId) {
                this.errorMessage = 'Sign-in is not configured (GOOGLE_CLIENT_ID missing on the server).'
                return
            }
            await this.loadGoogleScript()
            const google = (window as any).google
            google.accounts.id.initialize({
                client_id: data.clientId,
                callback: (response: { credential: string }) => this.onCredential(response.credential),
            })
            google.accounts.id.renderButton(this.$refs.googleButton, {
                theme: 'outline',
                size: 'large',
                width: 280,
            })
        } catch {
            this.errorMessage = 'Failed to load sign-in. Refresh to try again.'
        } finally {
            this.loading = false
        }
    }

    loadGoogleScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any).google?.accounts?.id) return resolve()
            const script = document.createElement('script')
            script.src = 'https://accounts.google.com/gsi/client'
            script.async = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('failed to load Google sign-in'))
            document.head.appendChild(script)
        })
    }

    async onCredential(credential: string) {
        this.errorMessage = ''
        try {
            await axios.post('/api/login', { credential })
            // full reload so the polling client restarts cleanly with the cookie set
            window.location.href = '/'
        } catch (e: any) {
            const status = e?.response?.status
            if (status === 403) {
                this.errorMessage =
                    e?.response?.data?.error ?? 'This Google account is not authorized for this dashboard.'
            } else {
                this.errorMessage = 'Sign-in failed — please try again.'
            }
        }
    }
}
</script>
