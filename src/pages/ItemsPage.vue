<!-- src/pages/ItemsPage.vue -->

<template>
  <q-page class="bg-grey-2">
    <div class="q-pa-md">
      <q-card flat class="bg-white shadow-2 rounded-borders">

        <q-card-section class="bg-white q-py-md q-px-lg border-bottom">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <div class="q-mr-md bg-indigo-6 text-white q-pa-sm rounded-borders shadow-2">
                <q-icon name="inventory_2" size="sm" />
              </div>
              <div>
                <div class="text-caption text-grey-7 text-weight-medium text-uppercase">Gestão de Vendas</div>
                <div class="text-h6 text-grey-9 text-weight-bold" style="line-height: 1.1;">
                  Gestão de Anúncios
                </div>
              </div>
            </div>
            <div class="row q-gutter-sm">
              <q-btn unelevated color="indigo-6" text-color="white" icon="refresh" label="Atualizar"
                @click="refreshData" :loading="loading" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pa-md bg-grey-1 border-bottom">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-md-4">
              <q-input v-model="filters.search" debounce="600" placeholder="Buscar (Título, SKU, MLB)..." outlined dense
                bg-color="white" clearable @update:model-value="resetPagination">
                <template v-slot:prepend><q-icon name="search" class="text-grey-5" /></template>
              </q-input>
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.account" :options="accountOptions" option-value="id" option-label="nickname"
                label="Conta" outlined dense bg-color="white" emit-value map-options multiple use-chips clearable
                @update:model-value="resetPagination" />
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.logistic_type" :options="logisticOptions" option-value="value"
                option-label="label" label="Logística" outlined dense bg-color="white" emit-value map-options multiple
                use-chips clearable @update:model-value="resetPagination" />
            </div>

            <div class="col-12 col-md-2">
              <q-btn flat color="grey-7" icon="filter_list" label="Mais Filtros" class="full-width"
                @click="showAdvancedFilters = !showAdvancedFilters" />
            </div>
          </div>

          <div v-if="showAdvancedFilters" class="q-mt-md">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-md-3">
                <q-select v-model="filters.status" :options="statusOptions" option-value="value" option-label="label"
                  label="Status" outlined dense bg-color="white" emit-value map-options multiple use-chips clearable
                  @update:model-value="resetPagination" />
              </div>

              <div class="col-12 col-md-3">
                <q-select v-model="filters.stockStatus" :options="stockOptions" option-value="value"
                  option-label="label" label="Estoque" outlined dense bg-color="white" emit-value map-options clearable
                  @update:model-value="resetPagination" />
              </div>

              <div class="col-12 col-md-3">
                <q-select v-model="filters.is_flex" :options="flexOptions" option-value="value" option-label="label"
                  label="Flex" outlined dense bg-color="white" emit-value map-options clearable
                  @update:model-value="resetPagination" />
              </div>

              <div class="col-6 col-md-1.5">
                <q-input v-model.number="filters.priceMin" type="number" label="Preço mín" outlined dense
                  bg-color="white" clearable debounce="600" @update:model-value="resetPagination" />
              </div>

              <div class="col-6 col-md-1.5">
                <q-input v-model.number="filters.priceMax" type="number" label="Preço máx" outlined dense
                  bg-color="white" clearable debounce="600" @update:model-value="resetPagination" />
              </div>
            </div>

            <div class="row q-mt-sm q-gutter-x-sm">
              <q-badge color="orange-1" text-color="orange-9" class="cursor-pointer q-py-xs hover-badge"
                @click="setFilterFullNoStock">
                🔥 Full Sem Estoque
              </q-badge>
              <q-badge color="blue-1" text-color="blue-9" class="cursor-pointer q-py-xs hover-badge"
                @click="setFilterOpportunityFlex">
                💰 Oportunidade Flex
              </q-badge>
              <q-space />
              <q-btn flat color="grey-8" icon="filter_alt_off" label="Limpar Tudo" size="sm" @click="clearFilters" />
            </div>
          </div>
        </q-card-section>

        <transition name="slide-fade">
          <q-card-section v-if="showMagicLink" class="q-pa-md bg-orange-1 border-bottom">
            <div class="row items-center q-col-gutter-md">
              <div class="col-12 col-md-auto text-center">
                <q-icon name="warning_amber" color="deep-orange" size="lg" />
              </div>
              <div class="col-12 col-md">
                <div class="text-subtitle1 text-weight-bold text-deep-orange-9">
                  Ação Necessária na conta: {{ selectedAccountName }}
                </div>
                <div class="text-caption text-grey-9">
                  Você está filtrando itens <b>FULL sem estoque</b>. Utilize o link abaixo para acessar a gestão de
                  retirada do Mercado Livre e evitar cobranças de armazenagem prolongada.
                </div>
              </div>
              <div class="col-12 col-md-5">
                <q-input outlined dense readonly bg-color="white" :model-value="magicLinkUrl">
                  <template v-slot:append>
                    <q-btn unelevated color="primary" label="Copiar" icon="content_copy" @click="copyMagicLink"
                      size="sm" class="q-mr-sm" />
                    <q-btn flat round color="grey-7" icon="open_in_new" type="a" :href="magicLinkUrl" target="_blank" />
                  </template>
                </q-input>
              </div>
            </div>
          </q-card-section>
        </transition>

        <q-table :rows="items" :columns="columns" row-key="item_id" flat :loading="loading"
          v-model:pagination="pagination" @request="onRequest" binary-state-sort
          class="sticky-header-table my-custom-table" no-data-label="Nenhum anúncio encontrado.">

          <template v-slot:header="props">
            <q-tr :props="props" class="bg-grey-2 text-grey-8 text-uppercase text-caption">
              <q-th auto-width />
              <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
                {{ col.label }}
              </q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr :props="props" :class="props.expand ? 'bg-indigo-1' : 'hover-row'" class="cursor-pointer">

              <q-td auto-width class="q-py-md">
                <q-btn size="sm" flat round :color="props.expand ? 'indigo' : 'grey-6'" @click.stop="
                  props.expand = !props.expand;
                if (props.expand) ensureItemDetail(props.row)
                  " :icon="props.expand ? 'expand_less' : 'expand_more'" />
              </q-td>

              <q-td key="thumbnail" :props="props" style="width: 70px">
                <div class="relative-position">
                  <q-img :src="props.row.thumbnail" style="height: 50px; width: 50px" fit="contain"
                    class="rounded-borders border-grey" />
                  <div class="absolute-bottom-right" style="transform: translate(20%, 20%);">
                    <q-icon v-if="props.row.status === 'paused'" name="pause_circle" color="orange" size="18px"
                      class="bg-white rounded-borders" />
                    <q-icon v-if="props.row.status === 'active'" name="check_circle" color="positive" size="18px"
                      class="bg-white rounded-borders" />
                  </div>
                </div>
              </q-td>

              <q-td key="title" :props="props" style="max-width: 350px; white-space: normal;">
                <div class="column q-gutter-y-xs">
                  <a :href="props.row.permalink" target="_blank" class="text-grey-9 text-weight-bold hover-link"
                    style="font-size: 13px; line-height: 1.3;">
                    {{ props.row.title }}
                  </a>

                  <div class="row items-center q-gutter-x-sm text-caption">
                    <span v-if="props.row.sku"
                      class="bg-grey-3 text-grey-8 q-px-xs rounded-borders font-mono cursor-pointer"
                      @click.stop="copyText(props.row.sku)">
                      {{ props.row.sku }}
                    </span>

                    <span class="bg-grey-3 text-grey-8 q-px-xs rounded-borders font-mono cursor-pointer"
                      @click.stop="copyText(props.row.item_id)" title="Clique para copiar o MLB">
                      {{ props.row.item_id }}
                    </span>

                    <span class="text-indigo-6 text-weight-bold">
                      <q-icon name="store" size="10px" /> {{ props.row.account_nickname }}
                    </span>

                    <q-badge v-if="props.row.listing_type_id === 'gold_pro'" outline color="yellow-9" label="Premium"
                      size="xs" class="self-start" />
                    <q-badge v-else outline color="grey-6" label="Clássico" size="xs" class="self-start" />

                    <q-badge v-if="props.row.catalog_listing" outline color="indigo" label="CATÁLOGO"
                      class="text-weight-bold" />
                  </div>

                  <div class="row q-gutter-x-md q-mt-xs">
                    <div class="row items-center text-caption">
                      <q-icon name="inventory" size="xs" class="q-mr-xs text-grey-6" />
                      <span :class="props.row.available_quantity > 0 ? 'text-grey-9' : 'text-red text-weight-bold'">
                        {{ props.row.available_quantity }} un
                      </span>
                    </div>
                    <div class="row items-center text-caption">
                      <q-icon name="shopping_cart" size="xs" class="q-mr-xs text-grey-6" />
                      <span class="text-grey-9">{{ props.row.sold_quantity }} vendas</span>
                    </div>
                  </div>

                  <div class="row q-gutter-x-xs q-mt-xs"
                    v-if="getPromotions(props.row).length > 0 || (props.expand && isDetailLoading(props.row))">
                    <q-badge v-if="props.expand && isDetailLoading(props.row)" color="grey-3" text-color="grey-8"
                      class="text-weight-bold q-py-xs">
                      <q-spinner-dots size="14px" class="q-mr-xs" />
                      Carregando promoções...
                    </q-badge>

                    <q-badge v-for="promo in getPromotions(props.row)" :key="promo" color="purple-1"
                      text-color="purple-9" class="text-weight-bold q-py-xs">
                      <q-icon name="local_offer" size="10px" class="q-mr-xs" />
                      {{ promo }}
                    </q-badge>
                  </div>
                </div>
              </q-td>

              <q-td key="sold_quantity" :props="props" align="center">
                <div class="column items-center">
                  <div class="text-subtitle2 text-weight-bold text-grey-9">
                    {{ props.row.sold_quantity }}
                  </div>

                </div>
              </q-td>

              <q-td key="performance_score" :props="props" align="center">
                <div class="cursor-pointer row justify-center relative-position group"
                  @click.stop="openHealthDialog(props.row)">
                  <q-circular-progress show-value font-size="10px" :value="props.row.performance_score || 0" size="45px"
                    :thickness="0.25" :color="getHealthColorName(props.row.performance_score || 0)" track-color="grey-3"
                    class="text-weight-bold">
                    {{ Math.round(props.row.performance_score || 0) }}%
                  </q-circular-progress>



                  <q-tooltip>Clique para ver detalhes da qualidade</q-tooltip>
                </div>
              </q-td>

              <q-td key="logistic_type" :props="props" align="left">
                <div class="column items-start q-gutter-y-xs logi-stack">
                  <!-- 1) Badge principal (Full/Agência/Coleta/etc.) -->
                  <q-badge rounded :color="getLogisticMeta(props.row.logistic_type).color" text-color="white"
                    class="logi-pill">
                    <q-icon :name="getLogisticMeta(props.row.logistic_type).icon" size="14px" class="q-mr-xs" />
                    {{ getLogisticMeta(props.row.logistic_type).label }}

                    <!-- Tooltip NO PRÓPRIO BADGE (sem info repetida) -->
                    <q-tooltip content-class="bg-grey-9 text-white" max-width="320px">
                      <div class="text-body2">
                        {{ getLogisticMeta(props.row.logistic_type).helper }}
                      </div>

                      <div class="q-mt-xs text-caption">
                        <div>logistic_type: {{ props.row.logistic_type || '—' }}</div>
                        <div v-if="props.row.is_full && props.row.logistic_type !== 'fulfillment'"
                          class="q-mt-xs text-warning">
                          Obs: flag Full ativa, mas logistic_type != fulfillment
                        </div>
                      </div>
                    </q-tooltip>
                  </q-badge>

                  <!-- 2) Flex SEMPRE (ativo ou com X) -->
                  <q-badge rounded :outline="getFlexIndicator(props.row).outline"
                    :color="getFlexIndicator(props.row).color" :text-color="getFlexIndicator(props.row).textColor"
                    class="logi-subpill">
                    <q-icon :name="getFlexIndicator(props.row).icon" size="14px" class="q-mr-xs" />
                    {{ getFlexIndicator(props.row).label }}
                  </q-badge>

                  <!-- 3) Flag(s) extras -->
                  <q-badge v-if="props.row.free_shipping" outline
                    :color="getEffectivePrice(props.row) < 79 ? 'deep-orange-7' : 'teal-7'" size="xs" class="q-mt-xs">
                    <q-icon v-if="getEffectivePrice(props.row) < 79" name="warning" size="11px" class="q-mr-xs" />
                    Frete Grátis

                    <q-tooltip v-if="getEffectivePrice(props.row) < 79" class="bg-deep-orange-9 text-white shadow-4"
                      max-width="250px">
                      <div class="text-weight-bold q-mb-xs">Atenção à Margem!</div>
                      Produto abaixo de R$ 79,00 com Frete Grátis ativo. Você pode estar pagando o custo integral do
                      envio.
                    </q-tooltip>
                  </q-badge>
                </div>
              </q-td>

              <q-td key="promotions" :props="props" align="left" class="promo-td">
                <div v-if="getPromotionBadges(props.row).length === 0" class="text-caption text-grey-6">
                  Sem promoção
                </div>

                <div v-else class="column q-gutter-y-xs">
                  <q-badge v-for="p in getPromotionBadges(props.row)" :key="p.key"
                    :color="p.status === 'started' ? 'purple-1' : 'grey-3'"
                    :text-color="p.status === 'started' ? 'purple-9' : 'grey-8'" class="promo-badge">
                    <q-icon name="local_offer" size="12px" class="q-mr-xs" />
                    <span class="promo-label">
                      {{ p.label }}
                      <span v-if="p.discount_pct"> — {{ p.discount_pct }}% OFF</span>
                      <span v-if="p.status && p.status !== 'started'"> ({{ p.status }})</span>
                    </span>

                    <!-- Tooltip com mais detalhes -->
                    <q-tooltip v-if="p.tooltip" max-width="420px">
                      <div class="text-caption">{{ p.tooltip }}</div>
                    </q-tooltip>
                  </q-badge>
                </div>
              </q-td>

              <q-td key="price" :props="props" align="right">
                <div class="column items-end">
                  <div v-if="hasDiscount(props.row)" class="text-strike text-grey-5 text-caption">
                    {{ formatCurrency(getEffectiveRegularPrice(props.row)) }}
                  </div>
                  <div class="text-subtitle1 text-weight-bold text-grey-9">
                    {{ formatCurrency(getEffectivePrice(props.row)) }}
                  </div>
                  <q-badge v-if="hasDiscount(props.row) && getDiscountPct(props.row) != null" color="green-1"
                    text-color="green-9" class="q-mt-xs text-weight-bold text-caption">
                    {{ getDiscountPct(props.row) }}% OFF
                  </q-badge>
                </div>
              </q-td>
            </q-tr>

            <q-tr v-show="props.expand" :props="props">
              <q-td colspan="100%" class="q-pa-none">
                <div class="bg-grey-1 q-pa-md shadow-inner">
                  <div class="row q-col-gutter-lg">
                    <div class="col-12 col-md-8">
                      <div class="text-overline text-grey-7 q-mb-sm">Variações</div>
                      <q-markup-table flat bordered class="bg-white" dense>
                        <thead class="bg-grey-2">
                          <tr>
                            <th class="text-left">Atributo</th>
                            <th class="text-left">SKU</th>
                            <th class="text-center">Estoque</th>
                            <th class="text-right">Preço</th>
                            <th class="text-center">ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="isDetailLoading(props.row)">
                            <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">
                              <q-spinner-dots color="indigo" size="2em" /> Carregando...
                            </td>
                          </tr>
                          <tr v-else-if="getVariations(props.row).length === 0">
                            <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">
                              Sem variações
                            </td>
                          </tr>
                          <tr v-else v-for="v in getVariations(props.row)" :key="v.variation_id || v.id">
                            <td><q-badge color="grey-3" text-color="black">{{ v.attribute_combination || 'Padrão'
                            }}</q-badge></td>
                            <td class="font-mono text-grey-7">{{ v.sku || '-' }}</td>
                            <td class="text-center"
                              :class="v.available_quantity > 0 ? 'text-green-7 text-bold' : 'text-red'">
                              {{ v.available_quantity }}
                            </td>
                            <td class="text-right">{{ formatCurrency(v.price) }}</td>
                            <td class="text-center font-mono text-caption text-grey-5">
                              {{ v.variation_id || v.id }}
                            </td>
                          </tr>
                        </tbody>
                      </q-markup-table>
                    </div>
                    <div class="col-12 col-md-4"
                      v-if="props.row.performance_pending_rules && props.row.performance_pending_rules.length > 0">
                      <div class="text-overline text-red-7 q-mb-sm">Ações Necessárias</div>
                      <q-list dense bordered class="bg-white rounded-borders">

                        <q-item v-for="(rule, idx) in props.row.performance_pending_rules.slice(0, 3)" :key="idx">
                          <q-item-section avatar min-width>
                            <q-icon :name="rule.mode === 'WARNING' ? 'error_outline' : 'lightbulb'"
                              :color="rule.mode === 'WARNING' ? 'red' : 'blue'" size="xs" />
                          </q-item-section>
                          <q-item-section class="text-caption text-grey-9">
                            {{ rule.title || rule.variable_title }}
                          </q-item-section>
                        </q-item>

                        <q-item clickable @click="openHealthDialog(props.row)" class="bg-grey-1">
                          <q-item-section class="text-primary text-caption text-weight-bold text-center">
                            Ver Auditoria Completa ({{ props.row.performance_pending_rules.length }})
                          </q-item-section>
                        </q-item>

                      </q-list>
                    </div>


                  </div>
                </div>
              </q-td>
            </q-tr>

          </template>
        </q-table>
      </q-card>
    </div>

    <q-dialog v-model="showHealthDialog">
      <q-card style="width: 600px; max-width: 95vw;">
        <q-card-section class="row items-center q-pb-none"
          :class="`bg-${getHealthColorName(activeHealthItem?.performance_score || 0)}-1`">
          <div class="text-h6 text-grey-9">Auditoria do Anúncio</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md" :class="`bg-${getHealthColorName(activeHealthItem?.performance_score || 0)}-1`">
          <div class="row items-center no-wrap q-mb-md">
            <q-avatar rounded size="60px" class="q-mr-md bg-white shadow-1">
              <img :src="activeHealthItem?.thumbnail" style="object-fit: contain;">
            </q-avatar>
            <div>
              <div class="text-subtitle2 ellipsis-2-lines" style="line-height: 1.2;">
                {{ activeHealthItem?.title }}
              </div>
              <div class="text-caption text-grey-7 font-mono q-mt-xs">
                MLB: {{ activeHealthItem?.item_id }} | Qualidade: {{ activeHealthItem?.performance_level_wording ||
                  'N/A' }}
              </div>
            </div>
          </div>
          <div class="row items-center q-gutter-x-md">
            <q-linear-progress size="15px" :value="(activeHealthItem?.performance_score || 0) / 100"
              :color="getHealthColorName(activeHealthItem?.performance_score || 0)" rounded class="col">
              <div class="absolute-full flex flex-center">
                <q-badge color="transparent" text-color="white"
                  :label="formatHealth(activeHealthItem?.performance_score)" />
              </div>
            </q-linear-progress>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-none bg-grey-2" style="max-height: 60vh; overflow-y: auto;">
          <div v-if="!activeHealthItem?.performance_details?.buckets?.length" class="text-center q-pa-xl">
            <q-icon name="analytics" size="3em" color="grey-4" class="q-mb-sm" />
            <div class="text-h6 text-grey-6">Detalhes Indisponíveis</div>
            <div class="text-caption text-grey-5">O Mercado Livre ainda não disponibilizou a auditoria completa para
              este
              item ou a sincronização está pendente.</div>
          </div>

          <q-list v-else class="q-pa-sm q-gutter-y-sm">
            <q-expansion-item v-for="(bucket, bIdx) in activeHealthItem.performance_details.buckets"
              :key="'bucket-' + bIdx" class="bg-white shadow-1 rounded-borders overflow-hidden"
              :header-class="bucket.status === 'COMPLETED' ? 'bg-green-1' : (bucket.score >= 50 ? 'bg-orange-1' : 'bg-red-1')"
              expand-separator default-opened>
              <template v-slot:header>
                <q-item-section avatar>
                  <q-icon
                    :name="bucket.status === 'COMPLETED' ? 'check_circle' : (bucket.score >= 50 ? 'warning' : 'error')"
                    :color="bucket.status === 'COMPLETED' ? 'positive' : (bucket.score >= 50 ? 'warning' : 'negative')"
                    size="md" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold text-grey-9">{{ bucket.title || bucket.type }}</q-item-label>
                  <q-item-label caption v-if="bucket.status !== 'COMPLETED'">
                    Nota da seção: <span class="text-weight-bold">{{ Math.round(bucket.score || 0) }}%</span>
                  </q-item-label>
                  <q-item-label caption class="text-positive text-weight-medium" v-else>
                    Tudo perfeito nesta seção!
                  </q-item-label>
                </q-item-section>
              </template>

              <q-separator />

              <q-list separator class="bg-white">
                <template v-for="(variable, vIdx) in bucket.variables" :key="'var-'+vIdx">

                  <q-item v-for="(rule, rIdx) in variable.rules" :key="'rule-' + rIdx" class="q-py-md"
                    :class="rule.status === 'COMPLETED' ? 'opacity-70' : ''">
                    <q-item-section avatar top>
                      <q-icon
                        :name="rule.status === 'COMPLETED' ? 'task_alt' : (rule.mode === 'WARNING' ? 'report_problem' : 'lightbulb')"
                        :color="rule.status === 'COMPLETED' ? 'green-5' : (rule.mode === 'WARNING' ? 'red-6' : 'blue-5')" />
                    </q-item-section>

                    <q-item-section>
                      <q-item-label
                        :class="rule.status === 'COMPLETED' ? 'text-strike text-grey-6' : 'text-weight-bold text-grey-9'">
                        {{ variable.title }}
                      </q-item-label>

                      <q-item-label caption class="q-mt-xs text-grey-7" v-if="rule.wordings?.title">
                        {{ rule.wordings.title }}
                      </q-item-label>

                      <div v-if="rule.status === 'PENDING' && rule.progress != null && rule.progress < 1"
                        class="row items-center q-mt-sm">
                        <q-linear-progress :value="rule.progress" :color="rule.mode === 'WARNING' ? 'red-4' : 'blue-4'"
                          size="8px" rounded class="col" />
                        <span class="q-ml-sm text-caption text-weight-bold"
                          :class="rule.mode === 'WARNING' ? 'text-red-8' : 'text-blue-8'">
                          {{ Math.round(rule.progress * 100) }}%
                        </span>
                      </div>
                    </q-item-section>

                    <q-item-section side v-if="rule.status === 'PENDING' && rule.wordings?.link">
                      <q-btn outline dense unelevated :color="rule.mode === 'WARNING' ? 'red' : 'primary'"
                        :label="rule.wordings.label || 'Resolver'" icon-right="open_in_new" size="sm" class="q-px-sm"
                        type="a" :href="rule.wordings.link" target="_blank" />
                    </q-item-section>
                  </q-item>
                </template>
              </q-list>
            </q-expansion-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar, copyToClipboard } from 'quasar'

const $q = useQuasar()
const items = ref([])
const loading = ref(false)

// Opções dinâmicas (Facets)
const availableAccounts = ref([])
const availableStatuses = ref([])
const availableLogistics = ref([])

const showAdvancedFilters = ref(false)

// --- STATE DOS FILTROS ---
const filters = reactive({
  search: '',
  account: [],
  logistic_type: [],
  status: [], // Vazio = Todos (backend entende)
  stockStatus: null,
  is_flex: null,
  priceMin: null,
  priceMax: null
})

const pagination = ref({
  sortBy: 'sold_quantity', // Mude de 'last_synced_at' para 'sold_quantity'
  descending: true,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0
})

// --- COMPUTEDS: OPÇÕES INTELIGENTES ---
const accountOptions = computed(() => availableAccounts.value)

const logisticOptions = computed(() => {
  return availableLogistics.value.map(l => ({
    label: LOGISTIC_META[l]?.label || l,
    value: l
  }))
})

// Helpers logistica

const getPrimaryLogistic = (row) => {
  const t = row?.logistic_type

  // prioridade: Full > Flex > demais
  if (t === 'fulfillment' || row?.is_full) {
    return { label: 'Full', icon: 'bolt', color: 'green-7', textColor: 'white', helper: 'Estoque no ML' }
  }
  if (t === 'self_service' || row?.is_flex) {
    return { label: 'Flex', icon: 'two_wheeler', color: 'purple-6', textColor: 'white', helper: 'Envio próprio' }
  }
  if (t === 'cross_docking') {
    return { label: 'Coleta', icon: 'local_shipping', color: 'orange-8', textColor: 'white', helper: 'ML coleta no seu CD' }
  }
  if (t === 'drop_off' || t === 'xd_drop_off') {
    return { label: 'Agência', icon: 'store', color: 'blue-grey-7', textColor: 'white', helper: 'Postagem em ponto' }
  }
  return { label: t || '—', icon: 'help', color: 'grey-6', textColor: 'white', helper: '' }
}

const getFlexIndicator = (row) => {
  const active = !!row?.is_flex
  return active
    ? { label: 'Flex', icon: 'two_wheeler', color: 'purple-6', textColor: 'white', outline: false }
    : { label: 'Flex ✕', icon: 'close', color: 'red-2', textColor: 'red-10', outline: true }
}

// Mapeia status do banco para Label bonita
const STATUS_LABELS = {
  active: 'Ativo', paused: 'Pausado', closed: 'Fechado', under_review: 'Em Revisão', inactive: 'Inativo'
}
const statusOptions = computed(() => {
  return availableStatuses.value.map(s => ({
    label: STATUS_LABELS[s] || s,
    value: s
  }))
})

// Opções estáticas
const stockOptions = [
  { label: 'Todos', value: null },
  { label: 'Sem estoque (0)', value: 'zero' },
  { label: 'Com estoque (>0)', value: 'positive' }
]

const flexOptions = [
  { label: 'Todos', value: null },
  { label: 'Flex: Sim', value: true },
  { label: 'Flex: Não', value: false }
]

// --- LINK MÁGICO ---
const magicLinkUrl = "https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment-with-empty-stock"

const showMagicLink = computed(() => {
  // Mostra se: 1 conta selecionada + Logística Full + Sem Estoque
  return filters.account && filters.account.length === 1 &&
    filters.logistic_type.includes('fulfillment') &&
    filters.stockStatus === 'zero'
})

const selectedAccountName = computed(() => {
  if (!filters.account || filters.account.length !== 1) return ''
  const acc = availableAccounts.value.find(a => a.id === filters.account[0])
  return acc ? acc.nickname : 'Conta'
})

const copyMagicLink = () => {
  copyToClipboard(magicLinkUrl)
    .then(() => $q.notify({ type: 'positive', message: 'Link copiado!', icon: 'content_copy' }))
}

// --- MACROS ---
const setFilterFullNoStock = () => {
  filters.logistic_type = ['fulfillment']
  filters.stockStatus = 'zero'
  // Limpa outros conflitantes
  filters.is_flex = null
  refreshData()
}

// Helpers promoções
const toNum = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const calcDiscountPct = (regular, price) => {
  const r = toNum(regular)
  const p = toNum(price)
  if (!r || !p || r <= 0 || p >= r) return 0
  return Math.round(((r - p) / r) * 100)
}

const fmtBRL = (v) => (v != null && v !== '')
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))
  : '—'

const getPromotionBadges = (row) => {
  const promos = Array.isArray(row?.promotions_info) ? row.promotions_info : []
  const fallbackRegular =
    row?.effective_regular_price ?? row?.original_price ?? row?.base_price ?? null

  return promos
    .filter(p => p && typeof p === 'object')
    .map(p => {
      const label = p.name || p.type || 'Promoção'
      const price = p.price
      const regular = p.original_price ?? fallbackRegular
      const discount_pct = calcDiscountPct(regular, price)

      const tooltipParts = [
        `Tipo: ${p.type || '—'}`,
        `Status: ${p.status || '—'}`,
        `De: ${fmtBRL(regular)} · Por: ${fmtBRL(price)}`,
        p.start_date ? `Início: ${p.start_date}` : null,
        p.finish_date ? `Fim: ${p.finish_date}` : null,
        p.id ? `ID: ${p.id}` : null,
      ].filter(Boolean)

      return {
        key: p.id || `${label}-${p.status || ''}-${p.price || ''}`,
        label,
        status: p.status,
        discount_pct,
        tooltip: tooltipParts.join('\n'),
      }
    })
}

const setFilterOpportunityFlex = () => {
  filters.is_flex = false // Não é flex
  filters.status = ['active']
  filters.stockStatus = 'positive' // Tem estoque

  // Tenta selecionar coletas se existir
  if (availableLogistics.value.includes('cross_docking')) {
    filters.logistic_type = ['cross_docking']
  } else {
    filters.logistic_type = []
  }
  refreshData()
}

const clearFilters = () => {
  filters.search = ''
  filters.account = []
  filters.logistic_type = []
  filters.status = []
  filters.stockStatus = null
  filters.is_flex = null
  filters.priceMin = null
  filters.priceMax = null
  refreshData()
}

// --- DATA FETCHING ---
// Função separada apenas para carregar os filtros (Facets)
const loadFilters = async () => {
  try {
    const { data } = await MercadoLivreService.getFacets()
    availableAccounts.value = data.accounts
    availableStatuses.value = data.status || []
    availableLogistics.value = data.logistic_type || []
  } catch (e) {
    console.error('Erro silencioso ao carregar filtros:', e)
    // Não vamos travar a tela se os filtros falharem
  }
}

const refreshData = () => onRequest({ pagination: pagination.value })

const resetPagination = () => { pagination.value.page = 1 }

const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true

  try {
    const params = {
      page,
      page_size: rowsPerPage,
      ordering: descending ? `-${sortBy}` : sortBy,
      search: filters.search || undefined,
      // Arrays
      account: filters.account?.length ? filters.account.join(',') : undefined,
      logistic_type: filters.logistic_type?.length ? filters.logistic_type.join(',') : undefined,
      status: filters.status?.length ? filters.status.join(',') : undefined,
      // Booleanos/Strings
      stock_status: filters.stockStatus || undefined,
      is_flex: filters.is_flex,
      price_min: filters.priceMin,
      price_max: filters.priceMax
    }

    // Limpa undefined
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k])

    const response = await MercadoLivreService.listItems(params)
    items.value = response.data.results || []
    pagination.value.rowsNumber = response.data.count || 0

    // Atualiza estado local da paginacao
    pagination.value.page = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy = sortBy
    pagination.value.descending = descending

  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Falha ao buscar anúncios' })
  } finally {
    loading.value = false
  }
}

// Watcher inteligente com debounce
let timer
watch(filters, () => {
  pagination.value.page = 1
  clearTimeout(timer)
  timer = setTimeout(refreshData, 400)
}, { deep: true })


// --- METADADOS / HELPERS VISUAIS ---
const LOGISTIC_META = {
  fulfillment: { label: 'Full', helper: 'Estoque no ML', icon: 'bolt', color: 'green-7' },
  cross_docking: { label: 'Coleta', helper: 'ML coleta no seu CD', icon: 'local_shipping', color: 'orange-8' },
  drop_off: { label: 'Agência', helper: 'Postagem em ponto', icon: 'store', color: 'grey-7' },
  xd_drop_off: { label: 'Agência XD', helper: 'Postagem Places', icon: 'store', color: 'blue-grey-7' },
  self_service: { label: 'Flex', helper: 'Envio próprio', icon: 'two_wheeler', color: 'purple-6' }
}

const getLogisticMeta = (type) => LOGISTIC_META[type] || { label: type, icon: 'help', color: 'grey' }

// --- ESTADO DO MODAL DE SAÚDE ---
const showHealthDialog = ref(false)
const activeHealthItem = ref(null)

// Função para abrir o modal
const openHealthDialog = (row) => {
  activeHealthItem.value = row
  showHealthDialog.value = true
}

// Helper para pegar a cor baseada na nota (reaproveitando lógica, mas ajustando para Quasar colors)
const getHealthColorName = (score) => {
  const pct = Number(score || 0)
  if (pct >= 99) return 'positive'
  if (pct >= 70) return 'warning'
  return 'negative'
}

// Detalhes Lazy Load
const detailLoading = ref({})
const isDetailLoading = (row) => !!detailLoading.value[row.item_id]
const ensureItemDetail = async (row) => {
  if (row._detail || detailLoading.value[row.item_id]) return
  detailLoading.value[row.item_id] = true
  try {
    const { data } = await MercadoLivreService.getItem(row.item_id)
    row._detail = data
  } catch (e) { console.error(e) }
  finally { detailLoading.value[row.item_id] = false }
}

const getVariations = (row) => row._detail?.variations || []
// Formatters
const formatCurrency = (val) => val ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)) : ''
const formatHealth = (score) =>
  score != null ? `${Math.round(Number(score))}%` : '—'


const getPromotions = (row) => {
  // 1) DETALHE (quando expandiu e carregou)
  const promosInfo = row?._detail?.promotions_info
  if (Array.isArray(promosInfo) && promosInfo.length) {
    const labels = promosInfo
      .map(p => p?.name || p?.type)
      .filter(Boolean)

    return [...new Set(labels)]
  }

  // 2) LISTA (fallback leve)
  const p = row?.active_promotion
  if (p) return [p.name || p.type || 'Promoção'].filter(Boolean)

  if (row?.price_source === 'PROMOTION_INFO') return ['Promoção']
  if (row?.price_source === 'PRICES_API') return ['Oferta']

  return []
}


// Helpers de Preço
const getEffectivePrice = (row) => row.effective_price || row.price
const getEffectiveRegularPrice = (row) => row.effective_regular_price || row.original_price || row.base_price
const hasDiscount = (row) => {
  const reg = getEffectiveRegularPrice(row)
  const eff = getEffectivePrice(row)
  return reg && eff && Number(reg) > Number(eff)
}
const getDiscountPct = (row) => {
  const reg = Number(getEffectiveRegularPrice(row))
  const eff = Number(getEffectivePrice(row))
  return (reg && eff && reg > eff) ? Math.round(((reg - eff) / reg) * 100) : null
}
const copyText = (t) => { copyToClipboard(t); $q.notify('Copiado!') }

const columns = [
  { name: 'thumbnail', align: 'center', label: '', field: 'thumbnail' },
  { name: 'title', align: 'left', label: 'PRODUTO', field: 'title' },
  { name: 'sold_quantity', align: 'center', label: 'VENDAS', field: 'sold_quantity', sortable: true },
  { name: 'performance_score', align: 'center', label: 'QUALIDADE', field: 'performance_score', sortable: true },
  { name: 'logistic_type', align: 'left', label: 'LOGÍSTICA', field: 'logistic_type' },
  { name: 'promotions', align: 'left', label: 'PROMOÇÕES', field: 'promotions_info' },

  { name: 'price', align: 'right', label: 'PREÇO', field: 'effective_price' },
]

onMounted(() => {
  // 1. Dispara o carregamento dos filtros (em paralelo)
  loadFilters()

  // 2. Dispara o carregamento da tabela IMEDIATAMENTE
  refreshData()
})
</script>

<style scoped>
.my-custom-table :deep(tbody tr td) {
  min-height: 65px;
  height: auto;
  vertical-align: top;
}

.promo-td {
  min-width: 260px;
  /* ajuste se quiser mais espaço */
}

.promo-badge {
  font-size: 12px;
  line-height: 1.1;
  padding: 2px 6px;
  width: fit-content;
  max-width: 100%;
}

.promo-label {
  white-space: normal;
  /* permite quebrar linha */
  overflow-wrap: anywhere;
  /* quebra palavras longas */
}

.hover-link:hover {
  text-decoration: underline;
  color: #3f51b5 !important;
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.5px;
}

.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}

.border-grey {
  border: 1px solid #eee;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.hover-badge:hover {
  filter: brightness(0.95);
}

.logi-stack .q-badge {
  width: fit-content;
  max-width: 100%;
}

.logi-pill {
  font-size: 11px;
  padding: 4px 10px;
}

.logi-subpill {
  font-size: 11px;
  padding: 4px 10px;
}
</style>
