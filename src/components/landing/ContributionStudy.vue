<template>
  <div class="study">
    <div class="study-heading"><span>UMA VENDA, DOIS CENÁRIOS</span><span>Exemplo didático · R$</span></div>
    <div class="scenario"><span>Preço original</span><strong>100<span>,00</span></strong><div class="value-bar"><i class="cost"/><i class="remaining original"/></div><div class="bar-caption"><span>Custos variáveis <b>70</b></span><span>Contribuição <b>30</b></span></div></div>
    <div class="scenario"><label for="discount">Desconto <output>{{ discount }}%</output></label><input id="discount" v-model.number="discount" type="range" min="0" max="25" step="1" aria-describedby="study-note"/><strong>{{ 100 - discount }}<span>,00</span></strong><div class="value-bar"><i class="cost"/><i class="remaining" :style="{ flex: 30 - discount }"/></div><div class="bar-caption"><span>Custos variáveis <b>70</b></span><span>Contribuição <b>{{ 30 - discount }}</b></span></div></div>
    <div class="study-result" aria-live="polite" aria-atomic="true"><strong>+{{ extraVolume }}<span>%</span></strong><p>de unidades para manter<br>a mesma contribuição total.</p></div>
    <p id="study-note" class="fine-print">Custos constantes, antes das despesas fixas. Tarifas, impostos e mídia podem variar com o preço. Não representa resultado de cliente.</p>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
// Demonstra o volume de equilíbrio com custo constante; não estima uma conta real.
const discount = ref(10);
const extraVolume = computed(() => ((30 / (30 - discount.value) - 1) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
</script>
<style scoped>
.study{padding:34px;background:var(--surface);border-top:3px solid var(--accent);font-variant-numeric:tabular-nums}.study-heading{display:flex;justify-content:space-between;gap:20px;font-size:10px;font-weight:700;letter-spacing:.06em;padding-bottom:25px;border-bottom:1px solid var(--line)}.study-heading span:last-child{letter-spacing:0;font-weight:500}.scenario{padding:23px 0 8px}.scenario>span,.scenario label{font-size:13px;display:flex;justify-content:space-between}.scenario>strong{display:block;font-size:44px;letter-spacing:-.05em;font-weight:600;line-height:1.3}.scenario strong>span{font-size:24px}.value-bar{display:flex;height:12px;gap:3px;margin:14px 0 9px}.value-bar i{display:block}.cost{flex:70;background:#8a9fac}.remaining{flex:20;background:var(--accent)}.remaining.original{flex:30;background:var(--ink)}.bar-caption{display:flex;justify-content:space-between;font-size:11px;gap:12px}.bar-caption b{display:block;font-size:16px}input{display:block;width:100%;height:24px;margin:10px 0;accent-color:var(--accent);cursor:pointer}input:focus-visible{outline:3px solid var(--accent);outline-offset:5px}.study-result{display:flex;align-items:center;gap:24px;border-top:1px solid var(--line);margin-top:24px;padding-top:22px}.study-result>strong{font-size:64px;letter-spacing:-.06em;line-height:1;color:var(--accent);font-weight:600}.study-result>strong span{font-size:30px}.study-result p{font-size:13px;margin:0;line-height:1.5}.fine-print{font-size:11px;line-height:1.6;color:var(--muted);margin:24px 0 0}@media(max-width:600px){.study{padding:24px}.study-heading{flex-direction:column;gap:5px}.study-result{gap:18px}.study-result>strong{font-size:55px}}
</style>
