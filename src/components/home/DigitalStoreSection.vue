<template>
  <section class="services-section" id="services">
    <div class="content-wrapper">

      <div class="section-header">
        <span class="eyebrow">O que fazemos</span>
        <h2 class="section-title">Uma consultoria completa para a sua entrada no varejo digital</h2>
        <p class="section-sub">
          Não entregamos apresentações. Estruturamos, operamos e escalamos
          sua presença nos marketplaces — com um time dedicado exclusivamente à sua empresa.
        </p>
      </div>

      <div class="services-grid">
        <div v-for="s in services" :key="s.title" class="service-card" :class="{ 'card--highlight': s.highlight }">
          <div class="card-icon" :style="{ background: s.iconBg, color: s.iconColor }">
            <q-icon :name="s.icon" size="22px" />
          </div>
          <h3 class="card-title">{{ s.title }}</h3>
          <p class="card-desc">{{ s.desc }}</p>
          <ul class="card-list">
            <li v-for="item in s.items" :key="item">
              <span class="check" :style="{ color: s.iconColor }">✓</span>{{ item }}
            </li>
          </ul>
          <div v-if="s.highlight" class="card-ribbon">Principal</div>
        </div>
      </div>

      <div class="differentials">
        <div v-for="d in differentials" :key="d.label" class="diff-item">
          <div class="diff-icon">
            <q-icon :name="d.icon" size="22px" color="teal-6" />
          </div>
          <div>
            <strong>{{ d.label }}</strong>
            <p>{{ d.desc }}</p>
          </div>
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
      services: [
        {
          icon: 'foundation',
          iconBg: 'rgba(13,148,136,.1)',
          iconColor: '#0d9488',
          title: 'Estruturação Inicial',
          desc: 'Do zero ao operacional. Configuramos toda a infraestrutura para sua empresa vender online com segurança e profissionalismo.',
          items: [
            'Criação e homologação de contas ML e Shopee',
            'Integração com ERP (Tiny e outros)',
            'Cadastro e otimização de catálogo',
            'Configuração de frete e logística',
          ],
          highlight: false,
        },
        {
          icon: 'manage_accounts',
          iconBg: 'rgba(13,148,136,.13)',
          iconColor: '#0d9488',
          title: 'Gestão Contínua',
          desc: 'Um time dedicado operando sua loja todos os dias. Você foca no seu negócio principal, a gente cuida dos marketplaces.',
          items: [
            'Gestão diária de anúncios e estoque',
            'Atendimento ao cliente nos canais',
            'Controle financeiro por canal',
            'Relatórios semanais de performance',
          ],
          highlight: true,
        },
        {
          icon: 'smart_toy',
          iconBg: 'rgba(45,212,191,.1)',
          iconColor: '#14b8a6',
          title: 'SellerBot — Nossa Ferramenta',
          desc: 'Plataforma proprietária para gestão inteligente de multicontas no Mercado Livre e Shopee com dados financeiros em tempo real.',
          items: [
            'Sync automático de pedidos e anúncios',
            'Custo Médio do Produto e lucro real por venda',
            'Gestão de preços em massa',
            'Dashboard financeiro completo',
          ],
          highlight: false,
        },
        {
          icon: 'settings_suggest',
          iconBg: 'rgba(99,102,241,.1)',
          iconColor: '#6366f1',
          title: 'Integração de ERP',
          desc: 'Conectamos sua operação B2B ao mundo B2C sem duplicar trabalho — fluxo de dados e estoque totalmente unificado.',
          items: [
            'Integração Tiny ERP',
            'Sync de estoque B2B + B2C em tempo real',
            'Emissão de NF-e automatizada',
            'Conciliação financeira multi-canal',
          ],
          highlight: false,
        },
      ],
      differentials: [
        {
          icon: 'group',
          label: 'Time dedicado por cliente',
          desc: 'Não escalamos clientes. Cada empresa tem profissionais exclusivos focados na sua operação.',
        },
        {
          icon: 'handshake',
          label: 'Parceria de longo prazo',
          desc: 'Nosso modelo é de crescimento conjunto. Só avançamos quando você avança.',
        },
        {
          icon: 'visibility',
          label: 'Transparência total',
          desc: 'Acesso em tempo real a métricas, custos e resultados. Sem caixa-preta.',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.services-section {
  background: #f8fafc;
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
  font-size: clamp(1.75rem, 3.5vw, 2.4rem);
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px;
  letter-spacing: -.7px;
  line-height: 1.2;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.section-sub {
  font-size: 1.05rem;
  color: #64748b;
  line-height: 1.72;
  max-width: 580px;
  margin: 0 auto;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 22px;
  margin-bottom: 56px;
}

.service-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 30px;
  position: relative;
  transition: transform .25s, box-shadow .25s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,.09);
  }

  &.card--highlight {
    border-color: #0d9488;
    box-shadow: 0 0 0 1px #0d9488, 0 8px 24px rgba(13,148,136,.1);
  }
}

.card-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}

.card-desc {
  font-size: .88rem;
  color: #64748b;
  line-height: 1.65;
  margin: 0 0 18px;
}

.card-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;

  li {
    font-size: .84rem;
    color: #475569;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.4;
  }
}

.check { font-weight: 700; flex-shrink: 0; margin-top: 1px; }

.card-ribbon {
  position: absolute;
  top: 18px;
  right: 18px;
  background: #0d9488;
  color: #fff;
  font-size: .67rem;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
}

.differentials {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 28px;
  padding: 36px 40px;
  background: linear-gradient(135deg, #f0fdf9, #e6fffa);
  border-radius: 20px;
  border: 1px solid #99f6e4;
}

.diff-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.diff-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(13,148,136,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.diff-item strong {
  display: block;
  font-size: .92rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.diff-item p {
  font-size: .84rem;
  color: #64748b;
  margin: 0;
  line-height: 1.55;
}

@media (max-width: 600px) {
  .services-section { padding: 64px 0; }
  .differentials { padding: 24px 20px; gap: 20px; }
}
</style>
