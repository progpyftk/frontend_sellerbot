<template>
  <div class="analysis-sequence">
    <section v-for="analysis in analyses" :id="analysis.id" :key="analysis.id" class="analysis-section" :aria-labelledby="`${analysis.id}-title`">
      <div class="wrap analysis-grid">
        <div class="analysis-copy"><p class="eyebrow">{{ analysis.number }} / {{ analysis.name }}</p><h2 :id="`${analysis.id}-title`">{{ analysis.title }}<br><em>{{ analysis.emphasis }}</em></h2><p>{{ analysis.description }}</p><span class="analysis-question">{{ analysis.question }}</span><small>{{ analysis.channels }}</small></div>
        <ProductCapture :src="analysis.image" :label="analysis.name" :alt="analysis.alt" :width="analysis.width" :height="analysis.height" />
      </div>
    </section>
  </div>
</template>
<script setup>
import ProductCapture from './ProductCapture.vue';
const analyses = [
  { id: 'analise-ads', number: '01', name: 'IA em Ads', title: 'Sua campanha vende.', emphasis: 'E o investimento?', description: 'Campanhas, custo e receita no mesmo painel. O diagnóstico destaca onde olhar antes de aumentar a verba.', question: 'Decisão: investir, revisar ou reduzir.', channels: 'MERCADO LIVRE', image: '/images/sellerbot/ads.webp', width: 1908, height: 840, alt: 'Publicidade do SellerBot na paleta Krivus: investimento, ACoS, TACoS e diagnóstico de quatro campanhas. Dados demonstrativos.' },
  { id: 'analise-promocoes', number: '02', name: 'Promoções', title: 'O desconto tem limite.', emphasis: 'A margem define.', description: 'Preço, custos e contribuição antes da oferta. Depois, acompanhamento das promoções e do que foi confirmado na operação.', question: 'Decisão: qual oferta cabe no produto.', channels: 'MERCADO LIVRE', image: '/images/sellerbot/promocoes.webp', width: 1812, height: 413, alt: 'Cobertura promocional no SellerBot: anúncios ativos, com promoção, agendados e sem oferta. Dados demonstrativos.' },
  { id: 'analise-precos', number: '03', name: 'Preço e margem', title: 'O preço da vitrine.', emphasis: 'A conta por trás.', description: 'Produto, comissão, frete, impostos e mídia. A composição dos custos orienta as simulações de preço por canal.', question: 'Decisão: quanto precisa ficar em cada venda.', channels: 'MERCADO LIVRE + SHOPEE', image: '/images/sellerbot/precos.webp', width: 840, height: 510, alt: 'Cascata de custos e contribuição do SellerBot na paleta Krivus. Dados demonstrativos reconciliados com o dashboard.' },
  { id: 'analise-anuncios', number: '04', name: 'Criação de anúncios', title: 'Um produto.', emphasis: 'Um anúncio bem feito.', description: 'IA para apoiar ficha, atributos, descrição e imagens. Preparação e revisão considerando as regras de cada marketplace.', question: 'Decisão: o que está pronto para publicar.', channels: 'MERCADO LIVRE + SHOPEE', image: '/images/sellerbot/anuncios.webp', width: 1908, height: 1535, alt: 'SellerBot AI na paleta Krivus, com uma mensagem em rascunho para preparar um anúncio. Nada foi enviado ou publicado.' },
];
</script>
<style scoped>
.analysis-section { padding:78px 0; border-bottom:1px solid var(--line); }
.analysis-section:nth-child(even) { background:var(--surface); }
.analysis-grid { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.65fr); gap:58px; align-items:center; }
.analysis-section:nth-child(even) .analysis-copy { order:2; }
.analysis-section:nth-child(even) .analysis-grid { grid-template-columns:minmax(0,1.65fr) minmax(0,.85fr); }
.analysis-copy h2 { font:600 clamp(31px,3vw,44px)/1.1 Manrope,Arial,sans-serif; color:var(--ink); letter-spacing:-.045em; margin:0 0 23px; }
.analysis-copy em { font-style:normal; color:var(--accent); }
.analysis-copy p { font-size:14px; color:var(--muted); line-height:1.65; margin:0 0 22px; }
.analysis-copy .eyebrow { color:var(--accent); font-size:10px; font-weight:700; letter-spacing:.1em; margin-bottom:23px; }
.analysis-question { display:block; padding-top:17px; border-top:1px solid var(--line); font-size:12px; color:var(--ink); font-weight:600; }
.analysis-copy small { display:block; margin-top:20px; font-size:8px; letter-spacing:.08em; color:var(--muted); }
.wrap { width:min(1240px,calc(100% - 96px)); margin:auto; }
.analysis-grid :deep(.capture-window) { max-height:420px; }
.analysis-grid :deep(.capture-window img) { max-height:420px; object-fit:contain; object-position:top; }
#analise-precos :deep(.capture-window img) { padding:18px; background:white; }
@media(max-width:1100px) { .wrap { width:calc(100% - 64px); } .analysis-grid { gap:32px; } }
@media(max-width:760px) { .wrap { width:calc(100% - 40px); } .analysis-section { padding:48px 0; } .analysis-grid { grid-template-columns:minmax(0,1fr); gap:25px; } .analysis-section:nth-child(even) .analysis-copy { order:0; } .analysis-section:nth-child(even) .analysis-grid { grid-template-columns:minmax(0,1fr); } .analysis-copy h2 { font-size:34px; margin-bottom:17px; } .analysis-copy p { font-size:13px; margin-bottom:18px; } .analysis-copy .eyebrow { margin-bottom:18px; } .analysis-question { padding-top:13px; } .analysis-copy small { margin-top:13px; } #analise-precos :deep(.capture-window) { height:auto; } #analise-precos :deep(.capture-window img) { width:100%; height:auto; padding:12px; } }
</style>
