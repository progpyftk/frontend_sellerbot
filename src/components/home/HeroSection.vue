<!-- src/components/home/HeroSection.vue -->
<template>
  <section class="hero-section">
    <div class="content-wrapper">
      <div class="row items-center">
        <div class="col-12 col-md-6 q-pr-md">
          <h1 class="text-h2 q-mb-md">
            Sell Digital Goods, Products and Art The
            <span class="text-purple">Easy-Peasy</span> Way.
          </h1>
          <p class="text-subtitle1 q-mb-lg">
            Selling digital downloads, subscriptions and software licenses has never been easier, faster or more secure.
          </p>
          <div>
          <q-btn unelevated color="purple" label="Free Trial" no-caps class="cta-btn q-mr-sm" />
          <q-btn outline color="grey-6" label="Demo" no-caps class="cta-btn demo-btn" />
        </div>
        </div>
        <div class="col-12 col-md-6 illustration-container">
          <img src="https://vulk.cssninja.io/assets/illustrations/hero/commerce.svg" alt="Hero illustration" class="hero-image">
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HeroSection'
})
</script>

<style lang="scss" scoped>
.hero-section {
  background-color: #f5f5f5;
  min-height: 500px;
  position: relative;
  overflow: hidden;
  width: 100%;
}

.hero-image {
  max-width: 100%;
  height: auto;
}

h1 {
  font-weight: bold;
  line-height: 1.2;
}

.text-purple {
  color: #8e44ad;
}

.illustration-container {
  position: relative;
}

// Adicione pontos decorativos
.hero-section::before,
.hero-section::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #8e44ad;
  border-radius: 50%;
}

.hero-section::before {
  top: 20%;
  left: 10%;
}

.hero-section::after {
  bottom: 15%;
  right: 5%;
}

.hero-image {
  max-width: 80%;
  height: auto;
  display: block;
  margin: 0 auto;
}

.cta-btn {
  font-size: 14px;
  padding: 12px 24px;
  border-radius: 15px;
}

.demo-btn {
  background-color: white;
}

:deep(.q-btn) {
  text-transform: none;
}
</style>
