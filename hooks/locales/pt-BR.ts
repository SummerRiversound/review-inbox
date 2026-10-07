import type { Messages } from '../i18n'

// Portuguese takes the plural for 0: "0 dias", "1 dia", "2 dias".
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const ptBR: Messages = {
  title: 'Caixa de revisões',
  command: {
    description: 'Abrir a caixa de revisões: PRs aguardando minha revisão, meus PRs e minhas issues',
    opened: 'Caixa de revisões aberta.',
  },
  band: {
    open: 'Abrir',
    reviews: (n: number) => `Para revisar ${n}`,
    prTodo: (n: number) => `Meus PRs a resolver ${n}`,
    issues: (n: number) => `Minhas issues ${n}`,
    oldest: (days: number) => ` · solicitação mais antiga: ${count(days, 'dia')} de espera`,
  },
  tabs: {
    review: (n: number) => `Para revisar ${n}`,
    mine: (n: number) => `Meus PRs ${n}`,
    issues: (n: number) => `Minhas issues ${n}`,
  },
  card: {
    rerequest: 'revisão solicitada novamente',
    waiting: (days: number) => count(days, 'dia'),
    ago: (days: number) => (days === 0 ? 'hoje' : `há ${count(days, 'dia')}`),
    direct: 'solicitação direta',
    team: (team: string) => `solicitação à equipe (${team})`,
    sinceMyReview: 'Desde a minha última revisão',
    summary: 'Resumo',
    why: 'Motivo',
    impact: 'Impacto',
    size: (files: number, added: string, removed: string) => `${count(files, 'arquivo')} (+${added} −${removed})`,
    hide: 'Ocultar',
    review: 'Revisar',
    ciRunning: ' · CI em execução',
    newReview: (who: string) => `Nova revisão · ${who}`,
    referenced: (by: string, target: string) => `${by} referenciou ${target}`,
  },
  state: {
    changes: 'Alterações solicitadas',
    'ci-failing': 'CI com falha',
    conflict: 'Conflito de merge',
    waiting: 'Aguardando revisão',
    approved: 'Aprovado',
    draft: 'Rascunho',
  },
  issueKind: {
    assigned: 'Atribuída a mim',
    mention: 'Me menciona',
    reference: 'Referencia meu trabalho',
  },
  status: {
    loading: 'Carregando…',
    error: (message: string) => `Não foi possível carregar; nova tentativa em um minuto (${message})`,
    updated: (minutes: number) => (minutes < 1 ? 'Atualizado agora mesmo' : `Atualizado há ${minutes} min`),
    firstFetch: 'Buscando dados no GitHub. Na primeira vez, isso leva cerca de um minuto.',
  },
  empty: {
    review: 'Nenhum PR está aguardando sua revisão.',
    mine: 'Você não tem PRs abertos.',
    issues: 'Não há issues atribuídas a você ou que mencionem você.',
  },
  sections: {
    hidden: (n: number) => `${count(n, 'oculto')} · mostrar todos`,
    drafts: (n: number) => `Rascunhos · ainda não prontos para revisão ${n}`,
    references: (days: number, n: number) =>
      `${days === 1 ? 'Último' : 'Últimos'} ${count(days, 'dia')} · meu trabalho referenciado em outros lugares ${n}`,
  },
  toast: {
    newRequest: 'Nova solicitação de revisão',
    moreRequests: (n: number) => `Mais ${count(n, 'solicitação de revisão', 'solicitações de revisão')}`,
    morePrAlerts: (n: number) => `Mais ${count(n, 'alerta')} nos meus PRs`,
    moreIssueAlerts: (n: number) => `Mais ${count(n, 'alerta')} nas minhas issues`,
    promptBusy: 'O prompt está ocupado. Feche a caixa de diálogo aberta e tente novamente.',
    retry: 'Tente novamente em instantes.',
  },
  alert: {
    turned: (state: string) => `Meu PR: ${state}`,
    reviewed: 'Nova revisão no meu PR',
    by: (who: string) => `nova revisão de ${who}`,
  },
  prompt: {
    review: (url: string) => `Revise o PR ${url}.`,
    summary: 'Resumo: ',
    check: 'Verifique em especial: ',
    since: 'O que mudou desde a minha última revisão: ',
  },
  summaryFailed: (reason: string) => `Não foi possível gerar o resumo (${reason}).`,
  model: {
    language:
      'Write in Brazilian Portuguese (not European Portuguese), in a neutral, professional tone, as if explaining to a junior developer.',
    sentence: 'Each sentence about 18 Portuguese words, one idea per sentence.',
    filler: 'No filler words such as efetivamente, de modo geral, diversos, basicamente.',
    bad: 'Refatorou a classe UserCache para unificar o caminho de consulta do SessionStore.',
    good: 'Corrige a foto de perfil que às vezes aparecia em branco logo após o login.',
    since:
      'Write in Brazilian Portuguese (not European Portuguese), neutral professional tone, one or two short sentences, about 18 words each.',
  },
}
