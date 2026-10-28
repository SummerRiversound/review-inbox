# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox) [![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | **Français**

Un mod pour [Claude Code](https://claude.com/claude-code) qui garde votre travail GitHub sous les yeux pendant que vous codez : les pull requests qui attendent votre revue, chacune résumée en langage clair avant même que vous l'ouvriez, vos propres PR ouvertes et les revues qu'elles reçoivent, et les issues qui vous sollicitent.

![Le bandeau au-dessus du prompt, puis les trois onglets de la boîte de réception : Revues à faire, Mes PR et Mes issues](docs/images/en/overview.gif)

## Démarrage rapide

Avec [GitHub CLI](https://cli.github.com/) connecté (`gh auth login`), dans le prompt d'une session Claude Code :

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
/review-inbox
```

La dernière ligne ouvre la boîte de réception. Les options et les mises à jour sont dans [Installation](#installation).

- **Bandeau au-dessus du prompt** — une seule ligne qui ne compte que ce qui vous attend : les PR en attente de votre revue, vos PR à traiter, et les issues qui vous sont assignées ou qui vous mentionnent. Sa couleur indique depuis combien de temps attend la plus ancienne demande de revue (jaune à partir de 3 jours, rouge à partir de 14). `Ouvrir` ouvre la boîte de réception. Quand un nombre baisse, il passe au vert un instant. Avec la revue automatique activée, `revues automatiques N` suit les nombres tant que des revues publiées pour vous attendent dans la boîte de réception.
- **Boîte de réception des revues** — `/review-inbox`, avec cinq onglets : Revues à faire, Mes PR et Assignations et mentions sont à traiter, Recherches enregistrées et Notifications sont à parcourir. Appuyez sur 1 à 5 quand la boîte de réception a le focus pour aller à l'onglet de ce rang, en partant de la gauche. Le nombre d'un onglet compte ses cartes ; Recherches enregistrées n'en a pas, et Notifications ne compte que les non lues.
- **Messages éphémères** — un court message quand quelque chose de nouveau arrive pendant que vous travaillez.

L'interface et les résumés existent en neuf langues ; voir [Langue](#langue).

## Prérequis

- Claude Code 2.1.287 ou ultérieur, les premières versions à prendre en charge les mods (plugins à hooks de fonction). Testé sur 2.1.292. Les mods sont en accès anticipé, et leur API peut changer d'une version à l'autre.
- [GitHub CLI](https://cli.github.com/) (`gh`) dans votre `PATH`, connecté (`gh auth login`) avec un accès aux dépôts dont vous faites la revue.
- GitHub Enterprise Server : définissez `GH_HOST` dans l'environnement où Claude Code démarre ; tous les appels `gh` vont alors vers cet hôte.

## Installation

Dans le prompt d'une session Claude Code :

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

L'écran d'installation demande les options ci-dessous ; toutes peuvent rester vides ou à leur valeur par défaut.

### Mise à jour et désinstallation

```sh
claude plugin marketplace update review-inbox
claude plugin update review-inbox@review-inbox
claude plugin uninstall review-inbox@review-inbox
```

Une mise à jour prend effet après un redémarrage. La désinstallation laisse en place le dossier de cache du mod, `~/.claude/plugins/data/review-inbox` ; supprimez-le vous-même pour effacer les listes et les résumés en cache. Consultez le [journal des modifications](CHANGELOG.md) pour savoir ce que chaque version a changé.

## Configuration

Les options se définissent sur l'écran d'installation et se modifient ensuite dans `/config`. Une modification s'applique immédiatement.

| Option | Par défaut | Rôle |
| --- | --- | --- |
| `scope` | vide | Qualificateurs de recherche GitHub ajoutés à chaque recherche (`review-requested:@me`, `author:@me`, `assignee:@me`, `mentions:@me`). Vide : tout GitHub. |
| `githubUser` | vide | Le compte `gh` à utiliser quand plusieurs sont connectés (`gh auth token -u <user>`). Vide : le compte actif est utilisé. |
| `language` | `auto` | `auto`, ou l'un des codes de la section [Langue](#langue). |
| `refreshMinutes` | `10` | Minutes entre deux récupérations depuis GitHub : 5, 10, 15, 30 ou 60. Toutes les sessions partagent une récupération. |
| `repoPaths` | vide | Où Claude travaille sur chaque dépôt, pour les boutons d'étape suivante. Voir ci-dessous. |
| `motion` | `auto` | `off` supprime le clignotement des nombres de la barre. `auto` le supprime aussi quand le réglage de réduction des animations de Claude Code (`prefersReducedMotion`) est activé. |
| `directActions` | `off` | `on` ajoute des boutons qui écrivent sur GitHub depuis une carte. Voir « Actions GitHub directes » plus bas. |
| `autoReview` | `off` | `on` fait relire en arrière-plan les PR qui vous demandent une revue et garde chaque revue comme votre revue en attente jusqu'à ce que vous la publiiez. **Elle consomme nettement plus de tokens.** Ce n'est que la valeur de départ : dès que vous appuyez sur le bouton `Revue automatique` en haut de l'onglet Revues à faire, qui demande confirmation avant de l'activer, seul ce bouton l'active et la désactive. Voir « Revue automatique » plus bas. |
| `autoReviewPost` | `pending` | Ce que devient une revue terminée : `pending` la garde comme revue en attente à publier depuis la carte, `comment` la publie en commentaire, `verdict` la publie avec le verdict suggéré, approbation et demande de modifications comprises. Toute valeur autre que `pending` publie à votre nom sans demander. |
| `autoReviewModel` | `sonnet` | Le modèle sur lequel tourne le relecteur : `sonnet` ou `opus`, qui relit plus en profondeur et coûte plus cher. |
| `autoReviewVerify` | `off` | Avec `on`, un second relecteur confronte chaque remarque du brouillon au code avant de l'enregistrer : il retire ce qui ne tient pas et abaisse ce qui est exagéré. Une relecture avec remarques coûte alors environ deux fois plus de tokens. |
| `autoReviewDaily` | `5` | Nombre maximal de revues automatiques lancées par jour : 3, 5, 10, 20 ou `unlimited`. `Réessayer` sur une carte n'est pas compté. |
| `autoReviewSettleMinutes` | `30` | Minutes après le dernier commit d'une PR avant que la revue automatique démarre, car les auteurs poussent souvent à nouveau juste après la demande : 0, 10, 30, 60 ou 120. `0` démarre tout de suite. |
| `autoReviewSkills` | vide | Skills chargés dans le relecteur, séparés par des virgules, comme votre playbook de revue. Vide : aucun n'est chargé. |
| `autoReviewInstructions` | vide | Vos propres consignes au relecteur, comme ce qu'il doit vérifier d'abord ou comment formuler les commentaires. Vide : rien n'est ajouté. |
| `autoReviewSeverityNames` | vide | Le nom des quatre gravités sur une revue, de blocker à nit, séparés par des virgules, par exemple `Bloquant, À décider, Amélioration, nit`. Vide prend les noms de la langue. |
| `autoReviewLarge` | `on` | `on` relit aussi les PR de plus de 50 fichiers ou de 2 000 lignes modifiées, qui consomment beaucoup plus de tokens. `off` les laisse de côté. |
| `autoReviewBacklog` | `on` | `on` relit aussi les demandes faites avant l'activation, quelques-unes par jour selon `autoReviewDaily`. `off` les laisse de côté. |

`scope` accepte tout ce qu'accepte la [recherche d'issues et de PR](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) de GitHub :

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Quand les qualificateurs `org:`, `repo:` et `user:` sont répétés, il suffit que l'un d'eux corresponde. Une demande de revue adressée à une équipe compte comme une demande qui vous est adressée, selon la définition de `review-requested:@me` de GitHub.

`repoPaths` prend des entrées `owner/repo=chemin` séparées par des virgules. `owner/*=chemin/*` couvre tous les dépôts d'un owner, le `*` du chemin valant le nom du dépôt ; un nom exact l'emporte sur un joker, et `~` est votre dossier personnel. Un dossier indiqué ici l'emporte sur le dossier de la session et sur ceux que le mod a retenus.

```text
my-org/*=~/code/*
my-org/legacy=~/old/legacy-app
```

## Onglets

Chaque onglet regroupe ses cartes par catégorie. Appuyez sur l'en-tête d'une catégorie pour la replier, et de nouveau pour la déplier. `N masquées · tout afficher`, en haut de l'onglet, ne réaffiche que les cartes masquées de cet onglet.

`Note`, sous `▸ Actions` d'une carte, écrit une ligne au-dessus de son titre : ce que vous avez vérifié, ou ce que vous avez prévu de faire et quand. `Enregistrer` laisse la carte visible. `Reporter à demain` et `Reporter à la semaine prochaine` la mettent de côté jusqu'à demain ou lundi prochain, 9 h, ou plus tôt s'il y a du nouveau : un nouveau commit sur une demande de revue, un nouvel état ou une nouvelle revue sur votre PR, une nouvelle activité sur une issue. Une notification signale le retour d'une carte reportée, avec sa note. `Effacer` supprime la note.

Le champ de recherche, en haut, cherche dans tous les onglets à la fois : dépôt, numéro, titre, auteur, les 2 000 premiers caractères de la description, le résumé et vos notes. Les cartes masquées ou reportées sont trouvées aussi, marquées `masquée`. Videz le champ pour revenir aux onglets. L'application mobile Claude n'affiche pas encore de champ de saisie : elle y montre les notes, sans recherche ni `Note`.

Les cartes sur lesquelles une session travaille se regroupent sous `En cours dans une session`, en haut de Revues à faire et Mes PR, avec le nom du dossier de la session ou `cette session`. Votre PR y figure quand le dossier d'une session a sa branche extraite dans son dépôt ; toute carte y figure dès qu'un prompt de cette session contient son lien, comme le fait `Revue par Claude`. Quand une session est fermée ou ne donne plus signe de vie pendant 10 minutes, ses cartes retournent dans leurs groupes.

Une session qui exécute encore une version antérieure du mod, comme une session ouverte avant la mise à jour et jamais rechargée, est nommée sous le titre du panneau, par exemple `2 sessions sur une version antérieure (dhub2) : lancez-y /reload-plugins`. Une telle session garde ses listes dans son propre fichier, et ne montre donc jamais ses listes ou ses erreurs dans une session à jour. `Tout recharger`, à côté, demande à ces sessions de lancer elles-mêmes `/reload-plugins`, via `reload.json` dans le dossier de cache : chacune le fait dès qu'elle est libre, et ses autres plugins sont rechargés avec elle. Seules les sessions en 0.13.0 ou plus récentes peuvent répondre ; dans une plus ancienne, il faut encore lancer la commande une fois.

Les cartes du dépôt de cette session passent en tête de chaque groupe, marquées `ce dépôt`. Quand les onglets contiennent aussi d'autres dépôts, `Ce dépôt N` et `Tout N`, au-dessus des onglets, les limitent à ce dépôt ou montrent de nouveau tout ; la barre compte toujours tout. Le dépôt de cette session est, comme pour `gh`, celui que nomme `GH_REPO`, sinon celui des remotes GitHub du dossier.

Sous son titre, une carte affiche jusqu'à deux labels et combien d'autres il y a, son nombre de commentaires et, pour une PR, `→ branche` quand elle vise une autre branche que celle par défaut du dépôt.

Un `●` devant le dépôt d'une carte marque celle qui a changé depuis votre dernière fermeture de la boîte, comme la boîte de réception de GitHub marque ce qui a changé depuis votre dernière visite. Avant la première fermeture, rien n'est marqué.

Quand rien n'attend votre action (aucune demande de revue, aucune de vos PR à traiter, aucune issue qui vous est assignée ou vous mentionne), la boîte de réception affiche `✓ Rien n'attend votre action` au-dessus des onglets, et la barre reste masquée.

### Revues à faire

Une carte par PR en attente de votre revue : un résumé en une phrase, la raison d'être de la PR, ce qu'elle touche, sa taille et son auteur, et depuis combien de temps votre revue est attendue. Les points à risque, comme un changement de schéma ou un ordre de déploiement imposé, sont signalés par ⚠️.

- `Revue par Claude` marque la carte comme `Ajouté` et laisse la boîte de réception ouverte : vous pouvez ainsi choisir plusieurs PR. Quand vous fermez la boîte de réception (Échap ou ×), une demande de revue est insérée dans votre prompt pour chaque PR ajoutée, avec ses avertissements et ce qui a changé depuis votre dernière revue. Rien n'est envoyé tant que vous n'appuyez pas sur Entrée. Une PR que le texte de votre prompt demande déjà apparaît comme `Ajouté` à l'ouverture de la boîte de réception.
- `Masquer`, sous `▸ Actions` à côté de `Note`, masque la carte jusqu'à ce que la PR reçoive un nouveau commit.
- `revue redemandée` signale une PR dont vous avez déjà fait la revue et qui vous sollicite à nouveau, avec un court résumé de ce qui a changé depuis votre dernière revue.
- Les cartes sont regroupées en demandes directes, demandes via l'équipe et brouillons.

![Faire la revue sur deux cartes les marque Ajouté, Masquer cache une troisième carte, et Échap place les deux demandes de revue dans le prompt](docs/images/en/review.gif)

La demande contient aussi une ligne qui décrit votre façon habituelle de faire une revue, pour que Claude la fasse comme vous. Une fois par semaine, le mod lit vos propres commentaires sur jusqu'à 30 PR dont vous avez récemment fait la revue, et demande à Claude de décrire votre langue et votre ton, ce que vous regardez en premier et la façon dont vous formulez vos demandes. S'il y a moins de cinq commentaires dont s'inspirer, la demande part sans cette ligne ; si l'apprentissage échoue, la dernière description est conservée et le mod réessaie un jour plus tard. Les revues automatiques publiées sous votre nom sont écartées, pour qu'il n'apprenne que de ce que vous avez écrit vous-même.

### Mes PR

Vos PR ouvertes, avec leur état au lieu d'un résumé, dans l'ordre où vous devez vous en occuper : modifications demandées, CI en échec, conflit de fusion, en attente de revue (la plus ancienne d'abord), approuvée, dans la file de fusion, brouillon. Une CI en cours s'affiche à côté de l'état. Une PR dans une file de fusion affiche `Dans la file de fusion` : GitHub la fusionne une fois les vérifications de la file passées, donc la barre ne la compte pas et elle n'affiche jamais `Prête à merger`.

`Masquer` cache une PR jusqu'à ce qu'elle change d'état ou que quelqu'un la relise ; votre propre push ne suffit pas à la faire réapparaître.

![Mes PR : six PR, de Modifications demandées à Brouillon, dont deux avec une nouvelle revue](docs/images/en/my-prs.png)

Une revue soumise après votre dernier commit apparaît comme `Nouvelle revue`, avec son auteur, jusqu'à votre prochain commit. Cela couvre les approbations, les demandes de modifications et les revues qui ne contiennent que des commentaires, réponses dans les fils de discussion comprises, qu'elles viennent de personnes ou de bots ; une revue rejetée (dismissed) ne compte pas. Une telle PR compte comme une action à faire et passe devant les PR sans nouveauté qui sont dans le même état. Aucun appel au modèle.

Une PR qui attend une action de votre part (modifications demandées, CI en échec ou conflit de merge) a un bouton pour l'étape suivante : `Traiter les commentaires`, `Réparer la CI` ou `Résoudre le conflit`. À côté figure le dossier où Claude travaillerait : `ce dossier` quand cette session se trouve dans un clone du dépôt, le dossier de la dernière session ouverte dans ce dépôt, ou `pas de clone local`. Le bouton ajoute la carte comme `Revue par Claude`. Quand vous fermez la boîte de réception, la demande indique l'étape et les commandes `gh` qui lisent les commentaires ou les logs en échec, et demande à Claude de travailler dans un nouveau worktree sans toucher à la branche de ce dossier. Si aucun dossier n'est connu, Claude vous demande où se trouve votre clone, ou propose `gh repo clone` et attend votre accord. Aucun appel GitHub ni appel au modèle en plus.

### Assignations et mentions

Les issues ouvertes qui vous sont assignées, ainsi que les issues et PR ouvertes qui vous mentionnent ; un élément qui relève des deux cas n'apparaît qu'une fois, sous « Assignée à moi ». En dessous, les autres issues et PR des 30 derniers jours qui ont fait référence à l'une des vôtres, avec l'auteur de la référence. Les références que vous avez faites vous-même sont exclues, et seules les 20 plus récentes sont affichées. Aucun appel au modèle.

Les éléments sont regroupés en assignés, mentions et références. `Masquer` cache un élément jusqu'à ce qu'il ait une nouvelle activité.

![Mes issues : issues assignées, mentions et références à votre travail faites ailleurs](docs/images/en/my-issues.png)

Une issue qui vous est assignée a un bouton `Travailler dessus` qui fonctionne de la même façon : Claude lit l'issue, planifie le changement et commence sur une nouvelle branche dans un nouveau worktree.

### Recherches enregistrées

Des recherches GitHub que vous nommez et enregistrez, chacune une section avec son nombre de résultats et les 20 plus récemment mis à jour. Un titre ouvre cette PR ou cette issue sur GitHub, et `N de plus sur GitHub` y ouvre la recherche complète. Trois sont fournies, comme dans la boîte de réception des PR de GitHub : `Me concernent` (PR ouvertes auxquelles vous participez sans les avoir ouvertes), `Revues par moi, encore ouvertes` et `Mes issues ouvertes`. Appuyez sur l'en-tête d'une section pour la replier. Les recherches s'exécutent à chaque actualisation, trois à la fois ; celle qui échoue affiche la raison sans toucher aux autres. Aucun appel au modèle.

Ajoutez les vôtres sous `groups`, dans le même `actions.json` que les boutons des cartes ; `/review-inbox add-search` demande à Claude d'en écrire un avec vous.

```json
{
  "groups": [
    { "id": "team", "name": "PR de l'équipe", "query": "org:acme is:open label:urgent", "scope": "prs", "countInBand": true },
    { "id": "reviewed-by-me", "hidden": true }
  ]
}
```

`query` suit la syntaxe de recherche de GitHub. `scope` vaut `prs` ou `issues` : il ajoute `is:pr` ou `is:issue` sauf si la requête le précise déjà, et `sort:updated-desc` est ajouté sauf si elle a son propre `sort:`. Le réglage `scope` et `Ce dépôt` ne restreignent pas ces recherches ; écrivez `org:` ou `repo:` dans la requête pour cela. `"countInBand": true` ajoute le nombre de la recherche à la barre sous la forme `Recherches enregistrées N`. Une recherche enregistrée avec un id fourni remplace celle-ci, et `"hidden": true` la retire. Une entrée avec un champ manquant ou un scope inconnu est écartée ; la boîte de réception le signale en bas, et `/review-inbox buttons` la liste avec la raison. Seules les 15 premières recherches enregistrées sont exécutées.

### Notifications

Vos notifications GitHub qu'aucun autre onglet ne montre déjà, dans une section par motif (`Commentaire`, `Changement d'état`, `Exécution CI`, etc.), les plus récentes d'abord dans chacune ; appuyez sur l'en-tête d'une section pour la replier. Ce sont les commentaires, changements d'état et nouvelle activité sur les fils que vous avez ouverts ou auxquels vous participez, les mentions d'équipe et les alertes de sécurité. Les exécutions GitHub Actions terminées que vous avez lancées y figurent aussi, en tant que `Exécution CI`, liées à la page Actions du dépôt ; GitHub ne les envoie que tant que les notifications Actions sont activées pour GitHub, sous Notifications → System → Actions dans vos paramètres GitHub. Les demandes de revue, attributions et mentions n'y figurent pas, pas plus que les fils dont la PR ou l'issue est déjà une carte. Un fil non lu est marqué `●`, et le nombre de l'onglet les compte. Jusqu'à 100 notifications des 30 derniers jours sont lues.

`Terminé` et `Se désabonner` retirent la ligne tout de suite et laissent `Terminé · Annuler` ou `Désabonné · Annuler` à sa place pendant 10 secondes ; fermer la boîte avant les envoie aussitôt. Ensuite `Terminé` marque le fil comme terminé sur GitHub, comme la boîte de réception de GitHub, et `Se désabonner` coupe en plus ses notifications jusqu'à ce que quelqu'un vous mentionne ou que vous commentiez. Un fil terminé revient quand il a une nouvelle activité. En cas d'échec, la ligne revient avec la raison. Aucun appel au modèle.

GitHub ne donne les notifications qu'à la connexion de gh et aux jetons classiques. Sans accès, l'onglet le dit et indique comment l'obtenir (`gh auth login` ou `gh auth refresh -s notifications`).

### Messages éphémères

Une nouvelle demande de revue, une nouvelle revue sur l'une de vos PR, l'une de vos PR qui passe à l'état modifications demandées, CI en échec ou conflit de fusion, et une nouvelle assignation, mention ou référence. Une nouvelle session ne les annonce pas une par une : une seule notification résume ce qui a changé depuis le dernier passage d'une session, par exemple `Pendant votre absence · CI en échec 2`, et rien ne s'affiche si rien n'a changé. Avec la revue automatique activée, une revue terminée, ou publiée pour vous, a aussi sa notification. Quand plusieurs notifications arrivent en même temps, elles s'affichent l'une après l'autre, à quatre secondes et demie d'intervalle.

Quand votre PR est approuvée sans CI en cours, `Prête à merger` s'affiche une fois.

![Trois notifications successives sous le prompt : une nouvelle demande de revue, des modifications demandées sur votre PR et une nouvelle mention](docs/images/en/toasts.gif)

### Boutons des cartes

`▸ Actions` sur une carte ouvre `Note` et `Masquer`, puis des boutons qui confient chacun la carte à Claude avec une demande toute prête : `Résumer les risques`, `Expliquer le diff` et `Rédiger un commentaire d'approbation` sur une demande de revue, `Rédiger une réponse au relecteur` et `Enquêter sur l'échec de la CI` sur votre PR. Un bouton ajoute la carte comme `Revue par Claude`, et la demande arrive dans votre prompt quand vous fermez la boîte de réception. Rien ne s'exécute et rien n'est publié avant que vous appuyiez sur Entrée.

Ajoutez les vôtres dans `actions.json`, dans le dossier de cache. `/review-inbox buttons` affiche son chemin, son contenu et les entrées écartées, et `/review-inbox add-button` demande à Claude d'en écrire un avec vous.

```json
{
  "buttons": [
    { "id": "test-plan", "name": "Plan de test", "scope": "review", "prompt": "Écris un plan de test pour {{.PrUrl}} dans {{.RepoPath}}." },
    { "id": "draft-approval", "scope": "review", "hidden": true }
  ]
}
```

`scope` vaut `review`, `pr` ou `issue`. Le prompt peut utiliser `RepoName`, `RepoPath`, `PrNumber`, `PrUrl`, `PrTitle`, `Author`, `HeadRefName`, `BaseRefName`, `IssueNumber`, `IssueTitle`, `IssueUrl`, écrites comme dans gh-dash : `{{.Name}}`, `{{Name}}`, `{{ .Name }}` ; une variable sans valeur pour la carte reste vide. Un bouton qui reprend l'id d'un bouton intégré le remplace, et `"hidden": true` le retire. Une entrée à laquelle il manque un champ, ou dont le scope ou une variable est inconnu, est laissée de côté ; la boîte de réception le signale en bas, et `/review-inbox buttons` la liste avec la raison. Les autres continuent de fonctionner. `PrTitle` et `Author` viennent de GitHub tels qu'ils sont écrits : un prompt qui les utilise transmet donc à Claude un texte écrit par quelqu'un d'autre.

### Actions GitHub directes

Avec `directActions` sur `on`, les cartes ont aussi des boutons qui écrivent eux-mêmes sur GitHub, avec votre compte `gh`.

- `Approuver` sur une demande de revue, `Prête pour la revue` sur votre PR en brouillon, et `Mettre à jour la branche` sur votre PR quand sa branche de base a avancé. Les autres voient ces actions et elles ne s'annulent pas : le premier appui change donc la ligne en une phrase qui dit ce qui sera envoyé et sous quel compte, par exemple `Approuver o/r#5 "Fix login" en tant que kim — (sans commentaire)`. `Confirmer l'approbation` l'envoie, comme `y` tant que la boîte a le clavier ; `Annuler`, ou dix secondes, ramène les boutons. Le focus passe sur `Annuler`, et une confirmation dans les 300 ms qui suivent le premier appui est ignorée : une touche Entrée maintenue n'envoie rien.
- Une approbation part sans commentaire et désigne le commit que vous avez lu. Si de nouveaux commits sont arrivés depuis, elle n'est pas envoyée et la carte le dit. `Mettre à jour la branche` fusionne la branche de base et ne fait jamais de rebase.
- `Relancer la CI en échec` sur votre PR aux vérifications en échec relance les jobs en échec des exécutions GitHub Actions de son dernier commit. `M'assigner` sur une issue qui vous mentionne part tout de suite, avec `Annuler` pendant dix secondes.
- Une écriture qui échoue reste sur la carte avec le message de GitHub, et son bouton revient.

Rien n'est mergé directement. Votre PR approuvée sans vérification en cours a un bouton `Merger`, même avec `directActions` sur `off` : il ajoute à votre prompt une demande de vérifier les méthodes de fusion du dépôt et de lancer `gh pr merge`, que vous envoyez avec Entrée et pour laquelle Claude Code demande l'autorisation.

### Revue automatique

Avec `autoReview` sur `on`, Claude lit en arrière-plan une PR qui vous demande directement une revue, et la revue vous attend sur la carte quand vous y arrivez. Tant que vous n'appuyez pas sur un bouton, l'auteur ne voit que votre réaction 👀 sur la PR pendant la revue. C'est le cas tant que `autoReviewPost` vaut `pending`, sa valeur par défaut.

> **Elle consomme nettement plus de tokens.** Chaque revue lance un sous-agent qui lit le diff et le code, avec votre CLAUDE.md, vos hooks et les skills de `autoReviewSkills` : des dizaines de milliers de tokens par PR, davantage avec `opus`. La carte indique ce que chaque revue a coûté, et `autoReviewDaily` plafonne le nombre de revues lancées par jour.

- **Ce qui en lance une.** Une demande adressée directement à vous (et non à une équipe), sur une PR qui n'est pas un brouillon et n'a pas été ouverte par un bot, une fois que `autoReviewSettleMinutes` (30 minutes par défaut) se sont écoulées depuis son dernier commit, comptées à partir de l'heure du commit. Une seule revue tourne à la fois, toutes sessions confondues. Ce 👀 indique à vos autres machines que la PR est prise, et elles la laissent ; celui qu'a laissé une machine arrêtée en pleine revue est repris au bout d'une heure. Les demandes faites avant l'activation et les PR de plus de 50 fichiers ou de 2 000 lignes modifiées sont relues aussi, sauf si `autoReviewBacklog` ou `autoReviewLarge` est à `off`. Le bouton `Revue automatique` en haut de l'onglet Revues à faire l'active et la désactive pour toutes les sessions ; une fois qu'il a été pressé, modifier `autoReview` dans `/config` ne change plus rien. Rien ne tourne tant que rien n'est dû : aucun modèle n'est sollicité et aucun agent n'est lancé.
- **Configuration.** La première fois que le bouton `Revue automatique` l'active, une demande de configuration arrive dans votre prompt : chaque réglage de la revue automatique sauf l'activation, qui reste au bouton, avec ce qu'il fait, les valeurs acceptées, sa valeur par défaut et sa valeur actuelle. Appuyez sur Entrée et Claude les parcourt avec vous un par un, puis écrit vos choix là où `/config` les garde ; ils s'appliquent à partir de la prochaine session. `/review-inbox auto-review-config` ajoute la même demande à tout moment.
- **Quelle session les lance.** La session où vous activez le bouton `Revue automatique` lance les revues sur cette machine, et l'avertissement avant l'activation le dit. Lancez `/review-inbox auto-review-here` dans une autre session pour les y déplacer, ou `/review-inbox auto-review-anywhere` pour que n'importe quelle session les lance. Tant que cette session est fermée, les PR en file attendent et leurs cartes l'indiquent.
- **Ce qu'elle lit.** Le relecteur reçoit des outils en lecture seule (`Read`, `Grep`, `Glob`) et aucun shell. Le mod écrit le diff de la PR, et pour une revue redemandée le diff depuis votre dernière revue, dans un dossier d'exécution ; quand il connaît le dossier du dépôt (celui qu'utilisent les boutons d'étape suivante), il y extrait aussi le commit de tête dans un worktree détaché, supprimé quand la revue est enregistrée.
- **Comment elle relit.** Le relecteur reçoit les règles propres au mod pour relire et écrire, quels que soient les skills et les instructions que vous définissez. Il relit le code de chaque constat avant de le garder, transforme en question à l'auteur ce qu'il ne peut pas confirmer, et classe les constats selon ce que coûterait la fusion : bloquant, majeur, mineur, détail. Il écrit pour quelqu'un qui lit ce code pour la première fois : le verdict d'abord, sans formule de politesse, et une phrase sur ce que la modification fait bien seulement quand quelque chose ressort ; chaque constat, un court paragraphe sur ce qui ne va pas et ce qu'il faut décider ou garantir, en laissant à l'auteur le fonctionnement interne du code et la manière de corriger ; aucun fichier ni numéro de ligne dans un commentaire déjà posé sur ce code ; et rien sur la façon dont il a vérifié. Il approuve quand rien ne bloque la fusion, constats mineurs et détails compris. `autoReviewInstructions` l'emporte sur ces règles, et votre style de revue appris ne fixe que le ton.
- **Ce qu'elle écrit.** Le résultat part sur GitHub comme votre **revue en attente**, que vous seul voyez : des commentaires sur les lignes concernées, et tout ce qui est hors du diff dans le corps de la revue, groupé par gravité. Les gravités sont nommées dans la langue du mod, ou comme `autoReviewSeverityNames` les définit. La carte affiche le verdict proposé, les constats par gravité, les trois principaux et le coût. Ces cartes restent avec leurs demandes, où vous publiez ou abandonnez la revue. Avec `autoReviewPost` à `comment` ou `verdict`, elle est publiée dès qu'elle est enregistrée et quitte l'onglet Revues à faire. Elle s'affiche alors avec son verdict dans `Revue automatique terminée`, juste sous le bouton `Revue automatique`, pour qu'une revue publiée pour vous ne passe pas inaperçue ; `Tout valider` sur cette ligne vide le groupe ; si GitHub refuse la publication, elle reste votre revue en attente sur la carte.
- **Publication.** `Publier en commentaire`, `Publier et approuver` et `Publier et demander des modifications`, celui qui est proposé en couleur, demandent confirmation sur la carte comme les Actions GitHub directes, puis soumettent la revue en attente. `Ouvrir sur GitHub` ouvre les fichiers de la PR, où vous pouvez d'abord la modifier. `Affiner en session` prend la place de `Revue par Claude` et demande à Claude de travailler cette revue avec vous, en ne la soumettant qu'une fois que vous avez dit quel verdict donner. `Supprimer` la supprime. Ces boutons s'affichent même sans `directActions`.
- **Nouveaux commits.** Une revue en cours s'arrête quand la PR reçoit un nouveau commit, est fermée ou mergée, ou ne vous sollicite plus. Un rebase qui ne change aucun contenu déplace votre revue en attente, avec vos modifications, vers le nouveau commit sans solliciter Claude. Les autres nouveaux commits la laissent où elle est : la carte indique que la publier reviendrait à relire du code disparu et propose `Refaire la revue`. Une publication est refusée si la PR a bougé depuis l'affichage de la carte.
- **Échecs.** Une réponse illisible, ou une revue dont le relecteur n'a pas pu lire le diff, est retentée une fois, puis la carte en donne la raison avec `Réessayer`. Une revue que vous avez arrêtée depuis la liste des tâches attend `Réessayer`. Celle dont la session s'est fermée repart en tête de la file.

## Langue

Le bandeau, la boîte de réception, les notifications, la demande de revue insérée dans votre prompt, ainsi que les résumés, la description de votre style de revue et les revues automatiques rédigés par le modèle utilisent tous une même langue.

| Code | Langue |
| --- | --- |
| `en` | Anglais (English) |
| `ko` | Coréen (한국어) |
| `ja` | Japonais (日本語) |
| `zh-CN` | Chinois simplifié (简体中文) |
| `zh-TW` | Chinois traditionnel (繁體中文) |
| `es` | Espagnol (Español) |
| `pt-BR` | Portugais du Brésil (Português do Brasil) |
| `de` | Allemand (Deutsch) |
| `fr` | Français |

- Un code sélectionne la langue correspondante.
- `auto` (la valeur par défaut) suit le réglage `language` de Claude Code lui-même quand celui-ci désigne l'une de ces langues, par son code, son nom anglais ou son nom natif (`ja-JP`, `Japanese`, `日本語`). Sinon, il suit la locale du système (`LC_ALL`, `LC_MESSAGES`, puis `LANG`), et à défaut, l'anglais. Le chinois est lu comme simplifié, sauf s'il est marqué Taïwan, Hong Kong, Macao ou traditionnel (`zh-TW`, `zh-Hant`, `繁體中文`), et le portugais comme celui du Brésil.

Les résumés et la description de votre style de revue sont mis en cache par langue : changer de langue fait donc rédiger chaque résumé, et cette description, une fois de plus dans la nouvelle langue. Pour toute autre langue, l'anglais est utilisé.

Les langues autres que l'anglais et le coréen ont été traduites avec Claude et n'ont pas encore été relues par des locuteurs natifs. Ce README a été traduit de la même manière. Les corrections sont les bienvenues sous forme d'issue ou de pull request : chaque langue tient dans un fichier de [`hooks/locales/`](hooks/locales/), et la table anglaise, sur laquelle toutes les autres s'alignent, se trouve dans [`hooks/i18n.ts`](hooks/i18n.ts).

## Ce que le mod lit et exécute

Le mod n'accède à GitHub que par votre propre `gh`, envoie le texte des PR à Claude pour rédiger les résumés et, une fois par semaine, vos propres commentaires de revue pour décrire votre style, et n'écrit que dans son propre dossier de cache. Voici tout ce qu'il touche, et pourquoi ; cette liste correspond à ce que `claude plugin validate .` indique pour le mod. Avec `autoReview` sur `on`, il demande aussi à Claude de relire des PR, enregistre chaque revue sur GitHub comme votre revue en attente ou la publie selon `autoReviewPost`, et ajoute un worktree au dossier du dépôt pendant qu'une revue tourne.

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **Exécute `gh`** : `gh api graphql` pour les listes et, une fois par semaine, pour vos commentaires de revue récents ; `gh api repos/<owner>/<repo>/compare/<from>...<to>` pour une PR dont la revue est redemandée, et `gh auth token -u <githubUser>` quand `githubUser` est défini. Pour l'onglet Notifications, il lance `gh api notifications` et, quand vous appuyez sur `Terminé` ou `Se désabonner`, `gh api -X DELETE notifications/threads/<id>` (précédé de `/subscription` pour un désabonnement). Avec `directActions` sur `on`, un bouton pressé lance `gh api user` pour le nom du compte et `gh api repos/<owner>/<repo>/pulls/<n>` pour lire le dernier commit, puis l'un de `gh api -X POST …/pulls/<n>/reviews` (`event=APPROVE`, `commit_id`), `gh pr ready`, `gh api -X PUT …/pulls/<n>/update-branch`, `gh api …/actions/runs?head_sha=<sha>&status=failure` avec `gh api -X POST …/actions/runs/<id>/rerun-failed-jobs`, ou `gh api -X POST`/`-X DELETE …/issues/<n>/assignees`. Avec `autoReview` sur `on`, il lance `gh api …/pulls/<n>/reviews` et `…/pulls/<n>/files` avant et après chaque revue, `gh pr diff`, et `gh api -X POST …/pulls/<n>/reviews` avec la revue sur son entrée standard pour l'enregistrer comme votre revue en attente ; la reprendre sur un nouveau commit lit `…/reviews/<id>` et `…/reviews/<id>/comments` et lance `gh api -X DELETE …/reviews/<id>` avant de la recréer. Autour de chaque revue, il pose puis retire ce 👀 avec `gh api -i -X POST …/issues/<n>/reactions` (`content=eyes`) et `gh api -X DELETE …/issues/<n>/reactions/<id>`. Les boutons de la carte lancent `gh api -X POST …/reviews/<id>/events` (`event=COMMENT`, `APPROVE` ou `REQUEST_CHANGES`) ou `gh api -X DELETE …/reviews/<id>`, après lecture du commit de tête. Avec `autoReviewPost` à `comment` ou `verdict`, il exécute ensuite `gh api -X POST …/reviews/<id>/events` (`event=COMMENT`, `APPROVE` ou `REQUEST_CHANGES`) sur la revue enregistrée. Le mod ne fait aucun autre appel réseau de lui-même.
- **Exécute `git`** dans le dossier de la session toutes les 30 secondes : `git branch --show-current` et `git remote -v`, pour trouver une session sur la branche de votre PR, et `git rev-parse --path-format=absolute --git-common-dir`, pour retenir le dossier principal de ce dépôt. Avec `autoReview` sur `on` et le dossier du dépôt connu, il lance `git fetch origin pull/<n>/head` et `git worktree add --detach` dans ce dossier pour chaque revue, et `git worktree remove --force` quand la revue se termine.
- **Interroge Claude** (le modèle `sonnet`) pour chaque résumé, en envoyant le nom du dépôt de la PR, son titre, sa description (les 12 000 premiers caractères), les chemins des fichiers modifiés (jusqu'à 80) et sa taille ; pour une PR dont la revue est redemandée, également la première ligne de chaque message de commit et jusqu'à 60 chemins de fichiers depuis votre dernière revue. Cette consommation est décomptée de votre utilisation de Claude Code. Chaque PR est résumée une fois par commit de tête et par langue ; un résumé qui échoue est tenté au plus trois fois par commit. Une fois par semaine, le mod envoie aussi vos propres commentaires de revue sur jusqu'à 30 PR dont vous avez récemment fait la revue, chacun tronqué à 500 caractères, 60 commentaires et 12 000 caractères au total au maximum, pour décrire votre style de revue ; s'il y en a moins de cinq, rien n'est envoyé.
- **Lance un sous-agent** seulement avec `autoReview` sur `on` : un `auto-reviewer` à la fois, sur `autoReviewModel` (et, avec `autoReviewVerify` sur `on`, un second qui vérifie ses remarques), avec des outils en lecture seule, votre CLAUDE.md, vos hooks et `autoReviewSkills`. Il est décompté de votre utilisation de Claude Code. Son type d'agent est exclu de la liste dans laquelle votre propre Claude choisit. Pour l'arrêter, le mod utilise `TaskStop`.
- **Écrit des fichiers** uniquement dans son dossier de cache, `~/.claude/plugins/data/review-inbox` (`CLAUDE_CONFIG_DIR` remplace `~/.claude` s'il est défini). `inbox-<hash>-f<n>.json` contient les listes et les résumés ; `hidden-<hash>.json`, les PR masquées ; `notes-<hash>.json`, vos notes et reports, un fichier par compte et périmètre quelle que soit la langue ; `sessions.json`, le dossier, la version du mod, la branche, les dépôts distants GitHub et les liens de PR des prompts de chaque session active, un seul pour tous les comptes ; `repos.json`, le dossier principal de chaque dépôt GitHub où une session a été ouverte, pour les boutons d'étape suivante ; `style-<hash>.json`, la description de votre style de revue. Chaque fichier est d'abord écrit à côté, puis mis en place avec `mv`, pour qu'aucune session ne lise un fichier à moitié écrit ; là où `mv` n'existe pas, comme sous Windows, il est écrit directement. Il y lit `actions.json` si vous en avez créé un, et ne l'écrit jamais. `autoreview-<hash>.json` contient la place de chaque PR dans la revue automatique et son dernier résultat, et `runs/` les dossiers d'exécution, supprimés avec `rm -rf` quand une revue se termine.
- **Lit des variables d'environnement** : `CLAUDE_CONFIG_DIR`, `HOME` et `USERPROFILE` pour trouver ce dossier ; `GH_REPO` pour connaître, comme `gh`, le dépôt de cette session ; `LC_ALL`, `LC_MESSAGES` et `LANG` seulement quand `language` vaut `auto`. Il n'en définit aucune.
- **Lit les réglages de Claude Code** : la clé `language` seulement quand `language` vaut `auto`, et la clé `prefersReducedMotion` seulement quand `motion` vaut `auto`.
- **Lit et remplit votre prompt** uniquement autour de la boîte de réception : il lit le texte en cours à l'ouverture de la boîte de réception, pour marquer les PR que ce texte demande déjà, et à sa fermeture il ajoute les demandes pour les PR que vous avez ajoutées, sur de nouvelles lignes après ce texte.

## Fonctionnement

Toutes vos sessions ouvertes partagent une même récupération : une seule session interroge GitHub, au plus une fois toutes les 10 minutes, et les autres lisent ce qu'elle a enregistré.

Chaque session Claude Code ouverte exécute le mod, mais toutes partagent un fichier de cache par compte, par scope et par langue, tout comme les PR masquées. Chaque session le lit toutes les 30 secondes. Seule la session qui le trouve vieux de plus de 10 minutes et qui remporte une courte réservation appelle GitHub : dix sessions ouvertes ne font donc qu'une seule requête. La session qui récupère les données renouvelle sa réservation pendant qu'elle travaille ; une réservation non renouvelée pendant 3 minutes est reprise par une autre session. Une récupération qui échoue conserve les dernières listes valides et est retentée au bout d'une minute. `↻` dans la boîte de réception lance une récupération immédiate.

Une seule recherche GraphQL renvoie toutes les PR en attente de votre revue avec ce dont les cartes ont besoin, et une requête supplémentaire contenant trois recherches remplit Mes PR et Assignations et mentions. Les références proviennent des événements de référence croisée sur les PR et les issues dont vous êtes l'auteur. GitHub ne met pas à jour le `updatedAt` d'un élément quand quelque chose y fait référence : les éléments ayant eu une activité au cours des 60 derniers jours sont donc examinés pour y trouver les références faites au cours des 30 derniers jours, à raison de 50 éléments par requête. Si GitHub refuse la recherche de références (il impose une limite de ressources par requête), les dernières références sont conservées et les autres onglets continuent de se mettre à jour.

`refreshMinutes` change ces 10 minutes.

## Limites

- Au plus 100 PR en attente de votre revue, dans l'ordre de pertinence (best match) de GitHub. Les autres onglets lisent jusqu'à 100 de vos PR ouvertes, 100 issues assignées et 100 issues qui vous mentionnent, ainsi que les références provenant de 500 éléments récemment actifs au maximum, chaque fois en commençant par l'activité la plus récente. Quand une liste en contient davantage, son nombre s'affiche `100+`. Chaque liste est lue par 25 (les références, plus légères, par 100) et s'affiche dès qu'elle arrive, et une page sur laquelle GitHub dépasse son délai est redemandée avec une taille moitié moindre ; un compte avec beaucoup de PR reste ainsi dans la limite de temps de GitHub.
- Une recherche enregistrée montre ses 20 résultats les plus récemment mis à jour ; son nombre est le total que GitHub donne pour la recherche.
- L'onglet Notifications lit jusqu'à 100 notifications des 30 derniers jours et n'interroge pas plus souvent que l'intervalle fixé par GitHub.
- Une référence à un élément auquel vous n'avez pas touché depuis 60 jours passe inaperçue.
- `Nouvelle revue` disparaît à chaque nouveau commit sur la PR, y compris un commit créé par le bouton « Update branch » de GitHub ou par un bot.
- Après un force-push qui a réécrit le commit dont vous aviez fait la revue, une PR dont la revue est redemandée n'affiche pas de ligne « Depuis ma dernière revue ».
- Votre style de revue est appris à partir des PR que la recherche GitHub renvoie pour `reviewed-by:@me -author:@me`, dans les limites de `scope` : les commentaires sur les PR que vous avez ouvertes vous-même n'en font donc pas partie. Les commentaires laissés dans la conversation d'une PR, en dehors d'une revue, n'en font pas partie.
- `Relancer la CI en échec` ne relance que GitHub Actions ; les vérifications d'autres services de CI se relancent sur leur propre site. Approuver plusieurs PR d'un coup et approuver avec un commentaire ne sont pas proposés.
- La revue automatique relit la PR telle qu'elle est sur GitHub ; elle n'exécute ni tests ni builds. Une revue reprise ne suit que si le patch de chaque fichier est identique : un rebase sur une base qui a modifié les mêmes fichiers est donc relu.
- Une revue retenue par `autoReviewDaily` retient aussi la reprise vers un nouveau commit. `rm -rf` n'existe que sous POSIX : sous Windows sans WSL, un dossier d'exécution reste dans le dossier de cache.

## Dépannage

- **La boîte de réception affiche une erreur `gh`.** Lancez `gh auth status`. Si plusieurs comptes sont connectés, définissez `githubUser`. Le mod réessaie toutes les minutes.
- **Le bandeau n'apparaît pas.** Il ne s'affiche que lorsque quelque chose vous attend ; les compteurs à zéro sont omis.
- **La langue n'est pas celle que vous attendiez.** Dans `/config`, donnez à `language` un code de langue au lieu de `auto`.
- **Autre problème.** Lancez Claude Code avec `claude --debug` ; les lignes de ce mod commencent par `review-inbox:`.

## Développement

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin validate` et `claude plugin test` ne nécessitent aucune connexion, et la CI exécute les deux sur la version testée de Claude Code. `tsconfig.json` étend `.claude-plugin/types/tsconfig.json`, que Claude Code écrit (et que `.gitignore` exclut) la première fois qu'il charge le mod depuis ce dossier : lancez donc `claude --plugin-dir .` une fois avant de vérifier les types avec `tsc -p .`.

## Soutien

Si Review Inbox vous fait gagner du temps, vous pouvez [m'offrir un café](https://ko-fi.com/riversound) ☕ : cela aide le projet à avancer. Merci !

<a href="https://ko-fi.com/riversound"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" height="36"></a>

## Licence

[MIT](LICENSE)
