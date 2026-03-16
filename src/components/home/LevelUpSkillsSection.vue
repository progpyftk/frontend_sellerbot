<template>
  <section class="howto-section">
    <div class="content-wrapper">
      <div class="sec-eyebrow">Simples de usar</div>
      <h2 class="sec-title">Comece a operar em minutos</h2>
      <p class="sec-sub">Sem configuração complexa. Conecte sua conta e o SellerBot cuida do resto.</p>

      <div class="steps">
        <div v-for="(step, i) in steps" :key="step.title" class="step">
          <div class="step-num">{{ i + 1 }}</div>
          <div class="step-connector" v-if="i < steps.length - 1" />
          <div class="step-icon-wrap">
            <q-icon :name="step.icon" size="28px" color="teal-7" />
          </div>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LevelUpSkillsSection',
  data () {
    return {
      steps: [
        {
          icon: 'link',
          title: 'Conecte sua conta ML',
          desc: 'Autorize o acesso ao Mercado Livre via OAuth em menos de 1 minuto. Sem senha, sem risco.',
        },
        {
          icon: 'sync',
          title: 'Sincronize seus dados',
          desc: 'Anúncios, pedidos, histórico de vendas — tudo sincronizado automaticamente.',
        },
        {
          icon: 'dashboard',
          title: 'Gerencie e lucre mais',
          desc: 'Acesse o painel, tome decisões com dados reais e escale sua operação.',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.howto-section {
  background: #f0fdf9;
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
  margin: 0 auto 72px;
  max-width: 520px;
  line-height: 1.7;
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 48px;
  position: relative;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
}

.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0d9488;
  color: #fff;
  font-size: .9rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 0 0 6px rgba(13,148,136,.15);
}

.step-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: rgba(13,148,136,.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  border: 1.5px solid rgba(13,148,136,.2);
}

.step-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}

.step-desc {
  font-size: .88rem;
  color: #64748b;
  line-height: 1.65;
  max-width: 240px;
  margin: 0 auto;
}
</style>
