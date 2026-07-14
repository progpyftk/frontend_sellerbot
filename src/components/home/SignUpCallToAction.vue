<template>
  <section class="cta-section" id="contact">
    <div class="cta-inner content-wrapper">

      <div class="cta-header">
        <span class="eyebrow">Próximo passo</span>
        <h2 class="cta-title">
          Pronto para levar sua empresa<br />ao varejo digital?
        </h2>
        <p class="cta-sub">
          Escolha como a Krivus pode ajudar você hoje.
        </p>
      </div>

      <div class="cta-cards">

        <div class="ccard">
          <div class="ccard-icon" style="background: rgba(13,148,136,.15); color: #14b8a6;">
            <q-icon name="support_agent" size="28px" />
          </div>
          <h3>Consultoria Krivus</h3>
          <p>
            Agende uma conversa com nosso time. Diagnóstico inicial sem custo.
            Entendemos seu negócio antes de propor qualquer coisa.
          </p>
          <ul>
            <li>✓ Diagnóstico gratuito</li>
            <li>✓ Time dedicado na sua operação</li>
            <li>✓ Estruturação B2B → B2C completa</li>
            <li>✓ Gestão contínua ML + Shopee</li>
          </ul>
          <a href="mailto:contato@krivus.com.br" class="ccard-btn ccard-btn--primary">
            Agendar conversa →
          </a>
        </div>

        <div class="ccard ccard--secondary">
          <div class="ccard-icon" style="background: rgba(99,102,241,.15); color: #818cf8;">
            <q-icon name="smart_toy" size="28px" />
          </div>
          <h3>Usar o SellerBot</h3>
          <p>
            Já vende online e quer controle financeiro real? Acesse o SellerBot.
            Sincronize suas contas e veja o lucro real de cada pedido.
          </p>
          <ul>
            <li>✓ Conta grátis para começar</li>
            <li>✓ Multi-conta ML e Shopee</li>
            <li>✓ Custo Médio do Produto e margem por venda</li>
            <li>✓ Dashboard financeiro em tempo real</li>
          </ul>
          <router-link to="/signup" class="ccard-btn ccard-btn--ghost">
            Criar conta grátis →
          </router-link>
        </div>

      </div>

      <div class="trust-note">
        <q-icon name="verified_user" size="16px" color="teal-6" />
        Sem fidelidade. Sem taxas ocultas. Só avançamos quando você avança.
      </div>

    </div>

    <!-- Decoração -->
    <div class="deco d1" />
    <div class="deco d2" />
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({ name: 'SignUpCallToAction' })
</script>

<style lang="scss" scoped>
.cta-section {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #0f172a 0%, #134e4a 50%, #0f172a 100%);
  padding: 96px 0;
}

.content-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.cta-inner { position: relative; z-index: 2; }

.cta-header {
  text-align: center;
  margin-bottom: 56px;
}

.eyebrow {
  display: inline-block;
  font-size: .73rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #2dd4bf;
  margin-bottom: 14px;
}

.cta-title {
  font-size: clamp(1.8rem, 3.5vw, 2.5rem);
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 14px;
  letter-spacing: -.8px;
  line-height: 1.2;
}

.cta-sub {
  font-size: 1.05rem;
  color: #94a3b8;
  line-height: 1.7;
}

.cta-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  max-width: 860px;
  margin: 0 auto 40px;
}

.ccard {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 20px;
  padding: 36px;
  backdrop-filter: blur(12px);
  transition: background .25s, transform .25s;

  &:hover {
    background: rgba(255,255,255,.09);
    transform: translateY(-3px);
  }

  &--secondary {
    border-color: rgba(99,102,241,.3);
  }

  h3 {
    font-size: 1.15rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 16px 0 10px;
  }

  p {
    font-size: .9rem;
    color: #94a3b8;
    line-height: 1.7;
    margin: 0 0 20px;
  }

  ul {
    list-style: none;
    margin: 0 0 28px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      font-size: .86rem;
      color: #cbd5e1;
    }
  }
}

.ccard-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ccard-btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 700;
  font-size: .92rem;
  text-decoration: none;
  transition: background .2s, box-shadow .2s;

  &--primary {
    background: #0d9488;
    color: #fff;
    &:hover {
      background: #0f766e;
      box-shadow: 0 6px 20px rgba(13,148,136,.4);
    }
  }

  &--ghost {
    background: rgba(99,102,241,.15);
    border: 1px solid rgba(99,102,241,.4);
    color: #c7d2fe;
    &:hover {
      background: rgba(99,102,241,.25);
      border-color: rgba(99,102,241,.6);
    }
  }
}

.trust-note {
  text-align: center;
  font-size: .85rem;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Deco */
.deco {
  position: absolute;
  border-radius: 50%;
  background: #2dd4bf;
  pointer-events: none;
}

.d1 { width: 400px; height: 400px; top: -180px; right: -100px; opacity: .04; }
.d2 { width: 200px; height: 200px; bottom: -80px; left: 80px; opacity: .03; background: #f59e0b; }

@media (max-width: 768px) {
  .cta-cards { grid-template-columns: 1fr; gap: 20px; }
  .cta-section { padding: 64px 0; }
  .ccard { padding: 28px; }
}
</style>
