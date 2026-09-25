<template>
  <div>
    <SbCard class="q-mb-md">
      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-select
            v-model="importacao.conta"
            :options="contaOptions"
            emit-value
            map-options
            dense
            outlined
            label="Conta bancária"
            bg-color="white"
            @update:model-value="emit('conta-change')"
          />
        </div>
        <div class="col-6 col-md-3">
          <q-select
            v-model="importacao.formato"
            :options="formatosImportacao"
            dense
            outlined
            label="Formato"
            bg-color="white"
            :disable="formatosImportacao.length === 0"
          />
        </div>
        <div class="col-12 col-md-5">
          <q-file
            v-model="importacao.arquivo"
            dense
            outlined
            clearable
            bg-color="white"
            :accept="acceptImportacao"
            :label="`Arquivo (${formatosImportacao.join(' / ') || 'OFX / CSV'})`"
          >
            <template #prepend><q-icon name="attach_file" /></template>
          </q-file>
        </div>
      </div>

      <div class="row justify-end q-mt-md">
        <q-btn
          unelevated
          no-caps
          color="teal-8"
          text-color="white"
          icon="cloud_upload"
          label="Importar arquivo"
          :loading="importando"
          :disable="!importacao.conta || !importacao.arquivo || !importacao.formato"
          @click="emit('importar')"
        />
      </div>

      <div v-if="formatosImportacao.length === 0" class="text-caption text-grey-6 q-mt-sm">
        O banco desta conexão não informou formatos de arquivo aceitos pela API.
      </div>
    </SbCard>

    <q-banner
      v-if="resultadoImportacao"
      dense
      rounded
      class="q-mb-md"
      :class="resultadoImportacao.ok ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'"
    >
      <template #avatar>
        <q-icon :name="resultadoImportacao.ok ? 'check_circle' : 'error_outline'" />
      </template>
      {{ resultadoImportacao.mensagem }}
      <span v-if="resultadoImportacao.ok">
        — {{ resultadoImportacao.importadas }} importada(s), {{ resultadoImportacao.duplicadas }} duplicada(s)
        <span v-if="resultadoImportacao.periodo"> · {{ resultadoImportacao.periodo }}</span>
      </span>
    </q-banner>

    <SbCard v-if="resultadoImportacao?.ok">
      <div class="row items-center justify-between">
        <div class="text-subtitle2 text-weight-bold text-grey-9">
          Extrato da conta após a importação
        </div>
        <q-btn
          flat
          dense
          no-caps
          color="teal-8"
          icon="table_view"
          label="Abrir aba Extrato"
          @click="emit('abrir-extrato')"
        />
      </div>
    </SbCard>
  </div>
</template>

<script setup>
// Aba "Importar arquivo" do módulo de bancos/extratos (ticket FIN-23).
//
// O componente é **apresentação**: o estado (`importacao`, `importando`, `resultadoImportacao`) e as
// ações (importar, abrir o extrato) continuam no `BancosExtratosPage`, que é o dono do fluxo. O
// `v-model` escreve nas propriedades do objeto recebido — mutação de propriedade aninhada de prop, não
// de prop — e o `conta-change` avisa o pai para redefinir formato/arquivo.
import SbCard from 'src/components/common/SbCard.vue'

defineProps({
  importacao: { type: Object, required: true },
  contaOptions: { type: Array, default: () => [] },
  formatosImportacao: { type: Array, default: () => [] },
  acceptImportacao: { type: String, default: '' },
  importando: { type: Boolean, default: false },
  resultadoImportacao: { type: Object, default: null },
})
const emit = defineEmits(['conta-change', 'importar', 'abrir-extrato'])
</script>
