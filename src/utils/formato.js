// Formatadores de exibição do módulo financeiro (ticket FIN-23).
//
// Estavam soltos dentro do `BancosExtratosPage` e eram usados por todas as abas; com as abas virando
// componentes, eles passam a viver aqui — em função pura, testável no `node`, e sem depender do
// componente que os chama.

/** `1234.5` → `R$ 1.234,50`; valor inválido vira `R$ 0,00` (é valor de saldo, não de ausência). */
export function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** `AAAA-MM-DD` (ou data ISO) → `DD/MM/AAAA`; vazio vira `—`. */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Data e hora em `DD/MM/AAAA HH:mm`; vazio vira "Nunca sincronizada". */
export function formatDateTime(value) {
  if (!value) return 'Nunca sincronizada';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** CNPJ com máscara. Diferente do `formatarCnpj` do `seletores.js`: aqui os não-dígitos são removidos
 *  antes (o backend pode mandar `41.641.514/0001-03`), e o que não tem 14 dígitos volta como veio. */
export function formatCnpj(cnpj) {
  const digits = String(cnpj || '').replace(/\D/g, '');
  if (digits.length !== 14) return cnpj || '—';
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}
