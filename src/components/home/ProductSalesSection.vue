<template>
  <section class="sellerbot-section" id="sellerbot">
    <div class="content-wrapper">

      <div class="sb-grid">

        <!-- Imagem -->
        <div class="sb-visual">
          <div class="img-frame">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80&auto=format&fit=crop"
              alt="Dashboard SellerBot — controle financeiro em tempo real"
              class="sb-img"
            />
            <div class="img-badge">
              <q-icon name="smart_toy" size="14px" />
              Dashboard SellerBot
            </div>
          </div>

          <!-- Mini stats card flutuante -->
          <div class="float-card">
            <div class="float-row">
              <span class="float-label">Lucro hoje</span>
              <span class="float-val positive">+R$ 3.842</span>
            </div>
            <div class="float-row">
              <span class="float-label">Pedidos</span>
              <span class="float-val">47 vendas</span>
            </div>
            <div class="float-row">
              <span class="float-label">Margem média</span>
              <span class="float-val positive">28,4%</span>
            </div>
          </div>
        </div>

        <!-- Texto -->
        <div class="sb-content">
          <span class="eyebrow">SellerBot</span>
          <h2 class="sb-title">
            Nossa ferramenta exclusiva<br />
            para gestão de <span class="accent">multicontas</span>
          </h2>
          <p class="sb-sub">
            Desenvolvemos o SellerBot para suprir uma lacuna real do mercado:
            visibilidade financeira completa por venda, em tempo real, com Custo Médio do Produto e logística integrados.
            Hoje ele é a espinha dorsal da gestão de todos os nossos clientes.
          </p>

          <div class="feature-list">
            <div v-for="f in features" :key="f.title" class="feature-row">
              <div class="f-icon">
                <q-icon :name="f.icon" size="18px" color="teal-6" />
              </div>
              <div>
                <strong>{{ f.title }}</strong>
                <p>{{ f.desc }}</p>
              </div>
            </div>
          </div>

          <div class="sb-ctas">
            <router-link to="/signup" class="cta-primary">Criar conta grátis →</router-link>
            <router-link to="/login" class="cta-secondary">Já tenho conta</router-link>
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
      features: [
        {
          icon: 'sync',
          title: 'Sync automático de pedidos e anúncios',
          desc: 'Todos os canais (ML e Shopee) sincronizados em tempo real. Edite, pause e gerencie em massa.',
        },
        {
          icon: 'account_balance_wallet',
          title: 'Custo Médio do Produto e lucro líquido por venda',
          desc: 'Veja o custo real de cada pedido — comissão ML, frete, Custo Médio do Produto — e o lucro que sobrou.',
        },
        {
          icon: 'sell',
          title: 'Gestão de preços em massa',
          desc: 'Altere preços por percentual, valor exato ou configure tabela de atacado para centenas de anúncios de uma vez.',
        },
        {
          icon: 'receipt_long',
          title: 'Painel financeiro completo',
          desc: 'Dashboard diário com totais de vendas, lucro pós Custo Médio e médias — sem precisar abrir planilha.',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.sellerbot-section {
  background: #f0fdf9;
  padding: 96px 0;
}

.content-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.sb-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 72px;
  align-items: center;
}

/* Visual */
.sb-visual { position: relative; }

.img-frame {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  border: 2px solid #99f6e4;
  box-shadow: 0 24px 60px rgba(13,148,136,.18);
}

.sb-img {
  width: 100%;
  display: block;
  object-fit: cover;
  height: 400px;
}

.img-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(13,148,136,.9);
  color: #fff;
  font-size: .75rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(8px);
}

.float-card {
  position: absolute;
  bottom: -20px;
  right: -20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 20px;
  box-shadow: 0 12px 32px rgba(0,0,0,.12);
  min-width: 200px;
}

.float-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 5px 0;

  &:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
}

.float-label { font-size: .78rem; color: #94a3b8; }
.float-val { font-size: .88rem; font-weight: 700; color: #0f172a; }
.float-val.positive { color: #0d9488; }

/* Content */
.eyebrow {
  display: inline-block;
  font-size: .73rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #0d9488;
  margin-bottom: 12px;
}

.sb-title {
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
  margin: 0 0 18px;
  letter-spacing: -.7px;
}

.accent { color: #0d9488; }

.sb-sub {
  font-size: .97rem;
  color: #64748b;
  line-height: 1.75;
  margin: 0 0 32px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 36px;
}

.feature-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.f-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(13,148,136,.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-row strong {
  display: block;
  font-size: .92rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 3px;
}

.feature-row p {
  font-size: .84rem;
  color: #64748b;
  margin: 0;
  line-height: 1.55;
}

.sb-ctas { display: flex; gap: 12px; flex-wrap: wrap; }

.cta-primary {
  display: inline-flex;
  align-items: center;
  padding: 12px 26px;
  border-radius: 10px;
  background: #0d9488;
  color: #fff;
  font-weight: 700;
  font-size: .92rem;
  text-decoration: none;
  transition: background .2s, box-shadow .2s;

  &:hover {
    background: #0f766e;
    box-shadow: 0 6px 20px rgba(13,148,136,.35);
  }
}

.cta-secondary {
  display: inline-flex;
  align-items: center;
  padding: 12px 20px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  color: #64748b;
  font-weight: 600;
  font-size: .92rem;
  text-decoration: none;
  transition: border-color .2s, color .2s;

  &:hover { border-color: #0d9488; color: #0d9488; }
}

@media (max-width: 900px) {
  .sb-grid { grid-template-columns: 1fr; gap: 48px; }
  .float-card { display: none; }
}

@media (max-width: 600px) {
  .sellerbot-section { padding: 64px 0; }
  .sb-img { height: 260px; }
}
</style>
