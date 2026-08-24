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
         <q-btn v-if="canWrite" unelevated color="deep-orange" icon="sync" label="Sincronizar" size="sm"
          :loading="syncing" @click="syncItems" class="q-px-md" style="border-radius:8px" />
      </div>
    </div>

    <!-- ══ FILTER BAR ══════════════════════════════════════════ -->
    <div class="fb">
      <div class="fb-toolbar">
        <div class="fb-search" :class="[searchFocused && 'focused', filters.search && 'filled']">
          <q-icon name="search" size="15px" class="fb-search-icon" />
          <input class="fb-search-input" placeholder="Buscar por nome, SKU ou ID..."
            v-model="filters.search" @focus="searchFocused = true" @blur="searchFocused = false" @input="onSearch" />
          <button v-if="filters.search" class="fb-search-clear" @click="filters.search = ''; loadItems()">
            <q-icon name="close" size="13px" />
          </button>
        </div>
        <div class="fb-toolbar-actions">
          <button class="fb-tbtn">
            <q-icon name="sort" size="13px" />{{ currentSortLabel }}
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
          <button class="fb-tbtn" :class="advancedFilterCount > 0 && 'fb-tbtn--active'" @click="showAdvanced = true">
            <q-icon name="tune" size="13px" />Avançado
            <span v-if="advancedFilterCount > 0" class="fb-adv-badge">{{ advancedFilterCount }}</span>
          </button>
          <button v-if="hasActiveFilters" class="fb-clear-btn" @click="clearFilters">
            <q-icon name="filter_alt_off" size="13px" />Limpar
          </button>
        </div>
      </div>

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
          <button v-if="filters.account?.length" class="fb-combo-clear" @click.stop="filters.account = []; loadItems()"><q-icon name="close" size="11px" /></button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:220px">
              <q-item v-for="acc in accountOptions" :key="acc.id" clickable
                :class="['fb-menu-item', filters.account?.includes(acc.id) && 'fb-menu-item--on']"
                @click.stop="toggleAccountFilter(acc.id)">
                <q-item-section side><q-checkbox :model-value="filters.account?.includes(acc.id)" @update:model-value="toggleAccountFilter(acc.id)" @click.stop color="deep-orange" dense /></q-item-section>
                <q-item-section><q-item-label class="fb-menu-item-label">{{ acc.shop_name }}</q-item-label><q-item-label caption>ID: {{ acc.shop_id }}</q-item-label></q-item-section>
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
          <button v-if="filters.status?.length" class="fb-combo-clear" @click.stop="filters.status = []; loadItems()"><q-icon name="close" size="11px" /></button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:180px">
              <q-item v-for="opt in statusOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.status?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleStatusFilter(opt.value)">
                <q-item-section side><q-checkbox :model-value="filters.status?.includes(opt.value)" @update:model-value="toggleStatusFilter(opt.value)" @click.stop color="deep-orange" dense /></q-item-section>
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
          <button v-if="filters.stockStatus" class="fb-combo-clear" @click.stop="filters.stockStatus = null; loadItems()"><q-icon name="close" size="11px" /></button>
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
        <!-- Desconto -->
        <div class="fb-combo" :class="filters.hasDiscount !== null && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="local_offer" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="filters.hasDiscount === null">Desconto</template>
              <template v-else>{{ filters.hasDiscount ? 'Com desconto' : 'Sem desconto' }}</template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.hasDiscount !== null" class="fb-combo-clear" @click.stop="filters.hasDiscount = null; loadItems()"><q-icon name="close" size="11px" /></button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:180px">
              <q-item clickable v-close-popup :class="['fb-menu-item', filters.hasDiscount === null && 'fb-menu-item--on']" @click="filters.hasDiscount = null; loadItems()"><q-item-section class="fb-menu-item-label">Todos</q-item-section></q-item>
              <q-item clickable v-close-popup :class="['fb-menu-item', filters.hasDiscount === true && 'fb-menu-item--on']" @click="filters.hasDiscount = true; loadItems()"><q-item-section class="fb-menu-item-label">Com desconto</q-item-section></q-item>
              <q-item clickable v-close-popup :class="['fb-menu-item', filters.hasDiscount === false && 'fb-menu-item--on']" @click="filters.hasDiscount = false; loadItems()"><q-item-section class="fb-menu-item-label">Sem desconto</q-item-section></q-item>
            </q-list>
          </q-menu>
        </div>
      </div>

      <transition name="fade">
        <div v-if="hasActiveFilters" class="fb-index">
          <div class="fb-index-header">
            <div class="fb-index-title"><q-icon name="filter_alt" size="14px" color="deep-orange" /><span>Filtrando</span></div>
            <button class="fb-index-clear" @click="clearFilters"><q-icon name="close" size="11px" />Limpar tudo</button>
          </div>
        </div>
      </transition>
    </div>

    <!-- ══ SMART VIEWS ══════════════════════════════════════════ -->
    <div class="smart-views-bar">
      <div class="sv-label">Smart Views</div>
      <div class="sv-chips">
        <button class="sv-chip sv-chip--alert" @click="setViewSemEstoque"><q-icon name="inventory_2" size="13px" />Sem Estoque</button>
        <button class="sv-chip" @click="setViewComDesconto"><q-icon name="local_offer" size="13px" />Com Desconto</button>
        <button class="sv-chip" @click="setViewSemAvaliacoes"><q-icon name="star_border" size="13px" />Sem Avaliações</button>
        <button class="sv-chip" @click="setViewMaisVendidos"><q-icon name="shopping_cart" size="13px" />Mais Vendidos</button>
        <button class="sv-chip" @click="setViewVariacoes"><q-icon name="tune" size="13px" />Variações</button>
      </div>
      <button class="sv-clear" @click="clearFilters"><q-icon name="filter_alt_off" size="13px" />Limpar</button>
    </div>

    <!-- ══ BULK BAR ══════════════════════════════════════════════ -->
    <transition name="slide-fade">
       <div v-if="canWrite && selectedItems.length" class="bulk-bar q-px-lg q-py-sm row items-center q-gutter-sm">
        <q-icon name="check_box" color="deep-orange" size="18px" />
        <span class="text-weight-bold" style="color:#EE4D2D">{{ selectedItems.length }} selecionado(s)</span>
        <q-space />
        <q-btn flat dense color="grey-6" icon="close" label="Limpar seleção" size="sm" @click="selectedItems = []" />
      </div>
    </transition>

    <!-- ══ TABELA ══════════════════════════════════════════════ -->
    <div class="table-responsive">
    <q-table :rows="items" :columns="columns" row-key="item_id" flat :loading="loading"
      v-model:pagination="pagination" @request="onRequest" binary-state-sort
      :dense="$q.screen.lt.md"
      class="sticky-header-table shopee-table" no-data-label="Nenhum anúncio encontrado.">

      <template v-slot:header="props">
        <q-tr :props="props" class="shopee-table-header">
          <q-th auto-width>
             <q-checkbox v-if="canWrite" :model-value="allSelected" :indeterminate="someSelected" @update:model-value="toggleAll" color="teal-7" dense />
          </q-th>
          <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">{{ col.label }}</q-th>
          <q-th auto-width />
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr :props="props"
          :class="[isSelected(props.row) ? 'row-selected' : (selectedItem?.item_id === props.row.item_id ? 'row-active' : 'hover-row')]"
          class="cursor-pointer" @click="openDetail(props.row)">

          <q-td auto-width @click.stop>
             <q-checkbox v-if="canWrite" :model-value="isSelected(props.row)" @update:model-value="toggleSelect(props.row)" color="teal-7" dense />
          </q-td>

          <q-td key="thumbnail" :props="props" style="width:70px">
            <q-img :src="props.row.thumbnail || ''" style="height:52px;width:52px" fit="contain" class="rounded-borders border-grey thumb-img">
              <template v-slot:error><div class="absolute-full flex flex-center bg-grey-2"><q-icon name="image_not_supported" size="20px" color="grey-5" /></div></template>
            </q-img>
          </q-td>

          <q-td key="item_name" :props="props" style="max-width:360px;white-space:normal">
            <div class="column q-gutter-y-xs">
              <div class="item-name text-grey-9">{{ props.row.item_name }}</div>
              <div class="row items-center q-gutter-x-sm text-caption">
                <span v-if="props.row.item_sku" class="badge-mono cursor-pointer" @click.stop="copyText(props.row.item_sku)">
                  <q-icon name="content_copy" size="9px" class="q-mr-xs text-grey-4" />{{ props.row.item_sku }}
                  <q-tooltip class="bg-grey-9">Copiar SKU</q-tooltip>
                </span>
                <span class="badge-mono cursor-pointer" @click.stop="copyText(String(props.row.item_id))">
                  <q-icon name="content_copy" size="9px" class="q-mr-xs text-grey-4" />ID {{ props.row.item_id }}
                </span>
                <span class="shop-badge"><q-icon name="storefront" size="10px" /> {{ props.row.shop_name }}</span>
              </div>
              <div v-if="props.row.variation_attrs?.length" class="row items-center q-gutter-x-xs">
                <span v-for="attr in props.row.variation_attrs" :key="attr" class="var-attr-chip">{{ attr }}</span>
              </div>
            </div>
          </q-td>

          <q-td key="price" :props="props" align="right">
            <div class="text-subtitle1 text-weight-bold price-main">{{ formatCurrency(props.row.price) }}</div>
            <div v-if="hasDiscount(props.row)" class="row items-center justify-end q-gutter-x-xs q-mt-xs">
              <span class="text-grey-5" style="text-decoration:line-through;font-size:11px">{{ formatCurrency(props.row.original_price) }}</span>
              <q-badge color="deep-orange" style="font-size:9px;padding:2px 5px;border-radius:8px">-{{ discountPct(props.row) }}%</q-badge>
            </div>
            <div class="q-mt-xs">
              <span :class="['stock-badge', props.row.stock > 0 ? 'stock-badge--ok' : 'stock-badge--zero']">
                <q-icon name="inventory" size="10px" />{{ props.row.stock ?? 0 }} un
              </span>
            </div>
          </q-td>

          <q-td key="analytics" :props="props" align="center">
            <div class="analytics-grid">
              <div class="ag-cell" :class="!props.row.views && 'ag-cell--zero'">
                <q-icon name="visibility" size="11px" class="ag-icon" /><span class="ag-value">{{ fmtNum(props.row.views) }}</span>
                <q-tooltip class="bg-grey-9">{{ (props.row.views || 0).toLocaleString('pt-BR') }} visitas</q-tooltip>
              </div>
              <div class="ag-cell" :class="!props.row.sales && 'ag-cell--zero'">
                <q-icon name="shopping_bag" size="11px" class="ag-icon" /><span class="ag-value">{{ fmtNum(props.row.sales) }}</span>
                <q-tooltip class="bg-grey-9">{{ (props.row.sales || 0).toLocaleString('pt-BR') }} vendas</q-tooltip>
              </div>
              <div class="ag-cell" :class="!props.row.rating_count && 'ag-cell--zero'">
                <q-icon name="star" size="11px" class="ag-icon" /><span class="ag-value">{{ props.row.rating_count > 0 ? Number(props.row.rating_star || 0).toFixed(1) : '—' }}</span>
              </div>
              <div class="ag-cell" :class="!props.row.rating_count && 'ag-cell--zero'">
                <q-icon name="chat_bubble" size="11px" class="ag-icon" /><span class="ag-value">{{ fmtNum(props.row.rating_count) }}</span>
              </div>
            </div>
          </q-td>

          <q-td key="status" :props="props" align="center">
            <div class="status-pill" :class="`status-pill--${statusColorClass(props.row.status)}`">{{ statusLabel(props.row.status) }}</div>
          </q-td>
          <q-td key="last_synced_at" :props="props" align="right">
            <span class="text-caption text-grey-5">{{ formatDate(props.row.last_synced_at) }}</span>
          </q-td>
          <q-td auto-width @click.stop>
            <q-btn flat dense round size="sm" :color="selectedItem?.item_id === props.row.item_id ? 'teal-7' : 'grey-5'" icon="chevron_right" @click.stop="openDetail(props.row)" />
          </q-td>
        </q-tr>
      </template>
    </q-table>
    </div>

    <!-- ══ DETAIL DRAWER ════════════════════════════════════════ -->
    <q-dialog v-model="showDetail" position="right" :maximized="true"
      transition-show="slide-left" transition-hide="slide-right">
      <q-card class="detail-drawer" style="width:580px;max-width:100vw">

        <!-- Header -->
        <div class="dd-header">
          <div class="dd-header-meta">
            <div class="dd-header-eyebrow">Anúncio · ID {{ selectedItem?.item_id }}</div>
            <!-- Edição de título -->
            <template v-if="editSection === 'title'">
              <textarea class="dd-title-input" v-model="editData.title" maxlength="120" rows="2" @keydown.escape="cancelEdit" />
              <div class="dd-title-count">{{ editData.title.length }}/120</div>
            </template>
            <div v-else class="dd-header-title">{{ selectedItem?.item_name }}</div>
          </div>
          <div class="row items-center q-gutter-xs">
            <template v-if="editSection === 'title'">
              <button class="dd-edit-cancel" @click="cancelEdit">Cancelar</button>
              <button class="dd-edit-save" :class="saving && 'saving'" @click="saveTitle">
                <q-spinner v-if="saving" size="12px" /><span v-else>Salvar</span>
              </button>
            </template>
            <template v-else>
              <button class="dd-edit-section-btn" @click="startEdit('title')">
                <q-icon name="edit" size="13px" />Título
              </button>
            </template>
            <button class="dd-close" @click="showDetail = false"><q-icon name="close" size="20px" /></button>
          </div>
        </div>

        <!-- Subheader: status toggle + loja + link -->
        <div class="dd-subheader">
          <!-- Status toggle -->
          <button class="status-pill status-pill--clickable"
            :class="`status-pill--${statusColorClass(selectedItem?.status)}`"
            :disabled="saving && editSection === 'status'"
            @click="doToggleStatus">
            <q-spinner v-if="saving && editSection === 'status'" size="10px" class="q-mr-xs" />
            <q-icon v-else-if="selectedItem?.status === 'NORMAL'" name="pause_circle" size="12px" class="q-mr-xs" />
            <q-icon v-else-if="selectedItem?.status === 'UNLIST'" name="play_circle" size="12px" class="q-mr-xs" />
            {{ statusLabel(selectedItem?.status) }}
            <q-tooltip class="bg-grey-9">
              {{ selectedItem?.status === 'NORMAL' ? 'Clique para pausar' : 'Clique para ativar' }}
            </q-tooltip>
          </button>
          <span class="shop-badge"><q-icon name="storefront" size="10px" /> {{ selectedItem?.shop_name }}</span>
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
                    <q-img :src="img" fit="cover" class="rounded-borders border-grey full-height full-width" style="min-height:60px" />
                  </div>
                  <div v-if="!showAllImages && allImages.length > 6"
                    class="img-tile img-more-tile rounded-borders cursor-pointer" @click="showAllImages = true">
                    +{{ allImages.length - 6 }}
                  </div>
                </div>
              </div>

              <!-- ── Métricas (read-only) ────────────────────────── -->
              <div class="dd-section dd-section--metrics">
                <div class="dd-stats-row">
                  <div class="dd-stat">
                    <div class="dd-stat-value">{{ (selectedItem.sales || 0).toLocaleString('pt-BR') }}</div>
                    <div class="dd-stat-label">Vendas</div>
                  </div>
                  <div class="dd-stat">
                    <div class="dd-stat-value">{{ (selectedItem.views || 0).toLocaleString('pt-BR') }}</div>
                    <div class="dd-stat-label">Visitas</div>
                  </div>
                  <div class="dd-stat">
                    <div class="dd-stat-value">{{ (selectedItem.liked || 0).toLocaleString('pt-BR') }}</div>
                    <div class="dd-stat-label">Curtidas</div>
                  </div>
                  <div v-if="selectedItem.rating_count" class="dd-stat">
                    <div class="dd-stat-value">
                      <q-icon name="star" size="14px" class="dd-stat-star" />{{ Number(selectedItem.rating_star || 0).toFixed(1) }}
                    </div>
                    <div class="dd-stat-label">{{ selectedItem.rating_count }} aval.</div>
                  </div>
                </div>
              </div>

              <!-- ── SKU pai ────────────────────────────────────────── -->
              <div class="dd-section">
                <div class="dd-section-header">
                  <div class="dd-section-label">Informações</div>
                  <button v-if="editSection !== 'basic'" class="dd-edit-btn" @click="startEdit('basic')">
                    <q-icon name="edit" size="12px" />Editar
                  </button>
                  <div v-else class="row q-gutter-xs">
                    <button class="dd-edit-cancel" @click="cancelEdit">Cancelar</button>
                    <button class="dd-edit-save" :class="saving && 'saving'" @click="saveBasic">
                      <q-spinner v-if="saving" size="12px" /><span v-else>Salvar</span>
                    </button>
                  </div>
                </div>

                <div class="dd-kv-grid">
                  <div class="dd-kv-row">
                    <span class="dd-kv-key">Item ID</span>
                    <span class="font-mono dd-kv-val cursor-pointer" @click="copyText(String(selectedItem.item_id))">
                      {{ selectedItem.item_id }}<q-icon name="content_copy" size="10px" class="q-ml-xs text-grey-4" />
                    </span>
                  </div>
                  <div class="dd-kv-row">
                    <span class="dd-kv-key">SKU</span>
                    <span v-if="editSection !== 'basic'" class="dd-kv-val font-mono">{{ selectedItem.item_sku || '—' }}</span>
                    <input v-else class="dd-inline-input" v-model="editData.item_sku" placeholder="SKU do item" />
                  </div>
                  <div v-if="selectedItem.category_id" class="dd-kv-row">
                    <span class="dd-kv-key">Categoria</span>
                    <span class="dd-kv-val font-mono text-grey-6">{{ selectedItem.category_id }}</span>
                  </div>
                  <div class="dd-kv-row">
                    <span class="dd-kv-key">Sincronizado</span>
                    <span class="dd-kv-val text-grey-6">{{ formatDate(selectedItem.last_synced_at) }}</span>
                  </div>
                </div>
              </div>

              <!-- ── Promoções / Descontos ─────────────────────── -->
              <div class="dd-section">
                <div class="dd-section-header">
                  <div class="dd-section-label">Promoções e Descontos</div>
                  <button v-if="!promoLoading[selectedItem?.item_id]" class="dd-edit-btn" @click="loadPromotions(selectedItem)">
                    <q-icon name="refresh" size="12px" />Atualizar
                  </button>
                </div>

                <div v-if="promoLoading[selectedItem?.item_id]" class="flex flex-center q-py-md">
                  <q-spinner color="teal-7" size="20px" />
                </div>

                <div v-else-if="!itemPromotions[selectedItem?.item_id]?.length" class="dd-empty">
                  <q-icon name="check_circle" size="16px" class="text-teal-7" />
                  <span>Sem promoções ativas neste anúncio.</span>
                </div>

                <div v-else class="promo-list">
                  <div v-for="(p, i) in itemPromotions[selectedItem?.item_id]" :key="i" class="promo-row">
                    <div class="promo-main">
                      <div class="promo-name">
                        {{ p.type_label || p.promotion_type }}
                        <q-badge v-if="p.promotion_staging === 'upcoming'" color="amber-7" class="q-ml-xs" style="font-size:9px">agendada</q-badge>
                      </div>
                      <div class="promo-sub">
                        <template v-if="p.promotion_price != null">Preço promocional: <strong>{{ formatCurrency(p.promotion_price) }}</strong></template>
                        <template v-else>ID {{ p.promotion_id }}</template>
                        <span v-if="p.end_time"> · até {{ formatDateTs(p.end_time) }}</span>
                      </div>
                    </div>
                    <div v-if="isRemovable(p.promotion_type)" class="promo-action">
                      <q-btn dense flat size="sm" color="negative" icon="delete_outline" label="Remover"
                        :loading="promoRemoving === i" @click="removePromotion(p, i)" />
                    </div>
                    <div v-else class="promo-action">
                      <q-icon name="info" size="16px" color="grey-5">
                        <q-tooltip anchor="top middle" self="bottom middle">{{ promotionReason(p.promotion_type) }}</q-tooltip>
                      </q-icon>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── Preço e Desconto (somente para items SEM variações) ── -->
              <div v-if="!selectedItem.has_model" class="dd-section">
                <div class="dd-section-header">
                  <div class="dd-section-label">Preço e Desconto</div>
                  <button v-if="editSection !== 'price'" class="dd-edit-btn" @click="startEdit('price')">
                    <q-icon name="edit" size="12px" />Editar
                  </button>
                  <div v-else class="row q-gutter-xs">
                    <button class="dd-edit-cancel" @click="cancelEdit">Cancelar</button>
                    <button class="dd-edit-save" :class="saving && 'saving'" @click="savePrice">
                      <q-spinner v-if="saving" size="12px" /><span v-else>Salvar</span>
                    </button>
                  </div>
                </div>

                <template v-if="editSection === 'price'">
                  <div class="price-edit-grid">
                    <div class="price-edit-field">
                      <label class="price-edit-label">Preço atual (R$)</label>
                      <input class="price-edit-input price-edit-input--main" type="number" step="0.01" min="0"
                        v-model.number="editData.price" @input="calcDiscount" />
                    </div>
                    <div class="price-edit-field">
                      <label class="price-edit-label">Preço original / De (R$)</label>
                      <input class="price-edit-input" type="number" step="0.01" min="0"
                        v-model.number="editData.original_price" @input="calcDiscount"
                        placeholder="Deixe igual para sem desconto" />
                    </div>
                  </div>
                  <div v-if="liveDiscount > 0" class="price-discount-preview">
                    <q-icon name="local_offer" size="13px" />
                    Desconto de <strong>{{ liveDiscount }}%</strong> ativo
                    · cliente paga <strong>{{ formatCurrency(editData.price) }}</strong>
                    ao invés de <strong>{{ formatCurrency(editData.original_price) }}</strong>
                  </div>
                  <div v-else-if="editData.original_price && editData.original_price <= editData.price" class="price-no-discount">
                    <q-icon name="info" size="13px" />Preço original deve ser maior que o atual para criar desconto.
                  </div>
                </template>

                <template v-else>
                  <div class="price-display-row">
                    <div>
                      <div class="price-display-main">{{ formatCurrency(selectedItem.price) }}</div>
                      <div v-if="hasDiscount(selectedItem)" class="price-display-orig">
                        <span style="text-decoration:line-through;color:#94a3b8">{{ formatCurrency(selectedItem.original_price) }}</span>
                        <q-badge color="deep-orange" class="q-ml-xs">-{{ discountPct(selectedItem) }}%</q-badge>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- ── Estoque (somente para items SEM variações) ─────── -->
              <div v-if="!selectedItem.has_model" class="dd-section">
                <div class="dd-section-header">
                  <div class="dd-section-label">Estoque</div>
                  <button v-if="editSection !== 'stock'" class="dd-edit-btn" @click="startEdit('stock')">
                    <q-icon name="edit" size="12px" />Editar
                  </button>
                  <div v-else class="row q-gutter-xs">
                    <button class="dd-edit-cancel" @click="cancelEdit">Cancelar</button>
                    <button class="dd-edit-save" :class="saving && 'saving'" @click="saveStock">
                      <q-spinner v-if="saving" size="12px" /><span v-else>Salvar</span>
                    </button>
                  </div>
                </div>
                <div v-if="editSection === 'stock'" class="row items-center q-gutter-sm">
                  <input class="dd-stock-input" type="number" min="0" step="1" v-model.number="editData.stock" />
                  <span class="text-grey-6 text-caption">unidades</span>
                </div>
                <div v-else>
                  <span :class="['stock-display', (selectedItem.stock ?? 0) === 0 ? 'stock-display--zero' : 'stock-display--ok']">
                    <q-icon name="inventory" size="14px" />
                    {{ (selectedItem.stock ?? 0).toLocaleString('pt-BR') }} unidades
                  </span>
                </div>
              </div>

              <!-- ── Descrição ───────────────────────────────────── -->
              <div class="dd-section">
                <div class="dd-section-header">
                  <div class="dd-section-label">Descrição</div>
                  <button v-if="editSection !== 'description'" class="dd-edit-btn" @click="startEdit('description')">
                    <q-icon name="edit" size="12px" />Editar
                  </button>
                  <div v-else class="row q-gutter-xs">
                    <button class="dd-edit-cancel" @click="cancelEdit">Cancelar</button>
                    <button class="dd-edit-save" :class="saving && 'saving'" @click="saveDescription">
                      <q-spinner v-if="saving" size="12px" /><span v-else>Salvar</span>
                    </button>
                  </div>
                </div>
                <template v-if="editSection === 'description'">
                  <textarea class="dd-desc-textarea" v-model="editData.description" maxlength="3000" rows="6" />
                  <div class="dd-desc-count">{{ (editData.description || '').length }}/3000</div>
                </template>
                <template v-else>
                  <div v-if="selectedItemDetail?.description" class="dd-description" :class="descExpanded && 'dd-description--expanded'">
                    {{ selectedItemDetail.description }}
                  </div>
                  <div v-else class="text-caption text-grey-5">Sem descrição</div>
                  <button v-if="(selectedItemDetail?.description?.length || 0) > 300" class="dd-desc-toggle" @click="descExpanded = !descExpanded">
                    {{ descExpanded ? 'Ver menos' : 'Ver mais' }}<q-icon :name="descExpanded ? 'expand_less' : 'expand_more'" size="13px" />
                  </button>
                </template>
              </div>

              <!-- ── Variações ───────────────────────────────────── -->
              <div v-if="selectedItemDetail?.variations?.length" class="dd-section">
                <div class="dd-section-header">
                  <div class="dd-section-label row items-center q-gutter-xs">
                    Variações
                    <span class="dd-count-badge">{{ selectedItemDetail.variations.length }}</span>
                    <span v-for="attr in (selectedItemDetail.variation_attrs || [])" :key="attr" class="var-attr-chip var-attr-chip--detail">{{ attr }}</span>
                  </div>
                  <div class="row q-gutter-xs">
                    <button v-if="editSection !== 'variations'" class="dd-edit-btn" @click="startEdit('variations')">
                      <q-icon name="edit" size="12px" />Editar
                    </button>
                    <template v-else>
                      <button class="dd-edit-cancel" @click="cancelEdit">Cancelar</button>
                      <button class="dd-edit-save" :class="saving && 'saving'" @click="saveVariations">
                        <q-spinner v-if="saving" size="12px" />
                        <span v-else>Salvar tudo</span>
                      </button>
                    </template>
                  </div>
                </div>

                <div class="var-table-wrap">
                  <table class="var-table">
                    <thead>
                      <tr>
                        <th v-for="attr in (selectedItemDetail.variation_attrs || [])" :key="attr">{{ attr }}</th>
                        <th v-if="!selectedItemDetail.variation_attrs?.length">Variação</th>
                        <th>SKU</th>
                        <th>Preço (R$)</th>
                        <th>De (R$)</th>
                        <th>Estoque</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(v, idx) in (editSection === 'variations' ? editData.variations : selectedItemDetail.variations)"
                        :key="v.model_id" :class="v.status === 'DELETED' ? 'var-deleted' : ''">
                        <!-- Atributos (read-only) -->
                        <td v-for="attr in (selectedItemDetail.variation_attrs || [])" :key="attr" class="var-attr-val">
                          {{ v.attribute_values?.[attr] || '—' }}
                        </td>
                        <td v-if="!selectedItemDetail.variation_attrs?.length" class="var-attr-val">{{ v.model_name || '—' }}</td>
                        <!-- SKU -->
                        <td class="var-sku-cell">
                          <input v-if="editSection === 'variations'" class="var-inline-input var-inline-input--sku"
                            v-model="editData.variations[idx].model_sku" placeholder="SKU" />
                          <span v-else class="font-mono text-grey-6 text-caption">{{ v.model_sku || '—' }}</span>
                        </td>
                        <!-- Preço atual -->
                        <td class="text-right">
                          <input v-if="editSection === 'variations'" class="var-inline-input var-inline-input--price"
                            type="number" step="0.01" min="0" v-model.number="editData.variations[idx].price" />
                          <template v-else>
                            <span class="text-weight-bold price-main" style="font-size:12px">{{ formatCurrency(v.price) }}</span>
                          </template>
                        </td>
                        <!-- Preço original / De -->
                        <td class="text-right">
                          <input v-if="editSection === 'variations'" class="var-inline-input var-inline-input--price"
                            type="number" step="0.01" min="0" v-model.number="editData.variations[idx].original_price"
                            placeholder="Sem desc." />
                          <template v-else>
                            <span v-if="hasDiscountV(v)" class="text-grey-5" style="text-decoration:line-through;font-size:10px">{{ formatCurrency(v.original_price) }}</span>
                            <span v-else class="text-grey-4 text-caption">—</span>
                          </template>
                        </td>
                        <!-- Estoque -->
                        <td class="text-right">
                          <input v-if="editSection === 'variations'" class="var-inline-input var-inline-input--stock"
                            type="number" min="0" step="1" v-model.number="editData.variations[idx].stock" />
                          <span v-else :class="(v.stock ?? 0) === 0 ? 'text-red text-weight-bold' : 'text-grey-9'">{{ v.stock ?? 0 }}</span>
                        </td>
                        <!-- Status -->
                        <td class="text-center">
                          <div class="status-pill status-pill--sm" :class="`status-pill--${statusColorClass(v.status)}`">{{ statusLabel(v.status) }}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="editSection === 'variations'" class="var-edit-hint">
                  <q-icon name="info" size="12px" color="blue-4" />
                  Edite preço, preço original e estoque diretamente nas células. Clique em <strong>Salvar tudo</strong> para enviar todas as alterações.
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
          <button class="fadv-close" @click="showAdvanced = false"><q-icon name="close" size="18px" /></button>
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
              <input class="fadv-input fadv-input--full" type="number" placeholder="Ex: 4.5" min="0" max="5" step="0.1" v-model.number="filters.ratingMin" />
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
import { useStore } from 'src/stores/store'

const $q = useQuasar()
const authStore = useStore()
const canWrite = computed(() => authStore.canWrite)

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
const itemPromotions = ref({})   // { item_id: [promoção, ...] }
const promoLoading   = ref({})   // { item_id: bool }
const promoRemoving  = ref(null) // índice da promoção em remoção

// ── Estado de edição ──────────────────────────────────────────────────────────
const editSection = ref(null)  // null | 'title' | 'basic' | 'price' | 'stock' | 'description' | 'variations'
const saving      = ref(false)
const editData    = reactive({
  title: '', item_sku: '', description: '',
  price: 0, original_price: 0, stock: 0,
  variations: [],
})

const pagination = ref({
  sortBy: null, descending: false, page: 1, rowsPerPage: 40, rowsNumber: 0,
})

let searchTimeout = null

const filters = reactive({
  search: '', account: [], status: [], stockStatus: null, hasDiscount: null,
  stockMin: null, stockMax: null, priceMin: null, priceMax: null,
  salesMin: null, ratingMin: null, _ratingZero: false, _hasModel: false,
})

// ── Computeds ────────────────────────────────────────────────────────────────
const selectedItemDetail = computed(() =>
  selectedItem.value ? (itemDetails.value[selectedItem.value.item_id] || selectedItem.value) : null
)

const allImages = computed(() => {
  const detail = itemDetails.value[selectedItem.value?.item_id]
  return detail?.images || selectedItem.value?.images || []
})

const liveDiscount = computed(() => {
  const p = editData.price, o = editData.original_price
  if (!p || !o || o <= p) return 0
  return Math.round((1 - p / o) * 100)
})

// ── Colunas ──────────────────────────────────────────────────────────────────
const columns = [
  { name: 'thumbnail',      label: '',                field: 'thumbnail',      sortable: false, align: 'left'   },
  { name: 'item_name',      label: 'Anúncio',         field: 'item_name',      sortable: true,  align: 'left'   },
  { name: 'price',          label: 'Preço / Estoque', field: 'price',          sortable: true,  align: 'right'  },
  { name: 'analytics',      label: 'Analytics',       field: 'views',          sortable: false, align: 'center' },
  { name: 'status',         label: 'Status',          field: 'status',         sortable: false, align: 'center' },
  { name: 'last_synced_at', label: 'Sincronizado',    field: 'last_synced_at', sortable: true,  align: 'right'  },
]

// ── Opções ───────────────────────────────────────────────────────────────────
const statusOptions = [
  { value: 'NORMAL', label: 'Ativo' }, { value: 'UNLIST', label: 'Pausado' },
  { value: 'BANNED', label: 'Banido' }, { value: 'DELETED', label: 'Deletado' },
]
const stockOptions = [
  { value: null, label: 'Todos' }, { value: 'positive', label: 'Com estoque' },
  { value: 'zero', label: 'Sem estoque' }, { value: 'low', label: 'Estoque baixo (<5)' },
]
const sortOptions = [
  { value: '-last_synced_at', label: 'Mais recente' }, { value: 'item_name', label: 'Nome A→Z' },
  { value: '-item_name', label: 'Nome Z→A' }, { value: '-price', label: 'Maior preço' },
  { value: 'price', label: 'Menor preço' }, { value: '-stock', label: 'Maior estoque' },
  { value: 'stock', label: 'Menor estoque' }, { value: '-sales', label: 'Mais vendidos' },
  { value: '-views', label: 'Mais visitados' },
]

const currentSortLabel = computed(() => sortOptions.find(o => o.value === currentSort.value)?.label || 'Ordenar')
const advancedFilterCount = computed(() => [
  !!(filters.stockMin || filters.stockMax), !!(filters.priceMin || filters.priceMax),
  !!filters.salesMin, !!filters.ratingMin,
].filter(Boolean).length)
const hasActiveFilters = computed(() =>
  !!filters.search || filters.account?.length > 0 || filters.status?.length > 0 ||
  !!filters.stockStatus || filters.hasDiscount !== null || advancedFilterCount.value > 0
)
const allSelected  = computed(() => items.value.length > 0 && selectedItems.value.length === items.value.length)
const someSelected = computed(() => selectedItems.value.length > 0 && selectedItems.value.length < items.value.length)

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusLabel      = (s) => ({ NORMAL: 'Ativo', UNLIST: 'Pausado', BANNED: 'Banido', DELETED: 'Deletado' })[s] || s || '—'
const statusColorClass = (s) => ({ NORMAL: 'active', UNLIST: 'paused', BANNED: 'banned', DELETED: 'deleted' })[s] || 'deleted'
const formatCurrency   = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
const formatDate       = (v) => v ? DateTime.fromISO(v).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm') : '—'
const formatDateTs     = (ts) => ts ? DateTime.fromSeconds(ts).setZone('America/Sao_Paulo').toFormat('dd/MM HH:mm') : '—'
const fmtNum           = (n) => n > 999 ? (n / 1000).toFixed(1) + 'k' : (n || 0)
const hasDiscount      = (row) => row?.original_price && Number(row.original_price) > Number(row.price) + 0.01
const hasDiscountV     = (v)   => v?.original_price  && Number(v.original_price)  > Number(v.price)  + 0.01
const discountPct      = (row) => Math.round((1 - Number(row.price) / Number(row.original_price)) * 100)

// Tipos de promoção removíveis via Open API — espelha promotion_capabilities.py (backend)
const REMOVABLE_TYPES = ['Discount Promotions', 'Bundle Deal', 'Add-on Deal', 'Shop Flash Sale', 'Wholesale']
const PROMOTION_REASONS = {
  Voucher: 'Cupom não é removível por item — use a aba Cupons.',
  Campaign: 'Campanha de plataforma — não removível via API.',
  'Flash Sale': 'Flash Sale de plataforma — não removível via API.',
  'Group Buy': 'Compra coletiva — não removível via API.',
}
const isRemovable     = (t) => REMOVABLE_TYPES.includes(t)
const promotionReason = (t) => PROMOTION_REASONS[t] || 'Não removível via API.'
const copyText         = (t) => { navigator.clipboard.writeText(String(t)); $q.notify({ message: `Copiado: ${t}`, color: 'dark', position: 'top', timeout: 1500 }) }
const isSelected       = (row) => selectedItems.value.some(r => r.item_id === row.item_id)
const toggleSelect     = (row) => {
  const idx = selectedItems.value.findIndex(r => r.item_id === row.item_id)
  if (idx === -1) selectedItems.value = [...selectedItems.value, row]
  else selectedItems.value = selectedItems.value.filter(r => r.item_id !== row.item_id)
}
const toggleAll = (val) => { selectedItems.value = val ? [...items.value] : [] }
const calcDiscount = () => {}  // reactive via liveDiscount computed

// ── Edição inline ─────────────────────────────────────────────────────────────
const startEdit = (section) => {
  editSection.value = section
  const item   = selectedItemDetail.value || selectedItem.value
  const detail = itemDetails.value[selectedItem.value?.item_id]
  if (section === 'title')       { editData.title = item?.item_name || '' }
  if (section === 'basic')       { editData.item_sku = item?.item_sku || '' }
  if (section === 'price')       { editData.price = Number(item?.price || 0); editData.original_price = Number(item?.original_price || item?.price || 0) }
  if (section === 'stock')       { editData.stock = item?.stock ?? 0 }
  if (section === 'description') { editData.description = detail?.description || item?.description || '' }
  if (section === 'variations')  {
    editData.variations = (detail?.variations || []).map(v => ({
      model_id:       v.model_id,
      model_sku:      v.model_sku || '',
      price:          Number(v.price || 0),
      original_price: Number(v.original_price || v.price || 0),
      stock:          v.stock ?? 0,
      attribute_values: v.attribute_values || {},
      status:         v.status,
    }))
  }
}

const cancelEdit = () => { editSection.value = null }

const applyItemUpdate = (updatedItem) => {
  if (!updatedItem) return
  const itemId = selectedItem.value?.item_id
  // Atualiza selectedItem
  if (selectedItem.value) Object.assign(selectedItem.value, updatedItem)
  // Atualiza cache de detalhes
  if (itemDetails.value[itemId]) Object.assign(itemDetails.value[itemId], updatedItem)
  // Atualiza linha na tabela
  const idx = items.value.findIndex(r => r.item_id === itemId)
  if (idx !== -1) items.value[idx] = { ...items.value[idx], ...updatedItem }
}

const withSave = async (fn, successMsg) => {
  saving.value = true
  try {
    const result = await fn()
    if (result?.item) applyItemUpdate(result.item)
    editSection.value = null
    $q.notify({ message: successMsg, color: 'positive', position: 'top', timeout: 2500 })
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Erro desconhecido'
    $q.notify({ message: `Erro: ${msg}`, color: 'negative', position: 'top', timeout: 4000 })
  } finally {
    saving.value = false
  }
}

const saveTitle = () => withSave(async () => {
  if (!editData.title.trim()) throw new Error('Título não pode estar vazio.')
  const { data } = await api.post(`/shopee/items/${selectedItem.value.id}/update_basic/`, { title: editData.title })
  return data
}, 'Título atualizado na Shopee')

const saveBasic = () => withSave(async () => {
  const { data } = await api.post(`/shopee/items/${selectedItem.value.id}/update_basic/`, { item_sku: editData.item_sku })
  return data
}, 'SKU atualizado na Shopee')

const savePrice = () => withSave(async () => {
  if (!editData.price || editData.price <= 0) throw new Error('Preço inválido.')
  const orig = editData.original_price > editData.price ? editData.original_price : editData.price
  const { data } = await api.post(`/shopee/items/${selectedItem.value.id}/update_price/`, {
    price: editData.price, original_price: orig,
  })
  return data
}, 'Preço atualizado na Shopee')

const saveStock = () => withSave(async () => {
  if (editData.stock < 0) throw new Error('Estoque não pode ser negativo.')
  const { data } = await api.post(`/shopee/items/${selectedItem.value.id}/update_stock/`, { stock: editData.stock })
  return data
}, 'Estoque atualizado na Shopee')

const saveDescription = () => withSave(async () => {
  const { data } = await api.post(`/shopee/items/${selectedItem.value.id}/update_basic/`, { description: editData.description })
  return data
}, 'Descrição atualizada na Shopee')

const saveVariations = () => withSave(async () => {
  const models = editData.variations.map(v => ({
    model_id: v.model_id,
    price: v.price,
    original_price: v.original_price > v.price ? v.original_price : v.price,
    stock: v.stock,
    model_sku: v.model_sku,
  }))
  const { data } = await api.post(`/shopee/items/${selectedItem.value.id}/update_variations/`, { models })
  // Atualiza cache de variações
  if (data?.item?.variations) {
    const itemId = selectedItem.value.item_id
    if (itemDetails.value[itemId]) {
      itemDetails.value[itemId] = { ...itemDetails.value[itemId], ...data.item }
    }
  }
  return data
}, 'Variações atualizadas na Shopee')

const doToggleStatus = async () => {
  if (saving.value) return
  const current = selectedItem.value?.status
  if (current === 'BANNED' || current === 'DELETED') {
    $q.notify({ message: 'Não é possível alterar este status via API.', color: 'warning', position: 'top' })
    return
  }
  const action = current === 'NORMAL' ? 'pausar' : 'ativar'
  $q.dialog({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} anúncio`,
    message: `Deseja ${action} o anúncio "${selectedItem.value?.item_name}"?`,
    cancel: 'Cancelar', ok: { label: action.charAt(0).toUpperCase() + action.slice(1), color: 'teal-7', unelevated: true },
    persistent: false,
  }).onOk(async () => {
    await withSave(async () => {
      editSection.value = 'status'
      const { data } = await api.post(`/shopee/items/${selectedItem.value.id}/toggle_status/`)
      return data
    }, `Anúncio ${action === 'pausar' ? 'pausado' : 'ativado'} com sucesso`)
  })
}

// ── Filtros toggles ───────────────────────────────────────────────────────────
const toggleAccountFilter = (id) => {
  const idx = filters.account.indexOf(id); if (idx === -1) filters.account.push(id); else filters.account.splice(idx, 1); loadItems()
}
const toggleStatusFilter = (val) => {
  const idx = filters.status.indexOf(val); if (idx === -1) filters.status.push(val); else filters.status.splice(idx, 1); loadItems()
}

// ── Smart Views ───────────────────────────────────────────────────────────────
const setViewSemEstoque    = () => { clearFilters(false); filters.stockStatus = 'zero'; loadItems() }
const setViewComDesconto   = () => { clearFilters(false); filters.hasDiscount = true; loadItems() }
const setViewSemAvaliacoes = () => { clearFilters(false); filters._ratingZero = true; loadItems() }
const setViewMaisVendidos  = () => { clearFilters(false); currentSort.value = '-sales'; loadItems() }
const setViewVariacoes     = () => { clearFilters(false); filters._hasModel = true; loadItems() }

// ── API ───────────────────────────────────────────────────────────────────────
const loadAccounts = async () => {
  try {
    const { data } = await api.get('/shopee/accounts/')
    accountOptions.value = Array.isArray(data) ? data : (data.results || [])
    loadItems()
  } catch { $q.notify({ message: 'Erro ao carregar contas Shopee.', color: 'negative', position: 'top' }) }
}

const buildParams = (pg = pagination.value) => {
  const p = { page: pg.page, page_size: pg.rowsPerPage, sort: currentSort.value }
  if (filters.account?.length)      p.account      = filters.account.join(',')
  if (filters.status?.length)       p.status       = filters.status.join(',')
  if (filters.search)               p.search       = filters.search
  if (filters.stockStatus)          p.stock_status = filters.stockStatus
  if (filters.hasDiscount !== null) p.has_discount = filters.hasDiscount
  if (filters.stockMin != null)     p.stock_min    = filters.stockMin
  if (filters.stockMax != null)     p.stock_max    = filters.stockMax
  if (filters.priceMin != null)     p.price_min    = filters.priceMin
  if (filters.priceMax != null)     p.price_max    = filters.priceMax
  if (filters.salesMin != null)     p.sales_min    = filters.salesMin
  if (filters.ratingMin != null)    p.rating_min   = filters.ratingMin
  if (filters._ratingZero)          p.rating_count = 0
  if (filters._hasModel)            p.has_model    = true
  return p
}

const loadItems = async (pg = null) => {
  loading.value = true
  if (pg) { pagination.value.page = pg.page; pagination.value.rowsPerPage = pg.rowsPerPage }
  else     { pagination.value.page = 1 }
  try {
    const { data } = await api.get('/shopee/items/', { params: buildParams() })
    const list = Array.isArray(data) ? data : (data.results || [])
    items.value = list
    pagination.value.rowsNumber = data.count ?? list.length
  } catch { $q.notify({ message: 'Erro ao carregar anúncios.', color: 'negative', position: 'top' }) }
  finally  { loading.value = false }
}

const openDetail = async (row) => {
  selectedItem.value  = { ...row }
  showDetail.value    = true
  showAllImages.value = false
  descExpanded.value  = false
  editSection.value   = null
  const itemId = row.item_id
  if (!itemDetails.value[itemId]) {
    detailLoading.value[itemId] = true
    try {
      const { data } = await api.get(`/shopee/items/${row.id}/`)
      itemDetails.value[itemId] = data
      selectedItem.value = { ...row, ...data }
      const idx = items.value.findIndex(r => r.item_id === itemId)
      if (idx !== -1) items.value[idx] = { ...items.value[idx], ...data }
    } catch { $q.notify({ message: 'Erro ao carregar detalhes.', color: 'negative', position: 'top' }) }
    finally { detailLoading.value[itemId] = false }
  } else {
    selectedItem.value = { ...row, ...itemDetails.value[itemId] }
  }
  loadPromotions(selectedItem.value)
}

const loadPromotions = async (item) => {
  if (!item) return
  const itemId = item.item_id
  promoLoading.value[itemId] = true
  try {
    const { data } = await api.get(`/shopee/items/${item.id}/promotions/`)
    itemPromotions.value[itemId] = data.promotions || []
  } catch {
    itemPromotions.value[itemId] = []
    $q.notify({ message: 'Erro ao carregar promoções.', color: 'negative', position: 'top' })
  } finally {
    promoLoading.value[itemId] = false
  }
}

const removePromotion = async (promo, index) => {
  const item = selectedItem.value
  if (!item || promoRemoving.value !== null) return
  promoRemoving.value = index
  try {
    await api.post(`/shopee/items/${item.id}/promotions/remove/`, {
      promotion_type: promo.promotion_type,
      promotion_id: promo.promotion_id,
      model_id: promo.model_id,
    })
    const itemId = item.item_id
    itemPromotions.value[itemId] = (itemPromotions.value[itemId] || []).filter((_, i) => i !== index)
    item.has_promotion = (itemPromotions.value[itemId] || []).length > 0
    $q.notify({ message: 'Promoção removida com sucesso.', color: 'positive', position: 'top' })
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Erro ao remover promoção.'
    $q.notify({ message: msg, color: 'negative', position: 'top', timeout: 4000 })
  } finally {
    promoRemoving.value = null
  }
}

const onRequest = (props) => loadItems(props.pagination)
const onSearch  = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => loadItems(), 400) }
const applySort = (val) => { currentSort.value = val; loadItems() }

const clearFilters = (andReload = true) => {
  Object.assign(filters, {
    search: '', account: [], status: [], stockStatus: null, hasDiscount: null,
    stockMin: null, stockMax: null, priceMin: null, priceMax: null,
    salesMin: null, ratingMin: null, _ratingZero: false, _hasModel: false,
  })
  if (andReload) loadItems()
}

const syncItems = async () => {
  const accountId = filters.account?.length === 1 ? filters.account[0] :
    (accountOptions.value.length === 1 ? accountOptions.value[0].id : null)
  if (!accountId) { $q.notify({ message: 'Selecione uma conta para sincronizar.', color: 'warning', position: 'top' }); return }
  syncing.value = true
  try {
    const { data } = await api.post(`/shopee/accounts/${accountId}/sync_items/`)
    $q.notify({ message: `Sync concluído: ${data.stats?.synced ?? 0} anúncios sincronizados.`, color: 'positive', position: 'top', timeout: 4000 })
    loadItems()
  } catch (e) {
    $q.notify({ message: `Erro ao sincronizar: ${e?.response?.data?.error || e.message}`, color: 'negative', position: 'top' })
  } finally { syncing.value = false }
}

onMounted(loadAccounts)
</script>

<style scoped>
/* ── Page ─────────────────────────────────────────────────────────────── */
.shopee-items-page { background: #f8fafc; font-family: 'Roboto', sans-serif; }

/* ── Header ──────────────────────────────────────────────────────────── */
.page-header { background: #fff; padding: 14px 20px; border-bottom: 1.5px solid #e2e8f0; }
.header-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ff6600, #EE4D2D); color: #fff; flex-shrink: 0; }
.header-eyebrow { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; }
.header-title { font-size: 16px; font-weight: 700; color: #0f172a; }
.header-count { font-size: 12px; color: #94a3b8; background: #f1f5f9; border-radius: 20px; padding: 2px 10px; }

/* ── Filter bar ──────────────────────────────────────────────────────── */
.fb { background: #fff; border-bottom: 1px solid #e2e8f0; }
.fb-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px 0; flex-wrap: wrap; }
.fb-search { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 180px; max-width: 360px; height: 34px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #f8fafc; padding: 0 10px; transition: border-color .15s, background .15s; }
.fb-search.focused, .fb-search.filled { border-color: #0d9488; background: #fff; }
.fb-search-icon { color: #94a3b8; flex-shrink: 0; }
.fb-search-input { flex: 1; border: none; background: transparent; font-size: 13px; color: #0f172a; outline: none; }
.fb-search-clear { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0; display: flex; align-items: center; }
.fb-toolbar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: auto; }
.fb-tbtn { display: flex; align-items: center; gap: 5px; height: 32px; padding: 0 12px; border-radius: 7px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 12px; font-weight: 500; color: #64748b; cursor: pointer; transition: all .15s; white-space: nowrap; }
.fb-tbtn:hover { background: #f8fafc; }
.fb-tbtn--active { border-color: #0d9488; color: #0d9488; background: #f0fdf9; }
.fb-adv-badge { background: #0d9488; color: #fff; font-size: 10px; font-weight: 700; border-radius: 10px; padding: 1px 5px; min-width: 16px; text-align: center; }
.fb-clear-btn { display: flex; align-items: center; gap: 4px; height: 30px; padding: 0 10px; border-radius: 7px; border: none; background: none; font-size: 12px; color: #ef4444; cursor: pointer; transition: background .15s; }
.fb-clear-btn:hover { background: #fef2f2; }
.fb-filterbar { display: flex; align-items: center; gap: 6px; padding: 8px 16px 10px; flex-wrap: wrap; }
.fb-combo { position: relative; display: flex; align-items: center; border: 1.5px solid #e2e8f0; border-radius: 20px; background: #fff; transition: border-color .15s; overflow: visible; }
.fb-combo:hover { border-color: #cbd5e1; }
.fb-combo--on { border-color: #0d9488; background: #f0fdf9; }
.fb-combo-btn { display: flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px 0 9px; background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 500; color: #374151; border-radius: 20px; }
.fb-combo--on .fb-combo-btn { color: #0d9488; }
.fb-combo-ico { color: #94a3b8; flex-shrink: 0; }
.fb-combo--on .fb-combo-ico { color: #0d9488; }
.fb-combo-label { white-space: nowrap; }
.fb-combo-multi { background: #0d9488; color: #fff; border-radius: 10px; font-size: 10px; font-weight: 700; padding: 0 5px; }
.fb-combo-arrow { color: #94a3b8; }
.fb-combo-clear { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: #0d9488; border: none; cursor: pointer; color: #fff; margin-right: 5px; flex-shrink: 0; }
.fb-combo-clear:hover { background: #0f766e; }
.fb-menu { border-radius: 10px !important; box-shadow: 0 4px 20px rgba(0,0,0,.10) !important; }
.fb-menu-item { transition: background .1s; }
.fb-menu-item--on { background: #f0fdf9 !important; }
.fb-menu-item-label { font-size: 13px; }
.fb-index { border-top: 1px solid #f1f5f9; padding: 8px 16px; background: #f8fafc; }
.fb-index-header { display: flex; align-items: center; justify-content: space-between; }
.fb-index-title { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #64748b; }
.fb-index-clear { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #ef4444; background: none; border: none; cursor: pointer; padding: 0; }

/* ── Smart Views ──────────────────────────────────────────────────────── */
.smart-views-bar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; overflow-x: auto; }
.sv-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; flex-shrink: 0; }
.sv-chips { display: flex; gap: 6px; flex-shrink: 0; }
/* Neutro por padrão — cor reservada só para o alerta que exige ação real
   (sem estoque). Os demais são só atalhos de filtro, não estados de risco. */
.sv-chip { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 11px; font-weight: 600; color: #475569; cursor: pointer; transition: all .15s; white-space: nowrap; }
.sv-chip:hover { border-color: #0d9488; color: #0d9488; background: #f0fdf9; }
.sv-chip--alert { border-color: #fca5a5; color: #dc2626; }
.sv-chip--alert:hover { background: #fef2f2; border-color: #f87171; color: #dc2626; }
.sv-clear { display: flex; align-items: center; gap: 4px; margin-left: auto; flex-shrink: 0; font-size: 11px; color: #94a3b8; background: none; border: none; cursor: pointer; }
.sv-clear:hover { color: #ef4444; }

/* ── Bulk bar ─────────────────────────────────────────────────────────── */
.bulk-bar { background: #f0fdf9; border-bottom: 1px solid #99f6e4; border-top: 1px solid #99f6e4; }

/* ── Tabela ───────────────────────────────────────────────────────────── */
.shopee-table { background: #fff; }
:deep(.shopee-table .q-table__top) { display: none; }
:deep(.shopee-table thead tr th) { position: sticky; top: 0; z-index: 1; background: #f8fafc; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .4px; border-bottom: 1.5px solid #e2e8f0; }
:deep(.shopee-table tbody tr.hover-row:hover) { background: #f0fdf9 !important; }
:deep(.shopee-table tbody tr.row-selected) { background: #e6fdf8 !important; }
:deep(.shopee-table tbody tr.row-active) { background: #f0fdf9 !important; border-left: 3px solid #0d9488; }
:deep(.shopee-table tbody td) { border-bottom: 1px solid #f1f5f9; min-height: 65px; height: auto; vertical-align: middle; }

/* ── Células ─────────────────────────────────────────────────────────── */
.item-name { font-size: 13px; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.badge-mono { background: #f1f5f9; color: #475569; padding: 1px 5px; border-radius: 5px; font-family: 'Roboto Mono', monospace; letter-spacing: -0.5px; font-size: 11px; display: inline-flex; align-items: center; }
.badge-mono:hover { background: #e2e8f0; }
.shop-badge { color: #EE4D2D; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 2px; }
.price-main { color: #EE4D2D; }
.stock-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 600; }
.stock-badge--ok { background: #f0fdf4; color: #16a34a; } .stock-badge--zero { background: #fef2f2; color: #dc2626; }
.var-attr-chip { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.var-attr-chip--detail { font-size: 11px; padding: 2px 8px; }

/* ── Analytics ───────────────────────────────────────────────────────────
   Neutro por design: views/vendas/nota/reviews não são "boas" ou "ruins",
   são só números — a cor fica reservada para status (estoque, anúncio).
   Ícones diferentes já bastam para diferenciar as métricas entre si. ── */
.analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; min-width: 80px; }
.ag-cell { display: flex; align-items: center; gap: 3px; padding: 2px 5px; border-radius: 5px; font-size: 10.5px; font-weight: 600; white-space: nowrap; background: #f8fafc; color: #475569; }
.ag-icon { flex-shrink: 0; color: #94a3b8; } .ag-value { line-height: 1; }
.ag-cell--zero { color: #cbd5e1; }
.ag-cell--zero .ag-icon { color: #cbd5e1; }

/* ── Status pills ────────────────────────────────────────────────────── */
.status-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
.status-pill--sm { padding: 2px 7px; font-size: 9px; }
.status-pill--clickable { cursor: pointer; transition: opacity .15s, transform .1s; }
.status-pill--clickable:hover { opacity: .85; transform: scale(1.03); }
.status-pill--clickable:disabled { cursor: not-allowed; opacity: .7; }
.status-pill--active  { background: #dcfce7; color: #16a34a; }
.status-pill--paused  { background: #fef3c7; color: #b45309; }
.status-pill--banned  { background: #fee2e2; color: #dc2626; }
.status-pill--deleted { background: #f1f5f9; color: #94a3b8; }

/* ── Detail Drawer ────────────────────────────────────────────────────── */
.detail-drawer { display: flex; flex-direction: column; border-radius: 0 !important; height: 100vh; }

.dd-header { display: flex; align-items: flex-start; gap: 10px; padding: 16px 18px 12px; border-bottom: 1px solid #e2e8f0; background: #fff; flex-shrink: 0; }
.dd-header-meta { flex: 1; min-width: 0; }
.dd-header-eyebrow { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px; }
.dd-header-title { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.3; }
.dd-title-input { width: 100%; font-size: 14px; font-weight: 700; color: #0f172a; border: 1.5px solid #0d9488; border-radius: 6px; padding: 4px 8px; outline: none; resize: none; font-family: inherit; line-height: 1.3; }
.dd-title-count { font-size: 10px; color: #94a3b8; text-align: right; margin-top: 2px; }
.dd-close { background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; flex-shrink: 0; padding: 2px; border-radius: 6px; transition: background .15s; }
.dd-close:hover { color: #0f172a; background: #f1f5f9; }

.dd-subheader { display: flex; align-items: center; gap: 8px; padding: 8px 18px; border-bottom: 1px solid #f1f5f9; background: #fafafa; flex-shrink: 0; }
.dd-shopee-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #EE4D2D; text-decoration: none; padding: 3px 10px; border-radius: 6px; border: 1px solid #fca5a5; background: #fff8f7; transition: background .15s; }
.dd-shopee-link:hover { background: #fee2e2; }

.dd-body { padding: 0 0 40px; }

.dd-section { padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
.dd-section--metrics { background: #fafafa; }
.dd-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.dd-section-label { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
.dd-count-badge { background: #e2e8f0; color: #64748b; font-size: 10px; font-weight: 700; border-radius: 10px; padding: 0 6px; letter-spacing: 0; }

/* ── Edit buttons ─────────────────────────────────────────────────────── */
.dd-edit-btn { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 11px; font-weight: 600; color: #64748b; cursor: pointer; transition: all .15s; }
.dd-edit-btn:hover { border-color: #0d9488; color: #0d9488; background: #f0fdf9; }
.dd-edit-section-btn { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 11px; font-weight: 600; color: #64748b; cursor: pointer; transition: all .15s; white-space: nowrap; }
.dd-edit-section-btn:hover { border-color: #0d9488; color: #0d9488; background: #f0fdf9; }
.dd-edit-cancel { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 6px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 11px; font-weight: 600; color: #64748b; cursor: pointer; transition: all .15s; }
.dd-edit-cancel:hover { background: #f8fafc; }
.dd-edit-save { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 26px; padding: 0 14px; border-radius: 6px; border: none; background: #0d9488; color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; transition: all .15s; min-width: 56px; }
.dd-edit-save:hover { background: #0f766e; }
.dd-edit-save.saving { opacity: .75; cursor: not-allowed; }

/* ── Key-value ────────────────────────────────────────────────────────── */
.dd-kv-grid { display: flex; flex-direction: column; }
.dd-kv-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f8fafc; font-size: 12px; }
.dd-kv-row:last-child { border-bottom: none; }
.dd-kv-key { color: #94a3b8; font-weight: 600; min-width: 90px; flex-shrink: 0; }
.dd-kv-val { color: #0f172a; display: flex; align-items: center; }
.dd-kv-val.cursor-pointer:hover { color: #0d9488; }
.dd-inline-input { flex: 1; height: 28px; padding: 0 8px; border: 1.5px solid #0d9488; border-radius: 6px; font-size: 12px; font-family: 'Roboto Mono', monospace; color: #0f172a; background: #f0fdf9; outline: none; }

/* ── Métricas stats ───────────────────────────────────────────────────── */
.dd-stats-row { display: flex; gap: 0; flex-wrap: wrap; background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
.dd-stat { flex: 1; min-width: 70px; padding: 10px 12px; border-right: 1px solid #e2e8f0; text-align: center; }
.dd-stat:last-child { border-right: none; }
.dd-stat-value { font-size: 15px; font-weight: 700; line-height: 1.2; display: flex; align-items: center; justify-content: center; gap: 2px; color: #0f172a; }
.dd-stat-label { font-size: 10px; color: #94a3b8; font-weight: 600; margin-top: 3px; }
.dd-stat-star { color: #f59e0b; }

/* ── Preço edit ──────────────────────────────────────────────────────── */
.price-edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
.price-edit-field { display: flex; flex-direction: column; gap: 4px; }
.price-edit-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; }
.price-edit-input { height: 36px; padding: 0 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-weight: 600; color: #0f172a; background: #f8fafc; outline: none; transition: border-color .15s; }
.price-edit-input:focus { border-color: #0d9488; background: #fff; }
.price-edit-input--main { color: #EE4D2D; font-size: 16px; }
.price-discount-preview { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; background: #f0fdf4; color: #16a34a; font-size: 12px; border: 1px solid #bbf7d0; }
.price-no-discount { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; background: #fefce8; color: #b45309; font-size: 12px; border: 1px solid #fef08a; }
.price-display-row { display: flex; align-items: baseline; gap: 8px; }
.price-display-main { font-size: 20px; font-weight: 700; color: #EE4D2D; }
.price-display-orig { display: flex; align-items: center; gap: 4px; margin-top: 2px; }

/* ── Estoque edit ────────────────────────────────────────────────────── */
.dd-stock-input { width: 100px; height: 36px; padding: 0 10px; border: 1.5px solid #0d9488; border-radius: 8px; font-size: 16px; font-weight: 700; color: #0f172a; background: #f0fdf9; outline: none; }
.stock-display { display: inline-flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 700; }
.stock-display--ok   { color: #16a34a; }
.stock-display--zero { color: #dc2626; }

/* ── Descrição ───────────────────────────────────────────────────────── */
.dd-desc-textarea { width: 100%; padding: 8px 10px; border: 1.5px solid #0d9488; border-radius: 8px; font-size: 12px; color: #0f172a; background: #f0fdf9; outline: none; resize: vertical; font-family: inherit; line-height: 1.6; box-sizing: border-box; }
.dd-desc-count { font-size: 10px; color: #94a3b8; text-align: right; margin-top: 3px; }
.dd-description { font-size: 12px; color: #374151; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 80px; overflow: hidden; transition: max-height .3s; }
.dd-description--expanded { max-height: 2000px; }
.dd-desc-toggle { display: inline-flex; align-items: center; gap: 3px; margin-top: 6px; font-size: 11px; font-weight: 600; color: #0d9488; background: none; border: none; cursor: pointer; padding: 0; }

/* ── Galeria ──────────────────────────────────────────────────────────── */
.img-gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.img-tile { aspect-ratio: 1; border-radius: 8px; overflow: hidden; }
.img-tile--main { grid-column: span 2; grid-row: span 2; }
.img-more-tile { display: flex; align-items: center; justify-content: center; background: #f0fdf9; border: 1.5px dashed #0d9488; color: #0d9488; font-size: 14px; font-weight: 700; transition: background .15s; }
.img-more-tile:hover { background: #ccfbf1; }

/* ── Variation table ──────────────────────────────────────────────────── */
.var-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; }
.var-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.var-table thead tr { background: linear-gradient(135deg, #0d9488, #0f766e); }
.var-table thead th { padding: 8px 10px; color: #fff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; text-align: left; white-space: nowrap; }
.var-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background .1s; }
.var-table tbody tr:last-child { border-bottom: none; }
.var-table tbody tr:hover { background: #f8fafc; }
.var-table tbody tr.var-deleted { opacity: .45; }
.var-table tbody td { padding: 7px 10px; }
.var-attr-val { font-weight: 600; color: #0f172a; }
.var-sku-cell { min-width: 90px; }
.var-inline-input { border: 1.5px solid #e2e8f0; border-radius: 5px; background: #fff; font-size: 11px; color: #0f172a; outline: none; transition: border-color .15s; padding: 2px 6px; }
.var-inline-input:focus { border-color: #0d9488; background: #f0fdf9; }
.var-inline-input--sku   { width: 80px; }
.var-inline-input--price { width: 72px; text-align: right; }
.var-inline-input--stock { width: 56px; text-align: right; }
.var-edit-hint { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11px; color: #64748b; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 6px 10px; }
.font-mono { font-family: 'Roboto Mono', monospace; letter-spacing: -0.5px; }

/* ── Advanced filters ──────────────────────────────────────────────────── */
.fadv-panel { display: flex; flex-direction: column; border-radius: 0 !important; }
.fadv-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #fff; }
.fadv-title { font-size: 15px; font-weight: 700; color: #0f172a; }
.fadv-close { background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; }
.fadv-close:hover { color: #0f172a; }
.fadv-body  { padding: 8px 0; }
.fadv-section { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; }
.fadv-section-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
.fadv-range-row { display: flex; align-items: center; gap: 8px; }
.fadv-range-sep { color: #94a3b8; font-size: 12px; }
.fadv-input { height: 34px; width: 100px; padding: 0 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #0f172a; background: #f8fafc; outline: none; transition: border-color .15s; }
.fadv-input:focus { border-color: #0d9488; background: #fff; }
.fadv-input--full { width: 100%; box-sizing: border-box; }
.fadv-footer { display: flex; gap: 8px; padding: 14px 20px; border-top: 1px solid #e2e8f0; background: #fff; margin-top: auto; }
.fadv-btn-clear { flex: 1; height: 36px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; }
.fadv-btn-clear:hover { background: #f8fafc; }
.fadv-btn-apply { flex: 2; height: 36px; border-radius: 8px; border: none; background: #0d9488; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; }
.fadv-btn-apply:hover { background: #0f766e; }

/* ── Promoções (detail) ──────────────────────────────────────────────── */
.dd-empty { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 12px; padding: 10px 0; }
.promo-list { display: flex; flex-direction: column; gap: 8px; }
.promo-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
.promo-name { font-size: 12px; font-weight: 600; color: #0f172a; display: flex; align-items: center; }
.promo-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
.promo-action { flex-shrink: 0; }

/* ── Utilities & transitions ──────────────────────────────────────────── */
.border-grey { border: 1px solid #e2e8f0; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-fade-enter-active { transition: all .25s ease-out; }
.slide-fade-leave-active { transition: all .2s cubic-bezier(1, .5, .8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }

/* ── Mobile ────────────────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .page-header { padding: 8px 12px; flex-wrap: wrap; gap: 8px; }
  .smart-views-bar { overflow-x: auto; display: flex; }
  .analytics-grid { grid-template-columns: 1fr 1fr; gap: 4px; }
  .var-table-wrap { overflow-x: auto; }
}
</style>
