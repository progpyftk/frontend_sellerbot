// Health score do cliente Krivus — derivado dos alertas já computados no backend
// (KrivusAlertsView). Sem novo endpoint: cobrança atrasada pesa mais que
// tarefa vencida ou cliente parado.
export function computeHealthMap(alerts) {
  const map = {}
  for (const a of alerts) {
    if (a.tipo === 'cobranca_atrasada') {
      map[a.client_slug] = 'red'
    } else if (map[a.client_slug] !== 'red') {
      map[a.client_slug] = 'amber'
    }
  }
  return map
}

export const HEALTH_COLOR = { green: '#16a34a', amber: '#d97706', red: '#dc2626' }
export const HEALTH_LABEL = { green: 'Saudável', amber: 'Atenção', red: 'Crítico' }

export function healthOf(map, slug) {
  return map[slug] || 'green'
}
