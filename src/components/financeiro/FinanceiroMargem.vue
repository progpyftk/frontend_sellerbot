<template>
  <div class="financeiro-margem">

      <!-- ══════════════════════════════════════════ COMO LER -->
      <SbInfoCallout
        titulo="A régua é a margem de contribuição sobre o faturamento líquido"
        icon="help_outline"
        variant="info"
        :detalhe="true"
      >
        O percentual de margem desta tela divide a margem de contribuição pelo
        <strong>faturamento líquido</strong> (GMV já sem os impostos), e não pelo GMV bruto.
        O resumo soma sempre <strong>um nível só</strong> — escolha CNPJ, marketplace ou SKU —
        porque somar os três níveis contaria a mesma venda mais de uma vez.
        <template #detalhe>
          <p class="q-mb-sm">Cascata usada pelo backend:</p>
          <ul class="margens-lista">
            <li>GMV bruto − impostos = faturamento líquido;</li>
            <li>faturamento líquido − taxas − frete − embalagem − ads − CPV = margem de contribuição;</li>
            <li>MC % = margem de contribuição ÷ faturamento líquido × 100.</li>
          </ul>
          <p class="q-mb-sm">Confiabilidade do número:</p>
          <ul class="margens-lista">
            <li>
              a MC sai do nosso banco de pedidos, que <strong>não cobre todo o histórico</strong>;
              a régua para saber se a base está completa é a
              <strong>receita declarada</strong> (a RPA da PGDASD);
            </li>
            <li>
              quando o GMV dos pedidos não alcança a receita declarada, a MC é marcada como
              <strong>superestimada por falta de pedido</strong> — e não é margem pequena;
            </li>
            <li>
              quando o banco de pedidos <strong>passa</strong> a receita declarada, é
              divergência de base (ticket FIN-21b): informativa, não é erro de margem.
            </li>
          </ul>
        </template>
      </SbInfoCallout>

      <!-- ══════════════════════════════════════════ FILTROS -->
      <SbCard class="q-mb-md" title="Filtros" eyebrow="Recorte da margem">
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-6 col-md-3">
            <SbSeletorEmpresa
              v-model="filtros.cnpj"
              :options="opcoesCnpj"
              label="CNPJ / empresa"
              clearable
              @update:model-value="recarregarTudo"
            />
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="filtros.marketplace"
              :options="MARKETPLACES_DE_MARGEM"
              emit-value
              map-options
              dense
              outlined
              clearable
              label="Marketplace"
              bg-color="white"
              @update:model-value="recarregarTudo"
            />
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="filtros.produto"
              :options="opcoesProduto"
              option-value="sku"
              option-label="rotulo"
              emit-value
              map-options
              dense
              outlined
              clearable
              use-input
              input-debounce="200"
              label="Produto (SKU)"
              :hint="dicaProdutos"
              :loading="carregandoProdutos"
              bg-color="white"
              @filter="filtrarProdutos"
              @update:model-value="carregar"
            />
          </div>

          <div class="col-12 col-md-6">
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model="filtros.de"
                  type="date"
                  dense
                  outlined
                  label="Data inicial"
                  bg-color="white"
                  @update:model-value="aoMudarData"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="filtros.ate"
                  type="date"
                  dense
                  outlined
                  label="Data final"
                  bg-color="white"
                  @update:model-value="aoMudarData"
                />
              </div>
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              <template v-if="ehDiario">
                <strong>Um dia por linha.</strong> As parcelas são do próprio dia; o imposto é o
                <strong>rateio da competência</strong> (o DAS é mensal) pela alíquota efetiva do mês, e o
                último dia fecha o resíduo de centavo — a soma dos dias bate com o mês.
              </template>
              <template v-else>
                A margem é apurada por <strong>mês</strong>: o intervalo soma as competências que ele
                toca, e a primeira e a última entram por inteiro.
              </template>
            </div>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="filtros.granularidade"
              :options="GRANULARIDADES_DE_MARGEM"
              emit-value
              map-options
              dense
              outlined
              label="Granularidade"
              bg-color="white"
              @update:model-value="recarregarTudo"
            />
          </div>

          <div class="col-12 col-md-3">
            <q-btn
              flat
              dense
              no-caps
              color="grey-8"
              icon="filter_alt_off"
              label="Limpar filtros"
              @click="limparFiltros"
            />
          </div>
        </div>
      </SbCard>

      <!-- ══════════════════════════════════════════ CONFERÊNCIA COM O MÊS -->
      <SbInfoCallout
        v-if="ehDiario && conferenciaDivergente && !loading"
        titulo="O mês materializado difere da série calculada agora"
        icon="rule"
        variant="info"
      >
        <p class="q-mb-xs">
          O dia é calculado <strong>na hora</strong>; o mês é o <strong>snapshot</strong> que a
          materialização gravou. Pedido ressincronizado depois do snapshot aparece nos dias e não no
          mês — por isso a diferença existe e está medida abaixo.
        </p>
        <ul class="margens-lista q-mb-none">
          <li v-for="mes in conferencia" :key="mes.snapshot_em">
            <strong>{{ mes.snapshot_em ? mes.snapshot_em.slice(0, 16).replace('T', ' ') : 'sem snapshot' }}</strong>
            · GMV {{ formatarMoeda(mes.diferenca_de_gmv) }}
            · impostos {{ formatarMoeda(mes.diferenca_de_impostos) }}
            · MC {{ formatarMoeda(mes.diferenca_de_mc) }} (dias − mês)
          </li>
        </ul>
      </SbInfoCallout>

      <!-- ══════════════════════════════════════════ BASE DE PEDIDOS -->
      <!--
        O aviso de base vem primeiro e em callout próprio: a base de pedidos incompleta
        invalida o número inteiro (a MC está superestimada por falta de pedido), enquanto
        embalagem/imposto são refinamentos parciais. O contador de linhas incompletas é o do
        `resumo` do backend e já respeita o nível somado.
      -->
      <SbInfoCallout
        v-if="baseIncompleta && !loading && !erro"
        titulo="A MC está superestimada: a base de pedidos está incompleta"
        icon="warning"
        variant="atencao"
        :detalhe="observacoesDeBase.length > 0"
      >
        <p class="q-mb-xs">
          <strong>{{ linhasComBaseIncompleta }}</strong> de
          <strong>{{ totalDeLinhas }}</strong> linha(s) deste resumo não cobrem a receita
          declarada (PGDASD) da competência. Nos meses de pouca cobertura, a maior parte do
          faturamento fica sem base de custo: a margem que aparece
          <strong>não é pequena, é superestimada</strong> — parte das taxas, do frete e do CPV
          ficou fora da conta.
        </p>
        <p class="q-mb-none">
          A régua é a <strong>receita declarada</strong> (a RPA da PGDASD). Trate as competências
          marcadas como <strong>não comparáveis</strong> a um mês fechado e não leia a série como
          se todos os meses tivessem a mesma base.
        </p>
        <template #detalhe>
          <ul class="margens-lista">
            <li v-for="(obs, i) in observacoesDeBase" :key="`base-${i}`">{{ obs }}</li>
          </ul>
        </template>
      </SbInfoCallout>

      <!-- ══════════════════════════════════════════ RESSALVAS PARCIAIS -->
      <SbInfoCallout
        v-if="(ressalvas.sem_embalagem > 0 || ressalvas.sem_impostos > 0) && !loading && !erro"
        titulo="Atenção: parte dos custos não foi descontada"
        icon="warning"
        variant="atencao"
        :detalhe="ressalvas.observacoes.length > 0"
      >
        <p class="q-mb-xs">
          <template v-if="ressalvas.sem_embalagem > 0">
            <strong>{{ ressalvas.sem_embalagem }}</strong> linha(s) sem custo de embalagem cadastrado —
            a embalagem é custo por SKU e não foi descontada.
          </template>
          <template v-if="ressalvas.sem_embalagem > 0 && ressalvas.sem_impostos > 0"><br /></template>
          <template v-if="ressalvas.sem_impostos > 0">
            <strong>{{ ressalvas.sem_impostos }}</strong> linha(s) sem impostos informados — o
            faturamento líquido ficou igual ao GMV.
          </template>
        </p>
        <p class="q-mb-none">
          Enquanto isso, a margem real é <strong>menor</strong> que a mostrada. Cadastre o que falta
          antes de comparar com o contador.
        </p>
        <template #detalhe>
          <ul class="margens-lista">
            <li v-for="(obs, i) in ressalvas.observacoes" :key="`obs-${i}`">{{ obs }}</li>
          </ul>
        </template>
      </SbInfoCallout>

      <!-- ══════════════════════════════════════════ DIVERGÊNCIA DE BASE -->
      <!-- Informativo, NÃO é erro: aqui o banco passa a receita declarada e os custos estão na base. -->
      <SbInfoCallout
        v-if="divergenciasBase.length > 0 && !loading && !erro"
        titulo="Divergência de base em investigação (FIN-21b)"
        icon="science"
        variant="info"
        detalhe
      >
        Em algumas competências o banco de pedidos <strong>passa</strong> a receita declarada.
        Isso <strong>não</strong> é margem superestimada — os custos estão na base. É divergência
        entre as duas fontes de faturamento, já registrada para investigação (ticket FIN-21b).
        <template #detalhe>
          <ul class="margens-lista">
            <li v-for="(obs, i) in divergenciasBase" :key="`div-${i}`">{{ obs }}</li>
          </ul>
        </template>
      </SbInfoCallout>

      <!-- ══════════════════════════════════════════ ESTADOS -->
      <SbEmptyState
        v-if="loading"
        variant="loading"
        title="Carregando margens…"
        message="Buscando os números materializados no período."
      />
      <SbEmptyState
        v-else-if="erro"
        variant="error"
        title="Não foi possível carregar as margens"
        :message="erro"
      />
      <SbEmptyState
        v-else-if="linhas.length === 0"
        title="Nenhuma margem materializada para este recorte"
        message="Ajuste o período ou os filtros. Se a competência ainda não foi processada, rode a materialização da margem no backend."
      />

      <template v-else>
        <!-- ══════════════════════════════════════════ RESUMO -->
        <div class="margens-section-label q-mb-sm">
          <template v-if="ehDiario">
            Total do intervalo <strong>{{ rotuloDia(filtros.de) }} a {{ rotuloDia(filtros.ate) }}</strong>
            · {{ linhasDaGrade.length }} dia(s) com movimento
            <template v-if="diasVazios"> · {{ diasVazios }} sem movimento</template>
          </template>
          <template v-else>
            Resumo do nível <strong>{{ rotuloNivel(periodo.nivel_do_resumo) }}</strong>
            · {{ periodo.linhas || linhas.length }} linha(s)
          </template>
        </div>

        <SbKpiGrid :columns="5" class="q-mb-lg">
          <SbKpiCard
            label="GMV bruto"
            :value="formatarMoeda(periodo.gmv)"
            :sub="`${porNivel.cnpj} CNPJ · ${porNivel.marketplace} marketplace · ${porNivel.sku} SKU`"
            variant="slate"
          />
          <SbKpiCard
            label="Faturamento líquido"
            :value="formatarMoeda(periodo.faturamento_liquido)"
            sub="GMV − impostos"
            variant="sky"
          />
          <SbKpiCard
            label="Margem de contribuição"
            :value="formatarMoeda(periodo.mc)"
            sub="Após taxas, frete, embalagem, ads e CPV"
            variant="teal"
          />
          <SbKpiCard
            label="MC % do faturamento líquido"
            :value="formatarPct(periodo.mc_pct)"
            :sub="`Resumo por ${rotuloNivel(periodo.nivel_do_resumo).toLowerCase()}`"
            variant="green"
          />
          <SbKpiCard
            v-if="!ehDiario"
            label="Receita declarada (PGDASD)"
            :value="periodo.receita_declarada != null ? formatarMoeda(periodo.receita_declarada) : '—'"
            :sub="periodo.receita_declarada != null
              ? 'Régua oficial da cobertura da base'
              : 'Só existe no nível CNPJ'"
            variant="indigo"
          />
          <SbKpiCard
            v-else
            label="Dias com movimento"
            :value="String(linhasDaGrade.length)"
            :sub="diasVazios ? `${diasVazios} dia(s) sem pedido e sem Ads no intervalo` : 'Todos os dias do intervalo têm movimento'"
            variant="indigo"
          />
        </SbKpiGrid>

        <!-- ══════════════════════════════════════════ CASCATA -->
        <SbCard class="q-mb-lg" title="Cascata da margem" eyebrow="Como o número foi formado">
          <div class="cascata">
            <div class="cascata-linha">
              <span class="cascata-rotulo">GMV bruto</span>
              <span class="cascata-valor">{{ formatarMoeda(periodo.gmv) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) Impostos</span>
              <span class="cascata-valor">{{ formatarMoeda(periodo.impostos) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--subtotal">
              <span class="cascata-rotulo">(=) Faturamento líquido</span>
              <span class="cascata-valor">{{ formatarMoeda(periodo.faturamento_liquido) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) Taxas</span>
              <span class="cascata-valor">{{ formatarMoeda(periodo.taxas) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) Frete</span>
              <span class="cascata-valor">{{ formatarMoeda(periodo.frete) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">
                (−) Embalagem
                <SbBadge v-if="embalagem.semValor > 0" variant="amber" icon="warning">
                  não cadastrada em {{ embalagem.semValor }} linha(s)
                </SbBadge>
              </span>
              <span class="cascata-valor">{{ formatarMoeda(embalagem.total) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) Ads</span>
              <span class="cascata-valor">{{ formatarMoeda(periodo.ads) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) CPV (custo do produto vendido)</span>
              <span class="cascata-valor">{{ formatarMoeda(periodo.cpv) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--total">
              <span class="cascata-rotulo">(=) Margem de contribuição</span>
              <span class="cascata-valor">
                {{ formatarMoeda(periodo.mc) }}
                <span class="cascata-pct">{{ formatarPct(periodo.mc_pct) }}</span>
              </span>
            </div>
          </div>
          <div class="text-caption text-grey-6 q-mt-sm">
            <template v-if="ehDiario">
              O total é a <strong>soma dos dias</strong>. O imposto de cada dia é o <strong>rateio da
              competência</strong> (o DAS é mensal) pela alíquota efetiva do mês — e a linha diz isso.
            </template>
            <template v-else>
              A embalagem do recorte vem do próprio resumo do backend — a cascata do dono a inclui.
              Quando alguma linha do recorte não tem o custo cadastrado, o valor aparece marcado: somar
              só o que existe faria a margem parecer maior do que é.
            </template>
          </div>
        </SbCard>

        <!-- ══════════════════════════════════════════ LINHAS -->
        <!-- A grade do módulo é a `SbTabela` (FINT-15): a mesma ordenação, o mesmo "sem valor" e a
             mesma exportação das outras abas. -->
        <SbCard
          :title="ehDiario ? 'Detalhe por dia' : 'Detalhe por linha'"
          :eyebrow="
            ehDiario
              ? `${linhasDaGrade.length} dia(s) com movimento${diasVazios ? ` · ${diasVazios} sem movimento` : ''}`
              : `${linhasDaGrade.length} linha(s) no recorte`
          "
        >
          <SbTabela
            exportavel
            nome-exportacao="margem-contribuicao"
            :colunas="colunasDaGrade"
            :linhas="linhasDaGrade"
            :chave-linha="ehDiario ? 'dia' : 'id'"
            rotulo="Linhas da margem de contribuição"
            :carregando="loading"
            :erro="erro"
          >
            <template #celula-dia="{ linha }">
              <span class="row--bold">{{ rotuloDia(linha.dia) }}</span>
            </template>

            <template #celula-competencia="{ linha }">
              <span class="row--bold">{{ rotuloCompetencia(linha.competencia) }}</span>
            </template>

            <template #celula-pedidos="{ linha }">{{ linha.pedidos ?? "—" }}</template>

            <template #celula-nivel="{ linha }">
              <SbBadge :variant="varianteNivel(linha.nivel)">{{ rotuloNivel(linha.nivel) }}</SbBadge>
            </template>

            <template #celula-cnpj="{ linha }">
              <div class="row--bold">{{ formatarCnpj(linha.cnpj) }}</div>
              <div class="text-caption text-grey-6">{{ linha.razao_social || "—" }}</div>
            </template>

            <template #celula-marketplace="{ linha }">
              <SbBadge v-if="linha.marketplace" :variant="varianteMarketplace(linha.marketplace)">
                {{ rotuloMarketplace(linha.marketplace) }}
              </SbBadge>
              <span v-else class="row--muted">—</span>
            </template>

            <template #celula-sku="{ linha }">
              <template v-if="linha.sku">
                <div>{{ nomeDoSku(linha.sku) }}</div>
                <div class="text-caption text-grey-6">{{ linha.sku }}</div>
              </template>
              <span v-else class="row--muted">—</span>
            </template>

            <template #celula-gmv="{ linha }">{{ formatarMoeda(linha.gmv) }}</template>

            <template #celula-impostos="{ linha }">
              <span :class="{ 'row--warn': linha.impostos_informados === false }">
                {{ linha.impostos_informados === false ? "não informado" : formatarMoeda(linha.impostos) }}
              </span>
            </template>

            <template #celula-faturamento_liquido="{ linha }">
              {{ formatarMoeda(linha.faturamento_liquido) }}
            </template>

            <template #celula-taxas="{ linha }">{{ formatarMoeda(linha.taxas) }}</template>
            <template #celula-frete="{ linha }">{{ formatarMoeda(linha.frete) }}</template>

            <template #celula-embalagem="{ linha }">
              <span :class="{ 'row--warn': linha.embalagem_informada === false }">
                {{ linha.embalagem_informada === false ? "não cadastrada" : formatarMoeda(linha.embalagem) }}
              </span>
            </template>

            <template #celula-ads="{ linha }">{{ formatarMoeda(linha.ads) }}</template>
            <template #celula-cpv="{ linha }">{{ formatarMoeda(linha.cpv) }}</template>

            <template #celula-mc="{ linha }">
              <span class="row--bold" :class="numero(linha.mc) >= 0 ? 'row--pos' : 'row--neg'">
                {{ formatarMoeda(linha.mc) }}
              </span>
            </template>

            <template #celula-mc_pct="{ linha }">
              <span :class="numero(linha.mc_pct) >= 0 ? 'row--pos' : 'row--neg'">
                {{ formatarPct(linha.mc_pct) }}
              </span>
            </template>

            <template #celula-sinalizacoes="{ linha }">
              <div class="margens-flags">
                <SbBadge v-if="baseDe(linha).incompleta" variant="red" icon="warning">
                  {{ rotuloDaBase(baseDe(linha)) }}
                </SbBadge>
                <SbBadge v-if="baseDe(linha).divergencia" variant="indigo" icon="science">
                  Divergência de base (FIN-21b)
                </SbBadge>
                <SbBadge v-if="linha.embalagem_informada === false" variant="amber" icon="inventory_2">
                  Embalagem não cadastrada
                </SbBadge>
                <SbBadge v-if="linha.impostos_informados === false" variant="red" icon="gavel">
                  Impostos não informados
                </SbBadge>
                <span v-if="semSinalizacao(linha)" class="row--muted">—</span>
              </div>
            </template>
          </SbTabela>
        </SbCard>
      </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import SbCard from "src/components/common/SbCard.vue";
import SbKpiCard from "src/components/common/SbKpiCard.vue";
import SbKpiGrid from "src/components/common/SbKpiGrid.vue";
import SbInfoCallout from "src/components/common/SbInfoCallout.vue";
import SbBadge from "src/components/common/SbBadge.vue";
import SbTabela from "src/components/common/SbTabela.vue";
import SbEmptyState from "src/components/common/SbEmptyState.vue";
import SbSeletorEmpresa from "src/components/common/SbSeletorEmpresa.vue";
import { formatarCnpj, opcoesDeEmpresa } from "src/utils/seletores";
import MargemService from "src/services/MargemService";
import { mensagemDeErro } from 'src/utils/erros'
import FiscalService from "src/services/FiscalService";
import {
  GRANULARIDADES_DE_MARGEM,
  MARKETPLACES_DE_MARGEM,
  diagnosticoDaBase,
  diasSemMovimento,
  granularidadePadrao,
  nivelDoRecorte,
  numero,
  parametrosDaMargem,
  ressalvasDaMargem,
  rotuloCompetencia,
  rotuloDaBase,
  rotuloDia,
  rotuloDoProduto,
  rotuloMarketplace,
  rotuloNivel,
  somaEmbalagem,
} from "src/utils/margem";

const $q = useQuasar();

const filtros = ref({
  cnpj: null,
  marketplace: null,
  produto: null,
  de: "",
  ate: "",
  granularidade: "mes",
});

const opcoesCnpj = ref([]);
const produtos = ref([]);
const carregandoProdutos = ref(false);
/** A série diária (`DRE-24`) — só é buscada e mostrada na granularidade `dia`. */
const diario = ref({ dias: [], total: {}, metodo: {} });

/**
 * As colunas do detalhe. A ordem é a leitura da cascata do dono (GMV → impostos → líquido → custos →
 * MC), e as colunas de dinheiro são as mesmas do resumo — a linha e o total não podem discordar.
 */
const COLUNAS = [
  { chave: "competencia", rotulo: "Competência", largura: "110px", ordenavel: true },
  { chave: "nivel", rotulo: "Nível", largura: "110px" },
  { chave: "cnpj", rotulo: "CNPJ / empresa" },
  { chave: "marketplace", rotulo: "Marketplace", largura: "140px" },
  { chave: "sku", rotulo: "Produto (SKU)" },
  { chave: "gmv", rotulo: "GMV (R$)", tipo: "moeda", alinhamento: "right", ordenavel: true },
  { chave: "impostos", rotulo: "Impostos (R$)", tipo: "moeda", alinhamento: "right" },
  {
    chave: "faturamento_liquido",
    rotulo: "Faturamento líquido (R$)",
    tipo: "moeda",
    alinhamento: "right",
  },
  { chave: "taxas", rotulo: "Taxas (R$)", tipo: "moeda", alinhamento: "right" },
  { chave: "frete", rotulo: "Frete (R$)", tipo: "moeda", alinhamento: "right" },
  { chave: "embalagem", rotulo: "Embalagem (R$)", alinhamento: "right" },
  { chave: "ads", rotulo: "Ads (R$)", tipo: "moeda", alinhamento: "right" },
  { chave: "cpv", rotulo: "CPV (R$)", tipo: "moeda", alinhamento: "right" },
  {
    chave: "mc",
    rotulo: "Margem de contribuição (R$)",
    tipo: "moeda",
    alinhamento: "right",
    ordenavel: true,
  },
  { chave: "mc_pct", rotulo: "MC % do faturamento líquido", alinhamento: "right", ordenavel: true },
  { chave: "sinalizacoes", rotulo: "Sinalizações" },
];

const linhas = ref([]);
const resumo = ref({});
const loading = ref(false);
const erro = ref("");

/** A granularidade escolhida é `dia`? (o dono pediu: um dia filtrado tem de mostrar a MC do dia) */
const ehDiario = computed(() => filtros.value.granularidade === "dia");

/**
 * O período que a tela está mostrando: no mês é o `resumo` materializado; no dia é o **total da
 * série**, que é a soma dos dias — as duas fontes têm as mesmas chaves da cascata do dono.
 */
const periodo = computed(() => (ehDiario.value ? diario.value.total || {} : resumo.value));

/** As linhas da grade: os dias da série ou as linhas materializadas do mês. */
const linhasDaGrade = computed(() => (ehDiario.value ? diario.value.dias || [] : linhas.value));

/**
 * A conferência contra o mês: a série é calculada **agora** e o mês é o **snapshot** da
 * materialização. Quando os dois divergem (pedido ressincronizado depois), a tela **diz** — não
 * esconde atrás de um total que "quase" bate.
 */
const conferencia = computed(() => Object.values(diario.value.conferencia_com_mes || {}));
const conferenciaDivergente = computed(() => conferencia.value.some((mes) => mes.fecha === false));

/** Dias do intervalo **sem** linha na série (sem pedido e sem Ads) — o vazio é dito, não escondido. */
const diasVazios = computed(() =>
  ehDiario.value ? diasSemMovimento(diario.value.dias, filtros.value.de, filtros.value.ate) : null,
);

const COLUNAS_DIA = [
  { chave: "dia", rotulo: "Dia", largura: "110px", ordenavel: true },
  { chave: "gmv", rotulo: "GMV (R$)", tipo: "moeda", alinhamento: "right", ordenavel: true },
  { chave: "impostos", rotulo: "Impostos (R$)", tipo: "moeda", alinhamento: "right" },
  {
    chave: "faturamento_liquido",
    rotulo: "Faturamento líquido (R$)",
    tipo: "moeda",
    alinhamento: "right",
  },
  { chave: "taxas", rotulo: "Taxas (R$)", tipo: "moeda", alinhamento: "right" },
  { chave: "frete", rotulo: "Frete (R$)", tipo: "moeda", alinhamento: "right" },
  { chave: "embalagem", rotulo: "Embalagem (R$)", alinhamento: "right" },
  { chave: "ads", rotulo: "Ads (R$)", tipo: "moeda", alinhamento: "right" },
  { chave: "cpv", rotulo: "CPV (R$)", tipo: "moeda", alinhamento: "right" },
  {
    chave: "mc",
    rotulo: "Margem de contribuição (R$)",
    tipo: "moeda",
    alinhamento: "right",
    ordenavel: true,
  },
  { chave: "mc_pct", rotulo: "MC % do faturamento líquido", alinhamento: "right", ordenavel: true },
  { chave: "pedidos", rotulo: "Pedidos", alinhamento: "right", ordenavel: true },
  { chave: "sinalizacoes", rotulo: "Sinalizações" },
];

/** As colunas da grade mudam com a granularidade; as de dinheiro são as mesmas nas duas. */
const colunasDaGrade = computed(() => (ehDiario.value ? COLUNAS_DIA : COLUNAS));

const ressalvas = computed(() => ressalvasDaMargem(linhas.value));
// A embalagem do resumo agora vem do backend (a cascata do dono a inclui). O fallback é a soma das
// linhas exibidas, para o número não desaparecer se a resposta for de uma versão anterior.
const embalagem = computed(() => {
  if (periodo.value?.embalagem !== null && periodo.value?.embalagem !== undefined) {
    return {
      total: numero(periodo.value.embalagem),
      semValor: periodo.value.linhas_sem_embalagem ?? 0,
    };
  }
  return somaEmbalagem(linhasDaGrade.value);
});
const porNivel = computed(() => ({
  cnpj: resumo.value?.por_nivel?.cnpj ?? 0,
  marketplace: resumo.value?.por_nivel?.marketplace ?? 0,
  sku: resumo.value?.por_nivel?.sku ?? 0,
}));

// O **nível** sai dos filtros, não de um select: com os quatro filtros do dono, o nível já está
// determinado (nenhum filtro = grupo por CNPJ; empresa = canal; empresa + canal = SKU; produto = SKU).
const nivel = computed(() =>
  nivelDoRecorte({ cnpj: filtros.value.cnpj, marketplace: filtros.value.marketplace, sku: filtros.value.produto }),
);

// As opções do filtro de produto são as que **têm margem no recorte** — o backend as devolve com o
// nome como o item foi vendido. A busca é **local** (a lista do recorte já veio inteira), então o
// filtro não dispara requisição por tecla.
const buscaProduto = ref("");
const opcoesProduto = computed(() => {
  const busca = buscaProduto.value.trim().toLowerCase();
  if (!busca) return produtos.value;
  return produtos.value.filter((produto) =>
    `${produto.nome || ""} ${produto.sku || ""}`.toLowerCase().includes(busca),
  );
});
const dicaProdutos = computed(() => {
  if (carregandoProdutos.value) return "Buscando os produtos do recorte…";
  if (!produtos.value.length) return "Nenhum produto com margem neste recorte";
  const semNome = produtos.value.filter((p) => !p.nome).length;
  const base = `${produtos.value.length} produto(s) com margem no recorte`;
  return semNome ? `${base} · ${semNome} sem nome no pedido` : base;
});

function filtrarProdutos(termo, atualizar) {
  buscaProduto.value = String(termo || "");
  atualizar();
}

// Base de pedidos: `periodo.base_completa=false` é o veredito do backend (já por nível somado);
// os contadores de linha são o fallback quando o resumo não traz os campos novos. Na série diária o
// veredito é da **competência** e vem em cada dia (`base_completa`), então o aviso olha os dias.
const baseIncompleta = computed(() =>
  ehDiario.value
    ? (diario.value.dias || []).some((linha) => linha.base_completa === false)
    : resumo.value?.base_completa === false,
);
const linhasComBaseIncompleta = computed(() => {
  if (ehDiario.value) {
    return (diario.value.dias || []).filter((linha) => linha.base_completa === false).length;
  }
  return resumo.value?.linhas_com_base_incompleta ?? ressalvas.value.sem_base;
});
const totalDeLinhas = computed(() =>
  ehDiario.value ? (diario.value.dias || []).length : resumo.value?.linhas ?? linhas.value.length,
);
const observacoesDeBase = computed(() => [
  ...new Set(
    linhas.value
      .filter((l) => l?.base_completa === false)
      .flatMap((l) => (Array.isArray(l.observacoes) ? l.observacoes : []))
      .filter(Boolean),
  ),
]);
const divergenciasBase = computed(() => ressalvas.value.divergencias_base);

function baseDe(linha) {
  return diagnosticoDaBase(linha);
}

function semSinalizacao(linha) {
  const diagnostico = diagnosticoDaBase(linha);
  return (
    !diagnostico.incompleta &&
    !diagnostico.divergencia &&
    linha.embalagem_informada !== false &&
    linha.impostos_informados !== false
  );
}

async function carregarCnpjs() {
  try {
    const resposta = await FiscalService.getCnpjs();
    const lista = resposta.data?.results || resposta.data || [];
    opcoesCnpj.value = opcoesDeEmpresa(lista);
  } catch (e) {
    // Sem a lista o filtro de CNPJ fica vazio, mas a margem continua carregando.
    console.error("Não foi possível carregar os CNPJs:", e);
  }
}

async function carregar() {
  loading.value = true;
  erro.value = "";
  try {
    // O `nivel` vai explícito: é ele que impede o resumo de somar CNPJ + canal + SKU (o mesmo
    // dinheiro contado duas ou três vezes).
    const params = parametrosDaMargem({
      cnpj: filtros.value.cnpj,
      marketplace: filtros.value.marketplace,
      sku: filtros.value.produto,
      de: filtros.value.de,
      ate: filtros.value.ate,
      nivel: nivel.value,
    });
    if (ehDiario.value) {
      if (!filtros.value.de || !filtros.value.ate) {
        // Sem as duas datas não há série: recusar aqui é melhor que o backend devolver 400 e a tela
        // ficar com o número do mês parecendo do dia.
        diario.value = { dias: [], total: {}, metodo: {} };
        erro.value = "Informe a data inicial e a data final para ver a margem por dia.";
        return;
      }
      const resposta = await MargemService.getMargemDiaria(params);
      diario.value = resposta.data || { dias: [], total: {}, metodo: {} };
      linhas.value = [];
      resumo.value = {};
      return;
    }
    const resposta = await MargemService.getMargens(params);
    const dados = resposta.data || {};
    linhas.value = Array.isArray(dados.margens) ? dados.margens : [];
    resumo.value = dados.resumo || {};
    // A série diária sai da tela quando a granularidade é mês — dado de outro grão ao lado do mês
    // confunde mais do que ajuda.
    diario.value = { dias: [], total: {}, metodo: {} };
  } catch (e) {
    linhas.value = [];
    resumo.value = {};
    diario.value = { dias: [], total: {}, metodo: {} };
    erro.value = mensagemDeErro(e, 'Erro ao carregar a margem de contribuição.');
    $q.notify({ type: "negative", message: erro.value });
  } finally {
    loading.value = false;
  }
}

/**
 * Troca de data: **um único dia liga a granularidade `dia` sozinho** — é a pergunta do dono
 * ("quanto foi este dia?") e não faz sentido exigir dois cliques. Intervalo maior volta para o mês,
 * e a escolha dele continua valendo no seletor.
 */
function aoMudarData() {
  filtros.value = { ...filtros.value, granularidade: granularidadePadrao(filtros.value.de, filtros.value.ate) };
  recarregarTudo();
}

/**
 * As opções do filtro de produto, do **mesmo recorte** das linhas (sem `sku` e sem `nivel`): um
 * produto que não tem margem no período não pode aparecer na lista, e o produto já escolhido não
 * pode sumir dela.
 */
async function carregarProdutos() {
  carregandoProdutos.value = true;
  try {
    const resposta = await MargemService.getProdutos(
      parametrosDaMargem({
        cnpj: filtros.value.cnpj,
        marketplace: filtros.value.marketplace,
        de: filtros.value.de,
        ate: filtros.value.ate,
      }),
    );
    produtos.value = Array.isArray(resposta.data?.produtos) ? resposta.data.produtos : [];
  } catch (e) {
    // Sem a lista o filtro de produto fica vazio — a margem continua carregando e o erro já aparece.
    produtos.value = [];
  } finally {
    carregandoProdutos.value = false;
  }
}

/** Recarrega a margem **e** as opções de produto (o recorte mudou, a lista muda junto). */
function recarregarTudo() {
  carregarProdutos();
  carregar();
}

function limparFiltros() {
  filtros.value = {
    cnpj: null,
    marketplace: null,
    produto: null,
    de: "",
    ate: "",
    granularidade: "mes",
  };
  buscaProduto.value = "";
  recarregarTudo();
}

// ────────────────────────────────────────── FORMATAÇÃO / RÓTULOS

/**
 * Nome do produto por SKU, da lista do próprio recorte (o nome como o item foi **vendido**).
 * Sem nome, a célula mostra o SKU sozinho: nome inventado seria pior que nome ausente.
 */
const nomesPorSku = computed(() => {
  const mapa = new Map();
  for (const produto of produtos.value) {
    if (produto?.sku && produto?.nome) mapa.set(produto.sku, produto.nome);
  }
  return mapa;
});

function nomeDoSku(sku) {
  return nomesPorSku.value.get(sku) || sku;
}

function formatarMoeda(valor) {
  return numero(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPct(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return `${numero(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function varianteMarketplace(marketplace) {
  if (marketplace === "ml") return "ml";
  if (marketplace === "shopee") return "shopee";
  return "indigo";
}

function varianteNivel(nivel) {
  if (nivel === "cnpj") return "indigo";
  if (nivel === "marketplace") return "sky";
  return "slate";
}

onMounted(() => {
  carregarCnpjs();
  recarregarTudo();
});
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.margens-section-label {
  font-size: 13px;
  color: $tint-slate-text;
}
.margens-lista {
  margin: 0;
  padding-left: 18px;
}
.margens-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cascata {
  display: flex;
  flex-direction: column;
  max-width: 560px;
}
.cascata-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px dashed $border;
  font-size: 13px;
  color: $text-body;
}
.cascata-linha:last-child {
  border-bottom: none;
}
.cascata-rotulo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.cascata-valor {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cascata-linha--deducao .cascata-valor {
  color: $negative;
}
.cascata-linha--subtotal {
  font-weight: 600;
  color: $text-primary;
  border-bottom-style: solid;
}
.cascata-linha--total {
  font-weight: 700;
  color: $text-primary;
  font-size: 14px;
  border-top: 2px solid $text-primary;
  margin-top: 4px;
  padding-top: 12px;
}
.cascata-pct {
  margin-left: 8px;
  font-size: 12px;
  color: $tint-teal-text;
}
</style>
