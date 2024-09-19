<!-- src/components/home/ProductSalesSection.vue -->
<template>
  <section class="product-sales-section q-py-xl">
    <div class="content-wrapper">
      <div class="row items-start">
        <div class="col-12 col-md-6 q-pr-md">
          <p class="text-purple q-mb-xs">Start your Business</p>
          <h2 class="text-h3 q-mb-md">Sell Your Products</h2>
          <p class="q-mb-lg text-grey-8">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quos quidem tibi
            studiose et diligenter tractandos.
          </p>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6" v-for="(item, index) in salesItems" :key="index">
              <div class="sales-item">
                <q-icon :name="item.icon" color="purple" size="32px" class="q-mb-sm" />
                <h4 class="text-weight-bold q-mb-xs">{{ item.title }}</h4>
                <p class="text-grey-8">{{ item.description }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="image-container">
            <div class="circle-backdrop"></div>
            <img
              src="https://vulk.cssninja.io/assets/illustrations/features/commerce-feature-1.png"
              alt="Product Sales"
              class="feature-image"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ProductSalesSection",
  data() {
    return {
      salesItems: [
        {
          icon: "store",
          title: "Sell anywhere",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "code",
          title: "Sell software",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "palette",
          title: "Sell art",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
        {
          icon: "subscriptions",
          title: "Sell subscriptions",
          description:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed videbimus.",
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.product-sales-section {
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

.sales-item {
  margin-bottom: 1rem;

  h4 {
    font-size: 1.1rem;
    margin-bottom: 0.15rem;
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
