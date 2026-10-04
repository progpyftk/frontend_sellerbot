<template>
  <section class="plans-section" id="plans">
    <div class="content-wrapper">

      <div class="section-header">
        <span class="eyebrow">Modelos de parceria</span>
        <h2 class="section-title">Investimento que se paga</h2>
        <p class="section-sub">
          Do acesso à ferramenta até a consultoria completa — escolha o modelo
          que faz sentido para o momento da sua empresa.
        </p>
      </div>

      <div class="plans-grid">
        <div v-for="plan in plans" :key="plan.name" class="plan-card" :class="{ 'plan-card--popular': plan.popular }">
          <div v-if="plan.popular" class="plan-ribbon">Mais escolhido</div>

          <div class="plan-top">
            <div class="plan-icon" :style="{ background: plan.iconBg, color: plan.iconColor }">
              <q-icon :name="plan.icon" size="22px" />
            </div>
            <div>
              <div class="plan-name">{{ plan.name }}</div>
              <div class="plan-tagline">{{ plan.tagline }}</div>
            </div>
          </div>

          <div class="plan-price">
            <template v-if="plan.priceType === 'free'">
              <span class="price-main">Grátis</span>
            </template>
            <template v-else-if="plan.priceType === 'fixed'">
              <span class="price-prefix">R$</span>
              <span class="price-main">{{ plan.price }}</span>
              <span class="price-period">/mês</span>
            </template>
            <template v-else>
              <span class="price-main price-consult">Consulte</span>
            </template>
          </div>

          <q-separator class="q-my-md" :style="{ borderColor: plan.popular ? '#a51e55' : '#b8cbd6' }" />

          <ul class="plan-features">
            <li v-for="f in plan.features" :key="f.text" :class="{ 'feat--off': f.off }">
              <span class="feat-check" :style="f.off ? { color: '#93aebb' } : { color: plan.iconColor }">
                {{ f.off ? '–' : '✓' }}
              </span>
              <span>{{ f.text }}</span>
            </li>
          </ul>

          <component
            :is="plan.link ? 'router-link' : 'a'"
            :to="plan.link"
            :href="plan.href"
            class="plan-cta"
            :class="{ 'plan-cta--primary': plan.popular, 'plan-cta--ghost': !plan.popular }"
          >
            {{ plan.cta }}
          </component>
        </div>
      </div>

      <div class="plans-note">
        <q-icon name="info_outline" size="15px" />
        Todos os planos de consultoria incluem reunião de diagnóstico gratuita antes da proposta.
      </div>

    </div>
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'PlanSelectionSection',
  data () {
    return {
      plans: [
        {
          icon: 'smart_toy',
          iconBg: 'rgba(165,30,85,.1)',
          iconColor: '#a51e55',
          name: 'SellerBot Starter',
          tagline: 'Para quem quer começar com controle financeiro.',
          priceType: 'free',
          price: null,
          popular: false,
          cta: 'Criar conta grátis',
          link: '/signup',
          href: null,
          features: [
            { text: '1 conta Mercado Livre', off: false },
            { text: 'Até 100 anúncios sincronizados', off: false },
            { text: 'Painel de pedidos', off: false },
            { text: 'Resumo financeiro básico', off: false },
            { text: 'Custo Médio do Produto e margem', off: true },
            { text: 'Sync automático', off: true },
            { text: 'Shopee', off: true },
          ],
        },
        {
          icon: 'manage_accounts',
          iconBg: 'rgba(165,30,85,.15)',
          iconColor: '#a51e55',
          name: 'SellerBot Pro',
          tagline: 'Para sellers que querem controle total da operação.',
          priceType: 'fixed',
          price: '89',
          popular: true,
          cta: 'Assinar o Pro',
          link: '/signup',
          href: null,
          features: [
            { text: 'Até 3 contas ML', off: false },
            { text: 'Anúncios ilimitados', off: false },
            { text: 'Sync automático em tempo real', off: false },
            { text: 'Custo Médio do Produto e lucro real por venda', off: false },
            { text: 'Integração Tiny ERP', off: false },
            { text: 'Dashboard diário', off: false },
            { text: 'Shopee (em breve)', off: false },
          ],
        },
        {
          icon: 'groups',
          iconBg: 'rgba(245,158,11,.1)',
          iconColor: '#f59e0b',
          name: 'Krivus Consultoria',
          tagline: 'Transição B2B → B2C com time dedicado.',
          priceType: 'consult',
          price: null,
          popular: false,
          cta: 'Agendar diagnóstico',
          link: null,
          href: 'mailto:contato@krivus.com.br',
          features: [
            { text: 'SellerBot Pro incluso', off: false },
            { text: 'Diagnóstico completo da operação', off: false },
            { text: 'Estruturação inicial B2B → B2C', off: false },
            { text: 'Time dedicado exclusivo', off: false },
            { text: 'Gestão contínua ML + Shopee', off: false },
            { text: 'Integração ERP personalizada', off: false },
            { text: 'Relatórios e KPIs semanais', off: false },
          ],
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.plans-section {
  background: #edf4f7;
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
  color: #a51e55;
  margin-bottom: 12px;
}

.section-title {
  font-size: clamp(1.75rem, 3vw, 2.4rem);
  font-weight: 800;
  color: #101e2b;
  margin: 0 0 16px;
  letter-spacing: -.7px;
}

.section-sub {
  font-size: 1rem;
  color: #4c6272;
  line-height: 1.72;
  max-width: 560px;
  margin: 0 auto;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
  align-items: start;
}

.plan-card {
  background: #fff;
  border: 1px solid #b8cbd6;
  border-radius: 20px;
  padding: 32px;
  position: relative;
  transition: transform .25s, box-shadow .25s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,.09);
  }

  &--popular {
    border-color: #a51e55;
    box-shadow: 0 0 0 1px #a51e55, 0 10px 32px rgba(165,30,85,.12);
  }
}

.plan-ribbon {
  position: absolute;
  top: -1px;
  right: 24px;
  background: #a51e55;
  color: #fff;
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 0 0 10px 10px;
}

.plan-top {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 20px;
}

.plan-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plan-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: #101e2b;
}

.plan-tagline {
  font-size: .8rem;
  color: #6b8498;
  margin-top: 2px;
  line-height: 1.4;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.price-prefix { font-size: 1rem; font-weight: 700; color: #4c6272; }

.price-main {
  font-size: 2rem;
  font-weight: 800;
  color: #101e2b;
  line-height: 1;
}

.price-consult { font-size: 1.4rem; color: #f59e0b; }

.price-period { font-size: .85rem; color: #6b8498; }

.plan-features {
  list-style: none;
  margin: 0 0 28px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.feat-check { font-weight: 700; flex-shrink: 0; min-width: 16px; }

li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: .87rem;
  color: #4c6272;
  line-height: 1.4;

  &.feat--off { color: #93aebb; }
}

.plan-cta {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  font-weight: 700;
  font-size: .92rem;
  text-decoration: none;
  transition: background .2s, box-shadow .2s, border-color .2s;

  &--primary {
    background: #a51e55;
    color: #fff;
    &:hover { background: #7f1642; box-shadow: 0 6px 20px rgba(165,30,85,.35); }
  }

  &--ghost {
    border: 1.5px solid #b8cbd6;
    color: #4c6272;
    &:hover { border-color: #a51e55; color: #a51e55; }
  }
}

.plans-note {
  text-align: center;
  font-size: .85rem;
  color: #6b8498;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

@media (max-width: 600px) {
  .plans-section { padding: 64px 0; }
}
</style>
