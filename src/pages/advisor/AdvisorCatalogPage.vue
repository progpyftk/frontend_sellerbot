<template>
  <AdvisorShell
    active="anuncios"
    pergunta="Quais anúncios estão sob sua atenção — e o que o robô sugere para cada um?"
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
      <!-- Busca e filtros: ficam ACIMA da lista, mas nada esconde o dado (contagem sempre visível). -->
      <div class="cat__filtros">
        <q-input
          v-model="filtros.q" dense outlined clearable debounce="0"
          placeholder="Buscar por título, SKU ou MLB" aria-label="Buscar anúncio"
          class="cat__busca"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>

        <q-select
          v-model="filtros.conta" :options="contasOpcoes" dense outlined clearable emit-value map-options
          label="Conta" aria-label="Conta" class="cat__select"
        />
        <q-select
          v-model="filtros.saude" :options="saudeOpcoes" dense outlined clearable emit-value map-options
          label="Saúde" aria-label="Saúde de vendas" class="cat__select"
        />
        <q-select
          v-model="filtros.status" :options="statusOpcoes" dense outlined clearable emit-value map-options
          label="Situação" aria-label="Situação do anúncio" class="cat__select"
        />

        <q-toggle v-model="filtros.soAbaixoDoPiso" dense label="Só abaixo do piso" />
        <q-toggle v-model="filtros.soComPromocao" dense label="Só com promoção" />

        <q-btn v-if="filtrosAtivos" flat dense no-caps icon="filter_alt_off" label="Limpar filtros" @click="limparFiltros" />
      </div>

      <p v-if="temFiltroDeEscopo" class="cat__nota" role="status">
        <q-icon name="info" size="14px" aria-hidden="true" />
        Os totais abaixo são do catálogo inteiro; a lista mostra o recorte dos filtros.
      </p>

      <!-- Números do catálogo: o que o dono usa para decidir onde olhar primeiro -->
      <div class="cat__metricas">
        <AdvisorMetric :value="resumo.ads ?? '—'" label="anúncios no catálogo" :hint="retratoTexto" />
        <AdvisorMetric :value="resumo.below_floor ?? 0" label="abaixo do piso" variant="warn" hint="margem ou lucro fora do mínimo" />
        <AdvisorMetric :value="resumo.with_active_promo ?? 0" label="com promoção ativa" hint="o robô não precisa agir" />
        <AdvisorMetric :value="resumo.assistente ?? 0" label="com sugestão do robô" hint="aprofundar, reduzir ou rebaser" />
        <AdvisorMetric :value="resumo.agent_history ?? 0" label="já mexidos pelo robô" hint="histórico de acionamento" />
      </div>

      <AdvisorSection title="Anúncios" :count="total" :lead="leadLista" :tight="true">
        <template #action>
          <q-btn-toggle
            v-model="preset" dense no-caps unelevated toggle-color="primary"
            :options="presets.map((p) => ({ label: p.label, value: p.value }))"
            aria-label="Quanto detalhe mostrar na tabela"
          />
        </template>

        <AdvisorEmptyState
          v-if="!linhas.length && !carregando" variant="vazio"
          :title="temFiltroDeEscopo ? 'Nenhum anúncio com esse recorte' : 'Nenhum anúncio no catálogo'"
          :message="temFiltroDeEscopo ? 'Tente afrouxar os filtros — o catálogo continua o mesmo.' : 'Nenhuma conta trouxe anúncios ainda.'"
        />

        <AdvisorTable
          v-else
          :columns="colunas"
          :rows="linhas"
          :sort="ordenacao"
          :expandido="expandido"
          :legenda="legendaTabela"
          :campos-cartao="camposCartao"
          @sort="ordenarPor"
          @row="alternarDetalhe"
        >
          <template #card-title="{ row }">
            <span class="cat__mlb">{{ row.item_id }}</span>
            <strong class="cat__titulo">{{ row.title }}</strong>
            <span class="cat__conta">{{ row.account_nickname }}</span>
          </template>

          <template #cell-titulo="{ row }">
            <span class="cat__mlb">{{ row.item_id }}</span>
            <span class="cat__titulo">{{ row.title }}</span>
            <span class="cat__conta">{{ row.account_nickname }}</span>
          </template>

          <template #cell-situacao="{ row }">
            <AdvisorStatusPill :status="situacao(row).status">{{ situacao(row).label }}</AdvisorStatusPill>
          </template>

          <template #cell-sugestao="{ row }">
            <span>{{ sugestao(row).label }}</span>
          </template>

          <template #cell-preco="{ row }">{{ brl(row.price) }}</template>
          <template #cell-promo="{ row }">{{ brl(row.buyer_price) }}</template>
          <template #cell-margem="{ row }">
            <span :class="{ 'cat__ruim': row.below_floor }">{{ pct(row.margin_pct) }}</span>
          </template>
          <template #cell-lucro="{ row }">
            <span :class="{ 'cat__ruim': row.below_floor }">{{ brl(row.profit_unit) }}</span>
          </template>
          <template #cell-vendas="{ row }">{{ row.sales_30d ?? 0 }}</template>
          <template #cell-cmv="{ row }">{{ brl(row.cmv_unit) }}</template>
          <template #cell-saude="{ row }">{{ HEALTH_META[row.health]?.label || '—' }}</template>
          <template #cell-desconto="{ row }">{{ row.discount_pct === null ? '—' : pct(row.discount_pct) }}</template>
          <template #cell-ultimaAcao="{ row }">{{ ultimaAcaoTexto(row) }}</template>
          <template #cell-abrir="{ row }">
            <a :href="row.permalink" target="_blank" rel="noopener" class="cat__link" @click.stop>
              abrir no ML <q-icon name="open_in_new" size="13px" aria-hidden="true" />
            </a>
          </template>
        </AdvisorTable>

        <!-- Drill-down: a linha inteira, sem sair da página e sem popup. -->
        <div v-if="linhaExpandida" class="cat__detalhe">
          <header>
            <strong>{{ linhaExpandida.item_id }}</strong>
            <span>{{ linhaExpandida.title }}</span>
            <q-btn flat dense no-caps icon="close" label="fechar" @click="expandido = null" />
          </header>
          <dl>
            <div v-for="campo in detalheCampos" :key="campo.label">
              <dt>{{ campo.label }}</dt>
              <dd>{{ campo.valor }}</dd>
            </div>
          </dl>
          <p class="cat__detalheNota">
            A situação e a sugestão saem da mesma régua que o robô usa para escrever: margem-alvo por
            saúde de vendas, com piso de {{ FLOOR_MARGIN_PCT }}% de margem e {{ brl(FLOOR_PROFIT_BRL) }} de lucro por venda.
          </p>
        </div>

        <footer v-if="total > porPagina" class="cat__paginacao">
          <span>{{ primeira }}–{{ ultima }} de {{ total }}</span>
          <div>
            <q-btn flat dense no-caps icon="chevron_left" :disable="pagina <= 1"
                   aria-label="Página anterior" @click="pagina -= 1" />
            <span class="cat__paginaAtual">{{ pagina }} / {{ totalPaginas }}</span>
            <q-btn flat dense no-caps icon="chevron_right" :disable="pagina >= totalPaginas"
                   aria-label="Próxima página" @click="pagina += 1" />
          </div>
        </footer>
      </AdvisorSection>
    </template>
  </AdvisorShell>
</template>

<script setup>
import { computed, onMounted } from 'vue';

import AdvisorEmptyState from 'src/components/advisor/AdvisorEmptyState.vue';
import AdvisorMetric from 'src/components/advisor/AdvisorMetric.vue';
import AdvisorSection from 'src/components/advisor/AdvisorSection.vue';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorStatusPill from 'src/components/advisor/AdvisorStatusPill.vue';
import AdvisorTable from 'src/components/advisor/AdvisorTable.vue';
import { useAdvisorCatalog } from 'src/composables/advisor/useAdvisorCatalog';
import {
  FLOOR_MARGIN_PCT, FLOOR_PROFIT_BRL, HEALTH_META, brl, pct, situationOf, suggestionOf,
} from 'src/utils/advisorDecision';

const {
  linhas, total, resumo, retrato, carregando, erro, filtros, ordenacao, pagina, porPagina,
  preset, presets, expandido, contasOpcoes, saudeOpcoes, statusOpcoes,
  filtrosAtivos, temFiltroDeEscopo, totalPaginas, primeira, ultima,
  carregar, limparFiltros, ordenarPor, alternarDetalhe,
} = useAdvisorCatalog();

/**
 * Colunas por preset. `grupo` decide em quais presets a coluna entra; a ordem é a de leitura de
 * decisão (o que fazer vem antes de quanto custou). Nada do catálogo antigo foi removido — quem
 * quer as 12 colunas escolhe "Completo".
 */
const COLUNAS = [
  { key: 'titulo', label: 'Anúncio', grupo: 'always', width: '26%', minWidth: 240 },
  { key: 'situacao', label: 'Situação', grupo: 'always', minWidth: 140 },
  { key: 'sugestao', label: 'O que fazer', grupo: 'assistente', minWidth: 170 },
  { key: 'preco', label: 'Preço-base', grupo: 'assistente', numeric: true, sortable: true, sortKey: 'price', minWidth: 104 },
  { key: 'promo', label: 'Preço promo', grupo: 'assistente', numeric: true, minWidth: 104 },
  { key: 'margem', label: 'Margem', grupo: 'assistente', numeric: true, sortable: true, sortKey: 'margin', minWidth: 90 },
  { key: 'lucro', label: 'Lucro/un.', grupo: 'assistente', numeric: true, minWidth: 96 },
  { key: 'vendas', label: 'Vendas 30d', grupo: 'assistente', numeric: true, sortable: true, sortKey: 'sales', minWidth: 96 },
  { key: 'ultimaAcao', label: 'Última ação', grupo: 'assistente', sortable: true, sortKey: 'activation', minWidth: 130 },
  { key: 'cmv', label: 'CMV', grupo: 'financeiro', numeric: true, minWidth: 96 },
  { key: 'saude', label: 'Saúde', grupo: 'completo', minWidth: 100 },
  { key: 'desconto', label: 'Desconto', grupo: 'completo', numeric: true, sortable: true, sortKey: 'discount', minWidth: 96 },
  { key: 'abrir', label: 'No Mercado Livre', grupo: 'always', minWidth: 130 },
];

const GRUPOS = {
  assistente: ['assistente'],
  financeiro: ['assistente', 'financeiro'],
  completo: ['assistente', 'financeiro', 'completo'],
};

const colunas = computed(() => COLUNAS.filter(
  (col) => col.grupo === 'always' || (GRUPOS[preset.value] || GRUPOS.assistente).includes(col.grupo),
));

const camposCartao = computed(() => colunas.value
  .filter((col) => ['situacao', 'sugestao', 'preco', 'margem', 'lucro', 'vendas'].includes(col.key))
  .slice(0, 6));

const linhaExpandida = computed(() => linhas.value.find((l) => l.item_id === expandido.value) || null);

const detalheCampos = computed(() => {
  const l = linhaExpandida.value;
  if (!l) return [];
  return [
    { label: 'Conta', valor: l.account_nickname || l.account_id },
    { label: 'SKU', valor: l.sku || 'sem SKU' },
    { label: 'Situação', valor: `${situacao(l).label}` },
    { label: 'O que fazer', valor: sugestao(l).label },
    { label: 'Preço-base', valor: brl(l.price) },
    { label: 'Preço promo', valor: brl(l.buyer_price) },
    { label: 'CMV', valor: brl(l.cmv_unit) },
    { label: 'Margem', valor: pct(l.margin_pct) },
    { label: 'Lucro por venda', valor: brl(l.profit_unit) },
    { label: 'Vendas 30 dias', valor: `${l.sales_30d ?? 0}` },
    { label: 'Saúde de vendas', valor: HEALTH_META[l.health]?.label || '—' },
    { label: 'Última ação do robô', valor: ultimaAcaoTexto(l) },
  ];
});

const legendaTabela = computed(
  () => `Anúncios do catálogo. Ordenado por ${rotuloOrdem.value}.`,
);

const rotuloOrdem = computed(() => {
  const chave = ordenacao.value.replace(/^-/, '');
  const col = COLUNAS.find((c) => (c.sortKey || c.key) === chave);
  const direcao = ordenacao.value.startsWith('-') ? 'maior primeiro' : 'menor primeiro';
  return `${col?.label || chave} (${direcao})`;
});

const leadLista = computed(() => {
  const base = `${total.value} anúncios neste recorte — ordenados por ${rotuloOrdem.value}.`;
  if (!filtrosAtivos.value) return `${base} Clique numa linha para ver tudo sobre ela.`;
  return `${base} Há filtros ativos; limpe-os para ver o catálogo inteiro.`;
});

const retratoTexto = computed(() => {
  if (!retrato.value?.computed_at) return 'custo e frete calculados pelo robô';
  const quando = dataHora(retrato.value.computed_at);
  return retrato.value.stale ? `retrato de ${quando} (pode estar velho)` : `retrato de ${quando}`;
});

function situacao(row) {
  const s = situationOf(row);
  const variantes = {
    bloqueado_piso: 'divergente', sem_dados: 'bloqueado', baixo_giro: 'recusado',
    promo_ativa: 'verificado', sem_promo: 'neutral',
  };
  return { label: s?.label || '—', status: variantes[s?.key] || 'neutral' };
}

function sugestao(row) {
  return suggestionOf(row) || { label: '—' };
}

/**
 * `agent_last` é um OBJETO (`{created_at, acao}`), não uma data — passar o objeto direto para
 * `new Date()` derrubava a superfície inteira com `RangeError: Invalid time value`.
 */
const ACAO_LABEL = {
  aprofundar: 'aprofunda',
  reduzir: 'reduz',
  rebase: 'rebase',
  manter: 'não mexe',
  capturar: 'captura',
  sem_oferta: 'sem oferta',
};

function ultimaAcaoTexto(row) {
  const acao = row?.agent_last;
  if (!acao) return 'nunca';
  const quando = dataHora(acao.created_at);
  const rotulo = ACAO_LABEL[acao.acao] || acao.acao || 'agiu';
  return quando === '—' ? rotulo : `${rotulo} em ${quando}`;
}

/** Formata ISO em data/hora de Brasília. Nunca lança: data inválida vira "—". */
function dataHora(iso) {
  const data = new Date(iso);
  if (!iso || Number.isNaN(data.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(data);
}

onMounted(carregar);
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.cat {
  &__filtros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-3;
  }
  &__busca { flex: 1 1 260px; max-width: 380px; }
  &__select { min-width: 150px; }

  &__nota {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: $text-xs-size;
    color: $text-muted;
    margin: 0 0 $space-3;
  }

  &__metricas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: $space-3;
    margin-bottom: $space-4;
  }

  &__mlb {
    display: block;
    font-size: $text-xs-size;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
  }
  &__titulo { display: block; font-weight: $font-medium; line-height: 1.3; }
  &__conta { display: block; font-size: $text-xs-size; color: $text-muted; }
  &__ruim { color: $negative; font-weight: $font-semibold; }
  &__link {
    color: $primary;
    text-decoration: none;
    white-space: nowrap;
    font-size: $text-xs-size;
  }

  &__detalhe {
    margin-top: $space-4;
    padding-top: $space-4;
    border-top: 1px dashed $border;

    header {
      display: flex;
      align-items: baseline;
      gap: $space-3;
      margin-bottom: $space-3;

      strong { font-variant-numeric: tabular-nums; }
      span { color: $text-muted; flex: 1; }
    }
    dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: $space-3;
      margin: 0;
    }
    dt {
      font-size: $text-xs-size;
      color: $text-muted;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    dd { margin: 0; font-weight: $font-medium; }
  }
  &__detalheNota {
    margin: $space-3 0 0;
    font-size: $text-xs-size;
    color: $text-muted;
  }

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
  .cat {
    &__filtros { gap: $space-2; }
    &__busca, &__select { flex: 1 1 140px; max-width: none; min-width: 140px; }
    &__metricas { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
}
</style>
