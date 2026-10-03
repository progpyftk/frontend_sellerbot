<template>
  <div class="tools-explorer">
    <div class="tool-selector" role="group" aria-label="Explorar ferramentas do SellerBot">
      <button v-for="tool in tools" :key="tool.id" type="button" :aria-pressed="active.id === tool.id" aria-controls="tool-detail" @click="active = tool"><span>{{ tool.number }}</span>{{ tool.name }}<span class="tool-arrow" aria-hidden="true">↗</span></button>
    </div>
    <div id="tool-detail" class="tool-detail" role="region" aria-label="Detalhes da ferramenta selecionada" aria-live="polite">
      <div class="tool-detail-heading"><span>SELLERBOT / {{ active.name.toUpperCase() }}</span><span>{{ active.channels }}</span></div>
      <h3>{{ active.title }}</h3>
      <p>{{ active.description }}</p>
      <ol class="tool-workflow"><li v-for="(step, index) in active.steps" :key="step"><span>0{{ index + 1 }}</span>{{ step }}</li></ol>
      <div class="tool-outcome"><span>NA OPERAÇÃO</span><strong>{{ active.outcome }}</strong></div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
// Capacidades descritas pelo acervo técnico; não simula métricas nem execução da conta.
const tools = [
  { id: 'ads', channels: 'MERCADO LIVRE', number: '01', name: 'IA em Ads', title: 'Campanhas com diagnóstico.', description: 'Analisa campanhas e relaciona investimento, vendas e custos para propor decisões.', steps: ['Ler campanhas', 'Analisar indicadores', 'Revisar prioridades'], outcome: 'Onde concentrar o investimento. O que precisa de revisão.' },
  { id: 'promotions', channels: 'MERCADO LIVRE', number: '02', name: 'Promoções', title: 'Desconto com critério.', description: 'Simula condições e avalia contribuição antes de propor uma promoção.', steps: ['Conferir custos', 'Simular desconto', 'Revisar proposta'], outcome: 'Limites de desconto alinhados à régua da empresa.' },
  { id: 'pricing', channels: 'MERCADO LIVRE + SHOPEE', number: '03', name: 'Precificação', title: 'O preço começa nos custos.', description: 'Relaciona produto, comissão, frete e impostos nas simulações de preço.', steps: ['Compor custos', 'Simular preço', 'Avaliar margem'], outcome: 'Preço e contribuição vistos na mesma conta.' },
  { id: 'listings', channels: 'MERCADO LIVRE + SHOPEE', number: '04', name: 'Criação de anúncios', title: 'Da ficha à publicação.', description: 'Apoia ficha, atributos, descrição e imagens, com revisão por marketplace.', steps: ['Preparar produto', 'Montar anúncio', 'Revisar e publicar'], outcome: 'Um fluxo de criação com critérios e revisão.' },
];
const active = ref(tools[0]);
</script>
<style scoped>
.tools-explorer { display:grid; grid-template-columns: .8fr 1.6fr; gap:55px; margin-top:40px; }
.tool-selector { display:flex; flex-direction:column; align-items:stretch; }
.tool-selector button { display:flex; align-items:center; gap:18px; min-height:78px; padding:20px 0; color:var(--ink); background:transparent; border:0; border-top:1px solid var(--line); font:600 18px/1.4 Manrope,Arial,sans-serif; text-align:left; cursor:pointer; }
.tool-selector button:last-child { border-bottom:1px solid var(--line); }
.tool-selector button>span:first-child { font-size:10px; color:var(--muted); font-weight:500; }
.tool-selector button[aria-pressed='true'] { color:var(--accent); border-top:2px solid var(--accent); }
.tool-selector button[aria-pressed='true'] .tool-arrow { opacity:1; }
.tool-arrow { margin-left:auto; opacity:0; }
button:focus-visible { outline:3px solid var(--accent); outline-offset:5px; }
.tool-detail { background:var(--surface); padding:35px; border-top:2px solid var(--ink); min-height:360px; }
.tool-detail-heading { display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:9px; letter-spacing:.09em; color:var(--muted); }
h3 { font:600 40px/1.1 Manrope,Arial,sans-serif; letter-spacing:-.045em; color:var(--ink); margin:32px 0 18px; }
.tool-detail p { font-size:15px; color:var(--muted); max-width:490px; margin:0; line-height:1.6; }
.tool-workflow { display:grid; grid-template-columns:repeat(3,1fr); list-style:none; padding:0; margin:32px 0; gap:20px; }
.tool-workflow li { padding-top:14px; border-top:1px solid #8fa8b8; font-size:12px; }
.tool-workflow span { display:block; color:var(--accent); font-size:10px; margin-bottom:9px; }
.tool-outcome { border-top:1px solid #8fa8b8; padding-top:20px; }
.tool-outcome>span { display:block; font-size:9px; letter-spacing:.1em; color:var(--accent); margin-bottom:8px; }
.tool-outcome strong { font-size:15px; font-weight:600; }
@media(max-width:760px) { .tools-explorer { grid-template-columns:1fr; gap:25px; margin-top:25px; } .tool-selector { display:grid; grid-template-columns:1fr 1fr; gap:0 18px; } .tool-selector button { min-height:64px; padding:14px 0; font-size:13px; gap:8px; } .tool-selector button>span:first-child { font-size:9px; } .tool-selector button:nth-child(3) { border-bottom:1px solid var(--line); } .tool-arrow { display:none; } .tool-detail { padding:25px; min-height:0; } h3 { font-size:32px; margin-top:25px; } .tool-workflow { gap:12px; margin:25px 0; } .tool-workflow li { font-size:11px; } .tool-detail p { font-size:14px; } }
</style>
