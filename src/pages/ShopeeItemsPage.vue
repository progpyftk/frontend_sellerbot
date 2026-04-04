<template>
  <q-page class="shopee-items-page">

    <!-- ══ HEADER ══════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="row items-center justify-between no-wrap">
        <div class="row items-center q-gutter-x-md">
          <div class="header-icon">
            <q-icon name="storefront" size="22px" />
          </div>
          <div>
            <div class="header-eyebrow">Shopee</div>
            <div class="header-title">Meus Anúncios</div>
          </div>
          <div v-if="pagination.rowsNumber" class="header-count">
            {{ pagination.rowsNumber.toLocaleString('pt-BR') }} anúncios
          </div>
        </div>
        <q-btn unelevated color="deep-orange" icon="sync" label="Sincronizar"
          :loading="syncing" :disable="!filters.account?.length && accountOptions.length > 1" size="sm" class="q-px-md"
          @click="syncItems">
          <q-tooltip v-if="!filters.account?.length && accountOptions.length > 1">Selecione uma conta primeiro</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ══ FILTROS ══════════════════════════════════════════════ -->
    <div class="fb">

      <!-- Toolbar -->
      <div class="fb-toolbar">
        <div class="fb-search" :class="{ focused: searchFocused, filled: !!filters.search }">
          <q-icon name="search" size="18px" class="fb-search-icon" />
          <input
            v-model="filters.search"
            class="fb-search-input"
            placeholder="Buscar por título, SKU ou ID..."
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @input="onSearch"
          />
          <transition name="fade">
            <button v-if="filters.search" class="fb-search-clear" @click="filters.search = ''; loadItems()">
              <q-icon name="close" size="14px" />
            </button>
          </transition>
        </div>

        <div class="fb-toolbar-actions">
          <div class="fb-btn-group">
            <q-btn-dropdown flat dense no-icon-animation unelevated
              :label="currentSortLabel" icon="swap_vert"
              class="fb-tbtn" color="grey-7" size="sm">
              <q-list dense style="min-width:200px">
                <q-item v-for="opt in sortOptions" :key="opt.value"
                  clickable v-close-popup @click="applySort(opt.value)">
                  <q-item-section>{{ opt.label }}</q-item-section>
                  <q-item-section side v-if="currentSort === opt.value">
                    <q-icon name="check" color="teal-7" size="14px" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>

          <div class="fb-btn-group">
            <button :class="['fb-tbtn', advancedFilterCount > 0 && 'fb-tbtn--active']"
              @click="showAdvanced = true">
              <q-icon name="tune" size="15px" />
              <span>Filtros</span>
              <span v-if="advancedFilterCount > 0" class="fb-adv-badge">{{ advancedFilterCount }}</span>
            </button>
          </div>

          <transition name="fade">
            <button v-if="hasActiveFilters" class="fb-clear-btn" @click="clearFilters">
              <q-icon name="filter_alt_off" size="14px" />
              <span>Limpar</span>
            </button>
          </transition>
        </div>
      </div>

      <!-- Filterbar -->
      <div class="fb-filterbar">

        <!-- Conta -->
        <div class="fb-combo" :class="filters.account?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="storefront" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.account?.length">Conta</template>
              <template v-else-if="filters.account.length === 1">{{ accountOptions.find(a => a.id === filters.account[0])?.shop_name || 'Conta' }}</template>
              <template v-else>Conta <span class="fb-combo-multi">+{{ filters.account.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.account?.length" class="fb-combo-clear" @click.stop="filters.account = []; loadItems()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:220px">
              <q-item v-for="acc in accountOptions" :key="acc.id" clickable
                :class="['fb-menu-item', filters.account?.includes(acc.id) && 'fb-menu-item--on']"
                @click.stop="toggleAccountFilter(acc.id)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.account?.includes(acc.id)"
                    @update:model-value="toggleAccountFilter(acc.id)" @click.stop color="deep-orange" dense />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="fb-menu-item-label">{{ acc.shop_name }}</q-item-label>
                  <q-item-label caption>ID: {{ acc.shop_id }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Status -->
        <div class="fb-combo" :class="filters.status?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="toggle_on" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.status?.length">Status</template>
              <template v-else-if="filters.status.length === 1">{{ statusOptions.find(o => o.value === filters.status[0])?.label || 'Status' }}</template>
              <template v-else>Status <span class="fb-combo-multi">+{{ filters.status.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.status?.length" class="fb-combo-clear" @click.stop="filters.status = []; loadItems()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:180px">
              <q-item v-for="opt in statusOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.status?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleStatusFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.status?.includes(opt.value)"
                    @update:model-value="toggleStatusFilter(opt.value)" @click.stop color="deep-orange" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Estoque -->
        <div class="fb-combo" :class="filters.stockStatus && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="inventory" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.stockStatus">Estoque</template>
              <template v-else>{{ stockOptions.find(o => o.value === filters.stockStatus)?.label || 'Estoque' }}</template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.stockStatus" class="fb-combo-clear" @click.stop="filters.stockStatus = null; loadItems()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:200px">
              <q-item v-for="opt in stockOptions" :key="opt.value ?? 'all'" clickable v-close-popup
                :class="['fb-menu-item', filters.stockStatus === opt.value && 'fb-menu-item--on']"
                @click="filters.stockStatus = opt.value; loadItems()">
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Promoção -->
        <div class="fb-combo" :class="filters.hasDiscount !== null && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="local_offer" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="filters.hasDiscount === null">Promoção</template>
              <template v-else>{{ filters.hasDiscount ? 'Com desconto' : 'Sem desconto' }}</template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.hasDiscount !== null" class="fb-combo-clear" @click.stop="filters.hasDiscount = null; loadItems()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:180px">
              <q-item clickable v-close-popup
                :class="['fb-menu-item', filters.hasDiscount === null && 'fb-menu-item--on']"
                @click="filters.hasDiscount = null; loadItems()">
                <q-item-section class="fb-menu-item-label">Todos</q-item-section>
              </q-item>
              <q-item clickable v-close-popup
                :class="['fb-menu-item', filters.hasDiscount === true && 'fb-menu-item--on']"
                @click="filters.hasDiscount = true; loadItems()">
                <q-item-section class="fb-menu-item-label">Com desconto</q-item-section>
              </q-item>
              <q-item clickable v-close-popup
                :class="['fb-menu-item', filters.hasDiscount === false && 'fb-menu-item--on']"
                @click="filters.hasDiscount = false; loadItems()">
                <q-item-section class="fb-menu-item-label">Sem desconto</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

      </div>

      <!-- Filter index -->
      <transition name="fade">
        <div v-if="hasActiveFilters" class="fb-index">
          <div class="fb-index-header">
            <div class="fb-index-title">
              <q-icon name="filter_alt" size="14px" color="deep-orange" />
              <span>Filtrando</span>
              <span class="fb-index-count">
                {{ [
                  filters.search ? 1 : 0,
                  filters.account?.length ? 1 : 0,
                  filters.status?.length ? 1 : 0,
                  filters.stockStatus ? 1 : 0,
                  filters.hasDiscount !== null ? 1 : 0,
                  advancedFilterCount
                ].reduce((a, b) => a + b, 0) }} grupos
              </span>
            </div>
            <button class="fb-index-clear" @click="clearFilters">
              <q-icon name="close" size="11px" />Limpar tudo
            </button>
          </div>
          <div class="fb-index-rows">
            <div v-if="filters.search" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="search" size="12px" />Busca</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.search = ''; loadItems()">"{{ filters.search }}" <q-icon name="close" size="9px" /></span>
              </div>
            </div>
            <div v-if="filters.account?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="storefront" size="12px" />Conta</div>
              <div class="fb-index-pills">
                <span v-for="id in filters.account" :key="id" class="fb-index-pill" @click="toggleAccountFilter(id)">
                  {{ accountOptions.find(a => a.id === id)?.shop_name || id }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="filters.status?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="toggle_on" size="12px" />Status</div>
              <div class="fb-index-pills">
                <span v-for="s in filters.status" :key="s" class="fb-index-pill" @click="toggleStatusFilter(s)">
                  {{ statusOptions.find(o => o.value === s)?.label || s }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="filters.stockStatus" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="inventory" size="12px" />Estoque</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.stockStatus = null; loadItems()">
                  {{ stockOptions.find(o => o.value === filters.stockStatus)?.label }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="filters.hasDiscount !== null" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="local_offer" size="12px" />Promoção</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.hasDiscount = null; loadItems()">
                  {{ filters.hasDiscount ? 'Com desconto' : 'Sem desconto' }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="advancedFilterCount > 0" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="tune" size="12px" />Avançados</div>
              <div class="fb-index-pills">
                <span v-if="filters.stockMin || filters.stockMax" class="fb-index-pill"
                  @click="filters.stockMin = null; filters.stockMax = null; loadItems()">
                  Estoque: {{ filters.stockMin || '0' }} → {{ filters.stockMax || '∞' }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.priceMin || filters.priceMax" class="fb-index-pill"
                  @click="filters.priceMin = null; filters.priceMax = null; loadItems()">
                  Preço: {{ filters.priceMin || '0' }} → {{ filters.priceMax || '∞' }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.salesMin" class="fb-index-pill" @click="filters.salesMin = null; loadItems()">
                  Vendas ≥ {{ filters.salesMin }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.ratingMin" class="fb-index-pill" @click="filters.ratingMin = null; loadItems()">
                  Avaliação ≥ {{ filters.ratingMin }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>

    </div>

    <!-- ══ SMART VIEWS ══════════════════════════════════════════ -->
    <div class="smart-views-bar">
      <div class="sv-label">Smart Views</div>
      <div class="sv-chips">
        <button class="sv-chip sv-chip--red" @click="setViewSemEstoque">
          <q-icon name="inventory_2" size="13px" />Sem Estoque
        </button>
        <button class="sv-chip sv-chip--orange" @click="setViewComDesconto">
          <q-icon name="local_offer" size="13px" />Com Desconto
        </button>
        <button class="sv-chip sv-chip--amber" @click="setViewSemAvaliacoes">
          <q-icon name="star_border" size="13px" />Sem Avaliações
        </button>
        <button class="sv-chip sv-chip--teal" @click="setViewMaisVendidos">
          <q-icon name="shopping_cart" size="13px" />Mais Vendidos
        </button>
        <button class="sv-chip sv-chip--slate" @click="setViewVariacoes">
          <q-icon name="tune" size="13px" />Variações
        </button>
      </div>
      <button class="sv-clear" @click="clearFilters">
        <q-icon name="filter_alt_off" size="13px" />Limpar
      </button>
    </div>

    <!-- ══ BULK BAR ══════════════════════════════════════════════ -->
    <transition name="slide-fade">
      <div v-if="selectedItems.length" class="bulk-bar q-px-lg q-py-sm row items-center q-gutter-sm">
        <q-icon name="check_box" color="deep-orange" size="18px" />
        <span class="text-weight-bold" style="color:#EE4D2D">{{ selectedItems.length }} selecionado(s)</span>
        <q-space />
        <q-btn flat dense color="grey-6" icon="close" label="Limpar seleção" size="sm"
          @click="selectedItems = []" />
      </div>
    </transition>

    <!-- ══ TABELA ══════════════════════════════════════════════ -->
    <q-table
      :rows="items"
      :columns="columns"
      row-key="item_id"
      flat
      :loading="loading"
      v-model:pagination="pagination"
      @request="onRequest"
      binary-state-sort
      class="sticky-header-table shopee-table"
      no-data-label="Nenhum anúncio encontrado.">

      <template v-slot:header="props">
        <q-tr :props="props" class="shopee-table-header">
          <q-th auto-width>
            <q-checkbox :model-value="allSelected" :indeterminate="someSelected"
              @update:model-value="toggleAll" color="teal-7" dense />
          </q-th>
          <q-th auto-width />
          <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props"
          :class="[isSelected(props.row) ? 'row-selected' : (props.expand ? 'row-expanded' : 'hover-row')]"
          class="cursor-pointer">

          <!-- Checkbox -->
          <q-td auto-width>
            <q-checkbox :model-value="isSelected(props.row)" @update:model-value="toggleSelect(props.row)"
              @click.stop color="teal-7" dense />
          </q-td>

          <!-- Expand -->
          <q-td auto-width class="q-py-md">
            <q-btn size="sm" flat round
              :color="props.expand ? 'teal-7' : 'grey-6'"
              @click.stop="toggleExpand(props)"
              :icon="props.expand ? 'expand_less' : 'expand_more'" />
          </q-td>

          <!-- Thumbnail -->
          <q-td key="thumbnail" :props="props" style="width:70px">
            <div class="relative-position">
              <q-img :src="props.row.thumbnail || ''" style="height:50px;width:50px" fit="contain"
                class="rounded-borders border-grey">
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-2">
                    <q-icon name="image_not_supported" size="20px" color="grey-5" />
                  </div>
                </template>
              </q-img>
              <div class="absolute-bottom-right" style="transform:translate(20%,20%)">
                <q-icon v-if="props.row.status === 'NORMAL'" name="check_circle" color="positive" size="16px"
                  class="bg-white rounded-borders" />
                <q-icon v-else-if="props.row.status === 'UNLIST'" name="pause_circle" color="warning" size="16px"
                  class="bg-white rounded-borders" />
                <q-icon v-else-if="props.row.status === 'BANNED'" name="cancel" color="negative" size="16px"
                  class="bg-white rounded-borders" />
                <q-icon v-else-if="props.row.status === 'DELETED'" name="remove_circle" color="grey-5" size="16px"
                  class="bg-white rounded-borders" />
              </div>
            </div>
          </q-td>

          <!-- Anúncio: nome, SKU, ID, loja, estoque -->
          <q-td key="item_name" :props="props" style="max-width:380px;white-space:normal">
            <div class="column q-gutter-y-xs">
              <div class="text-grey-9 text-weight-bold" style="font-size:13px;line-height:1.3">
                {{ props.row.item_name }}
              </div>
              <div class="row items-center q-gutter-x-sm text-caption">
                <span v-if="props.row.item_sku"
                  class="badge-mono cursor-pointer"
                  @click.stop="copyText(props.row.item_sku)"
                  title="Copiar SKU">
                  {{ props.row.item_sku }}
                </span>
                <span
                  class="badge-mono cursor-pointer"
                  @click.stop="copyText(String(props.row.item_id))"
                  title="Copiar ID">
                  {{ props.row.item_id }}
                </span>
                <span class="shop-badge">
                  <q-icon name="storefront" size="10px" /> {{ props.row.shop_name }}
                </span>
              </div>
              <div class="row items-center text-caption">
                <q-icon name="inventory" size="xs" class="q-mr-xs text-grey-6" />
                <span :class="props.row.stock > 0 ? 'text-grey-8' : 'text-red text-weight-bold'">
                  {{ props.row.stock ?? 0 }} un
                </span>
              </div>
            </div>
          </q-td>

          <!-- Preço -->
          <q-td key="price" :props="props" align="right">
            <div class="text-subtitle1 text-weight-bold price-main">
              {{ formatCurrency(props.row.price) }}
            </div>
            <div v-if="hasDiscount(props.row)" class="row items-center justify-end q-gutter-x-xs q-mt-xs">
              <span class="text-grey-5" style="text-decoration:line-through;font-size:11px">
                {{ formatCurrency(props.row.original_price) }}
              </span>
              <q-badge color="deep-orange" style="font-size:9px;padding:2px 5px;border-radius:8px">
                -{{ discountPct(props.row) }}%
              </q-badge>
            </div>
          </q-td>

          <!-- Analytics: visitas, vendas, avaliação -->
          <q-td key="analytics" :props="props" align="center">
            <div class="column items-center q-gutter-y-xs">
              <div class="analytics-chip">
                <q-icon name="visibility" size="12px" class="q-mr-xs text-grey-5" />
                <span>{{ (props.row.views || 0).toLocaleString('pt-BR') }}</span>
              </div>
              <div class="analytics-chip" :class="props.row.sales > 0 ? 'analytics-chip--sales' : ''">
                <q-icon name="shopping_cart" size="12px" class="q-mr-xs" :class="props.row.sales > 0 ? 'text-teal-7' : 'text-grey-5'" />
                <span :class="props.row.sales > 0 ? 'text-teal-8 text-weight-bold' : ''">{{ (props.row.sales || 0).toLocaleString('pt-BR') }}</span>
              </div>
              <div v-if="props.row.rating_count" class="analytics-chip">
                <q-icon name="star" size="12px" color="amber" class="q-mr-xs" />
                <span>{{ Number(props.row.rating_star || 0).toFixed(1) }}</span>
              </div>
            </div>
          </q-td>

          <!-- Status -->
          <q-td key="status" :props="props" align="center">
            <div class="status-pill" :class="`status-pill--${statusColorClass(props.row.status)}`">
              {{ statusLabel(props.row.status) }}
            </div>
          </q-td>

          <!-- Sincronizado -->
          <q-td key="last_synced_at" :props="props" align="right">
            <span class="text-caption text-grey-5">{{ formatDate(props.row.last_synced_at) }}</span>
          </q-td>

        </q-tr>

        <!-- ── Expand row ── -->
        <q-tr v-show="props.expand" :props="props">
          <q-td colspan="100%" class="q-pa-none">
            <div class="expand-panel">

              <!-- Loading detalhe -->
              <div v-if="detailLoading[props.row.item_id] || (props.row.has_model && !itemDetails[props.row.item_id])"
                class="flex flex-center q-py-lg">
                <q-spinner color="teal-7" size="28px" />
                <span class="q-ml-sm text-caption text-grey-6">Carregando detalhes...</span>
              </div>

              <div v-else class="row q-col-gutter-lg">

                <!-- Imagens -->
                <div class="col-12 col-md-3">
                  <div class="expand-section-label">Imagens</div>
                  <div class="row q-gutter-xs">
                    <template v-if="(itemDetails[props.row.item_id]?.images || props.row.images || []).length">
                      <q-img
                        v-for="(img, i) in (showAllImages[props.row.item_id]
                          ? (itemDetails[props.row.item_id]?.images || props.row.images || [])
                          : (itemDetails[props.row.item_id]?.images || props.row.images || []).slice(0, 3))"
                        :key="i"
                        :src="img"
                        style="width:60px;height:60px"
                        fit="cover"
                        class="rounded-borders border-grey" />
                      <div
                        v-if="!showAllImages[props.row.item_id] && (itemDetails[props.row.item_id]?.images || props.row.images || []).length > 3"
                        class="img-more-tile rounded-borders cursor-pointer"
                        @click="showAllImages[props.row.item_id] = true">
                        +{{ (itemDetails[props.row.item_id]?.images || props.row.images || []).length - 3 }}
                      </div>
                    </template>
                    <div v-else class="text-caption text-grey-5 q-pa-sm">Sem imagens</div>
                  </div>
                </div>

                <!-- Detalhes -->
                <div class="col-12 col-md-4">
                  <div class="expand-section-label">Detalhes</div>
                  <q-markup-table flat dense class="bg-transparent detail-table">
                    <tbody>
                      <tr>
                        <td class="detail-label">Item ID</td>
                        <td class="font-mono text-grey-9">{{ props.row.item_id }}</td>
                      </tr>
                      <tr v-if="props.row.item_sku">
                        <td class="detail-label">SKU</td>
                        <td class="font-mono text-grey-9">{{ props.row.item_sku }}</td>
                      </tr>
                      <tr>
                        <td class="detail-label">Preço atual</td>
                        <td>
                          <span class="text-weight-bold price-main">{{ formatCurrency(props.row.price) }}</span>
                          <span v-if="hasDiscount(props.row)" class="q-ml-xs">
                            <span class="text-grey-5" style="text-decoration:line-through;font-size:11px">
                              {{ formatCurrency(props.row.original_price) }}
                            </span>
                            <q-badge color="deep-orange" class="q-ml-xs" style="font-size:10px;border-radius:6px">
                              -{{ discountPct(props.row) }}%
                            </q-badge>
                          </span>
                        </td>
                      </tr>
                      <tr v-if="hasDiscount(props.row)">
                        <td class="detail-label">Preço original</td>
                        <td class="text-grey-7">{{ formatCurrency(props.row.original_price) }}</td>
                      </tr>
                      <tr v-if="hasDiscount(props.row)">
                        <td class="detail-label">Desconto</td>
                        <td class="text-weight-bold" style="color:#EE4D2D">{{ discountPct(props.row) }}%</td>
                      </tr>
                      <tr>
                        <td class="detail-label">Estoque</td>
                        <td :class="(props.row.stock ?? 0) === 0 ? 'text-negative text-weight-bold' : 'text-grey-9'">
                          {{ props.row.stock ?? 0 }} un
                        </td>
                      </tr>
                      <tr v-if="props.row.views != null">
                        <td class="detail-label">Visitas</td>
                        <td class="text-grey-9">{{ (props.row.views || 0).toLocaleString('pt-BR') }}</td>
                      </tr>
                      <tr v-if="props.row.sales != null">
                        <td class="detail-label">Vendas</td>
                        <td class="text-grey-9">{{ (props.row.sales || 0).toLocaleString('pt-BR') }}</td>
                      </tr>
                      <tr v-if="props.row.rating_count">
                        <td class="detail-label">Avaliação</td>
                        <td class="text-grey-9">
                          <q-icon name="star" color="amber" size="12px" />
                          {{ Number(props.row.rating_star || 0).toFixed(1) }}
                          <span class="text-grey-5">({{ props.row.rating_count }})</span>
                        </td>
                      </tr>
                    </tbody>
                  </q-markup-table>
                </div>

                <!-- Variações + link -->
                <div class="col-12 col-md-5">
                  <template v-if="itemDetails[props.row.item_id]?.variations?.length">
                    <div class="expand-section-label">
                      Variações ({{ itemDetails[props.row.item_id].variations.length }})
                    </div>
                    <q-markup-table flat dense class="bg-transparent variation-table">
                      <thead>
                        <tr>
                          <th class="text-left var-th">Variação</th>
                          <th class="text-left var-th">SKU</th>
                          <th class="text-right var-th">Preço</th>
                          <th class="text-right var-th">Estoque</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="v in itemDetails[props.row.item_id].variations" :key="v.model_id"
                          :class="v.status === 'DELETED' ? 'text-grey-4' : ''">
                          <td class="text-grey-9 var-td">{{ v.model_name || '—' }}</td>
                          <td class="font-mono text-grey-6 var-td">{{ v.model_sku || '—' }}</td>
                          <td class="text-right var-td">
                            <span class="text-weight-bold price-main" style="font-size:12px">{{ formatCurrency(v.price) }}</span>
                            <span v-if="hasDiscountV(v)" class="q-ml-xs text-grey-5"
                              style="text-decoration:line-through;font-size:10px">
                              {{ formatCurrency(v.original_price) }}
                            </span>
                          </td>
                          <td class="text-right var-td"
                            :class="(v.stock ?? 0) === 0 ? 'text-red text-weight-bold' : 'text-grey-9'">
                            {{ v.stock ?? 0 }}
                          </td>
                        </tr>
                      </tbody>
                    </q-markup-table>
                  </template>
                  <template v-else-if="!props.row.has_model">
                    <div class="expand-section-label">Variações</div>
                    <div class="text-caption text-grey-5">Produto sem variações</div>
                  </template>

                  <div class="q-mt-md">
                    <q-btn outline color="deep-orange" icon="open_in_new" label="Ver na Shopee"
                      :href="`https://shopee.com.br/product/${props.row.shop_id}/${props.row.item_id}`"
                      target="_blank" type="a" size="sm" class="q-px-md" style="border-radius:8px" />
                  </div>
                </div>

              </div>
            </div>
          </q-td>
        </q-tr>

      </template>

    </q-table>

    <!-- ══ FILTROS AVANÇADOS (painel direito) ══════════════════ -->
    <q-dialog v-model="showAdvanced" position="right" :maximized="true"
      transition-show="slide-left" transition-hide="slide-right">
      <q-card class="fadv-panel" style="width:360px;max-width:100vw;height:100vh">
        <div class="fadv-header">
          <span class="fadv-title">Filtros Avançados</span>
          <button class="fadv-close" @click="showAdvanced = false">
            <q-icon name="close" size="18px" />
          </button>
        </div>
        <q-scroll-area style="height:calc(100vh - 110px)">
          <div class="fadv-body">

            <!-- Estoque -->
            <div class="fadv-section">
              <div class="fadv-section-label">Faixa de Estoque</div>
              <div class="fadv-range-row">
                <input class="fadv-input" type="number" placeholder="Mín" v-model.number="filters.stockMin" />
                <span class="fadv-range-sep">→</span>
                <input class="fadv-input" type="number" placeholder="Máx" v-model.number="filters.stockMax" />
              </div>
            </div>

            <!-- Preço -->
            <div class="fadv-section">
              <div class="fadv-section-label">Faixa de Preço (R$)</div>
              <div class="fadv-range-row">
                <input class="fadv-input" type="number" placeholder="Mín" v-model.number="filters.priceMin" />
                <span class="fadv-range-sep">→</span>
                <input class="fadv-input" type="number" placeholder="Máx" v-model.number="filters.priceMax" />
              </div>
            </div>

            <!-- Vendas mínimas -->
            <div class="fadv-section">
              <div class="fadv-section-label">Vendas Mínimas</div>
              <input class="fadv-input fadv-input--full" type="number" placeholder="Ex: 10" v-model.number="filters.salesMin" />
            </div>

            <!-- Avaliação mínima -->
            <div class="fadv-section">
              <div class="fadv-section-label">Avaliação Mínima (0 – 5)</div>
              <input class="fadv-input fadv-input--full" type="number" placeholder="Ex: 4.5"
                min="0" max="5" step="0.1" v-model.number="filters.ratingMin" />
            </div>

          </div>
        </q-scroll-area>
        <div class="fadv-footer">
          <button class="fadv-btn-clear" @click="clearFilters; showAdvanced = false">Limpar tudo</button>
          <button class="fadv-btn-apply" @click="loadItems(); showAdvanced = false">Aplicar</button>
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'
import { DateTime } from 'luxon'

const $q = useQuasar()

// ── Estado ──────────────────────────────────────────────────────────────────
const items          = ref([])
const loading        = ref(false)
const syncing        = ref(false)
const searchFocused  = ref(false)
const showAdvanced   = ref(false)
const accountOptions = ref([])
const currentSort    = ref('-last_synced_at')
const itemDetails    = ref({})   // cache de detalhes completos por item_id
const detailLoading  = ref({})   // loading state por item_id
const showAllImages  = ref({})   // per item_id: show all images or just first 3
const selectedItems  = ref([])

const pagination = ref({
  sortBy: null,
  descending: false,
  page: 1,
  rowsPerPage: 40,
  rowsNumber: 0,
})

let searchTimeout = null

const filters = reactive({
  search:      '',
  account:     [],
  status:      [],
  stockStatus: null,   // null | 'zero' | 'positive' | 'low'
  hasDiscount: null,   // null | true | false
  // advanced
  stockMin:    null,
  stockMax:    null,
  priceMin:    null,
  priceMax:    null,
  salesMin:    null,
  ratingMin:   null,
})

// ── Colunas ────────────────────────────────────────────────────────────────
const columns = [
  { name: 'thumbnail',      label: '',             field: 'thumbnail',      sortable: false, align: 'left'   },
  { name: 'item_name',      label: 'Anúncio',      field: 'item_name',      sortable: true,  align: 'left'   },
  { name: 'price',          label: 'Preço',        field: 'price',          sortable: true,  align: 'right'  },
  { name: 'analytics',      label: 'Analytics',    field: 'views',          sortable: false, align: 'center' },
  { name: 'status',         label: 'Status',       field: 'status',         sortable: false, align: 'center' },
  { name: 'last_synced_at', label: 'Sincronizado', field: 'last_synced_at', sortable: true,  align: 'right'  },
]

// ── Opções ─────────────────────────────────────────────────────────────────
const statusOptions = [
  { value: 'NORMAL',  label: 'Ativo'    },
  { value: 'UNLIST',  label: 'Pausado'  },
  { value: 'BANNED',  label: 'Banido'   },
  { value: 'DELETED', label: 'Deletado' },
]

const stockOptions = [
  { value: null,       label: 'Todos'              },
  { value: 'positive', label: 'Com estoque'        },
  { value: 'zero',     label: 'Sem estoque'        },
  { value: 'low',      label: 'Estoque baixo (<5)' },
]

const sortOptions = [
  { value: '-last_synced_at', label: 'Mais recente'   },
  { value: 'item_name',       label: 'Nome A→Z'        },
  { value: '-item_name',      label: 'Nome Z→A'        },
  { value: '-price',          label: 'Maior preço'     },
  { value: 'price',           label: 'Menor preço'     },
  { value: '-stock',          label: 'Maior estoque'   },
  { value: 'stock',           label: 'Menor estoque'   },
  { value: '-sales',          label: 'Mais vendidos'   },
  { value: '-views',          label: 'Mais visitados'  },
]

// ── Computeds ──────────────────────────────────────────────────────────────
const currentSortLabel = computed(() =>
  sortOptions.find(o => o.value === currentSort.value)?.label || 'Ordenar'
)

const advancedFilterCount = computed(() => [
  !!(filters.stockMin || filters.stockMax),
  !!(filters.priceMin || filters.priceMax),
  !!filters.salesMin,
  !!filters.ratingMin,
].filter(Boolean).length)

const hasActiveFilters = computed(() =>
  !!filters.search ||
  filters.account?.length > 0 ||
  filters.status?.length > 0 ||
  !!filters.stockStatus ||
  filters.hasDiscount !== null ||
  advancedFilterCount.value > 0
)

const allSelected  = computed(() => items.value.length > 0 && selectedItems.value.length === items.value.length)
const someSelected = computed(() => selectedItems.value.length > 0 && selectedItems.value.length < items.value.length)

// ── Helpers ────────────────────────────────────────────────────────────────
const statusLabel = (s) =>
  ({ NORMAL: 'Ativo', UNLIST: 'Pausado', BANNED: 'Banido', DELETED: 'Deletado' })[s] || s || '—'

const statusColorClass = (s) =>
  ({ NORMAL: 'active', UNLIST: 'paused', BANNED: 'banned', DELETED: 'deleted' })[s] || 'deleted'

const statusColor = (s) =>
  ({ NORMAL: 'positive', UNLIST: 'warning', BANNED: 'negative', DELETED: 'grey-6' })[s] || 'grey-6'

const formatCurrency = (v) =>
  v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const formatDate = (v) =>
  v ? DateTime.fromISO(v).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm') : '—'

const hasDiscount  = (row) => row.original_price && Number(row.original_price) > Number(row.price) + 0.01
const hasDiscountV = (v)   => v.original_price  && Number(v.original_price)  > Number(v.price)  + 0.01
const discountPct  = (row) => Math.round((1 - Number(row.price) / Number(row.original_price)) * 100)

const copyText = (text) => {
  navigator.clipboard.writeText(String(text))
  $q.notify({ message: `Copiado: ${text}`, color: 'dark', position: 'top', timeout: 1500 })
}

const isSelected   = (row) => selectedItems.value.some(r => r.item_id === row.item_id)
const toggleSelect = (row) => {
  const idx = selectedItems.value.findIndex(r => r.item_id === row.item_id)
  if (idx === -1) selectedItems.value = [...selectedItems.value, row]
  else selectedItems.value = selectedItems.value.filter(r => r.item_id !== row.item_id)
}
const toggleAll = (val) => { selectedItems.value = val ? [...items.value] : [] }

// ── Filtro toggles ─────────────────────────────────────────────────────────
const toggleAccountFilter = (id) => {
  const idx = filters.account.indexOf(id)
  if (idx === -1) filters.account.push(id)
  else filters.account.splice(idx, 1)
  loadItems()
}

const toggleStatusFilter = (val) => {
  const idx = filters.status.indexOf(val)
  if (idx === -1) filters.status.push(val)
  else filters.status.splice(idx, 1)
  loadItems()
}

// ── Smart Views ────────────────────────────────────────────────────────────
const setViewSemEstoque = () => {
  clearFilters(false)
  filters.stockStatus = 'zero'
  loadItems()
}
const setViewComDesconto = () => {
  clearFilters(false)
  filters.hasDiscount = true
  loadItems()
}
const setViewSemAvaliacoes = () => {
  clearFilters(false)
  // Filtramos via sort e o backend filtrará rating_count=0 via search params
  // Passamos como param extra via buildParams
  filters._ratingZero = true
  loadItems()
}
const setViewMaisVendidos = () => {
  clearFilters(false)
  currentSort.value = '-sales'
  loadItems()
}
const setViewVariacoes = () => {
  clearFilters(false)
  filters._hasModel = true
  loadItems()
}

// ── API ────────────────────────────────────────────────────────────────────
const loadAccounts = async () => {
  try {
    const { data } = await api.get('/shopee/accounts/')
    accountOptions.value = Array.isArray(data) ? data : (data.results || [])
    loadItems()
  } catch {
    $q.notify({ message: 'Erro ao carregar contas Shopee.', color: 'negative', position: 'top' })
  }
}

const buildParams = (pg = pagination.value) => {
  const p = {
    page:      pg.page,
    page_size: pg.rowsPerPage,
    sort:      currentSort.value,
  }
  if (filters.account?.length)       p.account      = filters.account.join(',')
  if (filters.status?.length)        p.status       = filters.status.join(',')
  if (filters.search)                p.search       = filters.search
  if (filters.stockStatus)           p.stock_status = filters.stockStatus
  if (filters.hasDiscount !== null)  p.has_discount = filters.hasDiscount
  if (filters.stockMin != null)      p.stock_min    = filters.stockMin
  if (filters.stockMax != null)      p.stock_max    = filters.stockMax
  if (filters.priceMin != null)      p.price_min    = filters.priceMin
  if (filters.priceMax != null)      p.price_max    = filters.priceMax
  if (filters.salesMin != null)      p.sales_min    = filters.salesMin
  if (filters.ratingMin != null)     p.rating_min   = filters.ratingMin
  if (filters._ratingZero)           p.rating_count = 0
  if (filters._hasModel)             p.has_model    = true
  return p
}

const loadItems = async (pg = null) => {
  loading.value = true
  if (pg) {
    pagination.value.page        = pg.page
    pagination.value.rowsPerPage = pg.rowsPerPage
  } else {
    pagination.value.page = 1
  }
  try {
    const { data } = await api.get('/shopee/items/', { params: buildParams() })
    const list = Array.isArray(data) ? data : (data.results || [])
    items.value = list
    pagination.value.rowsNumber = data.count ?? list.length
  } catch {
    $q.notify({ message: 'Erro ao carregar anúncios.', color: 'negative', position: 'top' })
  } finally {
    loading.value = false
  }
}

// Busca detalhe completo (com variações) ao expandir — cacheia por item_id
const toggleExpand = async (props) => {
  props.expand = !props.expand
  const itemId = props.row.item_id
  if (props.expand && !itemDetails.value[itemId]) {
    detailLoading.value[itemId] = true
    try {
      const { data } = await api.get(`/shopee/items/${props.row.id}/`)
      itemDetails.value[itemId] = data
      // Atualiza campos de analytics/imagens na linha da tabela
      const idx = items.value.findIndex(r => r.item_id === itemId)
      if (idx !== -1) {
        items.value[idx] = { ...items.value[idx], ...data }
      }
    } catch {
      $q.notify({ message: 'Erro ao carregar detalhes do item.', color: 'negative', position: 'top' })
    } finally {
      detailLoading.value[itemId] = false
    }
  }
}

const onRequest = (props) => loadItems(props.pagination)

const onSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadItems(), 400)
}

const applySort = (val) => {
  currentSort.value = val
  loadItems()
}

const clearFilters = (andReload = true) => {
  filters.search      = ''
  filters.account     = []
  filters.status      = []
  filters.stockStatus = null
  filters.hasDiscount = null
  filters.stockMin    = null
  filters.stockMax    = null
  filters.priceMin    = null
  filters.priceMax    = null
  filters.salesMin    = null
  filters.ratingMin   = null
  filters._ratingZero = false
  filters._hasModel   = false
  if (andReload) loadItems()
}

const syncItems = async () => {
  const accountId = filters.account?.length === 1
    ? filters.account[0]
    : (accountOptions.value.length === 1 ? accountOptions.value[0].id : null)
  if (!accountId) {
    $q.notify({ message: 'Selecione uma conta para sincronizar.', color: 'warning', position: 'top' })
    return
  }
  syncing.value = true
  try {
    const { data } = await api.post(`/shopee/accounts/${accountId}/sync_items/`)
    $q.notify({
      message: `Sync concluído: ${data.stats?.synced ?? 0} anúncios sincronizados.`,
      color: 'positive', position: 'top', timeout: 4000,
    })
    loadItems()
  } catch (e) {
    $q.notify({
      message: `Erro ao sincronizar: ${e?.response?.data?.error || e.message}`,
      color: 'negative', position: 'top',
    })
  } finally {
    syncing.value = false
  }
}

onMounted(loadAccounts)
</script>

<style scoped>
/* ── Page ─────────────────────────────────────────────────────────────── */
.shopee-items-page { background: #f8fafc; font-family: 'Roboto', sans-serif; }

/* ── Header ──────────────────────────────────────────────────────────── */
.page-header {
  background: #fff;
  padding: 14px 20px;
  border-bottom: 1.5px solid #e2e8f0;
}
.header-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ff6600, #EE4D2D); color: #fff;
  flex-shrink: 0;
}
.header-eyebrow {
  font-size: 10px; color: #94a3b8; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.2px;
}
.header-title   { font-size: 16px; font-weight: 700; color: #0f172a; }
.header-count   {
  font-size: 12px; color: #94a3b8; background: #f1f5f9;
  border-radius: 20px; padding: 2px 10px;
}

/* ── Filter bar ──────────────────────────────────────────────────────── */
.fb { background: #fff; border-bottom: 1px solid #e2e8f0; }

.fb-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px 0; flex-wrap: wrap;
}
.fb-search {
  display: flex; align-items: center; gap: 6px;
  flex: 1; min-width: 180px; max-width: 360px;
  height: 34px; border-radius: 8px;
  border: 1.5px solid #e2e8f0; background: #f8fafc;
  padding: 0 10px; transition: border-color .15s, background .15s;
}
.fb-search.focused,
.fb-search.filled { border-color: #0d9488; background: #fff; }
.fb-search-icon  { color: #94a3b8; flex-shrink: 0; }
.fb-search-input {
  flex: 1; border: none; background: transparent;
  font-size: 13px; color: #0f172a; outline: none;
}
.fb-search-clear {
  background: none; border: none; cursor: pointer; color: #94a3b8;
  padding: 0; display: flex; align-items: center;
}
.fb-search-clear:hover { color: #0f172a; }

.fb-toolbar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: auto; }
.fb-btn-group { display: flex; }

.fb-tbtn {
  display: flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: 7px;
  border: 1.5px solid #e2e8f0; background: #fff !important;
  font-size: 12px !important; font-weight: 500; color: #64748b !important;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.fb-tbtn:hover { background: #f8fafc !important; }
.fb-tbtn--active { border-color: #0d9488 !important; color: #0d9488 !important; background: #f0fdf9 !important; }
.fb-adv-badge {
  background: #0d9488; color: #fff;
  font-size: 10px; font-weight: 700; border-radius: 10px;
  padding: 1px 5px; min-width: 16px; text-align: center;
}
.fb-clear-btn {
  display: flex; align-items: center; gap: 4px;
  height: 30px; padding: 0 10px; border-radius: 7px;
  border: none; background: none; font-size: 12px;
  color: #ef4444; cursor: pointer; transition: background .15s;
}
.fb-clear-btn:hover { background: #fef2f2; }

/* ── Filterbar pill comboboxes ────────────────────────────────────────── */
.fb-filterbar {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px 10px; flex-wrap: wrap;
}
.fb-combo {
  position: relative; display: flex; align-items: center;
  border: 1.5px solid #e2e8f0; border-radius: 20px;
  background: #fff; transition: border-color .15s; overflow: visible;
}
.fb-combo:hover { border-color: #cbd5e1; }
.fb-combo--on   { border-color: #0d9488; background: #f0fdf9; }
.fb-combo-btn {
  display: flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 10px 0 9px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 500; color: #374151; border-radius: 20px;
}
.fb-combo--on .fb-combo-btn { color: #0d9488; }
.fb-combo-ico   { color: #94a3b8; flex-shrink: 0; }
.fb-combo--on .fb-combo-ico { color: #0d9488; }
.fb-combo-label { white-space: nowrap; }
.fb-combo-multi {
  background: #0d9488; color: #fff; border-radius: 10px;
  font-size: 10px; font-weight: 700; padding: 0 5px;
}
.fb-combo-arrow { color: #94a3b8; }
.fb-combo-clear {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: #0d9488; border: none; cursor: pointer;
  color: #fff; margin-right: 5px; flex-shrink: 0;
}
.fb-combo-clear:hover { background: #0f766e; }

.fb-menu { border-radius: 10px !important; box-shadow: 0 4px 20px rgba(0,0,0,.10) !important; }
.fb-menu-item { transition: background .1s; }
.fb-menu-item--on { background: #f0fdf9 !important; }
.fb-menu-item-label { font-size: 13px; }

/* ── Filter index ─────────────────────────────────────────────────────── */
.fb-index { border-top: 1px solid #f1f5f9; padding: 8px 16px; background: #f8fafc; }
.fb-index-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.fb-index-title { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #64748b; }
.fb-index-count { background: #e2e8f0; border-radius: 10px; padding: 0 7px; font-size: 10px; }
.fb-index-clear {
  display: flex; align-items: center; gap: 3px; font-size: 11px;
  color: #ef4444; background: none; border: none; cursor: pointer; padding: 0;
}
.fb-index-rows { display: flex; flex-direction: column; gap: 4px; }
.fb-index-row  { display: flex; align-items: flex-start; gap: 8px; }
.fb-index-cat  {
  display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600;
  color: #94a3b8; text-transform: uppercase; letter-spacing: .4px;
  min-width: 70px; padding-top: 2px;
}
.fb-index-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.fb-index-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 12px;
  background: #f0fdf9; color: #0d9488;
  font-size: 11px; font-weight: 500;
  cursor: pointer; transition: background .1s;
}
.fb-index-pill:hover { background: #ccfbf1; }

/* ── Smart Views bar ──────────────────────────────────────────────────── */
.smart-views-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px;
  background: #fff; border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.sv-label {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .5px; flex-shrink: 0;
}
.sv-chips { display: flex; gap: 6px; flex-shrink: 0; }
.sv-chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 10px; border-radius: 14px;
  border: 1.5px solid; background: #fff;
  font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all .15s; white-space: nowrap;
}
.sv-chip--red    { border-color: #fca5a5; color: #dc2626; }
.sv-chip--red:hover    { background: #fef2f2; }
.sv-chip--orange { border-color: #fdba74; color: #EE4D2D; }
.sv-chip--orange:hover { background: #fff8f7; }
.sv-chip--amber  { border-color: #fbbf24; color: #b45309; }
.sv-chip--amber:hover  { background: #fef3c7; }
.sv-chip--teal   { border-color: #5eead4; color: #0d9488; }
.sv-chip--teal:hover   { background: #f0fdf9; }
.sv-chip--slate  { border-color: #cbd5e1; color: #475569; }
.sv-chip--slate:hover  { background: #f1f5f9; }
.sv-clear {
  display: flex; align-items: center; gap: 4px;
  margin-left: auto; flex-shrink: 0;
  font-size: 11px; color: #94a3b8;
  background: none; border: none; cursor: pointer;
}
.sv-clear:hover { color: #ef4444; }

/* ── Bulk bar ─────────────────────────────────────────────────────────── */
.bulk-bar {
  background: #f0fdf9;
  border-bottom: 1px solid #99f6e4;
  border-top: 1px solid #99f6e4;
}

/* ── Tabela ───────────────────────────────────────────────────────────── */
.shopee-table { background: #fff; }

:deep(.shopee-table .q-table__top) { display: none; }

:deep(.shopee-table thead tr th) {
  position: sticky; top: 0; z-index: 1;
  background: #f8fafc;
  font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .4px;
  border-bottom: 1.5px solid #e2e8f0;
}

:deep(.shopee-table tbody tr.hover-row:hover) {
  background: #f0fdf9 !important;
}

:deep(.shopee-table tbody tr.row-selected) {
  background: #e6fdf8 !important;
}

:deep(.shopee-table tbody tr.row-expanded) {
  background: #f0fdf9 !important;
}

:deep(.shopee-table tbody td) {
  border-bottom: 1px solid #f1f5f9;
  min-height: 65px; height: auto; vertical-align: top;
}

/* ── Células especiais ────────────────────────────────────────────────── */
.badge-mono {
  background: #f1f5f9; color: #475569;
  padding: 1px 5px; border-radius: 5px;
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.5px; font-size: 11px;
}
.badge-mono:hover { background: #e2e8f0; }

.shop-badge {
  color: #EE4D2D; font-weight: 700; font-size: 11px;
}

.price-main { color: #EE4D2D; }

.analytics-chip {
  display: flex; align-items: center;
  font-size: 11px; color: #64748b;
  white-space: nowrap;
}

/* ── Status pills ─────────────────────────────────────────────────────── */
.status-pill {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
}
.status-pill--active  { background: #dcfce7; color: #16a34a; }
.status-pill--paused  { background: #fef3c7; color: #b45309; }
.status-pill--banned  { background: #fee2e2; color: #dc2626; }
.status-pill--deleted { background: #f1f5f9; color: #94a3b8; }

/* ── Expand row ───────────────────────────────────────────────────────── */
.expand-panel {
  background: #fff;
  padding: 16px 20px;
  border-top: 2px solid #0d9488;
}

.expand-section-label {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .5px;
  margin-bottom: 8px;
}

/* ── Image more tile ──────────────────────────────────────────────────── */
.img-more-tile {
  width: 60px; height: 60px;
  display: flex; align-items: center; justify-content: center;
  background: #f0fdf9; border: 1.5px dashed #0d9488;
  color: #0d9488; font-size: 13px; font-weight: 700;
  transition: background .15s;
}
.img-more-tile:hover { background: #ccfbf1; }

/* ── Detail table ─────────────────────────────────────────────────────── */
:deep(.detail-table tbody td) {
  padding: 4px 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px;
}
.detail-label { color: #94a3b8; width: 100px; font-size: 12px; }

/* ── Variation table ──────────────────────────────────────────────────── */
.variation-table { border-radius: 8px; overflow: hidden; }

:deep(.variation-table thead tr th) {
  background: #0d9488;
  color: #fff;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px;
  padding: 6px 10px;
}
:deep(.variation-table tbody td) {
  padding: 5px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px;
}
:deep(.variation-table tbody tr:last-child td) { border-bottom: none; }

.var-th { font-size: 10px !important; }
.var-td { font-size: 11px; }

/* ── Advanced filters panel ───────────────────────────────────────────── */
.fadv-panel { display: flex; flex-direction: column; border-radius: 0 !important; }
.fadv-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #fff;
}
.fadv-title { font-size: 15px; font-weight: 700; color: #0f172a; }
.fadv-close { background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; }
.fadv-close:hover { color: #0f172a; }
.fadv-body  { padding: 8px 0; }
.fadv-section { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; }
.fadv-section-label {
  font-size: 11px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px;
}
.fadv-range-row { display: flex; align-items: center; gap: 8px; }
.fadv-range-sep { color: #94a3b8; font-size: 12px; }
.fadv-input {
  height: 34px; width: 100px; padding: 0 10px;
  border: 1.5px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; color: #0f172a; background: #f8fafc;
  outline: none; transition: border-color .15s;
}
.fadv-input:focus { border-color: #0d9488; background: #fff; }
.fadv-input--full { width: 100%; box-sizing: border-box; }
.fadv-footer {
  display: flex; gap: 8px; padding: 14px 20px;
  border-top: 1px solid #e2e8f0; background: #fff; margin-top: auto;
}
.fadv-btn-clear {
  flex: 1; height: 36px; border-radius: 8px;
  border: 1.5px solid #e2e8f0; background: #fff;
  font-size: 13px; font-weight: 500; color: #374151; cursor: pointer;
}
.fadv-btn-clear:hover { background: #f8fafc; }
.fadv-btn-apply {
  flex: 2; height: 36px; border-radius: 8px;
  border: none; background: #0d9488; color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.fadv-btn-apply:hover { background: #0f766e; }

/* ── Utilities ────────────────────────────────────────────────────────── */
.font-mono {
  font-family: 'Roboto Mono', monospace; letter-spacing: -0.5px;
}
.border-grey { border: 1px solid #e2e8f0; }

/* ── Transitions ──────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

.slide-fade-enter-active { transition: all .25s ease-out; }
.slide-fade-leave-active { transition: all .2s cubic-bezier(1, .5, .8, 1); }
.slide-fade-enter-from,
.slide-fade-leave-to     { transform: translateY(-10px); opacity: 0; }
</style>
