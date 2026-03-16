<template>
  <section class="cta-section">
    <div class="cta-inner content-wrapper">
      <h2 class="cta-title">Pronto para ter controle total<br />da sua operação no ML?</h2>
      <p class="cta-sub">
        Crie sua conta grátis em menos de 2 minutos.<br />
        Nenhum cartão de crédito necessário.
      </p>
      <div class="cta-btns">
        <q-btn unelevated color="primary" label="Criar conta grátis" no-caps size="lg" class="btn-main" to="/signup" />
        <q-btn flat color="teal-7" label="Ver como funciona ↓" no-caps size="md" class="btn-sub"
          @click="$emit('scroll-how')" />
      </div>
      <div class="cta-trust">
        <q-icon name="lock" size="14px" color="teal-6" />
        <span>Seus dados nunca saem do seu controle. Acesso OAuth — sem senha da conta ML.</span>
      </div>
    </div>

    <!-- shapes decorativos -->
    <div class="shape s1" />
    <div class="shape s2" />
    <div class="shape s3" />
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({ name: 'SignUpCallToAction' })
</script>

<style lang="scss" scoped>
.cta-section {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #134e4a 60%, #0d9488 100%);
  padding: 100px 20px;
  overflow: hidden;
  text-align: center;
}

.cta-inner {
  position: relative;
  z-index: 2;
}

.content-wrapper { max-width: 700px; margin: 0 auto; }

.cta-title {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -.8px;
  line-height: 1.15;
  margin: 0 0 20px;
}

.cta-sub {
  font-size: 1.05rem;
  color: #94a3b8;
  line-height: 1.7;
  margin: 0 0 40px;
}

.cta-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  margin-bottom: 28px;
}

.btn-main {
  padding: 14px 36px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
}

.btn-sub {
  padding: 14px 20px;
  opacity: .8;
  &:hover { opacity: 1; }
}

.cta-trust {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: .8rem;
  color: #64748b;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(45,212,191,.07);
  pointer-events: none;
}

.s1 { width: 500px; height: 500px; top: -200px; right: -200px; }
.s2 { width: 300px; height: 300px; bottom: -150px; left: -100px; background: rgba(245,158,11,.05); }
.s3 { width: 150px; height: 150px; top: 30%; left: 5%; background: rgba(99,102,241,.06); }
</style>
