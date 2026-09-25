<template>
  <q-page class="financeiro-page q-pa-lg">
    <div class="financeiro-container">
      <SbPageHeader
        title="Financeiro & Contábil"
        eyebrow="Módulo financeiro"
        subtitle="DRE contábil, Balanço e DFC por CNPJ (e no grupo), com apuração de tributos, termômetros de regime e os extratos bancários"
        icon="account_balance"
      >
        <template #actions>
          <q-btn
            flat
            dense
            color="grey-8"
            icon="refresh"
            label="Atualizar"
            :loading="carregando"
            @click="recarregar"
          />
        </template>
      </SbPageHeader>

      <!-- Navegação por abas na URL: `#/app/financeiro/<aba>` — o link é compartilhável e o
           botão voltar do navegador anda entre as abas, como o plano pede. -->
      <div class="tabs-wrapper q-mb-lg">
        <q-tabs
          :model-value="aba"
          dense
          no-caps
          align="left"
          active-color="teal-8"
          indicator-color="teal-8"
          class="financeiro-tabs"
          @update:model-value="irPara"
        >
          <q-tab
            v-for="item in ABAS_FINANCEIRO"
            :key="item.id"
            :name="item.id"
            :icon="item.icone"
            :label="item.label"
          />
        </q-tabs>
      </div>

      <q-tab-panels :key="versao" :model-value="aba" animated class="bg-transparent">
        <q-tab-panel name="visao-geral" class="q-pa-none">
          <FinanceiroVisaoGeral />
        </q-tab-panel>

        <q-tab-panel name="dre" class="q-pa-none">
          <FinanceiroDre />
        </q-tab-panel>

        <q-tab-panel name="balanco" class="q-pa-none">
          <FinanceiroBalanco />
        </q-tab-panel>

        <q-tab-panel name="dfc" class="q-pa-none">
          <FinanceiroDfc />
        </q-tab-panel>

        <q-tab-panel name="tributos" class="q-pa-none">
          <FinanceiroTributos />
        </q-tab-panel>

        <q-tab-panel name="cenarios" class="q-pa-none">
          <FinanceiroCenarios />
        </q-tab-panel>

        <q-tab-panel name="conciliacao" class="q-pa-none">
          <FinanceiroConciliacao />
        </q-tab-panel>

        <q-tab-panel name="extratos" class="q-pa-none">
          <BancosExtratosPage />
        </q-tab-panel>

        <!-- As abas das ondas seguintes dizem **o que as preenche** (onda do plano e endpoint
             do backend). Nenhum número é inventado para a tela não parecer pronta. -->
        <q-tab-panel
          v-for="item in abasPendentes"
          :key="item.id"
          :name="item.id"
          class="q-pa-none"
        >
          <SbCard>
            <SbEmptyState
              :title="`${item.label} — entra na onda ${item.onda}`"
              :message="`${item.descricao} O backend já entrega em ${item.endpoint}; a tela chega na ${item.onda}.`"
            />
          </SbCard>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script setup>
// Casca do Módulo Financeiro/Contábil (ticket FIN-14, onda 0).
//
// O que esta onda entrega: a **página com abas na URL**, a aba de **extratos bancários** dentro
// do módulo (rota `/app/financeiro/extratos`) e o encaixe para as ondas seguintes. As abas que
// ainda não têm tela mostram a onda e o endpoint que as preenche — nunca dado de mentira.
//
// Por que a aba vem da URL: o plano pede link compartilhável e o botão voltar funcionando; a
// lista de abas é dado puro (`utils/financeiro.js`), então o que é regra fica testável.
//
// A largura dos extratos ainda traz o cabeçalho da própria página: quebrá-la em componentes de
// aba é o `FIN-23`, e fazer isso aqui seria esconder a dívida.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BancosExtratosPage from 'pages/BancosExtratosPage.vue'
import FinanceiroBalanco from 'src/components/financeiro/FinanceiroBalanco.vue'
import FinanceiroCenarios from 'src/components/financeiro/FinanceiroCenarios.vue'
import FinanceiroConciliacao from 'src/components/financeiro/FinanceiroConciliacao.vue'
import FinanceiroDfc from 'src/components/financeiro/FinanceiroDfc.vue'
import FinanceiroDre from 'src/components/financeiro/FinanceiroDre.vue'
import FinanceiroTributos from 'src/components/financeiro/FinanceiroTributos.vue'
import FinanceiroVisaoGeral from 'src/components/financeiro/FinanceiroVisaoGeral.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import { ABAS_FINANCEIRO, ABA_PADRAO, abaValida } from 'src/utils/financeiro'

const route = useRoute()
const router = useRouter()

const carregando = ref(false)
const versao = ref(0)

const aba = computed(() => abaValida(route.params.aba) || ABA_PADRAO)
const abasPendentes = computed(() => ABAS_FINANCEIRO.filter((item) => !item.disponivel))

// Aba desconhecida na URL (link antigo, digitação) não deixa a tela vazia: volta para a padrão.
watch(
  () => route.params.aba,
  (valor) => {
    if (abaValida(valor) === null) {
      router.replace({ name: 'financeiro', params: { aba: ABA_PADRAO } })
    }
  },
  { immediate: true },
)

function irPara(id) {
  const alvo = abaValida(id) || ABA_PADRAO
  if (alvo !== aba.value) {
    router.replace({ name: 'financeiro', params: { aba: alvo } })
  }
}

// O header já mostra o "Atualizar"; aqui ele remonta o painel ativo (as telas carregam no
// `onMounted`, então a chave nova é o jeito simples de refazer a busca sem acoplar serviço).
function recarregar() {
  carregando.value = true
  versao.value += 1
  setTimeout(() => {
    carregando.value = false
  }, 300)
}
</script>

<style lang="scss" scoped>
.financeiro-container {
  max-width: 1400px;
  margin: 0 auto;
}

.financeiro-tabs {
  border-bottom: 1px solid #e2e8f0;
}
</style>
