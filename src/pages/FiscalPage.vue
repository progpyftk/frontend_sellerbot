<template>
  <q-page class="fiscal-page q-pa-lg">
    <div class="fiscal-container">

      <!-- ══════════════════════════════════════════ CABEÇALHO -->
      <SbPageHeader
        title="Gestão Fiscal & Balanço de NCMs"
        eyebrow="Livro Fiscal & Estoque"
        subtitle="Consolidação de entradas, saídas, saldos quantitativos e movimentação financeira por NCM e CNPJ"
        icon="account_balance"
      >
        <template #actions>
          <div class="row items-center q-gutter-sm">
            <q-btn
              flat
              dense
              color="grey-8"
              icon="refresh"
              label="Atualizar"
              :loading="loading"
              @click="refreshActiveTab"
            />
            <q-btn
              unelevated
              color="teal-8"
              text-color="white"
              icon="cloud_upload"
              label="Importar XMLs"
              @click="activeTab = 'imports'"
            />
          </div>
        </template>
      </SbPageHeader>

      <!-- ══════════════════════════════════════════ NAVEGAÇÃO POR ABAS -->
      <div class="tabs-wrapper q-mb-lg">
        <q-tabs
          v-model="activeTab"
          dense
          no-caps
          align="left"
          active-color="teal-8"
          indicator-color="teal-8"
          class="fiscal-tabs"
        >
          <q-tab name="balance" icon="bar_chart" label="Balanço de NCMs" />
          <q-tab name="normalization" icon="rule" label="Normalização métrica" />
          <q-tab name="documents" icon="receipt_long" label="Todas as NF-e" />
          <q-tab name="imports" icon="upload_file" label="Importação de XMLs / ZIP" />
        </q-tabs>
      </div>

      <!-- ══════════════════════════════════════════ CONTEÚDO DAS ABAS -->
      <q-tab-panels v-model="activeTab" animated class="bg-transparent">

        <!-- ────────────────────────────────────────── ABA 1: BALANÇO DE NCMS -->
        <q-tab-panel name="balance" class="q-pa-none">

          <!-- Filtros do Balanço -->
          <SbCard class="q-mb-md">
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-3">
                <q-select
                  v-model="balanceFilters.cnpj"
                  :options="cnpjOptionsForBalance"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="CNPJ Fiscal (Obrigatório)"
                  bg-color="white"
                  @update:model-value="loadBalance"
                />
              </div>

              <div class="col-12 col-md-3">
                <q-select
                  v-model="balanceFilters.periodPreset"
                  :options="periodPresets"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="Período"
                  bg-color="white"
                  @update:model-value="applyPeriodPreset"
                />
              </div>

              <div class="col-6 col-md-2" v-if="balanceFilters.periodPreset === 'custom'">
                <q-input
                  v-model="balanceFilters.startDate"
                  type="date"
                  dense
                  outlined
                  label="Data Início"
                  bg-color="white"
                  @change="loadBalance"
                />
              </div>

              <div class="col-6 col-md-2" v-if="balanceFilters.periodPreset === 'custom'">
                <q-input
                  v-model="balanceFilters.endDate"
                  type="date"
                  dense
                  outlined
                  label="Data Fim"
                  bg-color="white"
                  @change="loadBalance"
                />
              </div>

              <div class="col-12 col-md-4">
                <q-input
                  v-model="balanceFilters.search"
                  dense
                  outlined
                  clearable
                  placeholder="Buscar por NCM ou descrição..."
                  bg-color="white"
                  @keyup.enter="loadBalance"
                  @clear="loadBalance"
                >
                  <template #append>
                    <q-icon name="search" class="cursor-pointer" @click="loadBalance" />
                  </template>
                </q-input>
              </div>
            </div>
          </SbCard>

          <!-- Banner de Alerta para Unidades Mistas -->
          <transition name="q-transition--fade">
            <div
              v-if="balanceKpis.mixed_units_count > 0"
              class="mixed-units-banner q-pa-md q-mb-md rounded-borders"
            >
              <div class="row items-center no-wrap">
                <q-icon name="warning" size="sm" color="amber-9" class="q-mr-sm" />
                <div class="text-body2 text-grey-9">
                  <strong>Atenção:</strong> Existem <strong>{{ balanceKpis.mixed_units_count }} NCM(s)</strong> com movimentações em unidades de medida diferentes (ex: UN e KG). As quantidades foram discriminadas separadamente por unidade para não somar grandezas incompatíveis.
                </div>
              </div>
            </div>
          </transition>

          <!-- KPIs do Balanço -->
          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12 col-sm-6 col-md-3">
              <SbKpiCard
                label="Total Entradas"
                :value="formatCurrency(balanceKpis.total_value_in)"
                :sub="`${formatQuantity(balanceKpis.total_qty_in)} itens movimentados`"
                variant="green"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <SbKpiCard
                label="Total Saídas / Vendas"
                :value="formatCurrency(balanceKpis.total_value_out)"
                :sub="`${formatQuantity(balanceKpis.total_qty_out)} itens movimentados`"
                variant="red"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <SbKpiCard
                label="Saldo Líquido Financeiro"
                :value="formatCurrency(balanceKpis.net_value)"
                :sub="balanceKpis.net_value >= 0 ? 'Resultado financeiro positivo' : 'Saldo financeiro negativo'"
                :variant="balanceKpis.net_value >= 0 ? 'teal' : 'amber'"
              />
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <SbKpiCard
                label="NCMs Movimentados"
                :value="balanceKpis.total_ncms"
                :sub="`${balanceKpis.total_movements} operações fiscais`"
                variant="indigo"
              />
            </div>
          </div>

          <!-- Tabela do Balanço de NCMs -->
          <SbCard>
            <div class="row items-center justify-between q-pb-md border-bottom">
              <div class="text-subtitle1 text-weight-bold text-grey-9">
                Saldo Fiscal Documentado por NCM
              </div>
              <q-btn
                flat
                dense
                no-caps
                icon="download"
                label="Exportar CSV"
                color="grey-7"
                :disable="balanceRows.length === 0"
                @click="exportBalanceCSV"
              />
            </div>

            <q-table
              :rows="balanceRows"
              :columns="balanceColumns"
              row-key="ncm_unit_key"
              :loading="loadingBalance"
              flat
              :pagination="{ rowsPerPage: 20 }"
              class="balance-table"
            >
              <template #body-cell-ncm="props">
                <q-td :props="props">
                  <div class="row items-center no-wrap">
                    <span class="text-weight-bold font-mono">{{ formatNcm(props.row.ncm) }}</span>
                    <q-badge
                      v-if="props.row.has_mixed_units"
                      color="amber-2"
                      text-color="amber-10"
                      class="q-ml-xs text-bold"
                    >
                      Unidades Mistas
                      <q-tooltip>Possui entradas/saídas em: {{ props.row.units_breakdown?.map(u => u.unit).join(', ') }}</q-tooltip>
                    </q-badge>
                  </div>
                </q-td>
              </template>

              <template #body-cell-description="props">
                <q-td :props="props">
                  <div class="text-ellipsis" style="max-width: 320px;" :title="props.row.description">
                    {{ props.row.description || '—' }}
                  </div>
                  <div v-if="props.row.all_descriptions?.length > 1" class="text-caption text-grey-6">
                    +{{ props.row.all_descriptions.length - 1 }} outras descrições
                  </div>
                </q-td>
              </template>

              <template #body-cell-unit="props">
                <q-td :props="props">
                  <q-chip
                    dense
                    size="sm"
                    :color="props.row.has_mixed_units ? 'amber-2' : 'blue-grey-1'"
                    :text-color="props.row.has_mixed_units ? 'amber-10' : 'blue-grey-8'"
                    class="text-weight-bold"
                  >
                    {{ props.row.unit }}
                    <q-tooltip v-if="props.row.has_mixed_units">
                      Unidades envolvidas: {{ props.row.units_breakdown?.map(u => u.unit).join(', ') }}
                    </q-tooltip>
                  </q-chip>
                </q-td>
              </template>

              <template #body-cell-qty_in="props">
                <q-td :props="props" class="text-green-8 text-weight-medium">
                  <div v-if="!props.row.has_mixed_units">
                    +{{ formatNumber(props.row.qty_in) }}
                  </div>
                  <div v-else>
                    <div v-for="u in props.row.units_breakdown" :key="u.unit" class="text-caption">
                      +{{ formatNumber(u.qty_in) }} <span class="text-grey-6 font-mono">{{ u.unit }}</span>
                    </div>
                  </div>
                </q-td>
              </template>

              <template #body-cell-qty_out="props">
                <q-td :props="props" class="text-red-8 text-weight-medium">
                  <div v-if="!props.row.has_mixed_units">
                    -{{ formatNumber(props.row.qty_out) }}
                  </div>
                  <div v-else>
                    <div v-for="u in props.row.units_breakdown" :key="u.unit" class="text-caption">
                      -{{ formatNumber(u.qty_out) }} <span class="text-grey-6 font-mono">{{ u.unit }}</span>
                    </div>
                  </div>
                </q-td>
              </template>

              <template #body-cell-balance_qty="props">
                <q-td :props="props">
                  <div v-if="!props.row.has_mixed_units">
                    <span v-if="props.row.balance_status !== 'unknown'"
                      :class="[
                        'text-weight-bold',
                        props.row.balance_qty > 0 ? 'text-teal-9' : props.row.balance_qty < 0 ? 'text-red-9' : 'text-grey-7'
                      ]"
                    >
                      {{ formatNumber(props.row.balance_qty) }}
                    </span>
                    <span v-else class="text-amber-9 text-caption">Desconhecido</span>
                  </div>
                  <div v-else>
                    <div
                      v-for="u in props.row.units_breakdown"
                      :key="u.unit"
                      class="text-caption text-weight-bold"
                      :class="u.balance_qty > 0 ? 'text-teal-9' : u.balance_qty < 0 ? 'text-red-9' : 'text-grey-7'"
                    >
                      <span v-if="u.balance_qty !== null && u.balance_qty !== undefined">{{ formatNumber(u.balance_qty) }}</span>
                      <span v-else class="text-amber-9">Desconhecido</span>
                      <span class="text-grey-6 font-mono">{{ u.unit }}</span>
                    </div>
                  </div>
                </q-td>
              </template>

              <template #body-cell-value_in="props">
                <q-td :props="props" class="text-grey-9">
                  {{ formatCurrency(props.row.value_in) }}
                </q-td>
              </template>

              <template #body-cell-value_out="props">
                <q-td :props="props" class="text-grey-9">
                  {{ formatCurrency(props.row.value_out) }}
                </q-td>
              </template>

              <template #body-cell-balance_value="props">
                <q-td :props="props">
                  <span
                    :class="[
                      'text-weight-bold',
                      props.row.balance_value > 0 ? 'text-teal-9' : props.row.balance_value < 0 ? 'text-red-9' : 'text-grey-7'
                    ]"
                  >
                    {{ formatCurrency(props.row.balance_value) }}
                  </span>
                </q-td>
              </template>

              <template #body-cell-actions="props">
                <q-td :props="props" class="text-center">
                  <q-btn
                    flat
                    round
                    dense
                    color="teal-8"
                    icon="visibility"
                    @click="filterDocsByNcm(props.row.ncm)"
                  >
                    <q-tooltip>Ver notas fiscais deste NCM</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <template #no-data>
                <div class="full-width text-center q-pa-xl text-grey-6">
                  <q-icon name="inventory_2" size="3em" color="grey-4" />
                  <div class="text-h6 q-mt-sm">Nenhuma movimentação de NCM encontrada</div>
                  <div class="text-caption">Envie arquivos XML ou ajuste os filtros de período e CNPJ.</div>
                </div>
              </template>
            </q-table>
          </SbCard>

          <!-- Balanço métrico normalizado (FB-38 Fase 3) -->
          <div class="q-mt-lg">
            <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-sm">
              <q-icon name="straighten" class="q-mr-xs" /> Balanço Métrico (normalizado)
            </div>
            <FiscalNormalizedBalance
              ref="normalizedBalanceRef"
              :selected-account-id="balanceFilters.cnpj"
              :start-date="balanceFilters.startDate"
              :end-date="balanceFilters.endDate"
              :search="balanceFilters.search"
              :refresh-token="runsRefreshToken"
            />
          </div>

        </q-tab-panel>

        <!-- ────────────────────────────────────────── ABA 2: NORMALIZAÇÃO MÉTRICA -->
        <q-tab-panel name="normalization" class="q-pa-none">
          <FiscalNormalizationReview :refresh-token="normalizationRefreshToken" />

          <!-- Fila de revisão de runs/regras/itens (FB-38 Fase 1+3) -->
          <div class="q-mt-lg">
            <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-sm">
              <q-icon name="science" class="q-mr-xs" /> Execuções, Regras e Itens
            </div>
            <FiscalNormalizationRuns :refresh-token="runsRefreshToken" />
          </div>
        </q-tab-panel>

        <!-- ────────────────────────────────────────── ABA 3: TODAS AS NF-E -->
        <q-tab-panel name="documents" class="q-pa-none">

          <!-- Filtros de Notas -->
          <SbCard class="q-mb-md">
            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-3">
                <q-select
                  v-model="docFilters.stockEffect"
                  :options="stockEffectOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="Efeito no Estoque"
                  bg-color="white"
                  @update:model-value="loadDocuments(1)"
                />
              </div>

              <div class="col-12 col-md-3">
                <q-select
                  v-model="docFilters.documentStatus"
                  :options="documentStatusOptions"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="Status da Nota"
                  bg-color="white"
                  @update:model-value="loadDocuments(1)"
                />
              </div>

              <div class="col-12 col-md-3">
                <q-select
                  v-model="docFilters.fiscalAccount"
                  :options="cnpjOptionsForDocs"
                  emit-value
                  map-options
                  dense
                  outlined
                  label="CNPJ Fiscal"
                  bg-color="white"
                  @update:model-value="loadDocuments(1)"
                />
              </div>

              <div class="col-12 col-md-2">
                <q-input
                  v-model="docFilters.ncm"
                  dense
                  outlined
                  clearable
                  label="Filtrar por NCM"
                  bg-color="white"
                  @keyup.enter="loadDocuments(1)"
                  @clear="loadDocuments(1)"
                />
              </div>

              <div class="col-12 col-md-4">
                <q-input
                  v-model="docFilters.search"
                  dense
                  outlined
                  clearable
                  placeholder="Chave de 44 dígitos, número ou participante..."
                  bg-color="white"
                  @keyup.enter="loadDocuments(1)"
                  @clear="loadDocuments(1)"
                >
                  <template #append>
                    <q-icon name="search" class="cursor-pointer" @click="loadDocuments(1)" />
                  </template>
                </q-input>
              </div>
            </div>
          </SbCard>

          <!-- Tabela de Documentos -->
          <SbCard>
            <q-table
              :rows="documents"
              :columns="documentColumns"
              row-key="id"
              :loading="loadingDocs"
              v-model:pagination="docsPagination"
              @request="onDocsPaginationRequest"
              flat
              class="docs-table"
            >
              <template #body-cell-number="props">
                <q-td :props="props">
                  <div class="text-weight-bold">
                    NF-e {{ props.row.number || 'S/N' }}
                  </div>
                  <div class="text-caption text-grey-6 font-mono">
                    Série {{ props.row.series || '1' }}
                  </div>
                </q-td>
              </template>

              <template #body-cell-issued_at="props">
                <q-td :props="props">
                  {{ formatDate(props.row.issued_at) }}
                </q-td>
              </template>

              <template #body-cell-issuer="props">
                <q-td :props="props">
                  <div class="text-weight-medium text-ellipsis" style="max-width: 220px;">
                    {{ props.row.issuer_name || 'Emitente não informado' }}
                  </div>
                  <div class="text-caption text-grey-6 font-mono">
                    {{ formatCnpj(props.row.issuer_cnpj) }}
                  </div>
                </q-td>
              </template>

              <template #body-cell-recipient="props">
                <q-td :props="props">
                  <div class="text-weight-medium text-ellipsis" style="max-width: 220px;">
                    {{ props.row.recipient_name || 'Destinatário não informado' }}
                  </div>
                  <div class="text-caption text-grey-6 font-mono">
                    {{ formatCnpj(props.row.recipient_cnpj) }}
                  </div>
                </q-td>
              </template>

              <template #body-cell-total_value="props">
                <q-td :props="props" class="text-weight-bold text-grey-9">
                  {{ formatCurrency(props.row.total_value) }}
                </q-td>
              </template>

              <template #body-cell-stock_effect="props">
                <q-td :props="props">
                  <q-chip
                    dense
                    size="sm"
                    :color="getStockEffectBadge(props.row.stock_effect).color"
                    :text-color="getStockEffectBadge(props.row.stock_effect).textColor"
                    class="text-weight-bold"
                  >
                    {{ getStockEffectBadge(props.row.stock_effect).label }}
                    <q-tooltip v-if="props.row.stock_effect_reason">{{ props.row.stock_effect_reason }}</q-tooltip>
                  </q-chip>
                </q-td>
              </template>

              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    :color="props.row.document_status === 'imported' ? 'green-2' : props.row.document_status === 'cancelled' ? 'red-2' : 'amber-2'"
                    :text-color="props.row.document_status === 'imported' ? 'green-10' : props.row.document_status === 'cancelled' ? 'red-10' : 'amber-10'"
                    class="text-bold"
                  >
                    {{ props.row.document_status === 'imported' ? 'Importada' : props.row.document_status === 'cancelled' ? 'Cancelada' : 'Revisão' }}
                  </q-badge>
                </q-td>
              </template>

              <template #body-cell-actions="props">
                <q-td :props="props" class="text-center">
                  <q-btn
                    flat
                    round
                    dense
                    color="teal-8"
                    icon="description"
                    @click="openDocumentDetail(props.row.id)"
                  >
                    <q-tooltip>Ver detalhes e itens da NF-e</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <template #no-data>
                <div class="full-width text-center q-pa-xl text-grey-6">
                  <q-icon name="receipt" size="3em" color="grey-4" />
                  <div class="text-h6 q-mt-sm">Nenhuma nota fiscal encontrada</div>
                  <div class="text-caption">Ajuste os filtros de busca ou envie novos XMLs.</div>
                </div>
              </template>
            </q-table>
          </SbCard>

        </q-tab-panel>

        <!-- ────────────────────────────────────────── ABA 3: IMPORTAÇÃO DE XMLS / ZIP -->
        <q-tab-panel name="imports" class="q-pa-none">

          <!-- Área de Upload -->
          <div class="row q-col-gutter-lg q-mb-lg">
            <div class="col-12 col-md-6">
              <SbCard class="upload-card">
                <div class="row items-center q-mb-md">
                  <q-icon name="folder_zip" size="md" color="teal-8" class="q-mr-sm" />
                  <div>
                    <div class="text-subtitle1 text-weight-bold text-grey-9">Importação em Lote (.ZIP)</div>
                    <div class="text-caption text-grey-6">Recomendado para centenas ou milhares de XMLs</div>
                  </div>
                </div>

                <div
                  class="dropzone-box"
                  :class="{ 'dropzone-box--active': isZipDragging }"
                  @dragover.prevent="isZipDragging = true"
                  @dragleave.prevent="isZipDragging = false"
                  @drop.prevent="handleZipDrop"
                >
                  <q-file
                    :model-value="zipFiles"
                    @update:model-value="onZipPick"
                    multiple
                    use-chips
                    accept=".zip"
                    outlined
                    dense
                    class="full-width"
                    label="Selecione ou arraste arquivos .zip (pode adicionar em etapas)"
                  >
                    <template #prepend>
                      <q-icon name="attach_file" />
                    </template>
                  </q-file>

                  <div class="text-caption text-grey-6 q-mt-sm text-center">
                    Limite: até 250 MB comprimido / 10.000 XMLs por arquivo. Você pode anexar vários .zip em etapas (selecione, depois selecione mais) e enviá-los juntos. Remova um item pelo X do chip. O arquivo original é descartado com segurança após a extração.
                  </div>

                  <div class="row items-center justify-between q-mt-md">
                    <div class="text-caption text-grey-7">
                      <span v-if="zipFiles && zipFiles.length">{{ zipFiles.length }} arquivo(s) .zip anexado(s)</span>
                      <span v-else>Nenhum .zip anexado</span>
                    </div>
                    <div class="row q-gutter-sm">
                      <q-btn
                        flat
                        color="grey-7"
                        icon="cleaning_services"
                        label="Limpar"
                        no-caps
                        :disable="!zipFiles || zipFiles.length === 0"
                        @click="clearZipFiles"
                      />
                      <q-btn
                        unelevated
                        color="teal-8"
                        text-color="white"
                        icon="upload"
                        label="Enviar Lote(s) ZIP"
                        :disable="!zipFiles || zipFiles.length === 0 || uploadingZip"
                        :loading="uploadingZip"
                        @click="submitZipUpload"
                      />
                    </div>
                  </div>
                </div>
              </SbCard>
            </div>

            <div class="col-12 col-md-6">
              <SbCard class="upload-card">
                <div class="row items-center q-mb-md">
                  <q-icon name="description" size="md" color="teal-8" class="q-mr-sm" />
                  <div>
                    <div class="text-subtitle1 text-weight-bold text-grey-9">Upload de XMLs Avulsos</div>
                    <div class="text-caption text-grey-6">Selecione múltiplos arquivos .xml de uma vez</div>
                  </div>
                </div>

                <div class="dropzone-box">
                  <q-file
                    v-model="xmlFiles"
                    multiple
                    accept=".xml"
                    outlined
                    dense
                    use-chips
                    class="full-width"
                    label="Selecione múltiplos arquivos XML"
                  >
                    <template #prepend>
                      <q-icon name="post_add" />
                    </template>
                  </q-file>

                  <div class="text-caption text-grey-6 q-mt-sm text-center">
                    Suporta seleção de dezenas de XMLs (NF-e mod 55 ou eventos de cancelamento).
                  </div>

                  <div class="row justify-end q-mt-md">
                    <q-btn
                      unelevated
                      color="teal-8"
                      text-color="white"
                      icon="cloud_upload"
                      label="Processar XMLs"
                      :disable="!xmlFiles || xmlFiles.length === 0 || uploadingXmls"
                      :loading="uploadingXmls"
                      @click="submitXmlsUpload"
                    />
                  </div>
                </div>
              </SbCard>
            </div>
          </div>

          <!-- Lote Ativo em Processamento -->
          <transition name="q-transition--slide-down">
            <SbCard v-if="activeBatch" class="q-mb-lg border-teal">
              <div class="row items-center justify-between q-mb-md">
                <div class="row items-center">
                  <q-spinner-dots color="teal-8" size="sm" class="q-mr-sm" v-if="activeBatch.status === 'processing'" />
                  <q-icon name="check_circle" color="positive" size="sm" class="q-mr-sm" v-else-if="activeBatch.status === 'completed'" />
                  <div>
                    <div class="text-subtitle1 text-weight-bold text-grey-9">
                      Processamento do Lote: {{ activeBatch.file_name }}
                    </div>
                    <div class="text-caption text-grey-6">
                      Status: <strong>{{ activeBatch.status }}</strong> — Criado em {{ formatDate(activeBatch.created_at) }}
                    </div>
                  </div>
                </div>

                <q-btn flat dense round icon="refresh" color="grey-7" @click="pollActiveBatch" />
              </div>

              <!-- Barra de Progresso -->
              <q-linear-progress
                :value="activeBatch.progress?.percentage / 100 || 0"
                color="teal-8"
                track-color="teal-1"
                rounded
                size="10px"
                class="q-mb-md"
              />

              <!-- Contadores do Lote -->
              <div class="row q-col-gutter-sm text-center">
                <div class="col-6 col-sm-2">
                  <div class="batch-kpi-box">
                    <div class="text-caption text-grey-6">Total Arquivos</div>
                    <div class="text-h6 text-weight-bold text-grey-9">{{ activeBatch.total_files }}</div>
                  </div>
                </div>
                <div class="col-6 col-sm-2">
                  <div class="batch-kpi-box">
                    <div class="text-caption text-grey-6">Processados</div>
                    <div class="text-h6 text-weight-bold text-grey-9">{{ activeBatch.processed_files }}</div>
                  </div>
                </div>
                <div class="col-6 col-sm-2">
                  <div class="batch-kpi-box text-green-9">
                    <div class="text-caption text-grey-6">Importados</div>
                    <div class="text-h6 text-weight-bold text-positive">{{ activeBatch.imported_files }}</div>
                  </div>
                </div>
                <div class="col-6 col-sm-2">
                  <div class="batch-kpi-box text-grey-8">
                    <div class="text-caption text-grey-6">Duplicados</div>
                    <div class="text-h6 text-weight-bold text-grey-7">{{ activeBatch.duplicated_files }}</div>
                  </div>
                </div>
                <div class="col-6 col-sm-2">
                  <div class="batch-kpi-box text-red-9">
                    <div class="text-caption text-grey-6">Inválidos</div>
                    <div class="text-h6 text-weight-bold text-negative">{{ activeBatch.invalid_files }}</div>
                  </div>
                </div>
                <div class="col-6 col-sm-2">
                  <div class="batch-kpi-box text-amber-9">
                    <div class="text-caption text-grey-6">Em Revisão</div>
                    <div class="text-h6 text-weight-bold text-amber-9">{{ activeBatch.review_files }}</div>
                  </div>
                </div>
              </div>

              <div class="row justify-end q-mt-md">
                <q-btn
                  flat
                  no-caps
                  color="teal-8"
                  label="Ver Lista de Arquivos deste Lote"
                  icon="list"
                  @click="openBatchFilesDialog(activeBatch.id)"
                />
              </div>
            </SbCard>
          </transition>

          <!-- Histórico de Lotes Anteriores -->
          <SbCard>
            <div class="text-subtitle1 text-weight-bold text-grey-9 q-mb-md">
              Histórico de Lotes de Importação
            </div>

            <q-table
              :rows="importBatches"
              :columns="batchColumns"
              row-key="id"
              :loading="loadingBatches"
              flat
              class="batches-table"
            >
              <template #body-cell-file_name="props">
                <q-td :props="props">
                  <div class="text-weight-bold text-grey-9">{{ props.row.file_name }}</div>
                  <div class="text-caption text-grey-6">ID: #{{ props.row.id }}</div>
                </q-td>
              </template>

              <template #body-cell-created_at="props">
                <q-td :props="props">
                  {{ formatDate(props.row.created_at) }}
                </q-td>
              </template>

              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    dense
                    size="sm"
                    :color="props.row.status === 'completed' ? 'green-2' : props.row.status === 'processing' ? 'teal-2' : 'red-2'"
                    :text-color="props.row.status === 'completed' ? 'green-10' : props.row.status === 'processing' ? 'teal-10' : 'red-10'"
                    class="text-weight-bold"
                  >
                    {{ props.row.status }}
                  </q-chip>
                </q-td>
              </template>

              <template #body-cell-counts="props">
                <q-td :props="props">
                  <div class="row items-center q-gutter-xs">
                    <q-badge color="green-1" text-color="green-9" class="text-bold">
                      +{{ props.row.imported_files }} ok
                    </q-badge>
                    <q-badge color="grey-2" text-color="grey-8" class="text-bold" v-if="props.row.duplicated_files">
                      {{ props.row.duplicated_files }} dup
                    </q-badge>
                    <q-badge color="red-1" text-color="red-9" class="text-bold" v-if="props.row.invalid_files">
                      {{ props.row.invalid_files }} err
                    </q-badge>
                  </div>
                </q-td>
              </template>

              <template #body-cell-actions="props">
                <q-td :props="props" class="text-center">
                  <q-btn
                    flat
                    round
                    dense
                    color="teal-8"
                    icon="list"
                    @click="openBatchFilesDialog(props.row.id)"
                  >
                    <q-tooltip>Ver arquivos do lote</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </SbCard>

        </q-tab-panel>

      </q-tab-panels>

      <!-- ══════════════════════════════════════════ MODAL DETALHE DA NF-E -->
      <q-dialog v-model="showDocDetailDialog" max-width="900px">
        <q-card style="width: 900px; max-width: 95vw;" class="rounded-borders">
          <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
            <div class="row items-center">
              <q-icon name="receipt" size="sm" color="teal-8" class="q-mr-sm" />
              <div>
                <div class="text-h6 text-weight-bold text-grey-9">
                  Detalhes da NF-e {{ selectedDoc?.number || 'S/N' }}
                </div>
                <div class="text-caption text-grey-6 font-mono">
                  Chave: {{ selectedDoc?.access_key }}
                </div>
              </div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section v-if="selectedDoc" class="q-pa-md">
            <!-- Informações Gerais -->
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-sm-6">
                <div class="info-block">
                  <div class="text-caption text-grey-6">Emitente</div>
                  <div class="text-weight-bold">{{ selectedDoc.issuer_name || '—' }}</div>
                  <div class="text-caption font-mono">{{ formatCnpj(selectedDoc.issuer_cnpj) }}</div>
                </div>
              </div>
              <div class="col-12 col-sm-6">
                <div class="info-block">
                  <div class="text-caption text-grey-6">Destinatário</div>
                  <div class="text-weight-bold">{{ selectedDoc.recipient_name || '—' }}</div>
                  <div class="text-caption font-mono">{{ formatCnpj(selectedDoc.recipient_cnpj) }}</div>
                </div>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mb-lg">
              <div class="col-6 col-sm-3">
                <div class="info-block">
                  <div class="text-caption text-grey-6">Data de Emissão</div>
                  <div class="text-weight-medium">{{ formatDate(selectedDoc.issued_at) }}</div>
                </div>
              </div>
              <div class="col-6 col-sm-3">
                <div class="info-block">
                  <div class="text-caption text-grey-6">Valor Total</div>
                  <div class="text-weight-bold text-teal-9">{{ formatCurrency(selectedDoc.total_value) }}</div>
                </div>
              </div>
              <div class="col-6 col-sm-3">
                <div class="info-block">
                  <div class="text-caption text-grey-6">Efeito no Estoque</div>
                  <q-badge :color="getStockEffectBadge(selectedDoc.stock_effect).color">
                    {{ getStockEffectBadge(selectedDoc.stock_effect).label }}
                  </q-badge>
                </div>
              </div>
              <div class="col-6 col-sm-3">
                <div class="info-block">
                  <div class="text-caption text-grey-6">Status da Nota</div>
                  <q-badge color="grey-3" text-color="grey-9">{{ selectedDoc.document_status }}</q-badge>
                </div>
              </div>
            </div>

            <!-- Tabela de Itens da NF-e -->
            <div class="text-subtitle2 text-weight-bold q-mb-sm text-grey-9">
              Itens da Nota Fiscal ({{ selectedDoc.items?.length || 0 }})
            </div>

            <q-table
              :rows="selectedDoc.items || []"
              :columns="docItemColumns"
              row-key="id"
              dense
              flat
              bordered
              :pagination="{ rowsPerPage: 10 }"
              class="items-detail-table q-mb-md"
            >
              <template #body-cell-ncm="props">
                <q-td :props="props" class="font-mono text-weight-bold">
                  {{ formatNcm(props.row.ncm) }}
                </q-td>
              </template>
              <template #body-cell-commercial_quantity="props">
                <q-td :props="props" class="text-weight-medium">
                  {{ formatNumber(props.row.commercial_quantity) }} {{ props.row.commercial_unit }}
                </q-td>
              </template>
              <template #body-cell-commercial_unit_value="props">
                <q-td :props="props">
                  {{ formatCurrency(props.row.commercial_unit_value) }}
                </q-td>
              </template>
              <template #body-cell-product_value="props">
                <q-td :props="props" class="text-weight-bold">
                  {{ formatCurrency(props.row.product_value) }}
                </q-td>
              </template>
            </q-table>

            <!-- Eventos Fiscais se houver -->
            <div v-if="selectedDoc.events?.length" class="q-mt-md">
              <div class="text-subtitle2 text-weight-bold q-mb-sm text-red-9">
                Eventos Fiscais / Cancelamento
              </div>
              <div v-for="evt in selectedDoc.events" :key="evt.id" class="q-pa-sm bg-red-1 rounded-borders text-caption text-red-10 q-mb-xs">
                <strong>{{ evt.event_type }}:</strong> Protocolo {{ evt.protocol_number }} em {{ formatDate(evt.event_datetime) }} — {{ evt.justification || 'Sem justificativa' }}
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- ══════════════════════════════════════════ MODAL ARQUIVOS DO LOTE -->
      <q-dialog v-model="showBatchFilesDialog" max-width="800px">
        <q-card style="width: 800px; max-width: 95vw;" class="rounded-borders">
          <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
            <div class="text-h6 text-weight-bold text-grey-9">
              Arquivos do Lote #{{ selectedBatchId }}
            </div>
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>

          <q-card-section class="q-pa-md">
            <q-table
              :rows="batchFiles"
              :columns="batchFileColumns"
              row-key="id"
              :loading="loadingBatchFiles"
              dense
              flat
              :pagination="{ rowsPerPage: 15 }"
            >
              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    dense
                    size="sm"
                    :color="props.row.status === 'imported' ? 'green-2' : props.row.status === 'duplicate' ? 'grey-3' : 'red-2'"
                    :text-color="props.row.status === 'imported' ? 'green-10' : props.row.status === 'duplicate' ? 'grey-9' : 'red-10'"
                    class="text-weight-bold"
                  >
                    {{ props.row.status }}
                  </q-chip>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-dialog>

    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useQuasar } from "quasar";
import SbPageHeader from "src/components/common/SbPageHeader.vue";
import SbCard from "src/components/common/SbCard.vue";
import SbKpiCard from "src/components/common/SbKpiCard.vue";
import FiscalNormalizationReview from "src/components/fiscal/FiscalNormalizationReview.vue";
import FiscalNormalizationRuns from "src/components/fiscal/FiscalNormalizationRuns.vue";
import FiscalNormalizedBalance from "src/components/fiscal/FiscalNormalizedBalance.vue";
import FiscalService from "src/services/FiscalService";

const $q = useQuasar();

const activeTab = ref("balance");
const loading = ref(false);
const normalizationRefreshToken = ref(0);
const runsRefreshToken = ref(0);
const normalizedBalanceRef = ref(null);

// ────────────────────────────────────────── ESTADO DO BALANÇO (ABA 1)
const loadingBalance = ref(false);
const balanceRows = ref([]);
const balanceKpis = ref({
  total_qty_in: 0,
  total_qty_out: 0,
  total_value_in: 0,
  total_value_out: 0,
  net_value: 0,
  total_ncms: 0,
  mixed_units_count: 0,
  total_movements: 0,
  quantity_status: "known",
  balance_status: "known",
});

const balanceFilters = ref({
  cnpj: null,
  periodPreset: "all",
  startDate: "",
  endDate: "",
  search: "",
});

const cnpjOptionsForBalance = ref([]);
const cnpjOptionsForDocs = ref([{ label: "Todos os CNPJs", value: null }]);
const periodPresets = [
  { label: "Todo o Histórico", value: "all" },
  { label: "Este Mês", value: "this_month" },
  { label: "Mês Anterior", value: "last_month" },
  { label: "Últimos 3 Meses", value: "last_3_months" },
  { label: "Ano Atual", value: "this_year" },
  { label: "Personalizado", value: "custom" },
];

const balanceColumns = [
  { name: "ncm", label: "NCM", field: "ncm", align: "left", sortable: true },
  { name: "description", label: "Descrição Principal", field: "description", align: "left" },
  { name: "unit", label: "Unid.", field: "unit", align: "center", sortable: true },
  { name: "qty_in", label: "Entradas (Qtd)", field: "qty_in", align: "right", sortable: true },
  { name: "qty_out", label: "Saídas (Qtd)", field: "qty_out", align: "right", sortable: true },
  { name: "balance_qty", label: "Saldo Fiscal Documentado", field: "balance_qty", align: "right", sortable: true },
  { name: "value_in", label: "Entradas (R$)", field: "value_in", align: "right", sortable: true },
  { name: "value_out", label: "Saídas (R$)", field: "value_out", align: "right", sortable: true },
  { name: "actions", label: "Ações", align: "center" },
  {
    name: "balance_value",
    label: "Saldo Financeiro",
    field: "balance_value",
    align: "right",
    sortable: true,
    classes: "balance-financial-column",
    headerClasses: "balance-financial-column",
  },
];

// ────────────────────────────────────────── ESTADO DAS NOTAS (ABA 2)
const loadingDocs = ref(false);
const documents = ref([]);
const docsPagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });
const docFilters = ref({
  stockEffect: null,
  documentStatus: null,
  ncm: "",
  search: "",
  fiscalAccount: null,
});

const stockEffectOptions = [
  { label: "Todos os Efeitos", value: null },
  { label: "Entrada (Compra)", value: "entry" },
  { label: "Saída (Venda)", value: "exit" },
  { label: "Transferência", value: "transfer" },
  { label: "Devolução / Retorno", value: "return" },
  { label: "Sem Efeito de Estoque", value: "no_effect" },
  { label: "Cancelada", value: "cancelled" },
  { label: "Requer Revisão", value: "needs_review" },
];

const documentStatusOptions = [
  { label: "Todos os Status", value: null },
  { label: "Importada", value: "imported" },
  { label: "Cancelada", value: "cancelled" },
  { label: "Requer Revisão", value: "needs_review" },
];

const documentColumns = [
  { name: "number", label: "Número / Série", align: "left" },
  { name: "issued_at", label: "Emissão", align: "left" },
  { name: "issuer", label: "Emitente", align: "left" },
  { name: "recipient", label: "Destinatário", align: "left" },
  { name: "total_value", label: "Valor Total", align: "right" },
  { name: "stock_effect", label: "Efeito Estoque", align: "center" },
  { name: "status", label: "Status", align: "center" },
  { name: "actions", label: "Ações", align: "center" },
];

const showDocDetailDialog = ref(false);
const selectedDoc = ref(null);

const docItemColumns = [
  { name: "item_number", label: "#", field: "item_number", align: "center" },
  { name: "product_description", label: "Descrição", field: "product_description", align: "left" },
  { name: "ncm", label: "NCM", field: "ncm", align: "left" },
  { name: "cfop", label: "CFOP", field: "cfop", align: "center" },
  { name: "commercial_quantity", label: "Quantidade", align: "right" },
  { name: "commercial_unit_value", label: "Valor Unit.", align: "right" },
  { name: "product_value", label: "Valor Total", align: "right" },
];

// ────────────────────────────────────────── ESTADO DE IMPORTAÇÕES (ABA 3)
const zipFiles = ref([]);
const isZipDragging = ref(false);
const uploadingZip = ref(false);
const xmlFiles = ref([]);
const uploadingXmls = ref(false);

const activeBatch = ref(null);
const importBatches = ref([]);
const loadingBatches = ref(false);
const trackedBatchIds = ref([]);
let batchPollingTimer = null;

const batchColumns = [
  { name: "file_name", label: "Lote / Arquivo", align: "left" },
  { name: "created_at", label: "Data Envio", align: "left" },
  { name: "total_files", label: "Total XMLs", field: "total_files", align: "center" },
  { name: "counts", label: "Resultado", align: "left" },
  { name: "status", label: "Status", align: "center" },
  { name: "actions", label: "Ações", align: "center" },
];

const showBatchFilesDialog = ref(false);
const selectedBatchId = ref(null);
const batchFiles = ref([]);
const loadingBatchFiles = ref(false);

const batchFileColumns = [
  { name: "filename", label: "Nome do Arquivo", field: "filename", align: "left" },
  { name: "status", label: "Status", align: "center" },
  { name: "error_message", label: "Mensagem / Detalhe", field: "error_message", align: "left" },
];

// ────────────────────────────────────────── MÉTODOS DE DADOS

async function loadCnpjs() {
  try {
    const res = await FiscalService.getCnpjs();
    const list = res.data?.results || res.data || [];
    const formatted = list.map((c) => ({
      label: `${formatCnpj(c.cnpj)} — ${c.razao_social || 'CNPJ Fiscal'}`,
      value: c.id,
      cnpj: c.cnpj,
      razao_social: c.razao_social,
    }));
    cnpjOptionsForBalance.value = formatted;
    cnpjOptionsForDocs.value = [
      { label: "Todos os CNPJs", value: null },
      ...formatted,
    ];
    if (formatted.length > 0 && !balanceFilters.value.cnpj) {
      balanceFilters.value.cnpj = formatted[0].value;
      loadBalance();
    }
  } catch (err) {
    console.error("Erro ao carregar CNPJs:", err);
  }
}

async function loadBalance() {
  if (!balanceFilters.value.cnpj && cnpjOptionsForBalance.value.length > 0) {
    balanceFilters.value.cnpj = cnpjOptionsForBalance.value[0].value;
  }
  if (!balanceFilters.value.cnpj) return;
  loadingBalance.value = true;
  try {
    const params = {
      fiscal_account_id: balanceFilters.value.cnpj || undefined,
      start_date: balanceFilters.value.startDate || undefined,
      end_date: balanceFilters.value.endDate || undefined,
      search: balanceFilters.value.search || undefined,
    };
    const res = await FiscalService.getNcmBalance(params);
    balanceKpis.value = res.data.kpis || {};
    balanceRows.value = (res.data.results || []).map((r) => ({
      ...r,
      ncm_unit_key: r.ncm,
    }));
  } catch (err) {
    console.error("Erro ao carregar balanço de NCMs:", err);
    $q.notify({ type: "negative", message: "Erro ao carregar balanço de NCMs." });
  } finally {
    loadingBalance.value = false;
  }
}

async function loadDocuments(page = 1) {
  loadingDocs.value = true;
  try {
    const params = {
      page,
      page_size: docsPagination.value.rowsPerPage,
      stock_effect: docFilters.value.stockEffect || undefined,
      document_status: docFilters.value.documentStatus || undefined,
      ncm: docFilters.value.ncm || undefined,
      search: docFilters.value.search || undefined,
      fiscal_account: docFilters.value.fiscalAccount || undefined,
    };
    const res = await FiscalService.getDocuments(params);
    documents.value = res.data.results || [];
    docsPagination.value.page = page;
    docsPagination.value.rowsNumber = res.data.count || 0;
  } catch (err) {
    console.error("Erro ao carregar notas fiscais:", err);
    $q.notify({ type: "negative", message: "Erro ao carregar notas fiscais." });
  } finally {
    loadingDocs.value = false;
  }
}

function onDocsPaginationRequest(props) {
  docsPagination.value = props.pagination;
  loadDocuments(props.pagination.page);
}

async function openDocumentDetail(docId) {
  try {
    const res = await FiscalService.getDocumentDetail(docId);
    selectedDoc.value = res.data;
    showDocDetailDialog.value = true;
  } catch (err) {
    $q.notify({ type: "negative", message: "Erro ao abrir detalhes da NF-e." });
  }
}

function filterDocsByNcm(ncmCode) {
  docFilters.value.ncm = ncmCode;
  activeTab.value = "documents";
  loadDocuments(1);
}

async function loadImportBatches() {
  loadingBatches.value = true;
  try {
    const res = await FiscalService.getImports();
    importBatches.value = res.data.results || [];
  } catch (err) {
    console.error("Erro ao carregar lotes de importação:", err);
  } finally {
    loadingBatches.value = false;
  }
}

async function submitOneZip(file, zipIndex, totalZips) {
  let stagingUploaded = false;
  try {
    $q.notify({
      type: "info",
      message: `Enviando ZIP para processamento assíncrono (${zipIndex}/${totalZips}): ${file.name}...`,
      timeout: 2500,
    });
    const signedRes = await FiscalService.getStagingUploadUrl(file.name);
    const { url, object } = signedRes.data;
    await FiscalService.uploadToStagingUrl(url, file);
    stagingUploaded = true;

    const batchRes = await FiscalService.submitStagingBatch(file.name, object);
    const batch = batchRes.data;
    trackedBatchIds.value = [...new Set([...trackedBatchIds.value, batch.id])];
    activeBatch.value = batch;
    startPollingBatch();
    await loadImportBatches();
    return batch;
  } catch (stagingErr) {
    if (stagingUploaded) throw stagingErr;
    console.warn(`Upload via staging falhou para ${file.name}, tentando fallback multipart:`, stagingErr);
    const res = await FiscalService.uploadFiles([file]);
    const batch = res.data;
    trackedBatchIds.value = [...new Set([...trackedBatchIds.value, batch.id])];
    activeBatch.value = batch;
    startPollingBatch();
    await loadImportBatches();
    return batch;
  }
}

async function submitZipUpload() {
  if (!zipFiles.value || zipFiles.value.length === 0) return;
  uploadingZip.value = true;
  trackedBatchIds.value = [];
  const zipsToUpload = Array.isArray(zipFiles.value) ? [...zipFiles.value] : [zipFiles.value];
  const totalZips = zipsToUpload.length;

  try {
    const results = await Promise.allSettled(
      zipsToUpload.map((file, index) => submitOneZip(file, index + 1, totalZips))
    );
    const succeeded = results.filter((result) => result.status === "fulfilled");
    const failedFiles = results
      .map((result, index) => (result.status === "rejected" ? zipsToUpload[index] : null))
      .filter(Boolean);

    zipFiles.value = failedFiles;
    if (succeeded.length) {
      await loadImportBatches();
      loadBalance();
      loadDocuments(1);
    }
    if (failedFiles.length) {
      $q.notify({
        type: succeeded.length ? "warning" : "negative",
        message: `${succeeded.length} ZIP(s) enviados; ${failedFiles.length} falharam. Os arquivos com erro permanecem selecionados.`,
      });
    } else {
      zipFiles.value = [];
      $q.notify({
        type: "positive",
        message: `${succeeded.length} arquivo(s) ZIP enviados e processando em lotes separados.`,
      });
    }
  } finally {
    uploadingZip.value = false;
  }
}

async function submitXmlsUpload() {
  if (!xmlFiles.value?.length) return;
  uploadingXmls.value = true;
  const filesToUpload = [...xmlFiles.value];
  const CHUNK_SIZE = 15;
  const totalChunks = Math.ceil(filesToUpload.length / CHUNK_SIZE);

  try {
    for (let i = 0; i < filesToUpload.length; i += CHUNK_SIZE) {
      const chunk = filesToUpload.slice(i, i + CHUNK_SIZE);
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      const currentProcessed = Math.min(i + CHUNK_SIZE, filesToUpload.length);

      $q.notify({
        type: "info",
        message: `Processando pacote ${chunkNum}/${totalChunks} (${currentProcessed} de ${filesToUpload.length} XMLs)...`,
        timeout: 2500,
      });

      const res = await FiscalService.uploadFiles(chunk);
      activeBatch.value = res.data;
    }

    xmlFiles.value = [];
    $q.notify({
      type: "positive",
      message: `${filesToUpload.length} arquivo(s) XML enviados e processados com sucesso!`,
    });
    loadImportBatches();
    loadBalance();
    loadDocuments(1);
  } catch (err) {
    console.error("Erro ao enviar XMLs:", err);
    $q.notify({
      type: "negative",
      message: "Erro ao enviar XMLs: " + (err.response?.data?.detail || err.message),
    });
  } finally {
    uploadingXmls.value = false;
  }
}

function fileKey(f) {
  return `${f.name}|${f.size}|${f.lastModified}`;
}

function dedupeZip(arr) {
  const seen = new Set();
  const out = [];
  for (const f of arr) {
    const k = fileKey(f);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(f);
    }
  }
  return out;
}

/**
 * Acumula .zip anexados em etapas (o q-file com v-model substituiria a seleção).
 * Detecta adição (seletor nativo) vs remoção (chip X) pelo conjunto de arquivos.
 */
function onZipPick(newFiles) {
  if (!newFiles || newFiles.length === 0) {
    zipFiles.value = [];
    return;
  }
  const existingKeys = new Set((zipFiles.value || []).map(fileKey));
  const hasNew = newFiles.some((f) => !existingKeys.has(fileKey(f)));
  if (hasNew) {
    zipFiles.value = dedupeZip([...(zipFiles.value || []), ...newFiles]);
    $q.notify({
      type: "info",
      message: `${zipFiles.value.length} arquivo(s) .zip anexado(s).`,
      timeout: 1500,
    });
  } else {
    zipFiles.value = newFiles;
  }
}

function clearZipFiles() {
  zipFiles.value = [];
}

function handleZipDrop(e) {
  isZipDragging.value = false;
  const dropped = Array.from(e.dataTransfer?.files || []).filter((f) => f.name.toLowerCase().endsWith(".zip"));
  if (dropped.length > 0) {
    zipFiles.value = dedupeZip([...(zipFiles.value || []), ...dropped]);
    $q.notify({ type: "info", message: `${dropped.length} arquivo(s) .zip adicionado(s).` });
  } else {
    $q.notify({ type: "warning", message: "Por favor solte um ou mais arquivos .zip válidos." });
  }
}

async function pollActiveBatch() {
  const batchIds = trackedBatchIds.value.length
    ? [...trackedBatchIds.value]
    : activeBatch.value?.id
      ? [activeBatch.value.id]
      : [];
  if (!batchIds.length) return;
  try {
    const results = await Promise.allSettled(batchIds.map((batchId) => FiscalService.getImportDetail(batchId)));
    const details = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value.data);
    const active = details.find((batch) => batch.id === activeBatch.value?.id) || details.at(-1);
    if (active) activeBatch.value = active;
    await loadImportBatches();
    if (details.length && details.every((batch) => ["completed", "failed"].includes(batch.status))) {
      trackedBatchIds.value = [];
      stopPollingBatch();
      loadBalance();
      loadDocuments(1);
    }
  } catch (err) {
    console.error("Erro ao consultar status do lote:", err);
  }
}

function startPollingBatch() {
  stopPollingBatch();
  batchPollingTimer = setInterval(pollActiveBatch, 3000);
}

function stopPollingBatch() {
  if (batchPollingTimer) {
    clearInterval(batchPollingTimer);
    batchPollingTimer = null;
  }
}

async function openBatchFilesDialog(batchId) {
  selectedBatchId.value = batchId;
  showBatchFilesDialog.value = true;
  loadingBatchFiles.value = true;
  try {
    const res = await FiscalService.getImportFiles(batchId);
    batchFiles.value = res.data.results || [];
  } catch (err) {
    $q.notify({ type: "negative", message: "Erro ao carregar arquivos do lote." });
  } finally {
    loadingBatchFiles.value = false;
  }
}

function applyPeriodPreset(preset) {
  const now = new Date();
  if (preset === "all") {
    balanceFilters.value.startDate = "";
    balanceFilters.value.endDate = "";
  } else if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    balanceFilters.value.startDate = start.toISOString().slice(0, 10);
    balanceFilters.value.endDate = now.toISOString().slice(0, 10);
  } else if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    balanceFilters.value.startDate = start.toISOString().slice(0, 10);
    balanceFilters.value.endDate = end.toISOString().slice(0, 10);
  } else if (preset === "last_3_months") {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    balanceFilters.value.startDate = start.toISOString().slice(0, 10);
    balanceFilters.value.endDate = now.toISOString().slice(0, 10);
  } else if (preset === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1);
    balanceFilters.value.startDate = start.toISOString().slice(0, 10);
    balanceFilters.value.endDate = now.toISOString().slice(0, 10);
  }
  if (preset !== "custom") {
    loadBalance();
  }
}

function refreshActiveTab() {
  loadCnpjs();
  if (activeTab.value === "balance") {
    loadBalance();
    normalizedBalanceRef.value?.load();
  } else if (activeTab.value === "normalization") {
    normalizationRefreshToken.value += 1;
    runsRefreshToken.value += 1;
  } else if (activeTab.value === "documents") loadDocuments(1);
  else if (activeTab.value === "imports") loadImportBatches();
}

function exportBalanceCSV() {
  if (!balanceRows.value.length) return;
  const headers = ["NCM", "Descricao", "Unidade", "Qtd_Entrada", "Qtd_Saida", "Saldo_Fiscal_Documentado_Qtd", "Valor_Entrada_R$", "Valor_Saida_R$", "Saldo_Financeiro_R$"];
  const rows = balanceRows.value.flatMap((r) => {
    const units = r.has_mixed_units ? r.units_breakdown : [r];
    return units.map((u) => [
      r.ncm,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      u.unit,
      u.qty_in,
      u.qty_out,
      u.balance_qty,
      u.value_in ?? r.value_in,
      u.value_out ?? r.value_out,
      u.balance_value ?? r.balance_value,
    ]);
  });
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `balanco_ncms_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ────────────────────────────────────────── FORMATAÇÃO
function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatQuantity(val) {
  return val === null || val === undefined ? "—" : formatNumber(val);
}

function formatDate(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatCnpj(cnpj) {
  if (!cnpj || cnpj.length !== 14) return cnpj || "—";
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatNcm(ncm) {
  if (!ncm || ncm.length !== 8) return ncm || "—";
  return ncm.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1.$2.$3");
}

function getStockEffectBadge(effect) {
  const map = {
    entry: { label: "Entrada", color: "green-1", textColor: "green-9" },
    exit: { label: "Saída", color: "blue-1", textColor: "blue-9" },
    transfer: { label: "Transferência", color: "purple-1", textColor: "purple-9" },
    return: { label: "Devolução", color: "orange-1", textColor: "orange-9" },
    no_effect: { label: "Sem Efeito", color: "grey-2", textColor: "grey-8" },
    cancelled: { label: "Cancelada", color: "red-1", textColor: "red-9" },
    needs_review: { label: "Revisão", color: "amber-1", textColor: "amber-9" },
  };
  return map[effect] || { label: effect || "Outro", color: "grey-2", textColor: "grey-8" };
}

onMounted(() => {
  loadCnpjs();
  loadBalance();
  loadDocuments(1);
  loadImportBatches();
});

onUnmounted(() => {
  stopPollingBatch();
});
</script>

<style lang="scss" scoped>
.fiscal-page {
  background: #f8fafc;
  min-height: 100vh;
}

.fiscal-container {
  max-width: 1400px;
  margin: 0 auto;
}

.tabs-wrapper {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 4px 8px;
}

.fiscal-tabs {
  :deep(.q-tab__label) {
    font-size: 14px;
    font-weight: 600;
  }
}

.mixed-units-banner {
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.border-bottom {
  border-bottom: 1px solid #f1f5f9;
}

.border-teal {
  border: 1px solid #14b8a6;
}

.dropzone-box {
  padding: 20px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.2s ease;

  &--active {
    border-color: #0d9488;
    background: #f0fdf4;
  }
}

.batch-kpi-box {
  background: #f8fafc;
  padding: 10px 6px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.info-block {
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.balance-table {
  :deep(.q-table__middle) {
    overflow-x: auto;
  }

  :deep(.balance-financial-column) {
    position: sticky;
    right: 0;
    z-index: 2;
    min-width: 150px;
    background: #ffffff;
    box-shadow: -5px 0 10px rgba(15, 23, 42, 0.08);
  }

  :deep(thead .balance-financial-column) {
    z-index: 3;
    background: #f8fafc;
  }
}
</style>
