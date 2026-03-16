<template>
  <section class="testimonials-section">
    <div class="content-wrapper">

      <div class="section-header">
        <span class="eyebrow">Clientes</span>
        <h2 class="section-title">O que dizem quem fez a transição</h2>
        <p class="section-sub">
          Empresas B2B que expandiram para o varejo online com a Krivos ao lado.
        </p>
      </div>

      <div class="testimonials-grid">
        <div v-for="t in testimonials" :key="t.name" class="tcard">
          <div class="tcard-stars">
            <q-icon v-for="i in 5" :key="i" name="star" size="14px" color="amber-6" />
          </div>
          <p class="tcard-quote">"{{ t.quote }}"</p>
          <div class="tcard-author">
            <div class="tcard-avatar">{{ t.initials }}</div>
            <div>
              <strong>{{ t.name }}</strong>
              <span>{{ t.role }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Números -->
      <div class="results-strip">
        <div v-for="r in results" :key="r.label" class="ritem">
          <span class="rval">{{ r.value }}</span>
          <span class="rlbl">{{ r.label }}</span>
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
          quote: 'Éramos uma distribuidora que vendia só para revendedores. A Krivos nos estruturou do zero no Mercado Livre. Em 4 meses já faturávamos mais no B2C do que em alguns distribuidores.',
          name: 'Carlos Eduardo',
          role: 'Diretor Comercial — Distribuidora de Eletrônicos',
          initials: 'CE',
        },
        {
          quote: 'Com o SellerBot descobri que 30% dos meus produtos estavam vendendo no prejuízo depois do Custo Médio do Produto. Hoje tenho controle total da margem e sei exatamente o lucro de cada pedido.',
          name: 'Fernanda Lima',
          role: 'Sócia-fundadora — Indústria Têxtil',
          initials: 'FL',
        },
        {
          quote: 'O diferencial da Krivos é o time dedicado. Não é consultoria que aparece uma vez por mês. É gente de verdade gerenciando a nossa operação como se fosse deles.',
          name: 'Roberto Nunes',
          role: 'CEO — Fabricante de Produtos para Casa',
          initials: 'RN',
        },
        {
          quote: 'Entrar na Shopee parecia complicado. Com a Krivos, em 45 dias já tínhamos mais de 200 pedidos no mês. Suporte presente em todo o processo de onboarding.',
          name: 'Aline Moreira',
          role: 'Gerente de E-commerce — Atacadista de Beleza',
          initials: 'AM',
        },
      ],
      results: [
        { value: '4 meses', label: 'Tempo médio para operação estável' },
        { value: 'ML + Shopee', label: 'Canais gerenciados em paralelo' },
        { value: 'Dedicado', label: 'Time exclusivo por cliente' },
        { value: 'Custo Médio', label: 'Margem monitorada por venda' },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.testimonials-section {
  background: linear-gradient(160deg, #0f172a 0%, #134e4a 60%, #0f172a 100%);
  padding: 96px 0;
}

.content-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
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
  margin-bottom: 12px;
}

.section-title {
  font-size: clamp(1.75rem, 3vw, 2.4rem);
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 14px;
  letter-spacing: -.7px;
}

.section-sub {
  font-size: 1rem;
  color: #94a3b8;
  line-height: 1.7;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 20px;
  margin-bottom: 64px;
}

.tcard {
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 16px;
  padding: 28px;
  transition: transform .25s, background .25s;
  backdrop-filter: blur(8px);

  &:hover {
    transform: translateY(-4px);
    background: rgba(255,255,255,.08);
  }
}

.tcard-stars { display: flex; gap: 2px; margin-bottom: 16px; }

.tcard-quote {
  font-size: .9rem;
  color: #cbd5e1;
  line-height: 1.7;
  margin: 0 0 24px;
  font-style: italic;
}

.tcard-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tcard-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .8rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.tcard-author strong {
  display: block;
  font-size: .9rem;
  font-weight: 700;
  color: #f1f5f9;
}

.tcard-author span {
  font-size: .78rem;
  color: #64748b;
  line-height: 1.4;
}

/* Results strip */
.results-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 32px;
  padding: 40px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 20px;
}

.ritem { display: flex; flex-direction: column; gap: 5px; align-items: center; text-align: center; }

.rval {
  font-size: 1.1rem;
  font-weight: 800;
  color: #2dd4bf;
}

.rlbl {
  font-size: .72rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .6px;
}

@media (max-width: 600px) {
  .testimonials-section { padding: 64px 0; }
  .results-strip { padding: 24px 16px; gap: 20px; }
}
</style>
