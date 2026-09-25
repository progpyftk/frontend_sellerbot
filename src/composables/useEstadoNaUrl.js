// O estado da aba na URL (ticket FINT-11).
//
// UM dono só para a escrita: o composable lê a URL uma vez, no `setup`, e escreve de volta num
// **único** `watch`. Dois watches escrevendo na mesma query se atropelam — o segundo lê a `route.query`
// antes de o `router.replace` do primeiro resolver e apaga o que o outro acabou de gravar.

import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { aplicarPatch, lerEstado } from 'src/utils/urlDoRecorte'

export function useEstadoNaUrl() {
  const route = useRoute()
  const router = useRouter()
  const inicial = lerEstado(route.query)

  // O recorte nasce da URL — é o que faz o `F5` voltar na mesma visão.
  const empresa = ref(inicial.empresa)
  const periodo = ref({ de: inicial.de, ate: inicial.ate })
  const ordenacao = ref({ chave: inicial.ordenar, direcao: inicial.dir })
  const busca = ref(inicial.busca)

  watch(
    [empresa, periodo, ordenacao, busca],
    () => {
      router.replace({
        query: aplicarPatch(route.query, {
          empresa: empresa.value,
          de: periodo.value?.de,
          ate: periodo.value?.ate,
          ordenar: ordenacao.value?.chave,
          dir: ordenacao.value?.direcao,
          busca: busca.value,
        }),
      })
    },
    { deep: true },
  )

  return { empresa, periodo, ordenacao, busca }
}
