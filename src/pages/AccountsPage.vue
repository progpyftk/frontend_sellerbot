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
        <q-btn color="primary" icon="add" label="Adicionar Conta" @click="startMLAuth" />
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
import { useQuasar, date } from "quasar";
import { DateTime } from "luxon";

const $q = useQuasar();

const CLIENT_ID = "6026212895630598";
const REDIRECT_URI =
  "https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect";

const loading = ref(true);
const accounts = ref([]);
const deleteDialog = ref(false);
const accountToDelete = ref(null);

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
  {
    name: "is_connected",
    align: "left",
    label: "Status",
    field: "is_connected",
  },
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
  console.log(dateString);
  if (!dateString) return "";

  // Converte a string UTC para uma data no fuso horário de São Paulo
  const saoPauloDate = DateTime.fromISO(dateString, { zone: "UTC" }).setZone(
    "America/Sao_Paulo"
  );

  // Formata a data para dd/MM/yyyy HH:mm
  return saoPauloDate.toFormat("dd/MM/yyyy HH:mm");
};

const copyToClipboard = (text) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      $q.notify({
        type: "positive",
        message: "Token copiado para a área de transferência",
        timeout: 2000,
      });
    })
    .catch((err) => {
      console.error("Erro ao copiar: ", err);
      $q.notify({
        type: "negative",
        message: "Erro ao copiar o token",
        timeout: 2000,
      });
    });
};

const getAccounts = async () => {
  loading.value = true;
  try {
    console.log("Iniciando busca de contas");
    const response = await api.get("/mercadolivre/accounts/");
    console.log("Resposta da API:", response);
    if (response.data && Array.isArray(response.data)) {
      accounts.value = response.data;
    } else {
      accounts.value = [];
      console.warn("Dados de contas não encontrados ou não são um array:", response.data);
    }
    console.log("Contas atualizadas:", accounts.value);
  } catch (error) {
    console.error("Erro detalhado ao buscar contas:", error);
    accounts.value = []; // Garantir que accounts seja sempre um array
    $q.notify({
      type: "negative",
      message: "Erro ao buscar contas. Por favor, tente novamente.",
    });
  } finally {
    loading.value = false;
    console.log("Loading finalizado");
  }
};

let authWindow = null;
const isAuthenticating = ref(false);

const startMLAuth = () => {
  if (isAuthenticating.value) return;
  isAuthenticating.value = true;
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;

  if (authWindow && !authWindow.closed) {
    authWindow.focus();
  } else {
    authWindow = window.open(authUrl, "_blank");
  }
};

const handleAuthSuccess = async (code) => {
  if (!isAuthenticating.value) return;
  try {
    loading.value = true;
    const response = await api.post("/mercadolivre/auth/", { code: code });
    if (response.data && response.data.success) {
      $q.notify({
        type: "positive",
        message: "Conta autenticada com sucesso!",
      });
      getAccounts(); // Atualiza a lista de contas
    } else {
      throw new Error(response.data?.message || "Erro desconhecido");
    }
  } catch (error) {
    console.error("Erro na autenticação:", error);
    $q.notify({
      type: "negative",
      message: `Erro na autenticação: ${error.message}`,
    });
  } finally {
    isAuthenticating.value = false;
    loading.value = false;
  }
};

const confirmDelete = (account) => {
  accountToDelete.value = account;
  deleteDialog.value = true;
};

const deleteAccount = async () => {
  if (!accountToDelete.value) return;
  try {
    await api.post("/seller/delete", {
      seller: {
        ml_seller_id: accountToDelete.value.account_id,
      },
    });
    $q.notify({
      type: "positive",
      message: "Conta excluída com sucesso!",
    });
    getAccounts(); // Atualiza a lista de contas
  } catch (error) {
    console.error("Erro ao excluir conta:", error);
    $q.notify({
      type: "negative",
      message: "Erro ao excluir conta. Por favor, tente novamente.",
    });
  } finally {
    deleteDialog.value = false;
    accountToDelete.value = null;
  }
};

onMounted(() => {
  getAccounts();
  window.addEventListener("message", (event) => {
    if (event.data.type === "ML_AUTH_SUCCESS") {
      handleAuthSuccess(event.data.code);
    }
  });
});
</script>
