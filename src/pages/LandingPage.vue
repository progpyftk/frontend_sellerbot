<template>
<div class="landing">
  <a class="skip" href="#conteudo" @click="goToAnchor">Pular para o conteúdo</a>
  <header class="header dark">
    <div class="wrap header-inner">
      <a class="brand" href="#inicio" aria-label="Krivus — início" @click="goToAnchor"><KrivusLogo /></a>
      <nav aria-label="Navegação principal"><a href="#solucoes" @click="goToAnchor">Soluções</a><a href="#clinicas" @click="goToAnchor">Para clínicas</a><a href="#cases" @click="goToAnchor">Nosso trabalho</a></nav>
      <router-link class="header-contact" to="/login">Entrar no SellerBot <span aria-hidden="true">↗</span></router-link>
    </div>
  </header>
  <main id="conteudo" tabindex="-1">
    <section id="inicio" class="hero dark" aria-labelledby="hero-title">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">CONSULTORIA · MARKETING · E-COMMERCE</p>
          <h1 id="hero-title">Sua empresa<br>bem posicionada.<br><em>Preparada<br>para crescer.</em></h1>
          <p class="lead">Gestão, marca e vendas na mesma direção. Consultoria empresarial, identidade visual, sites e marketing digital para empresas de serviços, clínicas e e-commerce.</p>
          <a class="button primary" :href="whatsapp.business" data-offer="empresa">Vamos conversar sobre sua empresa <span aria-hidden="true">↗</span></a>
        </div>
        <div class="hero-directory">
          <p class="directory-label">ONDE SUA EMPRESA QUER CHEGAR?</p>
          <a href="#consultoria" @click="goToAnchor"><span class="directory-number">01</span><span><strong>Organizar a gestão.</strong><small>Consultoria empresarial</small></span><span aria-hidden="true">↗</span></a>
          <a href="#marketing" @click="goToAnchor"><span class="directory-number">02</span><span><strong>Fortalecer a marca.</strong><small>Identidade, sites e campanhas</small></span><span aria-hidden="true">↗</span></a>
          <a href="#ecommerce" @click="goToAnchor"><span class="directory-number">03</span><span><strong>Vender melhor.</strong><small>E-commerce e marketplaces</small></span><span aria-hidden="true">↗</span></a>
          <p class="directory-note">Da estratégia à execução.<br>O ponto de partida é a sua empresa.</p>
        </div>
      </div>
    </section>

    <section id="solucoes" class="section wrap solutions" aria-labelledby="solutions-title">
      <div class="section-intro"><div><p class="eyebrow">O QUE A KRIVUS FAZ</p><h2 id="solutions-title">Três frentes.<br><em>Um negócio: o seu.</em></h2></div><p>Você pode começar por uma necessidade específica ou conectar as frentes em um mesmo projeto.</p></div>
      <div class="solutions-grid">
        <article id="consultoria" aria-labelledby="consulting-title">
          <span class="solution-number">01 / GESTÃO</span><h3 id="consulting-title">Consultoria<br>empresarial</h3>
          <p>Clareza para decidir. Organização para executar. Acompanhamos sua empresa do diagnóstico ao plano de ação.</p>
          <ul><li>Diagnóstico e planejamento</li><li>Processos e gestão financeira</li><li>Prioridades e acompanhamento</li></ul>
          <a class="text-link" :href="whatsapp.consulting" data-offer="consultoria">Organizar minha empresa <span aria-hidden="true">↗</span></a>
        </article>
        <article id="marketing" aria-labelledby="marketing-title">
          <span class="solution-number">02 / PRESENÇA E AQUISIÇÃO</span><h3 id="marketing-title">Marca e<br>marketing digital</h3>
          <p>Uma marca que se apresenta bem, um site que facilita o contato e campanhas para alcançar seu público.</p>
          <ul><li>Identidade visual e posicionamento</li><li>Sites e páginas de campanha</li><li>Gestão de Google Ads e Meta Ads</li></ul>
          <p class="channel-note">Campanhas no Google, Instagram e Facebook.</p>
          <a class="text-link" :href="whatsapp.marketing" data-offer="marketing">Conversar sobre marketing <span aria-hidden="true">↗</span></a>
        </article>
        <article id="ecommerce" aria-labelledby="ecommerce-title">
          <span class="solution-number">03 / VENDAS E OPERAÇÃO</span><h3 id="ecommerce-title">E-commerce e<br>marketplaces</h3>
          <p>Conectamos preço, mídia e operação para acompanhar suas vendas e a rentabilidade de cada canal.</p>
          <ul><li>Mercado Livre e Shopee</li><li>Anúncios, preços e promoções</li><li>Gestão com tecnologia SellerBot</li></ul>
          <a class="text-link" :href="whatsapp.operation" data-offer="operacao">Conversar sobre meu e-commerce <span aria-hidden="true">↗</span></a>
        </article>
      </div>
    </section>

    <section id="clinicas" class="clinic-section" aria-labelledby="clinic-title">
      <div class="wrap section clinic-grid">
        <div class="clinic-copy"><p class="eyebrow">PARA CLÍNICAS E CONSULTÓRIOS</p><h2 id="clinic-title">Da primeira impressão<br><em>ao contato com<br>a sua clínica.</em></h2><p>Apresente sua equipe, seus serviços e sua forma de cuidar. Conectamos identidade visual, site e campanhas para facilitar o caminho de quem procura a sua clínica.</p><a class="button primary" :href="whatsapp.clinic" data-offer="clinicas">Conversar sobre minha clínica <span aria-hidden="true">↗</span></a></div>
        <ol class="clinic-journey">
          <li><span aria-hidden="true">01</span><div><h3>Uma identidade que representa.</h3><p>Marca e linguagem visual coerentes em cada ponto de contato.</p></div></li>
          <li><span aria-hidden="true">02</span><div><h3>Um site que orienta.</h3><p>Equipe, serviços, localização e caminhos claros para solicitar um agendamento.</p></div></li>
          <li><span aria-hidden="true">03</span><div><h3>Campanhas com direção.</h3><p>Google, Instagram e Facebook conectados aos objetivos da clínica.</p></div></li>
          <li><span aria-hidden="true">04</span><div><h3>Acompanhamento para melhorar.</h3><p>Leitura dos contatos gerados e dos agendamentos informados pela sua equipe.</p></div></li>
        </ol>
      </div>
    </section>

    <section id="ferramentas" class="section wrap ecommerce-section" aria-labelledby="tools-title">
      <div class="ecommerce-grid"><div><p class="eyebrow">E-COMMERCE · TECNOLOGIA DA KRIVUS</p><h2 id="tools-title">Experiência na gestão.<br><em>Dados na decisão.</em></h2><p>O SellerBot apoia nosso trabalho em Mercado Livre e Shopee. Vendas, campanhas, preços e margem ajudam a enxergar a operação por inteiro.</p><a class="text-link" href="#analises" @click="goToAnchor">Conhecer as análises do SellerBot <span aria-hidden="true">↓</span></a></div>
        <div class="ecommerce-dashboard"><ProductCapture src="/images/sellerbot/dashboard.webp" label="Dashboard da operação" alt="Dashboard SellerBot com faturamento, receita, contribuição e publicidade ao longo de setembro. Dados demonstrativos." :width="1368" :height="863" /></div>
      </div>
      <nav class="case-links" aria-label="Operações acompanhadas"><a v-for="example in cases" :key="example.id" :href="`#${example.id}`" @click="goToAnchor">{{ example.name }} <span aria-hidden="true">↗</span></a></nav>
    </section>

    <section id="cases" class="section wrap case-stories" aria-labelledby="cases-title">
      <p class="eyebrow">CASES E OPERAÇÕES</p><h2 id="cases-title">Cada operação,<br><em>uma história.</em></h2>
      <div class="stories-grid"><article v-for="example in cases" :id="example.id" :key="example.id" :aria-labelledby="`${example.id}-title`"><div class="story-top"><span>{{ example.topic }}</span><span>{{ example.number }}</span></div><h3 :id="`${example.id}-title`">{{ example.name }}</h3><h4>{{ example.headline }}</h4><p>{{ example.story }}</p><div class="story-work"><span>NO TRABALHO</span><p>{{ example.work }}</p></div></article></div>
    </section>

    <details id="analises" class="product-details">
      <summary class="wrap"><span><span class="eyebrow">POR DENTRO DO SELLERBOT</span><strong>Conheça as análises da operação</strong></span><span class="details-toggle" aria-hidden="true">+</span></summary>
    <SellerBotTools />

    <section id="tributario" class="tax-section" aria-labelledby="tax-title">
      <div class="wrap section tax-grid">
        <div><p class="eyebrow">DIAGNÓSTICO DA KRIVUS</p><h2 id="tax-title">O tributário decide<br>quem ganha<br><em>o jogo.</em></h2><a class="text-link" :href="whatsapp.tax" data-offer="tributario">Conversar sobre o diagnóstico <span aria-hidden="true">↗</span></a></div>
        <div class="tax-decisions"><h3>Tributos e saúde da empresa.</h3><p>Margem, caixa, estoque, compras e carga tributária na mesma análise. Diagnóstico e prioridades para a sua operação.</p><ProductCapture src="/images/sellerbot/saude.webp" label="Saúde econômica" alt="Visão financeira do SellerBot: receita, impostos, contribuição, resultado, ativo e variação de caixa. Dados demonstrativos, sem associação a clientes." :width="1836" :height="1050" /><p class="tax-note">Na reforma tributária, cenários de IBS e CBS são avaliados com a contabilidade. IBS: Imposto sobre Bens e Serviços. CBS: Contribuição sobre Bens e Serviços.</p><a class="tax-source" href="https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/cgsn-atualiza-regras-do-simples-nacional-para-adequacao-a-reforma-tributaria-do-consumo">Reforma tributária · Receita Federal <span aria-hidden="true">↗</span></a></div>
      </div>
    </section>

    </details>

    <section id="como-trabalhamos" class="services section" aria-labelledby="services-title">
      <div class="wrap"><p class="eyebrow">COMO TRABALHAMOS</p><h2 id="services-title">O formato acompanha<br><em>a sua necessidade.</em></h2>
        <div class="service-grid">
          <article id="projeto" class="consulting"><span class="service-label">01 / PROJETO PONTUAL</span><h3>Uma entrega.<br>Um escopo claro.</h3><p>Identidade visual, site ou implantação de melhorias. Etapas, responsáveis e entregas definidos na proposta.</p><a class="text-link" :href="whatsapp.project" data-offer="projeto">Conversar sobre meu projeto <span aria-hidden="true">↗</span></a></article>
          <article id="acompanhamento" class="consulting"><span class="service-label">02 / GESTÃO CONTÍNUA</span><h3>Executar.<br>Acompanhar. Ajustar.</h3><p>Gestão de campanhas ou acompanhamento da operação, com prioridades e revisão dos indicadores acordados.</p><a class="text-link" :href="whatsapp.management" data-offer="gestao">Conhecer o acompanhamento <span aria-hidden="true">↗</span></a></article>
          <article id="mentoria" class="consulting" tabindex="-1"><span class="service-label">03 / CONSULTORIA E MENTORIA</span><h3>Sua equipe executa.<br><em>A Krivus orienta.</em></h3><p>Diagnóstico, prioridades e plano de ação. Na mentoria, são dez encontros em cinco meses, com sua equipe.</p><a class="text-link" :href="whatsapp.mentoring" data-offer="mentoria">Avaliar a mentoria <span aria-hidden="true">↗</span></a></article>
        </div>
        <p class="service-note">Escopo, ferramentas e investimento definidos em proposta. A verba de anúncios é separada do serviço de gestão.</p>
      </div>
    </section>

    <section id="perguntas" class="section wrap faq" aria-labelledby="faq-title"><div><p class="eyebrow">DÚVIDAS DIRETAS</p><h2 id="faq-title">Antes de começar.</h2></div><div><details v-for="question in questions" :key="question.title"><summary>{{ question.title }}<span aria-hidden="true">+</span></summary><p>{{ question.answer }}</p></details></div></section>
    <section id="conversar" class="closing" aria-labelledby="closing-title"><div class="wrap"><p class="eyebrow">VAMOS CONVERSAR</p><h2 id="closing-title">Sua empresa.<br>Nosso próximo assunto.</h2><div class="closing-bottom"><p>Conte-nos sobre o seu negócio e o que você quer desenvolver. Vamos encontrar o ponto de partida.</p><div><a class="button light" :href="whatsapp.business" data-offer="empresa">Conversar com a Krivus <span aria-hidden="true">↗</span></a><p class="contact-note">WhatsApp · +55 11 99818-0409</p></div></div></div></section>
  </main>
  <footer class="wrap footer"><a class="brand" href="#inicio" aria-label="Krivus — voltar ao início" @click="goToAnchor"><KrivusLogo /></a><span>Consultoria. Marketing. E-commerce.</span><a href="#inicio" @click="goToAnchor">Voltar ao início <span aria-hidden="true">↑</span></a></footer>
</div>
</template>

<script setup>
import { useMeta } from 'quasar';
import { onMounted } from 'vue';
import KrivusLogo from 'src/components/landing/KrivusLogo.vue';
import SellerBotTools from 'src/components/landing/SellerBotTools.vue';
import ProductCapture from 'src/components/landing/ProductCapture.vue';

defineOptions({ name: 'LandingPage' });
const title = 'Krivus — Consultoria empresarial, marketing e e-commerce';
const description = 'Consultoria empresarial, identidade visual, sites e gestão de Google Ads e Meta Ads. Estratégia e execução para empresas, clínicas e e-commerce.';
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
  business: contact('Olá, quero conversar sobre minha empresa com a Krivus. Meu negócio é: ___. Preciso de apoio em: ___.'),
  marketing: contact('Olá, quero conversar sobre marketing com a Krivus. Minha empresa é: ___. Tenho interesse em identidade visual, site ou gestão de campanhas: ___.'),
  clinic: contact('Olá, quero conversar sobre minha clínica com a Krivus. A clínica é: ___. Preciso de apoio com marca, site ou campanhas: ___.'),
  project: contact('Olá, quero conversar sobre um projeto com a Krivus. Minha empresa é: ___. O projeto que preciso desenvolver é: ___.'),
  management: contact('Olá, quero conhecer a gestão contínua da Krivus. Minha empresa é: ___. Preciso de acompanhamento em: ___.'),
  operation: contact('Olá, quero conversar sobre minha operação com a Krivus. Vendo em: ___. Minha principal dificuldade hoje é: ___.'),
  mentoring: contact('Olá, quero avaliar a mentoria Krivus para minha empresa. Meu negócio é: ___. Minha principal dificuldade hoje é: ___.'),
  tax: contact('Olá, quero conversar sobre um diagnóstico tributário e da saúde da minha empresa com a Krivus.'),
  consulting: contact('Olá, quero conversar sobre consultoria empresarial com a Krivus. Meu negócio é: ___. Preciso de apoio em: ___.'),
};
// Nomes autorizados pelo dono; contextos sustentados no acervo, sem métricas inventadas.
const cases = [
  { id: 'case-doseverde', number: '01', name: 'Doseverde', topic: 'PREÇO E PROMOÇÕES', headline: 'Mais desconto exige outra conta.', story: 'Na operação de substratos, analisamos um produto real para entender o efeito de uma promoção. O percentual de margem e o valor que fica por unidade precisam ser lidos juntos.', work: 'Custo, tarifa e frete na simulação. Comparação da contribuição antes de propor o desconto.' },
  { id: 'case-livpro', number: '02', name: 'Livpro', topic: 'MERCADO LIVRE E SHOPEE', headline: 'Dois canais. Uma empresa.', story: 'Mercado Livre e Shopee trazem pedidos, anúncios e custos diferentes. A Livpro tem os dois canais conectados ao SellerBot para apoiar o acompanhamento da operação.', work: 'Leitura dos dados por canal e acompanhamento dos anúncios e campanhas.' },
  { id: 'case-casadossuportes', number: '03', name: 'Casadossuportes', topic: 'CUSTOS E PRECIFICAÇÃO', headline: 'O mesmo produto, contas diferentes.', story: 'Na revisão de preços da Shopee, o trabalho considerou custos do produto, taxas e frete por peso. Preço de lista e preço da oferta foram tratados separadamente.', work: 'Régua por canal, revisão por produto e confirmação das condições antes de alterar preços.' },
  { id: 'case-grampofix', number: '04', name: 'GrampoFix', topic: 'ANÚNCIOS E CAMPANHAS', headline: 'A análise chega ao anúncio.', story: 'A operação conectada ao SellerBot permite acompanhar campanhas e anúncios. O trabalho cruza leitura de publicidade com as condições promocionais de cada produto.', work: 'Dados de campanhas, anúncios e promoções disponíveis para apoiar a análise da operação.' },
];
const questions = [
  { title: 'A Krivus atende empresas que não vendem pela internet?', answer: 'Sim. Atendemos empresas de serviços, clínicas e consultórios com consultoria empresarial, identidade visual, sites e marketing digital, além do trabalho com e-commerce.' },
  { title: 'Posso contratar apenas um site ou a identidade visual?', answer: 'Sim. Podemos começar com um projeto pontual ou combinar serviços conforme a necessidade da empresa. Escopo, etapas e investimento são definidos na proposta.' },
  { title: 'A verba de anúncios está incluída na gestão?', answer: 'Não. O investimento em mídia no Google e na Meta é separado do valor do serviço. Os canais, o orçamento e o escopo da gestão são definidos na proposta.' },
  { title: 'Quem participa da mentoria?', answer: 'Você e as pessoas que decidem e executam. Dez encontros em cinco meses, com prioridades definidas pelo diagnóstico.' },
  { title: 'O SellerBot está incluído?', answer: 'Acesso, integrações e ferramentas são definidos na proposta. O escopo considera os canais e os dados da empresa.' },
  { title: 'Como é definido o investimento?', answer: 'Após entender a operação, apresentamos formato, escopo, investimento e condições.' },
];
// Mantém acessíveis os links existentes para análises agora recolhidas.
onMounted(() => {
  const target = document.getElementById(window.location.hash.slice(1));
  const disclosure = target?.closest('details');
  if (disclosure) disclosure.open = true;
});
/** Move a leitura e o foco à seção, sem disparar o roteador ou hidratar sessão. */
function goToAnchor(event) {
  const target = document.querySelector(event.currentTarget.getAttribute('href'));
  if (!target) return;
  event.preventDefault();
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  const disclosure = target.closest('details');
  if (disclosure) disclosure.open = true;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', event.currentTarget.getAttribute('href'));
}
</script>
<style scoped src="./landing.css"></style>
