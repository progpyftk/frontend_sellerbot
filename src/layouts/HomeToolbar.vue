<template>
  <q-header class="sb-header">
    <div class="header-inner">
      <q-toolbar class="q-pa-none">

        <!-- Logo Krivos -->
        <q-toolbar-title shrink class="q-mr-lg">
          <router-link to="/" class="brand-link">
            <div class="brand-logomark">K</div>
            <div class="brand-text">
              <span class="brand-name">Krivos</span>
              <span class="brand-sub">Consultoria</span>
            </div>
          </router-link>
        </q-toolbar-title>

        <!-- Nav links (desktop) -->
        <div class="gt-sm nav-links">
          <a href="#services" class="nav-link">Serviços</a>
          <a href="#sellerbot" class="nav-link nav-link--product">
            <q-icon name="smart_toy" size="14px" class="q-mr-xs" />SellerBot
          </a>
          <a href="#shopee" class="nav-link">Shopee</a>
          <a href="#about" class="nav-link">Sobre</a>
          <a href="#plans" class="nav-link">Planos</a>
        </div>

        <q-space />

        <!-- Deslogado (só desktop) -->
        <template v-if="!store.isAuthenticated">
          <q-btn flat no-caps label="Entrar" class="gt-sm nav-btn q-mr-xs" @click="goToLogin" />
          <q-btn unelevated color="primary" no-caps label="Criar conta" class="gt-sm cta-btn" @click="goToSignup" />
        </template>

        <!-- Logado (só desktop) -->
        <template v-else>
          <span class="gt-sm welcome-text q-mr-sm">{{ store.currentUser?.username }}</span>
          <q-btn unelevated color="primary" no-caps label="SellerBot" icon="smart_toy" class="gt-sm cta-btn q-mr-xs" @click="goToApp" />
          <q-btn flat no-caps icon="logout" class="gt-sm nav-btn" @click="handleLogout" :loading="loggingOut">
            <q-tooltip>Sair</q-tooltip>
          </q-btn>
        </template>

        <!-- Mobile menu btn -->
        <q-btn flat round icon="menu" class="lt-sm nav-btn" @click="mobileOpen = true" />
      </q-toolbar>
    </div>

    <!-- Mobile drawer -->
    <q-dialog v-model="mobileOpen" position="right">
      <q-card class="mobile-menu">
        <q-card-section class="q-pt-lg">
          <div class="mobile-brand q-mb-lg">Krivos Consultoria</div>
          <div class="mobile-links">
            <a href="#services" @click="mobileOpen = false">Serviços</a>
            <a href="#sellerbot" @click="mobileOpen = false">SellerBot</a>
            <a href="#shopee" @click="mobileOpen = false">Shopee</a>
            <a href="#about" @click="mobileOpen = false">Sobre</a>
            <a href="#plans" @click="mobileOpen = false">Planos</a>
          </div>
          <q-separator class="q-my-md" />
          <div class="mobile-auth">
            <template v-if="!store.isAuthenticated">
              <q-btn outline color="primary" no-caps label="Entrar" class="full-width q-mb-sm" @click="goToLogin(); mobileOpen = false" />
              <q-btn unelevated color="primary" no-caps label="Criar conta" class="full-width" @click="goToSignup(); mobileOpen = false" />
            </template>
            <template v-else>
              <q-btn unelevated color="primary" no-caps label="Acessar SellerBot" icon="smart_toy" class="full-width q-mb-sm" @click="goToApp(); mobileOpen = false" />
              <q-btn outline color="negative" no-caps label="Sair" class="full-width" @click="handleLogout" />
            </template>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '../stores/store'

const router = useRouter()
const store = useStore()
const loggingOut = ref(false)
const mobileOpen = ref(false)

const goToLogin  = () => router.push('/login')
const goToSignup = () => router.push('/signup')
const goToApp    = () => router.push('/app')

const handleLogout = async () => {
  loggingOut.value = true
  await store.logoutUser()
  loggingOut.value = false
}
</script>

<style lang="scss" scoped>
.sb-header {
  background: rgba(15, 23, 42, 0.97);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255,255,255,.07);
  box-shadow: none;
}

.header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
  .q-toolbar { min-height: 68px; }
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.brand-logomark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 900;
  color: #fff;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
}

.brand-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -.3px;
}

.brand-sub {
  font-size: .65rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .6px;
  margin-top: 1px;
}

.nav-links { display: flex; gap: 2px; }

.nav-link {
  font-size: .86rem;
  font-weight: 500;
  color: #94a3b8;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  transition: color .2s, background .2s;
  display: flex;
  align-items: center;

  &:hover { color: #f1f5f9; background: rgba(255,255,255,.07); }

  &--product {
    color: #2dd4bf;
    &:hover { background: rgba(13,148,136,.15); color: #2dd4bf; }
  }
}

.nav-btn { color: #94a3b8; font-size: .86rem; border-radius: 8px; &:hover { color: #f1f5f9; } }
.cta-btn { font-size: .86rem; font-weight: 700; padding: 8px 18px; border-radius: 8px; }
.welcome-text { font-size: .82rem; color: #64748b; }

.mobile-menu {
  width: 280px;
  background: #0f172a;
  border-left: 1px solid rgba(255,255,255,.08);
}

.mobile-brand { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; }

@media (max-width: 600px) {
  .header-inner { padding: 0 12px; }
  .header-inner .q-toolbar { min-height: 54px; }
}

.mobile-links {
  display: flex;
  flex-direction: column;
  gap: 4px;

  a {
    color: #94a3b8;
    text-decoration: none;
    font-size: .95rem;
    padding: 10px 8px;
    border-radius: 8px;
    transition: color .2s, background .2s;
    &:hover { color: #f1f5f9; background: rgba(255,255,255,.06); }
  }
}
</style>
