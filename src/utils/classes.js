// Classes de divergência do módulo Financeiro/Contábil (ticket FINT-8).
//
// Por que existe: as abas **Tributos** e **Conciliação** classificam a diferença entre o nosso número e
// o do contador, e as duas tinham a sua própria cópia do mapa classe → cor/ícone. Com o selo virando
// coluna de tabela, a mesma classe passou a aparecer em mais de um lugar — e duas cópias divergiriam.
//
// As chaves são as que o backend realmente emite: `confere`, `redistribuicao`, `nao_explicado`,
// `sem_declaracao`, `sem_tabela` (apuração) e `de_base`, `de_dado`, `nao_explicado` (conciliação).

const CLASSES = {
  confere: { variante: 'green', icone: 'check' },
  redistribuicao: { variante: 'amber', icone: 'warning' },
  nao_explicado: { variante: 'red', icone: 'warning' },
  sem_declaracao: { variante: 'slate', icone: 'help_outline' },
  sem_tabela: { variante: 'slate', icone: 'rule' },
  // Conciliação (FIN-15): `de_base` = a base de comparação é outra (explicar); `de_dado` = falta dado
  // nosso (corrigir).
  de_base: { variante: 'sky', icone: 'info' },
  de_dado: { variante: 'amber', icone: 'build' },
};

/** A classe não é conhecida? Devolve o neutro em vez de quebrar a tela — a chave crua continua visível. */
export function classeInfo(classe) {
  return CLASSES[classe] || { variante: 'slate', icone: 'warning' };
}

/** `'confere'` → `'green'`; desconhecida → `'slate'`. */
export function varianteDaClasse(classe) {
  return classeInfo(classe).variante;
}

/** `'confere'` → `'check'`; desconhecida → `'warning'`. */
export function iconeDaClasse(classe) {
  return classeInfo(classe).icone;
}

/** A classe é divergência que precisa de ação do dono? (as que ele persegue na tela) */
export function classeDivergente(classe) {
  return ['nao_explicado', 'redistribuicao', 'de_dado'].includes(classe);
}
