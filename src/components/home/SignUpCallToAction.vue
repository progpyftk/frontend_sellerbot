<template>
  <div class="sign-up-cta q-pa-xl relative-position">
    <div class="content-wrapper text-center">
      <h2 class="text-h2 q-mb-md text-weight-bold text-primary">Sign Up Now</h2>
      <p class="text-subtitle1 q-mb-xl text-grey-7 max-width-400 q-mx-auto">
        Experience the future of productivity. Join thousands of satisfied users and
        transform your workflow today.
      </p>
      <div class="q-gutter-x-md q-mb-xl">
        <q-btn unelevated color="primary" class="get-started-btn" label="GET STARTED" />
        <q-btn outline color="primary" label="LEARN MORE" />
      </div>
      <p class="text-subtitle2 q-mb-md text-grey-7">Trusted by industry leaders</p>
      <div class="row justify-center q-gutter-xl items-center company-logos">
        <div
          v-for="(logo, index) in companyLogos"
          :key="index"
          class="company-logo-wrapper"
        >
          <q-img
            :src="logo.src"
            :alt="logo.alt"
            class="company-logo"
            :style="{ width: logo.width }"
          />
        </div>
      </div>
    </div>
    <div class="bg-shapes">
      <div v-for="n in 6" :key="n" :class="`bg-shape bg-shape-${n}`"></div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "SignUpCallToAction",
  data() {
    return {
      companyLogos: [
        {
          src: "https://logodownload.org/wp-content/uploads/2014/04/amazon-logo-0.png",
          alt: "Amazon logo",
          width: "100px",
        },
        {
          src:
            "https://seeklogo.com/images/M/mercado-livre-logo-1D23FA3B7C-seeklogo.com.png",
          alt: "Mercado Livre logo",
          width: "120px",
        },
        {
          src: "https://1000logos.net/wp-content/uploads/2021/02/Shopee-logo.png",
          alt: "Shopee logo",
          width: "100px",
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.sign-up-cta {
  min-height: 600px;
  background: linear-gradient(135deg, #f6f8fe 0%, #ffffff 100%);
  overflow: hidden;
}

.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.max-width-400 {
  max-width: 400px;
}

.get-started-btn {
  padding: 12px 32px;
  font-weight: 600;
  font-size: 1.1em;
}

.company-logos {
  margin-top: 2rem;
}

.company-logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  padding: 0 1rem;
}

.company-logo {
  filter: grayscale(100%);
  opacity: 0.7;
  transition: all 0.3s ease;

  &:hover {
    filter: grayscale(0%);
    opacity: 1;
  }
}

.bg-shapes {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  background: linear-gradient(
    135deg,
    rgba(103, 58, 183, 0.1) 0%,
    rgba(103, 58, 183, 0.05) 100%
  );
  border-radius: 50%;
  animation: float 20s infinite ease-in-out;
}

.bg-shape-1 {
  width: 400px;
  height: 400px;
  top: -200px;
  left: -200px;
}

.bg-shape-2 {
  width: 300px;
  height: 300px;
  bottom: -150px;
  right: -150px;
  animation-delay: -5s;
}

.bg-shape-3 {
  width: 200px;
  height: 200px;
  top: 20%;
  right: 10%;
  animation-delay: -10s;
}

.bg-shape-4 {
  width: 150px;
  height: 150px;
  bottom: 15%;
  left: 5%;
  animation-delay: -15s;
}

.bg-shape-5 {
  width: 100px;
  height: 100px;
  top: 10%;
  left: 30%;
  animation-delay: -7s;
}

.bg-shape-6 {
  width: 50px;
  height: 50px;
  bottom: 30%;
  right: 30%;
  animation-delay: -12s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}
</style>
