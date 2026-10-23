import type { Messages } from '../i18n'

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const es: Messages = {
  title: 'Bandeja de revisiones',
  command: {
    description: 'Abrir la bandeja de revisiones: PR pendientes de mi revisión, mis PR y mis incidencias',
    opened: 'Bandeja de revisiones abierta.',
  },
  band: {
    open: 'Abrir',
    reviews: (n: string) => `Por revisar ${n}`,
    prTodo: (n: string) => `Mis PR por atender ${n}`,
    issues: (n: string) => `Mis incidencias ${n}`,
    oldest: (days: number) => ` · solicitud más antigua: ${count(days, 'día')} de espera`,
  },
  tabs: {
    review: (n: string) => `Por revisar ${n}`,
    mine: (n: string) => `Mis PR ${n}`,
    issues: (n: string) => `Mis incidencias ${n}`,
  },
  card: {
    rerequest: 'revisión solicitada de nuevo',
    waiting: (days: number) => count(days, 'día'),
    ago: (days: number) => (days === 0 ? 'hoy' : `hace ${count(days, 'día')}`),
    direct: 'solicitud directa',
    team: (team: string) => `solicitud al equipo (${team})`,
    sinceMyReview: 'Desde mi última revisión',
    summary: 'Resumen',
    why: 'Motivo',
    impact: 'Alcance',
    size: (files: number, added: string, removed: string) => `${count(files, 'archivo')} (+${added} −${removed})`,
    hide: 'Ocultar',
    review: 'Revisar',
    added: 'Añadido',
    task: {
      changes: 'Atender comentarios',
      'ci-failing': 'Arreglar CI',
      conflict: 'Resolver conflicto',
      work: 'Trabajar en esto',
    },
    here: 'esta carpeta',
    at: (path: string) => `en ${path}`,
    noClone: 'sin clon local',
    ciRunning: ' · CI en ejecución',
    newReview: (who: string) => `Nueva revisión · ${who}`,
    referenced: (by: string, target: string) => `${by} hizo referencia a mi ${target}`,
  },
  state: {
    changes: 'Cambios solicitados',
    'ci-failing': 'CI con errores',
    conflict: 'Conflicto de fusión',
    waiting: 'Pendiente de revisión',
    approved: 'Aprobado',
    draft: 'Borrador',
  },
  issueKind: {
    assigned: 'Asignada a mí',
    mention: 'Me menciona',
    reference: 'Hace referencia a mi trabajo',
  },
  status: {
    loading: 'Cargando…',
    error: (message: string) => `No se pudo cargar; se reintentará en un minuto (${message})`,
    updated: (minutes: number) => (minutes < 1 ? 'Actualizado ahora mismo' : `Actualizado hace ${minutes} min`),
    firstFetch: 'Obteniendo datos de GitHub. La primera vez tarda aproximadamente un minuto.',
  },
  empty: {
    review: 'Ningún PR espera tu revisión.',
    mine: 'No tienes PR abiertos.',
    issues: 'No hay incidencias asignadas a ti ni que te mencionen.',
  },
  sections: {
    session: n => `En curso en una sesión ${n}`,
    hidden: (n: number) => `${count(n, 'oculto')} · mostrar todo`,
    direct: (n: number) => `Solicitudes directas ${n}`,
    team: (n: number) => `Solicitudes al equipo ${n}`,
    drafts: (n: number) => `Borradores · aún no listos para revisión ${n}`,
    references: (days: number, n: number) =>
      `${days === 1 ? 'Último' : 'Últimos'} ${count(days, 'día')} · referencias a mi trabajo en otros lugares ${n}`,
  },
  note: {
    edit: 'Nota',
    label: 'Nota',
    placeholder: 'Qué revisaste o qué piensas hacer',
    save: 'Guardar',
    tomorrow: 'Posponer hasta mañana',
    nextWeek: 'Posponer hasta la próxima semana',
    cancel: 'Cancelar',
    clear: 'Borrar',
    shown: (text: string) => `Nota: ${text}`,
    until: (month: number, day: number) => `pospuesto hasta el ${day}/${month}`,
  },
  session: {
    here: 'esta sesión',
    at: names => `En curso en ${names}`,
  },
  search: {
    label: 'Buscar',
    placeholder: 'repo, #número, título, descripción o nota',
    empty: 'No hay coincidencias.',
    hidden: 'oculto',
  },
  toast: {
    back: 'Vuelve una tarjeta pospuesta',
    added: (n: number) => `${count(n, 'tarjeta añadida', 'tarjetas añadidas')} · Esc pone sus solicitudes en el prompt`,
    newRequest: 'Nueva solicitud de revisión',
    moreRequests: (n: number) => `${count(n, 'solicitud', 'solicitudes')} de revisión más`,
    morePrAlerts: (n: number) => `${count(n, 'alerta')} más sobre mis PR`,
    moreIssueAlerts: (n: number) => `${count(n, 'alerta')} más sobre mis incidencias`,
    promptBusy: 'El cuadro de entrada está ocupado. Cierra el diálogo abierto e inténtalo de nuevo.',
    retry: 'Inténtalo de nuevo en un momento.',
  },
  alert: {
    turned: (state: string) => `Mi PR: ${state}`,
    reviewed: 'Nueva revisión en mi PR',
    by: (who: string) => `nueva revisión de ${who}`,
  },
  prompt: {
    review: (url: string) => `Revisa ${url}.`,
    check: 'Fíjate especialmente en: ',
    since: 'Cambios desde mi última revisión: ',
    style: 'Mi estilo habitual de revisión: ',
    task: {
      changes: (url: string) => `Atiende los comentarios de revisión sin resolver en ${url}; léelos con \`gh pr view ${url} --comments\`.`,
      'ci-failing': (url: string) =>
        `Arregla el CI que falla en ${url}: encuentra los checks fallidos con \`gh pr checks ${url}\` y sus logs con \`gh run view <run-id> --log-failed\`.`,
      conflict: (url: string, base?: string) =>
        `Resuelve el conflicto de merge en ${url}: haz merge de ${base ? `origin/${base}` : 'su rama base'} en su rama.`,
      work: (url: string) => `Trabaja en ${url}: lee el issue, planifica el cambio y empieza en una rama nueva.`,
    },
    here: 'esta carpeta',
    workIn: (where: string, isPr: boolean) =>
      isPr
        ? `Trabaja en ${where}, en un worktree nuevo con el PR descargado (\`gh pr checkout\` se encarga de los forks); deja la rama actual de la carpeta como está.`
        : `Trabaja en ${where}, en un worktree nuevo sobre una rama nueva; deja la rama actual de la carpeta como está.`,
    noClone: (repo: string) => `No se conoce ningún clon local de ${repo}: pregúntame dónde está, u ofrece \`gh repo clone ${repo}\` y espera a que diga que sí.`,
  },
  summaryFailed: (reason: string) => `No se pudo generar el resumen (${reason}).`,
  model: {
    language: 'Write in neutral Spanish readable in Spain and Latin America, plain and direct, as if explaining to a junior developer.',
    sentence: 'Each sentence about 18 Spanish words, one idea per sentence.',
    filler: 'No filler words such as eficazmente, en general, diversos, sin fisuras.',
    bad: 'Refactoriza la clase UserCache para unificar la ruta de búsqueda de SessionStore.',
    good: 'Corrige la foto de perfil que a veces aparecía en blanco justo después de iniciar sesión.',
    since: 'Write in neutral Spanish readable in Spain and Latin America, one or two short sentences, about 18 Spanish words each.',
    style: 'Write in neutral Spanish readable in Spain and Latin America, plain and direct.',
  },
}
