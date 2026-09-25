<template>
  <q-page class="margens-page q-pa-lg">
    <div class="margens-container">

      <!-- ══════════════════════════════════════════ CABEÇALHO -->
      <SbPageHeader
        title="Margem de Contribuição"
        eyebrow="Financeiro & Resultado"
        subtitle="GMV − impostos = faturamento líquido; menos taxas, frete, embalagem, ads e CPV = margem de contribuição"
        icon="calculate"
      >
        <template #actions>
          <q-btn
            flat
            dense
            color="grey-8"
            icon="refresh"
            label="Atualizar"
            :loading="loading"
            @click="carregar"
          />
        </template>
      </SbPageHeader>

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
              @update:model-value="carregar"
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
              @update:model-value="carregar"
            />
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-input
              v-model="filtros.sku"
              dense
              outlined
              clearable
              label="SKU"
              placeholder="Ex.: SKU-A"
              bg-color="white"
              @keyup.enter="carregar"
              @clear="carregar"
            />
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="filtros.nivel"
              :options="NIVEIS_DE_MARGEM"
              emit-value
              map-options
              dense
              outlined
              label="Nível do resumo"
              bg-color="white"
              @update:model-value="carregar"
            />
          </div>

          <div class="col-12 col-md-6">
            <SbSeletorPeriodo v-model="periodoMargem" />
          </div>

          <div class="col-12 col-md-6">
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
          Resumo do nível <strong>{{ rotuloNivel(resumo.nivel_do_resumo) }}</strong>
          · {{ resumo.linhas || linhas.length }} linha(s)
        </div>

        <SbKpiGrid :columns="5" class="q-mb-lg">
          <SbKpiCard
            label="GMV bruto"
            :value="formatarMoeda(resumo.gmv)"
            :sub="`${porNivel.cnpj} CNPJ · ${porNivel.marketplace} marketplace · ${porNivel.sku} SKU`"
            variant="slate"
          />
          <SbKpiCard
            label="Faturamento líquido"
            :value="formatarMoeda(resumo.faturamento_liquido)"
            sub="GMV − impostos"
            variant="sky"
          />
          <SbKpiCard
            label="Margem de contribuição"
            :value="formatarMoeda(resumo.mc)"
            sub="Após taxas, frete, embalagem, ads e CPV"
            variant="teal"
          />
          <SbKpiCard
            label="MC % do faturamento líquido"
            :value="formatarPct(resumo.mc_pct)"
            :sub="`Resumo por ${rotuloNivel(resumo.nivel_do_resumo).toLowerCase()}`"
            variant="green"
          />
          <SbKpiCard
            label="Receita declarada (PGDASD)"
            :value="resumo.receita_declarada != null ? formatarMoeda(resumo.receita_declarada) : '—'"
            :sub="resumo.receita_declarada != null
              ? 'Régua oficial da cobertura da base'
              : 'Só existe no nível CNPJ'"
            variant="indigo"
          />
        </SbKpiGrid>

        <!-- ══════════════════════════════════════════ CASCATA -->
        <SbCard class="q-mb-lg" title="Cascata da margem" eyebrow="Como o número foi formado">
          <div class="cascata">
            <div class="cascata-linha">
              <span class="cascata-rotulo">GMV bruto</span>
              <span class="cascata-valor">{{ formatarMoeda(resumo.gmv) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) Impostos</span>
              <span class="cascata-valor">{{ formatarMoeda(resumo.impostos) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--subtotal">
              <span class="cascata-rotulo">(=) Faturamento líquido</span>
              <span class="cascata-valor">{{ formatarMoeda(resumo.faturamento_liquido) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) Taxas</span>
              <span class="cascata-valor">{{ formatarMoeda(resumo.taxas) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) Frete</span>
              <span class="cascata-valor">{{ formatarMoeda(resumo.frete) }}</span>
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
              <span class="cascata-valor">{{ formatarMoeda(resumo.ads) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--deducao">
              <span class="cascata-rotulo">(−) CPV (custo do produto vendido)</span>
              <span class="cascata-valor">{{ formatarMoeda(resumo.cpv) }}</span>
            </div>
            <div class="cascata-linha cascata-linha--total">
              <span class="cascata-rotulo">(=) Margem de contribuição</span>
              <span class="cascata-valor">
                {{ formatarMoeda(resumo.mc) }}
                <span class="cascata-pct">{{ formatarPct(resumo.mc_pct) }}</span>
              </span>
            </div>
          </div>
          <div class="text-caption text-grey-6 q-mt-sm">
            A embalagem do resumo é a soma das linhas exibidas (o backend não a inclui no total
            do resumo porque ela é custo por SKU).
          </div>
        </SbCard>

        <!-- ══════════════════════════════════════════ LINHAS -->
        <SbCard title="Detalhe por linha" :eyebrow="`${linhas.length} linha(s) no recorte`">
          <SbTable>
            <thead>
              <tr>
                <th>Competência</th>
                <th>Nível</th>
                <th>CNPJ / empresa</th>
                <th>Marketplace</th>
                <th>SKU</th>
                <th class="text-right">GMV</th>
                <th class="text-right">Impostos</th>
                <th class="text-right">Fat. líquido</th>
                <th class="text-right">Taxas</th>
                <th class="text-right">Frete</th>
                <th class="text-right">Embalagem</th>
                <th class="text-right">Ads</th>
                <th class="text-right">CPV</th>
                <th class="text-right">MC</th>
                <th class="text-right">MC %</th>
                <th>Sinalizações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="linha in linhas" :key="linha.id">
                <td class="row--bold">{{ rotuloCompetencia(linha.competencia) }}</td>
                <td>
                  <SbBadge :variant="varianteNivel(linha.nivel)">{{ rotuloNivel(linha.nivel) }}</SbBadge>
                </td>
                <td>
                  <div class="row--bold">{{ formatarCnpj(linha.cnpj) }}</div>
                  <div class="text-caption text-grey-6">{{ linha.razao_social || "—" }}</div>
                </td>
                <td>
                  <SbBadge v-if="linha.marketplace" :variant="varianteMarketplace(linha.marketplace)">
                    {{ rotuloMarketplace(linha.marketplace) }}
                  </SbBadge>
                  <span v-else class="row--muted">—</span>
                </td>
                <td>{{ linha.sku || "—" }}</td>
                <td class="text-right">{{ formatarMoeda(linha.gmv) }}</td>
                <td class="text-right" :class="{ 'row--warn': linha.impostos_informados === false }">
                  {{ linha.impostos_informados === false ? "não informado" : formatarMoeda(linha.impostos) }}
                </td>
                <td class="text-right">{{ formatarMoeda(linha.faturamento_liquido) }}</td>
                <td class="text-right">{{ formatarMoeda(linha.taxas) }}</td>
                <td class="text-right">{{ formatarMoeda(linha.frete) }}</td>
                <td class="text-right" :class="{ 'row--warn': linha.embalagem_informada === false }">
                  {{ linha.embalagem_informada === false ? "não cadastrada" : formatarMoeda(linha.embalagem) }}
                </td>
                <td class="text-right">{{ formatarMoeda(linha.ads) }}</td>
                <td class="text-right">{{ formatarMoeda(linha.cpv) }}</td>
                <td class="text-right row--bold" :class="numero(linha.mc) >= 0 ? 'row--pos' : 'row--neg'">
                  {{ formatarMoeda(linha.mc) }}
                </td>
                <td class="text-right" :class="numero(linha.mc_pct) >= 0 ? 'row--pos' : 'row--neg'">
                  {{ formatarPct(linha.mc_pct) }}
                </td>
                <td>
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
                </td>
              </tr>
            </tbody>
          </SbTable>
        </SbCard>
      </template>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useQuasar } from "quasar";
import SbPageHeader from "src/components/common/SbPageHeader.vue";
import SbCard from "src/components/common/SbCard.vue";
import SbKpiCard from "src/components/common/SbKpiCard.vue";
import SbKpiGrid from "src/components/common/SbKpiGrid.vue";
import SbInfoCallout from "src/components/common/SbInfoCallout.vue";
import SbBadge from "src/components/common/SbBadge.vue";
import SbTable from "src/components/common/SbTable.vue";
import SbEmptyState from "src/components/common/SbEmptyState.vue";
import SbSeletorEmpresa from "src/components/common/SbSeletorEmpresa.vue";
import SbSeletorPeriodo from "src/components/common/SbSeletorPeriodo.vue";
import { formatarCnpj, opcoesDeEmpresa } from "src/utils/seletores";
import MargemService from "src/services/MargemService";
import FiscalService from "src/services/FiscalService";
import {
  MARKETPLACES_DE_MARGEM,
  NIVEIS_DE_MARGEM,
  diagnosticoDaBase,
  numero,
  parametrosDaMargem,
  ressalvasDaMargem,
  rotuloCompetencia,
  rotuloDaBase,
  rotuloMarketplace,
  rotuloNivel,
  somaEmbalagem,
} from "src/utils/margem";

const $q = useQuasar();

const filtros = ref({
  cnpj: null,
  marketplace: null,
  sku: "",
  de: "",
  ate: "",
  nivel: "marketplace",
});

const opcoesCnpj = ref([]);

const linhas = ref([]);
const resumo = ref({});
const loading = ref(false);
const erro = ref("");

const ressalvas = computed(() => ressalvasDaMargem(linhas.value));
const embalagem = computed(() => somaEmbalagem(linhas.value));
const porNivel = computed(() => ({
  cnpj: resumo.value?.por_nivel?.cnpj ?? 0,
  marketplace: resumo.value?.por_nivel?.marketplace ?? 0,
  sku: resumo.value?.por_nivel?.sku ?? 0,
}));

// O seletor de período trabalha com `{ de, ate }`; aqui ele é um proxy do filtro da tela, e cada
// mudança recarrega — mesmo efeito do `@change="carregar"` que os dois inputs tinham.
const periodoMargem = computed({
  get: () => ({ de: filtros.value.de, ate: filtros.value.ate }),
  set: (valor) => {
    filtros.value = { ...filtros.value, de: valor?.de || "", ate: valor?.ate || "" };
    carregar();
  },
});

// Base de pedidos: `resumo.base_completa=false` é o veredito do backend (já por nível somado);
// os contadores de linha são o fallback quando o resumo não traz os campos novos.
const baseIncompleta = computed(() => resumo.value?.base_completa === false);
const linhasComBaseIncompleta = computed(
  () => resumo.value?.linhas_com_base_incompleta ?? ressalvas.value.sem_base,
);
const totalDeLinhas = computed(() => resumo.value?.linhas ?? linhas.value.length);
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
    const resposta = await MargemService.getMargens(parametrosDaMargem(filtros.value));
    const dados = resposta.data || {};
    linhas.value = Array.isArray(dados.margens) ? dados.margens : [];
    resumo.value = dados.resumo || {};
  } catch (e) {
    linhas.value = [];
    resumo.value = {};
    erro.value = mensagemDeErro(e);
    $q.notify({ type: "negative", message: erro.value });
  } finally {
    loading.value = false;
  }
}

function mensagemDeErro(e) {
  const dados = e?.response?.data;
  if (dados?.detail) return dados.detail;
  const primeiro = dados && typeof dados === "object" ? Object.values(dados)[0] : null;
  if (Array.isArray(primeiro) && primeiro.length) return String(primeiro[0]);
  if (typeof primeiro === "string") return primeiro;
  return "Erro ao carregar a margem de contribuição.";
}

function limparFiltros() {
  filtros.value = { cnpj: null, marketplace: null, sku: "", de: "", ate: "", nivel: "marketplace" };
  carregar();
}

// ────────────────────────────────────────── FORMATAÇÃO / RÓTULOS

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
  carregar();
});
</script>

<style scoped>
.margens-page {
  background: #f8fafc;
}
.margens-container {
  max-width: 1400px;
  margin: 0 auto;
}
.margens-section-label {
  font-size: 13px;
  color: #475569;
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
  border-bottom: 1px dashed #e2e8f0;
  font-size: 13px;
  color: #334155;
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
  color: #b91c1c;
}
.cascata-linha--subtotal {
  font-weight: 600;
  color: #0f172a;
  border-bottom-style: solid;
}
.cascata-linha--total {
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
  border-top: 2px solid #0f172a;
  margin-top: 4px;
  padding-top: 12px;
}
.cascata-pct {
  margin-left: 8px;
  font-size: 12px;
  color: #0f766e;
}
</style>
