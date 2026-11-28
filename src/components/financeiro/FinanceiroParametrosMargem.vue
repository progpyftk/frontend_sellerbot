<template>
  <div class="fpm">
    <SbInfoCallout titulo="Todo valor novo vale de hoje em diante" icon="event" variant="info">
      {{ TEXTO_VIGENCIA }} Um valor salvo hoje pode ser corrigido hoje mesmo, pelo mesmo botão.
    </SbInfoCallout>

    <SbEmptyState v-if="carregando && !dados" variant="loading" title="Carregando os parâmetros da margem…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar os parâmetros" :message="erro" />

    <template v-else-if="dados">
      <!-- Passo a passo enquanto faltar algo obrigatório para a margem aparecer -->
      <SbCard v-if="!passos.pronto" title="Para ver a margem de contribuição" eyebrow="Passo a passo" class="q-mb-md">
        <ol class="fpm-passos">
          <li
            v-for="p in passos.passos"
            :key="p.id"
            :class="['fpm-passo', { 'fpm-passo--feito': p.feito, 'fpm-passo--atual': p.id === passos.atual }]"
          >
            <q-icon :name="p.feito ? 'check_circle' : p.id === passos.atual ? 'arrow_forward' : 'radio_button_unchecked'" size="18px" />
            <span>{{ p.titulo }}</span>
          </li>
        </ol>
        <div class="fpm-sub">
          Sem a alíquota efetiva não há margem. Produção e embalagem são opcionais: sem eles o custo entra como zero
          e a célula mostra "não informado".
        </div>
      </SbCard>

      <!-- Cadastro de CNPJ: aberto quando o login não tem nenhum, ou pelo botão -->
      <SbCard v-if="!readOnly && (!dados.cnpjs.length || mostrarCadastro)" title="Cadastrar CNPJ" class="q-mb-md">
        <div class="fpm-sub q-mb-sm">
          O CNPJ é ligado ao Tiny e às contas do Mercado Livre e da Shopee deste login que declaram o mesmo CNPJ.
        </div>
        <div class="fpm-form">
          <q-input v-model="cadastro.cnpj" dense outlined label="CNPJ" inputmode="numeric" class="fpm-f-cnpj" />
          <q-input v-model="cadastro.razao_social" dense outlined label="Razão social (opcional)" class="fpm-f-razao" />
          <q-select v-model="cadastro.regime" dense outlined emit-value map-options :options="REGIMES" label="Regime" class="fpm-f-regime" />
          <q-input v-model="cadastro.vigencia_de" dense outlined type="date" stack-label label="No regime desde" class="fpm-f-data" />
          <q-btn unelevated no-caps color="primary" label="Cadastrar" :loading="salvando === 'cadastro'" @click="cadastrar" />
          <q-btn v-if="dados.cnpjs.length" flat no-caps label="Cancelar" @click="mostrarCadastro = false" />
        </div>
      </SbCard>

      <div v-if="dados.cnpjs.length" class="row items-center q-mb-sm">
        <div class="fpm-secao col">CNPJs deste login</div>
        <q-btn v-if="!readOnly && !mostrarCadastro" flat dense no-caps icon="add" color="primary" label="Cadastrar outro CNPJ" @click="mostrarCadastro = true" />
      </div>

      <SbCard v-for="c in dados.cnpjs" :key="c.id" class="q-mb-md">
        <template #header>
          <div>
            <div class="fpm-cnpj-nome">{{ c.razao_social || 'CNPJ sem razão social' }}</div>
            <div class="fpm-sub">{{ formatCnpj(c.cnpj) }}</div>
          </div>
        </template>
        <template #actions>
          <SbBadge :variant="c.regime ? (regimeTemMargem(c.regime) ? 'green' : 'amber') : 'red'">
            {{ rotuloRegime(c.regime) }}<template v-if="c.regime && regimes[c.id]?.regime === c.regime"> desde {{ formatData(regimes[c.id].vigencia_de) }}</template>
          </SbBadge>
          <q-btn v-if="!readOnly && c.regime" flat dense no-caps size="sm" color="grey-8" label="Mudar regime" @click="abrirRegime(c)" />
          <q-btn v-if="!readOnly" flat dense no-caps size="sm" color="grey-8" icon="link" label="Ligar contas" :loading="salvando === `vincular-${c.id}`" @click="vincular(c)">
            <q-tooltip>Liga o Tiny e as contas novas deste login que declaram este CNPJ</q-tooltip>
          </q-btn>
        </template>

        <!-- Regime: obrigatório antes de qualquer parâmetro -->
        <div v-if="!readOnly && (!c.regime || regimeAberto === c.id)" class="fpm-regime">
          <div class="fpm-titulo">{{ c.regime ? 'Mudar o regime' : 'Escolha o regime deste CNPJ' }}</div>
          <div class="fpm-form">
            <q-select v-model="formRegime.regime" dense outlined emit-value map-options :options="REGIMES" label="Regime" class="fpm-f-regime" />
            <q-input v-model="formRegime.vigencia_de" dense outlined type="date" stack-label label="A partir de" class="fpm-f-data" />
            <q-btn unelevated no-caps color="primary" label="Salvar regime" :loading="salvando === `regime-${c.id}`" @click="salvarRegime(c)" />
            <q-btn v-if="c.regime" flat no-caps label="Cancelar" @click="regimeAberto = null" />
          </div>
        </div>
        <div v-else-if="!c.regime" class="fpm-aviso">Regime ainda não declarado: sem ele não há margem para este CNPJ.</div>

        <div v-if="c.regime && !regimeTemMargem(c.regime)" class="fpm-aviso">{{ TEXTO_FORA_DO_SIMPLES }}</div>

        <CadastroRegimeRegular
          v-if="regimeRegular(c.regime) && c.regime_regular"
          :cnpj="c"
          :read-only="readOnly"
          :salvando="salvando"
          @salvar-icms="(corpo) => salvarDadosIcms(c, corpo)"
          @salvar-fracao="(tipo, e) => salvarFracao(tipo, c.id, e)"
          @encerrar-fracao="(tipo) => encerrar(tipo, c.id)"
        />

        <template v-if="regimeTemMargem(c.regime)">
          <CampoParametro
            titulo="Alíquota efetiva"
            tipo="aliquota"
            :valor-atual="formatPct(c.aliquota.valor)"
            :origem-rotulo="rotuloOrigemAliquota(c.aliquota.origem)"
            :origem-variant="varianteOrigem(c.aliquota.origem)"
            :dica="c.aliquota.sugestao_pgdas != null ? `Sugestão das PGDAS: ${formatPct(c.aliquota.sugestao_pgdas)}` : 'Sem PGDAS importada para sugerir a alíquota.'"
            nota="O valor digitado vence a sugestão das PGDAS. Sem nenhum dos dois, este CNPJ fica sem margem."
            :valor-inicial="fracaoParaCampoPct(c.aliquota.origem === 'digitada' ? c.aliquota.valor : c.aliquota.sugestao_pgdas)"
            :pode-encerrar="c.aliquota.origem === 'digitada'"
            :rotulo-encerrar="c.aliquota.sugestao_pgdas != null ? 'Voltar à sugestão das PGDAS' : 'Deixar de valer'"
            :read-only="readOnly"
            :salvando="salvando === `aliquota-${c.id}`"
            @salvar="(e) => salvar('aliquota', c.id, e)"
            @encerrar="encerrar('aliquota', c.id)"
          />
          <CampoParametro
            v-for="t in TIPOS_CUSTO"
            :key="t.tipo"
            :titulo="t.titulo"
            :tipo="t.tipo"
            :valor-atual="valorCusto(c[t.tipo])"
            :origem-rotulo="rotuloCustoCnpj(c[t.tipo])"
            :origem-variant="varianteOrigem(c[t.tipo].origem)"
            :nota="t.tipo === 'embalagem' ? TEXTO_EMBALAGEM_FULL : ''"
            :valor-inicial="reaisParaCampo(c[t.tipo].valor)"
            :modo-inicial="c[t.tipo].modo"
            :permitir-detalhado="dados.tem_calculo_detalhado"
            :pode-encerrar="custoDoCnpj(c[t.tipo])"
            rotulo-encerrar="Usar o valor de todos os CNPJs"
            :read-only="readOnly"
            :salvando="salvando === `${t.tipo}-${c.id}`"
            @salvar="(e) => salvar(t.tipo, c.id, e)"
            @encerrar="encerrar(t.tipo, c.id)"
          />
        </template>
      </SbCard>

      <!-- Produção e embalagem iguais para todos os CNPJs (bloco `geral`) -->
      <SbCard v-if="temSimples" title="O mesmo para todos os CNPJs" class="q-mb-md">
        <div class="fpm-sub">Vale para os CNPJs do Simples que não têm valor próprio acima.</div>
        <CampoParametro
          v-for="t in TIPOS_CUSTO"
          :key="t.tipo"
          :titulo="t.titulo"
          :tipo="t.tipo"
          :valor-atual="valorCusto(dados.geral[t.tipo])"
          :origem-rotulo="rotuloOrigemCusto(dados.geral[t.tipo].origem)"
          :origem-variant="varianteOrigem(dados.geral[t.tipo].origem)"
          :nota="t.tipo === 'embalagem' ? TEXTO_EMBALAGEM_FULL : ''"
          :valor-inicial="reaisParaCampo(dados.geral[t.tipo].valor)"
          :modo-inicial="dados.geral[t.tipo].modo"
          :permitir-detalhado="dados.tem_calculo_detalhado"
          :pode-encerrar="dados.geral[t.tipo].origem === 'digitada'"
          :read-only="readOnly"
          :salvando="salvando === `${t.tipo}-geral`"
          @salvar="(e) => salvar(t.tipo, null, e)"
          @encerrar="encerrar(t.tipo, null)"
        />
      </SbCard>

      <SbCard v-if="historico.length" title="Histórico" class="q-mb-md">
        <div class="fpm-tabela-wrap">
          <table class="fpm-tabela">
            <thead>
              <tr>
                <th>Parâmetro</th><th>CNPJ</th><th class="r">Valor</th><th>De</th><th>Até</th><th>Quem declarou</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in historico" :key="h.id">
                <td>{{ h.tipo }}<div v-if="h.observacao" class="fpm-sub">{{ h.observacao }}</div></td>
                <td>{{ h.cnpj }}</td>
                <td class="r">{{ h.valor }}</td>
                <td>{{ h.de }}</td>
                <td>{{ h.ate }}</td>
                <td>{{ h.quem }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SbCard>
    </template>
  </div>
</template>

<script setup>
// Aba "Parâmetros da margem" do Financeiro (ticket MCS-7). Lê e grava o que o backend já entrega
// (MCS-1 a 6): regime por CNPJ, alíquota efetiva, produção/processamento e embalagem por pedido; e, no
// Lucro Real e no Presumido, o cadastro fiscal do regime regular (MCR-3, `CadastroRegimeRegular`).
// Regras de apresentação em `utils/parametrosMargem.js`; nenhum custo é calculado aqui.
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'

import CadastroRegimeRegular from 'src/components/financeiro/parametros/CadastroRegimeRegular.vue'
import CampoParametro from 'src/components/financeiro/parametros/CampoParametro.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbInfoCallout from 'src/components/common/SbInfoCallout.vue'
import FinanceiroService from 'src/services/FinanceiroService'
import FiscalService from 'src/services/FiscalService'
import { useStore } from 'src/stores/store'
import { diaLocalIso } from 'src/utils/resultadoPedido'
import {
  REGIMES, TEXTO_EMBALAGEM_FULL, TEXTO_FORA_DO_SIMPLES, TEXTO_VIGENCIA, custoDoCnpj, formatCnpj, formatData,
  formatPct, formatReais, fracaoParaCampoPct, linhasHistorico, mensagemErro, passosConfiguracao, payloadAliquota,
  payloadCusto, payloadFracao, reaisParaCampo, regimeRegular, regimeTemMargem, rotuloOrigemAliquota, rotuloOrigemCusto, rotuloRegime,
} from 'src/utils/parametrosMargem'

const TIPOS_CUSTO = [
  { tipo: 'producao', titulo: 'Custo de produção/processamento (por pedido)' },
  { tipo: 'embalagem', titulo: 'Custo de embalagem (por pedido)' },
]

const $q = useQuasar()
const store = useStore()
const readOnly = computed(() => store.isReadOnly)

const dados = ref(null)
const regimes = ref({}) // id do CNPJ → registro do regime em vigor (para a data de início)
const carregando = ref(false)
const erro = ref('')
const salvando = ref('')
const mostrarCadastro = ref(false)
const regimeAberto = ref(null)

const inicioDoAno = () => `${new Date().getFullYear()}-01-01`
const cadastro = reactive({ cnpj: '', razao_social: '', regime: 'simples', vigencia_de: inicioDoAno() })
const formRegime = reactive({ regime: 'simples', vigencia_de: inicioDoAno() })

const passos = computed(() => passosConfiguracao(dados.value))
const temSimples = computed(() => (dados.value?.cnpjs || []).some((c) => regimeTemMargem(c.regime)))
const historico = computed(() => linhasHistorico(dados.value?.historico, dados.value?.cnpjs))

function varianteOrigem(origem) {
  if (origem === 'digitada' || origem === 'simples') return 'teal'
  if (origem === 'pgdas' || origem === 'detalhado') return 'sky'
  return 'amber'
}

function valorCusto(v) {
  if (!v) return '—'
  if (v.origem === 'detalhado') return 'Pelas notas e equipe'
  return v.valor == null ? '—' : formatReais(v.valor)
}

function rotuloCustoCnpj(v) {
  const base = rotuloOrigemCusto(v?.origem)
  if (v?.origem === 'digitada' && !custoDoCnpj(v)) return `${base} (de todos os CNPJs)`
  return base
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const { data } = await FinanceiroService.getParametrosMargem({ data: diaLocalIso() })
    dados.value = data
    carregarRegimes(data.cnpjs || [])
  } catch (e) {
    erro.value = mensagemErro(e, 'Tente de novo em instantes.')
  } finally {
    carregando.value = false
  }
}

// A data de início do regime vem do histórico do CNPJ; falha aqui não impede a tela.
async function carregarRegimes(cnpjs) {
  const hoje = diaLocalIso()
  const pares = await Promise.all(cnpjs.map(async (c) => {
    try {
      const { data } = await FiscalService.getRegimeCnpj(c.id)
      const vigente = (data.regimes || []).find((r) => r.vigencia_de <= hoje && (!r.vigencia_ate || r.vigencia_ate >= hoje))
      return [c.id, vigente || null]
    } catch {
      return [c.id, null]
    }
  }))
  regimes.value = Object.fromEntries(pares)
}

async function executar(chave, acao, ok) {
  salvando.value = chave
  try {
    const resposta = await acao()
    $q.notify({ type: 'positive', message: ok })
    await carregar()
    return resposta
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemErro(e), timeout: 6000 })
    return null
  } finally {
    salvando.value = ''
  }
}

function salvar(tipo, cnpjId, { modo, texto }) {
  const corpo = tipo === 'aliquota' ? payloadAliquota(cnpjId, texto) : payloadCusto(tipo, cnpjId, modo, texto)
  return executar(`${tipo}-${cnpjId || 'geral'}`, () => FinanceiroService.salvarParametroMargem(corpo), `Salvo. ${TEXTO_VIGENCIA}`)
}

function salvarFracao(tipo, cnpjId, { texto }) {
  return executar(`${tipo}-${cnpjId}`, () => FinanceiroService.salvarParametroMargem(payloadFracao(tipo, cnpjId, texto)), `Salvo. ${TEXTO_VIGENCIA}`)
}

function salvarDadosIcms(c, corpo) {
  return executar(`icms-${c.id}`, () => FiscalService.salvarDadosIcmsCnpj(c.id, corpo), 'Dados de ICMS salvos.')
}

function ontem() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return diaLocalIso(d)
}

function encerrar(tipo, cnpjId) {
  const mensagem = tipo === 'icms_recuperavel' || tipo === 'credito_simples'
    ? 'O valor deixa de valer a partir de hoje. As vendas anteriores não mudam.'
    : tipo === 'aliquota'
    ? 'A alíquota digitada deixa de valer a partir de hoje; volta a valer a sugestão das PGDAS, quando houver. As vendas anteriores não mudam.'
    : cnpjId
      ? 'O valor deste CNPJ deixa de valer a partir de hoje e passa a valer o de todos os CNPJs. As vendas anteriores não mudam.'
      : 'O valor de todos os CNPJs deixa de valer a partir de hoje. As vendas anteriores não mudam.'
  $q.dialog({ title: 'Deixar de valer', message: mensagem, cancel: true, persistent: true }).onOk(() => {
    const corpo = { tipo, ultimo_dia: ontem() }
    if (cnpjId) corpo.cnpj_id = cnpjId
    executar(`${tipo}-${cnpjId || 'geral'}`, () => FinanceiroService.encerrarParametroMargem(corpo), 'Feito.')
  })
}

function abrirRegime(c) {
  regimeAberto.value = c.id
  Object.assign(formRegime, { regime: c.regime || 'simples', vigencia_de: diaLocalIso() })
}

async function salvarRegime(c) {
  if (!formRegime.regime || !formRegime.vigencia_de) {
    $q.notify({ type: 'warning', message: 'Escolha o regime e a data de início.' })
    return
  }
  const ok = await executar(`regime-${c.id}`, () => FiscalService.declararRegimeCnpj(c.id, { ...formRegime }), 'Regime salvo.')
  if (ok) {
    regimeAberto.value = null
    Object.assign(formRegime, { regime: 'simples', vigencia_de: inicioDoAno() })
  }
}

function resumoVinculos(v) {
  if (!v) return ''
  const partes = []
  if (v.tiny) partes.push('Tiny ligado')
  if (v.vinculadas?.length) partes.push(`${v.vinculadas.length} conta(s) ligada(s)`)
  if (v.ja_vinculadas?.length) partes.push(`${v.ja_vinculadas.length} já estava(m) ligada(s)`)
  if (v.em_outro_cnpj?.length) partes.push(`${v.em_outro_cnpj.length} ligada(s) a outro CNPJ`)
  return partes.length ? partes.join(' · ') : 'Nenhuma conta deste login declara este CNPJ.'
}

async function cadastrar() {
  if (String(cadastro.cnpj).replace(/\D/g, '').length !== 14) {
    $q.notify({ type: 'warning', message: 'O CNPJ precisa ter 14 dígitos.' })
    return
  }
  const corpo = { ...cadastro, cnpj: String(cadastro.cnpj).replace(/\D/g, '') }
  if (!corpo.regime) { delete corpo.regime; delete corpo.vigencia_de }
  const r = await executar('cadastro', () => FiscalService.cadastrarCnpj(corpo), 'CNPJ cadastrado.')
  if (r) {
    $q.notify({ type: 'info', message: resumoVinculos(r.data?.vinculos), timeout: 6000 })
    mostrarCadastro.value = false
    Object.assign(cadastro, { cnpj: '', razao_social: '', regime: 'simples', vigencia_de: inicioDoAno() })
  }
}

async function vincular(c) {
  salvando.value = `vincular-${c.id}`
  try {
    const { data } = await FiscalService.vincularContasCnpj(c.id)
    $q.notify({ type: 'info', message: resumoVinculos(data), timeout: 6000 })
  } catch (e) {
    $q.notify({ type: 'negative', message: mensagemErro(e) })
  } finally {
    salvando.value = ''
  }
}

onMounted(carregar)
</script>

<style scoped>
.fpm { display: flex; flex-direction: column; gap: 12px; }
.fpm-sub { font-size: 12px; color: #718096; }
.fpm-cnpj-nome { font-size: 15px; font-weight: 700; color: #1a202c; }
.fpm-secao { font-size: 13px; font-weight: 700; color: #2d3748; }
.fpm-titulo { font-size: 13px; font-weight: 700; color: #2d3748; margin-bottom: 6px; }
.fpm-aviso { font-size: 12.5px; color: #975a16; background: #fffaf0; border-radius: 8px; padding: 8px 12px; margin: 8px 0; }
.fpm-regime { padding: 8px 0 12px; }
.fpm-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
.fpm-f-cnpj { width: 200px; }
.fpm-f-razao { width: 260px; }
.fpm-f-regime { width: 200px; }
.fpm-f-data { width: 170px; }
.fpm-passos { list-style: none; padding: 0; margin: 0 0 8px; display: flex; flex-direction: column; gap: 4px; }
.fpm-passo { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #718096; }
.fpm-passo--feito { color: #2f855a; }
.fpm-passo--atual { color: #2d3748; font-weight: 700; }
.fpm-tabela-wrap { overflow-x: auto; }
.fpm-tabela { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.fpm-tabela th { text-align: left; font-size: 11px; color: #a0aec0; font-weight: 600; padding: 4px 8px; }
.fpm-tabela td { padding: 6px 8px; border-top: 1px solid #edf2f7; color: #2d3748; vertical-align: top; }
.fpm-tabela .r { text-align: right; white-space: nowrap; }
</style>
