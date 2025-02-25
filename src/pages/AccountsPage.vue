<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered class="bg-white">
        <q-card-section class="bg-primary text-white">
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-grow row items-center">
              <img src="https://logospng.org/wp-content/uploads/mercado-livre.jpg" alt="MercadoLivre Logo"
                style="width: 50px; height: 50px; object-fit: contain" class="q-mr-md" />
              <div>
                <div class="text-subtitle2">Gerenciamento de</div>
                <div class="text-h6 text-weight-bold">Contas do MercadoLivre</div>
              </div>
            </div>
            <div class="col-auto">
              <q-btn color="white" text-color="primary" icon="add_circle" label="Adicionar Conta" @click="startMLAuth"
                :loading="isAuthenticating" class="q-px-md" size="lg" unelevated>
                <q-tooltip>Conectar nova conta do MercadoLivre</q-tooltip>
              </q-btn>
            </div>
            <div>
              <q-btn label="Conectar com Tiny" @click="connectTiny" color="primary" />
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <div v-if="loading" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <template v-else>
            <div v-if="accounts.length > 0">
              <q-table :rows="accounts" :columns="columns" row-key="account_id" flat bordered separator="cell"
                :pagination="{ rowsPerPage: 10 }">
                <template v-slot:body-cell-access_token="props">
                  <q-td :props="props" class="text-no-wrap">
                    {{ truncateToken(props.row.access_token) }}
                    <q-btn flat round dense color="primary" icon="content_copy" size="sm"
                      @click="copyToClipboard(props.row.access_token)">
                      <q-tooltip>Copiar token completo</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>

                <template v-slot:body-cell-refresh_token="props">
                  <q-td :props="props" class="text-no-wrap">
                    {{ truncateToken(props.row.refresh_token) }}
                    <q-btn flat round dense color="primary" icon="content_copy" size="sm"
                      @click="copyToClipboard(props.row.refresh_token)">
                      <q-tooltip>Copiar token completo</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>

                <template v-slot:body-cell-is_connected="props">
                  <q-td :props="props">
                    <q-chip :color="props.row.is_connected ? 'positive' : 'negative'" text-color="white" size="sm">
                      {{ props.row.is_connected ? "Conectado" : "Desconectado" }}
                    </q-chip>
                  </q-td>
                </template>

                <template v-slot:body-cell-token_expires_at="props">
                  <q-td :props="props">
                    {{ formatDate(props.row.token_expires_at) }}
                  </q-td>
                </template>

                <template v-slot:body-cell-actions="props">
                  <q-td :props="props" class="text-center">
                    <q-btn flat round color="negative" icon="delete" size="sm" @click="confirmDelete(props.row)">
                      <q-tooltip>Excluir conta</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </div>

            <div v-else class="text-center q-pa-xl">
              <q-icon name="account_circle" size="6em" color="grey-5" />
              <p class="text-h6 q-mt-md">Nenhuma conta encontrada.</p>
              <p class="text-subtitle1 q-mt-sm">
                Clique em "Adicionar Conta" para começar.
              </p>
            </div>
          </template>
        </q-card-section>
      </q-card>

      <q-dialog v-model="deleteDialog">
        <q-card>
          <q-card-section class="row items-center">
            <q-avatar icon="warning" color="negative" text-color="white" />
            <span class="q-ml-sm">Tem certeza que deseja excluir esta conta?</span>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="primary" v-close-popup />
            <q-btn flat label="Excluir" color="negative" @click="deleteAccount" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { api } from "src/boot/axios";
import { useQuasar } from "quasar";
import { DateTime } from "luxon";

/** UI and data references **/
const $q = useQuasar();
const loading = ref(true);
const accounts = ref([]);
const deleteDialog = ref(false);
const accountToDelete = ref(null);
const isAuthenticating = ref(false);

/**
 * Configurações de autenticação ML
 */
const CLIENT_ID = "6026212895630598";
const isDevEnvironment = process.env.NODE_ENV === "development";
const REDIRECT_URI = isDevEnvironment
  ? "https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect?env=dev"
  : "https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect?env=prod";

console.info("[AccountsPage] Ambiente de desenvolvimento:", isDevEnvironment);
console.debug("[AccountsPage] CLIENT_ID:", CLIENT_ID);
console.debug("[AccountsPage] REDIRECT_URI:", REDIRECT_URI);

/**
 * Colunas da tabela
 */
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

/**
 * Helpers
 */
const truncateToken = (token) => {
  if (token && token.length > 10) {
    return token.substring(0, 5) + "..." + token.substring(token.length - 5);
  }
  return token || "";
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
      console.info("[AccountsPage] Token copiado para o clipboard com sucesso!");
      $q.notify({
        message: "Token copiado com sucesso!",
        color: "positive",
        position: "top",
        timeout: 2000,
      });
    })
    .catch((err) => {
      console.error("[AccountsPage] Erro ao copiar token:", err);
      $q.notify({
        message: `Erro ao copiar o token: ${err.message}`,
        color: "negative",
        position: "top",
        timeout: 2000,
      });
    });
};

/**
 * Busca contas do MercadoLivre
 */
const getAccounts = async () => {
  console.info("[AccountsPage] Iniciando busca de contas ML do usuário...");
  loading.value = true;
  try {
    const response = await api.get("/mercadolivre/accounts/");
    accounts.value = Array.isArray(response.data) ? response.data : [];
    console.info("[AccountsPage] Contas carregadas:", accounts.value);
  } catch (error) {
    console.error("[AccountsPage] Erro ao buscar contas:", error);
    accounts.value = [];
    $q.notify({
      message: "Erro ao buscar contas. Por favor, tente novamente.",
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    loading.value = false;
  }
};

/**
 * Inicia fluxo de autenticação com MercadoLivre
 */
const startMLAuth = () => {
  console.info("[AccountsPage] Iniciando processo de autenticação ML...");
  if (isAuthenticating.value) {
    console.warn("[AccountsPage] Autenticação ML já em andamento, abortando.");
    return;
  }
  isAuthenticating.value = true;

  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;
  console.debug("[AccountsPage] Auth URL (ML):", authUrl);

  window.location.href = authUrl;
};

/**
 * Trata o "code" retornado pelo ML e chama o backend para registrar a conta
 */
const handleAuthSuccess = async (code) => {
  console.info("[AccountsPage] Processando code recebido (ML):", code);
  try {
    loading.value = true;
    const response = await api.post("/mercadolivre/auth/", { code });

    if (response.data && response.data.success) {
      console.info("[AccountsPage] Conta ML adicionada com sucesso:", response.data);
      $q.notify({
        message: "Conta adicionada com sucesso!",
        color: "positive",
        position: "top",
        timeout: 2000,
      });
      await getAccounts();
    } else {
      const msg = response.data?.message || "Erro desconhecido ao adicionar conta ML";
      console.error("[AccountsPage] Erro do backend na auth ML:", msg);
      throw new Error(msg);
    }
  } catch (error) {
    console.error("[AccountsPage] Exceção ao tratar auth ML:", error);
    if (error.response) {
      const { data, status } = error.response;
      // Caso específico do erro 400 enviado pelo backend
      if (status === 400 && data.errors) {
        console.warn("[AccountsPage] Erro 400 do backend:", data);
        $q.notify({
          message: data.message || "Erro desconhecido",
          color: "negative",
          position: "top",
          timeout: 3000,
        });
      } else {
        // Outros tipos de erro
        $q.notify({
          message: `Erro na autenticação: ${data?.message || error.message}`,
          color: "negative",
          position: "top",
          timeout: 3000,
        });
      }
    } else {
      $q.notify({
        message: `Erro na autenticação: ${error.message}`,
        color: "negative",
        position: "top",
        timeout: 3000,
      });
    }
  } finally {
    loading.value = false;
    isAuthenticating.value = false;
  }
};

/**
 * Ao clicar em deletar conta
 */
const confirmDelete = (account) => {
  console.info("[AccountsPage] Confirmando exclusão da conta:", account);
  accountToDelete.value = account;
  deleteDialog.value = true;
};

/**
 * Deleta conta confirmada
 */
const deleteAccount = async () => {
  if (!accountToDelete.value) return;
  console.info("[AccountsPage] Excluindo conta:", accountToDelete.value);

  try {
    await api.delete(`/mercadolivre/accounts/${accountToDelete.value.account_id}/`);
    $q.notify({
      message: "Conta excluída com sucesso!",
      color: "positive",
      position: "top",
      timeout: 2000,
    });
    console.info("[AccountsPage] Conta excluída com sucesso. Atualizando lista...");
    await getAccounts();
  } catch (error) {
    console.error("[AccountsPage] Erro ao excluir conta:", error);
    $q.notify({
      message: `Erro ao excluir conta: ${error.message}`,
      color: "negative",
      position: "top",
      timeout: 2000,
    });
  } finally {
    deleteDialog.value = false;
    accountToDelete.value = null;
  }
};

/**
 * Fluxo de conexão com Tiny (API V3)
 */
const connectTiny = () => {
  console.info("[AccountsPage] Iniciando fluxo de autenticação com Tiny V3...");
  const clientId = "tiny-api-4c207bbb1bd868b0b4e125a65dd45f880e99ce0c-1740494061";
  const redirectUri = "https://sellerbot-frontend-367123809032.us-central1.run.app/tiny/callback";
  const scope = "openid";

  const tinyAuthUrl = `https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;

  console.debug("[AccountsPage] Auth URL (Tiny):", tinyAuthUrl);
  window.location.href = tinyAuthUrl;
};

/**
 * Lifecycle: Montado
 */
onMounted(() => {
  console.info("[AccountsPage] onMounted -> Iniciando carregamento de dados...");

  // 1) Verificar se existe code do MercadoLivre na URL
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  if (code) {
    console.info("[AccountsPage] Code detectado na URL. Chamando handleAuthSuccess()...");
    handleAuthSuccess(code);
    // Remove o code da URL para não ficar repetindo
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // 2) Buscar contas ML
  getAccounts();
});
</script>
