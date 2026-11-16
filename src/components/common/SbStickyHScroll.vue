<template>
  <!--
    Barra de rolagem horizontal fixa no rodapé da tela (CUSTO-14).
    A tabela rola por dentro (`.q-table__middle`), mas a barra nativa fica no fim da tabela — fora da tela
    enquanto a página não chega lá. Esta barra gruda em `bottom: 0` da janela e espelha o scroll da tabela
    nos dois sentidos, para deslocar na horizontal a qualquer momento.
    Requisito: nenhum ancestral entre ela e a página pode ter `overflow` diferente de `visible`.
  -->
  <div v-show="ativo" ref="barra" class="sb-hscroll" @scroll="daBarra">
    <div class="sb-hscroll-trilho" :style="{ width: largura + 'px' }" />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // elemento que contém a q-table (ref do wrapper)
  container: { type: Object, default: null },
  // seletor do elemento que rola dentro do container
  alvo: { type: String, default: '.q-table__middle' },
})

const barra = ref(null)
const largura = ref(0)
const ativo = ref(false)
let el = null
let observador = null
let sincronizando = false

function medir() {
  if (!el) return
  largura.value = el.scrollWidth
  ativo.value = el.scrollWidth > el.clientWidth + 1
  if (barra.value) barra.value.scrollLeft = el.scrollLeft
}

function daTabela() {
  if (sincronizando) { sincronizando = false; return }
  if (barra.value && barra.value.scrollLeft !== el.scrollLeft) {
    sincronizando = true
    barra.value.scrollLeft = el.scrollLeft
  }
}

function daBarra() {
  if (!el) return
  if (sincronizando) { sincronizando = false; return }
  if (el.scrollLeft !== barra.value.scrollLeft) {
    sincronizando = true
    el.scrollLeft = barra.value.scrollLeft
  }
}

function soltar() {
  if (el) el.removeEventListener('scroll', daTabela)
  if (observador) observador.disconnect()
  el = null
}

async function prender() {
  soltar()
  await nextTick()
  el = props.container?.querySelector?.(props.alvo) || null
  if (!el) return
  el.addEventListener('scroll', daTabela, { passive: true })
  observador = new ResizeObserver(medir)
  observador.observe(el)
  if (el.firstElementChild) observador.observe(el.firstElementChild)
  medir()
}

watch(() => props.container, prender)
onMounted(() => {
  prender()
  window.addEventListener('resize', medir)
})
onBeforeUnmount(() => {
  soltar()
  window.removeEventListener('resize', medir)
})

defineExpose({ medir })
</script>

<style scoped>
.sb-hscroll {
  position: sticky;
  bottom: 0;
  z-index: 6;
  overflow-x: auto;
  overflow-y: hidden;
  height: 16px;
  background: rgba(255, 255, 255, 0.92);
  border-top: 1px solid #e8eaed;
}
.sb-hscroll-trilho { height: 1px; }
.sb-hscroll::-webkit-scrollbar { height: 12px; }
.sb-hscroll::-webkit-scrollbar-thumb { background: #93aebb; border-radius: 6px; }
.sb-hscroll::-webkit-scrollbar-track { background: #f1f4f6; }
</style>
