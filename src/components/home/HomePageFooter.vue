<template>
  <footer class="sb-footer">
    <div class="footer-inner content-wrapper">

      <!-- Topo: brand + links -->
      <div class="footer-top">
        <div class="footer-brand">
          <div class="brand-logo">
            <q-icon name="smart_toy" size="22px" style="color:#2dd4bf" />
            <span>SellerBot</span>
          </div>
          <p class="brand-desc">
            Gestão inteligente para sellers do<br />Mercado Livre. Simples, rápido e preciso.
          </p>
          <div class="brand-socials">
            <a href="#" class="social-link" aria-label="Instagram">
              <q-icon name="photo_camera" size="18px" />
            </a>
            <a href="#" class="social-link" aria-label="LinkedIn">
              <q-icon name="work" size="18px" />
            </a>
            <a href="#" class="social-link" aria-label="Email">
              <q-icon name="mail" size="18px" />
            </a>
          </div>
        </div>

        <div class="footer-links-grid">
          <div v-for="section in footerLinks" :key="section.title" class="links-col">
            <div class="links-title">{{ section.title }}</div>
            <ul>
              <li v-for="link in section.links" :key="link.label">
                <a :href="link.href">{{ link.label }}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer-sep" />

      <!-- Rodapé -->
      <div class="footer-bottom">
        <span>© {{ year }} SellerBot. Todos os direitos reservados.</span>
        <div class="footer-bottom-links">
          <a href="#">Termos de uso</a>
          <a href="#">Política de privacidade</a>
        </div>
      </div>

    </div>
  </footer>
</template>

<script>
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'HomePageFooter',
  data () {
    return {
      year: new Date().getFullYear(),
      footerLinks: [
        {
          title: 'Produto',
          links: [
            { label: 'Funcionalidades', href: '#' },
            { label: 'Planos e preços', href: '#' },
            { label: 'Integrações', href: '#' },
            { label: 'Novidades', href: '#' },
          ],
        },
        {
          title: 'Suporte',
          links: [
            { label: 'Central de ajuda', href: '#' },
            { label: 'Contato', href: '#' },
            { label: 'Status do sistema', href: '#' },
          ],
        },
        {
          title: 'Empresa',
          links: [
            { label: 'Sobre o SellerBot', href: '#' },
            { label: 'Blog', href: '#' },
            { label: 'Parceiros', href: '#' },
          ],
        },
      ]
    }
  }
})
</script>

<style lang="scss" scoped>
.sb-footer {
  background: #0f172a;
  color: #94a3b8;
  padding: 72px 20px 40px;
}

.content-wrapper { max-width: 1200px; margin: 0 auto; }

.footer-top {
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
  margin-bottom: 48px;
}

.footer-brand {
  flex: 0 0 240px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;

  span {
    font-size: 1.2rem;
    font-weight: 800;
    color: #f1f5f9;
    letter-spacing: -.3px;
  }
}

.brand-desc {
  font-size: .86rem;
  line-height: 1.65;
  color: #64748b;
  margin: 0 0 20px;
}

.brand-socials {
  display: flex;
  gap: 12px;
}

.social-link {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  text-decoration: none;
  transition: background .2s, color .2s;

  &:hover {
    background: rgba(13,148,136,.2);
    color: #2dd4bf;
  }
}

.footer-links-grid {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 40px;
}

.links-col {
  min-width: 120px;
}

.links-title {
  font-size: .78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .8px;
  color: #f1f5f9;
  margin-bottom: 14px;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

a {
  color: #64748b;
  text-decoration: none;
  font-size: .87rem;
  transition: color .2s;

  &:hover { color: #2dd4bf; }
}

.footer-sep {
  border: none;
  border-top: 1px solid rgba(255,255,255,.07);
  margin-bottom: 24px;
}

.footer-bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: .82rem;
  color: #475569;
}

.footer-bottom-links {
  display: flex;
  gap: 20px;

  a { color: #475569; font-size: .82rem; }
}

@media (max-width: 600px) {
  .footer-top { flex-direction: column; }
  .footer-brand { flex: 1; }
  .footer-bottom { flex-direction: column; text-align: center; }
}
</style>
