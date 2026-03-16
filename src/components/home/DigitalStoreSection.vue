<template>
  <section class="services-section" id="services">
    <div class="content-wrapper">
      <div class="sec-eyebrow">O que fazemos</div>
      <h2 class="sec-title">Uma consultoria completa para sua operação</h2>
      <p class="sec-sub">
        Da estratégia à execução — a Krivos combina consultoria especializada com
        tecnologia proprietária para transformar sua operação nos marketplaces.
      </p>

      <div class="services-grid">
        <div v-for="f in features" :key="f.title" class="feat-card">
          <div class="feat-icon-wrap" :style="{ background: f.bg }">
            <q-icon :name="f.icon" size="28px" :style="{ color: f.color }" />
          </div>
          <h3 class="feat-title">{{ f.title }}</h3>
          <p class="feat-desc">{{ f.desc }}</p>
          <ul class="feat-list">
            <li v-for="item in f.items" :key="item">
              <q-icon name="check_circle" size="14px" :style="{ color: f.color, marginRight: '6px', verticalAlign: 'middle' }" />
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'DigitalStoreSection',
  data () {
    return {
      features: [
        {
          icon: 'psychology',
          title: 'Consultoria Estratégica',
          desc: 'Diagnóstico completo da sua operação, identificação de gargalos e plano de ação para crescer com margem.',
          bg: 'rgba(99,102,241,.1)',
          color: '#6366f1',
          items: ['Análise de portfólio', 'Precificação inteligente', 'Mapeamento de custos', 'Estratégia de marketplaces'],
        },
        {
          icon: 'smart_toy',
          title: 'SellerBot — Ferramenta Proprietária',
          desc: 'Nossa plataforma exclusiva para gestão de anúncios, pedidos e financeiro no Mercado Livre.',
          bg: 'rgba(13,148,136,.1)',
          color: '#0d9488',
          items: ['Sync automático ML', 'CMV por produto', 'Resumo financeiro real', 'Gestão de preços em massa'],
        },
        {
          icon: 'shopping_bag',
          title: 'Shopee Management',
          desc: 'Expansão e gestão da sua operação na Shopee com acompanhamento especializado.',
          bg: 'rgba(245,158,11,.1)',
          color: '#f59e0b',
          items: ['Onboarding Shopee', 'Gestão de anúncios', 'Performance tracking', 'Sync de estoque'],
        },
        {
          icon: 'trending_up',
          title: 'Gestão de Performance',
          desc: 'Acompanhamento contínuo de métricas, ROI e resultado real da sua operação.',
          bg: 'rgba(99,102,241,.1)',
          color: '#6366f1',
          items: ['KPIs da operação', 'Relatórios semanais', 'Lucro real por canal', 'Metas e crescimento'],
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.services-section {
  background: #fff;
  padding: 96px 20px;
}

.content-wrapper { max-width: 1280px; margin: 0 auto; }

.sec-eyebrow {
  text-align: center;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #0d9488;
  margin-bottom: 16px;
}

.sec-title {
  text-align: center;
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px;
  letter-spacing: -.5px;
}

.sec-sub {
  text-align: center;
  font-size: 1rem;
  color: #64748b;
  max-width: 580px;
  margin: 0 auto 64px;
  line-height: 1.7;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.feat-card {
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 36px 32px;
  transition: box-shadow .25s, transform .25s;
  background: #fff;

  &:hover {
    box-shadow: 0 12px 40px rgba(13,148,136,.1);
    transform: translateY(-4px);
  }
}

.feat-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.feat-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}

.feat-desc {
  font-size: .9rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 18px;
}

.feat-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;

  li {
    font-size: .86rem;
    color: #475569;
    display: flex;
    align-items: center;
  }
}
</style>
