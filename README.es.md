# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | **Español** | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

Un mod de [Claude Code](https://claude.com/claude-code) que mantiene a la vista tu trabajo en GitHub mientras programas: los pull requests que esperan tu revisión, cada uno resumido en lenguaje sencillo antes de que lo abras; tus propios PR abiertos y las revisiones que reciben, y las incidencias en las que te involucran.

- **Franja sobre el prompt** — una línea que cuenta solo lo que requiere tu atención: PR que esperan tu revisión, tus PR por atender e incidencias asignadas a ti o que te mencionan. Su color indica cuánto lleva esperando la solicitud de revisión más antigua (amarillo a partir de 3 días, rojo a partir de 14). `Abrir` abre la bandeja.
- **Bandeja** — `/review-inbox`, con tres pestañas: Por revisar, Mis PR y Mis incidencias.
- **Avisos** — una notificación breve cuando llega algo nuevo mientras trabajas.

![La franja sobre el prompt y, después, las tres pestañas de la bandeja: Por revisar, Mis PR y Mis incidencias](docs/images/en/overview.gif)

La interfaz y los resúmenes están disponibles en nueve idiomas; consulta [Idioma](#idioma).

## Pestañas

### Por revisar

Una tarjeta por cada PR que espera tu revisión: un resumen de una frase, el motivo del PR, su alcance, su tamaño y autor, y cuánto tiempo lleva pendiente tu revisión. Los puntos de riesgo, como un cambio de esquema o un orden de despliegue obligatorio, se marcan con ⚠️.

- `Revisar` marca la tarjeta como `Añadido` y deja la bandeja abierta, para que puedas elegir varios PR. Al cerrar la bandeja (Esc o ×), se añade a tu prompt una solicitud de revisión por cada PR añadido, con sus advertencias y lo que cambió desde tu última revisión. No se envía nada hasta que pulses Enter. Si el texto que tienes en el prompt ya pide un PR, ese PR aparece como `Añadido` al abrir la bandeja.
- `Ocultar` oculta la tarjeta hasta que el PR reciba un commit nuevo.
- `revisión solicitada de nuevo` marca un PR que ya revisaste y que vuelve a pedir tu revisión, con un breve resumen de lo que cambió desde tu última revisión.
- Las solicitudes directas aparecen antes que las solicitudes al equipo. Los borradores se muestran aparte.

![Revisar en dos tarjetas las marca como Añadido, Ocultar oculta una tercera y Esc pone ambas solicitudes de revisión en el prompt](docs/images/en/review.gif)

La solicitud también incluye una línea que describe cómo sueles revisar, para que Claude revise como lo harías tú. Una vez por semana, el mod lee tus propios comentarios en hasta 30 PR que revisaste recientemente y le pide a Claude que describa tu idioma y tu tono, en qué te fijas primero y cómo formulas tus peticiones. Si hay menos de cinco comentarios de los que aprender, la solicitud va sin esa línea; si el aprendizaje falla, se conserva la última descripción y el mod vuelve a intentarlo un día después.

### Mis PR

Tus PR abiertos, con su estado en lugar de un resumen, en el orden en que tienes que atenderlos: cambios solicitados, CI con errores, conflicto de fusión, pendiente de revisión (los más antiguos primero), aprobado y borrador. Si hay CI en ejecución, se indica junto al estado.

![Mis PR: seis PR, de cambios solicitados a borrador, dos de ellos con una nueva revisión](docs/images/en/my-prs.png)

Una revisión enviada después de tu último commit aparece como `Nueva revisión`, junto con quién la hizo, hasta que vuelvas a hacer commit. Esto incluye aprobaciones, solicitudes de cambios y revisiones solo con comentarios, respuestas en hilos incluidas, tanto de personas como de bots; una revisión descartada no cuenta. Ese PR cuenta como pendiente de atender y pasa por delante de los PR sin novedades que están en el mismo estado. No se llama a ningún modelo.

### Mis incidencias

Las incidencias abiertas asignadas a ti, y las incidencias y PR abiertos que te mencionan; si un elemento cumple ambas condiciones, aparece una sola vez, como asignado. Debajo, otras incidencias y PR de los últimos 30 días que hicieron referencia a alguno de los tuyos, junto con quién lo hizo. Se excluyen las referencias que hiciste tú, y solo se muestran las 20 más recientes. No se llama a ningún modelo.

![Mis incidencias: incidencias asignadas, menciones y referencias a tu trabajo desde otros lugares](docs/images/en/my-issues.png)

### Avisos

Avisan de una nueva solicitud de revisión, una nueva revisión en uno de tus PR, uno de tus PR que pasa a cambios solicitados, CI con errores o conflicto de fusión, y una nueva asignación, mención o referencia. La primera consulta de una sesión no anuncia nada. Si llegan varios a la vez, se muestran uno tras otro, con cuatro segundos y medio de separación.

![Tres avisos seguidos bajo el prompt: una nueva solicitud de revisión, cambios solicitados en tu PR y una nueva mención](docs/images/en/toasts.gif)

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

`scope` admite todo lo que acepte la [búsqueda de incidencias y PR](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) de GitHub:

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Si repites los calificadores `org:`, `repo:` y `user:`, basta con que coincida cualquiera de ellos. Una solicitud de revisión a un equipo cuenta como una solicitud para ti, tal como lo define `review-requested:@me` de GitHub.

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

- **Ejecuta `gh`**: `gh api graphql` para las listas y, una vez por semana, para tus comentarios de revisión recientes; `gh api repos/<owner>/<repo>/compare/<from>...<to>` para un PR con revisión solicitada de nuevo, y `gh auth token -u <githubUser>` cuando `githubUser` está definido. El mod no hace por su cuenta ninguna otra llamada de red.
- **Consulta a Claude** (el modelo `sonnet`) para cada resumen y le envía el nombre del repositorio del PR, el título, la descripción (los primeros 12 000 caracteres), las rutas de los archivos modificados (hasta 80) y el tamaño; para un PR con revisión solicitada de nuevo, también la primera línea de cada mensaje de commit y hasta 60 rutas de archivo desde tu última revisión. Esto cuenta para tu uso de Claude Code. Cada PR se resume una vez por commit head e idioma; un resumen que falla se intenta como máximo tres veces por commit. Una vez por semana también envía tus propios comentarios de revisión en hasta 30 PR que revisaste recientemente, cada uno recortado a 500 caracteres, con un máximo de 60 comentarios y 12 000 caracteres en total, para describir tu estilo de revisión; si hay menos de cinco, no se envía nada.
- **Escribe archivos** solo en su carpeta de caché, `~/.claude/plugins/data/review-inbox` (si `CLAUDE_CONFIG_DIR` está definida, ocupa el lugar de `~/.claude`). `inbox-<hash>.json` guarda las listas y los resúmenes; `hidden-<hash>.json`, los PR ocultos; `style-<hash>.json`, la descripción de tu estilo de revisión.
- **Lee variables de entorno**: `CLAUDE_CONFIG_DIR`, `HOME` y `USERPROFILE` para encontrar esa carpeta; `LC_ALL`, `LC_MESSAGES` y `LANG` solo cuando `language` es `auto`. No define ninguna.
- **Lee la configuración de Claude Code** solo cuando `language` es `auto`, y únicamente usa la clave `language`.
- **Lee y rellena tu prompt** solo en torno a la bandeja: lee el texto del prompt cuando se abre la bandeja, para marcar los PR que ya pide, y cuando se cierra añade las solicitudes de los PR que añadiste, en líneas nuevas después de ese texto.

## Cómo funciona

Todas tus sesiones abiertas comparten una misma consulta: una sola sesión pregunta a GitHub como mucho cada 10 minutos, y las demás leen lo que esta guardó.

Cada sesión abierta de Claude Code ejecuta el mod, pero todas comparten un único archivo de caché por cuenta, ámbito (scope) e idioma, y lo mismo ocurre con los PR ocultos. Cada sesión lo lee cada 30 segundos. Solo llama a GitHub la sesión que lo encuentra con más de 10 minutos de antigüedad y gana una breve reserva, de modo que diez sesiones abiertas hacen una sola petición. La sesión que consulta renueva su reserva mientras trabaja; si una reserva pasa 3 minutos sin renovarse, otra sesión la toma. Si una consulta falla, se conservan las últimas listas válidas y se reintenta al cabo de un minuto. `↻` en la bandeja consulta al instante.

Una búsqueda GraphQL devuelve todos los PR que esperan tu revisión con lo que necesitan las tarjetas, y otra petición con tres búsquedas llena Mis PR y Mis incidencias. Las referencias salen de los eventos de referencia cruzada de los PR e incidencias que creaste. GitHub no actualiza el `updatedAt` de un elemento cuando algo hace referencia a él, así que en los elementos con actividad en los últimos 60 días se buscan referencias hechas en los últimos 30, a razón de 50 elementos por petición. Si GitHub rechaza la búsqueda de referencias (tiene un límite de recursos por consulta), se conservan las últimas referencias y las demás pestañas se siguen actualizando.

## Límites

- Como máximo 100 PR que esperan tu revisión, en el orden de mejor coincidencia de GitHub. Las demás pestañas leen hasta 100 de tus PR abiertos, 50 incidencias asignadas y 50 que te mencionan, y referencias de hasta 500 elementos con actividad reciente, en cada caso con la actividad más reciente primero.
- Se pasa por alto una referencia a un elemento que no has tocado en 60 días.
- `Nueva revisión` desaparece con cualquier commit nuevo en el PR, incluido uno hecho con el botón "Update branch" de GitHub o por un bot.
- Tras un force-push que reescribió el commit que revisaste, un PR con revisión solicitada de nuevo no muestra la línea "Desde mi última revisión".
- Tu estilo de revisión se aprende de los PR que devuelve la búsqueda de GitHub para `reviewed-by:@me -author:@me`, dentro de `scope`, así que los comentarios en PR que escribiste tú quedan fuera. Los comentarios en la conversación de un PR que no forman parte de una revisión no se tienen en cuenta.

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
