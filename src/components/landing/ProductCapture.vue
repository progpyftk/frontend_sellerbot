<template>
  <figure class="product-capture">
    <button ref="trigger" class="capture-open" type="button" :aria-label="`Ampliar ${label}`" @click="expanded = true">
      <span class="capture-bar" aria-hidden="true"><span class="capture-brand">sellerbot<span> / {{ label }}</span></span><span class="capture-expand">Ampliar ↗</span></span>
      <span class="capture-window"><img :src="src" :alt="alt" :width="width" :height="height" loading="lazy" decoding="async"></span>
    </button>
    <figcaption>Interface do SellerBot · dados demonstrativos.</figcaption>
    <q-dialog v-model="expanded" @hide="trigger?.focus({ preventScroll: true })">
      <section class="capture-dialog" @keydown.esc.prevent.stop="expanded = false" role="region" :aria-label="`${label} em tamanho ampliado`">
        <div class="capture-dialog-header"><div><strong>{{ label }}</strong><p>Interface real · dados demonstrativos</p></div><q-btn autofocus flat round icon="close" aria-label="Fechar imagem ampliada" @click="expanded = false" /></div>
        <div class="capture-dialog-scroll" tabindex="0" aria-label="Imagem ampliada; role horizontalmente para ver os detalhes"><img :src="src" :alt="alt" :width="width" :height="height"></div>
      </section>
    </q-dialog>
  </figure>
</template>
<script setup>
import { ref } from 'vue';
defineProps({ src: { type: String, required: true }, label: { type: String, required: true }, alt: { type: String, required: true }, width: { type: Number, default: 1788 }, height: { type: Number, default: 1170 } });
const expanded = ref(false);
const trigger = ref(null);
</script>
<style scoped>
.product-capture { margin:0; min-width:0; }
.capture-open { display:block; width:100%; text-align:left; padding:0; border:1px solid #405467; background:#203342; cursor:zoom-in; border-radius:8px; overflow:hidden; box-shadow:0 22px 45px -25px #101e2b60; }
.capture-bar { display:flex; justify-content:space-between; align-items:center; gap:15px; min-height:46px; padding:0 20px; color:#edf4f7; font:600 13px Manrope,Arial,sans-serif; }
.capture-brand { letter-spacing:-.04em; font-size:17px; }
.capture-brand>span { font-size:10px; font-weight:500; letter-spacing:0; color:#c3d3dd; margin-left:8px; }
.capture-expand { font-size:10px; font-weight:600; }
.capture-window { display:block; overflow:hidden; background:#f5f8fa; }
.capture-window img { width:100%; height:auto; display:block; }
figcaption { margin-top:12px; font:500 10px/1.5 Manrope,Arial,sans-serif; color:var(--muted,#4c6272); }
.capture-open:focus-visible { outline:3px solid var(--accent,#a51e55); outline-offset:5px; }
.capture-dialog { width:1200px; max-width:calc(100vw - 32px)!important; background:#edf4f7; color:#152d43; border-radius:8px; font-family:Manrope,Arial,sans-serif; }
.capture-dialog-header { display:flex; justify-content:space-between; align-items:center; gap:20px; padding:16px 22px; }
.capture-dialog-header strong { font-size:18px; }
.capture-dialog-header p { margin:4px 0 0; font-size:11px; }
.capture-dialog-header :deep(button) { min-width:44px; min-height:44px; }
.capture-dialog-scroll { overflow:auto; max-height:75vh; background:#f5f8fa; }
.capture-dialog-scroll img { display:block; width:1100px; max-width:none; height:auto; }
.capture-dialog-scroll:focus-visible { outline:3px solid #a51e55; outline-offset:-3px; }
@media(max-width:760px) { .capture-bar { padding:0 13px; min-height:44px; } .capture-brand>span { display:none; } .capture-window { height:290px; } .capture-window img { height:290px; width:auto; max-width:none; object-fit:contain; object-position:left top; } figcaption { font-size:10px; } }
</style>
