<template>
  <section class="howto-section" id="metodologia">
    <div class="content-wrapper">

      <div class="section-header">
        <span class="eyebrow">Nossa metodologia</span>
        <h2 class="section-title">Como transformamos uma empresa B2B em uma operação B2C</h2>
        <p class="section-sub">
          Um processo estruturado, com etapas claras e entregas concretas — do diagnóstico
          ao crescimento sustentável no varejo digital.
        </p>
      </div>

      <div class="steps-container">
        <div v-for="(step, idx) in steps" :key="step.title" class="step">
          <div class="step-connector" v-if="idx < steps.length - 1" />
          <div class="step-header">
            <div class="step-num">{{ String(idx + 1).padStart(2, '0') }}</div>
            <div class="step-icon">
              <q-icon :name="step.icon" size="20px" color="teal-6" />
            </div>
          </div>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.desc }}</p>
          <ul class="step-list">
            <li v-for="item in step.items" :key="item">{{ item }}</li>
          </ul>
          <div class="step-duration">
            <q-icon name="schedule" size="13px" />
            {{ step.duration }}
          </div>
        </div>
      </div>

      <!-- Imagem ilustrativa -->
      <div class="team-img-wrap">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format&fit=crop"
          alt="Time Krivos trabalhando com clientes"
          class="team-img"
        />
        <div class="img-overlay">
          <div class="overlay-text">
            <q-icon name="verified" size="18px" color="teal-4" />
            Time dedicado da Krivos operando junto com você em cada etapa
          </div>
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
          icon: 'search',
          title: 'Diagnóstico',
          desc: 'Analisamos sua operação atual: portfólio, precificação, margens, estrutura de custos e maturidade digital.',
          items: [
            'Mapeamento do catálogo e SKUs',
            'Análise de competitividade de preço',
            'Avaliação do ERP atual',
            'Definição de canais e estratégia',
          ],
          duration: 'Semana 1–2',
        },
        {
          icon: 'build_circle',
          title: 'Estruturação',
          desc: 'Configuramos toda a infraestrutura: contas, ERP, catálogo, logística e a ferramenta SellerBot.',
          items: [
            'Criação e homologação das contas',
            'Integração Tiny ERP',
            'Cadastro e otimização dos anúncios',
            'Configuração de frete e fulfillment',
          ],
          duration: 'Semana 3–6',
        },
        {
          icon: 'rocket_launch',
          title: 'Operação',
          desc: 'Time dedicado assume a gestão diária. Primeiros pedidos, atendimento e ajuste fino da operação.',
          items: [
            'Gestão diária de anúncios e pedidos',
            'Atendimento ao cliente nos canais',
            'Monitoramento de performance',
            'Relatórios semanais ao cliente',
          ],
          duration: 'A partir do mês 2',
        },
        {
          icon: 'trending_up',
          title: 'Crescimento',
          desc: 'Com a operação estável, focamos em escalar: novos produtos, novas campanhas e novos canais.',
          items: [
            'Expansão de catálogo',
            'Estratégia de campanhas e promoções',
            'Entrada em novos marketplaces',
            'Otimização de margem contínua',
          ],
          duration: 'A partir do mês 4',
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.howto-section {
  background: #f0fdf9;
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
  font-size: clamp(1.75rem, 3vw, 2.4rem);
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
  font-size: 1rem;
  color: #64748b;
  line-height: 1.72;
  max-width: 580px;
  margin: 0 auto;
}

.steps-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0;
  position: relative;
  margin-bottom: 64px;

  /* Linha conectora horizontal (desktop) */
  &::after {
    content: '';
    position: absolute;
    top: 32px;
    left: 60px;
    right: 60px;
    height: 2px;
    background: linear-gradient(90deg, #0d9488, #2dd4bf);
    opacity: .25;
    pointer-events: none;
    z-index: 0;
  }
}

.step {
  position: relative;
  z-index: 1;
  padding: 0 16px 32px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.step-num {
  font-size: 1.4rem;
  font-weight: 900;
  color: rgba(13,148,136,.2);
  line-height: 1;
  letter-spacing: -1px;
  min-width: 36px;
}

.step-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(13,148,136,.12);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(13,148,136,.2);
}

.step-title {
  font-size: 1.08rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
}

.step-desc {
  font-size: .88rem;
  color: #64748b;
  line-height: 1.65;
  margin: 0 0 14px;
}

.step-list {
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    font-size: .83rem;
    color: #475569;
    padding-left: 14px;
    position: relative;
    line-height: 1.4;

    &::before {
      content: '·';
      position: absolute;
      left: 0;
      color: #0d9488;
      font-weight: 700;
    }
  }
}

.step-duration {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: .76rem;
  font-weight: 700;
  color: #0d9488;
  background: rgba(13,148,136,.1);
  padding: 4px 10px;
  border-radius: 20px;
}

/* Team image */
.team-img-wrap {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0,0,0,.1);
}

.team-img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}

.img-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(15,23,42,.85), transparent);
  padding: 24px;
  display: flex;
  align-items: flex-end;
}

.overlay-text {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f5f9;
  font-size: .88rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .howto-section { padding: 64px 0; }
  .steps-container { gap: 24px; &::after { display: none; } }
  .step { padding: 0 0 24px; }
  .team-img { height: 220px; }
}
</style>
