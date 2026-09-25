<template>
  <div>
    <SbInfoCallout
      titulo="Conferência de marketplace — não é o DRE oficial"
      icon="info"
      variant="info"
      :detalhe="true"
    >
      Esta aba traz o número **de marketplace** (GMV, taxas, líquida, CMV, Ads e a margem por canal),
      como a antiga DRE-Aproximada do dashboard. Ela **não** tem os impostos (DAS/IRPJ/CSLL) nem a
      cascata contábil: isso é o <strong>DRE oficial</strong>, que lê o livro nas abas
      <em>Visão geral</em> e <em>DRE</em>.
      <template #detalhe>
        <p class="q-mb-sm">
          Correção do FIN-20 que vale aqui: a margem percentual divide a margem pela
          <strong>receita líquida</strong> (o que o marketplace libera), e não pelo GMV.
        </p>
        <p class="q-mb-none">
          Campo ausente na origem aparece como <strong>—</strong>; a tela não soma zero para parecer
          completa.
        </p>
      </template>
    </SbInfoCallout>

    <SbCard class="q-mb-md" title="Recorte" eyebrow="Competência">
      <div class="row q-col-gutter-md items-end">
        <div class="col-12 col-md-8">
          <SbSeletorPeriodo v-model="periodo" @update:model-value="carregar" />
        </div>
        <div class="col-12 col-md-4">
          <q-btn
            unelevated
            color="teal-8"
            text-color="white"
            icon="refresh"
            label="Atualizar"
            :loading="loading"
            class="full-width"
            @click="carregar"
          />
        </div>
      </div>
    </SbCard>

    <SbEmptyState v-if="loading" variant="loading" title="Carregando a conferência…" />
    <template v-else-if="linhas.length">
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="canal in porCanal" :key="canal.marketplace" class="col-12 col-sm-6 col-md-4">
          <SbKpiCard
            :label="ROTULOS_MARKETPLACE[canal.marketplace] || canal.marketplace"
            :value="formatarMoeda(canal.mcDepois)"
            :sub="canal.mcPct != null ? `MC ${canal.mcPct}% da receita líquida` : 'sem base para o %'"
            variant="teal"
          />
        </div>
        <div class="col-12 col-sm-6 col-md-4">
          <SbKpiCard
            label="Total do recorte"
            :value="formatarMoeda(totais.mcDepois)"
            :sub="totais.mcPct != null ? `MC ${totais.mcPct}% da receita líquida` : 'sem base para o %'"
            variant="green"
          />
        </div>
      </div>

      <SbCard title="Por canal e conta" eyebrow="Conferência de marketplace">
        <SbTabela
          v-model:ordenacao="ordenacao"
          :colunas="COLUNAS"
          :linhas="linhas"
          :chave-linha="chaveDaLinha"
          rotulo="Conferência de marketplace por canal e conta"
          :vazio="{
            titulo: 'Sem linha para este recorte',
            mensagem: 'Escolha outra competência ou confira a sincronização das contas.',
          }"
        >
          <template #celula-marketplace="{ linha }">
            {{ ROTULOS_MARKETPLACE[linha.marketplace] || linha.marketplace }}
          </template>
          <template #celula-gmv="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-taxas="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-liquida="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-cmv="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-mcAntes="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-ads="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-mcDepois="{ valor }">{{ formatarMoeda(valor) }}</template>
          <template #celula-mcPct="{ linha }">
            {{ linha.mcPct != null ? `${linha.mcPct}%` : '—' }}
          </template>

          <!-- Rodapé de totais: o mesmo número do cartão "Total do recorte", linha a linha. -->
          <template #rodape>
            <tr>
              <td colspan="2">Total</td>
              <td class="is-right">{{ formatarMoeda(totais.gmv) }}</td>
              <td class="is-right">{{ formatarMoeda(totais.taxas) }}</td>
              <td class="is-right">{{ formatarMoeda(totais.liquida) }}</td>
              <td class="is-right">{{ formatarMoeda(totais.cmv) }}</td>
              <td class="is-right">{{ formatarMoeda(totais.mcAntes) }}</td>
              <td class="is-right">{{ formatarMoeda(totais.ads) }}</td>
              <td class="is-right">{{ formatarMoeda(totais.mcDepois) }}</td>
              <td class="is-right">{{ totais.mcPct != null ? `${totais.mcPct}%` : '—' }}</td>
            </tr>
          </template>
        </SbTabela>

        <ul v-if="avisos.length" class="text-caption text-grey-7 q-mt-sm">
          <li v-for="(aviso, i) in avisos" :key="i">{{ aviso }}</li>
        </ul>
      </SbCard>
    </template>
    <SbEmptyState
      v-else
      title="Sem dado de marketplace neste recorte"
      message="Escolha outra competência ou verifique se há pedidos sincronizados nas contas."
    />
  </div>
</template>

<script setup>
// Aba "Marketplace" do módulo (ticket FIN-24): absorve a DRE-Aproximada do dashboard.
//
// Lê os **mesmos endpoints** do dashboard (`operation` do ML e `dashboard_stats` da Shopee/TikTok), então
// o número bate com a tela antiga — a diferença é a leitura: margem sobre a **receita líquida** (FIN-20),
// o aviso de que **não é o DRE oficial** (impostos e cascata contábil ficam nas abas que leem o livro) e
// campo ausente mostrado como `—`.
//
// A antiga aba do dashboard só sai depois, no `FIN-19` — este ticket absorve o conteúdo, não remove a
// origem.
import { computed, onMounted, ref } from 'vue'

import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbInfoCallout from 'src/components/common/SbInfoCallout.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbSeletorPeriodo from 'src/components/common/SbSeletorPeriodo.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import MercadoLivreService from 'src/services/MercadoLivreService'
import ShopeeService from 'src/services/ShopeeService'
import TikTokShopService from 'src/services/TikTokShopService'
import { formatarMoeda } from 'src/utils/contabil'
import {
  ROTULOS_MARKETPLACE,
  linhasDaConferencia,
  periodoParaDatas,
  totaisDaConferencia,
  totaisPorMarketplace,
} from 'src/utils/marketplaceConferencia'

const hoje = new Date()
const competenciaAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

const periodo = ref({ de: competenciaAtual, ate: competenciaAtual })
const linhas = ref([])
const avisos = ref([])
const loading = ref(false)

// Ordenação local; o `FINT-11` leva recorte e ordem para a URL.
const ordenacao = ref({ chave: '', direcao: '' })

// A conferência tem duas chaves de texto (marketplace/conta) e oito valores — a coluna `tipo` decide
// a comparação, então GMV ordena como número e não como texto.
const COLUNAS = [
  { chave: 'marketplace', rotulo: 'Marketplace', tipo: 'texto', ordenavel: true, largura: '132px' },
  { chave: 'conta', rotulo: 'Conta', tipo: 'texto', ordenavel: true, largura: '160px' },
  { chave: 'gmv', rotulo: 'GMV', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'taxas', rotulo: 'Taxas', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'liquida', rotulo: 'Receita líquida', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'cmv', rotulo: 'CMV', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'mcAntes', rotulo: 'MC antes do Ads', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'ads', rotulo: 'Ads', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'mcDepois', rotulo: 'MC após Ads', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'mcPct', rotulo: 'MC % (s/ líquida)', tipo: 'numero', alinhamento: 'right', ordenavel: true, largura: '142px' },
]

// O par marketplace+conta pode repetir entre recortes; o índice garante a chave estável.
const chaveDaLinha = (linha, indice) => `${linha.marketplace}|${linha.conta}|${indice}`

const porCanal = computed(() => totaisPorMarketplace(linhas.value))
const totais = computed(() => totaisDaConferencia(linhas.value))

async function buscar(nome, chamada) {
  try {
    const resposta = await chamada()
    return resposta?.data ?? null
  } catch (e) {
    // Um canal fora do ar não derruba os outros; o aviso diz qual e por quê.
    avisos.value.push(`${ROTULOS_MARKETPLACE[nome] || nome} indisponível: não foi possível carregar o painel.`)
    return null
  }
}

async function carregar() {
  loading.value = true
  avisos.value = []
  try {
    const { date_from, date_to } = periodoParaDatas(periodo.value)
    const params = { date_from, date_to }
    const [ml, shopee, tiktok] = await Promise.all([
      buscar('ml', () => MercadoLivreService.getDashboardOperation(params)),
      buscar('shopee', () => ShopeeService.getDashboardStats(params)),
      buscar('tiktokshop', () => TikTokShopService.getDashboardStats(params)),
    ])
    linhas.value = linhasDaConferencia({ ml, shopee, tiktok })
  } finally {
    loading.value = false
  }
}

onMounted(carregar)
</script>
