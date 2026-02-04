<template>
  <q-page class="bg-grey-1">
    <div class="q-pa-md">
      <q-card flat bordered>
        <q-card-section class="bg-deep-orange-9 text-white">
          <div class="row items-center">
            <q-icon name="warning_amber" size="md" class="q-mr-md" />
            <div>
              <div class="text-subtitle2">Ritual da Manhã</div>
              <div class="text-h6 text-weight-bold">Resgate do Full sem Estoque</div>
            </div>
            <q-space />
            <q-btn flat round dense icon="refresh" @click="fetchItems" :loading="loading">
              <q-tooltip>Buscar novamente</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>

        <q-banner class="bg-orange-1 text-orange-10 q-px-md">
          <template v-slot:avatar>
            <q-icon name="info" color="orange-10" />
          </template>
          <b>Fluxo de Resgate:</b>
          <ol class="q-my-xs q-pl-md" style="font-size: 14px;">
            <li class="q-mb-xs">Clique em <b>"1. Abrir no ML"</b>. Na nova aba, mude a logística para <b>"Cross
                Docking"</b>
              (Normal) e Salve.</li>
            <li>Volte aqui e clique em <b>"2. Repor Estoque"</b>. Isso ativa o anúncio e força o Tiny a atualizar
              depois.</li>
          </ol>
        </q-banner>

        <q-card-section class="q-pa-none">

          <div v-if="items.length === 0 && !loading" class="text-center q-pa-xl text-grey-6">
            <q-icon name="task_alt" size="5em" color="positive" />
            <div class="text-h5 text-weight-bold q-mt-md">Tudo Limpo!</div>
            <div class="text-subtitle1">Nenhum produto travado no Full.</div>
          </div>

          <q-table v-else :rows="items" :columns="columns" row-key="id" flat :loading="loading" binary-state-sort
            :pagination="{ rowsPerPage: 50 }">
            <template v-slot:body-cell-thumbnail="props">
              <q-td :props="props" style="width: 60px">
                <q-avatar rounded size="50px" class="shadow-1">
                  <img :src="props.row.thumbnail" style="object-fit: cover;" />
                </q-avatar>
              </q-td>
            </template>

            <template v-slot:body-cell-title="props">
              <q-td :props="props">
                <div class="text-weight-bold text-body2">{{ props.row.title }}</div>
                <div class="row items-center q-gutter-x-sm text-caption text-grey-7 q-mt-xs">
                  <q-badge outline color="deep-orange" label="Full" />
                  <span>{{ props.row.item_id }}</span>
                  <span>|</span>
                  <span>SKU: <b>{{ props.row.sku }}</b></span>
                </div>
                <div class="text-caption text-blue-grey-8 q-mt-xs">
                  Conta: {{ props.row.account_nickname }}
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" align="right">
                <div class="row justify-end items-center q-gutter-sm">

                  <q-btn outline color="primary" icon="open_in_new" label="1. Abrir no ML" type="a"
                    :href="`https://www.mercadolivre.com.br/anuncios/${props.row.item_id}/modificar`" target="_blank"
                    size="sm" padding="sm md">
                    <q-tooltip>Abre a edição para você tirar do Full manualmente</q-tooltip>
                  </q-btn>

                  <q-icon name="arrow_forward" color="grey-4" />

                  <q-btn unelevated color="green-7" icon="flash_on" label="2. Repor Estoque" size="sm" padding="sm md"
                    @click="injectStock(props.row)" :loading="props.row.injecting">
                    <q-tooltip>Injeta 1 unidade para ativar o anúncio</q-tooltip>
                  </q-btn>

                </div>
              </q-td>
            </template>

          </q-table>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const items = ref([])
const loading = ref(false)

// Colunas da Tabela
const columns = [
  { name: 'thumbnail', align: 'center', label: 'Foto', field: 'thumbnail' },
  { name: 'title', align: 'left', label: 'Produto / SKU / Conta', field: 'title' },
  { name: 'actions', align: 'right', label: 'Ações de Resgate' }
]

// --- CARREGAR A LISTA ---
const fetchItems = async () => {
  loading.value = true
  try {
    // Chama a View Especialista que já traz apenas (Full + Sem Estoque)
    const response = await api.get('/mercadolivre/fulfillment-resgate/')

    const data = response.data.results || response.data

    // Adiciona uma propriedade local 'injecting' para controlar o loading do botão individual
    items.value = data.map(item => ({
      ...item,
      injecting: false
    }))

  } catch (error) {
    console.error(error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao carregar lista de resgate.'
    })
  } finally {
    loading.value = false
  }
}

// --- PASSO 2: INJETAR ESTOQUE ---
const injectStock = async (item) => {
  item.injecting = true
  try {
    // Chama a ação específica de ativação
    const response = await api.post(`/mercadolivre/fulfillment-resgate/${item.id}/ativar-item/`)

    // Feedback de Sucesso
    $q.notify({
      type: 'positive',
      icon: 'check_circle',
      message: 'Sucesso! Anúncio ativado.',
      caption: `Estoque definido em ${response.data.new_quantity}. Tiny deve assumir em breve.`
    })

    // Remove o item da lista visualmente (pois ele não é mais um "problema")
    items.value = items.value.filter(i => i.id !== item.id)

  } catch (error) {
    console.error(error)
    const errorMsg = error.response?.data?.message || 'Erro desconhecido.'
    const mlError = error.response?.data?.ml_error?.message || ''

    // Modal Explicativo em caso de Erro
    $q.dialog({
      title: 'Não foi possível ativar',
      message: `
        O Mercado Livre recusou a adição de estoque.<br><br>
        <b>Motivo Provável:</b> Você ainda não mudou a logística para "Manual" na aba do Mercado Livre.<br>
        O item ainda consta como Fulfillment lá.<br><br>
        <span class="text-grey-7" style="font-size: 12px">Erro técnico: ${errorMsg} ${mlError}</span>
      `,
      html: true,
      ok: { label: 'Entendi, vou mudar lá', color: 'primary' }
    })
  } finally {
    item.injecting = false
  }
}

// Inicializa ao abrir a tela
onMounted(() => {
  fetchItems()
})
</script>

<style scoped>
/* Pequeno ajuste para alinhar texto nas badges */
.text-caption {
  line-height: 1.2;
}
</style>
