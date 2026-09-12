<template>
  <!-- Desktop: tabela densa com a primeira coluna fixa (o contexto nunca sai de vista ao rolar). -->
  <div v-if="rows.length" class="adv-table">
    <div class="adv-table__wrap">
      <table class="adv-table__table">
        <caption class="adv-table__caption">{{ legenda }}</caption>
        <thead>
          <tr>
            <th
              v-for="col in columns" :key="col.key" scope="col"
              :class="{ 'is-numeric': col.numeric, 'is-sortable': col.sortable, 'is-active': ativo(col) }"
              :style="{ width: col.width, minWidth: col.minWidth ? `${col.minWidth}px` : null }"
              :aria-sort="ariaSort(col)"
            >
              <button v-if="col.sortable" type="button" class="adv-table__sort" @click="$emit('sort', col)">
                {{ col.label }}
                <q-icon :name="iconeOrdem(col)" size="14px" aria-hidden="true" />
              </button>
              <template v-else>{{ col.label }}</template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows" :key="row[rowKey]"
            :class="{ 'is-open': expandido === row[rowKey] }"
            @click="$emit('row', row)"
          >
            <td
              v-for="col in columns" :key="col.key" :class="{ 'is-numeric': col.numeric }"
              :data-label="col.label"
            >
              <slot :name="`cell-${col.key}`" :row="row">{{ row[col.key] ?? '—' }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile: a mesma linha como cartão — nunca uma tabela que rola para o lado. -->
    <ul class="adv-table__cards">
      <li v-for="row in rows" :key="row[rowKey]" @click="$emit('row', row)">
        <header>
          <slot name="card-title" :row="row" />
        </header>
        <div class="adv-table__cardBody">
          <div v-for="col in camposCartao" :key="col.key" class="adv-table__campo">
            <span class="adv-table__campoLabel">{{ col.label }}</span>
            <span :class="{ 'is-numeric': col.numeric }">
              <slot :name="`cell-${col.key}`" :row="row">{{ row[col.key] ?? '—' }}</slot>
            </span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
/**
 * Tabela do advisor (PROMO-IA-22 §7): **um** componente para todas as superfícies.
 *
 * Contrato:
 * - as colunas vêm de fora (`columns`), o conteúdo das células também (slots `cell-<key>`), então a
 *   tabela não conhece nenhum campo de negócio;
 * - abaixo de 640 px a tabela dá lugar a cartões — a mesma informação, sem rolagem horizontal;
 * - `legenda` vira o `<caption>`, que é o que o leitor de tela lê antes dos dados.
 */
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  sort: { type: String, default: '' },
  rowKey: { type: String, default: 'item_id' },
  expandido: { type: [String, Number], default: null },
  legenda: { type: String, default: '' },
  /** Colunas mostradas no cartão do mobile (na ordem dada). */
  camposCartao: { type: Array, default: () => [] },
});

defineEmits(['sort', 'row']);

const ativo = (col) => props.sort === (col.sortKey || col.key) || props.sort === `-${col.sortKey || col.key}`;
const iconeOrdem = (col) => (props.sort === `-${col.sortKey || col.key}` ? 'arrow_downward' : 'arrow_upward');
const ariaSort = (col) => {
  if (!ativo(col)) return 'none';
  return props.sort.startsWith('-') ? 'descending' : 'ascending';
};
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.adv-table {
  &__wrap { overflow-x: auto; }
  &__caption {
    text-align: left;
    font-size: $text-xs-size;
    color: $text-muted;
    padding: 0 0 $space-2;
  }
  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: $text-small-size;

    th, td {
      text-align: left;
      padding: $space-2 $space-3;
      border-bottom: 1px solid $border;
      vertical-align: middle;
    }
    thead th {
      font-size: $text-xs-size;
      text-transform: uppercase;
      letter-spacing: .04em;
      color: $text-muted;
      white-space: nowrap;
      background: $surface-2;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    tbody tr {
      cursor: pointer;
      &:hover { background: $surface-2; }
      &.is-open { background: $tint-teal-bg; }
    }
    .is-numeric { text-align: right; font-variant-numeric: tabular-nums; }
    .is-sortable { cursor: pointer; }
    .is-active { color: $text-primary; }
  }
  &__sort {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }

  /* Cartões: só no mobile. */
  &__cards { display: none; margin: 0; padding: 0; list-style: none; }
  &__cardBody {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $space-2 $space-3;
    margin-top: $space-2;
  }
  &__campo { display: flex; flex-direction: column; gap: 1px; }
  &__campoLabel {
    font-size: $text-xs-size;
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
}

@media (max-width: 640px) {
  .adv-table {
    &__wrap { display: none; }
    &__cards {
      display: flex;
      flex-direction: column;
      gap: $space-3;

      li {
        background: $surface;
        border: 1px solid $border;
        border-radius: $radius-md;
        padding: $space-3;
      }
      li.is-open { background: $tint-teal-bg; }
    }
    &__cards header { display: flex; flex-direction: column; gap: 2px; }
  }
}
</style>
