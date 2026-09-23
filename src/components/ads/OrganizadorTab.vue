<template>
  <!--
    Aba Organizador (ADSA-25) — a tabela que o dono copia para o painel do Mercado Livre.

    O entregável é a tabela do meio: nome da campanha, MLB(s), ROAS alvo e orçamento (D13).
    Uma seção por conta, fechadas em si; só a sobreposição entre contas cruza as duas.

    Somente leitura (D9): nenhum botão aqui escreve no Mercado Livre.
  -->
  <div class="org">
    <!-- ── Faixa de confiança: só aparece quando há motivo ─────────────────── -->
    <div v-if="avisos.length" class="org__confianca" role="status">
      <q-icon name="warning_amber" size="16px" aria-hidden="true" />
      <ul>
        <li v-for="(aviso, i) in avisos" :key="i">{{ aviso }}</li>
      </ul>
    </div>

    <AdvisorEmptyState v-if="carregando" variant="carregando" />

    <AdvisorEmptyState
      v-else-if="erro"
      variant="erro"
      :message="erro"
    >
      <template #action>
        <button class="org__retry" @click="carregar">Tentar de novo</button>
      </template>
    </AdvisorEmptyState>

    <AdvisorEmptyState
      v-else-if="!contas.length"
      variant="vazio"
      title="Nenhuma conta com anúncios em campanha"
      message="Sincronize os dados de Ads ou escolha outro período."
    />

    <template v-else>
      <!-- ── Uma seção por conta (D13) ─────────────────────────────────────── -->
      <section v-for="conta in contas" :key="conta.conta" class="org__conta">
        <header class="org__contaHead">
          <h2 class="org__contaNome">
            <span class="org__dot" aria-hidden="true" />{{ conta.conta }}
          </h2>
          <AdvisorStatusPill
            v-if="conta.termometro_tacos"
            :status="tomDoTacos(conta.termometro_tacos)"
            :label="`TACOS ${fmtPct(conta.termometro_tacos.valor_pct)}`"
          />
        </header>

        <!-- Bloco 1 — diagnóstico estrutural -->
        <AdvisorSection title="Como está hoje" :lead="leadDoDiagnostico(conta)">
          <div class="org__metricas">
            <AdvisorMetric
              :value="conta.diagnostico.campanhas_ativas"
              label="campanhas ativas"
              :hint="`${conta.diagnostico.total_anuncios} anúncios`"
            />
            <AdvisorMetric
              :value="conta.diagnostico.curva_a_misturados"
              label="Curva A misturada"
              hint="deveriam estar isolados"
              :variant="conta.diagnostico.curva_a_misturados ? 'warn' : 'ok'"
            />
            <AdvisorMetric
              :value="conta.diagnostico.campanhas_leitura_cega"
              label="sem leitura de disputa"
              hint="campanhas com mais de 1 anúncio"
              :variant="conta.diagnostico.campanhas_leitura_cega ? 'warn' : 'ok'"
            />
            <AdvisorMetric
              :value="`${conta.diagnostico.anuncios_por_curva.A} / ${conta.diagnostico.anuncios_por_curva.B} / ${conta.diagnostico.anuncios_por_curva.C}`"
              label="Curva A / B / C"
              hint="Pareto de venda 80/15/5"
            />
            <AdvisorMetric
              :value="`${aplicadas(conta)} de ${conta.campanhas_sugeridas.length}`"
              label="campanhas já aplicadas"
              hint="o alvo é chegar em 100%"
              :variant="aplicadas(conta) === conta.campanhas_sugeridas.length ? 'ok' : 'neutral'"
            />
          </div>
        </AdvisorSection>

        <!-- Bloco 2 — a tabela que se copia -->
        <AdvisorSection
          title="Campanhas sugeridas"
          :count="conta.campanhas_sugeridas.length"
          lead="Copie linha a linha para o painel do Mercado Livre. Cada célula tem botão de copiar."
        >
          <template #action>
            <div class="org__acoes">
              <button class="org__btn" @click="baixarCsv(conta)">Baixar CSV</button>
              <button class="org__btn" @click="baixarMarkdown(conta)">Baixar checklist</button>
            </div>
          </template>

          <div v-if="!vinculoConfiavel" class="org__bloqueio">
            <q-icon name="lock" size="18px" aria-hidden="true" />
            <div>
              <strong>Tabela bloqueada.</strong>
              O vínculo entre anúncio e campanha não foi sincronizado dentro do limite, então a
              coluna de campanha atual pode estar desatualizada. Aplicar esta estrutura agora
              moveria anúncio errado. Sincronize os Ads e recarregue.
            </div>
          </div>

          <AdvisorTable
            v-else
            :columns="colunas"
            :rows="conta.campanhas_sugeridas"
            :campos-cartao="camposCartao"
            row-key="nome"
            :legenda="`${conta.conta} — período de ${periodoBr}`"
            @row="abrirDetalhe($event, conta)"
          >
            <template #card-title="{ row }">{{ row.nome }}</template>

            <template #cell-nome="{ row }">
              <div class="org__celNome">
                <AdvisorStatusPill
                  v-if="row.ja_existe"
                  status="aplicado"
                  label="aplicada"
                />
                <span class="org__nome">{{ row.nome }}</span>
                <button class="org__copy" :title="`Copiar ${row.nome}`" @click.stop="copiar(row.nome)">
                  <q-icon name="content_copy" size="13px" />
                </button>
              </div>
            </template>

            <template #cell-anuncios="{ row }">
              <div class="org__mlbs">
                <span v-for="mlb in row.anuncios" :key="mlb" class="org__mlb">
                  {{ mlb }}
                  <button class="org__copy" :title="`Copiar ${mlb}`" @click.stop="copiar(mlb)">
                    <q-icon name="content_copy" size="12px" />
                  </button>
                </span>
              </div>
            </template>

            <template #cell-roas_target="{ row }">
              <span v-if="row.roas_target == null" class="org__vazio">—</span>
              <span v-else class="org__num">
                {{ fmtRoas(row.roas_target) }}
                <button class="org__copy" @click.stop="copiar(fmtRoas(row.roas_target))">
                  <q-icon name="content_copy" size="12px" />
                </button>
              </span>
            </template>

            <template #cell-orcamento_diario="{ row }">
              <span v-if="row.orcamento_automatico" class="org__auto">Automático</span>
              <span v-else-if="row.orcamento_diario == null" class="org__vazio">—</span>
              <span v-else class="org__num">
                {{ fmtMoeda(row.orcamento_diario) }}
                <button class="org__copy" @click.stop="copiar(row.orcamento_diario.toFixed(2))">
                  <q-icon name="content_copy" size="12px" />
                </button>
                <q-icon
                  v-if="row.orcamento_estimado"
                  name="info_outline"
                  size="13px"
                  class="org__est"
                >
                  <q-tooltip>
                    Estimado: o custo de Ads por anúncio ainda é rateio da campanha.
                  </q-tooltip>
                </q-icon>
              </span>
            </template>
          </AdvisorTable>
        </AdvisorSection>

        <!-- Bloco 3 — plano de migração -->
        <AdvisorSection
          v-if="conta.plano.length"
          title="Por onde começar"
          :count="conta.plano.length"
          lead="Ordenado por dinheiro em risco: o maior gasto de Ads primeiro."
        >
          <ol class="org__plano">
            <li v-for="passo in conta.plano" :key="passo.ordem">
              <div class="org__passoTopo">
                <strong>{{ passo.campanha_alvo.nome }}</strong>
                <span class="org__passoCusto">
                  {{ fmtMoeda(passo.custo_ads) }} no período
                  <span v-if="passo.custo_ads_estimado" class="org__est">estimado</span>
                </span>
              </div>
              <div class="org__passoMotivo">{{ passo.movimentos[0].motivo.texto }}</div>
            </li>
          </ol>
        </AdvisorSection>

        <AdvisorEmptyState
          v-else
          variant="vazio"
          title="Nada a mover nesta conta"
          message="A estrutura atual já é a sugerida."
        />
      </section>

      <!-- ── Sobreposição: a única seção que cruza as contas ─────────────── -->
      <AdvisorSection
        v-if="sobreposicoes.length"
        title="Produtos patrocinados em duplicidade"
        :count="sobreposicoes.length"
        lead="Patrocinar tudo é o que sobe o TACOS. Aqui estão os casos."
      >
        <ul class="org__sobre">
          <li v-for="(s, i) in sobreposicoes" :key="i">
            <div class="org__sobreTopo">
              <AdvisorStatusPill :status="tomDaSaida(s.saida)" :label="rotuloDaSaida(s.saida)" />
              <span class="org__sobreItens">
                {{ s.itens.map((it) => `${it.item_id}${s.escopo === 'entre_contas' ? ` (${it.conta})` : ''}`).join(' · ') }}
              </span>
            </div>
            <div class="org__sobreTexto">{{ s.recomendacao }}</div>
          </li>
        </ul>
      </AdvisorSection>
    </template>

    <!-- ── Detalhe de uma campanha sugerida ─────────────────────────────── -->
    <q-dialog v-model="detalheAberto" position="right" full-height maximized>
      <q-card v-if="detalhe" class="org__painel">
        <header class="org__painelHead">
          <div>
            <div class="org__painelTitulo">{{ detalhe.linha.nome }}</div>
            <div class="org__painelSub">{{ detalhe.conta }} · Curva {{ detalhe.linha.curva }}</div>
          </div>
          <q-btn flat round dense icon="close" color="grey-6" @click="detalheAberto = false" />
        </header>
        <div class="org__painelCorpo">
          <div class="org__metricas">
            <AdvisorMetric :value="fmtMoeda(detalhe.linha.venda)" label="venda no período" />
            <AdvisorMetric
              :value="detalhe.linha.roas_target == null ? '—' : fmtRoas(detalhe.linha.roas_target)"
              label="ROAS alvo"
              hint="herdado da campanha atual"
            />
            <AdvisorMetric
              :value="detalhe.linha.orcamento_automatico ? 'Automático' : fmtMoeda(detalhe.linha.orcamento_diario)"
              label="orçamento diário"
            />
          </div>

          <h3 class="org__painelSecao">De onde vem cada anúncio</h3>
          <div v-for="mov in detalhe.movimentos" :key="mov.item_id" class="org__mov">
            <div class="org__movTitulo">{{ mov.titulo }}</div>
            <div class="org__movDe">
              <span class="org__mlb">{{ mov.item_id }}</span>
              <span class="org__seta" aria-hidden="true">→</span>
              <span>{{ mov.campanha_alvo.nome }}</span>
            </div>
            <div class="org__movAtual">
              hoje em <strong>{{ mov.campanha_atual.nome || '—' }}</strong>
              <template v-if="mov.campanha_atual.qtd_anuncios > 1">
                , junto com {{ mov.campanha_atual.qtd_anuncios - 1 }} outros anúncios
              </template>
            </div>
            <div class="org__movMotivo">
              {{ mov.motivo.texto }}
              <span class="org__fonte">({{ mov.motivo.regra }}, {{ mov.motivo.horario || mov.motivo.decisao }})</span>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'src/boot/axios';

import AdvisorSection from 'components/advisor/AdvisorSection.vue';
import AdvisorTable from 'components/advisor/AdvisorTable.vue';
import AdvisorMetric from 'components/advisor/AdvisorMetric.vue';
import AdvisorStatusPill from 'components/advisor/AdvisorStatusPill.vue';
import AdvisorEmptyState from 'components/advisor/AdvisorEmptyState.vue';

const props = defineProps({
  dateFrom: { type: String, default: '' },
  dateTo: { type: String, default: '' },
});

const $q = useQuasar();

// As quatro colunas que o dono pediu, nesta ordem (D13).
const colunas = [
  { key: 'nome', label: 'Campanha', sortable: true, minWidth: 260 },
  { key: 'anuncios', label: 'MLB(s)', minWidth: 160 },
  { key: 'roas_target', label: 'ROAS alvo', numeric: true, sortable: true },
  { key: 'orcamento_diario', label: 'Orçamento', numeric: true, sortable: true },
];
// No cartão do mobile o nome vira o título, então ele sai dos campos.
const camposCartao = colunas.filter((c) => c.key !== 'nome');

const carregando = ref(false);
const erro = ref('');
const payload = ref(null);
const detalhe = ref(null);
const detalheAberto = ref(false);

const contas = computed(() => payload.value?.contas || []);
const sobreposicoes = computed(() => payload.value?.sobreposicoes?.sobreposicoes || []);
const vinculoConfiavel = computed(() => payload.value?.confianca?.vinculo_confiavel !== false);
const periodoBr = computed(() => {
  const p = payload.value?.periodo;
  if (!p) return '';
  return `${dataBr(p.date_from)} a ${dataBr(p.date_to)}`;
});

const avisos = computed(() => [
  ...(payload.value?.avisos || []),
  ...(payload.value?.sobreposicoes?.avisos || []),
  ...contas.value.flatMap((c) => c.avisos || []),
]);

async function carregar() {
  carregando.value = true;
  erro.value = '';
  try {
    const params = {};
    if (props.dateFrom) params.date_from = props.dateFrom;
    if (props.dateTo) params.date_to = props.dateTo;
    const { data } = await api.get('/mercadolivre/ads/advisor/organizador/', { params });
    payload.value = data;
  } catch (e) {
    // Estado de erro é de primeira classe: a tela NUNCA pode dizer "nenhum anúncio"
    // quando o que houve foi falha de rede.
    erro.value = e?.response?.data?.error || 'Não foi possível carregar o organizador agora.';
    payload.value = null;
  } finally {
    carregando.value = false;
  }
}

watch(() => [props.dateFrom, props.dateTo], carregar);
carregar();

// ── Apresentação ──────────────────────────────────────────────────────────
function aplicadas(conta) {
  return conta.campanhas_sugeridas.filter((c) => c.ja_existe).length;
}

function leadDoDiagnostico(conta) {
  const d = conta.diagnostico;
  if (!d.anuncios_com_movimento) return 'A estrutura desta conta já está como o método pede.';
  return `${d.anuncios_com_movimento} anúncios mudariam de campanha, somando ${fmtMoeda(d.custo_ads_em_movimento)} de Ads no período.`;
}

function tomDoTacos(t) {
  return { ok: 'verificado', atencao: 'pausado', violacao: 'divergente' }[t.status] || 'neutral';
}

const ROTULO_SAIDA = {
  NICHAR: 'nichar as contas',
  ESCOLHER_ENTRADA: 'escolher a entrada',
  VARIACAO_SEM_ACAO: 'variação: sem ação',
  DECISAO_DO_DONO: 'decisão sua',
};
const TOM_SAIDA = {
  NICHAR: 'divergente',
  ESCOLHER_ENTRADA: 'pausado',
  VARIACAO_SEM_ACAO: 'bloqueado',
  DECISAO_DO_DONO: 'aguardando',
};
const rotuloDaSaida = (s) => ROTULO_SAIDA[s] || s;
const tomDaSaida = (s) => TOM_SAIDA[s] || 'neutral';

function abrirDetalhe(linha, conta) {
  detalhe.value = {
    conta: conta.conta,
    linha,
    movimentos: conta.estrutura_alvo.filter((m) => linha.anuncios.includes(m.item_id)),
  };
  detalheAberto.value = true;
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(String(texto));
    $q.notify({ message: `Copiado: ${texto}`, timeout: 1200, position: 'bottom' });
  } catch {
    $q.notify({ message: 'O navegador bloqueou a cópia', color: 'negative', timeout: 1800 });
  }
}

// ── Export (no cliente: sem endpoint, sem arquivo no servidor) ────────────
function linhasParaExport(conta) {
  return conta.campanhas_sugeridas.map((c) => ({
    campanha: c.nome,
    mlbs: c.anuncios.join(' '),
    roas: c.roas_target == null ? '' : fmtRoas(c.roas_target),
    orcamento: c.orcamento_automatico ? 'Automático' : (c.orcamento_diario ?? '').toString(),
    aplicada: c.ja_existe ? 'sim' : 'não',
  }));
}

function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function baixarCsv(conta) {
  const linhas = linhasParaExport(conta);
  const cabecalho = 'Campanha;MLBs;ROAS alvo;Orcamento;Ja aplicada';
  const corpo = linhas.map((l) => [l.campanha, l.mlbs, l.roas, l.orcamento, l.aplicada].join(';'));
  baixar(`organizador-${slug(conta.conta)}.csv`, [cabecalho, ...corpo].join('\n'), 'text/csv');
}

function baixarMarkdown(conta) {
  const linhas = conta.campanhas_sugeridas.map((c) => {
    const marca = c.ja_existe ? 'x' : ' ';
    const orc = c.orcamento_automatico ? 'orçamento automático' : `orçamento ${fmtMoeda(c.orcamento_diario)}`;
    const roas = c.roas_target == null ? 'sem meta' : `ROAS ${fmtRoas(c.roas_target)}`;
    return `- [${marca}] **${c.nome}** — ${c.anuncios.join(', ')} · ${roas} · ${orc}`;
  });
  const texto = [
    `# Organizador de campanhas — ${conta.conta}`,
    `Período: ${periodoBr.value}`,
    '',
    ...linhas,
  ].join('\n');
  baixar(`organizador-${slug(conta.conta)}.md`, texto, 'text/markdown');
}

// ── Formatação ────────────────────────────────────────────────────────────
const slug = (t) => String(t).normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase();
const fmtMoeda = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtRoas = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
const fmtPct = (v) => `${(Number(v) || 0).toFixed(1).replace('.', ',')}%`;
const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.org {
  padding: $space-5 0 $space-10;

  &__confianca {
    display: flex;
    gap: $space-3;
    align-items: flex-start;
    background: $tint-amber-bg;
    color: $tint-amber-text;
    border-radius: $radius-md;
    padding: $space-3 $space-4;
    margin-bottom: $space-4;
    font-size: $text-small-size;

    ul { margin: 0; padding-left: $space-4; }
    li + li { margin-top: $space-1; }
  }

  &__conta { margin-bottom: $space-8; }

  &__contaHead {
    display: flex;
    align-items: center;
    gap: $space-3;
    margin-bottom: $space-3;
  }

  &__contaNome {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin: 0;
    font-size: $text-h3-size;
    font-weight: $font-bold;
    color: $text-primary;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $primary;
  }

  &__metricas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: $space-4;
  }

  &__acoes { display: flex; gap: $space-2; }

  &__btn,
  &__retry {
    border: 1px solid $border;
    background: $surface;
    color: $text-body;
    border-radius: $radius-sm;
    padding: $space-1 $space-3;
    font-size: $text-xs-size;
    cursor: pointer;

    &:hover { background: $surface-2; }
    &:focus-visible { outline: 2px solid $primary; outline-offset: 2px; }
  }

  &__bloqueio {
    display: flex;
    gap: $space-3;
    align-items: flex-start;
    background: $tint-amber-bg;
    color: $tint-amber-text;
    border-radius: $radius-md;
    padding: $space-4;
    font-size: $text-small-size;
  }

  &__celNome { display: flex; align-items: center; gap: $space-2; }
  &__nome { font-weight: $font-medium; color: $text-primary; }

  &__mlbs { display: flex; flex-direction: column; gap: 2px; }

  &__mlb {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: $text-xs-size;
    color: $text-body;
  }

  &__num {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    font-variant-numeric: tabular-nums;
  }

  &__auto { color: $text-muted; font-style: italic; }
  &__vazio { color: $text-muted; }
  &__est { color: $text-muted; font-size: $text-xs-size; }

  &__copy {
    border: 0;
    background: transparent;
    color: $text-muted;
    cursor: pointer;
    padding: 2px;
    border-radius: $radius-sm;
    opacity: .45;

    &:hover { opacity: 1; color: $primary; background: $surface-2; }
    &:focus-visible { opacity: 1; outline: 2px solid $primary; outline-offset: 1px; }
  }

  &__plano {
    margin: 0;
    padding-left: $space-5;
    display: flex;
    flex-direction: column;
    gap: $space-3;

    li { font-size: $text-small-size; }
  }

  &__passoTopo {
    display: flex;
    justify-content: space-between;
    gap: $space-3;
    flex-wrap: wrap;
    color: $text-primary;
  }

  &__passoCusto { color: $text-muted; font-variant-numeric: tabular-nums; }
  &__passoMotivo { color: $text-body; margin-top: 2px; }

  &__sobre {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: $space-4;

    li { border-left: 2px solid $border; padding-left: $space-3; }
  }

  &__sobreTopo {
    display: flex;
    align-items: center;
    gap: $space-2;
    flex-wrap: wrap;
    margin-bottom: $space-1;
  }

  &__sobreItens {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: $text-xs-size;
    color: $text-muted;
  }

  &__sobreTexto { font-size: $text-small-size; color: $text-body; }

  &__painel { width: min(520px, 100vw); }

  &__painelHead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: $space-3;
    padding: $space-4 $space-5;
    border-bottom: 1px solid $border;
  }

  &__painelTitulo { font-size: $text-h3-size; font-weight: $font-semibold; color: $text-primary; }
  &__painelSub { font-size: $text-xs-size; color: $text-muted; }
  &__painelCorpo { padding: $space-5; overflow-y: auto; }

  &__painelSecao {
    margin: $space-5 0 $space-3;
    font-size: $text-small-size;
    font-weight: $font-semibold;
    color: $text-primary;
  }

  &__mov {
    border-top: 1px solid $border;
    padding: $space-3 0;
    font-size: $text-small-size;
  }

  &__movTitulo { color: $text-primary; font-weight: $font-medium; }

  &__movDe {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin: $space-1 0;
    color: $text-body;
  }

  &__seta { color: $text-muted; }
  &__movAtual { color: $text-muted; font-size: $text-xs-size; }
  &__movMotivo { color: $text-body; margin-top: $space-1; }
  &__fonte { color: $text-muted; }

  @media (max-width: 599px) {
    &__metricas { grid-template-columns: repeat(2, 1fr); }
  }
}
</style>
