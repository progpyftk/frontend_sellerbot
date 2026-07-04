<template>
  <q-layout view="hHh lpR fFf" class="krivus-layout">
    <!-- Header -->
    <q-header class="krivus-header">
      <q-toolbar>
        <q-btn flat round icon="arrow_back" @click="goToApp" class="krivus-back-btn" />
        <div class="krivus-logo q-ml-sm">
          <span class="krivus-logo-name">Krivus</span>
          <span class="krivus-logo-sub">CRM</span>
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
            :class="isActiveClient(client.slug) ? 'client-tab client-tab--active' : 'client-tab'"
            :style="isActiveClient(client.slug) ? `border-bottom-color: ${client.cor_hex}` : ''"
            @click="$router.push(`/krivus/${client.slug}`)"
          />
        </div>

        <q-space />

        <q-btn flat no-caps label="Templates" icon="description" class="krivus-action-btn" @click="$router.push('/krivus/templates')" size="sm" />
        <q-btn flat round icon="dashboard" class="krivus-action-btn q-ml-xs" @click="$router.push('/krivus')">
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

.krivus-back-btn {
  color: #475569 !important;
}
.krivus-back-btn:hover {
  background: #f0fdf9 !important;
  color: #0d9488 !important;
}

.krivus-logo-name {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.3px;
}
.krivus-logo-sub {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  margin-left: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.krivus-action-btn {
  color: #475569 !important;
}
.krivus-action-btn:hover {
  color: #0d9488 !important;
  background: #f0fdf9 !important;
}

.client-tab {
  color: #64748b;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
}

.client-tab:hover {
  background: #f8fafc;
  color: #0f172a;
}

.client-tab--active {
  color: #0f172a;
  font-weight: 600;
}
</style>
