<template>
<div class="landing">
  <a class="skip" href="#conteudo" @click="goToAnchor">Pular para o conteúdo</a>
  <header class="header dark">
    <div class="wrap header-inner">
      <a class="brand" href="#inicio" aria-label="Krivus — início" @click="goToAnchor"><KrivusLogo /></a>
      <nav aria-label="Navegação principal"><a href="#ferramentas" @click="goToAnchor">SellerBot</a><a href="#mentoria" @click="goToAnchor">Mentoria</a><a href="#consultoria" @click="goToAnchor">Consultoria</a></nav>
      <router-link class="header-contact" to="/login">Entrar no SellerBot <span aria-hidden="true">↗</span></router-link>
    </div>
  </header>
  <main id="conteudo" tabindex="-1">
    <section id="inicio" class="hero dark" aria-labelledby="hero-title">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">MERCADO LIVRE · SHOPEE · GESTÃO</p>
          <h1 id="hero-title">IA na operação.<br><em>Experiência<br>na gestão.</em></h1>
          <p class="lead">Mentoria e consultoria com o SellerBot. Inteligência artificial em Ads, promoções, precificação e criação de anúncios.</p>
          <a class="button primary" :href="whatsapp.operation" data-offer="operacao">Conversar sobre minha operação <span aria-hidden="true">↗</span></a>
          <a class="hero-tools-link" href="#ferramentas" @click="goToAnchor">Conhecer as ferramentas <span aria-hidden="true">↓</span></a>
        </div>
        <div class="hero-analysis"><MarginCalculator @navigate="goToAnchor" /></div>
        <section id="cases" class="hero-cases" aria-labelledby="cases-title"><h2 id="cases-title">CASES E OPERAÇÕES</h2><div class="case-brands"><div v-for="example in cases" :key="example.name"><strong>{{ example.name }}</strong><span>{{ example.topic }}</span></div></div></section>
      <div class="hero-product"><div class="hero-product-caption"><span>SELLERBOT POR DENTRO</span><a href="#ferramentas" @click="goToAnchor">Explorar ferramentas ↗</a></div><ProductCapture src="/images/sellerbot/tendencia.webp" label="Publicidade e evolução diária" alt="Tela real de publicidade do SellerBot com indicadores e gráfico diário de investimento. Dados demonstrativos." :height="975" /></div>
      </div>
    </section>

    <section id="ferramentas" class="section wrap tools-section" aria-labelledby="tools-title">
      <div class="tools-heading"><div><p class="eyebrow">SELLERBOT · TECNOLOGIA DA KRIVUS</p><h2 id="tools-title">Veja o SellerBot<br><em>em operação.</em></h2></div><p>Escolha uma ferramenta.<br>Veja a interface por dentro.</p></div>
      <SellerBotTools />
    </section>

    <section id="tributario" class="tax-section" aria-labelledby="tax-title">
      <div class="wrap section tax-grid">
        <div><p class="eyebrow">DIAGNÓSTICO DA KRIVUS</p><h2 id="tax-title">O tributário decide<br>quem ganha<br><em>o jogo.</em></h2><a class="text-link" href="#margin-tax" @click="goToAnchor">Simular o impacto na margem <span aria-hidden="true">↑</span></a></div>
        <div class="tax-decisions"><h3>Tributos e saúde da empresa.</h3><p>Margem, caixa, estoque, compras e carga tributária na mesma análise. Diagnóstico e prioridades para a sua operação.</p><ProductCapture src="/images/sellerbot/precos.webp" label="Composição da margem" alt="Cascata da margem no SellerBot, do faturamento à contribuição após impostos e custos. Dados demonstrativos." :width="840" :height="509" /><p class="tax-note">Na reforma tributária, cenários de IBS e CBS são avaliados com a contabilidade. IBS: Imposto sobre Bens e Serviços. CBS: Contribuição sobre Bens e Serviços.</p><a class="tax-source" href="https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/cgsn-atualiza-regras-do-simples-nacional-para-adequacao-a-reforma-tributaria-do-consumo">Reforma tributária · Receita Federal <span aria-hidden="true">↗</span></a></div>
      </div>
    </section>

    <section class="services section" aria-labelledby="services-title">
      <div class="wrap"><p class="eyebrow">MENTORIA E CONSULTORIA</p><h2 id="services-title">Tecnologia com direção.<br>Escolha como trabalhar.</h2>
        <div class="service-grid">
          <article id="mentoria" class="mentoring" tabindex="-1"><span class="service-label">01 / MENTORIA</span><h3>Sua equipe executa.<br><em>A Krivus orienta.</em></h3><div class="program"><span><strong>5</strong> meses</span><span><strong>10</strong> encontros</span><span><strong>Sua equipe</strong> participa</span></div><p>Diagnóstico, prioridades e plano de ação. Encontros com quem decide e executa, acompanhando os dados e as mudanças da empresa.</p><a class="button primary" :href="whatsapp.mentoring" data-offer="mentoria">Avaliar a mentoria <span aria-hidden="true">↗</span></a></article>
          <article id="consultoria" class="consulting" tabindex="-1"><span class="service-label">02 / CONSULTORIA</span><h3>Escopo definido.<br>A Krivus executa.</h3><p>Implantação, melhorias ou acompanhamento da operação. Atividades, responsáveis e entregas definidos na proposta.</p><a class="text-link" :href="whatsapp.consulting" data-offer="consultoria">Conversar sobre consultoria <span aria-hidden="true">↗</span></a></article>
        </div>
        <p class="service-note">Ferramentas, canais e suporte conforme a proposta. Validações contábeis, fiscais e aduaneiras ficam com os profissionais responsáveis.</p>
      </div>
    </section>

    <section id="perguntas" class="section wrap faq" aria-labelledby="faq-title"><div><p class="eyebrow">DÚVIDAS DIRETAS</p><h2 id="faq-title">Antes de começar.</h2></div><div><details v-for="question in questions" :key="question.title"><summary>{{ question.title }}<span aria-hidden="true">+</span></summary><p>{{ question.answer }}</p></details></div></section>
    <section id="conversar" class="closing" aria-labelledby="closing-title"><div class="wrap"><p class="eyebrow">VAMOS CONVERSAR</p><h2 id="closing-title">Sua operação.<br>Nosso próximo assunto.</h2><div class="closing-bottom"><p>Conte-nos onde você vende e em que precisa de apoio.</p><div><a class="button light" :href="whatsapp.operation" data-offer="operacao">Conversar sobre minha operação <span aria-hidden="true">↗</span></a><p class="contact-note">WhatsApp · +55 11 99818-0409</p></div></div></div></section>
  </main>
  <footer class="wrap footer"><a class="brand" href="#inicio" aria-label="Krivus — voltar ao início" @click="goToAnchor"><KrivusLogo /></a><span>Experiência operacional. Dados. Tecnologia.</span><a href="#inicio" @click="goToAnchor">Voltar ao início <span aria-hidden="true">↑</span></a></footer>
</div>
</template>

<script setup>
import { useMeta } from 'quasar';
import KrivusLogo from 'src/components/landing/KrivusLogo.vue';
import MarginCalculator from 'src/components/landing/MarginCalculator.vue';
import SellerBotTools from 'src/components/landing/SellerBotTools.vue';
import ProductCapture from 'src/components/landing/ProductCapture.vue';

defineOptions({ name: 'LandingPage' });
const title = 'Krivus — Mentoria e consultoria para e-commerce e marketplaces';
const description = 'Mentoria e consultoria para empresas que vendem no Mercado Livre e na Shopee. Experiência operacional, dados e tecnologia própria para conectar preço, mídia, estoque e caixa.';
// O domínio canônico permanece pendente; não inferir URL de produção do host da prévia.
useMeta({ title, meta: {
  description: { name: 'description', content: description },
  robots: { name: 'robots', content: 'noindex,nofollow' },
  ogTitle: { property: 'og:title', content: title },
  ogDescription: { property: 'og:description', content: description },
  ogType: { property: 'og:type', content: 'website' },
  ogLocale: { property: 'og:locale', content: 'pt_BR' },
  twitterCard: { name: 'twitter:card', content: 'summary' },
  twitterTitle: { name: 'twitter:title', content: title },
  twitterDescription: { name: 'twitter:description', content: description },
}, script: { organization: { type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Krivus', telephone: '+55-11-99818-0409' }) } } });
const contact = (message) => `https://wa.me/5511998180409?text=${encodeURIComponent(message)}`;
const whatsapp = {
  operation: contact('Olá, quero conversar sobre minha operação com a Krivus. Vendo em: ___. Minha principal dificuldade hoje é: ___.'),
  mentoring: contact('Olá, quero avaliar a mentoria Krivus para minha empresa. Vendo em: ___. Minha principal dificuldade hoje é: ___.'),
  consulting: contact('Olá, quero conversar sobre consultoria Krivus. Vendo em: ___. Preciso de apoio na execução de: ___.'),
};
// Nomes autorizados pelo dono; contextos sustentados no acervo, sem métricas inventadas.
const cases = [
  { name: 'Doseverde', topic: 'PREÇO E PROMOÇÕES', context: 'Análise de desconto com produto real para discutir contribuição e volume.' },
  { name: 'Livpro', topic: 'MERCADO LIVRE E SHOPEE', context: 'Dados dos dois canais conectados ao SellerBot para acompanhar a operação.' },
  { name: 'Casadossuportes', topic: 'PRECIFICAÇÃO POR CANAL', context: 'Revisão de preços e custos considerando as condições de cada marketplace.' },
  { name: 'GrampoFix', topic: 'ANÚNCIOS E PROMOÇÕES', context: 'Operação conectada ao SellerBot para análise de anúncios e promoções.' },
];
const questions = [
  { title: 'Quem participa da mentoria?', answer: 'Você e as pessoas que decidem e executam. Dez encontros em cinco meses, com prioridades definidas pelo diagnóstico.' },
  { title: 'O SellerBot está incluído?', answer: 'Acesso, integrações e ferramentas são definidos na proposta. O escopo considera os canais e os dados da empresa.' },
  { title: 'Como é definido o investimento?', answer: 'Após entender a operação, apresentamos formato, escopo, investimento e condições.' },
];
/** Move a leitura e o foco à seção, sem disparar o roteador ou hidratar sessão. */
function goToAnchor(event) {
  const target = document.querySelector(event.currentTarget.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', event.currentTarget.getAttribute('href'));
}
</script>
<style>
@font-face{font-family:Manrope;src:url('../assets/fonts/Manrope.ttf') format('truetype');font-weight:200 800;font-display:swap}
</style>
<style scoped src="./landing.css"></style>
