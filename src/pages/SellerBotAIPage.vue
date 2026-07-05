<template>
  <q-page class="sellerbot-ai-page">

    <!-- ── Layout dois painéis ── -->
    <div class="ai-layout">

      <!-- ══ SIDEBAR ══ -->
      <div :class="['ai-sidebar', { 'ai-sidebar--collapsed': !sidebarOpen }]">
        <!-- Logo + toggle -->
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-icon"><q-icon name="psychology" size="16px" /></div>
            <span class="sidebar-brand-name">SellerBot AI</span>
          </div>
          <q-btn flat round dense icon="menu" size="sm" color="grey-5" @click="sidebarOpen = !sidebarOpen" />
        </div>

        <!-- Nova conversa -->
        <div class="sidebar-new">
          <button class="new-chat-btn" @click="newChat">
            <q-icon name="add" size="16px" />
            <span>Nova conversa</span>
          </button>
        </div>

        <!-- Lista de conversas agrupadas -->
        <div class="sidebar-sessions">
          <div v-if="sessions.length === 0" class="sidebar-empty">
            <q-icon name="chat_bubble_outline" size="28px" color="grey-6" />
            <span>Nenhuma conversa ainda</span>
          </div>

          <template v-for="group in groupedSessions" :key="group.label">
            <div class="session-group-label">{{ group.label }}</div>
            <div
              v-for="s in group.items"
              :key="s.id"
              :class="['session-item', { 'session-item--active': currentSessionId === s.id }]"
              @click="loadSession(s.id)"
            >
              <q-icon name="chat_bubble_outline" size="13px" class="session-icon" />
              <span class="session-title">{{ s.title }}</span>
              <button class="session-delete" @click.stop="deleteSession(s.id)">
                <q-icon name="delete_outline" size="14px" />
              </button>
            </div>
          </template>
        </div>
      </div>
      <!-- ══ fim SIDEBAR ══ -->

      <!-- ══ CHAT AREA ══ -->
      <div class="ai-main">
        <!-- Header interno -->
        <div class="chat-header">
          <!-- Toggle sidebar (mobile / collapsed) -->
          <q-btn v-if="!sidebarOpen" flat round dense icon="menu" size="sm" color="grey-6" @click="sidebarOpen = true" class="q-mr-sm" />

          <div class="chat-header-title">
            <span v-if="currentSessionId" class="current-session-title">
              {{ sessions.find(s => s.id === currentSessionId)?.title || 'Conversa atual' }}
            </span>
            <span v-else class="current-session-title text-grey-5">Nova conversa</span>
          </div>

          <div class="chat-header-actions">
            <!-- Nova conversa — só mobile (sidebar colapsada não tem o botão visível) -->
            <q-btn
              flat round dense
              icon="edit_note"
              size="sm"
              color="teal-7"
              class="lt-sm"
              @click="newChat"
            >
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
                    <pre v-if="log.traceback" class="log-traceback">{{ log.traceback }}</pre>
                  </div>
                </div>
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
      <!-- ══ fim CHAT AREA ══ -->

      </div>
      <!-- ══ fim ai-main ══ -->
    </div>
    <!-- ══ fim ai-layout ══ -->

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
const sidebarOpen = ref($q.screen.gt.sm)

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
        short: 'Compare esta semana com a anterior em GMV, pedidos, lucro e custo de ads — aponte o que mais mudou e por quê',
        full: 'Compare minha semana atual com a semana passada: GMV, pedidos, margem de contribuição e custo de ads. Mostre a variação percentual de cada KPI, destaque o que mais subiu e o que mais caiu, e me diga o que devo monitorar.',
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
        full: 'Faça um waterfall completo do meu faturamento dos últimos 30 dias: GMV → fees ML → frete → custo de ads → margem de contribuição. Mostre o percentual que cada dedução representa sobre o GMV e gere o gráfico de breakdown.',
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
        full: 'Calcule minha margem de contribuição real do último mês descontando fees ML, frete, custo de ads e CMV. Qual produto tem a melhor margem? Qual tem a pior? Onde estou perdendo mais margem e o que posso fazer? Mostre o gráfico de tendência de margem.',
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
      role: m.role,
      content: m.content,
      agent: m.agent || null,
      logs: m.logs || [],
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
    logsOpen: false,
    startedAt: Date.now(),
    elapsedSec: 0,
    agent: null,
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
      return fetch(`${API_BASE}/sellerbot-ai/chat/stream/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMessage, model_id: selectedModel.value, session_id: currentSessionId.value }),
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
    clearInterval(elapsedTimer)
    messages.value[assistantIndex].loading = false
    isLoading.value = false
    scrollToBottom()
  }
}

const handleStreamEvent = (index, event) => {
  const msg = messages.value[index]
  if (!msg) return

  switch (event.type) {
    case 'session':
      currentSessionId.value = event.session_id
      // Atualiza lista de sessões após nova sessão criada
      loadSessions()
      break

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

    case 'listing_draft_ready':
      msg.pendingDraft = {
        draft: event.draft || null,
        instructions: event.instructions || '',
        status: 'pending', // pending | approved | cancelled
      }
      msg.logs.push({ type: 'tool_result', text: '📋 Rascunho de anúncio pronto para revisão' })
      break

    case 'token':
      // Streaming token a token em tempo real
      msg.content = (msg.content || '') + event.text
      msg.loadingText = null
      scrollToBottom()
      break

    case 'done':
      // Se o conteúdo já foi construído via tokens, mantém; senão usa response como fallback
      if (!msg.content) msg.content = event.response || ''
      msg.agent = event.agent || null
      msg.durationMs = Date.now() - (msg.startedAt || Date.now())
      msg.loading = false
      // Atualiza preview da sessão no histórico
      loadSessions()
      break

    case 'error':
      msg.content = `❌ ${event.text}`
      msg.durationMs = Date.now() - (msg.startedAt || Date.now())
      msg.hasError = true
      msg.logs.push({ type: 'error', text: event.text, traceback: event.traceback || null })
      msg.logsOpen = true
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
// Aprovação / cancelamento de rascunho de anúncio (ListingAgent)
// ===========================================================================
const approveDraft = async (msg) => {
  const draftId = msg.pendingDraft?.draft?.draft_id
  if (!draftId) {
    $q.notify({ type: 'negative', message: 'Rascunho não foi salvo — peça ao agente para gerar o preview novamente.' })
    return
  }
  msg.pendingDraft.loading = true
  try {
    await api.post(`/sellerbot-ai/drafts/${draftId}/approve/`)
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
  if (!draftId) {
    msg.pendingDraft.status = 'cancelled'
    return
  }
  msg.pendingDraft.loading = true
  try {
    await api.post(`/sellerbot-ai/drafts/${draftId}/cancel/`)
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

/* ── Sidebar ── */
.ai-sidebar {
  width: 260px;
  min-width: 260px;
  background: #111827;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s ease, min-width 0.2s ease;
  border-right: 1px solid #1f2937;
}
.ai-sidebar--collapsed {
  width: 0;
  min-width: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px 10px;
  border-bottom: 1px solid #1f2937;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sidebar-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0d9488, #2dd4bf);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.sidebar-brand-name {
  font-size: 14px;
  font-weight: 700;
  color: #f9fafb;
  white-space: nowrap;
}

.sidebar-new {
  padding: 10px 10px 6px;
}
.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  color: #e5e7eb;
  font-size: 13px;
  font-family: inherit;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.new-chat-btn:hover {
  background: rgba(255,255,255,0.10);
}

.sidebar-sessions {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 12px;
}
.sidebar-sessions::-webkit-scrollbar {
  width: 4px;
}
.sidebar-sessions::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: #6b7280;
  font-size: 12px;
}

.session-group-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #4b5563;
  padding: 10px 14px 4px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  margin: 1px 6px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s;
  color: #d1d5db;
  font-size: 13px;
  position: relative;
}
.session-item:hover {
  background: rgba(255,255,255,0.07);
}
.session-item--active {
  background: rgba(13, 148, 136, 0.20) !important;
  color: #5eead4;
}
.session-icon {
  flex-shrink: 0;
  opacity: 0.6;
}
.session-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 400;
}
.session-item--active .session-title {
  font-weight: 600;
  color: #5eead4;
}
.session-delete {
  display: none;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 4px;
  flex-shrink: 0;
}
.session-item:hover .session-delete {
  display: flex;
}
.session-delete:hover {
  color: #ef4444;
  background: rgba(239,68,68,0.1);
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

.log-traceback {
  margin: 6px 0 0 18px;
  padding: 8px 10px;
  background: #1e1e2e;
  color: #f38ba8;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  border-radius: 6px;
  border-left: 3px solid #ef4444;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

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

  /* Model chip compacto */
  .active-model-chip span {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
