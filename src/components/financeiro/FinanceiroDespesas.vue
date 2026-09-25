<template>
  <div>
    <FinanceiroRecorte
      v-model:empresa="empresa"
      v-model:periodo="periodo"
      :carregando="loading"
      :aviso="aviso"
      @carregar="carregar"
    />

    <SbEmptyState v-if="loading" variant="loading" title="Carregando as despesas…" />
    <SbEmptyState v-else-if="erro" variant="error" title="Não foi possível carregar as despesas" :message="erro" />
    <template v-else>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6 col-md-3">
          <SbKpiCard label="Lançamentos" :value="String(resumo.lancamentos ?? 0)" variant="slate" />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <SbKpiCard
            label="Total digitado"
            :value="formatarMoeda(resumo.total)"
            sub="inclui o que não entra no resultado"
            variant="teal"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <SbKpiCard
            label="Entra no resultado"
            :value="formatarMoeda(resumo.dentro_do_resultado)"
            sub="é o que o DRE subtrai"
            variant="sky"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-3">
          <SbKpiCard
            label="Fora do resultado"
            :value="formatarMoeda(resumo.fora_do_resultado)"
            sub="patrimônio: sócio ou ativo (decisão #12)"
            variant="amber"
          />
        </div>
      </div>

      <div class="row items-center q-gutter-sm q-mb-sm">
        <q-btn
          unelevated
          no-caps
          color="teal-8"
          text-color="white"
          icon="add"
          label="Nova despesa"
          :disable="!categorias.length || !contas.length"
          @click="abrirNova"
        >
          <q-tooltip v-if="!categorias.length">
            Sem categoria de despesa não há como lançar: importe a planilha do DRE-3 ou cadastre uma
            categoria.
          </q-tooltip>
        </q-btn>
        <SbBadge v-if="resumo.deducoes_da_receita && resumo.deducoes_da_receita !== '0.00'" variant="indigo" icon="rule">
          R$ {{ resumo.deducoes_da_receita }} em dedução da receita (DAS/ISS) — não somar às despesas
        </SbBadge>
        <q-space />
        <span class="text-caption text-grey-7">
          Clique na descrição, no valor, na data ou na categoria para editar; Enter salva e Esc cancela.
        </span>
      </div>

      <SbTabela
        exportavel
        :nome-exportacao="'despesas'"
        v-model:ordenacao="ordenacao"
        :colunas="COLUNAS"
        :linhas="lancamentos"
        chave-linha="id"
        rotulo="Despesas do período"
        :classe-linha="classeDaLinha"
        :vazio="{
          titulo: 'Nenhuma despesa neste recorte',
          mensagem: categorias.length
            ? 'Crie a primeira em “Nova despesa” ou importe a planilha de gestão (DRE-3).'
            : 'Não há categoria de despesa cadastrada: importe a planilha de gestão (DRE-3), que cria as categorias.',
        }"
      >
        <template #celula-categoria_nome="{ linha }">
          <SbCelulaEditavel
            :valor="linha.categoria"
            tipo="selecao"
            :opcoes="opcoesCategoria"
            :editavel="editavel(linha)"
            :motivo="motivo(linha)"
            :formatar="nomeDaCategoria"
            :salvar="(novo) => salvarCampo(linha, { categoria: novo })"
            rotulo="Categoria"
          />
        </template>

        <template #celula-descricao="{ linha }">
          <SbCelulaEditavel
            :valor="linha.descricao"
            tipo="texto"
            :editavel="editavel(linha)"
            :motivo="motivo(linha)"
            :salvar="(novo) => salvarCampo(linha, { descricao: novo })"
            rotulo="Descrição"
          />
        </template>

        <template #celula-valor="{ linha }">
          <SbCelulaEditavel
            :valor="linha.valor"
            tipo="moeda"
            :formatar="formatarMoeda"
            :editavel="editavel(linha)"
            :motivo="motivo(linha)"
            :validar="validarValor"
            :salvar="(novo) => salvarCampo(linha, { valor: novo })"
            rotulo="Valor"
          />
        </template>

        <template #celula-data="{ linha }">
          <SbCelulaEditavel
            :valor="linha.data"
            tipo="data"
            :formatar="formatDate"
            :editavel="editavel(linha)"
            :motivo="motivo(linha)"
            :salvar="(novo) => salvarCampo(linha, { data: novo || null })"
            rotulo="Data do documento"
          />
        </template>

        <template #celula-origem="{ linha }">
          <SbOrigemSelo :origem="linha.origem" />
        </template>

        <template #celula-acoes="{ linha }">
          <div class="text-center" data-sem-clique>
            <q-btn
              flat
              dense
              round
              color="grey-7"
              icon="delete_outline"
              :aria-label="`Remover a despesa ${linha.descricao || linha.id}`"
              @click="pedirRemocao(linha)"
            >
              <q-tooltip>Remover despesa</q-tooltip>
            </q-btn>
          </div>
        </template>
      </SbTabela>

      <ul v-if="resumo.observacoes?.length" class="text-caption text-grey-7 q-mt-sm">
        <li v-for="(obs, i) in resumo.observacoes" :key="i">{{ obs }}</li>
      </ul>
    </template>

    <!-- CRIAR: modal, porque a linha ainda não existe para ser editada na célula (`P2`). -->
    <q-dialog v-model="mostrarNova">
      <q-card class="dialogo">
        <q-card-section class="text-h6">Nova despesa</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="nova.fiscal_account"
            :options="opcoesEmpresa"
            emit-value
            map-options
            dense
            outlined
            label="Empresa"
            bg-color="white"
          />
          <q-input v-model="nova.competencia" type="month" dense outlined label="Competência" bg-color="white" />
          <q-select
            v-model="nova.categoria"
            :options="opcoesCategoria"
            emit-value
            map-options
            dense
            outlined
            label="Categoria"
            bg-color="white"
          />
          <q-input
            v-model="nova.valor"
            type="number"
            step="0.01"
            dense
            outlined
            label="Valor (R$)"
            bg-color="white"
          />
          <q-input v-model="nova.descricao" dense outlined label="Descrição" bg-color="white" />
          <q-input v-model="nova.data" type="date" dense outlined label="Data do documento (opcional)" bg-color="white" />
          <div v-if="erroFormulario" class="text-caption text-red-9">{{ erroFormulario }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" @click="mostrarNova = false" />
          <q-btn
            unelevated
            no-caps
            color="teal-8"
            text-color="white"
            label="Salvar"
            :loading="salvando"
            :disable="!podeSalvar"
            @click="criar"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- REMOVER: confirmação explícita — a exclusão não tem desfazer na tela. -->
    <q-dialog v-model="mostrarRemover">
      <q-card class="dialogo">
        <q-card-section class="text-h6">Remover despesa?</q-card-section>
        <q-card-section>
          {{ removerAlvo?.descricao || 'Lançamento sem descrição' }} —
          <strong>{{ formatarMoeda(removerAlvo?.valor) }}</strong>
          <div class="text-caption text-grey-7 q-mt-xs">
            A remoção é definitiva. Se o valor estava errado, prefira editar a célula.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" @click="mostrarRemover = false" />
          <q-btn
            unelevated
            no-caps
            color="negative"
            label="Remover"
            :loading="removendo"
            @click="confirmarRemocao"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
// Aba "Despesas" do módulo (ticket FINT-9).
//
// É a **única tela do módulo que grava**: o dono cria, edita na célula e exclui as despesas
// personalizáveis que alimentam as linhas lançáveis do DRE. Todo o resto do módulo é leitura.
//
// Decisões que valem registro:
// - **editar é na célula** (`P2`), com a `SbCelulaEditavel` do `FINT-4`: Enter salva, Esc cancela e a
//   API que recusa faz a célula voltar ao valor antigo;
// - **criar é modal**: uma linha nova precisa de empresa, competência, categoria e valor de uma vez —
//   não existe célula para editar antes de a linha existir. Criar "uma célula vazia" só adiaria a
//   validação para o primeiro blur;
// - **quem manda no que é editável é o `FINT-5`**: lançamento vindo de nota (`origem = nota`) mostra a
//   origem e **não abre** — o valor dele é o do documento;
// - o resumo do backend separa o que **entra** no resultado, o que está **fora** (sócio/ativo) e o que
//   é **dedução da receita** (DAS/ISS); a tela mostra os três, sem somar o que não se soma.
import { computed, onMounted, reactive, ref } from 'vue'

import { useEstadoNaUrl } from 'src/composables/useEstadoNaUrl'

import FinanceiroRecorte from 'src/components/financeiro/FinanceiroRecorte.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCelulaEditavel from 'src/components/common/SbCelulaEditavel.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbOrigemSelo from 'src/components/common/SbOrigemSelo.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import DespesasService from 'src/services/DespesasService'
import FiscalService from 'src/services/FiscalService'
import { motivoNaoEditavel, podeEditar } from 'src/utils/editabilidade'
import { formatDate } from 'src/utils/formato'
import { formatarMoeda } from 'src/utils/contabil'
import { opcoesDeEmpresa } from 'src/utils/seletores'

// Recorte na URL (FINT-11): a empresa e a competência vêm do link e voltam para ele.
const { empresa, periodo, ordenacao } = useEstadoNaUrl()

const lancamentos = ref([])
const resumo = ref({})
const categorias = ref([])
const contas = ref([])

const loading = ref(false)
const erro = ref('')

const mostrarNova = ref(false)
const mostrarRemover = ref(false)
const removerAlvo = ref(null)
const salvando = ref(false)
const removendo = ref(false)
const erroFormulario = ref('')


const COLUNAS = [
  { chave: 'competencia', rotulo: 'Competência', tipo: 'texto', ordenavel: true, largura: '116px' },
  { chave: 'categoria_nome', rotulo: 'Categoria', tipo: 'texto', ordenavel: true, largura: '200px' },
  { chave: 'descricao', rotulo: 'Descrição', tipo: 'texto', ordenavel: true },
  { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', alinhamento: 'right', ordenavel: true, largura: '170px' },
  { chave: 'data', rotulo: 'Documento', tipo: 'data', ordenavel: true, largura: '150px' },
  { chave: 'origem', rotulo: 'Origem', tipo: 'texto', ordenavel: true, largura: '120px' },
  { chave: 'acoes', rotulo: 'Ações', alinhamento: 'center', largura: '76px' },
]

const nova = reactive({
  fiscal_account: null,
  competencia: '',
  categoria: null,
  valor: '',
  descricao: '',
  data: '',
})

const aviso = computed(() =>
  empresa.value ? '' : 'Sem empresa escolhida, o recorte soma as duas empresas.',
)

const parametros = computed(() => {
  const params = {}
  if (empresa.value) params.cnpj = empresa.value
  if (periodo.value?.de) params.de = periodo.value.de
  if (periodo.value?.ate) params.ate = periodo.value.ate
  return params
})

const opcoesCategoria = computed(() =>
  categorias.value.map((categoria) => ({
    label: `${categoria.nome}${categoria.fora_do_resultado ? ' · fora do resultado' : ''}`,
    value: categoria.id,
  })),
)

const opcoesEmpresa = computed(() => opcoesDeEmpresa(contas.value, { valor: 'id' }))

const podeSalvar = computed(
  () => !!(nova.fiscal_account && nova.competencia && nova.categoria && nova.valor !== ''),
)

const nomeDaCategoria = (id) =>
  categorias.value.find((categoria) => String(categoria.id) === String(id))?.nome || '—'

/** O que a régua do `FINT-5` libera: lançamento nosso (manual/planilha/recorrente) abre; nota não. */
const editavel = (linha) => podeEditar({ editavel: true, origem: linha.origem })
const motivo = (linha) => motivoNaoEditavel(linha.origem)

const classeDaLinha = (linha) =>
  linha.categoria_fora_do_resultado ? 'linha--fora-do-resultado' : ''

function validarValor(valor) {
  if (valor === null) return 'Informe um número.'
  return true
}

function mensagemDeErro(e) {
  const dados = e?.response?.data
  if (typeof dados === 'string' && dados) return dados
  if (dados?.detail) return dados.detail
  const primeiro = dados && Object.entries(dados)[0]
  if (primeiro) return `${primeiro[0]}: ${[].concat(primeiro[1]).join(' ')}`
  return 'Não foi possível salvar.'
}

/** Salva uma célula. Quem trata o rollback é a `SbCelulaEditavel`; aqui só o caminho feliz. */
async function salvarCampo(linha, payload) {
  const resposta = await DespesasService.atualizarLancamento(linha.id, payload)
  Object.assign(linha, resposta.data || payload)
  await atualizarResumo()
}

async function atualizarResumo() {
  try {
    const resposta = await DespesasService.getResumo(parametros.value)
    resumo.value = resposta.data || {}
  } catch {
    // O resumo é apoio; a linha já foi salva. Não vale derrubar a tela por causa dele.
  }
}

function abrirNova() {
  const conta = contas.value.find((item) => item.cnpj === empresa.value)
  nova.fiscal_account = conta?.id ?? contas.value[0]?.id ?? null
  nova.competencia = periodo.value?.de || ''
  nova.categoria = null
  nova.valor = ''
  nova.descricao = ''
  nova.data = ''
  erroFormulario.value = ''
  mostrarNova.value = true
}

async function criar() {
  salvando.value = true
  erroFormulario.value = ''
  try {
    await DespesasService.criarLancamento({
      fiscal_account: nova.fiscal_account,
      competencia: nova.competencia,
      categoria: nova.categoria,
      valor: nova.valor,
      descricao: nova.descricao,
      data: nova.data || null,
    })
    mostrarNova.value = false
    await carregar()
  } catch (e) {
    erroFormulario.value = mensagemDeErro(e)
  } finally {
    salvando.value = false
  }
}

function pedirRemocao(linha) {
  removerAlvo.value = linha
  mostrarRemover.value = true
}

async function confirmarRemocao() {
  removendo.value = true
  try {
    await DespesasService.removerLancamento(removerAlvo.value.id)
    mostrarRemover.value = false
    await carregar()
  } catch (e) {
    erro.value = mensagemDeErro(e)
    mostrarRemover.value = false
  } finally {
    removendo.value = false
  }
}

async function carregar() {
  loading.value = true
  erro.value = ''
  try {
    const resposta = await DespesasService.getLancamentos(parametros.value)
    lancamentos.value = resposta.data?.lancamentos || []
    resumo.value = resposta.data?.resumo || {}
  } catch (e) {
    lancamentos.value = []
    resumo.value = {}
    erro.value = mensagemDeErro(e)
  } finally {
    loading.value = false
  }
}

async function carregarApoio() {
  try {
    const [respostaCategorias, respostaContas] = await Promise.all([
      DespesasService.getCategorias(),
      FiscalService.getCnpjs(),
    ])
    categorias.value = respostaCategorias.data?.results || respostaCategorias.data || []
    contas.value = respostaContas.data?.results || respostaContas.data || []
  } catch {
    // Sem categoria a tela abre e diz o que falta; sem empresa o recorte é o grupo.
  }
}

onMounted(async () => {
  await carregarApoio()
  await carregar()
})
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.dialogo {
  width: 460px;
  max-width: 92vw;
}

:deep(.linha--fora-do-resultado) {
  background: $tint-amber-bg;
}
</style>
