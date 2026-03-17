<template>
  <q-page class="items-page">
    <div class="q-pa-md">
      <q-card flat class="bg-white shadow-2 rounded-borders">

        <q-card-section class="items-page-header">
          <div class="row items-center justify-between">
            <div class="row items-center">
              <div class="header-icon-items q-mr-md">
                <q-icon name="inventory_2" size="sm" />
              </div>
              <div>
                <div class="header-eyebrow-items">Gestão de Vendas</div>
                <div class="header-title-items">Gestão de Anúncios</div>
              </div>
            </div>
            <div class="row q-gutter-sm">
              <q-btn unelevated color="teal-7" text-color="white" icon="refresh" label="Atualizar"
                @click="refreshData" :loading="loading" />
            </div>
          </div>
        </q-card-section>


        <q-card-section class="q-pa-lg border-bottom">

          <div class="row q-col-gutter-md items-center">

            <div class="col-12 col-md-4">
              <q-input v-model="filters.search" debounce="600" placeholder="Buscar por Título, SKU ou MLB..." outlined
                dense bg-color="white" clearable @update:model-value="resetPagination" class="shadow-1"
                color="orange-8">
                <template v-slot:prepend><q-icon name="search" color="orange-8" /></template>
              </q-input>
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.account" :options="accountOptions" option-value="id" option-label="nickname"
                label="Conta do Seller" outlined dense bg-color="white" emit-value map-options multiple clearable
                @update:model-value="resetPagination" class="shadow-1" color="orange-8">
                <template v-slot:prepend><q-icon name="storefront" size="xs" color="blue-grey-8" /></template>
                <template v-slot:selected-item="scope">
                  <q-chip removable dense @remove="scope.removeAtIndex(scope.index)" outline color="blue-grey-8"
                    class="q-ma-none q-mr-xs text-weight-medium bg-white">
                    {{ scope.opt.nickname || scope.opt }}
                  </q-chip>
                </template>
                <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                  <q-item v-bind="itemProps" @click="toggleOption(opt)">
                    <q-item-section side><q-checkbox :model-value="selected" @update:model-value="toggleOption(opt)"
                        color="orange-8" /></q-item-section>
                    <q-item-section><q-item-label>{{ opt.nickname }}</q-item-label></q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-3">
              <q-select v-model="filters.logistic_type" :options="logisticOptions" option-value="value"
                option-label="label" label="Logística Principal" outlined dense bg-color="white" emit-value map-options
                multiple clearable @update:model-value="resetPagination" class="shadow-1" color="orange-8">
                <template v-slot:prepend><q-icon name="local_shipping" size="xs" color="blue-grey-8" /></template>
                <template v-slot:selected-item="scope">
                  <q-chip removable dense @remove="scope.removeAtIndex(scope.index)" outline color="blue-grey-8"
                    class="q-ma-none q-mr-xs text-weight-medium bg-white">
                    {{ scope.opt.label || scope.opt }}
                  </q-chip>
                </template>
                <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                  <q-item v-bind="itemProps" @click="toggleOption(opt)">
                    <q-item-section side><q-checkbox :model-value="selected" @update:model-value="toggleOption(opt)"
                        color="orange-8" /></q-item-section>
                    <q-item-section><q-item-label>{{ opt.label }}</q-item-label></q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>

            <div class="col-12 col-md-2">
              <q-btn unelevated class="full-width text-weight-bold shadow-1 transition-scale"
                :color="showAdvancedFilters ? 'orange-8' : 'white'"
                :text-color="showAdvancedFilters ? 'white' : 'orange-9'"
                :icon="showAdvancedFilters ? 'expand_less' : 'tune'"
                :label="showAdvancedFilters ? 'Ocultar Filtros' : 'Filtros Avançados'"
                @click="showAdvancedFilters = !showAdvancedFilters"
                style="height: 40px; border: 1px solid var(--q-orange-8);" />
            </div>
          </div>

          <q-slide-transition>
            <div v-show="showAdvancedFilters" class="q-mt-lg">
              <div class="row q-col-gutter-md">

                <div class="col-12 col-md-4">
                  <div class="bg-grey-1 q-pa-md rounded-borders custom-shadow h-100">
                    <div class="text-caption text-weight-bold text-blue-grey-9 q-mb-md text-uppercase letter-spacing-1">
                      Visibilidade & Status</div>
                    <div class="column q-gutter-y-md">
                      <q-select v-model="filters.status" :options="statusOptions" option-value="value"
                        option-label="label" label="Status do Anúncio" outlined dense bg-color="white" emit-value
                        map-options multiple clearable @update:model-value="resetPagination" color="orange-8">
                        <template v-slot:selected-item="scope"><q-chip removable dense
                            @remove="scope.removeAtIndex(scope.index)" outline color="blue-grey-8"
                            class="q-ma-none q-mr-xs bg-white">{{ scope.opt.label || scope.opt }}</q-chip></template>
                        <template v-slot:option="{ itemProps, opt, selected, toggleOption }"><q-item v-bind="itemProps"
                            @click="toggleOption(opt)"><q-item-section side><q-checkbox :model-value="selected"
                                @update:model-value="toggleOption(opt)"
                                color="orange-8" /></q-item-section><q-item-section><q-item-label>{{ opt.label
                                }}</q-item-label></q-item-section></q-item></template>
                      </q-select>

                      <q-select v-model="filters.listing_type" :options="listingTypeOptions" option-value="value"
                        option-label="label" label="Tipo de Exposição" outlined dense bg-color="white" emit-value
                        map-options multiple clearable @update:model-value="resetPagination" color="orange-8">
                        <template v-slot:selected-item="scope"><q-chip removable dense
                            @remove="scope.removeAtIndex(scope.index)" outline color="blue-grey-8"
                            class="q-ma-none q-mr-xs bg-white">{{ scope.opt.label || scope.opt }}</q-chip></template>
                        <template v-slot:option="{ itemProps, opt, selected, toggleOption }"><q-item v-bind="itemProps"
                            @click="toggleOption(opt)"><q-item-section side><q-checkbox :model-value="selected"
                                @update:model-value="toggleOption(opt)"
                                color="orange-8" /></q-item-section><q-item-section><q-item-label>{{ opt.label
                                }}</q-item-label></q-item-section></q-item></template>
                      </q-select>

                      <q-select v-model="filters.catalog_listing" :options="booleanOptions" option-value="value"
                        option-label="label" label="Anúncio de Catálogo?" outlined dense bg-color="white" emit-value
                        map-options clearable @update:model-value="resetPagination" color="orange-8">
                        <template v-slot:prepend><q-icon name="menu_book" size="xs" color="grey-6" /></template>
                      </q-select>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-md-4">
                  <div class="bg-grey-1 q-pa-md rounded-borders custom-shadow h-100">
                    <div class="text-caption text-weight-bold text-blue-grey-9 q-mb-md text-uppercase letter-spacing-1">
                      Estoque &
                      Envios</div>
                    <div class="column q-gutter-y-md">
                      <q-select v-model="filters.stockStatus" :options="stockOptions" option-value="value"
                        option-label="label" label="Status do Estoque" outlined dense bg-color="white" emit-value
                        map-options clearable @update:model-value="resetPagination" color="orange-8">
                        <template v-slot:prepend><q-icon name="layers" size="xs" color="grey-6" /></template>
                      </q-select>
                      <q-select v-model="filters.free_shipping" :options="booleanOptions" option-value="value"
                        option-label="label" label="Oferece Frete Grátis?" outlined dense bg-color="white" emit-value
                        map-options clearable @update:model-value="resetPagination" color="orange-8">
                        <template v-slot:prepend><q-icon name="local_mall" size="xs" color="grey-6" /></template>
                      </q-select>
                      <q-select v-model="filters.is_flex" :options="booleanOptions" option-value="value"
                        option-label="label" label="Ativo no Flex?" outlined dense bg-color="white" emit-value
                        map-options clearable @update:model-value="resetPagination" color="orange-8">
                        <template v-slot:prepend><q-icon name="two_wheeler" size="xs" color="grey-6" /></template>
                      </q-select>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-md-4">
                  <div class="bg-grey-1 q-pa-md rounded-borders custom-shadow h-100">
                    <div class="text-caption text-weight-bold text-blue-grey-9 q-mb-md text-uppercase letter-spacing-1">
                      Performance & Preço</div>
                    <div class="column q-gutter-y-md">
                      <div class="row q-col-gutter-sm">
                        <div class="col-6">
                          <q-input v-model.number="filters.priceMin" type="number" label="Preço Mín (R$)" outlined dense
                            bg-color="white" clearable debounce="600" @update:model-value="resetPagination"
                            color="orange-8">
                            <template v-slot:prepend><q-icon name="attach_money" size="xs" color="grey-6" /></template>
                          </q-input>
                        </div>
                        <div class="col-6">
                          <q-input v-model.number="filters.priceMax" type="number" label="Preço Máx (R$)" outlined dense
                            bg-color="white" clearable debounce="600" @update:model-value="resetPagination"
                            color="orange-8" />
                        </div>
                      </div>
                      <q-input v-model.number="filters.soldMin" type="number" label="Vendas Acumuladas (Mín)" outlined
                        dense bg-color="white" clearable debounce="600" @update:model-value="resetPagination"
                        color="orange-8">
                        <template v-slot:prepend><q-icon name="trending_up" size="xs" color="grey-6" /></template>
                      </q-input>
                      <q-input v-model.number="filters.healthMax" type="number" label="Qualidade MÁXIMA (%)" outlined
                        dense bg-color="white" clearable debounce="600" @update:model-value="resetPagination"
                        color="orange-8">
                        <template v-slot:prepend><q-icon name="health_and_safety" size="xs" color="grey-6" /></template>
                        <template v-slot:append><span class="text-caption text-grey">%</span></template>
                      </q-input>
                      <q-input v-model.number="filters.discountMin" type="number" label="Desconto Mínimo (%)" outlined
                        dense bg-color="white" clearable debounce="600" @update:model-value="resetPagination"
                        color="orange-8" hint="Ex: 15 → anúncios com ≥15% de desconto ativo">
                        <template v-slot:prepend><q-icon name="local_offer" size="xs" color="orange-7" /></template>
                        <template v-slot:append><span class="text-caption text-grey">%</span></template>
                      </q-input>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </q-slide-transition>

          <div class="row q-mt-xl items-center">
            <div class="text-subtitle2 text-weight-bold text-blue-grey-9 q-mr-md">
              Smart Views:
            </div>

            <div class="flex items-center wrap q-gutter-sm">
              <q-btn outline rounded dense size="13px" class="q-px-md text-weight-medium smart-btn text-deep-orange-9"
                icon="warning" label="Risco de Margem" @click="setFilterMarginRisk" />

              <q-btn outline rounded dense size="13px" class="q-px-md text-weight-medium smart-btn text-orange-9"
                icon="rocket_launch" label="Validado p/ Premium" @click="setFilterPremiumUpgrade" />

              <q-btn outline rounded dense size="13px" class="q-px-md text-weight-medium smart-btn text-red-9"
                icon="error_outline" label="Curva A / Baixa Saúde" @click="setFilterPoorHealthHighSales" />

              <q-btn outline rounded dense size="13px" class="q-px-md text-weight-medium smart-btn text-orange-8"
                icon="inventory_2" label="Full Sem Estoque" @click="setFilterFullNoStock" />

              <q-btn outline rounded dense size="13px" class="q-px-md text-weight-medium smart-btn text-blue-grey-8"
                icon="electric_moped" label="Oportunidade Flex" @click="setFilterOpportunityFlex" />
            </div>

            <q-space />

            <q-btn flat dense color="grey-6" icon="filter_alt_off" label="Limpar Filtros" @click="clearFilters"
              class="hover-underline text-weight-medium" />
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
                  retirada do
                  Mercado Livre e evitar cobranças de armazenagem.
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

        <!-- ── Barra de Ações em Massa ──────────────────────────── -->
        <transition name="slide-fade">
          <div v-if="selectedItems.length" class="bulk-bar q-px-lg q-py-sm row items-center q-gutter-sm">
            <q-icon name="check_box" color="indigo-6" size="18px" />
            <span class="text-weight-bold text-indigo-8">{{ selectedItems.length }} selecionado(s)</span>
            <q-separator vertical inset class="q-mx-xs" />
            <q-btn unelevated dense color="indigo-6" text-color="white" icon="sell"
              label="Preços" size="sm" class="q-px-md" @click="showBulkPriceDialog = true" />
            <q-btn unelevated dense color="orange-7" text-color="white" icon="local_offer"
              label="Promoção" size="sm" class="q-px-md" @click="showBulkPromoDialog = true" />
            <q-btn unelevated dense color="teal-7" text-color="white" icon="rocket_launch"
              label="Tipo Anúncio" size="sm" class="q-px-md" @click="showBulkListingTypeDialog = true" />
            <q-space />
            <q-btn flat dense color="grey-6" icon="close" label="Limpar seleção" size="sm"
              @click="selectedItems = []" />
          </div>
        </transition>

        <q-table :rows="items" :columns="columns" row-key="item_id" flat :loading="loading"
          v-model:pagination="pagination" @request="onRequest" binary-state-sort
          class="sticky-header-table my-custom-table" no-data-label="Nenhum anúncio encontrado.">
          <template v-slot:header="props">
            <q-tr :props="props" class="bg-grey-2 text-grey-8 text-uppercase text-caption">
              <q-th auto-width>
                <q-checkbox :model-value="allSelected" :indeterminate="someSelected"
                  @update:model-value="toggleAll" color="indigo-6" dense />
              </q-th>
              <q-th auto-width />
              <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
                {{ col.label }}
              </q-th>
            </q-tr>
          </template>

          <template v-slot:body="props">
            <q-tr :props="props"
              :class="[isSelected(props.row) ? 'bg-indigo-1' : (props.expand ? 'bg-indigo-1' : 'hover-row')]"
              class="cursor-pointer">

              <q-td auto-width>
                <q-checkbox :model-value="isSelected(props.row)" @update:model-value="toggleSelect(props.row)"
                  @click.stop color="indigo-6" dense />
              </q-td>

              <q-td auto-width class="q-py-md">
                <q-btn size="sm" flat round :color="props.expand ? 'indigo' : 'grey-6'"
                  @click.stop="props.expand = !props.expand; if (props.expand) ensureItemDetail(props.row)"
                  :icon="props.expand ? 'expand_less' : 'expand_more'" />
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
                      <q-spinner-dots size="14px" class="q-mr-xs" /> Carregando promoções...
                    </q-badge>
                    <q-badge v-for="promo in getPromotions(props.row)" :key="promo" color="purple-1"
                      text-color="purple-9" class="text-weight-bold q-py-xs">
                      <q-icon name="local_offer" size="10px" class="q-mr-xs" /> {{ promo }}
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
                  <q-badge rounded :color="getLogisticMeta(props.row.logistic_type).color" text-color="white"
                    class="logi-pill">
                    <q-icon :name="getLogisticMeta(props.row.logistic_type).icon" size="14px" class="q-mr-xs" />
                    {{ getLogisticMeta(props.row.logistic_type).label }}
                    <q-tooltip content-class="bg-grey-9 text-white" max-width="320px">
                      <div class="text-body2">{{ getLogisticMeta(props.row.logistic_type).helper }}</div>
                      <div class="q-mt-xs text-caption">
                        <div>logistic_type: {{ props.row.logistic_type || '—' }}</div>
                        <div v-if="props.row.is_full && props.row.logistic_type !== 'fulfillment'"
                          class="q-mt-xs text-warning">Obs: flag Full ativa, mas logistic_type != fulfillment</div>
                      </div>
                    </q-tooltip>
                  </q-badge>

                  <q-badge rounded :outline="getFlexIndicator(props.row).outline"
                    :color="getFlexIndicator(props.row).color" :text-color="getFlexIndicator(props.row).textColor"
                    class="logi-subpill">
                    <q-icon :name="getFlexIndicator(props.row).icon" size="14px" class="q-mr-xs" />
                    {{ getFlexIndicator(props.row).label }}
                  </q-badge>

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
                <div v-if="getPromotionBadges(props.row).length === 0" class="text-caption text-grey-5">
                  Sem promoção
                </div>
                <div v-else class="column q-gutter-y-xs">
                  <q-badge v-for="p in getPromotionBadges(props.row)" :key="p.key" :color="p.bgColor"
                    :text-color="p.textColor" class="promo-badge text-weight-bold"
                    style="border: 1px solid rgba(255,152,0,0.3);">
                    <q-icon name="local_offer" size="12px" class="q-mr-xs" />
                    <span class="promo-label">
                      {{ p.label }}
                      <span v-if="p.discount_pct"> — {{ p.discount_pct }}% OFF</span>
                      <span v-if="p.status && p.status !== 'started'"> ({{ p.status }})</span>
                    </span>
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

              <q-td key="actions" :props="props" align="center" class="bg-grey-1 border-left">
                <div class="row items-center justify-center no-wrap q-gutter-x-sm">

                  <q-btn
                    v-if="(props.row.logistic_type === 'fulfillment' || props.row.is_full) && props.row.available_quantity <= 0"
                    unelevated round color="orange-1" text-color="orange-9" icon="open_in_new" size="sm"
                    class="transition-scale custom-btn-border" @click.stop="openSpaceManagement(props.row)">
                    <q-tooltip class="bg-orange-9 text-white text-weight-bold shadow-4" anchor="top middle"
                      self="bottom middle">
                      Resolver Full (Abre aba e copia MLB)
                    </q-tooltip>
                  </q-btn>

                  <q-btn
                    v-if="props.row.logistic_type !== 'fulfillment' && !props.row.is_full && props.row.available_quantity <= 0"
                    unelevated round color="green-1" text-color="green-9" icon="add_shopping_cart" size="sm"
                    class="transition-scale custom-btn-border" @click.stop="reactivateItem(props.row)">
                    <q-tooltip class="bg-green-9 text-white text-weight-bold shadow-4" anchor="top middle"
                      self="bottom middle">
                      Reativar c/ 1 unidade
                    </q-tooltip>
                  </q-btn>

                  <q-btn unelevated round color="white" text-color="blue-grey-6" icon="edit" size="sm"
                    class="transition-scale custom-btn-border" type="a"
                    :href="`https://www.mercadolivre.com.br/anuncios/${props.row.item_id}/modificar`" target="_blank"
                    @click.stop>
                    <q-tooltip class="bg-blue-grey-9 text-white shadow-4" anchor="top middle"
                      self="bottom middle">Editar no ML</q-tooltip>
                  </q-btn>

                </div>
              </q-td>

            </q-tr> <q-tr v-show="props.expand" :props="props">
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
                            <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">Sem variações</td>
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
                            <td class="text-center font-mono text-caption text-grey-5">{{ v.variation_id || v.id }}</td>
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
              <div class="text-subtitle2 ellipsis-2-lines" style="line-height: 1.2;">{{ activeHealthItem?.title }}</div>
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
                  <q-item-label caption class="text-positive text-weight-medium" v-else>Tudo perfeito nesta
                    seção!</q-item-label>
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
                        :class="rule.status === 'COMPLETED' ? 'text-strike text-grey-6' : 'text-weight-bold text-grey-9'">{{
                          variable.title }}</q-item-label>
                      <q-item-label caption class="q-mt-xs text-grey-7" v-if="rule.wordings?.title">{{
                        rule.wordings.title }}</q-item-label>
                      <div v-if="rule.status === 'PENDING' && rule.progress != null && rule.progress < 1"
                        class="row items-center q-mt-sm">
                        <q-linear-progress :value="rule.progress" :color="rule.mode === 'WARNING' ? 'red-4' : 'blue-4'"
                          size="8px" rounded class="col" />
                        <span class="q-ml-sm text-caption text-weight-bold"
                          :class="rule.mode === 'WARNING' ? 'text-red-8' : 'text-blue-8'">{{ Math.round(rule.progress *
                            100) }}%</span>
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

    <!-- ══ DIALOG 1: PREÇOS (AJUSTE · EXATO · ATACADO) ══════════════════ -->
    <q-dialog v-model="showBulkPriceDialog" persistent>
      <q-card style="min-width:500px; max-width:95vw">

        <!-- Header -->
        <q-card-section class="bg-indigo-6 text-white row items-center q-pb-sm">
          <q-icon name="sell" size="sm" class="q-mr-sm" />
          <span class="text-h6">Alterar Preços</span>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <!-- Seletor de modo -->
        <q-card-section class="q-pt-md q-pb-none q-px-lg">
          <q-btn-toggle v-model="bulkPriceForm.mode" spread unelevated no-caps
            :options="[
              { label: 'Ajuste',   value: 'adjust',    icon: 'tune'        },
              { label: 'Exato',    value: 'exact',     icon: 'price_check' },
              { label: 'Atacado',  value: 'wholesale', icon: 'storefront'  },
            ]"
            color="grey-2" text-color="grey-8"
            toggle-color="indigo-6" toggle-text-color="white"
            style="border-radius:8px; border: 1px solid #e8eaed" />
          <div class="text-caption text-grey-6 q-mt-sm">{{ selectedItems.length }} anúncio(s) selecionado(s)</div>
        </q-card-section>

        <q-separator class="q-mt-md" />

        <!-- ── Modo: Ajuste (% ou R$) ──────────────────────────────────── -->
        <q-card-section v-if="bulkPriceForm.mode === 'adjust'" class="q-pa-lg column q-gutter-md">
          <q-btn-toggle v-model="bulkPriceForm.direction" spread unelevated
            :options="[{label:'Aumentar',value:'increase',icon:'arrow_upward'},{label:'Diminuir',value:'decrease',icon:'arrow_downward'}]"
            color="grey-3" text-color="grey-8" toggle-color="indigo-6" toggle-text-color="white" />

          <q-btn-toggle v-model="bulkPriceForm.type" spread unelevated
            :options="[{label:'Percentual (%)',value:'pct'},{label:'Valor fixo (R$)',value:'abs'}]"
            color="grey-3" text-color="grey-8" toggle-color="indigo-6" toggle-text-color="white" />

          <q-input v-model.number="bulkPriceForm.value" type="number" outlined dense
            :label="bulkPriceForm.type === 'pct' ? 'Percentual (%)' : 'Valor (R$)'"
            :hint="bulkPriceForm.type === 'pct' ? 'Ex: 10 → ajusta em 10% o preço atual' : 'Ex: 5.00 → soma/subtrai R$ 5,00'"
            color="indigo-6">
            <template v-slot:prepend>
              <q-icon :name="bulkPriceForm.type === 'pct' ? 'percent' : 'attach_money'" />
            </template>
          </q-input>
        </q-card-section>

        <!-- ── Modo: Preço Exato ────────────────────────────────────────── -->
        <q-card-section v-else-if="bulkPriceForm.mode === 'exact'" class="q-pa-lg column q-gutter-md">
          <q-input v-model.number="bulkExactPriceForm.price" type="number" outlined dense
            label="Novo preço exato (R$)" color="indigo-6" autofocus
            hint="Este valor substituirá o preço atual de todos os anúncios selecionados">
            <template v-slot:prepend><q-icon name="attach_money" /></template>
          </q-input>

          <!-- Preview -->
          <div v-if="selectedItems.length" class="exact-price-preview">
            <div class="exact-price-preview-header">
              <span>Anúncio</span><span>Atual → Novo</span>
            </div>
            <div v-for="item in selectedItems.slice(0, 5)" :key="item.item_id" class="exact-price-preview-row">
              <span class="exact-price-item-title">{{ item.title }}</span>
              <span class="exact-price-arrow">
                <span class="exact-price-old">R$ {{ Number(item.price || 0).toFixed(2) }}</span>
                <q-icon name="arrow_forward" size="10px" color="grey-5" />
                <span class="exact-price-new" :class="bulkExactPriceForm.price ? 'text-indigo-7' : 'text-grey-5'">
                  {{ bulkExactPriceForm.price ? `R$ ${Number(bulkExactPriceForm.price).toFixed(2)}` : '—' }}
                </span>
              </span>
            </div>
            <div v-if="selectedItems.length > 5" class="text-caption text-grey-5 q-pa-xs">
              + {{ selectedItems.length - 5 }} anúncio(s) não exibido(s)
            </div>
          </div>

          <q-banner dense class="bg-indigo-1 text-indigo-9 rounded-borders">
            <template v-slot:avatar><q-icon name="warning_amber" color="indigo-6" size="16px" /></template>
            O preço atual de cada anúncio será <strong>substituído</strong> pelo valor informado.
          </q-banner>
        </q-card-section>

        <!-- ── Modo: Atacado (PxQ) ─────────────────────────────────────── -->
        <q-card-section v-else-if="bulkPriceForm.mode === 'wholesale'" class="q-pa-lg column q-gutter-sm">
          <div class="text-caption text-grey-6 q-mb-xs">Máx. 3 faixas · Disponível apenas para compradores B2B</div>

          <div v-for="(tier, i) in bulkWholesaleForm.tiers" :key="i"
            class="row q-col-gutter-sm items-center bg-grey-1 q-pa-sm rounded-borders">
            <div class="col-3">
              <q-input v-model.number="tier.min_quantity" type="number" outlined dense
                :label="`Faixa ${i+1}: Qtd mín.`" color="indigo-6" />
            </div>
            <div class="col-4">
              <q-btn-toggle v-model="tier.priceType" dense unelevated
                :options="[{label:'% off',value:'pct'},{label:'R$ fixo',value:'abs'}]"
                color="grey-3" text-color="grey-8" toggle-color="indigo-6" toggle-text-color="white" />
            </div>
            <div class="col-5">
              <q-input v-model.number="tier.value" type="number" outlined dense
                :label="tier.priceType === 'pct' ? 'Desconto %' : 'Preço fixo R$'" color="indigo-6" />
            </div>
          </div>

          <q-banner dense class="bg-indigo-1 text-indigo-9 rounded-borders q-mt-xs">
            <template v-slot:avatar><q-icon name="info" color="indigo-6" size="16px" /></template>
            Faixas % são calculadas sobre o preço atual de cada anúncio.
          </q-banner>
        </q-card-section>

        <!-- Ações -->
        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn v-if="bulkPriceForm.mode === 'adjust'" unelevated label="Aplicar Ajuste" color="indigo-6"
            :loading="bulkLoading"
            :disable="!bulkPriceForm.value || bulkPriceForm.value <= 0"
            @click="executeBulkPriceUpdate" />
          <q-btn v-else-if="bulkPriceForm.mode === 'exact'" unelevated label="Aplicar Preço Exato" color="indigo-6"
            :loading="bulkLoading"
            :disable="!bulkExactPriceForm.price || bulkExactPriceForm.price <= 0"
            @click="executeBulkExactPrice" />
          <q-btn v-else-if="bulkPriceForm.mode === 'wholesale'" unelevated label="Aplicar Atacado" color="indigo-6"
            :loading="bulkLoading"
            @click="executeBulkWholesale" />
        </q-card-actions>

      </q-card>
    </q-dialog>

    <!-- ══ DIALOG 2: GERENCIAR PROMOÇÕES ══════════════════════════════════ -->
    <q-dialog v-model="showBulkPromoDialog" persistent>
      <q-card style="min-width:460px; max-width:95vw">
        <q-card-section class="bg-orange-7 text-white row items-center">
          <q-icon name="local_offer" size="sm" class="q-mr-sm" />
          <span class="text-h6">Gerenciar Promoções</span>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-lg column q-gutter-md">
          <div class="text-caption text-grey-7">{{ selectedItems.length }} anúncio(s) selecionado(s)</div>

          <q-btn-toggle v-model="bulkPromoForm.action" spread unelevated
            :options="[{label:'Desativar Promoção',value:'deactivate',icon:'remove_circle'},{label:'Ativar Promoção',value:'activate',icon:'add_circle'}]"
            color="grey-3" text-color="grey-8" toggle-color="orange-7" toggle-text-color="white" />

          <template v-if="bulkPromoForm.action === 'activate'">
            <q-separator />
            <div class="text-caption text-weight-bold text-grey-9">Configurar Desconto</div>

            <q-btn-toggle v-model="bulkPromoForm.dealPriceType" spread unelevated
              :options="[{label:'% de Desconto',value:'pct'},{label:'R$ de Desconto',value:'abs'}]"
              color="grey-3" text-color="grey-8" toggle-color="orange-7" toggle-text-color="white" />

            <q-input v-model.number="bulkPromoForm.dealPriceValue" type="number" outlined dense
              :label="bulkPromoForm.dealPriceType === 'pct' ? 'Desconto (%)' : 'Desconto (R$)'"
              :hint="bulkPromoForm.dealPriceType === 'pct' ? 'Ex: 15 → 15% off no preço atual' : 'Ex: 20 → R$ 20 off'"
              color="orange-7">
              <template v-slot:prepend>
                <q-icon :name="bulkPromoForm.dealPriceType === 'pct' ? 'percent' : 'attach_money'" />
              </template>
            </q-input>

            <q-input v-model="bulkPromoForm.finishDate" type="date" outlined dense label="Data de Término"
              color="orange-7" :hint="`Máximo 14 dias. Hoje: ${new Date().toLocaleDateString('pt-BR')}`">
              <template v-slot:prepend><q-icon name="event" /></template>
            </q-input>
          </template>

          <q-banner v-if="bulkPromoForm.action === 'deactivate'" class="bg-red-1 text-red-9 rounded-borders">
            <template v-slot:avatar><q-icon name="warning" color="red-7" /></template>
            Remove a promoção PRICE_DISCOUNT ativa de todos os anúncios selecionados.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated :label="bulkPromoForm.action === 'deactivate' ? 'Desativar' : 'Ativar'"
            color="orange-7" :loading="bulkLoading"
            :disable="bulkPromoForm.action === 'activate' && (!bulkPromoForm.dealPriceValue || !bulkPromoForm.finishDate)"
            @click="executeBulkPromo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ══ DIALOG 3: ALTERAR TIPO DE ANÚNCIO ═════════════════════════════ -->
    <q-dialog v-model="showBulkListingTypeDialog" persistent>
      <q-card style="min-width:400px; max-width:95vw">
        <q-card-section class="bg-teal-7 text-white row items-center">
          <q-icon name="rocket_launch" size="sm" class="q-mr-sm" />
          <span class="text-h6">Alterar Tipo de Anúncio</span>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pa-lg column q-gutter-md">
          <div class="text-caption text-grey-7">{{ selectedItems.length }} anúncio(s) selecionado(s)</div>

          <q-btn-toggle v-model="bulkListingTypeForm.listing_type" spread unelevated
            :options="[
              {label:'Premium (gold_pro)',value:'gold_pro',icon:'workspace_premium'},
              {label:'Clássico (gold_special)',value:'gold_special',icon:'article'}
            ]"
            color="grey-3" text-color="grey-8" toggle-color="teal-7" toggle-text-color="white" />

          <q-banner class="bg-teal-1 text-teal-9 rounded-borders">
            <template v-slot:avatar><q-icon name="info" color="teal-7" /></template>
            <span v-if="bulkListingTypeForm.listing_type === 'gold_pro'">
              <b>Premium</b>: maior visibilidade, tarifa mais alta. Recomendado para itens com 10+ vendas.
            </span>
            <span v-else>
              <b>Clássico</b>: tarifa reduzida. Ideal para itens novos ou de menor volume.
            </span>
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Aplicar" color="teal-7" :loading="bulkLoading"
            @click="executeBulkListingType" />
        </q-card-actions>
      </q-card>
    </q-dialog>


  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar, copyToClipboard } from 'quasar'

const $q = useQuasar()

// ============================================================================
// 1. ESTADO GLOBAL E TABELA
// ============================================================================
const items = ref([])
const loading = ref(false)

// ── Seleção múltipla ──────────────────────────────────────────────────────
const selectedItems = ref([])
const allSelected = computed(() => items.value.length > 0 && selectedItems.value.length === items.value.length)
const someSelected = computed(() => selectedItems.value.length > 0 && selectedItems.value.length < items.value.length)
const isSelected = (row) => selectedItems.value.some(r => r.item_id === row.item_id)
const toggleSelect = (row) => {
  const idx = selectedItems.value.findIndex(r => r.item_id === row.item_id)
  if (idx === -1) selectedItems.value = [...selectedItems.value, row]
  else selectedItems.value = selectedItems.value.filter(r => r.item_id !== row.item_id)
}
const toggleAll = (val) => { selectedItems.value = val ? [...items.value] : [] }

// ── Dialogs bulk ──────────────────────────────────────────────────────────
const showBulkPriceDialog       = ref(false)
const showBulkPromoDialog       = ref(false)
const showBulkListingTypeDialog = ref(false)
const bulkLoading = ref(false)

const bulkPriceForm = reactive({ mode: 'adjust', direction: 'increase', type: 'pct', value: null })
const bulkPromoForm = reactive({ action: 'deactivate', dealPriceType: 'pct', dealPriceValue: null, finishDate: null })
const bulkListingTypeForm = reactive({ listing_type: 'gold_pro' })
const bulkWholesaleForm = reactive({
  tiers: [
    { min_quantity: 1,  priceType: 'abs', value: null },
    { min_quantity: 5,  priceType: 'pct', value: 10   },
    { min_quantity: 10, priceType: 'pct', value: 15   },
  ]
})
const bulkExactPriceForm = reactive({ price: null })

const pagination = ref({
  sortBy: 'sold_quantity',
  descending: true,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0
})

const columns = [
  { name: 'thumbnail', align: 'center', label: '', field: 'thumbnail' },
  { name: 'title', align: 'left', label: 'PRODUTO', field: 'title' },
  { name: 'sold_quantity', align: 'center', label: 'VENDAS', field: 'sold_quantity', sortable: true },
  { name: 'performance_score', align: 'center', label: 'QUALIDADE', field: 'performance_score', sortable: true },
  { name: 'logistic_type', align: 'left', label: 'LOGÍSTICA', field: 'logistic_type' },
  { name: 'promotions', align: 'left', label: 'PROMOÇÕES', field: 'promotions_info' },
  { name: 'price', align: 'right', label: 'PREÇO', field: 'effective_price' },
  {
    name: 'actions',
    align: 'center',
    label: 'AÇÕES',
    field: 'actions',
    style: 'width: 140px' // <-- Força a coluna a ter espaço para os botões
  },
]

// ============================================================================
// 2. ESTADO E OPÇÕES DOS FILTROS
// ============================================================================
const showAdvancedFilters = ref(false)
const availableAccounts = ref([])
const availableStatuses = ref([])
const availableLogistics = ref([])

const filters = reactive({
  search: '',
  account: [],
  logistic_type: [],
  status: [],
  listing_type: [],
  free_shipping: null,
  is_flex: null,
  catalog_listing: null,
  stockStatus: null,
  soldMin: null,
  healthMin: null,
  healthMax: null,
  priceMin: null,
  priceMax: null,
  discountMin: null
})

// Opções Estáticas
const listingTypeOptions = [
  { label: 'Premium (gold_pro)', value: 'gold_pro' },
  { label: 'Clássico (gold_special)', value: 'gold_special' }
]

const booleanOptions = [
  { label: 'Todos', value: null },
  { label: 'Sim', value: true },
  { label: 'Não', value: false }
]

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

const STATUS_LABELS = {
  active: 'Ativo', paused: 'Pausado', closed: 'Fechado', under_review: 'Em Revisão', inactive: 'Inativo'
}

const LOGISTIC_META = {
  fulfillment: { label: 'Full', helper: 'Estoque no ML', icon: 'bolt', color: 'orange-8' },
  cross_docking: { label: 'Coleta', helper: 'ML coleta no seu CD', icon: 'local_shipping', color: 'orange-6' },
  drop_off: { label: 'Agência', helper: 'Postagem em ponto', icon: 'store', color: 'blue-grey-6' },
  xd_drop_off: { label: 'Agência XD', helper: 'Postagem Places', icon: 'store', color: 'blue-grey-8' },
  self_service: { label: 'Flex', helper: 'Envio próprio', icon: 'two_wheeler', color: 'grey-9' }
}

// Opções Computadas (Dinâmicas da API)
const accountOptions = computed(() => availableAccounts.value)

const logisticOptions = computed(() => {
  return availableLogistics.value
    .filter(l => l !== 'self_service') // <-- Esta linha remove o Flex (self_service) das opções
    .map(l => ({
      label: LOGISTIC_META[l]?.label || l,
      value: l
    }))
})

const statusOptions = computed(() => availableStatuses.value.map(s => ({ label: STATUS_LABELS[s] || s, value: s })))

// ============================================================================
// 3. AÇÕES E MACROS DE FILTROS (CORRIGIDO PARA EVITAR PISCA-PISCA)
// ============================================================================

// Função que APENAS limpa as variáveis, SEM fazer chamadas na API.
const resetFiltersState = () => {
  filters.search = ''
  filters.account = []
  filters.logistic_type = []
  filters.status = []
  filters.listing_type = []
  filters.free_shipping = null
  filters.is_flex = null
  filters.catalog_listing = null
  filters.stockStatus = null
  filters.soldMin = null
  filters.healthMin = null
  filters.healthMax = null
  filters.priceMin = null
  filters.priceMax = null
  filters.discountMin = null
}

const clearFilters = () => {
  resetFiltersState()
  // Não precisamos chamar refreshData() aqui. O watcher abaixo vai detectar a mudança e buscar!
}

const setFilterMarginRisk = () => {
  resetFiltersState()
  filters.status = ['active']
  filters.free_shipping = true
  filters.priceMax = 78.99
}

const setFilterPremiumUpgrade = () => {
  resetFiltersState()
  filters.status = ['active']
  filters.listing_type = ['gold_special']
  filters.soldMin = 10
}

const setFilterPoorHealthHighSales = () => {
  resetFiltersState()
  filters.status = ['active']
  filters.soldMin = 20
  filters.healthMax = 80
}

const setFilterFullNoStock = () => {
  resetFiltersState()
  filters.logistic_type = ['fulfillment']
  filters.stockStatus = 'zero'
}

const setFilterOpportunityFlex = () => {
  resetFiltersState()
  filters.is_flex = false
  filters.status = ['active']
  filters.stockStatus = 'positive'
  if (availableLogistics.value.includes('cross_docking')) {
    filters.logistic_type = ['cross_docking']
  }
}

// Neutraliza o reset manual do HTML para não conflitar com o Watcher
const resetPagination = () => {
  // Mantida vazia para não quebrar os @update:model-value do HTML
}

// Watcher Inteligente de Filtros (O ÚNICO LUGAR QUE DISPARA A BUSCA)
let filterTimer
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    onRequest({ pagination: { ...pagination.value, page: 1 } })
  }, 400)
}, { deep: true })

// ============================================================================
// 4. API & DATA FETCHING
// ============================================================================
const loadFilters = async () => {
  try {
    const { data } = await MercadoLivreService.getFacets()
    availableAccounts.value = data.accounts
    availableStatuses.value = data.status || []
    availableLogistics.value = data.logistic_type || []
  } catch (e) {
    console.error('Erro silencioso ao carregar filtros:', e)
  }
}

const refreshData = () => onRequest({ pagination: pagination.value })

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
      listing_type_id: filters.listing_type?.length ? filters.listing_type.join(',') : undefined,

      // Booleanos & Singulares
      stock_status: filters.stockStatus || undefined,
      is_flex: filters.is_flex,
      free_shipping: filters.free_shipping,
      catalog_listing: filters.catalog_listing,

      // Min Max
      price_min: filters.priceMin,
      price_max: filters.priceMax,
      sold_quantity_min: filters.soldMin,
      performance_score_min: filters.healthMin,
      performance_score_max: filters.healthMax,
      discount_pct_min: filters.discountMin
    }

    // Limpa chaves inválidas (null / undefined) para não sujar a URL
    Object.keys(params).forEach(k => (params[k] === undefined || params[k] === null) && delete params[k])

    const response = await MercadoLivreService.listItems(params)
    items.value = response.data.results || []
    pagination.value.rowsNumber = response.data.count || 0

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

// ============================================================================
// 5. HELPERS DE INTERFACE & FORMATAÇÃO
// ============================================================================
const formatCurrency = (val) => val ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)) : ''
const fmtBRL = (v) => (v != null && v !== '') ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) : '—'
const formatHealth = (score) => score != null ? `${Math.round(Number(score))}%` : '—'
const copyText = (t) => { copyToClipboard(t); $q.notify({ message: 'Copiado!', color: 'positive', position: 'top', icon: 'check' }) }

const getLogisticMeta = (type) => LOGISTIC_META[type] || { label: type, icon: 'help', color: 'grey' }

const getFlexIndicator = (row) => {
  const active = !!row?.is_flex
  return active
    ? { label: 'Flex', icon: 'two_wheeler', color: 'blue-grey-8', textColor: 'white', outline: false }
    : { label: 'Flex ✕', icon: 'close', color: 'red-2', textColor: 'red-10', outline: true }
}

const getPrimaryLogistic = (row) => {
  const t = row?.logistic_type
  if (t === 'fulfillment' || row?.is_full) return { label: 'Full', icon: 'bolt', color: 'green-7', textColor: 'white', helper: 'Estoque no ML' }
  if (t === 'self_service' || row?.is_flex) return { label: 'Flex', icon: 'two_wheeler', color: 'purple-6', textColor: 'white', helper: 'Envio próprio' }
  if (t === 'cross_docking') return { label: 'Coleta', icon: 'local_shipping', color: 'orange-8', textColor: 'white', helper: 'ML coleta no seu CD' }
  if (t === 'drop_off' || t === 'xd_drop_off') return { label: 'Agência', icon: 'store', color: 'blue-grey-7', textColor: 'white', helper: 'Postagem em ponto' }
  return { label: t || '—', icon: 'help', color: 'grey-6', textColor: 'white', helper: '' }
}

// Helpers Promoções
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

const getPromotionBadges = (row) => {
  const promos = Array.isArray(row?.promotions_info) ? row.promotions_info : []
  const fallbackRegular = row?.effective_regular_price ?? row?.original_price ?? row?.base_price ?? null

  return promos.filter(p => p && typeof p === 'object').map(p => {
    const label = p.name || p.type || 'Promoção'
    const price = p.price
    const regular = p.original_price ?? fallbackRegular
    const discount_pct = calcDiscountPct(regular, price)

    const tooltipParts = [/* mantem igual... */].filter(Boolean)

    return {
      key: p.id || `${label}-${p.status || ''}-${p.price || ''}`,
      label,
      status: p.status,
      discount_pct,
      tooltip: tooltipParts.join('\n'),
      // Adicionando mapeamento direto de cores aqui para o template
      bgColor: p.status === 'started' ? 'orange-1' : 'grey-2',
      textColor: p.status === 'started' ? 'orange-9' : 'grey-8'
    }
  })
}

const getPromotions = (row) => {
  const promosInfo = row?._detail?.promotions_info
  if (Array.isArray(promosInfo) && promosInfo.length) {
    const labels = promosInfo.map(p => p?.name || p?.type).filter(Boolean)
    return [...new Set(labels)]
  }
  const p = row?.active_promotion
  if (p) return [p.name || p.type || 'Promoção'].filter(Boolean)
  if (row?.price_source === 'PROMOTION_INFO') return ['Promoção']
  if (row?.price_source === 'PRICES_API') return ['Oferta']
  return []
}

// Helpers Preço
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

// ============================================================================
// 6. DETALHES DE EXPANSÃO (VARIAÇÕES)
// ============================================================================
const detailLoading = ref({})
const isDetailLoading = (row) => !!detailLoading.value[row.item_id]
const getVariations = (row) => row._detail?.variations || []

const ensureItemDetail = async (row) => {
  if (row._detail || detailLoading.value[row.item_id]) return
  detailLoading.value[row.item_id] = true
  try {
    const { data } = await MercadoLivreService.getItem(row.item_id)
    row._detail = data
  } catch (e) {
    console.error(e)
  } finally {
    detailLoading.value[row.item_id] = false
  }
}

// ============================================================================
// 7. AVISO MAGIC LINK (FULL SEM ESTOQUE)
// ============================================================================
const magicLinkUrl = "https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment-with-empty-stock"

const showMagicLink = computed(() => {
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
  copyToClipboard(magicLinkUrl).then(() => $q.notify({ type: 'positive', message: 'Link copiado!', icon: 'content_copy' }))
}

// ============================================================================
// 8. MODAL DE SAÚDE / AUDITORIA (HEALTH)
// ============================================================================
const showHealthDialog = ref(false)
const activeHealthItem = ref(null)

const openHealthDialog = (row) => {
  activeHealthItem.value = row
  showHealthDialog.value = true
}

const getHealthColorName = (score) => {
  const pct = Number(score || 0)
  if (pct >= 99) return 'positive'
  if (pct >= 70) return 'warning'
  return 'negative'
}

// ============================================================================
// 9. LIFECYCLE
// ============================================================================
onMounted(() => {
  loadFilters()
  refreshData()
})



// ============================================================================
// 10. AÇÕES
// ============================================================================

const openSpaceManagement = (row) => {
  copyToClipboard(row.item_id)
    .then(() => {
      $q.notify({
        type: 'warning',
        color: 'orange-9',
        icon: 'content_copy',
        message: 'MLB copiado! Cole na barra de busca do Mercado Livre.',
        position: 'top',
        timeout: 4000
      })
      const url = "https://www.mercadolivre.com.br/anuncios/lista/space_management?filters=with-fulfillment-with-empty-stock"
      window.open(url, '_blank')
    })
}

// ── Helpers bulk ─────────────────────────────────────────────────────────
const _itemsPayload = () => selectedItems.value.map(r => ({ item_id: r.item_id }))

const _bulkFinish = (result, closeRef) => {
  const ok = result.data?.success?.length || 0
  const err = result.data?.errors?.length || 0
  if (err === 0) {
    $q.notify({ type: 'positive', message: `${ok} anúncio(s) atualizado(s) com sucesso!`, position: 'top' })
  } else {
    $q.notify({
      type: err === ok + err ? 'negative' : 'warning',
      message: `${ok} ok, ${err} erro(s). Veja o console.`,
      position: 'top'
    })
    console.warn('[BulkErrors]', result.data?.errors)
  }
  closeRef.value = false
  selectedItems.value = []
  refreshData()
}

const executeBulkPriceUpdate = async () => {
  bulkLoading.value = true
  try {
    const res = await MercadoLivreService.bulkPriceUpdate({
      items: _itemsPayload(),
      direction: bulkPriceForm.direction,
      type: bulkPriceForm.type,
      value: bulkPriceForm.value
    })
    _bulkFinish(res, showBulkPriceDialog)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao alterar preços.' })
  } finally { bulkLoading.value = false }
}

const executeBulkPromo = async () => {
  bulkLoading.value = true
  try {
    let res
    if (bulkPromoForm.action === 'deactivate') {
      res = await MercadoLivreService.bulkPromoDeactivate({ items: _itemsPayload() })
    } else {
      res = await MercadoLivreService.bulkPromoActivate({
        items: _itemsPayload(),
        deal_price_type: bulkPromoForm.dealPriceType,
        deal_price_value: bulkPromoForm.dealPriceValue,
        finish_date: bulkPromoForm.finishDate ? `${bulkPromoForm.finishDate}T23:59:59` : null
      })
    }
    _bulkFinish(res, showBulkPromoDialog)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao gerenciar promoções.' })
  } finally { bulkLoading.value = false }
}

const executeBulkListingType = async () => {
  bulkLoading.value = true
  try {
    const res = await MercadoLivreService.bulkListingType({
      items: _itemsPayload(),
      listing_type_id: bulkListingTypeForm.listing_type
    })
    _bulkFinish(res, showBulkListingTypeDialog)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao alterar tipo.' })
  } finally { bulkLoading.value = false }
}

const executeBulkWholesale = async () => {
  bulkLoading.value = true
  try {
    const res = await MercadoLivreService.bulkWholesale({
      items: _itemsPayload(),
      tiers: bulkWholesaleForm.tiers.map(t => ({
        min_quantity: t.min_quantity,
        price_type: t.priceType,
        value: t.value
      })).filter(t => t.value && t.min_quantity)
    })
    _bulkFinish(res, showBulkPriceDialog)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao definir atacado.' })
  } finally { bulkLoading.value = false }
}

const executeBulkExactPrice = async () => {
  bulkLoading.value = true
  try {
    const res = await MercadoLivreService.bulkExactPrice({
      items: _itemsPayload(),
      price: bulkExactPriceForm.price,
    })
    _bulkFinish(res, showBulkPriceDialog)
    bulkExactPriceForm.price = null
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao definir preço exato.' })
  } finally { bulkLoading.value = false }
}

const reactivateItem = (row) => {
  $q.dialog({
    title: 'Confirmar Reativação',
    message: `Você vai adicionar <b class="text-orange-9">1 unidade</b> de estoque e reativar o anúncio <br/><span class="text-grey-7 font-mono">${row.item_id}</span>.<br/><br/>Deseja continuar?`,
    html: true,
    cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
    ok: { label: 'Reativar', color: 'orange-8', unelevated: true },
    persistent: true
  }).onOk(async () => {
    try {
      // Mostra a tela de carregamento para o usuário não clicar duas vezes
      $q.loading.show({ message: 'Comunicando com o Mercado Livre...' })

      // Chama o nosso novo serviço
      await MercadoLivreService.reactivateItem(row.item_id, 1)

      $q.notify({ type: 'positive', message: 'Anúncio reativado com sucesso!', position: 'top' })

      // Recarrega a tabela para o anúncio sumir do filtro de "Sem Estoque"
      refreshData()

    } catch (error) {
      // Tenta pegar a mensagem de erro bonitinha que enviamos do Django
      const msg = error.response?.data?.message || 'Erro ao comunicar com a API do Mercado Livre.'
      $q.notify({ type: 'negative', message: msg, position: 'top' })
    } finally {
      // Sempre esconde o loading, dando erro ou sucesso
      $q.loading.hide()
    }
  })
}

</script>

<style scoped>
.bulk-bar {
  background: #e8eaf6;
  border-bottom: 1px solid #c5cae9;
  border-top: 1px solid #c5cae9;
}
.exact-price-preview { border: 1px solid #ede7f6; border-radius: 8px; overflow: hidden; }
.exact-price-preview-header { display: flex; justify-content: space-between; padding: 5px 10px; background: #ede7f6; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #7e57c2; letter-spacing: .4px; }
.exact-price-preview-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 10px; border-top: 1px solid #f3f0fb; font-size: 12px; }
.exact-price-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #424242; margin-right: 8px; }
.exact-price-arrow { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.exact-price-old { color: #9e9e9e; text-decoration: line-through; font-size: 11px; }
.exact-price-new { font-weight: 600; font-size: 12px; }

.my-custom-table :deep(tbody tr td) {
  min-height: 65px;
  height: auto;
  vertical-align: top;
}

.promo-td {
  min-width: 260px;
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
  overflow-wrap: anywhere;
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

.h-100 {
  height: 100%;
}

.custom-shadow {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  border: 1px solid #f0f0f0;
}

.letter-spacing-1 {
  letter-spacing: 0.5px;
}

/* Estilo para os botões "Smart Views" */
.smart-btn {
  background-color: white !important;
  border-color: #e0e0e0 !important;
  transition: all 0.2s ease;
}

.smart-btn:hover {
  background-color: #f8f9fa !important;
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.06);
}

.hover-underline:hover {
  text-decoration: underline;
}

/* ═══ Design system ══════════════════════════════════════════════════ */
.items-page { background: #f5f7fa; }
.items-page-header { background: #fff; padding: 16px 20px; border-bottom: 1.5px solid #e8edf3; }
.header-icon-items {
  width: 34px; height: 34px; border-radius: 9px; display: flex;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #0d9488, #2dd4bf); color: #fff;
}
.header-eyebrow-items { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title-items   { font-size: 16px; font-weight: 700; color: #1a1f36; }
</style>
