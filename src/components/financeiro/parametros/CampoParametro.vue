<template>
  <!-- Uma linha editável da aba "Parâmetros da margem" (MCS-7): valor em vigor, origem e o campo
       para um valor novo. Quem grava é o pai; aqui só se valida o texto digitado. -->
  <div class="cp">
    <div class="cp-info">
      <div class="cp-titulo">{{ titulo }}</div>
      <div class="cp-atual">
        <span class="cp-valor">{{ valorAtual }}</span>
        <SbBadge :variant="origemVariant">{{ origemRotulo }}</SbBadge>
      </div>
      <div v-if="dica" class="cp-dica">{{ dica }}</div>
      <div v-if="nota" class="cp-nota">{{ nota }}</div>
    </div>

    <div v-if="!readOnly" class="cp-form">
      <q-btn-toggle
        v-if="permitirDetalhado"
        v-model="modo"
        dense
        no-caps
        unelevated
        toggle-color="primary"
        color="grey-2"
        text-color="grey-8"
        size="sm"
        :options="[
          { label: 'Valor por pedido', value: 'simples' },
          { label: 'Detalhado (pelas notas e equipe)', value: 'detalhado' },
        ]"
      />
      <div class="cp-linha">
        <q-input
          v-if="modo === 'simples'"
          v-model="texto"
          dense
          outlined
          inputmode="decimal"
          :label="rotuloCampo"
          :suffix="tipo === 'aliquota' ? '%' : undefined"
          :prefix="tipo === 'aliquota' ? undefined : 'R$'"
          :error="!!erro"
          :error-message="erro"
          class="cp-input"
          @keyup.enter="salvar"
        />
        <q-btn unelevated no-caps color="primary" label="Salvar" :loading="salvando" @click="salvar" />
        <q-btn
          v-if="podeEncerrar"
          flat
          no-caps
          dense
          color="grey-8"
          :label="rotuloEncerrar"
          :disable="salvando"
          @click="$emit('encerrar')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

import SbBadge from 'src/components/common/SbBadge.vue'
import { validarPercentual, validarReais } from 'src/utils/parametrosMargem'

const props = defineProps({
  titulo: { type: String, required: true },
  tipo: { type: String, required: true }, // aliquota | producao | embalagem
  valorAtual: { type: String, default: '—' },
  origemRotulo: { type: String, default: '' },
  origemVariant: { type: String, default: 'slate' },
  dica: { type: String, default: '' },
  nota: { type: String, default: '' },
  valorInicial: { type: String, default: '' }, // texto do campo (ex.: "8,5")
  modoInicial: { type: String, default: 'simples' },
  permitirDetalhado: { type: Boolean, default: false },
  podeEncerrar: { type: Boolean, default: false },
  rotuloEncerrar: { type: String, default: 'Deixar de valer' },
  readOnly: { type: Boolean, default: false },
  salvando: { type: Boolean, default: false },
})
const emit = defineEmits(['salvar', 'encerrar'])

const texto = ref(props.valorInicial)
const modo = ref(props.modoInicial === 'detalhado' ? 'detalhado' : 'simples')
const erro = ref('')

// Depois de salvar o pai recarrega; o campo acompanha o valor novo em vigor.
watch(() => props.valorInicial, (v) => { texto.value = v })
watch(() => props.modoInicial, (v) => { modo.value = v === 'detalhado' ? 'detalhado' : 'simples' })

const rotuloCampo = computed(() => (props.tipo === 'aliquota' ? 'Alíquota efetiva' : 'Valor por pedido'))

function salvar() {
  if (modo.value === 'simples') {
    erro.value = (props.tipo === 'aliquota' ? validarPercentual : validarReais)(texto.value) || ''
    if (erro.value) return
  } else {
    erro.value = ''
  }
  emit('salvar', { modo: modo.value, texto: texto.value })
}
</script>

<style scoped>
.cp { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: flex-start; padding: 12px 0; border-top: 1px solid #edf2f7; }
.cp:first-child { border-top: none; }
.cp-info { flex: 1 1 260px; min-width: 0; }
.cp-titulo { font-size: 13px; font-weight: 700; color: #2d3748; }
.cp-atual { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.cp-valor { font-size: 16px; font-weight: 600; color: #1a202c; font-variant-numeric: tabular-nums; }
.cp-dica { font-size: 12px; color: #4a5568; margin-top: 2px; }
.cp-nota { font-size: 11.5px; color: #718096; margin-top: 2px; }
.cp-form { flex: 1 1 320px; display: flex; flex-direction: column; gap: 6px; }
.cp-linha { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.cp-input { width: 180px; }
</style>
