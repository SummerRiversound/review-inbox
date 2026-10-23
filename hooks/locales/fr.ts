import type { Messages } from '../i18n'

// French reads 0 and 1 as singular.
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n < 2 ? one : many}`

export const fr: Messages = {
  title: 'Boîte de réception des revues',
  command: {
    description: 'Ouvrir la boîte de réception des revues : PR en attente de ma revue, mes PR et mes issues',
    opened: 'La boîte de réception des revues est ouverte.',
  },
  band: {
    open: 'Ouvrir',
    reviews: n => `Revues à faire ${n}`,
    prTodo: n => `Mes PR à traiter ${n}`,
    issues: n => `Mes issues ${n}`,
    oldest: days => ` · demande la plus ancienne : ${count(days, 'jour')} d'attente`,
  },
  tabs: {
    review: n => `Revues à faire ${n}`,
    mine: n => `Mes PR ${n}`,
    issues: n => `Mes issues ${n}`,
  },
  card: {
    rerequest: 'revue redemandée',
    waiting: days => `depuis ${count(days, 'jour')}`,
    ago: days => (days === 0 ? "aujourd'hui" : `il y a ${count(days, 'jour')}`),
    direct: 'demande directe',
    team: team => `demande via l'équipe (${team})`,
    sinceMyReview: 'Depuis ma dernière revue',
    summary: 'Résumé',
    why: 'Pourquoi',
    impact: 'Impact',
    size: (files, added, removed) => `${count(files, 'fichier')} (+${added} −${removed})`,
    hide: 'Masquer',
    review: 'Faire la revue',
    added: 'Ajouté',
    task: {
      changes: 'Traiter les commentaires',
      'ci-failing': 'Réparer la CI',
      conflict: 'Résoudre le conflit',
      work: 'Travailler dessus',
    },
    here: 'ce dossier',
    at: path => `dans ${path}`,
    noClone: 'pas de clone local',
    ciRunning: ' · CI en cours',
    newReview: who => `Nouvelle revue · ${who}`,
    referenced: (by, target) => `${by} a fait référence à mon travail : ${target}`,
  },
  state: {
    changes: 'Modifications demandées',
    'ci-failing': 'CI en échec',
    conflict: 'Conflit de fusion',
    waiting: 'En attente de revue',
    approved: 'Approuvée',
    draft: 'Brouillon',
  },
  issueKind: {
    assigned: 'Assignée à moi',
    mention: 'Me mentionne',
    reference: 'Fait référence à mon travail',
  },
  status: {
    loading: 'Chargement…',
    error: message => `Impossible de charger ; nouvelle tentative dans une minute (${message})`,
    updated: minutes => (minutes < 1 ? "Mis à jour à l'instant" : `Mis à jour il y a ${minutes} min`),
    firstFetch: 'Récupération depuis GitHub. La première fois, cela prend environ une minute.',
  },
  empty: {
    review: "Aucune PR n'attend votre revue.",
    mine: "Vous n'avez aucune PR ouverte.",
    issues: 'Aucune issue ne vous est assignée ni ne vous mentionne.',
  },
  sections: {
    session: n => `En cours dans une session ${n}`,
    hidden: n => `${count(n, 'masquée')} · tout afficher`,
    direct: n => `Demandes directes ${n}`,
    team: n => `Demandes via l'équipe ${n}`,
    drafts: n => `Brouillons · pas encore prêts pour la revue ${n}`,
    references: (days, n) => `Depuis ${count(days, 'jour')} · mon travail référencé ailleurs ${n}`,
  },
  note: {
    edit: 'Note',
    label: 'Note',
    placeholder: 'Ce que vous avez regardé ou prévu de faire',
    save: 'Enregistrer',
    tomorrow: 'Reporter à demain',
    nextWeek: 'Reporter à la semaine prochaine',
    cancel: 'Annuler',
    clear: 'Effacer',
    shown: (text: string) => `Note : ${text}`,
    until: (month: number, day: number) => `reportée au ${day}/${month}`,
  },
  session: {
    here: 'cette session',
    at: names => `En cours dans : ${names}`,
  },
  search: {
    label: 'Rechercher',
    placeholder: 'dépôt, #numéro, titre, description ou note',
    empty: 'Aucun résultat.',
    hidden: 'masquée',
  },
  toast: {
    back: 'Une carte reportée est de retour',
    added: n => `${count(n, 'carte ajoutée', 'cartes ajoutées')} · Échap place leurs demandes dans le prompt`,
    newRequest: 'Nouvelle demande de revue',
    moreRequests: n => count(n, 'autre demande de revue', 'autres demandes de revue'),
    morePrAlerts: n => `${count(n, 'autre alerte', 'autres alertes')} sur mes PR`,
    moreIssueAlerts: n => `${count(n, 'autre alerte', 'autres alertes')} sur mes issues`,
    promptBusy: 'La zone de saisie est occupée. Fermez la boîte de dialogue ouverte, puis appuyez de nouveau.',
    retry: 'Réessayez dans un instant.',
  },
  alert: {
    turned: state => `Ma PR : ${state}`,
    reviewed: 'Nouvelle revue sur ma PR',
    by: who => `nouvelle revue par ${who}`,
  },
  prompt: {
    review: url => `Fais la revue de ${url}.`,
    check: 'Vérifie en particulier : ',
    since: 'Changements depuis ma dernière revue : ',
    style: 'Mon style de revue habituel : ',
    task: {
      changes: url => `Traite les commentaires de revue non résolus sur ${url} ; lis-les avec \`gh pr view ${url} --comments\`.`,
      'ci-failing': url =>
        `Répare la CI en échec sur ${url} : trouve les checks en échec avec \`gh pr checks ${url}\` et leurs logs avec \`gh run view <run-id> --log-failed\`.`,
      conflict: (url, base) => `Résous le conflit de merge sur ${url} : merge ${base ? `origin/${base}` : 'sa branche de base'} dans sa branche.`,
      work: url => `Travaille sur ${url} : lis l'issue, planifie le changement et commence sur une nouvelle branche.`,
    },
    here: 'ce dossier',
    workIn: (where, isPr) =>
      isPr
        ? `Travaille dans ${where}, dans un nouveau worktree avec la PR récupérée (\`gh pr checkout\` gère les forks) ; laisse la branche actuelle du dossier telle quelle.`
        : `Travaille dans ${where}, dans un nouveau worktree sur une nouvelle branche ; laisse la branche actuelle du dossier telle quelle.`,
    noClone: repo => `Aucun clone local de ${repo} n'est connu : demande-moi où il se trouve, ou propose \`gh repo clone ${repo}\` et attends mon accord.`,
  },
  summaryFailed: reason => `Impossible de rédiger un résumé (${reason}).`,
  model: {
    language: 'Write in plain French, in the neutral professional register (vous when addressing the reader), as if explaining to a junior developer.',
    sentence: 'Each sentence about 18 French words, one idea per sentence.',
    filler: 'No filler words such as globalement, efficacement, divers, de manière fluide.',
    bad: "Refactorise la classe UserCache afin d'unifier le chemin de recherche de SessionStore.",
    good: "Corrige la photo de profil qui s'affichait parfois vide juste après la connexion.",
    since: 'Write in plain French, neutral professional register, one or two short sentences, about 18 French words each.',
    style: 'Write in plain French, in a neutral professional register.',
  },
}
