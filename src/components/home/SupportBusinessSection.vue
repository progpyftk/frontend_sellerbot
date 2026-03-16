<template>
  <section class="integrations-section">
    <div class="content-wrapper">
      <div class="sec-eyebrow">Integrações nativas</div>
      <h2 class="sec-title">Conecta com as ferramentas<br />que você já usa</h2>
      <p class="sec-sub">
        O SellerBot fala a língua do seu ERP e do Mercado Livre. Seus dados chegam
        corretos, sem precisar de planilha nem exportação manual.
      </p>

      <div class="integrations-grid">
        <div v-for="integ in integrations" :key="integ.name" class="integ-card">
          <div class="integ-logo-wrap" :style="{ background: integ.bg }">
            <q-icon :name="integ.icon" size="32px" :style="{ color: integ.color }" />
          </div>
          <div class="integ-info">
            <div class="integ-name">{{ integ.name }}</div>
            <div class="integ-desc">{{ integ.desc }}</div>
          </div>
          <q-badge :color="integ.badge === 'Ativo' ? 'teal-8' : 'orange-8'" :label="integ.badge" rounded />
        </div>
      </div>

      <div class="features-strip">
        <div v-for="f in features" :key="f.label" class="strip-item">
          <q-icon name="check_circle" size="18px" color="teal-7" />
          <span>{{ f.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'SupportBusinessSection',
  data () {
    return {
      integrations: [
        {
          icon: 'storefront',
          name: 'Mercado Livre',
          desc: 'Sincronização completa de anúncios, pedidos, financeiro e logística via API oficial.',
          bg: 'rgba(255,230,0,.12)',
          color: '#b8a000',
          badge: 'Ativo',
        },
        {
          icon: 'corporate_fare',
          name: 'Tiny ERP',
          desc: 'Importação de CMV e custo de produto por SKU para calcular o lucro real de cada venda.',
          bg: 'rgba(13,148,136,.1)',
          color: '#0d9488',
          badge: 'Ativo',
        },
        {
          icon: 'webhook',
          name: 'ML Webhooks',
          desc: 'Notificações em tempo real de novos pedidos e alterações no status dos seus anúncios.',
          bg: 'rgba(99,102,241,.1)',
          color: '#6366f1',
          badge: 'Ativo',
        },
        {
          icon: 'more_horiz',
          name: 'Em breve...',
          desc: 'Shopee, Amazon, Shein e outros marketplaces estão no roadmap.',
          bg: 'rgba(100,116,139,.08)',
          color: '#94a3b8',
          badge: 'Em breve',
        },
      ],
      features: [
        { label: 'Sync automático a cada ciclo' },
        { label: 'Sem acesso à senha da conta ML' },
        { label: 'OAuth seguro e revogável' },
        { label: 'Multi-conta suportado' },
        { label: 'Histórico de pedidos completo' },
        { label: 'Dados persistidos com snapshot financeiro' },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.integrations-section {
  background: #f8fafc;
  padding: 96px 20px;
}

.content-wrapper { max-width: 1100px; margin: 0 auto; }

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
  max-width: 520px;
  line-height: 1.7;
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 56px;
}

.integ-card {
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow .25s, transform .25s;

  &:hover {
    box-shadow: 0 8px 28px rgba(13,148,136,.1);
    transform: translateY(-3px);
  }
}

.integ-logo-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.integ-info { flex: 1; }
.integ-name { font-size: .95rem; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
.integ-desc { font-size: .82rem; color: #64748b; line-height: 1.55; }

.features-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 32px;
  justify-content: center;
}

.strip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .88rem;
  color: #475569;
  font-weight: 500;
}
</style>
