<template>
  <section class="sellerbot-section" id="sellerbot">
    <div class="content-wrapper">
      <div class="row items-center q-col-gutter-xl">

        <!-- Visual lado esquerdo -->
        <div class="col-12 col-md-6">
          <div class="visual-block">
            <div class="img-frame">
              <div class="img-badge">
                <q-icon name="smart_toy" size="14px" style="color:#fff" />
                Dashboard SellerBot
              </div>
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"
                alt="Dashboard SellerBot — analytics e controle de vendas"
                class="dashboard-img"
              />
            </div>
          </div>
        </div>

        <!-- Texto lado direito -->
        <div class="col-12 col-md-6">
          <div class="sec-eyebrow">SellerBot</div>
          <h2 class="sec-title">
            Nossa ferramenta exclusiva para<br />
            sellers do Mercado Livre
          </h2>
          <p class="sec-sub">
            Gerencie anúncios, pedidos e financeiro em um único lugar.
            O SellerBot foi desenvolvido pela Krivos para resolver os problemas reais
            de quem vende no Mercado Livre todos os dias.
          </p>

          <div class="items-grid">
            <div v-for="item in items" :key="item.title" class="item-row">
              <div class="item-icon">
                <q-icon :name="item.icon" size="22px" color="teal-7" />
              </div>
              <div>
                <div class="item-title">{{ item.title }}</div>
                <div class="item-desc">{{ item.desc }}</div>
              </div>
            </div>
          </div>

          <div class="section-cta">
            <q-btn unelevated color="primary" label="Acessar o SellerBot →" no-caps size="md" class="cta-btn" to="/signup" />
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'ProductSalesSection',
  data () {
    return {
      items: [
        {
          icon: 'inventory_2',
          title: 'Sync de Anúncios',
          desc: 'Todos seus anúncios sincronizados em tempo real. Edite preços e promoções em massa.',
        },
        {
          icon: 'account_balance_wallet',
          title: 'Controle Financeiro Real',
          desc: 'CMV, comissão ML e frete calculados por venda — veja o lucro líquido de cada pedido.',
        },
        {
          icon: 'sell',
          title: 'Gestão de Preços em Massa',
          desc: 'Altere preços, configure atacado e ative promoções em centenas de anúncios de uma vez.',
        },
        {
          icon: 'receipt_long',
          title: 'Painel de Pedidos',
          desc: 'Acompanhe cada venda com dados completos de pagamento, logística e rentabilidade.',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.sellerbot-section {
  background: #f8fafc;
  padding: 96px 20px;
}

.content-wrapper { max-width: 1280px; margin: 0 auto; }

.visual-block {
  display: flex;
  justify-content: center;
  align-items: center;
}

.img-frame {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 16px 56px rgba(15,23,42,.12);
  width: 100%;
  max-width: 520px;
}

.img-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #0d9488;
  color: #fff;
  font-size: .75rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  letter-spacing: .4px;
}

.dashboard-img {
  display: block;
  width: 100%;
  height: auto;
  min-height: 280px;
  object-fit: cover;
}

.sec-eyebrow {
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #0d9488;
  margin-bottom: 14px;
}

.sec-title {
  font-size: clamp(1.7rem, 3vw, 2.4rem);
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px;
  line-height: 1.2;
  letter-spacing: -.5px;
}

.sec-sub {
  font-size: .97rem;
  color: #64748b;
  line-height: 1.7;
  margin: 0 0 36px;
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 36px;
}

.item-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.item-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 12px;
  background: rgba(13,148,136,.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-title {
  font-size: .95rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 3px;
}

.item-desc {
  font-size: .86rem;
  color: #64748b;
  line-height: 1.5;
}

.cta-btn {
  padding: 12px 28px;
  border-radius: 10px;
  font-weight: 700;
  font-size: .95rem;
}

@media (max-width: 768px) {
  .img-frame { max-width: 100%; }
}
</style>
