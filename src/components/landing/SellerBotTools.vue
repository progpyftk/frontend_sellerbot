<template>
  <div class="tools-explorer">
    <div class="tool-selector" role="group" aria-label="Explorar ferramentas do SellerBot">
      <button v-for="tool in tools" :key="tool.id" type="button" :aria-pressed="active.id === tool.id" aria-controls="tool-detail" @click="active = tool"><span>{{ tool.number }}</span>{{ tool.name }}<span class="tool-arrow" aria-hidden="true">↗</span></button>
    </div>
    <div id="tool-detail" class="tool-detail" role="region" aria-label="Detalhes da ferramenta selecionada" aria-live="polite">
      <div class="tool-detail-heading"><span>SELLERBOT / {{ active.name.toUpperCase() }}</span><span>{{ active.channels }}</span></div>
      <h3>{{ active.title }}</h3>
      <p>{{ active.description }}</p>
      <ProductCapture :key="active.id" :src="active.image" :label="active.name" :alt="active.alt" :width="active.width || 1788" :height="active.height" />
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import ProductCapture from './ProductCapture.vue';
// Capacidades descritas pelo acervo técnico; não simula métricas nem execução da conta.
const tools = [
  { id: 'ads', image: '/images/sellerbot/ads.webp', height: 765, alt: 'Tela de publicidade do SellerBot: investimento, ACoS, TACoS e diagnóstico por campanha, com dados demonstrativos.', channels: 'MERCADO LIVRE', number: '01', name: 'IA em Ads', title: 'Campanhas com diagnóstico.', description: 'Analisa campanhas e relaciona investimento, vendas e custos para propor decisões.', steps: ['Ler campanhas', 'Analisar indicadores', 'Revisar prioridades'], outcome: 'Onde concentrar o investimento. O que precisa de revisão.' },
  { id: 'promotions', image: '/images/sellerbot/promocoes.webp', height: 1170, alt: 'Assistente de promoções do SellerBot: execução por conta e cobertura promocional dos anúncios, com dados demonstrativos.', channels: 'MERCADO LIVRE', number: '02', name: 'Promoções', title: 'Desconto com critério.', description: 'Simula condições e avalia contribuição antes de propor uma promoção.', steps: ['Conferir custos', 'Simular desconto', 'Revisar proposta'], outcome: 'Limites de desconto alinhados à régua da empresa.' },
  { id: 'pricing', image: '/images/sellerbot/precos.webp', width: 840, height: 509, alt: 'Cascata da margem no SellerBot: impostos, taxas, frete, embalagem, publicidade e custo do produto, com dados demonstrativos.', channels: 'MERCADO LIVRE + SHOPEE', number: '03', name: 'Precificação', title: 'O preço começa nos custos.', description: 'Relaciona produto, comissão, frete e impostos nas simulações de preço.', steps: ['Compor custos', 'Simular preço', 'Avaliar margem'], outcome: 'Preço e contribuição vistos na mesma conta.' },
  { id: 'listings', image: '/images/sellerbot/anuncios.webp', height: 1490, alt: 'Interface do SellerBot AI com atalhos de análise e campo de mensagem para preparar um anúncio.', channels: 'MERCADO LIVRE + SHOPEE', number: '04', name: 'Criação de anúncios', title: 'Da ficha à publicação.', description: 'Apoia ficha, atributos, descrição e imagens, com revisão por marketplace.', steps: ['Preparar produto', 'Montar anúncio', 'Revisar e publicar'], outcome: 'Um fluxo de criação com critérios e revisão.' },
];
const active = ref(tools[0]);
</script>
<style scoped>
.tools-explorer { margin-top:38px; }
.tool-selector { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid var(--line); margin-bottom:30px; }
.tool-selector button { display:flex; align-items:center; gap:14px; min-height:64px; padding:16px 12px; color:var(--muted); background:transparent; border:0; border-bottom:3px solid transparent; font:600 16px/1.4 Manrope,Arial,sans-serif; text-align:left; cursor:pointer; }
.tool-selector button>span:first-child { font-size:10px; font-weight:500; }
.tool-selector button[aria-pressed='true'] { color:var(--accent); border-bottom-color:var(--accent); }
.tool-arrow { margin-left:auto; }
button:focus-visible { outline:3px solid var(--accent); outline-offset:3px; }
.tool-detail :deep(.capture-window) { max-height:540px; }
.tool-detail :deep(.capture-window img) { max-height:540px; object-fit:contain; object-position:top; }
.tool-detail-heading { display:flex; justify-content:space-between; gap:20px; margin-bottom:12px; font-size:9px; letter-spacing:.08em; color:var(--muted); }
h3 { font:600 30px/1.1 Manrope,Arial,sans-serif; letter-spacing:-.04em; color:var(--ink); margin:0 0 12px; }
.tool-detail p { font-size:14px; color:var(--muted); margin:0 0 26px; line-height:1.6; }
@media(max-width:760px) { .tools-explorer { margin-top:24px; } .tool-selector { grid-template-columns:repeat(2,1fr); margin-bottom:22px; } .tool-selector button { min-height:56px; font-size:12px; gap:8px; padding:12px 4px; } .tool-arrow { display:none; } h3 { font-size:27px; } .tool-detail p { font-size:13px; margin-bottom:20px; } }
</style>
