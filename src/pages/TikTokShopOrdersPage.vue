<template>
  <q-page class="tiktok-orders-page">

    <!-- ══ HEADER ═══════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="row items-center justify-between no-wrap">
        <div class="row items-center q-gutter-x-md">
          <div class="header-icon">
            <q-icon name="smart_display" size="22px" />
          </div>
          <div>
            <div class="header-eyebrow">TikTok Shop</div>
            <div class="header-title">Vendas e Pedidos</div>
          </div>
          <div v-if="pagination.rowsNumber" class="header-count">
            {{ pagination.rowsNumber.toLocaleString('pt-BR') }} pedidos
          </div>
        </div>
        <q-btn unelevated color="grey-10" icon="sync" label="Sincronizar"
          :loading="syncing" :disable="!filters.account?.length && accountOptions.length > 1" size="sm" class="q-px-md"
          @click="syncOrders">
          <q-tooltip v-if="!filters.account?.length && accountOptions.length > 1">Selecione uma conta primeiro</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- ══ MINI DASHBOARD — HOJE ════════════════════════════════ -->
    <div class="today-bar">
      <div class="today-bar-label">
        <q-icon name="today" size="13px" class="q-mr-xs" />Hoje
      </div>

      <template v-if="todayLoading || !todayStats">
        <div class="today-card today-card--skeleton" v-for="n in 3" :key="n" />
      </template>

      <template v-else>

        <!-- Pedidos pagos -->
        <div class="today-card today-card--neutral">
          <div class="today-card-icon"><q-icon name="receipt_long" size="16px" /></div>
          <div class="today-card-body">
            <div class="today-card-val">{{ todayStats.count_paid || 0 }}</div>
            <div class="today-card-label">Pedidos pagos</div>
            <div class="today-card-sub">
              <span v-if="todayStats.count_cancelled > 0" class="text-red-5">
                {{ todayStats.count_cancelled }} cancelado{{ todayStats.count_cancelled !== 1 ? 's' : '' }}
              </span>
              <span v-if="todayStats.count_cancelled === 0">
                {{ todayStats.count || 0 }} total
              </span>
            </div>
          </div>
        </div>

        <!-- Receita -->
        <div class="today-card today-card--neutral">
          <div class="today-card-icon"><q-icon name="payments" size="16px" /></div>
          <div class="today-card-body">
            <div class="today-card-val">{{ formatCurrency(todayStats.faturamento) }}</div>
            <div class="today-card-label">Receita</div>
          </div>
        </div>

        <!-- GMV -->
        <div class="today-card today-card--neutral">
          <div class="today-card-icon"><q-icon name="trending_up" size="16px" /></div>
          <div class="today-card-body">
            <div class="today-card-val">{{ formatCurrency(todayStats.gmv) }}</div>
            <div class="today-card-label">GMV</div>
          </div>
        </div>

      </template>
    </div>

    <!-- ══ FILTROS ═══════════════════════════════════════════════ -->
    <div class="fb">

      <!-- Toolbar -->
      <div class="fb-toolbar">
        <div class="fb-search" :class="{ focused: searchFocused, filled: !!filters.search }">
          <q-icon name="search" size="18px" class="fb-search-icon" />
          <input
            v-model="filters.search"
            class="fb-search-input"
            placeholder="Buscar por nº pedido, comprador, produto..."
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @keydown.enter="loadOrders"
            @input="onSearch"
          />
          <transition name="fade">
            <button v-if="filters.search" class="fb-search-clear" @click="filters.search = ''; loadOrders()">
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
                    <q-icon name="check" color="grey-10" size="14px" />
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
          <button v-if="filters.account?.length" class="fb-combo-clear" @click.stop="filters.account = []; loadOrders()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:200px">
              <q-item v-for="acc in accountOptions" :key="acc.id" clickable
                :class="['fb-menu-item', filters.account?.includes(acc.id) && 'fb-menu-item--on']"
                @click.stop="toggleFilter('account', acc.id)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.account?.includes(acc.id)"
                    @update:model-value="toggleFilter('account', acc.id)"
                    @click.stop color="grey-10" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ acc.shop_name }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Status Pedido -->
        <div class="fb-combo" :class="filters.status?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="receipt" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.status?.length">Status</template>
              <template v-else-if="filters.status.length === 1">{{ statusOptions.find(o => o.value === filters.status[0])?.label || 'Status' }}</template>
              <template v-else>Status <span class="fb-combo-multi">+{{ filters.status.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.status?.length" class="fb-combo-clear" @click.stop="filters.status = []; loadOrders()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:220px">
              <q-item v-for="opt in statusOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.status?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleFilter('status', opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.status?.includes(opt.value)"
                    @update:model-value="toggleFilter('status', opt.value)"
                    @click.stop color="grey-10" dense />
                </q-item-section>
                <q-item-section>
                  <div class="row items-center q-gutter-x-xs">
                    <span :class="['s-dot', `s-dot--${statusColorClass(opt.value)}`]"></span>
                    <span class="fb-menu-item-label">{{ opt.label }}</span>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Data rápida -->
        <div class="fb-combo" :class="filters.quickDate && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="calendar_today" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.quickDate">Período</template>
              <template v-else>{{ quickDateOptions.find(o => o.value === filters.quickDate)?.label }}</template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.quickDate" class="fb-combo-clear" @click.stop="filters.quickDate = null; filters.dateFrom = null; filters.dateTo = null; loadOrders()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:180px">
              <q-item v-for="opt in quickDateOptions" :key="opt.value" clickable v-close-popup
                :class="['fb-menu-item', filters.quickDate === opt.value && 'fb-menu-item--on']"
                @click="applyQuickDate(opt.value)">
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

      </div>

      <!-- Filter index (active filters summary) -->
      <transition name="slide-fade">
        <div v-if="activeFilterTags.length" class="fb-index">
          <div class="fb-index-header">
            <div class="fb-index-title">
              <q-icon name="filter_list" size="13px" color="grey-10" />
              Filtros ativos
              <span class="fb-index-count">{{ activeFilterTags.length }}</span>
            </div>
            <button class="fb-index-clear" @click="clearFilters">
              <q-icon name="close" size="11px" /> Limpar tudo
            </button>
          </div>
          <div class="fb-index-rows">
            <div v-for="tag in activeFilterTags" :key="tag.key + tag.value" class="fb-index-row">
              <div class="fb-index-cat">
                <q-icon :name="tag.icon" size="10px" color="grey-10" />
                {{ tag.catLabel }}
              </div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="removeFilterTag(tag)">
                  {{ tag.label }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>

    </div>

    <!-- ══ TABELA ═════════════════════════════════════════════════ -->
    <div class="table-container table-responsive">
      <div class="sb-scroll-hint show-mobile">
        <q-icon name="swipe" size="12px" />Deslize para ver todas as colunas
      </div>
      <q-table
        flat
        :rows="orders"
        :columns="columns"
        row-key="id"
        :loading="loading"
        v-model:pagination="pagination"
        @request="onRequest"
        binary-state-sort
        :dense="$q.screen.lt.md"
        :rows-per-page-options="[25, 50, 100]"
        class="sticky-header-table tiktok-table">

        <template v-slot:header="props">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-weight-bold">
              {{ col.label }}
            </q-th>
          </q-tr>
        </template>

        <template v-slot:body="props">
          <q-tr :props="props"
            class="hover-row cursor-pointer"
            @click="openDetail(props.row)">

            <!-- ① Pedido / Produto -->
            <q-td key="order" :props="props" style="max-width:320px;white-space:normal">
              <div class="column q-gutter-y-xs">
                <div class="row items-center q-gutter-x-xs">
                  <span class="badge-mono cursor-pointer" @click.stop="copyText(props.row.order_id)" title="Copiar nº pedido">
                    {{ props.row.order_id }}
                  </span>
                  <span class="shop-badge">
                    <q-icon name="storefront" size="10px" /> {{ props.row.shop_name }}
                  </span>
                </div>
                <div v-if="props.row.items?.length" class="row items-start q-gutter-x-sm">
                  <q-img
                    v-if="props.row.items[0]?.product_image_url"
                    :src="props.row.items[0].product_image_url"
                    style="width:36px;height:36px;flex-shrink:0"
                    fit="contain"
                    class="rounded-borders border-grey">
                    <template v-slot:error>
                      <div class="absolute-full flex flex-center bg-grey-2">
                        <q-icon name="image_not_supported" size="14px" color="grey-5" />
                      </div>
                    </template>
                  </q-img>
                  <div class="column" style="min-width:0">
                    <span class="text-grey-9 ellipsis" style="font-size:12px;max-width:220px">
                      {{ props.row.items[0].product_name }}
                    </span>
                    <span v-if="props.row.items[0].sku" class="sku-inline">
                      {{ props.row.items[0].sku }}
                    </span>
                    <span v-if="props.row.items.length > 1" class="text-caption text-grey-5">
                      +{{ props.row.items.length - 1 }} item{{ props.row.items.length > 2 ? 's' : '' }}
                    </span>
                  </div>
                </div>
              </div>
            </q-td>

            <!-- ② Data -->
            <q-td key="data" :props="props" style="min-width:90px">
              <div class="column q-gutter-y-none">
                <span class="text-grey-8" style="font-size:12px">{{ formatDate(props.row.create_time) }}</span>
                <span class="text-caption text-grey-5">{{ formatTime(props.row.create_time) }}</span>
              </div>
            </q-td>

            <!-- ③ Comprador -->
            <q-td key="comprador" :props="props" style="min-width:110px">
              <span class="text-grey-8" style="font-size:12px">{{ props.row.buyer_username || '—' }}</span>
            </q-td>

            <!-- ④ Status -->
            <q-td key="status" :props="props" align="center">
              <div class="order-status-pill" :class="`order-status-pill--${statusColorClass(props.row.status)}`">
                <q-icon :name="statusIcon(props.row.status)" size="10px" />
                {{ statusLabel(props.row.status) }}
              </div>
              <div v-if="props.row.tracking_number" class="text-caption text-grey-5 q-mt-xs">
                <q-icon name="local_shipping" size="10px" />
                {{ props.row.tracking_number }}
              </div>
            </q-td>

            <!-- ⑤ Venda -->
            <q-td key="bruto" :props="props" align="right">
              <div class="cell-amount">
                <div class="amount-main">{{ formatCurrency(props.row.total_amount) }}</div>
                <div v-if="(props.row.items || []).length" class="amount-sub">
                  {{ props.row.items.reduce((s,i) => s + (i.quantity || 1), 0) }} un
                </div>
              </div>
            </q-td>

            <!-- ⑥ Taxas -->
            <q-td key="taxas" :props="props" align="right">
              <div class="column items-end">
                <span v-if="props.row.platform_fee != null" class="frete-val">-{{ formatCurrency(props.row.platform_fee) }}</span>
                <span v-else class="text-caption text-grey-4">—</span>
              </div>
            </q-td>

            <!-- ⑦ Repasse -->
            <q-td key="liquido" :props="props" align="right">
              <div class="cell-liquido">
                <div :class="['liquido-main', getLiquido(props.row) >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(getLiquido(props.row)) }}
                </div>
                <div class="liquido-hint">{{ props.row.settlement_amount != null ? 'repasse' : 'estimado' }}</div>
              </div>
            </q-td>

            <!-- ⑧ Lucro após CMV -->
            <q-td key="lucro" :props="props" align="right">
              <div v-if="props.row.lucro_apos_cmp != null" class="cell-lucro">
                <div :class="['lucro-main', props.row.lucro_apos_cmp >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(props.row.lucro_apos_cmp) }}
                </div>
                <div class="lucro-hint">
                  Custo: {{ formatCurrency(props.row.custo_medio_produto) }}
                </div>
              </div>
              <span v-else class="text-caption text-grey-5">S/ Custo</span>
            </q-td>

          </q-tr>
        </template>

        <template #loading><q-inner-loading showing color="grey-8" /></template>
      </q-table>
    </div>

    <!-- ══ DIALOG: DETALHE DO PEDIDO ════════════════════════════ -->
    <q-dialog v-model="detailOpen" position="right" full-height :maximized="$q.screen.lt.md"
      transition-show="slide-left" transition-hide="slide-right">
      <div class="detail-panel" v-if="selectedOrder">
        <div class="detail-header">
          <div class="row items-start justify-between no-wrap">
            <div>
              <div class="dialog-eyebrow">
                <q-icon name="smart_display" size="13px" class="q-mr-xs" />Pedido TikTok Shop
              </div>
              <div class="detail-order-id">{{ selectedOrder.order_id }}</div>
              <div class="detail-meta">
                {{ formatDateFull(selectedOrder.create_time) }} · {{ selectedOrder.shop_name }}
              </div>
              <div class="row items-center q-gutter-x-xs q-mt-sm">
                <span :class="['order-status-pill', `order-status-pill--${statusColorClass(selectedOrder.status)}`]">
                  <q-icon :name="statusIcon(selectedOrder.status)" size="10px" />
                  {{ statusLabel(selectedOrder.status) }}
                </span>
              </div>
            </div>
            <div class="column items-end q-gutter-y-xs">
              <q-btn flat round dense icon="close" color="grey-6" @click="detailOpen = false" />
            </div>
          </div>
        </div>

        <div class="detail-body">

          <!-- Comprador + datas -->
          <div class="detail-section">
            <div class="detail-meta-row">
              <div class="detail-meta-item">
                <q-icon name="person" size="12px" class="q-mr-xs text-grey-5" />
                <span class="text-grey-9 text-weight-medium">{{ selectedOrder.buyer_username || '—' }}</span>
              </div>
              <div v-if="selectedOrder.pay_time" class="detail-meta-item">
                <q-icon name="credit_card" size="12px" class="q-mr-xs text-grey-5" />
                <span class="text-grey-7">Pago em {{ formatDate(selectedOrder.pay_time) }}</span>
              </div>
              <div v-if="selectedOrder.tracking_number" class="detail-meta-item">
                <q-icon name="local_shipping" size="12px" class="q-mr-xs text-grey-8" />
                <span class="font-mono text-grey-8">{{ selectedOrder.tracking_number }}</span>
              </div>
            </div>
          </div>

          <!-- Itens -->
          <div class="detail-section">
            <div class="detail-section-title">
              <q-icon name="inventory" size="14px" /> Itens vendidos ({{ selectedOrder.items?.length || 0 }})
            </div>
            <div v-for="item in selectedOrder.items" :key="item.id" class="detail-item-card">
              <q-img
                v-if="item.product_image_url"
                :src="item.product_image_url"
                style="width:48px;height:48px;flex-shrink:0"
                fit="contain"
                class="rounded-borders border-grey" />
              <div v-else class="item-img-placeholder">
                <q-icon name="inventory_2" size="18px" color="grey-4" />
              </div>
              <div class="column q-gutter-y-none" style="flex:1;min-width:0">
                <span class="text-grey-9 text-weight-medium" style="font-size:13px;line-height:1.3">{{ item.product_name }}</span>
                <div class="row items-center q-gutter-x-xs q-mt-xs" style="flex-wrap:wrap;gap:4px">
                  <span v-if="item.sku" class="badge-sku">
                    <q-icon name="tag" size="9px" />{{ item.sku }}
                  </span>
                  <span v-if="item.product_id" class="badge-sku badge-sku--id">ID {{ item.product_id }}</span>
                </div>
              </div>
              <div class="column items-end q-gutter-y-none" style="flex-shrink:0">
                <span class="item-price">{{ formatCurrency(item.sale_price) }}</span>
                <span class="text-caption text-grey-6">×{{ item.quantity || 1 }}</span>
                <span class="item-subtotal">{{ formatCurrency((item.sale_price || 0) * (item.quantity || 1)) }}</span>
              </div>
            </div>
          </div>

          <!-- Resumo financeiro -->
          <div class="detail-section">
            <div class="detail-section-title">
              <q-icon name="account_balance_wallet" size="14px" /> Resumo Financeiro
            </div>

            <div class="finance-block">
              <div class="finance-block-label">Receita</div>
              <div class="finance-row finance-row--subtotal">
                <span class="finance-label-bold">Total pago pelo comprador</span>
                <span class="finance-subtotal pos">{{ formatCurrency(selectedOrder.total_amount) }}</span>
              </div>
            </div>

            <template v-if="selectedOrder.platform_fee != null">
              <div class="finance-block">
                <div class="finance-block-label">Deduções TikTok</div>
                <div class="finance-row">
                  <span class="finance-label">Taxa da plataforma</span>
                  <span class="finance-val finance-negative">-{{ formatCurrency(selectedOrder.platform_fee) }}</span>
                </div>
              </div>
              <div class="finance-divider" />
              <div class="finance-row finance-row--total">
                <span class="finance-label-bold">(=) REPASSE</span>
                <span :class="['finance-total', (selectedOrder.settlement_amount || 0) >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(selectedOrder.settlement_amount) }}
                </span>
              </div>
            </template>
            <template v-else>
              <div class="finance-note-box">
                <q-icon name="info_outline" size="13px" class="q-mr-xs" />
                Dados financeiros detalhados serão exibidos após sincronização.
              </div>
            </template>
          </div>

          <!-- Rastreamento -->
          <div v-if="selectedOrder.tracking_number" class="detail-section">
            <div class="detail-section-title">
              <q-icon name="local_shipping" size="14px" /> Rastreamento
              <span class="font-mono text-grey-5 q-ml-sm" style="font-size:10px">{{ selectedOrder.tracking_number }}</span>
            </div>
            <div v-if="selectedOrder.shipping_carrier" class="detail-row">
              <span class="detail-label">Transportadora</span>
              <span class="detail-value">{{ selectedOrder.shipping_carrier }}</span>
            </div>
          </div>

          <!-- Datas -->
          <div class="detail-section">
            <div class="detail-section-title"><q-icon name="schedule" size="14px" /> Histórico</div>
            <div class="detail-row">
              <span class="detail-label">Criado em</span>
              <span class="detail-value">{{ formatDateFull(selectedOrder.create_time) }}</span>
            </div>
            <div v-if="selectedOrder.pay_time" class="detail-row">
              <span class="detail-label">Pago em</span>
              <span class="detail-value">{{ formatDateFull(selectedOrder.pay_time) }}</span>
            </div>
            <div v-if="selectedOrder.update_time" class="detail-row">
              <span class="detail-label">Última atualização</span>
              <span class="detail-value">{{ formatDateFull(selectedOrder.update_time) }}</span>
            </div>
          </div>

        </div>
      </div>
    </q-dialog>

    <!-- ══ DRAWER: Filtros avançados ════════════════════════════ -->
    <q-dialog v-model="showAdvanced" position="right" full-height
      transition-show="slide-left" transition-hide="slide-right">
      <div class="fadv-panel" style="width:340px;max-width:100vw">
        <div class="fadv-header">
          <span class="fadv-title">Filtros avançados</span>
          <button class="fadv-close" @click="showAdvanced = false"><q-icon name="close" size="20px" /></button>
        </div>
        <div class="fadv-body">

          <div class="fadv-section">
            <div class="fadv-section-label">Período personalizado</div>
            <div class="fadv-range-row">
              <input type="date" class="fadv-input" v-model="filters.dateFrom" />
              <span class="fadv-range-sep">→</span>
              <input type="date" class="fadv-input" v-model="filters.dateTo" />
            </div>
          </div>

          <div class="fadv-section">
            <div class="fadv-section-label">Valor do pedido</div>
            <div class="fadv-range-row">
              <input type="number" placeholder="Min R$" class="fadv-input" v-model="filters.amountMin" />
              <span class="fadv-range-sep">—</span>
              <input type="number" placeholder="Max R$" class="fadv-input" v-model="filters.amountMax" />
            </div>
          </div>

        </div>
        <div class="fadv-footer">
          <button class="fadv-btn-clear" @click="clearAdvanced">Limpar</button>
          <button class="fadv-btn-apply" @click="applyAdvanced">Aplicar</button>
        </div>
      </div>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import TikTokShopService from 'src/services/TikTokShopService'

const $q = useQuasar()

// ── Estado ──────────────────────────────────────────────────────────────────
const orders          = ref([])
const loading         = ref(false)
const syncing         = ref(false)
const searchFocused   = ref(false)
const showAdvanced    = ref(false)
const accountOptions  = ref([])
const currentSort     = ref('-create_time')
const todayStats      = ref(null)
const todayLoading    = ref(false)
const detailOpen      = ref(false)
const selectedOrder   = ref(null)

const pagination = ref({
  sortBy: null,
  descending: false,
  page: 1,
  rowsPerPage: 50,
  rowsNumber: 0,
})

let searchTimeout = null

const filters = reactive({
  search:    '',
  account:   [],
  status:    [],
  quickDate: null,
  dateFrom:  null,
  dateTo:    null,
  amountMin: null,
  amountMax: null,
})

// ── Colunas ────────────────────────────────────────────────────────────────
const columns = [
  { name: 'order',     label: 'PEDIDO / PRODUTO',  field: 'order_id',       sortable: false, align: 'left',   style: 'min-width:280px' },
  { name: 'data',      label: 'DATA',              field: 'create_time',    sortable: true,  align: 'left',   style: 'min-width:90px'  },
  { name: 'comprador', label: 'COMPRADOR',         field: 'buyer_username', sortable: false, align: 'left',   style: 'min-width:110px' },
  { name: 'status',    label: 'STATUS',            field: 'status',         sortable: false, align: 'center', style: 'min-width:120px' },
  { name: 'bruto',     label: 'VENDA',             field: 'total_amount',   sortable: true,  align: 'right',  style: 'min-width:90px'  },
  { name: 'taxas',     label: 'TAXAS',             field: 'platform_fee',   sortable: false, align: 'right',  style: 'min-width:80px' },
  { name: 'liquido',   label: 'REPASSE',           field: 'settlement_amount', sortable: false, align: 'right',  style: 'min-width:110px' },
  { name: 'lucro',     label: 'LUCRO APÓS CMV',    field: 'lucro_apos_cmp', sortable: false, align: 'right', style: 'min-width:115px' },
]

// Paridade mobile/desktop: todas as colunas sempre visíveis (rolagem horizontal no wrapper).

// ── Opções ─────────────────────────────────────────────────────────────────
const statusOptions = [
  { value: 'UNPAID',           label: 'Aguardando Pagamento' },
  { value: 'AWAITING_SHIPMENT', label: 'Aguardando Envio'    },
  { value: 'AWAITING_COLLECTION', label: 'Aguardando Coleta' },
  { value: 'IN_TRANSIT',       label: 'Em Trânsito'         },
  { value: 'DELIVERED',        label: 'Entregue'            },
  { value: 'COMPLETED',        label: 'Concluído'           },
  { value: 'CANCELLED',        label: 'Cancelado'           },
  { value: 'CANCELLED_BY_SELLER', label: 'Cancelado (Vendedor)' },
]

const quickDateOptions = [
  { value: 'today',  label: 'Hoje'           },
  { value: '7d',     label: 'Últimos 7 dias' },
  { value: '30d',    label: 'Últimos 30 dias'},
  { value: '90d',    label: 'Últimos 90 dias'},
]

const sortOptions = [
  { value: '-create_time',  label: 'Mais recente' },
  { value: 'create_time',   label: 'Mais antigo'  },
  { value: '-total_amount', label: 'Maior valor'  },
  { value: 'total_amount',  label: 'Menor valor'  },
]

// ── Computeds ──────────────────────────────────────────────────────────────
const currentSortLabel = computed(() =>
  sortOptions.find(o => o.value === currentSort.value)?.label || 'Ordenar'
)

const advancedFilterCount = computed(() =>
  [filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax].filter(Boolean).length
)

const hasActiveFilters = computed(() =>
  filters.search || filters.account.length || filters.status.length ||
  filters.quickDate || filters.dateFrom || filters.dateTo
)

const activeFilterTags = computed(() => {
  const tags = []
  filters.account.forEach(id => {
    const acc = accountOptions.value.find(a => a.id === id)
    if (acc) tags.push({ key: 'account', value: id, catLabel: 'Conta', label: acc.shop_name, icon: 'storefront' })
  })
  filters.status.forEach(v => {
    const opt = statusOptions.find(o => o.value === v)
    if (opt) tags.push({ key: 'status', value: v, catLabel: 'Status', label: opt.label, icon: 'receipt' })
  })
  if (filters.quickDate) {
    const opt = quickDateOptions.find(o => o.value === filters.quickDate)
    tags.push({ key: 'quickDate', value: filters.quickDate, catLabel: 'Período', label: opt?.label, icon: 'calendar_today' })
  }
  return tags
})

// ── Helpers de status ──────────────────────────────────────────────────────
function statusColorClass(s) {
  const map = {
    COMPLETED: 'completed', DELIVERED: 'shipped', IN_TRANSIT: 'shipped',
    AWAITING_SHIPMENT: 'ready', AWAITING_COLLECTION: 'ready',
    UNPAID: 'unpaid', CANCELLED: 'cancelled', CANCELLED_BY_SELLER: 'cancelled',
  }
  return map[s] || 'default'
}

function statusLabel(s) {
  return statusOptions.find(o => o.value === s)?.label || s
}

function statusIcon(s) {
  const map = {
    COMPLETED: 'check_circle', DELIVERED: 'local_shipping', IN_TRANSIT: 'local_shipping',
    AWAITING_SHIPMENT: 'inventory', AWAITING_COLLECTION: 'move_to_inbox',
    UNPAID: 'schedule', CANCELLED: 'cancel', CANCELLED_BY_SELLER: 'cancel',
  }
  return map[s] || 'circle'
}

// ── Helpers financeiros ────────────────────────────────────────────────────
function getLiquido(row) {
  if (row.settlement_amount != null) return Number(row.settlement_amount)
  return Number(row.total_amount || 0) - Number(row.platform_fee || 0)
}

// ── Formatação ─────────────────────────────────────────────────────────────
function formatCurrency(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateFull(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ message: 'Copiado!', color: 'positive', timeout: 1000, position: 'top' })
  })
}

// ── Filtros ─────────────────────────────────────────────────────────────────
function toggleFilter(key, value) {
  const arr = filters[key]
  const idx = arr.indexOf(value)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(value)
  loadOrders()
}

function removeFilterTag(tag) {
  if (tag.key === 'quickDate') {
    filters.quickDate = null; filters.dateFrom = null; filters.dateTo = null
  } else {
    const arr = filters[tag.key]
    const idx = arr.indexOf(tag.value)
    if (idx >= 0) arr.splice(idx, 1)
  }
  loadOrders()
}

function clearFilters() {
  filters.search = ''; filters.account = []; filters.status = []
  filters.quickDate = null; filters.dateFrom = null; filters.dateTo = null
  loadOrders()
}

function clearAdvanced() {
  filters.dateFrom = null; filters.dateTo = null
  filters.amountMin = null; filters.amountMax = null
}

function applyAdvanced() {
  showAdvanced.value = false
  loadOrders()
}

function applySort(val) {
  currentSort.value = val
  loadOrders()
}

function applyQuickDate(val) {
  filters.quickDate = val
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (val === 'today') {
    filters.dateFrom = today; filters.dateTo = today
  } else {
    const days = val === '7d' ? 7 : val === '30d' ? 30 : 90
    const from = new Date(now); from.setDate(from.getDate() - days)
    filters.dateFrom = from.toISOString().split('T')[0]; filters.dateTo = today
  }
  loadOrders()
}

function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadOrders(), 400)
}

// ── Data ────────────────────────────────────────────────────────────────────
async function loadOrders(pg = null) {
  loading.value = true
  pagination.value.page = pg ?? 1
  try {
    const axiosParams = {
      sort: currentSort.value,
      page: pagination.value.page,
      page_size: pagination.value.rowsPerPage,
    }
    if (filters.search) axiosParams.search = filters.search
    if (filters.account.length) axiosParams.account = filters.account
    if (filters.status.length) axiosParams.status = filters.status
    if (filters.dateFrom) axiosParams.date_from = filters.dateFrom
    if (filters.dateTo) axiosParams.date_to = filters.dateTo
    if (filters.amountMin) axiosParams.amount_min = filters.amountMin
    if (filters.amountMax) axiosParams.amount_max = filters.amountMax

    const { data } = await TikTokShopService.listOrders(axiosParams)
    orders.value = data.results ?? data
    pagination.value.rowsNumber = data.count ?? orders.value.length
  } catch (e) {
    console.error('Erro ao carregar pedidos:', e)
    $q.notify({ message: 'Erro ao carregar pedidos', color: 'negative' })
  } finally {
    loading.value = false
  }
}

function onRequest(requestProps) {
  pagination.value.page = requestProps.pagination.page
  pagination.value.rowsPerPage = requestProps.pagination.rowsPerPage
  loadOrders(requestProps.pagination.page)
}

async function fetchTodayStats() {
  todayLoading.value = true
  try {
    const { data } = await TikTokShopService.getTodayStats()
    todayStats.value = data
  } catch (e) { console.error(e) }
  finally { todayLoading.value = false }
}

async function loadAccounts() {
  try {
    const { data } = await TikTokShopService.listAccounts()
    accountOptions.value = data
  } catch (e) { console.error(e) }
}

async function syncOrders() {
  const accountIds = filters.account.length ? filters.account : accountOptions.value.map(a => a.id)
  if (!accountIds.length) {
    $q.notify({ message: 'Nenhuma conta disponível', color: 'warning' }); return
  }
  syncing.value = true
  try {
    await Promise.all(accountIds.map(id => TikTokShopService.syncOrders(id)))
    $q.notify({ message: 'Sync iniciado!', color: 'positive', icon: 'sync' })
    setTimeout(() => loadOrders(), 2000)
  } catch (e) {
    $q.notify({ message: 'Erro ao sincronizar', color: 'negative' })
  } finally {
    syncing.value = false
  }
}

function openDetail(order) {
  selectedOrder.value = order
  detailOpen.value = true
}

onMounted(() => {
  loadAccounts()
  loadOrders()
  fetchTodayStats()
})
</script>

<style scoped lang="scss">
/* ── Página base ───────────────────────────────────────────── */
.tiktok-orders-page { background: #f8fafc; min-height: 100vh; }

/* ── Header ────────────────────────────────────────────────── */
.page-header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 14px 20px;
  position: sticky; top: 0; z-index: 10;
}
.header-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #010101, #333);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
}
.header-eyebrow { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
.header-title { font-size: 18px; font-weight: 700; color: #0f172a; }
.header-count {
  background: #f1f5f9; border-radius: 10px; padding: 3px 10px;
  font-size: 12px; font-weight: 600; color: #64748b;
}

/* ── Today bar ─────────────────────────────────────────────── */
.today-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 20px; background: #fff;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.today-bar-label {
  display: flex; align-items: center; font-size: 11px; font-weight: 700;
  color: #94a3b8; text-transform: uppercase; letter-spacing: .5px;
  flex-shrink: 0;
}
.today-card {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 10px; flex-shrink: 0;
  border: 1.5px solid #e2e8f0;
}
.today-card--skeleton {
  width: 130px; height: 50px; background: #f1f5f9;
  border-radius: 10px; animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
.today-card--neutral { border-color: #e2e8f0; background: #f8fafc; }
.today-card-icon { color: #0f172a; }
.today-card-body { display: flex; flex-direction: column; }
.today-card-val { font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.2; }
.today-card-label { font-size: 10px; color: #64748b; }
.today-card-sub { font-size: 10px; color: #94a3b8; }

/* ── Filter bar ────────────────────────────────────────────── */
.fb { background: #fff; border-bottom: 1px solid #e2e8f0; }

.fb-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; flex-wrap: nowrap; overflow-x: auto;
}

.fb-search {
  display: flex; align-items: center; gap: 6px;
  flex: 1; min-width: 160px; max-width: 380px;
  height: 34px; padding: 0 10px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: #f8fafc; transition: border-color .15s, background .15s;
}
.fb-search.focused, .fb-search.filled { border-color: #0f172a; background: #fff; }
.fb-search-icon { color: #94a3b8; flex-shrink: 0; }
.fb-search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 13px; color: #0f172a;
}
.fb-search-input::placeholder { color: #94a3b8; }
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
.fb-tbtn--active { border-color: #0f172a !important; color: #0f172a !important; background: #f8fafc !important; }
.fb-adv-badge {
  background: #0f172a; color: #fff;
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
.fb-menu-header { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; padding: 8px 16px 4px; }

/* ── Filterbar comboboxes ──────────────────────────────────── */
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
.fb-combo--on   { border-color: #0f172a; background: #f8fafc; }
.fb-combo-btn {
  display: flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 10px 0 9px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 500; color: #374151; border-radius: 20px;
}
.fb-combo--on .fb-combo-btn  { color: #0f172a; }
.fb-combo-ico                { color: #94a3b8; flex-shrink: 0; }
.fb-combo--on .fb-combo-ico  { color: #0f172a; }
.fb-combo-label              { white-space: nowrap; }
.fb-combo-multi {
  background: #0f172a; color: #fff; border-radius: 10px;
  font-size: 10px; font-weight: 700; padding: 0 5px;
}
.fb-combo-arrow { color: #94a3b8; }
.fb-combo-clear {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: #0f172a; border: none; cursor: pointer;
  color: #fff; margin-right: 5px; flex-shrink: 0;
}
.fb-combo-clear:hover { background: #334155; }

.fb-menu { border-radius: 10px !important; box-shadow: 0 4px 20px rgba(0,0,0,.10) !important; }
.fb-menu-item { transition: background .1s; }
.fb-menu-item--on { background: #f8fafc !important; }
.fb-menu-item-label { font-size: 13px; }

/* ── Status dot in filter menu ─────────────────────────────── */
.s-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.s-dot--completed { background: #16a34a; }
.s-dot--shipped   { background: #2563eb; }
.s-dot--ready     { background: #0f172a; }
.s-dot--unpaid    { background: #d97706; }
.s-dot--cancelled { background: #dc2626; }
.s-dot--default   { background: #94a3b8; }

/* ── Filter index ──────────────────────────────────────────── */
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
  background: #f8fafc; color: #0f172a;
  font-size: 11px; font-weight: 500;
  cursor: pointer; transition: background .1s;
}
.fb-index-pill:hover { background: #e2e8f0; }

/* ── Tabela ────────────────────────────────────────────────── */
.table-container { background: #fff; }
.tiktok-table { background: #fff; }

:deep(.tiktok-table .q-table__top) { display: none; }

:deep(.tiktok-table thead tr th) {
  position: sticky; top: 0; z-index: 1;
  background: #f8fafc;
  font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .4px;
  border-bottom: 1.5px solid #e2e8f0;
}

:deep(.tiktok-table tbody tr.hover-row:hover) { background: #f8fafc !important; }
:deep(.tiktok-table tbody td) {
  border-bottom: 1px solid #f1f5f9;
  min-height: 65px; height: auto; vertical-align: top;
  padding-top: 10px; padding-bottom: 10px;
}

/* ── Cells ─────────────────────────────────────────────────── */
.badge-mono {
  background: #f1f5f9; color: #475569;
  padding: 1px 5px; border-radius: 5px;
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.5px; font-size: 11px;
}
.badge-mono:hover { background: #e2e8f0; }

.shop-badge { color: #010101; font-weight: 700; font-size: 11px; }

.cell-amount { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.amount-main { font-size: 14px; font-weight: 700; color: #0f172a; }
.amount-sub  { font-size: 10px; color: #94a3b8; }

.frete-val   { font-size: 13px; color: #64748b; }

.cell-liquido { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.liquido-main { font-size: 13px; font-weight: 700; }
.liquido-main.pos { color: #16a34a; }
.liquido-main.neg { color: #dc2626; }
.liquido-hint { font-size: 10px; color: #94a3b8; }
.sku-inline {
  display: inline-block;
  font-family: 'Roboto Mono', monospace;
  font-size: 10px; color: #94a3b8;
  letter-spacing: -0.3px;
}
.border-grey { border: 1px solid #e2e8f0; }

/* ── Order status pills ────────────────────────────────────── */
.order-status-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 20px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  white-space: nowrap;
}
.order-status-pill--completed { background: #dcfce7; color: #16a34a; }
.order-status-pill--shipped   { background: #dbeafe; color: #2563eb; }
.order-status-pill--ready     { background: #f1f5f9; color: #0f172a; }
.order-status-pill--unpaid    { background: #fef3c7; color: #b45309; }
.order-status-pill--cancelled { background: #fee2e2; color: #dc2626; }
.order-status-pill--default   { background: #f1f5f9; color: #475569; }

/* ── Detail panel (dialog) ─────────────────────────────────── */
.detail-panel {
  width: 480px; max-width: 100vw; background: #fff;
  display: flex; flex-direction: column; height: 100%;
}
.detail-header {
  padding: 16px 20px; border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.dialog-eyebrow { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
.detail-order-id { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: 'Roboto Mono', monospace; }
.detail-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
.detail-body { flex: 1; overflow-y: auto; padding-bottom: 20px; }

.detail-section {
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
}
.detail-section-title {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .4px;
  margin-bottom: 10px;
}
.detail-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; padding: 3px 0; gap: 10px;
}
.detail-label { color: #94a3b8; flex-shrink: 0; }
.detail-value { color: #0f172a; text-align: right; }
.detail-item-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid #e2e8f0; background: #f8fafc; margin-bottom: 8px;
}
.detail-meta-row { display: flex; flex-direction: column; gap: 5px; }
.detail-meta-item { display: flex; align-items: center; font-size: 12px; }

.item-img-placeholder {
  width: 50px; height: 50px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #f1f5f9; border-radius: 6px;
}
.item-price    { font-size: 12px; color: #010101; font-weight: 600; }
.item-subtotal { font-size: 12px; color: #0f172a; font-weight: 700; }

.badge-sku {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 6px; border-radius: 5px;
  font-family: 'Roboto Mono', monospace;
  font-size: 10.5px; font-weight: 600; letter-spacing: -0.3px;
  background: #f1f5f9; color: #475569;
}
.badge-sku--id {
  background: #f8fafc; color: #94a3b8; font-weight: 400;
}

/* ── Finance summary (dialog) ──────────────────────────────── */
.finance-block {
  padding: 8px 10px; border-radius: 8px;
  background: #f8fafc; margin-bottom: 4px;
}
.finance-block-label {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .4px;
  margin-bottom: 6px;
}
.finance-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; padding: 2px 0;
}
.finance-row--subtotal { padding: 6px 0; }
.finance-row--total { padding: 5px 0; }
.finance-label       { color: #64748b; }
.finance-label-bold  { color: #0f172a; font-weight: 700; font-size: 13px; }
.finance-val         { color: #0f172a; font-weight: 500; }
.finance-negative    { color: #dc2626; }
.finance-subtotal    { font-size: 15px; font-weight: 700; }
.finance-subtotal.pos { color: #16a34a; }
.finance-subtotal.neg { color: #dc2626; }
.finance-total       { font-size: 16px; font-weight: 700; }
.finance-total.pos   { color: #16a34a; }
.finance-total.neg   { color: #dc2626; }
.finance-divider     { height: 1px; background: #e2e8f0; margin: 8px 0; }
.finance-note-box {
  display: flex; align-items: center;
  font-size: 11px; color: #94a3b8;
  background: #f8fafc; border-radius: 8px;
  padding: 8px 12px; margin-top: 8px;
  border: 1px dashed #e2e8f0;
}

/* ── Advanced filter drawer ────────────────────────────────── */
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
.fadv-input:focus { border-color: #0f172a; background: #fff; }
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
  border: none; background: #0f172a; color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.fadv-btn-apply:hover { background: #334155; }

/* ── Utilities ─────────────────────────────────────────────── */
.font-mono { font-family: 'Roboto Mono', monospace; letter-spacing: -0.5px; }
.ellipsis  { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Transitions ───────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }
.slide-fade-enter-active { transition: all .25s ease-out; }
.slide-fade-leave-active { transition: all .2s cubic-bezier(1, .5, .8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .fb-search { max-width: 100%; min-width: 0; }
  .fadv-section { padding: 10px 12px; }
  .detail-section { padding: 10px 12px; }
}
</style>
