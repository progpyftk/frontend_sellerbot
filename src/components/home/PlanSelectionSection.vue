<template>
  <section class="plans-section">
    <div class="content-wrapper">
      <div class="sec-eyebrow">Planos</div>
      <h2 class="sec-title">Simples e transparente</h2>
      <p class="sec-sub">Sem taxa sobre vendas. Pague apenas pela plataforma.</p>

      <div class="plans-grid">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="plan-card"
          :class="{ 'plan-card--popular': plan.popular }"
        >
          <div v-if="plan.popular" class="popular-ribbon">Mais popular</div>

          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-price">
            <span v-if="plan.price === 'Grátis'" class="price-free">Grátis</span>
            <template v-else-if="plan.price === 'Consulte'">
              <span class="price-consult">Consulte</span>
            </template>
            <template v-else>
              <span class="price-currency">R$</span>
              <span class="price-value">{{ plan.price }}</span>
              <span class="price-period">/mês</span>
            </template>
          </div>
          <p class="plan-tagline">{{ plan.tagline }}</p>

          <q-separator class="q-my-md" />

          <ul class="plan-features">
            <li v-for="f in plan.features" :key="f.text" :class="{ disabled: f.disabled }">
              <q-icon :name="f.disabled ? 'remove' : 'check'" size="15px" :color="f.disabled ? 'grey-5' : 'teal-7'" />
              {{ f.text }}
            </li>
          </ul>

          <div class="plan-cta">
            <q-btn
              :unelevated="plan.popular"
              :outline="!plan.popular"
              :color="plan.popular ? 'primary' : 'grey-7'"
              :label="plan.cta"
              no-caps
              class="cta-btn"
              :to="plan.price === 'Consulte' ? null : '/signup'"
            />
          </div>
        </div>
      </div>

      <p class="plans-footer">Todos os planos incluem acesso ao painel de anúncios, pedidos e financeiro. Sem fidelidade.</p>
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
          name: 'Starter',
          price: 'Grátis',
          tagline: 'Teste o SellerBot sem compromisso.',
          popular: false,
          cta: 'Começar grátis',
          features: [
            { text: '1 conta Mercado Livre' },
            { text: 'Até 100 anúncios' },
            { text: 'Sync manual de dados' },
            { text: 'Painel de pedidos' },
            { text: 'Resumo financeiro básico' },
            { text: 'CMV e Tiny ERP', disabled: true },
            { text: 'Sync automático', disabled: true },
          ],
        },
        {
          name: 'Pro',
          price: '89',
          tagline: 'Para sellers que querem escalar com controle.',
          popular: true,
          cta: 'Assinar o Pro',
          features: [
            { text: 'Até 3 contas Mercado Livre' },
            { text: 'Anúncios ilimitados' },
            { text: 'Sync automático' },
            { text: 'Painel financeiro completo' },
            { text: 'CMV por produto e SKU' },
            { text: 'Integração Tiny ERP' },
            { text: 'Dashboard de vendas diário' },
          ],
        },
        {
          name: 'Business',
          price: '199',
          tagline: 'Operações grandes com múltiplas contas.',
          popular: false,
          cta: 'Assinar o Business',
          features: [
            { text: 'Contas ML ilimitadas' },
            { text: 'Multi-usuário' },
            { text: 'Tudo do plano Pro' },
            { text: 'Suporte prioritário' },
            { text: 'Relatórios avançados' },
            { text: 'API de integração' },
            { text: 'Onboarding dedicado' },
          ],
        },
        {
          name: 'Enterprise',
          price: 'Consulte',
          tagline: 'Solução personalizada para grandes operações.',
          popular: false,
          cta: 'Falar com a equipe',
          features: [
            { text: 'Recursos customizados' },
            { text: 'SLA garantido' },
            { text: 'Suporte dedicado 24/7' },
            { text: 'Implantação assistida' },
            { text: 'Integrações sob medida' },
            { text: 'Contrato flexível' },
            { text: 'Dashboard white-label' },
          ],
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.plans-section {
  background: #f0fdf9;
  padding: 96px 20px;
}

.content-wrapper { max-width: 1200px; margin: 0 auto; }

.sec-eyebrow {
  text-align: center;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #0d9488;
  margin-bottom: 14px;
}

.sec-title {
  text-align: center;
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 14px;
  letter-spacing: -.5px;
}

.sec-sub {
  text-align: center;
  font-size: 1rem;
  color: #64748b;
  margin: 0 auto 64px;
  line-height: 1.7;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  align-items: start;
}

.plan-card {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 18px;
  padding: 32px 28px;
  position: relative;
  transition: box-shadow .25s, transform .25s;

  &:hover {
    box-shadow: 0 12px 40px rgba(13,148,136,.1);
    transform: translateY(-4px);
  }

  &--popular {
    border-color: #0d9488;
    box-shadow: 0 8px 32px rgba(13,148,136,.18);
  }
}

.popular-ribbon {
  position: absolute;
  top: -1px;
  right: 20px;
  background: #0d9488;
  color: #fff;
  font-size: .72rem;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 0 0 10px 10px;
}

.plan-name {
  font-size: .85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #64748b;
  margin-bottom: 12px;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-bottom: 8px;
}

.price-free    { font-size: 2.2rem; font-weight: 800; color: #0f172a; }
.price-consult { font-size: 1.8rem; font-weight: 800; color: #0f172a; }
.price-currency { font-size: 1.1rem; font-weight: 700; color: #64748b; }
.price-value   { font-size: 2.4rem; font-weight: 800; color: #0f172a; line-height: 1; }
.price-period  { font-size: .85rem; color: #94a3b8; margin-left: 2px; }

.plan-tagline {
  font-size: .86rem;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: .87rem;
    color: #475569;

    &.disabled {
      color: #94a3b8;
      text-decoration: line-through;
    }
  }
}

.plan-cta { margin-top: 28px; }

.cta-btn {
  width: 100%;
  border-radius: 10px;
  font-weight: 700;
  font-size: .92rem;
  padding: 10px 0;
}

.plans-footer {
  text-align: center;
  font-size: .82rem;
  color: #94a3b8;
  margin-top: 40px;
}
</style>
