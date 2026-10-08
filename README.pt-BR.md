# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | **Português** | [Deutsch](README.de.md) | [Français](README.fr.md)

Um mod para o [Claude Code](https://claude.com/claude-code) que mantém o seu trabalho no GitHub à vista enquanto você programa: os pull requests aguardando sua revisão, cada um resumido em linguagem simples antes de você abri-lo, os seus próprios PRs abertos e as revisões que eles recebem, e as issues que envolvem você.

- **Barra acima do prompt** — uma linha que conta só o que depende de você: PRs aguardando sua revisão, seus PRs com algo a resolver e issues atribuídas a você ou que mencionam você. A cor indica há quanto tempo a solicitação de revisão mais antiga está esperando (amarelo a partir de 3 dias, vermelho a partir de 14). `Abrir` abre a caixa de revisões.
- **Caixa de revisões** — `/review-inbox`, com três abas: Para revisar, Meus PRs e Minhas issues.
- **Notificações** — um aviso curto quando algo novo chega enquanto você trabalha.

![A barra acima do prompt e, em seguida, as três abas da caixa de revisões: Para revisar, Meus PRs e Minhas issues](docs/images/en/overview.gif)

A interface e os resumos estão disponíveis em nove idiomas; veja [Idioma](#idioma).

## Abas

### Para revisar

Um cartão para cada PR aguardando sua revisão: um resumo de uma frase, o motivo do PR, o que ele afeta, o tamanho e o autor, e há quanto tempo a sua revisão está pendente. Itens de risco, como uma mudança de schema ou uma ordem de deploy obrigatória, são marcados com ⚠️.

- `Revisar` marca o cartão como `Adicionado` e mantém a caixa de revisões aberta, para que você possa escolher vários PRs. Quando você fecha a caixa (Esc ou ×), um pedido de revisão para cada PR adicionado vai para o seu prompt, com os avisos do PR e o que mudou desde a sua última revisão. Nada é enviado até você pressionar Enter. Se o texto que você está escrevendo no prompt já pede a revisão de um PR, ele aparece como `Adicionado` quando a caixa de revisões abre.
- `Ocultar` oculta o cartão até o PR receber um novo commit.
- `revisão solicitada novamente` marca um PR que você já revisou e que pede a sua revisão de novo, com um breve resumo do que mudou desde a sua última revisão.
- Solicitações diretas vêm antes das solicitações à equipe. Os rascunhos aparecem em uma lista separada.

![Revisar em dois cartões os marca como Adicionado, Ocultar oculta um terceiro, e Esc coloca os dois pedidos de revisão no prompt](docs/images/en/review.gif)

O pedido também leva uma linha que descreve como você costuma revisar, para que o Claude revise do jeito que você revisaria. Uma vez por semana, o mod lê os seus próprios comentários em até 30 PRs que você revisou recentemente e pede ao Claude que descreva o idioma e o tom que você usa, o que você olha primeiro e como você formula os pedidos. Com menos de cinco comentários para aprender, o pedido vai sem essa linha; se o aprendizado falhar, a última descrição é mantida e o mod tenta de novo um dia depois.

### Meus PRs

Os seus PRs abertos, com o estado no lugar do resumo, na ordem em que você precisa agir sobre eles: alterações solicitadas, CI com falha, conflito de merge, aguardando revisão (os mais antigos primeiro), aprovado, rascunho. O CI em execução aparece ao lado do estado.

![Meus PRs: seis PRs, de alterações solicitadas a rascunho, dois deles com uma nova revisão](docs/images/en/my-prs.png)

Uma revisão enviada depois do seu commit mais recente aparece como `Nova revisão`, com o nome de quem a deixou, até você fazer um novo commit. Isso vale para aprovações, solicitações de alteração e revisões só com comentários, incluindo respostas em threads, de pessoas ou de bots; uma revisão descartada (dismissed) não conta. Um PR nessa situação conta como algo a resolver e passa à frente dos PRs sem novidades no mesmo estado. Não há chamadas ao modelo.

### Minhas issues

Issues abertas atribuídas a você e issues e PRs abertos que mencionam você; um item que se encaixa nos dois casos aparece uma vez só, como atribuído. Abaixo deles, outras issues e PRs dos últimos 30 dias que referenciaram algum item seu, com quem fez a referência. Referências feitas por você mesmo ficam de fora, e só as 20 mais recentes são mostradas. Não há chamadas ao modelo.

![Minhas issues: issues atribuídas, menções e referências ao seu trabalho vindas de outros lugares](docs/images/en/my-issues.png)

### Notificações

Uma nova solicitação de revisão, uma nova revisão em um dos seus PRs, um dos seus PRs passando para alterações solicitadas, CI com falha ou conflito de merge, e uma nova atribuição, menção ou referência. A primeira consulta de uma sessão não anuncia nada. Quando várias chegam ao mesmo tempo, elas aparecem uma depois da outra, com quatro segundos e meio de intervalo.

![Três notificações em sequência abaixo do prompt: uma nova solicitação de revisão, alterações solicitadas no seu PR e uma nova menção](docs/images/en/toasts.gif)

## Requisitos

- Claude Code 2.1.287 ou posterior, as primeiras builds com mods (plugins com hooks de função). Testado na 2.1.292. Os mods estão em acesso antecipado, e a API deles pode mudar de uma versão para outra.
- [GitHub CLI](https://cli.github.com/) (`gh`) no seu `PATH`, autenticado (`gh auth login`) com acesso aos repositórios que você revisa.
- GitHub Enterprise Server: defina `GH_HOST` no ambiente em que o Claude Code é iniciado; todas as chamadas do `gh` vão para esse host.

## Instalação

No prompt de uma sessão do Claude Code:

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

A tela de instalação pede as opções descritas abaixo; todas podem ficar vazias ou com o valor padrão.

### Atualizar e desinstalar

```sh
claude plugin marketplace update review-inbox
claude plugin update review-inbox@review-inbox
claude plugin uninstall review-inbox@review-inbox
```

Uma atualização só passa a valer depois de reiniciar. A desinstalação mantém a pasta de cache do mod, `~/.claude/plugins/data/review-inbox`; apague-a você mesmo para remover as listas e os resumos em cache. Veja no [changelog](CHANGELOG.md) o que mudou em cada versão.

## Configuração

As opções são definidas na tela de instalação e podem ser alteradas depois em `/config`. Uma alteração vale na hora.

| Opção | Padrão | O que faz |
| --- | --- | --- |
| `scope` | vazio | Qualificadores de busca do GitHub acrescentados a todas as buscas (`review-requested:@me`, `author:@me`, `assignee:@me`, `mentions:@me`). Vazio significa todo o GitHub. |
| `githubUser` | vazio | A conta do `gh` a usar quando há várias autenticadas (`gh auth token -u <user>`). Vazio usa a conta ativa. |
| `language` | `auto` | `auto` ou um dos códigos em [Idioma](#idioma). |

`scope` aceita tudo o que a [busca de issues e PRs](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) do GitHub aceita:

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Qualificadores `org:`, `repo:` e `user:` repetidos correspondem a qualquer um deles. Uma solicitação de revisão à equipe conta como uma solicitação para você, como define o `review-requested:@me` do GitHub.

## Idioma

A barra, a caixa de revisões, as notificações, o pedido de revisão colocado no seu prompt e os resumos e a descrição do estilo de revisão escritos pelo modelo usam todos o mesmo idioma.

| Código | Idioma |
| --- | --- |
| `en` | Inglês (English) |
| `ko` | Coreano (한국어) |
| `ja` | Japonês (日本語) |
| `zh-CN` | Chinês simplificado (简体中文) |
| `zh-TW` | Chinês tradicional (繁體中文) |
| `es` | Espanhol (Español) |
| `pt-BR` | Português do Brasil |
| `de` | Alemão (Deutsch) |
| `fr` | Francês (Français) |

- Um código seleciona o idioma correspondente.
- `auto` (o padrão) segue a configuração `language` do próprio Claude Code quando ela indica um destes idiomas, seja pelo código, pelo nome em inglês ou pelo nome no próprio idioma (`ja-JP`, `Japanese`, `日本語`). Caso contrário, segue a localidade do sistema (`LC_ALL`, `LC_MESSAGES` e depois `LANG`) e, se nada disso servir, usa inglês. O chinês é interpretado como simplificado, a menos que esteja marcado como Taiwan, Hong Kong, Macau ou tradicional (`zh-TW`, `zh-Hant`, `繁體中文`), e o português, como português do Brasil.

Os resumos e a descrição do seu estilo de revisão ficam em cache por idioma; por isso, ao trocar de idioma, cada resumo e essa descrição são escritos mais uma vez no novo idioma. Qualquer outro idioma cai para o inglês.

Os idiomas além do inglês e do coreano foram traduzidos com o Claude e ainda não foram revisados por falantes nativos; este README foi traduzido da mesma forma. Correções são bem-vindas como issue ou pull request: cada idioma é um arquivo em [`hooks/locales/`](hooks/locales/), e a tabela em inglês, que todas as outras seguem, está em [`hooks/i18n.ts`](hooks/i18n.ts).

## O que ele lê e executa

O mod acessa o GitHub só pelo seu próprio `gh`, envia o texto dos PRs ao Claude para escrever os resumos e, uma vez por semana, os seus próprios comentários de revisão para descrever o seu estilo, e grava apenas na própria pasta de cache. Abaixo está cada coisa que ele acessa e por quê; a lista corresponde ao que `claude plugin validate .` mostra para o mod.

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **Executa o `gh`**: `gh api graphql` para as listas e, uma vez por semana, para os seus comentários de revisão recentes; `gh api repos/<owner>/<repo>/compare/<from>...<to>` para um PR com revisão solicitada novamente; e `gh auth token -u <githubUser>` quando `githubUser` está definido. O mod não faz nenhuma outra chamada de rede por conta própria.
- **Consulta o Claude** (o modelo `sonnet`) para cada resumo, enviando o nome do repositório do PR, o título, a descrição (os primeiros 12.000 caracteres), os caminhos dos arquivos alterados (até 80) e o tamanho; para um PR com revisão solicitada novamente, também a primeira linha de cada mensagem de commit e até 60 caminhos de arquivo desde a sua última revisão. Isso conta no seu uso do Claude Code. Cada PR é resumido uma vez por commit de head e por idioma; um resumo que falha é tentado no máximo três vezes por commit. Uma vez por semana, ele também envia os seus próprios comentários de revisão em até 30 PRs que você revisou recentemente, cada um cortado em 500 caracteres, no máximo 60 comentários e 12.000 caracteres no total, para descrever o seu estilo de revisão; com menos de cinco, nada é enviado.
- **Grava arquivos** apenas na própria pasta de cache, `~/.claude/plugins/data/review-inbox` (`CLAUDE_CONFIG_DIR` substitui `~/.claude` quando está definido). `inbox-<hash>.json` guarda as listas e os resumos; `hidden-<hash>.json` guarda os PRs ocultos; `style-<hash>.json` guarda a descrição do seu estilo de revisão.
- **Lê variáveis de ambiente**: `CLAUDE_CONFIG_DIR`, `HOME` e `USERPROFILE` para encontrar essa pasta; `LC_ALL`, `LC_MESSAGES` e `LANG` só quando `language` é `auto`. Não define nenhuma.
- **Lê as configurações do Claude Code** só quando `language` é `auto`, e usa apenas a chave `language`.
- **Lê e preenche o seu prompt** só ao abrir e fechar a caixa de revisões: ao abrir, lê o texto que já está no prompt para marcar os PRs que ele já pede; ao fechar, acrescenta os pedidos dos PRs que você adicionou, em novas linhas depois desse texto.

## Como funciona

Todas as suas sessões abertas compartilham uma única busca: uma sessão consulta o GitHub no máximo a cada 10 minutos, e as outras leem o que ela salvou.

Toda sessão aberta do Claude Code executa o mod, mas elas compartilham um único arquivo de cache por conta, escopo e idioma, e o mesmo vale para os PRs ocultos. Cada sessão lê esse arquivo a cada 30 segundos. Só a sessão que o encontra com mais de 10 minutos e ganha uma reserva curta chama o GitHub, então dez sessões abertas fazem uma única requisição. A sessão que está buscando renova a reserva enquanto trabalha; uma reserva que não é renovada por 3 minutos é assumida por outra sessão. Uma busca que falha mantém as últimas listas válidas e é repetida depois de um minuto. `↻` na caixa de revisões busca na hora.

Uma busca GraphQL retorna todos os PRs aguardando sua revisão com o que os cartões precisam, e mais uma requisição, com três buscas, preenche Meus PRs e Minhas issues. As referências vêm dos eventos de referência cruzada nos PRs e issues de sua autoria. O GitHub não atualiza o `updatedAt` de um item quando algo o referencia; por isso, os itens atualizados nos últimos 60 dias são verificados em busca de referências feitas nos últimos 30, 50 itens por requisição. Se o GitHub recusar a busca de referências (ele tem um limite de recursos por consulta), as últimas referências são mantidas e as outras abas continuam sendo atualizadas.

## Limites

- No máximo 100 PRs aguardando sua revisão, na ordem de melhor correspondência do GitHub. As outras abas leem até 100 dos seus PRs abertos, 50 issues atribuídas e 50 que mencionam você, e referências de até 500 itens atualizados recentemente, cada lista com a atividade mais recente primeiro.
- Uma referência a um item em que você não mexe há 60 dias passa despercebida.
- `Nova revisão` some com qualquer novo commit no PR, inclusive um feito pelo botão "Update branch" do GitHub ou por um bot.
- Depois de um force-push que reescreveu o commit que você revisou, um PR com revisão solicitada novamente não mostra a linha "Desde a minha última revisão".
- O seu estilo de revisão é aprendido a partir dos PRs que a busca do GitHub retorna para `reviewed-by:@me -author:@me`, dentro do `scope`; por isso, comentários em PRs que você mesmo abriu ficam de fora. Comentários na conversa de um PR, fora de uma revisão, não entram nisso.

## Solução de problemas

- **A caixa de revisões mostra um erro do `gh`.** Execute `gh auth status`. Se houver várias contas autenticadas, defina `githubUser`. O mod tenta de novo a cada minuto.
- **A barra não aparece.** Ela só aparece quando algo depende de você; contagens zeradas ficam de fora.
- **O idioma não é o que você esperava.** Em `/config`, defina `language` com um código de idioma em vez de `auto`.
- **Outro problema.** Inicie o Claude Code com `claude --debug`; as linhas deste mod começam com `review-inbox:`.

## Desenvolvimento

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin validate` e `claude plugin test` não exigem login, e o CI executa os dois na build testada do Claude Code. O `tsconfig.json` estende `.claude-plugin/types/tsconfig.json`, que o Claude Code grava (e o `.gitignore` exclui) na primeira vez que carrega o mod desta pasta; por isso, execute `claude --plugin-dir .` uma vez antes de verificar os tipos com `tsc -p .`.

## Apoie

Se o Review Inbox poupa seu tempo, você pode [me pagar um café](https://ko-fi.com/riversound) ☕ — isso ajuda o projeto a seguir em frente. Obrigado!

<a href="https://ko-fi.com/riversound"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" height="36"></a>

## Licença

[MIT](LICENSE)
