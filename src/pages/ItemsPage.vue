<template>
  <q-page class="items-page">

    <!-- ── HEADER ──────────────────────────────────────────── -->
    <div class="page-header">
      <div class="row items-center justify-between no-wrap">
        <div class="row items-center q-gutter-x-md">
          <div class="header-icon">
            <q-icon name="inventory_2" size="22px" />
          </div>
          <div>
            <div class="header-eyebrow">Mercado Livre</div>
            <div class="header-title">Meus Anúncios</div>
          </div>
          <div v-if="pagination.rowsNumber" class="header-count">
            {{ pagination.rowsNumber }} anúncios
          </div>
        </div>
        <q-btn unelevated color="teal-7" icon="refresh" label="Atualizar"
          @click="refreshData" :loading="loading" size="sm" class="q-px-md" />
      </div>
    </div>



    <!-- ── FILTROS ──────────────────────────────────────────── -->
    <div class="fb">

      <!-- Toolbar -->
      <div class="fb-toolbar">
        <div class="fb-search" :class="{ focused: searchFocused, filled: !!filters.search }">
          <q-icon name="search" size="18px" class="fb-search-icon" />
          <input
            v-model="filters.search"
            class="fb-search-input"
            placeholder="Buscar por título, SKU ou MLB..."
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
          <transition name="fade">
            <button v-if="filters.search" class="fb-search-clear" @click="filters.search = ''">
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
                <q-item v-for="opt in sortOptions" :key="opt.field + opt.desc"
                  clickable v-close-popup @click="applySort(opt)">
                  <q-item-section>{{ opt.label }}</q-item-section>
                  <q-item-section side v-if="pagination.sortBy === opt.field && pagination.descending === opt.desc">
                    <q-icon name="check" color="teal-7" size="14px" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
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
                    @update:model-value="toggleAccountFilter(acc.id)" @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ acc.nickname }}</q-item-section>
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
              <template v-else-if="filters.status.length === 1">{{ statusOptions.find(o=>o.value===filters.status[0])?.label || 'Status' }}</template>
              <template v-else>Status <span class="fb-combo-multi">+{{ filters.status.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.status?.length" class="fb-combo-clear" @click.stop="filters.status = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:180px">
              <q-item v-for="opt in statusOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.status?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleStatusFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.status?.includes(opt.value)"
                    @update:model-value="toggleStatusFilter(opt.value)" @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Logística -->
        <div class="fb-combo" :class="filters.logistic_type?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="local_shipping" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.logistic_type?.length">Logística</template>
              <template v-else-if="filters.logistic_type.length === 1">{{ logisticOptions.find(o=>o.value===filters.logistic_type[0])?.label || 'Logística' }}</template>
              <template v-else>Logística <span class="fb-combo-multi">+{{ filters.logistic_type.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.logistic_type?.length" class="fb-combo-clear" @click.stop="filters.logistic_type = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:210px">
              <q-item v-for="opt in logisticOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.logistic_type?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleLogisticFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.logistic_type?.includes(opt.value)"
                    @update:model-value="toggleLogisticFilter(opt.value)" @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

        <!-- Tipo de Anúncio -->
        <div class="fb-combo" :class="filters.listing_type?.length && 'fb-combo--on'">
          <button class="fb-combo-btn">
            <q-icon name="rocket_launch" size="14px" class="fb-combo-ico" />
            <span class="fb-combo-label">
              <template v-if="!filters.listing_type?.length">Tipo</template>
              <template v-else-if="filters.listing_type.length === 1">{{ listingTypeOptions.find(o=>o.value===filters.listing_type[0])?.label || 'Tipo' }}</template>
              <template v-else>Tipo <span class="fb-combo-multi">+{{ filters.listing_type.length }}</span></template>
            </span>
            <q-icon name="expand_more" size="14px" class="fb-combo-arrow" />
          </button>
          <button v-if="filters.listing_type?.length" class="fb-combo-clear" @click.stop="filters.listing_type = []">
            <q-icon name="close" size="11px" />
          </button>
          <q-menu fit anchor="bottom left" self="top left" class="fb-menu">
            <q-list style="min-width:220px">
              <q-item v-for="opt in listingTypeOptions" :key="opt.value" clickable
                :class="['fb-menu-item', filters.listing_type?.includes(opt.value) && 'fb-menu-item--on']"
                @click.stop="toggleListingTypeFilter(opt.value)">
                <q-item-section side>
                  <q-checkbox :model-value="filters.listing_type?.includes(opt.value)"
                    @update:model-value="toggleListingTypeFilter(opt.value)" @click.stop color="teal-7" dense />
                </q-item-section>
                <q-item-section class="fb-menu-item-label">{{ opt.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </div>

      </div>

      <!-- ── FILTROS AVANÇADOS (inline fixo) ──────────────────── -->
      <div class="fadv-inline">

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Estoque</div>
          <div class="fadv-options">
            <label v-for="opt in stockOptions" :key="opt.value" class="fadv-radio"
              :class="filters.stockStatus === opt.value && 'fadv-radio--on'">
              <input type="radio" :value="opt.value" v-model="filters.stockStatus" />
              {{ opt.label }}
            </label>
          </div>
        </div>

        <div class="fadv-inline-sep"></div>

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Frete Grátis</div>
          <div class="fadv-options">
            <label v-for="opt in booleanOptions" :key="String(opt.value)" class="fadv-radio"
              :class="filters.free_shipping === opt.value && 'fadv-radio--on'">
              <input type="radio" :value="opt.value" v-model="filters.free_shipping" />
              {{ opt.label }}
            </label>
          </div>
        </div>

        <div class="fadv-inline-sep"></div>

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Flex</div>
          <div class="fadv-options">
            <label v-for="opt in booleanOptions" :key="String(opt.value)" class="fadv-radio"
              :class="filters.is_flex === opt.value && 'fadv-radio--on'">
              <input type="radio" :value="opt.value" v-model="filters.is_flex" />
              {{ opt.label }}
            </label>
          </div>
        </div>

        <div class="fadv-inline-sep"></div>

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Catálogo</div>
          <div class="fadv-options">
            <label v-for="opt in booleanOptions" :key="String(opt.value)" class="fadv-radio"
              :class="filters.catalog_listing === opt.value && 'fadv-radio--on'">
              <input type="radio" :value="opt.value" v-model="filters.catalog_listing" />
              {{ opt.label }}
            </label>
          </div>
        </div>

        <div class="fadv-inline-sep"></div>

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Preço (R$)</div>
          <div class="fadv-range-row">
            <input class="fadv-input fadv-input--sm" type="number" placeholder="Mín" v-model.number="filters.priceMin" />
            <span class="fadv-range-sep">→</span>
            <input class="fadv-input fadv-input--sm" type="number" placeholder="Máx" v-model.number="filters.priceMax" />
          </div>
        </div>

        <div class="fadv-inline-sep"></div>

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Vendas Mín.</div>
          <input class="fadv-input fadv-input--sm" type="number" placeholder="Ex: 10" v-model.number="filters.soldMin" />
        </div>

        <div class="fadv-inline-sep"></div>

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Qualidade (%)</div>
          <div class="fadv-range-row">
            <input class="fadv-input fadv-input--sm" type="number" placeholder="Mín" v-model.number="filters.healthMin" />
            <span class="fadv-range-sep">→</span>
            <input class="fadv-input fadv-input--sm" type="number" placeholder="Máx" v-model.number="filters.healthMax" />
          </div>
        </div>

        <div class="fadv-inline-sep"></div>

        <div class="fadv-inline-section">
          <div class="fadv-inline-label">Desconto Mín. (%)</div>
          <input class="fadv-input fadv-input--sm" type="number" placeholder="Ex: 15" v-model.number="filters.discountMin" />
        </div>

      </div>

      <!-- Filter index -->
      <transition name="fade">
        <div v-if="hasActiveFilters" class="fb-index">
          <div class="fb-index-header">
            <div class="fb-index-title">
              <q-icon name="filter_alt" size="14px" color="teal-7" />
              <span>Filtrando</span>
              <span class="fb-index-count">
                {{ [filters.search?1:0, filters.account?.length?1:0, filters.status?.length?1:0,
                    filters.logistic_type?.length?1:0, filters.listing_type?.length?1:0,
                    advancedFilterCount].reduce((a,b)=>a+b,0) }} grupos
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
                <span class="fb-index-pill" @click="filters.search = ''">"{{ filters.search }}" <q-icon name="close" size="9px" /></span>
              </div>
            </div>
            <div v-if="filters.account?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="storefront" size="12px" />Conta</div>
              <div class="fb-index-pills">
                <span v-for="id in filters.account" :key="id" class="fb-index-pill" @click="toggleAccountFilter(id)">
                  {{ accountOptions.find(a=>a.id===id)?.nickname || id }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="filters.status?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="toggle_on" size="12px" />Status</div>
              <div class="fb-index-pills">
                <span v-for="s in filters.status" :key="s" class="fb-index-pill" @click="toggleStatusFilter(s)">
                  {{ statusOptions.find(o=>o.value===s)?.label || s }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="filters.logistic_type?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="local_shipping" size="12px" />Logística</div>
              <div class="fb-index-pills">
                <span v-for="l in filters.logistic_type" :key="l" class="fb-index-pill" @click="toggleLogisticFilter(l)">
                  {{ logisticOptions.find(o=>o.value===l)?.label || l }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="filters.listing_type?.length" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="rocket_launch" size="12px" />Tipo</div>
              <div class="fb-index-pills">
                <span v-for="t in filters.listing_type" :key="t" class="fb-index-pill" @click="toggleListingTypeFilter(t)">
                  {{ listingTypeOptions.find(o=>o.value===t)?.label || t }} <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
            <div v-if="advancedFilterCount > 0" class="fb-index-row">
              <div class="fb-index-cat"><q-icon name="tune" size="12px" />Avançados</div>
              <div class="fb-index-pills">
                <span v-if="filters.stockStatus" class="fb-index-pill" @click="filters.stockStatus = null">
                  Estoque: {{ stockOptions.find(o=>o.value===filters.stockStatus)?.label }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.free_shipping !== null" class="fb-index-pill" @click="filters.free_shipping = null">
                  Frete Grátis: {{ filters.free_shipping ? 'Sim' : 'Não' }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.is_flex !== null" class="fb-index-pill" @click="filters.is_flex = null">
                  Flex: {{ filters.is_flex ? 'Sim' : 'Não' }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.catalog_listing !== null" class="fb-index-pill" @click="filters.catalog_listing = null">
                  Catálogo: {{ filters.catalog_listing ? 'Sim' : 'Não' }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.priceMin || filters.priceMax" class="fb-index-pill" @click="filters.priceMin=null; filters.priceMax=null">
                  Preço: {{ filters.priceMin||'0' }} → {{ filters.priceMax||'∞' }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.soldMin" class="fb-index-pill" @click="filters.soldMin = null">
                  Vendas ≥ {{ filters.soldMin }} <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.healthMin || filters.healthMax" class="fb-index-pill" @click="filters.healthMin=null; filters.healthMax=null">
                  Qualidade: {{ filters.healthMin||'0' }}% → {{ filters.healthMax||'100' }}% <q-icon name="close" size="9px" />
                </span>
                <span v-if="filters.discountMin" class="fb-index-pill" @click="filters.discountMin = null">
                  Desconto ≥ {{ filters.discountMin }}% <q-icon name="close" size="9px" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>

    </div>



        <transition name="slide-fade">
          <div v-if="showMagicLink" class="q-pa-md bg-orange-1" style="border-bottom:1px solid #ffe0b2">
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
          </div>
        </transition>

        <!-- ── Barra de Ações em Massa ──────────────────────────── -->
        <transition name="slide-fade">
           <div v-if="canWrite && (selectedItems.length || selectAllFiltered)" class="bulk-bar-wrap">
            <!-- Barra principal de ações -->
            <div class="bulk-bar q-px-lg q-py-sm row items-center q-gutter-sm">
              <q-icon name="check_box" color="indigo-6" size="18px" />
              <span class="text-weight-bold text-indigo-8">
                <template v-if="selectAllFiltered">
                  Todos <strong>{{ pagination.rowsNumber }}</strong> filtrados selecionados
                </template>
                <template v-else>
                  {{ selectedItems.length }} selecionado(s)
                </template>
              </span>
              <q-separator vertical inset class="q-mx-xs" />
              <q-btn unelevated dense color="indigo-6" text-color="white" icon="sell"
                label="Preços" size="sm" class="q-px-md" @click="showBulkPriceDialog = true" />
              <q-btn unelevated dense color="orange-7" text-color="white" icon="local_offer"
                label="Promoção" size="sm" class="q-px-md" @click="showBulkPromoDialog = true" />
              <q-btn unelevated dense color="teal-7" text-color="white" icon="rocket_launch"
                label="Tipo Anúncio" size="sm" class="q-px-md" @click="showBulkListingTypeDialog = true" />
              <q-btn unelevated dense color="green-7" text-color="white" icon="inventory_2"
                label="Estoque" size="sm" class="q-px-md" @click="showBulkStockDialog = true" />
              <q-btn unelevated dense color="orange-8" text-color="white" icon="add_shopping_cart"
                label="Reativar" size="sm" class="q-px-md" @click="showBulkReactivateDialog = true" />
              <q-space />
              <q-btn flat dense color="grey-6" icon="close" label="Limpar seleção" size="sm"
                @click="clearSelection" />
            </div>

            <!-- Banner: selecionar todos filtrados -->
            <div v-if="!selectAllFiltered && allSelected && pagination.rowsNumber > items.length"
              class="select-all-filtered-bar q-px-lg q-py-xs row items-center q-gutter-sm">
              <q-icon name="info" color="indigo-5" size="14px" />
              <span class="text-caption text-indigo-8">
                Apenas os <strong>{{ items.length }}</strong> anúncios desta página estão selecionados.
              </span>
              <q-btn flat dense no-caps size="sm" color="indigo-7" class="q-px-sm"
                :label="`Selecionar todos os ${pagination.rowsNumber} filtrados`"
                @click="selectAllFiltered = true" />
            </div>

            <!-- Banner: todos filtrados selecionados -->
            <div v-if="selectAllFiltered"
              class="select-all-filtered-bar select-all-filtered-bar--active q-px-lg q-py-xs row items-center q-gutter-sm">
              <q-icon name="check_circle" color="teal-7" size="14px" />
              <span class="text-caption text-teal-8">
                Todos os <strong>{{ pagination.rowsNumber }}</strong> anúncios que correspondem ao filtro atual estão selecionados.
              </span>
            </div>
          </div>
        </transition>

        <div class="table-responsive">
        <q-table :rows="items" :columns="columns" row-key="item_id" flat :loading="loading"
          v-model:pagination="pagination" @request="onRequest" binary-state-sort
          :dense="$q.screen.lt.md"
          class="sticky-header-table my-custom-table" no-data-label="Nenhum anúncio encontrado.">
          <template v-slot:header="props">
            <q-tr :props="props" class="bg-grey-2 text-grey-8 text-uppercase text-caption">
              <q-th auto-width>
                 <q-checkbox v-if="canWrite" :model-value="allSelected" :indeterminate="someSelected"
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
                 <q-checkbox v-if="canWrite" :model-value="isSelected(props.row)" @update:model-value="toggleSelect(props.row)"
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
                     v-if="canWrite && (props.row.logistic_type === 'fulfillment' || props.row.is_full) && props.row.available_quantity <= 0"
                    unelevated round color="orange-1" text-color="orange-9" icon="open_in_new" size="sm"
                    class="transition-scale custom-btn-border" @click.stop="openSpaceManagement(props.row)">
                    <q-tooltip class="bg-orange-9 text-white text-weight-bold shadow-4" anchor="top middle"
                      self="bottom middle">
                      Resolver Full (Abre aba e copia MLB)
                    </q-tooltip>
                  </q-btn>

                  <q-btn
                     v-if="canWrite && props.row.logistic_type !== 'fulfillment' && !props.row.is_full && props.row.available_quantity <= 0"
                    unelevated round color="green-1" text-color="green-9" icon="add_shopping_cart" size="sm"
                    :loading="!!reactivatingItems[props.row.item_id]"
                    :disable="!!reactivatingItems[props.row.item_id]"
                    class="transition-scale custom-btn-border" @click.stop="reactivateItem(props.row)">
                    <q-tooltip class="bg-green-9 text-white text-weight-bold shadow-4" anchor="top middle"
                      self="bottom middle">
                      Reativar c/ 1 unidade
                    </q-tooltip>
                  </q-btn>

                  <q-btn unelevated round icon="local_offer" size="sm"
                    :color="hasActivePromotion(props.row) ? 'purple-1' : 'white'"
                    :text-color="hasActivePromotion(props.row) ? 'purple-9' : 'blue-grey-6'"
                    class="transition-scale custom-btn-border"
                    @click.stop="openPromotionsDialog(props.row)">
                    <!-- Ponto roxo = anúncio com promoção ativa, para não obrigar
                         a abrir o diálogo só para descobrir se tem alguma. -->
                    <q-badge v-if="hasActivePromotion(props.row)" floating rounded color="purple-6"
                      style="padding:3px" />
                    <q-tooltip class="bg-purple-9 text-white text-weight-bold shadow-4"
                      anchor="top middle" self="bottom middle">
                      {{ hasActivePromotion(props.row) ? 'Ver e remover promoções' : 'Promoções do anúncio' }}
                    </q-tooltip>
                  </q-btn>

                   <q-btn v-if="canWrite" unelevated round color="white" text-color="blue-grey-6" icon="edit" size="sm"
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
                    <div class="col-12">
                      <ItemPromotionsPanel v-if="props.expand" :item-id="props.row.item_id"
                        :can-write="canWrite" @changed="refreshItemAfterPromoChange(props.row)" />
                    </div>
                  </div>
                </div>
              </q-td>
            </q-tr>


          </template>
        </q-table>
        </div>

    <!-- ══ PROMOÇÕES DO ANÚNCIO (botão da coluna de ações) ═══════════════ -->
    <!-- Reaproveita o mesmo ItemPromotionsPanel da linha expandida: uma única
         implementação da listagem e da remoção, dois pontos de entrada. -->
    <q-dialog v-model="showPromotionsDialog">
      <q-card style="width:760px; max-width:95vw">
        <q-card-section class="row items-center q-pb-sm bg-purple-1">
          <q-icon name="local_offer" color="purple-9" size="sm" class="q-mr-sm" />
          <div>
            <div class="text-h6 text-grey-9">Promoções do anúncio</div>
            <div class="text-caption text-grey-7">
              {{ promotionsDialogRow?.item_id }} — {{ promotionsDialogRow?.title }}
            </div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" color="grey-7" v-close-popup />
        </q-card-section>
        <q-card-section>
          <ItemPromotionsPanel v-if="promotionsDialogRow" :key="promotionsDialogRow.item_id"
            :item-id="promotionsDialogRow.item_id" :can-write="canWrite"
            @changed="refreshItemAfterPromoChange(promotionsDialogRow)" />
        </q-card-section>
      </q-card>
    </q-dialog>

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
      <q-card style="min-width:min(500px, 95vw); max-width:95vw">

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

        <!-- ── Pausar promoções ao aumentar preço (Ajuste-aumentar e Exato) ── -->
        <q-card-section
          v-if="(bulkPriceForm.mode === 'adjust' && bulkPriceForm.direction === 'increase') || bulkPriceForm.mode === 'exact'"
          class="q-px-lg q-pt-none q-pb-md">
          <q-checkbox v-model="bulkPriceForm.pausePromotions" dense color="indigo-6"
            label="Pausar promoções ativas antes de aumentar o preço" />
          <div class="text-caption text-grey-6 q-ml-lg">
            Anúncios em promoção continuam mostrando o preço promocional pro comprador mesmo
            depois de aumentar o preço-base. Marque esta opção para pausar a(s) promoção(ões)
            ativa(s) de cada anúncio antes de aplicar o aumento.
          </div>
        </q-card-section>

        <!-- ── Modo: Atacado (PxQ) ─────────────────────────────────────── -->
        <q-card-section v-else-if="bulkPriceForm.mode === 'wholesale'" class="q-pa-lg column q-gutter-sm">
          <div class="text-caption text-grey-6 q-mb-xs">Máx. 3 faixas · Disponível apenas para compradores B2B · Preços devem diminuir conforme a quantidade aumenta</div>

          <div v-for="(tier, i) in bulkWholesaleForm.tiers" :key="i"
            class="row q-col-gutter-sm items-center q-pa-sm rounded-borders"
            :class="tier.value && tier.min_quantity ? 'bg-indigo-1' : 'bg-grey-1'">
            <div class="col-auto" style="min-width:28px">
              <q-chip dense square :color="tier.value && tier.min_quantity ? 'indigo-6' : 'grey-4'" text-color="white" size="sm">
                {{ i + 1 }}
              </q-chip>
            </div>
            <div class="col-3">
              <q-input v-model.number="tier.min_quantity" type="number" outlined dense
                label="Qtd mínima" color="indigo-6" min="1" />
            </div>
            <div class="col-4">
              <q-btn-toggle v-model="tier.priceType" dense unelevated
                :options="[{label:'% off',value:'pct'},{label:'R$ fixo',value:'abs'}]"
                color="grey-3" text-color="grey-8" toggle-color="indigo-6" toggle-text-color="white" />
            </div>
            <div class="col">
              <q-input v-model.number="tier.value" type="number" outlined dense
                :label="tier.priceType === 'pct' ? 'Desconto %' : 'Preço R$'"
                color="indigo-6" min="0.01"
                :hint="tier.priceType === 'pct' && tier.value ? `${tier.value}% de desconto` : ''" />
            </div>
          </div>

          <!-- Alerta de validação -->
          <q-banner v-if="wholesaleValidationError" dense rounded class="bg-red-1 text-red-9 q-mt-xs">
            <template v-slot:avatar><q-icon name="warning" color="red-7" size="16px" /></template>
            {{ wholesaleValidationError }}
          </q-banner>

          <q-banner dense class="bg-indigo-1 text-indigo-9 rounded-borders q-mt-xs">
            <template v-slot:avatar><q-icon name="info" color="indigo-6" size="16px" /></template>
            Faixas com "% off" são calculadas sobre o preço atual de cada anúncio. Faixas incompletas são ignoradas.
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
            :disable="!!wholesaleValidationError"
            @click="executeBulkWholesale" />
        </q-card-actions>

      </q-card>
    </q-dialog>

    <!-- ══ DIALOG 2: GERENCIAR PROMOÇÕES ══════════════════════════════════ -->
    <q-dialog v-model="showBulkPromoDialog" persistent>
      <q-card style="min-width:min(460px, 95vw); max-width:95vw">
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
            Remove todas as promoções ativas dos anúncios selecionados, de qualquer tipo
            (desconto individual, campanhas, relâmpago). Cada remoção é confirmada no
            Mercado Livre — anúncio em que a promoção resistir aparece na lista de erros.
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
      <q-card style="min-width:min(400px, 95vw); max-width:95vw">
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

    <!-- ══ DIALOG 4: ADICIONAR ESTOQUE EM MASSA ═══════════════════════════ -->
    <q-dialog v-model="showBulkStockDialog" persistent>
      <q-card style="min-width:min(360px, 95vw);max-width:min(480px, 95vw)">
        <q-card-section class="q-pb-none">
          <div class="text-h6 row items-center gap-sm">
            <q-icon name="inventory_2" color="green-7" size="22px" class="q-mr-sm" />
            Adicionar Estoque em Massa
          </div>
        </q-card-section>

        <q-card-section class="q-pa-lg column q-gutter-md">
          <q-banner class="bg-green-1 text-green-9 rounded-borders" dense>
            <template v-slot:avatar><q-icon name="info" color="green-7" size="16px" /></template>
            <span v-if="selectAllFiltered">
              Todos os <strong>{{ pagination.rowsNumber }}</strong> anúncios filtrados receberão o estoque definido.
              Anúncios Full serão ignorados automaticamente.
            </span>
            <span v-else>
              <strong>{{ selectedItems.length }}</strong> anúncio(s) selecionado(s).
              Anúncios Full serão ignorados automaticamente.
            </span>
          </q-banner>

          <q-input v-model.number="bulkStockForm.quantity" type="number" outlined dense
            label="Quantidade de estoque a definir"
            hint="Define o estoque absoluto de todos os anúncios selecionados para este valor"
            color="green-7" :rules="[v => v >= 0 || 'Deve ser ≥ 0']">
            <template v-slot:prepend><q-icon name="inventory_2" /></template>
          </q-input>

          <q-banner class="bg-amber-1 text-amber-9 rounded-borders text-caption" dense>
            <template v-slot:avatar><q-icon name="warning_amber" color="amber-7" size="14px" /></template>
            As atualizações são enfileiradas e processadas uma a uma para respeitar os limites da API do Mercado Livre.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Enfileirar Atualizações" color="green-7"
            :loading="bulkLoading"
            :disable="bulkStockForm.quantity === null || bulkStockForm.quantity < 0"
            @click="executeBulkStock" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── BULK REATIVAR ──────────────────────────────────────────────────── -->
    <q-dialog v-model="showBulkReactivateDialog" persistent>
      <q-card style="min-width:min(360px, 95vw);max-width:min(480px, 95vw)">
        <q-card-section class="q-pb-none">
          <div class="text-h6 row items-center">
            <q-icon name="add_shopping_cart" color="orange-8" size="22px" class="q-mr-sm" />
            Reativar Anúncios em Massa
          </div>
        </q-card-section>

        <q-card-section class="q-pa-lg column q-gutter-md">
          <q-banner class="bg-orange-1 text-orange-9 rounded-borders" dense>
            <template v-slot:avatar><q-icon name="info" color="orange-8" size="16px" /></template>
            <span v-if="selectAllFiltered">
              Todos os <strong>{{ pagination.rowsNumber }}</strong> anúncios filtrados serão reativados com <strong>1 unidade</strong>.
              Anúncios Full serão ignorados automaticamente.
            </span>
            <span v-else>
              <strong>{{ selectedItems.length }}</strong> anúncio(s) receberão <strong>1 unidade</strong> de estoque e serão reativados.
              Anúncios Full serão ignorados automaticamente.
            </span>
          </q-banner>

          <q-banner class="bg-amber-1 text-amber-9 rounded-borders text-caption" dense>
            <template v-slot:avatar><q-icon name="warning_amber" color="amber-7" size="14px" /></template>
            As reativações são enfileiradas e processadas uma a uma. O status será atualizado em alguns instantes.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Reativar Selecionados" color="orange-8" icon="add_shopping_cart"
            :loading="bulkLoading"
            @click="executeBulkReactivate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── RESULTADO DA AÇÃO EM MASSA (erros / avisos por item) ────────────── -->
    <q-dialog v-model="showBulkResultDialog">
      <q-card style="min-width:min(480px, 95vw); max-width:95vw">
        <q-card-section class="bg-grey-9 text-white row items-center q-pb-sm">
          <q-icon name="fact_check" size="sm" class="q-mr-sm" />
          <span class="text-h6">Resultado da Ação</span>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-list separator style="max-height:60vh" class="scroll">
          <q-item v-for="(r, i) in bulkResultItems" :key="r.item_id + i">
            <q-item-section avatar>
              <q-icon :name="r.kind === 'error' ? 'error' : 'warning_amber'"
                :color="r.kind === 'error' ? 'red-6' : 'amber-8'" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ r.title }}</q-item-label>
              <q-item-label caption>{{ r.message }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Fechar" color="grey-8" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import { useQuasar, copyToClipboard } from 'quasar'
import { useStore } from 'src/stores/store'
import ItemPromotionsPanel from 'src/components/items/ItemPromotionsPanel.vue'

const $q = useQuasar()
const authStore = useStore()
const canWrite = computed(() => authStore.canWrite)

// ============================================================================
// 1. ESTADO GLOBAL E TABELA
// ============================================================================
const items = ref([])
const loading = ref(false)
const reactivatingItems = reactive({}) // item_id → true enquanto reativação está em processamento

// ── Seleção múltipla ──────────────────────────────────────────────────────
const selectedItems = ref([])
const selectAllFiltered = ref(false)  // true = todos os itens do filtro (além da página atual)

// Set dos IDs selecionados — usado para checar a página atual contra a
// seleção acumulada de todas as páginas (ver toggleAll abaixo).
const selectedIdSet = computed(() => new Set(selectedItems.value.map(r => r.item_id)))
// "Selecionar todos" reflete se TODOS os itens desta página já estão na
// seleção acumulada (que pode incluir itens de outras páginas), não se o
// tamanho de selectedItems bate com o da página atual.
const allSelected = computed(() => items.value.length > 0 && items.value.every(r => selectedIdSet.value.has(r.item_id)))
const someSelected = computed(() => !allSelected.value && items.value.some(r => selectedIdSet.value.has(r.item_id)))
const isSelected = (row) => selectedIdSet.value.has(row.item_id)

const toggleSelect = (row) => {
  selectAllFiltered.value = false
  const idx = selectedItems.value.findIndex(r => r.item_id === row.item_id)
  if (idx === -1) selectedItems.value = [...selectedItems.value, row]
  else selectedItems.value = selectedItems.value.filter(r => r.item_id !== row.item_id)
}

const toggleAll = (val) => {
  selectAllFiltered.value = false
  // Soma/remove só os itens desta página à seleção acumulada — não substitui
  // o array inteiro, senão marcar "selecionar todos" em outra página descarta
  // a seleção feita em páginas anteriores.
  if (val) {
    const currentIds = new Set(items.value.map(r => r.item_id))
    const kept = selectedItems.value.filter(r => !currentIds.has(r.item_id))
    selectedItems.value = [...kept, ...items.value]
  } else {
    const currentIds = new Set(items.value.map(r => r.item_id))
    selectedItems.value = selectedItems.value.filter(r => !currentIds.has(r.item_id))
  }
}

const clearSelection = () => {
  selectedItems.value = []
  selectAllFiltered.value = false
}

// ── Dialogs bulk ──────────────────────────────────────────────────────────
const showBulkPriceDialog       = ref(false)
const showBulkPromoDialog       = ref(false)
const showBulkListingTypeDialog = ref(false)
const showBulkStockDialog       = ref(false)
const showBulkReactivateDialog  = ref(false)
const bulkLoading = ref(false)
const bulkStockForm = reactive({ quantity: null })

const bulkPriceForm = reactive({ mode: 'adjust', direction: 'increase', type: 'pct', value: null, pausePromotions: false })
const bulkPromoForm = reactive({ action: 'deactivate', dealPriceType: 'pct', dealPriceValue: null, finishDate: null })
const bulkListingTypeForm = reactive({ listing_type: 'gold_pro' })
const bulkWholesaleForm = reactive({
  tiers: [
    { min_quantity: 1,  priceType: 'abs', value: null },
    { min_quantity: 5,  priceType: 'pct', value: 10   },
    { min_quantity: 10, priceType: 'pct', value: 15   },
  ]
})

const wholesaleValidFilledTiers = computed(() =>
  bulkWholesaleForm.tiers.filter(t => t.value && t.min_quantity)
)

const wholesaleValidationError = computed(() => {
  const tiers = wholesaleValidFilledTiers.value
  if (tiers.length === 0) return 'Preencha ao menos uma faixa com quantidade e valor.'
  // Verifica se as quantidades estão em ordem crescente
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].min_quantity <= tiers[i-1].min_quantity)
      return `Faixa ${i+1}: a quantidade mínima deve ser maior que a faixa anterior.`
  }
  // Verifica que os preços % não ultrapassam 100%
  for (const t of tiers) {
    if (t.priceType === 'pct' && (t.value <= 0 || t.value >= 100))
      return `Desconto % deve ser entre 1 e 99.`
  }
  return null
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
const searchFocused = ref(false)
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

const hasActiveFilters = computed(() =>
  !!filters.search || filters.account?.length || filters.status?.length ||
  filters.logistic_type?.length || filters.listing_type?.length ||
  filters.stockStatus != null || filters.free_shipping != null ||
  filters.is_flex != null || filters.catalog_listing != null ||
  filters.priceMin || filters.priceMax || filters.soldMin ||
  filters.healthMin || filters.healthMax || filters.discountMin
)

const advancedFilterCount = computed(() => [
  filters.stockStatus != null,
  filters.free_shipping != null,
  filters.is_flex != null,
  filters.catalog_listing != null,
  !!(filters.priceMin || filters.priceMax),
  !!filters.soldMin,
  !!(filters.healthMin || filters.healthMax),
  !!filters.discountMin
].filter(Boolean).length)

const sortOptions = [
  { label: 'Título A→Z',          field: 'title',             desc: false },
  { label: 'Título Z→A',          field: 'title',             desc: true  },
  { label: 'Preço: menor → maior', field: 'price',            desc: false },
  { label: 'Preço: maior → menor', field: 'price',            desc: true  },
  { label: 'Mais vendidos',        field: 'sold_quantity',     desc: true  },
  { label: 'Menos vendidos',       field: 'sold_quantity',     desc: false },
  { label: 'Melhor qualidade',     field: 'performance_score', desc: true  },
  { label: 'Pior qualidade',       field: 'performance_score', desc: false },
]

const currentSortLabel = computed(() => {
  const opt = sortOptions.find(o => o.field === pagination.value.sortBy && o.desc === pagination.value.descending)
  return opt ? opt.label : 'Ordenar'
})

const applySort = (opt) => {
  pagination.value.sortBy = opt.field
  pagination.value.descending = opt.desc
  onRequest({ pagination: { ...pagination.value, page: 1 } })
}

const toggleAccountFilter = (id) => {
  const idx = filters.account.indexOf(id)
  if (idx === -1) filters.account.push(id)
  else filters.account.splice(idx, 1)
}
const toggleStatusFilter = (val) => {
  const idx = filters.status.indexOf(val)
  if (idx === -1) filters.status.push(val)
  else filters.status.splice(idx, 1)
}
const toggleLogisticFilter = (val) => {
  const idx = filters.logistic_type.indexOf(val)
  if (idx === -1) filters.logistic_type.push(val)
  else filters.logistic_type.splice(idx, 1)
}
const toggleListingTypeFilter = (val) => {
  const idx = filters.listing_type.indexOf(val)
  if (idx === -1) filters.listing_type.push(val)
  else filters.listing_type.splice(idx, 1)
}

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

// ── Promoções do anúncio (botão da coluna de ações) ───────────────────────
const showPromotionsDialog = ref(false)
const promotionsDialogRow = ref(null)

// Sinaliza promoção ativa sem consultar o ML: usa o que a listagem já trouxe.
// É só para o selo do botão — a verdade vem do painel, que lê ao vivo.
const hasActivePromotion = (row) => {
  const promos = Array.isArray(row?.promotions_info) ? row.promotions_info : []
  if (promos.some(p => p && ['started', 'pending'].includes(p.status))) return true
  return !!row?.active_promotion || row?.price_source === 'PROMOTION_INFO'
}

const openPromotionsDialog = (row) => {
  promotionsDialogRow.value = row
  showPromotionsDialog.value = true
}

// Após remover promoção: o backend já regravou promotions_info a partir da
// releitura no ML, então basta buscar o detalhe de novo para o preço efetivo
// e os badges da linha refletirem o estado novo.
const refreshItemAfterPromoChange = async (row) => {
  row._detail = null
  await ensureItemDetail(row)
  const detail = row._detail
  if (!detail) return
  Object.assign(row, {
    promotions_info: detail.promotions_info,
    effective_price: detail.effective_price,
    effective_regular_price: detail.effective_regular_price,
    price_source: detail.price_source,
    discount_percentage: detail.discount_percentage,
    active_promotion: detail.active_promotion,
  })
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

const showBulkResultDialog = ref(false)
const bulkResultItems = ref([])

const _bulkFinish = (result, closeRef) => {
  const successList = result.data?.success || []
  const errorList = result.data?.errors || []
  const warningList = result.data?.warnings || []
  const ok = successList.length
  const err = errorList.length
  const titleFor = (itemId) => selectedItems.value.find(r => r.item_id === itemId)?.title || itemId

  if (errorList.length === 0 && warningList.length === 0) {
    $q.notify({ type: 'positive', message: `${ok} anúncio(s) atualizado(s) com sucesso!`, position: 'top' })
  } else {
    bulkResultItems.value = [
      ...errorList.map(e => ({ item_id: e.item_id, title: titleFor(e.item_id), kind: 'error', message: e.error })),
      ...warningList.map(w => ({ item_id: w.item_id, title: titleFor(w.item_id), kind: 'warning', message: w.message })),
    ]
    showBulkResultDialog.value = true
    $q.notify({
      type: err > 0 ? (err === ok + err ? 'negative' : 'warning') : 'warning',
      message: err > 0
        ? `${ok} ok, ${err} erro(s). Veja os detalhes.`
        : `${ok} atualizado(s), ${warningList.length} com aviso. Veja os detalhes.`,
      position: 'top'
    })
  }
  closeRef.value = false
  selectedItems.value = []
  refreshData()
}

const executeBulkPriceUpdate = async () => {
  bulkLoading.value = true
  try {
    const base = {
      direction: bulkPriceForm.direction,
      type: bulkPriceForm.type,
      value: bulkPriceForm.value,
      pause_promotions: bulkPriceForm.direction === 'increase' && bulkPriceForm.pausePromotions,
    }
    const payload = selectAllFiltered.value
      ? { select_all: true, filters: buildFiltersPayload(), ...base }
      : { items: _itemsPayload(), ...base }
    const res = await MercadoLivreService.bulkPriceUpdate(payload)
    _bulkFinish(res, showBulkPriceDialog)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao alterar preços.' })
  } finally { bulkLoading.value = false }
}

const executeBulkPromo = async () => {
  bulkLoading.value = true
  try {
    let res
    const selectionBase = selectAllFiltered.value
      ? { select_all: true, filters: buildFiltersPayload() }
      : { items: _itemsPayload() }
    if (bulkPromoForm.action === 'deactivate') {
      res = await MercadoLivreService.bulkPromoDeactivate(selectionBase)
    } else {
      res = await MercadoLivreService.bulkPromoActivate({
        ...selectionBase,
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
    const payload = selectAllFiltered.value
      ? { select_all: true, filters: buildFiltersPayload(), listing_type_id: bulkListingTypeForm.listing_type }
      : { items: _itemsPayload(), listing_type_id: bulkListingTypeForm.listing_type }
    const res = await MercadoLivreService.bulkListingType(payload)
    _bulkFinish(res, showBulkListingTypeDialog)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao alterar tipo.' })
  } finally { bulkLoading.value = false }
}

const executeBulkWholesale = async () => {
  bulkLoading.value = true
  try {
    const tiers = bulkWholesaleForm.tiers.map(t => ({
      min_quantity: t.min_quantity,
      price_type: t.priceType,
      value: t.value
    })).filter(t => t.value && t.min_quantity)
    const payload = selectAllFiltered.value
      ? { select_all: true, filters: buildFiltersPayload(), tiers }
      : { items: _itemsPayload(), tiers }
    const res = await MercadoLivreService.bulkWholesale(payload)
    _bulkFinish(res, showBulkPriceDialog)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao definir atacado.' })
  } finally { bulkLoading.value = false }
}

const executeBulkExactPrice = async () => {
  bulkLoading.value = true
  try {
    const base = { price: bulkExactPriceForm.price, pause_promotions: bulkPriceForm.pausePromotions }
    const payload = selectAllFiltered.value
      ? { select_all: true, filters: buildFiltersPayload(), ...base }
      : { items: _itemsPayload(), ...base }
    const res = await MercadoLivreService.bulkExactPrice(payload)
    _bulkFinish(res, showBulkPriceDialog)
    bulkExactPriceForm.price = null
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao definir preço exato.' })
  } finally { bulkLoading.value = false }
}

const executeBulkReactivate = async () => {
  bulkLoading.value = true
  // Captura IDs antes de limpar a seleção (só em modo normal, não select_all)
  const selectedIds = selectAllFiltered.value
    ? []
    : selectedItems.value.filter(r => r.logistic_type !== 'fulfillment' && !r.is_full).map(r => r.item_id)

  try {
    const payload = selectAllFiltered.value
      ? { select_all: true, filters: buildFiltersPayload(), quantity: 1, set_active: true }
      : { items: _itemsPayload(), quantity: 1, set_active: true }
    const res = await MercadoLivreService.bulkStock(payload)
    const enqueued = res.data?.enqueued ?? 0
    const skippedFull = res.data?.skipped_full ?? 0
    $q.notify({
      type: 'positive',
      message: `${enqueued} reativação(ões) enfileirada(s)!${skippedFull ? ` ${skippedFull} Full ignorado(s).` : ''}`,
      position: 'top',
    })
    showBulkReactivateDialog.value = false
    clearSelection()

    // Liga o spinner em cada linha selecionada e apaga escalonado (~2,5s por item)
    // Limita a 15 itens visíveis para não arrastar muito tempo na tela
    const INTERVAL = 2500
    const MAX_STAGGER = 15
    selectedIds.forEach((id, i) => { reactivatingItems[id] = true })
    selectedIds.forEach((id, i) => {
      const delay = Math.min(i, MAX_STAGGER) * INTERVAL + 3000
      setTimeout(() => {
        delete reactivatingItems[id]
        // Atualiza tabela ao limpar o último spinner
        if (i === selectedIds.length - 1) refreshData()
      }, delay)
    })
    // Garante refresh mesmo se lista vazia (select_all) ou todos já removidos
    if (selectedIds.length === 0) setTimeout(() => refreshData(), 5000)

  } catch (e) {
    selectedIds.forEach(id => delete reactivatingItems[id])
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao enfileirar reativações.' })
  } finally {
    bulkLoading.value = false
  }
}

const buildFiltersPayload = () => {
  const p = {
    search: filters.search || undefined,
    account: filters.account?.length ? filters.account.join(',') : undefined,
    logistic_type: filters.logistic_type?.length ? filters.logistic_type.join(',') : undefined,
    status: filters.status?.length ? filters.status.join(',') : undefined,
    listing_type_id: filters.listing_type?.length ? filters.listing_type.join(',') : undefined,
    stock_status: filters.stockStatus || undefined,
    is_flex: filters.is_flex,
    free_shipping: filters.free_shipping,
    catalog_listing: filters.catalog_listing,
    price_min: filters.priceMin,
    price_max: filters.priceMax,
    sold_quantity_min: filters.soldMin,
    performance_score_min: filters.healthMin,
    performance_score_max: filters.healthMax,
    discount_pct_min: filters.discountMin
  }
  Object.keys(p).forEach(k => (p[k] === undefined || p[k] === null) && delete p[k])
  return p
}

const executeBulkStock = async () => {
  bulkLoading.value = true
  const selectedIds = selectAllFiltered.value
    ? []
    : selectedItems.value.filter(r => r.logistic_type !== 'fulfillment' && !r.is_full).map(r => r.item_id)

  try {
    const payload = selectAllFiltered.value
      ? { select_all: true, filters: buildFiltersPayload(), quantity: bulkStockForm.quantity }
      : { items: _itemsPayload(), quantity: bulkStockForm.quantity }
    const res = await MercadoLivreService.bulkStock(payload)
    const enqueued = res.data?.enqueued ?? 0
    const skippedFull = res.data?.skipped_full ?? 0
    $q.notify({
      type: 'positive',
      message: `${enqueued} anúncio(s) enfileirado(s)!${skippedFull ? ` ${skippedFull} Full ignorado(s).` : ''}`,
      position: 'top'
    })
    showBulkStockDialog.value = false
    bulkStockForm.quantity = null
    clearSelection()

    // Atualiza a tabela após os workers do GCP Tasks processarem (~2,5s/item)
    const INTERVAL = 2500
    const MAX_STAGGER = 15
    if (selectedIds.length > 0) {
      selectedIds.forEach((id, i) => {
        const delay = Math.min(i, MAX_STAGGER) * INTERVAL + 3000
        if (i === selectedIds.length - 1) setTimeout(() => refreshData(), delay)
      })
    } else {
      setTimeout(() => refreshData(), 5000)
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Erro ao enfileirar atualização de estoque.' })
  } finally {
    bulkLoading.value = false
  }
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
    reactivatingItems[row.item_id] = true
    try {
      await MercadoLivreService.reactivateItem(row.item_id, 1)
      $q.notify({
        type: 'positive',
        message: 'Reativação enviada! O anúncio será atualizado em breve.',
        position: 'top',
        timeout: 4000,
      })
      // Aguarda 4s para o worker processar e atualiza a linha
      setTimeout(() => {
        delete reactivatingItems[row.item_id]
        refreshData()
      }, 4000)
    } catch (error) {
      delete reactivatingItems[row.item_id]
      const msg = error.response?.data?.message || 'Erro ao comunicar com a API do Mercado Livre.'
      $q.notify({ type: 'negative', message: msg, position: 'top' })
    }
  })
}

</script>

<style scoped>
.bulk-bar-wrap {
  background: #fff;
  border-top: 1.5px solid #c5cae9;
}
.bulk-bar {
  background: #e8eaf6;
  border-bottom: 1px solid #c5cae9;
}
.select-all-filtered-bar {
  background: #eef2ff;
  border-bottom: 1px solid #c7d2fe;
  font-size: 13px;
}
.select-all-filtered-bar--active {
  background: #f0fdf4;
  border-bottom: 1px solid #bbf7d0;
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


.hover-underline:hover {
  text-decoration: underline;
}

/* ═══ Design system ══════════════════════════════════════════════════ */
.items-page { background: #f5f7fa; }

/* ── Page header ── */
.page-header {
  background: #fff;
  padding: 14px 20px;
  border-bottom: 1.5px solid #e8edf3;
}
.header-icon {
  width: 34px; height: 34px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #0d9488, #2dd4bf); color: #fff;
}
.header-eyebrow { font-size: 10px; color: #9aa0ac; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
.header-title   { font-size: 16px; font-weight: 700; color: #1a1f36; }
.header-count   { font-size: 12px; color: #9aa0ac; background: #f0f2f5; border-radius: 20px; padding: 2px 10px; }

/* ── Filter bar (fb) ── */
.fb { background: #fff; border-bottom: 1px solid #e8edf3; }

.fb-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px 0;
  flex-wrap: wrap;
}
.fb-search {
  display: flex; align-items: center; gap: 6px;
  flex: 1; min-width: 180px; max-width: 340px;
  height: 34px; border-radius: 8px;
  border: 1.5px solid #e3e6eb; background: #f8f9fb;
  padding: 0 10px;
  transition: border-color .15s, background .15s;
}
.fb-search.focused, .fb-search.filled { border-color: #0d9488; background: #fff; }
.fb-search-icon { color: #b0b7c3; flex-shrink: 0; }
.fb-search-input {
  flex: 1; border: none; background: transparent;
  font-size: 13px; color: #1a1f36; outline: none;
}
.fb-search-clear {
  background: none; border: none; cursor: pointer; color: #b0b7c3;
  padding: 0; display: flex; align-items: center;
}
.fb-search-clear:hover { color: #1a1f36; }

.fb-toolbar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.fb-btn-group { display: flex; }

.fb-tbtn {
  display: flex; align-items: center; gap: 5px;
  height: 32px; padding: 0 12px; border-radius: 7px;
  border: 1.5px solid #e3e6eb; background: #fff;
  font-size: 12px; font-weight: 500; color: #4b5563;
  cursor: pointer; transition: all .15s;
  white-space: nowrap;
}
.fb-tbtn:hover { background: #f5f7fa; }
.fb-tbtn--active { border-color: #0d9488; color: #0d9488; background: #f0faf9; }
.fb-adv-badge {
  background: #0d9488; color: #fff;
  font-size: 10px; font-weight: 700; border-radius: 10px;
  padding: 1px 5px; min-width: 16px; text-align: center;
}
.fb-clear-btn {
  display: flex; align-items: center; gap: 4px;
  height: 30px; padding: 0 10px; border-radius: 7px;
  border: none; background: none; font-size: 12px;
  color: #ef4444; cursor: pointer;
  transition: background .15s;
}
.fb-clear-btn:hover { background: #fef2f2; }

/* ── Filterbar (pill comboboxes) ── */
.fb-filterbar {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px 10px; flex-wrap: wrap;
}
.fb-combo {
  position: relative; display: flex; align-items: center;
  border: 1.5px solid #e3e6eb; border-radius: 20px;
  background: #fff; transition: border-color .15s;
  overflow: visible;
}
.fb-combo:hover { border-color: #c8cdd6; }
.fb-combo--on   { border-color: #0d9488; background: #f0faf9; }
.fb-combo-btn {
  display: flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 10px 0 9px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; font-weight: 500; color: #374151;
  border-radius: 20px;
}
.fb-combo--on .fb-combo-btn { color: #0d9488; }
.fb-combo-ico   { color: #9aa0ac; flex-shrink: 0; }
.fb-combo--on .fb-combo-ico { color: #0d9488; }
.fb-combo-label { white-space: nowrap; }
.fb-combo-multi {
  background: #0d9488; color: #fff; border-radius: 10px;
  font-size: 10px; font-weight: 700; padding: 0 5px;
}
.fb-combo-arrow { color: #9aa0ac; transition: transform .15s; }
.fb-combo-clear {
  display: flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: #0d9488; border: none; cursor: pointer;
  color: #fff; margin-right: 5px; flex-shrink: 0;
}
.fb-combo-clear:hover { background: #0a7a72; }

/* ── Filter menu ── */
.fb-menu { border-radius: 10px !important; box-shadow: 0 4px 20px rgba(0,0,0,.1) !important; }
.fb-menu-item { transition: background .1s; }
.fb-menu-item--on { background: #f0faf9 !important; }
.fb-menu-item-label { font-size: 13px; }

/* ── Filter index ── */
.fb-index { border-top: 1px solid #f0f2f5; padding: 8px 16px; background: #f8f9fb; }
.fb-index-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.fb-index-title { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #6b7280; }
.fb-index-count { background: #e5e7eb; border-radius: 10px; padding: 0 7px; font-size: 10px; }
.fb-index-clear { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #ef4444; background: none; border: none; cursor: pointer; padding: 0; }
.fb-index-rows { display: flex; flex-direction: column; gap: 4px; }
.fb-index-row { display: flex; align-items: flex-start; gap: 8px; }
.fb-index-cat { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: #9aa0ac; text-transform: uppercase; letter-spacing: .4px; min-width: 70px; padding-top: 2px; }
.fb-index-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.fb-index-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 12px;
  background: #e0f2f0; color: #0d9488; font-size: 11px; font-weight: 500;
  cursor: pointer; transition: background .1s;
}
.fb-index-pill:hover { background: #ccebe8; }


/* ── Advanced filters inline ── */
.fadv-inline {
  display: flex; align-items: flex-start; flex-wrap: wrap; gap: 0;
  padding: 8px 16px 10px;
  background: #fafbfc; border-bottom: 1px solid #e8edf3;
}
.fadv-inline-section {
  display: flex; flex-direction: column; gap: 5px;
  padding: 4px 14px 4px 0;
}
.fadv-inline-label {
  font-size: 10px; font-weight: 700; color: #9aa0ac;
  text-transform: uppercase; letter-spacing: .5px;
}
.fadv-inline-sep {
  width: 1px; background: #e3e6eb;
  align-self: stretch; margin: 4px 14px 4px 0;
  flex-shrink: 0;
}
.fadv-options { display: flex; flex-wrap: wrap; gap: 5px; }
.fadv-radio {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 14px;
  border: 1.5px solid #e3e6eb; background: #fff;
  font-size: 11px; font-weight: 500; color: #374151;
  cursor: pointer; transition: all .15s;
}
.fadv-radio input { display: none; }
.fadv-radio--on { border-color: #0d9488; background: #f0faf9; color: #0d9488; }
.fadv-range-row { display: flex; align-items: center; gap: 6px; }
.fadv-range-sep { color: #9aa0ac; font-size: 11px; }
.fadv-input {
  height: 28px; padding: 0 8px;
  border: 1.5px solid #e3e6eb; border-radius: 7px;
  font-size: 12px; color: #1a1f36; background: #f8f9fb;
  outline: none; transition: border-color .15s;
}
.fadv-input:focus { border-color: #0d9488; background: #fff; }
.fadv-input--sm { width: 76px; }

/* ── Fade transition ── */
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .page-header {
    padding: 10px 12px;
  }

  .fb-toolbar {
    padding: 8px 12px;
    flex-wrap: wrap;
  }

  .fb-search {
    max-width: 100%;
    min-width: 0;
  }

  .fadv-input--sm {
    width: 60px;
  }

  .fb-toolbar-actions { overflow-x: auto; display: flex; flex-wrap: nowrap; gap: 6px; }
  .fb-toolbar-actions .q-btn { flex-shrink: 0; }
}
</style>
