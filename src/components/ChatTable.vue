<template>
  <div class="chat-table-wrapper">
    <table class="chat-table">
      <thead>
        <tr>
          <th v-for="(col, i) in headers" :key="i">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in rows" :key="ri">
          <td
            v-for="(cell, ci) in row"
            :key="ci"
            :class="cellClass(cell, ci)"
            v-html="formatCell(cell)"
          />
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
const props = defineProps({
  headers: { type: Array, required: true },   // ['KPI', 'Valor', ...]
  rows: { type: Array, required: true },       // [['GMV', 'R$ 10k', ...], ...]
})

// Detecta se a célula é número ou tem prefixo monetário
const isNumeric = (val) => /^[R$\s\-+]?[\d.,]+[%xkMK]?$/.test(val?.trim() ?? '')

// Detecta variação positiva/negativa
const isPositive = (val) => /^\+/.test(val?.trim() ?? '') || /✅/.test(val)
const isNegative = (val) => /^-/.test(val?.trim() ?? '') && !/^--/.test(val) || /📉/.test(val)

const cellClass = (val, colIndex) => {
  const v = val?.trim() ?? ''
  return {
    'cell--number': isNumeric(v) || colIndex > 0,
    'cell--positive': isPositive(v),
    'cell--negative': isNegative(v),
  }
}

const formatCell = (val) => {
  if (!val) return '—'
  // Bold inline com **texto**
  return val.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
}
</script>

<style scoped>
.chat-table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1.5px solid #e8edf3;
  margin: 8px 0;
  max-width: 100%;
}

.chat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  white-space: nowrap;
}

.chat-table thead tr {
  background: linear-gradient(135deg, #f0fdf9, #f8fafc);
  border-bottom: 2px solid #d1fae5;
}

.chat-table th {
  padding: 9px 14px;
  text-align: left;
  font-weight: 700;
  font-size: 12px;
  color: #0d9488;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  white-space: nowrap;
}

.chat-table tbody tr {
  border-bottom: 1px solid #f0f4f8;
  transition: background 0.1s;
}

.chat-table tbody tr:last-child {
  border-bottom: none;
}

.chat-table tbody tr:hover {
  background: #f8faff;
}

.chat-table td {
  padding: 8px 14px;
  color: #1a1f36;
  vertical-align: middle;
}

.cell--number {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'Fira Mono', monospace;
  font-size: 12.5px;
}

.cell--positive {
  color: #059669;
  font-weight: 600;
}

.cell--negative {
  color: #dc2626;
  font-weight: 600;
}

/* Primeira coluna: label — alinhada à esquerda mesmo sendo "numérica" */
.chat-table td:first-child {
  text-align: left;
  font-weight: 500;
  font-family: inherit;
  color: #374151;
}
</style>
