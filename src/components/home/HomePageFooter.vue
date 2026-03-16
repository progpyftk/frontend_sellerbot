<template>
  <footer class="sb-footer">
    <div class="footer-inner content-wrapper">

      <!-- Brand column -->
      <div class="footer-brand">
        <div class="brand-logomark">K</div>
        <div class="brand-text">
          <span class="brand-name">Krivos</span>
          <span class="brand-sub">Consultoria</span>
        </div>
        <p class="brand-desc">
          Consultoria e tecnologia para empresas que querem crescer no varejo digital
          — do B2B ao B2C com método, dados e um time dedicado.
        </p>
        <div class="social-links">
          <a href="https://instagram.com" target="_blank" class="slink" aria-label="Instagram">
            <q-icon name="photo_camera" size="18px" />
          </a>
          <a href="https://linkedin.com" target="_blank" class="slink" aria-label="LinkedIn">
            <q-icon name="work" size="18px" />
          </a>
          <a href="mailto:contato@krivos.com.br" class="slink" aria-label="E-mail">
            <q-icon name="mail" size="18px" />
          </a>
        </div>
      </div>

      <!-- Links columns -->
      <div class="footer-links-col">
        <div class="fcol-title">Krivos</div>
        <a href="#about">Quem somos</a>
        <a href="#metodologia">Metodologia</a>
        <a href="#plans">Modelos de parceria</a>
        <a href="mailto:contato@krivos.com.br">Fale conosco</a>
      </div>

      <div class="footer-links-col">
        <div class="fcol-title">Ferramentas</div>
        <a href="#sellerbot">SellerBot</a>
        <a href="#services">Integração ML</a>
        <a href="#shopee">Integração Shopee</a>
        <a href="#services">Tiny ERP</a>
      </div>

      <div class="footer-links-col">
        <div class="fcol-title">Acesso</div>
        <router-link to="/login">Entrar no SellerBot</router-link>
        <router-link to="/signup">Criar conta</router-link>
        <a href="mailto:contato@krivos.com.br">Suporte</a>
      </div>

    </div>

    <div class="footer-bottom">
      <div class="content-wrapper footer-bottom-inner">
        <span>© {{ new Date().getFullYear() }} Krivos Consultoria. Todos os direitos reservados.</span>
        <div class="footer-bottom-links">
          <a href="#">Privacidade</a>
          <a href="#">Termos de uso</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({ name: 'HomePageFooter' })
</script>

<style lang="scss" scoped>
.sb-footer {
  background: #0f172a;
  border-top: 1px solid rgba(255,255,255,.07);
}

.content-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.footer-inner {
  display: grid;
  grid-template-columns: 1.8fr 1fr 1fr 1fr;
  gap: 48px;
  padding-top: 64px;
  padding-bottom: 48px;
}

/* Brand */
.footer-brand { display: flex; flex-direction: column; gap: 14px; }

.brand-logomark {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 900;
  color: #fff;
}

.brand-text { display: flex; align-items: baseline; gap: 6px; }

.brand-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #f1f5f9;
}

.brand-sub {
  font-size: .75rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.brand-desc {
  font-size: .85rem;
  color: #475569;
  line-height: 1.65;
  margin: 0;
  max-width: 280px;
}

.social-links {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.slink {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  text-decoration: none;
  transition: color .2s, background .2s;

  &:hover { color: #2dd4bf; background: rgba(45,212,191,.1); }
}

/* Link columns */
.footer-links-col {
  display: flex;
  flex-direction: column;
  gap: 10px;

  a {
    font-size: .86rem;
    color: #64748b;
    text-decoration: none;
    transition: color .2s;
    line-height: 1;
    &:hover { color: #2dd4bf; }
  }
}

.fcol-title {
  font-size: .73rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: #f1f5f9;
  margin-bottom: 6px;
}

/* Bottom bar */
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,.06);
  padding: 20px 0;
}

.footer-bottom-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-bottom span {
  font-size: .8rem;
  color: #475569;
}

.footer-bottom-links {
  display: flex;
  gap: 20px;

  a {
    font-size: .8rem;
    color: #475569;
    text-decoration: none;
    &:hover { color: #2dd4bf; }
  }
}

@media (max-width: 900px) {
  .footer-inner { grid-template-columns: 1fr 1fr; }
  .footer-brand { grid-column: 1 / -1; }
}

@media (max-width: 600px) {
  .footer-inner { grid-template-columns: 1fr; gap: 32px; padding-top: 48px; }
  .footer-bottom-inner { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
