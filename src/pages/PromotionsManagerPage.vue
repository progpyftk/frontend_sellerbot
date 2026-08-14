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

               <q-btn v-if="canWrite && selectedCount > 0" unelevated color="orange-8" text-color="white" icon="bolt"
                :label="`Ativar Selecionadas (${selectedCount})`" @click="openSelectedActivation" />
               <q-btn v-else-if="canWrite" unelevated color="amber-8" text-color="white" icon="bolt" label="Ativar Todas"
                @click="openAllActivation" :disable="loading || totalElegiveis == 0"
                title="Ativa todas as campanhas elegíveis de todas as contas" />
            </div>
          </div>
        </q-card-section>

         <q-card-section class="q-pa-lg">
           <div class="promotions-filters row items-center q-col-gutter-sm q-mb-lg">
             <div class="col-12 col-sm-4">
               <q-select v-model="promotionTypeFilter" :options="promotionTypeOptions"
                 emit-value map-options outlined dense clearable label="Tipo de campanha"
                 bg-color="white" />
             </div>
             <div class="col-12 col-sm-4">
               <q-select v-model="listingStatusFilter" :options="listingStatusOptions"
                 emit-value map-options outlined dense label="Estado dos anúncios"
                 bg-color="white" />
             </div>
             <div class="col text-caption text-blue-grey-6">
               O estado do anúncio é separado do estado da campanha no Mercado Livre.
             </div>
           </div>

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
                     {{ visiblePromotions(accountData.promotions).length }} campanhas exibidas
                  </q-chip>
                </q-item-section>
              </template>

              <div class="bg-white q-pa-md">
                <div class="table-responsive">
                 <q-table :rows="visiblePromotions(accountData.promotions)" :columns="columns" row-key="id" flat hide-pagination
                  :pagination="{ rowsPerPage: 0 }" class="promotions-table" :dense="$q.screen.lt.md">
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
                      <q-td key="select" :props="props" style="width: 42px;">
                         <q-checkbox v-if="canWrite && canSelectPromotion(props.row)"
                          :model-value="isSelected(accountData, props.row)"
                          @update:model-value="toggleSelect(accountData, props.row)"
                          color="orange-8" dense />
                      </q-td>

                      <q-td key="type" :props="props" style="width: 120px;">
                         <q-chip square size="sm" class="text-weight-bold" :color="getPromotionTypeMeta(props.row.type).color"
                           :text-color="getPromotionTypeMeta(props.row.type).textColor">
                           {{ getPromotionTypeMeta(props.row.type).label }}
                        </q-chip>
                      </q-td>

                      <q-td key="name" :props="props" style="max-width: 300px; white-space: normal;">
                        <div class="text-weight-bold text-blue-grey-9 text-subtitle2" style="line-height: 1.2;">
                          {{ props.row.name || 'Campanha sem nome' }}
                        </div>
                        <div class="text-caption text-grey-6 font-mono q-mt-xs">
                          ID: {{ props.row.id }}
                        </div>
                        <div class="row items-center q-gutter-x-xs q-mt-xs">
                          <q-chip v-if="activationStatusMeta(props.row)" dense square size="xs"
                            :color="activationStatusMeta(props.row).color"
                            :text-color="activationStatusMeta(props.row).textColor"
                            :icon="activationStatusMeta(props.row).icon"
                            :label="activationStatusMeta(props.row).label" />
                          <q-chip v-if="props.row.boosted_offer" dense square size="xs"
                            color="teal-1" text-color="teal-9" icon="savings"
                            :label="`Boost ML ${props.row.boosted_discount_pct ?? '—'}%`">
                            <q-tooltip>
                              Benefício ML: {{ props.row.boosted_discount_pct ?? '—' }}% ·
                              R$ {{ props.row.boosted_discount_amount ?? '—' }} nos custos ·
                              preço ao comprador: R$ {{ props.row.buyer_price_after_boost ?? '—' }}
                            </q-tooltip>
                          </q-chip>
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

                           <q-toggle v-if="canWrite && props.row.record_id && props.row.can_auto_activate" dense size="sm" color="teal"
                            :model-value="props.row.auto_activate"
                            @update:model-value="v => toggleAutoActivate(props.row, v)"
                            class="q-ml-sm" />
                          <q-chip v-if="props.row.auto_activate && props.row.auto_max_discount_pct"
                            dense size="sm" color="orange-2" text-color="orange-9"
                            :label="`Trava ${props.row.auto_max_discount_pct}%`" />
                           <span v-if="props.row.record_id && props.row.can_auto_activate" class="q-ml-xs" style="font-size:0.68rem;color:#64748b">
                            Ativar automaticamente
                          </span>
                        </div>
                      </q-td>

                      <q-td key="status" :props="props">
                        <div class="row items-center q-gutter-x-xs">
                          <q-icon :name="props.row.status === 'started' ? 'play_circle' : 'schedule'"
                            :color="props.row.status === 'started' ? 'green-6' : 'orange-6'" size="xs" />
                           <span class="text-weight-medium text-blue-grey-8">
                             {{ props.row.status === 'started' ? 'Em Andamento' : 'Pendente/Agendada' }}
                           </span>
                           <q-chip v-if="props.row.paused_count > 0" dense square size="xs"
                             color="orange-1" text-color="orange-9" icon="pause_circle"
                             :label="`${props.row.paused_count} pausados`" />
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
                             Total: {{ promotionCountTotal(props.row) }} anúncios
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
                             <q-chip outline square color="orange-7" size="sm" class="text-weight-bold q-ma-none"
                               title="Anúncios pausados no Mercado Livre">
                               <q-icon name="pause_circle" size="xs" class="q-mr-xs" /> {{ props.row.paused_count || 0 }}
                               Pausados
                             </q-chip>
                          </div>
                        </div>
                      </q-td>

                      <q-td key="actions" :props="props" align="right">
                        <div v-if="props.row.is_processing" class="promo-progress">
                          <template v-if="props.row.progress_total > 0">
                            <q-linear-progress rounded size="14px"
                              :value="props.row.progress_done / props.row.progress_total"
                              color="orange-8" track-color="orange-2" stripe animated />
                            <div class="text-caption text-orange-9 text-weight-bold q-mt-xs">
                              {{ props.row.progress_done }}/{{ props.row.progress_total }} anúncios processados
                            </div>
                          </template>
                          <q-btn v-else unelevated color="orange-1" text-color="orange-9"
                            label="Preparando..." size="sm" class="text-weight-bold custom-shadow" disable>
                            <q-spinner-box color="orange-9" size="xs" class="q-ml-sm" />
                          </q-btn>
                        </div>
                        <div v-else class="column items-end q-gutter-y-xs">
                           <q-btn v-if="canWrite && props.row.can_manual_activate && props.row.candidate_count > 0" outline color="orange-8" icon="bolt" label="Ativar" size="sm"
                             class="text-weight-bold bg-white transition-scale"
                             @click="openActivationDialog(accountData, props.row)"
                             title="Ativar esta promoção" />
                           <q-chip v-else-if="!props.row.can_manual_activate" dense square size="sm"
                             color="blue-grey-1" text-color="blue-grey-8" icon="visibility"
                             :label="props.row.activation_block_reason || 'Somente leitura'"
                             class="activation-reason" />
                          <div v-if="promoSummary(props.row)"
                            class="row items-center q-gutter-x-xs cursor-pointer result-chips"
                            title="Ver o log completo desta execução"
                            @click="openLogsFor(accountData, props.row)">
                            <q-chip v-if="promoSummary(props.row).activated" dense square size="sm"
                              color="green-1" text-color="green-9" class="text-weight-bold q-ma-none">
                              ✅ {{ promoSummary(props.row).activated }}
                            </q-chip>
                            <q-chip v-if="promoSummary(props.row).rejected" dense square size="sm"
                              color="red-1" text-color="red-9" class="text-weight-bold q-ma-none">
                              ⚠️ {{ promoSummary(props.row).rejected }}
                            </q-chip>
                            <q-chip v-if="promoSummary(props.row).skipped" dense square size="sm"
                              color="blue-grey-1" text-color="blue-grey-7" class="text-weight-bold q-ma-none">
                              🛡️ {{ promoSummary(props.row).skipped }}
                            </q-chip>
                            <q-icon name="open_in_new" size="12px" color="grey-5" />
                          </div>
                        </div>
                      </q-td>
                    </q-tr>
                  </template>
                </q-table>
                </div>
              </div>
            </q-expansion-item>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- ── DIALOG ÚNICO DE ATIVAÇÃO (1 ou N promoções) ── -->
    <q-dialog v-model="showActivateDialog" persistent>
      <q-card style="width: 520px; max-width: 95vw;">
        <q-card-section class="row items-center bg-orange-1 text-orange-9 border-bottom">
          <q-icon name="bolt" size="md" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">
            {{ activationTargets.length === 1 ? 'Ativar Promoção' : `Ativar ${activationTargets.length} Promoções` }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <!-- Alvo(s) -->
          <div v-if="activationTargets.length === 1" class="text-body2 text-blue-grey-9 q-mb-md">
            Enviar os itens elegíveis desta campanha para o robô:
            <br>
            <strong class="text-orange-9 text-subtitle1">{{ activationTargets[0].name || activationTargets[0].promotion_id }}</strong>
            <span class="text-caption text-grey-6"> (Conta: {{ activationTargets[0].account_nickname }})</span>
          </div>
          <div v-else class="q-mb-md">
            <div class="text-body2 text-blue-grey-9 q-mb-xs">
              <strong class="text-orange-9">{{ activationTargets.length }} campanhas</strong> de
              <strong>{{ targetAccountsCount }} conta(s)</strong> serão enviadas para o robô:
            </div>
            <div class="targets-list bg-grey-1 rounded-borders q-pa-sm">
              <div v-for="t in activationTargets" :key="t.account_id + ':' + t.promotion_id"
                class="text-caption text-blue-grey-8 ellipsis">
                <q-icon name="local_offer" size="11px" class="q-mr-xs text-orange-7" />
                <b>[{{ t.account_nickname }}]</b> {{ t.name || t.promotion_id }}
              </div>
            </div>
          </div>

          <!-- Modo de desconto -->
          <div class="bg-grey-1 q-pa-md rounded-borders custom-shadow q-mb-sm">
            <div class="text-weight-bold text-blue-grey-9 q-mb-sm">Como aplicar o desconto?</div>

             <q-option-group v-model="discountMode" color="orange-8" :options="discountModeOptions"
               class="q-mb-md text-body2" />

            <template v-if="discountMode === 'suggested'">
              <div class="text-caption text-grey-7 q-mb-sm">
                O robô ativa apenas os anúncios cujo desconto exigido pelo ML seja
                <b>menor ou igual</b> ao limite abaixo. Os demais são ignorados pela trava.
              </div>
              <q-input v-model.number="maxDiscount" type="number" label="Trava: desconto máximo permitido"
                outlined dense bg-color="white" color="orange-8" class="text-weight-bold text-center"
                min="1" max="99" suffix="% OFF">
                <template v-slot:prepend>
                  <q-icon name="security" color="orange-8" />
                </template>
              </q-input>
            </template>

            <template v-else>
              <div class="text-caption text-grey-7 q-mb-sm">
                Ignora a sugestão do ML e aplica este percentual em todos os anúncios.
                Anúncios em que o ML <b>exige</b> desconto maior que este são ignorados
                (aparecem no log como "fora da trava").
              </div>
              <q-input v-model.number="fixedDiscountPct" type="number" label="Desconto fixo para todos"
                outlined dense bg-color="white" color="indigo-8" class="text-weight-bold text-center"
                min="1" max="99" suffix="% OFF">
                <template v-slot:prepend>
                  <q-icon name="percent" color="indigo-8" />
                </template>
              </q-input>
            </template>
          </div>

          <q-banner v-if="activationTargets.length > 1" rounded class="bg-amber-1 text-amber-10" dense>
            <template v-slot:avatar>
              <q-icon name="speed" color="amber-9" />
            </template>
            Cada campanha roda em uma tarefa separada — acompanhe o progresso individual na tabela.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-1 q-pa-md border-top">
          <q-btn flat label="Cancelar" color="blue-grey-6" v-close-popup class="text-weight-medium" />
          <q-btn unelevated color="orange-8" icon-right="bolt" class="text-weight-bold q-px-md"
            :label="activationTargets.length === 1 ? 'Confirmar e Ativar' : `Ativar ${activationTargets.length} campanhas`"
            :disable="!activeDiscountValid" @click="confirmActivate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- FB-30: dialog de trava obrigatória para auto-ativação -->
    <q-dialog v-model="showAutoTravaDialog" persistent>
      <q-card style="width: 420px; max-width: 94vw;">
        <q-card-section class="row items-center bg-teal-7 text-white q-py-sm">
          <q-icon name="schedule" size="sm" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">Trava de desconto para auto-ativação</span>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <p class="text-body2 text-grey-8">
            A auto-ativação roda diariamente às 09h. O robô só ativa anúncios
            cujo desconto fique <strong>abaixo deste limite</strong>.
            Acima disso, o item é ignorado.
          </p>
          <q-input
            v-model.number="autoTravaPercent"
            type="number"
            label="Trava máxima de desconto (%)"
            min="0.01" max="100" step="0.1"
            suffix="%"
            :rules="[v => (v > 0 && v <= 100) || 'Valor entre 0.01 e 100']"
            outlined dense
            class="q-mt-sm"
            autofocus
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-gutter-x-sm">
          <q-btn flat label="Cancelar" color="grey-7" @click="cancelAutoTrava" />
          <q-btn
            :label="`Ativar com trava de ${autoTravaPercent || '?'}%`"
            color="teal" @click="confirmAutoTrava"
            :disable="!autoTravaPercent || autoTravaPercent <= 0 || autoTravaPercent > 100" />
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
                  :model-value="expandedLogKey === promo.account_id + ':' + promo.id"
                  @update:model-value="v => { expandedLogKey = v ? promo.account_id + ':' + promo.id : null }"
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
                      <template v-for="s in (promoSummary(promo) ? [promoSummary(promo)] : [])" :key="'summary-' + promo.account_id + '-' + promo.id">
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

                    <!-- Painel "Por que itens não foram ativados?" (motivos + como tratar) -->
                    <div v-if="promoSummary(promo)?.breakdown?.length" class="reasons-panel q-pa-sm">
                      <div class="text-caption text-weight-bold text-blue-grey-9 q-mb-xs">
                        <q-icon name="help_outline" size="14px" class="q-mr-xs" />
                        Por que {{ promoSummary(promo).breakdown.reduce((a, b) => a + b.count, 0) }} item(ns) não entraram — e como tratar:
                      </div>
                      <div v-for="b in promoSummary(promo).breakdown" :key="b.code" class="reason-row">
                        <div class="text-caption text-blue-grey-9">
                          <q-badge :label="b.count + 'x'" color="blue-grey-2" text-color="blue-grey-9" class="q-mr-sm text-weight-bold" />
                          <b>{{ b.label }}</b>
                        </div>
                        <div class="text-caption text-grey-7 reason-hint">
                          <q-icon name="subdirectory_arrow_right" size="12px" class="q-mr-xs" />{{ b.hint }}
                        </div>
                      </div>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar } from 'quasar'
import { useStore } from 'src/stores/store'
import {
  activationStatusMeta,
  canSelectPromotion,
  getPromotionTypeMeta,
  normalizePromotion,
  promotionCountTotal,
} from 'src/utils/promotionCapabilities'

const $q = useQuasar()
const authStore = useStore()
const canWrite = computed(() => authStore.canWrite)
const loading = ref(false)
const accountsPromotions = ref([])
let pollInterval = null

const promotionTypeFilter = ref(null)
const listingStatusFilter = ref('all')
const promotionTypeOptions = [
  { label: 'Todos os tipos', value: null },
  { label: 'Campanha tradicional', value: 'DEAL' },
  { label: 'Campanha do seller', value: 'SELLER_CAMPAIGN' },
  { label: 'Smart', value: 'SMART' },
  { label: 'Preço competitivo', value: 'PRICE_MATCHING' },
  { label: 'Ofertas relâmpago', value: 'LIGHTNING' },
  { label: 'Outros tipos', value: 'other' },
]
const listingStatusOptions = [
  { label: 'Ativos e pausados', value: 'all' },
  { label: 'Somente ativos', value: 'active' },
  { label: 'Somente pausados', value: 'paused' },
]

function visiblePromotions(promotions = []) {
  return promotions.filter((promo) => {
      if (promotionTypeFilter.value === 'other') {
        const known = promotionTypeOptions.map((option) => option.value).filter(Boolean)
        if (known.includes(promo.type)) return false
      } else if (promotionTypeFilter.value && promo.type !== promotionTypeFilter.value) {
        return false
      }
      if (listingStatusFilter.value === 'active') return promo.active_count > 0
      if (listingStatusFilter.value === 'paused') return promo.paused_count > 0
      return true
    })
}

const discountModeOptions = computed(() => {
  const canUseFixed = activationTargets.value.length > 0
    && activationTargets.value.every((target) => ['price', 'price_stock'].includes(target.activation_mode))
  const options = [
    { label: 'Aceitar o desconto do ML até um limite (trava)', value: 'suggested' },
  ]
  if (canUseFixed) {
    options.push({ label: 'Aplicar o mesmo desconto em todos os anúncios (fixo)', value: 'fixed' })
  }
  if (!canUseFixed && discountMode.value === 'fixed') discountMode.value = 'suggested'
  return options
})

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

// ── Dialog único de ativação (1 ou N promoções) ────────────────────────────
const showActivateDialog = ref(false)
const activationTargets = ref([])          // [{account_id, account_nickname, promotion_id, promotion_type, name}]
const discountMode = ref('suggested')      // 'suggested' (trava) | 'fixed'
const maxDiscount = ref(15)
const fixedDiscountPct = ref(5)

const showLogsDialog = ref(false)
const expandedLogKey = ref(null)           // foco em um log específico ao abrir pelo chip da linha

// FB-30: dialog de trava obrigatória para auto-ativação
const showAutoTravaDialog = ref(false)
const autoTravaPromo = ref(null)
const autoTravaPercent = ref(null)

const targetAccountsCount = computed(() =>
  new Set(activationTargets.value.map(t => t.account_id)).size
)

const activeDiscountValid = computed(() => {
  const v = discountMode.value === 'fixed' ? fixedDiscountPct.value : maxDiscount.value
  return v > 0 && v <= 99
})

// ── Seleção de promoções (checkboxes) ──────────────────────────────────────
const selectedKeys = ref([])               // ["account_id:promotion_id", ...]

const promoKey = (account, promo) => `${account.account_id}:${promo.id}`
const isSelected = (account, promo) => selectedKeys.value.includes(promoKey(account, promo))
const toggleSelect = (account, promo) => {
  const key = promoKey(account, promo)
  const idx = selectedKeys.value.indexOf(key)
  if (idx >= 0) selectedKeys.value.splice(idx, 1)
  else selectedKeys.value.push(key)
}
const selectedCount = computed(() => selectedKeys.value.length)

const totalElegiveis = computed(() => {
  if (!accountsPromotions.value) return 0;
  let count = 0;
  accountsPromotions.value.forEach(account => {
    account.promotions.forEach(promo => {
      if (canSelectPromotion(promo)) {
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
          account_id: acc.account_id,
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
  { name: 'select', align: 'center', label: '' },
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

    // Snapshot do que estava processando, para avisar o que terminou neste ciclo
    const prevProcessing = new Set()
    ;(accountsPromotions.value || []).forEach(acc =>
      acc.promotions.forEach(p => { if (p.is_processing) prevProcessing.add(`${acc.account_id}:${p.id}`) })
    )

    accountsPromotions.value = (response.data?.data || []).map(account => ({
      ...account,
      promotions: (account.promotions || []).map(normalizePromotion),
    }))
    const visibleKeys = new Set(
      accountsPromotions.value.flatMap(account =>
        account.promotions.map(promo => `${account.account_id}:${promo.id}`),
      ),
    )
    selectedKeys.value = selectedKeys.value.filter(key => visibleKeys.has(key))

    // Toast individual por campanha concluída, com o resumo da execução
    if (prevProcessing.size) {
      accountsPromotions.value.forEach(acc => {
        acc.promotions.forEach(p => {
          const key = `${acc.account_id}:${p.id}`
          if (prevProcessing.has(key) && !p.is_processing) {
            const s = promoSummary(p)
            const parts = []
            if (s?.activated) parts.push(`✅ ${s.activated} ativados`)
            if (s?.rejected) parts.push(`⚠️ ${s.rejected} rejeitados`)
            if (s?.skipped) parts.push(`🛡️ ${s.skipped} fora da trava`)
            $q.notify({
              type: s?.activated ? 'positive' : 'warning',
              icon: 'smart_toy',
              message: `"${p.name || p.id}" concluída${parts.length ? ': ' + parts.join(' · ') : ''}`,
              position: 'bottom-right',
              timeout: 8000,
              actions: [{ label: 'Ver log', color: 'white', handler: () => openLogsFor(acc, p) }],
            })
          }
        })
      })
    }

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
// ATIVAÇÃO (dialog único para 1 ou N promoções)
// ============================================================================
const openActivationDialog = (account, promo) => {
  if (!canSelectPromotion(promo)) return
  maxDiscount.value = promo.max_discount_pct_used != null ? Number(promo.max_discount_pct_used) : 15
  discountMode.value = 'suggested'
  activationTargets.value = [{
    account_id: account.account_id,
    account_nickname: account.account_nickname,
    promotion_id: promo.id,
    promotion_type: promo.type,
    name: promo.name,
    activation_mode: promo.activation_mode,
  }]
  showActivateDialog.value = true
}

const collectEligible = (filterFn = null) => {
  const targets = []
  accountsPromotions.value.forEach(account => {
    account.promotions.forEach(promo => {
      if (canSelectPromotion(promo)) {
        if (!filterFn || filterFn(account, promo)) {
          targets.push({
            account_id: account.account_id,
            account_nickname: account.account_nickname,
            promotion_id: promo.id,
            promotion_type: promo.type,
            name: promo.name,
            activation_mode: promo.activation_mode,
          })
        }
      }
    })
  })
  return targets
}

const openSelectedActivation = () => {
  // Inclui até promoções sem candidatos, se o usuário marcou explicitamente
  const targets = []
  accountsPromotions.value.forEach(account => {
    account.promotions.forEach(promo => {
       if (isSelected(account, promo) && canSelectPromotion(promo)) {
        targets.push({
          account_id: account.account_id,
          account_nickname: account.account_nickname,
          promotion_id: promo.id,
          promotion_type: promo.type,
          name: promo.name,
          activation_mode: promo.activation_mode,
        })
      }
    })
  })
  if (!targets.length) return
  discountMode.value = 'suggested'
  activationTargets.value = targets
  showActivateDialog.value = true
}

const openAllActivation = () => {
  const targets = collectEligible()
  if (!targets.length) {
    $q.notify({ type: 'info', message: 'Nenhuma campanha elegível no momento.', position: 'top' })
    return
  }
  discountMode.value = 'suggested'
  activationTargets.value = targets
  showActivateDialog.value = true
}

const confirmActivate = async () => {
  if (!activeDiscountValid.value) {
    $q.notify({ type: 'warning', message: 'Informe um desconto válido entre 1 e 99%.', position: 'top' })
    return
  }
  const targets = activationTargets.value
  if (!targets.length) return

  if (targets.some(target => !['price', 'price_stock', 'offer_acceptance'].includes(target.activation_mode))) {
    $q.notify({ type: 'warning', message: 'Uma das campanhas selecionadas não possui ação de ativação disponível.', position: 'top' })
    return
  }

  const isFixed = discountMode.value === 'fixed'
  // No modo fixo, a trava assume o próprio percentual: itens em que o ML exige
  // desconto maior que o fixo são ignorados (não dá para ativar abaixo do exigido).
  const trava = isFixed ? parseFloat(fixedDiscountPct.value) : parseFloat(maxDiscount.value)

  try {
    $q.loading.show({ message: targets.length === 1 ? 'Enviando para o robô...' : 'Distribuindo tarefas para os robôs...' })

    if (targets.length === 1) {
      const payload = {
        account_id: targets[0].account_id,
        promotion_id: targets[0].promotion_id,
        promotion_type: targets[0].promotion_type,
        max_discount_pct: trava,
      }
      if (isFixed) payload.fixed_discount_pct = parseFloat(fixedDiscountPct.value)
      await MercadoLivreService.activatePromotions(payload)
    } else {
      const payload = {
        max_discount_pct: trava,
        promotions: targets.map(t => ({
          account_id: t.account_id,
          promotion_id: t.promotion_id,
          promotion_type: t.promotion_type,
        })),
      }
      if (isFixed) payload.fixed_discount_pct = parseFloat(fixedDiscountPct.value)
      await MercadoLivreService.activateAllPromotions(payload)
    }

    showActivateDialog.value = false

    // Marca as promoções enviadas como processing e limpa a seleção
    const sentKeys = new Set(targets.map(t => `${t.account_id}:${t.promotion_id}`))
    accountsPromotions.value.forEach(account => {
      account.promotions.forEach(promo => {
        if (sentKeys.has(`${account.account_id}:${promo.id}`)) promo.is_processing = true
      })
    })
    selectedKeys.value = selectedKeys.value.filter(k => !sentKeys.has(k))

    startPolling()

    $q.notify({
      type: 'positive',
      icon: 'smart_toy',
      message: targets.length === 1
        ? 'Robô iniciado! Acompanhe o progresso na tabela.'
        : `${targets.length} campanhas enviadas! Acompanhe o progresso na tabela.`,
      position: 'top',
      timeout: 4000
    })

  } catch (error) {
    console.error(error)
    const reason = error?.response?.data?.message || error?.response?.data?.error
    $q.notify({ type: 'negative', message: reason || 'Falha ao iniciar a ativação.', position: 'top' })
    loadPromotions(true, true)
  } finally {
    $q.loading.hide()
  }
}

// Abre o histórico de execuções focado em uma promoção específica
const openLogsFor = (account, promo) => {
  expandedLogKey.value = `${account.account_id}:${promo.id}`
  showLogsDialog.value = true
}

// ============================================================================
// HELPERS
// ============================================================================
// FB-30: liga/desliga a reativação automática diária desta promoção.
// Ao ligar exige trava de desconto via dialog. Ao desligar remove a trava.
const toggleAutoActivate = async (promo, active) => {
  if (active) {
    autoTravaPromo.value = promo
    autoTravaPercent.value = promo.auto_max_discount_pct || null
    showAutoTravaDialog.value = true
    return
  }
  // Desligar: limpa a trava e o toggle
  promo.auto_activate = false
  promo.auto_max_discount_pct = null
  try {
    await MercadoLivreService.toggleAutoActivatePromotion(promo.record_id, false)
    $q.notify({
      type: 'positive',
      message: 'Ativação automática desligada.',
      position: 'top',
    })
  } catch (e) {
    promo.auto_activate = true
    $q.notify({ type: 'negative', message: 'Erro ao atualizar: ' + (e?.response?.data?.error || e.message), position: 'top' })
  }
}

const confirmAutoTrava = async () => {
  const promo = autoTravaPromo.value
  const pct = autoTravaPercent.value
  if (!promo || !pct) return
  promo.auto_activate = true
  promo.auto_max_discount_pct = pct
  showAutoTravaDialog.value = false
  try {
    await MercadoLivreService.toggleAutoActivatePromotion(promo.record_id, true, pct)
    $q.notify({
      type: 'positive',
      message: `Ativação automática ligada com trava de ${pct}% — vai rodar sozinha todo dia.`,
      position: 'top',
    })
  } catch (e) {
    promo.auto_activate = false
    promo.auto_max_discount_pct = null
    $q.notify({ type: 'negative', message: 'Erro ao atualizar: ' + (e?.response?.data?.error || e.message), position: 'top' })
  }
}

const cancelAutoTrava = () => {
  showAutoTravaDialog.value = false
  autoTravaPromo.value = null
  autoTravaPercent.value = null
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

.table-responsive { overflow-x: auto; }
.promotions-filters { border: 1px solid #e8edf3; border-radius: 10px; padding: 10px; background: #f8fafc; }
.activation-reason { max-width: 220px; white-space: normal; text-align: left; }

@media (max-width: 600px) {
  .promos-page-header .row { flex-wrap: wrap; gap: 8px; }
  .promos-page-header .q-btn { flex: 1 1 auto; }
  .promo-progress { min-width: 100%; }
  .activation-reason { max-width: 150px; font-size: 10px; }
}

.promo-progress { min-width: 170px; display: inline-block; text-align: right; }
.result-chips { border-radius: 6px; padding: 2px 4px; transition: background .15s; }
.result-chips:hover { background: #f0f4f8; }
.targets-list { max-height: 140px; overflow-y: auto; border: 1px solid #e0e5ea; }
.reasons-panel { background: #fffbf0; border-bottom: 1px solid #f0e6cc; }
.reason-row { padding: 3px 0; }
.reason-row + .reason-row { border-top: 1px dashed #f0e6cc; }
.reason-hint { margin-left: 34px; }
</style>
