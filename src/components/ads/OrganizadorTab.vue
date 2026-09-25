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
          <button
            class="org__btn org__btn--sync"
            :disabled="sincronizando"
            @click="sincronizar(conta.conta)"
          >
            <q-icon :name="sincronizando ? 'hourglass_empty' : 'sync'" size="14px" />
            {{ sincronizando ? 'sincronizando…' : 'Sincronizar Ads' }}
          </button>
        </header>

        <p v-if="sincMensagem[conta.conta]" class="org__sincMsg">{{ sincMensagem[conta.conta] }}</p>

        <!-- Bloco 1 — diagnóstico estrutural -->
        <AdvisorSection title="Como está hoje" :lead="leadDoDiagnostico(conta)">
          <div class="org__metricas">
            <AdvisorMetric
              :value="conta.diagnostico.campanhas_ativas"
              label="campanhas ativas"
              :hint="`${conta.diagnostico.total_anuncios} anúncios`"
            />
            <AdvisorMetric
              :value="conta.anuncios_parados?.total ?? 0"
              label="anúncios parados"
              :hint="hintParados(conta.anuncios_parados)"
              :variant="(conta.anuncios_parados?.total ?? 0) ? 'warn' : 'ok'"
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
              :value="contadorTopo(conta)"
              :label="temEstado(conta) ? 'campanhas no estado' : 'campanhas já criadas'"
              :hint="dicaDoProgresso(conta)"
              :variant="contadorTopoOk(conta) ? 'ok' : 'neutral'"
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
              <label class="org__filtro">
                <input type="checkbox" v-model="soFaltam" />
                só as que faltam ({{ faltam(conta) }})
              </label>
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
            :rows="paginaVisivel(conta)"
            :campos-cartao="camposCartao"
            row-key="nome"
            :sort="ordem.chave"
            :legenda="`${conta.conta} — período de ${periodoBr}`"
            @sort="ordenarPor"
            @row="abrirDetalhe($event, conta)"
          >
            <template #card-title="{ row }">{{ row.nome }}</template>

            <template #cell-estado="{ row }">
              <div class="org__estado">
                <AdvisorStatusPill
                  v-if="situacao(conta, row)"
                  :status="situacao(conta, row).pill"
                  :label="situacao(conta, row).label"
                />
                <span v-else class="org__soNome">{{ semEstado.label }}</span>
                <!-- O porquê em uma linha: sem isso o dono lê "ajustar" e não sabe se é o
                     nome, o ROAS, o orçamento ou MLB sobrando (ADSA-45). O texto completo
                     fica no detalhe. -->
                <span
                  v-if="motivoLinha(row)"
                  class="org__motivo"
                  :title="motivoCompleto(row)"
                >{{ motivoLinha(row) }}</span>
              </div>
            </template>

            <template #cell-nome="{ row }">
              <div class="org__celNome">
                <input
                  v-if="faltaAinda(conta, row)"
                  type="checkbox"
                  class="org__check"
                  :checked="marcada(conta.conta, row.nome)"
                  :title="marcada(conta.conta, row.nome) ? 'Desmarcar' : 'Marcar como criada'"
                  @click.stop="alternarMarca(conta.conta, row.nome)"
                />
                <AdvisorStatusPill
                  v-else-if="!situacao(conta, row)"
                  status="aplicado"
                  label="aplicada"
                />
                <span class="org__curva" :class="`org__curva--${row.curva.toLowerCase()}`"
                  :title="`Curva ${row.curva}`">{{ row.curva }}</span>
                <span class="org__nome" :class="{ 'org__nome--feita': marcada(conta.conta, row.nome) }">{{ row.nome }}</span>
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

            <template #cell-custo_ads="{ row }">
              <span v-if="row.custo_ads == null" class="org__vazio">—</span>
              <span v-else class="org__num">{{ fmtMoeda(row.custo_ads) }}</span>
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

          <!-- Paginação: 149 linhas do plano não cabem numa tela, e o dono trabalha de cima
               para baixo. O rodapé diz onde ele está, porque "só as que faltam (124)" sem
               saber se está na página 1 ou 3 é receita de linha perdida. -->
          <div v-if="totalVisiveis(conta) > POR_PAGINA" class="org__paginacao">
            <span class="org__paginacaoInfo">
              {{ totalVisiveis(conta).toLocaleString('pt-BR') }} linhas ·
              mostrando {{ primeiroVisivel(conta) }}–{{ ultimoVisivel(conta) }}
            </span>
            <q-pagination
              :model-value="pagina"
              :max="totalPaginas(conta)"
              :max-pages="7"
              boundary-numbers
              direction-links
              @update:model-value="pagina = $event"
            />
          </div>
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
          <div v-if="situacao(detalhe.contaObj, detalhe.linha)" class="org__oQueFazer">
            <AdvisorStatusPill
              :status="situacao(detalhe.contaObj, detalhe.linha).pill"
              :label="situacao(detalhe.contaObj, detalhe.linha).label"
            />
            <div>
              <div class="org__oQueFazerTitulo">
                {{ situacao(detalhe.contaObj, detalhe.linha).oQueFazer }}
              </div>
              <div v-if="detalhe.linha.campanha_real" class="org__oQueFazerSub">
                hoje está como <strong>{{ detalhe.linha.campanha_real }}</strong
                ><template v-if="soNomeDiferente(detalhe.linha)">, com os mesmos anúncios</template>
              </div>
            </div>
          </div>

          <!-- O porquê, item a item (ADSA-45). O texto vem do backend: é a mesma informação
               que o relatório usa para dizer "conforme/nota/erro", traduzida para ação. -->
          <template v-if="detalhe.linha.erros_estado?.length || detalhe.linha.notas_estado?.length">
            <h3 class="org__painelSecao">Por que está assim</h3>
            <ul class="org__motivos">
              <li
                v-for="erro in detalhe.linha.erros_estado"
                :key="`erro-${erro}`"
                class="org__motivoItem org__motivoItem--erro"
              >
                <q-icon name="error_outline" size="15px" aria-hidden="true" />
                <span>{{ erro }}</span>
              </li>
              <li
                v-for="nota in detalhe.linha.notas_estado"
                :key="`nota-${nota}`"
                class="org__motivoItem"
              >
                <q-icon name="info_outline" size="15px" aria-hidden="true" />
                <span>{{ nota }}</span>
              </li>
            </ul>
          </template>

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

          <template v-if="temEstado(detalhe.contaObj) && detalhe.linha.entra?.length">
            <h3 class="org__painelSecao">Entra nesta campanha</h3>
            <div v-for="mlb in detalhe.linha.entra" :key="`entra-${mlb}`" class="org__mov">
              <span class="org__mlb">{{ mlb }}</span>
              <span class="org__seta" aria-hidden="true">→</span>
              <span>{{ detalhe.linha.nome }}</span>
            </div>
          </template>

          <template v-if="temEstado(detalhe.contaObj) && detalhe.linha.sai?.length">
            <h3 class="org__painelSecao">Sai desta campanha (vai para)</h3>
            <div v-for="mlb in detalhe.linha.sai" :key="`sai-${mlb}`" class="org__mov">
              <span class="org__mlb">{{ mlb }}</span>
              <span class="org__seta" aria-hidden="true">→</span>
              <span>{{ vaiPara(detalhe.contaObj, mlb) || 'fora do plano' }}</span>
            </div>
          </template>

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

// Anúncios que estão em campanha mas não patrocinam (idle/hold/deleted) — o seletor
// do ML mostra "Anúncio patrocinado desativado". Fora da estrutura por definição:
// sugerir campanha para eles seria sugerir campanha que não entrega (ADSA-34).
const ORDEM_STATUS = ['idle', 'hold', 'deleted'];

function hintParados(parados) {
  const porStatus = parados?.por_status || {};
  const chaves = [
    ...ORDEM_STATUS.filter((s) => porStatus[s]),
    ...Object.keys(porStatus).filter((s) => !ORDEM_STATUS.includes(s)).sort(),
  ];
  if (!chaves.length) return 'todos os anúncios em campanha patrocinam';
  return chaves.map((s) => `${porStatus[s]} ${s}`).join(' · ');
}

// As quatro colunas que o dono pediu, nesta ordem (D13), mais a situação (ADSA-42) e o custo
// de Ads (ADSA-45), que é por onde a tabela abre: a ordem padrão é o maior gasto primeiro,
// o mesmo critério do bloco "Por onde começar". Sem a coluna visível, a ordenação padrão
// seria um mistério.
const colunas = [
  { key: 'nome', label: 'Campanha', sortable: true, minWidth: 260 },
  { key: 'estado', label: 'Situação', minWidth: 190, sortable: true },
  { key: 'anuncios', label: 'MLB(s)', minWidth: 160, sortable: true },
  { key: 'custo_ads', label: 'Custo Ads', numeric: true, sortable: true, minWidth: 120 },
  { key: 'roas_target', label: 'ROAS alvo', numeric: true, sortable: true },
  { key: 'orcamento_diario', label: 'Orçamento', numeric: true, sortable: true },
];
// No cartão do mobile o nome vira o título, então ele sai dos campos.
const camposCartao = colunas.filter((c) => c.key !== 'nome');

const carregando = ref(false);
const erro = ref('');
const sincronizando = ref(false);
const sincMensagem = ref({});
const soFaltam = ref(false);

// Trocar o filtro recomeça na primeira página: com o filtro ligado a lista encolhe das 149
// linhas para as que faltam, e ficar na página 3 mostraria um trecho sem começo.
watch(soFaltam, () => {
  pagina.value = 1;
});

// Marcação manual de "já criei esta campanha no painel do ML".
//
// Existe porque o sync de Ads roda de 4 em 4 horas: sem isto, o dono cria trinta
// campanhas numa sessão e o contador fica em zero o tempo todo. A marca é conveniência
// local, guardada no navegador — o dado real sempre vence: assim que o sync confirma,
// a linha passa a mostrar "aplicada" e a marca deixa de importar.
const CHAVE_MARCAS = 'sellerbot.organizador.criadas';
const marcas = ref(carregarMarcas());

function carregarMarcas() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_MARCAS) || '{}');
  } catch {
    return {};
  }
}

function salvarMarcas() {
  try {
    localStorage.setItem(CHAVE_MARCAS, JSON.stringify(marcas.value));
  } catch {
    // Navegador em modo privado ou storage bloqueado: a marcação some ao recarregar,
    // e a tela continua funcionando com o que vem do servidor.
  }
}

const marcada = (conta, nome) => Boolean(marcas.value[`${conta}|${nome}`]);

function alternarMarca(conta, nome) {
  const chave = `${conta}|${nome}`;
  if (marcas.value[chave]) delete marcas.value[chave];
  else marcas.value[chave] = true;
  marcas.value = { ...marcas.value };
  salvarMarcas();
}
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

// Frescor do vínculo: sem ele o "já aplicada" e o filtro "só as que faltam" parecem
// mortos — a campanha criada há minutos só entra no `ja_existe` no próximo sync (4h).
const avisoSync = computed(() => {
  const conf = payload.value?.confianca;
  if (!conf) return '';
  if (!conf.vinculo_sincronizado_em) {
    return 'o vínculo anúncio↔campanha nunca foi sincronizado — clique em "Sincronizar Ads" antes de confiar na coluna "aplicada" desta tabela.';
  }
  const dias = Number(conf.dias_desde_sync ?? 0);
  if (dias <= 0.25) return '';
  const horas = Math.round(dias * 24);
  const idade = horas < 24 ? `há ${horas}h` : `há ${Math.round(dias)} dia(s)`;
  return `vínculo anúncio↔campanha sincronizado ${idade}: campanhas criadas depois disso ainda não contam como aplicadas e continuam em "só as que faltam" — clique em "Sincronizar Ads" para atualizar.`;
});

const avisos = computed(() => [
  ...(avisoSync.value ? [avisoSync.value] : []),
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
    // Dado novo, lista nova: a página onde o dono estava pode não existir mais (o plano
    // mudou de tamanho, o filtro deixou de valer). Recomeçar é o comportamento honesto.
    pagina.value = 1;
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

// "Feita" é confirmada pelo sync OU marcada à mão. As duas contam para o progresso,
// mas a dica separa as duas coisas, para o dono nunca confundir marca com confirmação.
function feitas(conta) {
  return conta.campanhas_sugeridas.filter(
    (c) => c.ja_existe || marcada(conta.conta, c.nome),
  ).length;
}

function dicaDoProgresso(conta) {
  if (temEstado(conta)) {
    const c = contarEstados(conta);
    const partes = [
      `${c.ok} prontas`,
      `${c.nao_criada} para criar`,
      `${c.ajustar} para completar`,
      `${c.atencao} para ajustar`,
    ];
    if (c.fundida) partes.push(`${c.fundida} divididas`);
    if (c.revisar) partes.push(`${c.revisar} para revisar`);
    return partes.join(' · ');
  }
  const confirmadas = aplicadas(conta);
  const manuais = feitas(conta) - confirmadas;
  if (!manuais) return 'confirmadas pelo sync';
  return `${confirmadas} confirmadas pelo sync + ${manuais} marcadas à mão`;
}

function contarEstados(conta) {
  const contagem = { ok: 0, ajustar: 0, atencao: 0, fundida: 0, nao_criada: 0, revisar: 0 };
  for (const linha of conta.campanhas_sugeridas) {
    if (linha.estado in contagem) contagem[linha.estado] += 1;
    else contagem.revisar += 1;
  }
  return contagem;
}

// Com o estado disponível o número do topo passa a ser o trabalho que sobra, não o
// histórico: "26 de 149" não ajuda ninguém; "25 para criar + 22 para ajustar" ajuda.
function contadorTopo(conta) {
  if (!temEstado(conta)) return `${feitas(conta)} de ${conta.campanhas_sugeridas.length}`;
  const c = contarEstados(conta);
  const pendentes = c.nao_criada + c.ajustar + c.atencao + c.fundida + c.revisar;
  return pendentes
    ? `${pendentes} a resolver de ${conta.campanhas_sugeridas.length}`
    : `todas as ${conta.campanhas_sugeridas.length} no lugar`;
}

function contadorTopoOk(conta) {
  if (!temEstado(conta)) return feitas(conta) === conta.campanhas_sugeridas.length;
  const c = contarEstados(conta);
  return c.ok === conta.campanhas_sugeridas.length;
}

// ── Situação de cada linha (ADSA-42) ────────────────────────────────────────
//
// Enquanto a conta não sincroniza desde o ADSA-41, `estado_disponivel` vem falso e a
// tela segue no "já aplicada" de sempre: é melhor mostrar menos do que inventar 149
// "não criada" que o dono não criou.
const ESTADOS = {
  ok: { pill: 'aplicado', label: 'pronta', oQueFazer: 'nada a fazer — é a estrutura do plano' },
  nao_criada: { pill: 'aguardando', label: 'criar', oQueFazer: 'criar a campanha no Mercado Livre' },
  ajustar: { pill: 'alerta', label: 'completar', oQueFazer: 'completar a campanha já criada' },
  atencao: { pill: 'alerta', label: 'ajustar', oQueFazer: 'ajustar o que já existe' },
  fundida: { pill: 'divergente', label: 'dividida', oQueFazer: 'juntar o que está espalhado' },
};
const semEstado = { pill: 'aguardando', label: 'a criar', oQueFazer: 'criar a campanha no Mercado Livre' };
// Estado que a tela não conhece não vira "a criar": isso seria mandar o dono criar
// campanha que já existe. Fica marcado para revisão, que é a resposta honesta.
const estadoDesconhecido = { pill: 'bloqueado', label: 'revisar', oQueFazer: 'revisar esta linha' };

// Só liga o modo estado quando o backend diz que mandou. `!== false` aceitaria o payload
// antigo (campo ausente) e a aba passaria a dizer "149 para criar" sem dado nenhum.
const temEstado = (conta) => conta.estado_disponivel === true;

function situacao(conta, linha) {
  if (!temEstado(conta)) return null;
  if (!linha.estado) return semEstado;
  return ESTADOS[linha.estado] || estadoDesconhecido;
}

// "Falta" passa a ser o estado, não o `ja_existe`: campanha incompleta é campanha que
// ainda falta (o dono completaria a que já existe, não criaria outra), e campanha que
// existe mas diverge também é trabalho pendente.
function faltaAinda(conta, linha) {
  if (temEstado(conta)) return linha.estado === 'nao_criada' || linha.estado === 'ajustar';
  return !linha.ja_existe && !marcada(conta.conta, linha.nome);
}

function faltam(conta) {
  return conta.campanhas_sugeridas.filter((c) => faltaAinda(conta, c)).length;
}

function filtradas(conta) {
  if (!soFaltam.value) return conta.campanhas_sugeridas;
  return conta.campanhas_sugeridas.filter((c) => faltaAinda(conta, c));
}

// ── Ordem e paginação (ADSA-45) ────────────────────────────────────────────
//
// O cabeçalho já prometia ordenação (`sortable: true` emite `sort`) e ninguém escutava: o
// cursor ficava de ordenável sem ordenar. E 149 linhas do plano inteiro numa tabela é o
// oposto de "o que eu faço agora" — a ordem padrão é por **custo de Ads decrescente**, que
// é a ordem em que o dono executa (o mesmo critério do bloco "Por onde começar").
const POR_PAGINA = 50;
// A ordem guarda a COLUNA, não o tipo: `COLUNAS_ORDENAVEIS` é indexado por chave, e guardar
// o tipo fazia a busca falhar (quem ordena por "Situação" ou "ROAS alvo" recebia lista
// desordenada e nenhuma mensagem — o pior tipo de bug, porque parece funcionar).
const ordem = ref({ chave: '-custo_ads', coluna: 'custo_ads', direcao: 'desc' });
const pagina = ref(1);

const COLUNAS_ORDENAVEIS = {
  nome: { tipo: 'texto', valor: (l) => l.nome || '' },
  estado: { tipo: 'situacao', valor: (l) => l.estado || '' },
  anuncios: { tipo: 'numero', valor: (l) => (l.anuncios || []).length },
  roas_target: { tipo: 'numero', valor: (l) => l.roas_target },
  orcamento_diario: { tipo: 'numero', valor: (l) => l.orcamento_diario },
  custo_ads: { tipo: 'numero', valor: (l) => l.custo_ads },
};

// A situação ordena pela gravidade, não em ordem alfabética: quem abre a tela para
// trabalhar começa pelo que está errado, não pelo que começa com "a".
const ORDEM_SITUACAO = { nao_criada: 0, fundida: 1, ajustar: 2, atencao: 3, ok: 4 };

// Colapsa espaços e tira acento antes de comparar: "Casca de pinus" e "Casca de Pinus" são
// a mesma família e não podem ficar em blocos diferentes da tabela.
function chaveTexto(valor) {
  return String(valor)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ordenarPor(coluna) {
  const def = COLUNAS_ORDENAVEIS[coluna.key];
  if (!def) return;
  const mesmaColuna = ordem.value.coluna === coluna.key;
  if (mesmaColuna) {
    // Segundo clique na mesma coluna inverte; a chave com o "-" é o próprio estado do
    // AdvisorTable (é ele que desenha a seta e o `aria-sort`).
    const agoraDesc = ordem.value.chave.startsWith('-');
    ordem.value = {
      chave: agoraDesc ? coluna.key : `-${coluna.key}`,
      coluna: coluna.key,
      direcao: agoraDesc ? 'asc' : 'desc',
    };
  } else {
    // Numérico começa descendo (o maior primeiro); texto e situação, subindo.
    const numerico = def.tipo === 'numero';
    ordem.value = {
      chave: numerico ? `-${coluna.key}` : coluna.key,
      coluna: coluna.key,
      direcao: numerico ? 'desc' : 'asc',
    };
  }
  pagina.value = 1;
}

function ordenarLista(lista, conta) {
  const def = COLUNAS_ORDENAVEIS[ordem.value.coluna];
  if (!def) return lista;
  const sinal = ordem.value.direcao === 'asc' ? 1 : -1;
  return [...lista].sort((a, b) => {
    if (def.tipo === 'texto') {
      const x = chaveTexto(def.valor(a));
      const y = chaveTexto(def.valor(b));
      if (x === y) return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
      return sinal * (x < y ? -1 : 1);
    }
    if (def.tipo === 'situacao') {
      const x = ORDEM_SITUACAO[a.estado] ?? 99;
      const y = ORDEM_SITUACAO[b.estado] ?? 99;
      if (x !== y) return sinal * (x - y);
      return (a.custo_ads || 0) - (b.custo_ads || 0);
    }
    // `null`/`undefined` vão para o fim em qualquer direção: número ausente não é o
    // menor nem o maior, é ausência.
    const x = def.valor(a);
    const y = def.valor(b);
    if (x == null && y == null) return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    if (x == null) return 1;
    if (y == null) return -1;
    if (x === y) return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    return sinal * (x < y ? -1 : 1);
  });
}

function linhasVisiveis(conta) {
  return ordenarLista(filtradas(conta), conta);
}

const totalVisiveis = (conta) => linhasVisiveis(conta).length;
const totalPaginas = (conta) => Math.max(1, Math.ceil(totalVisiveis(conta) / POR_PAGINA));

// Página fora de rango (o filtro "só as que faltam" reduz o total depois de a página estar
// alta) volta para a última página válida em vez de mostrar tabela vazia.
function paginaSegura(conta) {
  const total = totalPaginas(conta);
  return Math.min(Math.max(1, pagina.value), total);
}

function paginaVisivel(conta) {
  const atual = paginaSegura(conta);
  const linhas = linhasVisiveis(conta);
  return linhas.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);
}

function primeiroVisivel(conta) {
  const total = totalVisiveis(conta);
  return total ? (paginaSegura(conta) - 1) * POR_PAGINA + 1 : 0;
}

function ultimoVisivel(conta) {
  return Math.min(paginaSegura(conta) * POR_PAGINA, totalVisiveis(conta));
}

// ── O porquê da linha (ADSA-45) ─────────────────────────────────────────────
//
// O backend já manda `notas_estado` e `erros_estado` (o mesmo texto que o relatório usa
// para "conforme/nota/erro"); a aba ignorava os dois. Na célula vai o resumo — o motivo em
// uma frase, sem a lista de MLB, que não cabe em 150px — e o texto inteiro fica no detalhe.
function motivoCompleto(linha) {
  return [...(linha.erros_estado || []), ...(linha.notas_estado || [])].join(' · ');
}

function motivoLinha(linha) {
  const motivo = motivoCompleto(linha);
  if (!motivo) return '';
  const [primeiro] = motivo.split(' · ');
  // A mensagem mais común do backend é o nome que difere; encurtada, ela vira "nome criado
  // difere", que é a informação, e não "os MLB batem exatamente; nome criado difere".
  return primeiro
    .replace('os MLB batem exatamente; ', '')
    .replace('pareado por MLBs — ', '');
}

// Onde cada MLB que sai desta linha está planejado — é o "vai para" do painel. Vem das
// próprias linhas do plano, sem precisar casar de novo: o MLB que sai está em outra linha.
function vaiPara(conta, mlb) {
  const destino = conta.campanhas_sugeridas.find(
    (c) => c.nome && c.anuncios.includes(mlb),
  );
  return destino ? destino.nome : null;
}

async function sincronizar(nickname) {
  sincronizando.value = true;
  sincMensagem.value = { ...sincMensagem.value, [nickname]: '' };
  try {
    const { data } = await api.post('/mercadolivre/ads/advisor/sincronizar/', {
      accounts: [nickname],
    });
    if (data.enfileiradas) {
      sincMensagem.value = {
        ...sincMensagem.value,
        [nickname]:
          'Sincronização enfileirada. Leva alguns minutos; a tela se atualiza sozinha quando terminar.',
      };
      aguardarSync(nickname);
    } else {
      const motivo = data.ignoradas?.[0]?.motivo || 'nada a sincronizar';
      sincMensagem.value = { ...sincMensagem.value, [nickname]: `Não enfileirado: ${motivo}.` };
      sincronizando.value = false;
    }
  } catch (e) {
    sincMensagem.value = {
      ...sincMensagem.value,
      [nickname]: 'Não foi possível pedir a sincronização agora.',
    };
    sincronizando.value = false;
  }
}

// O sync é assíncrono (Cloud Tasks). Em vez de mandar o dono ficar apertando F5, a tela
// acompanha o `vinculo_sincronizado_em`: quando ele muda, o worker terminou.
function aguardarSync(nickname) {
  const marcoInicial = payload.value?.confianca?.vinculo_sincronizado_em;
  let tentativas = 0;
  const timer = setInterval(async () => {
    tentativas += 1;
    await carregar();
    const agora = payload.value?.confianca?.vinculo_sincronizado_em;
    if (agora && agora !== marcoInicial) {
      clearInterval(timer);
      sincronizando.value = false;
      sincMensagem.value = { ...sincMensagem.value, [nickname]: 'Sincronizado agora.' };
    } else if (tentativas >= 20) {
      // ~5 minutos. Desistir de esperar não é desistir do sync: ele pode terminar
      // depois, e o próximo carregamento da tela vai pegar.
      clearInterval(timer);
      sincronizando.value = false;
      sincMensagem.value = {
        ...sincMensagem.value,
        [nickname]: 'A sincronização está demorando. Recarregue daqui a pouco.',
      };
    }
  }, 15000);
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
    // A conta inteira vai junto porque o "vai para" precisa das outras linhas do plano,
    // e a situação precisa saber se o estado está disponível.
    contaObj: conta,
    linha,
    movimentos: conta.estrutura_alvo.filter((m) => linha.anuncios.includes(m.item_id)),
  };
  detalheAberto.value = true;
}

// A diferença que mais aparece nas campanhas do dono: o conjunto de MLB está certo e o
// nome não (o plano reescreve o nome com `·CAT` e trunca em 29 caracteres). Sem isso o
// dono lê "ajustar" e não descobre que o ajuste é só um nome.
function soNomeDiferente(linha) {
  return Boolean(linha.campanha_real) && !linha.entra?.length && !linha.sai?.length;
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
  const est = (c) => (situacao(conta, c) || semEstado).label;
  return conta.campanhas_sugeridas.map((c) => ({
    campanha: c.nome,
    situacao: temEstado(conta) ? est(c) : '',
    mlbs: c.anuncios.join(' '),
    roas: c.roas_target == null ? '' : fmtRoas(c.roas_target),
    orcamento: c.orcamento_automatico ? 'Automático' : (c.orcamento_diario ?? '').toString(),
    aplicada: c.ja_existe || marcada(conta.conta, c.nome) ? 'sim' : 'não',
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
  const cabecalho = 'Campanha;Situacao;MLBs;ROAS alvo;Orcamento;Ja aplicada';
  const corpo = linhas.map((l) =>
    [l.campanha, l.situacao, l.mlbs, l.roas, l.orcamento, l.aplicada].join(';'),
  );
  baixar(`organizador-${slug(conta.conta)}.csv`, [cabecalho, ...corpo].join('\n'), 'text/csv');
}

function baixarMarkdown(conta) {
  const linhas = conta.campanhas_sugeridas.map((c) => {
    // Com o estado disponível, a marca do checklist passa a ser a situação: o dono
    // trabalha o que falta, não o que ele mesmo escreveu.
    const marca = temEstado(conta)
      ? (situacao(conta, c) || semEstado).label
      : (c.ja_existe || marcada(conta.conta, c.nome) ? 'x' : ' ');
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

  &__btn--sync {
    display: inline-flex;
    align-items: center;
    gap: $space-1;

    &:disabled { opacity: .55; cursor: default; }
  }

  &__sincMsg {
    margin: 0 0 $space-3;
    font-size: $text-xs-size;
    color: $text-muted;
  }

  &__filtro {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    font-size: $text-xs-size;
    color: $text-muted;
    cursor: pointer;
  }

  &__check { cursor: pointer; accent-color: $primary; }

  &__celNome { display: flex; align-items: center; gap: $space-2; }

  // O nome da campanha deixou de carregar o prefixo A/B/C (ADSA-31, decisão do dono:
  // nome é do produto). A curva vira selo: continua visível ao varrer a tabela, mas
  // fica FORA do que o botão de copiar leva para o painel do Mercado Livre.
  &__curva {
    flex: 0 0 auto;
    width: 18px; height: 18px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: $radius-sm;
    font-size: 11px; font-weight: $font-bold;
  }
  &__curva--a { background: $tint-teal-bg;  color: $tint-teal-text; }
  &__curva--b { background: $tint-sky-bg;   color: $tint-sky-text; }
  &__curva--c { background: $tint-slate-bg; color: $tint-slate-text; }

  &__nome--feita { text-decoration: line-through; color: $text-muted; }
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

  // O bloco "o que fazer" fica acima das métricas: é a resposta que o dono abriu a
  // tela para ver, e não um número.
  &__oQueFazer {
    display: flex;
    gap: $space-3;
    align-items: flex-start;
    background: $surface-2;
    border-radius: $radius-md;
    padding: $space-3 $space-4;
    margin-bottom: $space-4;
    font-size: $text-small-size;
  }

  &__oQueFazerTitulo { color: $text-primary; font-weight: $font-semibold; }
  &__oQueFazerSub { color: $text-muted; margin-top: $space-1; }

  &__soNome { color: $text-muted; font-size: $text-small-size; }

  // O motivo vive abaixo do selo: é a segunda linha da célula, e a coluna tem largura
  // suficiente porque o texto trunca com reticências e o inteiro fica no `title`.
  &__estado { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }

  &__motivo {
    color: $text-muted;
    font-size: $text-xs-size;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__motivos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  &__motivoItem {
    display: flex;
    gap: $space-2;
    align-items: flex-start;
    font-size: $text-small-size;
    color: $text-body;
    border-top: 1px solid $border;
    padding-top: $space-2;

    &--erro { color: $tint-red-text; }
  }

  &__paginacao {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    flex-wrap: wrap;
    margin-top: $space-4;
  }

  &__paginacaoInfo { color: $text-muted; font-size: $text-small-size; }

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
