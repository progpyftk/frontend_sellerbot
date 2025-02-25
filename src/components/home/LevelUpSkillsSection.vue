<!-- src/components/home/LevelUpSkillsSection.vue -->
<template>
  <section class="level-up-skills-section q-py-xl">
    <div class="content-wrapper">
      <div class="text-center q-mb-xl">
        <p class="text-purple q-mb-sm">Free resources to</p>
        <h2 class="text-h2 q-mb-lg">Level-up your selling skills</h2>
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-4" v-for="(resource, index) in resources" :key="index">
          <q-card flat bordered class="resource-card">
            <q-card-section>
              <div class="row q-mb-sm">
                <q-chip
                  v-for="tag in resource.tags"
                  :key="tag"
                  color="grey-3"
                  text-color="grey-8"
                  dense
                >
                  {{ tag }}
                </q-chip>
              </div>
              <h3 class="text-h6 q-mb-md resource-title">{{ resource.title }}</h3>
              <div class="row items-center justify-between">
                <q-btn flat color="purple" label="Read More →" class="read-more-btn" />
                <div class="row items-center">
                  <q-icon name="favorite_border" color="grey" size="sm" />
                  <span class="q-ml-sm text-grey">{{ resource.likes }}</span>
                </div>
              </div>
            </q-card-section>
            <q-img :src="resource.image" :ratio="16 / 9" />
          </q-card>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "LevelUpSkillsSection",
  data() {
    return {
      resources: [
        {
          tags: ["Commerce", "Conversion", "Profit"],
          title: "Increase conversion rates and learn how to manage abandoned carts",
          likes: 112,
          image: "https://vulk.cssninja.io/assets/illustrations/blog/commerce-1.svg",
        },
        {
          tags: ["Orders", "Checkout", "Conversion"],
          title: "How order bumps can help increasing your revenue and conversions",
          likes: 319,
          image: "https://vulk.cssninja.io/assets/illustrations/blog/commerce-2.svg",
        },
        {
          tags: ["Conversion", "Sales", "Products"],
          title: "How a rich and well maintained catalogue easily converts customers",
          likes: 519,
          image: "https://vulk.cssninja.io/assets/illustrations/blog/commerce-3.svg",
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.level-up-skills-section {
  background-color: white;
  position: relative;
  padding-bottom: 100px; // Espaço para a onda
}

.text-purple {
  color: #8e44ad;
  font-size: 1rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.text-h2 {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: #363636;
}

.resource-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 12px; // Cantos mais arredondados
}

.resource-title {
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.4;
  font-family: "Arial", sans-serif; // Ajuste para uma fonte mais parecida com o original
}

.read-more-btn {
  font-size: 0.9rem;
  font-weight: 600;
}

@media (max-width: 600px) {
  .text-h2 {
    font-size: 2rem;
  }
}
</style>
