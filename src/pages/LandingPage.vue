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
          <p class="lead">Preço, impostos, publicidade, estoque e caixa decidem juntos o resultado. A Krivus conecta esses números à operação de quem vende no Mercado Livre e na Shopee.</p>
          <a class="button primary" :href="whatsapp.operation" data-offer="operacao">Conversar sobre minha operação <span aria-hidden="true">↗</span></a>
        </div>
        <div class="hero-analysis"><MarginCalculator @navigate="goToAnchor" /></div>
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
          <div class="system-pair"><span class="relation-index">01</span><h3>Preço <span aria-hidden="true">↔</span> Tributos</h3><p>A carga efetiva muda a contribuição.<br>A margem precisa considerar essa diferença.</p></div>
          <div class="system-pair"><span class="relation-index">02</span><h3>Mídia <span aria-hidden="true">↔</span> Estoque</h3><p>A demanda exige disponibilidade.<br>Vender sem reposição interrompe o crescimento.</p></div>
          <div class="system-pair"><span class="relation-index">03</span><h3>Compras <span aria-hidden="true">↔</span> Caixa</h3><p>Estoque demais prende capital.<br>O prazo da compra precisa conversar com o repasse.</p></div>
          <div class="system-outcome"><span>UMA LEITURA CONJUNTA</span><strong>Resultado.</strong><p>O efeito de cada decisão na empresa inteira.</p></div>
        </div>
        <div class="technology"><div><span class="eyebrow">EXPERIÊNCIA → MÉTODO → SOFTWARE</span><h3>O conhecimento<br>também virou tecnologia.</h3></div><div><p>Desenvolvemos o <strong>SellerBot</strong> para apoiar análises e a operação de marketplaces. É tecnologia própria construída a partir de problemas que conhecemos na prática.</p><p class="muted">Dados e ferramentas apoiam a análise. A decisão considera o contexto da empresa.</p></div></div>
      </div>
    </section>

    <section id="tributario" class="tax-section" aria-labelledby="tax-title">
      <div class="wrap section tax-grid">
        <div><p class="eyebrow">REFORMA TRIBUTÁRIA · DECISÃO DE NEGÓCIO</p><h2 id="tax-title">O tributário decide<br>quem ganha<br><em>o jogo.</em></h2><p>O mesmo preço pode deixar margens diferentes. Regime, produto e fornecedores precisam entrar na decisão.</p><a class="text-link" href="#margin-tax" @click="goToAnchor">Simular o impacto na margem <span aria-hidden="true">↑</span></a></div>
        <div class="tax-decisions"><h3>A reforma também<br>muda a conversa.</h3><dl><div><dt>Preço e margem</dt><dd>Projetar a carga efetiva antes de definir descontos.</dd></div><div><dt>Compras e créditos</dt><dd>Avaliar fornecedores e possibilidades de crédito conforme a operação.</dd></div><div><dt>Regime e caixa</dt><dd>Comparar cenários de recolhimento de IBS e CBS com a contabilidade.</dd></div></dl><p class="tax-note">IBS: Imposto sobre Bens e Serviços. CBS: Contribuição sobre Bens e Serviços. Transição e créditos dependem do regime e da operação.</p><a class="tax-source" href="https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/cgsn-atualiza-regras-do-simples-nacional-para-adequacao-a-reforma-tributaria-do-consumo">Reforma e Simples Nacional · Receita Federal <span aria-hidden="true">↗</span></a></div>
      </div>
    </section>

    <section id="cases" class="section wrap cases" aria-labelledby="cases-title">
      <div class="cases-heading"><div><p class="eyebrow">OPERAÇÕES REAIS</p><h2 id="cases-title">A prática está<br>por trás do método.</h2></div><p>Operações conectadas ao SellerBot. Contextos diferentes, dados concretos.</p></div>
      <div class="case-list"><article v-for="example in cases" :key="example.name"><h3>{{ example.name }}</h3><span>{{ example.topic }}</span><p>{{ example.context }}</p></article></div>
      <p class="case-note">Resultados de cada case: [INSERIR DADO REAL].</p>
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
import MarginCalculator from 'src/components/landing/MarginCalculator.vue';

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
