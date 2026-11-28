<template>
  <!-- Cadastro fiscal do CNPJ do Lucro Real ou do Presumido (ticket MCR-3): o que o cálculo da margem do
       regime regular vai ler. As alíquotas vêm do backend com a fonte; aqui nada é calculado. -->
  <div class="crr">
    <div class="crr-bloco">
      <div class="crr-titulo">Dados de ICMS do CNPJ</div>
      <div v-if="readOnly" class="crr-linha">
        UF {{ cnpj.dados_icms.uf || '—' }} · IE {{ cnpj.dados_icms.inscricao_estadual || '—' }}
        <template v-if="cnpj.dados_icms.regime_especial_icms"> · {{ cnpj.dados_icms.regime_especial_icms }}</template>
      </div>
      <div v-else class="crr-form">
        <q-select v-model="form.uf" dense outlined :options="UFS" label="UF do estabelecimento" class="crr-f-uf" />
        <q-input v-model="form.inscricao_estadual" dense outlined label="Inscrição estadual (ou ISENTO)" class="crr-f-ie" />
        <q-input v-model="form.regime_especial_icms" dense outlined label="Regime especial de ICMS (opcional)" class="crr-f-esp">
          <q-tooltip>Ex.: TTD, substituto tributário. Vazio = regime normal.</q-tooltip>
        </q-input>
        <q-btn unelevated no-caps color="primary" label="Salvar" :loading="salvando === `icms-${cnpj.id}`" @click="$emit('salvar-icms', { ...form })" />
      </div>
      <div v-if="!cnpj.dados_icms.uf" class="crr-aviso">Sem a UF não há como calcular o ICMS das vendas.</div>
    </div>

    <div class="crr-bloco">
      <div class="crr-titulo">Alíquotas usadas na projeção de {{ anoProjecao }}</div>
      <div class="crr-aliquotas">
        <div v-for="a in aliquotas" :key="a.rotulo" class="crr-aliq">
          <div class="crr-aliq-rotulo">{{ a.rotulo }}</div>
          <div class="crr-aliq-valor">{{ a.dado ? formatPct(a.dado.aliquota) : '—' }}</div>
          <SbBadge v-if="a.dado" :variant="varianteStatusAliquota(a.dado.status)">{{ rotuloStatusAliquota(a.dado.status) }}</SbBadge>
          <div v-if="a.extra" class="crr-sub">{{ a.extra }}</div>
          <q-tooltip v-if="a.dado" max-width="360px">
            {{ a.dado.norma }}. Conferido em {{ formatData(a.dado.conferido_em) }}.<template v-if="a.dado.observacao"> {{ a.dado.observacao }}</template>
          </q-tooltip>
        </div>
      </div>
      <div class="crr-sub">
        A CBS de {{ anoProjecao }} é a alíquota de referência calculada pelo TCU menos 0,1 ponto (LC 214/2025, art. 347)
        e será trocada pela do Senado quando a resolução sair. ICMS interestadual, DIFAL e FCP de produto entram por venda.
      </div>
    </div>

    <div class="crr-bloco">
      <div class="crr-titulo">Créditos no custo do produto (quando a compra não tem NF-e no sistema)</div>
      <CampoParametro
        v-for="t in FRACOES"
        :key="t.tipo"
        :titulo="t.titulo"
        tipo="aliquota"
        :valor-atual="cnpj.regime_regular[t.tipo].valor != null ? formatPct(cnpj.regime_regular[t.tipo].valor) : '—'"
        :origem-rotulo="cnpj.regime_regular[t.tipo].valor != null ? rotuloCustoCnpj(cnpj.regime_regular[t.tipo]) : 'Não informado'"
        :origem-variant="cnpj.regime_regular[t.tipo].valor != null ? 'teal' : 'amber'"
        :nota="t.nota"
        :valor-inicial="fracaoParaCampoPct(cnpj.regime_regular[t.tipo].valor)"
        :pode-encerrar="custoDoCnpj(cnpj.regime_regular[t.tipo])"
        rotulo-encerrar="Deixar de valer"
        :read-only="readOnly"
        :salvando="salvando === `${t.tipo}-${cnpj.id}`"
        @salvar="(e) => $emit('salvar-fracao', t.tipo, e)"
        @encerrar="$emit('encerrar-fracao', t.tipo)"
      />
    </div>

    <div class="crr-bloco">
      <div class="crr-titulo">NCM dos produtos</div>
      <div class="crr-linha">
        <template v-if="ncm.produtos_tiny">
          {{ ncm.com_ncm }} de {{ ncm.produtos_tiny }} produtos do Tiny com NCM
          <template v-if="ncm.importados < ncm.produtos_tiny"> · {{ ncm.produtos_tiny - ncm.importados }} ainda não importados</template>
        </template>
        <template v-else>Nenhum produto do Tiny ligado a este CNPJ.</template>
      </div>
      <div class="crr-sub">O NCM e a origem (nacional ou importado) vêm do cadastro do produto no Tiny; decidem o ICMS da venda sem NF-e.</div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

import CampoParametro from 'src/components/financeiro/parametros/CampoParametro.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import {
  UFS, custoDoCnpj, formatData, formatPct, fracaoParaCampoPct, rotuloOrigemCusto, rotuloStatusAliquota,
  varianteStatusAliquota,
} from 'src/utils/parametrosMargem'

const props = defineProps({
  cnpj: { type: Object, required: true },
  readOnly: { type: Boolean, default: false },
  salvando: { type: String, default: '' },
})
defineEmits(['salvar-icms', 'salvar-fracao', 'encerrar-fracao'])

const FRACOES = [
  {
    tipo: 'icms_recuperavel',
    titulo: 'ICMS recuperável médio no custo do produto',
    nota: 'Parte do custo do Tiny que é ICMS creditável. Sem valor, o custo entra sem crédito de ICMS.',
  },
  {
    tipo: 'credito_simples',
    titulo: 'Compras de fornecedor do Simples: crédito de IBS/CBS',
    nota: 'Preencha se compra de fornecedores do Simples: o crédito é só o que ele paga no Simples (LC 214, art. 47, § 9º). Sem valor, vale o crédito do regime regular.',
  },
]

const form = reactive({ uf: '', inscricao_estadual: '', regime_especial_icms: '' })
watch(() => props.cnpj.dados_icms, (d) => Object.assign(form, {
  uf: d?.uf || '', inscricao_estadual: d?.inscricao_estadual || '', regime_especial_icms: d?.regime_especial_icms || '',
}), { immediate: true })

const rr = computed(() => props.cnpj.regime_regular)
const ncm = computed(() => rr.value.ncm || { produtos_tiny: 0, importados: 0, com_ncm: 0 })
const anoProjecao = computed(() => String(rr.value.projecao || '').slice(0, 4))
const aliquotas = computed(() => [
  { rotulo: 'CBS', dado: rr.value.cbs },
  { rotulo: 'IBS', dado: rr.value.ibs },
  {
    rotulo: rr.value.icms_interno ? `ICMS interno ${rr.value.icms_interno.uf}` : 'ICMS interno',
    dado: rr.value.icms_interno,
    extra: rr.value.icms_interno && Number(rr.value.icms_interno.fcp_geral) > 0
      ? `+ FCP geral ${formatPct(rr.value.icms_interno.fcp_geral)}` : (rr.value.icms_interno ? '' : 'Informe a UF'),
  },
])

function rotuloCustoCnpj(v) {
  const base = rotuloOrigemCusto(v?.origem)
  return v?.origem === 'digitada' && !custoDoCnpj(v) ? `${base} (de todos os CNPJs)` : base
}
</script>

<style scoped>
.crr { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
.crr-bloco { border-top: 1px solid #edf2f7; padding-top: 10px; }
.crr-titulo { font-size: 13px; font-weight: 700; color: #2d3748; margin-bottom: 6px; }
.crr-sub { font-size: 12px; color: #718096; margin-top: 4px; }
.crr-linha { font-size: 13px; color: #2d3748; }
.crr-aviso { font-size: 12.5px; color: #975a16; background: #fffaf0; border-radius: 8px; padding: 6px 10px; margin-top: 6px; }
.crr-form { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
.crr-f-uf { width: 170px; }
.crr-f-ie { width: 230px; }
.crr-f-esp { width: 260px; }
.crr-aliquotas { display: flex; gap: 12px; flex-wrap: wrap; }
.crr-aliq { min-width: 150px; padding: 8px 10px; border: 1px solid #edf2f7; border-radius: 8px; cursor: default; }
.crr-aliq-rotulo { font-size: 11px; color: #a0aec0; font-weight: 600; }
.crr-aliq-valor { font-size: 18px; font-weight: 700; color: #1a202c; margin: 2px 0 4px; }
</style>
