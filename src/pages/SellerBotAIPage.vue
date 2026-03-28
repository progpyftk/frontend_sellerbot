<template>
  <q-page class="sellerbot-ai-page">
    <!-- Header -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <q-icon name="psychology" size="20px" />
        </div>
        <div>
          <div class="header-eyebrow">Inteligência Artificial</div>
          <div class="header-title">SellerBot AI</div>
        </div>
      </div>
      <div class="header-right">
        <!-- Model Selector -->
        <q-btn-dropdown
          flat
          dense
          no-caps
          :label="selectedModelName"
          icon="smart_toy"
          color="teal-7"
          class="model-selector-btn"
        >
          <q-list style="min-width: 360px">
            <q-item-label header class="text-weight-bold">Selecionar Modelo</q-item-label>
            <q-item
              v-for="model in MODELS"
              :key="model.id"
              clickable
              v-close-popup
              @click="selectModel(model)"
              :active="selectedModel === model.id"
              active-class="model-active"
            >
              <q-item-section avatar>
                <q-avatar size="32px" :color="model.recommended ? 'teal-1' : 'grey-2'" text-color="grey-8" icon="smart_toy" />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  {{ model.name }}
                  <q-badge v-if="model.recommended" color="teal-7" label="Recomendado" class="q-ml-xs" />
                </q-item-label>
                <q-item-label caption>{{ model.note }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="model-cost">
                  <span class="cost-label">Input</span>
                  <span class="cost-value">${{ model.cost_input }}/1M</span>
                  <div class="quality-stars">
                    <q-icon
                      v-for="i in 5"
                      :key="i"
                      name="star"
                      size="10px"
                      :color="i <= model.quality ? 'amber-6' : 'grey-4'"
                    />
                  </div>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-chip :color="isOnline ? 'positive' : 'negative'" text-color="white" icon="wifi" size="sm">
          {{ isOnline ? 'Online' : 'Offline' }}
        </q-chip>
      </div>
    </div>

    <!-- Chat Container -->
    <div class="chat-container">
      <!-- Messages -->
      <div class="messages-area" ref="messagesArea">
        <div v-if="messages.length === 0" class="empty-chat">
          <div class="empty-icon">
            <q-icon name="psychology" size="48px" color="grey-5" />
          </div>
          <div class="empty-title">F5 SellerBot</div>
          <div class="empty-subtitle">
            Seu analista de e-commerce com IA. Faça perguntas complexas sobre<br />
            vendas, anúncios, concorrência, finanças e campanhas de ads.
          </div>
          <div class="suggestion-groups">
            <div
              v-for="group in suggestionGroups"
              :key="group.label"
              class="suggestion-group"
            >
              <div class="suggestion-group-label">
                <q-icon :name="group.icon" size="13px" />
                {{ group.label }}
              </div>
              <div class="suggestion-chips">
                <button
                  v-for="s in group.items"
                  :key="s.short"
                  class="suggestion-chip"
                  @click="sendSuggestion(s.full)"
                >
                  {{ s.short }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else>
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.role === 'user' ? 'message--user' : 'message--assistant']"
          >
            <div class="message-avatar">
              <q-icon
                :name="msg.role === 'user' ? 'person' : 'smart_toy'"
                :color="msg.role === 'user' ? 'teal-7' : 'amber-7'"
              />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-name">{{ msg.role === 'user' ? 'Você' : 'F5 SellerBot' }}</span>
                <span class="message-time">{{ msg.time }}</span>
                <q-badge v-if="msg.agent" outline color="grey-6" :label="msg.agent" class="q-ml-xs" />
              </div>

              <!-- Live log panel (durante processamento) -->
              <div v-if="msg.logs && msg.logs.length > 0" class="live-log-panel">
                <div
                  v-for="(log, li) in msg.logs"
                  :key="li"
                  :class="['log-entry', `log-${log.type}`]"
                >
                  <q-icon :name="logIcon(log.type)" size="12px" />
                  <span>{{ log.text }}</span>
                </div>
              </div>

              <!-- Conteúdo da mensagem (texto + tabelas + gráficos) -->
              <template v-if="msg.content">
                <template v-for="(block, bi) in parseBlocks(msg.content)" :key="bi">
                  <div v-if="block.type === 'text'" class="message-text" v-html="formatText(block.content)" />
                  <ChatTable
                    v-else-if="block.type === 'table'"
                    :headers="block.headers"
                    :rows="block.rows"
                  />
                  <ChatChart v-else-if="block.type === 'chart'" :chart-data="block.data" />
                </template>
              </template>

              <!-- Loading -->
              <div v-if="msg.loading" class="message-loading">
                <q-spinner-dots color="teal-7" size="20px" />
                <span>{{ msg.loadingText || 'Processando...' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-container">
          <q-input
            v-model="inputMessage"
            placeholder="Digite sua mensagem..."
            outlined
            dense
            autogrow
            :disable="isLoading"
            @keydown.enter.exact.prevent="sendMessage"
            class="input-field"
          >
            <template v-slot:prepend>
              <q-icon name="chat" color="grey-6" />
            </template>
          </q-input>
          <q-btn
            round
            color="teal-7"
            icon="send"
            :loading="isLoading"
            :disable="!inputMessage.trim() || isLoading"
            @click="sendMessage"
            class="send-btn"
          />
        </div>
        <div class="input-footer">
          <div class="input-hint">
            <q-icon name="info" size="12px" />
            <span>Enter para enviar · Ctrl+Enter para nova linha</span>
          </div>
          <div class="active-model-chip">
            <q-icon name="smart_toy" size="12px" />
            <span>{{ selectedModelName }}</span>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import { useStore } from 'src/stores/store'
import { api } from 'src/boot/axios'
import { getAccessToken } from 'src/services/tokenService'
import ChatChart from 'src/components/ChatChart.vue'
import ChatTable from 'src/components/ChatTable.vue'

const $q = useQuasar()
const store = useStore()
const API_BASE = api.defaults.baseURL || 'http://localhost:8000'

// ===========================================================================
// Modelos disponíveis (espelho do models_catalog.py)
// ===========================================================================
const MODELS = [
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    cost_input: 0.27,
    cost_output: 1.10,
    quality: 4,
    speed: 4,
    recommended: true,
    note: 'Recomendado. Ótimo custo-benefício, excelente tool calling e bom português.',
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    cost_input: 0.55,
    cost_output: 2.19,
    quality: 5,
    speed: 3,
    recommended: false,
    note: 'Modelo de raciocínio. Excelente para análises complexas.',
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    cost_input: 0.80,
    cost_output: 4.00,
    quality: 5,
    speed: 5,
    recommended: false,
    note: 'Top em tool calling. Rápido e muito preciso.',
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    cost_input: 3.00,
    cost_output: 15.00,
    quality: 5,
    speed: 4,
    recommended: false,
    note: 'Modelo mais poderoso da Anthropic. Para análises complexas.',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    cost_input: 0.10,
    cost_output: 0.40,
    quality: 4,
    speed: 5,
    recommended: false,
    note: 'Muito rápido e barato. Bom para uso intensivo.',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    cost_input: 0.12,
    cost_output: 0.30,
    quality: 3,
    speed: 4,
    recommended: false,
    note: 'Open source. Mais barato da lista.',
  },
]

// ===========================================================================
// State
// ===========================================================================
const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const isOnline = ref(false)
const messagesArea = ref(null)
const VALID_MODEL_IDS = new Set(MODELS.map(m => m.id))
const _savedModel = localStorage.getItem('sellerbot_model')
const selectedModel = ref(VALID_MODEL_IDS.has(_savedModel) ? _savedModel : 'deepseek/deepseek-chat')

const selectedModelName = computed(() => {
  const m = MODELS.find(m => m.id === selectedModel.value)
  return m ? m.name : selectedModel.value.split('/').pop()
})

const suggestionGroups = [
  {
    label: 'Vendas & Performance',
    icon: 'trending_up',
    items: [
      {
        short: 'Compare esta semana com a anterior em GMV, pedidos, lucro e custo de ads — aponte o que mais mudou e por quê',
        full: 'Compare minha semana atual com a semana passada: GMV, pedidos, lucro bruto e custo de ads. Mostre a variação percentual de cada KPI, destaque o que mais subiu e o que mais caiu, e me diga o que devo monitorar.',
      },
      {
        short: 'Mostre a evolução diária dos últimos 30 dias com gráfico, e identifique dias com queda ou pico fora do padrão',
        full: 'Mostre a evolução do meu GMV, margem e pedidos nos últimos 30 dias com gráfico de linha. Identifique se há tendência de alta ou queda, aponte os dias com anomalias e me explique possíveis causas.',
      },
      {
        short: 'Qual dia da semana vendo mais? Analise o padrão dos últimos 90 dias para saber quando concentrar esforço e ads',
        full: 'Analise meu padrão de vendas por dia da semana nos últimos 90 dias: qual dia tem mais pedidos, maior GMV e maior ticket médio? Qual semana do mês é mais forte? Use isso para me recomendar quando colocar promoção e aumentar o budget de ads.',
      },
      {
        short: 'Faça o waterfall completo do meu faturamento: GMV → fees → frete → ads → lucro, com percentual de cada dedução',
        full: 'Faça um waterfall completo do meu faturamento dos últimos 30 dias: GMV → fees ML → frete → custo de ads → lucro bruto. Mostre o percentual que cada dedução representa sobre o GMV e gere o gráfico de breakdown.',
      },
    ],
  },
  {
    label: 'Anúncios & Concorrência',
    icon: 'storefront',
    items: [
      {
        short: 'Pegue meu produto mais vendido e analise os concorrentes: preço, Full, frete grátis e onde estou posicionado',
        full: 'Identifique meu produto mais vendido nos últimos 30 dias e faça uma análise completa dos concorrentes no Mercado Livre: faixa de preço, quantos são Full, quantos têm frete grátis, descrição e atributos dos líderes, e onde meu preço se posiciona no ranking.',
      },
      {
        short: 'Faça um diagnóstico completo dos meus anúncios: quais têm problema agora — estoque crítico, qualidade baixa ou sem visitas',
        full: 'Faça um diagnóstico completo de saúde dos meus anúncios: quais estão com estoque crítico, quais têm qualidade baixa, quais estão pausados, quais ficaram sem visitas nos últimos 7 dias. Me dê uma lista de ações prioritárias.',
      },
      {
        short: 'Compare ROAS, conversão e GMV dos meus anúncios Full vs não-Full — vale migrar mais produtos para o Full?',
        full: 'Compare a performance dos meus anúncios Full vs não-Full nos últimos 30 dias: ROAS de ads, ACOS, taxa de conversão, GMV médio e visitas por anúncio. Com base nos dados, vale a pena migrar mais produtos para o Mercado Envios Full?',
      },
      {
        short: 'Liste os anúncios com mais de 100 visitas mas conversão abaixo de 1% — o que pode estar travando as vendas?',
        full: 'Quais meus anúncios têm mais de 100 visitas mas taxa de conversão abaixo de 1% nos últimos 30 dias? Liste-os com visitas, pedidos e conversão. Analise possíveis causas: preço, concorrência, fotos, frete, promoção.',
      },
      {
        short: 'Algum anúncio sofreu queda brusca de visitas ou conversão nos últimos 3 dias? Detecte anomalias e aponte as causas',
        full: 'Detecte anomalias nos meus anúncios: algum sofreu queda brusca de visitas, conversão ou GMV nos últimos 3 dias comparado ao baseline das duas semanas anteriores? Liste os casos mais graves e me ajude a entender o que pode ter causado.',
      },
    ],
  },
  {
    label: 'Estoque & Riscos',
    icon: 'inventory_2',
    items: [
      {
        short: 'Quais produtos vão zerar o estoque esta semana ou nos próximos 14 dias? Calcule a cobertura com base nas vendas recentes',
        full: 'Calcule a cobertura de estoque em dias para todos os meus anúncios ativos, com base na velocidade de venda dos últimos 30 dias. Quais produtos vão zerar nos próximos 7 dias? Nos próximos 14 dias? Ordene por urgência e me diga o que repor primeiro.',
      },
      {
        short: 'Quais anúncios estão ativos mas com estoque zerado ou abaixo de 5 unidades — estou perdendo vendas agora?',
        full: 'Verifique quais anúncios estão "ativos" no Mercado Livre mas com estoque zerado ou abaixo de 5 unidades. Para cada um, mostre o volume de vendas recente para estimar quanto de GMV estou deixando de faturar.',
      },
      {
        short: 'Faça um diagnóstico completo: estoque crítico, qualidade baixa, pausados e sem visitas — me dê a lista de prioridades',
        full: 'Faça um diagnóstico completo de saúde dos meus anúncios agora: estoque zerado ou crítico, anúncios com performance_score baixo, anúncios pausados e anúncios sem visitas nos últimos 7 dias. Consolide tudo em uma lista de ações prioritárias.',
      },
    ],
  },
  {
    label: 'Financeiro & Margem',
    icon: 'account_balance',
    items: [
      {
        short: 'Qual minha margem de lucro real do mês, já descontando fees, frete, ads e CMV? Onde estou perdendo mais margem?',
        full: 'Calcule minha margem de lucro bruto real do último mês descontando fees ML, frete, custo de ads e CMV. Qual produto tem a melhor margem? Qual tem a pior? Onde estou perdendo mais margem e o que posso fazer? Mostre o gráfico de tendência de margem.',
      },
      {
        short: 'Com base nos últimos 7 dias, projeto meu GMV do mês — vou bater o mês passado ou estou abaixo do pace?',
        full: 'Com base no meu GMV dos últimos 7 dias, calcule a projeção de faturamento para o mês completo. Estou no pace para bater o mês anterior? Quais foram os melhores e piores dias e o que explica a diferença?',
      },
      {
        short: 'Quais são meus 10 produtos com maior lucro estimado? Mostre margem, faturamento e quantidade vendida com gráfico',
        full: 'Quais são meus 10 produtos com maior lucro estimado nos últimos 30 dias? Mostre para cada um: faturamento, margem aproximada e quantidade vendida. Gere o gráfico de barras horizontais e me diga em quais devo concentrar esforço.',
      },
    ],
  },
  {
    label: 'Ads & Campanhas',
    icon: 'campaign',
    items: [
      {
        short: 'Analise meu ROAS e ACOS dos últimos 30 dias — quais produtos estão com retorno abaixo do ideal e devo pausar?',
        full: 'Analise a eficiência dos meus ads nos últimos 30 dias: ROAS total, ACOS médio, custo de ads vs receita atribuída. Quais produtos têm ROAS abaixo de 5x? Alguma campanha está consumindo budget sem retorno? Me dê uma recomendação de o que pausar ou ajustar.',
      },
      {
        short: 'Anúncios Full têm ROAS melhor que não-Full? Mostre os números e me diga se vale investir mais em ads no Full',
        full: 'Compare o ROAS médio dos meus anúncios Full com os não-Full no último mês. Anúncios Full realmente convertem melhor com ads? O custo por pedido é menor no Full? Mostre os dados e me dê uma recomendação de alocação de budget.',
      },
      {
        short: 'Qual o melhor dia da semana para aumentar o budget de ads? Cruze o padrão de vendas com os dados de ROAS por período',
        full: 'Analise meu padrão de vendas por dia da semana nos últimos 90 dias e cruce com os dados de ROAS dos meus ads. Em quais dias o retorno de ads é melhor? Quando devo aumentar o budget para maximizar o ROAS?',
      },
    ],
  },
  {
    label: 'Operações',
    icon: 'local_shipping',
    items: [
      {
        short: 'Quais pedidos estão pendentes agora? Algum corre risco de atraso e pode afetar minha reputação no ML?',
        full: 'Quais pedidos estão pendentes de envio agora? Algum está próximo do prazo limite e corre risco de atraso? Mostre o resumo operacional de hoje e me alerte sobre qualquer situação que possa impactar minha reputação.',
      },
      {
        short: 'Qual foi minha taxa de cancelamento no mês? Quais produtos cancelam mais e isso afeta minha reputação?',
        full: 'Qual foi minha taxa de cancelamento no último mês? Quais produtos tiveram mais cancelamentos? Isso está impactando minha reputação no Mercado Livre? Me dê recomendações para reduzir cancelamentos.',
      },
    ],
  },
]

// ===========================================================================
// Model selection
// ===========================================================================
const selectModel = (model) => {
  selectedModel.value = model.id
  localStorage.setItem('sellerbot_model', model.id)
  $q.notify({
    message: `Modelo trocado para ${model.name}`,
    color: 'teal-7',
    position: 'top-right',
    timeout: 2000,
  })
}

// ===========================================================================
// Log helpers
// ===========================================================================
const logIcon = (type) => {
  const icons = {
    thinking: 'psychology',
    tool_call: 'build',
    tool_result: 'check_circle',
    error: 'error',
    done: 'check_circle',
  }
  return icons[type] || 'info'
}

// ===========================================================================
// Health check
// ===========================================================================
const checkHealth = async () => {
  try {
    const res = await api.get('/sellerbot-ai/health/')
    isOnline.value = res.data.status === 'ok'
    // Sync current model from backend if not locally set
    if (res.data.current_model && !localStorage.getItem('sellerbot_model')) {
      selectedModel.value = res.data.current_model
    }
  } catch {
    isOnline.value = false
  }
}

// ===========================================================================
// Send message — streaming SSE
// ===========================================================================
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  messages.value.push({
    role: 'user',
    content: userMessage,
    time: nowTime(),
  })

  const assistantIndex = messages.value.length
  messages.value.push({
    role: 'assistant',
    content: '',
    time: nowTime(),
    loading: true,
    loadingText: 'Iniciando...',
    logs: [],
    agent: null,
  })

  scrollToBottom()
  isLoading.value = true

  // Helper: faz o fetch SSE; se receber 401 força refresh via axios (que tem o interceptor)
  // e retenta uma vez com o novo token.
  const doStreamFetch = async () => {
    const makeRequest = () => {
      const token = getAccessToken() || store.authToken
      return fetch(`${API_BASE}/sellerbot-ai/chat/stream/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMessage, model_id: selectedModel.value }),
      })
    }

    let res = await makeRequest()
    if (res.status === 401) {
      // Dispara uma requisição via axios para acionar o interceptor de refresh
      try { await api.get('/sellerbot-ai/health/') } catch (_) { /* ignora */ }
      res = await makeRequest()
    }
    return res
  }

  try {
    const response = await doStreamFetch()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          handleStreamEvent(assistantIndex, event)
        } catch {
          // ignore parse errors
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error)
    messages.value[assistantIndex].content = '❌ Erro ao processar mensagem. Tente novamente.'
    messages.value[assistantIndex].loading = false
    $q.notify({ message: 'Erro ao enviar mensagem', color: 'negative', position: 'top' })
  } finally {
    messages.value[assistantIndex].loading = false
    isLoading.value = false
    scrollToBottom()
  }
}

const handleStreamEvent = (index, event) => {
  const msg = messages.value[index]
  if (!msg) return

  switch (event.type) {
    case 'thinking':
      msg.loadingText = event.text
      msg.logs.push({ type: 'thinking', text: event.text })
      break

    case 'tool_call':
      msg.loadingText = event.text
      msg.logs.push({ type: 'tool_call', text: `🔧 ${event.text}` })
      break

    case 'tool_result':
      msg.logs.push({ type: 'tool_result', text: '✅ Dados recebidos' })
      break

    case 'done':
      msg.content = event.response || ''
      msg.agent = event.agent || null
      msg.loading = false
      break

    case 'error':
      msg.content = `❌ ${event.text}`
      msg.loading = false
      break

    case 'end':
      msg.loading = false
      break
  }

  scrollToBottom()
}

// ===========================================================================
// Helpers
// ===========================================================================
const sendSuggestion = (suggestion) => {
  inputMessage.value = suggestion
  sendMessage()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesArea.value) {
      messagesArea.value.scrollTop = messagesArea.value.scrollHeight
    }
  })
}

const nowTime = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// ===========================================================================
// Parsing de blocos: texto | tabela | gráfico
// ===========================================================================

/**
 * Extrai marcadores [CHART:{...}] usando contagem de chaves (não regex simples).
 * Garante que JSON aninhado (arrays, sub-objetos) seja capturado corretamente.
 */
const _extractCharts = (content) => {
  const MARKER = '[CHART:'
  const segments = []
  let i = 0

  while (i < content.length) {
    const start = content.indexOf(MARKER, i)
    if (start === -1) {
      segments.push({ type: 'text', content: content.slice(i) })
      break
    }
    if (start > i) {
      segments.push({ type: 'text', content: content.slice(i, start) })
    }

    // Conta chaves para achar o fim do JSON
    let depth = 0
    let j = start + MARKER.length
    const jsonStart = j
    while (j < content.length) {
      if (content[j] === '{') depth++
      else if (content[j] === '}') { depth--; if (depth === 0) { j++; break } }
      j++
    }

    if (content[j] === ']') {
      try {
        segments.push({ type: 'chart', data: JSON.parse(content.slice(jsonStart, j)) })
        i = j + 1
      } catch {
        segments.push({ type: 'text', content: content.slice(start, j + 1) })
        i = j + 1
      }
    } else {
      segments.push({ type: 'text', content: content.slice(start, j) })
      i = j
    }
  }
  return segments
}

/**
 * Extrai tabelas markdown de um bloco de texto.
 * Linhas que começam e terminam com | são tabelas.
 */
const _parseTableLines = (tableLines) => {
  const parseRow = (line) =>
    line.split('|').slice(1, -1).map(c => c.trim())
  const isSeparator = (line) => /^[\s|:-]+$/.test(line)

  const headers = parseRow(tableLines[0])
  const dataRows = tableLines
    .slice(1)
    .filter(l => !isSeparator(l))
    .map(parseRow)

  return { headers, rows: dataRows }
}

const _extractTables = (content) => {
  const lines = content.split('\n')
  const segments = []
  let textBuffer = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      // Coleta todas as linhas da tabela
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      if (tableLines.length >= 2) {
        if (textBuffer.length > 0) {
          segments.push({ type: 'text', content: textBuffer.join('\n') })
          textBuffer = []
        }
        const { headers, rows } = _parseTableLines(tableLines)
        if (headers.length > 0 && rows.length > 0) {
          segments.push({ type: 'table', headers, rows })
        }
      } else {
        textBuffer.push(...tableLines)
      }
    } else {
      textBuffer.push(line)
      i++
    }
  }

  if (textBuffer.length > 0) {
    segments.push({ type: 'text', content: textBuffer.join('\n') })
  }
  return segments
}

const parseBlocks = (content) => {
  if (!content) return []
  const withCharts = _extractCharts(content)
  const result = []
  for (const seg of withCharts) {
    if (seg.type !== 'text') { result.push(seg); continue }
    result.push(..._extractTables(seg.content))
  }
  return result.filter(b => {
    if (b.type === 'text') return b.content?.trim()
    return true
  })
}

/**
 * Formata texto simples: negrito, itálico, código, quebras de linha.
 * (Tabelas são tratadas pelo componente ChatTable, não aqui.)
 */
const formatText = (content) => {
  if (!content) return ''
  let html = content
  html = html.replace(/\*\*(.*?)\*\*/gs, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/gs, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\n/g, '<br />')
  return html
}

// ===========================================================================
// Lifecycle
// ===========================================================================
onMounted(() => {
  checkHealth()
})
</script>

<style scoped>
.sellerbot-ai-page {
  background: #f5f7fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: #fff;
  border-bottom: 1.5px solid #e8edf3;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d9488, #2dd4bf);
  color: #fff;
}

.header-eyebrow {
  font-size: 10px;
  color: #9aa0ac;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1f36;
}

.model-selector-btn {
  border: 1.5px solid #e8edf3;
  border-radius: 8px;
  font-size: 13px;
}

.model-active {
  background: rgba(13, 148, 136, 0.08);
}

.model-cost {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.cost-label {
  font-size: 9px;
  color: #9aa0ac;
  text-transform: uppercase;
}

.cost-value {
  font-size: 11px;
  font-weight: 600;
  color: #1a1f36;
}

.quality-stars {
  display: flex;
  gap: 1px;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 20px;
  gap: 16px;
}

.messages-area {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  border: 1.5px solid #e8edf3;
  padding: 20px;
  overflow-y: auto;
  min-height: 400px;
  max-height: calc(100vh - 280px);
}

.empty-chat {
  text-align: center;
  padding: 40px 24px 32px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(13, 148, 136, .1), rgba(45, 212, 191, .1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}

.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1f36;
  margin-bottom: 6px;
}

.empty-subtitle {
  font-size: 13.5px;
  color: #9aa0ac;
  line-height: 1.6;
  margin-bottom: 28px;
}

/* Grupos de sugestões */
.suggestion-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  text-align: left;
}

.suggestion-group {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 12px;
  padding: 14px 16px;
}

.suggestion-group-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #0d9488;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.suggestion-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-chip {
  background: #f8fafc;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12.5px;
  color: #374151;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  line-height: 1.5;
  font-family: inherit;
  white-space: normal;
}

.suggestion-chip:hover {
  background: rgba(13, 148, 136, 0.06);
  border-color: #0d9488;
  color: #0f766e;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message--user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f3f4f6;
}

.message--user .message-avatar {
  background: rgba(13, 148, 136, .1);
}

.message--assistant .message-avatar {
  background: rgba(251, 191, 36, .1);
}

.message-content {
  max-width: 80%;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message--user .message-header {
  flex-direction: row-reverse;
}

.message-name {
  font-size: 12px;
  font-weight: 600;
  color: #1a1f36;
}

.message-time {
  font-size: 10px;
  color: #9aa0ac;
}

/* Live log panel */
.live-log-panel {
  background: #f8fafc;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.log-thinking .q-icon { color: #6366f1; }
.log-tool_call .q-icon { color: #f59e0b; }
.log-tool_result .q-icon { color: #10b981; }
.log-error .q-icon { color: #ef4444; }

.message-text {
  background: #f3f4f6;
  padding: 12px 16px;
  border-radius: 12px;
  border-top-left-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  color: #1a1f36;
}

.message--user .message-text {
  background: linear-gradient(135deg, #0d9488, #2dd4bf);
  color: #fff;
  border-radius: 12px;
  border-top-right-radius: 4px;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, .1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.message--user .message-text :deep(code) {
  background: rgba(255, 255, 255, .2);
}

.message-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f3f4f6;
  border-radius: 12px;
  border-top-left-radius: 4px;
  font-size: 14px;
  color: #9aa0ac;
}

/* Input */
.input-area {
  background: #fff;
  border-radius: 12px;
  border: 1.5px solid #e8edf3;
  padding: 16px;
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-field {
  flex: 1;
}

.send-btn {
  flex-shrink: 0;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.input-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #9aa0ac;
}

.active-model-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #0d9488;
  font-weight: 500;
}

/* Tabelas markdown */
.message-text :deep(.md-table-wrap) {
  overflow-x: auto;
  margin: 8px 0;
  border-radius: 8px;
  border: 1px solid #e8edf3;
}

.message-text :deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.message-text :deep(.md-table th) {
  background: #f3f4f6;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: #1a1f36;
  border-bottom: 1.5px solid #e8edf3;
  white-space: nowrap;
}

.message-text :deep(.md-table td) {
  padding: 7px 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #374151;
}

.message-text :deep(.md-table tr:last-child td) {
  border-bottom: none;
}

.message-text :deep(.md-table tr:hover td) {
  background: #f9fafb;
}

/* Código inline */
.message-text :deep(code) {
  background: rgba(0, 0, 0, .06);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.message--user .message-text :deep(code) {
  background: rgba(255, 255, 255, .2);
}
</style>
