<template>
  <section class="testimonials-section">
    <div class="content-wrapper">
      <div class="sec-eyebrow">O que dizem nossos sellers</div>
      <h2 class="sec-title">Quem usa, recomenda</h2>
      <p class="sec-sub">Sellers de todo o Brasil já controlam suas operações com o SellerBot.</p>

      <div class="cards-grid">
        <div v-for="t in testimonials" :key="t.name" class="tcard">
          <div class="tcard-stars">
            <q-icon v-for="n in 5" :key="n" name="star" size="14px" style="color:#f59e0b" />
          </div>
          <p class="tcard-quote">{{ t.quote }}</p>
          <div class="tcard-author">
            <div class="tcard-avatar">{{ t.initials }}</div>
            <div>
              <div class="tcard-name">{{ t.name }}</div>
              <div class="tcard-role">{{ t.role }}</div>
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
  name: 'CreatorsCommunitySection',
  data () {
    return {
      testimonials: [
        {
          quote: '"Antes eu não sabia quanto lucrava em cada venda. O SellerBot me mostrou que várias categorias estavam no negativo depois do CMV. Salvou meu negócio."',
          name: 'Ricardo Alves',
          role: 'Seller full-time — Eletrônicos',
          initials: 'RA',
        },
        {
          quote: '"Altero preço de 300 anúncios em 30 segundos. O que eu fazia em 2 horas hoje faço antes do café."',
          name: 'Patrícia Mendes',
          role: 'Loja MogiVitta — Casa & Jardim',
          initials: 'PM',
        },
        {
          quote: '"A integração com o Tiny ERP fechou o ciclo. O CMV já entra automático, o lucro real aparece ali na tela. Produto essencial."',
          name: 'Fábio Corrêa',
          role: 'Operação multi-conta — Ferramentas',
          initials: 'FC',
        },
        {
          quote: '"O painel financeiro de cada pedido é incrível. Vejo comissão, frete, CMV e o líquido — tudo detalhado como o ML nunca mostrou."',
          name: 'Ana Luísa Rocha',
          role: 'Seller desde 2019 — Beleza & Saúde',
          initials: 'AL',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.testimonials-section {
  background: linear-gradient(135deg, #0f172a 0%, #134e4a 100%);
  padding: 96px 20px;
}

.content-wrapper { max-width: 1200px; margin: 0 auto; }

.sec-eyebrow {
  text-align: center;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: #5eead4;
  margin-bottom: 14px;
}

.sec-title {
  text-align: center;
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 14px;
  letter-spacing: -.5px;
}

.sec-sub {
  text-align: center;
  font-size: 1rem;
  color: #94a3b8;
  margin: 0 auto 64px;
  max-width: 480px;
  line-height: 1.7;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.tcard {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  backdrop-filter: blur(6px);
  transition: background .25s, transform .25s;

  &:hover {
    background: rgba(255,255,255,.1);
    transform: translateY(-4px);
  }
}

.tcard-stars { display: flex; gap: 2px; }

.tcard-quote {
  font-size: .9rem;
  line-height: 1.65;
  color: #cbd5e1;
  margin: 0;
  flex: 1;
}

.tcard-author { display: flex; align-items: center; gap: 12px; }

.tcard-avatar {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .82rem;
  font-weight: 700;
  color: #fff;
}

.tcard-name { font-size: .88rem; font-weight: 700; color: #f1f5f9; }
.tcard-role { font-size: .78rem; color: #64748b; margin-top: 2px; }
</style>
