<template>
  <q-layout view="lHh lpr lFf">
    <q-header class="q-py-sm" style="background-color: #1c1b21;" :style="'border-bottom: 2px solid ' + theme_color">
      <q-toolbar>
        <span :style="'font-size: 35px;color:' + theme_color" class="my-font text-h6 q-mr-md">Kudos</span>
        <q-space></q-space>
        <q-tabs v-model="selected_tab" shrink>
          <q-tab :style="[selected_tab == 't_0' ? {backgroundColor: theme_color} : {}]" class="q-mr-sm q-py-xs custom_tab"
            @click="scrollToElement('id_portfolio');" style="width:120px;min-height:auto !important;color: white"
            label="Portfolio" />
          <!-- Outros tabs removidos para foco no banner -->
        </q-tabs>
        <q-btn class="q-mr-md" size="12px" :style="'min-height:auto !important;background:' + theme_color + '; color: white; padding:1px'"
          dense icon="color_lens">
          <q-tooltip transition-show="flip-right" transition-hide="flip-left" self="center left" anchor="center right">Theme color</q-tooltip>
          <q-menu anchor="bottom left" self="bottom right" transition-show="flip-right" transition-hide="flip-left">
            <q-color v-model="bg_color" no-header no-footer default-view="palette" class="my-picker" @input="changeBgColor()" />
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page>
        <q-carousel v-model="slide" arrows swipeable navigation infinite autoplay control-color="white" transition-prev="slide-right" transition-next="slide-left" height="639px">
          <q-carousel-slide class="q-pa-none" :name="1" img-src="/images/image_1.jpg">
            <div class="full-height full-width flex flex-center" style="background-color: rgba(0, 0, 0, 0.68) !important;">
              <div class="custom-caption">
                <div class="text-h2 main_line animation_2">WELCOME TO <span :style="'color:' + theme_color">KUDOS</span></div><br><br><br>
                <div class="text-h4 animation_1">The Web as I envisaged it, we have not seen it yet. The future<br> is still so much bigger than the past.</div><br><br><br>
                <div class="animation_2">
                  <q-btn size="md" :style="'background:' + theme_color + '; color: white'" label="READ MORE" />
                </div>
              </div>
            </div>
          </q-carousel-slide>

          <q-carousel-slide class="q-pa-none" :name="2" img-src="/images/image_2.jpg">
            <div class="full-height full-width flex flex-center" style="background-color: rgba(0, 0, 0, 0.68) !important;">
              <div class="custom-caption">
                <div class="text-h2 main_line animation_2" style="font-size:65px;"><span :style="'color:' + theme_color">KUDOS</span> FOR THE BEST</div><br><br><br>
                <div class="text-h4 animation_1">A man who dares to waste one hour of time has <br>not discovered the value of life.</div><br><br><br>
                <div class="animation_2">
                  <q-btn size="md" :style="'background:' + theme_color + '; color: white'" label="READ MORE" />
                </div>
              </div>
            </div>
          </q-carousel-slide>

          <q-carousel-slide class="q-pa-none" :name="3" img-src="/images/image_3.jpg">
            <div class="full-height full-width flex flex-center" style="background-color: rgba(0, 0, 0, 0.68) !important;">
              <div class="custom-caption">
                <div class="text-h2 main_line animation_2" style="font-size:65px;">THE PATH OF <span :style="'color:' + theme_color">SUCCESS</span></div><br><br><br>
                <div class="text-h4 animation_1">We have to stop optimizing for programmers and <br>start optimizing for users.</div><br><br><br>
                <div class="animation_2">
                  <q-btn size="md" :style="'background:' + theme_color + '; color: white'" label="READ MORE" />
                </div>
              </div>
            </div>
          </q-carousel-slide>
        </q-carousel>

        <!-- Section below banners -->
        <div class="row q-col-gutter-md q-px-lg q-py-lg">
          <div class="col-md-3 col-lg-3 col-xs-12 col-sm-12">
            <q-card class="q-pa-sm flex flex-center text-center box-shadow" style="margin: 40px;">
              <q-card-section>
                <q-icon size="110px" name="ballot" :style="'color:' + theme_color" />
                <div class="text-h6">Web Design</div>
              </q-card-section>
              <q-card-section class="q-pt-none">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </q-card-section>
            </q-card>
          </div>

          <div class="col-md-3 col-lg-3 col-xs-12 col-sm-12">
            <q-card class="q-pa-sm flex flex-center text-center box-shadow" style="margin: 40px;">
              <q-card-section>
                <q-icon size="110px" name="view_comfy" :style="'color:' + theme_color" />
                <div class="text-h6">Graphics Design</div>
              </q-card-section>
              <q-card-section class="q-pt-none">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </q-card-section>
            </q-card>
          </div>

          <div class="col-md-3 col-lg-3 col-xs-12 col-sm-12">
            <q-card class="q-pa-sm flex flex-center text-center box-shadow" style="margin: 40px;">
              <q-card-section>
                <q-icon size="110px" name="people" :style="'color:' + theme_color" />
                <div class="text-h6">Wordpress Theme</div>
              </q-card-section>
              <q-card-section class="q-pt-none">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </q-card-section>
            </q-card>
          </div>

          <div class="col-md-3 col-lg-3 col-xs-12 col-sm-12">
            <q-card class="q-pa-sm flex flex-center text-center box-shadow" style="margin: 40px;">
              <q-card-section>
                <q-icon size="110px" name="people" :style="'color:' + theme_color" />
                <div class="text-h6">Wordpress Plugin</div>
              </q-card-section>
              <q-card-section class="q-pt-none">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </q-card-section>
            </q-card>
          </div>
        </div>
        <!-- Section 3 -->
        <div class="quote">
          <div class="q-pt-xl full-width full-height flex flex-center" :style="{ backgroundColor: '#000000ad' }">
            <h3 class="text-white text-center">
              Lorem ipsum dolor sit amet, consectetur <br />adipiscing elit, sed do eiusmod tempor incididunt ut
              <br /> labore et dolore magna aliqua.
              <br />
              <br />
              <q-btn
                type="a"
                href="https://github.com/sponsors/mayank091193"
                size="lg"
                :style="'background:' + theme_color + '; color: white'"
                label="Support Me"
              />
            </h3>
          </div>
        </div>

<!-- Section 4 - PORTFOLIO -->
<div class="portfolio-section q-pa-md" id="id_portfolio">
    <div class="text-center q-mb-lg">
      <h5 class="text-h5 q-mb-sm">Our Portfolio</h5>
      <p class="text-grey">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do.</p>
    </div>
    <div class="row q-col-gutter-md justify-center">
      <div v-for="index in 4" :key="index" class="col-12 col-sm-6 col-md-3">
        <div class="portfolio-card">
          <q-img :src="`/images/${index}.jpg`" class="full-height">
            <div class="absolute-full flex flex-center">
              <div class="portfolio-overlay flex flex-center column">
                <div class="text-h6 q-mb-md">Profile Title</div>
                <div class="text-caption q-mb-md text-center">
                  For beautiful eyes, look for the good in others; for beautiful lips, speak only words of kindness.
                </div>
                <div class="portfolio-actions">
                  <q-btn :style="`color: white; background: ${theme_color}`" round icon="card_giftcard" class="q-mr-sm" />
                  <q-btn :style="`color: white; background: ${theme_color}`" round icon="link" />
                </div>
              </div>
            </div>
          </q-img>
        </div>
      </div>
    </div>
  </div>

  <!-- Section 5 ABOUT US-->
  <div class="about-us-section q-pa-md">
    <div class="text-center q-mb-lg">
      <h5 class="q-mb-sm">About Us</h5>
      <p class="text-grey">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </div>

    <div class="row q-col-gutter-md justify-center">
      <!-- Card 1 -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card @mouseover="hoverOver(1)" @mouseout="hoverOutTimeout(1)" class="my-card text-center" flat bordered>
          <q-img src="/images/about_1.jpg" />
          <q-card-section>
            <div class="text-overline text-orange-9">Overline</div>
            <div :class="about_heading_1" :style="'color: ' + about_heading_color_1" class="text-h6 q-mt-sm q-mb-xs">
              OFFICE PHILOSOPHY
            </div>
            <div class="text-caption text-grey-9">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Card 2 -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card @mouseover="hoverOver(2)" @mouseout="hoverOutTimeout(2)" class="my-card text-center" flat bordered>
          <q-img src="/images/about_2.jpg" />
          <q-card-section>
            <div class="text-overline text-orange-9">Overline</div>
            <div :class="about_heading_2" :style="'color: ' + about_heading_color_2" class="text-h6 q-mt-sm q-mb-xs">
              OFFICE MISSION
            </div>
            <div class="text-caption text-grey-9">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Card 3 -->
      <div class="col-12 col-sm-6 col-md-4">
        <q-card @mouseover="hoverOver(3)" @mouseout="hoverOutTimeout(3)" class="my-card text-center" flat bordered>
          <q-img src="/images/about_3.jpg" />
          <q-card-section>
            <div class="text-overline text-orange-9">Overline</div>
            <div :class="about_heading_3" :style="'color: ' + about_heading_color_3" class="text-h6 q-mt-sm q-mb-xs">
              OFFICE VALUE & RULES
            </div>
            <div class="text-caption text-grey-9">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>

  <!-- Section 6 - NOSSOS SERVICOS -->
  <div style="background: #f7f7f7" id="id_services">
    <div class="row">
      <div class="col-12">
        <h5 class="text-center">Our Services
          <br />
          <span class="text-center text-grey text-h6">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span>
        </h5>
      </div>
    </div>
    <div class="q-pa-xl">
      <div class="row q-col-gutter-sm">
        <!-- Primeiro bloco de serviço -->
        <div class="col-12 col-md-4">
          <q-item class="box-shadow q-pa-none q-ml-xs">
            <q-item-section side :style="'background-color:' + theme_color" class="q-pa-sm q-mr-none text-white">
              <q-icon name="compare_arrows" size="65px"></q-icon>
            </q-item-section>
            <q-item-section class="q-pa-md q-ml-none">
              <q-item-label class="text-h6 text-grey-9 text-uppercase">Blockchain</q-item-label>
              <q-item-label class="text-grey-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <!-- Segundo bloco de serviço -->
        <div class="col-12 col-md-4">
          <q-item class="box-shadow q-pa-none q-ml-xs">
            <q-item-section side :style="'background-color:' + theme_color" class="q-pa-sm q-mr-none text-white">
              <q-icon name="web" size="65px"></q-icon>
            </q-item-section>
            <q-item-section class="q-pa-md q-ml-none">
              <q-item-label class="text-h6 text-grey-9 text-uppercase">Web Design</q-item-label>
              <q-item-label class="text-grey-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <!-- Terceiro bloco de serviço -->
        <div class="col-12 col-md-4">
          <q-item class="box-shadow q-pa-none q-ml-xs">
            <q-item-section side :style="'background-color:' + theme_color" class="q-pa-sm q-mr-none text-white">
              <q-icon name="fab fa-wordpress" size="65px"></q-icon>
            </q-item-section>
            <q-item-section class="q-pa-md q-ml-none">
              <q-item-label class="text-h6 text-grey-9 text-uppercase">Wordpress</q-item-label>
              <q-item-label class="text-grey-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</q-item-label>
            </q-item-section>
          </q-item>
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mt-lg">
        <!-- Quarto bloco de serviço -->
        <div class="col-12 col-md-4">
          <q-item class="box-shadow q-pa-none q-ml-xs">
            <q-item-section side :style="'background-color:' + theme_color" class="q-pa-sm q-mr-none text-white">
              <q-icon name="settings" size="65px"></q-icon>
            </q-item-section>
            <q-item-section class="q-pa-md q-ml-none">
              <q-item-label class="text-h6 text-grey-9 text-uppercase">DevOps</q-item-label>
              <q-item-label class="text-grey-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <!-- Quinto bloco de serviço -->
        <div class="col-12 col-md-4">
          <q-item class="box-shadow q-pa-none q-ml-xs">
            <q-item-section side :style="'background-color:' + theme_color" class="q-pa-sm q-mr-none text-white">
              <q-icon name="fas fa-database" size="65px"></q-icon>
            </q-item-section>
            <q-item-section class="q-pa-md q-ml-none">
              <q-item-label class="text-h6 text-grey-9 text-uppercase">Big Data</q-item-label>
              <q-item-label class="text-grey-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</q-item-label>
            </q-item-section>
          </q-item>
        </div>
        <!-- Sexto bloco de serviço -->
        <div class="col-12 col-md-4">
          <q-item class="box-shadow q-pa-none q-ml-xs q-mr-xs">
            <q-item-section side :style="'background-color:' + theme_color" class="q-pa-sm q-mr-none text-white">
              <q-icon name="dynamic_feed" size="65px"></q-icon>
            </q-item-section>
            <q-item-section class="q-pa-md q-ml-none">
              <q-item-label class="text-h6 text-grey-9 text-uppercase">AI</q-item-label>
              <q-item-label class="text-grey-8">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</q-item-label>
            </q-item-section>
          </q-item>
        </div>
      </div>
    </div>
  </div>

  <!-- Section 7 - PLANS AND PRICES -->
  <div class="pricing" id="id_pricing">
    <div style="background-color: #000000ad !important;">
      <div class="row">
        <div class="col-12">
          <h5 class="text-center text-white">Our Pricing Plan
            <br />
            <span class="text-center text-grey text-h6">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span>
          </h5>
        </div>
      </div>
      <div class="row q-col-gutter-sm q-px-xl">
        <!-- Plano FREE -->
        <div class="col-12 col-sm-6 col-md-3 q-px-lg">
          <q-card>
            <q-card-section class="text-white" style="background: #ec982f">
              <div class="text-h6 text-center">FREE</div>
            </q-card-section>
            <q-card-section class="q-pa-md">
              <q-list dense padding style="border-bottom: 1px solid lightgrey;">
                <q-item><span class="text-weight-bold">For small size companies</span></q-item>
                <q-item>50 GB storage</q-item>
                <q-item>10 Domains</q-item>
                <q-item>15 Projects</q-item>
                <q-item>Free Deployment</q-item>
              </q-list>
            </q-card-section>
            <q-card-section class="q-pa-none" style="color: #ec982f">
              <div class="text-center">
                <span class="text-h2">$0</span>/mo
              </div>
            </q-card-section>
            <q-card-section>
              <div class="text-center q-px-lg">
                <q-btn size="md" class="full-width q-pa-xs" style="background: #ec982f; color: white" label="Choose Plan" />
                <br />
                <div class="q-mt-md">Terms and Conditions apply</div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Plano STANDARD -->
        <div class="col-12 col-sm-6 col-md-3 q-px-lg">
          <q-card>
            <q-card-section class="text-white" style="background: #f4655f">
              <div class="text-h6 text-center">STANDARD</div>
            </q-card-section>
            <q-card-section class="q-pa-md">
              <q-list dense padding style="border-bottom: 1px solid lightgrey;">
                <q-item><span class="text-weight-bold">For medium companies</span></q-item>
                <q-item>50 GB storage</q-item>
                <q-item>10 Domains</q-item>
                <q-item>15 Projects</q-item>
                <q-item>Free Deployment</q-item>
              </q-list>
            </q-card-section>
            <q-card-section class="q-pa-none" style="color: #f4655f">
              <div class="text-center">
                <span class="text-h2">$50</span>/mo
              </div>
            </q-card-section>
            <q-card-section>
              <div class="text-center q-px-lg">
                <q-btn size="md" class="full-width q-pa-xs" style="background: #f4655f; color: white" label="Choose Plan" />
                <br />
                <div class="q-mt-md">Terms and Conditions apply</div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Plano PREMIUM -->
        <div class="col-12 col-sm-6 col-md-3 q-px-lg">
          <q-card>
            <q-card-section class="text-white q-pa-md" style="background: #8b3bbd">
              <div class="text-h6 text-center">PREMIUM</div>
            </q-card-section>
            <q-card-section class="q-pa-md">
              <q-list dense padding style="border-bottom: 1px solid lightgrey;">
                <q-item><span class="text-weight-bold">For average companies</span></q-item>
                <q-item>50 GB storage</q-item>
                <q-item>10 Domains</q-item>
                <q-item>15 Projects</q-item>
                <q-item>Free Deployment</q-item>
              </q-list>
            </q-card-section>
            <q-card-section class="q-pa-none" style="color: #8b3bbd">
              <div class="text-center">
                <span class="text-h2">$250</span>/mo
              </div>
            </q-card-section>
            <q-card-section>
              <div class="text-center q-px-lg">
                <q-btn size="md" class="full-width q-pa-xs" :style="'background: #8b3bbd; color: white'" label="Choose Plan" />
                <br />
                <div class="q-mt-md">Terms and Conditions apply</div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Plano PROFESSIONAL -->
        <div class="col-12 col-sm-6 col-md-3 q-px-lg">
          <q-card>
            <q-card-section class="text-white" style="background: #3b97d1">
              <div class="text-h6 text-center">PROFESSIONAL</div>
            </q-card-section>
            <q-card-section class="q-pa-md">
              <q-list dense padding style="border-bottom: 1px solid lightgrey;">
                <q-item><span class="text-weight-bold">For large companies</span></q-item>
                <q-item>50 GB storage</q-item>
                <q-item>10 Domains</q-item>
                <q-item>15 Projects</q-item>
                <q-item>Free Deployment</q-item>
              </q-list>
            </q-card-section>
            <q-card-section class="q-pa-none" style="color: #3b97d1">
              <div class="text-center">
                <span class="text-h2">$500</span>/mo
              </div>
            </q-card-section>
            <q-card-section>
              <div class="text-center q-px-lg">
                <q-btn size="md" class="full-width q-pa-xs" style="background: #3b97d1; color: white" label="Choose Plan" />
                <br />
                <div class="q-mt-md">Terms and Conditions apply</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
      <br>
      <br>
      <br>
    </div>

  </div>

  <q-footer class="bg-primary text-white q-pa-md">
    <div class="row items-center justify-between">
      <!-- Logo ou Nome da Empresa -->
      <div class="col-auto">
        <q-icon name="business" size="lg" class="q-mr-sm" />
        <span class="text-h6">Your Company</span>
      </div>

      <!-- Links de navegação -->
      <div class="col-auto">
        <q-btn flat class="text-white" label="Home" to="/" />
        <q-btn flat class="text-white" label="About" to="/about" />
        <q-btn flat class="text-white" label="Services" to="/services" />
        <q-btn flat class="text-white" label="Contact" to="/contact" />
      </div>

      <!-- Redes Sociais -->
      <div class="col-auto">
        <q-icon name="fab fa-facebook" size="lg" class="q-mx-sm cursor-pointer" />
        <q-icon name="fab fa-twitter" size="lg" class="q-mx-sm cursor-pointer" />
        <q-icon name="fab fa-linkedin" size="lg" class="q-mx-sm cursor-pointer" />
      </div>
    </div>
    <div class="row justify-center q-mt-md">
      <div class="col-auto">
        <p class="text-caption">&copy; 2024 Your Company. All rights reserved.</p>
      </div>
    </div>
  </q-footer>



      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { scroll } from 'quasar';
const { getScrollTarget, setScrollPosition } = scroll;

export default {
  data() {
    return {
      slide: 1,
      selected_tab: 't_0',
      bg_color: 'rgb(0, 163, 82)',
      theme_color: 'rgb(0, 163, 82)',
      hover: false,
      active: false,
      style: {
        width: '340px', // Ajuste de largura
        height: '180px', // Ajuste de altura
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        display: 'inline-block',
      },
      background_style: {
        backgroundColor: 'rgba(0, 163, 82, 0.7)',
      },
      // Dados adicionais para a seção About Us
      about_heading_1: 'text-h6',
      about_heading_color_1: '#000',
      about_heading_2: 'text-h6',
      about_heading_color_2: '#000',
      about_heading_3: 'text-h6',
      about_heading_color_3: '#000',
      hoveredCard: null, // Controla o card que está sendo hoverado
    };
  },
  methods: {
    scrollToElement(id) {
      const el = document.getElementById(id);
      const target = getScrollTarget(el);
      const offset = el.offsetTop + 3;
      const duration = 900;
      setScrollPosition(target, offset, duration);
    },
    changeBgColor() {
      this.theme_color = this.bg_color;
    },
    // Métodos adicionais para a seção About Us
    hoverOver(index) {
      if (index === 1) {
        this.about_heading_color_1 = '#ff5722'; // Cor ao passar o mouse
      } else if (index === 2) {
        this.about_heading_color_2 = '#ff5722';
      } else if (index === 3) {
        this.about_heading_color_3 = '#ff5722';
      }
    },
    hoverOutTimeout(index) {
      setTimeout(() => {
        if (index === 1) {
          this.about_heading_color_1 = '#000'; // Cor original
        } else if (index === 2) {
          this.about_heading_color_2 = '#000';
        } else if (index === 3) {
          this.about_heading_color_3 = '#000';
        }
      }, 300);
    },
  },
};
</script>

<style lang="sass" scoped>
// Estilos existentes
.main_line
  font-size: 75px
  letter-spacing: 5px
  line-height: 60px
  font-weight: 600

.custom-caption
  text-align: center
  padding: 12px
  color: white

.animation_1
  animation: bounceIn 1s ease-in 800ms both

.animation_2
  animation: flipInX 2s ease-in-out 800ms both

.box-shadow:hover
  box-shadow: 0 10px 13px -6px rgba(0, 0, 0, 0.2), 0 20px 31px 3px rgba(0, 0, 0, 0.14), 0 8px 38px 7px rgba(0, 0, 0, 0.12) !important

.q-ma-md
  margin: 20px

.text-center
  text-align: center

.q-card-section
  padding-top: 0 !important

.q-card-actions
  justify-content: center

.quote
  background: url('/images/parallax.jpg')
  background-size: cover
  background-position: center
  background-attachment: fixed
  background-repeat: no-repeat
  width: 100%
  height: auto
  padding-top: 0px

.full-width
  width: 100%

.full-height
  height: 100%

.flex
  display: flex

.flex-center
  justify-content: center
  align-items: center

// Novos estilos para a seção About Us
.about-us-section
  .row
    display: flex
    flex-wrap: wrap
    margin: -12px
    justify-content: center

  .col-12
    padding: 12px

  .my-card
    height: 100%
    display: flex
    flex-direction: column
    transition: all 0.3s ease // Adiciona uma transição suave para todos os efeitos

    // Novo efeito de hover
    &:hover
      transform: translateY(-5px) // Move o card ligeiramente para cima
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1), 0 10px 15px rgba(0, 0, 0, 0.05) // Sombra mais pronunciada

    .q-card-section
      flex-grow: 1

  // Media queries permanecem as mesmas
  @media (max-width: 599px)
    .col-12
      width: 100%

  @media (min-width: 600px) and (max-width: 1023px)
    .col-sm-6
      width: 50%

  @media (min-width: 1024px)
    .col-md-4
      width: 33.33%

// PORTFOLIO

.portfolio-section
  background-color: #e0e0e0  // Cinza claro (pode ajustar o tom se necessário)
  padding: 40px 0  // Mantém o padding para o espaçamento vertical

.portfolio-card
  position: relative
  height: 300px
  overflow: hidden
  border-radius: 8px
  box-shadow: 0 4px 6px rgba(0,0,0,0.1)
  transition: all 0.3s ease

  &:hover
    transform: translateY(-5px)
    box-shadow: 0 8px 15px rgba(0,0,0,0.2)

    .portfolio-overlay
      opacity: 1

.portfolio-overlay
  background: rgba(0,0,0,0.7)
  opacity: 0
  transition: opacity 0.3s ease
  padding: 20px

  .text-h6, .text-caption
    color: white

.portfolio-actions
  opacity: 0
  transition: opacity 0.3s ease 0.1s

.portfolio-card:hover .portfolio-actions
  opacity: 1

// Mantendo os estilos existentes para outros elementos
.row
  display: flex
  flex-wrap: wrap
  justify-content: center
  gap: 0px // Espaço entre os cards

.col-md-4, .col-lg-4, .col-sm-12
  flex: 1 1 30% // Define que os cards ocupam até 30% do container
  min-width: 160px // Define uma largura mínima para os cards
  max-width: 350px // Limita a largura máxima dos cards
  margin: 10px // Adiciona espaçamento entre os cards

@media (max-width: 768px) // Para telas menores, ajusta o comportamento
  .col-md-4, .col-lg-4, .col-sm-12
    flex: 1 1 100% // Para celulares, ocupa 100% do espaço disponível
    max-width: 100%


    .q-footer
    background-color: #2c3e50  /* Cor de fundo do rodapé */
    padding: 16px  /* q-pa-md */
    color: white

    a
      text-decoration: none
      color: inherit

    .row
      display: flex
      justify-content: space-between
      align-items: center

    .col-auto
      display: flex
      align-items: center

    .cursor-pointer
      cursor: pointer

      &:hover
        color: #ecf0f1  /* Cor mais clara ao passar o mouse */

    .text-caption
      font-size: 0.75rem  /* Estilo do texto de direitos autorais */
      margin-top: 16px  /* q-mt-md */
      text-align: center

</style>
