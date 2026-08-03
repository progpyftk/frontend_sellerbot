<template>
  <q-page class="orders-page">

    <!-- ── HEADER ────────────────────────────────────────── -->
    <div class="page-header">
      <div class="row items-center justify-between no-wrap">
        <div class="row items-center q-gutter-x-md">
          <div class="header-icon">
            <q-icon name="receipt_long" size="22px" />
          </div>
          <div>
            <div class="header-eyebrow">Mercado Livre</div>
            <div class="header-title">Vendas e Pedidos</div>
          </div>
          <div v-if="pagination.rowsNumber" class="header-count">
            {{ pagination.rowsNumber }} vendas
          </div>
        </div>
        <q-btn unelevated color="teal-7" icon="refresh" label="Atualizar"
          @click="refreshData" :loading="loading" size="sm" class="q-px-md" />
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- MINI DASHBOARD — HOJE                                 -->
    <!-- ══════════════════════════════════════════════════════ -->
    <div class="today-bar">
      <div class="today-bar-label">
        <q-icon name="today" size="13px" class="q-mr-xs" />Hoje
      </div>

      <template v-if="todayLoading || !todayStats">
        <div class="today-card today-card--skeleton" v-for="n in 3" :key="n" />
      </template>

      <template v-else>
        <!-- Margem após CMV do Produto -->
        <div class="today-card" :class="todayStats.lucro_apos_cmp >= 0 ? 'today-card--pos' : 'today-card--neg'">
          <div class="today-card-icon">
            <q-icon name="trending_up" size="16px" />
          </div>
          <div class="today-card-body">
            <div class="today-card-val">{{ formatCurrency(todayStats.lucro_apos_cmp) }}</div>
            <div class="today-card-label">Margem após CMV</div>
            <div class="today-card-sub" v-if="todayStats.cmp_count < todayStats.count">
              {{ todayStats.cmp_count }}/{{ todayStats.count }} vendas com custo
            </div>
          </div>
        </div>

        <!-- Qtd de vendas -->
        <div class="today-card today-card--neutral">
          <div class="today-card-icon">
            <q-icon name="receipt_long" size="16px" />
          </div>
          <div class="today-card-body">
            <div class="today-card-val">{{ todayStats.count }}</div>
            <div class="today-card-label">Vendas</div>
            <div class="today-card-sub">{{ formatCurrency(todayStats.total_amount) }} bruto</div>
          </div>
        </div>

        <!-- Lucro médio por venda -->
        <div class="today-card" :class="todayStats.avg_lucro_apos_cmp >= 0 ? 'today-card--pos' : 'today-card--neg'">
          <div class="today-card-icon">
            <q-icon name="equalizer" size="16px" />
          </div>
          <div class="today-card-body">
            <div class="today-card-val">{{ formatCurrency(todayStats.avg_lucro_apos_cmp) }}</div>
            <div class="today-card-label">Margem média / venda</div>
            <div class="today-card-sub" v-if="todayStats.cmp_count">
              base: {{ todayStats.cmp_count }} venda{{ todayStats.cmp_count !== 1 ? 's' : '' }} c/ custo
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- FILTROS                                               -->
    <!-- ══════════════════════════════════════════════════════ -->
    <div class="fb">

      <!-- ── Toolbar: Busca + Ações ─────────────────────── -->
      <div class="fb-toolbar">
        <div class="fb-search" :class="{ focused: searchFocused, filled: !!filters.search }">
          <q-icon name="search" size="18px" class="fb-search-icon" />
          <input
            v-model="filters.search"
            class="fb-search-input"
            placeholder="Buscar por título, SKU, nº pedido, comprador..."
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @keydown.enter="buscar"
          />
          <transition name="fade">
            <button v-if="filters.search" class="fb-search-clear" @click="filters.search = ''">
              <q-icon name="close" size="14px" />
            </button>
          </transition>
        </div>

        <div class="fb-toolbar-actions">

          <!-- Grupo: Ordenar + Visões -->
          <div class="fb-btn-group">
            <q-btn-dropdown flat dense no-icon-animation unelevated
              :label="currentSortLabel" icon="swap_vert"
              class="fb-tbtn" color="grey-7" size="sm">
              <q-list dense style="min-width:200px">
                <q-item v-for="opt in sortOptions" :key="opt.field + opt.desc"
                  clickable v-close-popup @click="applySort(opt)">
                  <q-item-section>{{ opt.label }}</q-item-section>
                  <q-item-section side v-if="pagination.sortBy === opt.field && pagination.descending === opt.desc">
                    <q-icon name="check" color="teal-7" size="14px" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>

            <q-btn-dropdown flat dense no-icon-animation unelevated
              icon="bolt" label="Visões"
              class="fb-tbtn" color="grey-7" size="sm">
              <q-list dense style="min-width:210px">
                <q-item-label header class="fb-menu-header">Expedição</q-item-label>
                <q-item clickable v-close-popup @click="setFilterHandling">
                  <q-item-section avatar><q-icon name="print" color="orange-7" size="16px" /></q-item-section>
                  <q-item-section>Aguardando Etiqueta</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setFilterLabelPrint">
                  <q-item-section avatar><q-icon name="label" color="deep-orange-7" size="16px" /></q-item-section>
                  <q-item-section>Imprimir Etiqueta</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setFilterReadyToShip">
                  <q-item-section avatar><q-icon name="inventory" color="teal-7" size="16px" /></q-item-section>
                  <q-item-section>Pronto para Coleta</q-item-section>
                </q-item>
                <q-separator />
                <q-item-label header class="fb-menu-header">Envio</q-item-label>
                <q-item clickable v-close-popup @click="setFilterInTransit">
                  <q-item-section avatar><q-icon name="local_shipping" color="blue-7" size="16px" /></q-item-section>
                  <q-item-section>Em Trânsito</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setFilterDelivered">
                  <q-item-section avatar><q-icon name="check_circle" color="green-7" size="16px" /></q-item-section>
                  <q-item-section>Entregues</q-item-section>
                </q-item>
                <q-separator />
                <q-item-label header class="fb-menu-header">Logística</q-item-label>
                <q-item clickable v-close-popup @click="setFilterFlex">
                  <q-item-section avatar><q-icon name="directions_bike" color="green-7" size="16px" /></q-item-section>
                  <q-item-section>Só Flex</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setFilterFull">
                  <q-item-section avatar><q-icon name="warehouse" color="orange-7" size="16px" /></q-item-section>
                  <q-item-section>Só Full</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setFilterAgencia">
                  <q-item-section avatar><q-icon name="store" color="purple-7" size="16px" /></q-item-section>
                  <q-item-section>Só Agência</q-item-section>
                </q-item>
                <q-separator />
                <q-item-label header class="fb-menu-header">Outros</q-item-label>
                <q-item clickable v-close-popup @click="setFilterCatalog">
                  <q-item-section avatar><q-icon name="auto_awesome" color="indigo-7" size="16px" /></q-item-section>
                  <q-item-section>Catálogo</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="setFilterCancelled">
                  <q-item-section avatar><q-icon name="cancel" color="red-7" size="16px" /></q-item-section>
                  <q-item-section>Cancelados</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>

          <!-- Grupo: Filtros avançados -->
          <div class="fb-btn-group">
            <button :class="['fb-tbtn', advancedFilterCount > 0 && 'fb-tbtn--active']"
              @click="showAdvanced = true">
              <q-icon name="tune" size="15px" />
              <span>Filtros</span>
              <span v-if="advancedFilterCount > 0" class="fb-adv-badge">{{ advancedFilterCount }}</span>
            </button>
          </div>

          <!-- Buscar -->
          <button class="fb-search-btn" @click="buscar">
            <q-icon name="search" size="15px" />
            <span>Buscar</span>
          </button>

          <!-- Limpar -->
          <transition name="fade">
            <button v-if="hasActiveFilters" class="fb-clear-btn" @click="clearFilters">
              <q-icon name="filter_alt_off" size="14px" />
              <span>Limpar</span>
            </button>
          </transition>

        </div>
      </div>

      <!-- ── Filtros rápidos: comboboxes ─────────────────── -->
      <div class="fb-filterbar">

        <!-- Conta -->
        <div class="fb-combo" :class="filters.account?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="storefront" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.account?.length">Conta</template>
              <template v-else-if="filters.account.length === 1">{{ accountOptions.find(a=>a.id===filters.account[0])?.nickname || 'Conta' }}</template>
              <template v-else>Conta <span class="fb-combo-multi">+{{ filters.account.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.account?.length" class="fb-combo-clear" @click.stop="filters.account = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:200px">
              <q-item v-for="acc in accountOptions" :key="acc.id" clickable
                :class="['fb-menu-item', filters.account?.includes(acc.id) && 'fb-menu-item--on']"
                @click.stop="toggleAccountFilter(acc.id)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.account?.includes(acc.id)"
                    @update:model-value="toggleAccountFilter(acc.id)"
                    @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ acc.nickname }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Status Pedido -->
        <div class="fb-combo" :class="filters.status?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="receipt" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.status?.length">Pedido</template>
              <template v-else-if="filters.status.length === 1">{{ orderStatusOptions.find(o=>o.value===filters.status[0])?.label || 'Pedido' }}</template>
              <template v-else>Pedido <span class="fb-combo-multi">+{{ filters.status.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.status?.length" class="fb-combo-clear" @click.stop="filters.status = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:190px">
              <q-item v-for="opt in orderStatusOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.status?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleStatusFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.status?.includes(opt.value)"
                    @update:model-value="toggleStatusFilter(opt.value)"
                    @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Status Envio -->
        <div class="fb-combo" :class="filters.shipment_status?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="local_shipping" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.shipment_status?.length">Envio</template>
              <template v-else-if="filters.shipment_status.length === 1">{{ shipmentStatusOptions.find(o=>o.value===filters.shipment_status[0])?.label || 'Envio' }}</template>
              <template v-else>Envio <span class="fb-combo-multi">+{{ filters.shipment_status.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.shipment_status?.length" class="fb-combo-clear" @click.stop="filters.shipment_status = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:200px">
              <q-item v-for="opt in shipmentStatusOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.shipment_status?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleShipmentFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.shipment_status?.includes(opt.value)"
                    @update:model-value="toggleShipmentFilter(opt.value)"
                    @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Logística -->
        <div class="fb-combo" :class="filters.logistic_type?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="route" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.logistic_type?.length">Logística</template>
              <template v-else-if="filters.logistic_type.length === 1">{{ logisticTypeOptions.find(o=>o.value===filters.logistic_type[0])?.label || 'Logística' }}</template>
              <template v-else>Logística <span class="fb-combo-multi">+{{ filters.logistic_type.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.logistic_type?.length" class="fb-combo-clear" @click.stop="filters.logistic_type = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:220px">
              <q-item v-for="opt in logisticTypeOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.logistic_type?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleLogisticFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.logistic_type?.includes(opt.value)"
                    @update:model-value="toggleLogisticFilter(opt.value)"
                    @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Frete -->
        <div class="fb-combo" :class="filters.cost_type?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="payments" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.cost_type?.length">Frete</template>
              <template v-else-if="filters.cost_type.length === 1">{{ costTypeOptions.find(o=>o.value===filters.cost_type[0])?.label || 'Frete' }}</template>
              <template v-else>Frete <span class="fb-combo-multi">+{{ filters.cost_type.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.cost_type?.length" class="fb-combo-clear" @click.stop="filters.cost_type = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:200px">
              <q-item v-for="opt in costTypeOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.cost_type?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleCostTypeFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.cost_type?.includes(opt.value)"
                    @update:model-value="toggleCostTypeFilter(opt.value)"
                    @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

      </div>

      <!-- ── Índice de filtros ativos ───────────────────── -->
      <transition name="fade">
        <div v-if="hasActiveFilters" class="fb-index">

          <div class="fb-index-header">
            <div class="fb-index-title">
              <q-icon name="filter_alt" size="14px" color="teal-7" />
              <span>Filtrando</span>
              <span class="fb-index-count">{{ advancedFilterCount + (filters.search ? 1 : 0) + (filters.account?.length ? 1 : 0) + (filters.status?.length ? 1 : 0) + (filters.shipment_status?.length ? 1 : 0) + (filters.logistic_type?.length ? 1 : 0) + (filters.cost_type?.length ? 1 : 0) }} grupos</span>
            </div>
            <button class="fb-index-clear" @click="clearFilters">
              <q-icon name="close" size="11px" />Limpar tudo
            </button>
          </div>

          <div class="fb-index-rows">

            <div v-if="filters.search" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="search" size="12px" />Busca</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.search = ''">"{{ filters.search }}" <q-icon name="close" size="9px" /></span>
              </div>
            </div>

            <div v-if="filters.account?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="storefront" size="12px" />Conta</div>
              <div class="fb-index-pills">
                <span v-for="id in filters.account" :key="id" class="fb-index-pill"
                  @click="toggleAccountFilter(id)">
                  {{ accountOptions.find(a=>a.id===id)?.nickname || id }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.status?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="receipt" size="12px" />Pedido</div>
              <div class="fb-index-pills">
                <span v-for="s in filters.status" :key="s" class="fb-index-pill"
                  @click="toggleStatusFilter(s)">
                  {{ orderStatusOptions.find(o=>o.value===s)?.label || s }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.shipment_status?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="local_shipping" size="12px" />Envio</div>
              <div class="fb-index-pills">
                <span v-for="s in filters.shipment_status" :key="s" class="fb-index-pill"
                  @click="toggleShipmentFilter(s)">
                  {{ shipmentStatusOptions.find(o=>o.value===s)?.label || s }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.logistic_type?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="route" size="12px" />Logística</div>
              <div class="fb-index-pills">
                <span v-for="l in filters.logistic_type" :key="l" class="fb-index-pill"
                  @click="toggleLogisticFilter(l)">
                  {{ logisticTypeOptions.find(o=>o.value===l)?.label || l }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.cost_type?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="payments" size="12px" />Frete</div>
              <div class="fb-index-pills">
                <span v-for="c in filters.cost_type" :key="c" class="fb-index-pill"
                  @click="toggleCostTypeFilter(c)">
                  {{ costTypeOptions.find(o=>o.value===c)?.label || c }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.dateFrom || filters.dateTo" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="calendar_month" size="12px" />Período</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.dateFrom = null; filters.dateTo = null">
                  {{ filters.dateFrom ? filters.dateFrom.replace('T', ' ') : '...' }} → {{ filters.dateTo ? filters.dateTo.replace('T', ' ') : '...' }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.priceMin || filters.priceMax" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="attach_money" size="12px" />Venda</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.priceMin = null; filters.priceMax = null">
                  R${{ filters.priceMin ?? '0' }} → R${{ filters.priceMax ?? '∞' }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.marginMin != null || filters.marginMax != null" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="trending_up" size="12px" />Margem</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill fb-index-pill--teal"
                  @click="filters.marginMin = null; filters.marginMax = null">
                  R${{ filters.marginMin ?? '...' }} → R${{ filters.marginMax ?? '∞' }}
                  <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.is_catalog != null" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="auto_awesome" size="12px" />Catálogo</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.is_catalog = null">
                  {{ filters.is_catalog ? 'Sim' : 'Não' }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

            <div v-if="filters.fulfilled != null" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="check_circle" size="12px" />Entregue</div>
              <div class="fb-index-pills">
                <span class="fb-index-pill" @click="filters.fulfilled = null">
                  {{ filters.fulfilled ? 'Sim' : 'Não' }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>

          </div>
        </div>
      </transition>

    </div>

    <!-- ── KPIs DO PERÍODO FILTRADO (feedback #8) ─────────── -->
    <div v-if="periodKpis" class="period-kpis">
      <div class="pk-item">
        <div class="pk-label" title="Valor bruto vendido no período filtrado (pedidos pagos), antes de taxas, frete e custos.">GMV</div>
        <div class="pk-val">{{ formatCurrency(periodKpis.gmv) }}</div>
      </div>
      <div class="pk-item">
        <div class="pk-label">Pedidos</div>
        <div class="pk-val">{{ periodKpis.orders_count }}</div>
      </div>
      <div class="pk-item">
        <div class="pk-label">Unidades</div>
        <div class="pk-val">{{ periodKpis.units_sold }}</div>
      </div>
      <div class="pk-item">
        <div class="pk-label" title="GMV dividido pelo número de pedidos.">Ticket médio</div>
        <div class="pk-val">{{ formatCurrency(periodKpis.avg_ticket) }}</div>
      </div>
      <div class="pk-item" :class="periodKpis.canceled_pct > 5 ? 'pk-item--warn' : ''">
        <div class="pk-label">Cancelamentos</div>
        <div class="pk-val">{{ periodKpis.canceled_count }} <span class="pk-sub">({{ periodKpis.canceled_pct }}%)</span></div>
      </div>
      <div class="pk-note">KPIs seguem os filtros ativos da tabela</div>
    </div>

    <!-- ── TABELA ─────────────────────────────────────────── -->
    <div class="table-wrapper table-responsive">
      <q-table :rows="filteredOrders" :columns="displayColumns" row-key="order_id" flat :loading="loading"
        v-model:pagination="pagination" @request="onRequest" binary-state-sort
        class="orders-table" no-data-label="Nenhuma venda encontrada."
        :dense="$q.screen.lt.md"
        :rows-per-page-options="[20, 50, 100]">

        <template #header="props">
          <q-tr :props="props" class="orders-thead">
            <q-th v-if="isCompact" auto-width class="sb-expand-toggle-th" />
            <q-th v-for="col in props.cols" :key="col.name" :props="props"
              :class="col.align === 'right' ? 'text-right' : 'text-left'">
              {{ col.label }}
            </q-th>
          </q-tr>
        </template>

        <template #body="props">
          <q-tr :props="props" class="order-row"
            @click="isCompact ? toggleExpand(props.row.order_id) : openFinancial(props.row)">

            <!-- Toggle de expandir (só mobile <600px) ─── -->
            <q-td v-if="isCompact" auto-width class="sb-expand-toggle-td" @click.stop="toggleExpand(props.row.order_id)">
              <q-icon :name="isExpanded(props.row.order_id) ? 'expand_less' : 'expand_more'" size="20px" color="grey-6" />
            </q-td>

            <!-- ① Produto ─────────────────────────────── -->
            <q-td key="produto" :props="props">
              <div class="cell-produto">
                <div class="produto-main">

                  <!-- Thumbnail: igual para pack e single; badge +N indica itens extras -->
                  <div class="thumb-wrap">
                    <img v-if="props.row.items?.[0]?.thumbnail" :src="props.row.items[0].thumbnail" class="thumb-img" />
                    <div v-else class="thumb-placeholder"><q-icon name="image" size="18px" color="grey-4" /></div>
                    <div v-if="(props.row.items || []).length > 1" class="thumb-count">
                      +{{ props.row.items.length - 1 }}
                    </div>
                  </div>

                  <div class="produto-info">
                    <!-- PACK: lista resumida de itens -->
                    <template v-if="props.row._isPack">
                      <div class="pack-items-list">
                        <div v-for="item in (props.row.items || [])" :key="item.item_id_ml + (item.variation_id||'')" class="pack-item-line">
                          <span class="pack-item-qty">{{ item.quantity }}×</span>
                          <span class="pack-item-title">{{ item.title }}</span>
                          <span v-if="item.seller_sku" class="pack-item-sku">{{ item.seller_sku }}</span>
                        </div>
                      </div>
                    </template>

                    <!-- SINGLE: título + ids -->
                    <template v-else>
                      <div class="produto-title">{{ props.row.items?.[0]?.title || '—' }}</div>
                      <div class="produto-ids">
                        <span class="id-chip"><q-icon name="sell" size="9px" />{{ props.row.items?.[0]?.item_id_ml || '—' }}</span>
                        <span v-if="props.row.items?.[0]?.seller_sku" class="id-chip sku">SKU {{ props.row.items[0].seller_sku }}</span>
                      </div>
                    </template>

                    <div class="produto-meta">
                      <span class="account-chip"><q-icon name="storefront" size="9px" />{{ props.row.account?.account_nickname || '—' }}</span>
                      <span v-if="props.row._isPack" class="ctx-badge pack-badge"><q-icon name="inventory_2" size="8px" />PACK · {{ (props.row.items||[]).length }} itens</span>
                      <span v-else-if="props.row.pack_id" class="ctx-badge pack-badge"><q-icon name="inventory_2" size="8px" />PACK</span>
                      <span v-if="props.row.is_catalog" class="ctx-badge catalog-badge"><q-icon name="auto_awesome" size="8px" />Catálogo</span>
                    </div>
                  </div>
                </div>
                <div class="pedido-sub">
                  <template v-if="props.row._isPack">
                    <span class="pedido-id" @click.stop="copyText(props.row.pack_id)">
                      pack #{{ props.row.pack_id }}<q-icon name="content_copy" size="9px" class="copy-icon" />
                    </span>
                    <span class="pack-sub-orders">
                      {{ props.row._packOrders.map(o => '#' + o.order_id).join(' · ') }}
                    </span>
                  </template>
                  <span v-else class="pedido-id" @click.stop="copyText(props.row.order_id)">
                    #{{ props.row.order_id }}<q-icon name="content_copy" size="9px" class="copy-icon" />
                  </span>
                </div>
              </div>
            </q-td>

            <!-- ①b Unidades (ordenável server-side, feedback #14) ─── -->
            <q-td key="unidades" :props="props" align="center">
              <span class="units-badge">{{ rowUnits(props.row) }}</span>
            </q-td>

            <!-- ② Data ──────────────────────────────── -->
            <q-td key="data_venda" :props="props">
              <div class="cell-data">
                <div class="data-day">{{ formatDay(props.row.date_created) }}</div>
                <div class="data-time">{{ formatTime(props.row.date_created) }}</div>
                <div class="data-ago">{{ formatAgo(props.row.date_created) }}</div>
              </div>
            </q-td>

            <!-- ③ Comprador ──────────────────────────── -->
            <q-td key="comprador" :props="props">
              <div class="cell-comprador">
                <div class="buyer-name">{{ props.row.buyer_nickname || '—' }}</div>
                <div v-if="props.row.shipment?.destination_city" class="buyer-loc">
                  <q-icon name="place" size="10px" />
                  {{ props.row.shipment.destination_city }}/{{ props.row.shipment.destination_state }}
                </div>
              </div>
            </q-td>

            <!-- ④ Status Venda ───────────────────────── -->
            <q-td key="status_venda" :props="props">
              <span :class="['s-pill', getOrderStatusClass(props.row.status)]">
                <q-icon :name="getOrderStatusIcon(props.row.status)" size="10px" />
                {{ getOrderStatusLabel(props.row.status) }}
              </span>
            </q-td>

            <!-- ⑤ Logística ──────────────────────────── -->
            <q-td v-if="!isCompact" key="logistica" :props="props" @click.stop="openLogistics(props.row)">
              <div class="cell-logistica" v-if="props.row.shipment">

                <!-- Badge tipo logístico -->
                <div :class="['logistic-badge', getLogisticClass(props.row.shipment.logistic_type)]">
                  <q-icon :name="getLogisticIcon(props.row.shipment.logistic_type)" size="11px" />
                  {{ LOGISTIC_META[props.row.shipment.logistic_type]?.label || props.row.shipment.logistic_type }}
                </div>

                <!-- FULL: stepper simplificado (seller não gerencia etiqueta) -->
                <template v-if="props.row.shipment.logistic_type === 'fulfillment'">
                  <div class="mini-stepper">
                    <div v-for="(step, i) in STEPS_FULL" :key="i"
                      :class="['mini-dot', getMiniStepClassFull(props.row.shipment.status, i)]">
                      <q-tooltip>{{ step.label }}</q-tooltip>
                    </div>
                    <span class="mini-label">{{ getShipmentStatusLabelFull(props.row.shipment.status) }}</span>
                  </div>
                </template>

                <!-- SELLER: status + alerta de ação necessária -->
                <template v-else>
                  <div class="mini-stepper">
                    <div v-for="(step, i) in STEPS_SELLER" :key="i"
                      :class="['mini-dot', getMiniStepClassSeller(getEffectiveShipStatus(props.row.shipment), i)]">
                      <q-tooltip>{{ step.label }}</q-tooltip>
                    </div>
                    <span class="mini-label">{{ getShipmentStatusLabel(getEffectiveShipStatus(props.row.shipment)) }}</span>
                  </div>
                  <!-- Alerta de ação quando o seller precisa agir -->
                  <div v-if="needsSellerAction(getEffectiveShipStatus(props.row.shipment))"
                    class="action-alert">
                    <q-icon name="warning_amber" size="10px" />
                    {{ getSellerActionLabel(getEffectiveShipStatus(props.row.shipment)) }}
                  </div>
                </template>

                <!-- Hint de clique -->
                <div class="logistic-hint">
                  <q-icon name="open_in_new" size="9px" /> Ver detalhes
                </div>

              </div>
              <span v-else class="text-caption text-grey-5">S/ envio</span>
            </q-td>

            <!-- ⑥ Bruto ──────────────────────────────── -->
            <q-td key="venda" :props="props" align="right">
              <div class="cell-amount">
                <div class="amount-main">{{ formatCurrency(getBrutoAmount(props.row)) }}</div>
                <div v-if="props.row.shipment?.logistic_type === 'self_service'" class="flex-credit-hint">
                  <q-icon name="directions_bike" size="9px" /> Flex
                </div>
                <div v-else-if="(props.row.items || []).length" class="amount-sub">
                  {{ props.row.items.length }} item{{ props.row.items.length > 1 ? 's' : '' }}
                  · {{ props.row.items[0]?.quantity }}×
                </div>
                <div v-if="isCompact" class="mobile-financial-summary"
                  :class="props.row.lucro_apos_cmp == null
                    ? 'mobile-financial-summary--muted'
                    : props.row.lucro_apos_cmp >= 0
                      ? 'mobile-financial-summary--positive'
                      : 'mobile-financial-summary--negative'">
                  <span>Após CMV</span>
                  <strong v-if="props.row.lucro_apos_cmp != null">{{ formatCurrency(props.row.lucro_apos_cmp) }}</strong>
                  <strong v-else>S/ Custo</strong>
                </div>
                <div v-if="(props.row.coupon_amount || 0) > 0" class="coupon-chip">
                  <q-icon name="local_offer" size="9px" />-{{ formatCurrency(props.row.coupon_amount) }}
                </div>
              </div>
            </q-td>

            <!-- ⑦ Tarifa ML ──────────────────────────── -->
            <q-td v-if="!isCompact" key="tarifa" :props="props" align="right">
              <div class="cell-fee">
                <div class="fee-main">-{{ formatCurrency(getOrderFeeBreakdown(props.row).totalSaleFee) }}</div>
                <div class="fee-pct">{{ getOrderFeeBreakdown(props.row).effectivePct.toFixed(1) }}% efetivo</div>
                <div class="fee-type">{{ LISTING_TYPE_LABELS[props.row.items?.[0]?.listing_type_id] || '—' }}</div>
                <template v-if="getOrderFeeBreakdown(props.row).anyTaxaFixa">
                  <div class="fee-breakdown-row">
                    <span class="fee-breakdown-label">Comissão</span>
                    <span class="fee-breakdown-val">-{{ formatCurrency(getOrderFeeBreakdown(props.row).totalCommission) }}</span>
                  </div>
                  <div class="fee-breakdown-row taxa-row">
                    <span class="fee-breakdown-label">
                      <q-icon name="info_outline" size="9px" />Taxa fixa
                      <q-tooltip class="bg-grey-9" style="max-width:220px">
                        ML cobra taxa fixa em certas categorias quando o preço unitário é abaixo de R${{ TAXA_FIXA_THRESHOLD }}.
                        Valor confirmado pelo sale_fee da API.
                      </q-tooltip>
                    </span>
                    <span class="fee-breakdown-val taxa-val">-{{ formatCurrency(getOrderFeeBreakdown(props.row).totalTaxaFixa) }}</span>
                  </div>
                </template>
              </div>
            </q-td>

            <!-- ⑧ Frete ──────────────────────────────── -->
            <q-td v-if="!isCompact" key="frete" :props="props" align="right">
              <div class="cell-frete">
                <!-- Flex: seller entrega por conta própria -->
                <template v-if="props.row.shipment?.logistic_type === 'self_service'">
                  <div v-if="getSellerShippingCost(props.row) > 0" class="frete-main">
                    -{{ formatCurrency(getSellerShippingCost(props.row)) }}
                  </div>
                  <div v-else class="frete-gratis"><q-icon name="check_circle" size="12px" />S/ custo</div>
                  <div class="frete-sub flex-badge">
                    <q-icon name="directions_bike" size="9px" />Flex
                  </div>
                  <div class="flex-repasse-hint">
                    +{{ formatCurrency(getFlexCredit(props.row)) }} repasse
                  </div>
                </template>
                <!-- ML Envios normal -->
                <template v-else-if="getSellerShippingCost(props.row) > 0">
                  <div class="frete-main">-{{ formatCurrency(getSellerShippingCost(props.row)) }}</div>
                  <div class="frete-sub">
                    <span v-if="props.row.shipment?.cost_type === 'free'" class="frete-type free-flag">
                      <q-icon name="local_shipping" size="9px" />grátis p/ buyer
                    </span>
                    <span v-else-if="props.row.shipment?.cost_type === 'partially_free'" class="frete-type partial-flag">
                      <q-icon name="percent" size="9px" />subsidiado
                    </span>
                  </div>
                  <div v-if="props.row.shipment?.list_cost" class="frete-audit">
                    ML: {{ formatCurrency(props.row.shipment.list_cost) }}
                  </div>
                </template>
                <template v-else>
                  <div class="frete-gratis"><q-icon name="check_circle" size="12px" />Grátis</div>
                  <div class="frete-sub">comprador paga</div>
                </template>
              </div>
            </q-td>

            <!-- ⑨ Líquido ────────────────────────────── -->
            <q-td v-if="!isCompact" key="liquido" :props="props" align="right">
              <div class="cell-liquido">
                <div :class="['liquido-main', getNetMargin(props.row) >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(getNetMargin(props.row)) }}
                </div>
                <div :class="['margin-pill', getNetMargin(props.row) >= 0 ? 'margin-pos' : 'margin-neg']">
                  {{ calculateMarginPct(props.row) }}% margem
                </div>
                <div class="liquido-hint">antes do Custo Médio</div>
              </div>
            </q-td>

            <!-- ⑩ Lucro (c/ Custo Médio do Produto) ──── -->
            <q-td v-if="!isCompact" key="lucro" :props="props" align="right">
              <div class="cell-liquido" v-if="props.row.lucro_apos_cmp != null">
                <div :class="['liquido-main', props.row.lucro_apos_cmp >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(props.row.lucro_apos_cmp) }}
                </div>
                <div :class="['margin-pill', props.row.lucro_apos_cmp >= 0 ? 'margin-pos' : 'margin-neg']">
                  {{ calcLucroPct(props.row) }}% margem
                </div>
                <div class="liquido-hint">
                  Custo: {{ formatCurrency(getCustoMedioProduto(props.row)) }}
                </div>
              </div>
              <div v-else class="text-caption text-grey-5">S/ Custo</div>
            </q-td>

          </q-tr>

          <!-- Painel de expandir inline (mobile <600px): logística, taxas, frete, líquido e lucro -->
          <q-tr v-if="isCompact" v-show="isExpanded(props.row.order_id)" class="sb-expand-row" :props="props">
            <q-td colspan="100%">
              <div class="sb-expand-panel">

                <div class="sb-expand-field" @click="openLogistics(props.row)">
                  <span class="sb-expand-label">Logística</span>
                  <div class="cell-logistica" v-if="props.row.shipment">
                    <div :class="['logistic-badge', getLogisticClass(props.row.shipment.logistic_type)]">
                      <q-icon :name="getLogisticIcon(props.row.shipment.logistic_type)" size="11px" />
                      {{ LOGISTIC_META[props.row.shipment.logistic_type]?.label || props.row.shipment.logistic_type }}
                    </div>
                    <template v-if="props.row.shipment.logistic_type === 'fulfillment'">
                      <span class="mini-label">{{ getShipmentStatusLabelFull(props.row.shipment.status) }}</span>
                    </template>
                    <template v-else>
                      <span class="mini-label">{{ getShipmentStatusLabel(getEffectiveShipStatus(props.row.shipment)) }}</span>
                      <div v-if="needsSellerAction(getEffectiveShipStatus(props.row.shipment))" class="action-alert">
                        <q-icon name="warning_amber" size="10px" />
                        {{ getSellerActionLabel(getEffectiveShipStatus(props.row.shipment)) }}
                      </div>
                    </template>
                  </div>
                  <span v-else class="text-caption text-grey-5">S/ envio</span>
                </div>

                <div class="sb-expand-field">
                  <span class="sb-expand-label">Taxas ML</span>
                  <div class="cell-fee">
                    <div class="fee-main">-{{ formatCurrency(getOrderFeeBreakdown(props.row).totalSaleFee) }}</div>
                    <div class="fee-pct">{{ getOrderFeeBreakdown(props.row).effectivePct.toFixed(1) }}% efetivo</div>
                    <div class="fee-type">{{ LISTING_TYPE_LABELS[props.row.items?.[0]?.listing_type_id] || '—' }}</div>
                  </div>
                </div>

                <div class="sb-expand-field">
                  <span class="sb-expand-label">Frete</span>
                  <div class="cell-frete">
                    <template v-if="props.row.shipment?.logistic_type === 'self_service'">
                      <div v-if="getSellerShippingCost(props.row) > 0" class="frete-main">
                        -{{ formatCurrency(getSellerShippingCost(props.row)) }}
                      </div>
                      <div v-else class="frete-gratis"><q-icon name="check_circle" size="12px" />S/ custo</div>
                      <div class="flex-repasse-hint">+{{ formatCurrency(getFlexCredit(props.row)) }} repasse</div>
                    </template>
                    <template v-else-if="getSellerShippingCost(props.row) > 0">
                      <div class="frete-main">-{{ formatCurrency(getSellerShippingCost(props.row)) }}</div>
                    </template>
                    <template v-else>
                      <div class="frete-gratis"><q-icon name="check_circle" size="12px" />Grátis</div>
                    </template>
                  </div>
                </div>

                <div class="sb-expand-field">
                  <span class="sb-expand-label">Receita Líquida</span>
                  <div class="cell-liquido">
                    <div :class="['liquido-main', getNetMargin(props.row) >= 0 ? 'pos' : 'neg']">
                      {{ formatCurrency(getNetMargin(props.row)) }}
                    </div>
                    <div :class="['margin-pill', getNetMargin(props.row) >= 0 ? 'margin-pos' : 'margin-neg']">
                      {{ calculateMarginPct(props.row) }}% margem
                    </div>
                  </div>
                </div>

                <div class="sb-expand-field">
                  <span class="sb-expand-label">Margem após CMV</span>
                  <div class="cell-liquido" v-if="props.row.lucro_apos_cmp != null">
                    <div :class="['liquido-main', props.row.lucro_apos_cmp >= 0 ? 'pos' : 'neg']">
                      {{ formatCurrency(props.row.lucro_apos_cmp) }}
                    </div>
                    <div :class="['margin-pill', props.row.lucro_apos_cmp >= 0 ? 'margin-pos' : 'margin-neg']">
                      {{ calcLucroPct(props.row) }}% margem
                    </div>
                  </div>
                  <div v-else class="text-caption text-grey-5">S/ Custo</div>
                </div>

                <div class="row justify-end">
                  <q-btn flat dense no-caps size="sm" color="indigo-7" label="Ver detalhamento completo"
                    icon="open_in_new" @click.stop="openFinancial(props.row)" />
                </div>

              </div>
            </q-td>
          </q-tr>
        </template>

        <template #loading><q-inner-loading showing color="teal-7" /></template>
      </q-table>
    </div>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- DIALOG: FINANCEIRO                                 -->
    <!-- ══════════════════════════════════════════════════ -->
    <q-dialog v-model="financialOpen" position="right" full-height :maximized="$q.screen.lt.md"
      transition-show="slide-left" transition-hide="slide-right">
      <div v-if="!selectedOrder" class="detail-panel detail-panel--loading">
        <q-spinner-dots color="teal" size="2.5em" />
      </div>
      <div class="detail-panel" v-if="selectedOrder">
        <div class="detail-header">
          <div class="row items-start justify-between no-wrap">
            <div>
              <div class="dialog-eyebrow"><q-icon name="account_balance_wallet" size="13px" class="q-mr-xs" />Resumo Financeiro</div>
              <div class="detail-order-id">
                <template v-if="selectedOrder._isPack">
                  <q-icon name="inventory_2" size="14px" class="q-mr-xs" style="color:#6366f1" />pack #{{ selectedOrder.pack_id }}
                </template>
                <template v-else>#{{ selectedOrder.order_id }}</template>
              </div>
              <div class="detail-meta">{{ formatDateFull(selectedOrder.date_created) }} · {{ selectedOrder.account?.account_nickname }}</div>
              <div class="row items-center q-gutter-x-xs q-mt-sm">
                <span :class="['s-pill', getOrderStatusClass(selectedOrder.status)]">
                  <q-icon :name="getOrderStatusIcon(selectedOrder.status)" size="10px" />
                  {{ getOrderStatusLabel(selectedOrder.status) }}
                </span>
                <span v-if="selectedOrder._isPack" class="ctx-badge pack-badge">
                  <q-icon name="inventory_2" size="8px" />PACK · {{ (selectedOrder.items||[]).length }} itens
                </span>
                <span v-if="selectedOrder.is_catalog" class="ctx-badge catalog-badge"><q-icon name="auto_awesome" size="9px" />Catálogo</span>
              </div>
            </div>
            <div class="row q-gutter-x-xs">
              <q-btn flat round dense icon="local_shipping" color="teal-7" size="sm"
                @click="financialOpen = false; openLogistics(selectedOrder)"
                :disable="!selectedOrder.shipment">
                <q-tooltip>Ver Logística</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="open_in_new" color="grey-6" size="sm"
                type="a" :href="`https://vendas.mercadolivre.com.br/vendas/${selectedOrder.order_id}/detalhe`" target="_blank">
                <q-tooltip>Abrir no ML</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="close" color="grey-6" size="sm" v-close-popup />
            </div>
          </div>
        </div>

        <q-scroll-area style="height: calc(100vh - 150px);">
          <div class="detail-body">

            <!-- Itens -->
            <div class="detail-section">
              <div class="section-title"><q-icon name="shopping_cart" size="14px" class="q-mr-xs" />Itens do Pedido</div>
              <div v-if="detailLoading" class="text-center q-pa-lg"><q-spinner-dots color="teal" size="2em" /></div>
              <div v-else class="items-table">
                <div class="items-thead">
                  <span style="flex:1">Produto</span>
                  <span style="width:36px;text-align:center">Qtd</span>
                  <span style="width:76px;text-align:right">Unit.</span>
                  <span style="width:56px;text-align:right">Tipo</span>
                  <span style="width:80px;text-align:right">Tarifa ML</span>
                </div>
                <div v-for="item in selectedOrder.items" :key="item.item_id_ml + (item.variation_id || '')" class="items-row">
                  <div class="item-thumb-sm">
                    <img v-if="item.thumbnail" :src="item.thumbnail" />
                    <q-icon v-else name="image" size="14px" color="grey-4" />
                  </div>
                  <div style="flex:1;min-width:0">
                    <div class="item-title-d">{{ item.title }}</div>
                    <div class="item-meta-d">SKU: {{ item.seller_sku || 'S/N' }} · {{ item.item_id_ml }}</div>
                  </div>
                  <span style="width:36px;text-align:center;font-weight:600;color:#718096">{{ item.quantity }}×</span>
                  <span style="width:76px;text-align:right;font-size:12px">{{ formatCurrency(item.unit_price) }}</span>
                  <span style="width:56px;text-align:right;font-size:11px;color:#9aa0ac">{{ LISTING_TYPE_LABELS[item.listing_type_id] || '—' }}</span>
                  <div style="width:80px;text-align:right">
                    <div class="fee-d">
                      {{ formatCurrency(decomposeItemFee(item).totalFee) }}
                    </div>
                    <div class="fee-d-sub">{{ decomposeItemFee(item).effectivePct.toFixed(1) }}%{{ decomposeItemFee(item).hasTaxaFixa ? ' +fx' : '' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Recibo Financeiro -->
            <div class="detail-section">
              <div class="section-title"><q-icon name="receipt" size="14px" class="q-mr-xs" />Apuração</div>
              <div class="receipt">
                <!-- Flex: venda e repasse mostrados separadamente para clareza -->
                <template v-if="selectedOrder.shipment?.logistic_type === 'self_service'">
                  <div class="receipt-row">
                    <span class="receipt-label">(+) Venda produto</span>
                    <span class="receipt-value pos-t">+{{ formatCurrency(selectedOrder.total_amount) }}</span>
                  </div>
                  <div class="receipt-row sub-row">
                    <div class="receipt-label-g">
                      <span class="receipt-label">(+) Repasse Flex ML</span>
                      <span class="receipt-sub" style="color:#0d9488">
                        <q-icon name="directions_bike" size="10px" /> Frete pago pelo comprador — ML repassa ao seller
                      </span>
                    </div>
                    <span class="receipt-value pos-t">+{{ formatCurrency(getFlexCredit(selectedOrder)) }}</span>
                  </div>
                </template>
                <!-- Não-Flex: linha única de venda bruta -->
                <template v-else>
                  <div class="receipt-row">
                    <span class="receipt-label">(+) Venda Bruta</span>
                    <span class="receipt-value pos-t">+{{ formatCurrency(selectedOrder.total_amount) }}</span>
                  </div>
                </template>
                <div v-if="(selectedOrder.coupon_amount || 0) > 0" class="receipt-row sub-row">
                  <span class="receipt-label">Cupom</span>
                  <span class="receipt-value ded-t">-{{ formatCurrency(selectedOrder.coupon_amount) }}</span>
                </div>
                <div class="receipt-sep" />
                <div v-for="item in (selectedOrder.items || [])" :key="'rf-' + item.item_id_ml + (item.variation_id || '')" class="receipt-row sub-row">
                  <div class="receipt-label-g">
                    <span class="receipt-label">(-) Tarifa ML · {{ LISTING_TYPE_LABELS[item.listing_type_id] || item.listing_type_id }}</span>
                    <span class="receipt-sub">
                      {{ decomposeItemFee(item).effectivePct.toFixed(1) }}% efetivo
                      <template v-if="decomposeItemFee(item).hasTaxaFixa">
                        ({{ formatCurrency(decomposeItemFee(item).commission) }} comissão + {{ formatCurrency(decomposeItemFee(item).taxaFixa) }} tx fixa)
                      </template>
                    </span>
                  </div>
                  <span class="receipt-value ded-t">-{{ formatCurrency(decomposeItemFee(item).totalFee) }}</span>
                </div>
                <div class="receipt-sep" />
                <div class="receipt-row sub-row">
                  <div class="receipt-label-g">
                    <span class="receipt-label">(-) Frete (ML Envios)</span>

                    <!-- Flex: seller contrata entrega por conta própria -->
                    <template v-if="selectedOrder.shipment?.logistic_type === 'self_service'">
                      <span class="receipt-sub" style="color:#f59e0b">
                        <q-icon name="directions_bike" size="10px" /> Entrega Flex — seller paga transportadora
                      </span>
                      <div class="freight-audit">
                        <div class="audit-row hl">
                          <span>Estimativa entrega própria</span>
                          <strong>{{ formatCurrency(getFlexDeliveryCost(selectedOrder)) }}</strong>
                        </div>
                      </div>
                    </template>

                    <!-- Outros: exibe descrição baseada no cost_type -->
                    <template v-else>
                      <span class="receipt-sub" v-if="selectedOrder.shipment?.cost_type">
                        <template v-if="selectedOrder.shipment.cost_type === 'free'">Frete grátis p/ comprador — seller arca com o custo</template>
                        <template v-else-if="selectedOrder.shipment.cost_type === 'partially_free'">Frete subsidiado — comprador pagou {{ formatCurrency(selectedOrder.shipment.shipping_cost) }}</template>
                        <template v-else-if="selectedOrder.shipment.cost_type === 'charged'">Frete por conta do comprador</template>
                      </span>
                      <div v-if="getSellerShippingCost(selectedOrder) > 0 || selectedOrder.shipment?.list_cost" class="freight-audit">
                        <div v-if="selectedOrder.shipment?.list_cost" class="audit-row"><span>Tabela ML</span><strong>{{ formatCurrency(selectedOrder.shipment.list_cost) }}</strong></div>
                        <div v-if="(selectedOrder.shipment?.shipping_cost || 0) > 0" class="audit-row"><span>Comprador pagou</span><strong class="pos-t">{{ formatCurrency(selectedOrder.shipment.shipping_cost) }}</strong></div>
                        <div class="audit-row hl"><span>Seller paga</span><strong>{{ formatCurrency(getSellerShippingCost(selectedOrder)) }}</strong></div>
                      </div>
                    </template>
                  </div>
                  <span v-if="selectedOrder.shipment?.logistic_type === 'self_service'" class="receipt-value ded-t">
                    -{{ formatCurrency(getFlexDeliveryCost(selectedOrder)) }}
                  </span>
                  <span v-else class="receipt-value" :class="getSellerShippingCost(selectedOrder) > 0 ? 'ded-t' : 'free-t'">
                    {{ getSellerShippingCost(selectedOrder) > 0 ? '-' + formatCurrency(getSellerShippingCost(selectedOrder)) : 'Grátis' }}
                  </span>
                </div>
                <div class="receipt-sep thick" />
                <div class="receipt-row total-row">
                  <span class="receipt-label-bold">(=) Líquido (s/ Custo Médio)</span>
                  <div class="receipt-val-g">
                    <span :class="['receipt-total', getNetMargin(selectedOrder) >= 0 ? 'pos-t' : 'neg-t']">
                      {{ formatCurrency(getNetMargin(selectedOrder)) }}
                    </span>
                    <span :class="['margin-pill', getNetMargin(selectedOrder) >= 0 ? 'margin-pos' : 'margin-neg']">
                      {{ calculateMarginPct(selectedOrder) }}% margem
                    </span>
                  </div>
                </div>
                <template v-if="selectedOrder.lucro_apos_cmp != null">
                  <!-- Custo Médio por item (quando há cmp_unit_cost gravado no snapshot) -->
                  <template v-for="item in (selectedOrder.items || [])" :key="'cmp-' + item.item_id_ml + (item.variation_id || '')">
                    <div v-if="item.cmp_unit_cost != null" class="receipt-row sub-row">
                      <div class="receipt-label-g">
                        <span class="receipt-label">(-) Custo Médio · {{ item.seller_sku || item.item_id_ml }}</span>
                        <span class="receipt-sub">
                          {{ formatCurrency(item.cmp_unit_cost) }}/un × {{ item.quantity }}
                          <template v-if="(selectedOrder.items||[]).filter(i => i.cmp_unit_cost != null).length > 1">
                            · {{ item.title?.substring(0, 30) }}{{ item.title?.length > 30 ? '…' : '' }}
                          </template>
                        </span>
                      </div>
                      <span class="receipt-value ded-t">-{{ formatCurrency(Number(item.cmp_unit_cost) * Number(item.quantity || 1)) }}</span>
                    </div>
                  </template>
                  <!-- Total Custo Médio do Produto -->
                  <div class="receipt-row sub-row" :class="(selectedOrder.items||[]).filter(i => i.cmp_unit_cost != null).length > 1 ? 'cmv-total-row' : ''">
                    <div class="receipt-label-g">
                      <span class="receipt-label">(-) Custo Médio do Produto</span>
                      <span class="receipt-sub">
                        Custo médio do Tiny ERP · snapshot na data da venda
                        <template v-if="selectedOrder.custo_medio_produto == null">
                          <span style="color:#f59e0b"> · derivado</span>
                        </template>
                      </span>
                    </div>
                    <span class="receipt-value ded-t">-{{ formatCurrency(getCustoMedioProduto(selectedOrder)) }}</span>
                  </div>
                  <div class="receipt-sep thick" />
                  <div class="receipt-row total-row">
                    <span class="receipt-label-bold">(=) LUCRO REAL</span>
                    <div class="receipt-val-g">
                      <span :class="['receipt-total', selectedOrder.lucro_apos_cmp >= 0 ? 'pos-t' : 'neg-t']">
                        {{ formatCurrency(selectedOrder.lucro_apos_cmp) }}
                      </span>
                      <span :class="['margin-pill', selectedOrder.lucro_apos_cmp >= 0 ? 'margin-pos' : 'margin-neg']">
                        {{ calcLucroPct(selectedOrder) }}% margem
                      </span>
                    </div>
                  </div>
                </template>
                <template v-if="getPaymentMethodLabel(selectedOrder)">
                  <div class="receipt-sep" />
                  <div class="receipt-row">
                    <span class="receipt-label"><q-icon name="credit_card" size="13px" class="q-mr-xs" />Pagamento</span>
                    <span class="receipt-value" style="color:#4a5568">{{ getPaymentMethodLabel(selectedOrder) }}</span>
                  </div>
                </template>
              </div>
            </div>

          </div>
        </q-scroll-area>
      </div>
    </q-dialog>

    <!-- ══════════════════════════════════════════════════ -->
    <!-- DIALOG: LOGÍSTICA                                  -->
    <!-- ══════════════════════════════════════════════════ -->
    <q-dialog v-model="logisticsOpen" position="right" full-height :maximized="$q.screen.lt.md"
      transition-show="slide-left" transition-hide="slide-right">
      <div class="detail-panel" v-if="logisticsOrder">
        <div class="detail-header">
          <div class="row items-start justify-between no-wrap">
            <div>
              <div class="dialog-eyebrow"><q-icon name="local_shipping" size="13px" class="q-mr-xs" />Logística e Envio</div>
              <div class="detail-order-id">#{{ logisticsOrder.order_id }}</div>
              <div class="detail-meta">{{ logisticsOrder.buyer_nickname }} · {{ logisticsOrder.shipment?.destination_city }}/{{ logisticsOrder.shipment?.destination_state }}</div>
              <div class="row items-center q-gutter-x-xs q-mt-sm">
                <div v-if="logisticsOrder.shipment?.logistic_type"
                  :class="['logistic-badge', getLogisticClass(logisticsOrder.shipment.logistic_type)]">
                  <q-icon :name="getLogisticIcon(logisticsOrder.shipment.logistic_type)" size="11px" />
                  {{ LOGISTIC_META[logisticsOrder.shipment.logistic_type]?.label || logisticsOrder.shipment.logistic_type }}
                </div>
                <span :class="['s-pill', 'pill-sm', getShipmentStatusClass(logisticsOrder.shipment?.status)]">
                  <q-icon :name="getShipmentIcon(logisticsOrder.shipment?.status)" size="10px" />
                  {{ getShipmentStatusLabel(logisticsOrder.shipment?.status) }}
                </span>
              </div>
            </div>
            <div class="row q-gutter-x-xs">
              <q-btn flat round dense icon="account_balance_wallet" color="teal-7" size="sm"
                @click="logisticsOpen = false; openFinancial(logisticsOrder)">
                <q-tooltip>Ver Financeiro</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="open_in_new" color="grey-6" size="sm"
                type="a" :href="`https://vendas.mercadolivre.com.br/vendas/${logisticsOrder.order_id}/detalhe`" target="_blank">
                <q-tooltip>Abrir no ML</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="close" color="grey-6" size="sm" v-close-popup />
            </div>
          </div>
        </div>

        <q-scroll-area style="height: calc(100vh - 150px);">
          <div class="detail-body" v-if="logisticsOrder.shipment">

            <!-- Próxima ação (apenas seller-managed + status pendente de ação) -->
            <div v-if="logisticsOrder.shipment.logistic_type !== 'fulfillment' && needsSellerAction(getEffectiveShipStatus(logisticsOrder.shipment))"
              class="action-callout">
              <div class="action-callout-icon"><q-icon name="warning_amber" size="20px" /></div>
              <div>
                <div class="action-callout-title">Ação necessária</div>
                <div class="action-callout-desc">{{ getSellerActionDescription(getEffectiveShipStatus(logisticsOrder.shipment)) }}</div>
              </div>
            </div>

            <!-- Timeline Full -->
            <div v-if="logisticsOrder.shipment.logistic_type === 'fulfillment'" class="detail-section">
              <div class="section-title"><q-icon name="warehouse" size="14px" class="q-mr-xs" />Acompanhamento (Full)</div>
              <div class="timeline-note">
                <q-icon name="info" size="12px" />
                Com Fulfillment, o ML gerencia toda a operação de embalagem e postagem. Você só precisa acompanhar o status.
              </div>
              <div class="timeline">
                <div v-for="(step, i) in STEPS_FULL" :key="i"
                  :class="['timeline-item', getTimelineClassFull(logisticsOrder.shipment.status, i)]">
                  <div class="tl-dot-col">
                    <div class="tl-dot"><q-icon :name="step.icon" size="12px" /></div>
                    <div v-if="i < STEPS_FULL.length - 1" class="tl-line" />
                  </div>
                  <div class="tl-content">
                    <div class="tl-label">{{ step.label }}</div>
                    <div class="tl-desc">{{ step.descFull }}</div>
                    <div v-if="getTimelineDate(logisticsOrder.shipment, step.dateKey)" class="tl-date">
                      {{ formatDateFull(getTimelineDate(logisticsOrder.shipment, step.dateKey)) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Timeline Seller-managed -->
            <div v-else class="detail-section">
              <div class="section-title"><q-icon name="route" size="14px" class="q-mr-xs" />Acompanhamento do Envio</div>
              <div class="timeline">
                <div v-for="(step, i) in STEPS_SELLER" :key="i"
                  :class="['timeline-item', getTimelineClassSeller(getEffectiveShipStatus(logisticsOrder.shipment), i)]">
                  <div class="tl-dot-col">
                    <div class="tl-dot"><q-icon :name="step.icon" size="12px" /></div>
                    <div v-if="i < STEPS_SELLER.length - 1" class="tl-line" />
                  </div>
                  <div class="tl-content">
                    <div class="tl-label">{{ step.label }}</div>
                    <div v-if="step.action && isCurrentStep(getEffectiveShipStatus(logisticsOrder.shipment), i)" class="tl-action">
                      <q-icon name="touch_app" size="11px" />{{ step.action }}
                    </div>
                    <div v-else class="tl-desc">{{ step.desc }}</div>
                    <div v-if="getTimelineDate(logisticsOrder.shipment, step.dateKey)" class="tl-date">
                      {{ formatDateFull(getTimelineDate(logisticsOrder.shipment, step.dateKey)) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rastreio e Destino -->
            <div class="detail-section">
              <div class="section-title"><q-icon name="pin_drop" size="14px" class="q-mr-xs" />Destino e Rastreio</div>
              <div class="tracking-grid">
                <div class="t-item">
                  <span class="t-label">Rastreio</span>
                  <span class="t-value mono">{{ logisticsOrder.shipment.tracking_number || 'Aguardando geração' }}</span>
                </div>
                <div class="t-item">
                  <span class="t-label">Substatus</span>
                  <span class="t-value">{{ logisticsOrder.shipment.substatus || '—' }}</span>
                </div>
                <div class="t-item">
                  <span class="t-label">Destinatário</span>
                  <span class="t-value">{{ logisticsOrder.shipment.receiver_name || logisticsOrder.buyer_nickname || '—' }}</span>
                </div>
                <div class="t-item">
                  <span class="t-label">Destino</span>
                  <span class="t-value">
                    {{ logisticsOrder.shipment.destination_city || '—' }}
                    <template v-if="logisticsOrder.shipment.destination_state"> / {{ logisticsOrder.shipment.destination_state }}</template>
                    <span v-if="logisticsOrder.shipment.destination_zip" class="t-sub"> · CEP {{ logisticsOrder.shipment.destination_zip }}</span>
                  </span>
                </div>
                <div v-if="logisticsOrder.shipment.date_shipped" class="t-item">
                  <span class="t-label">Postado em</span>
                  <span class="t-value">{{ formatDateFull(logisticsOrder.shipment.date_shipped) }}</span>
                </div>
                <div class="t-item">
                  <span class="t-label">{{ logisticsOrder.shipment.date_delivered ? 'Entregue em' : 'Previsão' }}</span>
                  <span class="t-value" :class="logisticsOrder.shipment.date_delivered ? 'delivered' : ''">
                    {{ formatDateFull(logisticsOrder.shipment.date_delivered || logisticsOrder.shipment.estimated_delivery) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Custo do Frete -->
            <div class="detail-section">
              <div class="section-title"><q-icon name="payments" size="14px" class="q-mr-xs" />Custo do Frete</div>

              <!-- Flex: seller entrega, não há custo de transportadora -->
              <div v-if="logisticsOrder.shipment.logistic_type === 'self_service'" class="flex-freight-note">
                <q-icon name="directions_bike" size="16px" class="q-mr-sm" color="teal-6" />
                <div>
                  <div class="flex-freight-title">Entrega Flex — sem custo de frete ML</div>
                  <div class="flex-freight-desc">Você mesmo realiza a entrega. O ML não cobra serviço de transportadora neste modo.</div>
                </div>
              </div>

              <div v-else class="receipt">
                <div v-if="logisticsOrder.shipment.list_cost" class="receipt-row">
                  <span class="receipt-label" style="color:#9aa0ac">Tabela ML (sem desconto)</span>
                  <span class="receipt-value" style="color:#9aa0ac">{{ formatCurrency(logisticsOrder.shipment.list_cost) }}</span>
                </div>
                <div v-if="(logisticsOrder.shipment.shipping_cost || 0) > 0" class="receipt-row sub-row">
                  <span class="receipt-label">Comprador pagou</span>
                  <span class="receipt-value pos-t">{{ formatCurrency(logisticsOrder.shipment.shipping_cost) }}</span>
                </div>
                <div class="receipt-sep thick" />
                <div class="receipt-row total-row">
                  <span class="receipt-label-bold">Seller paga</span>
                  <span :class="['receipt-total', getSellerShippingCost(logisticsOrder) > 0 ? 'neg-t' : 'pos-t']">
                    {{ getSellerShippingCost(logisticsOrder) > 0 ? formatCurrency(getSellerShippingCost(logisticsOrder)) : 'Grátis' }}
                  </span>
                </div>
                <div v-if="logisticsOrder.shipment.cost_type" class="receipt-row">
                  <span class="receipt-label" style="color:#9aa0ac;font-size:11px">
                    <q-icon name="info_outline" size="12px" class="q-mr-xs" />
                    <template v-if="logisticsOrder.shipment.cost_type === 'free'">
                      Frete grátis p/ comprador — seller absorve o custo total
                    </template>
                    <template v-else-if="logisticsOrder.shipment.cost_type === 'partially_free'">
                      Frete subsidiado — comprador pagou parte, seller paga o restante
                    </template>
                    <template v-else-if="logisticsOrder.shipment.cost_type === 'charged'">
                      Frete por conta do comprador — seller não paga nada
                    </template>
                  </span>
                </div>
              </div>
            </div>

          </div>
          <div v-else class="detail-body text-center text-grey-5 q-pa-xl">
            <q-icon name="local_shipping" size="40px" /><br/>Sem dados de envio
          </div>
        </q-scroll-area>
      </div>
    </q-dialog>


    <!-- ══════════════════════════════════════════════════════ -->
    <!-- DIALOG: FILTROS AVANÇADOS                             -->
    <!-- ══════════════════════════════════════════════════════ -->
    <q-dialog v-model="showAdvanced" position="right" full-height
      transition-show="slide-left" transition-hide="slide-right">
      <div class="fadv-panel">

        <!-- Header -->
        <div class="fadv-header">
          <div class="fadv-header-left">
            <div class="fadv-header-icon"><q-icon name="tune" size="18px" /></div>
            <div>
              <div class="fadv-header-title">Filtros Avançados</div>
              <div class="fadv-header-sub" v-if="advancedFilterCount > 0">
                {{ advancedFilterCount }} filtro{{ advancedFilterCount > 1 ? 's' : '' }} ativo{{ advancedFilterCount > 1 ? 's' : '' }}
              </div>
              <div class="fadv-header-sub" v-else>Nenhum filtro ativo</div>
            </div>
          </div>
          <q-btn flat round dense icon="close" color="grey-6" size="sm" v-close-popup />
        </div>

        <!-- Body -->
        <q-scroll-area style="height: calc(100vh - 130px);">
          <div class="fadv-body">

            <!-- Seção: Período -->
            <div class="fadv-section">
              <div class="fadv-section-title">
                <q-icon name="calendar_month" size="15px" color="teal-7" />
                Período
              </div>
              <div class="fadv-row fadv-row--col">
                <div class="fb-date-field" :class="filters.dateFrom && 'fb-date-field--filled'">
                  <label class="fb-date-label">De</label>
                  <input v-model="filters.dateFrom" type="datetime-local" class="fb-date-input fb-date-input--dt" />
                  <button v-if="filters.dateFrom" class="fb-date-clear" @click="filters.dateFrom = null">
                    <q-icon name="close" size="11px" />
                  </button>
                </div>
                <div class="fb-date-field" :class="filters.dateTo && 'fb-date-field--filled'">
                  <label class="fb-date-label">Até</label>
                  <input v-model="filters.dateTo" type="datetime-local" class="fb-date-input fb-date-input--dt" />
                  <button v-if="filters.dateTo" class="fb-date-clear" @click="filters.dateTo = null">
                    <q-icon name="close" size="11px" />
                  </button>
                </div>
              </div>
            </div>

            <div class="fadv-divider" />

            <!-- Seção: Valor da Venda -->
            <div class="fadv-section">
              <div class="fadv-section-title">
                <q-icon name="attach_money" size="15px" color="teal-7" />
                Valor da Venda
              </div>
              <div class="fadv-row">
                <q-input v-model.number="filters.priceMin" type="number" label="Mínimo"
                  outlined dense bg-color="white" color="teal-7" class="fadv-input"
                  clearable prefix="R$" stack-label />
                <span class="fadv-range-sep">→</span>
                <q-input v-model.number="filters.priceMax" type="number" label="Máximo"
                  outlined dense bg-color="white" color="teal-7" class="fadv-input"
                  clearable prefix="R$" stack-label />
              </div>
            </div>

            <div class="fadv-divider" />

            <!-- Seção: Lucro Após Custo Médio do Produto -->
            <div class="fadv-section">
              <div class="fadv-section-title">
                <q-icon name="trending_up" size="15px" color="teal-7" />
                Margem após CMV (R$)
                <q-btn-toggle v-model="marginFilterMode"
                  :options="[{label:'Após Custo Médio', value:'lucro_apos_cmp'},{label:'Antes Custo Médio', value:'net_received'}]"
                  dense unelevated toggle-color="teal-7" color="grey-2" text-color="grey-7"
                  rounded size="xs" class="q-ml-auto" />
              </div>
              <div class="fadv-row">
                <q-input v-model.number="filters.marginMin" type="number" label="Mínimo R$"
                  prefix="R$" outlined dense bg-color="white" color="teal-7" class="fadv-input" clearable stack-label />
                <span class="fadv-range-sep">→</span>
                <q-input v-model.number="filters.marginMax" type="number" label="Máximo R$"
                  prefix="R$" outlined dense bg-color="white" color="teal-7" class="fadv-input" clearable stack-label />
              </div>
            </div>

            <div class="fadv-divider" />

            <!-- Seção: Flags -->
            <div class="fadv-section">
              <div class="fadv-section-title">
                <q-icon name="flag" size="15px" color="teal-7" />
                Flags
              </div>
              <div class="fadv-flags">
                <q-item clickable class="fadv-flag-item"
                  @click="filters.is_catalog = filters.is_catalog === true ? null : true">
                  <q-item-section side>
                    <q-checkbox :model-value="filters.is_catalog === true" color="teal-7" dense />
                  </q-item-section>
                  <q-item-section>
                    <div class="fadv-flag-label">
                      <div class="fadv-flag-icon fadv-flag-icon--indigo">
                        <q-icon name="auto_awesome" size="14px" />
                      </div>
                      <div>
                        <div class="fadv-flag-name">Catálogo</div>
                        <div class="fadv-flag-desc">Somente vendas do catálogo ML</div>
                      </div>
                    </div>
                  </q-item-section>
                </q-item>

                <q-item clickable class="fadv-flag-item"
                  @click="filters.fulfilled = filters.fulfilled === true ? null : true">
                  <q-item-section side>
                    <q-checkbox :model-value="filters.fulfilled === true" color="teal-7" dense />
                  </q-item-section>
                  <q-item-section>
                    <div class="fadv-flag-label">
                      <div class="fadv-flag-icon fadv-flag-icon--green">
                        <q-icon name="check_circle" size="14px" />
                      </div>
                      <div>
                        <div class="fadv-flag-name">Entregue</div>
                        <div class="fadv-flag-desc">Somente pedidos já entregues</div>
                      </div>
                    </div>
                  </q-item-section>
                </q-item>
              </div>
            </div>

          </div>
        </q-scroll-area>

        <!-- Footer -->
        <div class="fadv-footer">
          <q-btn flat no-caps icon="filter_alt_off" label="Limpar filtros"
            color="red-5" @click="clearFilters" size="sm" />
          <q-btn unelevated no-caps label="Fechar" color="teal-7"
            v-close-popup size="sm" class="q-px-lg" />
        </div>

      </div>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar, copyToClipboard, date } from 'quasar'
import { useRowExpand } from 'src/composables/useRowExpand'

const $q = useQuasar()

// ============================================================================
// 0. PACK GROUPING
// Múltiplos sub-orders com mesmo pack_id são exibidos como uma linha única.
// O row resultante tem _isPack=true e _packOrders com os sub-orders originais.
// ============================================================================
const groupPackOrders = (rawRows) => {
  const result = []
  const packMap = {}
  for (const row of rawRows) {
    if (!row.pack_id) {
      result.push(row)
      continue
    }
    if (!packMap[row.pack_id]) {
      // Cria o pack row baseado no primeiro sub-order
      const packRow = {
        ...row,
        _isPack: true,
        _packOrders: [row],
        // total_amount será somado; começa com o do primeiro order
      }
      packMap[row.pack_id] = packRow
      result.push(packRow)
    } else {
      const pack = packMap[row.pack_id]
      pack._packOrders.push(row)
      // Soma totais
      pack.total_amount = (Number(pack.total_amount) + Number(row.total_amount || 0)).toFixed(2)
      // Agrega itens
      if (row.items?.length) pack.items = [...(pack.items || []), ...row.items]
      // Usa o shipment do primeiro sub-order que tiver um
      if (!pack.shipment && row.shipment) pack.shipment = row.shipment
      // Agrega fee_breakdown (shipping só existe em um sub-order — o que tem shipment)
      if (row.fee_breakdown) {
        const fb = pack.fee_breakdown
        pack.fee_breakdown = {
          total_sale_fee:       (Number(fb?.total_sale_fee      || 0) + Number(row.fee_breakdown.total_sale_fee      || 0)),
          seller_shipping_cost: (Number(fb?.seller_shipping_cost|| 0) + Number(row.fee_breakdown.seller_shipping_cost|| 0)),
          net_received:         (Number(fb?.net_received        || 0) + Number(row.fee_breakdown.net_received        || 0)),
        }
      }
      // Agrega lucro e CMV (campos do Order-level, somados entre sub-orders do pack)
      if (row.lucro_apos_cmp != null) {
        pack.lucro_apos_cmp = (Number(pack.lucro_apos_cmp || 0) + Number(row.lucro_apos_cmp))
      }
      if (row.custo_medio_produto != null) {
        pack.custo_medio_produto = (Number(pack.custo_medio_produto || 0) + Number(row.custo_medio_produto))
      }
    }
  }
  return result
}

// ============================================================================
// 1. ESTADO
// ============================================================================
const orders        = ref([])
const loading       = ref(false)
const searchFocused = ref(false)

// Margem — server-side via net_received ou lucro_apos_cmp gravados no banco
const marginFilterMode = ref('lucro_apos_cmp')   // 'net_received' | 'lucro_apos_cmp'

const filteredOrders = computed(() => orders.value)
const financialOpen = ref(false)
const logisticsOpen = ref(false)
const selectedOrder = ref(null)   // para dialog financeiro
const logisticsOrder = ref(null)  // para dialog logístico
const detailLoading = ref(false)
const { isExpanded, toggleExpand } = useRowExpand()

const pagination = ref({
  sortBy: 'date_created', descending: true, page: 1, rowsPerPage: 50, rowsNumber: 0
})

// Mini-dashboard: resumo do dia
const todayStats     = ref(null)
const todayLoading   = ref(false)
const fetchTodayStats = async () => {
  todayLoading.value = true
  try {
    const { data } = await MercadoLivreService.getOrderTodaySummary()
    todayStats.value = data
  } catch (e) { console.error(e) }
  finally { todayLoading.value = false }
}

// Labels conforme docs/glossario_metricas.md (feedback #9)
const columns = [
  { name: 'produto',      label: 'PRODUTO / PEDIDO',   field: 'order_id',      align: 'left',  sortable: true, style: 'min-width:250px' },
  { name: 'unidades',     label: 'UN.',                field: 'units',         align: 'center', sortable: true, style: 'min-width:52px' },
  { name: 'data_venda',   label: 'DATA',               field: 'date_created',  align: 'left',  sortable: true, style: 'min-width:90px' },
  { name: 'comprador',    label: 'COMPRADOR',          field: 'buyer_nickname',align: 'left',  style: 'min-width:110px' },
  { name: 'status_venda', label: 'STATUS',             field: 'status',        align: 'left',  style: 'min-width:90px' },
  { name: 'logistica',    label: 'LOGÍSTICA',          field: 'shipment',      align: 'left',  style: 'min-width:160px', priority: 'secondary' },
  { name: 'venda',        label: 'GMV',                field: 'total_amount',  align: 'right', sortable: true, style: 'min-width:85px' },
  { name: 'tarifa',       label: 'TAXAS ML',           field: 'total_fee',     align: 'right', style: 'min-width:90px', priority: 'secondary' },
  { name: 'frete',        label: 'FRETE',              field: 'shipping_cost', align: 'right', style: 'min-width:85px', priority: 'secondary' },
  { name: 'liquido',      label: 'RECEITA LÍQUIDA',    field: 'net',           align: 'right', style: 'min-width:115px', priority: 'secondary' },
  { name: 'lucro',        label: 'MARGEM APÓS CMV',    field: 'lucro_apos_cmp', align: 'right', style: 'min-width:115px', priority: 'secondary' },
]

// Paridade mobile: <600px mostra só colunas primárias na linha; secundárias vão pro painel de expandir inline.
const isCompact = computed(() => $q.screen.lt.sm)
const displayColumns = computed(() =>
  isCompact.value ? columns.filter(c => c.priority !== 'secondary') : columns
)

// Soma de unidades do pedido (pack soma todos os sub-orders)
const rowUnits = (row) => (row.items || []).reduce((s, i) => s + (i.quantity || 0), 0)

// ============================================================================
// 2. FILTROS
// ============================================================================
const availableAccounts = ref([])
const showAdvanced = ref(false)

const filters = reactive({
  search: '',
  account: [],
  status: [],
  shipment_status: [],
  logistic_type: [],
  cost_type: [],
  dateFrom: null,
  dateTo: null,
  priceMin: null,
  priceMax: null,
  marginMin: null,
  marginMax: null,
  is_catalog: null,
  fulfilled: null,
  _substatus: null,   // filtro interno: 'ready_to_print' para smart view "Imprimir Etiqueta"
})

const hasActiveFilters = computed(() =>
  filters.search ||
  filters.account?.length ||
  filters.status?.length ||
  filters.shipment_status?.length ||
  filters.logistic_type?.length ||
  filters.cost_type?.length ||
  filters.dateFrom || filters.dateTo ||
  filters.priceMin || filters.priceMax ||
  filters.marginMin != null || filters.marginMax != null ||
  filters.is_catalog != null ||
  filters.fulfilled != null
)

// Quantos filtros avançados estão ativos (para o badge do botão tune)
const advancedFilterCount = computed(() => [
  filters.logistic_type?.length,
  filters.cost_type?.length,
  filters.dateFrom || filters.dateTo ? 1 : 0,
  filters.priceMin || filters.priceMax ? 1 : 0,
  filters.marginMin != null || filters.marginMax != null ? 1 : 0,
  filters.is_catalog != null ? 1 : 0,
  filters.fulfilled != null ? 1 : 0,
].reduce((a, b) => a + (b ? 1 : 0), 0))

const orderStatusOptions = [
  { label: 'Pago',             value: 'paid' },
  { label: 'Ag. Pagamento',    value: 'payment_required' },
  { label: 'Confirmado',       value: 'confirmed' },
  { label: 'Cancelado',        value: 'cancelled' },
]
const shipmentStatusOptions = [
  { label: 'Pendente',              value: 'pending' },
  { label: 'Preparando',            value: 'handling' },
  { label: 'Pronto p/ Envio',       value: 'ready_to_ship' },
  { label: 'Em Trânsito',           value: 'shipped' },
  { label: 'Entregue',              value: 'delivered' },
  { label: 'Não Entregue',          value: 'not_delivered' },
  { label: 'Cancelado',             value: 'cancelled' },
]
const logisticTypeOptions = [
  { label: 'Full (Fulfillment)',  value: 'fulfillment' },
  { label: 'Flex (Self-Service)', value: 'self_service' },
  { label: 'Agência (XD)',        value: 'xd_drop_off' },
  { label: 'Agência (Drop Off)',  value: 'drop_off' },
  { label: 'Coleta (Cross Dock)', value: 'cross_docking' },
]
const costTypeOptions = [
  { label: 'Grátis p/ comprador',  value: 'free' },
  { label: 'Subsidiado',           value: 'partially_free' },
  { label: 'Comprador paga',        value: 'charged' },
]
const triStateOpts = [
  { label: 'Todos', value: null },
  { label: 'Sim',   value: true },
  { label: 'Não',   value: false },
]
const sortOptions = [
  { label: 'Data ↓ (recentes)',   field: 'date_created',  desc: true  },
  { label: 'Data ↑ (antigas)',    field: 'date_created',  desc: false },
  { label: 'Valor ↓ (maior)',     field: 'total_amount',  desc: true  },
  { label: 'Valor ↑ (menor)',     field: 'total_amount',  desc: false },
  { label: 'Status',              field: 'status',        desc: false },
  { label: 'Fechamento ↓',        field: 'date_closed',   desc: true  },
]
const currentSortLabel = computed(() => {
  const opt = sortOptions.find(o => o.field === pagination.value.sortBy && o.desc === pagination.value.descending)
  return opt?.label || 'Ordenar'
})
const applySort = (opt) => {
  pagination.value.sortBy = opt.field
  pagination.value.descending = opt.desc
  refreshData()
}

const LOGISTIC_META = {
  fulfillment:   { label: 'Full',       icon: 'warehouse',       cls: 'log-full' },
  cross_docking: { label: 'Coleta',     icon: 'swap_horiz',      cls: 'log-coleta' },
  drop_off:      { label: 'Agência',    icon: 'store',           cls: 'log-agencia' },
  xd_drop_off:   { label: 'Agência XD', icon: 'store',           cls: 'log-agencia' },
  self_service:  { label: 'Flex',       icon: 'directions_bike', cls: 'log-flex' },
}

// ── Passos FULL (seller não gerencia etiqueta/coleta)
const STEPS_FULL = [
  { label: 'Aguardando Envio', icon: 'inventory_2', descFull: 'ML está separando e embalando seu produto', dateKey: null,
    keys: ['pending', 'handling', 'ready_to_ship'] },
  { label: 'Em Trânsito',      icon: 'local_shipping', descFull: 'Produto com transportadora a caminho do comprador', dateKey: 'date_shipped',
    keys: ['shipped'] },
  { label: 'Entregue',         icon: 'check_circle',   descFull: 'Produto entregue ao comprador', dateKey: 'date_delivered',
    keys: ['delivered'] },
]

// ── Passos SELLER (cross_docking, drop_off, self_service, etc.)
const STEPS_SELLER = [
  { label: 'Aguardando',        icon: 'hourglass_empty', keys: ['pending'],
    desc: 'Pagamento confirmado, prepare o produto', action: null, dateKey: null },
  { label: 'Imprimir Etiqueta', icon: 'print',           keys: ['handling', 'ready_to_print'],
    desc: 'Etiqueta disponível para impressão',
    action: 'Acesse o ML e imprima a etiqueta de envio', dateKey: null },
  { label: 'Pronto p/ Coleta',  icon: 'inventory',       keys: ['ready_to_ship'],
    desc: 'Aguardando coleta ou entrega na agência',
    action: 'Leve o pacote para a agência / aguarde a coleta', dateKey: null },
  { label: 'Em Trânsito',       icon: 'local_shipping',  keys: ['shipped'],
    desc: 'Pacote postado, em rota para o comprador', action: null, dateKey: 'date_shipped' },
  { label: 'Entregue',          icon: 'check_circle',    keys: ['delivered'],
    desc: 'Entregue ao comprador com sucesso', action: null, dateKey: 'date_delivered' },
]

const accountOptions = computed(() => availableAccounts.value)

// ============================================================================
// 3. SMART VIEWS
// ============================================================================
const resetFiltersState = () => Object.assign(filters, {
  search: '', account: [], status: [], shipment_status: [], logistic_type: [], cost_type: [],
  dateFrom: null, dateTo: null, priceMin: null, priceMax: null,
  marginMin: null, marginMax: null, is_catalog: null, fulfilled: null,
  _substatus: null,
})
const clearFilters = () => { resetFiltersState(); marginFilterMode.value = 'lucro_apos_cmp'; buscar() }

const buscar = () => onRequest({ pagination: { ...pagination.value, page: 1 } })

// Toggle individual de conta (chips rápidos — auto-busca ao clicar)
const toggleAccountFilter = (value) => {
  const idx = filters.account.indexOf(value)
  if (idx === -1) filters.account = [...filters.account, value]
  else filters.account = filters.account.filter(v => v !== value)
  buscar()
}
// Toggle individual de tipo logístico
const toggleLogisticFilter = (value) => {
  const idx = filters.logistic_type.indexOf(value)
  if (idx === -1) filters.logistic_type = [...filters.logistic_type, value]
  else filters.logistic_type = filters.logistic_type.filter(v => v !== value)
  buscar()
}
// Toggle individual de custo de frete
const toggleCostTypeFilter = (value) => {
  const idx = filters.cost_type.indexOf(value)
  if (idx === -1) filters.cost_type = [...filters.cost_type, value]
  else filters.cost_type = filters.cost_type.filter(v => v !== value)
  buscar()
}
// Toggle individual de status pedido (chips rápidos)
const toggleStatusFilter = (value) => {
  const idx = filters.status.indexOf(value)
  if (idx === -1) filters.status = [...filters.status, value]
  else filters.status = filters.status.filter(v => v !== value)
  buscar()
}
// Toggle individual de status envio (chips rápidos)
const toggleShipmentFilter = (value) => {
  const idx = filters.shipment_status.indexOf(value)
  if (idx === -1) filters.shipment_status = [...filters.shipment_status, value]
  else filters.shipment_status = filters.shipment_status.filter(v => v !== value)
  buscar()
}

// Expedição
const setFilterHandling     = () => { resetFiltersState(); filters.status = ['paid']; filters.shipment_status = ['handling']; buscar() }
const setFilterLabelPrint   = () => { resetFiltersState(); filters.status = ['paid']; filters.shipment_status = ['ready_to_ship']; filters._substatus = 'ready_to_print'; buscar() }
const setFilterReadyToShip  = () => { resetFiltersState(); filters.status = ['paid']; filters.shipment_status = ['ready_to_ship']; buscar() }
// Envio
const setFilterInTransit    = () => { resetFiltersState(); filters.shipment_status = ['shipped']; buscar() }
const setFilterDelivered    = () => { resetFiltersState(); filters.shipment_status = ['delivered']; buscar() }
// Logística
const setFilterFlex         = () => { resetFiltersState(); filters.logistic_type = ['self_service']; buscar() }
const setFilterFull         = () => { resetFiltersState(); filters.logistic_type = ['fulfillment']; buscar() }
const setFilterAgencia      = () => { resetFiltersState(); filters.logistic_type = ['xd_drop_off', 'drop_off']; buscar() }
// Outros
const setFilterCatalog      = () => { resetFiltersState(); filters.is_catalog = true; buscar() }
const setFilterCancelled    = () => { resetFiltersState(); filters.status = ['cancelled']; buscar() }

// ============================================================================
// 4. DATA FETCHING
// ============================================================================
const loadFacets = async () => {
  try {
    const { data } = await MercadoLivreService.listAccounts()
    availableAccounts.value = data.map(a => ({ id: a.account_id, nickname: a.account_nickname }))
  } catch (e) { console.error(e) }
}
const refreshData = () => { onRequest({ pagination: pagination.value }); fetchTodayStats() }
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true
  orders.value = []
  try {
    // Tratamento especial: imprimir etiqueta → substatus=ready_to_print
    const hasLabelPrint = filters._substatus === 'ready_to_print'
    const rawStatuses = filters.shipment_status || []

    const params = {
      page, page_size: rowsPerPage,
      ordering: descending ? `-${sortBy}` : sortBy,
      search:                  filters.search || undefined,
      account:                 filters.account?.length         ? filters.account.join(',')         : undefined,
      status:                  filters.status?.length          ? filters.status.join(',')          : undefined,
      shipment__status:        rawStatuses.length              ? rawStatuses.join(',')              : undefined,
      shipment__substatus:     hasLabelPrint                   ? 'ready_to_print'                  : undefined,
      shipment__logistic_type: filters.logistic_type?.length   ? filters.logistic_type.join(',')   : undefined,
      shipment__cost_type:     filters.cost_type?.length       ? filters.cost_type.join(',')       : undefined,
      date_created__gte:       filters.dateFrom ? `${filters.dateFrom}:00` : undefined,
      date_created__lte:       filters.dateTo   ? `${filters.dateTo}:00`   : undefined,
      total_amount__gte:       filters.priceMin > 0            ? filters.priceMin                  : undefined,
      total_amount__lte:       filters.priceMax > 0            ? filters.priceMax                  : undefined,
      [`${marginFilterMode.value}__gte`]: filters.marginMin != null ? filters.marginMin            : undefined,
      [`${marginFilterMode.value}__lte`]: filters.marginMax != null ? filters.marginMax            : undefined,
      is_catalog:              filters.is_catalog != null      ? filters.is_catalog                : undefined,
      fulfilled:               filters.fulfilled  != null      ? filters.fulfilled                 : undefined,
    }
    Object.keys(params).forEach(k => params[k] == null && delete params[k])
    fetchPeriodKpis(params)  // KPIs do período com os MESMOS filtros (feedback #8)
    const response = await MercadoLivreService.listOrders(params)
    orders.value                = groupPackOrders(response.data.results || [])
    pagination.value.rowsNumber = response.data.count   || 0
    pagination.value.page       = page
    pagination.value.rowsPerPage = rowsPerPage
    pagination.value.sortBy     = sortBy
    pagination.value.descending = descending
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Falha ao buscar pedidos' })
  } finally { loading.value = false }
}

// KPIs do período filtrado (feedback #8) — mesmo filterset da listagem
const periodKpis = ref(null)
const fetchPeriodKpis = async (baseParams) => {
  try {
    const p = { ...baseParams }
    delete p.page; delete p.page_size; delete p.ordering
    const { data } = await MercadoLivreService.getOrderKpis(p)
    periodKpis.value = data
  } catch (e) { console.error('KPIs do período:', e) }
}

// ============================================================================
// 5. DIALOGS
// ============================================================================
const ensurePayments = async (row) => {
  detailLoading.value = true
  try {
    if (row._isPack) {
      // Para PACK: carrega pagamentos de todos os sub-orders
      const allPayments = []
      for (const sub of row._packOrders) {
        if (!sub.payments) {
          const { data } = await MercadoLivreService.getOrder(sub.order_id)
          sub.payments = data.payments
        }
        allPayments.push(...(sub.payments || []))
      }
      row.payments = allPayments
    } else {
      if (row.payments) return
      const { data } = await MercadoLivreService.getOrder(row.order_id)
      row.payments = data.payments
      if (!row.items?.length) row.items = data.items
    }
  } catch (e) { console.error(e) }
  finally { detailLoading.value = false }
}

const openFinancial = async (row) => {
  selectedOrder.value = null   // limpa conteúdo anterior
  financialOpen.value = true   // abre dialog (mostrará só o spinner)
  await ensurePayments(row)
  selectedOrder.value = { ...row }  // renderiza tudo de uma vez após carregar
}

const openLogistics = (row) => {
  logisticsOrder.value = row
  logisticsOpen.value  = true
}

// ============================================================================
// 6. FORMATAÇÃO
// ============================================================================
const formatCurrency = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0))

const formatDay  = (val) => val ? date.formatDate(val, 'DD/MM/YYYY') : '—'
const formatTime = (val) => val ? date.formatDate(val, 'HH:mm')      : ''
const formatDateFull = (val) => val ? date.formatDate(val, 'DD/MM/YYYY HH:mm') : '—'

const formatAgo = (val) => {
  if (!val) return ''
  const diff = Date.now() - new Date(val).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 30)  return `${days}d atrás`
  const months = Math.floor(days / 30)
  return `${months}m atrás`
}

const copyText = (t) => {
  copyToClipboard(t)
  $q.notify({ message: 'Copiado!', color: 'positive', position: 'top', icon: 'check', timeout: 800 })
}

// ============================================================================
// 7. FINANCEIRO
// ============================================================================
const LISTING_TYPE_LABELS = {
  gold_pro: 'Premium Pro', gold_special: 'Clássico', gold: 'Clássico',
  silver: 'Básico', bronze: 'Grátis', free: 'Grátis',
}
const LISTING_COMMISSION_RATE = {
  gold_pro: 0.165, gold_special: 0.115, gold: 0.115, silver: 0.115, bronze: 0, free: 0,
}
const TAXA_FIXA_THRESHOLD = 79

// Decompõe a tarifa de um item para exibir comissão + taxa fixa no detalhe.
// Usa item.total_fee (já = sale_fee × qty, calculado pelo backend).
const decomposeItemFee = (item) => {
  const totalFee  = Number(item.total_fee || 0)
  const unitPrice = Number(item.unit_price || 0)
  const qty       = Number(item.quantity   || 1)
  const rate      = LISTING_COMMISSION_RATE[item.listing_type_id] ?? 0.165
  const commissionExpected = unitPrice * qty * rate
  const taxaFixa    = Math.max(0, totalFee - commissionExpected)
  const hasTaxaFixa = taxaFixa > 1 && unitPrice < TAXA_FIXA_THRESHOLD
  return {
    totalFee,
    commission:   hasTaxaFixa ? commissionExpected : totalFee,
    taxaFixa:     hasTaxaFixa ? taxaFixa : 0,
    effectivePct: unitPrice > 0 ? (totalFee / (unitPrice * qty)) * 100 : 0,
    hasTaxaFixa,
    listingLabel: LISTING_TYPE_LABELS[item.listing_type_id] || item.listing_type_id || '—',
  }
}

// Retorna os totais financeiros da order/pack usando fee_breakdown do backend.
// Fallback para soma de item.total_fee quando o snapshot ainda não foi gravado (Order.total_fee null).
const getOrderFeeBreakdown = (row) => {
  const b = Number(row.total_amount || 0)
  const fb = row.fee_breakdown
  let fee = fb ? Number(fb.total_sale_fee || 0) : 0
  if (!fee) {
    // snapshot ausente ou zerado — soma diretamente dos itens (gerado pelo banco: sale_fee × qty)
    fee = (row.items || []).reduce((s, i) => s + Number(i.total_fee || 0), 0)
  }
  return {
    totalSaleFee:    fee,
    totalCommission: fee,
    totalTaxaFixa:   0,
    anyTaxaFixa:     false,
    effectivePct:    b > 0 ? (fee / b) * 100 : 0,
  }
}

// Retorna o flex_credit (repasse ML ao seller pelo frete pago pelo comprador em entregas Flex).
// Prioridade: fee_breakdown.flex_credit (gravado no sync) → shipment.flex_credit → shipment.shipping_cost
const getFlexCredit = (row) => {
  const fromFb = Number(row.fee_breakdown?.flex_credit || 0)
  if (fromFb > 0) return fromFb
  const fromShipment = Number(row.shipment?.flex_credit || 0)
  if (fromShipment > 0) return fromShipment
  // Último fallback: se é Flex, o shipping_cost do comprador = repasse ao seller
  if (row.shipment?.logistic_type === 'self_service')
    return Number(row.shipment?.shipping_cost || 0)
  return 0
}

// Bruto: valor da venda (sem somar repasse Flex — o repasse é linha separada na apuração)
const getBrutoAmount = (row) => {
  return Number(row.total_amount || 0)
}

// Custo estimado de entrega Flex (snapshot gravado na venda)
const getFlexDeliveryCost = (row) => {
  const snapshot = row.flex_delivery_cost_snapshot ?? row.fee_breakdown?.flex_delivery_cost_snapshot
  if (snapshot != null) return Number(snapshot)
  // fallback: se é Flex mas ainda não tem snapshot (vendas antigas)
  if (row.shipment?.logistic_type === 'self_service') return 12.50
  return 0
}

const getSellerShippingCost = (row) => {
  // Primary: shipment serializer computes from net_cost (definitive ML API value)
  const fromShipment = Number(row.shipment?.seller_shipping_cost || 0)
  if (fromShipment > 0) return fromShipment
  // Fallback 1: Order snapshot field
  const fromFb = Number(row.fee_breakdown?.seller_shipping_cost || 0)
  if (fromFb > 0) return fromFb
  // Fallback 2: derive from net_received if available
  // net_received = total_amount - sale_fee - seller_shipping + flex_credit
  if (row.fee_breakdown?.net_received != null) {
    const derived = Number(row.total_amount || 0)
      - Number(row.fee_breakdown?.total_sale_fee || 0)
      - Number(row.fee_breakdown.net_received)
      + Number(row.fee_breakdown?.flex_credit || 0)
    return Math.max(0, Math.round(derived * 100) / 100)
  }
  return 0
}

// Retorna o Custo Médio do Produto total da order.
// Preferência: campo custo_medio_produto gravado no banco.
// Fallback: deriva de net_received - lucro_apos_cmp (quando migration 0022 gravou lucro_apos_cmp
// mas custo_medio_produto ainda era null na época).
const getCustoMedioProduto = (row) => {
  if (row.custo_medio_produto != null) return Number(row.custo_medio_produto)
  const netReceived   = Number(row.fee_breakdown?.net_received ?? null)
  const lucroAposCmp  = row.lucro_apos_cmp != null ? Number(row.lucro_apos_cmp) : null
  if (lucroAposCmp !== null && row.fee_breakdown?.net_received != null)
    return netReceived - lucroAposCmp
  return null
}
const getNetMargin = (row) => {
  if (row.fee_breakdown) return Number(row.fee_breakdown.net_received || 0)
  return Number(row.total_amount || 0) - getOrderFeeBreakdown(row).totalSaleFee - getSellerShippingCost(row)
}
const calculateMarginPct = (row) => {
  const t = getBrutoAmount(row)
  return t === 0 ? 0 : Math.round((getNetMargin(row) / t) * 100)
}
const calcLucroPct = (row) => {
  const t = Number(row.total_amount || 0)
  if (t === 0 || row.lucro_apos_cmp == null) return 0
  return Math.round((Number(row.lucro_apos_cmp) / t) * 100)
}

// ============================================================================
// 8. STATUS / LOGÍSTICA HELPERS
// ============================================================================
const getOrderStatusLabel = (s) =>
  ({ paid: 'Pago', payment_required: 'Ag. Pagto', cancelled: 'Cancelado', confirmed: 'Confirmado' }[s] || s)
const getOrderStatusIcon  = (s) =>
  ({ paid: 'check_circle', payment_required: 'schedule', cancelled: 'cancel', confirmed: 'pending' }[s] || 'help_outline')
const getOrderStatusClass = (s) =>
  ({ paid: 'pill-green', payment_required: 'pill-orange', cancelled: 'pill-red', confirmed: 'pill-blue' }[s] || 'pill-grey')

const getShipmentStatusLabel = (s) =>
  ({ pending: 'Pendente', handling: 'Preparando', ready_to_print: 'Imprimir Etiqueta',
     ready_to_ship: 'Pronto p/ Coleta', shipped: 'Em Trânsito',
     delivered: 'Entregue', not_delivered: 'Não Entregue', cancelled: 'Cancelado' }[s] || s || 'S/ Envio')

const getShipmentStatusLabelFull = (s) =>
  ({ pending: 'Aguard. Envio', handling: 'Aguard. Envio', ready_to_ship: 'Aguard. Envio',
     shipped: 'Em Trânsito', delivered: 'Entregue' }[s] || 'Aguard. Envio')

const getShipmentStatusClass = (s) =>
  ({ pending: 'pill-orange', handling: 'pill-blue', ready_to_ship: 'pill-teal',
     shipped: 'pill-purple', delivered: 'pill-green', not_delivered: 'pill-red', cancelled: 'pill-grey' }[s] || 'pill-grey')
const getShipmentIcon = (s) =>
  ({ handling: 'inventory', ready_to_ship: 'print', shipped: 'local_shipping',
     delivered: 'check_circle', not_delivered: 'cancel' }[s] || 'help_outline')

const getLogisticClass = (lt) => LOGISTIC_META[lt]?.cls || 'log-default'
const getLogisticIcon  = (lt) => LOGISTIC_META[lt]?.icon || 'local_shipping'

// Status efetivo: combina status + substatus para diferenciar etapas
// Ex: ready_to_ship + substatus ready_to_print → etiqueta ainda não impressa
const getEffectiveShipStatus = (shipment) => {
  if (!shipment) return null
  if (shipment.status === 'ready_to_ship' && shipment.substatus === 'ready_to_print')
    return 'ready_to_print'
  return shipment.status
}

// Seller precisa agir?
const needsSellerAction = (effStatus) =>
  effStatus === 'handling' || effStatus === 'ready_to_print' || effStatus === 'ready_to_ship'
const getSellerActionLabel = (effStatus) =>
  ({ handling: 'Imprimir etiqueta!', ready_to_print: 'Imprimir etiqueta!', ready_to_ship: 'Aguardando coleta' }[effStatus] || '')
const getSellerActionDescription = (effStatus) =>
  ({ handling: 'A etiqueta está disponível no painel do ML. Imprima e cole no pacote antes de enviar.',
     ready_to_print: 'A etiqueta está disponível no painel do ML. Imprima e cole no pacote antes de enviar.',
     ready_to_ship: 'O produto está pronto. Aguarde a coleta ou leve o pacote até a agência/ponto de entrega.' }[effStatus] || '')

// Mini stepper table — Full (3 estados)
const getMiniStepClassFull = (status, i) => {
  const order = { pending: 0, handling: 0, ready_to_ship: 0, shipped: 1, delivered: 2, not_delivered: 2 }
  const cur = order[status] ?? -1
  if (status === 'not_delivered') return i <= 1 ? 'mini-done' : 'mini-cancelled'
  if (i < cur)  return 'mini-done'
  if (i === cur) return 'mini-active'
  return 'mini-inactive'
}
// Mini stepper table — Seller (5 estados) — recebe status efetivo
const getMiniStepClassSeller = (effStatus, i) => {
  const order = { pending: 0, handling: 1, ready_to_print: 1, ready_to_ship: 2, shipped: 3, delivered: 4 }
  const cur = order[effStatus] ?? -1
  if (effStatus === 'not_delivered' || effStatus === 'cancelled') return i === 0 ? 'mini-cancelled' : 'mini-inactive'
  if (i < cur)  return 'mini-done'
  if (i === cur) return 'mini-active'
  return 'mini-inactive'
}

// Timeline dialog helpers
const getStepIndexFull = (status) => {
  if (['pending','handling','ready_to_ship'].includes(status)) return 0
  if (status === 'shipped') return 1
  if (status === 'delivered') return 2
  return -1
}
const getStepIndexSeller = (effStatus) => {
  const o = { pending: 0, handling: 1, ready_to_print: 1, ready_to_ship: 2, shipped: 3, delivered: 4 }
  return o[effStatus] ?? -1
}
const getTimelineClassFull = (status, i) => {
  const cur = getStepIndexFull(status)
  if (status === 'not_delivered') return i < 2 ? 'tl-done' : 'tl-cancelled'
  if (i < cur)  return 'tl-done'
  if (i === cur) return 'tl-active'
  return 'tl-pending'
}
const getTimelineClassSeller = (status, i) => {
  const cur = getStepIndexSeller(status)
  if (status === 'not_delivered' || status === 'cancelled') return i === 0 ? 'tl-cancelled' : 'tl-pending'
  if (i < cur)  return 'tl-done'
  if (i === cur) return 'tl-active'
  return 'tl-pending'
}
const isCurrentStep = (status, i) => {
  const cur = getStepIndexSeller(status)
  return i === cur
}
const getTimelineDate = (shipment, key) => {
  if (!key || !shipment) return null
  return shipment[key] || null
}

const getPaymentMethodLabel = (row) => {
  const p = row.payments?.[0]
  if (!p) return null
  const m = { credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito',
    ticket: 'Boleto', bank_transfer: 'Transferência', account_money: 'Conta MP', prepaid_card: 'Pré-pago' }
  const type = m[p.payment_type] || p.payment_type || p.payment_method_id
  return p.installments > 1 ? `${type} (${p.installments}×)` : type
}

onMounted(() => { loadFacets(); refreshData(); fetchTodayStats() })
</script>

<style scoped>
/* ─── PAGE / HEADER ──────────────────────────────── */
.orders-page { background: #f0f2f5; min-height: 100vh; }
.page-header { background: #fff; border-bottom: 1px solid #e8eaed; padding: 14px 24px; }
.header-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #00897b, #00acc1);
  border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white;
}
.header-eyebrow { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title   { font-size: 17px; font-weight: 700; color: #1a1f36; }
.header-count   { font-size: 12px; font-weight: 600; color: #00897b; background: #e0f2f1; border-radius: 12px; padding: 2px 10px; }

/* ─── MINI DASHBOARD ────────────────────────────── */
.today-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #e8eaed;
  flex-wrap: wrap;
}
.today-bar-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: #9aa0ac;
  display: flex;
  align-items: center;
  white-space: nowrap;
  margin-right: 4px;
}
.today-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  padding: 8px 14px;
  min-width: 160px;
  flex: 1;
  max-width: 220px;
  transition: box-shadow .15s;
}
.today-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.today-card--pos  { border-left: 3px solid #0d9488; }
.today-card--neg  { border-left: 3px solid #ef4444; }
.today-card--neutral { border-left: 3px solid #6366f1; }
.today-card--skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  height: 58px;
  border-radius: 10px;
  flex: 1;
  max-width: 220px;
}
@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
.today-card-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: #f0f9f8;
  display: flex; align-items: center; justify-content: center;
  color: #0d9488;
  flex-shrink: 0;
}
.today-card--neg .today-card-icon { background: #fef2f2; color: #ef4444; }
.today-card--neutral .today-card-icon { background: #eef2ff; color: #6366f1; }
.today-card-body { min-width: 0; }
.today-card-val   { font-size: 15px; font-weight: 700; color: #1a1f36; line-height: 1.2; }
.today-card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: #9aa0ac; margin-top: 1px; }
.today-card-sub   { font-size: 10px; color: #b0b7c3; margin-top: 1px; }

/* ─── FILTROS ────────────────────────────────────── */
.fb {
  background: #fff;
  border-bottom: 1px solid #e8edf3;
  padding: 12px 24px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Toolbar ─────────────────────────────────────── */
.fb-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fb-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  background: #f5f7fa;
  border: 1.5px solid #e8edf3;
  border-radius: 10px;
  transition: border-color .18s, box-shadow .18s, background .18s;
  min-width: 0;
}
.fb-search.focused,
.fb-search.filled { background: #fff; }
.fb-search.focused {
  border-color: #00897b;
  box-shadow: 0 0 0 3px rgba(0,137,123,.1);
}
.fb-search-icon { color: #c5ccd8; flex-shrink: 0; transition: color .18s; }
.fb-search.focused .fb-search-icon { color: #00897b; }
.fb-search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 13.5px; color: #1a1f36; font-family: inherit; min-width: 0;
}
.fb-search-input::placeholder { color: #c5ccd8; }
.fb-search-clear {
  background: none; border: none; cursor: pointer; padding: 0;
  color: #c5ccd8; display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%; transition: background .15s, color .15s;
  flex-shrink: 0;
}
.fb-search-clear:hover { background: #f0f2f7; color: #4a5568; }

/* Toolbar actions */
.fb-toolbar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.fb-btn-group {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border: 1.5px solid #e8edf3;
  border-radius: 10px;
  overflow: hidden;
}
.fb-tbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 13px;
  font-size: 12.5px;
  font-weight: 600;
  color: #606880;
  background: transparent;
  border: none;
  border-right: 1.5px solid #e8edf3;
  cursor: pointer;
  transition: background .15s, color .15s;
  white-space: nowrap;
  font-family: inherit;
}
.fb-tbtn:last-child { border-right: none; }
.fb-tbtn:hover { background: #edf0f7; color: #2d3748; }
.fb-tbtn--active { background: #e0f2f1; color: #00695c; }
.fb-tbtn--active:hover { background: #b2dfdb; }

.fb-adv-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 16px; height: 16px;
  background: #00897b; color: #fff;
  border-radius: 10px; font-size: 10px; font-weight: 700;
  padding: 0 4px; margin-left: 2px;
}
.fb-search-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 36px; padding: 0 16px;
  font-size: 12.5px; font-weight: 700; color: #fff;
  background: #00897b; border: 1.5px solid #00897b; border-radius: 10px;
  cursor: pointer; transition: all .15s; white-space: nowrap; font-family: inherit;
}
.fb-search-btn:hover { background: #00695c; border-color: #00695c; }

.fb-clear-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 36px; padding: 0 13px;
  font-size: 12.5px; font-weight: 600; color: #e53e3e;
  background: #fff5f5; border: 1.5px solid #fecaca; border-radius: 10px;
  cursor: pointer; transition: all .15s; white-space: nowrap; font-family: inherit;
}
.fb-clear-btn:hover { background: #fecaca; border-color: #fc8181; }

.fb-menu-header {
  font-size: 9px !important; font-weight: 700 !important;
  text-transform: uppercase; letter-spacing: .6px;
  color: #9aa0ac !important; padding: 8px 14px 4px !important;
}

/* ── Filter bar (comboboxes) ─────────────────────── */
.fb-filterbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* Combo wrapper: botão + botão clear lado a lado */
.fb-combo {
  display: inline-flex;
  align-items: stretch;
  border: 1.5px solid #e8edf3;
  border-radius: 8px;
  background: #f5f7fa;
  transition: border-color .15s, background .15s, box-shadow .15s;
  overflow: hidden;
}
.fb-combo:hover { border-color: #c5cfe0; background: #edf0f7; }
.fb-combo--on {
  background: #e6f7f5;
  border-color: #4db6ac;
  box-shadow: 0 0 0 2px rgba(0,137,123,.08);
}
.fb-combo--on:hover { background: #cceee9; border-color: #26a69a; }

.fb-combo-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px 0 11px;
  font-size: 12.5px;
  font-weight: 500;
  color: #5a6478;
  background: transparent;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  min-width: 0;
}
.fb-combo--on .fb-combo-btn { color: #00695c; font-weight: 600; }

.fb-combo-ico { color: inherit; opacity: .65; flex-shrink: 0; }
.fb-combo-label { min-width: 0; }
.fb-combo-multi {
  font-size: 10.5px; font-weight: 700;
  background: #00897b; color: #fff;
  border-radius: 8px; padding: 1px 5px; margin-left: 2px;
}
.fb-combo--on .fb-combo-multi { background: #00695c; }
.fb-combo-arrow { color: #b0b8c4; flex-shrink: 0; margin-left: 2px; }

/* Botão × para limpar (dentro do combo) */
.fb-combo-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  background: transparent;
  border: none;
  border-left: 1px solid rgba(0,137,123,.2);
  cursor: pointer;
  color: #00897b;
  padding: 0;
  transition: background .13s, color .13s;
  flex-shrink: 0;
}
.fb-combo-clear:hover { background: rgba(220,20,60,.1); color: #b91c1c; }

/* Dropdown menu */
.fb-menu {
  border-radius: 10px !important;
  box-shadow: 0 6px 24px rgba(0,0,0,.13) !important;
  border: 1px solid #e2e8f0 !important;
  overflow: hidden;
}
.fb-menu-item {
  min-height: 38px !important;
  padding: 6px 14px 6px 10px !important;
  transition: background .12s !important;
}
.fb-menu-item:hover { background: #f5f7fa !important; }
.fb-menu-item--on { background: #f0faf9 !important; }
.fb-menu-item--on:hover { background: #e0f2f1 !important; }
.fb-menu-item-label {
  font-size: 13px !important;
  color: #1a1f36 !important;
  font-weight: 500 !important;
}
.fb-menu-item--on .fb-menu-item-label { color: #00695c !important; font-weight: 600 !important; }
.fb-menu :deep(.q-item__section--side) { padding-right: 8px; min-width: 0; }
.fb-menu :deep(.q-checkbox__bg) { border-radius: 5px !important; }

/* ── Filter index ────────────────────────────────── */
.fb-index {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.fb-index-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #fff;
  border-bottom: 1px solid #f0f3f8;
}
.fb-index-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: #374151;
}
.fb-index-count {
  font-size: 10px;
  font-weight: 700;
  color: #00897b;
  background: #e0f2f1;
  border-radius: 10px;
  padding: 1px 7px;
}
.fb-index-clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #9a3412;
  background: #ffedd5;
  border: 1px solid #fdba74;
  border-radius: 20px;
  padding: 2px 9px;
  cursor: pointer;
  font-family: inherit;
  transition: all .13s;
}
.fb-index-clear:hover { background: #ef4444; border-color: #ef4444; color: #fff; }

.fb-index-rows { padding: 4px 0; }
.fb-index-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 14px;
  min-height: 32px;
}
.fb-index-row:not(:last-child) { border-bottom: 1px solid #f5f7fa; }
.fb-index-cat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  color: #9aa0ac;
  text-transform: uppercase;
  letter-spacing: .5px;
  white-space: nowrap;
  min-width: 90px;
  flex-shrink: 0;
}
.fb-index-pills {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.fb-index-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 2px 9px 2px 9px;
  cursor: pointer;
  transition: all .13s;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0,0,0,.04);
}
.fb-index-pill:hover { background: #fef2f2; border-color: #fca5a5; color: #b91c1c; }
.fb-index-pill--teal { background: #f0fdfa; border-color: #99f6e4; color: #0f766e; }
.fb-index-pill--teal:hover { background: #fef2f2; border-color: #fca5a5; color: #b91c1c; }

/* ── Advanced panel ──────────────────────────────── */
.fb-adv {
  background: #f5f7fb;
  border: 1.5px solid #e4e9f2;
  border-radius: 12px;
  padding: 14px;
}
.fb-adv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.fb-adv-card {
  background: #fff;
  border: 1px solid #e8edf3;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,.05);
}
.fb-adv-card-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #9faab8;
  text-transform: uppercase;
  letter-spacing: .6px;
  border-bottom: 1px solid #f0f3f8;
  padding-bottom: 8px;
}
.fb-adv-inputs { display: flex; align-items: center; gap: 6px; }
.fb-adv-input  { flex: 1; min-width: 0; }
.fb-adv-input :deep(.q-field__control) { background: #f8fafd; border-radius: 8px; }
.fb-adv-sep { font-size: 14px; color: #c5ccd8; flex-shrink: 0; font-weight: 600; }

.fb-mode-toggle { flex-shrink: 0; }
.fb-mode-toggle :deep(.q-btn) { min-width: 28px !important; font-weight: 700 !important; font-size: 11px !important; }

.fb-flags-row { display: flex; flex-direction: column; gap: 2px; }
.fb-flag-check {
  border-radius: 8px !important;
  padding: 6px 8px !important;
  min-height: 0 !important;
  transition: background .13s !important;
}
.fb-flag-check:hover { background: #f5f7fa !important; }
.fb-flag-check :deep(.q-item__section--side) { padding-right: 8px; min-width: 0; }
.fb-flag-check-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 500; color: #374151;
}

/* ── Date fields ─────────────────────────────────── */
.fb-date-field {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.fb-date-label {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: .5px;
  pointer-events: none;
}
.fb-date-field--filled .fb-date-label { color: #00897b; }
.fb-date-input {
  width: 100%;
  height: 34px;
  padding: 0 30px 0 10px;
  border: 1.5px solid #e8edf3;
  border-radius: 8px;
  background: #f8fafd;
  font-size: 12.5px;
  color: #1a1f36;
  font-family: inherit;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
  box-sizing: border-box;
}
.fb-date-input:focus {
  border-color: #00897b;
  box-shadow: 0 0 0 2px rgba(0,137,123,.1);
  background: #fff;
}
.fb-date-field--filled .fb-date-input {
  border-color: #4db6ac;
  background: #fff;
}
.fb-date-clear {
  position: absolute;
  right: 6px;
  bottom: 6px;
  background: #e8edf3;
  border: none;
  border-radius: 50%;
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #6b7280;
  transition: background .13s, color .13s;
  padding: 0;
}
.fb-date-clear:hover { background: #fca5a5; color: #b91c1c; }

/* ── Active bar → replaced by fb-index above ──────── */

/* ── Transitions ─────────────────────────────────── */
.slide-adv-enter-active, .slide-adv-leave-active {
  transition: max-height .25s ease, opacity .25s ease;
  overflow: hidden;
}
.slide-adv-enter-from, .slide-adv-leave-to { max-height: 0; opacity: 0; }
.slide-adv-enter-to, .slide-adv-leave-from { max-height: 500px; opacity: 1; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.margin-range-sep { font-size: 12px; color: #b0b8c4; flex-shrink: 0; padding: 0 2px; }


/* ─── DIALOG: FILTROS AVANÇADOS (fadv-*) ──────────── */
.fadv-panel {
  width: 380px;
  max-width: 100vw;
  background: #fff;
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.fadv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 16px;
  border-bottom: 1px solid #e8edf3;
  flex-shrink: 0;
}
.fadv-header-left { display: flex; align-items: center; gap: 12px; }
.fadv-header-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #00897b, #00acc1);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
}
.fadv-header-title { font-size: 15px; font-weight: 700; color: #1a1f36; line-height: 1.2; }
.fadv-header-sub   { font-size: 11px; color: #9aa0ac; margin-top: 1px; }
.fadv-body { padding: 0; }
.fadv-section {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.fadv-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.fadv-divider { height: 1px; background: #f0f3f8; margin: 0 20px; }
.fadv-row { display: flex; align-items: flex-end; gap: 8px; }
.fadv-row--col { flex-direction: column; gap: 6px; }
.fb-date-input--dt { font-size: 12px; padding-right: 10px; }
.fadv-input { flex: 1; min-width: 0; }
.fadv-input :deep(.q-field__control) { border-radius: 8px; }
.fadv-range-sep {
  font-size: 16px; color: #c5ccd8; flex-shrink: 0;
  font-weight: 600; padding-bottom: 8px;
}
.fadv-flags { display: flex; flex-direction: column; gap: 6px; }
.fadv-flag-item {
  border-radius: 10px !important;
  border: 1.5px solid #f0f3f8 !important;
  padding: 10px 12px !important;
  min-height: 0 !important;
  transition: border-color .15s, background .15s !important;
}
.fadv-flag-item:hover { background: #f8fafd !important; border-color: #c8d8e8 !important; }
.fadv-flag-item :deep(.q-item__section--side) { padding-right: 10px; min-width: 0; }
.fadv-flag-label { display: flex; align-items: center; gap: 10px; }
.fadv-flag-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.fadv-flag-icon--indigo { background: #ede9fe; color: #5b21b6; }
.fadv-flag-icon--green  { background: #dcfce7; color: #15803d;  }
.fadv-flag-name { font-size: 13px; font-weight: 600; color: #1a1f36; }
.fadv-flag-desc { font-size: 11px; color: #9aa0ac; margin-top: 1px; }
.fadv-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 1px solid #e8edf3;
  flex-shrink: 0;
  background: #fff;
}

/* ─── TABLE ──────────────────────────────────────── */
.table-wrapper { padding: 16px 24px; }
.orders-table  { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
.orders-table :deep(.q-table__top)    { display: none; }
.orders-table :deep(.q-table__bottom) { border-top: 1px solid #f0f2f5; font-size: 12px; }
.orders-thead :deep(th) {
  font-size: 10px; font-weight: 700; color: #9aa0ac;
  text-transform: uppercase; letter-spacing: .7px;
  background: #f8f9fa; border-bottom: 2px solid #e8eaed; padding: 10px 14px;
}
.order-row :deep(td) {
  padding: 12px 14px; vertical-align: top;
  border-bottom: 1px solid #f5f6fa; cursor: pointer; transition: background .12s;
}
.order-row:hover :deep(td) { background: #f8fbff; }

/* ─── CELL: PRODUTO ──────────────────────────────── */
.cell-produto  { min-width: 230px; }
.produto-main  { display: flex; align-items: flex-start; gap: 10px; }

/* PACK items list in produto cell */
.pack-items-list  { display: flex; flex-direction: column; gap: 3px; }
.pack-item-line   { display: flex; align-items: center; gap: 4px; font-size: 11px; line-height: 1.3; }
.pack-item-qty    { color: #6366f1; font-weight: 700; font-size: 10px; flex-shrink: 0; }
.pack-item-title  { color: #1a1f36; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.pack-item-sku    { color: #9aa0ac; font-size: 9px; flex-shrink: 0; }

/* PACK sub-orders below the main ID */
.pack-sub-orders  { font-size: 9px; color: #b0b8c4; margin-top: 2px; letter-spacing: 0; }

.thumb-wrap    { position: relative; flex-shrink: 0; width: 44px; height: 44px; border-radius: 8px; overflow: hidden; border: 1px solid #e8eaed; background: #f8f9fa; display: flex; align-items: center; justify-content: center; }
.thumb-img     { width: 100%; height: 100%; object-fit: cover; }
.thumb-count   { position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,.55); color: white; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px 0 0 0; }
.thumb-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.produto-info  { flex: 1; min-width: 0; }
.produto-title { font-size: 12px; font-weight: 600; color: #2d3748; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.produto-ids   { display: flex; align-items: center; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.id-chip       { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-family: 'Roboto Mono', monospace; color: #718096; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 5px; }
.id-chip.sku   { color: #4a5568; }
.produto-meta  { display: flex; align-items: center; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.pedido-sub    { display: flex; align-items: center; gap: 8px; margin-top: 7px; padding-top: 6px; border-top: 1px dashed #f0f2f5; }
.pedido-id     { font-family: 'Roboto Mono', monospace; font-size: 11px; font-weight: 600; color: #00897b; cursor: pointer; }
.pedido-id:hover .copy-icon { opacity: 1; }
.copy-icon     { opacity: 0; transition: opacity .15s; }
.account-chip  { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 600; color: #00897b; background: #e0f2f1; border-radius: 4px; padding: 1px 5px; }
.ctx-badge     { display: inline-flex; align-items: center; gap: 2px; font-size: 9px; font-weight: 700; border-radius: 4px; padding: 1px 5px; }
.pack-badge    { background: #ede7f6; color: #6a1b9a; }
.catalog-badge { background: #e8eaf6; color: #283593; }

/* ─── CELL: DATA ─────────────────────────────────── */
.cell-data  { min-width: 75px; }
.data-day   { font-size: 12px; font-weight: 600; color: #2d3748; }
.data-time  { font-size: 11px; color: #718096; margin-top: 1px; }
.data-ago   { font-size: 10px; color: #b0bec5; margin-top: 3px; }

/* ─── CELL: COMPRADOR ────────────────────────────── */
.cell-comprador { min-width: 100px; }
.buyer-name { font-size: 12px; font-weight: 500; color: #2d3748; }
.buyer-loc  { font-size: 10px; color: #9aa0ac; margin-top: 3px; display: flex; align-items: center; gap: 2px; }

/* ─── CELL: LOGÍSTICA ────────────────────────────── */
.cell-logistica { min-width: 150px; display: flex; flex-direction: column; gap: 5px; cursor: pointer; }
.cell-logistica:hover .logistic-hint { opacity: 1; }
.logistic-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; border-radius: 6px; padding: 3px 7px; width: fit-content; }
.log-full    { background: #fff3e0; color: #e65100; }
.log-coleta  { background: #e3f2fd; color: #1565c0; }
.log-agencia { background: #f3e5f5; color: #6a1b9a; }
.log-flex    { background: #f1f8e9; color: #33691e; }
.log-default { background: #f5f5f5; color: #546e7a; }

/* Mini stepper */
.mini-stepper   { display: flex; align-items: center; gap: 3px; }
.mini-dot       { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; cursor: default; }
.mini-inactive  { background: #e8eaed; }
.mini-done      { background: #b2dfdb; }
.mini-active    { background: #00897b; box-shadow: 0 0 0 2px #b2f5ea; }
.mini-cancelled { background: #ffcdd2; }
.mini-label     { font-size: 10px; color: #718096; margin-left: 4px; white-space: nowrap; }

/* Alerta de ação */
.action-alert {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 9px; font-weight: 700; color: #c05621;
  background: #fff3e0; border-radius: 4px; padding: 2px 6px;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .7; } }

.logistic-hint { font-size: 9px; color: #b0bec5; opacity: 0; transition: opacity .15s; display: flex; align-items: center; gap: 2px; }

/* ─── CELLS: FINANCEIRO ──────────────────────────── */
.cell-amount  { text-align: right; }
.amount-main  { font-size: 14px; font-weight: 700; color: #1a1f36; }
.amount-sub   { font-size: 10px; color: #9aa0ac; margin-top: 2px; }
.coupon-chip  { display: inline-flex; align-items: center; gap: 2px; margin-top: 3px; font-size: 9px; font-weight: 600; color: #c05621; background: #fffaf0; border-radius: 4px; padding: 1px 5px; }
.flex-credit-hint { font-size: 9px; color: #0d9488; margin-top: 2px; display: flex; align-items: center; gap: 2px; justify-content: flex-end; }

.cell-fee     { text-align: right; }
.fee-main     { font-size: 13px; font-weight: 700; color: #e53e3e; }
.fee-pct      { font-size: 10px; color: #9aa0ac; margin-top: 2px; }
.fee-type     { font-size: 10px; color: #c0c6cf; }
.fee-breakdown-row { display: flex; align-items: center; justify-content: flex-end; gap: 5px; margin-top: 3px; padding-top: 3px; border-top: 1px dashed #f0e8e0; }
.fee-breakdown-label { font-size: 9px; color: #b0bec5; display: flex; align-items: center; gap: 2px; }
.fee-breakdown-val   { font-size: 10px; font-weight: 600; color: #e07b39; }
.taxa-row .fee-breakdown-label { color: #e65100; }
.taxa-val { color: #e65100; font-weight: 700; }

.cell-frete    { text-align: right; }
.frete-main    { font-size: 13px; font-weight: 700; color: #c05621; }
.frete-sub     { font-size: 10px; color: #9aa0ac; margin-top: 1px; display: flex; align-items: center; justify-content: flex-end; gap: 2px; }
.frete-type    { display: inline-flex; align-items: center; gap: 2px; font-size: 9px; border-radius: 3px; padding: 1px 4px; }
.free-flag     { background: #e0f2f1; color: #00695c; }
.partial-flag  { background: #fff3e0; color: #e65100; }
.frete-audit   { font-size: 9px; color: #b0bec5; margin-top: 2px; }
.frete-gratis  { font-size: 12px; font-weight: 700; color: #38a169; display: flex; align-items: center; justify-content: flex-end; gap: 3px; }
.flex-badge    { color: #0d9488; font-weight: 700; }
.flex-repasse-hint { font-size: 9px; color: #0d9488; margin-top: 2px; font-weight: 600; }

.cell-liquido  { text-align: right; }
.liquido-main  { font-size: 15px; font-weight: 700; }
.liquido-main.pos { color: #276749; }
.liquido-main.neg { color: #c53030; }
.liquido-hint  { font-size: 9px; color: #c5ccd6; margin-top: 1px; }
.margin-pill   { font-size: 10px; font-weight: 700; border-radius: 20px; padding: 2px 7px; display: inline-block; margin-top: 3px; }
.margin-pos    { background: #f0fff4; color: #276749; }
.margin-neg    { background: #fff5f5; color: #c53030; }

/* ─── STATUS PILLS ───────────────────────────────── */
.s-pill {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 600; border-radius: 20px;
  padding: 3px 8px; white-space: nowrap;
}
.pill-sm     { font-size: 10px; padding: 2px 6px; }
.pill-green  { background: #f0fff4; color: #276749; }
.pill-orange { background: #fffaf0; color: #c05621; }
.pill-red    { background: #fff5f5; color: #c53030; }
.pill-blue   { background: #ebf8ff; color: #2b6cb0; }
.pill-teal   { background: #e6fffa; color: #234e52; }
.pill-purple { background: #faf5ff; color: #553c9a; }
.pill-grey   { background: #f7fafc; color: #718096; }

/* ─── DIALOG PANELS ──────────────────────────────── */
.detail-panel { width: 600px; max-width: 100vw; height: 100vh; background: #fff; display: flex; flex-direction: column; }
.detail-panel--loading { align-items: center; justify-content: center; }
.detail-header { padding: 16px 22px 14px; border-bottom: 1px solid #e8eaed; flex-shrink: 0; }
.dialog-eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #9aa0ac; display: flex; align-items: center; margin-bottom: 4px; }
.detail-order-id { font-family: 'Roboto Mono', monospace; font-size: 16px; font-weight: 700; color: #1a1f36; }
.detail-meta     { font-size: 11px; color: #9aa0ac; margin-top: 2px; }
.detail-body     { padding: 14px 22px 32px; }
.detail-section  { margin-bottom: 20px; }
.section-title   { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #9aa0ac; margin-bottom: 10px; display: flex; align-items: center; }

/* ─── ITEMS TABLE (dialog) ───────────────────────── */
.items-table { border: 1px solid #e8eaed; border-radius: 8px; overflow: hidden; font-size: 12px; }
.items-thead { display: flex; align-items: center; gap: 8px; background: #f8f9fa; padding: 7px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #9aa0ac; border-bottom: 1px solid #e8eaed; }
.items-row   { display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; border-bottom: 1px solid #f5f5f5; }
.items-row:last-child { border-bottom: none; }
.item-thumb-sm { width: 32px; height: 32px; flex-shrink: 0; border-radius: 6px; overflow: hidden; border: 1px solid #e8eaed; background: #f8f9fa; display: flex; align-items: center; justify-content: center; }
.item-thumb-sm img { width: 100%; height: 100%; object-fit: cover; }
.item-title-d { font-weight: 500; color: #2d3748; font-size: 12px; line-height: 1.3; }
.item-meta-d  { font-size: 10px; color: #9aa0ac; margin-top: 1px; font-family: 'Roboto Mono', monospace; }
.fee-d        { font-weight: 700; color: #e53e3e; font-size: 12px; }
.fee-d-sub    { font-size: 10px; color: #9aa0ac; }

/* ─── RECEIPT (dialog) ───────────────────────────── */
.receipt { background: #fafbfc; border: 1px solid #e8eaed; border-radius: 8px; padding: 2px 0; }
.receipt-row { display: flex; align-items: flex-start; justify-content: space-between; padding: 7px 14px; gap: 12px; }
.receipt-row.sub-row { padding-left: 22px; }
.receipt-row.total-row { padding: 10px 14px; }
.receipt-label      { font-size: 12px; color: #4a5568; }
.receipt-label-bold { font-size: 13px; font-weight: 700; color: #1a1f36; }
.receipt-label-g    { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.receipt-sub        { font-size: 10px; color: #9aa0ac; }
.receipt-value      { font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.receipt-val-g      { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.receipt-total      { font-size: 15px; font-weight: 700; }
.receipt-sep        { border-top: 1px solid #e8eaed; margin: 2px 14px; }
.receipt-sep.thick  { border-top: 2px solid #e8eaed; margin: 3px 14px; }
.cmv-total-row { border-top: 1px dashed #e8eaed; margin-top: 2px; }
.pos-t  { color: #276749; }
.neg-t  { color: #c53030; }
.ded-t  { color: #e53e3e; }
.free-t { color: #38a169; }
.freight-audit { margin-top: 5px; background: #fff; border: 1px solid #e8eaed; border-radius: 5px; padding: 5px 8px; display: flex; flex-direction: column; gap: 2px; }
.audit-row     { display: flex; justify-content: space-between; font-size: 10px; color: #718096; }
.audit-row.hl  { color: #e53e3e; font-weight: 600; }
.audit-row strong { font-weight: 600; }

/* ─── FLEX FREIGHT NOTE ─────────────────────────── */
.flex-freight-note {
  display: flex; align-items: flex-start; gap: 10px;
  background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px;
  padding: 12px 14px; margin-bottom: 4px;
}
.flex-freight-title { font-size: 12px; font-weight: 700; color: #0f766e; }
.flex-freight-desc  { font-size: 11px; color: #5eead4; margin-top: 2px; line-height: 1.4; color: #0d9488; }

/* ─── ACTION CALLOUT (logistics dialog) ─────────── */
.action-callout {
  display: flex; align-items: flex-start; gap: 12px;
  background: #fff8e1; border: 1px solid #ffe082; border-radius: 10px;
  padding: 14px 16px; margin-bottom: 20px;
}
.action-callout-icon { color: #f59e0b; flex-shrink: 0; }
.action-callout-title { font-size: 13px; font-weight: 700; color: #92400e; margin-bottom: 3px; }
.action-callout-desc  { font-size: 12px; color: #78350f; line-height: 1.4; }

/* ─── TIMELINE (logistics dialog) ───────────────── */
.timeline-note { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: #718096; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 8px 10px; margin-bottom: 14px; line-height: 1.4; }
.timeline { display: flex; flex-direction: column; }
.timeline-item { display: flex; gap: 12px; }

/* Coluna do dot */
.tl-dot-col { display: flex; flex-direction: column; align-items: center; width: 28px; flex-shrink: 0; }
.tl-dot     { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tl-line    { width: 2px; flex: 1; min-height: 16px; }

/* Conteúdo */
.tl-content { padding-bottom: 18px; flex: 1; min-width: 0; }
.tl-label   { font-size: 13px; font-weight: 600; }
.tl-desc    { font-size: 11px; color: #9aa0ac; margin-top: 2px; }
.tl-action  { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #c05621; background: #fff3e0; border-radius: 4px; padding: 3px 7px; margin-top: 4px; width: fit-content; }
.tl-date    { font-size: 10px; color: #9aa0ac; margin-top: 3px; }

/* Estados da timeline */
.tl-done .tl-dot    { background: #e6fffa; color: #00897b; }
.tl-done .tl-line   { background: #b2dfdb; }
.tl-done .tl-label  { color: #4a5568; }

.tl-active .tl-dot  { background: #00897b; color: white; box-shadow: 0 0 0 3px #b2f5ea; }
.tl-active .tl-line { background: #e8eaed; }
.tl-active .tl-label { color: #1a1f36; font-weight: 700; }

.tl-pending .tl-dot  { background: #f0f2f5; color: #c5ccd6; }
.tl-pending .tl-line { background: #f0f2f5; }
.tl-pending .tl-label { color: #c5ccd6; }

.tl-cancelled .tl-dot  { background: #fff5f5; color: #c53030; }
.tl-cancelled .tl-line { background: #fed7d7; }
.tl-cancelled .tl-label { color: #c53030; }

/* ─── TRACKING GRID (logistics dialog) ──────────── */
.tracking-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #e8eaed; border-radius: 8px; overflow: hidden; }
.t-item        { padding: 9px 13px; border-bottom: 1px solid #f0f2f5; border-right: 1px solid #f0f2f5; }
.t-item:nth-child(even)      { border-right: none; }
.t-item:nth-last-child(-n+2) { border-bottom: none; }
.t-label    { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #9aa0ac; margin-bottom: 2px; }
.t-value    { font-size: 12px; font-weight: 500; color: #2d3748; }
.t-value.delivered { color: #276749; font-weight: 600; }
.t-sub      { color: #9aa0ac; font-size: 10px; }
.mono       { font-family: 'Roboto Mono', monospace; font-size: 11px; }

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .page-header {
    padding: 10px 12px;
  }

  .today-bar {
    padding: 8px 12px;
    overflow-x: auto;
    flex-wrap: nowrap;
    scrollbar-width: none;
    gap: 8px;
  }

  .today-bar::-webkit-scrollbar { display: none; }

  .today-card {
    min-width: 130px;
    padding: 7px 10px;
    flex-shrink: 0;
  }

  .today-card-val {
    font-size: 13px;
  }

  .fb {
    padding: 10px 12px 12px;
  }

  .table-wrapper {
    padding: 8px 12px;
  }

  .detail-panel {
    width: 100vw !important;
  }
}

/* ── KPIs do período filtrado (feedback #8) ── */
.period-kpis {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  padding: 10px 20px; margin: 0 20px 4px;
  background: #fff; border: 1px solid #e8ecf1; border-radius: 10px;
}
.pk-item { display: flex; flex-direction: column; }
.pk-label { font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #8a94a6; cursor: help; }
.pk-val { font-size: 16px; font-weight: 700; color: #1a1f36; }
.pk-sub { font-size: 11px; font-weight: 600; color: #8a94a6; }
.pk-item--warn .pk-val { color: #c2410c; }
.pk-note { margin-left: auto; font-size: 10px; color: #b0b8c4; font-style: italic; }
.units-badge {
  display: inline-block; min-width: 26px; text-align: center;
  background: #eef2f7; color: #3d4a5c; border-radius: 6px;
  padding: 2px 6px; font-size: 11px; font-weight: 700;
}
</style>
