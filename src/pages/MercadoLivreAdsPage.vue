<!-- src/pages/MercadoLivreAdsPage.vue -->
<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered class="bg-white">
        <!-- CABEÇALHO -->
        <q-card-section class="bg-primary text-white">
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-grow row items-center">
              <img src="https://logospng.org/wp-content/uploads/mercado-livre.jpg" alt="MercadoLivre Logo"
                style="width: 50px; height: 50px; object-fit: contain" class="q-mr-md" />
              <div>
                <div class="text-subtitle2">Mercado Livre Ads</div>
                <div class="text-h6 text-weight-bold">Teste de Acesso às Campanhas</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <!-- CORPO -->
        <q-card-section>
          <div v-if="loading" class="q-pa-xl flex flex-center">
            <q-spinner size="lg" color="primary" />
          </div>

          <template v-else>
            <q-table :rows="accounts" :columns="columns" row-key="id" flat bordered :pagination="{ rowsPerPage: 10 }">
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge v-if="props.row.ads_access === true" color="green" label="Acesso OK" />
                  <q-badge v-else-if="props.row.ads_access === false" color="red" label="Sem acesso" />
                  <q-badge v-else color="grey" label="Não testado" />
                </q-td>
              </template>

              <template v-slot:body-cell-acao="props">
                <q-td :props="props">
                  <q-btn color="primary" label="Testar" @click="testarAcessoAds(props.row)" />
                </q-td>
              </template>
            </q-table>
          </template>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { api } from 'src/boot/axios';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const loading = ref(true);
const accounts = ref([]);

const columns = [
  { name: 'account_nickname', label: 'Conta', field: 'account_nickname', align: 'left' },
  { name: 'ads_access', label: 'Status Ads', field: 'ads_access', align: 'center' },
  { name: 'acao', label: 'Ação', field: 'acao', align: 'center' },
];

const fetchAccounts = async () => {
  try {
    loading.value = true;
    const res = await api.get('/mercadolivre/accounts/');
    accounts.value = res.data.map(acc => ({ ...acc, ads_access: null }));
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Erro ao buscar contas do Mercado Livre' });
  } finally {
    loading.value = false;
  }
};

const testarAcessoAds = async (account) => {
  try {
    $q.notify({ message: `🔎 Testando acesso à API Ads...`, color: 'info' });

    const res = await api.post('/mercadolivre/ads/', { account_id: account.id });

    if (res.data.success) {
      account.ads_access = true;
      $q.notify({ message: '✅ Acesso Ads permitido!', color: 'positive' });
    } else {
      account.ads_access = false;
      $q.notify({ message: '❌ Sem acesso à API de Ads', color: 'negative' });
    }
  } catch (err) {
    account.ads_access = false;
    const msg = err.response?.data?.error || 'Erro inesperado';
    $q.notify({ message: msg, color: 'negative' });
  }
};

onMounted(fetchAccounts);
</script>
