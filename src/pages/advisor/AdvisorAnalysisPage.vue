<template>
  <!-- PROMO-IA-45/48: aba Análises — tabela de análises, 1 linha por anúncio.
       O pipeline do dono vira coluna: Classificação → Situação → Decisão → Resultado. -->
  <AdvisorShell
    active="anuncios"
    pergunta="Consulte estado promocional, preço, estimativa financeira, última atuação e próximo passo por anúncio."
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
      <!-- Filtros: cartão próprio, separado da tabela (PROMO-IA-48). -->
      <div class="an__filtrosCard">
        <span class="an__filtrosTitulo">Filtros</span>
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
          <details class="an__filtrosAvancados">
            <summary>Mais filtros{{ filtrosAtivos ? ` (${filtrosAtivos})` : '' }}</summary>
            <div class="an__filtros">
          <q-select
            v-model="filtros.status" :options="statusOpcoes" dense outlined clearable emit-value map-options
            label="Status" aria-label="Status do anúncio no Mercado Livre" class="an__select"
          />
          <q-select
            v-model="filtros.promocao" :options="promocaoOpcoes" dense outlined clearable emit-value map-options
            label="Promoção" aria-label="Situação da promoção" class="an__select"
          />
          <q-select
            v-model="filtros.saude" :options="saudeOpcoes" dense outlined clearable emit-value map-options
            label="Saúde" aria-label="Saúde de vendas" class="an__select"
          />
          <q-toggle v-model="filtros.soAbaixoDoPiso" dense
                    label="Só abaixo do mínimo de margem ou lucro"
                    title="O mínimo é o seu: a menor margem e o menor lucro por venda que você aceita (Automação → Limites desta conta) — padrão: margem 30% e lucro R$ 13 por venda." />
          <q-toggle v-model="filtros.soComPromocao" dense label="Só com promoção" />
          <q-toggle v-model="filtros.soDupla" dense
                    label="Abaixo do mínimo e poucas vendas"
                    title="Anúncios com venda abaixo do mínimo de margem ou lucro E poucas vendas (parado/fraco) — os que precisam de preço E de revisão." />
            </div>
          </details>
          <q-btn v-if="filtrosAtivos" flat dense no-caps icon="filter_alt_off" label="Limpar filtros" @click="limparFiltros" />
        </div>
      </div>

      <!-- Facetas locais: deixam explícito que estes números são da página atual. -->
      <div class="an__chips" role="group" :aria-label="`Distribuição da página carregada: ${linhas.length} anúncios`">
        <span class="an__chipScope">Nesta página ({{ linhas.length }} anúncios):</span>
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

      <AdvisorSection title="Anúncios e estimativas atuais" :lead="leadLista" :tight="true">
        <template #action>
          <span class="an__meta">{{ linhasVisiveis.length }} nesta página · {{ total }} no catálogo</span>
        </template>

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
            <span class="an__conta">{{ row.sku || '—' }} · {{ row.account_nickname }}</span>
          </template>

          <!-- Anúncio: badge de Status na frente do título + MLB·SKU·conta na linha de apoio. -->
          <template #cell-anuncio="{ row }">
            <div class="an__anuncioTopo">
              <AdvisorStatusPill :status="STATUS_PILL[row.status] || 'neutral'">
                {{ statusLabel(row.status) }}
              </AdvisorStatusPill>
              <strong class="an__titulo">{{ row.title }}</strong>
            </div>
            <span class="an__conta">{{ row.item_id }} · {{ row.sku || '—' }} · {{ row.account_nickname }}</span>
          </template>

          <!-- 1. CLASSIFICAÇÃO: uma coisa só — como o anúncio foi classificado. -->
          <template #cell-classificacao="{ row }">
            <div class="an__pipeline">
              <AdvisorStatusPill :status="SAUDE_PILL[row.health] || 'neutral'">
                {{ HEALTH_META[row.health]?.label || '—' }}
              </AdvisorStatusPill>
              <span class="an__data">{{ dataCurta(row.computed_at) }}</span>
            </div>
          </template>

          <!-- 2. SITUAÇÃO DA VENDA: o estado financeiro/promocional. -->
          <template #cell-situacao="{ row }">
            <div class="an__pipeline">
              <AdvisorStatusPill :status="SITUACAO_PILL[situationOf(row)?.key] || 'neutral'"
                                 :title="situationOf(row)?.reason">
                {{ SITUACAO_CURTA[situationOf(row)?.key] || situationOf(row)?.label || '—' }}
              </AdvisorStatusPill>
              <router-link
                v-if="isBelowMin(row)" class="an__data an__minBotao"
                :to="{ name: 'promotions-advisor-automacao', query: { account_id: row.account_id } }"
                :title="`${situationOf(row)?.reason} Ajustar os limites na configuração da conta.`"
                @click.stop
              >
                mín. {{ Math.round(floorMarginOf(row)) }}% · R$ {{ Math.round(floorProfitOf(row)) }}
              </router-link>
            </div>
          </template>

          <!-- 3. SUGESTÃO ESTIMADA: cálculo da regra local, não decisão registrada pelo robô. -->
          <template #cell-decisao="{ row }">
            <AdvisorStatusPill :status="DECISAO_PILL[suggestionOf(row)?.key] || 'neutral'"
                               :title="decisaoTitle(row)">
              {{ DECISAO_CURTA[suggestionOf(row)?.key] || suggestionOf(row)?.label || '—' }}
            </AdvisorStatusPill>
          </template>

          <!-- 4. RESULTADO: o desfecho real (ou não) da última ação. -->
          <template #cell-resultado="{ row }">
            <div class="an__pipeline">
              <AdvisorStatusPill v-if="resultOf(row).key !== 'nada'"
                                 :status="RESULT_PILL[resultOf(row).key] || 'neutral'"
                                 :title="resultOf(row).detail">
                {{ resultOf(row).label }}
              </AdvisorStatusPill>
              <span v-else class="an__data" :title="resultOf(row).detail">—</span>
              <span v-if="resultOf(row).at" class="an__data">{{ dataCurta(resultOf(row).at) }}</span>
            </div>
          </template>

          <template #cell-preco="{ row }">
            <div class="an__pipeline">
              <span>{{ brl(row.promotion_state?.state === 'active' ? row.buyer_price : row.price) }}</span>
              <span class="an__data">{{ priceBasis(row) }}</span>
            </div>
          </template>
          <template #cell-margemLucro="{ row }">
            <div class="an__pipeline">
              <strong v-if="row.promotion_state?.state !== 'unconfirmed'">{{ pct(row.margin_pct) }} · {{ brl(row.profit_unit) }}</strong>
              <strong v-else>Margem atual não confirmada</strong>
              <span class="an__data">{{ row.promotion_state?.state === 'unconfirmed' ? 'Cálculo histórico no detalhe' : `Estimativa do retrato ${dataCurta(row.computed_at)}` }}</span>
              <router-link v-if="isBelowMin(row)" class="an__data an__minBotao"
                           :to="{ name: 'promotions-advisor-automacao', query: { account_id: row.account_id } }"
                           @click.stop>
                mín. {{ Math.round(floorMarginOf(row)) }}% · R$ {{ Math.round(floorProfitOf(row)) }}
              </router-link>
            </div>
          </template>
          <template #cell-proximo="{ row }">
            <div class="an__pipeline">
              <span>{{ row.next_step?.label || 'Próximo passo indisponível' }}</span>
              <span v-if="row.next_step?.next_attempt_at" class="an__data">Previsão {{ dataCurta(row.next_step.next_attempt_at) }}</span>
              <span v-if="row.next_step?.chain_count > 1" class="an__data">{{ row.next_step.chain_count }} cadeias em aberto</span>
            </div>
          </template>
          <template #cell-ritmo="{ row }">
            <span :title="tituloRitmo(row)">
              {{ row.health_info?.units_per_week == null ? '—' : `${String(row.health_info.units_per_week).replace('.', ',')}/sem.` }}
            </span>
          </template>
          <template #cell-margemBase="{ row }">
            <span :class="{ 'an__ruim': abaixoMinimoMargem(row.base_margin_pct, row) }"
                  :title="row.base_margin_pct == null ? emptyCellReason(row) : ''">
              {{ pct(row.base_margin_pct) }}
            </span>
          </template>
          <template #cell-margem="{ row }">
            <span :class="{ 'an__ruim': abaixoMinimoMargem(row.margin_pct, row) }"
                  :title="row.margin_pct == null ? emptyCellReason(row) : ''">
              {{ pct(row.margin_pct) }}
            </span>
          </template>
          <template #cell-ofertadas="{ row }">
            <span class="an__badge" :class="{ 'is-on': (row.candidates_count ?? 0) > 0 }">{{ row.candidates_count ?? 0 }}</span>
          </template>
          <template #cell-promoAtiva="{ row }">
            <div class="an__pipeline">
              <span>{{ promocaoLabel(row) }}</span>
              <span class="an__data">{{ row.promotion_state?.observed_at ? `Observado ${dataCurta(row.promotion_state.observed_at)}` : 'Sem coleta registrada' }}</span>
            </div>
          </template>
          <template #cell-desconto="{ row }">{{ row.discount_pct == null ? '—' : pct(row.discount_pct) }}</template>
          <template #cell-lucro="{ row }">
            <span :class="{ 'an__ruim': abaixoMinimoLucro(row.profit_unit, row) }"
                  :title="row.profit_unit == null ? emptyCellReason(row) : ''">
              {{ brl(row.profit_unit) }}
            </span>
          </template>
          <template #cell-frete="{ row }">
            <span :title="row.shipping_cost == null ? 'Sem dado: sem histórico de frete nem cotação para este anúncio.' : 'Frete estimado por faixa de preço — em desconto profundo pode sair otimista; antes de escrever, o sistema cota o frete ao vivo.'">
              {{ brl(row.shipping_cost) }}
            </span>
          </template>
          <template #cell-estoque="{ row }">
            <span :class="{ 'an__ruim': (row.available_quantity ?? 0) === 0 }"
                  :title="`Vendidos: ${row.sold_quantity ?? 0}`">
              {{ row.available_quantity ?? '—' }}
            </span>
          </template>
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

      <!-- PROMO-IA-51: o resultado não se explica sozinho — "Bloqueado (proteção)"
           já gerou dúvida do dono (a proteção segurou a escrita; o ML não bloqueou). -->
      <details class="an__glossarioDetalhes">
        <summary>O que significa cada resultado</summary>
        <p>A última atuação descreve o que aconteceu com a escrita do robô. Bloqueios por preço automático do Mercado Livre não são erro: o robô sinaliza e não escreve.</p>
        <dl class="an__legenda">
          <div v-for="item in LEGENDARIO_RESULTADOS" :key="item.key" class="an__legendaItem">
            <dt><AdvisorStatusPill :status="RESULT_PILL[item.key] || 'neutral'">{{ item.label }}</AdvisorStatusPill></dt>
            <dd>{{ item.regra }}</dd>
          </div>
        </dl>
      </details>
    </template>

    <AdvisorItemDrawer
      v-if="expandido"
      :detalhe="detalhe" :carregando="detalheCarregando" :erro="detalheErro"
      :revisao-estado="revisaoEstado" :revisao-mensagem="revisaoMensagem"
      @fechar="fecharDetalhe" @enviar-revisao="enviarParaRevisao"
    />
  </AdvisorShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AdvisorEmptyState from 'src/components/advisor/AdvisorEmptyState.vue';
import AdvisorItemDrawer from 'src/components/advisor/AdvisorItemDrawer.vue';
import AdvisorSection from 'src/components/advisor/AdvisorSection.vue';
import AdvisorShell from 'src/components/advisor/AdvisorShell.vue';
import AdvisorStatusPill from 'src/components/advisor/AdvisorStatusPill.vue';
import AdvisorTable from 'src/components/advisor/AdvisorTable.vue';
import { useAdvisorCatalog } from 'src/composables/advisor/useAdvisorCatalog';
import AdvisorService from 'src/services/AdvisorService';
import {
  HEALTH_META, LEGENDARIO_RESULTADOS, SITUATION_META,
  brl, emptyCellReason, floorMarginOf, floorProfitOf, isBelowMin, janelasRitmo, pct,
  resultOf, situationOf, suggestionOf,
} from 'src/utils/advisorDecision';

const route = useRoute();
const router = useRouter();
const {
  linhas, total, carregando, erro, filtros, ordenacao, pagina, porPagina, expandido,
  contasOpcoes, saudeOpcoes, statusOpcoes, filtrosAtivos, temFiltroDeEscopo,
  totalPaginas, primeira, ultima, decisao,
  carregar, limparFiltros, ordenarPor,
} = useAdvisorCatalog({
  conta: typeof route.query.account_id === 'string' ? route.query.account_id : null,
  status: typeof route.query.status === 'string' ? route.query.status : 'active',
  promocao: typeof route.query.promotion_state === 'string' ? route.query.promotion_state : null,
}, 'attention');

watch(() => route.query.promotion_state, (state) => {
  filtros.promocao = typeof state === 'string' ? state : null;
});
watch(() => [filtros.conta, filtros.status, filtros.promocao], ([account_id, status, promotion_state]) => {
  router.replace({ query: {
    ...route.query,
    account_id: account_id || undefined,
    status: status && status !== 'active' ? status : undefined,
    promotion_state: promotion_state || undefined,
  } });
});

/**
 * Colunas do catálogo: dados para decisão ficam primeiro —
 * Situação promocional → preço ao comprador → estimativa → última ação → próximo passo —
 * O painel lateral preserva as análises financeiras e o ritmo detalhados. A tabela
 * mostra o preço observado ao comprador sem exigir rolagem horizontal.
 */
const COLUNAS = [
  { key: 'anuncio', label: 'Anúncio', minWidth: 180 },
  { key: 'promoAtiva', label: 'Situação da promoção', minWidth: 130 },
  { key: 'preco', label: 'Preço ao comprador', numeric: true, sortable: true, sortKey: 'price', minWidth: 110 },
  { key: 'margemLucro', label: 'Margem e lucro estimados', minWidth: 130 },
  { key: 'resultado', label: 'Última atuação', minWidth: 120 },
  { key: 'proximo', label: 'Próximo passo', minWidth: 140 },
];

/** Cartão do mobile: o pipeline primeiro, depois o essencial financeiro. */
const CAMPOS_CARTAO = COLUNAS.filter((c) => (
  ['promoAtiva', 'preco', 'margemLucro', 'resultado', 'proximo'].includes(c.key)
));

/* ------------------------------------------------- pílulas e traduções -- */

const STATUS_PILL = { active: 'verificado', paused: 'pausado', closed: 'neutral' };
const promocaoOpcoes = [
  { label: 'Ativa confirmada', value: 'active' },
  { label: 'Somente programada', value: 'scheduled_only' },
  { label: 'Sem promoção confirmada', value: 'without_promotion' },
  { label: 'Estado não confirmado', value: 'unconfirmed' },
];
function promocaoLabel(row) {
  const state = row.promotion_state?.state;
  return {
    active: 'Promoção ativa no retrato',
    scheduled_only: 'Somente programada no retrato',
    without_promotion: 'Sem promoção, leitura completa',
    unconfirmed: 'Estado não confirmado',
  }[state] || 'Estado promocional indisponível';
}
function priceBasis(row) {
  if (row.promotion_state?.state === 'active'
    && row.active_promo?.promotion_type === 'SELLER_COUPON_CAMPAIGN') {
    return 'Preço com cupom, condicionado ao carrinho';
  }
  return ({
    active: 'Preço observado na promoção',
    scheduled_only: 'Preço-base cadastrado; oferta aguarda início',
    without_promotion: 'Preço-base cadastrado; sem promoção na leitura',
    unconfirmed: 'Preço-base cadastrado; desconto não confirmado',
  })[row.promotion_state?.state] || 'Preço-base cadastrado';
}
const SAUDE_PILL = { parado: 'divergente', fraco: 'recusado', medio: 'aplicado', alto: 'verificado' };
const SITUACAO_PILL = {
  bloqueado_piso: 'divergente', sem_dados: 'bloqueado', baixo_giro: 'recusado',
  promo_ativa: 'verificado', sem_promo: 'neutral',
};
const DECISAO_PILL = {
  corrigir_e_revisar: 'divergente', bloqueado: 'bloqueado', rebase: 'recusado',
  revisar: 'aguardando', reduzir: 'aguardando', manter: 'verificado',
  sem_dados: 'bloqueado', aguardando: 'neutral',
};
const RESULT_PILL = {
  confirmado: 'verificado', mantido: 'verificado', aguardando: 'aguardando', preparado: 'neutral', falha: 'recusado', recusado: 'recusado',
  sem_confirmacao: 'bloqueado', bloqueado: 'bloqueado', nada: 'neutral',
};

// PROMO-IA-49: rótulos CURTOS para a tabela (tooltip traz o texto completo).
const DECISAO_CURTA = {
  corrigir_e_revisar: 'Preço + revisão',
  bloqueado: 'Corrigir preço',
  rebase: 'Reprecificar',
  revisar: 'Revisar',
  reduzir: 'Reduzir desconto',
  manter: 'Não mexer',
  sem_dados: 'Sem dados',
  aguardando: 'Aguardando',
};
const SITUACAO_CURTA = {
  bloqueado_piso: 'Abaixo do mínimo',
  sem_dados: 'Sem cálculo',
  baixo_giro: 'Poucas vendas',
  promo_ativa: 'Com promoção',
  sem_promo: 'Sem ativa observada',
};

function statusLabel(s) {
  return { active: 'Ativo', paused: 'Pausado', closed: 'Fechado' }[s] || s || '—';
}

const ACAO_LABEL = {
  aprofundar: 'aprofunda', reduzir: 'reduz', rebase: 'reprecifica',
  manter: 'não mexe', capturar: 'captura', sem_oferta: 'sem oferta',
};

function ultimaAcaoTexto(row) {
  const acao = row?.agent_last;
  if (!acao) return 'nunca executou ação';
  const rotulo = ACAO_LABEL[acao.acao] || acao.acao || 'agiu';
  return `${rotulo} em ${dataCurta(acao.created_at)}`;
}

function decisaoTitle(row) {
  const s = suggestionOf(row);
  return `${s?.detail || ''} Última ação: ${ultimaAcaoTexto(row)}.`;
}

/** PROMO-IA-52: tooltip do ritmo com as DUAS janelas — a célula mostra a média de
 *  30 dias ("X/sem."); o tooltip traz as vendas em 14 dias e a última venda, que
 *  são o que o "Parado" olha. Antes "Parado" com "5,6/sem." parecia bug. */
function tituloRitmo(row) {
  const janelas = janelasRitmo(row.health_info);
  const base = row.sales_30d == null ? '' : `${row.sales_30d} vendas em 30 dias`;
  if (!janelas) return base;
  if (!base) return janelas;
  // contagem absoluta + as janelas: "5 vendas em 30 dias · 0 vendas em 14 dias ·
  // última venda em 06/09 · média de 30 dias: 5,6 un./semana"
  return `${base} · ${janelas}`;
}

/* -------------------------------------------------- cores e formatação -- */

function abaixoMinimoMargem(v, row) {
  return v != null && v < floorMarginOf(row);
}
function abaixoMinimoLucro(v, row) {
  return v != null && v < floorProfitOf(row);
}

/* -------------------------------------------------------------- chips -- */

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

const legendaTabela = 'Uma linha por anúncio. Promoção, preço e cálculos vêm do retrato salvo, com data em cada linha; a última atuação é histórica. O próximo passo só traz tarefa vinculada quando há registro. Clique para ver o detalhe.';
const leadLista = computed(() => (recorte.value
  ? `Recorte "${SITUATION_META[recorte.value]?.label || recorte.value}" — clique de novo no chip para ver todos.`
  : 'Clique numa linha para ver ofertadas, ativas, programadas, dados e histórico.'));

/* --------------------------------------------------------------- drawer -- */

const detalhe = ref(null);
const detalheCarregando = ref(false);
const detalheErro = ref('');
const revisaoEstado = ref('');     // '' | enviando | enviado | erro
const revisaoMensagem = ref('');

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
  revisaoEstado.value = '';
  revisaoMensagem.value = '';
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
  revisaoEstado.value = '';
  revisaoMensagem.value = '';
  const query = { ...route.query };
  delete query.item;
  router.replace({ query });
}

async function enviarParaRevisao() {
  if (!expandido.value) return;
  revisaoEstado.value = 'enviando';
  revisaoMensagem.value = '';
  try {
    await AdvisorService.enqueueForReview({
      item_ids: [expandido.value],
      reason: 'abaixo do mínimo + poucas vendas',
    });
    revisaoEstado.value = 'enviado';
  } catch (err) {
    revisaoEstado.value = 'erro';
    revisaoMensagem.value = err?.response?.data?.detail
      || err?.response?.data?.error
      || 'Não foi possível enfileirar para revisão.';
  }
}

// Deep-link: /promotions/advisor?item=MLB… abre o drawer direto (o Hoje já emite isso).
watch(() => route.query.item, (id) => {
  if (id && id !== expandido.value) abrirDetalhe({ item_id: id });
});

function dataCurta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  // compacto: "23/09 10:22" (sem a vírgula) — a tabela precisa caber na tela
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(d).replace(', ', ' ');
}

let mobileQuery;
function ajustarPaginaMobile() { porPagina.value = mobileQuery?.matches ? 10 : 40; }
onMounted(() => {
  if (window.matchMedia) {
    mobileQuery = window.matchMedia('(max-width: 599px)');
    ajustarPaginaMobile();
    mobileQuery.addEventListener('change', ajustarPaginaMobile);
  }
  if (!mobileQuery?.matches) carregar();
  if (route.query.item) abrirDetalhe({ item_id: route.query.item });
});
onBeforeUnmount(() => mobileQuery?.removeEventListener('change', ajustarPaginaMobile));
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.an {
  &__filtrosCard {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding: $space-3 $space-4;
    background: $surface;
    border: 1px solid $border;
    border-radius: $radius-lg;
    margin-bottom: $space-3;
  }
  &__filtrosTitulo {
    font-size: $text-xs-size;
    font-weight: $font-semibold;
    text-transform: uppercase;
    letter-spacing: .04em;
    color: $text-muted;
  }
  &__filtros {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $space-3;
  }
  &__filtrosAvancados {
    flex: 1 1 100%;
    summary { color: $primary; cursor: pointer; font-weight: $font-semibold; }
    > .an__filtros { padding-top: $space-2; }
  }
  &__glossarioDetalhes {
    padding: $space-4;
    margin-bottom: $space-4;
    border: 1px solid $border;
    border-radius: $radius-lg;
    background: $surface;
    summary { cursor: pointer; font-weight: $font-semibold; color: $text-primary; }
    > p { margin: $space-3 0; color: $text-body; }
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
  &__chipScope {
    font-size: $text-xs-size;
    color: $text-muted;
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

  &__meta {
    font-size: $text-xs-size;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  &__mlb {
    display: block;
    font-size: $text-xs-size;
    color: $text-muted;
    font-variant-numeric: tabular-nums;
  }
  &__titulo { display: block; font-weight: $font-medium; line-height: 1.3; }
  &__conta { display: block; font-size: $text-xs-size; color: $text-muted; }

  // PROMO-IA-49: badge de Status na frente do título + identificadores numa linha só
  &__anuncioTopo {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: $space-2;
  }

  // células do pipeline: pílula + linha de apoio pequena
  &__pipeline {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
    min-width: 0;
    width: 100%;
  }
  &__data {
    font-size: $text-xs-size;
    color: $text-muted;
    overflow-wrap: anywhere;
  }

  // abaixo do mínimo da conta (margem/lucro) → vermelho
  &__ruim { color: $negative; font-weight: $font-semibold; }

  &__badge {
    display: inline-block;
    min-width: 22px;
    text-align: center;
    padding: 1px 7px;
    border-radius: 999px;
    font-size: $text-xs-size;
    color: $text-muted;

    &.is-on { background: $tint-amber-bg; color: $tint-amber-text; font-weight: $font-semibold; }
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

  // PROMO-IA-49: apertar a tabela para CABER na tela — padding horizontal menor,
  // altura da linha preservada (o dono gostou do tamanho de linha).
  :deep(.adv-table__table th),
  :deep(.adv-table__table td) {
    padding: $space-2 8px;
  }

  // PROMO-IA-51: legenda do resultado — os 6 desfechos reais do ledger.
  &__legenda {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: $space-5;
    margin: 0;
  }
  &__legendaItem {
    dt { margin-bottom: 2px; }
    dd { margin: 2px 0 0; font-size: $text-xs-size; color: $text-muted; line-height: 1.5; }
  }

  &__minBotao {
    color: inherit;
    text-decoration: underline dotted;
  }
}

@media (max-width: 640px) {
  .an {
    &__filtros { gap: $space-2; }
    &__busca, &__select { flex: 1 1 140px; max-width: none; min-width: 140px; }
  }
}
</style>
