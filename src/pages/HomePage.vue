<!-- src/pages/HomePage.vue -->
<template>
  <q-layout view="hHh lpR fFf">
    <HomeToolbar />
    <q-page-container>
      <q-page>
        <HeroSection />
        <DigitalStoreSection />
        <ProductSalesSection />
        <MarketProductsSection />
        <CreatorsCommunitySection />
        <LevelUpSkillsSection />
        <SupportBusinessSection />
        <SignUpCallToAction />
        <PlanSelectionSection />
        <HomePageFooter />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent } from "vue";
import HomeToolbar from "src/layouts/HomeToolbar.vue";
import HeroSection from "src/components/home/HeroSection.vue";
import DigitalStoreSection from "components/home/DigitalStoreSection.vue";
import ProductSalesSection from "src/components/home/ProductSalesSection.vue";
import MarketProductsSection from "src/components/home/MarketProductsSection.vue";
import CreatorsCommunitySection from "src/components/home/CreatorsCommunitySection.vue";
import LevelUpSkillsSection from "src/components/home/LevelUpSkillsSection.vue";
import SupportBusinessSection from "src/components/home/SupportBusinessSection.vue";
import SignUpCallToAction from "src/components/home/SignUpCallToAction.vue";
import PlanSelectionSection from "src/components/home/PlanSelectionSection.vue";
import HomePageFooter from "src/components/home/HomePageFooter.vue";

export default defineComponent({
  name: "HomePage",
  components: {
    HomeToolbar,
    HeroSection,
    DigitalStoreSection,
    ProductSalesSection,
    MarketProductsSection,
    CreatorsCommunitySection,
    LevelUpSkillsSection,
    SupportBusinessSection,
    SignUpCallToAction,
    PlanSelectionSection,
    HomePageFooter,
  },
});
</script>

<style lang="scss">
.q-page-container {
  padding-top: 60px; // Ajuste este valor para corresponder à altura do seu toolbar
}

.content-wrapper {
  max-width: 1200px; // Ajuste este valor conforme necessário
  margin: 0 auto;
  padding: 0 20px; // Adiciona um pequeno padding nas laterais
}
</style>
