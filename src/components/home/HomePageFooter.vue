<template>
  <footer class="innovative-footer q-pa-xl">
    <div class="container">
      <!-- Seção de Ondas Animadas -->
      <div class="wave-container">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path
            fill="#ff6b35"
            fill-opacity="0.8"
            d="M0,160L48,176C96,192,192,224,288,218.7C384,213,480,171,576,149.3C672,128,768,128,864,149.3C960,171,1056,213,1152,218.7C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>

      <!-- Grade de Links Interativa -->
      <div class="interactive-grid q-mb-xl">
        <div
          v-for="(section, index) in footerSections"
          :key="index"
          class="grid-item"
          @mouseenter="activateSection(index)"
          @mouseleave="deactivateSection(index)"
        >
          <q-icon
            :name="section.icon"
            size="3rem"
            :class="{ 'text-accent': activeSections[index] }"
          />
          <h4 class="q-mt-md q-mb-sm">{{ section.title }}</h4>
          <transition name="fade">
            <ul v-if="activeSections[index]">
              <li v-for="link in section.links" :key="link.text">
                <a :href="link.url">{{ link.text }}</a>
              </li>
            </ul>
          </transition>
        </div>
      </div>

      <!-- Seção de Newsletter com Animação -->
      <div class="newsletter-section q-pa-lg text-center">
        <h3 class="text-h4 q-mb-md">Fique por dentro das novidades</h3>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            filled
            type="email"
            label="Seu e-mail"
            style="max-width: 300px; margin: 0 auto"
          >
            <template v-slot:append>
              <q-btn
                round
                dense
                flat
                icon="send"
                color="accent"
                @click="onSubmit"
                :loading="loading"
              >
                <q-tooltip>Inscrever-se</q-tooltip>
              </q-btn>
            </template>
          </q-input>
        </q-form>
      </div>

      <!-- Rodapé Inferior com Efeito Parallax -->
      <div class="bottom-footer q-pt-xl q-pb-md text-center">
        <div class="parallax-container">
          <div class="parallax-layer" data-speed="0.1">
            <q-icon
              name="star"
              size="2rem"
              class="q-mr-xl text-yellow-8"
              style="opacity: 0.7"
            />
          </div>
          <div class="parallax-layer" data-speed="0.2">
            <q-icon
              name="favorite"
              size="1.5rem"
              class="q-ml-xl text-deep-orange"
              style="opacity: 0.5"
            />
          </div>
          <p class="text-body1">
            © {{ new Date().getFullYear() }} Sua Empresa Inovadora. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "HomePageFooter",
  setup() {
    const email = ref("");
    const loading = ref(false);
    const activeSections = ref(Array(4).fill(false));

    const footerSections = [
      {
        icon: "explore",
        title: "Descubra",
        links: [
          { text: "Sobre Nós", url: "/sobre" },
          { text: "Carreira", url: "/carreira" },
          { text: "Parceiros", url: "/parceiros" },
        ],
      },
      {
        icon: "apps",
        title: "Produtos",
        links: [
          { text: "Soluções", url: "/solucoes" },
          { text: "Preços", url: "/precos" },
          { text: "Casos de Sucesso", url: "/casos" },
        ],
      },
      {
        icon: "help",
        title: "Suporte",
        links: [
          { text: "FAQ", url: "/faq" },
          { text: "Contato", url: "/contato" },
          { text: "Comunidade", url: "/comunidade" },
        ],
      },
      {
        icon: "gavel",
        title: "Legal",
        links: [
          { text: "Termos", url: "/termos" },
          { text: "Privacidade", url: "/privacidade" },
          { text: "Cookies", url: "/cookies" },
        ],
      },
    ];

    const onSubmit = () => {
      loading.value = true;
      // Simular envio de e-mail
      setTimeout(() => {
        loading.value = false;
        email.value = "";
        // Aqui você adicionaria a lógica real de envio de e-mail
      }, 2000);
    };

    const activateSection = (index) => {
      activeSections.value[index] = true;
    };

    const deactivateSection = (index) => {
      activeSections.value[index] = false;
    };

    return {
      email,
      loading,
      onSubmit,
      footerSections,
      activeSections,
      activateSection,
      deactivateSection,
    };
  },
  mounted() {
    this.initParallax();
  },
  methods: {
    initParallax() {
      window.addEventListener("mousemove", this.moveParallaxLayer);
    },
    moveParallaxLayer(e) {
      const layers = document.querySelectorAll(".parallax-layer");
      layers.forEach((layer) => {
        const speed = layer.getAttribute("data-speed");
        const x = (window.innerWidth - e.pageX * speed) / 100;
        const y = (window.innerHeight - e.pageY * speed) / 100;
        layer.style.transform = `translateX(${x}px) translateY(${y}px)`;
      });
    },
  },
  beforeUnmount() {
    window.removeEventListener("mousemove", this.moveParallaxLayer);
  },
});
</script>

<style lang="scss" scoped>
.innovative-footer {
  position: relative;
  background: linear-gradient(135deg, #ff6b35 0%, #f7c59f 100%);
  color: white;
  overflow: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.wave-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
}

.interactive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.grid-item {
  text-align: center;
  padding: 1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-5px);
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  a {
    color: white;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}

.newsletter-section {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.bottom-footer {
  position: relative;
}

.parallax-container {
  position: relative;
  height: 100px;
  overflow: hidden;
}

.parallax-layer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .interactive-grid {
    grid-template-columns: 1fr;
  }
}
</style>
