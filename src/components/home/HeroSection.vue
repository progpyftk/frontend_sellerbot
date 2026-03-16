<template>
  <section class="hero">
    <div class="hero-bg-img" />
    <div class="hero-glow" />

    <div class="hero-inner content-wrapper">
      <div class="hero-badge">
        <span class="badge-dot" />
        Consultoria especializada em e-commerce
      </div>

      <h1 class="hero-title">
        Escale seu negócio nos<br />
        <span class="hero-accent">maiores marketplaces</span><br />
        do Brasil.
      </h1>

      <p class="hero-sub">
        A Krivos Consultoria une estratégia, tecnologia e acompanhamento especializado
        para você crescer no Mercado Livre e na Shopee com margem real e método comprovado.
      </p>

      <div class="hero-ctas">
        <a href="#plans" class="cta-main">Falar com um consultor</a>
        <a href="#sellerbot" class="cta-ghost">Conhecer o SellerBot</a>
      </div>

      <div class="hero-badges">
        <div class="marketplace-badge ml-badge">
          <span class="mp-dot ml-dot" />
          <span class="mp-name">Mercado Livre</span>
          <span class="mp-tag">Oficial</span>
        </div>
        <div class="marketplace-badge sh-badge">
          <span class="mp-dot sh-dot" />
          <span class="mp-name">Shopee</span>
          <span class="mp-tag">Parceiro</span>
        </div>
      </div>

      <div class="hero-stats">
        <div v-for="s in stats" :key="s.label" class="stat">
          <span class="stat-val">{{ s.value }}</span>
          <span class="stat-lbl">{{ s.label }}</span>
        </div>
      </div>
    </div>

    <div class="geo g1" />
    <div class="geo g2" />
    <div class="geo g3" />
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'HeroSection',
  data () {
    return {
      stats: [
        { value: 'ML + Shopee', label: 'Marketplaces atendidos' },
        { value: 'SellerBot', label: 'Ferramenta proprietária' },
        { value: 'CMV real', label: 'Controle de margem' },
        { value: '100% foco', label: 'Em resultado' },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.hero {
  position: relative;
  min-height: 680px;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #0f172a;
}

.hero-bg-img {
  position: absolute;
  inset: 0;
  background-image: url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  opacity: .08;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(15,23,42,.95) 0%, rgba(19,78,74,.8) 60%, rgba(13,148,136,.6) 100%),
    radial-gradient(ellipse 700px 500px at 85% 40%, rgba(13,148,136,.2) 0%, transparent 70%),
    radial-gradient(ellipse 500px 700px at 5% 90%, rgba(20,184,166,.1) 0%, transparent 70%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 2;
  padding: 100px 20px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(13,148,136,.18);
  border: 1px solid rgba(45,212,191,.35);
  color: #5eead4;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .6px;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 20px;
  margin-bottom: 30px;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #14b8a6;
  box-shadow: 0 0 8px #14b8a6;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .3; }
}

.hero-title {
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 800;
  line-height: 1.1;
  color: #f1f5f9;
  margin: 0 0 22px;
  letter-spacing: -1.5px;
  max-width: 700px;
}

.hero-accent { color: #2dd4bf; }

.hero-sub {
  font-size: 1.05rem;
  line-height: 1.75;
  color: #94a3b8;
  margin: 0 0 38px;
  max-width: 580px;
}

.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 40px;
}

.cta-main {
  display: inline-flex;
  align-items: center;
  padding: 14px 32px;
  border-radius: 10px;
  background: #0d9488;
  color: #fff;
  font-weight: 700;
  font-size: .98rem;
  text-decoration: none;
  transition: background .2s, box-shadow .2s;

  &:hover {
    background: #0f766e;
    box-shadow: 0 8px 24px rgba(13,148,136,.35);
  }
}

.cta-ghost {
  display: inline-flex;
  align-items: center;
  padding: 14px 24px;
  border-radius: 10px;
  color: #f1f5f9;
  font-weight: 600;
  font-size: .98rem;
  text-decoration: none;
  opacity: .75;
  transition: opacity .2s;

  &:hover { opacity: 1; }
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 48px;
}

.marketplace-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: 24px;
  font-size: .82rem;
  font-weight: 600;
}

.ml-badge {
  background: rgba(255,230,0,.12);
  border: 1px solid rgba(255,230,0,.25);
  color: #fde68a;
}

.sh-badge {
  background: rgba(249,115,22,.12);
  border: 1px solid rgba(249,115,22,.25);
  color: #fed7aa;
}

.mp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.ml-dot { background: #fbbf24; }
.sh-dot { background: #fb923c; }

.mp-name { font-weight: 700; }

.mp-tag {
  font-size: .7rem;
  opacity: .7;
  font-weight: 500;
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 36px;
  padding-top: 32px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-val {
  font-size: 1rem;
  font-weight: 800;
  color: #2dd4bf;
  line-height: 1;
}

.stat-lbl {
  font-size: .72rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .6px;
}

.geo {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  background: #2dd4bf;
}

.g1 { width: 520px; height: 520px; right: -140px; top: -140px; opacity: .04; }
.g2 { width: 320px; height: 320px; right: 220px; bottom: -100px; opacity: .03; }
.g3 { width: 200px; height: 200px; right: 80px; top: 55%; opacity: .06; background: #f59e0b; }

@media (max-width: 600px) {
  .hero-inner { padding: 70px 20px; }
  .hero-stats { gap: 20px; }
  .hero-badges { gap: 8px; }
}
</style>
