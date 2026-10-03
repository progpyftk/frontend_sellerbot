<template>
  <section class="margin-calculator" aria-labelledby="calculator-title">
    <div class="calculator-top"><div><strong>SellerBot</strong><span>Tecnologia própria da Krivus</span></div><span class="calculator-tag">MERCADO LIVRE · CLÁSSICO</span></div>
    <h2 id="calculator-title">Quanto fica<br>em cada venda?</h2>
    <form class="calculator-fields" @submit.prevent>
      <div v-for="field in fields" :key="field.key" class="calculator-field" :class="{ 'price-field': field.key === 'price' }">
        <label :for="`margin-${field.key}`">{{ field.label }} <output :for="`margin-${field.key}`">{{ field.unit === '%' ? percentage(values[field.key]) : currency(values[field.key]) }}</output></label>
        <input :id="`margin-${field.key}`" v-model.number="values[field.key]" type="range" :min="field.min" :max="field.max" :step="field.step" :style="{ '--fill': `${(values[field.key] - field.min) / (field.max - field.min) * 100}%` }" :aria-valuetext="field.unit === '%' ? percentage(values[field.key]) : currency(values[field.key])" :aria-describedby="field.key === 'tax' ? 'calculator-tax-note' : 'calculator-note'" />
        <div class="slider-limits" aria-hidden="true"><span>{{ field.unit === '%' ? `${field.min}%` : currency(field.min) }}</span><span>{{ field.unit === '%' ? `${field.max}%` : currency(field.max) }}</span></div>
      </div>
    </form>
    <div class="calculator-result" aria-live="polite" aria-atomic="true">
      <template v-if="result">
        <div><span>Contribuição por venda</span><strong :class="{ negative: result.contribution < 0 }">{{ currency(result.contribution) }}</strong></div>
        <div><span>Margem de contribuição</span><strong :class="{ negative: result.contribution < 0 }">{{ percentage(result.margin) }}</strong></div>
        <p>{{ result.contribution < 0 ? 'Os custos informados superam o preço de venda.' : 'Antes das despesas fixas. Percentual sobre o preço de venda.' }}</p>
      </template>
      <p v-else class="validation-note">Ajuste os valores aos limites indicados.</p>
    </div>
    <p id="calculator-tax-note" class="calculator-note">Comissão de referência: 14%. Imposto inicial: 11%. Frete e custos estimados; ajuste ao seu anúncio.</p>
    <p id="calculator-note" class="calculator-note">Estimativa antes das despesas fixas, sem apuração fiscal ou créditos automáticos.</p>
    <a href="#tributario" class="calculator-link" @click="emit('navigate', $event)">O tributário muda essa conta <span aria-hidden="true">↓</span></a>
  </section>
</template>
<script setup>
import { computed, reactive } from 'vue';
const emit = defineEmits(['navigate']);
const fields = [
  { key: 'price', label: 'Preço de venda', unit: 'R$', min: 1, max: 1000, step: 1 },
  { key: 'cost', label: 'Custo do produto', unit: 'R$', min: 0, max: 1000, step: 1 },
  { key: 'commission', label: 'Comissão ML', unit: '%', min: 0, max: 30, step: 0.5 },
  { key: 'tax', label: 'Impostos efetivos', unit: '%', min: 0, max: 35, step: 0.5 },
  { key: 'shipping', label: 'Frete estimado', unit: 'R$', min: 0, max: 100, step: 1 },
  { key: 'ads', label: 'Mídia por venda', unit: 'R$', min: 0, max: 100, step: 1 },
  { key: 'other', label: 'Outros custos variáveis', unit: 'R$', min: 0, max: 100, step: 1 },
];
const values = reactive({ price: 100, cost: 40, commission: 14, tax: 11, shipping: 20, ads: 10, other: 0 });
function validField(field) {
  const value = values[field.key];
  return typeof value === 'number' && Number.isFinite(value) && value >= field.min && value <= field.max;
}
/** Contribuição dos custos declarados; impostos e comissão usam o preço bruto como base. */
const result = computed(() => {
  if (!fields.every(validField)) return null;
  const contribution = values.price * (1 - (values.commission + values.tax) / 100) - values.cost - values.shipping - values.ads - values.other;
  const margin = contribution / values.price * 100;
  return Number.isFinite(contribution) && Number.isFinite(margin) ? { contribution, margin } : null;
});
const currency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const percentage = (value) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
</script>
<style scoped>
.margin-calculator { color:var(--paper); font-variant-numeric:tabular-nums; }
.calculator-top { display:flex; justify-content:space-between; align-items:center; gap:15px; border-bottom:1px solid #435b6b; padding-bottom:18px; }
.calculator-top strong { display:block; font-size:21px; letter-spacing:-.03em; font-weight:650; }
.calculator-top div>span { display:block; font-size:10px; color:#c7d5de; }
.calculator-tag { font-size:9px; letter-spacing:.09em; color:var(--pink); }
h2 { font:600 35px/1.08 Manrope,Arial,sans-serif; letter-spacing:-.045em; color:var(--paper); margin:24px 0; }
.calculator-fields { display:grid; grid-template-columns:1fr 1fr; gap:14px 18px; }
.price-field { grid-column:1/-1; }
label { display:flex; justify-content:space-between; gap:8px; font-size:11px; color:#c7d5de; margin-bottom:6px; }
label>output { color:var(--pink); font-size:13px; font-weight:650; white-space:nowrap; }
input[type='range'] { display:block; width:100%; min-width:0; height:44px; margin:0; padding:0; background:transparent; cursor:pointer; appearance:none; -webkit-appearance:none; touch-action:pan-y; }
input[type='range']::-webkit-slider-runnable-track { height:3px; border-radius:2px; background:linear-gradient(to right,var(--pink) 0,var(--pink) var(--fill),#597282 var(--fill),#597282 100%); }
input[type='range']::-moz-range-track { height:3px; border-radius:2px; background:#597282; }
input[type='range']::-moz-range-progress { height:3px; border-radius:2px; background:var(--pink); }
input[type='range']::-webkit-slider-thumb { appearance:none; -webkit-appearance:none; width:18px; height:18px; margin-top:-7.5px; border:3px solid var(--pink); border-radius:50%; background:var(--night); }
input[type='range']::-moz-range-thumb { width:12px; height:12px; border:3px solid var(--pink); border-radius:50%; background:var(--night); }
input:focus-visible,a:focus-visible { outline:3px solid var(--pink); outline-offset:3px; border-radius:3px; }
.slider-limits { display:flex; justify-content:space-between; color:#b6c8d4; font-size:9px; margin-top:-5px; }
.calculator-result { display:grid; grid-template-columns:1fr 1fr; gap:12px; border-top:1px solid #435b6b; padding-top:20px; margin-top:24px; }
.calculator-result span { display:block; font-size:10px; color:#c7d5de; }
.calculator-result strong { display:block; font-size:33px; color:var(--pink); font-weight:550; letter-spacing:-.045em; line-height:1.3; overflow-wrap:anywhere; }
.calculator-result strong.negative { text-decoration:underline; text-decoration-thickness:1px; text-underline-offset:6px; }
.calculator-result p { grid-column:1/-1; font-size:10px; margin:0; color:#c7d5de; }
.calculator-note { font-size:10px; color:#c7d5de; line-height:1.6; margin:14px 0 0; }
.calculator-link { display:flex; justify-content:space-between; align-items:center; min-height:44px; margin-top:15px; border-top:1px solid #435b6b; color:var(--pink); font-size:12px; text-decoration:none; }
@media(max-width:760px) { h2 { font-size:30px; } .calculator-result strong { font-size:30px; } }
@media(max-width:360px) { .calculator-top { align-items:start; } .calculator-tag { max-width:70px; font-size:8px; } .calculator-fields { gap:14px 12px; } label { font-size:10px; } .calculator-result strong { font-size:27px; } }
</style>
