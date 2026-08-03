<template>
  <q-page class="sellerbot-ai-page">

    <!-- ── Layout ── -->
    <div class="ai-layout">

      <!-- ══ CHAT AREA ══ -->
      <div class="ai-main">
        <!-- Header -->
        <div class="chat-header">
          <q-btn flat round dense icon="history" size="sm" color="grey-6" @click="showHistory = true">
            <q-tooltip>Conversas recentes</q-tooltip>
          </q-btn>

          <div class="chat-header-title">
            <span v-if="currentSessionId" class="current-session-title">
              {{ sessions.find(s => s.id === currentSessionId)?.title || 'Conversa atual' }}
            </span>
            <span v-else class="current-session-title text-grey-5">Nova conversa</span>
          </div>

          <div class="chat-header-actions">
            <q-btn flat round dense icon="edit_note" size="sm" color="teal-7" @click="newChat">
              <q-tooltip>Nova conversa</q-tooltip>
            </q-btn>

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

        <q-chip
          v-if="orBalance !== null"
          color="grey-8"
          text-color="white"
          icon="account_balance_wallet"
          size="sm"
          :title="orUsage !== null ? `Usado: $${orUsage}` : ''"
          class="cursor-pointer"
          @click="fetchBalance"
        >
          ${{ orBalance }}
        </q-chip>
        <q-chip v-else-if="orBalanceError" color="orange-8" text-color="white" icon="warning" size="sm" :title="orBalanceError">
          Saldo indisponível
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
          <div class="empty-title">SellerBot AI</div>
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

              <div v-if="msg.images?.length" class="message-images">
                <img v-for="(imgUrl, ii) in msg.images" :key="ii" :src="imgUrl" class="message-image-thumb" />
              </div>

              <!-- ── Thinking trail: ao vivo enquanto não há conteúdo ── -->
              <div v-if="msg.loading && !msg.content" class="thinking-trail">
                <div class="thinking-trail-steps">
                  <div
                    v-for="(log, li) in msg.logs"
                    :key="li"
                    :class="['trail-step', `trail-${log.type}`, { 'trail-step--active': li === msg.logs.length - 1 }]"
                  >
                    <div class="trail-dot">
                      <q-icon :name="logIcon(log.type)" size="11px" />
                    </div>
                    <span class="trail-text">{{ log.text }}</span>
                    <template v-if="li === msg.logs.length - 1">
                      <q-spinner-dots color="teal-6" size="14px" class="q-ml-xs" />
                      <span v-if="msg.elapsedSec" class="trail-elapsed">{{ msg.elapsedSec }}s</span>
                    </template>
                  </div>
                  <!-- Fallback quando ainda sem logs -->
                  <div v-if="!msg.logs.length" class="trail-step trail-thinking trail-step--active">
                    <div class="trail-dot"><q-icon name="psychology" size="11px" /></div>
                    <span class="trail-text">Conectando ao agente...</span>
                    <q-spinner-dots color="teal-6" size="14px" class="q-ml-xs" />
                    <span v-if="msg.elapsedSec" class="trail-elapsed">{{ msg.elapsedSec }}s</span>
                  </div>
                </div>
              </div>

              <!-- ── Conteúdo da mensagem (texto + tabelas + gráficos) ── -->
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

              <!-- ── Card de aprovação de rascunho de anúncio (ListingAgent) ── -->
              <div v-if="msg.pendingDraft" class="listing-draft-card">
                <div v-if="msg.pendingDraft.status === 'pending'">
                  <div class="listing-draft-instructions">{{ msg.pendingDraft.instructions }}</div>
                  <div class="listing-draft-actions">
                    <q-btn
                      unelevated color="positive" label="Aprovar" icon="check" no-caps dense
                      :loading="msg.pendingDraft.loading"
                      @click="approveDraft(msg)"
                    />
                    <q-btn
                      flat color="negative" label="Cancelar" icon="close" no-caps dense
                      :loading="msg.pendingDraft.loading"
                      @click="cancelDraft(msg)"
                    />
                  </div>
                </div>
                <div v-else-if="msg.pendingDraft.status === 'approved'" class="listing-draft-status listing-draft-status--approved">
                  <q-icon name="check_circle" size="16px" /> Rascunho aprovado — peça ao agente para publicar.
                </div>
                <div v-else-if="msg.pendingDraft.status === 'cancelled'" class="listing-draft-status listing-draft-status--cancelled">
                  <q-icon name="cancel" size="16px" /> Rascunho cancelado.
                </div>
              </div>

              <!-- Cursor piscante enquanto tokens chegam -->
              <span v-if="msg.loading && msg.content" class="streaming-cursor" />

              <!-- ── Log pill colapsável pós-resposta ── -->
              <div v-if="!msg.loading && msg.logs && msg.logs.length > 0" class="live-log-panel">
                <div :class="['log-summary', msg.hasError ? 'log-summary--error' : '']" @click="msg.logsOpen = !msg.logsOpen">
                  <q-icon :name="msg.hasError ? 'bug_report' : 'account_tree'" size="13px" />
                  <span>
                    <span v-if="msg.hasError">Erro · </span>
                    {{ msg.logs.length }} etapa{{ msg.logs.length > 1 ? 's' : '' }}
                    <span v-if="msg.agent"> · {{ msg.agent }}</span>
                    <span v-if="msg.durationMs"> · {{ (msg.durationMs / 1000).toFixed(1) }}s</span>
                  </span>
                  <q-icon :name="msg.logsOpen ? 'expand_less' : 'expand_more'" size="14px" class="q-ml-auto" />
                </div>
                <div v-if="msg.logsOpen" class="log-details">
                  <div
                    v-for="(log, li) in msg.logs"
                    :key="li"
                    :class="['log-entry', `log-${log.type}`]"
                  >
                    <q-icon :name="logIcon(log.type)" size="12px" />
                    <span>{{ log.text }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Image Preview Bar -->
      <div v-if="pendingImages.length" class="image-preview-bar">
        <div v-for="(img, i) in pendingImages" :key="i" class="image-preview-item">
          <img :src="img.preview" />
          <q-btn flat round dense icon="close" size="xs" color="negative"
            class="image-preview-remove" @click="removeImage(i)" />
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
              <q-btn flat round dense icon="attach_file" color="grey-6" size="sm" @click="$refs.fileInput.click()">
                <q-tooltip>Anexar imagem</q-tooltip>
              </q-btn>
              <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="handleFileSelect" />
            </template>
          </q-input>
          <q-btn
            round
            color="teal-7"
            icon="send"
            :loading="isLoading"
            :disable="(!inputMessage.trim() && !pendingImages.length) || isLoading"
            @click="sendMessage"
            class="send-btn"
          />
        </div>
        <div class="input-footer">
          <div class="input-hint">
            <q-icon name="info" size="12px" />
            <span>Enter para enviar · Ctrl+Enter para nova linha</span>
          </div>
        </div>
      </div>
      </div>
      <!-- ══ fim CHAT AREA ══ -->

      </div>
      <!-- ══ fim ai-main ══ -->
    </div>
    <!-- ══ fim ai-layout ══ -->

    <!-- ══ HISTORY PANEL (sliding overlay) ══ -->
    <transition name="history-slide">
      <div v-if="showHistory" class="history-backdrop" @click="showHistory = false" />
    </transition>
    <transition name="history-slide">
      <div v-if="showHistory" class="history-panel">
        <div class="history-panel-header">
          <span class="history-panel-title">Conversas recentes</span>
          <q-btn flat round dense icon="close" size="sm" color="grey-6" @click="showHistory = false" />
        </div>
        <div class="history-panel-new">
          <button class="history-new-btn" @click="newChat(); showHistory = false">
            <q-icon name="add" size="16px" />
            <span>Nova conversa</span>
          </button>
        </div>
        <div class="history-panel-list">
          <div v-if="sessions.length === 0" class="history-empty">
            <q-icon name="chat_bubble_outline" size="28px" color="grey-4" />
            <span>Nenhuma conversa ainda</span>
          </div>
          <template v-for="group in groupedSessions" :key="group.label">
            <div class="history-group-label">{{ group.label }}</div>
            <div
              v-for="s in group.items"
              :key="s.id"
              :class="['history-item', { 'history-item--active': currentSessionId === s.id }]"
              @click="loadSession(s.id); showHistory = false"
            >
              <q-icon name="chat_bubble_outline" size="13px" class="history-item-icon" />
              <span class="history-item-title">{{ s.title }}</span>
              <button class="history-item-delete" @click.stop="deleteSession(s.id)">
                <q-icon name="delete_outline" size="14px" />
              </button>
            </div>
          </template>
        </div>
      </div>
    </transition>
    <!-- ══ fim HISTORY PANEL ══ -->

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
import {
  createAssistantMessage,
  normalizeHistoricalMessage,
  reduceSellerbotEvent,
} from 'src/services/sellerbotStream.js'

const $q = useQuasar()
const store = useStore()
const API_BASE = api.defaults.baseURL || 'http://localhost:8000'

// ===========================================================================
// Modelos disponíveis — fallback local + fetch dinâmico da API
// ===========================================================================
// Fallback local — espelha OPENROUTER_MODELS de models_catalog.py no backend
// (a lista real vem de GET /sellerbot-ai/models/; manter os dois em sincronia)
const DEFAULT_MODELS = [
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    cost_input: 0.43,
    cost_output: 0.87,
    quality: 5,
    speed: 4,
    recommended: true,
    note: 'Recomendado. Geração V4 — raciocínio forte, tool calling confiável, contexto 1M.',
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'DeepSeek',
    cost_input: 0.09,
    cost_output: 0.18,
    quality: 4,
    speed: 5,
    recommended: false,
    note: 'V4 rápido e ultra-barato — ideal para alto volume de consultas simples.',
  },
  {
    id: 'xiaomi/mimo-v2.5-pro',
    name: 'MiMo 2.5 Pro',
    provider: 'Xiaomi',
    cost_input: 0.43,
    cost_output: 0.87,
    quality: 5,
    speed: 4,
    recommended: false,
    note: 'Open weights da Xiaomi. Raciocínio forte com tool calling, contexto 1M.',
  },
  {
    id: 'xiaomi/mimo-v2.5',
    name: 'MiMo 2.5',
    provider: 'Xiaomi',
    cost_input: 0.10,
    cost_output: 0.28,
    quality: 4,
    speed: 5,
    recommended: false,
    note: 'Versão econômica do MiMo 2.5 — rápido e barato.',
  },
  {
    id: 'minimax/minimax-m3',
    name: 'MiniMax M3',
    provider: 'MiniMax',
    cost_input: 0.30,
    cost_output: 1.20,
    quality: 5,
    speed: 4,
    recommended: false,
    note: 'Open weights do MiniMax. Contexto 1M e raciocínio avançado.',
  },
  {
    id: 'z-ai/glm-5.2',
    name: 'GLM 5.2',
    provider: 'Z.ai',
    cost_input: 0.69,
    cost_output: 2.16,
    quality: 5,
    speed: 4,
    recommended: false,
    note: 'Open weights da Z.ai. Topo de linha da família GLM, contexto 1M.',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    cost_input: 0.20,
    cost_output: 0.80,
    quality: 4,
    speed: 4,
    recommended: false,
    note: 'Geração anterior — mantido por compatibilidade.',
  },
  {
    id: 'meta-llama/llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'Meta',
    cost_input: 0.17,
    cost_output: 0.52,
    quality: 4,
    speed: 4,
    recommended: false,
    note: 'Open source da Meta com visão. Contexto 1M com custo mínimo.',
  },
  {
    id: 'qwen/qwen3-235b-a22b',
    name: 'Qwen 3 235B',
    provider: 'Alibaba',
    cost_input: 0.40,
    cost_output: 0.60,
    quality: 5,
    speed: 3,
    recommended: false,
    note: 'Maior modelo open weights do Qwen. Raciocínio avançado e tool calling.',
  },
]
const MODELS = ref(DEFAULT_MODELS)

// ===========================================================================
// State
// ===========================================================================
const messages = ref([])
const inputMessage = ref('')
const isLoading = ref(false)
const isOnline = ref(false)
const orBalance = ref(null)
const orUsage = ref(null)
const orBalanceError = ref(null)
const messagesArea = ref(null)
const VALID_MODEL_IDS = computed(() => new Set(MODELS.value.map(m => m.id)))
const _savedModel = localStorage.getItem('sellerbot_model')
const selectedModel = ref(VALID_MODEL_IDS.value.has(_savedModel) ? _savedModel : 'deepseek/deepseek-v4-pro')

// Sessões
const currentSessionId = ref(null)
const sessions = ref([])
const showHistory = ref(false)

// Upload de imagens
const pendingImages = ref([])  // [{file: File, preview: string(base64)}]
const fileInput = ref(null)

const selectedModelName = computed(() => {
  const m = MODELS.value.find(m => m.id === selectedModel.value)
  return m ? m.name : selectedModel.value.split('/').pop()
})

const groupedSessions = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const week = new Date(today); week.setDate(today.getDate() - 7)
  const month = new Date(today); month.setDate(today.getDate() - 30)

  const groups = [
    { label: 'Hoje', items: [] },
    { label: 'Ontem', items: [] },
    { label: 'Últimos 7 dias', items: [] },
    { label: 'Últimos 30 dias', items: [] },
    { label: 'Mais antigas', items: [] },
  ]

  for (const s of sessions.value) {
    const d = new Date(s.updated_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (day >= today) groups[0].items.push(s)
    else if (day >= yesterday) groups[1].items.push(s)
    else if (day >= week) groups[2].items.push(s)
    else if (day >= month) groups[3].items.push(s)
    else groups[4].items.push(s)
  }

  return groups.filter(g => g.items.length > 0)
})

const suggestionGroups = [
  {
    label: 'Vendas & Performance',
    icon: 'trending_up',
    items: [
      {
        short: 'Compare semana atual vs anterior — GMV, pedidos e margem',
        full: 'Compare minha semana atual com a semana passada: GMV, pedidos, margem de contribuição e custo de ads. Mostre a variação percentual de cada KPI, destaque o que mais subiu e o que mais caiu, e me diga o que devo monitorar.',
      },
      {
        short: 'Evolução diária dos últimos 30 dias com gráfico',
        full: 'Mostre a evolução do meu GMV, margem e pedidos nos últimos 30 dias com gráfico de linha. Identifique se há tendência de alta ou queda, aponte os dias com anomalias e me explique possíveis causas.',
      },
    ],
  },
  {
    label: 'Anúncios & Concorrência',
    icon: 'storefront',
    items: [
      {
        short: 'Diagnóstico completo dos meus anúncios agora',
        full: 'Faça um diagnóstico completo de saúde dos meus anúncios: quais estão com estoque crítico, quais têm qualidade baixa, quais estão pausados, quais ficaram sem visitas nos últimos 7 dias. Me dê uma lista de ações prioritárias.',
      },
      {
        short: 'Meu top produto vs concorrentes — preço e posição',
        full: 'Identifique meu produto mais vendido nos últimos 30 dias e faça uma análise completa dos concorrentes no Mercado Livre: faixa de preço, quantos são Full, quantos têm frete grátis, e onde meu preço se posiciona no ranking.',
      },
    ],
  },
  {
    label: 'Estoque & Riscos',
    icon: 'inventory_2',
    items: [
      {
        short: 'Quais produtos vão zerar estoque esta semana?',
        full: 'Calcule a cobertura de estoque em dias para todos os meus anúncios ativos, com base na velocidade de venda dos últimos 30 dias. Quais produtos vão zerar nos próximos 7 dias? Ordene por urgência e me diga o que repor primeiro.',
      },
      {
        short: 'Anúncios ativos com estoque abaixo de 5 unidades',
        full: 'Verifique quais anúncios estão "ativos" no Mercado Livre mas com estoque zerado ou abaixo de 5 unidades. Para cada um, mostre o volume de vendas recente para estimar quanto de GMV estou deixando de faturar.',
      },
    ],
  },
  {
    label: 'Financeiro & Margem',
    icon: 'account_balance',
    items: [
      {
        short: 'Margem real do mês — descontando fees, frete, ads e CMV',
        full: 'Calcule minha margem de contribuição real do último mês descontando fees ML, frete, custo de ads e CMV. Qual produto tem a melhor margem? Qual tem a pior? Onde estou perdendo mais margem e o que posso fazer?',
      },
      {
        short: 'Projeção de GMV do mês com base nos últimos 7 dias',
        full: 'Com base no meu GMV dos últimos 7 dias, calcule a projeção de faturamento para o mês completo. Estou no pace para bater o mês anterior? Quais foram os melhores e piores dias e o que explica a diferença?',
      },
    ],
  },
  {
    label: 'Ads & Campanhas',
    icon: 'campaign',
    items: [
      {
        short: 'ROAS dos últimos 30 dias — o que pausar?',
        full: 'Analise a eficiência dos meus ads nos últimos 30 dias: ROAS total, ACOS médio, custo de ads vs receita atribuída. Quais produtos têm ROAS abaixo de 5x? Me dê uma recomendação de o que pausar ou ajustar.',
      },
      {
        short: 'Full vs não-Full — onde investir mais em ads?',
        full: 'Compare o ROAS médio dos meus anúncios Full com os não-Full no último mês. Anúncios Full realmente convertem melhor com ads? Mostre os dados e me dê uma recomendação de alocação de budget.',
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
// Image upload
// ===========================================================================
const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
  let totalBytes = pendingImages.value.reduce((sum, image) => sum + image.file.size, 0)
  let acceptedCount = pendingImages.value.length
  for (const file of files) {
    if (acceptedCount >= 4) {
      $q.notify({ message: 'Envie no máximo 4 imagens por mensagem', color: 'negative' })
      break
    }
    if (!allowedTypes.has(file.type)) {
      $q.notify({ message: `${file.name}: use JPEG, PNG ou WebP`, color: 'negative' })
      continue
    }
    if (file.size > 5 * 1024 * 1024) {
      $q.notify({ message: `${file.name} excede 5MB`, color: 'negative' })
      continue
    }
    if (totalBytes + file.size > 15 * 1024 * 1024) {
      $q.notify({ message: 'O total das imagens deve ter no máximo 15MB', color: 'negative' })
      continue
    }
    totalBytes += file.size
    acceptedCount += 1
    const reader = new FileReader()
    reader.onload = (ev) => {
      pendingImages.value.push({ file, preview: ev.target.result })
    }
    reader.readAsDataURL(file)
  }
  e.target.value = ''
}

const removeImage = (index) => {
  pendingImages.value.splice(index, 1)
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
// Sessões — histórico de conversas
// ===========================================================================
const loadSessions = async () => {
  try {
    const res = await api.get('/sellerbot-ai/sessions/')
    sessions.value = res.data.sessions || []
  } catch { /* silencia */ }
}

const loadSession = async (id) => {
  try {
    const res = await api.get(`/sellerbot-ai/sessions/${id}/`)
    const msgs = res.data.messages || []
    messages.value = msgs.map(m => ({
      ...normalizeHistoricalMessage(m),
      logsOpen: false,
      time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }))
    currentSessionId.value = id
    showHistory.value = false
    nextTick(() => scrollToBottom())
  } catch {
    $q.notify({ message: 'Erro ao carregar conversa', color: 'negative', position: 'top' })
  }
}

const newChat = () => {
  messages.value = []
  currentSessionId.value = null
  showHistory.value = false
}

const deleteSession = async (id) => {
  try {
    await api.delete(`/sellerbot-ai/sessions/${id}/`)
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (currentSessionId.value === id) newChat()
  } catch {
    $q.notify({ message: 'Erro ao apagar conversa', color: 'negative', position: 'top' })
  }
}

const formatSessionDate = (iso) => {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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
// OpenRouter balance
// ===========================================================================
const fetchBalance = async () => {
  try {
    const res = await api.get('/sellerbot-ai/balance/')
    const d = res.data
    if (d.balance_usd !== null && d.balance_usd !== undefined) {
      orBalance.value = d.balance_usd.toFixed(2)
      orUsage.value = d.usage_usd.toFixed(4)
    } else {
      // Sem limite configurado (pay-as-you-go) — mostra só o gasto
      orBalance.value = null
      orUsage.value = d.usage_usd.toFixed(4)
      orBalanceError.value = `Usado: $${d.usage_usd.toFixed(4)} (sem limite definido)`
    }
    orBalanceError.value = null
  } catch (e) {
    orBalanceError.value = e?.response?.data?.error || 'Erro ao buscar saldo'
  }
}

// ===========================================================================
// Send message — streaming SSE
// ===========================================================================
const sendMessage = async () => {
  if ((!inputMessage.value.trim() && !pendingImages.value.length) || isLoading.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // Capturar imagens pendentes e limpar preview
  const imageData = pendingImages.value.map(img => img.preview)
  pendingImages.value = []

  messages.value.push({
    role: 'user',
    content: userMessage || (imageData.length ? `${imageData.length} imagem(ns) enviada(s)` : ''),
    images: imageData,
    time: nowTime(),
  })

  const assistantIndex = messages.value.length
  messages.value.push({
    ...createAssistantMessage(),
    time: nowTime(),
    loadingText: 'Iniciando...',
  })

  // Timer de tempo decorrido — atualiza a cada segundo enquanto loading
  const elapsedTimer = setInterval(() => {
    const msg = messages.value[assistantIndex]
    if (!msg || !msg.loading) { clearInterval(elapsedTimer); return }
    msg.elapsedSec = Math.floor((Date.now() - msg.startedAt) / 1000)
  }, 1000)

  scrollToBottom()
  isLoading.value = true

  // Helper: faz o fetch SSE; se receber 401 força refresh via axios (que tem o interceptor)
  // e retenta uma vez com o novo token.
  const doStreamFetch = async () => {
    const makeRequest = () => {
      const token = getAccessToken() || store.authToken
      const body = { message: userMessage, model_id: selectedModel.value, session_id: currentSessionId.value }
      if (imageData.length) body.images = imageData
      return fetch(`${API_BASE}/sellerbot-ai/chat/stream/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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
    handleStreamEvent(assistantIndex, { type: 'error' })
    $q.notify({ message: 'Erro ao enviar mensagem', color: 'negative', position: 'top' })
  } finally {
    clearInterval(elapsedTimer)
    messages.value[assistantIndex].loading = false
    isLoading.value = false
    scrollToBottom()
  }
}

const handleStreamEvent = (index, event) => {
  const msg = messages.value[index]
  if (!msg) return

  if (event.type === 'session') {
    currentSessionId.value = event.session_id
    loadSessions()
  } else {
    if (event.type === 'token' && typeof event.text === 'string') {
      msg.content = `${msg.content || ''}${event.text}`
      msg.loadingText = null
      scrollToBottom()
      return
    }
    const next = reduceSellerbotEvent(msg, event)
    next.time = msg.time
    if (event.type === 'done' || event.type === 'error') {
      next.durationMs = Date.now() - (msg.startedAt || Date.now())
    }
    messages.value[index] = next
    if (event.type === 'done') loadSessions()
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
// Aprovação / cancelamento de rascunho de anúncio (ListingAgent)
// ===========================================================================
const approveDraft = async (msg) => {
  const draftId = msg.pendingDraft?.draft?.draft_id
  const approvalId = msg.pendingDraft?.draft?.approval_id
  if (!draftId && !approvalId) {
    $q.notify({ type: 'negative', message: 'Rascunho não foi salvo — peça ao agente para gerar o preview novamente.' })
    return
  }
  msg.pendingDraft.loading = true
  try {
    if (draftId) await api.post(`/sellerbot-ai/drafts/${draftId}/approve/`)
    else await api.post(`/sellerbot-ai/approvals/${approvalId}/approve/`)
    msg.pendingDraft.status = 'approved'
    $q.notify({ type: 'positive', message: 'Rascunho aprovado. Peça ao agente para publicar.' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error || 'Falha ao aprovar rascunho.' })
  } finally {
    msg.pendingDraft.loading = false
  }
}

const cancelDraft = async (msg) => {
  const draftId = msg.pendingDraft?.draft?.draft_id
  const approvalId = msg.pendingDraft?.draft?.approval_id
  if (!draftId && !approvalId) {
    msg.pendingDraft.status = 'cancelled'
    return
  }
  msg.pendingDraft.loading = true
  try {
    if (draftId) await api.post(`/sellerbot-ai/drafts/${draftId}/cancel/`)
    else await api.post(`/sellerbot-ai/approvals/${approvalId}/cancel/`)
    msg.pendingDraft.status = 'cancelled'
    $q.notify({ type: 'info', message: 'Rascunho cancelado.' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err?.response?.data?.error || 'Falha ao cancelar rascunho.' })
  } finally {
    msg.pendingDraft.loading = false
  }
}

// ===========================================================================
// Lifecycle
// ===========================================================================
const fetchModels = async () => {
  try {
    const res = await api.get('/sellerbot-ai/models/')
    if (res.data.models?.length) MODELS.value = res.data.models
    if (!VALID_MODEL_IDS.value.has(selectedModel.value)) {
      selectedModel.value = MODELS.value[0]?.id || 'deepseek/deepseek-chat'
    }
  } catch { /* fallback local já aplicado */ }
}

onMounted(() => {
  fetchModels()
  checkHealth()
  fetchBalance()
  loadSessions()
})
</script>

<style scoped>
.sellerbot-ai-page {
  background: #f5f7fa;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Two-column layout ── */
.ai-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: 100%;
}

/* ── Main chat area ── */
.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1.5px solid #e8edf3;
  gap: 10px;
  flex-shrink: 0;
}
.chat-header-title {
  flex: 1;
  min-width: 0;
}
.current-session-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1f36;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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
  padding: 16px 20px;
  gap: 12px;
  overflow: hidden;
}

.messages-area {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  border: 1.5px solid #e8edf3;
  padding: 20px;
  overflow-y: auto;
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
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.08);
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

/* ── Thinking trail (live activity before tokens arrive) ── */
.thinking-trail {
  margin-bottom: 6px;
}
.thinking-trail-steps {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 10px 14px 10px 12px;
  background: #f0fdf9;
  border: 1px solid #99f6e4;
  border-radius: 10px;
  border-top-left-radius: 3px;
}
.trail-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 12.5px;
  color: #6b7280;
  position: relative;
}
.trail-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 10px;
  top: 100%;
  width: 1px;
  height: 6px;
  background: #d1fae5;
}
.trail-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #d1fae5;
  color: #059669;
}
.trail-step--active .trail-dot {
  background: #0d9488;
  color: #fff;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
}
.trail-text {
  flex: 1;
  line-height: 1.4;
}
.trail-step--active .trail-text {
  color: #0f766e;
  font-weight: 500;
}
.trail-elapsed {
  font-size: 10px;
  color: #9ca3af;
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
}

.trail-thinking .trail-dot { background: #ede9fe; color: #7c3aed; }
.trail-step--active.trail-thinking .trail-dot { background: #7c3aed; color: #fff; box-shadow: 0 0 0 3px rgba(124,58,237,.15); }
.trail-tool_call .trail-dot { background: #fef3c7; color: #d97706; }
.trail-step--active.trail-tool_call .trail-dot { background: #d97706; color: #fff; box-shadow: 0 0 0 3px rgba(217,119,6,.15); }
.trail-tool_result .trail-dot { background: #d1fae5; color: #059669; }
.trail-step--active.trail-tool_result .trail-dot { background: #059669; color: #fff; box-shadow: 0 0 0 3px rgba(5,150,105,.15); }

/* Card de aprovação de rascunho de anúncio */
.listing-draft-card {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}
.listing-draft-instructions {
  font-size: 13px;
  color: #166534;
  margin-bottom: 8px;
  white-space: pre-line;
}
.listing-draft-actions {
  display: flex;
  gap: 8px;
}
.listing-draft-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
}
.listing-draft-status--approved { color: #059669; }
.listing-draft-status--cancelled { color: #b91c1c; }

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
/* Quando colapsado (só o pill), remove background e borda */
.live-log-panel:has(.log-summary:only-child),
.live-log-panel:has(.log-summary) {
  background: transparent;
  border-color: transparent;
  padding: 2px 0;
}

.log-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.15);
  width: fit-content;
  user-select: none;
  transition: background 0.15s;
}
.log-summary:hover {
  background: rgba(99, 102, 241, 0.13);
  color: #6366f1;
}
.log-summary--error {
  background: rgba(239, 68, 68, 0.07);
  border-color: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}
.log-summary--error:hover {
  background: rgba(239, 68, 68, 0.13);
  color: #dc2626;
}

.log-details {
  margin-top: 6px;
  padding: 6px 8px;
  border-left: 2px solid rgba(99, 102, 241, 0.2);
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

/* Image preview bar */
.image-preview-bar {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.image-preview-bar::-webkit-scrollbar { display: none; }

.image-preview-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #e8edf3;
  flex-shrink: 0;
}
.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(255,255,255,0.85) !important;
  border-radius: 50%;
}

/* Images in messages */
.message-images {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.message-image-thumb {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #e8edf3;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.message-image-thumb:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
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

/* Cursor piscante durante streaming */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: #0d9488;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.7s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ══════════════════════════════════════════════════════════════════════════
   HISTORY PANEL (sliding overlay)
══════════════════════════════════════════════════════════════════════════ */
.history-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.history-panel {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 320px;
  max-width: 85vw;
  background: #fff;
  box-shadow: 4px 0 24px rgba(0,0,0,0.12);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.25s ease;
}
@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.history-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #e8edf3;
}
.history-panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1f36;
}

.history-panel-new {
  padding: 12px 16px 8px;
}
.history-new-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  background: transparent;
  border: 1.5px solid #e8edf3;
  border-radius: 8px;
  color: #374151;
  font-size: 13px;
  font-family: inherit;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.history-new-btn:hover {
  background: #f0fdf4;
  border-color: #0d9488;
}

.history-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px;
}
.history-panel-list::-webkit-scrollbar { width: 4px; }
.history-panel-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 4px; }

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9ca3af;
  font-size: 12px;
}

.history-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #9ca3af;
  padding: 12px 16px 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s;
  color: #374151;
  font-size: 13px;
  position: relative;
}
.history-item:hover { background: #f3f4f6; }
.history-item--active {
  background: rgba(13, 148, 136, 0.08);
  color: #0d9488;
}
.history-item-icon { flex-shrink: 0; opacity: 0.45; }
.history-item-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-item--active .history-item-title {
  font-weight: 600;
  color: #0d9488;
}
.history-item-delete {
  display: none;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: #9ca3af;
  border-radius: 4px;
  flex-shrink: 0;
}
.history-item:hover .history-item-delete { display: flex; }
.history-item-delete:hover {
  color: #ef4444;
  background: rgba(239,68,68,0.1);
}

/* History panel transition (Vue <transition>) */
.history-slide-enter-active { transition: opacity 0.2s ease; }
.history-slide-leave-active { transition: opacity 0.15s ease; }
.history-slide-enter-from,
.history-slide-leave-to { opacity: 0; }

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* ── Fix layout height: 100dvh não desconta o header do MainLayout ── */
  .sellerbot-ai-page {
    height: calc(100dvh - 54px); /* 54px = header mobile */
  }

  .ai-layout {
    min-height: 0;
  }

  .ai-main {
    min-height: 0;
  }

  .chat-container {
    padding: 8px 10px;
    min-height: 0;
  }

  .messages-area {
    padding: 12px;
    min-height: 0;
  }

  /* ── Carrossel de sugestões ── */
  .suggestion-groups {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 12px;
    padding-bottom: 8px;
    /* alinha ao início para não centralizar grupo parcial */
    align-items: stretch;
  }

  .suggestion-groups::-webkit-scrollbar { display: none; }

  .suggestion-group {
    min-width: 272px;
    max-width: 280px;
    flex-shrink: 0;
    scroll-snap-align: start;
  }

  /* hint de scroll — "deslize" */
  .suggestion-groups::after {
    content: '';
    min-width: 1px;
    flex-shrink: 0;
  }

  .empty-chat {
    padding: 20px 12px 16px;
  }

  .empty-subtitle {
    font-size: 13px;
  }

  .empty-title {
    font-size: 17px;
  }

  /* ── Input area sempre visível ── */
  .input-area {
    padding: 10px 12px;
    border-radius: 0 0 12px 12px;
    flex-shrink: 0;
  }

  /* Oculta hint de teclado no mobile (ocupa espaço desnecessário) */
  .input-hint {
    display: none;
  }

  /* Header: model selector mais compacto */
  .model-selector-btn {
    font-size: 11px;
  }

  .chat-header {
    padding: 8px 12px;
    gap: 8px;
  }
}
</style>
