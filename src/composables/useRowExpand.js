import { ref } from 'vue'

/**
 * Estado de "linha expandida" para tabelas responsivas: no mobile, colunas
 * secundárias somem da linha e ficam disponíveis num painel expandido inline
 * (ver SbResponsiveTable.md / plano de paridade mobile).
 */
export function useRowExpand() {
  const expandedKeys = ref(new Set())

  function isExpanded(key) {
    return expandedKeys.value.has(key)
  }

  function toggleExpand(key) {
    const next = new Set(expandedKeys.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    expandedKeys.value = next
  }

  function collapseAll() {
    expandedKeys.value = new Set()
  }

  return { expandedKeys, isExpanded, toggleExpand, collapseAll }
}
