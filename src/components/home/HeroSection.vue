<template>
  <section class="hero">
    <div class="hero-bg-img" />
    <div class="hero-glow" />

    <div class="hero-inner">
      <div class="hero-badge">
        <span class="badge-dot" />
        Consultoria B2B → B2C
      </div>

      <h1 class="hero-title">
        Sua empresa B2B<br />
        <span class="hero-accent">conquistando o varejo</span><br />
        online com método.
      </h1>

      <p class="hero-sub">
        A <strong>Krivus Consultoria</strong> é especializada em ajudar empresas
        B2B a expandir para o varejo digital — com estruturação completa,
        integração de ERP e gestão contínua nos maiores marketplaces do Brasil.
      </p>

      <div class="hero-ctas">
        <a href="#contact" class="cta-main">Iniciar minha transição</a>
        <a href="#sellerbot" class="cta-ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="q-mr-xs">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
          Conhecer o SellerBot
        </a>
      </div>

      <div class="hero-badges">
        <div class="marketplace-badge ml-badge">
          <span class="mp-dot ml-dot" />
          <span class="mp-name">Mercado Livre</span>
        </div>
        <div class="marketplace-badge sh-badge">
          <span class="mp-dot sh-dot" />
          <span class="mp-name">Shopee</span>
        </div>
        <div class="marketplace-badge tiny-badge">
          <span class="mp-dot tiny-dot" />
          <span class="mp-name">Tiny ERP</span>
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
        { value: 'B2B → B2C', label: 'Nossa especialidade' },
        { value: 'Dedicado', label: 'Time exclusivo por cliente' },
        { value: 'ML + Shopee', label: 'Canais gerenciados' },
        { value: 'SellerBot', label: 'Ferramenta proprietária' },
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
  background-image: url('https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1400&q=70&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  opacity: .07;
  pointer-events: none;
}

.hero-glow {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(15,23,42,.97) 0%, rgba(19,78,74,.82) 58%, rgba(13,148,136,.55) 100%),
    radial-gradient(ellipse 700px 500px at 85% 40%, rgba(13,148,136,.18) 0%, transparent 70%),
    radial-gradient(ellipse 500px 700px at 5% 90%, rgba(20,184,166,.09) 0%, transparent 70%);
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 2;
  padding: 110px 24px 90px;
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
  font-size: .74rem;
  font-weight: 700;
  letter-spacing: .7px;
  text-transform: uppercase;
  padding: 5px 14px;
  border-radius: 20px;
  margin-bottom: 30px;
}

.badge-dot {
  width: 7px; height: 7px;
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
  margin: 0 0 24px;
  letter-spacing: -1.5px;
  max-width: 720px;
}

.hero-accent { color: #2dd4bf; }

.hero-sub {
  font-size: 1.07rem;
  line-height: 1.78;
  color: #94a3b8;
  margin: 0 0 38px;
  max-width: 600px;

  strong { color: #cbd5e1; font-weight: 600; }
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
    box-shadow: 0 8px 28px rgba(13,148,136,.4);
  }
}

.cta-ghost {
  display: inline-flex;
  align-items: center;
  padding: 14px 24px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.15);
  color: #f1f5f9;
  font-weight: 600;
  font-size: .98rem;
  text-decoration: none;
  opacity: .75;
  transition: opacity .2s, border-color .2s;

  &:hover { opacity: 1; border-color: rgba(255,255,255,.3); }
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 50px;
}

.marketplace-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 24px;
  font-size: .8rem;
  font-weight: 600;
}

.ml-badge {
  background: rgba(255,230,0,.1);
  border: 1px solid rgba(255,230,0,.22);
  color: #fde68a;
}

.sh-badge {
  background: rgba(249,115,22,.1);
  border: 1px solid rgba(249,115,22,.22);
  color: #fed7aa;
}

.tiny-badge {
  background: rgba(99,102,241,.1);
  border: 1px solid rgba(99,102,241,.22);
  color: #c7d2fe;
}

.mp-dot { width: 7px; height: 7px; border-radius: 50%; }
.ml-dot { background: #fbbf24; }
.sh-dot { background: #fb923c; }
.tiny-dot { background: #818cf8; }
.mp-name { font-weight: 700; }

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  padding-top: 32px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.stat { display: flex; flex-direction: column; gap: 4px; }

.stat-val {
  font-size: 1rem;
  font-weight: 800;
  color: #2dd4bf;
  line-height: 1;
}

.stat-lbl {
  font-size: .7rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: .6px;
}

.geo { position: absolute; border-radius: 50%; pointer-events: none; background: #2dd4bf; }
.g1 { width: 520px; height: 520px; right: -130px; top: -130px; opacity: .04; }
.g2 { width: 300px; height: 300px; right: 200px; bottom: -80px; opacity: .03; }
.g3 { width: 180px; height: 180px; right: 60px; top: 55%; opacity: .06; background: #f59e0b; }

@media (max-width: 600px) {
  .hero-inner { padding: 80px 20px 60px; }
  .hero-stats { gap: 22px; }
  .hero-badges { gap: 8px; }
}
</style>
