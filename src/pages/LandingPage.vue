<template>
<div class="landing">
  <a class="skip" href="#conteudo" @click="goToAnchor">Pular para o conteúdo</a>
  <header class="header dark">
    <div class="wrap header-inner">
      <a class="brand" href="#inicio" aria-label="Krivus — início" @click="goToAnchor"><KrivusLogo /></a>
      <nav aria-label="Navegação principal"><a href="#metodo" @click="goToAnchor">Nossa visão</a><a href="#mentoria" @click="goToAnchor">Mentoria</a><a href="#consultoria" @click="goToAnchor">Consultoria</a></nav>
      <router-link class="header-contact" to="/login">Entrar no SellerBot <span aria-hidden="true">↗</span></router-link>
    </div>
  </header>
  <main id="conteudo" tabindex="-1">
    <section id="inicio" class="hero dark" aria-labelledby="hero-title">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">MENTORIA · CONSULTORIA · TECNOLOGIA PRÓPRIA</p>
          <h1 id="hero-title">Vender mais<br>é só parte.<br><em>Enxergar o todo<br>é o que muda.</em></h1>
          <p class="lead">Preço, publicidade, estoque e caixa decidem juntos o resultado. A Krivus conecta esses números à operação de quem vende no Mercado Livre e na Shopee.</p>
          <a class="button primary" :href="whatsapp.operation" data-offer="operacao">Conversar sobre minha operação <span aria-hidden="true">↗</span></a>
        </div>
        <div class="hero-analysis" aria-label="SellerBot, tecnologia da Krivus. Análise conceitual de uma venda">
          <div class="analysis-top"><div><strong>SellerBot</strong><span>Tecnologia desenvolvida pela Krivus</span></div></div>
          <p class="analysis-label">POR TRÁS DE CADA VENDA</p>
          <div class="sale-number"><span>Preço de venda</span><strong><small>R$</small> 100<span>,00</span></strong></div>
          <svg class="sale-flow" viewBox="0 0 430 150" aria-hidden="true" focusable="false"><path class="flow-cost" d="M0 0 C190 0 180 80 430 80 L430 150 C175 150 165 70 0 70Z"/><path class="flow-result" d="M0 73 C175 73 190 0 430 0 L430 30 C195 30 175 103 0 103Z"/><path d="M0 82H430" stroke="currentColor" stroke-dasharray="2 8" opacity=".2"/></svg>
          <div class="sale-breakdown"><div><span>Custos variáveis</span><strong>R$ 70</strong></div><div class="contribution"><span>Contribuição</span><strong>R$ 30</strong></div></div>
          <p class="analysis-note">Comissão, impostos, frete, mídia e custo do produto entram na conta.</p>
          <a class="analysis-question" href="#analise" @click="goToAnchor"><span>E se o preço cair 10%?</span><span aria-hidden="true">↓</span></a>
          <p class="fine-print">Visualização conceitual · valores ilustrativos.<br>Contribuição antes das despesas fixas.</p>
        </div>
        <div class="hero-bottom"><span>Experiência operacional</span><span>Visão de negócio</span><span>Tecnologia própria</span><a href="#metodo" @click="goToAnchor">Veja a operação por inteiro <span aria-hidden="true">↓</span></a></div>
      </div>
    </section>

    <section class="problem section wrap" aria-labelledby="problem-title">
      <div><p class="eyebrow">O NÚMERO QUE NÃO CONTA TUDO</p><h2 id="problem-title">A venda entrou.<br>O resultado<br>acompanhou?</h2><p>A promoção movimenta pedidos. A campanha ganha volume. A compra parece boa. Mas o caixa continua apertado.</p></div>
      <div class="questions"><div><span>01 / DESCONTO</span><p>Quanto precisa vender a mais<br>para compensar a margem menor?</p></div><div><span>02 / PUBLICIDADE</span><p>Depois da mídia, do frete e dos impostos,<br>quanto realmente ficou?</p></div><div><span>03 / ESTOQUE</span><p>O que falta para vender?<br>O que sobra imobilizando caixa?</p></div></div>
    </section>

    <section id="metodo" class="system-section" aria-labelledby="system-title">
      <div class="wrap section">
        <div class="system-heading"><div><p class="eyebrow">A VISÃO KRIVUS</p><h2 id="system-title">Sua operação não cabe<br>em um indicador.</h2></div><p>Preço muda a margem. Mídia muda a demanda. Reposição compromete caixa. Olhar cada área separadamente esconde parte do problema.</p></div>
        <div class="system-map" aria-label="Decisões conectadas na operação">
          <div class="system-pair"><span class="relation-index">01</span><h3>Preço <span aria-hidden="true">↔</span> Mídia</h3><p>A contribuição define o espaço para investir.<br>A campanha precisa caber nessa conta.</p></div>
          <div class="system-pair"><span class="relation-index">02</span><h3>Mídia <span aria-hidden="true">↔</span> Estoque</h3><p>A demanda exige disponibilidade.<br>Vender sem reposição interrompe o crescimento.</p></div>
          <div class="system-pair"><span class="relation-index">03</span><h3>Compras <span aria-hidden="true">↔</span> Caixa</h3><p>Estoque demais prende capital.<br>O prazo da compra precisa conversar com o repasse.</p></div>
          <div class="system-outcome"><span>UMA LEITURA CONJUNTA</span><strong>Resultado.</strong><p>O efeito de cada decisão na empresa inteira.</p></div>
        </div>
        <div class="technology"><div><span class="eyebrow">EXPERIÊNCIA → MÉTODO → SOFTWARE</span><h3>O conhecimento<br>também virou tecnologia.</h3></div><div><p>Desenvolvemos o <strong>SellerBot</strong> para apoiar análises e a operação de marketplaces. É tecnologia própria construída a partir de problemas que conhecemos na prática.</p><p class="muted">Financeiro, tributário, logística e importação entram quando afetam a decisão. A ferramenta apoia; o contexto da empresa orienta o próximo passo.</p></div></div>
      </div>
    </section>

    <section id="analise" class="section wrap evidence" aria-labelledby="evidence-title">
      <div class="evidence-copy"><p class="eyebrow">UMA DECISÃO, EM NÚMEROS</p><h2 id="evidence-title">Um desconto<br>pequeno.<br>Uma decisão<br><em>grande.</em></h2><p>De R$ 100 para R$ 90, a queda no preço é de 10%. Com R$ 70 de custos constantes, a contribuição por venda cai de R$ 30 para R$ 20.</p><p>Para manter a mesma contribuição total, seria necessário vender <strong>50% mais unidades.</strong></p><p class="muted">A análise não termina no desconto: demanda, reposição e caixa precisam sustentar esse volume.</p><div class="proof-pending"><span>CASO REAL · RESERVA EDITORIAL</span><p>[INSERIR DADO REAL]</p><small>Operação, período, decisão e resultado autorizado.</small></div></div>
      <ContributionStudy />
    </section>

    <section class="services section" aria-labelledby="services-title">
      <div class="wrap"><p class="eyebrow">COMO TRABALHAMOS</p><h2 id="services-title">A mesma visão.<br>Duas formas de trabalhar.</h2>
        <div class="service-grid">
          <article id="mentoria" class="mentoring" tabindex="-1"><span class="service-label">01 / MENTORIA</span><h3>Sua equipe executa.<br><em>A Krivus orienta.</em></h3><p>Cinco meses para trabalhar os dados da sua empresa, escolher prioridades e acompanhar as decisões. O decisor participa com as pessoas responsáveis pela execução.</p><div class="program"><span><strong>5</strong> meses</span><span><strong>10</strong> encontros</span><span><strong>Sua equipe</strong> participa</span></div><p class="service-deliverables">Diagnóstico e prioridades. Plano de ação com responsáveis. Revisão do que mudou e dos próximos passos.</p><a class="button primary" :href="whatsapp.mentoring" data-offer="mentoria">Avaliar a mentoria <span aria-hidden="true">↗</span></a></article>
          <article id="consultoria" class="consulting" tabindex="-1"><span class="service-label">02 / CONSULTORIA</span><h3>Escopo definido.<br>A Krivus executa.</h3><p>Para estruturar, melhorar ou acompanhar a operação com atividades, responsáveis e entregas contratados.</p><p>Do estudo de preço à organização de campanhas, do catálogo à análise de gestão: o projeto parte da necessidade da empresa.</p><a class="text-link" :href="whatsapp.consulting" data-offer="consultoria">Conversar sobre consultoria <span aria-hidden="true">↗</span></a></article>
        </div>
        <p class="service-note">Temas, ferramentas, canais e suporte são definidos na proposta. Tributário e importação incluem análise de gestão; validações técnicas cabem aos profissionais responsáveis.</p>
      </div>
    </section>

    <section class="section wrap process" aria-labelledby="process-title"><div><p class="eyebrow">PRIMEIRO A EMPRESA. DEPOIS O PLANO.</p><h2 id="process-title">Entender.<br>Escolher.<br>Agir.</h2><p>Para empresas que já vendem e querem conectar crescimento, margem e gestão.</p></div><ol><li><span>01</span><div><h3>Conhecer a operação</h3><p>Canais, dados disponíveis e decisões que estão travando o negócio.</p></div></li><li><span>02</span><div><h3>Escolher prioridades</h3><p>Definir o problema, o formato e as entregas que fazem sentido.</p></div></li><li><span>03</span><div><h3>Executar e revisar</h3><p>Acompanhar mudanças com responsáveis e critérios claros.</p></div></li></ol></section>

    <section id="perguntas" class="section wrap faq" aria-labelledby="faq-title"><div><p class="eyebrow">ANTES DA CONVERSA</p><h2 id="faq-title">O que você<br>precisa saber.</h2></div><div><details v-for="question in questions" :key="question.title"><summary>{{ question.title }}<span aria-hidden="true">+</span></summary><p>{{ question.answer }}</p></details></div></section>
    <section id="conversar" class="closing" aria-labelledby="closing-title"><div class="wrap"><p class="eyebrow">A PRÓXIMA DECISÃO COMEÇA AQUI</p><h2 id="closing-title">Qual decisão<br>não pode continuar<br>no achismo?</h2><div class="closing-bottom"><p>Conte-nos onde você vende e o que precisa entender melhor. A conversa começa pela operação.</p><div><a class="button light" :href="whatsapp.operation" data-offer="operacao">Conversar sobre minha operação <span aria-hidden="true">↗</span></a><p class="contact-note">WhatsApp · +55 11 99818-0409</p></div></div></div></section>
  </main>
  <footer class="wrap footer"><a class="brand" href="#inicio" aria-label="Krivus — voltar ao início" @click="goToAnchor"><KrivusLogo /></a><span>Experiência operacional. Dados. Tecnologia.</span><a href="#inicio" @click="goToAnchor">Voltar ao início <span aria-hidden="true">↑</span></a></footer>
</div>
</template>

<script setup>
import { useMeta } from 'quasar';
import KrivusLogo from 'src/components/landing/KrivusLogo.vue';
import ContributionStudy from 'src/components/landing/ContributionStudy.vue';

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
const questions = [
  { title: 'Preciso vender nos dois marketplaces?', answer: 'Não. A análise considera os canais em que sua empresa opera e suas condições específicas.' },
  { title: 'Quem participa da mentoria?', answer: 'Você e as pessoas que decidem e executam. São dez encontros ao longo de cinco meses; as prioridades partem do diagnóstico.' },
  { title: 'Quem muda anúncios e campanhas?', answer: 'Na mentoria, a execução é da sua equipe, com orientação e revisão. Na consultoria, executamos as atividades contratadas.' },
  { title: 'O SellerBot está incluído?', answer: 'O acesso, as integrações e as ferramentas utilizadas são definidos na proposta. Também podemos trabalhar com relatórios dos canais e dados da empresa.' },
  { title: 'Como é definido o investimento?', answer: 'Depois de entender a operação, apresentamos o formato, o escopo, o investimento e as condições. Resultados dependem da execução e do contexto do negócio.' },
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
