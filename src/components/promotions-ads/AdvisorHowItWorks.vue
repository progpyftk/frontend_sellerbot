<template>
  <!--
    "Como funciona" (PROMO-IA-21 · F1): explica em linguagem de negócio o que é o assistente de
    promoções e a escrita automática. Fechado por padrão — a régua abre em um clique, e o resumo
    de uma linha (na página) já responde o dia a dia.
  -->
  <SbInfoCallout
    titulo="Como funciona o assistente de promoções"
    icon="help_outline"
    variant="info"
    detalhe
  >
    <p class="ciw__lead">
      Ele olha cada anúncio do Mercado Livre — vendas, margem, custo, frete e promoções disponíveis —
      e diz o que fazer. Com a <strong>escrita automática ligada</strong>, ele aplica a promoção no
      Mercado Livre; desligada, ele só sugere.
    </p>

    <template #detalhe>
      <h3 class="ciw__t">A régua que ele usa</h3>
      <ul class="ciw__list">
        <li>
          <strong>Quase não vende</strong> → derruba o preço até a margem chegar a
          <strong>{{ FLOOR_MARGIN_PCT }}%</strong> (desconto agressivo: pode passar de 80% em anúncio
          de margem alta).
        </li>
        <li><strong>Vende médio</strong> (1 a 3 un/semana) → <strong>sobe</strong> o preço até a margem chegar a <strong>40%</strong>.</li>
        <li><strong>Vende bem</strong> (3+ un/semana) → <strong>não mexe</strong>; só sobe o preço se a margem estiver abaixo de 30%.</li>
        <li>
          <strong>Piso:</strong> nunca abaixo de margem {{ FLOOR_MARGIN_PCT }}% <em>e</em> lucro
          {{ brl(FLOOR_PROFIT_BRL) }} por <strong>unidade vendida</strong>. Se o preço que o Mercado
          Livre oferece não permitir chegar lá, ele <strong>não escreve</strong> e registra o motivo.
        </li>
        <li>
          <strong>Não existe teto de desconto</strong> — hoje o maior desconto aplicado no seu
          catálogo foi <strong>86,2%</strong> (27 anúncios passaram de 50%). Esse limite ainda não foi
          definido por você.
        </li>
        <li>Sem <strong>custo (CMV)</strong>, sem <strong>SKU</strong> ou com <strong>tarifa/frete indefinidos</strong>, ele não calcula — e não mexe.</li>
      </ul>

      <h3 class="ciw__t">O que ele nunca faz</h3>
      <ul class="ciw__list ciw__list--never">
        <li>não escreve abaixo do piso;</li>
        <li>não mexe em anúncio com <strong>SMART</strong> ativo (o preço é ditado pelo Mercado Livre);</li>
        <li>não mexe em anúncio com <strong>cupom</strong> ativo;</li>
        <li>não apaga promoção que já está no ar;</li>
        <li>não altera o <strong>preço-base</strong>;</li>
        <li>não escreve duas vezes no mesmo anúncio no mesmo ciclo.</li>
      </ul>

      <h3 class="ciw__t">Como ele trabalha</h3>
      <p>
        Uma vez por dia, às <strong>09:00 (Brasília)</strong>, em <strong>levas</strong> (hoje: 10
        anúncios por dia). Depois de enviar, ele <strong>relê o preço</strong>; se a leitura não
        confirmar, o anúncio fica <strong>aguardando confirmação</strong> e é resolvido no ciclo
        seguinte — ele <strong>não reescreve</strong>. O ciclo tem limite de <strong>30 minutos</strong>:
        o que não foi enviado <strong>não mudou nada</strong> no Mercado Livre e volta no próximo ciclo.
        Enquanto você não aprovar a próxima leva, ele escreve no máximo 10 por dia.
      </p>

      <h3 class="ciw__t">Como parar</h3>
      <p>
        O botão <strong>Pausar toda a escrita</strong> vale <strong>na hora, inclusive no meio do
        ciclo</strong>. <strong>As promoções já aplicadas continuam no ar</strong> — esta página não
        desfaz nada; para tirar uma promoção, remova no anúncio. O <strong>kill switch</strong> é um
        controle do time (fora do painel): aqui só mostramos se está ligado.
      </p>

      <h3 class="ciw__t">Glossário</h3>
      <dl class="ciw__glossary">
        <div v-for="termo in GLOSSARIO" :key="termo.nome">
          <dt>{{ termo.nome }}</dt>
          <dd>{{ termo.texto }}</dd>
        </div>
      </dl>
    </template>
  </SbInfoCallout>
</template>

<script setup>
import SbInfoCallout from 'src/components/common/SbInfoCallout.vue';
import { FLOOR_MARGIN_PCT, FLOOR_PROFIT_BRL, brl } from 'src/utils/advisorDecision';

const GLOSSARIO = [
  { nome: 'Piso', texto: `margem mínima de ${FLOOR_MARGIN_PCT}% e lucro mínimo de ${brl(FLOOR_PROFIT_BRL)} por unidade vendida; nada é escrito abaixo disso.` },
  { nome: 'Régua', texto: 'a regra que decide a ação conforme a venda do anúncio (30% / 40% / não mexer).' },
  { nome: 'Leva', texto: 'o lote de anúncios que o robô escreve por vez (hoje: 10).' },
  { nome: 'Aprovar a leva', texto: 'seu aval para ele escrever a próxima leva; sem o aval, ele para em 10 por dia.' },
  { nome: 'SMART', texto: 'promoção cujo preço é ditado pelo Mercado Livre — o robô só observa e avisa.' },
  { nome: 'Cupom', texto: 'desconto do vendedor no checkout: o robô não escreve em anúncio com cupom ativo.' },
  { nome: 'Aguardando confirmação', texto: 'o robô escreveu e está relendo o preço no Mercado Livre; não é erro.' },
  { nome: 'Pausar escrita', texto: 'para tudo na hora, inclusive no meio do ciclo; não desfaz o que já está no ar.' },
  { nome: 'Kill switch', texto: 'trava de emergência do time (fora do painel); aqui só mostramos se está ligada.' },
  { nome: 'Reconciliar', texto: 'reler o Mercado Livre no ciclo seguinte para confirmar o que ficou pendente.' },
];
</script>

<style scoped>
.ciw__lead { margin: 0; }
.ciw__t {
  font-size: 13px;
  font-weight: 700;
  margin: 14px 0 6px;
}
.ciw__list { margin: 0 0 6px; padding-left: 20px; }
.ciw__list li { margin-bottom: 4px; }
.ciw__list--never li { list-style: '✕ '; }
.ciw__glossary { margin: 0; }
.ciw__glossary dt { font-weight: 600; margin-top: 8px; }
.ciw__glossary dd { margin: 0 0 0 16px; }
</style>
