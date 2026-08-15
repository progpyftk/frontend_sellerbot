<template>
  <q-page class="shopee-orders-page">

    <!-- ══ HEADER ═══════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="row items-center justify-between no-wrap">
        <div class="row items-center q-gutter-x-md">
          <div class="header-icon">
            <q-icon name="receipt_long" size="22px" />
          </div>
          <div>
            <div class="header-eyebrow">Shopee</div>
            <div class="header-title">Vendas e Pedidos</div>
          </div>
          <div v-if="pagination.rowsNumber" class="header-count">
            {{ pagination.rowsNumber.toLocaleString('pt-BR') }} pedidos
          </div>
        </div>
         <q-btn v-if="canWrite" unelevated color="teal-7" icon="account_balance_wallet" label="Backfill Escrow"
          :loading="backfillingEscrow" size="sm" class="q-px-md q-mr-sm"
          @click="backfillEscrow">
          <q-tooltip class="bg-grey-9" style="max-width:260px">
            Sincroniza dados financeiros reais (escrow) de todos os pedidos pagos que ainda mostram valores estimados
          </q-tooltip>
        </q-btn>
         <q-btn v-if="canWrite" unelevated color="deep-orange" icon="sync" label="Sincronizar"
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
            <div class="today-card-val">{{ todayStats.count_paid }}</div>
            <div class="today-card-label">Pedidos pagos</div>
            <div class="today-card-sub">
              <span v-if="todayStats.count_cancelled > 0" class="text-red-5">
                {{ todayStats.count_cancelled }} cancelado{{ todayStats.count_cancelled !== 1 ? 's' : '' }}
              </span>
              <span v-if="todayStats.count_cancelled > 0 && todayStats.count_unpaid > 0"> · </span>
              <span v-if="todayStats.count_unpaid > 0" class="text-orange-6">
                {{ todayStats.count_unpaid }} aguardando pagamento
              </span>
              <span v-if="todayStats.count_cancelled === 0 && todayStats.count_unpaid === 0">
                {{ todayStats.count }} total
              </span>
            </div>
          </div>
        </div>

        <!-- Receita Líquida real (escrow) -->
        <div class="today-card today-card--neutral">
          <div class="today-card-icon"><q-icon name="payments" size="16px" /></div>
          <div class="today-card-body">
            <div class="today-card-val">{{ formatCurrency(todayStats.faturamento) }}</div>
            <div class="today-card-label">Receita líquida</div>
            <div class="today-card-sub">
              <span :class="todayStats.revenue_basis === 'escrow' ? 'text-teal-6' : 'text-orange-6'">
                {{ revenueBasisLabel(todayStats) }}
              </span>
              <span v-if="todayStats.revenue_basis !== 'escrow'" class="text-grey-5">
                · {{ todayStats.orders_with_escrow ?? todayStats.escrow_count ?? 0 }}/{{ todayStats.count_paid }} c/ escrow
              </span>
            </div>
          </div>
        </div>

        <!-- Margem após CMV -->
        <div class="today-card"
          :class="todayStats.lucro_apos_cmp != null
            ? (todayStats.lucro_apos_cmp >= 0 ? 'today-card--pos' : 'today-card--neg')
            : 'today-card--neutral'">
          <div class="today-card-icon"><q-icon name="trending_up" size="16px" /></div>
          <div class="today-card-body">
            <template v-if="todayStats.lucro_apos_cmp != null">
              <div class="today-card-val">{{ formatCurrency(todayStats.lucro_apos_cmp) }}</div>
              <div class="today-card-label">
                Margem após CMV
                <span v-if="todayStats.margem_pct != null" class="today-card-badge">
                  {{ todayStats.margem_pct }}%
                </span>
              </div>
              <div class="today-card-sub">
                <span v-if="todayStats.cmp_count < todayStats.count_paid" class="text-orange-5">
                  {{ todayStats.cmp_count }}/{{ todayStats.count_paid }} c/ custo
                </span>
                <span v-else>todos com custo cadastrado</span>
              </div>
            </template>
            <template v-else>
              <div class="today-card-val today-card-val--muted">—</div>
              <div class="today-card-label">Margem após CMV</div>
              <div class="today-card-sub text-orange-5">CMV não cadastrado</div>
            </template>
          </div>
        </div>

        <!-- Lucro médio -->
        <div v-if="todayStats.avg_lucro_apos_cmp != null"
          class="today-card" :class="todayStats.avg_lucro_apos_cmp >= 0 ? 'today-card--pos' : 'today-card--neg'">
          <div class="today-card-icon"><q-icon name="equalizer" size="16px" /></div>
          <div class="today-card-body">
            <div class="today-card-val">{{ formatCurrency(todayStats.avg_lucro_apos_cmp) }}</div>
            <div class="today-card-label">Margem média / pedido</div>
            <div class="today-card-sub">
              base: {{ todayStats.cmp_count }} pedido{{ todayStats.cmp_count !== 1 ? 's' : '' }} c/ custo
            </div>
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
                    <q-icon name="check" color="teal-7" size="14px" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>

          <div class="fb-btn-group">
            <q-btn-dropdown flat dense no-icon-animation unelevated
              icon="bolt" label="Visões"
              class="fb-tbtn" color="grey-7" size="sm">
              <q-list dense style="min-width:200px">
                <q-item-label header class="fb-menu-header">Expedição</q-item-label>
                <q-item clickable v-close-popup @click="setView('READY_TO_SHIP')">
                  <q-item-section avatar><q-icon name="inventory" color="teal-7" size="16px" /></q-item-section>
                  <q-item-section>Pronto para Envio</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setView('PROCESSED')">
                  <q-item-section avatar><q-icon name="local_shipping" color="blue-7" size="16px" /></q-item-section>
                  <q-item-section>Envio Organizado</q-item-section>
                </q-item>
                <q-separator />
                <q-item-label header class="fb-menu-header">Financeiro</q-item-label>
                <q-item clickable v-close-popup @click="setView('COMPLETED')">
                  <q-item-section avatar><q-icon name="check_circle" color="green-7" size="16px" /></q-item-section>
                  <q-item-section>Concluídos</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setView('CANCELLED')">
                  <q-item-section avatar><q-icon name="cancel" color="red-7" size="16px" /></q-item-section>
                  <q-item-section>Cancelados</q-item-section>
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
                    @click.stop color="teal-7" dense />
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
                    @click.stop color="teal-7" dense />
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

        <!-- Modalidade de envio (feedback #18) -->
        <div class="fb-combo" :class="filters.shipping_carrier?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="local_shipping" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.shipping_carrier?.length">Envio</template>
              <template v-else-if="filters.shipping_carrier.length === 1">{{ filters.shipping_carrier[0] }}</template>
              <template v-else>Envio <span class="fb-combo-multi">+{{ filters.shipping_carrier.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.shipping_carrier?.length" class="fb-combo-clear" @click.stop="filters.shipping_carrier = []; loadOrders()">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:220px">
              <q-item v-for="opt in shippingCarrierOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.shipping_carrier?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleFilter('shipping_carrier', opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.shipping_carrier?.includes(opt.value)"
                    @update:model-value="toggleFilter('shipping_carrier', opt.value)"
                    @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section>
                  <span class="fb-menu-item-label">{{ opt.label }}</span>
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
              <q-icon name="filter_list" size="13px" color="teal-7" />
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
                <q-icon :name="tag.icon" size="10px" color="teal-7" />
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
      <SbTableScrollHint />
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
        class="sticky-header-table shopee-table">

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
                  <span class="badge-mono cursor-pointer" @click.stop="copyText(props.row.order_sn)" title="Copiar nº pedido">
                    {{ props.row.order_sn }}
                  </span>
                  <span class="shop-badge">
                    <q-icon name="storefront" size="10px" /> {{ props.row.shop_name }}
                  </span>
                  <span v-if="props.row.shipping_carrier" class="shop-badge"
                    :class="{ 'shop-badge--direta': isDirectDeliveryCarrier(props.row.shipping_carrier) }"
                    :title="isDirectDeliveryCarrier(props.row.shipping_carrier) ? 'Entrega Direta — equivalente ao Flex do ML' : props.row.shipping_carrier">
                    <q-icon name="local_shipping" size="10px" /> {{ props.row.shipping_carrier }}
                  </span>
                </div>
                <div v-if="props.row.items?.length" class="row items-start q-gutter-x-sm">
                  <q-img
                    v-if="getItemThumbnail(props.row)"
                    :src="getItemThumbnail(props.row)"
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
                      {{ props.row.items[0].item_name }}
                    </span>
                    <span v-if="props.row.items[0].model_name" class="variation-badge-inline">
                      <q-icon name="tune" size="9px" /> {{ props.row.items[0].model_name }}
                    </span>
                    <span v-if="props.row.items[0].model_sku || props.row.items[0].seller_sku" class="sku-inline">
                      {{ props.row.items[0].model_sku || props.row.items[0].seller_sku }}
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

            <!-- ⑤ Venda (total_amount = valor pago pelo comprador) -->
            <q-td key="bruto" :props="props" align="right">
              <div class="cell-amount">
                <div class="amount-main">{{ formatCurrency(props.row.total_amount) }}</div>
                <div v-if="hasDiscount(props.row)" class="amount-original">
                  <span class="text-grey-4" style="text-decoration:line-through;font-size:10px">
                    {{ formatCurrency(getItemsOriginalTotal(props.row)) }}
                  </span>
                </div>
                <div v-if="(props.row.items || []).length" class="amount-sub">
                  {{ props.row.items.reduce((s,i) => s + i.quantity, 0) }} un
                </div>
              </div>
            </q-td>

            <!-- ⑥ Taxas Shopee (comissão + serviço, do escrow) -->
            <q-td key="frete" :props="props" align="right">
              <div class="column items-end">
                <template v-if="isEscrowReal(props.row)">
                  <span class="frete-val">-{{ formatCurrency(getTaxasShopee(props.row)) }}</span>
                  <span class="frete-hint">comissão + taxas</span>
                </template>
                <span v-else class="text-caption text-grey-4">—</span>
              </div>
            </q-td>

            <!-- ⑦ Repasse Shopee (escrow_amount) -->
            <q-td key="liquido" :props="props" align="right">
              <div class="cell-liquido">
                <template v-if="isEscrowReal(props.row)">
                  <div :class="['liquido-main', props.row.escrow_amount >= 0 ? 'pos' : 'neg']">
                    {{ formatCurrency(props.row.escrow_amount) }}
                  </div>
                  <div class="liquido-hint">repasse Shopee</div>
                </template>
                <template v-else>
                  <div :class="['liquido-main', getLiquido(props.row) >= 0 ? 'pos' : 'neg']">
                    {{ formatCurrency(getLiquido(props.row)) }}
                  </div>
                  <div class="liquido-hint">estimado</div>
                </template>
              </div>
            </q-td>

            <!-- ⑧ Margem após CMV -->
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

        <template #loading><q-inner-loading showing color="teal-7" /></template>
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
                <q-icon name="receipt_long" size="13px" class="q-mr-xs" />Pedido Shopee
              </div>
              <div class="detail-order-id">{{ selectedOrder.order_sn }}</div>
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
              <q-btn v-if="!isEscrowReal(selectedOrder)"
                unelevated dense size="xs" color="teal-7" icon="sync" label="Sync Escrow"
                :loading="syncingEscrow"
                @click="syncOrderEscrow(selectedOrder)"
              />
              <q-icon v-else name="verified" size="14px" color="teal-6">
                <q-tooltip class="bg-grey-9">Dados de escrow sincronizados</q-tooltip>
              </q-icon>
            </div>
          </div>
        </div>

        <div class="detail-body">

          <!-- Comprador + datas rápidas -->
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
                <q-icon name="local_shipping" size="12px" class="q-mr-xs text-teal-7" />
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
                v-if="getShopeeItemThumbnail(item)"
                :src="getShopeeItemThumbnail(item)"
                style="width:48px;height:48px;flex-shrink:0"
                fit="contain"
                class="rounded-borders border-grey" />
              <div v-else class="item-img-placeholder">
                <q-icon name="inventory_2" size="18px" color="grey-4" />
              </div>
              <div class="column q-gutter-y-none" style="flex:1;min-width:0">
                <span class="text-grey-9 text-weight-medium" style="font-size:13px;line-height:1.3">{{ item.item_name }}</span>
                <span v-if="item.model_name" class="variation-badge q-mt-xs">
                  <q-icon name="tune" size="10px" /> {{ item.model_name }}
                </span>
                <div class="row items-center q-gutter-x-xs q-mt-xs" style="flex-wrap:wrap;gap:4px">
                  <!-- SKU da variação (model_sku) — preferido sobre SKU do item -->
                  <span v-if="item.model_sku" class="badge-sku badge-sku--variation">
                    <q-icon name="tag" size="9px" />{{ item.model_sku }}
                    <q-tooltip class="bg-grey-9">SKU da variação</q-tooltip>
                  </span>
                  <!-- SKU do item (seller_sku) — mostra apenas se diferente do model_sku -->
                  <span v-if="item.seller_sku && item.seller_sku !== item.model_sku" class="badge-sku">
                    <q-icon name="tag" size="9px" />{{ item.seller_sku }}
                    <q-tooltip class="bg-grey-9">SKU do anúncio</q-tooltip>
                  </span>
                  <span class="badge-sku badge-sku--id">ID {{ item.item_id }}</span>
                </div>
              </div>
              <div class="column items-end q-gutter-y-none" style="flex-shrink:0">
                <!-- Se houve desconto, mostra original riscado -->
                <span v-if="item.original_price && Number(item.original_price) > Number(item.unit_price)"
                  class="text-grey-4" style="text-decoration:line-through;font-size:10px">
                  {{ formatCurrency(item.original_price) }}
                </span>
                <span class="item-price">{{ formatCurrency(item.unit_price) }}</span>
                <span class="text-caption text-grey-6">×{{ item.quantity }}</span>
                <span class="item-subtotal">{{ formatCurrency(item.unit_price * item.quantity) }}</span>
              </div>
            </div>
          </div>

          <!-- Resumo financeiro completo -->
          <div class="detail-section">
            <div class="detail-section-title">
              <q-icon name="account_balance_wallet" size="14px" /> Auditoria Financeira
              <q-badge v-if="isEscrowReal(selectedOrder)" color="teal-7" class="q-ml-sm" style="font-size:9px">ESCROW</q-badge>
              <q-badge v-else :color="selectedOrder.escrow_sync_status === 'error' ? 'negative' : 'grey-5'" class="q-ml-sm" style="font-size:9px">
                {{ escrowStatusLabel(selectedOrder) }}
              </q-badge>
            </div>

            <!-- ── BLOCO RECEITA ── -->
            <div class="finance-block">
              <div class="finance-block-label">Receita do Comprador</div>

              <!-- Com escrow: preço original → desconto → preço final -->
              <template v-if="isEscrowReal(selectedOrder)">

                <!-- ▸ Quadrinho: formação do preço (descontos do seller) -->
                <div class="price-box">
                  <!-- Preço original só aparece se houve desconto do seller -->
                  <div v-if="Number(selectedOrder.seller_product_discount) > 0 || Number(selectedOrder.seller_voucher) > 0" class="price-box-row">
                    <span class="price-box-label">Preço original (lista)</span>
                    <span class="price-box-val price-box-strike">
                      {{ formatCurrency(Number(selectedOrder.selling_price) + Number(selectedOrder.seller_product_discount || 0) + Number(selectedOrder.seller_voucher || 0)) }}
                    </span>
                  </div>
                  <div v-if="Number(selectedOrder.seller_product_discount) > 0" class="price-box-row">
                    <span class="price-box-label text-orange-7">Desconto no produto (seller)</span>
                    <span class="price-box-val text-orange-7">-{{ formatCurrency(selectedOrder.seller_product_discount) }}</span>
                  </div>
                  <div v-if="Number(selectedOrder.seller_voucher) > 0" class="price-box-row">
                    <span class="price-box-label text-orange-7">
                      Cupom do vendedor<template v-if="selectedOrder.seller_voucher_code"> ({{ selectedOrder.seller_voucher_code }})</template>
                    </span>
                    <span class="price-box-val text-orange-7">-{{ formatCurrency(selectedOrder.seller_voucher) }}</span>
                  </div>
                  <div class="price-box-divider" />
                  <div class="price-box-row price-box-total">
                    <span class="price-box-label">
                      Preço de venda
                      <q-tooltip class="bg-grey-9" style="max-width:240px">Valor base do escrow: o que o seller recebe como referência de receita antes das taxas Shopee.</q-tooltip>
                      <q-icon name="info_outline" size="9px" class="q-ml-xs text-grey-4" />
                    </span>
                    <span class="price-box-val price-box-bold">{{ formatCurrency(selectedOrder.selling_price) }}</span>
                  </div>
                </div>

                <!-- Subsídios da Shopee que cobrem a diferença até o valor pago pelo comprador -->
                <div v-if="getShopeeSubsidy(selectedOrder) > 0" class="finance-row finance-row--note q-mt-xs">
                  <span class="finance-label-note text-indigo-6">
                    Subsídio Shopee
                    <q-tooltip class="bg-grey-9" style="max-width:300px">
                      A Shopee cobriu a diferença entre o Preço de venda (R${{ formatCurrency(selectedOrder.selling_price) }}) e o valor efetivamente pago pelo comprador (R${{ formatCurrency(selectedOrder.total_amount) }}).
                      Inclui cupons Shopee, moedas resgatadas, desconto PIX e promoções da plataforma.
                      O seller ainda recebe com base no Preço de venda — a Shopee assume esse custo.
                    </q-tooltip>
                    <q-icon name="info_outline" size="10px" class="q-ml-xs" />
                  </span>
                  <span class="finance-val-note text-indigo-6">-{{ formatCurrency(getShopeeSubsidy(selectedOrder)) }}</span>
                </div>
                <div class="finance-row finance-row--note">
                  <span class="finance-label-note finance-bold">Total pago pelo comprador</span>
                  <span class="finance-val-note finance-bold">{{ formatCurrency(selectedOrder.total_amount) }}</span>
                </div>
              </template>

              <!-- Sem escrow: breakdown por itens -->
              <template v-else>
                <div class="price-box">
                  <div v-if="hasDiscount(selectedOrder)" class="price-box-row">
                    <span class="price-box-label">Preço original (lista)</span>
                    <span class="price-box-val price-box-strike">{{ formatCurrency(getItemsOriginalTotal(selectedOrder)) }}</span>
                  </div>
                  <div v-if="hasDiscount(selectedOrder)" class="price-box-row">
                    <span class="price-box-label text-orange-7">Desconto no produto</span>
                    <span class="price-box-val text-orange-7">-{{ formatCurrency(getItemsOriginalTotal(selectedOrder) - getItemsSaleTotal(selectedOrder)) }}</span>
                  </div>
                  <div class="price-box-divider" v-if="hasDiscount(selectedOrder)" />
                  <div class="price-box-row price-box-total">
                    <span class="price-box-label">Preço de venda (produtos)</span>
                    <span class="price-box-val price-box-bold">{{ formatCurrency(getItemsSaleTotal(selectedOrder)) }}</span>
                  </div>
                </div>
                <div class="finance-row finance-row--note">
                  <span class="finance-label-note">
                    Total pago pelo comprador
                    <q-tooltip class="bg-grey-9" style="max-width:260px">Valor pago pelo comprador. Inclui frete pago por ele (se houver). Pode ser igual ao preço dos produtos quando há frete subsidiado pela Shopee.</q-tooltip>
                    <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                  </span>
                  <span class="finance-val-note finance-bold">{{ formatCurrency(selectedOrder.total_amount) }}</span>
                </div>
              </template>
            </div>

            <!-- ── BLOCO DEDUÇÕES (escrow disponível) ── -->
            <template v-if="isEscrowReal(selectedOrder)">
              <div class="finance-block">
                <div class="finance-block-label">Deduções Shopee</div>

                <!-- Comissão -->
                <div class="finance-row">
                  <span class="finance-label">
                    Comissão
                    <q-tooltip class="bg-grey-9" style="max-width:260px">commission_fee: percentual cobrado pela Shopee sobre o valor de venda (~16%)</q-tooltip>
                    <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                  </span>
                  <span class="finance-val finance-negative">-{{ formatCurrency(selectedOrder.commission_fee) }}</span>
                </div>

                <!-- Taxa de serviço -->
                <div class="finance-row">
                  <span class="finance-label">
                    Taxa de serviço
                    <q-tooltip class="bg-grey-9" style="max-width:260px">service_fee: taxa de transação + pagamento (cartão, Pix, etc.)</q-tooltip>
                    <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                  </span>
                  <span class="finance-val finance-negative">-{{ formatCurrency(selectedOrder.service_fee) }}</span>
                </div>

                <div v-if="Number(selectedOrder.ams_commission_fee) > 0" class="finance-row">
                  <span class="finance-label">
                    Comissão de afiliados (AMS)
                    <q-tooltip class="bg-grey-9" style="max-width:260px">Custo do programa de afiliados/creators, já incluído no repasse escrow.</q-tooltip>
                    <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                  </span>
                  <span class="finance-val finance-negative">-{{ formatCurrency(selectedOrder.ams_commission_fee) }}</span>
                </div>

                <!-- ▸ Quadrinho de logística -->
                <div class="logistics-box q-mt-xs">
                  <div class="logistics-box-label">
                    <q-icon name="local_shipping" size="11px" class="q-mr-xs" />Logística
                  </div>
                  <div class="logistics-box-row">
                    <span>Frete bruto
                      <q-tooltip class="bg-grey-9" style="max-width:260px">actual_shipping_fee: custo Shopee Xpress cobrado do seller</q-tooltip>
                      <q-icon name="info_outline" size="9px" class="q-ml-xs text-grey-4" />
                    </span>
                    <span class="finance-negative">-{{ formatCurrency(selectedOrder.logistics_fee) }}</span>
                  </div>
                  <div v-if="Number(selectedOrder.shopee_shipping_rebate) > 0" class="logistics-box-row text-teal-7">
                    <span>Rebate Shopee
                      <q-tooltip class="bg-grey-9" style="max-width:260px">shopee_shipping_rebate: Shopee subsidia o frete devolvendo ao seller</q-tooltip>
                      <q-icon name="info_outline" size="9px" class="q-ml-xs" />
                    </span>
                    <span>+{{ formatCurrency(selectedOrder.shopee_shipping_rebate) }}</span>
                  </div>
                  <div class="logistics-box-divider" />
                  <div class="logistics-box-row logistics-box-total">
                    <span>Frete líquido (custo real)</span>
                    <span :class="getFreteNet(selectedOrder) > 0 ? 'finance-negative' : 'text-teal-7'">
                      {{ formatCurrency(getFreteNet(selectedOrder)) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Repasse final -->
              <div class="finance-divider" />
              <div class="finance-row finance-row--subtotal">
                <span class="finance-label-bold">
                  Repasse Shopee (escrow)
                  <q-tooltip class="bg-grey-9" style="max-width:260px">escrow_amount: valor líquido que a Shopee deposita para o seller no ciclo de pagamento</q-tooltip>
                  <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                </span>
                <span :class="['finance-subtotal', selectedOrder.escrow_amount >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(selectedOrder.escrow_amount) }}
                </span>
              </div>
            </template>

            <!-- ── BLOCO DEDUÇÕES (sem escrow — estimativa) ── -->
            <template v-else>
              <div class="finance-block">
                <div class="finance-block-label">Deduções (estimado)</div>
                <!-- Logística estimada (shipping_fee = custo Shopee Xpress cobrado do seller) -->
                <div v-if="Number(selectedOrder.shipping_fee) > 0" class="finance-row">
                  <span class="finance-label">
                    Logística Shopee (estimada)
                    <q-tooltip class="bg-grey-9" style="max-width:280px">shipping_fee: custo estimado da logística Shopee Xpress cobrado do seller. O frete que o comprador paga vai direto para a Shopee — não soma na sua receita. Sincronize o escrow para o valor real.</q-tooltip>
                    <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                  </span>
                  <span class="finance-val finance-negative">-{{ formatCurrency(selectedOrder.shipping_fee) }}</span>
                </div>
                <div class="finance-row finance-row--note">
                  <span class="finance-label-note">
                    Comissão + taxas
                    <q-tooltip class="bg-grey-9" style="max-width:260px">Comissão Shopee (~16%) e taxa de serviço (~12%) só estão disponíveis após sincronizar o escrow.</q-tooltip>
                    <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                  </span>
                  <span class="finance-val-note text-grey-4">Sincronize o escrow</span>
                </div>
              </div>
              <div class="finance-divider" />
              <div class="finance-row finance-row--subtotal">
                <span class="finance-label-bold">
                  Repasse estimado
                  <q-tooltip class="bg-grey-9" style="max-width:280px">total_amount − logística estimada. Não inclui comissão e taxas Shopee (sincronize o escrow para ver o repasse real).</q-tooltip>
                  <q-icon name="info_outline" size="10px" class="q-ml-xs text-grey-4" />
                </span>
                <span :class="['finance-subtotal', getLiquido(selectedOrder) >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(getLiquido(selectedOrder)) }}
                </span>
              </div>
            </template>

            <!-- ── CMV + custo operacional + LUCRO ── -->
            <template v-if="selectedOrder.custo_medio_produto != null">
              <div class="finance-block q-mt-xs">
                <div class="finance-block-label">Custo do Produto (CMV)</div>
                <div class="finance-row">
                  <span class="finance-label">Custo médio do produto</span>
                  <span class="finance-val finance-negative">-{{ formatCurrency(selectedOrder.custo_medio_produto) }}</span>
                </div>
                <div v-if="isDirectDeliveryCarrier(selectedOrder.shipping_carrier) && selectedOrder.direct_delivery_cost_snapshot != null" class="finance-row">
                  <span class="finance-label">Custo Entrega Direta</span>
                  <span class="finance-val finance-negative">-{{ formatCurrency(selectedOrder.direct_delivery_cost_snapshot) }}</span>
                </div>
              </div>
              <div class="finance-divider" />
              <div class="finance-row finance-row--total">
                <span class="finance-label-bold">(=) LUCRO REAL</span>
                <span :class="['finance-total', selectedOrder.lucro_apos_cmp >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(selectedOrder.lucro_apos_cmp) }}
                </span>
              </div>
            </template>
            <template v-else>
              <div class="finance-note-box">
                <q-icon name="info_outline" size="13px" class="q-mr-xs" />
                Custo do produto não cadastrado. Configure o CMV no ERP para ver o lucro real.
              </div>
            </template>
          </div>

          <!-- Rastreamento -->
          <div v-if="selectedOrder.tracking_number" class="detail-section">
            <div class="detail-section-title">
              <q-icon name="local_shipping" size="14px" /> Rastreamento
              <span class="font-mono text-grey-5 q-ml-sm" style="font-size:10px">{{ selectedOrder.tracking_number }}</span>
              <q-spinner v-if="trackingLoading" size="12px" color="teal-6" class="q-ml-sm" />
            </div>

            <!-- Timeline de eventos -->
            <div v-if="!trackingLoading && trackingList.length" class="tracking-timeline">
              <div v-for="(event, idx) in trackingList" :key="idx" class="tracking-event">
                <div class="tracking-dot" :class="idx === 0 ? 'tracking-dot--active' : 'tracking-dot--done'" />
                <div class="tracking-line" v-if="idx < trackingList.length - 1" />
                <div class="tracking-content">
                  <div class="tracking-desc" :class="idx === 0 && 'tracking-desc--latest'">
                    {{ event.description }}
                  </div>
                  <div class="tracking-time">
                    {{ event.time ? formatDateFull(event.time * 1000) : '—' }}
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="!trackingLoading && !trackingList.length" class="text-grey-5 text-caption q-mt-xs">
              Sem eventos de rastreamento disponíveis
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
import ShopeeService from 'src/services/ShopeeService'
import { useStore } from 'src/stores/store'
import SbTableScrollHint from 'src/components/common/SbTableScrollHint.vue'
import { isDirectDeliveryCarrier, isEscrowReal, orderRevenue, revenueBasisLabel } from 'src/utils/shopeeFinance'

const $q = useQuasar()
const authStore = useStore()
const canWrite = computed(() => authStore.canWrite)

// ── Estado ──────────────────────────────────────────────────────────────────
const orders         = ref([])
const loading        = ref(false)
const syncing        = ref(false)
const searchFocused  = ref(false)
const showAdvanced   = ref(false)
const accountOptions = ref([])
const currentSort    = ref('-create_time')
const todayStats     = ref(null)
const todayLoading   = ref(false)
const detailOpen       = ref(false)
const selectedOrder    = ref(null)
const syncingEscrow    = ref(false)
const backfillingEscrow = ref(false)
const trackingList     = ref([])
const trackingLoading  = ref(false)

const pagination = ref({
  sortBy: null,
  descending: false,
  page: 1,
  rowsPerPage: 50,
  rowsNumber: 0,
})

let searchTimeout = null

const filters = reactive({
  search:     '',
  account:    [],
  status:     [],
  shipping_carrier: [],
  quickDate:  null,
  dateFrom:   null,
  dateTo:     null,
  amountMin:  null,
  amountMax:  null,
})

// ── Colunas ────────────────────────────────────────────────────────────────
const columns = [
  { name: 'order',     label: 'PEDIDO / PRODUTO',     field: 'order_sn',       sortable: false, align: 'left',   style: 'min-width:280px' },
  { name: 'data',      label: 'DATA',                 field: 'create_time',    sortable: true,  align: 'left',   style: 'min-width:90px'  },
  { name: 'comprador', label: 'COMPRADOR',            field: 'buyer_username', sortable: false, align: 'left',   style: 'min-width:110px' },
  { name: 'status',    label: 'STATUS',               field: 'status',         sortable: false, align: 'center', style: 'min-width:120px' },
  { name: 'bruto',     label: 'VENDA',                field: 'total_amount',   sortable: true,  align: 'right',  style: 'min-width:90px'  },
  { name: 'frete',     label: 'TAXAS SHOPEE',         field: 'commission_fee', sortable: false, align: 'right',  style: 'min-width:90px' },
  { name: 'liquido',   label: 'REPASSE (S/ CUSTO)',   field: 'escrow_amount',  sortable: false, align: 'right',  style: 'min-width:120px' },
  { name: 'lucro',     label: 'LUCRO APÓS CUSTO',     field: 'lucro_apos_cmp', sortable: false, align: 'right',  style: 'min-width:115px' },
]

// ── Opções ─────────────────────────────────────────────────────────────────
const statusOptions = [
  { value: 'UNPAID',              label: 'Aguardando Pagamento' },
  { value: 'INVOICE_PENDING',     label: 'Aguardando NF'        },
  { value: 'READY_TO_SHIP',       label: 'Pronto p/ Envio'      },
  { value: 'PROCESSED',           label: 'Envio Organizado'      },
  { value: 'RETRY_SHIP',          label: 'Retentar Envio'        },
  { value: 'SHIPPED',             label: 'Enviado'               },
  { value: 'TO_CONFIRM_RECEIVE',  label: 'Ag. Confirmação'       },
  { value: 'IN_CANCEL',           label: 'Em Cancelamento'       },
  { value: 'CANCELLED',           label: 'Cancelado'             },
  { value: 'TO_RETURN',           label: 'Em Devolução'          },
  { value: 'COMPLETED',           label: 'Concluído'             },
]

// Modalidades de envio Shopee (feedback #18) — "Entrega Direta" é a modalidade em que
// o próprio vendedor entrega, equivalente ao Flex do Mercado Livre.
const shippingCarrierOptions = [
  { value: 'Shopee Xpress',           label: 'Shopee Xpress' },
  { value: 'Entrega Direta',          label: 'Entrega Direta (≈ Flex)' },
  { value: 'Full',                    label: 'Full' },
  { value: 'Retirada pelo Comprador', label: 'Retirada pelo Comprador' },
]

const quickDateOptions = [
  { value: 'today',   label: 'Hoje'          },
  { value: '7d',      label: 'Últimos 7 dias' },
  { value: '30d',     label: 'Últimos 30 dias'},
  { value: '90d',     label: 'Últimos 90 dias'},
]

const sortOptions = [
  { value: '-create_time',  label: 'Mais recente'  },
  { value: 'create_time',   label: 'Mais antigo'   },
  { value: '-total_amount', label: 'Maior valor'   },
  { value: 'total_amount',  label: 'Menor valor'   },
  { value: '-pay_time',     label: 'Último pago'   },
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
  filters.shipping_carrier.forEach(v => {
    const opt = shippingCarrierOptions.find(o => o.value === v)
    if (opt) tags.push({ key: 'shipping_carrier', value: v, catLabel: 'Envio', label: opt.label, icon: 'local_shipping' })
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
    COMPLETED: 'completed', SHIPPED: 'shipped', READY_TO_SHIP: 'ready',
    PROCESSED: 'processed', UNPAID: 'unpaid', INVOICE_PENDING: 'invoice',
    CANCELLED: 'cancelled', IN_CANCEL: 'cancel', TO_RETURN: 'return',
    RETRY_SHIP: 'retry', TO_CONFIRM_RECEIVE: 'confirm',
  }
  return map[s] || 'default'
}

function statusLabel(s) {
  return statusOptions.find(o => o.value === s)?.label || s
}

function statusIcon(s) {
  const map = {
    COMPLETED: 'check_circle', SHIPPED: 'local_shipping', READY_TO_SHIP: 'inventory',
    PROCESSED: 'move_to_inbox', UNPAID: 'schedule', INVOICE_PENDING: 'description',
    CANCELLED: 'cancel', IN_CANCEL: 'pending', TO_RETURN: 'keyboard_return',
    RETRY_SHIP: 'replay', TO_CONFIRM_RECEIVE: 'hourglass_empty',
  }
  return map[s] || 'circle'
}

function escrowStatusLabel(row) {
  return {
    pending: 'PENDENTE',
    unavailable: 'INDISPONÍVEL',
    error: 'ERRO NO ESCROW',
  }[row?.escrow_sync_status] || 'ESTIMADO'
}

// ── Helpers financeiros ────────────────────────────────────────────────────
// escrow_amount   = repasse real da Shopee (confirmado via get_escrow_detail)
// commission_fee  = comissão Shopee (~16%)
// service_fee     = taxa de transação/serviço
// logistics_fee   = frete bruto cobrado; shopee_shipping_rebate = rebate (pode ser 100%)
// getLiquido = fallback estimado quando escrow ainda não sincronizado

function getShopeeSubsidy(row) {
  // Diferença entre o preço de venda base (escrow) e o que o comprador pagou de fato.
  // Essa diferença é coberta pela Shopee via cupons, moedas, PIX discount, promoções.
  const selling = Number(row.selling_price || 0)
  const paid = Number(row.total_amount || 0)
  return Math.max(0, selling - paid)
}

function getFreteNet(row) {
  return Number(row.logistics_fee || 0) - Number(row.shopee_shipping_rebate || 0)
}

function getTaxasShopee(row) {
  return Number(row.commission_fee || 0) + Number(row.service_fee || 0)
}

function getLiquido(row) {
  return orderRevenue(row)
}

// Soma de unit_price × qty — preço real de venda dos produtos (sem frete)
function getItemsSaleTotal(row) {
  if (!row.items?.length) return Number(row.total_amount || 0)
  return row.items.reduce((s, i) => s + (Number(i.unit_price || 0) * (i.quantity || 1)), 0)
}

// Soma de original_price × qty — preço de lista antes do desconto
function getItemsOriginalTotal(row) {
  if (!row.items?.length) return 0
  return row.items.reduce((s, i) => s + (Number(i.original_price || i.unit_price || 0) * (i.quantity || 1)), 0)
}

// Há desconto se o preço original dos itens for maior que o preço de venda dos itens
function hasDiscount(row) {
  const orig = getItemsOriginalTotal(row)
  const sale = getItemsSaleTotal(row)
  return orig > 0 && (orig - sale) > 0.05
}

// ── Helpers de imagem ──────────────────────────────────────────────────────
function getItemThumbnail(row) {
  if (!row.items?.length) return null
  return row.items[0]?.thumbnail || null
}

function getShopeeItemThumbnail(orderItem) {
  return orderItem?.thumbnail || null
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
  filters.shipping_carrier = []
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

function setView(status) {
  filters.status = [status]
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
function buildParams() {
  const p = { sort: currentSort.value }
  if (filters.search)       p.search     = filters.search
  if (filters.account.length) filters.account.forEach(id => { p['account'] = id }) // workaround
  if (filters.status.length)  p.status   = filters.status
  if (filters.dateFrom)     p.date_from  = filters.dateFrom
  if (filters.dateTo)       p.date_to    = filters.dateTo
  return p
}

async function loadOrders(pg = null) {
  loading.value = true
  pagination.value.page = pg ?? 1
  try {
    const params = buildParams()

    // Multi-value params: axios serializes arrays as repeated keys
    const axiosParams = {
      sort: currentSort.value,
      page: pagination.value.page,
      page_size: pagination.value.rowsPerPage,
    }
    if (filters.search) axiosParams.search = filters.search
    if (filters.account.length) axiosParams.account = filters.account
    if (filters.status.length)  axiosParams.status  = filters.status
    if (filters.shipping_carrier.length) axiosParams.shipping_carrier = filters.shipping_carrier
    if (filters.dateFrom) axiosParams.date_from = filters.dateFrom
    if (filters.dateTo)   axiosParams.date_to   = filters.dateTo
    if (filters.amountMin) axiosParams.amount_min = filters.amountMin
    if (filters.amountMax) axiosParams.amount_max = filters.amountMax

    const { data } = await ShopeeService.listOrders(axiosParams)
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
    const { data } = await ShopeeService.getOrderTodayStats()
    todayStats.value = data
  } catch (e) { console.error(e) }
  finally { todayLoading.value = false }
}

async function loadAccounts() {
  try {
    const { data } = await ShopeeService.listAccounts()
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
    await Promise.all(accountIds.map(id => ShopeeService.syncOrders(id)))
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
  trackingList.value = []
  detailOpen.value = true
  if (order.tracking_number) {
    loadTracking(order)
  }
}

let trackingSeq = 0

async function loadTracking(order) {
  const seq = ++trackingSeq
  trackingLoading.value = true
  try {
    const { data } = await ShopeeService.getOrderTracking(order.id)
    if (seq !== trackingSeq) return
    trackingList.value = data.tracking_list || []
  } catch (e) {
    console.error('[Shopee] Erro ao carregar rastreamento:', e)
    if (seq !== trackingSeq) return
    trackingList.value = []
  } finally {
    if (seq === trackingSeq) trackingLoading.value = false
  }
}

async function backfillEscrow() {
  if (!accountOptions.value.length) return
  backfillingEscrow.value = true

  let totalSynced = 0, totalErrors = 0
  try {
    for (const account of accountOptions.value) {
      const { data } = await ShopeeService.syncEscrow(account.id, { force: false })
      totalSynced += data.stats?.synced || 0
      totalErrors += data.stats?.errors || 0
    }
    $q.notify({
      message: `Backfill concluído: ${totalSynced} pedido(s) com escrow real, ${totalErrors} erro(s).`,
      color: totalErrors > 0 ? 'warning' : 'positive',
      position: 'top',
      timeout: 6000,
    })
    loadOrders()
  } catch (e) {
    console.error('[Shopee] Erro no backfill de escrow:', e)
    $q.notify({ message: 'Erro ao executar backfill de escrow.', color: 'negative', position: 'top' })
  } finally {
    backfillingEscrow.value = false
  }
}

async function syncOrderEscrow(order) {
  if (!order?.account_pk) return
  syncingEscrow.value = true
  try {
    await ShopeeService.syncEscrow(order.account_pk, { order_sns: [order.order_sn] })
    // Recarrega o pedido para refletir os dados de escrow
    const { data } = await ShopeeService.getOrder(order.id)
    selectedOrder.value = { ...data }
    // Atualiza também na lista local
    const idx = orders.value.findIndex(o => o.id === order.id)
    if (idx !== -1) orders.value[idx] = { ...data }
  } catch (e) {
    console.error('[Shopee] Erro ao sincronizar escrow:', e)
  } finally {
    syncingEscrow.value = false
  }
}

onMounted(() => {
  loadAccounts()
  loadOrders()
  fetchTodayStats()
})
</script>

<style scoped lang="scss">
/* ── Página base ───────────────────────────────────────────── */
.shopee-orders-page { background: #f8fafc; min-height: 100vh; }

/* ── Header ────────────────────────────────────────────────── */
.page-header {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 14px 20px;
  position: sticky; top: 0; z-index: 10;
}
.header-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #EE4D2D, #ff7043);
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
.today-card--pos { border-color: #bbf7d0; background: #f0fdf4; }
.today-card--neg { border-color: #fecaca; background: #fef2f2; }
.today-card--neutral { border-color: #e2e8f0; background: #f8fafc; }
.today-card-icon { color: #0d9488; }
.today-card--pos .today-card-icon { color: #16a34a; }
.today-card--neg .today-card-icon { color: #dc2626; }
.today-card-body { display: flex; flex-direction: column; }
.today-card-val { font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.2; }
.today-card-val--muted { color: #94a3b8; }
.today-card-label { font-size: 10px; color: #64748b; display: flex; align-items: center; gap: 4px; }
.today-card-badge { background: #f0fdf9; color: #0d9488; border-radius: 4px; padding: 0 4px; font-size: 9px; font-weight: 700; }
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
.fb-search.focused, .fb-search.filled { border-color: #0d9488; background: #fff; }
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
.fb-combo--on   { border-color: #0d9488; background: #f0fdf9; }
.fb-combo-btn {
  display: flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 10px 0 9px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 500; color: #374151; border-radius: 20px;
}
.fb-combo--on .fb-combo-btn  { color: #0d9488; }
.fb-combo-ico                { color: #94a3b8; flex-shrink: 0; }
.fb-combo--on .fb-combo-ico  { color: #0d9488; }
.fb-combo-label              { white-space: nowrap; }
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

/* ── Status dot in filter menu ─────────────────────────────── */
.s-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.s-dot--completed { background: #16a34a; }
.s-dot--shipped   { background: #2563eb; }
.s-dot--ready     { background: #0d9488; }
.s-dot--processed { background: #0891b2; }
.s-dot--unpaid    { background: #d97706; }
.s-dot--invoice   { background: #7c3aed; }
.s-dot--cancelled { background: #dc2626; }
.s-dot--cancel    { background: #ef4444; }
.s-dot--return    { background: #f97316; }
.s-dot--retry     { background: #ea580c; }
.s-dot--confirm   { background: #0ea5e9; }
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
  background: #f0fdf9; color: #0d9488;
  font-size: 11px; font-weight: 500;
  cursor: pointer; transition: background .1s;
}
.fb-index-pill:hover { background: #ccfbf1; }

/* ── Tabela ────────────────────────────────────────────────── */
.table-container { background: #fff; }
.shopee-table { background: #fff; }

:deep(.shopee-table .q-table__top) { display: none; }

:deep(.shopee-table thead tr th) {
  position: sticky; top: 0; z-index: 1;
  background: #f8fafc;
  font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: .4px;
  border-bottom: 1.5px solid #e2e8f0;
}

:deep(.shopee-table tbody tr.hover-row:hover) { background: #f0fdf9 !important; }
:deep(.shopee-table tbody tr.row-expanded)    { background: #f0fdf9 !important; }
:deep(.shopee-table tbody td) {
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

.shop-badge { color: #EE4D2D; font-weight: 700; font-size: 11px; }
.shop-badge--direta { color: #7c3aed; }

.cell-amount { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.amount-main { font-size: 14px; font-weight: 700; color: #0f172a; }
.amount-sub  { font-size: 10px; color: #94a3b8; }

.frete-val   { font-size: 13px; color: #64748b; }
.frete-hint  { font-size: 10px; color: #94a3b8; }
.frete-gratis {
  display: flex; align-items: center; gap: 3px;
  font-size: 11px; color: #16a34a; font-weight: 600;
}

.cell-lucro  { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.lucro-main  { font-size: 14px; font-weight: 700; }
.lucro-main.pos { color: #16a34a; }
.lucro-main.neg { color: #dc2626; }
.lucro-hint  { font-size: 10px; color: #94a3b8; }

/* ── Order status pills ────────────────────────────────────── */
.order-status-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 20px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
  white-space: nowrap;
}
.order-status-pill--completed { background: #dcfce7; color: #16a34a; }
.order-status-pill--shipped   { background: #dbeafe; color: #2563eb; }
.order-status-pill--ready     { background: #ccfbf1; color: #0d9488; }
.order-status-pill--processed { background: #e0f2fe; color: #0891b2; }
.order-status-pill--unpaid    { background: #fef3c7; color: #b45309; }
.order-status-pill--invoice   { background: #ede9fe; color: #7c3aed; }
.order-status-pill--cancelled { background: #fee2e2; color: #dc2626; }
.order-status-pill--cancel    { background: #fee2e2; color: #ef4444; }
.order-status-pill--return    { background: #ffedd5; color: #f97316; }
.order-status-pill--retry     { background: #ffedd5; color: #ea580c; }
.order-status-pill--confirm   { background: #e0f2fe; color: #0ea5e9; }
.order-status-pill--default   { background: #f1f5f9; color: #475569; }

/* ── Expand panel ──────────────────────────────────────────── */
.expand-panel {
  background: #fff; padding: 16px 20px;
  border-top: 2px solid #0d9488;
}
.expand-section-label {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px;
}

/* ── Item card in expand ───────────────────────────────────── */
.item-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid #e2e8f0; background: #f8fafc;
}
.item-img-placeholder {
  width: 50px; height: 50px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #f1f5f9; border-radius: 6px;
}
.variation-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 600; color: #0d9488;
  background: #f0fdf9; border-radius: 6px; padding: 1px 6px;
}
.item-price    { font-size: 12px; color: #EE4D2D; font-weight: 600; }
.item-subtotal { font-size: 12px; color: #0f172a; font-weight: 700; }
.border-grey   { border: 1px solid #e2e8f0; }

/* ── Table extra cells ─────────────────────────────────────── */
.amount-original { font-size: 10px; color: #94a3b8; }
.cell-liquido { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.liquido-main { font-size: 13px; font-weight: 700; }
.liquido-main.pos { color: #0d9488; }
.liquido-main.neg { color: #dc2626; }
.liquido-hint { font-size: 10px; color: #94a3b8; }
.variation-badge-inline {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 600; color: #0d9488;
}

/* SKU inline na linha da tabela */
.sku-inline {
  display: inline-block;
  font-family: 'Roboto Mono', monospace;
  font-size: 10px; color: #94a3b8;
  letter-spacing: -0.3px;
}

/* Badges de SKU no painel de detalhe */
.badge-sku {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 6px; border-radius: 5px;
  font-family: 'Roboto Mono', monospace;
  font-size: 10.5px; font-weight: 600; letter-spacing: -0.3px;
  background: #f1f5f9; color: #475569;
}
.badge-sku--variation {
  background: #f0fdf4; color: #15803d;
}
.badge-sku--id {
  background: #f8fafc; color: #94a3b8; font-weight: 400;
}

/* ── Finance summary (dialog) ──────────────────────────────── */
.finance-summary { display: flex; flex-direction: column; gap: 4px; }
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
.finance-row--note { padding: 1px 0; }
.finance-row--subtotal { padding: 6px 0; }
.finance-row--total { padding: 5px 0; }
.finance-label       { color: #64748b; display: flex; align-items: center; }
.finance-label-note  { color: #94a3b8; font-size: 11px; display: flex; align-items: center; }
.finance-label-bold  { color: #0f172a; font-weight: 700; font-size: 13px; }
.finance-val         { color: #0f172a; font-weight: 500; }
.finance-val-note    { color: #94a3b8; font-size: 11px; }
.finance-bold        { font-weight: 700; }
.finance-negative    { color: #dc2626; }
.finance-pos         { color: #16a34a; font-weight: 600; }
.finance-subtotal    { font-size: 15px; font-weight: 700; }
.finance-subtotal.pos { color: #0d9488; }
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

/* ── Price breakdown box (quadrinho de formação de preço) ───── */
.price-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
}
.price-box-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11.5px; padding: 2px 0;
}
.price-box-label { color: #78716c; }
.price-box-val   { color: #0f172a; font-weight: 500; }
.price-box-strike { text-decoration: line-through; color: #a8a29e; }
.price-box-divider { height: 1px; background: #fed7aa; margin: 5px 0; }
.price-box-total .price-box-label { color: #44403c; font-weight: 600; font-size: 12px; }
.price-box-bold  { font-size: 13px; font-weight: 700; color: #ea580c; }

/* ── Logistics box (quadrinho de frete) ─────────────────────── */
.logistics-box {
  background: #f0fdf9;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 4px;
}
.logistics-box-label {
  font-size: 10px; font-weight: 700; color: #0d9488;
  text-transform: uppercase; letter-spacing: .4px;
  margin-bottom: 5px; display: flex; align-items: center;
}
.logistics-box-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11.5px; color: #475569; padding: 2px 0;
}
.logistics-box-divider { height: 1px; background: #99f6e4; margin: 5px 0; }
.logistics-box-total { font-weight: 600; color: #0f172a; font-size: 12px; }

.tracking-card {
  display: flex; align-items: center;
  padding: 8px 12px; border-radius: 8px;
  background: #f0fdf9; border: 1px solid #99f6e4;
}

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

/* ── Tracking timeline ─────────────────────────────────────── */
.tracking-timeline { padding: 4px 0 0; }
.tracking-event {
  display: grid;
  grid-template-columns: 16px 1fr;
  grid-template-rows: auto 1fr;
  column-gap: 10px;
  position: relative;
  padding-bottom: 14px;
}
.tracking-dot {
  grid-column: 1; grid-row: 1;
  width: 10px; height: 10px;
  border-radius: 50%;
  margin-top: 3px;
  justify-self: center;
  flex-shrink: 0;
  &--active { background: #0d9488; box-shadow: 0 0 0 3px #ccfbf1; }
  &--done   { background: #cbd5e1; }
}
.tracking-line {
  grid-column: 1; grid-row: 2;
  width: 2px; background: #e2e8f0;
  justify-self: center;
  min-height: 100%;
}
.tracking-content { grid-column: 2; grid-row: 1 / 3; }
.tracking-desc {
  font-size: 12px; color: #475569; line-height: 1.4;
  &--latest { color: #0f172a; font-weight: 600; }
}
.tracking-time { font-size: 10px; color: #94a3b8; margin-top: 2px; }

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
.fadv-input:focus { border-color: #0d9488; background: #fff; }
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
