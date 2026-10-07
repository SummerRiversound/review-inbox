# Review Inbox

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | **Français**

Un mod pour [Claude Code](https://claude.com/claude-code) qui garde votre travail GitHub sous les yeux pendant que vous codez : les pull requests qui attendent votre revue, chacune résumée en langage clair avant même que vous l'ouvriez, vos propres PR ouvertes et les revues qu'elles reçoivent, et les issues qui vous sollicitent.

- **Bandeau au-dessus du prompt** — une seule ligne qui ne compte que ce qui vous attend : les PR en attente de votre revue, vos PR à traiter, et les issues qui vous sont assignées ou qui vous mentionnent. Sa couleur indique depuis combien de temps attend la plus ancienne demande de revue (jaune à partir de 3 jours, rouge à partir de 14). `Ouvrir` ouvre la boîte de réception.
- **Boîte de réception des revues** — `/review-inbox`, avec trois onglets : Revues à faire, Mes PR et Mes issues.
- **Notifications** — un court message quand quelque chose de nouveau arrive pendant que vous travaillez.

![Le bandeau au-dessus du prompt, puis les trois onglets de la boîte de réception : Revues à faire, Mes PR et Mes issues](docs/images/en/overview.gif)

L'interface et les résumés existent en neuf langues ; voir [Langue](#langue).

## Onglets

### Revues à faire

Une carte par PR en attente de votre revue : un résumé en une phrase, la raison d'être de la PR, ce qu'elle touche, sa taille et son auteur, et depuis combien de temps votre revue est attendue. Les points à risque, comme un changement de schéma ou un ordre de déploiement imposé, sont signalés par ⚠️.

- `Faire la revue` marque la carte comme `Ajouté` et laisse la boîte de réception ouverte : vous pouvez ainsi choisir plusieurs PR. Quand vous fermez la boîte de réception (Échap ou ×), une demande de revue est insérée dans votre prompt pour chaque PR ajoutée, avec ses avertissements et ce qui a changé depuis votre dernière revue. Rien n'est envoyé tant que vous n'appuyez pas sur Entrée. Une PR que le texte de votre prompt demande déjà apparaît comme `Ajouté` à l'ouverture de la boîte de réception.
- `Masquer` masque la carte jusqu'à ce que la PR reçoive un nouveau commit.
- `revue redemandée` signale une PR dont vous avez déjà fait la revue et qui vous sollicite à nouveau, avec un court résumé de ce qui a changé depuis votre dernière revue.
- Les demandes directes passent avant les demandes via l'équipe. Les brouillons sont listés à part.

![Faire la revue sur deux cartes les marque Ajouté, Masquer cache une troisième carte, et Échap place les deux demandes de revue dans le prompt](docs/images/en/review.gif)

La demande contient aussi une ligne qui décrit votre façon habituelle de faire une revue, pour que Claude la fasse comme vous. Une fois par semaine, le mod lit vos propres commentaires sur jusqu'à 30 PR dont vous avez récemment fait la revue, et demande à Claude de décrire votre langue et votre ton, ce que vous regardez en premier et la façon dont vous formulez vos demandes. S'il y a moins de cinq commentaires dont s'inspirer, la demande part sans cette ligne ; si l'apprentissage échoue, la dernière description est conservée et le mod réessaie un jour plus tard.

### Mes PR

Vos PR ouvertes, avec leur état au lieu d'un résumé, dans l'ordre où vous devez vous en occuper : modifications demandées, CI en échec, conflit de fusion, en attente de revue (la plus ancienne d'abord), approuvée, brouillon. Une CI en cours s'affiche à côté de l'état.

![Mes PR : six PR, de Modifications demandées à Brouillon, dont deux avec une nouvelle revue](docs/images/en/my-prs.png)

Une revue soumise après votre dernier commit apparaît comme `Nouvelle revue`, avec son auteur, jusqu'à votre prochain commit. Cela couvre les approbations, les demandes de modifications et les revues qui ne contiennent que des commentaires, réponses dans les fils de discussion comprises, qu'elles viennent de personnes ou de bots ; une revue rejetée (dismissed) ne compte pas. Une telle PR compte comme une action à faire et passe devant les PR sans nouveauté qui sont dans le même état. Aucun appel au modèle.

### Mes issues

Les issues ouvertes qui vous sont assignées, ainsi que les issues et PR ouvertes qui vous mentionnent ; un élément qui relève des deux cas n'apparaît qu'une fois, sous « Assignée à moi ». En dessous, les autres issues et PR des 30 derniers jours qui ont fait référence à l'une des vôtres, avec l'auteur de la référence. Les références que vous avez faites vous-même sont exclues, et seules les 20 plus récentes sont affichées. Aucun appel au modèle.

![Mes issues : issues assignées, mentions et références à votre travail faites ailleurs](docs/images/en/my-issues.png)

### Notifications

Une nouvelle demande de revue, une nouvelle revue sur l'une de vos PR, l'une de vos PR qui passe à l'état modifications demandées, CI en échec ou conflit de fusion, et une nouvelle assignation, mention ou référence. La première consultation d'une session n'annonce rien. Quand plusieurs notifications arrivent en même temps, elles s'affichent l'une après l'autre, à quatre secondes et demie d'intervalle.

![Trois notifications successives sous le prompt : une nouvelle demande de revue, des modifications demandées sur votre PR et une nouvelle mention](docs/images/en/toasts.gif)

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

`scope` accepte tout ce qu'accepte la [recherche d'issues et de PR](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) de GitHub :

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Quand les qualificateurs `org:`, `repo:` et `user:` sont répétés, il suffit que l'un d'eux corresponde. Une demande de revue adressée à une équipe compte comme une demande qui vous est adressée, selon la définition de `review-requested:@me` de GitHub.

## Langue

Le bandeau, la boîte de réception, les notifications, la demande de revue insérée dans votre prompt, ainsi que les résumés et la description de votre style de revue rédigés par le modèle utilisent tous une même langue.

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

Le mod n'accède à GitHub que par votre propre `gh`, envoie le texte des PR à Claude pour rédiger les résumés et, une fois par semaine, vos propres commentaires de revue pour décrire votre style, et n'écrit que dans son propre dossier de cache. Voici tout ce qu'il touche, et pourquoi ; cette liste correspond à ce que `claude plugin validate .` indique pour le mod.

- **Exécute `gh`** : `gh api graphql` pour les listes et, une fois par semaine, pour vos commentaires de revue récents ; `gh api repos/<owner>/<repo>/compare/<from>...<to>` pour une PR dont la revue est redemandée, et `gh auth token -u <githubUser>` quand `githubUser` est défini. Le mod ne fait aucun autre appel réseau de lui-même.
- **Interroge Claude** (le modèle `sonnet`) pour chaque résumé, en envoyant le nom du dépôt de la PR, son titre, sa description (les 12 000 premiers caractères), les chemins des fichiers modifiés (jusqu'à 80) et sa taille ; pour une PR dont la revue est redemandée, également la première ligne de chaque message de commit et jusqu'à 60 chemins de fichiers depuis votre dernière revue. Cette consommation est décomptée de votre utilisation de Claude Code. Chaque PR est résumée une fois par commit de tête et par langue ; un résumé qui échoue est tenté au plus trois fois par commit. Une fois par semaine, le mod envoie aussi vos propres commentaires de revue sur jusqu'à 30 PR dont vous avez récemment fait la revue, chacun tronqué à 500 caractères, 60 commentaires et 12 000 caractères au total au maximum, pour décrire votre style de revue ; s'il y en a moins de cinq, rien n'est envoyé.
- **Écrit des fichiers** uniquement dans son dossier de cache, `~/.claude/plugins/data/review-inbox` (`CLAUDE_CONFIG_DIR` remplace `~/.claude` s'il est défini). `inbox-<hash>.json` contient les listes et les résumés ; `hidden-<hash>.json`, les PR masquées ; `style-<hash>.json`, la description de votre style de revue.
- **Lit des variables d'environnement** : `CLAUDE_CONFIG_DIR`, `HOME` et `USERPROFILE` pour trouver ce dossier ; `LC_ALL`, `LC_MESSAGES` et `LANG` seulement quand `language` vaut `auto`. Il n'en définit aucune.
- **Lit les réglages de Claude Code** seulement quand `language` vaut `auto`, et n'utilise que la clé `language`.
- **Lit et remplit votre prompt** uniquement autour de la boîte de réception : il lit le texte en cours à l'ouverture de la boîte de réception, pour marquer les PR que ce texte demande déjà, et à sa fermeture il ajoute les demandes pour les PR que vous avez ajoutées, sur de nouvelles lignes après ce texte.

## Fonctionnement

Toutes vos sessions ouvertes partagent une même récupération : une seule session interroge GitHub, au plus une fois toutes les 10 minutes, et les autres lisent ce qu'elle a enregistré.

Chaque session Claude Code ouverte exécute le mod, mais toutes partagent un fichier de cache par compte, par scope et par langue, tout comme les PR masquées. Chaque session le lit toutes les 30 secondes. Seule la session qui le trouve vieux de plus de 10 minutes et qui remporte une courte réservation appelle GitHub : dix sessions ouvertes ne font donc qu'une seule requête. La session qui récupère les données renouvelle sa réservation pendant qu'elle travaille ; une réservation non renouvelée pendant 3 minutes est reprise par une autre session. Une récupération qui échoue conserve les dernières listes valides et est retentée au bout d'une minute. `↻` dans la boîte de réception lance une récupération immédiate.

Une seule recherche GraphQL renvoie toutes les PR en attente de votre revue avec ce dont les cartes ont besoin, et une requête supplémentaire contenant trois recherches remplit Mes PR et Mes issues. Les références proviennent des événements de référence croisée sur les PR et les issues dont vous êtes l'auteur. GitHub ne met pas à jour le `updatedAt` d'un élément quand quelque chose y fait référence : les éléments ayant eu une activité au cours des 60 derniers jours sont donc examinés pour y trouver les références faites au cours des 30 derniers jours, à raison de 50 éléments par requête. Si GitHub refuse la recherche de références (il impose une limite de ressources par requête), les dernières références sont conservées et les autres onglets continuent de se mettre à jour.

## Limites

- Au plus 100 PR en attente de votre revue, dans l'ordre de pertinence (best match) de GitHub. Les autres onglets lisent jusqu'à 100 de vos PR ouvertes, 50 issues assignées et 50 issues qui vous mentionnent, ainsi que les références provenant de 500 éléments récemment actifs au maximum, chaque fois en commençant par l'activité la plus récente.
- Une référence à un élément auquel vous n'avez pas touché depuis 60 jours passe inaperçue.
- `Nouvelle revue` disparaît à chaque nouveau commit sur la PR, y compris un commit créé par le bouton « Update branch » de GitHub ou par un bot.
- Après un force-push qui a réécrit le commit dont vous aviez fait la revue, une PR dont la revue est redemandée n'affiche pas de ligne « Depuis ma dernière revue ».
- Votre style de revue est appris à partir des PR que la recherche GitHub renvoie pour `reviewed-by:@me -author:@me`, dans les limites de `scope` : les commentaires sur les PR que vous avez ouvertes vous-même n'en font donc pas partie. Les commentaires laissés dans la conversation d'une PR, en dehors d'une revue, n'en font pas partie.

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
