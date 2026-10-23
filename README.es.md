# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox) [![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | **Español** | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

Un mod de [Claude Code](https://claude.com/claude-code) que mantiene a la vista tu trabajo en GitHub mientras programas: los pull requests que esperan tu revisión, cada uno resumido en lenguaje sencillo antes de que lo abras; tus propios PR abiertos y las revisiones que reciben, y las incidencias en las que te involucran.

- **Franja sobre el prompt** — una línea que cuenta solo lo que requiere tu atención: PR que esperan tu revisión, tus PR por atender e incidencias asignadas a ti o que te mencionan. Su color indica cuánto lleva esperando la solicitud de revisión más antigua (amarillo a partir de 3 días, rojo a partir de 14). `Abrir` abre la bandeja. Cuando un número baja, se pone verde un instante.
- **Bandeja** — `/review-inbox`, con cinco pestañas: Por revisar, Mis PR, Mis incidencias, Búsquedas y Actividad.
- **Avisos** — una notificación breve cuando llega algo nuevo mientras trabajas.

![La franja sobre el prompt y, después, las tres pestañas de la bandeja: Por revisar, Mis PR y Mis incidencias](docs/images/en/overview.gif)

La interfaz y los resúmenes están disponibles en nueve idiomas; consulta [Idioma](#idioma).

## Pestañas

Cada pestaña agrupa sus tarjetas por categoría. Pulsa el encabezado de una categoría para plegarla y otra vez para abrirla. `N ocultos · mostrar todo`, arriba de la pestaña, vuelve a mostrar solo las tarjetas ocultas de esa pestaña.

`Nota`, en `▸ Más` de una tarjeta, escribe una línea encima del título: qué revisaste o qué acordaste hacer y cuándo. `Guardar` deja la tarjeta a la vista. `Posponer hasta mañana` y `Posponer hasta la próxima semana` la apartan hasta mañana o el próximo lunes a las 9, o antes si hay novedades: un commit nuevo en una solicitud de revisión, un cambio de estado o una revisión nueva en tu PR, actividad nueva en una incidencia. Un aviso te dice cuándo vuelve una tarjeta pospuesta, con su nota. `Borrar` quita la nota.

El campo de búsqueda de arriba busca en todas las pestañas a la vez: repositorio, número, título, autor, los primeros 2.000 caracteres de la descripción, el resumen y tus notas. También encuentra las tarjetas ocultas y pospuestas, marcadas como `oculto`. Vacía el campo para volver a las pestañas. La app móvil de Claude todavía no dibuja campos de texto, así que allí muestra las notas pero no tiene búsqueda ni `Nota`.

Las tarjetas en las que trabaja una sesión se agrupan en `En curso en una sesión`, arriba de Por revisar y Mis PR, con el nombre de la carpeta de la sesión o `esta sesión`. Tu PR entra ahí cuando la carpeta de una sesión tiene su rama activa en su repositorio; cualquier tarjeta entra en cuanto un prompt de esa sesión enlaza a ella, como hace `Revisar`. Cuando una sesión se cierra o lleva 10 minutos sin dar señales, sus tarjetas vuelven a sus grupos.

Las tarjetas del repositorio de esta sesión van primero en cada grupo, marcadas con `este repositorio`. Si las pestañas también tienen otros repositorios, `Este repositorio N` y `Todos N`, encima de las pestañas, las limitan a este repositorio o vuelven a mostrarlo todo; la barra siempre cuenta todo. El repositorio de esta sesión es, como para `gh`, el que indica `GH_REPO`, o si no, el de los remotos de GitHub de la carpeta.

Bajo el título, una tarjeta muestra hasta dos etiquetas y cuántas más hay, su número de comentarios y, en un PR, `→ rama` cuando apunta a una rama que no es la predeterminada del repositorio.

Un `●` delante del repositorio de una tarjeta marca una que cambió desde la última vez que cerraste la bandeja, como la bandeja de entrada de GitHub marca lo que cambió desde tu última visita. Antes del primer cierre no se marca nada.

Cuando nada te necesita (ninguna solicitud de revisión, ningún PR tuyo con algo que hacer, ninguna incidencia asignada a ti o que te mencione), la bandeja muestra `✓ Nada te necesita ahora` encima de las pestañas, y la barra sigue oculta.

### Por revisar

Una tarjeta por cada PR que espera tu revisión: un resumen de una frase, el motivo del PR, su alcance, su tamaño y autor, y cuánto tiempo lleva pendiente tu revisión. Los puntos de riesgo, como un cambio de esquema o un orden de despliegue obligatorio, se marcan con ⚠️.

- `Revisar` marca la tarjeta como `Añadido` y deja la bandeja abierta, para que puedas elegir varios PR. Al cerrar la bandeja (Esc o ×), se añade a tu prompt una solicitud de revisión por cada PR añadido, con sus advertencias y lo que cambió desde tu última revisión. No se envía nada hasta que pulses Enter. Si el texto que tienes en el prompt ya pide un PR, ese PR aparece como `Añadido` al abrir la bandeja.
- `Ocultar`, en `▸ Más` junto a `Nota`, oculta la tarjeta hasta que el PR reciba un commit nuevo.
- `revisión solicitada de nuevo` marca un PR que ya revisaste y que vuelve a pedir tu revisión, con un breve resumen de lo que cambió desde tu última revisión.
- Las tarjetas se agrupan en solicitudes directas, solicitudes al equipo y borradores.

![Revisar en dos tarjetas las marca como Añadido, Ocultar oculta una tercera y Esc pone ambas solicitudes de revisión en el prompt](docs/images/en/review.gif)

La solicitud también incluye una línea que describe cómo sueles revisar, para que Claude revise como lo harías tú. Una vez por semana, el mod lee tus propios comentarios en hasta 30 PR que revisaste recientemente y le pide a Claude que describa tu idioma y tu tono, en qué te fijas primero y cómo formulas tus peticiones. Si hay menos de cinco comentarios de los que aprender, la solicitud va sin esa línea; si el aprendizaje falla, se conserva la última descripción y el mod vuelve a intentarlo un día después.

### Mis PR

Tus PR abiertos, con su estado en lugar de un resumen, en el orden en que tienes que atenderlos: cambios solicitados, CI con errores, conflicto de fusión, pendiente de revisión (los más antiguos primero), aprobado, en la cola de fusión y borrador. Si hay CI en ejecución, se indica junto al estado. Un PR en una cola de fusión muestra `En la cola de fusión`: GitHub lo fusiona cuando pasan las comprobaciones de la cola, así que la barra no lo cuenta y nunca muestra `Listo para merge`.

`Ocultar` oculta un PR hasta que cambie de estado o alguien lo revise; tu propio push no lo vuelve a mostrar.

![Mis PR: seis PR, de cambios solicitados a borrador, dos de ellos con una nueva revisión](docs/images/en/my-prs.png)

Una revisión enviada después de tu último commit aparece como `Nueva revisión`, junto con quién la hizo, hasta que vuelvas a hacer commit. Esto incluye aprobaciones, solicitudes de cambios y revisiones solo con comentarios, respuestas en hilos incluidas, tanto de personas como de bots; una revisión descartada no cuenta. Ese PR cuenta como pendiente de atender y pasa por delante de los PR sin novedades que están en el mismo estado. No se llama a ningún modelo.

Un PR que depende de ti (cambios solicitados, CI con fallos o un conflicto de merge) tiene un botón para su siguiente paso: `Atender comentarios`, `Arreglar CI` o `Resolver conflicto`. Al lado aparece la carpeta en la que trabajaría Claude: `esta carpeta` si esta sesión está en un clon del repositorio, la carpeta de la última sesión que se abrió en él, o `sin clon local`. El botón añade la tarjeta igual que `Revisar`. Al cerrar la bandeja, la solicitud indica el paso y los comandos `gh` con los que leer los comentarios o los logs fallidos, y pide a Claude que trabaje en un worktree nuevo sin tocar la rama de esa carpeta. Si no se conoce ninguna carpeta, Claude te pregunta dónde está tu clon, u ofrece `gh repo clone` y espera a que digas que sí. No añade llamadas a GitHub ni al modelo.

### Mis incidencias

Las incidencias abiertas asignadas a ti, y las incidencias y PR abiertos que te mencionan; si un elemento cumple ambas condiciones, aparece una sola vez, como asignado. Debajo, otras incidencias y PR de los últimos 30 días que hicieron referencia a alguno de los tuyos, junto con quién lo hizo. Se excluyen las referencias que hiciste tú, y solo se muestran las 20 más recientes. No se llama a ningún modelo.

Los elementos se agrupan en asignados, menciones y referencias. `Ocultar` oculta un elemento hasta que tenga actividad nueva.

![Mis incidencias: incidencias asignadas, menciones y referencias a tu trabajo desde otros lugares](docs/images/en/my-issues.png)

Una incidencia asignada a ti tiene un botón `Trabajar en esto` que funciona igual: Claude lee la incidencia, planifica el cambio y empieza en una rama nueva dentro de un worktree nuevo.

### Búsquedas

Búsquedas que nombras tú, cada una una sección con su cantidad y las 20 coincidencias actualizadas más recientemente. Un título abre ese PR o esa incidencia en GitHub, y `N más en GitHub` abre allí la búsqueda completa. Tres vienen incluidas, como en la bandeja de PR de GitHub: `Me involucran` (PR abiertos en los que participas pero que no abriste), `Revisados por mí, aún abiertos` y `Mis incidencias abiertas`. Pulsa el encabezado de una sección para plegarla. Las búsquedas se ejecutan en cada actualización, de tres en tres; una que falla muestra el motivo y no afecta a las demás. Sin llamadas al modelo.

Añade las tuyas en `groups`, en el mismo `actions.json` que los botones de las tarjetas; `/review-inbox add-search` le pide a Claude que escriba uno contigo.

```json
{
  "groups": [
    { "id": "team", "name": "PR del equipo", "query": "org:acme is:open label:urgent", "scope": "prs", "countInBand": true },
    { "id": "reviewed-by-me", "hidden": true }
  ]
}
```

`query` usa la sintaxis de búsqueda de GitHub. `scope` es `prs` o `issues`: añade `is:pr` o `is:issue` salvo que la consulta ya diga cuál, y se añade `sort:updated-desc` salvo que tenga su propio `sort:`. El ajuste `scope` y `Este repositorio` no restringen estas búsquedas, así que escribe `org:` o `repo:` en la consulta si lo necesitas. `"countInBand": true` suma la cantidad del grupo a la barra como `Búsquedas N`. Un grupo con un id incluido lo reemplaza, y `"hidden": true` lo quita. Una entrada con un campo que falta o un scope desconocido se omite; la bandeja avisa de ello al final, y `/review-inbox buttons` la muestra con el motivo. Solo se buscan los primeros 15 grupos.

### Actividad

Tus notificaciones de GitHub que ninguna otra pestaña muestra ya, las más recientes primero: comentarios, cambios de estado y actividad nueva en hilos que abriste o en los que participas, menciones al equipo y alertas de seguridad. Las solicitudes de revisión, asignaciones y menciones quedan fuera, igual que los hilos cuyo PR o incidencia ya es una tarjeta. Un hilo sin leer lleva `●`, y la pestaña también mientras haya alguno. Se leen hasta 100 notificaciones de los últimos 30 días.

`Hecho` y `Cancelar suscripción` quitan la fila al momento y dejan en su lugar `Hecho · Deshacer` o `Suscripción cancelada · Deshacer` durante 10 segundos; si cierras la bandeja antes, se envían en ese momento. Entonces `Hecho` marca el hilo como hecho en GitHub, como la propia bandeja de entrada de GitHub, y `Cancelar suscripción` además deja de notificarte de él hasta que alguien te mencione o comentes. Un hilo marcado como hecho vuelve cuando tiene actividad nueva. Si algo falla, la fila vuelve con el motivo. Sin llamadas al modelo.

GitHub solo da las notificaciones al inicio de sesión de gh y a los tokens clásicos. Sin acceso, la pestaña lo dice y cómo conseguirlo (`gh auth login` o `gh auth refresh -s notifications`).

### Avisos

Avisan de una nueva solicitud de revisión, una nueva revisión en uno de tus PR, uno de tus PR que pasa a cambios solicitados, CI con errores o conflicto de fusión, y una nueva asignación, mención o referencia. La primera consulta de una sesión no anuncia nada. Si llegan varios a la vez, se muestran uno tras otro, con cuatro segundos y medio de separación.

Cuando tu PR queda aprobado y no hay CI en marcha, aparece `Listo para merge` una vez.

![Tres avisos seguidos bajo el prompt: una nueva solicitud de revisión, cambios solicitados en tu PR y una nueva mención](docs/images/en/toasts.gif)

### Botones de las tarjetas

`▸ Más` en una tarjeta abre `Nota` y `Ocultar`, y después botones que pasan la tarjeta a Claude con una solicitud ya preparada: `Resumir riesgos`, `Explicar el diff` y `Redactar aprobación` en una solicitud de revisión, `Redactar respuesta al revisor` e `Investigar fallo de CI` en tu PR. Un botón añade la tarjeta igual que `Revisar`, y la solicitud entra en tu prompt al cerrar la bandeja. Nada se ejecuta ni se publica hasta que pulses Enter.

Añade los tuyos en `actions.json`, en la carpeta de caché. `/review-inbox buttons` muestra su ruta, lo que contiene y las entradas omitidas, y `/review-inbox add-button` pide a Claude que escriba uno contigo.

```json
{
  "buttons": [
    { "id": "test-plan", "name": "Plan de pruebas", "scope": "review", "prompt": "Escribe un plan de pruebas para {{.PrUrl}} en {{.RepoPath}}." },
    { "id": "draft-approval", "scope": "review", "hidden": true }
  ]
}
```

`scope` es `review`, `pr` o `issue`. El prompt puede usar `RepoName`, `RepoPath`, `PrNumber`, `PrUrl`, `PrTitle`, `Author`, `HeadRefName`, `BaseRefName`, `IssueNumber`, `IssueTitle`, `IssueUrl`, escritas como en gh-dash: `{{.Name}}`, `{{Name}}`, `{{ .Name }}`; si la tarjeta no tiene valor para una, queda vacía. Un botón con el id de uno integrado lo sustituye, y `"hidden": true` lo quita. Una entrada a la que le falta un campo, o con un scope o una variable desconocidos, se deja fuera; la bandeja avisa de ello al final, y `/review-inbox buttons` la muestra con el motivo. El resto sigue funcionando. `PrTitle` y `Author` llegan de GitHub tal como están escritos, así que un prompt que los usa pasa a Claude texto escrito por otra persona.

### Acciones directas en GitHub

Con `directActions` en `on`, las tarjetas también tienen botones que escriben en GitHub por sí mismos, con tu cuenta de `gh`.

- `Aprobar` en una solicitud de revisión, `Lista para revisión` en tu PR en borrador y `Actualizar rama` en tu PR cuando su rama base ha avanzado. Los demás ven estas acciones y no se pueden deshacer, así que la primera pulsación convierte la fila en una línea que dice qué se enviará y como quién, por ejemplo `Aprobar o/r#5 "Fix login" como kim — (sin comentario)`. `Confirmar aprobación` lo envía, igual que `y` mientras la bandeja tiene el teclado; `Cancelar`, o diez segundos, devuelve los botones. El foco pasa a `Cancelar`, y una confirmación dentro de los 300 ms siguientes a la primera pulsación se ignora, así que mantener Enter pulsado no envía nada.
- Una aprobación va sin comentario y nombra el commit que miraste. Si llegaron commits nuevos desde entonces, no se envía y la tarjeta lo dice. `Actualizar rama` fusiona la rama base y nunca hace rebase.
- `Reintentar CI fallida` en tu PR con comprobaciones fallidas vuelve a ejecutar los trabajos fallidos de las ejecuciones de GitHub Actions de su último commit. `Asignarme` en un issue que te menciona se envía al momento, con `Deshacer` durante diez segundos.
- Una escritura que falla se queda en la tarjeta con el mensaje de GitHub, y su botón vuelve.

Nada se fusiona directamente. Tu PR aprobado sin comprobaciones en curso tiene un botón `Merge`, también con `directActions` en `off`: añade a tu prompt una petición para comprobar los métodos de fusión del repositorio y ejecutar `gh pr merge`, que envías con Enter y para la que Claude Code pide permiso.

## Requisitos

- Claude Code 2.1.287 o posterior, las primeras compilaciones con mods (plugins de hooks de función). Probado en 2.1.292. Los mods están en acceso anticipado y su API puede cambiar entre versiones.
- [GitHub CLI](https://cli.github.com/) (`gh`) en tu `PATH`, con la sesión iniciada (`gh auth login`) y acceso a los repositorios que revisas.
- GitHub Enterprise Server: define `GH_HOST` en el entorno desde el que se inicia Claude Code; todas las llamadas a `gh` van a ese host.

## Instalación

En el prompt de una sesión de Claude Code:

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

La pantalla de instalación pide las opciones que se describen más abajo; puedes dejarlas todas vacías o con su valor predeterminado.

### Actualizar y desinstalar

```sh
claude plugin marketplace update review-inbox
claude plugin update review-inbox@review-inbox
claude plugin uninstall review-inbox@review-inbox
```

Las actualizaciones se aplican tras reiniciar. Al desinstalar, la carpeta de caché del mod, `~/.claude/plugins/data/review-inbox`, se queda donde está; bórrala a mano para eliminar las listas y los resúmenes en caché. Consulta el [registro de cambios](CHANGELOG.md) para ver qué cambió en cada versión.

## Configuración

Se definen en la pantalla de instalación; puedes cambiarlas después en `/config`. Los cambios se aplican al instante.

| Opción | Valor predeterminado | Qué hace |
| --- | --- | --- |
| `scope` | vacío | Calificadores de búsqueda de GitHub que se añaden a todas las búsquedas (`review-requested:@me`, `author:@me`, `assignee:@me`, `mentions:@me`). Vacío significa todo GitHub. |
| `githubUser` | vacío | La cuenta de `gh` que se usa cuando hay varias con la sesión iniciada (`gh auth token -u <user>`). Si está vacío, se usa la cuenta activa. |
| `language` | `auto` | `auto` o uno de los códigos de [Idioma](#idioma). |
| `refreshMinutes` | `10` | Minutos entre una consulta a GitHub y la siguiente: 5, 10, 15, 30 o 60. Todas las sesiones comparten una consulta. |
| `repoPaths` | vacío | Dónde trabaja Claude en cada repositorio, para los botones del siguiente paso. Ver abajo. |
| `motion` | `auto` | `off` quita el destello de los números de la barra. `auto` también lo quita cuando el ajuste de movimiento reducido de Claude Code (`prefersReducedMotion`) está activado. |
| `directActions` | `off` | `on` añade botones que escriben en GitHub desde una tarjeta. Consulta «Acciones directas en GitHub» más arriba. |

`scope` admite todo lo que acepte la [búsqueda de incidencias y PR](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) de GitHub:

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Si repites los calificadores `org:`, `repo:` y `user:`, basta con que coincida cualquiera de ellos. Una solicitud de revisión a un equipo cuenta como una solicitud para ti, tal como lo define `review-requested:@me` de GitHub.

`repoPaths` admite entradas `owner/repo=ruta` separadas por comas. `owner/*=ruta/*` abarca todos los repositorios de un owner, y el `*` de la ruta es el nombre del repositorio; un nombre exacto gana sobre un comodín, y `~` es tu carpeta personal. Una carpeta indicada aquí gana sobre la carpeta de la propia sesión y las que recuerda el mod.

```text
my-org/*=~/code/*
my-org/legacy=~/old/legacy-app
```

## Idioma

La franja, la bandeja, los avisos, la solicitud de revisión que se añade a tu prompt, y los resúmenes y la descripción de tu estilo de revisión que escribe el modelo usan todos un mismo idioma.

| Código | Idioma |
| --- | --- |
| `en` | Inglés (English) |
| `ko` | Coreano (한국어) |
| `ja` | Japonés (日本語) |
| `zh-CN` | Chino simplificado (简体中文) |
| `zh-TW` | Chino tradicional (繁體中文) |
| `es` | Español |
| `pt-BR` | Portugués de Brasil (Português do Brasil) |
| `de` | Alemán (Deutsch) |
| `fr` | Francés (Français) |

- Un código selecciona ese idioma.
- `auto` (el valor predeterminado) sigue el ajuste `language` del propio Claude Code cuando nombra uno de estos idiomas, ya sea por código, por su nombre en inglés o por su nombre nativo (`ja-JP`, `Japanese`, `日本語`). Si no, sigue la configuración regional del sistema (`LC_ALL`, `LC_MESSAGES` y luego `LANG`), y si tampoco, usa el inglés. El chino se interpreta como simplificado salvo que esté marcado como de Taiwán, Hong Kong, Macao o tradicional (`zh-TW`, `zh-Hant`, `繁體中文`), y el portugués, como de Brasil.

Los resúmenes y la descripción de tu estilo de revisión se guardan en caché por idioma, así que al cambiar de idioma cada resumen, y esa descripción, se vuelven a escribir una vez en el nuevo. Cualquier otro idioma recurre al inglés.

Los idiomas distintos del inglés y el coreano se tradujeron con Claude y todavía no los han revisado hablantes nativos; este README se tradujo de la misma manera. Las correcciones son bienvenidas como incidencia o pull request: cada idioma es un archivo en [`hooks/locales/`](hooks/locales/), y la tabla en inglés, que siguen todas las demás, está en [`hooks/i18n.ts`](hooks/i18n.ts).

## Qué lee y qué ejecuta

El mod accede a GitHub solo a través de tu propio `gh`, envía a Claude el texto de los PR para escribir los resúmenes y, una vez por semana, tus propios comentarios de revisión para describir tu estilo, y solo escribe en su propia carpeta de caché. A continuación se detalla cada cosa a la que accede y por qué; coincide con lo que `claude plugin validate .` enumera para el mod.

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **Ejecuta `gh`**: `gh api graphql` para las listas y, una vez por semana, para tus comentarios de revisión recientes; `gh api repos/<owner>/<repo>/compare/<from>...<to>` para un PR con revisión solicitada de nuevo, y `gh auth token -u <githubUser>` cuando `githubUser` está definido. Para la pestaña Actividad ejecuta `gh api notifications` y, al pulsar `Hecho` o `Cancelar suscripción`, `gh api -X DELETE notifications/threads/<id>` (antes también `/subscription` al cancelar la suscripción). Con `directActions` en `on`, un botón que pulsas ejecuta `gh api user` para el nombre de tu cuenta y `gh api repos/<owner>/<repo>/pulls/<n>` para leer el último commit, y luego uno de `gh api -X POST …/pulls/<n>/reviews` (`event=APPROVE`, `commit_id`), `gh pr ready`, `gh api -X PUT …/pulls/<n>/update-branch`, `gh api …/actions/runs?head_sha=<sha>&status=failure` con `gh api -X POST …/actions/runs/<id>/rerun-failed-jobs`, o `gh api -X POST`/`-X DELETE …/issues/<n>/assignees`. El mod no hace por su cuenta ninguna otra llamada de red.
- **Ejecuta `git`** en la carpeta de la sesión cada 30 segundos: `git branch --show-current` y `git remote -v`, para encontrar una sesión en la rama de tu PR, y `git rev-parse --path-format=absolute --git-common-dir`, para recordar la carpeta principal de ese repositorio.
- **Consulta a Claude** (el modelo `sonnet`) para cada resumen y le envía el nombre del repositorio del PR, el título, la descripción (los primeros 12 000 caracteres), las rutas de los archivos modificados (hasta 80) y el tamaño; para un PR con revisión solicitada de nuevo, también la primera línea de cada mensaje de commit y hasta 60 rutas de archivo desde tu última revisión. Esto cuenta para tu uso de Claude Code. Cada PR se resume una vez por commit head e idioma; un resumen que falla se intenta como máximo tres veces por commit. Una vez por semana también envía tus propios comentarios de revisión en hasta 30 PR que revisaste recientemente, cada uno recortado a 500 caracteres, con un máximo de 60 comentarios y 12 000 caracteres en total, para describir tu estilo de revisión; si hay menos de cinco, no se envía nada.
- **Escribe archivos** solo en su carpeta de caché, `~/.claude/plugins/data/review-inbox` (si `CLAUDE_CONFIG_DIR` está definida, ocupa el lugar de `~/.claude`). `inbox-<hash>.json` guarda las listas y los resúmenes; `hidden-<hash>.json`, los PR ocultos; `notes-<hash>.json`, tus notas y lo pospuesto, un archivo por cuenta y alcance sea cual sea el idioma; `sessions.json`, la carpeta, la rama, los remotos de GitHub y los enlaces a PR de los prompts de cada sesión activa, uno para todas las cuentas; `repos.json`, la carpeta principal de cada repositorio de GitHub en el que se abrió una sesión, para los botones del siguiente paso; `style-<hash>.json`, la descripción de tu estilo de revisión. Cada archivo se escribe primero en uno temporal a su lado y se mueve a su sitio con `mv`, así ninguna sesión lee un archivo a medio escribir; donde no hay `mv`, como en Windows, se escribe directamente. Allí lee `actions.json` si creaste uno, y nunca lo escribe.
- **Lee variables de entorno**: `CLAUDE_CONFIG_DIR`, `HOME` y `USERPROFILE` para encontrar esa carpeta; `GH_REPO` para saber, como `gh`, el repositorio de esta sesión; `LC_ALL`, `LC_MESSAGES` y `LANG` solo cuando `language` es `auto`. No define ninguna.
- **Lee los ajustes de Claude Code**: la clave `language` solo cuando `language` es `auto`, y la clave `prefersReducedMotion` solo cuando `motion` es `auto`.
- **Lee y rellena tu prompt** solo en torno a la bandeja: lee el texto del prompt cuando se abre la bandeja, para marcar los PR que ya pide, y cuando se cierra añade las solicitudes de los PR que añadiste, en líneas nuevas después de ese texto.

## Cómo funciona

Todas tus sesiones abiertas comparten una misma consulta: una sola sesión pregunta a GitHub como mucho cada 10 minutos, y las demás leen lo que esta guardó.

Cada sesión abierta de Claude Code ejecuta el mod, pero todas comparten un único archivo de caché por cuenta, ámbito (scope) e idioma, y lo mismo ocurre con los PR ocultos. Cada sesión lo lee cada 30 segundos. Solo llama a GitHub la sesión que lo encuentra con más de 10 minutos de antigüedad y gana una breve reserva, de modo que diez sesiones abiertas hacen una sola petición. La sesión que consulta renueva su reserva mientras trabaja; si una reserva pasa 3 minutos sin renovarse, otra sesión la toma. Si una consulta falla, se conservan las últimas listas válidas y se reintenta al cabo de un minuto. `↻` en la bandeja consulta al instante.

Una búsqueda GraphQL devuelve todos los PR que esperan tu revisión con lo que necesitan las tarjetas, y otra petición con tres búsquedas llena Mis PR y Mis incidencias. Las referencias salen de los eventos de referencia cruzada de los PR e incidencias que creaste. GitHub no actualiza el `updatedAt` de un elemento cuando algo hace referencia a él, así que en los elementos con actividad en los últimos 60 días se buscan referencias hechas en los últimos 30, a razón de 50 elementos por petición. Si GitHub rechaza la búsqueda de referencias (tiene un límite de recursos por consulta), se conservan las últimas referencias y las demás pestañas se siguen actualizando.

`refreshMinutes` cambia esos 10 minutos.

## Límites

- Como máximo 100 PR que esperan tu revisión, en el orden de mejor coincidencia de GitHub. Las demás pestañas leen hasta 100 de tus PR abiertos, 100 incidencias asignadas y 100 que te mencionan, y referencias de hasta 500 elementos con actividad reciente, en cada caso con la actividad más reciente primero. Cuando una lista tiene más, su recuento se muestra como `100+`. Cada lista se lee de 25 en 25, y una página en la que GitHub agota el tiempo se vuelve a pedir con la mitad del tamaño, así que una cuenta con muchos PR no supera el límite de tiempo de GitHub.
- Un grupo de búsqueda muestra sus 20 coincidencias actualizadas más recientemente; su cantidad es el total que GitHub da para la búsqueda.
- La pestaña Actividad lee hasta 100 notificaciones de los últimos 30 días y no consulta más a menudo de lo que permite el intervalo de GitHub.
- Se pasa por alto una referencia a un elemento que no has tocado en 60 días.
- `Nueva revisión` desaparece con cualquier commit nuevo en el PR, incluido uno hecho con el botón "Update branch" de GitHub o por un bot.
- Tras un force-push que reescribió el commit que revisaste, un PR con revisión solicitada de nuevo no muestra la línea "Desde mi última revisión".
- Tu estilo de revisión se aprende de los PR que devuelve la búsqueda de GitHub para `reviewed-by:@me -author:@me`, dentro de `scope`, así que los comentarios en PR que escribiste tú quedan fuera. Los comentarios en la conversación de un PR que no forman parte de una revisión no se tienen en cuenta.
- `Reintentar CI fallida` solo vuelve a ejecutar GitHub Actions; las comprobaciones de otros servicios de CI se reintentan en su propio sitio. No se puede aprobar varios PR a la vez ni aprobar con un comentario.

## Solución de problemas

- **La bandeja muestra un error de `gh`.** Ejecuta `gh auth status`. Si tienes varias cuentas con la sesión iniciada, define `githubUser`. El mod reintenta cada minuto.
- **La franja no aparece.** Solo se muestra cuando algo requiere tu atención; los contadores a cero se omiten.
- **El idioma no es el que esperabas.** En `/config`, asigna a `language` un código de idioma en lugar de `auto`.
- **Otro problema.** Inicia Claude Code con `claude --debug`; las líneas de este mod empiezan por `review-inbox:`.

## Desarrollo

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin validate` y `claude plugin test` no requieren iniciar sesión, y la CI ejecuta ambos con la compilación de Claude Code probada. `tsconfig.json` extiende `.claude-plugin/types/tsconfig.json`, que Claude Code escribe (y `.gitignore` excluye) la primera vez que carga el mod desde esta carpeta, así que ejecuta `claude --plugin-dir .` una vez antes de comprobar los tipos con `tsc -p .`.

## Apoyo

Si Review Inbox te ahorra tiempo, puedes [invitarme a un café](https://ko-fi.com/riversound) ☕: ayuda a que el proyecto siga adelante. ¡Gracias!

<a href="https://ko-fi.com/riversound"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" height="36"></a>

## Licencia

[MIT](LICENSE)
