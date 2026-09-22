export function sprintContagemLabel(contagem) {
  const feitos = contagem?.done ?? 0
  const aFazer = contagem?.todo ?? 0
  return `${feitos} feitos · ${aFazer} a fazer`
}

export function sprintTicketEstado(status) {
  if (status === 'wip') return 'Andando'
  if (status === 'blocked') return 'Travado'
  return status
}
