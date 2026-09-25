<template>
  <SbCard class="q-mb-md" title="Recorte" eyebrow="Empresa e competência">
    <div class="row q-col-gutter-md items-end">
      <div class="col-12 col-md-4">
        <SbSeletorEmpresa
          :model-value="empresa"
          :options="opcoes"
          label="Empresa"
          clearable
          @update:model-value="(valor) => emitirEmpresa(valor)"
        />
      </div>
      <div class="col-12 col-md-6">
        <SbSeletorPeriodo
          :model-value="periodo"
          @update:model-value="(valor) => emitirPeriodo(valor)"
        />
      </div>
      <div class="col-12 col-md-2">
        <q-btn
          unelevated
          color="teal-8"
          text-color="white"
          icon="refresh"
          label="Atualizar"
          :loading="carregando"
          class="full-width"
          @click="emit('carregar')"
        />
      </div>
    </div>
    <div v-if="aviso" class="text-caption text-grey-7 q-mt-sm">{{ aviso }}</div>
    <slot />
  </SbCard>
</template>

<script setup>
// Barra de recorte compartilhada pelas abas do módulo (ticket FIN-14).
//
// Ela existe porque as abas leem o **mesmo recorte** (empresa + competência) em endpoints diferentes;
// sem isto cada aba repetiria a busca da lista de CNPJs e o par de seletores. O componente é burro de
// propósito: o estado é do pai (que dispara a busca), aqui só há a lista de empresas.
import { onMounted, ref } from 'vue'

import SbCard from 'src/components/common/SbCard.vue'
import SbSeletorEmpresa from 'src/components/common/SbSeletorEmpresa.vue'
import SbSeletorPeriodo from 'src/components/common/SbSeletorPeriodo.vue'
import FiscalService from 'src/services/FiscalService'
import { opcoesDeEmpresa } from 'src/utils/seletores'

const props = defineProps({
  empresa: { type: [String, Number], default: null },
  periodo: { type: Object, default: () => ({ de: '', ate: '' }) },
  carregando: { type: Boolean, default: false },
  /** Texto de apoio abaixo do recorte (ex.: aviso de soma do grupo). */
  aviso: { type: String, default: '' },
})
const emit = defineEmits(['update:empresa', 'update:periodo', 'carregar'])

const opcoes = ref([])

function emitirEmpresa(valor) {
  emit('update:empresa', valor ?? null)
  emit('carregar')
}

function emitirPeriodo(valor) {
  emit('update:periodo', valor || { de: '', ate: '' })
  emit('carregar')
}

onMounted(async () => {
  try {
    const resposta = await FiscalService.getCnpjs()
    const lista = resposta.data?.results || resposta.data || []
    opcoes.value = opcoesDeEmpresa(lista, {
      valor: 'cnpj',
      incluirTodos: true,
      rotuloTodos: 'Todas as empresas (grupo)',
    })
  } catch (e) {
    console.error('Não foi possível carregar os CNPJs:', e)
  }
})
</script>
