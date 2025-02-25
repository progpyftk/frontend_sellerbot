<!-- src/components/home/MarketProductsSection.vue -->
<template>
  <section class="market-products-section q-py-xl">
    <div class="content-wrapper">
      <div class="row items-start">
        <div class="col-12 col-md-6">
          <div class="image-container">
            <div class="circle-backdrop"></div>
            <img
              src="https://vulk.cssninja.io/assets/illustrations/features/commerce-feature-2.png"
              alt="Market Products"
              class="feature-image"
            />
          </div>
        </div>
        <div class="col-12 col-md-6 q-pl-md">
          <p class="text-purple q-mb-xs">Grow your Business</p>
          <h2 class="text-h3 q-mb-md">Market Your Products</h2>
          <p class="q-mb-lg text-grey-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quos quidem tibi
            studiose et diligenter tractandos.
          </p>

          <div class="row q-col-gutter-md">
            <div
              class="col-12 col-sm-6"
              v-for="(item, index) in marketingItems"
              :key="index"
            >
              <div class="marketing-item">
                <q-icon :name="item.icon" color="purple" size="32px" class="q-mb-sm" />
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
  name: "MarketProductsSection",
  data() {
    return {
      marketingItems: [
        {
          icon: "sell",
          title: "Bundles & upsells",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "mail",
          title: "Email marketing",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "discount",
          title: "Discount codes",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "loyalty",
          title: "Lead magnets",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.market-products-section {
  background-color: white;
  position: relative;
  overflow: hidden;
  font-family: "Roboto", sans-serif;
}

.text-purple {
  color: #8e44ad;
  font-size: 0.9rem;
  font-weight: 500;
}

.text-h3 {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.marketing-item {
  margin-bottom: 1rem;

  h4 {
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
  }

  p {
    font-size: 0.9rem;
    line-height: 1.4;
  }
}

.image-container {
  position: relative;
  width: 100%;
  height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.circle-backdrop {
  position: absolute;
  width: 400px;
  height: 400px;
  background-color: #f3e5f5;
  border-radius: 50%;
  animation: pulse 4s infinite ease-in-out;
}

.feature-image {
  position: relative;
  z-index: 2;
  max-width: 100%;
  height: auto;
}

@keyframes pulse {
  0% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.05) rotate(3deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

@media (max-width: 600px) {
  .image-container {
    height: 300px;
  }

  .circle-backdrop {
    width: 250px;
    height: 250px;
  }
}
</style>
