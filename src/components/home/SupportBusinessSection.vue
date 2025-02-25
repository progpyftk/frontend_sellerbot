<!-- src/components/home/SupportBusinessSection.vue -->
<template>
  <section class="support-business-section q-py-xl">
    <div class="wave-container">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="#ffffff"
          fill-opacity="1"
          d="M0,240 C700,520 960,100 1440,160 L1440,0 L0,0 Z"
        ></path>
      </svg>
    </div>
    <div class="content-wrapper">
      <div class="row items-center">
        <div class="col-12 col-md-6">
          <div class="image-container">
            <img
              src="https://vulk.cssninja.io/assets/illustrations/features/commerce-feature-4.png"
              alt="Support Illustration"
              class="feature-image"
            />
          </div>
        </div>
        <div class="col-12 col-md-6 q-pl-md">
          <p class="text-purple q-mb-xs">Support your Business</p>
          <h2 class="text-h3 q-mb-sm">We're here to help</h2>
          <p class="q-mb-md text-grey-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quos quidem tibi
            studiose et diligenter tractandos.
          </p>

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6" v-for="(item, index) in features" :key="index">
              <div class="feature-item">
                <span
                  class="material-icons text-purple q-mb-sm"
                  style="font-size: 32px"
                  >{{ item.icon }}</span
                >
                <h4 class="text-weight-bold q-mb-xs">{{ item.title }}</h4>
                <p class="text-grey-8">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "SupportBusinessSection",
  data() {
    return {
      features: [
        {
          icon: "store",
          title: "Business insights",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "code",
          title: "All-in-one toolkit",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "palette",
          title: "Tax compliance",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "subscriptions",
          title: "Invoicing",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.support-business-section {
  background-color: #f5f5f5;
  position: relative;
  padding-top: 150px; // Aumentar o padding-top para acomodar a onda
}

.wave-container {
  position: absolute;
  top: -1px;
  left: 0;
  width: 100%;
  overflow: hidden;
  line-height: 0;
}

.wave-container svg {
  position: relative;
  display: block;
  width: 100%;
  height: 100px; // Ajustar a altura conforme necessário
}

.text-purple {
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

.feature-item {
  margin-bottom: 1rem;

  h4 {
    font-size: 1rem;
    margin-bottom: 0.25rem;
  }

  p {
    font-size: 0.9rem;
    line-height: 1.4;
  }
}

.image-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.feature-image {
  max-width: 100%;
  height: auto;
}

@media (max-width: 600px) {
  .text-h3 {
    font-size: 1.8rem;
  }
}

@import url("https://fonts.googleapis.com/icon?family=Material+Icons");

.material-icons {
  font-family: "Material Icons";
  font-weight: normal;
  font-style: normal;
  font-size: 24px; /* Preferred icon size */
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
}
</style>
