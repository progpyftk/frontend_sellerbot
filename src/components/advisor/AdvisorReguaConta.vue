<template>
  <div class="regua">
    <p v-if="titulo" class="regua__topo">
      <strong>{{ titulo }}</strong>
      <span class="regua__resumo">
        mínimo de {{ pct(Number(conta.regua?.margin_pct)) }} de margem ·
        {{ brl(Number(conta.regua?.profit_brl)) }} de lucro
      </span>
    </p>

    <div class="regua__corpo">
      <q-select
        dense outlined emit-value map-options
        :model-value="null" :options="presetOpcoes"
        label="Aplicar um modelo pronto (preenche os 4 campos abaixo)"
        :disable="salvando"
        @update:model-value="(v) => v && aplicarPreset(conta, v)"
      />

      <div class="regua__campos">
        <div v-for="campo in CAMPOS" :key="campo.key" class="regua__campo">
          <q-input
            v-model.number="rascunho[campo.key]" type="number" dense outlined
            :suffix="campo.suffix" :prefix="campo.prefix" :label="campo.label"
            :aria-label="campo.label" :disable="salvando"
            @blur="salvarCampo(conta, campo.key)"
          >
            <template v-if="campo.hint" #hint>{{ campo.hint }}</template>
          </q-input>
          <div class="regua__selo">
            <span class="regua__badge" :class="{ 'is-ajuste': ehOverride(campo.key) }">
              {{ ehOverride(campo.key) ? 'sua conta' : 'padrão da plataforma' }}
            </span>
            <q-btn
              v-if="ehOverride(campo.key)" flat dense no-caps size="sm"
              icon="settings_backup_restore" label="Restaurar padrão"
              :disable="salvando" @click="restaurar(campo.key)"
            />
          </div>
        </div>
      </div>

      <details class="regua__avancado">
        <summary>Avançado</summary>
        <div class="regua__campos">
          <div v-for="campo in CAMPOS_AVANCADOS" :key="campo.key" class="regua__campo">
            <q-input
              v-model.number="rascunho[campo.key]" type="number" dense outlined
              :suffix="campo.suffix" :prefix="campo.prefix" :label="campo.label"
              :aria-label="campo.label" :disable="salvando"
              @blur="salvarCampo(conta, campo.key)"
            >
              <template v-if="campo.hint" #hint>{{ campo.hint }}</template>
            </q-input>
            <div class="regua__selo">
              <span class="regua__badge" :class="{ 'is-ajuste': ehOverride(campo.key) }">
                {{ ehOverride(campo.key) ? 'sua conta' : 'padrão da plataforma' }}
              </span>
              <q-btn
                v-if="ehOverride(campo.key)" flat dense no-caps size="sm"
                icon="settings_backup_restore" label="Restaurar padrão"
                :disable="salvando" @click="restaurar(campo.key)"
              />
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
/**
 * Editor da régua de limites de UMA conta (PROMO-IA-56 · PROMO-CFG-2/3).
 *
 * Compartilhado entre Automação ("Limites desta conta") e Análises (popover do
 * "mín." e do botão de limites). Cada campo mostra se é AJUSTE da conta
 * (`regua_overrides`) ou padrão da plataforma; "Restaurar padrão" manda `null`,
 * que no backend limpa o override e volta ao default (que é como já está).
 * Toda a lógica de gravação fica em `useAdvisorAutomation` — este componente só
 * apresenta e dispara `salvarCampo`/`aplicarPreset`.
 */
import { computed } from 'vue';

import { brl, pct } from 'src/utils/advisorDecision';

const props = defineProps({
  conta: { type: Object, required: true },
  reguas: { type: Object, required: true },
  salvando: { type: Boolean, default: false },
  presets: { type: Object, required: true },
  salvarCampo: { type: Function, required: true },
  aplicarPreset: { type: Function, required: true },
  titulo: { type: String, default: '' },
});

const CAMPOS = [
  {
    key: 'floor_margin_pct', label: 'Margem mínima', suffix: '%',
    hint: 'Nenhuma escrita passa por baixo — nem o robô, nem uma ativação manual.',
  },
  { key: 'floor_profit_brl', label: 'Lucro mínimo por venda', prefix: 'R$' },
  {
    key: 'target_margin_parado_pct', label: 'Alvo de margem — parado/fraco', suffix: '%',
    hint: 'Até onde o robô pode aprofundar desconto para destravar a venda.',
  },
  {
    key: 'target_margin_medio_pct', label: 'Alvo de margem — vendas médias', suffix: '%',
    hint: 'Abaixo disso com vendas médias, o robô reduz o desconto.',
  },
];

const CAMPOS_AVANCADOS = [
  {
    key: 'high_turnover_margin_pct', label: 'Teto de margem — vendas altas', suffix: '%',
    hint: 'Margem mínima para considerar vendas altas "sem necessidade de agir".',
  },
  {
    key: 'smart_signal_margin_pct', label: 'Margem mínima para sinalizar (SMART)', suffix: '%',
    hint: 'Abaixo disso num anúncio SMART, o robô sinaliza (nunca escreve — preço é do ML).',
  },
];

const rascunho = computed(() => props.reguas?.[props.conta.account_id] || {});

const presetOpcoes = computed(() => Object.entries(props.presets || {})
  .map(([value, p]) => ({ value, label: p.label })));

function ehOverride(campo) {
  return Boolean((props.conta.regua_overrides || []).includes(campo));
}

function restaurar(campo) {
  rascunho.value[campo] = null;
  props.salvarCampo(props.conta, campo);
}
</script>

<style scoped lang="scss">
@import 'src/css/tokens.scss';

.regua {
  &__topo {
    margin: 0 0 $space-2;
    font-size: $text-small-size;
  }
  &__resumo { margin-left: $space-2; color: $text-muted; }
  &__corpo {
    display: flex;
    flex-direction: column;
    gap: $space-3;
    max-width: 640px;
  }
  &__campos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: $space-3;
  }
  &__campo {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  &__selo {
    display: flex;
    align-items: center;
    gap: $space-2;
  }
  &__badge {
    font-size: $text-xs-size;
    padding: 1px 8px;
    border: 1px solid $border;
    border-radius: 999px;
    color: $text-muted;

    &.is-ajuste { border-color: $primary; color: $primary; }
  }
  &__avancado {
    summary {
      cursor: pointer;
      color: $text-muted;
      font-size: $text-xs-size;
      list-style: none;
      &::-webkit-details-marker { display: none; }
      &::before { content: '▸ '; }
    }
    &[open] summary::before { content: '▾ '; }
    .regua__campos { margin-top: $space-2; }
  }
}
</style>
