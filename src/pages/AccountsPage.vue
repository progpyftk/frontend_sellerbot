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

const CLIENT_ID = "6026212895630598";
const REDIRECT_URI = "https://0782-179-177-165-121.ngrok-free.app/ml-redirect";
const test =
  "https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=6026212895630598&redirect_uri=https://127.0.0.1:9000/ml-redirect&state=$12345";

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
    console.log("Buscando contas do MercadoLivre...");
    const response = await api.get("/accounts/seller/index");
    console.log("Contas recebidas:", response.data);
    accounts.value = response.data;
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
  } finally {
    loading.value = false;
  }
};

const startMLAuth = () => {
  const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}`;
  console.log("Redirecionando para:", authUrl);
  window.open(authUrl, "_blank");
};

// Esta função deve ser chamada quando a página de redirecionamento é carregada
const handleRedirect = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");
  console.log("Código recebido:", code);
  if (code) {
    exchangeCodeForToken(code);
  } else {
    console.log("Nenhum código encontrado na URL.");
  }
};

const exchangeCodeForToken = async (code) => {
  try {
    console.log("Trocando código por token...");
    const response = await api.post("/mercadolivre/exchange-code", { code });
    console.log("Token recebido:", response.data);
    getAccounts(); // Atualiza a lista de contas
  } catch (error) {
    console.error("Erro ao trocar código por token:", error);
  }
};

const confirmDelete = (account) => {
  accountToDelete.value = account;
  deleteDialog.value = true;
};

const deleteAccount = async () => {
  try {
    console.log("Deletando conta:", accountToDelete.value.ml_seller_id);
    await api.post("/seller/delete", {
      seller: {
        ml_seller_id: accountToDelete.value.ml_seller_id,
      },
    });
    console.log("Conta excluída com sucesso!");
    getAccounts(); // Atualiza a lista de contas
  } catch (error) {
    console.error("Erro ao excluir conta:", error);
  } finally {
    deleteDialog.value = false;
  }
};

onMounted(getAccounts);

// Se esta é a página de redirecionamento, chame handleRedirect
if (window.location.pathname === "/ml-redirect") {
  console.log("Página de redirecionamento detectada. Verificando código...");
  handleRedirect();
}
</script>
