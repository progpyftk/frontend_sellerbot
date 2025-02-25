<!-- src/components/home/CreatorsCommunitySection.vue -->
<template>
  <section class="creators-community-section q-py-xl">
    <div class="content-wrapper">
      <div class="text-center q-mb-lg">
        <p class="text-white q-mb-sm">A home for your business</p>
        <h2 class="text-h2 text-white q-mb-md">Join your fellow creators</h2>
        <p class="text-white q-mb-xl" style="max-width: 600px; margin: 0 auto">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quamquam te quidem
          video minime esse deterritum. Quae cum dixisset, finem ille cum dolor.
        </p>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-3" v-for="(creator, index) in creators" :key="index">
          <q-card flat bordered class="creator-card">
            <q-card-section>
              <q-icon :name="creator.icon" color="purple" size="36px" class="q-mb-sm" />
              <p class="q-mb-lg">{{ creator.quote }}</p>
              <div class="row items-center">
                <q-avatar size="40px" class="q-mr-sm">
                  <img :src="creator.avatar" :alt="creator.name" />
                </q-avatar>
                <div>
                  <p class="text-weight-bold q-mb-none">{{ creator.name }}</p>
                  <p class="text-caption">{{ creator.title }}</p>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </section>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "CreatorsCommunitySection",
  data() {
    return {
      creators: [
        {
          icon: "camera_alt",
          quote:
            '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quamquam te quidem video minime esse deterritum. Quae cum dixisset, finem ille. Eum tum adesse."',
          name: "Sandra Müller",
          title: "Founder @Livetalk",
          avatar: "https://randomuser.me/api/portraits/women/65.jpg",
        },
        {
          icon: "explore",
          quote:
            '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quamquam te quidem video minime esse deterritum. Quae cum dixisset, finem ille."',
          name: "Eddy Williams",
          title: "Founder @Vonmo",
          avatar: "https://randomuser.me/api/portraits/men/79.jpg",
        },
        {
          icon: "article",
          quote:
            '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quamquam te quidem video minime esse deterritum. Quae cum dixisset, finem ille. Eum tum adesse, cum dolor omnis absit"',
          name: "Navad Prasad",
          title: "Founder @Brookers",
          avatar: "https://randomuser.me/api/portraits/men/55.jpg",
        },
        {
          icon: "chat",
          quote:
            '"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quamquam te quidem video minime esse deterritum."',
          name: "Christina Chu",
          title: "Founder @Bitbreaker",
          avatar: "https://randomuser.me/api/portraits/women/37.jpg",
        },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.creators-community-section {
  background-color: #8e44ad;
  color: white;
  font-family: "Roboto", sans-serif;
}

.text-h2 {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.creator-card {
  height: 100%;
  background-color: white;
  border-radius: 8px;

  .q-card__section {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  p {
    color: #363636;
  }

  .text-caption {
    color: #666;
  }
}

@media (max-width: 600px) {
  .text- h2 {
    font-size: 2rem;
  }
}
</style>
