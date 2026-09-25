<template>
  <div>
    <div class="sb-eyebrow">{{ titulo }}</div>
    <SbTabela
      :colunas="COLUNAS"
      :linhas="linhas"
      chave-linha="codigo"
      rotulo="Contas que compõem o número"
      :vazio="{
        titulo: 'Sem contas para esta linha',
        mensagem: 'O backend não devolveu o recorte de contas aqui.',
      }"
    >
      <template #celula-codigo="{ valor }">
        <span class="font-mono">{{ valor }}</span>
      </template>
      <template #celula-nome="{ valor }">{{ valor || '—' }}</template>
      <template #celula-valor="{ valor }">{{ formatarMoeda(valor) }}</template>
    </SbTabela>
  </div>
</template>

<script setup>
// As contas que compõem um número — o conteúdo do painel de detalhe (ticket FINT-7).
//
// Ele existe porque DRE e Balanço mostram a mesma coisa de formas diferentes no payload: a conta do
// DRE usa `conta`/`valor`, a do Balanço usa `nome`/`saldo`. Normalizar aqui evita duas telas
// divergindo na leitura da mesma origem.
import { computed } from 'vue'

import SbTabela from 'src/components/common/SbTabela.vue'
import { formatarMoeda } from 'src/utils/contabil'

const props = defineProps({
  contas: { type: Array, default: () => [] },
  titulo: { type: String, default: 'Origem do número' },
})

const COLUNAS = [
  { chave: 'codigo', rotulo: 'Conta', largura: '110px' },
  { chave: 'nome', rotulo: 'Nome' },
  { chave: 'valor', rotulo: 'Contribuição (R$)', tipo: 'moeda', alinhamento: 'right' },
]

const linhas = computed(() =>
  (props.contas || []).map((conta) => ({
    codigo: conta?.codigo ?? '—',
    nome: conta?.nome ?? conta?.conta ?? '',
    valor: conta?.valor ?? conta?.saldo ?? null,
  })),
)
</script>
