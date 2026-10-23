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
    reviews: (n: string) => `Para revisar ${n}`,
    prTodo: (n: string) => `Meus PRs a resolver ${n}`,
    issues: (n: string) => `Minhas issues ${n}`,
    oldest: (days: number) => ` · solicitação mais antiga: ${count(days, 'dia')} de espera`,
  },
  tabs: {
    review: (n: string) => `Para revisar ${n}`,
    mine: (n: string) => `Meus PRs ${n}`,
    issues: (n: string) => `Minhas issues ${n}`,
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
    added: 'Adicionado',
    task: {
      changes: 'Responder comentários',
      'ci-failing': 'Corrigir CI',
      conflict: 'Resolver conflito',
      work: 'Trabalhar nisto',
    },
    here: 'esta pasta',
    at: (path: string) => `em ${path}`,
    noClone: 'sem clone local',
    ciRunning: ' · CI em execução',
    thisRepo: 'este repositório',
    comments: (n: number) => count(n, 'comentário'),
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
    zero: '✓ Nada precisa de você agora',
    review: 'Nenhum PR está aguardando sua revisão.',
    mine: 'Você não tem PRs abertos.',
    issues: 'Não há issues atribuídas a você ou que mencionem você.',
  },
  sections: {
    here: (n: number) => `Este repositório ${n}`,
    all: (n: number) => `Todos ${n}`,
    session: n => `Em andamento em uma sessão ${n}`,
    hidden: (n: number) => `${count(n, 'oculto')} · mostrar todos`,
    direct: (n: number) => `Solicitações diretas ${n}`,
    team: (n: number) => `Solicitações à equipe ${n}`,
    drafts: (n: number) => `Rascunhos · ainda não prontos para revisão ${n}`,
    references: (days: number, n: number) =>
      `${days === 1 ? 'Último' : 'Últimos'} ${count(days, 'dia')} · meu trabalho referenciado em outros lugares ${n}`,
  },
  note: {
    edit: 'Nota',
    label: 'Nota',
    placeholder: 'O que você viu ou pretende fazer',
    save: 'Salvar',
    tomorrow: 'Adiar até amanhã',
    nextWeek: 'Adiar até a próxima semana',
    cancel: 'Cancelar',
    clear: 'Apagar',
    shown: (text: string) => `Nota: ${text}`,
    until: (month: number, day: number) => `adiado até ${day}/${month}`,
  },
  session: {
    here: 'esta sessão',
    at: names => `Em andamento: ${names}`,
  },
  search: {
    label: 'Buscar',
    placeholder: 'repo, #número, título, descrição ou nota',
    empty: 'Nada encontrado.',
    hidden: 'oculto',
  },
  toast: {
    back: 'Um cartão adiado voltou',
    added: (n: number) => `${count(n, 'cartão adicionado', 'cartões adicionados')} · Esc coloca os pedidos deles no prompt`,
    newRequest: 'Nova solicitação de revisão',
    moreRequests: (n: number) => `Mais ${count(n, 'solicitação de revisão', 'solicitações de revisão')}`,
    morePrAlerts: (n: number) => `Mais ${count(n, 'alerta')} nos meus PRs`,
    moreIssueAlerts: (n: number) => `Mais ${count(n, 'alerta')} nas minhas issues`,
    promptBusy: 'O prompt está ocupado. Feche a caixa de diálogo aberta e tente novamente.',
    retry: 'Tente novamente em instantes.',
  },
  alert: {
    ready: 'Pronto para merge',
    turned: (state: string) => `Meu PR: ${state}`,
    reviewed: 'Nova revisão no meu PR',
    by: (who: string) => `nova revisão de ${who}`,
  },
  buttons: {
    more: "Mais",
    edit: "Editar botões",
    add: "Adicionar botão",
    none: "Você ainda não tem botões próprios; os integrados estão sendo mostrados.",
    file: (path: string) => `Meus botões: ${path}`,
    tooMany: (n: number, scope: string) => `${n} botões nos cartões de ${scope}; acima de 20 a linha fica difícil de ler`,
    scopes: { review: "revisão", pr: "meu PR", issue: "issue" },
    errors: {
      file: "não é um JSON com uma lista \"buttons\"; só os botões integrados são mostrados",
      fields: "precisa de id, name e prompt",
      scope: (scope: string) => `o scope "${scope}" não é review, pr nem issue`,
      variables: (names: string) => `variável desconhecida ${names}`,
    },
    builtIn: {
      "summarize-risks": { name: "Resumir riscos", prompt: "Resuma os riscos de {{.PrUrl}}: leia o diff com `gh pr diff {{.PrUrl}}` e liste o que pode quebrar, para quem, e o que testar primeiro. Não mude nada." },
      "explain-diff": { name: "Explicar o diff", prompt: "Explique o diff de {{.PrUrl}} arquivo por arquivo, em linguagem simples, para eu revisar rápido; leia com `gh pr diff {{.PrUrl}}`." },
      "draft-approval": { name: "Rascunhar aprovação", prompt: "Rascunhe um comentário de aprovação para {{.PrUrl}}: uma ou duas frases sobre o que está bom e depois pequenos ajustes. Leia o diff com `gh pr diff {{.PrUrl}}`. Não publique; me mostre." },
      "draft-reply": { name: "Rascunhar resposta ao revisor", prompt: "Rascunhe uma resposta para cada revisor de {{.PrUrl}}; leia os comentários com `gh pr view {{.PrUrl}} --comments`. Não publique nada; me mostre os rascunhos." },
      "investigate-ci": { name: "Investigar falha de CI", prompt: "Investigue por que a CI de {{.PrUrl}} falha: encontre os checks com falha com `gh pr checks {{.PrUrl}}` e os logs com `gh run view <run-id> --log-failed`, e depois me diga a causa e a correção. Não mude nada ainda." },
    },
  },
  prompt: {
    addButton: (path: string, names: string) => `Adicione um botão à minha caixa de revisões editando ${path}; crie como {"buttons": []} se não existir. Cada entrada é {"id", "name", "scope": "review" | "pr" | "issue", "prompt"}, e o prompt pode usar ${names} como {{.Name}}. Primeiro me pergunte o que o botão deve fazer.`,
    review: (url: string) => `Revise o PR ${url}.`,
    check: 'Verifique em especial: ',
    since: 'O que mudou desde a minha última revisão: ',
    style: 'Meu estilo habitual de revisão: ',
    task: {
      changes: (url: string) => `Resolva os comentários de revisão pendentes em ${url}; leia-os com \`gh pr view ${url} --comments\`.`,
      'ci-failing': (url: string) =>
        `Corrija o CI que está falhando em ${url}: encontre os checks com falha com \`gh pr checks ${url}\` e os logs com \`gh run view <run-id> --log-failed\`.`,
      conflict: (url: string, base?: string) =>
        `Resolva o conflito de merge em ${url}: faça merge de ${base ? `origin/${base}` : 'sua branch base'} na branch do PR.`,
      work: (url: string) => `Trabalhe em ${url}: leia a issue, planeje a mudança e comece em uma branch nova.`,
    },
    here: 'esta pasta',
    workIn: (where: string, isPr: boolean) =>
      isPr
        ? `Trabalhe em ${where}, em um worktree novo com o PR em checkout (\`gh pr checkout\` cuida de forks); deixe a branch atual da pasta como está.`
        : `Trabalhe em ${where}, em um worktree novo em uma branch nova; deixe a branch atual da pasta como está.`,
    noClone: (repo: string) => `Não há clone local conhecido de ${repo}: pergunte onde ele está, ou ofereça \`gh repo clone ${repo}\` e espere meu sim.`,
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
    style: 'Write in Brazilian Portuguese (not European Portuguese), neutral professional tone.',
  },
}
