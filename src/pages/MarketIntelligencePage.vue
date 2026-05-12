<template>
  <q-page class="mkt-page">

    <!-- ══════════ HEADER ══════════════════════════════════════════════════ -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon"><q-icon name="insights" size="20px" /></div>
        <div>
          <div class="header-eyebrow">SellerBot</div>
          <div class="header-title">Inteligência de Mercado</div>
        </div>
      </div>
    </div>

    <!-- ══════════ TABS ════════════════════════════════════════════════════ -->
    <div class="tab-bar">
      <button v-for="t in tabs" :key="t.key"
        :class="['tab-btn', activeTab === t.key && 'tab-btn--on']"
        @click="activeTab = t.key">
        <q-icon :name="t.icon" size="14px" class="q-mr-xs" />{{ t.label }}
      </button>
    </div>

    <!-- ══════════ ABA: TENDÊNCIAS ════════════════════════════════════════ -->
    <div v-show="activeTab === 'trends'" class="tab-content">

      <div class="section-intro">
        <q-icon name="trending_up" size="15px" class="q-mr-xs text-indigo-5" />
        Keywords mais buscadas na categoria selecionada. Verde = você tem anúncio ativo. Vermelho = oportunidade não explorada.
      </div>

      <!-- Controles -->
      <div class="controls-row">
        <select v-model="selectedCategoryId" class="cat-select">
          <option value="">Tendências Nacionais</option>
          <option v-for="c in ROOT_CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <q-btn unelevated color="indigo-7" icon="search" label="Buscar Tendências"
          :loading="loadingTrends" @click="loadTrends" size="sm" />
      </div>

      <!-- Resultado -->
      <template v-if="trendsData">
        <!-- Resumo -->
        <div class="trends-summary">
          <div class="ts-card ts-card--total">
            <div class="ts-val">{{ trendsData.total }}</div>
            <div class="ts-label">Keywords</div>
          </div>
          <div class="ts-card ts-card--covered">
            <div class="ts-val">{{ trendsData.covered }}</div>
            <div class="ts-label">Com anúncio</div>
          </div>
          <div class="ts-card ts-card--gap">
            <div class="ts-val">{{ trendsData.gap }}</div>
            <div class="ts-label">Oportunidades</div>
          </div>
          <div class="ts-card ts-card--pct">
            <div class="ts-val">{{ trendsData.coverage_pct }}%</div>
            <div class="ts-label">Cobertura</div>
          </div>
        </div>

        <!-- Lista de keywords -->
        <div class="trends-list">
          <div v-for="t in trendsData.trends" :key="t.position"
            :class="['trend-item', t.covered ? 'trend-covered' : 'trend-gap']">
            <div class="trend-pos">#{{ t.position }}</div>
            <div class="trend-kw">{{ t.keyword }}</div>
            <div class="trend-badge">
              <span v-if="t.covered" class="badge-covered"><q-icon name="check_circle" size="12px" /> Tenho anúncio</span>
              <span v-else class="badge-gap"><q-icon name="add_circle_outline" size="12px" /> Oportunidade</span>
            </div>
            <a :href="t.url" target="_blank" class="trend-link">
              <q-icon name="open_in_new" size="12px" /> Ver no ML
            </a>
          </div>
        </div>
      </template>

      <div v-else-if="!loadingTrends" class="empty-state">
        <q-icon name="trending_up" size="40px" color="grey-4" />
        <div>Selecione uma categoria e clique em Buscar Tendências</div>
      </div>
      <div v-if="loadingTrends" class="loading-center">
        <q-spinner-dots color="indigo" size="36px" />
        <div class="loading-text">Buscando tendências...</div>
      </div>
    </div>

    <!-- ══════════ ABA: MAIS VENDIDOS ═════════════════════════════════════ -->
    <div v-show="activeTab === 'highlights'" class="tab-content">

      <div class="section-intro">
        <q-icon name="emoji_events" size="15px" class="q-mr-xs text-amber-7" />
        Top 20 produtos mais vendidos da categoria selecionada com preços e competidores.
        <span class="text-teal-7 q-ml-xs">Verde</span> = você compete neste produto.
      </div>

      <div class="controls-row">
        <select v-model="selectedCategoryHighlights" class="cat-select">
          <option v-for="c in ROOT_CATEGORIES" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <q-btn unelevated color="amber-8" icon="emoji_events" label="Ver Mais Vendidos"
          :loading="loadingHighlights" @click="loadHighlights" size="sm" />
      </div>

      <template v-if="highlightsData">
        <div class="hl-summary">
          <span class="hl-total">{{ highlightsData.total }} produtos</span>
          <span v-if="highlightsData.competing > 0" class="hl-competing">
            <q-icon name="store" size="13px" /> Você compete em {{ highlightsData.competing }}
          </span>
        </div>

        <div class="hl-grid">
          <div v-for="h in highlightsData.highlights" :key="h.position"
            :class="['hl-card', h.i_compete && 'hl-card--mine']">
            <div class="hl-pos">#{{ h.position }}</div>
            <div class="hl-info">
              <div class="hl-name">{{ h.name || h.product_id }}</div>
              <div class="hl-type muted">{{ h.type }}</div>
            </div>
            <div class="hl-prices" v-if="h.price_min !== null">
              <div class="hl-price-range">
                <span class="hl-price-min">{{ fmtBRL(h.price_min) }}</span>
                <span class="hl-sep">–</span>
                <span class="hl-price-max">{{ fmtBRL(h.price_max) }}</span>
              </div>
              <div class="hl-price-avg muted">Média: {{ fmtBRL(h.price_avg) }}</div>
            </div>
            <div class="hl-sellers" v-if="h.sellers.length">
              <span class="hl-sellers-count">{{ h.sellers.length }} vendedores</span>
              <span v-if="h.sellers.some(s => s.official_store)" class="hl-official">
                <q-icon name="verified" size="11px" /> Loja oficial
              </span>
            </div>
            <div v-if="h.i_compete" class="hl-mine-badge">
              <q-icon name="store" size="12px" /> Você vende
            </div>
          </div>
        </div>
      </template>

      <div v-else-if="!loadingHighlights" class="empty-state">
        <q-icon name="emoji_events" size="40px" color="grey-4" />
        <div>Selecione uma categoria e clique em Ver Mais Vendidos</div>
      </div>
      <div v-if="loadingHighlights" class="loading-center">
        <q-spinner-dots color="amber" size="36px" />
        <div class="loading-text">Carregando mais vendidos...</div>
      </div>
    </div>

    <!-- ══════════ ABA: ANÁLISE DE NICHO ══════════════════════════════════ -->
    <div v-show="activeTab === 'niche'" class="tab-content">

      <div class="section-intro">
        <q-icon name="manage_search" size="15px" class="q-mr-xs text-teal-6" />
        Digite um produto e o SellerBot faz o diagnóstico completo: categoria ideal, tamanho do mercado, concorrentes e se você já vende.
      </div>

      <div class="controls-row">
        <input v-model="nicheQuery" class="niche-input" placeholder="Ex: ureia fertilizante, suplemento whey..."
          @keyup.enter="loadNiche" />
        <q-btn unelevated color="teal-7" icon="manage_search" label="Analisar Nicho"
          :loading="loadingNiche" @click="loadNiche" size="sm" :disable="!nicheQuery.trim()" />
      </div>

      <template v-if="nicheData">
        <!-- Cabeçalho do resultado -->
        <div class="niche-header">
          <div class="niche-query-label">Análise de: <strong>{{ nicheData.query }}</strong></div>
          <span v-if="nicheData.i_sell_this" class="niche-sells-badge">
            <q-icon name="store" size="13px" /> Você já vende este produto
          </span>
          <span v-else class="niche-gap-badge">
            <q-icon name="add_shopping_cart" size="13px" /> Você ainda não vende
          </span>
        </div>

        <div class="niche-grid">

          <!-- Categoria sugerida -->
          <div class="niche-card">
            <div class="niche-card-title"><q-icon name="category" size="14px" /> Categoria Sugerida</div>
            <div v-if="nicheData.suggested_domains?.length">
              <div v-for="d in nicheData.suggested_domains" :key="d.domain_id" class="niche-domain">
                <div class="nd-name">{{ d.domain_name }}</div>
                <div class="nd-cat muted">{{ d.category_name }} · {{ d.category_id }}</div>
              </div>
            </div>
            <div v-else class="muted">Não identificado</div>
          </div>

          <!-- Tamanho do mercado -->
          <div class="niche-card">
            <div class="niche-card-title"><q-icon name="bar_chart" size="14px" /> Tamanho do Mercado</div>
            <template v-if="nicheData.market_size">
              <div class="niche-big-num">{{ (nicheData.market_size.total_items || 0).toLocaleString('pt-BR') }}</div>
              <div class="niche-sub">anúncios ativos em <strong>{{ nicheData.market_size.category_name }}</strong></div>
              <div class="niche-path muted">{{ nicheData.market_size.path }}</div>
            </template>
            <div v-else class="muted">Não disponível</div>
          </div>

          <!-- Oferta no catálogo -->
          <div class="niche-card">
            <div class="niche-card-title"><q-icon name="inventory_2" size="14px" /> Oferta no Catálogo ML</div>
            <template v-if="nicheData.catalog_volume">
              <div class="niche-big-num">{{ (nicheData.catalog_volume.total_products || 0).toLocaleString('pt-BR') }}</div>
              <div class="niche-sub">produtos no catálogo</div>
              <div class="niche-samples" v-if="nicheData.catalog_volume.sample?.length">
                <div v-for="s in nicheData.catalog_volume.sample.slice(0,3)" :key="s.id" class="niche-sample-item muted">
                  {{ s.name }}
                </div>
              </div>
            </template>
            <div v-else class="muted">Não disponível</div>
          </div>

          <!-- Preços dos concorrentes -->
          <div class="niche-card">
            <div class="niche-card-title"><q-icon name="price_check" size="14px" /> Preços dos Concorrentes</div>
            <template v-if="nicheData.competitors && !nicheData.competitors.error">
              <div class="price-range-row">
                <div class="pr-item">
                  <div class="pr-label">Mínimo</div>
                  <div class="pr-val pr-val--low">{{ fmtBRL(nicheData.competitors.price_min) }}</div>
                </div>
                <div class="pr-item">
                  <div class="pr-label">Médio</div>
                  <div class="pr-val">{{ fmtBRL(nicheData.competitors.price_avg) }}</div>
                </div>
                <div class="pr-item">
                  <div class="pr-label">Mediana</div>
                  <div class="pr-val">{{ fmtBRL(nicheData.competitors.price_median) }}</div>
                </div>
                <div class="pr-item">
                  <div class="pr-label">Máximo</div>
                  <div class="pr-val pr-val--high">{{ fmtBRL(nicheData.competitors.price_max) }}</div>
                </div>
              </div>
              <div class="muted" style="font-size:11px; margin-top:6px">
                {{ nicheData.competitors.scraped_count }} anúncios analisados ·
                {{ nicheData.competitors.in_stock }} em estoque
              </div>
            </template>
            <div v-else class="muted">Não disponível</div>
          </div>

          <!-- Meus anúncios -->
          <div class="niche-card niche-card--wide">
            <div class="niche-card-title"><q-icon name="store" size="14px" /> Meus Anúncios Relacionados</div>
            <template v-if="nicheData.my_listings?.length">
              <table class="niche-items-table">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th class="right">Preço</th>
                    <th class="right">Vendidos</th>
                    <th>Status</th>
                    <th>Logística</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in nicheData.my_listings" :key="item.item_id">
                    <td>{{ item.title }}</td>
                    <td class="right">{{ fmtBRL(item.price) }}</td>
                    <td class="right">{{ item.sold_quantity }}</td>
                    <td><span :class="['status-badge', `status-${item.status}`]">{{ item.status }}</span></td>
                    <td class="muted">{{ item.logistic_type }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
            <div v-else class="muted">Nenhum anúncio seu contém esta keyword.</div>
          </div>
        </div>
      </template>

      <div v-else-if="!loadingNiche" class="empty-state">
        <q-icon name="manage_search" size="40px" color="grey-4" />
        <div>Digite um produto para analisar o nicho</div>
      </div>
      <div v-if="loadingNiche" class="loading-center">
        <q-spinner-dots color="teal" size="36px" />
        <div class="loading-text">Analisando nicho...</div>
      </div>
    </div>

    <!-- ══════════ ABA: COBERTURA FULL ══════════════════════════════════════ -->
    <div v-show="activeTab === 'full-coverage'" class="tab-content">

      <div class="section-intro">
        <q-icon name="inventory_2" size="15px" class="q-mr-xs text-teal-6" />
        Anúncios Full ordenados por dias de cobertura estimados (estoque ÷ velocidade de vendas). Itens em vermelho têm excedente no CD e precisam de publicidade mais agressiva.
      </div>

      <div class="controls-row">
        <q-btn unelevated color="teal-7" label="Carregar / Atualizar" icon="refresh"
          :loading="loadingCoverage" @click="loadCoverage" size="sm" />
      </div>

      <template v-if="coverageData">
        <!-- Resumo -->
        <div class="cov-summary">
          <div class="cov-stat cov-stat--total">
            <div class="cov-val">{{ coverageData.total }}</div>
            <div class="cov-label">Itens Full</div>
          </div>
          <div class="cov-stat cov-stat--red">
            <div class="cov-val">{{ coverageData.critical }}</div>
            <div class="cov-label">🔴 Crítico ≥ 90d</div>
          </div>
          <div class="cov-stat cov-stat--amber">
            <div class="cov-val">{{ coverageData.attention }}</div>
            <div class="cov-label">🟡 Atenção 45-90d</div>
          </div>
          <div class="cov-stat cov-stat--green">
            <div class="cov-val">{{ coverageData.ok }}</div>
            <div class="cov-label">🟢 OK &lt; 45d</div>
          </div>
        </div>

        <!-- Tabela -->
        <div class="cov-table-wrap">
          <table class="cov-table">
            <thead>
              <tr>
                <th>Anúncio</th>
                <th>Conta</th>
                <th class="right">Estoque Full</th>
                <th class="right">Vendas 30d</th>
                <th class="right">Vel./dia</th>
                <th class="right">Dias cobertura</th>
                <th class="right">GMV 30d</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in coverageData.items" :key="item.item_id"
                  :class="['cov-row', `cov-row--${item.coverage_color}`]">
                <td class="cov-title">
                  <div class="cov-title-text">{{ item.title }}</div>
                  <div class="cov-item-id">{{ item.item_id }}</div>
                </td>
                <td class="cov-account">{{ item.account }}</td>
                <td class="right cov-num">{{ item.stock_full }}</td>
                <td class="right cov-num">{{ item.sold_30d }}</td>
                <td class="right cov-num">{{ item.daily_velocity }}</td>
                <td class="right">
                  <span class="cov-days" :class="`cov-days--${item.coverage_color}`">
                    {{ item.days_coverage >= 999 ? '∞' : item.days_coverage + 'd' }}
                  </span>
                </td>
                <td class="right cov-num">{{ fmtBRL(item.gmv_30d) }}</td>
                <td>
                  <span class="cov-badge" :class="`cov-badge--${item.coverage_color}`">
                    {{ item.coverage_label }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else-if="!loadingCoverage" class="empty-state">
        <q-icon name="inventory_2" size="40px" color="grey-4" />
        <div>Clique em "Carregar" para ver a cobertura de estoque Full</div>
      </div>
      <div v-if="loadingCoverage" class="loading-center">
        <q-spinner-dots color="teal" size="36px" />
        <div class="loading-text">Calculando cobertura de estoque...</div>
      </div>

    </div>

  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import MercadoLivreService from 'src/services/MercadoLivreService'

// ── Tabs ──────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'trends',       label: 'Tendências',       icon: 'trending_up' },
  { key: 'highlights',   label: 'Mais Vendidos',     icon: 'emoji_events' },
  { key: 'niche',        label: 'Análise de Nicho',  icon: 'manage_search' },
  { key: 'full-coverage', label: 'Cobertura Full',   icon: 'inventory_2' },
]
const activeTab = ref('trends')

// ── Categorias raiz do ML ─────────────────────────────────────────────────
const ROOT_CATEGORIES = [
  { id: 'MLB5672',   name: 'Acessórios para Veículos' },
  { id: 'MLB271599', name: 'Agro' },
  { id: 'MLB1403',   name: 'Alimentos e Bebidas' },
  { id: 'MLB1071',   name: 'Animais' },
  { id: 'MLB1384',   name: 'Bebês' },
  { id: 'MLB1246',   name: 'Beleza e Cuidado Pessoal' },
  { id: 'MLB1132',   name: 'Brinquedos e Hobbies' },
  { id: 'MLB1430',   name: 'Calçados, Roupas e Bolsas' },
  { id: 'MLB1039',   name: 'Câmeras e Acessórios' },
  { id: 'MLB1574',   name: 'Casa, Móveis e Decoração' },
  { id: 'MLB1051',   name: 'Celulares e Telefones' },
  { id: 'MLB1500',   name: 'Construção' },
  { id: 'MLB5726',   name: 'Eletrodomésticos' },
  { id: 'MLB1000',   name: 'Eletrônicos, Áudio e Vídeo' },
  { id: 'MLB1276',   name: 'Esportes e Fitness' },
  { id: 'MLB263532', name: 'Ferramentas' },
  { id: 'MLB1144',   name: 'Games' },
  { id: 'MLB1499',   name: 'Indústria e Comércio' },
  { id: 'MLB1648',   name: 'Informática' },
  { id: 'MLB3937',   name: 'Joias e Relógios' },
  { id: 'MLB1196',   name: 'Livros, Revistas e Comics' },
  { id: 'MLB264586', name: 'Saúde' },
]

// ── State ─────────────────────────────────────────────────────────────────
const selectedCategoryId        = ref('')
const trendsData                = ref(null)
const loadingTrends             = ref(false)

const selectedCategoryHighlights = ref('MLB5726')
const highlightsData             = ref(null)
const loadingHighlights          = ref(false)

const nicheQuery    = ref('')
const nicheData     = ref(null)
const loadingNiche  = ref(false)

// ── Full Coverage ─────────────────────────────────────────────────────────
const coverageData    = ref(null)
const loadingCoverage = ref(false)

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtBRL(v) {
  if (v == null) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Loaders ───────────────────────────────────────────────────────────────
async function loadTrends() {
  loadingTrends.value = true
  trendsData.value = null
  try {
    const params = {}
    if (selectedCategoryId.value) params.category_id = selectedCategoryId.value
    const res = await MercadoLivreService.getMarketTrends(params)
    trendsData.value = res.data
  } catch (e) {
    console.error('Trends error', e)
  } finally {
    loadingTrends.value = false
  }
}

async function loadHighlights() {
  loadingHighlights.value = true
  highlightsData.value = null
  try {
    const res = await MercadoLivreService.getMarketHighlights({ category_id: selectedCategoryHighlights.value })
    highlightsData.value = res.data
  } catch (e) {
    console.error('Highlights error', e)
  } finally {
    loadingHighlights.value = false
  }
}

async function loadNiche() {
  if (!nicheQuery.value.trim()) return
  loadingNiche.value = true
  nicheData.value = null
  try {
    const res = await MercadoLivreService.getMarketNiche({ q: nicheQuery.value.trim() })
    nicheData.value = res.data
  } catch (e) {
    console.error('Niche error', e)
  } finally {
    loadingNiche.value = false
  }
}

async function loadCoverage() {
  loadingCoverage.value = true
  coverageData.value = null
  try {
    const res = await MercadoLivreService.getFullCoverage()
    coverageData.value = res.data
  } catch (e) {
    console.error('Full coverage error', e)
  } finally {
    loadingCoverage.value = false
  }
}
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────────────────────── */
.mkt-page { padding: 0; background: #f8fafc; min-height: 100vh; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 28px 14px; background: #fff;
  border-bottom: 1px solid #e2e8f0;
}
.header-left  { display: flex; align-items: center; gap: 12px; }
.header-icon  { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg,#6366f1,#0ea5e9); display: flex; align-items: center; justify-content: center; color: #fff; }
.header-eyebrow { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .6px; }
.header-title   { font-size: 17px; font-weight: 700; color: #1e293b; }

/* ── Tabs ──────────────────────────────────────────────────────────────── */
.tab-bar { display: flex; gap: 4px; padding: 12px 28px 0; background: #fff; border-bottom: 1px solid #e2e8f0; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; background: transparent; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 500; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; transition: all .15s; }
.tab-btn:hover { background: #f1f5f9; color: #334155; }
.tab-btn--on { color: #6366f1; border-bottom-color: #6366f1; font-weight: 700; }

.tab-content { padding: 20px 28px; }

/* ── Section intro ────────────────────────────────────────────────────── */
.section-intro {
  font-size: 13px; color: #64748b; margin-bottom: 16px;
  padding: 10px 14px; background: #f8fafc; border-radius: 8px;
  border-left: 3px solid #6366f1;
}

/* ── Controls ─────────────────────────────────────────────────────────── */
.controls-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.cat-select {
  padding: 7px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; color: #334155; background: #fff; min-width: 220px;
}
.niche-input {
  flex: 1; min-width: 280px; padding: 8px 14px;
  border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #334155;
}
.niche-input:focus { outline: none; border-color: #6366f1; }

/* ── Trends ───────────────────────────────────────────────────────────── */
.trends-summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.ts-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 18px; text-align: center; min-width: 100px; }
.ts-val  { font-size: 22px; font-weight: 800; color: #1e293b; }
.ts-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }
.ts-card--covered .ts-val { color: #0d9488; }
.ts-card--gap     .ts-val { color: #6366f1; }
.ts-card--pct     .ts-val { color: #f59e0b; }

.trends-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; }
.trend-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;
  background: #fff; transition: box-shadow .15s;
}
.trend-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.trend-covered { border-left: 3px solid #0d9488; }
.trend-gap     { border-left: 3px solid #6366f1; }
.trend-pos  { font-size: 11px; font-weight: 700; color: #94a3b8; min-width: 24px; }
.trend-kw   { flex: 1; font-size: 13px; font-weight: 600; color: #1e293b; }
.badge-covered { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: #0d9488; font-weight: 700; white-space: nowrap; }
.badge-gap     { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: #6366f1; font-weight: 700; white-space: nowrap; }
.trend-link { font-size: 10px; color: #94a3b8; text-decoration: none; flex-shrink: 0; }
.trend-link:hover { color: #6366f1; }

/* ── Highlights ───────────────────────────────────────────────────────── */
.hl-summary { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.hl-total { font-size: 13px; font-weight: 600; color: #334155; }
.hl-competing { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #0d9488; font-weight: 600; }

.hl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.hl-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 14px; position: relative; transition: box-shadow .15s;
}
.hl-card:hover { box-shadow: 0 2px 10px rgba(0,0,0,.08); }
.hl-card--mine { border-color: #0d9488; border-width: 2px; }
.hl-pos { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 4px; }
.hl-name { font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.3; margin-bottom: 2px; }
.hl-type { font-size: 10px; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; }
.hl-prices { margin-bottom: 6px; }
.hl-price-range { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.hl-price-min { color: #0d9488; font-weight: 700; }
.hl-price-max { color: #ef4444; font-weight: 700; }
.hl-sep { color: #94a3b8; }
.hl-price-avg { font-size: 11px; margin-top: 2px; }
.hl-sellers { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-top: 4px; }
.hl-sellers-count { color: #64748b; }
.hl-official { display: flex; align-items: center; gap: 3px; color: #f59e0b; font-weight: 600; }
.hl-mine-badge {
  display: inline-flex; align-items: center; gap: 4px;
  position: absolute; top: 10px; right: 10px;
  background: #0d9488; color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 6px;
}

/* ── Niche ────────────────────────────────────────────────────────────── */
.niche-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.niche-query-label { font-size: 14px; color: #334155; }
.niche-sells-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 8px;
  font-size: 12px; font-weight: 700;
}
.niche-gap-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: #ede9fe; color: #4c1d95; padding: 4px 10px; border-radius: 8px;
  font-size: 12px; font-weight: 700;
}

.niche-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.niche-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.niche-card--wide { grid-column: 1 / -1; }
.niche-card-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 10px; display: flex; align-items: center; gap: 5px; }
.niche-big-num { font-size: 28px; font-weight: 800; color: #1e293b; line-height: 1; }
.niche-sub  { font-size: 12px; color: #64748b; margin-top: 4px; }
.niche-path { font-size: 11px; margin-top: 4px; }
.niche-domain { margin-bottom: 8px; }
.nd-name { font-size: 13px; font-weight: 600; color: #1e293b; }
.nd-cat  { font-size: 11px; margin-top: 2px; }
.niche-samples { margin-top: 8px; }
.niche-sample-item { font-size: 11px; line-height: 1.6; }

.price-range-row { display: flex; gap: 12px; flex-wrap: wrap; }
.pr-item { text-align: center; }
.pr-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 2px; }
.pr-val   { font-size: 14px; font-weight: 700; color: #1e293b; }
.pr-val--low  { color: #0d9488; }
.pr-val--high { color: #ef4444; }

.niche-items-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.niche-items-table th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; }
.niche-items-table td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.niche-items-table tr:last-child td { border-bottom: none; }
.right { text-align: right; }

.status-badge { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; }
.status-active { background: #d1fae5; color: #065f46; }
.status-paused { background: #fef3c7; color: #92400e; }
.status-closed { background: #fee2e2; color: #991b1b; }

/* ── Shared ───────────────────────────────────────────────────────────── */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 20px; color: #94a3b8; font-size: 13px; }
.loading-center { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; }
.loading-text { font-size: 13px; color: #94a3b8; }
.muted { color: #94a3b8; }

/* ── Full Coverage ────────────────────────────────────────────────────── */
.cov-summary {
  display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
}
.cov-stat {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 12px 18px; min-width: 110px; text-align: center;
}
.cov-stat--red   { border-color: #fca5a5; background: #fff5f5; }
.cov-stat--amber { border-color: #fcd34d; background: #fffbeb; }
.cov-stat--green { border-color: #6ee7b7; background: #f0fdf9; }
.cov-val   { font-size: 22px; font-weight: 800; color: #1e293b; }
.cov-label { font-size: 11px; color: #64748b; margin-top: 2px; }

.cov-table-wrap { overflow-x: auto; }
.cov-table {
  width: 100%; border-collapse: collapse; font-size: 12px;
  background: #fff; border-radius: 10px; overflow: hidden;
  border: 1px solid #e2e8f0;
}
.cov-table th {
  padding: 8px 10px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
  color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: .3px;
}
.cov-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.cov-table tr:last-child td { border-bottom: none; }
.cov-row--red   { background: #fff8f8; }
.cov-row--amber { background: #fffdf0; }

.cov-title-text { font-weight: 600; color: #1e293b; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cov-item-id    { font-size: 10px; color: #94a3b8; margin-top: 1px; }
.cov-account    { font-size: 11px; color: #64748b; white-space: nowrap; }
.cov-num        { font-variant-numeric: tabular-nums; }

.cov-days {
  display: inline-block; padding: 2px 8px; border-radius: 6px;
  font-weight: 700; font-size: 12px;
}
.cov-days--red   { background: #fee2e2; color: #991b1b; }
.cov-days--amber { background: #fef3c7; color: #92400e; }
.cov-days--green { background: #d1fae5; color: #065f46; }

.cov-badge {
  display: inline-block; padding: 2px 8px; border-radius: 5px;
  font-size: 10px; font-weight: 700; white-space: nowrap;
}
.cov-badge--red   { background: #fee2e2; color: #991b1b; }
.cov-badge--amber { background: #fef3c7; color: #92400e; }
.cov-badge--green { background: #d1fae5; color: #065f46; }

@media (max-width: 600px) {
  .page-header { padding: 10px 12px; }
  .content-body { padding: 12px; }
}
</style>
