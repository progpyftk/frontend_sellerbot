<template>
  <!-- PROMO-IA-45: aba Análises — tabela de análises, 1 linha por anúncio. -->
  <AdvisorShell
    active="analises"
    pergunta="Como está cada anúncio e o que o robô decidiu?"
  >
    <template #actions>
      <q-btn flat dense no-caps icon="refresh" label="Atualizar" :loading="carregando" @click="carregar" />
    </template>

    <AdvisorEmptyState v-if="erro" variant="erro" :title="erro" :message="`Nada foi alterado no Mercado Livre.`">
      <template #action>
        <q-btn unelevated no-caps color="primary" icon="refresh" label="Tentar novamente" @click="carregar" />
      </template>
    </AdvisorEmptyState>

    <AdvisorEmptyState v-else-if="carregando && !linhas.length" variant="carregando" />

    <template v-else>
      <div class="an__filtros">
        <q-input
          v-model="filtros.q" dense outlined clearable debounce="0"
          placeholder="Buscar por título, SKU ou MLB" aria-label="Buscar anúncio"
          class="an__busca"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select
          v-model="filtros.conta" :options="contasOpcoes" dense outlined clearable emit-value map-options
          label="Conta" aria-label="Conta" class="an__select"
        />
        <q-select
          v-model="filtros.saude" :options="saudeOpcoes" dense outlined clearable emit-value map-options
          label="Saúde" aria-label="Saúde de vendas" class="an__select"
        />
        <q-select
          v-model="filtros.status" :options="statusOpcoes" dense outlined clearable emit-value map-options
          label="Situação" aria-label="Situação do anúncio" class="an__select"
        />
        <q-toggle v-model="filtros.soAbaixoDoPiso" dense label="Só abaixo do mínimo" />
        <q-toggle v-model="filtros.soComPromocao" dense label="Só com promoção" />
        <q-btn v-if="filtrosAtivos" flat dense no-caps icon="filter_alt_off" label="Limpar filtros" @click="limparFiltros" />
      </div>

      <!-- Chips de recorte (PROMO-IA-45): contagens por situação — clicar recorta a tabela. -->
      <div class="an__chips" role="status">
        <button
          v-for="chip in chips" :key="chip.key" type="button"
          class="an__chip" :class="{ 'is-on': recorte === chip.key }"
          :aria-pressed="recorte === chip.key"
          @click="alternarRecorte(chip.key)"
        >
          {{ chip.label }} <strong>{{ chip.total }}</strong>
        </button>
        <span v-if="recorte" class="an__chipLimpar">
          recorte da página carregada
          <q-btn flat dense no-caps size="sm" label="limpar" @click="recorte = null" />
        </span>
      </div>

      <AdvisorSection title="Análises" :count="linhasVisiveis.length" :lead="leadLista" :tight="true">
        <AdvisorEmptyState
          v-if="!linhasVisiveis.length" variant="vazio"
          :title="temFiltroDeEscopo || recorte ? 'Nenhum anúncio com esse recorte' : 'Nenhum anúncio no catálogo'"
          :message="temFiltroDeEscopo || recorte ? 'Tente afrouxar os filtros — o catálogo continua o mesmo.' : 'Nenhuma conta trouxe anúncios ainda.'"
        />

        <AdvisorTable
          v-else
          :columns="COLUNAS"
          :rows="linhasVisiveis"
          :sort="ordenacao"
          :expandido="expandido"
          :legenda="legendaTabela"
          :campos-cartao="CAMPOS_CARTAO"
          @sort="ordenarPor"
          @row="abrirDetalhe"
        >
          <template #card-title="{ row }">
            <span class="an__mlb">{{ row.item_id }}</span>
            <strong class="an__titulo">{{ row.title }}</strong>
            <span class="an__conta">{{ row.account_nickname }}</span>
          </template>

          <template #cell-anuncio="{ row }">
            <span class="an__mlb">{{ row.item_id }}</span>
            <span class="an__titulo">{{ row.title }}</span>
            <span class="an__conta">{{ row.account_nickname }}</span>
          </template>

          <template #cell-classificacao="{ row }">
            <span class="an__saude">{{ HEALTH_META[row.health]?.label || '—' }}</span>
            <span class="an__situacao">{{ situationOf(row)?.label || '—' }}</span>
          </template>

          <template #cell-preco="{ row }">{{ brl(row.price) }}</template>
          <template #cell-ritmo="{ row }">
            <span :title="row.sales_30d == null ? '' : `${row.sales_30d} vendas em 30 dias`">
              {{ row.health_info?.units_per_week == null ? '—' : `${String(row.health_info.units_per_week).replace('.', ',')} un./sem.` }}
            </span>
          </template>
          <template #cell-margemBase="{ row }">
            <span :title="row.base_margin_pct == null ? emptyCellReason(row) : ''">{{ pct(row.base_margin_pct) }}</span>
          </template>
          <template #cell-margem="{ row }">
            <span :title="row.margin_pct == null ? emptyCellReason(row) : ''">{{ pct(row.margin_pct) }}</span>
          </template>
          <template #cell-ultimaAnalise="{ row }">{{ dataCurta(row.computed_at) }}</template>
          <template #cell-ofertadas="{ row }">{{ row.candidates_count ?? 0 }}</template>
          <template #cell-promoAtiva="{ row }">
            {{ row.active_promo?.promotion_name || (row.has_active_promo ? row.active_promo?.promotion_type : '—') }}
          </template>
          <template #cell-desconto="{ row }">{{ row.discount_pct == null ? '—' : pct(row.discount_pct) }}</template>
          <template #cell-lucro="{ row }">
            <span :title="row.profit_unit == null ? emptyCellReason(row) : ''">{{ brl(row.profit_unit) }}</span>
          </template>
          <template #cell-frete="{ row }">
            <span :title="row.shipping_cost == null ? 'Sem dado: sem histórico de frete nem cotação para este anúncio.' : ''">
              {{ brl(row.shipping_cost) }}
            </span>
          </template>
          <template #cell-inicio="{ row }">{{ dataCurta(row.active_promo?.start_date) }}</template>
        </AdvisorTable>

        <footer v-if="total > porPagina" class="an__paginacao">
          <span>{{ primeira }}–{{ ultima }} de {{ total }}</span>
          <div>
            <q-btn flat dense no-caps icon="chevron_left" :disable="pagina <= 1"
                   aria-label="Página anterior" @click="pagina -= 1" />
            <span class="an__paginaAtual">{{ pagina }} / {{ totalPaginas }}</span>
            <q-btn flat dense no-caps icon="chevron_right" :disable="pagina >= totalPaginas"
                   aria-label="Próxima página" @click="pagina += 1" />
          </div>
        </footer>
      </AdvisorSection>
    </template>

    <AdvisorItemDrawer
      v-if="expandido"
      :detalhe="detalhe" :carregando="detalheCarregando" :erro="detalheErro"
      @fechar="fecharDetalhe"
    />
  </AdvisorShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AdvisorEmptyState from 'src/components/advisor/AdvisorEmptyState.vue';
import AdvisorItemDrawer from 'src/components/advisor/AdvisorItemDrawer.vue';
import AdvisorSection from 'src/components/advisor/AdvisorSection.vue';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorTable from 'src/components/advisor/AdvisorTable.vue';
import { useAdvisorCatalog } from 'src/composables/advisor/useAdvisorCatalog';
import AdvisorService from 'src/services/AdvisorService';
import {
  HEALTH_META, LEGENDARIO_SITUACOES, SITUATION_META,
  brl, emptyCellReason, pct, situationOf,
} from 'src/utils/advisorDecision';

const {
  linhas, total, retrato, carregando, erro, filtros, ordenacao, pagina, porPagina, expandido,
  contasOpcoes, saudeOpcoes, statusOpcoes, filtrosAtivos, temFiltroDeEscopo,
  totalPaginas, primeira, ultima, decisao,
  carregar, limparFiltros, ordenarPor,
} = useAdvisorCatalog();

const route = useRoute();
const router = useRouter();

/** Colunas da tabela Análises (PROMO-IA-45): o retrato completo por anúncio. */
const COLUNAS = [
  { key: 'anuncio', label: 'Anúncio', minWidth: 220 },
  { key: 'classificacao', label: 'Classificação', minWidth: 150 },
  { key: 'preco', label: 'Preço-base', numeric: true, sortable: true, sortKey: 'price', minWidth: 100 },
  { key: 'ritmo', label: 'Ritmo de vendas', numeric: true, sortable: true, sortKey: 'sales', minWidth: 110 },
  { key: 'margemBase', label: 'Margem-base', numeric: true, sortable: true, sortKey: 'base_margin', minWidth: 105 },
  { key: 'margem', label: 'Margem em promo', numeric: true, sortable: true, sortKey: 'margin', minWidth: 115 },
  { key: 'ultimaAnalise', label: 'Última atualização', sortable: true, sortKey: 'computed', minWidth: 120 },
  { key: 'ofertadas', label: 'Ofertadas (nº)', numeric: true, sortable: true, sortKey: 'ofertadas', minWidth: 100 },
  { key: 'promoAtiva', label: 'Promoção ativa', minWidth: 150 },
  { key: 'desconto', label: 'Desconto ativo', numeric: true, sortable: true, sortKey: 'discount', minWidth: 105 },
  { key: 'lucro', label: 'Lucro estimado', numeric: true, minWidth: 110 },
  { key: 'frete', label: 'Frete estimado', numeric: true, minWidth: 105 },
  { key: 'inicio', label: 'Início da promoção', minWidth: 115 },
];

const CAMPOS_CARTAO = COLUNAS.filter((c) => (
  ['classificacao', 'preco', 'margemBase', 'margem', 'ofertadas', 'promoAtiva'].includes(c.key)
));

/** Chips de recorte por situação (contagens sobre as linhas carregadas). */
const recorte = ref(null);
const chips = computed(() => (decisao.value?.situacoes
  ? Object.entries(decisao.value.situacoes).map(([key, totalKey]) => ({
    key, label: SITUATION_META[key]?.label || key, total: totalKey,
  })).sort((a, b) => b.total - a.total)
  : []));

const linhasVisiveis = computed(() => {
  if (!recorte.value) return linhas.value;
  return linhas.value.filter((row) => situationOf(row)?.key === recorte.value);
});

function alternarRecorte(key) {
  recorte.value = recorte.value === key ? null : key;
}

const legendaTabela = 'Uma linha por anúncio — clique para ver ofertadas, ativas, programadas, dados e histórico.';
const leadLista = computed(() => (recorte.value
  ? `${linhasVisiveis.value.length} anúncios com "${SITUATION_META[recorte.value]?.label || recorte.value}" nesta página — clique de novo no chip para ver todos.`
  : `${total.value} anúncios no catálogo — clique numa linha para ver o processo completo.`));

/* ---------------------------------------------------------------- drawer -- */

const detalhe = ref(null);
const detalheCarregando = ref(false);
const detalheErro = ref('');

function abrirDetalhe(row) {
  const id = row?.item_id;
  if (!id) return;
  expandido.value = expandido.value === id ? null : id;
  if (!expandido.value) {
    fecharDetalhe();
    return;
  }
  router.replace({ query: { ...route.query, item: id } });
  detalhe.value = null;
  detalheErro.value = '';
  detalheCarregando.value = true;
  AdvisorService.getItemDetail(id)
    .then(({ data }) => { detalhe.value = data; })
    .catch((err) => {
      detalheErro.value = err?.response?.data?.detail || 'Não foi possível carregar o detalhe do anúncio.';
    })
    .finally(() => { detalheCarregando.value = false; });
}

function fecharDetalhe() {
  expandido.value = null;
  detalhe.value = null;
  detalheErro.value = '';
  const query = { ...route.query };
  delete query.item;
  router.replace({ query });
}

// Deep-link: /promotions/advisor/analises?item=MLB… abre o drawer direto (o Hoje já emite isso).
watch(() => route.query.item, (id) => {
  if (id && id !== expandido.value) abrirDetalhe({ item_id: id });
});

function dataCurta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(d);
}

onMounted(() => {
  carregar();
  if (route.query.item) abrirDetalhe({ item_id: route.query.item });
});
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.an {
  &__filtros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-3;
  }
  &__busca { flex: 1 1 260px; max-width: 380px; }
  &__select { min-width: 150px; }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-2;
    margin-bottom: $space-3;
  }
  &__chip {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    padding: 4px 10px;
    border: 1px solid $border;
    border-radius: 999px;
    background: $surface;
    color: $text-body;
    font-size: $text-xs-size;
    cursor: pointer;

    &.is-on { border-color: $primary; color: $primary; }
  }
  &__chipLimpar {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    font-size: $text-xs-size;
    color: $text-muted;
  }

  &__mlb {
    display: block;
    font-size: $text-xs-size;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
  }
  &__titulo { display: block; font-weight: $font-medium; line-height: 1.3; }
  &__conta { display: block; font-size: $text-xs-size; color: $text-muted; }
  &__saude { display: block; font-size: $text-xs-size; color: $text-muted; }
  &__situacao { display: block; font-weight: $font-medium; }

  &__paginacao {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    margin-top: $space-4;
    padding-top: $space-3;
    border-top: 1px solid $border;
    font-size: $text-small-size;
    color: $text-muted;

    div { display: flex; align-items: center; gap: $space-2; }
  }
  &__paginaAtual { font-variant-numeric: tabular-nums; }
}

@media (max-width: 640px) {
  .an {
    &__filtros { gap: $space-2; }
    &__busca, &__select { flex: 1 1 140px; max-width: none; min-width: 140px; }
  }
}
</style>
