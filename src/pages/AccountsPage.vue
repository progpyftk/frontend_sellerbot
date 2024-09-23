<template>
  <q-page padding>
    <h1 class="text-h4 q-mb-md">Contas MercadoLivre</h1>

    <!-- Loading Indicator -->
    <div v-if="loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Data Table -->
    <q-table
      v-else
      :rows="accounts"
      :columns="columns"
      row-key="ml_seller_id"
      flat
      bordered
    >
      <template v-slot:top>
        <q-btn color="primary" icon="add" label="Adicionar Conta" @click="startMLAuth" />
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

const $q = useQuasar();

const CLIENT_ID = "6026212895630598";
const REDIRECT_URI =
  "https://sellerbot-frontend-367123809032.us-central1.run.app/ml-redirect";

const loading = ref(false);
const accounts = ref([]);
const deleteDialog = ref(false);
const accountToDelete = ref(null);

const columns = [
  { name: "ml_seller_id", align: "left", label: "Seller ID", field: "ml_seller_id" },
  { name: "nickname", align: "left", label: "Nickname", field: "nickname" },
  { name: "actions", align: "center", label: "Ações", field: "actions" },
];

const getAccounts = async () => {
  loading.value = true;
  try {
    const response = await api.get("/accounts/seller/index");
    accounts.value = response.data;
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    $q.notify({
      color: "negative",
      message: "Erro ao buscar contas. Por favor, tente novamente.",
      icon: "error",
    });
  } finally {
    loading.value = false;
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
    authWindow.focus(); // Reutiliza a janela existente
  } else {
    authWindow = window.open(authUrl, "_blank");
  }
};

const handleAuthSuccess = async (code) => {
  if (!isAuthenticating.value) return;
  try {
    loading.value = true;
    console.log("O código que será enviado é:");
    console.log(code);
    const response = await api.post("/mercadolivre/auth/", { code: code });
    if (response.data.success) {
      $q.notify({
        color: "positive",
        message: "Conta autenticada com sucesso!",
        icon: "check",
      });
      getAccounts(); // Atualiza a lista de contas
    } else {
      throw new Error(response.data.message || "Erro desconhecido");
    }
  } catch (error) {
    console.error("Erro na autenticação:", error);
    $q.notify({
      color: "negative",
      message: `Erro na autenticação: ${error.message}`,
      icon: "error",
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
  try {
    await api.post("/seller/delete", {
      seller: {
        ml_seller_id: accountToDelete.value.ml_seller_id,
      },
    });
    $q.notify({
      color: "positive",
      message: "Conta excluída com sucesso!",
      icon: "check",
    });
    getAccounts(); // Atualiza a lista de contas
  } catch (error) {
    console.error("Erro ao excluir conta:", error);
    $q.notify({
      color: "negative",
      message: "Erro ao excluir conta. Por favor, tente novamente.",
      icon: "error",
    });
  } finally {
    deleteDialog.value = false;
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
