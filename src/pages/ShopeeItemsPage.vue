<template>
  <q-page class="shopee-items-page">

    <!-- ══ HEADER ═══════════════════════════════════════════════ -->
    <div class="page-header row items-center q-gutter-sm">
      <div class="header-icon">
        <q-icon name="storefront" size="18px" />
      </div>
      <div class="column">
        <div class="header-eyebrow">Shopee</div>
        <div class="header-title">Anúncios</div>
      </div>
      <div v-if="pagination.rowsNumber" class="header-count">{{ pagination.rowsNumber.toLocaleString('pt-BR') }} anúncios</div>
      <div class="q-ml-auto row items-center q-gutter-xs">
        <q-btn flat dense icon="refresh" color="grey-6" size="sm" @click="loadItems" :loading="loading">
          <q-tooltip>Atualizar lista</q-tooltip>
        </q-btn>
        <q-btn unelevated color="deep-orange" icon="sync" label="Sincronizar" size="sm"
          :loading="syncing" @click="syncItems" class="q-px-md" style="border-radius:8px" />
      </div>
    </div>

    <!-- ══ FILTER BAR ══════════════════════════════════════════ -->
    <div class="fb">

      <div class="fb-toolbar">

        <!-- Busca -->
        <div class="fb-search" :class="[searchFocused && 'focused', filters.search && 'filled']">
          <q-icon name="search" size="15px" class="fb-search-icon" />
          <input
            class="fb-search-input"
            placeholder="Buscar por nome, SKU ou ID..."
            v-model="filters.search"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @input="onSearch"
          />
          <button v-if="filters.search" class="fb-search-clear" @click="filters.search = ''; loadItems()">
            <q-icon name="close" size="13px" />
          </button>
        </div>

        <!-- Ações direita -->
        <div class="fb-toolbar-actions">
          <!-- Ordenação -->
          <button class="fb-tbtn">
            <q-icon name="sort" size="13px" />
            {{ currentSortLabel }}
            <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
              <q-list style="min-width:180px">
                <q-item v-for="opt in sortOptions" :key="opt.value" clickable v-close-popup
                  :class="['fb-menu-item', currentSort === opt.value && 'fb-menu-item--on']"
                  @click="applySort(opt.value)">
                  <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </button>

          <!-- Filtros avançados -->
          <button class="fb-tbtn" :class="advancedFilterCount > 0 && 'fb-tbtn--active'"
            @click="showAdvanced = true">
            <q-icon name="tune" size="13px" />
            Avançado
            <span v-if="advancedFilterCount > 0" class="fb-adv-badge">{{ advancedFilterCount }}</span>
          </button>

          <!-- Limpar filtros -->
          <button v-if="hasActiveFilters" class="fb-clear-btn" @click="clearFilters">
            <q-icon name="filter_alt_off" size="13px" />Limpar
          </button>
        </div>

      </div>

      <!-- Filtros rápidos -->
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
          <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
            {{ col.label }}
          </q-th>
          <q-th auto-width />
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props"
          :class="[isSelected(props.row) ? 'row-selected' : (selectedItem?.item_id === props.row.item_id ? 'row-active' : 'hover-row')]"
          class="cursor-pointer"
          @click="openDetail(props.row)">

          <!-- Checkbox -->
          <q-td auto-width @click.stop>
            <q-checkbox :model-value="isSelected(props.row)" @update:model-value="toggleSelect(props.row)"
              color="teal-7" dense />
          </q-td>

          <!-- Thumbnail -->
          <q-td key="thumbnail" :props="props" style="width:70px">
            <div class="relative-position">
              <q-img :src="props.row.thumbnail || ''" style="height:52px;width:52px" fit="contain"
                class="rounded-borders border-grey thumb-img">
                <template v-slot:error>
                  <div class="absolute-full flex flex-center bg-grey-2">
                    <q-icon name="image_not_supported" size="20px" color="grey-5" />
                  </div>
                </template>
              </q-img>
              <div class="thumb-status-dot" :class="`dot--${statusColorClass(props.row.status)}`" />
            </div>
          </q-td>

          <!-- Anúncio: nome, SKU, ID, loja -->
          <q-td key="item_name" :props="props" style="max-width:360px;white-space:normal">
            <div class="column q-gutter-y-xs">
              <div class="item-name text-grey-9">{{ props.row.item_name }}</div>
              <div class="row items-center q-gutter-x-sm text-caption">
                <span v-if="props.row.item_sku"
                  class="badge-mono cursor-pointer"
                  @click.stop="copyText(props.row.item_sku)">
                  <q-icon name="content_copy" size="9px" class="q-mr-xs text-grey-4" />
                  {{ props.row.item_sku }}
                  <q-tooltip class="bg-grey-9">Copiar SKU</q-tooltip>
                </span>
                <span class="badge-mono cursor-pointer" @click.stop="copyText(String(props.row.item_id))">
                  <q-icon name="content_copy" size="9px" class="q-mr-xs text-grey-4" />
                  ID {{ props.row.item_id }}
                  <q-tooltip class="bg-grey-9">Copiar ID</q-tooltip>
                </span>
                <span class="shop-badge">
                  <q-icon name="storefront" size="10px" /> {{ props.row.shop_name }}
                </span>
              </div>
              <!-- Atributos de variação (se houver) -->
              <div v-if="props.row.variation_attrs?.length" class="row items-center q-gutter-x-xs">
                <span v-for="attr in props.row.variation_attrs" :key="attr" class="var-attr-chip">
                  {{ attr }}
                </span>
              </div>
            </div>
          </q-td>

          <!-- Preço + Estoque -->
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
            <div class="q-mt-xs">
              <span :class="['stock-badge', props.row.stock > 0 ? 'stock-badge--ok' : 'stock-badge--zero']">
                <q-icon name="inventory" size="10px" />
                {{ props.row.stock ?? 0 }} un
              </span>
            </div>
          </q-td>

          <!-- Analytics: visitas, vendas, avaliação -->
          <q-td key="analytics" :props="props" align="center">
            <div class="analytics-grid">
              <div class="ag-cell" :class="props.row.views > 0 ? 'ag-cell--views' : 'ag-cell--zero'">
                <q-icon name="visibility" size="11px" class="ag-icon" />
                <span class="ag-value">{{ fmtNum(props.row.views) }}</span>
                <q-tooltip class="bg-grey-9">{{ (props.row.views || 0).toLocaleString('pt-BR') }} visitas</q-tooltip>
              </div>
              <div class="ag-cell" :class="props.row.sales > 0 ? 'ag-cell--sales' : 'ag-cell--zero'">
                <q-icon name="shopping_bag" size="11px" class="ag-icon" />
                <span class="ag-value">{{ fmtNum(props.row.sales) }}</span>
                <q-tooltip class="bg-grey-9">{{ (props.row.sales || 0).toLocaleString('pt-BR') }} vendas</q-tooltip>
              </div>
              <div class="ag-cell" :class="props.row.rating_count > 0 ? 'ag-cell--rating' : 'ag-cell--zero'">
                <q-icon name="star" size="11px" class="ag-icon" />
                <span class="ag-value">{{ props.row.rating_count > 0 ? Number(props.row.rating_star || 0).toFixed(1) : '—' }}</span>
                <q-tooltip v-if="props.row.rating_count" class="bg-grey-9">{{ Number(props.row.rating_star || 0).toFixed(1) }} ★ · {{ props.row.rating_count }} avaliações</q-tooltip>
              </div>
              <div class="ag-cell" :class="props.row.rating_count > 0 ? 'ag-cell--reviews' : 'ag-cell--zero'">
                <q-icon name="chat_bubble" size="11px" class="ag-icon" />
                <span class="ag-value">{{ fmtNum(props.row.rating_count) }}</span>
                <q-tooltip class="bg-grey-9">{{ (props.row.rating_count || 0).toLocaleString('pt-BR') }} avaliações</q-tooltip>
              </div>
            </div>
          </q-td>

          <!-- Status -->
          <q-td key="status" :props="props" align="center">
            <div class="status-pill" :class="`status-pill--${statusColorClass(props.row.status)}`">
              {{ statusLabel(props.row.status) }}
            </div>
          </q-td>

          <!-- Sync -->
          <q-td key="last_synced_at" :props="props" align="right">
            <span class="text-caption text-grey-5">{{ formatDate(props.row.last_synced_at) }}</span>
          </q-td>

          <!-- Detail button -->
          <q-td auto-width @click.stop>
            <q-btn flat dense round size="sm"
              :color="selectedItem?.item_id === props.row.item_id ? 'teal-7' : 'grey-5'"
              icon="chevron_right"
              @click.stop="openDetail(props.row)" />
          </q-td>

        </q-tr>
      </template>

    </q-table>

    <!-- ══ DETAIL DRAWER ════════════════════════════════════════ -->
    <q-dialog v-model="showDetail" position="right" :maximized="true"
      transition-show="slide-left" transition-hide="slide-right">
      <q-card class="detail-drawer" style="width:560px;max-width:100vw">

        <!-- Header -->
        <div class="dd-header">
          <div class="dd-header-meta">
            <div class="dd-header-eyebrow">Anúncio</div>
            <div class="dd-header-title">{{ selectedItem?.item_name }}</div>
          </div>
          <button class="dd-close" @click="showDetail = false">
            <q-icon name="close" size="20px" />
          </button>
        </div>

        <!-- Status + Link row -->
        <div class="dd-subheader">
          <div class="status-pill" :class="`status-pill--${statusColorClass(selectedItem?.status)}`">
            {{ statusLabel(selectedItem?.status) }}
          </div>
          <div class="row items-center q-gutter-xs">
            <span class="shop-badge">
              <q-icon name="storefront" size="10px" /> {{ selectedItem?.shop_name }}
            </span>
          </div>
          <q-space />
          <a :href="`https://shopee.com.br/product/${selectedItem?.shop_id}/${selectedItem?.item_id}`"
            target="_blank" class="dd-shopee-link">
            <q-icon name="open_in_new" size="13px" />Ver na Shopee
          </a>
        </div>

        <q-scroll-area style="flex:1;height:0">
          <div class="dd-body">

            <!-- Loading -->
            <div v-if="detailLoading[selectedItem?.item_id]" class="flex flex-center q-py-xl">
              <q-spinner color="teal-7" size="32px" />
              <span class="q-ml-sm text-caption text-grey-6">Carregando detalhes...</span>
            </div>

            <template v-else-if="selectedItem">

              <!-- ── Imagens ─────────────────────────────────────── -->
              <div v-if="allImages.length" class="dd-section">
                <div class="dd-section-label">Imagens ({{ allImages.length }})</div>
                <div class="img-gallery">
                  <div v-for="(img, i) in (showAllImages ? allImages : allImages.slice(0, 6))" :key="i"
                    class="img-tile" :class="i === 0 && 'img-tile--main'">
                    <q-img :src="img" fit="cover" class="rounded-borders border-grey full-height full-width"
                      style="min-height:60px" />
                  </div>
                  <div v-if="!showAllImages && allImages.length > 6"
                    class="img-tile img-more-tile rounded-borders cursor-pointer"
                    @click="showAllImages = true">
                    +{{ allImages.length - 6 }}
                  </div>
                </div>
              </div>

              <!-- ── Stats ──────────────────────────────────────── -->
              <div class="dd-section">
                <div class="dd-stats-row">
                  <div class="dd-stat">
                    <div class="dd-stat-value price-main">{{ formatCurrency(selectedItem.price) }}</div>
                    <div class="dd-stat-label">Preço atual</div>
                    <div v-if="hasDiscount(selectedItem)" class="dd-stat-sub">
                      <span style="text-decoration:line-through;color:#94a3b8">{{ formatCurrency(selectedItem.original_price) }}</span>
                      <q-badge color="deep-orange" class="q-ml-xs" style="font-size:9px">-{{ discountPct(selectedItem) }}%</q-badge>
                    </div>
                  </div>
                  <div class="dd-stat">
                    <div class="dd-stat-value" :class="(selectedItem.stock ?? 0) === 0 ? 'text-red' : 'text-grey-9'">
                      {{ (selectedItem.stock ?? 0).toLocaleString('pt-BR') }}
                    </div>
                    <div class="dd-stat-label">Estoque</div>
                  </div>
                  <div class="dd-stat">
                    <div class="dd-stat-value text-green-7">{{ (selectedItem.sales || 0).toLocaleString('pt-BR') }}</div>
                    <div class="dd-stat-label">Vendas</div>
                  </div>
                  <div class="dd-stat">
                    <div class="dd-stat-value text-blue-7">{{ (selectedItem.views || 0).toLocaleString('pt-BR') }}</div>
                    <div class="dd-stat-label">Visitas</div>
                  </div>
                  <div v-if="selectedItem.rating_count" class="dd-stat">
                    <div class="dd-stat-value text-amber-7">
                      <q-icon name="star" size="14px" />{{ Number(selectedItem.rating_star || 0).toFixed(1) }}
                    </div>
                    <div class="dd-stat-label">{{ selectedItem.rating_count }} aval.</div>
                  </div>
                </div>
              </div>

              <!-- ── Detalhes ───────────────────────────────────── -->
              <div class="dd-section">
                <div class="dd-section-label">Informações</div>
                <div class="dd-kv-grid">
                  <div class="dd-kv-row">
                    <span class="dd-kv-key">Item ID</span>
                    <span class="font-mono dd-kv-val cursor-pointer" @click="copyText(String(selectedItem.item_id))">
                      {{ selectedItem.item_id }}
                      <q-icon name="content_copy" size="10px" class="q-ml-xs text-grey-4" />
                    </span>
                  </div>
                  <div v-if="selectedItem.item_sku" class="dd-kv-row">
                    <span class="dd-kv-key">SKU</span>
                    <span class="font-mono dd-kv-val cursor-pointer" @click="copyText(selectedItem.item_sku)">
                      {{ selectedItem.item_sku }}
                      <q-icon name="content_copy" size="10px" class="q-ml-xs text-grey-4" />
                    </span>
                  </div>
                  <div v-if="selectedItem.liked" class="dd-kv-row">
                    <span class="dd-kv-key">Curtidas</span>
                    <span class="dd-kv-val">{{ (selectedItem.liked || 0).toLocaleString('pt-BR') }}</span>
                  </div>
                  <div v-if="selectedItem.category_id" class="dd-kv-row">
                    <span class="dd-kv-key">Categoria</span>
                    <span class="dd-kv-val font-mono">{{ selectedItem.category_id }}</span>
                  </div>
                  <div class="dd-kv-row">
                    <span class="dd-kv-key">Sincronizado</span>
                    <span class="dd-kv-val text-grey-6">{{ formatDate(selectedItem.last_synced_at) }}</span>
                  </div>
                </div>
              </div>

              <!-- ── Descrição ───────────────────────────────────── -->
              <div v-if="selectedItemDetail?.description" class="dd-section">
                <div class="dd-section-label">Descrição</div>
                <div class="dd-description" :class="descExpanded ? 'dd-description--expanded' : ''">
                  {{ selectedItemDetail.description }}
                </div>
                <button v-if="selectedItemDetail.description?.length > 300" class="dd-desc-toggle"
                  @click="descExpanded = !descExpanded">
                  {{ descExpanded ? 'Ver menos' : 'Ver mais' }}
                  <q-icon :name="descExpanded ? 'expand_less' : 'expand_more'" size="13px" />
                </button>
              </div>

              <!-- ── Variações ───────────────────────────────────── -->
              <div v-if="selectedItemDetail?.variations?.length" class="dd-section">
                <div class="dd-section-label row items-center q-gutter-xs">
                  Variações
                  <span class="dd-count-badge">{{ selectedItemDetail.variations.length }}</span>
                  <span v-if="selectedItemDetail?.variation_attrs?.length" class="row q-gutter-xs q-ml-xs">
                    <span v-for="attr in selectedItemDetail.variation_attrs" :key="attr" class="var-attr-chip var-attr-chip--detail">{{ attr }}</span>
                  </span>
                </div>

                <div class="var-table-wrap">
                  <table class="var-table">
                    <thead>
                      <tr>
                        <!-- Colunas dinâmicas de atributos -->
                        <th v-for="attr in (selectedItemDetail.variation_attrs || [])" :key="attr">{{ attr }}</th>
                        <!-- Se não tem variation_attrs mas tem model_name, mostra coluna Variação -->
                        <th v-if="!selectedItemDetail.variation_attrs?.length">Variação</th>
                        <th>SKU</th>
                        <th>Preço</th>
                        <th>Estoque</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="v in selectedItemDetail.variations" :key="v.model_id"
                        :class="v.status === 'DELETED' ? 'var-deleted' : ''">
                        <!-- Atributos dinâmicos -->
                        <td v-for="attr in (selectedItemDetail.variation_attrs || [])" :key="attr"
                          class="var-attr-val">
                          {{ v.attribute_values?.[attr] || '—' }}
                        </td>
                        <!-- Fallback model_name -->
                        <td v-if="!selectedItemDetail.variation_attrs?.length" class="var-attr-val">
                          {{ v.model_name || '—' }}
                        </td>
                        <td class="font-mono text-grey-6 var-sku">{{ v.model_sku || '—' }}</td>
                        <td class="text-right">
                          <span class="text-weight-bold price-main" style="font-size:12px">
                            {{ formatCurrency(v.price) }}
                          </span>
                          <div v-if="hasDiscountV(v)" class="text-grey-5" style="text-decoration:line-through;font-size:10px">
                            {{ formatCurrency(v.original_price) }}
                          </div>
                        </td>
                        <td class="text-right" :class="(v.stock ?? 0) === 0 ? 'text-red text-weight-bold' : 'text-grey-9'">
                          {{ v.stock ?? 0 }}
                        </td>
                        <td class="text-center">
                          <div class="status-pill status-pill--sm" :class="`status-pill--${statusColorClass(v.status)}`">
                            {{ statusLabel(v.status) }}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div v-else-if="!selectedItem.has_model" class="dd-section">
                <div class="dd-section-label">Variações</div>
                <div class="text-caption text-grey-5">Produto sem variações</div>
              </div>

            </template>
          </div>
        </q-scroll-area>

      </q-card>
    </q-dialog>

    <!-- ══ FILTROS AVANÇADOS ════════════════════════════════════ -->
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

            <div class="fadv-section">
              <div class="fadv-section-label">Faixa de Estoque</div>
              <div class="fadv-range-row">
                <input class="fadv-input" type="number" placeholder="Mín" v-model.number="filters.stockMin" />
                <span class="fadv-range-sep">→</span>
                <input class="fadv-input" type="number" placeholder="Máx" v-model.number="filters.stockMax" />
              </div>
            </div>

            <div class="fadv-section">
              <div class="fadv-section-label">Faixa de Preço (R$)</div>
              <div class="fadv-range-row">
                <input class="fadv-input" type="number" placeholder="Mín" v-model.number="filters.priceMin" />
                <span class="fadv-range-sep">→</span>
                <input class="fadv-input" type="number" placeholder="Máx" v-model.number="filters.priceMax" />
              </div>
            </div>

            <div class="fadv-section">
              <div class="fadv-section-label">Vendas Mínimas</div>
              <input class="fadv-input fadv-input--full" type="number" placeholder="Ex: 10" v-model.number="filters.salesMin" />
            </div>

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
const showDetail     = ref(false)
const selectedItem   = ref(null)
const accountOptions = ref([])
const currentSort    = ref('-sales')
const itemDetails    = ref({})
const detailLoading  = ref({})
const selectedItems  = ref([])
const showAllImages  = ref(false)
const descExpanded   = ref(false)

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
  stockStatus: null,
  hasDiscount: null,
  stockMin:    null,
  stockMax:    null,
  priceMin:    null,
  priceMax:    null,
  salesMin:    null,
  ratingMin:   null,
  _ratingZero: false,
  _hasModel:   false,
})

// ── Computed ────────────────────────────────────────────────────────────────
const selectedItemDetail = computed(() =>
  selectedItem.value ? (itemDetails.value[selectedItem.value.item_id] || selectedItem.value) : null
)

const allImages = computed(() => {
  const detail = itemDetails.value[selectedItem.value?.item_id]
  return detail?.images || selectedItem.value?.images || []
})

// ── Colunas ─────────────────────────────────────────────────────────────────
const columns = [
  { name: 'thumbnail',      label: '',             field: 'thumbnail',      sortable: false, align: 'left'   },
  { name: 'item_name',      label: 'Anúncio',      field: 'item_name',      sortable: true,  align: 'left'   },
  { name: 'price',          label: 'Preço / Estoque', field: 'price',       sortable: true,  align: 'right'  },
  { name: 'analytics',      label: 'Analytics',    field: 'views',          sortable: false, align: 'center' },
  { name: 'status',         label: 'Status',       field: 'status',         sortable: false, align: 'center' },
  { name: 'last_synced_at', label: 'Sincronizado', field: 'last_synced_at', sortable: true,  align: 'right'  },
]

// ── Opções ──────────────────────────────────────────────────────────────────
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

// ── Computeds ───────────────────────────────────────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────────────────────
const statusLabel = (s) =>
  ({ NORMAL: 'Ativo', UNLIST: 'Pausado', BANNED: 'Banido', DELETED: 'Deletado' })[s] || s || '—'

const statusColorClass = (s) =>
  ({ NORMAL: 'active', UNLIST: 'paused', BANNED: 'banned', DELETED: 'deleted' })[s] || 'deleted'

const formatCurrency = (v) =>
  v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const formatDate = (v) =>
  v ? DateTime.fromISO(v).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm') : '—'

const fmtNum = (n) => n > 999 ? (n / 1000).toFixed(1) + 'k' : (n || 0)

const hasDiscount  = (row) => row?.original_price && Number(row.original_price) > Number(row.price) + 0.01
const hasDiscountV = (v)   => v?.original_price  && Number(v.original_price)  > Number(v.price)  + 0.01
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

// ── Filtros toggles ──────────────────────────────────────────────────────────
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

// ── Smart Views ──────────────────────────────────────────────────────────────
const setViewSemEstoque = () => { clearFilters(false); filters.stockStatus = 'zero'; loadItems() }
const setViewComDesconto = () => { clearFilters(false); filters.hasDiscount = true; loadItems() }
const setViewSemAvaliacoes = () => { clearFilters(false); filters._ratingZero = true; loadItems() }
const setViewMaisVendidos = () => { clearFilters(false); currentSort.value = '-sales'; loadItems() }
const setViewVariacoes = () => { clearFilters(false); filters._hasModel = true; loadItems() }

// ── API ──────────────────────────────────────────────────────────────────────
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
  const p = { page: pg.page, page_size: pg.rowsPerPage, sort: currentSort.value }
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

const openDetail = async (row) => {
  selectedItem.value = row
  showDetail.value   = true
  showAllImages.value = false
  descExpanded.value  = false
  const itemId = row.item_id
  if (!itemDetails.value[itemId] && row.has_model) {
    detailLoading.value[itemId] = true
    try {
      const { data } = await api.get(`/shopee/items/${row.id}/`)
      itemDetails.value[itemId] = data
      // Atualiza variation_attrs na linha da tabela
      const idx = items.value.findIndex(r => r.item_id === itemId)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], ...data }
    } catch {
      $q.notify({ message: 'Erro ao carregar detalhes.', color: 'negative', position: 'top' })
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

const applySort = (val) => { currentSort.value = val; loadItems() }

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

.fb-tbtn {
  display: flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: 7px;
  border: 1.5px solid #e2e8f0; background: #fff;
  font-size: 12px; font-weight: 500; color: #64748b;
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.fb-tbtn:hover { background: #f8fafc; }
.fb-tbtn--active { border-color: #0d9488; color: #0d9488; background: #f0fdf9; }
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

:deep(.shopee-table tbody tr.row-active) {
  background: #f0fdf9 !important;
  border-left: 3px solid #0d9488;
}

:deep(.shopee-table tbody td) {
  border-bottom: 1px solid #f1f5f9;
  min-height: 65px; height: auto; vertical-align: middle;
}

/* ── Thumbnail ────────────────────────────────────────────────────────── */
.thumb-img { transition: opacity .15s; }
.hover-row:hover .thumb-img { opacity: .9; }

.thumb-status-dot {
  position: absolute; bottom: -2px; right: -2px;
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #fff;
}
.dot--active  { background: #22c55e; }
.dot--paused  { background: #f59e0b; }
.dot--banned  { background: #ef4444; }
.dot--deleted { background: #cbd5e1; }

/* ── Células especiais ────────────────────────────────────────────────── */
.item-name {
  font-size: 13px; font-weight: 600; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}

.badge-mono {
  background: #f1f5f9; color: #475569;
  padding: 1px 5px; border-radius: 5px;
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.5px; font-size: 11px;
  display: inline-flex; align-items: center;
}
.badge-mono:hover { background: #e2e8f0; }

.shop-badge {
  color: #EE4D2D; font-weight: 700; font-size: 11px;
  display: inline-flex; align-items: center; gap: 2px;
}

.price-main { color: #EE4D2D; }

.stock-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 7px; border-radius: 10px;
  font-size: 10.5px; font-weight: 600;
}
.stock-badge--ok   { background: #f0fdf4; color: #16a34a; }
.stock-badge--zero { background: #fef2f2; color: #dc2626; }

/* ── Variation attribute chips ─────────────────────────────────────── */
.var-attr-chip {
  display: inline-flex; align-items: center;
  padding: 1px 7px; border-radius: 10px;
  font-size: 10px; font-weight: 600;
  background: #eff6ff; color: #3b82f6;
  border: 1px solid #bfdbfe;
}
.var-attr-chip--detail {
  font-size: 11px; padding: 2px 8px;
}

/* ── Analytics grid ──────────────────────────────────────────────────── */
.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  min-width: 80px;
}
.ag-cell {
  display: flex; align-items: center; gap: 3px;
  padding: 2px 5px; border-radius: 5px;
  font-size: 10.5px; font-weight: 600;
  white-space: nowrap;
}
.ag-icon { flex-shrink: 0; }
.ag-value { line-height: 1; }

.ag-cell--zero    { color: #cbd5e1; }
.ag-cell--views   { background: #f0f9ff; color: #0284c7; }
.ag-cell--views .ag-icon { color: #38bdf8; }
.ag-cell--sales   { background: #f0fdf4; color: #16a34a; }
.ag-cell--sales .ag-icon { color: #4ade80; }
.ag-cell--rating  { background: #fefce8; color: #ca8a04; }
.ag-cell--rating .ag-icon { color: #facc15; }
.ag-cell--reviews { background: #faf5ff; color: #9333ea; }
.ag-cell--reviews .ag-icon { color: #c084fc; }

/* ── Status pills ─────────────────────────────────────────────────────── */
.status-pill {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
}
.status-pill--sm { padding: 2px 7px; font-size: 9px; }
.status-pill--active  { background: #dcfce7; color: #16a34a; }
.status-pill--paused  { background: #fef3c7; color: #b45309; }
.status-pill--banned  { background: #fee2e2; color: #dc2626; }
.status-pill--deleted { background: #f1f5f9; color: #94a3b8; }

/* ── Detail Drawer ────────────────────────────────────────────────────── */
.detail-drawer {
  display: flex; flex-direction: column;
  border-radius: 0 !important;
  height: 100vh;
}

.dd-header {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0; background: #fff;
  flex-shrink: 0;
}
.dd-header-meta { flex: 1; min-width: 0; }
.dd-header-eyebrow {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 3px;
}
.dd-header-title {
  font-size: 14px; font-weight: 700; color: #0f172a;
  line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.dd-close {
  background: none; border: none; cursor: pointer; color: #94a3b8;
  display: flex; align-items: center; flex-shrink: 0; padding: 2px;
  border-radius: 6px; transition: background .15s;
}
.dd-close:hover { color: #0f172a; background: #f1f5f9; }

.dd-subheader {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 20px;
  border-bottom: 1px solid #f1f5f9; background: #fafafa;
  flex-shrink: 0;
}
.dd-shopee-link {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; color: #EE4D2D;
  text-decoration: none; padding: 3px 10px; border-radius: 6px;
  border: 1px solid #fca5a5; background: #fff8f7;
  transition: background .15s;
}
.dd-shopee-link:hover { background: #fee2e2; }

.dd-body { padding: 0 0 32px; }

.dd-section {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.dd-section-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .5px;
  margin-bottom: 12px;
}

.dd-count-badge {
  background: #e2e8f0; color: #64748b;
  font-size: 10px; font-weight: 700; border-radius: 10px;
  padding: 0 6px; letter-spacing: 0;
}

/* ── Gallery ──────────────────────────────────────────────────────────── */
.img-gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.img-tile {
  aspect-ratio: 1; border-radius: 8px; overflow: hidden;
}
.img-tile--main { grid-column: span 2; grid-row: span 2; }
.img-more-tile {
  display: flex; align-items: center; justify-content: center;
  background: #f0fdf9; border: 1.5px dashed #0d9488;
  color: #0d9488; font-size: 14px; font-weight: 700;
  transition: background .15s;
}
.img-more-tile:hover { background: #ccfbf1; }

/* ── Stats ────────────────────────────────────────────────────────────── */
.dd-stats-row {
  display: flex; gap: 0; flex-wrap: wrap;
  background: #f8fafc; border-radius: 10px; overflow: hidden;
  border: 1px solid #e2e8f0;
}
.dd-stat {
  flex: 1; min-width: 80px;
  padding: 12px 14px;
  border-right: 1px solid #e2e8f0;
  text-align: center;
}
.dd-stat:last-child { border-right: none; }
.dd-stat-value {
  font-size: 16px; font-weight: 700; line-height: 1.2;
  display: flex; align-items: center; justify-content: center; gap: 2px;
}
.dd-stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 3px; }
.dd-stat-sub   { font-size: 10px; margin-top: 3px; display: flex; align-items: center; justify-content: center; }

/* ── Key-value grid ───────────────────────────────────────────────────── */
.dd-kv-grid { display: flex; flex-direction: column; gap: 0; }
.dd-kv-row {
  display: flex; align-items: center; gap: 12px;
  padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;
}
.dd-kv-row:last-child { border-bottom: none; }
.dd-kv-key { color: #94a3b8; font-weight: 600; min-width: 100px; flex-shrink: 0; }
.dd-kv-val { color: #0f172a; display: flex; align-items: center; }
.dd-kv-val.cursor-pointer:hover { color: #0d9488; }

/* ── Description ──────────────────────────────────────────────────────── */
.dd-description {
  font-size: 12px; color: #374151; line-height: 1.6;
  white-space: pre-wrap; word-break: break-word;
  max-height: 80px; overflow: hidden; transition: max-height .3s;
}
.dd-description--expanded { max-height: 2000px; }
.dd-desc-toggle {
  display: inline-flex; align-items: center; gap: 3px;
  margin-top: 8px; font-size: 11px; font-weight: 600; color: #0d9488;
  background: none; border: none; cursor: pointer; padding: 0;
}

/* ── Variation table ──────────────────────────────────────────────────── */
.var-table-wrap {
  overflow-x: auto; border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.var-table {
  width: 100%; border-collapse: collapse; font-size: 12px;
}
.var-table thead tr {
  background: linear-gradient(135deg, #0d9488, #0f766e);
}
.var-table thead th {
  padding: 8px 12px;
  color: #fff; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px;
  text-align: left; white-space: nowrap;
}
.var-table thead th:last-child { text-align: center; }
.var-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background .1s;
}
.var-table tbody tr:last-child { border-bottom: none; }
.var-table tbody tr:hover { background: #f8fafc; }
.var-table tbody tr.var-deleted { opacity: .45; }
.var-table tbody td { padding: 8px 12px; }
.var-attr-val { font-weight: 600; color: #0f172a; }
.var-sku { font-family: 'Roboto Mono', monospace; font-size: 11px; color: #64748b; }
.var-table tbody td:nth-last-child(2) { text-align: right; }

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

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .fb-search { max-width: 100%; min-width: 0; }
  .fadv-section { padding: 10px 12px; }
  .img-gallery { grid-template-columns: repeat(3, 1fr); }
  .img-tile--main { grid-column: span 1; grid-row: span 1; }
}
</style>
