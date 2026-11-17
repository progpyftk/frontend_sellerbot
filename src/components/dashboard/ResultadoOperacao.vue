<template>
  <div class="rop">
    <div class="rop-head">
      <div>
        <div class="rop-title">Resultado da operação</div>
        <div class="rop-note">
          Margem de contribuição − custo fixo = lucro operacional · empréstimo abaixo da linha
          <span v-if="resultado && resultado.peso < 0.999">
            · custo fixo ponderado pelo GMV ({{ pct(resultado.peso) }} do total)
          </span>
        </div>
      </div>
      <q-btn v-if="!readOnly" flat dense no-caps size="sm" icon="edit" label="Custos fixos" color="primary" @click="$emit('editar')" />
    </div>

    <div v-if="!resultado" class="rop-empty">Sem dados da cascata no período.</div>
    <template v-else>
      <div v-if="!temCustoFixo" class="rop-aviso">
        Nenhum custo fixo cadastrado para o período.
        <a v-if="!readOnly" href="#" @click.prevent="$emit('editar')">Cadastrar</a>
      </div>
      <table class="rop-table">
        <thead>
          <tr><th></th><th class="r">R$</th><th class="r">% GMV</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Margem de contribuição <span class="rop-sub">(lucro bruto)</span></td>
            <td class="r" :class="cor(resultado.margem_contribuicao)">{{ brl(resultado.margem_contribuicao) }}</td>
            <td class="r">{{ pct(resultado.margem_pct) }}</td>
          </tr>
          <tr class="rop-menos">
            <td>
              (−) Custo fixo operacional
              <span v-if="resultado.custo_fixo_por_pedido != null" class="rop-sub">· {{ brl(resultado.custo_fixo_por_pedido) }}/pedido</span>
              <q-icon v-if="itensOperacionais.length" name="help_outline" size="12px" class="rop-info">
                <q-tooltip max-width="300px">
                  <div v-for="i in itensOperacionais" :key="i.nome" class="rop-tip-row">
                    <span>{{ i.nome }}</span><span>{{ brl(i.valor * resultado.peso) }}</span>
                  </div>
                  <div class="rop-tip-foot">Valor mensal ÷ dias do mês, pelos dias do período.</div>
                </q-tooltip>
              </q-icon>
            </td>
            <td class="r">{{ brl(-resultado.custo_fixo) }}</td>
            <td class="r">{{ pct(resultado.custo_fixo_pct) }}</td>
          </tr>
          <tr class="rop-total">
            <td>= Lucro operacional</td>
            <td class="r" :class="cor(resultado.lucro_operacional)">{{ brl(resultado.lucro_operacional) }}</td>
            <td class="r" :class="cor(resultado.lucro_operacional)">{{ pct(resultado.lucro_operacional_pct) }}</td>
          </tr>
          <tr class="rop-menos">
            <td>(−) Empréstimo <span class="rop-sub">(parcela)</span></td>
            <td class="r">{{ brl(-resultado.emprestimo) }}</td>
            <td class="r">{{ pct(resultado.emprestimo_pct) }}</td>
          </tr>
          <tr class="rop-total">
            <td>= Sobra de caixa</td>
            <td class="r" :class="cor(resultado.sobra_caixa)">{{ brl(resultado.sobra_caixa) }}</td>
            <td class="r" :class="cor(resultado.sobra_caixa)">{{ pct(resultado.sobra_caixa_pct) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="porEmpresa.length > 1" class="rop-emp">
        <div class="rop-emp-title">Por empresa <span class="rop-sub">(custo fixo ponderado pelo faturamento)</span></div>
        <table class="rop-table">
          <thead>
            <tr><th>Empresa</th><th class="r">GMV</th><th class="r">Margem contrib.</th><th class="r">Custo fixo</th><th class="r">Lucro operacional</th><th class="r">Sobra de caixa</th></tr>
          </thead>
          <tbody>
            <tr v-for="e in porEmpresa" :key="e.chave">
              <td>{{ e.nome }}</td>
              <td class="r">{{ brl(e.r.gmv) }} <span class="rop-sub">{{ pct(e.r.peso) }}</span></td>
              <td class="r">{{ brl(e.r.margem_contribuicao) }}</td>
              <td class="r">{{ brl(-e.r.custo_fixo) }}</td>
              <td class="r" :class="cor(e.r.lucro_operacional)">{{ brl(e.r.lucro_operacional) }} <span class="rop-sub">{{ pct(e.r.lucro_operacional_pct) }}</span></td>
              <td class="r" :class="cor(e.r.sobra_caixa)">{{ brl(e.r.sobra_caixa) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div class="rop-disclaimer">
      <q-icon name="info" size="13px" /> Valores calculados considerando empresa do <strong>Simples Nacional</strong>.
      Lucro Real ou Presumido exigem outra análise.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resultadoOperacao } from 'src/utils/resultadoPedido'

const props = defineProps({
  cascata: { type: Object, default: null },        // total filtrado (agregarCascata)
  custoFixo: { type: Object, default: null },      // { operacional, financeiro, itens } do resumo
  gmvTotal: { type: Number, default: 0 },          // GMV de todas as contas: base da ponderação
  empresas: { type: Array, default: () => [] },    // [{ chave, nome, gmv, lucro_bruto, pedidos }]
  readOnly: { type: Boolean, default: false },
})
defineEmits(['editar'])

const resultado = computed(() => resultadoOperacao(props.cascata, props.custoFixo, props.gmvTotal))
const temCustoFixo = computed(() => !!(props.custoFixo && (props.custoFixo.operacional || props.custoFixo.financeiro)))
const itensOperacionais = computed(() => (props.custoFixo?.itens || []).filter(i => i.grupo === 'operacional' && i.valor))
const porEmpresa = computed(() => props.empresas
  .map(e => ({ ...e, r: resultadoOperacao(e, props.custoFixo, props.gmvTotal) }))
  .filter(e => e.r))

const brl = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const pct = (v) => (v == null ? '—' : (v * 100).toFixed(1).replace('.', ',') + '%')
const cor = (v) => (Number(v) < 0 ? 'neg' : 'pos')
</script>

<style scoped>
.rop { margin-top: 12px; background: #fff; border-radius: 12px; padding: 12px 16px 10px; }
.rop-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.rop-title { font-size: 12px; font-weight: 700; color: #2d3748; }
.rop-note, .rop-sub { font-size: 11px; color: #a0aec0; font-weight: 400; }
.rop-empty, .rop-aviso { font-size: 12px; color: #718096; padding: 8px 0; }
.rop-aviso { color: #b7791f; }
.rop-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
.rop-table th { font-size: 11px; color: #a0aec0; font-weight: 600; text-align: left; padding: 4px 6px; }
.rop-table td { padding: 5px 6px; border-top: 1px solid #edf2f7; color: #2d3748; }
.rop-table .r { text-align: right; white-space: nowrap; }
.rop-menos td { color: #4a5568; }
.rop-total td { font-weight: 700; background: #f7fafc; }
.rop-emp { margin-top: 12px; overflow-x: auto; }
.rop-emp-title { font-size: 12px; font-weight: 700; color: #2d3748; }
.rop-info { color: #a0aec0; margin-left: 4px; cursor: help; }
.rop-tip-row { display: flex; justify-content: space-between; gap: 16px; }
.rop-tip-foot { margin-top: 6px; opacity: .75; font-size: 11px; }
.rop-disclaimer { margin-top: 10px; font-size: 11px; color: #718096; display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.pos { color: #16a34a; }
.neg { color: #dc2626; }
</style>
