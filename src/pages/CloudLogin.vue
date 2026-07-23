<template>
    <v-container fill-height fluid>
        <v-row align="center" justify="center">
            <v-col cols="12" sm="8" md="4" lg="3">
                <v-card>
                    <v-card-title class="justify-center">
                        <pantheon-logo :color="logoColor" style="height: 40px" class="mb-2" />
                    </v-card-title>
                    <v-card-subtitle class="text-center">Pantheon Fleet — Cloud Dashboard</v-card-subtitle>
                    <v-form @submit.prevent="login">
                        <v-card-text>
                            <v-text-field
                                v-model="password"
                                :error-messages="errorMessage"
                                type="password"
                                label="Password"
                                autofocus
                                outlined
                                hide-details="auto"
                                @input="errorMessage = ''" />
                        </v-card-text>
                        <v-card-actions class="px-4 pb-4">
                            <v-btn type="submit" color="primary" block :loading="loading" :disabled="!password">
                                Sign in
                            </v-btn>
                        </v-card-actions>
                    </v-form>
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
    password = ''
    loading = false
    errorMessage = ''

    get logoColor(): string {
        return this.$store.state.gui.uiSettings.logo
    }

    async login() {
        if (!this.password) return
        this.loading = true
        this.errorMessage = ''
        try {
            await axios.post('/api/login', { password: this.password })
            // full reload so the polling client restarts cleanly with the cookie set
            window.location.href = '/'
        } catch (e: any) {
            this.errorMessage = e?.response?.status === 401 ? 'Wrong password' : 'Login failed — try again'
        } finally {
            this.loading = false
        }
    }
}
</script>
