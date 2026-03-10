<template>
  <q-page class="bg-grey-2">
    <div class="q-pa-md">
      <q-card flat class="bg-white shadow-2 rounded-borders">

        <q-card-section class="bg-white q-py-md q-px-lg border-bottom">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <div class="q-mr-md bg-orange-8 text-white q-pa-sm rounded-borders shadow-2">
                <q-icon name="campaign" size="sm" />
              </div>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium text-uppercase">Crescimento & Vendas</div>
                <div class="text-h6 text-blue-grey-9 text-weight-bold" style="line-height: 1.1;">
                  Gerenciador de Promoções
                </div>
              </div>
            </div>
            <div class="row q-gutter-sm">
              <q-btn unelevated color="blue-grey-9" text-color="white" icon="refresh" label="Atualizar Campanhas"
                @click="() => loadPromotions(false)" :loading="loading" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-lg">

          <div v-if="loading" class="text-center q-pa-xl">
            <q-spinner-dots color="orange-8" size="3em" />
            <div class="text-blue-grey-6 q-mt-md text-weight-medium">Buscando campanhas em todas as contas...</div>
          </div>

          <div v-else-if="!accountsPromotions || accountsPromotions.length === 0" class="text-center q-pa-xl">
            <q-icon name="celebration" size="4em" color="grey-4" />
            <div class="text-h6 text-blue-grey-8 q-mt-sm">Nenhuma promoção pendente</div>
            <div class="text-grey-6">Suas contas não possuem campanhas ativas no momento ou já foram todas configuradas.
            </div>
          </div>

          <div v-else class="q-gutter-y-md">
            <q-expansion-item v-for="accountData in accountsPromotions" :key="accountData.account_id"
              class="bg-grey-1 rounded-borders custom-shadow overflow-hidden"
              header-class="bg-white text-blue-grey-9 border-bottom" expand-icon-class="text-blue-grey-9"
              default-opened>

              <template v-slot:header>
                <q-item-section avatar>
                  <q-avatar rounded color="orange-1" text-color="orange-9" icon="storefront" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold text-subtitle1">{{ accountData.account_nickname
                  }}</q-item-label>
                  <q-item-label caption class="text-grey-7">MLB: {{ accountData.account_id }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip color="green-1" text-color="green-9" class="text-weight-bold" size="sm">
                    {{ accountData.promotions.length }} campanhas ativas
                  </q-chip>
                </q-item-section>
              </template>

              <div class="bg-white q-pa-md">
                <q-table :rows="accountData.promotions" :columns="columns" row-key="id" flat hide-pagination
                  :pagination="{ rowsPerPage: 0 }" class="promotions-table">
                  <template v-slot:header="props">
                    <q-tr :props="props"
                      class="bg-grey-1 text-blue-grey-9 text-uppercase text-caption text-weight-bold">
                      <q-th v-for="col in props.cols" :key="col.name" :props="props">
                        {{ col.label }}
                      </q-th>
                    </q-tr>
                  </template>

                  <template v-slot:body="props">
                    <q-tr :props="props" class="hover-row">

                      <q-td key="type" :props="props" style="width: 120px;">
                        <q-chip square size="sm" class="text-weight-bold" :color="getTypeMeta(props.row.type).color"
                          :text-color="getTypeMeta(props.row.type).textColor">
                          {{ getTypeMeta(props.row.type).label }}
                        </q-chip>
                      </q-td>

                      <q-td key="name" :props="props" style="max-width: 300px; white-space: normal;">
                        <div class="text-weight-bold text-blue-grey-9 text-subtitle2" style="line-height: 1.2;">
                          {{ props.row.name || 'Campanha sem nome' }}
                        </div>
                        <div class="text-caption text-grey-6 font-mono q-mt-xs">
                          ID: {{ props.row.id }}
                        </div>

                        <div v-if="props.row.last_activated_at"
                          class="q-mt-sm row items-center text-caption text-blue-grey-7" style="font-size: 0.70rem;">
                          <q-icon name="smart_toy" size="14px" class="q-mr-xs text-orange-8" />
                          <span>Rodou em <b>{{ formatDate(props.row.last_activated_at) }}</b></span>

                          <q-chip outline square color="blue-grey-4" text-color="blue-grey-9" size="xs"
                            class="q-ml-sm q-my-none q-px-xs text-weight-bold" title="Trava de proteção configurada">
                            Trava: {{ props.row.max_discount_pct_used }}%
                          </q-chip>

                          <q-chip :color="props.row.last_activated_count > 0 ? 'green-1' : 'grey-2'"
                            :text-color="props.row.last_activated_count > 0 ? 'green-9' : 'grey-7'" size="xs" square
                            class="q-ml-xs q-my-none q-px-xs text-weight-bold"
                            title="Itens ativados na última execução">
                            <q-icon name="bolt" size="10px" class="q-mr-xs" v-if="props.row.last_activated_count > 0" />
                            {{ props.row.last_activated_count }} itens
                          </q-chip>
                        </div>
                      </q-td>

                      <q-td key="status" :props="props">
                        <div class="row items-center q-gutter-x-xs">
                          <q-icon :name="props.row.status === 'started' ? 'play_circle' : 'schedule'"
                            :color="props.row.status === 'started' ? 'green-6' : 'orange-6'" size="xs" />
                          <span class="text-weight-medium text-blue-grey-8">
                            {{ props.row.status === 'started' ? 'Em Andamento' : 'Pendente/Agendada' }}
                          </span>
                        </div>
                      </q-td>

                      <q-td key="dates" :props="props">
                        <div class="column text-caption text-blue-grey-8">
                          <div v-if="props.row.start_date"><span class="text-grey-6">Início:</span> {{
                            formatDate(props.row.start_date) }}</div>
                          <div v-if="props.row.finish_date"><span class="text-grey-6">Fim:</span> <span
                              class="text-weight-bold">{{ formatDate(props.row.finish_date) }}</span></div>
                        </div>
                      </q-td>

                      <q-td key="items" :props="props" align="center">
                        <div class="column items-center q-gutter-y-xs">
                          <div class="text-caption text-weight-bold text-blue-grey-8">
                            Total: {{ (props.row.candidate_count || 0) + (props.row.active_count || 0) }} anúncios
                          </div>

                          <div class="row justify-center q-gutter-x-sm">
                            <q-chip outline square color="blue-grey-6" size="sm" class="text-weight-bold q-ma-none"
                              title="Elegíveis para entrar">
                              <q-icon name="list_alt" size="xs" class="q-mr-xs" /> {{ props.row.candidate_count || 0 }}
                              Elegíveis
                            </q-chip>
                            <q-chip outline square color="green-6" size="sm" class="text-weight-bold q-ma-none"
                              title="Já ativados nesta promoção">
                              <q-icon name="check_circle" size="xs" class="q-mr-xs" /> {{ props.row.active_count || 0 }}
                              Ativos
                            </q-chip>
                          </div>
                        </div>
                      </q-td>

                      <q-td key="actions" :props="props" align="right">

                        <q-btn v-if="props.row.is_processing" unelevated color="orange-1" text-color="orange-9"
                          label="Processando" size="sm" class="text-weight-bold custom-shadow" disable>
                          <q-spinner-box color="orange-9" size="xs" class="q-ml-sm" />
                        </q-btn>

                        <q-btn v-else unelevated color="orange-8" text-color="white" icon="bolt" label="Ativar Itens"
                          size="sm" class="text-weight-bold shadow-1 transition-scale"
                          @click="openActivationDialog(accountData, props.row)" :disable="isAnyPromoProcessing"
                          :title="isAnyPromoProcessing ? 'Aguarde o processamento atual finalizar' : 'Ativar esta promoção'" />

                      </q-td>

                    </q-tr>
                  </template>
                </q-table>
              </div>
            </q-expansion-item>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="showActivationDialog" persistent>
      <q-card style="width: 550px; max-width: 95vw;">

        <q-card-section class="row items-center bg-orange-1 text-orange-9 border-bottom">
          <q-icon name="security" size="md" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Protetor de Margem</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-body2 text-blue-grey-9 q-mb-md">
            Você está prestes a enviar os itens elegíveis para o robô de ativação:
            <br>
            <strong class="text-orange-9 text-subtitle1">{{ selectedPromo?.name }}</strong>
            <span class="text-caption text-grey-6"> (Conta: {{ selectedAccount?.account_nickname }})</span>
          </div>

          <div class="bg-grey-1 q-pa-md rounded-borders custom-shadow q-mb-md">
            <div class="text-weight-bold text-blue-grey-9 q-mb-sm">Defina sua trava de segurança:</div>
            <div class="text-caption text-grey-7 q-mb-md">
              O Mercado Livre exige descontos específicos para cada anúncio. O Sellerbot só ativará automaticamente os
              itens
              cujo desconto exigido seja <b>menor ou igual</b> ao valor que você definir abaixo.
            </div>

            <q-input v-model.number="maxDiscount" type="number" label="Desconto Máximo Permitido" outlined dense
              bg-color="white" color="orange-8" class="text-weight-bold" min="1" max="99" suffix="% OFF">
              <template v-slot:prepend>
                <q-icon name="trending_down" color="orange-8" />
              </template>
            </q-input>
          </div>

          <q-banner rounded class="bg-amber-1 text-amber-10" dense>
            <template v-slot:avatar>
              <q-icon name="smart_toy" color="amber-9" />
            </template>
            O robô fará a análise em segundo plano. Ele ativará apenas os itens que respeitarem sua regra de lucro.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1 q-pa-md border-top">
          <q-btn flat label="Cancelar" color="blue-grey-6" v-close-popup class="text-weight-medium" />
          <q-btn unelevated label="Confirmar e Ativar" color="orange-8" icon-right="bolt"
            class="text-weight-bold q-px-md" @click="confirmActivation" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const accountsPromotions = ref([])
let pollInterval = null // Guarda o ID do temporizador do Polling

const isAnyPromoProcessing = computed(() => {
  if (!accountsPromotions.value) return false

  // Varre todas as contas e todas as promoções buscando algum 'is_processing' true
  return accountsPromotions.value.some(account =>
    account.promotions.some(promo => promo.is_processing)
  )
})

// ESTADO DO DIALOG
const showActivationDialog = ref(false)
const selectedPromo = ref(null)
const selectedAccount = ref(null)
const maxDiscount = ref(15)



// TABELA
const columns = [
  { name: 'type', align: 'left', label: 'TIPO' },
  { name: 'name', align: 'left', label: 'CAMPANHA / NOME' },
  { name: 'status', align: 'left', label: 'STATUS' },
  { name: 'dates', align: 'left', label: 'VIGÊNCIA' },
  { name: 'items', align: 'center', label: 'ITENS' },
  { name: 'actions', align: 'right', label: 'AÇÕES' }
]

// ============================================================================
// DATA FETCHING & POLLING
// ============================================================================
const loadPromotions = async (silent = false, forceRefresh = false) => {
  if (!silent) loading.value = true
  try {
    // Passa o force_refresh para o seu service axios
    const params = forceRefresh ? { force_refresh: true } : {}
    const response = await MercadoLivreService.getPromotions(params)

    accountsPromotions.value = response.data?.data || []

    const hasRunningTasks = accountsPromotions.value.some(acc =>
      acc.promotions.some(p => p.is_processing)
    )

    if (hasRunningTasks) {
      startPolling()
    } else {
      stopPolling()
    }
  } catch (error) {
    console.error('Erro ao buscar promoções:', error)
    if (!silent) $q.notify({ type: 'negative', message: 'Falha ao carregar as promoções.', position: 'top' })
  } finally {
    if (!silent) loading.value = false
  }
}

const startPolling = () => {
  if (!pollInterval) {
    // A cada 10 segundos, atualiza a tela silenciosamente
    pollInterval = setInterval(() => {
      loadPromotions(true)
    }, 10000)
  }
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Limpa o temporizador se o usuário mudar de página no sistema
onBeforeUnmount(() => {
  stopPolling()
})

// ============================================================================
// LÓGICA DO MODAL (ATIVAÇÃO DIRETA)
// ============================================================================
const openActivationDialog = (account, promo) => {
  selectedAccount.value = account
  selectedPromo.value = promo
  showActivationDialog.value = true
}

const confirmActivation = async () => {
  if (!maxDiscount.value || maxDiscount.value <= 0 || maxDiscount.value > 99) {
    $q.notify({ type: 'warning', message: 'Por favor, insira um desconto válido entre 1 e 99%.', position: 'top' })
    return
  }

  try {
    $q.loading.show({ message: 'Enviando para o robô de processamento...' })

    await MercadoLivreService.activatePromotions({
      account_id: selectedAccount.value.account_id,
      promotion_id: selectedPromo.value.id,
      promotion_type: selectedPromo.value.type,
      max_discount_pct: maxDiscount.value
    })

    showActivationDialog.value = false

    // Altera a UI instantaneamente para mostrar o botão de spinner antes do próximo polling
    if (selectedPromo.value) {
      selectedPromo.value.is_processing = true
    }

    startPolling() // Garante que a tela vai ficar vigiando o backend

    $q.notify({
      type: 'positive',
      icon: 'smart_toy',
      message: 'Robô iniciado! A ativação está rodando em segundo plano. Pode continuar usando o sistema.',
      position: 'top',
      timeout: 4000
    })

  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Falha ao iniciar robô de ativação.', position: 'top' })
  } finally {
    $q.loading.hide()
  }
}

// ============================================================================
// HELPERS DE FORMATAÇÃO
// ============================================================================
const getTypeMeta = (type) => {
  const map = {
    'MARKETPLACE_CAMPAIGN': { label: 'Campanha MKT', color: 'purple-1', textColor: 'purple-9' },
    'DEAL': { label: 'Oferta do Dia', color: 'orange-1', textColor: 'orange-9' },
    'LIGHTNING': { label: 'Relâmpago', color: 'red-1', textColor: 'red-9' },
    'CO_FUNDED': { label: 'Co-patrocinada', color: 'blue-1', textColor: 'blue-9' },
  }
  return map[type] || { label: type || 'Outros', color: 'grey-2', textColor: 'grey-8' }
}

const formatDate = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  loadPromotions()
})
</script>

<style scoped>
.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}

.border-top {
  border-top: 1px solid #e0e0e0;
}

.custom-shadow {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  border: 1px solid #f0f0f0;
}

.letter-spacing-1 {
  letter-spacing: 0.5px;
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
}

.promotions-table :deep(tbody tr td) {
  vertical-align: middle;
  height: 60px;
}

.hover-row:hover {
  background-color: #f8f9fa;
}

.transition-scale {
  transition: transform 0.2s ease, filter 0.2s ease;
}

.transition-scale:hover {
  transform: translateY(-2px);
  filter: brightness(0.95);
}
</style>
