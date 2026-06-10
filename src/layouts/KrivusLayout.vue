<template>
  <q-layout view="hHh lpR fFf" class="krivus-layout">
    <!-- Header -->
    <q-header class="krivus-header">
      <q-toolbar>
        <q-btn flat round icon="arrow_back" color="grey-7" @click="goToApp" />
        <div class="krivus-logo q-ml-sm">
          <span class="text-weight-bold" style="font-size: 18px; color: #1e293b;">Krivus</span>
          <span class="q-ml-xs" style="font-size: 12px; color: #64748b; font-weight: 500;">CRM</span>
        </div>

        <q-space />

        <!-- Client selector -->
        <div class="client-tabs row q-gutter-sm items-center" v-if="clients.length">
          <q-btn
            v-for="client in clients"
            :key="client.slug"
            flat
            no-caps
            :label="client.nome"
            :class="isActiveClient(client.slug) ? 'client-tab-active' : 'client-tab'"
            :style="isActiveClient(client.slug) ? `border-bottom: 2px solid ${client.cor_hex}` : ''"
            @click="$router.push(`/krivus/${client.slug}`)"
          />
        </div>

        <q-space />

        <q-btn flat no-caps label="Templates" icon="description" color="grey-7" @click="$router.push('/krivus/templates')" size="sm" />
        <q-btn flat round icon="dashboard" color="grey-7" @click="$router.push('/krivus')" class="q-ml-xs">
          <q-tooltip>Overview</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Page content -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import KrivusService from 'src/services/KrivusService'

const router = useRouter()
const route = useRoute()
const clients = ref([])

onMounted(async () => {
  try {
    const res = await KrivusService.getClients()
    clients.value = res.data
  } catch {
    // silently fail — layout still renders
  }
})

function goToApp() {
  router.push('/app/dashboard')
}

function isActiveClient(slug) {
  return route.params.slug === slug
}
</script>

<style scoped>
.krivus-layout {
  background: #f8fafc;
}

.krivus-header {
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.client-tab {
  color: #64748b;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
}

.client-tab-active {
  color: #1e293b;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
}
</style>
