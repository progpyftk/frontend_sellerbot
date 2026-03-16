<template>
  <section class="shopee-section" id="shopee">
    <div class="content-wrapper">
      <div class="row items-center q-col-gutter-xl">

        <!-- Texto lado esquerdo -->
        <div class="col-12 col-md-6">
          <div class="sec-eyebrow">Shopee</div>
          <h2 class="sec-title">
            Expanda para a Shopee<br />
            <span class="sec-accent">com quem já sabe o caminho</span>
          </h2>
          <p class="sec-sub">
            A Shopee cresce rapidamente no Brasil e representa uma oportunidade real
            de diversificar suas vendas. A Krivos cuida de todo o processo, do
            onboarding até a gestão contínua da sua operação, sem abandonar o Mercado Livre.
          </p>

          <div class="items-grid">
            <div v-for="item in items" :key="item.title" class="item-row">
              <div class="item-icon" :style="{ background: 'rgba(249,115,22,.1)' }">
                <q-icon :name="item.icon" size="22px" style="color:#f97316" />
              </div>
              <div>
                <div class="item-title">{{ item.title }}</div>
                <div class="item-desc">{{ item.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual lado direito -->
        <div class="col-12 col-md-6">
          <div class="visual-block">
            <div class="img-frame">
              <div class="img-badge shopee-badge">
                <span class="badge-dot-orange" />
                Shopee + ML
              </div>
              <img
                src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80&auto=format&fit=crop"
                alt="E-commerce multi-canal — Shopee e Mercado Livre"
                class="shopee-img"
              />
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
      items: [
        {
          icon: 'storefront',
          title: 'Onboarding completo',
          desc: 'Criação e configuração da loja, portfólio inicial e primeiras vendas acompanhadas.',
        },
        {
          icon: 'campaign',
          title: 'Gestão de campanhas',
          desc: 'Participação em campanhas da Shopee, precificação estratégica e promoções.',
        },
        {
          icon: 'sync_alt',
          title: 'Sincronização de estoque',
          desc: 'Integração de estoque entre Mercado Livre e Shopee para evitar rupturas.',
        },
        {
          icon: 'insights',
          title: 'Performance e métricas',
          desc: 'Acompanhamento semanal dos resultados com relatórios de ROI.',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.shopee-section {
  background: #fff;
  padding: 96px 20px;
}

.content-wrapper { max-width: 1280px; margin: 0 auto; }

.sec-eyebrow {
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #f97316;
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

.sec-accent { color: #0d9488; }

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

/* Visual */
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
  box-shadow: 0 16px 56px rgba(15,23,42,.1);
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
  font-size: .75rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  letter-spacing: .4px;
}

.shopee-badge {
  background: linear-gradient(135deg, #ea580c, #f97316);
  color: #fff;
}

.badge-dot-orange {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,.8);
}

.shopee-img {
  display: block;
  width: 100%;
  height: auto;
  min-height: 280px;
  object-fit: cover;
}

@media (max-width: 768px) {
  .img-frame { max-width: 100%; }
}
</style>
