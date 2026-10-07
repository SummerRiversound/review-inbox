import type { Messages } from '../i18n'

// German has no default plural ending, so both forms are spelled out; 0 takes the plural.
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export const de: Messages = {
  title: 'Review-Posteingang',
  command: {
    description: 'Review-Posteingang öffnen: PRs, die auf mein Review warten, meine PRs und meine Issues',
    opened: 'Review-Posteingang geöffnet.',
  },
  band: {
    open: 'Öffnen',
    reviews: n => `Zu reviewen ${n}`,
    prTodo: n => `Meine PRs zu bearbeiten ${n}`,
    issues: n => `Meine Issues ${n}`,
    oldest: days => ` · längste Wartezeit ${count(days, 'Tag', 'Tage')}`,
  },
  tabs: {
    review: n => `Zu reviewen ${n}`,
    mine: n => `Meine PRs ${n}`,
    issues: n => `Meine Issues ${n}`,
  },
  card: {
    rerequest: 'erneut angefragt',
    waiting: days => `seit ${count(days, 'Tag', 'Tagen')}`,
    ago: days => (days === 0 ? 'heute' : `vor ${count(days, 'Tag', 'Tagen')}`),
    direct: 'direkte Anfrage',
    team: team => `Team-Anfrage (${team})`,
    sinceMyReview: 'Seit meinem letzten Review',
    summary: 'Zusammenfassung',
    why: 'Grund',
    impact: 'Auswirkungen',
    size: (files, added, removed) => `${count(files, 'Datei', 'Dateien')} (+${added} −${removed})`,
    hide: 'Ausblenden',
    review: 'Reviewen',
    added: 'Hinzugefügt',
    ciRunning: ' · CI läuft',
    newReview: who => `Neues Review · ${who}`,
    referenced: (by, target) => `${by} hat auf meine Arbeit verwiesen: ${target}`,
  },
  state: {
    changes: 'Änderungen angefordert',
    'ci-failing': 'CI fehlgeschlagen',
    conflict: 'Mergekonflikt',
    waiting: 'Wartet auf Review',
    approved: 'Genehmigt',
    draft: 'Entwurf',
  },
  issueKind: {
    assigned: 'Mir zugewiesen',
    mention: 'Erwähnt mich',
    reference: 'Verweist auf meine Arbeit',
  },
  status: {
    loading: 'Wird geladen…',
    error: message => `Laden fehlgeschlagen, neuer Versuch in einer Minute (${message})`,
    updated: minutes => (minutes < 1 ? 'Gerade aktualisiert' : `Vor ${minutes} Min. aktualisiert`),
    firstFetch: 'Daten werden von GitHub abgerufen. Beim ersten Mal dauert das etwa eine Minute.',
  },
  empty: {
    review: 'Derzeit warten keine PRs auf mein Review.',
    mine: 'Derzeit ist keiner meiner PRs offen.',
    issues: 'Es gibt keine Issues, die mir zugewiesen sind oder mich erwähnen.',
  },
  sections: {
    hidden: n => `${n} ausgeblendet · alle anzeigen`,
    drafts: n => `Entwürfe · noch nicht bereit für Review ${n}`,
    references: (days, n) =>
      `${days === 1 ? 'Letzter' : 'Letzte'} ${count(days, 'Tag', 'Tage')} · anderswo auf meine Arbeit verwiesen ${n}`,
  },
  toast: {
    added: n => `${count(n, 'PR', 'PRs')} hinzugefügt · Esc übernimmt die Review-Anfragen in den Prompt`,
    newRequest: 'Neue Review-Anfrage',
    moreRequests: n => count(n, 'weitere Review-Anfrage', 'weitere Review-Anfragen'),
    morePrAlerts: n => `${count(n, 'weitere Benachrichtigung', 'weitere Benachrichtigungen')} zu meinen PRs`,
    moreIssueAlerts: n => `${count(n, 'weitere Benachrichtigung', 'weitere Benachrichtigungen')} zu meinen Issues`,
    promptBusy: 'Das Eingabefeld ist gerade belegt. Bitte den geöffneten Dialog schließen und erneut drücken.',
    retry: 'Bitte gleich noch einmal versuchen.',
  },
  alert: {
    turned: state => `Mein PR: ${state}`,
    reviewed: 'Neues Review zu meinem PR',
    by: who => `neues Review von ${who}`,
  },
  prompt: {
    review: url => `Bitte reviewe ${url}.`,
    check: 'Achte besonders auf: ',
    since: 'Seit meinem letzten Review geändert: ',
    style: 'Mein üblicher Review-Stil: ',
  },
  summaryFailed: reason => `Zusammenfassung konnte nicht erstellt werden (${reason}).`,
  model: {
    language: 'Write in German, in a neutral impersonal register (no "du" or "Sie"), as if explaining to a junior developer.',
    sentence: 'Each sentence about 12 German words, one idea per sentence.',
    filler: 'No filler words such as grundsätzlich, insgesamt, diverse, entsprechend.',
    bad: 'Refaktoriert die Klasse UserCache, um den Lookup-Pfad von SessionStore zu vereinheitlichen.',
    good: 'Behebt, dass das Profilbild direkt nach dem Login manchmal leer blieb.',
    since: 'Write in German, in a neutral impersonal register (no "du" or "Sie"), one or two short sentences, about 12 words each.',
    style: 'Write in German, in a neutral impersonal register (no "du" or "Sie").',
  },
}
