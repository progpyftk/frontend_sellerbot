<template>
  <q-page class="promos-page">
    <div class="q-pa-md">
      <q-card flat class="bg-white shadow-2 rounded-borders">

        <q-card-section class="promos-page-header">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <div class="header-icon-promos q-mr-md">
                <q-icon name="local_offer" size="sm" />
              </div>
              <div>
                <div class="header-eyebrow-promos">Crescimento & Vendas</div>
                <div class="header-title-promos">Gerenciador de Promoções</div>
              </div>
            </div>

            <div class="row q-gutter-sm">
              <q-btn flat color="grey-7" icon="refresh" label="Atualizar"
                @click="() => loadPromotions(false, true)" :loading="loading" />

              <q-btn flat color="grey-7" icon="receipt_long" label="Ver Logs"
                @click="showLogsDialog = true" />

              <q-btn unelevated color="amber-8" text-color="white" icon="bolt" label="Ativar Todas"
                @click="openActivateAllDialog" :disable="loading || isAnyPromoProcessing || totalElegiveis == 0" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-lg">

          <transition name="q-transition--slide-down">
            <q-banner v-if="isAnyPromoProcessing" rounded
              class="bg-orange-1 text-orange-10 q-mb-lg border-bottom custom-shadow">
              <template v-slot:avatar>
                <q-spinner-gears color="orange-8" size="3em" />
              </template>
              <div class="text-weight-bold text-subtitle1">Robôs trabalhando em segundo plano...</div>
              <div class="text-body2">
                <strong>{{ processingCount }} campanha(s)</strong> estão sendo analisadas e ativadas neste momento.
                Acompanhe o andamento clicando nos logs.
              </div>
              <template v-slot:action>
                <q-btn unelevated color="orange-8" text-color="white" label="Acompanhar Logs" icon="receipt_long"
                  @click="showLogsDialog = true" />
              </template>
            </q-banner>
          </transition>

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
                        <q-btn v-else outline color="orange-8" icon="bolt" label="Ativar" size="sm"
                          class="text-weight-bold bg-white transition-scale"
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
      <q-card style="width: 500px; max-width: 95vw;">
        <q-card-section class="row items-center bg-orange-1 text-orange-9 border-bottom">
          <q-icon name="security" size="md" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Ativar Promoção Única</div>
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
              O Mercado Livre exige descontos específicos para cada anúncio. O Sellerbot ativará automaticamente apenas
              os
              itens cujo desconto exigido seja <b>menor ou igual</b> ao valor abaixo.
            </div>
            <q-input v-model="maxDiscount" type="number" label="Desconto Máximo Permitido" outlined dense
              bg-color="white" color="orange-8" class="text-weight-bold text-center" min="1" max="99" suffix="% OFF">
              <template v-slot:prepend>
                <q-icon name="trending_down" color="orange-8" />
              </template>
            </q-input>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1 q-pa-md border-top">
          <q-btn flat label="Cancelar" color="blue-grey-6" v-close-popup class="text-weight-medium" />
          <q-btn unelevated label="Confirmar e Ativar" color="orange-8" icon-right="bolt"
            class="text-weight-bold q-px-md" @click="confirmActivation" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showActivateAllDialog" persistent>
      <q-card style="width: 500px; max-width: 95vw;">
        <q-card-section class="row items-center bg-orange-8 text-white border-bottom">
          <q-icon name="bolt" size="md" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Ativação em Massa</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="text-body1 text-blue-grey-9 q-mb-md">
            Você enviará <strong class="text-orange-9">{{ totalElegiveis }} campanhas</strong> elegíveis de todas as
            contas
            para o robô.
          </div>

          <div class="bg-grey-1 q-pa-md rounded-borders custom-shadow q-mb-md">
            <div class="text-weight-bold text-blue-grey-9 q-mb-sm">Defina a trava GLOBAL de segurança:</div>
            <div class="text-caption text-grey-7 q-mb-md">
              Essa regra será aplicada para todos os anúncios, de todas as contas, em todas as promoções selecionadas.
            </div>
            <q-input v-model="maxDiscountGlobal" type="number" label="Desconto Máximo Permitido" outlined dense
              bg-color="white" color="orange-8" class="text-weight-bold text-center" min="1" max="99" suffix="% OFF">
              <template v-slot:prepend>
                <q-icon name="trending_down" color="orange-8" />
              </template>
            </q-input>
          </div>
          <!-- Desconto fixo opcional -->
          <div class="bg-indigo-1 q-pa-md rounded-borders q-mb-md" style="border:1px solid #c5cae9">
            <q-checkbox v-model="useFixedDiscount" color="indigo-8" dense
              label="Usar o menor desconto ofertado (desconto fixo)"
              class="text-weight-bold text-indigo-9 q-mb-xs" />
            <div class="text-caption text-indigo-7 q-mb-sm q-ml-lg">
              Ignora o desconto sugerido pelo ML e aplica um percentual fixo. Útil para evitar
              descontos muito agressivos impostos pela plataforma.
            </div>
            <q-input v-if="useFixedDiscount" v-model.number="fixedDiscountPct"
              type="number" label="Aplicar exatamente este desconto" outlined dense
              bg-color="white" color="indigo-8" min="1" :max="maxDiscountGlobal" suffix="% OFF"
              hint="Deve ser ≤ à trava global acima">
              <template v-slot:prepend>
                <q-icon name="percent" color="indigo-8" />
              </template>
            </q-input>
            <q-banner v-if="useFixedDiscount && fixedDiscountPct > maxDiscountGlobal" dense rounded class="bg-red-1 text-red-9 q-mt-sm">
              <template v-slot:avatar><q-icon name="warning" color="red-8" /></template>
              O desconto fixo não pode ultrapassar a trava global ({{ maxDiscountGlobal }}%).
            </q-banner>
          </div>

          <q-banner rounded class="bg-amber-1 text-amber-10" dense>
            <template v-slot:avatar>
              <q-icon name="speed" color="amber-9" />
            </template>
            Isso vai criar várias tarefas simultâneas para finalizar o processo rapidamente.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1 q-pa-md border-top">
          <q-btn flat label="Cancelar" color="blue-grey-6" v-close-popup class="text-weight-medium" />
          <q-btn unelevated label="Iniciar Robôs" color="orange-8" class="text-weight-bold q-px-md"
            :disable="useFixedDiscount && fixedDiscountPct > maxDiscountGlobal"
            @click="confirmActivateAll" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showLogsDialog">
      <q-card style="width: 860px; max-width: 96vw; height: 85vh;" class="column">

        <!-- Header -->
        <q-card-section class="row items-center bg-blue-grey-9 text-white col-auto q-py-sm">
          <q-icon name="receipt_long" size="sm" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold">Histórico de Execuções</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <!-- Filtro de tipo de log -->
        <q-card-section class="col-auto q-py-sm q-px-md bg-grey-1 row items-center" style="border-bottom:1px solid #ddd; gap:8px; flex-wrap:wrap">
          <span class="text-caption text-grey-6 text-weight-bold">Mostrar:</span>
          <q-btn-toggle
            v-model="logFilter"
            flat dense no-caps
            :options="[
              { label: 'Todos',       value: 'all'      },
              { label: '✅ Ativados', value: 'positive' },
              { label: '⚠️ Falhas',   value: 'warning'  },
              { label: '🛡️ Trava',    value: 'info'     },
              { label: '❌ Erros',    value: 'negative' },
            ]"
            toggle-color="blue-grey-8"
            color="grey-6"
            class="text-caption"
          />
        </q-card-section>

        <!-- Conteúdo -->
        <q-card-section class="col scroll bg-grey-2 q-pa-md">
          <div v-if="groupedLogs.length > 0">

            <div v-for="group in groupedLogs" :key="group.date" class="q-mb-lg">

              <div class="text-subtitle2 text-blue-grey-8 q-mb-sm q-ml-xs text-weight-bold row items-center">
                <q-icon name="calendar_month" size="sm" class="q-mr-sm" />
                {{ group.date }}
              </div>

              <q-list class="rounded-borders" separator>
                <q-expansion-item
                  v-for="promo in group.logs" :key="'log-promo-' + promo.account_id + '-' + promo.id"
                  group="logs" icon="schedule"
                  header-class="bg-white text-blue-grey-9"
                  expand-icon-class="text-blue-grey-5"
                  class="q-mb-sm shadow-1 rounded-borders overflow-hidden">

                  <template v-slot:header>
                    <q-item-section avatar style="min-width:44px; padding-right:0">
                      <div class="text-caption text-weight-bold text-blue-grey-6">{{ promo.timeStr }}</div>
                    </q-item-section>

                    <q-item-section>
                      <q-item-label class="text-weight-bold">
                        <span class="text-orange-9 q-mr-xs">[{{ promo.account_nickname }}]</span>
                        {{ promo.name || promo.id }}
                      </q-item-label>
                      <q-item-label caption>Trava: {{ promo.max_discount_pct_used }}%</q-item-label>
                    </q-item-section>

                    <!-- Chips de resumo -->
                    <q-item-section side class="row items-center" style="gap:4px; flex-direction:row">
                      <template v-if="promoSummary(promo) as s">
                        <q-chip v-if="s.activated" dense square color="green-1" text-color="green-9" size="sm" class="text-weight-bold">
                          ✅ {{ s.activated }}
                        </q-chip>
                        <q-chip v-if="s.rejected" dense square color="red-1" text-color="red-9" size="sm" class="text-weight-bold">
                          ⚠️ {{ s.rejected }}
                        </q-chip>
                        <q-chip v-if="s.skipped" dense square color="blue-grey-1" text-color="blue-grey-7" size="sm" class="text-weight-bold">
                          🛡️ {{ s.skipped }}
                        </q-chip>
                      </template>
                    </q-item-section>
                  </template>

                  <q-card class="bg-grey-1">
                    <!-- Card resumo (tipo summary) -->
                    <div v-if="promoSummary(promo)" class="q-pa-sm row items-center" style="background:#f0f4f8; border-bottom:1px solid #dde2e8; gap:12px; flex-wrap:wrap">
                      <span class="text-caption text-blue-grey-7">
                        📊 <strong>{{ promoSummary(promo).total }}</strong> candidatos
                        · <strong class="text-green-9">{{ promoSummary(promo).activated }}</strong> ativados
                        · <strong class="text-red-9">{{ promoSummary(promo).rejected }}</strong> rejeitados pelo ML
                        · <strong class="text-blue-grey-6">{{ promoSummary(promo).skipped }}</strong> ignorados pela trava
                        <template v-if="promoSummary(promo).errors">
                          · <strong class="text-negative">{{ promoSummary(promo).errors }}</strong> erros de conexão
                        </template>
                      </span>
                    </div>

                    <q-card-section class="q-pa-none">
                      <q-list separator dense>
                        <template v-for="(log, i) in promo.execution_logs" :key="i">
                          <!-- Pula linha de resumo (já exibida acima) e aplica filtro -->
                          <q-item v-if="log.type !== 'summary' && (logFilter === 'all' || logFilter === log.type)" class="q-py-xs">
                            <q-item-section avatar style="min-width:28px">
                              <q-icon :name="logIcon(log.type)" :color="logColor(log.type)" size="xs" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label class="text-caption"
                                :class="logTextClass(log.type)"
                                style="white-space: pre-wrap; word-break: break-word;">
                                {{ log.msg }}
                              </q-item-label>
                            </q-item-section>
                          </q-item>
                        </template>
                        <q-item v-if="filteredCount(promo) === 0" dense>
                          <q-item-section class="text-caption text-grey-5 q-pa-sm">
                            Nenhum log deste tipo nesta execução.
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </q-expansion-item>
              </q-list>
            </div>

          </div>

          <div v-else class="text-center text-grey-6 q-pa-xl">
            <q-icon name="inventory_2" size="4em" color="grey-4" class="q-mb-md" />
            <div class="text-h6">Nenhum histórico encontrado</div>
            <p class="text-grey-5">Os logs aparecerão aqui após a primeira execução de ativação.</p>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>



  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const loading = ref(false)
const accountsPromotions = ref([])
let pollInterval = null

// COMPUTED PARA SABER SE ALGO ESTÁ PROCESSANDO
const processingCount = computed(() => {
  if (!accountsPromotions.value) return 0;
  let count = 0;
  accountsPromotions.value.forEach(account => {
    account.promotions.forEach(promo => {
      if (promo.is_processing) count++;
    });
  });
  return count;
});

const isAnyPromoProcessing = computed(() => processingCount.value > 0);

// WATCH PARA NOTIFICAR QUANDO TERMINAR
watch(isAnyPromoProcessing, (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    $q.notify({
      type: 'positive',
      icon: 'celebration',
      message: '🎉 Todos os robôs finalizaram suas tarefas com sucesso!',
      position: 'top',
      timeout: 8000
    });
  }
});

// ESTADOS DOS MODAIS
const logFilter = ref('all')

// ── Helpers para o painel de logs ──────────────────────────────────────────
function logIcon(type) {
  return { positive: 'check_circle', warning: 'warning', negative: 'error', info: 'shield', summary: 'bar_chart' }[type] || 'circle'
}
function logColor(type) {
  return { positive: 'green-7', warning: 'orange-8', negative: 'red-7', info: 'blue-grey-4', summary: 'blue-7' }[type] || 'grey'
}
function logTextClass(type) {
  return {
    positive: 'text-green-9 text-weight-medium',
    warning:  'text-orange-9',
    negative: 'text-red-9 text-weight-medium',
    info:     'text-blue-grey-6',
  }[type] || ''
}
function promoSummary(promo) {
  const s = (promo.execution_logs || []).find(l => l.type === 'summary')
  if (s) return s
  // Compatibilidade com logs antigos (sem bloco summary)
  const logs = promo.execution_logs || []
  if (!logs.length) return null
  return {
    activated: logs.filter(l => l.type === 'positive').length,
    rejected:  logs.filter(l => l.type === 'warning').length,
    skipped:   logs.filter(l => l.type === 'info').length,
    errors:    logs.filter(l => l.type === 'negative').length,
    total:     logs.filter(l => l.type !== 'summary').length,
  }
}
function filteredCount(promo) {
  const logs = (promo.execution_logs || []).filter(l => l.type !== 'summary')
  if (logFilter.value === 'all') return logs.length
  return logs.filter(l => l.type === logFilter.value).length
}

const useFixedDiscount = ref(false)
const fixedDiscountPct = ref(5)
const showActivationDialog = ref(false)
const selectedPromo = ref(null)
const selectedAccount = ref(null)
const maxDiscount = ref(15)

const showActivateAllDialog = ref(false)
const maxDiscountGlobal = ref(15)
const showLogsDialog = ref(false)

const totalElegiveis = computed(() => {
  if (!accountsPromotions.value) return 0;
  let count = 0;
  accountsPromotions.value.forEach(account => {
    account.promotions.forEach(promo => {
      if ((promo.candidate_count > 0 || promo.type === 'SELLER_CAMPAIGN') && !promo.is_processing) {
        count++;
      }
    });
  });
  return count;
})

const hasAnyLogs = computed(() => {
  if (!accountsPromotions.value) return false;
  return accountsPromotions.value.some(acc =>
    acc.promotions.some(promo => promo.execution_logs && promo.execution_logs.length > 0)
  )
})

// Agrupa e ordena os logs por data e hora (do mais recente para o mais antigo)
const groupedLogs = computed(() => {
  if (!accountsPromotions.value) return [];

  // 1. Achata todas as promoções com logs em uma única lista
  let allLogs = [];
  accountsPromotions.value.forEach(acc => {
    acc.promotions.forEach(promo => {
      if (promo.execution_logs && promo.execution_logs.length > 0 && promo.last_activated_at) {
        const dateObj = new Date(promo.last_activated_at);
        allLogs.push({
          ...promo,
          account_nickname: acc.account_nickname,
          timestamp: dateObj.getTime(), // Para ordenação exata
          dateStr: dateObj.toLocaleDateString('pt-BR'), // Ex: "11/03/2026"
          timeStr: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) // Ex: "10:22"
        });
      }
    });
  });

  // 2. Ordena tudo, do mais recente para o mais antigo
  allLogs.sort((a, b) => b.timestamp - a.timestamp);

  // 3. Agrupa as datas
  const groups = {};
  allLogs.forEach(log => {
    if (!groups[log.dateStr]) {
      groups[log.dateStr] = [];
    }
    groups[log.dateStr].push(log);
  });

  // 4. Converte o objeto em um array formatado para o Vue renderizar
  return Object.keys(groups).map(date => ({
    date: date,
    logs: groups[date]
  }));
});

// TABELA - COLUNAS
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

onBeforeUnmount(() => {
  stopPolling()
})

// ============================================================================
// ATIVAÇÃO ÚNICA
// ============================================================================
const openActivationDialog = (account, promo) => {
  selectedAccount.value = account
  selectedPromo.value = promo
  maxDiscount.value = promo.max_discount_pct_used != null ? Number(promo.max_discount_pct_used) : 15
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
      max_discount_pct: parseFloat(maxDiscount.value)
    })

    showActivationDialog.value = false

    if (selectedPromo.value) {
      selectedPromo.value.is_processing = true
    }

    startPolling()

    $q.notify({
      type: 'positive',
      icon: 'smart_toy',
      message: 'Robô iniciado! A ativação está rodando em segundo plano.',
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
// ATIVAÇÃO EM MASSA
// ============================================================================
const openActivateAllDialog = () => {
  showActivateAllDialog.value = true
}

const confirmActivateAll = async () => {
  if (!maxDiscountGlobal.value || maxDiscountGlobal.value <= 0 || maxDiscountGlobal.value > 99) {
    $q.notify({ type: 'warning', message: 'Desconto inválido.', position: 'top' })
    return
  }

  const promosToActivate = []
  accountsPromotions.value.forEach(account => {
    account.promotions.forEach(promo => {
      if ((promo.candidate_count > 0 || promo.type === 'SELLER_CAMPAIGN') && !promo.is_processing) {
        promosToActivate.push({
          account_id: account.account_id,
          promotion_id: promo.id,
          promotion_type: promo.type
        })
      }
    });
  });

  if (promosToActivate.length === 0) return;

  try {
    $q.loading.show({ message: 'Distribuindo tarefas para o robô...' })

    const payload = {
      max_discount_pct: parseFloat(maxDiscountGlobal.value),
      promotions: promosToActivate,
    }
    if (useFixedDiscount.value && fixedDiscountPct.value > 0) {
      payload.fixed_discount_pct = parseFloat(fixedDiscountPct.value)
    }
    await MercadoLivreService.activateAllPromotions(payload)

    showActivateAllDialog.value = false

    accountsPromotions.value.forEach(account => {
      account.promotions.forEach(promo => {
        const wasSent = promosToActivate.some(p => p.promotion_id === promo.id && p.account_id === account.account_id)
        if (wasSent) {
          promo.is_processing = true;
        }
      });
    });

    startPolling()

    $q.notify({
      type: 'positive',
      icon: 'smart_toy',
      message: 'Ativação em massa iniciada! Acompanhe o andamento na tabela.',
      position: 'top',
      timeout: 4000
    })

  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Falha ao iniciar robôs.', position: 'top' })
    loadPromotions(true, true)
  } finally {
    $q.loading.hide()
  }
}

// ============================================================================
// HELPERS
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

const formatDate = (isoString, includeSeconds = false) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  const options = { hour: '2-digit', minute: '2-digit' }
  if (includeSeconds) options.second = '2-digit'
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', options)
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

/* ═══ Design system ══════════════════════════════════════════════════ */
.promos-page { background: #f5f7fa; }
.promos-page-header { background: #fff; padding: 16px 20px; border-bottom: 1.5px solid #e8edf3; }
.header-icon-promos {
  width: 34px; height: 34px; border-radius: 9px; display: flex;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #fff;
}
.header-eyebrow-promos { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title-promos   { font-size: 16px; font-weight: 700; color: #1a1f36; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
}
</style>
