<template>
  <!-- Bloco "Resultado do pedido" do detalhe (CUSTO-14): a cascata em linhas, com os componentes. -->
  <div class="cd">
    <div class="cd-title">
      <q-icon name="account_tree" size="15px" class="q-mr-xs" />Resultado do pedido
      <span v-if="resultado" class="cd-meta">rates de {{ formatDiaMes(resultado.snapshot_data) }}</span>
    </div>

    <div v-if="!resultado" class="cd-vazio">
      {{ textoMotivo(motivo) }}
      <router-link v-if="motivoPedeConfiguracao(motivo)" :to="ROTA_PARAMETROS_MARGEM" class="cd-link">Abrir Parâmetros da margem</router-link>
    </div>

    <template v-else>
      <template v-for="c in COLUNAS_CASCATA" :key="c.chave">
        <div :class="['cd-row', c.subtotal ? 'cd-row--sub' : '']">
          <span class="cd-label">
            {{ c.sinal < 0 ? '(−)' : c.subtotal ? '(=)' : '' }} {{ rotulo(c) }}
            <span v-if="extra(c.chave)" class="cd-extra">{{ extra(c.chave) }}</span>
          </span>
          <span :class="['cd-val', classe(c)]">
            {{ c.sinal < 0 && resultado[c.chave] ? '−' : '' }}{{ moeda(Math.abs(Number(resultado[c.chave] || 0))) }}
            <span v-if="c.chave === 'lucro_bruto'" :class="['cd-pill', resultado.lucro_bruto >= 0 ? 'pos' : 'neg']">
              {{ fmtPct(margemPct(resultado)) }} do GMV
            </span>
          </span>
        </div>
        <div v-for="([rot, v], i) in detalhes(c.chave)" :key="c.chave + i" class="cd-row cd-row--det">
          <span class="cd-label">{{ rot }}</span>
          <span class="cd-val">{{ typeof v === 'number' ? moeda(v) : v }}</span>
        </div>
      </template>

      <div class="cd-row cd-row--info">
        <span class="cd-label">Repasse do {{ canal === 'shopee' ? 'Shopee' : 'Mercado Livre' }}{{ resultado.repasse_estimado ? ' (estimado)' : '' }}</span>
        <span class="cd-val">{{ moeda(resultado.repasse) }}</span>
      </div>
      <div v-if="resultado.custo_incompleto" class="cd-aviso">
        {{ resultado.unidades_sem_custo }} unidade(s) sem custo no Tiny: o custo do produto e o lucro bruto estão incompletos.
      </div>
      <div v-if="resultado.ads_parcial" class="cd-aviso">
        O gasto de Ads deste dia ainda não chegou (D+1); o rateio é refeito no próximo sync.
      </div>
    </template>
  </div>
</template>

<script setup>
import {
  COLUNAS_CASCATA, ROTA_PARAMETROS_MARGEM, formatAliquota, formatDiaMes, linhasEmbalagens, linhasFrete, margemPct,
  motivoPedeConfiguracao, rotuloOrigemCustoPedido, rotuloOrigemImposto, textoMotivo,
} from 'src/utils/resultadoPedido'

const props = defineProps({
  resultado: { type: Object, default: null },
  canal: { type: String, default: 'ml' },
  motivo: { type: String, default: null },
})

const moeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0))
const fmtPct = (v) => (v == null ? '—' : `${String(v).replace('.', ',')}%`)

const rotulo = (c) => (c.chave === 'taxas' ? `Taxas ${props.canal === 'shopee' ? 'Shopee' : 'ML'}` : c.rotulo)

const extra = (chave) => {
  const r = props.resultado
  const o = r.origens || {}
  const com = (base, origem) => (origem ? `${base} · ${origem}` : base)
  if (chave === 'imposto') return com(formatAliquota(r.aliquota_imposto), rotuloOrigemImposto(o.aliquota))
  if (chave === 'producao') return rotuloOrigemCustoPedido(o.producao)
  if (chave === 'embalagens') return rotuloOrigemCustoPedido(o.embalagem)
  if (chave === 'produto') return `${r.unidades} un.`
  return ''
}

const detalhes = (chave) => {
  const r = props.resultado
  if (chave === 'frete') return linhasFrete(r)
  if (chave === 'embalagens') return linhasEmbalagens(r)
  return []
}

const classe = (c) => {
  const v = Number(props.resultado[c.chave] || 0)
  if (c.chave === 'lucro_bruto') return v >= 0 ? 'pos' : 'neg'
  if (c.subtotal || c.sinal > 0) return 'forte'
  return v ? 'ded' : 'zero'
}
</script>

<style scoped>
.cd { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-top: 12px; background: #fff; }
.cd-title { display: flex; align-items: center; font-weight: 700; font-size: 13px; color: #2d3748; margin-bottom: 8px; }
.cd-meta { margin-left: auto; font-weight: 400; font-size: 11px; color: #718096; }
.cd-vazio { font-size: 12px; color: #718096; }
.cd-link { margin-left: 4px; color: #3182ce; }
.cd-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 3px 0; font-size: 12.5px; }
.cd-row--sub { border-top: 1px solid #e2e8f0; margin-top: 2px; padding-top: 5px; font-weight: 700; }
.cd-row--det { padding: 0 0 0 18px; font-size: 11.5px; color: #718096; }
.cd-row--info { border-top: 1px dashed #e2e8f0; margin-top: 6px; padding-top: 6px; color: #718096; font-size: 11.5px; }
.cd-label { color: #4a5568; }
.cd-extra { color: #a0aec0; font-size: 11px; margin-left: 4px; }
.cd-val { font-variant-numeric: tabular-nums; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.cd-val.ded { color: #c05621; }
.cd-val.zero { color: #a0aec0; }
.cd-val.forte { color: #2d3748; font-weight: 600; }
.cd-val.pos { color: #2f855a; font-weight: 700; }
.cd-val.neg { color: #c53030; font-weight: 700; }
.cd-pill { font-size: 10.5px; border-radius: 10px; padding: 0 6px; }
.cd-pill.pos { background: #c6f6d5; color: #22543d; }
.cd-pill.neg { background: #fed7d7; color: #742a2a; }
.cd-aviso { margin-top: 6px; font-size: 11px; color: #975a16; background: #fefcbf; border-radius: 6px; padding: 4px 8px; }
</style>
