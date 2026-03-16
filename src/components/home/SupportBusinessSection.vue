<template>
  <section class="about-section" id="about">
    <div class="content-wrapper">

      <div class="about-grid">

        <!-- Imagem -->
        <div class="about-visual">
          <div class="img-frame">
            <img
              src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=900&q=80&auto=format&fit=crop"
              alt="Crescimento com método — Krivos Consultoria"
              class="about-img"
            />
          </div>
          <div class="about-quote-card">
            <q-icon name="format_quote" size="28px" color="teal-6" />
            <p>
              "Nosso objetivo não é ter centenas de clientes. É ter clientes que crescem
              de verdade — com um time que conhece a operação deles tanto quanto eles."
            </p>
            <span class="quote-author">— Equipe Krivos</span>
          </div>
        </div>

        <!-- Texto -->
        <div class="about-content">
          <span class="eyebrow">Quem somos</span>
          <h2 class="about-title">
            Uma consultoria orientada<br />
            a <span class="accent">resultado real</span>
          </h2>
          <p class="about-desc">
            A Krivos nasceu para resolver um problema específico: empresas B2B com
            produtos competitivos que não conseguem estruturar a operação digital
            de forma eficiente para chegar ao consumidor final.
          </p>
          <p class="about-desc">
            Nossa abordagem é diferente. Não entregamos um manual e sumimos.
            Colocamos um time dedicado para operar junto com você — até a operação
            andar sozinha, e mesmo assim continuamos presentes para escalar.
          </p>

          <div class="pillars-grid">
            <div v-for="p in pillars" :key="p.title" class="pillar">
              <div class="pillar-icon" :style="{ background: p.iconBg, color: p.iconColor }">
                <q-icon :name="p.icon" size="18px" />
              </div>
              <div>
                <strong>{{ p.title }}</strong>
                <p>{{ p.desc }}</p>
              </div>
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
  name: 'SupportBusinessSection',
  data () {
    return {
      pillars: [
        {
          icon: 'group',
          iconBg: 'rgba(13,148,136,.1)',
          iconColor: '#0d9488',
          title: 'Time dedicado',
          desc: 'Cada cliente tem profissionais exclusivos. Nenhum compartilhamento de atenção.',
        },
        {
          icon: 'smart_toy',
          iconBg: 'rgba(45,212,191,.1)',
          iconColor: '#14b8a6',
          title: 'Tecnologia própria',
          desc: 'SellerBot desenvolvido internamente para suprir o que as ferramentas genéricas não fazem.',
        },
        {
          icon: 'analytics',
          iconBg: 'rgba(99,102,241,.1)',
          iconColor: '#6366f1',
          title: 'Decisões por dados',
          desc: 'Cada recomendação vem de métricas reais da sua operação, não de achismo.',
        },
        {
          icon: 'emoji_events',
          iconBg: 'rgba(245,158,11,.1)',
          iconColor: '#f59e0b',
          title: 'Crescimento mensurável',
          desc: 'Definimos KPIs com você e reportamos resultado real semana a semana.',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.about-section {
  background: #f8fafc;
  padding: 96px 0;
}

.content-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 72px;
  align-items: center;
}

/* Visual */
.about-visual { display: flex; flex-direction: column; gap: 24px; }

.img-frame {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0,0,0,.1);
  border-left: 4px solid #0d9488;
}

.about-img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}

.about-quote-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;

  p {
    font-size: .92rem;
    color: #475569;
    line-height: 1.7;
    font-style: italic;
    margin: 10px 0 8px;
  }
}

.quote-author {
  font-size: .8rem;
  font-weight: 700;
  color: #0d9488;
}

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

.about-title {
  font-size: clamp(1.7rem, 3vw, 2.3rem);
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
  margin: 0 0 20px;
  letter-spacing: -.7px;
}

.accent { color: #0d9488; }

.about-desc {
  font-size: .97rem;
  color: #64748b;
  line-height: 1.75;
  margin: 0 0 16px;
}

.pillars-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 32px;
}

.pillar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.pillar-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pillar strong {
  display: block;
  font-size: .88rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.pillar p {
  font-size: .82rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .about-grid { grid-template-columns: 1fr; gap: 48px; }
  .about-img { height: 260px; }
}

@media (max-width: 600px) {
  .about-section { padding: 64px 0; }
  .pillars-grid { grid-template-columns: 1fr; }
}
</style>
