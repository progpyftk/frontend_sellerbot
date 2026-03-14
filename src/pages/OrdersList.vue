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

    <!-- ── FILTROS ───────────────────────────────────────── -->
    <div class="filters-bar">
      <div class="row q-col-gutter-sm items-center">
        <div class="col-12 col-md-4">
          <q-input v-model="filters.search" debounce="600" placeholder="Nº Pedido, comprador, SKU..."
            outlined dense bg-color="white" clearable color="teal-7" class="filter-input">
            <template #prepend><q-icon name="search" color="grey-5" size="18px" /></template>
          </q-input>
        </div>
        <div class="col-6 col-md-2">
          <q-select v-model="filters.account" :options="accountOptions" option-value="id" option-label="nickname"
            label="Conta" outlined dense bg-color="white" emit-value map-options multiple clearable
            color="teal-7" class="filter-input">
            <template #prepend><q-icon name="storefront" color="grey-5" size="16px" /></template>
          </q-select>
        </div>
        <div class="col-6 col-md-2">
          <q-select v-model="filters.status" :options="orderStatusOptions" option-value="value"
            option-label="label" label="Status" outlined dense bg-color="white" emit-value map-options
            multiple clearable color="teal-7" class="filter-input">
            <template #prepend><q-icon name="flag" color="grey-5" size="16px" /></template>
          </q-select>
        </div>
        <div class="col-6 col-md-2">
          <q-select v-model="filters.shipment_status" :options="shipmentStatusOptions" option-value="value"
            option-label="label" label="Envio" outlined dense bg-color="white" emit-value map-options
            clearable color="teal-7" class="filter-input">
            <template #prepend><q-icon name="local_shipping" color="grey-5" size="16px" /></template>
          </q-select>
        </div>
        <div class="col-6 col-md-2 row q-gutter-x-xs items-center justify-end">
          <q-btn flat dense color="grey-6" icon="filter_alt_off" @click="clearFilters" size="sm">
            <q-tooltip>Limpar filtros</q-tooltip>
          </q-btn>
          <div class="filter-divider" />
          <q-btn-dropdown flat dense color="grey-7" label="Visões" icon="bolt" size="sm" no-icon-animation>
            <q-list dense style="min-width:180px">
              <q-item clickable v-close-popup @click="setFilterHandling">
                <q-item-section avatar><q-icon name="print" color="orange-7" size="16px" /></q-item-section>
                <q-item-section>Aguardando Etiqueta</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="setFilterReadyToShip">
                <q-item-section avatar><q-icon name="inventory" color="teal-7" size="16px" /></q-item-section>
                <q-item-section>Pronto para Coleta</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="setFilterCancelled">
                <q-item-section avatar><q-icon name="cancel" color="red-7" size="16px" /></q-item-section>
                <q-item-section>Cancelados</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </div>
      <div v-if="hasActiveFilters" class="row items-center q-gutter-xs q-mt-sm">
        <span class="text-caption text-grey-6">Filtros:</span>
        <q-chip v-if="filters.search" dense removable color="teal-1" text-color="teal-8"
          @remove="filters.search = ''">"{{ filters.search }}"</q-chip>
        <q-chip v-if="filters.status?.length" dense removable color="blue-1" text-color="blue-8"
          @remove="filters.status = []">{{ filters.status.join(', ') }}</q-chip>
        <q-chip v-if="filters.shipment_status" dense removable color="purple-1" text-color="purple-8"
          @remove="filters.shipment_status = null">Envio: {{ filters.shipment_status }}</q-chip>
      </div>
    </div>

    <!-- ── TABELA ─────────────────────────────────────────── -->
    <div class="table-wrapper">
      <q-table :rows="orders" :columns="columns" row-key="order_id" flat :loading="loading"
        v-model:pagination="pagination" @request="onRequest" binary-state-sort
        class="orders-table" no-data-label="Nenhuma venda encontrada."
        :rows-per-page-options="[10, 20, 50]">

        <template #header="props">
          <q-tr :props="props" class="orders-thead">
            <q-th v-for="col in props.cols" :key="col.name" :props="props"
              :class="col.align === 'right' ? 'text-right' : 'text-left'">
              {{ col.label }}
            </q-th>
          </q-tr>
        </template>

        <template #body="props">
          <q-tr :props="props" class="order-row" @click="openFinancial(props.row)">

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
            <q-td key="logistica" :props="props" @click.stop="openLogistics(props.row)">
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
                <div class="amount-main">{{ formatCurrency(props.row.total_amount) }}</div>
                <div v-if="(props.row.items || []).length" class="amount-sub">
                  {{ props.row.items.length }} item{{ props.row.items.length > 1 ? 's' : '' }}
                  · {{ props.row.items[0]?.quantity }}×
                </div>
                <div v-if="(props.row.coupon_amount || 0) > 0" class="coupon-chip">
                  <q-icon name="local_offer" size="9px" />-{{ formatCurrency(props.row.coupon_amount) }}
                </div>
              </div>
            </q-td>

            <!-- ⑦ Tarifa ML ──────────────────────────── -->
            <q-td key="tarifa" :props="props" align="right">
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
            <q-td key="frete" :props="props" align="right">
              <div class="cell-frete">
                <template v-if="getSellerShippingCost(props.row) > 0">
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
            <q-td key="liquido" :props="props" align="right">
              <div class="cell-liquido">
                <div :class="['liquido-main', getNetMargin(props.row) >= 0 ? 'pos' : 'neg']">
                  {{ formatCurrency(getNetMargin(props.row)) }}
                </div>
                <div :class="['margin-pill', getNetMargin(props.row) >= 0 ? 'margin-pos' : 'margin-neg']">
                  {{ calculateMarginPct(props.row) }}% margem
                </div>
                <div class="liquido-hint">s/ CMV</div>
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
                <div class="receipt-row">
                  <span class="receipt-label">(+) Venda Bruta</span>
                  <span class="receipt-value pos-t">+{{ formatCurrency(selectedOrder.total_amount) }}</span>
                </div>
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

                    <!-- Flex: seller faz a entrega, sem custo de transportadora ML -->
                    <template v-if="selectedOrder.shipment?.logistic_mode === 'self_service'">
                      <span class="receipt-sub" style="color:#0d9488">
                        <q-icon name="directions_bike" size="10px" /> Entrega Flex — sem custo de transportadora ML
                      </span>
                    </template>

                    <!-- Outros: exibe descrição baseada no cost_type -->
                    <template v-else>
                      <span class="receipt-sub" v-if="selectedOrder.shipment?.cost_type">
                        <template v-if="selectedOrder.shipment.cost_type === 'free'">Frete grátis p/ comprador — seller arca com o custo</template>
                        <template v-else-if="selectedOrder.shipment.cost_type === 'partially_free'">Frete subsidiado — comprador pagou {{ formatCurrency(selectedOrder.shipment.shipping_cost) }}</template>
                        <template v-else-if="selectedOrder.shipment.cost_type === 'charged'">Frete por conta do comprador</template>
                      </span>
                      <div v-if="selectedOrder.shipment?.list_cost" class="freight-audit">
                        <div class="audit-row"><span>ML cobrou</span><strong>{{ formatCurrency(selectedOrder.shipment.list_cost) }}</strong></div>
                        <div class="audit-row"><span>Comprador pagou</span><strong>{{ formatCurrency(selectedOrder.shipment.shipping_cost || 0) }}</strong></div>
                        <div class="audit-row hl"><span>Seller paga</span><strong>{{ formatCurrency(getSellerShippingCost(selectedOrder)) }}</strong></div>
                      </div>
                    </template>
                  </div>
                  <span class="receipt-value" :class="getSellerShippingCost(selectedOrder) > 0 ? 'ded-t' : 'free-t'">
                    {{ getSellerShippingCost(selectedOrder) > 0 ? '-' + formatCurrency(getSellerShippingCost(selectedOrder)) : 'Grátis' }}
                  </span>
                </div>
                <!-- Repasse Flex: ML credita ao seller o frete pago pelo comprador -->
                <div v-if="Number(selectedOrder.fee_breakdown?.flex_credit || 0) > 0" class="receipt-row sub-row">
                  <div class="receipt-label-g">
                    <span class="receipt-label">(+) Repasse Flex</span>
                    <span class="receipt-sub" style="color:#0d9488">
                      <q-icon name="directions_bike" size="10px" /> Frete pago pelo comprador — ML repassa ao seller
                    </span>
                  </div>
                  <span class="receipt-value pos-t">+{{ formatCurrency(selectedOrder.fee_breakdown.flex_credit) }}</span>
                </div>
                <div class="receipt-sep thick" />
                <div class="receipt-row total-row">
                  <span class="receipt-label-bold">(=) Líquido (s/ CMV)</span>
                  <div class="receipt-val-g">
                    <span :class="['receipt-total', getNetMargin(selectedOrder) >= 0 ? 'pos-t' : 'neg-t']">
                      {{ formatCurrency(getNetMargin(selectedOrder)) }}
                    </span>
                    <span :class="['margin-pill', getNetMargin(selectedOrder) >= 0 ? 'margin-pos' : 'margin-neg']">
                      {{ calculateMarginPct(selectedOrder) }}% margem
                    </span>
                  </div>
                </div>
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
              <div v-if="logisticsOrder.shipment.logistic_mode === 'self_service'" class="flex-freight-note">
                <q-icon name="directions_bike" size="16px" class="q-mr-sm" color="teal-6" />
                <div>
                  <div class="flex-freight-title">Entrega Flex — sem custo de frete ML</div>
                  <div class="flex-freight-desc">Você mesmo realiza a entrega. O ML não cobra serviço de transportadora neste modo.</div>
                </div>
              </div>

              <div v-else class="receipt">
                <div class="receipt-row">
                  <span class="receipt-label">ML cobrou pelo serviço</span>
                  <span class="receipt-value">{{ formatCurrency(logisticsOrder.shipment.list_cost) }}</span>
                </div>
                <div class="receipt-row sub-row">
                  <span class="receipt-label">Comprador pagou</span>
                  <span class="receipt-value pos-t">{{ formatCurrency(logisticsOrder.shipment.shipping_cost || 0) }}</span>
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

  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar, copyToClipboard, date } from 'quasar'

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
    }
  }
  return result
}

// ============================================================================
// 1. ESTADO
// ============================================================================
const orders        = ref([])
const loading       = ref(false)
const financialOpen = ref(false)
const logisticsOpen = ref(false)
const selectedOrder = ref(null)   // para dialog financeiro
const logisticsOrder = ref(null)  // para dialog logístico
const detailLoading = ref(false)

const pagination = ref({
  sortBy: 'date_created', descending: true, page: 1, rowsPerPage: 20, rowsNumber: 0
})

const columns = [
  { name: 'produto',      label: 'PRODUTO / PEDIDO',   field: 'order_id',      align: 'left',  sortable: true, style: 'min-width:250px' },
  { name: 'data_venda',   label: 'DATA',               field: 'date_created',  align: 'left',  sortable: true, style: 'min-width:90px' },
  { name: 'comprador',    label: 'COMPRADOR',          field: 'buyer_nickname',align: 'left',  style: 'min-width:110px' },
  { name: 'status_venda', label: 'STATUS',             field: 'status',        align: 'left',  style: 'min-width:90px' },
  { name: 'logistica',    label: 'LOGÍSTICA',          field: 'shipment',      align: 'left',  style: 'min-width:160px' },
  { name: 'venda',        label: 'BRUTO',              field: 'total_amount',  align: 'right', sortable: true, style: 'min-width:85px' },
  { name: 'tarifa',       label: 'TARIFA ML',          field: 'total_fee',     align: 'right', style: 'min-width:90px' },
  { name: 'frete',        label: 'FRETE',              field: 'shipping_cost', align: 'right', style: 'min-width:85px' },
  { name: 'liquido',      label: 'LÍQUIDO',            field: 'net',           align: 'right', style: 'min-width:105px' },
]

// ============================================================================
// 2. FILTROS
// ============================================================================
const availableAccounts = ref([])
const filters = reactive({
  search: '', account: [], status: [], shipment_status: null, logistic_type: null, dateFrom: null, dateTo: null
})
const hasActiveFilters = computed(() =>
  filters.search || filters.account?.length || filters.status?.length || filters.shipment_status
)
const orderStatusOptions = [
  { label: 'Pago',             value: 'paid' },
  { label: 'Aguardando Pagto', value: 'payment_required' },
  { label: 'Cancelado',        value: 'cancelled' }
]
const shipmentStatusOptions = [
  { label: 'Pendente',        value: 'pending' },
  { label: 'Preparando',      value: 'handling' },
  { label: 'Etiqueta Pronta', value: 'ready_to_ship' },
  { label: 'Em Trânsito',     value: 'shipped' },
  { label: 'Entregue',        value: 'delivered' }
]

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
  search: '', account: [], status: [], shipment_status: null, logistic_type: null, dateFrom: null, dateTo: null
})
const clearFilters         = () => resetFiltersState()
const setFilterHandling    = () => { resetFiltersState(); filters.status = ['paid']; filters.shipment_status = 'handling' }
const setFilterReadyToShip = () => { resetFiltersState(); filters.status = ['paid']; filters.shipment_status = 'ready_to_ship' }
const setFilterCancelled   = () => { resetFiltersState(); filters.status = ['cancelled'] }

let filterTimer
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    if (pagination.value.page !== 1) pagination.value.page = 1
    else refreshData()
  }, 400)
}, { deep: true })

// ============================================================================
// 4. DATA FETCHING
// ============================================================================
const loadFacets = async () => {
  try {
    const { data } = await MercadoLivreService.listAccounts()
    availableAccounts.value = data.map(a => ({ id: a.account_id, nickname: a.account_nickname }))
  } catch (e) { console.error(e) }
}
const refreshData = () => onRequest({ pagination: pagination.value })
const onRequest = async (props) => {
  const { page, rowsPerPage, sortBy, descending } = props.pagination
  loading.value = true
  try {
    const params = {
      page, page_size: rowsPerPage,
      ordering: descending ? `-${sortBy}` : sortBy,
      search:                  filters.search || undefined,
      account:                 filters.account?.length  ? filters.account.join(',') : undefined,
      status:                  filters.status?.length   ? filters.status.join(',')  : undefined,
      shipment__status:        filters.shipment_status  || undefined,
      shipment__logistic_type: filters.logistic_type    || undefined,
      date_created__gte:       filters.dateFrom ? `${filters.dateFrom}T00:00:00` : undefined,
      date_created__lte:       filters.dateTo   ? `${filters.dateTo}T23:59:59`   : undefined,
    }
    Object.keys(params).forEach(k => params[k] == null && delete params[k])
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
  selectedOrder.value = row
  financialOpen.value = true
  await ensurePayments(row)
  selectedOrder.value = { ...row }
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
const getOrderFeeBreakdown = (row) => {
  const fb = row.fee_breakdown
  if (fb) {
    const b = Number(row.total_amount || 0)
    const fee = Number(fb.total_sale_fee || 0)
    return {
      totalSaleFee:    fee,
      totalCommission: fee,
      totalTaxaFixa:   0,
      anyTaxaFixa:     false,
      effectivePct:    b > 0 ? (fee / b) * 100 : 0,
    }
  }
  // fallback: sem fee_breakdown, soma item.total_fee
  const items = row.items || []
  const totalSaleFee = items.reduce((s, i) => s + Number(i.total_fee || 0), 0)
  const b = Number(row.total_amount || 0)
  return { totalSaleFee, totalCommission: totalSaleFee, totalTaxaFixa: 0, anyTaxaFixa: false,
    effectivePct: b > 0 ? (totalSaleFee / b) * 100 : 0 }
}

const getSellerShippingCost = (row) => Number(row.shipment?.seller_shipping_cost || 0)
const getNetMargin = (row) => {
  if (row.fee_breakdown) return Number(row.fee_breakdown.net_received || 0)
  return Number(row.total_amount || 0) - getOrderFeeBreakdown(row).totalSaleFee - getSellerShippingCost(row)
}
const calculateMarginPct = (row) => {
  const t = Number(row.total_amount || 0)
  return t === 0 ? 0 : Math.round((getNetMargin(row) / t) * 100)
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

onMounted(() => { loadFacets(); refreshData() })
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

/* ─── FILTROS ────────────────────────────────────── */
.filters-bar { background: #fff; border-bottom: 1px solid #e8eaed; padding: 10px 24px; }
.filter-input :deep(.q-field__control) { border-radius: 8px; }
.filter-divider { width: 1px; height: 18px; background: #e0e0e0; }

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
</style>
