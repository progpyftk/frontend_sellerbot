<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="cfd">
      <q-card-section class="cfd-head">
        <div>
          <div class="text-subtitle1 text-weight-bold">Custos fixos mensais</div>
          <div class="cfd-sub">Um cadastro só para a operação (Dose Verde + Casa). Mudar um valor cria uma nova vigência; o valor antigo fica no histórico.</div>
        </div>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-inner-loading :showing="carregando" />
        <div v-for="g in grupos" :key="g.key" class="cfd-grupo">
          <div class="cfd-grupo-title">{{ g.titulo }} <span class="cfd-sub">· {{ brl(totais[g.key]) }}/mês</span></div>
          <div v-for="it in itensDo(g.key)" :key="it.nome" class="cfd-item">
            <div class="cfd-item-row">
              <div class="cfd-nome">
                {{ it.nome }}
                <div class="cfd-sub">{{ it.vigente ? 'desde ' + data(it.vigente.vigencia_de) : 'sem valor em vigor' }}</div>
              </div>
              <div class="cfd-valor">{{ it.vigente ? brl(it.vigente.valor_mensal) : '—' }}</div>
              <q-btn flat dense round size="sm" icon="edit" @click="abrirEdicao(it)"><q-tooltip>Novo valor a partir de uma data</q-tooltip></q-btn>
              <q-btn flat dense round size="sm" icon="history" :color="aberto[it.nome] ? 'primary' : 'grey-7'" @click="aberto[it.nome] = !aberto[it.nome]"><q-tooltip>Histórico</q-tooltip></q-btn>
              <q-btn v-if="it.vigente" flat dense round size="sm" icon="block" color="grey-7" @click="encerrar(it)"><q-tooltip>Encerrar (deixa de valer)</q-tooltip></q-btn>
            </div>
            <div v-if="aberto[it.nome]" class="cfd-hist">
              <div v-for="h in it.historico" :key="h.id" class="cfd-hist-row">
                <span>{{ data(h.vigencia_de) }} → {{ h.vigencia_ate ? data(h.vigencia_ate) : 'em vigor' }}</span>
                <span>{{ brl(h.valor_mensal) }}</span>
                <q-btn flat dense round size="xs" icon="delete" color="negative" @click="excluir(h)"><q-tooltip>Apagar este registro (lançado errado)</q-tooltip></q-btn>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator />
      <q-card-section>
        <div class="cfd-grupo-title">{{ form.existente ? 'Novo valor: ' + form.nome : 'Adicionar item' }}</div>
        <div class="cfd-form">
          <q-input v-if="!form.existente" v-model="form.nome" dense outlined label="Item" maxlength="80" class="cfd-f-nome" />
          <q-select v-if="!form.existente" v-model="form.grupo" dense outlined emit-value map-options :options="opcoesGrupo" label="Grupo" class="cfd-f-grupo" />
          <q-input v-model="form.valor" dense outlined label="Valor mensal (R$)" inputmode="decimal" class="cfd-f-valor" />
          <q-input v-model="form.vigencia" dense outlined type="date" label="A partir de" stack-label class="cfd-f-data" />
          <q-btn unelevated color="primary" no-caps label="Salvar" :loading="salvando" @click="salvar" />
          <q-btn v-if="form.existente" flat no-caps label="Cancelar" @click="limpar" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useQuasar } from 'quasar'
import FinanceiroService from 'src/services/FinanceiroService'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'salvo'])
const $q = useQuasar()

const grupos = [
  { key: 'operacional', titulo: 'Custo fixo operacional (antes do lucro operacional)' },
  { key: 'financeiro', titulo: 'Empréstimos (abaixo do lucro operacional)' },
]
const opcoesGrupo = grupos.map(g => ({ value: g.key, label: g.key === 'operacional' ? 'Custo fixo operacional' : 'Empréstimo (abaixo do lucro operacional)' }))

const itens = ref([])
const totais = reactive({ operacional: 0, financeiro: 0 })
const aberto = reactive({})
const carregando = ref(false)
const salvando = ref(false)
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const form = reactive({ existente: false, nome: '', grupo: 'operacional', valor: '', vigencia: hoje() })

const itensDo = (g) => itens.value.filter(i => i.grupo === g)
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const data = (iso) => iso ? iso.split('-').reverse().join('/') : ''

async function carregar() {
  carregando.value = true
  try {
    const { data: d } = await FinanceiroService.getCustosFixos()
    itens.value = d.itens || []
    totais.operacional = d.total_operacional
    totais.financeiro = d.total_financeiro
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Não foi possível carregar os custos fixos.' })
  } finally {
    carregando.value = false
  }
}
watch(() => props.modelValue, (v) => { if (v) { limpar(); carregar() } })

function limpar() { Object.assign(form, { existente: false, nome: '', grupo: 'operacional', valor: '', vigencia: hoje() }) }
function abrirEdicao(it) {
  Object.assign(form, { existente: true, nome: it.nome, grupo: it.grupo, valor: it.vigente ? String(it.vigente.valor_mensal).replace('.', ',') : '', vigencia: hoje() })
}

async function depois(acao, ok) {
  try {
    await acao()
    $q.notify({ type: 'positive', message: ok })
    await carregar()
    emit('salvo')
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.error || 'Não foi possível salvar.' })
  }
}

// "11.674,84" ou "11674,84" (pt-BR) e "11674.84" valem o mesmo
const valorNumerico = (v) => { const t = String(v).trim(); return t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t }

async function salvar() {
  if (!form.nome.trim() || form.valor === '' || !form.vigencia) {
    $q.notify({ type: 'warning', message: 'Preencha item, valor e data.' }); return
  }
  salvando.value = true
  await depois(() => FinanceiroService.salvarCustoFixo({
    nome: form.nome.trim(), grupo: form.existente ? undefined : form.grupo,
    valor_mensal: valorNumerico(form.valor), vigencia_de: form.vigencia,
  }), 'Custo fixo salvo.')
  salvando.value = false
  limpar()
}

function encerrar(it) {
  $q.dialog({
    title: `Encerrar "${it.nome}"`, message: 'Último dia em que este custo vale:', cancel: true,
    prompt: { model: new Date().toISOString().slice(0, 10), type: 'date' },
  }).onOk((dia) => depois(() => FinanceiroService.encerrarCustoFixo({ nome: it.nome, ultimo_dia: dia }), 'Item encerrado.'))
}

function excluir(h) {
  $q.dialog({ title: 'Apagar registro', message: `Apagar ${brl(h.valor_mensal)} desde ${data(h.vigencia_de)}? O valor anterior volta a valer.`, cancel: true })
    .onOk(() => depois(() => FinanceiroService.excluirCustoFixo(h.id), 'Registro apagado.'))
}

</script>

<style scoped>
.cfd { width: 640px; max-width: 96vw; }
.cfd-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.cfd-sub { font-size: 11px; color: #a0aec0; font-weight: 400; }
.cfd-grupo { margin-top: 10px; }
.cfd-grupo-title { font-size: 12px; font-weight: 700; color: #2d3748; margin-bottom: 4px; }
.cfd-item { border-top: 1px solid #edf2f7; padding: 4px 0; }
.cfd-item-row { display: flex; align-items: center; gap: 4px; }
.cfd-nome { flex: 1; font-size: 13px; min-width: 0; }
.cfd-valor { font-size: 13px; font-weight: 600; white-space: nowrap; margin-right: 4px; }
.cfd-hist { padding: 2px 0 4px 12px; }
.cfd-hist-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; color: #4a5568; }
.cfd-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.cfd-f-nome { flex: 1 1 200px; }
.cfd-f-grupo { flex: 1 1 200px; }
.cfd-f-valor { width: 150px; }
.cfd-f-data { width: 160px; }
</style>
