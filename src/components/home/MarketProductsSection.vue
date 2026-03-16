<template>
  <section class="transition-section" id="shopee">
    <div class="content-wrapper">

      <div class="section-header">
        <span class="eyebrow">A jornada B2B → B2C</span>
        <h2 class="section-title">
          Por que empresas B2B estão expandindo<br />
          para o varejo online — e como ajudamos
        </h2>
        <p class="section-sub">
          Distribuidoras, fabricantes e atacadistas que vendem hoje para revendedores
          estão descobrindo que podem chegar direto ao consumidor final — com margens
          melhores e sem depender de intermediários.
        </p>
      </div>

      <!-- Antes x Depois -->
      <div class="compare-grid">
        <div class="compare-card compare-before">
          <div class="compare-label">
            <q-icon name="business_center" size="16px" />
            Operação B2B hoje
          </div>
          <ul>
            <li v-for="item in before" :key="item">
              <span class="ic-neg">✕</span>{{ item }}
            </li>
          </ul>
        </div>

        <div class="compare-arrow">
          <div class="arrow-circle">
            <q-icon name="arrow_forward" size="22px" color="white" />
          </div>
          <span>Com a Krivos</span>
        </div>

        <div class="compare-card compare-after">
          <div class="compare-label">
            <q-icon name="rocket_launch" size="16px" />
            Operação B2B + B2C
          </div>
          <ul>
            <li v-for="item in after" :key="item">
              <span class="ic-pos">✓</span>{{ item }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Marketplaces -->
      <div class="mp-strip">
        <div class="mp-title">Canais onde atuamos</div>
        <div class="mp-cards">
          <div class="mp-card">
            <div class="mp-icon" style="background: rgba(255,230,0,.12); color: #fbbf24;">
              <q-icon name="storefront" size="28px" />
            </div>
            <div>
              <strong>Mercado Livre</strong>
              <p>Maior marketplace da América Latina. Gerenciamos anúncios, pedidos e financeiro.</p>
            </div>
          </div>
          <div class="mp-card">
            <div class="mp-icon" style="background: rgba(249,115,22,.12); color: #fb923c;">
              <q-icon name="shopping_bag" size="28px" />
            </div>
            <div>
              <strong>Shopee</strong>
              <p>Plataforma em rápido crescimento com alto volume de tráfego e campanhas agressivas.</p>
            </div>
          </div>
          <div class="mp-card">
            <div class="mp-icon" style="background: rgba(99,102,241,.12); color: #818cf8;">
              <q-icon name="hub" size="28px" />
            </div>
            <div>
              <strong>Tiny ERP</strong>
              <p>Integração completa de estoque, NF-e e financeiro entre os canais B2B e B2C.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'MarketProductsSection',
  data () {
    return {
      before: [
        'Depende de revendedores para chegar ao consumidor',
        'Margens comprimidas pelo canal intermediário',
        'Sem visibilidade do consumidor final',
        'Crescimento limitado ao volume de distribuidores',
        'Sem presença digital relevante',
      ],
      after: [
        'Vende direto ao consumidor final via marketplace',
        'Margem maior eliminando intermediários',
        'Dados reais de demanda e preferências do cliente',
        'Crescimento escalável sem depender de terceiros',
        'Marca presente onde o consumidor compra',
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.transition-section {
  background: #fff;
  padding: 96px 0;
}

.content-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  margin-bottom: 64px;
}

.eyebrow {
  display: inline-block;
  font-size: .73rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #0d9488;
  margin-bottom: 12px;
}

.section-title {
  font-size: clamp(1.75rem, 3vw, 2.35rem);
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px;
  letter-spacing: -.7px;
  line-height: 1.2;
}

.section-sub {
  font-size: 1rem;
  color: #64748b;
  line-height: 1.72;
  max-width: 640px;
  margin: 0 auto;
}

/* Before / After compare */
.compare-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 24px;
  align-items: start;
  margin-bottom: 72px;
}

.compare-card {
  border-radius: 16px;
  padding: 28px;

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;

    li {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font-size: .9rem;
      line-height: 1.5;
    }
  }
}

.compare-before {
  background: #fff5f5;
  border: 1px solid #fecaca;

  li { color: #7f1d1d; }
}

.compare-after {
  background: #f0fdf9;
  border: 1px solid #99f6e4;

  li { color: #134e4a; }
}

.compare-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 20px;

  .compare-before & { color: #ef4444; }
  .compare-after & { color: #0d9488; }
}

.ic-neg { color: #ef4444; font-weight: 700; flex-shrink: 0; }
.ic-pos { color: #0d9488; font-weight: 700; flex-shrink: 0; }

.compare-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 60px;

  span {
    font-size: .72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: #94a3b8;
    white-space: nowrap;
  }
}

.arrow-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(13,148,136,.35);
}

/* Marketplace strip */
.mp-strip { border-top: 1px solid #e2e8f0; padding-top: 48px; }

.mp-title {
  font-size: .75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: #94a3b8;
  margin-bottom: 24px;
  text-align: center;
}

.mp-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.mp-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 22px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  transition: box-shadow .2s;

  &:hover { box-shadow: 0 6px 20px rgba(0,0,0,.07); }

  strong { display: block; font-size: .95rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  p { font-size: .83rem; color: #64748b; margin: 0; line-height: 1.55; }
}

.mp-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .compare-grid { grid-template-columns: 1fr; }
  .compare-arrow { flex-direction: row; padding-top: 0; padding: 8px 0; }
  .transition-section { padding: 64px 0; }
}
</style>
