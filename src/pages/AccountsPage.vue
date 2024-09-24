<template>
  <q-page padding>
    <h1 class="text-h4 q-mb-md">Contas MercadoLivre</h1>

    <!-- Loading Indicator -->
    <div v-if="loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Data Table -->
    <template v-else>
      <div class="q-mb-md">
        <q-btn
          color="primary"
          icon="add"
          label="Adicionar Conta"
          @click="startMLAuth"
          :loading="isAuthenticating"
        />
      </div>
      <q-table
        :rows="accounts"
        :columns="columns"
        row-key="account_id"
        flat
        bordered
        v-if="accounts.length > 0"
      >
        <template v-slot:body-cell-access_token="props">
          <q-td :props="props">
            {{ truncateToken(props.row.access_token) }}
            <q-btn
              flat
              round
              dense
              icon="content_copy"
              @click="copyToClipboard(props.row.access_token)"
            >
              <q-tooltip>Copiar token completo</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template v-slot:body-cell-refresh_token="props">
          <q-td :props="props">
            {{ truncateToken(props.row.refresh_token) }}
            <q-btn
              flat
              round
              dense
              icon="content_copy"
              @click="copyToClipboard(props.row.refresh_token)"
            >
              <q-tooltip>Copiar token completo</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template v-slot:body-cell-is_connected="props">
          <q-td :props="props">
            <div class="row items-center">
              <div
                :style="{
                  backgroundColor: props.row.is_connected ? 'green' : 'red',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  marginRight: '8px',
                }"
              ></div>
              <span>
                {{ props.row.is_connected ? "Conectado" : "Desconectado" }}
              </span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-token_expires_at="props">
          <q-td :props="props">
            {{ formatDate(props.row.token_expires_at) }}
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              round
              color="negative"
              icon="delete"
              @click="confirmDelete(props.row)"
            />
          </q-td>
        </template>
      </q-table>
      <div v-else class="text-center q-pa-md">Nenhuma conta encontrada.</div>
    </template>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="deleteDialog">
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ml-sm">Tem certeza que deseja excluir esta conta?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="primary" v-close-popup />
          <q-btn flat label="Excluir" color="negative" @click="deleteAccount" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "src/boot/axios";
import { useQuasar } from "quasar";
import { DateTime } from "luxon";

const quasar = useQuasar();

const notify = (message, type = "info") => {
  quasar.notify({
    message,
    type,
    position: "top",
    timeout: 2000,
  });
};

const CLIENT_ID = "6026212895630598";

const isDevEnvironment = process.env.NODE_ENV === "development"; // Verifica o ambiente com NODE_ENV
const REDIRECT_URI = isDevEnvironment
  ? "https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect?env=dev" // URL de dev
  : "https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect?env=prod"; // URL de produção

const loading = ref(true);
const accounts = ref([]);
const deleteDialog = ref(false);
const accountToDelete = ref(null);
const isAuthenticating = ref(false); // Declarar a variável isAuthenticating como ref
console.log("AMBIENTE :", process.env.NODE_ENV);

const columns = [
  { name: "account_id", align: "left", label: "Seller ID", field: "account_id" },
  {
    name: "account_nickname",
    align: "left",
    label: "Nickname",
    field: "account_nickname",
  },
  { name: "access_token", align: "left", label: "Access Token", field: "access_token" },
  {
    name: "refresh_token",
    align: "left",
    label: "Refresh Token",
    field: "refresh_token",
  },
  { name: "is_connected", align: "left", label: "Status", field: "is_connected" },
  {
    name: "token_expires_at",
    align: "left",
    label: "Token Expira em",
    field: "token_expires_at",
  },
  { name: "actions", align: "center", label: "Ações", field: "actions" },
];

const truncateToken = (token) => {
  if (token && token.length > 10) {
    return token.substring(0, 5) + "..." + token.substring(token.length - 5);
  }
  return token;
};

const formatDate = (dateString) => {
  if (!dateString) return "";

  const saoPauloDate = DateTime.fromISO(dateString, { zone: "UTC" }).setZone(
    "America/Sao_Paulo"
  );

  return saoPauloDate.toFormat("dd/MM/yyyy HH:mm");
};

const copyToClipboard = (text) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      notify("Token copiado com sucesso para área de transferência!", "positive");
    })
    .catch((err) => {
      console.error("Erro ao copiar: ", err);
      notify(`Erro ao copiar o CODE: ${err.message}`, "negative");
    });
};

const getAccounts = async () => {
  loading.value = true;
  try {
    const response = await api.get("/mercadolivre/accounts/");
    if (response.data && Array.isArray(response.data)) {
      accounts.value = response.data;
    } else {
      accounts.value = [];
    }
  } catch (error) {
    accounts.value = [];
    notify("Erro ao buscar contas. Por favor, tente novamente.", "negative");
  } finally {
    loading.value = false;
  }
};

// Inicia o fluxo de autenticação para o Mercado Livre
const startMLAuth = () => {
  if (isAuthenticating.value) return;
  isAuthenticating.value = true; // Mostra o estado de carregamento
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;
  window.location.href = authUrl;
};

// Captura e trata o código de autenticação recebido na URL após redirecionamento
const handleAuthSuccess = async (code) => {
  try {
    loading.value = true;
    const response = await api.post("/mercadolivre/auth/", { code });
    if (response.data && response.data.success) {
      notify("Conta adicionada com sucesso!", "positive");
      await getAccounts(); // Atualiza a lista de contas
    } else {
      throw new Error(response.data?.message || "Erro desconhecido");
    }
  } catch (error) {
    notify(`Erro na autenticação: ${error.message}`, "negative");
  } finally {
    loading.value = false;
  }
};

// Verifica se há um `code` na URL e o envia ao backend
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  if (code) {
    handleAuthSuccess(code);

    // Limpa o código da URL para evitar duplicações
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  getAccounts(); // Busca a lista de contas já autenticadas
});
</script>
