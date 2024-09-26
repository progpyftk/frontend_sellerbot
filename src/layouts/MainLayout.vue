<template>
  <q-layout view="hHh lpR fFf" id="inspire">
    <!-- Menu Lateral -->
    <q-drawer
      v-model="drawer"
      side="left"
      :width="220"
      :breakpoint="500"
      bordered
      class="bg-grey-1"
    >
      <q-scroll-area class="fit">
        <q-list padding class="menu-list">
          <template v-for="(section, index) in menuSections" :key="index">
            <q-item-label header class="text-weight-bold text-primary q-pb-sm">
              {{ section.title }}
            </q-item-label>
            <q-item
              v-for="item in section.items"
              :key="item.route"
              clickable
              v-ripple
              @click="navigateTo(item.route)"
              :to="{ name: item.route }"
              exact
              active-class="my-menu-link"
            >
              <q-item-section avatar class="items-center">
                <q-icon :name="item.icon" color="primary" size="sm" />
              </q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
            <q-separator v-if="index < menuSections.length - 1" spaced class="q-my-sm" />
          </template>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Barra Superior -->
    <q-header class="bg-white text-black" elevated>
      <q-toolbar class="q-pa-none">
        <!-- Botão para abrir o menu lateral -->
        <q-btn
          flat
          round
          size="lg"
          icon="mdi-menu"
          @click="drawer = !drawer"
          color="primary"
        ></q-btn>

        <q-space />

        <!-- Logo SellerBot -->
        <q-toolbar-title class="text-center">
          <img src="/images/logo_sellerbot.png" alt="SellerBot Logo" class="logo-img" />
        </q-toolbar-title>

        <q-space />

        <!-- Área de Login/Logout -->
        <div class="user-area q-gutter-sm">
          <template v-if="currentUser">
            <q-btn-dropdown flat no-caps class="user-menu" color="primary">
              <template v-slot:label>
                <div class="row items-center no-wrap">
                  <q-avatar size="32px" class="q-mr-sm">
                    <img
                      :src="
                        currentUser.avatarUrl ||
                        'https://cdn.quasar.dev/img/boy-avatar.png'
                      "
                    />
                  </q-avatar>
                  <div class="text-left">
                    <div class="text-weight-bold">{{ currentUser.username }}</div>
                    <div class="text-caption">{{ currentUser.email }}</div>
                  </div>
                </div>
              </template>

              <q-list>
                <q-item clickable v-close-popup @click="navigateTo('user-config')">
                  <q-item-section avatar>
                    <q-icon name="settings" />
                  </q-item-section>
                  <q-item-section>Configurações</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="handleLogout">
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>Sair</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </template>
          <template v-else>
            <q-btn
              unelevated
              color="primary"
              label="Login"
              no-caps
              @click="redirectToLogin"
            />
          </template>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Conteúdo Principal -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from "vue";
import { useStore } from "src/stores/store";
import { useRouter } from "vue-router";

const store = useStore();
const router = useRouter();

const drawer = ref(true);
const currentUser = computed(() => store.currentUser);

const menuSections = [
  {
    title: "MercadoLivre",
    items: [
      { label: "Contas", icon: "mdi-account-plus", route: "accounts" },
      { label: "Frete Grátis", icon: "mdi-truck-fast", route: "free-shipping" },
      { label: "Análise de Frete", icon: "mdi-chart-bar", route: "shipping-analysis" },
      { label: "Detalhe de Venda", icon: "mdi-chart-bar", route: "order-details" },
    ],
  },
  {
    title: "Configurações",
    items: [
      {
        label: "Configurações do Usuário",
        icon: "mdi-account-settings",
        route: "user-config",
      },
    ],
  },
];

const handleLogout = () => {
  store.logoutUser();
  router.replace("/login");
};

const navigateTo = (routeName) => {
  if (currentUser.value) {
    router.push({ name: routeName, path: `/app/${routeName}` });
  } else {
    router.push("/login");
  }
};
const redirectToLogin = () => {
  router.push("/login");
};
const defaultAvatar = "https://cdn.quasar.dev/img/boy-avatar.png";
</script>

<style scoped>
.q-header {
  .q-toolbar {
    min-height: 64px;
  }
}

.logo-img {
  max-height: 40px;
  width: auto;
}

/* Estilo para alinhar os botões de login/logout */
.logout-btn,
.login-btn {
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 10px;
}

.q-btn {
  font-weight: 500;
}

.q-drawer {
  .menu-list {
    .q-item {
      border-radius: 0 16px 16px 0;
      margin-right: 8px;
      min-height: 40px;
      padding: 8px 16px;

      &.q-item--active {
        color: #1976d2;
        font-weight: 500;
        background: #e3f2fd;
      }
    }

    .q-item__section--avatar {
      min-width: 40px;
      padding-right: 12px;

      .q-icon {
        color: #1976d2;
      }
    }

    .q-item-label {
      letter-spacing: 0.01785714em;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      padding: 0 8px;
    }

    .q-item__label {
      font-size: 0.8125rem;
      font-weight: 400;
    }

    .q-separator--spaced {
      margin: 8px 0;
    }
  }
}

.my-menu-link {
  color: #1976d2 !important;
  background: #e3f2fd !important;
}

.user-area {
  display: flex;
  align-items: center;
}

.user-menu {
  .q-btn__content {
    flex-wrap: nowrap;
  }
}

.q-avatar {
  border: 2px solid #1976d2;
}

.text-caption {
  font-size: 0.7rem;
  opacity: 0.7;
}

:deep(.q-btn) {
  text-transform: none;
}
</style>
