<template>
  <section class="premium-plans-section q-py-xl">
    <div class="container">
      <div class="text-center q-mb-xl">
        <p class="text-accent q-mb-xs">Escolha Seu Plano</p>
        <h2 class="text-h3 q-mb-md">Planos Premium</h2>
        <p class="text-subtitle1 q-mx-auto" style="max-width: 600px">
          Descubra o plano perfeito para você. De iniciantes a profissionais, temos a
          solução ideal para impulsionar seu sucesso.
        </p>
      </div>

      <div class="row q-col-gutter-md justify-center">
        <div v-for="plan in plans" :key="plan.name" class="col-xs-12 col-sm-6 col-md-3">
          <q-card class="plan-card" :class="{ popular: plan.isPopular }">
            <q-card-section class="text-center">
              <div class="text-h6">{{ plan.name }}</div>
              <div class="text-h4 q-mt-sm q-mb-md">
                <span class="text-weight-bold">{{ plan.price }}</span>
                <span v-if="plan.price !== 'Em breve'" class="text-subtitle1">/mês</span>
              </div>
              <q-list dense>
                <q-item v-for="feature in plan.features" :key="feature">
                  <q-item-section avatar>
                    <q-icon name="check" color="positive" />
                  </q-item-section>
                  <q-item-section>{{ feature }}</q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
            <q-card-actions align="center" class="q-mt-md">
              <q-btn
                :label="plan.buttonText"
                color="primary"
                :disable="plan.price === 'Em breve'"
                unelevated
                style="width: 80%"
              />
            </q-card-actions>
            <q-badge v-if="plan.isPopular" color="accent" class="popular-badge"
              >Mais Popular</q-badge
            >
          </q-card>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "PlanSelectionSection",
  data() {
    return {
      plans: [
        {
          name: "Básico",
          price: "Grátis",
          features: ["5 Projetos", "2 GB Armazenamento", "Suporte por Email"],
          buttonText: "Começar Grátis",
          isPopular: false,
        },
        {
          name: "Profissional",
          price: "R$29",
          features: ["Projetos Ilimitados", "10 GB Armazenamento", "Suporte Prioritário"],
          buttonText: "Assinar Agora",
          isPopular: true,
        },
        {
          name: "Empresarial",
          price: "R$79",
          features: ["Tudo do Profissional", "100 GB Armazenamento", "API Acesso"],
          buttonText: "Contate Vendas",
          isPopular: false,
        },
        {
          name: "Personalizado",
          price: "Em breve",
          features: ["Recursos Customizados", "Suporte Dedicado", "SLA Garantido"],
          buttonText: "Entrar na Lista de Espera",
          isPopular: false,
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.premium-plans-section {
  background-color: #f5f5f5;
  position: relative;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
}

.text-accent {
  color: #8e44ad;
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.text-h3 {
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1.2;
  color: #363636;
}

.plan-card {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
  position: relative;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  &.popular {
    border: 2px solid #8e44ad;
  }
}

.popular-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.8rem;
  padding: 4px 8px;
}

.q-card__section {
  padding-top: 30px;
  padding-bottom: 20px;
}

.q-list {
  margin-top: 20px;
}

.q-item {
  min-height: 32px;
  padding: 4px 0;
}

@media (max-width: 600px) {
  .text-h3 {
    font-size: 1.8rem;
  }
}
</style>
