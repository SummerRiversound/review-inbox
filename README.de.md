# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox) [![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | **Deutsch** | [Français](README.fr.md)

Eine Mod für [Claude Code](https://claude.com/claude-code), die Ihre GitHub-Arbeit beim Programmieren sichtbar hält: Pull Requests, die auf Ihr Review warten – jeder in verständlicher Sprache zusammengefasst, bevor Sie ihn öffnen –, Ihre eigenen offenen PRs mit den Reviews, die sie erhalten, und die Issues, in die Sie einbezogen werden.

![Die Leiste über dem Prompt, danach die drei Tabs des Panels: Zu reviewen, Meine PRs und Meine Issues](docs/images/en/overview.gif)

## Schnellstart

Mit angemeldeter [GitHub CLI](https://cli.github.com/) (`gh auth login`) im Prompt einer Claude-Code-Sitzung:

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
/review-inbox
```

Die letzte Zeile öffnet das Panel. Optionen und Updates stehen unter [Installation](#installation).

- **Leiste über dem Prompt** – eine Zeile, die nur zählt, was Ihr Zutun erfordert: PRs, die auf Ihr Review warten, Ihre PRs, bei denen etwas zu tun ist, und Issues, die Ihnen zugewiesen sind oder Sie erwähnen. Ihre Farbe zeigt, wie lange die älteste Review-Anfrage schon wartet (gelb ab 3 Tagen, rot ab 14). `Öffnen` öffnet das Panel. Sinkt eine Zahl, wird sie kurz grün.
- **Panel „Review-Posteingang“** – `/review-inbox`, mit fünf Tabs: Zu reviewen, Meine PRs und Zugewiesen & erwähnt zeigen, was Sie erledigen müssen; Gespeicherte Suchen und Benachrichtigungen sind zum Stöbern da. Drücken Sie 1 bis 5, solange das Panel den Fokus hat, um von links gezählt zu diesem Tab zu wechseln. Die Zahl am Tab zählt seine Karten; Gespeicherte Suchen hat keine, und Benachrichtigungen zählt die ungelesenen.
- **Benachrichtigungen** – ein kurzer Hinweis, wenn während der Arbeit etwas Neues eintrifft.

Oberfläche und Zusammenfassungen gibt es in neun Sprachen; siehe [Sprache](#sprache).

## Voraussetzungen

- Claude Code 2.1.287 oder neuer, die ersten Builds mit Mods (Function-Hook-Plugins). Getestet mit 2.1.292. Mods befinden sich im Early Access, und ihre API kann sich zwischen Releases ändern.
- [GitHub CLI](https://cli.github.com/) (`gh`) im `PATH`, angemeldet (`gh auth login`) und mit Zugriff auf die Repositories, die Sie reviewen.
- GitHub Enterprise Server: Setzen Sie `GH_HOST` in der Umgebung, in der Claude Code startet; jeder `gh`-Aufruf geht dann an diesen Host.

## Installation

Im Prompt einer Sitzung von Claude Code:

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

Der Installationsbildschirm fragt die unten beschriebenen Optionen ab; alle können leer bleiben oder ihren Standardwert behalten.

### Aktualisieren und deinstallieren

```sh
claude plugin marketplace update review-inbox
claude plugin update review-inbox@review-inbox
claude plugin uninstall review-inbox@review-inbox
```

Ein Update wird nach einem Neustart wirksam. Beim Deinstallieren bleibt der Cache-Ordner der Mod, `~/.claude/plugins/data/review-inbox`, erhalten; löschen Sie ihn selbst, um die zwischengespeicherten Listen und Zusammenfassungen zu entfernen. Was sich in den einzelnen Versionen geändert hat, steht im [Changelog](CHANGELOG.md).

## Konfiguration

Die Optionen werden auf dem Installationsbildschirm gesetzt und lassen sich später in `/config` ändern. Eine Änderung gilt sofort.

| Option | Standard | Beschreibung |
| --- | --- | --- |
| `scope` | leer | GitHub-Suchqualifizierer, die an jede Suche angehängt werden (`review-requested:@me`, `author:@me`, `assignee:@me`, `mentions:@me`). Leer bedeutet: ganz GitHub. |
| `githubUser` | leer | Das `gh`-Konto, das verwendet wird, wenn mehrere angemeldet sind (`gh auth token -u <user>`). Leer verwendet das aktive Konto. |
| `language` | `auto` | `auto` oder einer der Codes unter [Sprache](#sprache). |
| `refreshMinutes` | `10` | Minuten zwischen zwei Abrufen von GitHub: 5, 10, 15, 30 oder 60. Alle Sitzungen teilen sich einen Abruf. |
| `repoPaths` | leer | Wo Claude für die Schaltflächen zum nächsten Schritt an jedem Repository arbeitet. Siehe unten. |
| `motion` | `auto` | `off` schaltet das Aufleuchten der Zahlen in der Leiste ab. `auto` schaltet es ebenfalls ab, wenn die Einstellung für reduzierte Bewegung von Claude Code (`prefersReducedMotion`) an ist. |
| `directActions` | `off` | `on` fügt Schaltflächen hinzu, die von einer Karte aus auf GitHub schreiben. Siehe „Direkte GitHub-Aktionen“ unten. |

`scope` akzeptiert alles, was die [Issue- und PR-Suche](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) von GitHub akzeptiert:

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Wiederholte Qualifizierer `org:`, `repo:` und `user:` treffen zu, sobald einer von ihnen passt. Eine Team-Review-Anfrage zählt als Anfrage an Sie, so wie GitHubs `review-requested:@me` es definiert.

`repoPaths` nimmt durch Kommas getrennte Einträge `owner/repo=Pfad`. `owner/*=Pfad/*` gilt für alle Repositorys eines Owners, wobei `*` im Pfad für den Namen des Repositorys steht; ein genauer Name hat Vorrang vor einem Platzhalter, und `~` ist Ihr Home-Ordner. Ein hier genannter Ordner hat Vorrang vor dem Ordner der Sitzung und den Ordnern, die sich die Mod gemerkt hat.

```text
my-org/*=~/code/*
my-org/legacy=~/old/legacy-app
```

## Tabs

Jeder Tab fasst seine Karten nach Kategorien zusammen. Ein Druck auf die Überschrift einer Kategorie klappt sie zu, ein weiterer klappt sie auf. `N ausgeblendet · alle anzeigen` oben im Tab zeigt nur die ausgeblendeten Karten dieses Tabs wieder an.

`Notiz` unter `▸ Aktionen` einer Karte schreibt eine Zeile über ihren Titel: was Sie geprüft haben oder was Sie wann vorhaben. `Speichern` lässt die Karte sichtbar. `Bis morgen zurückstellen` und `Bis nächste Woche zurückstellen` blenden sie bis morgen oder nächsten Montag um 9 Uhr aus, oder früher, wenn es Neues gibt: einen neuen Commit in einer Review-Anfrage, einen neuen Zustand oder ein neues Review auf Ihrem PR, neue Aktivität in einem Issue. Eine Benachrichtigung meldet die zurückgekehrte Karte mit ihrer Notiz. `Löschen` entfernt die Notiz.

Das Suchfeld oben durchsucht alle Tabs auf einmal: Repository, Nummer, Titel, Autor, die ersten 2.000 Zeichen der Beschreibung, die Zusammenfassung und Ihre Notizen. Ausgeblendete und zurückgestellte Karten werden ebenfalls gefunden und als `ausgeblendet` markiert. Leeren Sie das Feld, um zu den Tabs zurückzukehren. Die mobile Claude-App zeichnet noch keine Textfelder; dort werden Notizen angezeigt, aber Suche und `Notiz` fehlen.

Karten, an denen eine Sitzung arbeitet, sammeln sich oben in Zu reviewen und Meine PRs unter `In Arbeit in einer Sitzung`, mit dem Ordnernamen der Sitzung oder `diese Sitzung`. Ihr PR landet dort, wenn der Ordner einer Sitzung seinen Branch in seinem Repository ausgecheckt hat; jede Karte landet dort, sobald ein Prompt dieser Sitzung auf sie verlinkt, wie es `Mit Claude reviewen` tut. Wird eine Sitzung geschlossen oder meldet sie sich 10 Minuten lang nicht, kehren ihre Karten in ihre Gruppen zurück.

Eine Sitzung, die noch eine ältere Version des Mods ausführt, etwa eine vor dem Update geöffnete und nie neu geladene, wird unter dem Titel des Fensters genannt, zum Beispiel `2 Sitzungen mit älterer Version (dhub2): dort /reload-plugins ausführen`. Eine solche Sitzung hält ihre Listen in einer eigenen Datei und zeigt ihre Listen oder Fehler deshalb nie in einer aktuellen Sitzung. `Alle neu laden` daneben bittet diese Sitzungen über `reload.json` im Cache-Ordner, `/reload-plugins` selbst auszuführen: Jede tut es, sobald sie frei ist, und lädt dabei auch ihre anderen Plugins neu. Nur Sitzungen ab 0.13.0 können darauf antworten; in einer älteren muss der Befehl einmal dort ausgeführt werden.

Karten aus dem Repository dieser Sitzung stehen in jeder Gruppe vorn, markiert mit `dieses Repository`. Enthalten die Tabs auch andere Repositorys, schränken `Dieses Repository N` und `Alle N` über den Tabs sie auf dieses Repository ein oder zeigen wieder alles; die Leiste zählt immer alles. Das Repository dieser Sitzung ist wie bei `gh` das, das `GH_REPO` nennt, sonst das der GitHub-Remotes des Ordners.

Unter dem Titel zeigt eine Karte bis zu zwei Labels und wie viele es noch gibt, die Zahl der Kommentare und bei einem PR `→ Branch`, wenn er nicht auf den Standard-Branch des Repositorys zielt.

Ein `●` vor dem Repository einer Karte markiert eine, die sich geändert hat, seit Sie das Panel zuletzt geschlossen haben, so wie GitHubs eigener Posteingang markiert, was sich seit Ihrem letzten Besuch geändert hat. Vor dem ersten Schließen ist nichts markiert.

Wenn nichts Ihr Zutun erfordert (keine Review-Anfrage, kein PR mit etwas zu tun, kein Issue, das Ihnen zugewiesen ist oder Sie erwähnt), zeigt das Panel über den Tabs `✓ Nichts wartet auf Sie`, und die Leiste bleibt verborgen.

### Zu reviewen

Eine Karte pro PR, der auf Ihr Review wartet: eine Zusammenfassung in einem Satz, der Grund für den PR, seine Auswirkungen, Größe und Autor sowie die Zeit, seit der Ihr Review aussteht. Riskante Punkte wie eine Schemaänderung oder eine vorgeschriebene Deploy-Reihenfolge werden mit ⚠️ markiert.

- `Mit Claude reviewen` markiert die Karte als `Hinzugefügt` und lässt das Panel geöffnet, sodass Sie mehrere PRs auswählen können. Wenn Sie das Panel schließen (Esc oder ×), wird für jeden hinzugefügten PR eine Review-Anfrage in Ihren Prompt eingefügt, samt Warnhinweisen und den Änderungen seit Ihrem letzten Review. Gesendet wird erst, wenn Sie Enter drücken. Ein PR, für den Ihr bereits eingegebener Text schon eine Anfrage enthält, erscheint beim Öffnen des Panels als `Hinzugefügt`.
- `Ausblenden` unter `▸ Aktionen`, neben `Notiz`, blendet die Karte aus, bis der PR einen neuen Commit erhält.
- `erneut angefragt` kennzeichnet einen PR, den Sie bereits reviewt haben und der Sie erneut anfragt, mit einer kurzen Zusammenfassung der Änderungen seit Ihrem letzten Review.
- Die Karten sind in direkte Anfragen, Team-Anfragen und Entwürfe gruppiert.

![Reviewen auf zwei Karten markiert sie als Hinzugefügt, Ausblenden blendet eine dritte aus, und Esc übernimmt beide Review-Anfragen in den Prompt](docs/images/en/review.gif)

Die Anfrage enthält außerdem eine Zeile, die beschreibt, wie Sie üblicherweise reviewen, damit Claude so reviewt, wie Sie es tun würden. Einmal pro Woche liest die Mod Ihre eigenen Kommentare zu bis zu 30 PRs, die Sie kürzlich reviewt haben, und lässt Claude Ihre Sprache und Ihren Ton beschreiben, worauf Sie zuerst achten und wie Sie Bitten formulieren. Liegen weniger als fünf Kommentare zum Lernen vor, geht die Anfrage ohne diese Zeile hinaus; schlägt das Lernen fehl, bleibt die letzte Beschreibung erhalten und die Mod versucht es einen Tag später erneut.

### Meine PRs

Ihre offenen PRs, statt mit einer Zusammenfassung mit ihrem Zustand, in der Reihenfolge, in der Sie tätig werden müssen: Änderungen angefordert, CI fehlgeschlagen, Mergekonflikt, wartet auf Review (älteste zuerst), genehmigt, in der Merge-Warteschlange, Entwurf. Läuft gerade eine CI, steht „CI läuft“ neben dem Zustand. Ein PR in einer Merge-Warteschlange zeigt `In der Merge-Warteschlange`: GitHub merged ihn, sobald die Prüfungen der Warteschlange bestehen, daher zählt die Leiste ihn nicht mit und er zeigt nie `Bereit zum Mergen`.

`Ausblenden` blendet einen PR aus, bis sich sein Zustand ändert oder jemand ihn reviewt; Ihr eigener Push allein holt ihn nicht zurück.

![Meine PRs: sechs PRs von „Änderungen angefordert“ bis „Entwurf“, zwei davon mit neuem Review](docs/images/en/my-prs.png)

Ein Review, das nach Ihrem letzten Commit eingereicht wurde, erscheint als `Neues Review` mit Angabe, von wem es stammt, bis Sie erneut committen. Das umfasst Genehmigungen, Änderungsanforderungen und reine Kommentar-Reviews einschließlich Antworten in Threads, von Menschen wie von Bots; ein verworfenes (dismissed) Review zählt nicht. Ein solcher PR zählt als zu bearbeiten und steht vor PRs ohne Neuigkeiten im selben Zustand. Es wird kein Modell aufgerufen.

Ein PR, der auf Sie wartet (Änderungen angefordert, CI fehlgeschlagen oder Merge-Konflikt), hat eine Schaltfläche für den nächsten Schritt: `Kommentare umsetzen`, `CI reparieren` oder `Konflikt lösen`. Daneben steht der Ordner, in dem Claude arbeiten würde: `dieser Ordner`, wenn diese Sitzung in einem Klon des Repositorys läuft, der Ordner der letzten Sitzung, die darin lief, oder `kein lokaler Klon`. Die Schaltfläche fügt die Karte hinzu wie `Mit Claude reviewen`. Wenn Sie das Panel schließen, nennt die Anfrage den Schritt und die `gh`-Befehle, mit denen sich die Kommentare oder die fehlgeschlagenen Logs lesen lassen, und bittet Claude, in einem neuen Worktree zu arbeiten und den Branch des Ordners nicht anzufassen. Ist kein Ordner bekannt, fragt Claude, wo Ihr Klon liegt, oder bietet `gh repo clone` an und wartet auf Ihr Ja. Keine zusätzlichen GitHub-Aufrufe und keine Modellaufrufe.

### Zugewiesen & erwähnt

Offene Issues, die Ihnen zugewiesen sind, sowie offene Issues und PRs, die Sie erwähnen; ein Eintrag, auf den beides zutrifft, erscheint nur einmal, als „Mir zugewiesen“. Darunter stehen andere Issues und PRs aus den letzten 30 Tagen, die auf eines Ihrer Issues oder einen Ihrer PRs verwiesen haben, jeweils mit Angabe, von wem. Verweise, die Sie selbst gesetzt haben, werden ausgelassen, und nur die neuesten 20 werden angezeigt. Es wird kein Modell aufgerufen.

Die Einträge sind in zugewiesen, Erwähnungen und Verweise gruppiert. `Ausblenden` blendet einen Eintrag aus, bis es neue Aktivität darauf gibt.

![Meine Issues: zugewiesene Issues, Erwähnungen und Verweise von anderswo auf Ihre Arbeit](docs/images/en/my-issues.png)

Ein Ihnen zugewiesenes Issue hat eine Schaltfläche `Daran arbeiten`, die genauso funktioniert: Claude liest das Issue, plant die Änderung und beginnt auf einem neuen Branch in einem neuen Worktree.

### Gespeicherte Suchen

GitHub-Suchen, die Sie selbst benennen und speichern, jede ein Abschnitt mit ihrer Anzahl und den 20 zuletzt geänderten Treffern. Ein Titel öffnet diesen PR oder dieses Issue auf GitHub, und `N weitere auf GitHub` öffnet dort die ganze Suche. Drei sind eingebaut, wie im PR-Posteingang von GitHub: `Betrifft mich` (offene PRs, an denen Sie beteiligt sind, die Sie aber nicht eröffnet haben), `Von mir reviewt, noch offen` und `Meine offenen Issues`. Ein Klick auf die Überschrift eines Abschnitts klappt ihn ein. Die Suchen laufen bei jeder Aktualisierung, drei gleichzeitig; eine, die fehlschlägt, zeigt den Grund und lässt die anderen unberührt. Keine Modellaufrufe.

Eigene gespeicherte Suchen tragen Sie unter `groups` in dieselbe `actions.json` ein wie die Kartenschaltflächen; `/review-inbox add-search` bittet Claude, eine mit Ihnen zu schreiben.

```json
{
  "groups": [
    { "id": "team", "name": "Team-PRs", "query": "org:acme is:open label:urgent", "scope": "prs", "countInBand": true },
    { "id": "reviewed-by-me", "hidden": true }
  ]
}
```

`query` ist GitHub-Suchsyntax. `scope` ist `prs` oder `issues`: Es fügt `is:pr` bzw. `is:issue` hinzu, sofern die Suche die Art nicht schon nennt, und `sort:updated-desc` wird ergänzt, sofern sie kein eigenes `sort:` hat. Die Einstellung `scope` und `Dieses Repository` schränken diese Suchen nicht ein; schreiben Sie dafür `org:` oder `repo:` in die Suche. `"countInBand": true` zählt die Anzahl der Suche als `Gespeicherte Suchen N` in der Leiste mit. Eine gespeicherte Suche mit einer eingebauten id ersetzt diese, und `"hidden": true` entfernt sie. Ein Eintrag mit fehlendem Feld oder unbekanntem scope wird ausgelassen; das Panel warnt unten davor, und `/review-inbox buttons` führt ihn mit dem Grund auf. Nur die ersten 15 gespeicherten Suchen werden ausgeführt.

### Benachrichtigungen

Ihre GitHub-Benachrichtigungen, die kein anderer Tab schon zeigt, in einem Abschnitt pro Grund (`Kommentar`, `Status geändert`, `CI-Lauf` und so weiter), darin die neuesten zuerst; ein Klick auf die Überschrift eines Abschnitts klappt ihn ein. Das sind Kommentare, Statusänderungen und neue Aktivität in Threads, die Sie eröffnet haben oder an denen Sie beteiligt sind, Team-Erwähnungen und Sicherheitswarnungen. Abgeschlossene GitHub-Actions-Läufe, die Sie gestartet haben, erscheinen auch, als `CI-Lauf`, verlinkt mit der Actions-Seite des Repositorys; GitHub sendet sie nur, solange Actions-Benachrichtigungen für GitHub aktiviert sind, unter Notifications → System → Actions in Ihren GitHub-Einstellungen. Review-Anfragen, Zuweisungen und Erwähnungen fehlen hier, ebenso Threads, deren PR oder Issue schon eine Karte ist. Ein ungelesener Thread ist mit `●` markiert, und die Zahl am Tab zählt sie. Gelesen werden bis zu 100 Benachrichtigungen der letzten 30 Tage.

`Erledigt` und `Abbestellen` nehmen die Zeile sofort weg und lassen 10 Sekunden lang `Erledigt · Rückgängig` bzw. `Abbestellt · Rückgängig` an ihrer Stelle; schließen Sie das Panel vorher, werden sie sofort abgeschickt. Dann markiert `Erledigt` den Thread auf GitHub als erledigt, wie GitHubs eigener Posteingang, und `Abbestellen` stellt außerdem seine Benachrichtigungen ab, bis Sie jemand erwähnt oder Sie kommentieren. Ein erledigter Thread kommt bei neuer Aktivität zurück. Schlägt etwas fehl, kehrt die Zeile mit dem Grund zurück. Keine Modellaufrufe.

GitHub gibt Benachrichtigungen nur an die Anmeldung von gh und an klassische Tokens. Ohne Zugriff sagt der Tab das und wie Sie ihn bekommen (`gh auth login` oder `gh auth refresh -s notifications`).

### Benachrichtigungen

Benachrichtigt wird bei einer neuen Review-Anfrage, einem neuen Review zu einem Ihrer PRs, wenn einer Ihrer PRs zu „Änderungen angefordert“, „CI fehlgeschlagen“ oder „Mergekonflikt“ wechselt, sowie bei einer neuen Zuweisung, Erwähnung oder einem neuen Verweis. Eine neue Sitzung meldet sie nicht einzeln: Eine Benachrichtigung fasst zusammen, was sich seit dem letzten Blick einer Sitzung geändert hat, etwa `Während Sie weg waren · CI fehlgeschlagen 2`, und bleibt aus, wenn sich nichts geändert hat. Treffen mehrere gleichzeitig ein, erscheinen sie nacheinander im Abstand von viereinhalb Sekunden.

Wird Ihr PR genehmigt und läuft keine CI mehr, erscheint einmal `Bereit zum Mergen`.

![Drei Benachrichtigungen nacheinander unter dem Prompt: eine neue Review-Anfrage, Änderungen angefordert an Ihrem PR und eine neue Erwähnung](docs/images/en/toasts.gif)

### Schaltflächen auf Karten

`▸ Aktionen` auf einer Karte öffnet `Notiz` und `Ausblenden`, danach Schaltflächen, die die Karte jeweils mit einer vorbereiteten Anfrage an Claude übergeben: `Risiken zusammenfassen`, `Diff erklären` und `Freigabe-Kommentar entwerfen` bei einer Review-Anfrage, `Antwort an Reviewer entwerfen` und `CI-Fehler untersuchen` bei Ihrem PR. Eine Schaltfläche fügt die Karte hinzu wie `Mit Claude reviewen`, und die Anfrage landet in Ihrem Prompt, wenn Sie das Panel schließen. Bis Sie Enter drücken, wird nichts ausgeführt und nichts gepostet.

Eigene Schaltflächen legen Sie in `actions.json` im Cache-Ordner an. `/review-inbox buttons` zeigt den Pfad, den Inhalt und ausgelassene Einträge, und `/review-inbox add-button` bittet Claude, mit Ihnen eine zu schreiben.

```json
{
  "buttons": [
    { "id": "test-plan", "name": "Testplan", "scope": "review", "prompt": "Schreibe in {{.RepoPath}} einen Testplan für {{.PrUrl}}." },
    { "id": "draft-approval", "scope": "review", "hidden": true }
  ]
}
```

`scope` ist `review`, `pr` oder `issue`. Der Prompt kann `RepoName`, `RepoPath`, `PrNumber`, `PrUrl`, `PrTitle`, `Author`, `HeadRefName`, `BaseRefName`, `IssueNumber`, `IssueTitle`, `IssueUrl` verwenden, geschrieben wie in gh-dash als `{{.Name}}`, `{{Name}}`, `{{ .Name }}`; eine Variable, für die die Karte keinen Wert hat, bleibt leer. Eine Schaltfläche mit der id einer eingebauten ersetzt diese, und `"hidden": true` entfernt sie. Ein Eintrag mit fehlendem Feld, unbekanntem scope oder unbekannter Variable wird ausgelassen; das Panel warnt unten davor, und `/review-inbox buttons` führt ihn mit dem Grund auf. Der Rest funktioniert weiter. `PrTitle` und `Author` kommen so von GitHub, wie sie dort stehen; ein Prompt, der sie verwendet, gibt also Text anderer Leute an Claude weiter.

### Direkte GitHub-Aktionen

Steht `directActions` auf `on`, bekommen Karten zusätzlich Schaltflächen, die selbst auf GitHub schreiben, mit Ihrem `gh`-Konto.

- `Genehmigen` auf einer Review-Anfrage, `Bereit zur Prüfung` auf Ihrem Entwurfs-PR und `Branch aktualisieren` auf Ihrem PR, wenn sein Basis-Branch weitergezogen ist. Andere sehen diese Aktionen, und sie lassen sich nicht zurücknehmen; deshalb macht der erste Druck aus der Zeile einen Satz, der nennt, was als wer gesendet wird, etwa `Genehmigen: o/r#5 "Fix login" als kim — (kein Kommentar)`. `Genehmigung bestätigen` sendet ihn, ebenso `y`, solange das Panel die Tasten hat; `Abbrechen` oder zehn Sekunden bringen die Schaltflächen zurück. Der Fokus springt auf `Abbrechen`, und eine Bestätigung innerhalb von 300 ms nach dem ersten Druck wird ignoriert, sodass ein gehaltenes Enter nichts sendet.
- Eine Genehmigung hat keinen Kommentar und nennt den Commit, den Sie angesehen haben. Sind seitdem neue Commits hinzugekommen, wird sie nicht gesendet, und die Karte sagt es. `Branch aktualisieren` mergt den Basis-Branch hinein und rebased nie.
- `Fehlgeschlagene CI neu starten` auf Ihrem PR mit fehlschlagenden Prüfungen startet die fehlgeschlagenen Jobs der GitHub-Actions-Läufe auf seinem neuesten Commit neu. `Mir zuweisen` auf einem Issue, das Sie erwähnt, wird sofort gesendet, mit `Rückgängig` für zehn Sekunden.
- Ein fehlgeschlagener Schreibvorgang bleibt mit der Meldung von GitHub auf der Karte, und seine Schaltfläche kommt zurück.

Direkt gemergt wird nie. Ihr genehmigter PR ohne laufende Prüfungen bekommt eine Schaltfläche `Mergen`, auch wenn `directActions` aus ist: Sie fügt Ihrem Prompt die Bitte hinzu, die Merge-Methoden des Repositorys zu prüfen und `gh pr merge` auszuführen; Sie senden sie mit Enter, und Claude Code fragt nach der Erlaubnis.

## Sprache

Leiste, Panel, Benachrichtigungen, die in Ihren Prompt eingefügte Review-Anfrage sowie die Zusammenfassungen und die Beschreibung Ihres Review-Stils, die das Modell schreibt, verwenden alle dieselbe Sprache.

| Code | Sprache |
| --- | --- |
| `en` | Englisch (English) |
| `ko` | Koreanisch (한국어) |
| `ja` | Japanisch (日本語) |
| `zh-CN` | Vereinfachtes Chinesisch (简体中文) |
| `zh-TW` | Traditionelles Chinesisch (繁體中文) |
| `es` | Spanisch (Español) |
| `pt-BR` | Brasilianisches Portugiesisch (Português do Brasil) |
| `de` | Deutsch |
| `fr` | Französisch (Français) |

- Ein Code wählt die jeweilige Sprache.
- `auto` (der Standard) folgt der `language`-Einstellung von Claude Code selbst, sofern sie eine dieser Sprachen nennt – per Code, englischem Namen oder Eigenbezeichnung (`ja-JP`, `Japanese`, `日本語`). Andernfalls folgt es der Locale des Systems (`LC_ALL`, `LC_MESSAGES`, dann `LANG`), und sonst gilt Englisch. Chinesisch wird als vereinfachtes Chinesisch gelesen, sofern es nicht als Taiwan, Hongkong, Macau oder traditionell gekennzeichnet ist (`zh-TW`, `zh-Hant`, `繁體中文`), Portugiesisch als brasilianisches Portugiesisch.

Zusammenfassungen und die Beschreibung Ihres Review-Stils werden pro Sprache zwischengespeichert; nach einem Wechsel werden daher jede Zusammenfassung und diese Beschreibung einmal neu in der neuen Sprache geschrieben. Jede andere Sprache fällt auf Englisch zurück.

Alle Sprachen außer Englisch und Koreanisch wurden mit Claude übersetzt und noch nicht von Muttersprachlern geprüft; dasselbe gilt für diese README. Korrekturen sind als Issue oder Pull Request willkommen: Jede Sprache ist eine Datei in [`hooks/locales/`](hooks/locales/), und die englische Tabelle, nach der sich alle anderen richten, steht in [`hooks/i18n.ts`](hooks/i18n.ts).

## Was die Mod liest und ausführt

Die Mod greift nur über Ihr eigenes `gh` auf GitHub zu, sendet PR-Texte an Claude, um die Zusammenfassungen zu schreiben, einmal pro Woche außerdem Ihre eigenen Review-Kommentare, um Ihren Stil zu beschreiben, und schreibt nur in ihren eigenen Cache-Ordner. Im Folgenden steht alles, worauf sie zugreift, und warum; die Liste entspricht dem, was `claude plugin validate .` für die Mod ausgibt.

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **Führt `gh` aus**: `gh api graphql` für die Listen und einmal pro Woche für Ihre letzten Review-Kommentare; `gh api repos/<owner>/<repo>/compare/<from>...<to>` für einen erneut angefragten PR, und `gh auth token -u <githubUser>`, wenn `githubUser` gesetzt ist. Für den Tab Benachrichtigungen führt sie `gh api notifications` aus und beim Drücken von `Erledigt` oder `Abbestellen` `gh api -X DELETE notifications/threads/<id>` (beim Abbestellen vorher auch `/subscription`). Mit `directActions` auf `on` führt eine gedrückte Schaltfläche `gh api user` für den Kontonamen und `gh api repos/<owner>/<repo>/pulls/<n>` für den neuesten Commit aus, dann eines von `gh api -X POST …/pulls/<n>/reviews` (`event=APPROVE`, `commit_id`), `gh pr ready`, `gh api -X PUT …/pulls/<n>/update-branch`, `gh api …/actions/runs?head_sha=<sha>&status=failure` mit `gh api -X POST …/actions/runs/<id>/rerun-failed-jobs` oder `gh api -X POST`/`-X DELETE …/issues/<n>/assignees`. Weitere eigene Netzwerkaufrufe macht die Mod nicht.
- **Führt `git` aus** im Ordner der Sitzung, alle 30 Sekunden: `git branch --show-current` und `git remote -v`, um eine Sitzung auf dem Branch Ihres PRs zu finden, und `git rev-parse --path-format=absolute --git-common-dir`, um sich den Hauptordner dieses Repositorys zu merken.
- **Fragt Claude** (Modell `sonnet`) nach jeder Zusammenfassung und sendet dabei Repository-Namen, Titel, Beschreibung (die ersten 12.000 Zeichen), geänderte Dateipfade (bis zu 80) und Größe eines PRs; bei einem erneut angefragten PR außerdem die erste Zeile jeder Commit-Nachricht und bis zu 60 Dateipfade seit Ihrem letzten Review. Das wird auf Ihre Nutzung von Claude Code angerechnet. Jeder PR wird pro Head-Commit und Sprache einmal zusammengefasst; eine fehlgeschlagene Zusammenfassung wird pro Commit höchstens dreimal versucht. Einmal pro Woche sendet die Mod außerdem Ihre eigenen Review-Kommentare zu bis zu 30 PRs, die Sie kürzlich reviewt haben – jeder auf 500 Zeichen gekürzt, höchstens 60 davon und insgesamt 12.000 Zeichen –, um Ihren Review-Stil zu beschreiben; bei weniger als fünf wird nichts gesendet.
- **Schreibt Dateien** nur in ihren Cache-Ordner, `~/.claude/plugins/data/review-inbox` (ist `CLAUDE_CONFIG_DIR` gesetzt, tritt es an die Stelle von `~/.claude`). `inbox-<hash>-f<n>.json` enthält die Listen und Zusammenfassungen, `hidden-<hash>.json` die ausgeblendeten PRs, `notes-<hash>.json` Ihre Notizen und Zurückstellungen (eine Datei pro Konto und Bereich, unabhängig von der Sprache), `sessions.json` Ordner, Mod-Version, Branch, GitHub-Remotes und die PR-Links aus den Prompts jeder laufenden Sitzung (eine Datei für alle Konten), `repos.json` den Hauptordner jedes GitHub-Repositorys, in dem eine Sitzung lief (für die Schaltflächen zum nächsten Schritt) und `style-<hash>.json` die Beschreibung Ihres Review-Stils. Jede Datei wird zuerst daneben geschrieben und dann mit `mv` an ihren Platz verschoben, sodass keine Sitzung eine halb geschriebene Datei liest; wo es kein `mv` gibt, etwa unter Windows, wird sie direkt geschrieben. Dort liest sie `actions.json`, falls Sie eine angelegt haben, und schreibt sie nie.
- **Liest Umgebungsvariablen**: `CLAUDE_CONFIG_DIR`, `HOME` und `USERPROFILE`, um diesen Ordner zu finden; `GH_REPO`, um wie `gh` das Repository dieser Sitzung zu kennen; `LC_ALL`, `LC_MESSAGES` und `LANG` nur, wenn `language` auf `auto` steht. Sie setzt keine.
- **Liest Einstellungen von Claude Code**: den Schlüssel `language` nur, wenn `language` auf `auto` steht, und den Schlüssel `prefersReducedMotion` nur, wenn `motion` auf `auto` steht.
- **Liest und befüllt Ihren Prompt** nur rund um das Panel: Beim Öffnen des Panels liest sie den bereits eingegebenen Text, um die PRs zu markieren, für die er schon eine Anfrage enthält, und beim Schließen fügt sie die Anfragen für die von Ihnen hinzugefügten PRs in neuen Zeilen nach diesem Text an.

## Funktionsweise

Alle Ihre offenen Sitzungen teilen sich einen Abruf: Eine Sitzung fragt GitHub höchstens alle 10 Minuten ab, die anderen lesen, was sie gespeichert hat.

Jede offene Sitzung von Claude Code führt die Mod aus, doch alle teilen sich eine Cache-Datei pro Konto, Scope und Sprache; dasselbe gilt für ausgeblendete PRs. Jede Sitzung liest diese Datei alle 30 Sekunden. Nur die Sitzung, die sie älter als 10 Minuten vorfindet und sich eine kurzzeitige Sperre sichert, ruft GitHub ab – zehn offene Sitzungen erzeugen also eine einzige Anfrage. Die abrufende Sitzung erneuert ihre Sperre, solange sie arbeitet; eine Sperre, die 3 Minuten lang nicht erneuert wurde, wird übernommen. Ein fehlgeschlagener Abruf behält die letzten gültigen Listen und wird nach einer Minute wiederholt. `↻` im Panel ruft sofort ab.

Eine einzige GraphQL-Suche liefert alle PRs, die auf Ihr Review warten, samt allem, was die Karten brauchen; eine weitere Anfrage mit drei Suchen füllt Meine PRs und Zugewiesen & erwähnt. Verweise stammen aus den Cross-Reference-Ereignissen der PRs und Issues, die Sie erstellt haben. GitHub aktualisiert `updatedAt` eines Eintrags nicht, wenn etwas auf ihn verweist; daher werden Einträge, an denen sich in den letzten 60 Tagen etwas getan hat, auf Verweise aus den letzten 30 Tagen geprüft, 50 Einträge pro Anfrage. Lehnt GitHub die Verweissuche ab (es gilt ein Ressourcenlimit pro Abfrage), bleiben die letzten Verweise erhalten, und die anderen Tabs werden trotzdem aktualisiert.

`refreshMinutes` ändert diese 10 Minuten.

## Einschränkungen

- Höchstens 100 PRs, die auf Ihr Review warten, in GitHubs Reihenfolge nach bester Übereinstimmung. Die anderen Tabs lesen bis zu 100 Ihrer offenen PRs, 100 zugewiesene und 100 Sie erwähnende Issues sowie Verweise aus bis zu 500 kürzlich geänderten Einträgen, jeweils mit der neuesten Aktivität zuerst. Gibt es mehr, wird die Anzahl als `100+` angezeigt. Jede Liste wird in Schritten von 25 gelesen (Verweise, deren Einträge klein sind, in Schritten von 100) und erscheint, sobald sie da ist; eine Seite, bei der GitHub in ein Timeout läuft, wird mit halber Größe erneut angefragt, sodass auch ein Konto mit vielen PRs im Zeitlimit von GitHub bleibt.
- Eine gespeicherte Suche zeigt ihre 20 zuletzt geänderten Treffer; ihre Anzahl ist GitHubs Gesamtzahl für die Suche.
- Der Tab Benachrichtigungen liest bis zu 100 Benachrichtigungen der letzten 30 Tage und fragt nicht öfter, als GitHubs Abfrageintervall erlaubt.
- Ein Verweis auf einen Eintrag, den Sie seit 60 Tagen nicht angefasst haben, wird nicht erfasst.
- `Neues Review` verschwindet bei jedem neuen Commit auf dem PR, auch bei einem, den GitHubs Schaltfläche „Update branch“ oder ein Bot erstellt hat.
- Nach einem Force-Push, der den von Ihnen reviewten Commit umgeschrieben hat, zeigt ein erneut angefragter PR keine Zeile „Seit meinem letzten Review“.
- Ihr Review-Stil wird aus den PRs gelernt, die GitHubs Suche für `reviewed-by:@me -author:@me` innerhalb von `scope` liefert; Kommentare zu PRs, die Sie selbst erstellt haben, zählen daher nicht. Kommentare in der Unterhaltung eines PRs außerhalb eines Reviews fließen nicht ein.
- `Fehlgeschlagene CI neu starten` startet nur GitHub Actions neu; Prüfungen anderer CI-Dienste starten Sie dort neu. Mehrere PRs auf einmal genehmigen und mit Kommentar genehmigen gibt es nicht.

## Fehlerbehebung

- **Das Panel zeigt einen `gh`-Fehler.** Führen Sie `gh auth status` aus. Sind mehrere Konten angemeldet, setzen Sie `githubUser`. Die Mod versucht es jede Minute erneut.
- **Die Leiste erscheint nicht.** Sie wird nur angezeigt, wenn etwas Ihr Zutun erfordert; Nullwerte werden ausgelassen.
- **Die Sprache ist nicht die erwartete.** Setzen Sie `language` in `/config` auf einen Sprachcode statt auf `auto`.
- **Etwas anderes.** Starten Sie Claude Code mit `claude --debug`; Zeilen dieser Mod beginnen mit `review-inbox:`.

## Entwicklung

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin validate` und `claude plugin test` benötigen keine Anmeldung, und die CI führt beide auf dem getesteten Build von Claude Code aus. `tsconfig.json` erweitert `.claude-plugin/types/tsconfig.json`, das Claude Code beim ersten Laden der Mod aus diesem Ordner schreibt (und `.gitignore` ausschließt); führen Sie daher `claude --plugin-dir .` einmal aus, bevor Sie mit `tsc -p .` die Typen prüfen.

## Unterstützung

Wenn Review Inbox Ihnen Zeit spart, können Sie mir [einen Kaffee spendieren](https://ko-fi.com/riversound) ☕ – das hilft, das Projekt weiterzuführen. Vielen Dank!

<a href="https://ko-fi.com/riversound"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" height="36"></a>

## Lizenz

[MIT](LICENSE)
