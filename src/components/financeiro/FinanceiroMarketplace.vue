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
        <q-markup-table flat dense>
          <thead>
            <tr>
              <th class="text-left">Marketplace</th>
              <th class="text-left">Conta</th>
              <th class="text-right">GMV</th>
              <th class="text-right">Taxas</th>
              <th class="text-right">Receita líquida</th>
              <th class="text-right">CMV</th>
              <th class="text-right">MC antes do Ads</th>
              <th class="text-right">Ads</th>
              <th class="text-right">MC após Ads</th>
              <th class="text-right">MC % (s/ líquida)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(linha, i) in linhas" :key="`${linha.marketplace}-${linha.conta}-${i}`">
              <td>{{ ROTULOS_MARKETPLACE[linha.marketplace] || linha.marketplace }}</td>
              <td>{{ linha.conta }}</td>
              <td class="text-right">{{ formatarMoeda(linha.gmv) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.taxas) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.liquida) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.cmv) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.mcAntes) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.ads) }}</td>
              <td class="text-right">{{ formatarMoeda(linha.mcDepois) }}</td>
              <td class="text-right">{{ linha.mcPct != null ? `${linha.mcPct}%` : '—' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="text-weight-bold">
              <td colspan="2">Total</td>
              <td class="text-right">{{ formatarMoeda(totais.gmv) }}</td>
              <td class="text-right">{{ formatarMoeda(totais.taxas) }}</td>
              <td class="text-right">{{ formatarMoeda(totais.liquida) }}</td>
              <td class="text-right">{{ formatarMoeda(totais.cmv) }}</td>
              <td class="text-right">{{ formatarMoeda(totais.mcAntes) }}</td>
              <td class="text-right">{{ formatarMoeda(totais.ads) }}</td>
              <td class="text-right">{{ formatarMoeda(totais.mcDepois) }}</td>
              <td class="text-right">{{ totais.mcPct != null ? `${totais.mcPct}%` : '—' }}</td>
            </tr>
          </tfoot>
        </q-markup-table>

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
