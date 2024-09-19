<!-- src/components/home/DigitalStore.vue -->
<template>
  <section class="digital-store-section q-py-xl">
    <div class="content-wrapper">
      <div class="row items-center">
        <div class="col-12 text-center q-mb-lg">
          <p class="text-purple q-mb-sm">Build your Business</p>
          <h2 class="text-h3 q-mb-md">Create your Digital Store</h2>
        </div>
        <div class="col-12 col-md-8 offset-md-2">
          <div class="store-image-container">
            <div class="circle circle-5"></div>
            <div class="circle circle-6"></div>
            <img
              src="https://vulk.cssninja.io/assets/illustrations/apps/commerce-app.png"
              alt="Digital Store"
              class="store-image"
            />
            <div class="feature simple-to-use">
              <h4>Simple to use</h4>
              <p>
                Our app is very intuitive and simple to use, even for tech-savy users.
              </p>
            </div>
            <div class="feature profit">
              <h4>90% Profit</h4>
              <p>We only take a small part of your earnings every month, for the best.</p>
            </div>
            <div class="feature secure">
              <h4>Secure</h4>
              <p>
                Our payment gateways integrations are very reliable, secure and private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="circle circle-1"></div>
    <div class="circle circle-2"></div>
    <div class="circle circle-3"></div>
    <div class="circle circle-4"></div>
  </section>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "DigitalStore",
});
</script>

<style lang="scss" scoped>
.digital-store-section {
  background-color: white;
  position: relative;
  overflow: hidden;
}

.text-purple {
  color: #8e44ad;
}

.store-image-container {
  position: relative;
  text-align: center;
}

.store-image {
  max-width: 100%;
  height: auto;
  position: relative;
  z-index: 2;
}

.feature {
  position: absolute;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 200px;
  z-index: 3;

  h4 {
    font-size: 1.1rem;
    margin-bottom: 5px;
  }

  p {
    font-size: 0.9rem;
    color: #666;
  }
}

.simple-to-use {
  left: 0;
  top: 20%;
}

.profit {
  right: 0;
  top: 50%;
}

.secure {
  left: 10%;
  bottom: 10%;
}

@media (max-width: 600px) {
  .feature {
    position: static;
    margin: 20px auto;
  }
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.circle-1 {
  width: 300px;
  height: 300px;
  background-color: #8e44ad;
  top: -150px;
  left: -150px;
}

.circle-2 {
  width: 200px;
  height: 200px;
  background-color: #3498db;
  top: 20%;
  right: -100px;
}

.circle-3 {
  width: 150px;
  height: 150px;
  background-color: #e74c3c;
  bottom: 10%;
  left: 5%;
}

.circle-4 {
  width: 100px;
  height: 100px;
  background-color: #2ecc71;
  bottom: -50px;
  right: 10%;
}

.circle-5 {
  width: 400px;
  height: 400px;
  background-color: #f1c40f;
  top: -50px;
  left: -100px;
  z-index: 1;
}

.circle-6 {
  width: 300px;
  height: 300px;
  background-color: #1abc9c;
  bottom: -50px;
  right: -50px;
  z-index: 1;
}
</style>

