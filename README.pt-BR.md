# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox) [![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | **Português** | [Deutsch](README.de.md) | [Français](README.fr.md)

Um mod para o [Claude Code](https://claude.com/claude-code) que mantém o seu trabalho no GitHub à vista enquanto você programa: os pull requests aguardando sua revisão, cada um resumido em linguagem simples antes de você abri-lo, os seus próprios PRs abertos e as revisões que eles recebem, e as issues que envolvem você.

![A barra acima do prompt e, em seguida, as três abas da caixa de revisões: Para revisar, Meus PRs e Minhas issues](docs/images/en/overview.gif)

## Início rápido

Com o [GitHub CLI](https://cli.github.com/) logado (`gh auth login`), no prompt de uma sessão do Claude Code:

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
/review-inbox
```

A última linha abre a caixa de revisões. Opções e atualizações estão em [Instalação](#instalação).

- **Barra acima do prompt** — uma linha que conta só o que depende de você: PRs aguardando sua revisão, seus PRs com algo a resolver e issues atribuídas a você ou que mencionam você. A cor indica há quanto tempo a solicitação de revisão mais antiga está esperando (amarelo a partir de 3 dias, vermelho a partir de 14). `Abrir` abre a caixa de revisões. Quando um número cai, ele fica verde por um instante.
- **Caixa de revisões** — `/review-inbox`, com cinco abas. As três primeiras (Para revisar, Meus PRs e Atribuições e menções) reúnem o que você precisa resolver; Buscas salvas e Notificações servem para dar uma olhada. Com o foco na caixa, pressione 1 a 5 para ir até a aba nessa posição, contando da esquerda. O número de cada aba conta os cartões; Buscas salvas não tem número, e Notificações conta só as não lidas.
- **Avisos** — um aviso curto quando algo novo chega enquanto você trabalha.

A interface e os resumos estão disponíveis em nove idiomas; veja [Idioma](#idioma).

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
| `refreshMinutes` | `10` | Minutos entre uma busca no GitHub e a seguinte: 5, 10, 15, 30 ou 60. Todas as sessões compartilham uma busca. |
| `repoPaths` | vazio | Onde o Claude trabalha em cada repositório, para os botões de próximo passo. Veja abaixo. |
| `motion` | `auto` | `off` tira o destaque dos números da faixa. `auto` também tira quando a configuração de movimento reduzido do Claude Code (`prefersReducedMotion`) está ligada. |
| `directActions` | `off` | `on` adiciona botões que escrevem no GitHub a partir de um cartão. Veja "Ações diretas no GitHub" abaixo. |
| `autoReview` | `off` | `on` revisa em segundo plano os PRs que pedem a sua revisão e guarda cada revisão como a sua revisão pendente até você publicá-la. **Gasta bem mais tokens.** Este é só o valor inicial: depois que você aperta o botão `Revisão automática` no topo da aba Para revisar, que pede confirmação antes de ligar, só o botão liga e desliga a opção. Veja "Revisão automática" abaixo. |
| `autoReviewPost` | `pending` | O que acontece com uma revisão terminada: `pending` a mantém como sua revisão pendente para publicar pelo cartão, `comment` a publica como comentário e `verdict` a publica com o veredito sugerido, aprovar e solicitar alterações incluídos. Qualquer valor diferente de `pending` publica em seu nome sem perguntar. |
| `autoReviewModel` | `sonnet` | O modelo em que o revisor roda: `sonnet` ou `opus`, que revisa mais a fundo e custa mais. |
| `autoReviewVerify` | `off` | Com `on`, um segundo revisor confere cada apontamento do rascunho com o código antes de guardá-lo: tira o que não se sustenta e rebaixa o exagerado. Uma revisão com apontamentos custa então cerca do dobro de tokens. |
| `autoReviewDaily` | `5` | Máximo de revisões automáticas iniciadas por dia: 3, 5, 10, 20 ou `unlimited`. `Tentar de novo` em um cartão não conta. |
| `autoReviewSettleMinutes` | `30` | Minutos depois do último commit de um PR antes de a revisão automática começar, porque os autores costumam fazer push de novo logo depois de pedir: 0, 10, 30, 60 ou 120. `0` começa na hora. |
| `autoReviewSkills` | vazio | Skills carregadas no revisor, separadas por vírgulas, como o seu playbook de revisão. Vazio não carrega nenhuma. |
| `autoReviewInstructions` | vazio | Suas próprias instruções ao revisor, como o que olhar primeiro ou como escrever os comentários. Vazio não acrescenta nada. |
| `autoReviewLarge` | `on` | `on` também revisa PRs com mais de 50 arquivos ou 2.000 linhas alteradas, que gastam muito mais tokens. `off` os deixa de fora. |
| `autoReviewBacklog` | `on` | `on` também revisa solicitações feitas antes de a revisão automática ser ligada, algumas por dia conforme `autoReviewDaily`. `off` as deixa de fora. |

`scope` aceita tudo o que a [busca de issues e PRs](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) do GitHub aceita:

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Qualificadores `org:`, `repo:` e `user:` repetidos correspondem a qualquer um deles. Uma solicitação de revisão à equipe conta como uma solicitação para você, como define o `review-requested:@me` do GitHub.

`repoPaths` aceita entradas `owner/repo=caminho` separadas por vírgulas. `owner/*=caminho/*` vale para todos os repositórios de um owner, com o `*` do caminho sendo o nome do repositório; um nome exato vence um curinga, e `~` é a sua pasta pessoal. Uma pasta indicada aqui vence a pasta da própria sessão e as que o mod lembra.

```text
my-org/*=~/code/*
my-org/legacy=~/old/legacy-app
```

## Abas

Cada aba agrupa seus cartões por categoria. Pressione o título de uma categoria para recolhê-la e de novo para abri-la. `N ocultos · mostrar todos`, no topo da aba, mostra de novo apenas os cartões ocultos daquela aba.

`Nota`, em `▸ Ações` de um cartão, escreve uma linha acima do título: o que você conferiu ou o que combinou fazer e quando. `Salvar` mantém o cartão à vista. `Adiar até amanhã` e `Adiar até a próxima semana` tiram o cartão de vista até amanhã ou a próxima segunda-feira, às 9 da manhã, ou antes, se houver novidade: um commit novo num pedido de revisão, uma mudança de estado ou uma revisão nova no seu PR, atividade nova numa issue. Um aviso mostra quando um cartão adiado volta, com a nota. `Apagar` remove a nota.

O campo de busca no topo procura em todas as abas de uma vez: repositório, número, título, autor, os primeiros 2.000 caracteres da descrição, o resumo e suas notas. Cartões ocultos e adiados também aparecem, marcados como `oculto`. Esvazie o campo para voltar às abas. O app móvel do Claude ainda não desenha campos de texto, então lá ele mostra as notas, mas não tem busca nem `Nota`.

Os cartões em que uma sessão está trabalhando se reúnem em `Em andamento em uma sessão`, no topo de Para revisar e Meus PRs, com o nome da pasta da sessão ou `esta sessão`. Seu PR entra ali quando a pasta de uma sessão está com o branch dele no repositório dele; qualquer cartão entra assim que um prompt dessa sessão tem o link dele, como faz `Revisar com o Claude`. Quando a sessão é fechada ou fica 10 minutos sem dar sinal, os cartões voltam aos seus grupos.

Uma sessão que ainda roda uma versão anterior do mod, como uma aberta antes de atualizar e nunca recarregada, aparece sob o título do painel, por exemplo `2 sessões em uma versão anterior (dhub2): execute /reload-plugins lá`. Essa sessão guarda as listas num arquivo próprio, então nunca mostra suas listas ou erros numa sessão atualizada. `Recarregar todas`, ao lado, pede que essas sessões rodem `/reload-plugins` sozinhas, por meio de `reload.json` na pasta de cache: cada uma faz isso quando fica livre, e os outros plugins dela recarregam junto. Só sessões na 0.13.0 ou posterior conseguem responder; numa mais antiga, ainda é preciso rodar o comando lá uma vez.

Os cartões do repositório desta sessão vêm primeiro em cada grupo, marcados com `este repositório`. Quando as abas também têm outros repositórios, `Este repositório N` e `Todos N`, acima das abas, restringem a este repositório ou voltam a mostrar tudo; a faixa sempre conta tudo. O repositório desta sessão é, como para o `gh`, o que `GH_REPO` indica, senão o dos remotos do GitHub da pasta.

Abaixo do título, um cartão mostra até dois rótulos e quantos mais há, o número de comentários e, em um PR, `→ branch` quando ele aponta para um branch que não é o padrão do repositório.

Um `●` antes do repositório de um cartão marca um que mudou desde a última vez que você fechou a caixa, como a caixa de entrada do GitHub marca o que mudou desde a sua última visita. Antes do primeiro fechamento nada é marcado.

Quando nada precisa de você (nenhum pedido de revisão, nenhum PR seu com algo a fazer, nenhuma issue atribuída a você ou que mencione você), a caixa mostra `✓ Nada precisa de você agora` acima das abas, e a faixa continua escondida.

### Para revisar

Um cartão para cada PR aguardando sua revisão: um resumo de uma frase, o motivo do PR, o que ele afeta, o tamanho e o autor, e há quanto tempo a sua revisão está pendente. Itens de risco, como uma mudança de schema ou uma ordem de deploy obrigatória, são marcados com ⚠️.

- `Revisar com o Claude` marca o cartão como `Adicionado` e mantém a caixa de revisões aberta, para que você possa escolher vários PRs. Quando você fecha a caixa (Esc ou ×), um pedido de revisão para cada PR adicionado vai para o seu prompt, com os avisos do PR e o que mudou desde a sua última revisão. Nada é enviado até você pressionar Enter. Se o texto que você está escrevendo no prompt já pede a revisão de um PR, ele aparece como `Adicionado` quando a caixa de revisões abre.
- `Ocultar`, em `▸ Ações` ao lado de `Nota`, oculta o cartão até o PR receber um novo commit.
- `revisão solicitada novamente` marca um PR que você já revisou e que pede a sua revisão de novo, com um breve resumo do que mudou desde a sua última revisão.
- Os cartões são agrupados em solicitações diretas, solicitações à equipe e rascunhos.

![Revisar em dois cartões os marca como Adicionado, Ocultar oculta um terceiro, e Esc coloca os dois pedidos de revisão no prompt](docs/images/en/review.gif)

O pedido também leva uma linha que descreve como você costuma revisar, para que o Claude revise do jeito que você revisaria. Uma vez por semana, o mod lê os seus próprios comentários em até 30 PRs que você revisou recentemente e pede ao Claude que descreva o idioma e o tom que você usa, o que você olha primeiro e como você formula os pedidos. Com menos de cinco comentários para aprender, o pedido vai sem essa linha; se o aprendizado falhar, a última descrição é mantida e o mod tenta de novo um dia depois.

### Meus PRs

Os seus PRs abertos, com o estado no lugar do resumo, na ordem em que você precisa agir sobre eles: alterações solicitadas, CI com falha, conflito de merge, aguardando revisão (os mais antigos primeiro), aprovado, na fila de merge, rascunho. O CI em execução aparece ao lado do estado. Um PR em uma fila de merge mostra `Na fila de merge`: o GitHub faz o merge assim que as verificações da fila passam, então a faixa não o conta e ele nunca mostra `Pronto para merge`.

`Ocultar` oculta um PR até ele mudar de estado ou alguém revisá-lo; o seu próprio push não o traz de volta.

![Meus PRs: seis PRs, de alterações solicitadas a rascunho, dois deles com uma nova revisão](docs/images/en/my-prs.png)

Uma revisão enviada depois do seu commit mais recente aparece como `Nova revisão`, com o nome de quem a deixou, até você fazer um novo commit. Isso vale para aprovações, solicitações de alteração e revisões só com comentários, incluindo respostas em threads, de pessoas ou de bots; uma revisão descartada (dismissed) não conta. Um PR nessa situação conta como algo a resolver e passa à frente dos PRs sem novidades no mesmo estado. Não há chamadas ao modelo.

Um PR que depende de você (alterações solicitadas, CI falhando ou conflito de merge) tem um botão para o próximo passo: `Responder comentários`, `Corrigir CI` ou `Resolver conflito`. Ao lado aparece a pasta em que o Claude trabalharia: `esta pasta` quando esta sessão está em um clone do repositório, a pasta da última sessão aberta nele, ou `sem clone local`. O botão adiciona o cartão do mesmo jeito que `Revisar com o Claude`. Quando você fecha a caixa, o pedido traz o passo e os comandos `gh` que leem os comentários ou os logs com falha, e pede ao Claude que trabalhe em um worktree novo sem mexer no branch daquela pasta. Sem pasta conhecida, o Claude pergunta onde está o seu clone, ou oferece `gh repo clone` e espera o seu sim. Sem chamadas extras ao GitHub e sem chamadas ao modelo.

### Atribuições e menções

Issues abertas atribuídas a você e issues e PRs abertos que mencionam você; um item que se encaixa nos dois casos aparece uma vez só, como atribuído. Abaixo deles, outras issues e PRs dos últimos 30 dias que referenciaram algum item seu, com quem fez a referência. Referências feitas por você mesmo ficam de fora, e só as 20 mais recentes são mostradas. Não há chamadas ao modelo.

Os itens são agrupados em atribuídos, menções e referências. `Ocultar` oculta um item até ele ter atividade nova.

![Minhas issues: issues atribuídas, menções e referências ao seu trabalho vindas de outros lugares](docs/images/en/my-issues.png)

Uma issue atribuída a você tem um botão `Trabalhar nisto` que funciona do mesmo jeito: o Claude lê a issue, planeja a mudança e começa em um branch novo dentro de um worktree novo.

### Buscas salvas

Buscas do GitHub que você nomeia e salva, cada uma uma seção com a contagem e os 20 resultados atualizados mais recentemente. Um título abre aquele PR ou issue no GitHub, e `Mais N no GitHub` abre lá a busca inteira. Três já vêm prontas, como na caixa de entrada de PRs do GitHub: `Me envolvem` (PRs abertos de que você participa mas não abriu), `Revisados por mim, ainda abertos` e `Minhas issues abertas`. Toque no cabeçalho de uma seção para recolhê-la. As buscas rodam a cada atualização, três por vez; uma que falha mostra o motivo e não afeta as outras. Nenhuma chamada ao modelo.

Adicione as suas em `groups`, no mesmo `actions.json` dos botões dos cartões; `/review-inbox add-search` pede ao Claude que escreva um com você.

```json
{
  "groups": [
    { "id": "team", "name": "PRs do time", "query": "org:acme is:open label:urgent", "scope": "prs", "countInBand": true },
    { "id": "reviewed-by-me", "hidden": true }
  ]
}
```

`query` usa a sintaxe de busca do GitHub. `scope` é `prs` ou `issues`: acrescenta `is:pr` ou `is:issue` a menos que a busca já diga qual, e `sort:updated-desc` é acrescentado a menos que ela tenha seu próprio `sort:`. A configuração `scope` e `Este repositório` não restringem essas buscas; escreva `org:` ou `repo:` na busca quando quiser isso. `"countInBand": true` soma a contagem da busca à faixa como `Buscas salvas N`. Uma busca salva com um id pronto a substitui, e `"hidden": true` o remove. Uma entrada com campo faltando ou scope desconhecido fica de fora; a caixa avisa no fim, e `/review-inbox buttons` mostra a entrada com o motivo. Só as primeiras 15 buscas salvas são executadas.

### Notificações

Suas notificações do GitHub que nenhuma outra aba já mostra, numa seção por motivo (`Comentário`, `Mudança de estado`, `Execução de CI` e assim por diante), as mais recentes primeiro em cada uma; toque no cabeçalho de uma seção para recolhê-la. São comentários, mudanças de estado e atividade nova em threads que você abriu ou de que participa, menções ao time e alertas de segurança. Execuções do GitHub Actions concluídas que você iniciou também aparecem, como `Execução de CI`, com link para a página Actions do repositório; o GitHub só as envia enquanto as notificações do Actions estiverem ativadas para o GitHub, em Notifications → System → Actions nas suas configurações do GitHub. Pedidos de revisão, atribuições e menções ficam de fora, assim como threads cujo PR ou issue já é um cartão. Uma thread não lida leva `●`, e o número da aba conta as não lidas. São lidas até 100 notificações dos últimos 30 dias.

`Concluir` e `Cancelar inscrição` tiram a linha na hora e deixam `Concluído · Desfazer` ou `Inscrição cancelada · Desfazer` no lugar por 10 segundos; fechar a caixa antes disso envia na hora. Então `Concluir` marca a thread como concluída no GitHub, como a própria caixa de entrada do GitHub, e `Cancelar inscrição` também para as notificações dela até alguém mencionar você ou você comentar. Uma thread concluída volta quando tem atividade nova. Se algo falhar, a linha volta com o motivo. Nenhuma chamada ao modelo.

O GitHub só entrega notificações ao login do gh e a tokens clássicos. Sem acesso, a aba avisa e diz como conseguir (`gh auth login` ou `gh auth refresh -s notifications`).

### Avisos

Uma nova solicitação de revisão, uma nova revisão em um dos seus PRs, um dos seus PRs passando para alterações solicitadas, CI com falha ou conflito de merge, e uma nova atribuição, menção ou referência. Uma sessão nova não as anuncia uma a uma: um só aviso resume o que mudou desde a última vez que uma sessão olhou, por exemplo `Enquanto você estava fora · CI com falha 2`, e nada aparece se nada mudou. Quando várias chegam ao mesmo tempo, elas aparecem uma depois da outra, com quatro segundos e meio de intervalo.

Quando seu PR é aprovado e não há CI rodando, aparece `Pronto para merge` uma vez.

![Três notificações em sequência abaixo do prompt: uma nova solicitação de revisão, alterações solicitadas no seu PR e uma nova menção](docs/images/en/toasts.gif)

### Botões dos cartões

`▸ Ações` em um cartão abre `Nota` e `Ocultar` e, depois, botões que entregam o cartão ao Claude com um pedido pronto: `Resumir riscos`, `Explicar o diff` e `Rascunhar aprovação` em um pedido de revisão, `Rascunhar resposta ao revisor` e `Investigar falha de CI` no seu PR. Um botão adiciona o cartão do mesmo jeito que `Revisar com o Claude`, e o pedido entra no seu prompt quando você fecha a caixa. Nada roda e nada é publicado até você apertar Enter.

Adicione os seus em `actions.json`, na pasta de cache. `/review-inbox buttons` mostra o caminho, o conteúdo e as entradas deixadas de fora, e `/review-inbox add-button` pede ao Claude que escreva um com você.

```json
{
  "buttons": [
    { "id": "test-plan", "name": "Plano de testes", "scope": "review", "prompt": "Escreva um plano de testes para {{.PrUrl}} em {{.RepoPath}}." },
    { "id": "draft-approval", "scope": "review", "hidden": true }
  ]
}
```

`scope` é `review`, `pr` ou `issue`. O prompt pode usar `RepoName`, `RepoPath`, `PrNumber`, `PrUrl`, `PrTitle`, `Author`, `HeadRefName`, `BaseRefName`, `IssueNumber`, `IssueTitle`, `IssueUrl`, escritas como no gh-dash: `{{.Name}}`, `{{Name}}`, `{{ .Name }}`; uma variável sem valor no cartão fica vazia. Um botão com o id de um integrado o substitui, e `"hidden": true` o remove. Uma entrada sem algum campo, ou com scope ou variável desconhecidos, fica de fora; a caixa avisa no fim, e `/review-inbox buttons` mostra a entrada com o motivo. O resto continua funcionando. `PrTitle` e `Author` vêm do GitHub como foram escritos, então um prompt que os usa passa ao Claude um texto escrito por outra pessoa.

### Ações diretas no GitHub

Com `directActions` em `on`, os cartões também ganham botões que escrevem no GitHub por conta própria, com a sua conta do `gh`.

- `Aprovar` em um pedido de revisão, `Pronto para revisão` no seu PR em rascunho e `Atualizar branch` no seu PR quando a branch base avançou. Os outros veem essas ações e elas não podem ser desfeitas, então o primeiro toque transforma a linha em uma frase dizendo o que será enviado e como quem, por exemplo `Aprovar o/r#5 "Fix login" como kim — (sem comentário)`. `Confirmar aprovação` envia, assim como `y` enquanto a caixa está com o teclado; `Cancelar`, ou dez segundos, traz os botões de volta. O foco vai para `Cancelar`, e uma confirmação nos 300 ms seguintes ao primeiro toque é ignorada, então segurar Enter não envia nada.
- A aprovação vai sem comentário e indica o commit que você viu. Se chegaram commits novos depois disso, ela não é enviada e o cartão avisa. `Atualizar branch` faz merge da branch base e nunca faz rebase.
- `Rodar CI com falha de novo` no seu PR com verificações falhando roda de novo os jobs que falharam nas execuções do GitHub Actions do último commit. `Atribuir a mim` em uma issue que menciona você é enviado na hora, com `Desfazer` por dez segundos.
- Uma escrita que falha fica no cartão com a mensagem do GitHub, e o botão volta.

Nada faz merge diretamente. O seu PR aprovado sem verificações em andamento ganha um botão `Fazer merge`, mesmo com `directActions` em `off`: ele adiciona ao seu prompt um pedido para conferir os métodos de merge do repositório e rodar `gh pr merge`, que você envia com Enter e para o qual o Claude Code pede permissão.

### Revisão automática

Com `autoReview` em `on`, um PR que pede a sua revisão diretamente é lido pelo Claude em segundo plano, e a revisão já está esperando no cartão quando você chega a ele. Até você apertar um botão, o autor vê só uma reação 👀 sua no PR enquanto a revisão roda. Isso vale enquanto `autoReviewPost` estiver em `pending`, o padrão.

> **Gasta bem mais tokens.** Cada revisão roda um subagente que lê o diff e o código, com o seu CLAUDE.md, os seus hooks e as skills de `autoReviewSkills`: dezenas de milhares de tokens por PR, mais com `opus`. O cartão mostra quanto cada revisão custou, e `autoReviewDaily` limita quantas começam por dia.

- **O que inicia uma.** Uma solicitação feita diretamente a você (não a uma equipe), em um PR que não é rascunho e não foi aberto por um bot, depois que passam `autoReviewSettleMinutes` (30 minutos por padrão) desde o último commit, contados a partir do horário do próprio commit. Uma revisão roda por vez em todas as suas sessões. Esse 👀 avisa suas outras máquinas que o PR já está sendo revisado, e elas o deixam de lado; o que sobra de uma máquina que parou no meio da revisão é assumido depois de uma hora. Solicitações feitas antes de você ativar a opção e PRs com mais de 50 arquivos ou 2.000 linhas alteradas também são revisados, a menos que `autoReviewBacklog` ou `autoReviewLarge` esteja em `off`. O botão `Revisão automática` no topo da aba Para revisar liga e desliga a revisão automática em todas as sessões; uma mudança posterior de `autoReview` em `/config` vale sobre ele. Nada roda enquanto nada está na vez: nenhum modelo é consultado e nenhum agente é iniciado.
- **Configuração.** Na primeira vez que o botão `Revisão automática` a liga, um pedido de configuração entra no seu prompt: cada configuração da revisão automática exceto ligar e desligar, que fica com o botão, com o que faz, quais valores aceita, seu padrão e seu valor atual. Pressione Enter e o Claude passa por elas com você, uma de cada vez, e grava o que você escolher onde o `/config` as guarda; valem a partir da próxima sessão. `/review-inbox auto-review-config` coloca o mesmo pedido a qualquer momento.
- **Qual sessão as roda.** A sessão em que você liga o botão `Revisão automática` inicia as revisões nesta máquina, e o aviso antes de ligar diz isso. Rode `/review-inbox auto-review-here` em outra sessão para levá-las para lá, ou `/review-inbox auto-review-anywhere` para que qualquer sessão as inicie. Enquanto essa sessão estiver fechada, os PRs na fila esperam e os cartões dizem isso.
- **O que ele lê.** O revisor recebe ferramentas somente de leitura (`Read`, `Grep`, `Glob`) e nenhum shell. O mod grava o diff do PR, e, em uma nova solicitação, o diff desde a sua última revisão, em uma pasta de execução; quando conhece a pasta do repositório (a que os botões de próximo passo usam), também faz o checkout do commit de head ali como um worktree desanexado (detached), removido quando a revisão é guardada.
- **O que ele grava.** O resultado vai para o GitHub como a sua **revisão pendente**, que só você vê: comentários nas linhas a que se referem, e o que estiver fora do diff no corpo da revisão, agrupado por gravidade. As gravidades são nomeadas no idioma do mod. O cartão mostra o veredito sugerido, os achados por gravidade, os três principais e o custo. Esses cartões se juntam no grupo `Revisão automática concluída`, logo abaixo do botão `Revisão automática`; `Marcar tudo` nessa linha os devolve às suas solicitações, com as revisões pendentes ainda neles. Uma nova revisão do PR o traz de volta. Com `autoReviewPost` em `comment` ou `verdict`, ela é publicada assim que é gravada e sai da aba Para revisar; se o GitHub recusar, fica como sua revisão pendente no cartão.
- **Publicação.** `Publicar como comentário`, `Publicar e aprovar` e `Publicar e pedir alterações`, com o sugerido em cor, pedem confirmação no cartão como as Ações diretas no GitHub e então enviam a revisão pendente. `Abrir no GitHub` abre os arquivos do PR, onde você pode editá-la antes. `Refinar na sessão` ocupa o lugar de `Revisar com o Claude` e pede ao Claude que trabalhe nessa revisão com você, enviando-a só depois que você disser qual veredito. `Descartar` a apaga. Eles aparecem sem `directActions`.
- **Commits novos.** Uma revisão em andamento para quando o PR recebe um commit novo, é fechado ou mesclado, ou deixa de pedir a sua revisão. Um rebase que não muda nenhum conteúdo leva a sua revisão pendente, com as suas edições, para o novo commit sem consultar o Claude. Outros commits novos a deixam onde está: o cartão avisa que publicá-la revisaria código que não existe mais e oferece `Revisar de novo`. Uma publicação é recusada quando o PR mudou desde que o cartão foi desenhado.
- **Falhas.** Uma resposta que não dá para ler, ou uma revisão em que o revisor não conseguiu ler o diff, é tentada mais uma vez; depois o cartão mostra o motivo com `Tentar de novo`. Uma revisão que você interrompeu pela lista de tarefas espera por `Tentar de novo`. Uma cuja sessão foi fechada recomeça pela frente da fila.

## Idioma

A barra, a caixa de revisões, os avisos, o pedido de revisão colocado no seu prompt e os resumos e a descrição do estilo de revisão escritos pelo modelo usam todos o mesmo idioma.

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

O mod acessa o GitHub só pelo seu próprio `gh`, envia o texto dos PRs ao Claude para escrever os resumos e, uma vez por semana, os seus próprios comentários de revisão para descrever o seu estilo, e grava apenas na própria pasta de cache. Abaixo está cada coisa que ele acessa e por quê; a lista corresponde ao que `claude plugin validate .` mostra para o mod. Com `autoReview` ativado, ele também pede ao Claude que revise PRs, guarda cada revisão no GitHub como a sua revisão pendente e adiciona um worktree à pasta do repositório enquanto uma revisão roda.

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **Executa o `gh`**: `gh api graphql` para as listas e, uma vez por semana, para os seus comentários de revisão recentes; `gh api repos/<owner>/<repo>/compare/<from>...<to>` para um PR com revisão solicitada novamente; e `gh auth token -u <githubUser>` quando `githubUser` está definido. Para a aba Notificações, roda `gh api notifications` e, ao tocar em `Concluir` ou `Cancelar inscrição`, `gh api -X DELETE notifications/threads/<id>` (antes também `/subscription` ao cancelar a inscrição). Com `directActions` em `on`, um botão pressionado roda `gh api user` para o nome da conta e `gh api repos/<owner>/<repo>/pulls/<n>` para ler o último commit, e depois um de `gh api -X POST …/pulls/<n>/reviews` (`event=APPROVE`, `commit_id`), `gh pr ready`, `gh api -X PUT …/pulls/<n>/update-branch`, `gh api …/actions/runs?head_sha=<sha>&status=failure` com `gh api -X POST …/actions/runs/<id>/rerun-failed-jobs`, ou `gh api -X POST`/`-X DELETE …/issues/<n>/assignees`. Com `autoReview` em `on`, roda `gh api …/pulls/<n>/reviews` e `…/pulls/<n>/files` antes e depois de cada revisão, `gh pr diff`, e `gh api -X POST …/pulls/<n>/reviews` com a revisão na entrada padrão (stdin) para guardá-la como a sua revisão pendente; levá-la para um commit novo lê `…/reviews/<id>` e `…/reviews/<id>/comments` e roda `gh api -X DELETE …/reviews/<id>` antes de criá-la de novo. Em volta de cada revisão ele põe e tira esse 👀 com `gh api -i -X POST …/issues/<n>/reactions` (`content=eyes`) e `gh api -X DELETE …/issues/<n>/reactions/<id>`. Os botões do cartão rodam `gh api -X POST …/reviews/<id>/events` (`event=COMMENT`, `APPROVE` ou `REQUEST_CHANGES`) ou `gh api -X DELETE …/reviews/<id>`, depois de ler o commit de head. O mod não faz nenhuma outra chamada de rede por conta própria. Com `autoReviewPost` em `comment` ou `verdict`, em seguida executa `gh api -X POST …/reviews/<id>/events` (`event=COMMENT`, `APPROVE` ou `REQUEST_CHANGES`) na revisão gravada.
- **Executa o `git`** na pasta da sessão a cada 30 segundos: `git branch --show-current` e `git remote -v`, para achar uma sessão no branch do seu PR, e `git rev-parse --path-format=absolute --git-common-dir`, para lembrar a pasta principal desse repositório. Com `autoReview` em `on` e a pasta do repositório conhecida, roda ali `git fetch origin pull/<n>/head` e `git worktree add --detach` para cada revisão, e `git worktree remove --force` quando a revisão termina.
- **Consulta o Claude** (o modelo `sonnet`) para cada resumo, enviando o nome do repositório do PR, o título, a descrição (os primeiros 12.000 caracteres), os caminhos dos arquivos alterados (até 80) e o tamanho; para um PR com revisão solicitada novamente, também a primeira linha de cada mensagem de commit e até 60 caminhos de arquivo desde a sua última revisão. Isso conta no seu uso do Claude Code. Cada PR é resumido uma vez por commit de head e por idioma; um resumo que falha é tentado no máximo três vezes por commit. Uma vez por semana, ele também envia os seus próprios comentários de revisão em até 30 PRs que você revisou recentemente, cada um cortado em 500 caracteres, no máximo 60 comentários e 12.000 caracteres no total, para descrever o seu estilo de revisão; com menos de cinco, nada é enviado.
- **Inicia um subagente** só com `autoReview` em `on`: um `auto-reviewer` por vez, em `autoReviewModel`, com ferramentas somente de leitura, o seu CLAUDE.md, os seus hooks e `autoReviewSkills`. Isso conta no seu uso do Claude Code. O tipo desse agente fica fora da lista da qual o seu próprio Claude escolhe. Para interrompê-lo, usa `TaskStop`.
- **Grava arquivos** apenas na própria pasta de cache, `~/.claude/plugins/data/review-inbox` (`CLAUDE_CONFIG_DIR` substitui `~/.claude` quando está definido). `inbox-<hash>-f<n>.json` guarda as listas e os resumos; `hidden-<hash>.json` guarda os PRs ocultos; `notes-<hash>.json` guarda suas notas e adiamentos, um arquivo por conta e escopo, qualquer que seja o idioma; `sessions.json` guarda a pasta, a versão do mod, o branch, os remotos do GitHub e os links de PR dos prompts de cada sessão ativa, um para todas as contas; `repos.json` guarda a pasta principal de cada repositório do GitHub em que uma sessão foi aberta, para os botões de próximo passo; `style-<hash>.json` guarda a descrição do seu estilo de revisão. Cada arquivo é gravado primeiro em um temporário ao lado e movido para o lugar com `mv`, assim nenhuma sessão lê um arquivo pela metade; onde não há `mv`, como no Windows, ele é gravado diretamente. Lê `actions.json` ali, se você criou um, e nunca o escreve. `autoreview-<hash>.json` guarda a situação de cada PR na revisão automática e o último resultado, e `runs/` as pastas de execução, removidas com `rm -rf` quando uma revisão termina.
- **Lê variáveis de ambiente**: `CLAUDE_CONFIG_DIR`, `HOME` e `USERPROFILE` para achar essa pasta; `GH_REPO` para saber, como o `gh`, o repositório desta sessão; `LC_ALL`, `LC_MESSAGES` e `LANG` só quando `language` é `auto`. Não define nenhuma.
- **Lê as configurações do Claude Code**: a chave `language` só quando `language` é `auto`, e a chave `prefersReducedMotion` só quando `motion` é `auto`.
- **Lê e preenche o seu prompt** só ao abrir e fechar a caixa de revisões: ao abrir, lê o texto que já está no prompt para marcar os PRs que ele já pede; ao fechar, acrescenta os pedidos dos PRs que você adicionou, em novas linhas depois desse texto.

## Como funciona

Todas as suas sessões abertas compartilham uma única busca: uma sessão consulta o GitHub no máximo a cada 10 minutos, e as outras leem o que ela salvou.

Toda sessão aberta do Claude Code executa o mod, mas elas compartilham um único arquivo de cache por conta, escopo e idioma, e o mesmo vale para os PRs ocultos. Cada sessão lê esse arquivo a cada 30 segundos. Só a sessão que o encontra com mais de 10 minutos e ganha uma reserva curta chama o GitHub, então dez sessões abertas fazem uma única requisição. A sessão que está buscando renova a reserva enquanto trabalha; uma reserva que não é renovada por 3 minutos é assumida por outra sessão. Uma busca que falha mantém as últimas listas válidas e é repetida depois de um minuto. `↻` na caixa de revisões busca na hora.

Uma busca GraphQL retorna todos os PRs aguardando sua revisão com o que os cartões precisam, e mais uma requisição, com três buscas, preenche Meus PRs e Atribuições e menções. As referências vêm dos eventos de referência cruzada nos PRs e issues de sua autoria. O GitHub não atualiza o `updatedAt` de um item quando algo o referencia; por isso, os itens atualizados nos últimos 60 dias são verificados em busca de referências feitas nos últimos 30, 50 itens por requisição. Se o GitHub recusar a busca de referências (ele tem um limite de recursos por consulta), as últimas referências são mantidas e as outras abas continuam sendo atualizadas.

`refreshMinutes` muda esses 10 minutos.

## Limites

- No máximo 100 PRs aguardando sua revisão, na ordem de melhor correspondência do GitHub. As outras abas leem até 100 dos seus PRs abertos, 100 issues atribuídas e 100 que mencionam você, e referências de até 500 itens atualizados recentemente, cada lista com a atividade mais recente primeiro. Quando uma lista tem mais que isso, a contagem aparece como `100+`. Cada lista é lida de 25 em 25 (as referências, mais leves, de 100 em 100) e aparece assim que chega, e uma página em que o GitHub estoura o tempo é pedida de novo com metade do tamanho, então uma conta com muitos PRs fica dentro do limite de tempo do GitHub.
- Uma busca salva mostra os 20 resultados atualizados mais recentemente; a contagem é o total que o GitHub dá para a busca.
- A aba Notificações lê até 100 notificações dos últimos 30 dias e não consulta com mais frequência do que o intervalo do GitHub permite.
- Uma referência a um item em que você não mexe há 60 dias passa despercebida.
- `Nova revisão` some com qualquer novo commit no PR, inclusive um feito pelo botão "Update branch" do GitHub ou por um bot.
- Depois de um force-push que reescreveu o commit que você revisou, um PR com revisão solicitada novamente não mostra a linha "Desde a minha última revisão".
- O seu estilo de revisão é aprendido a partir dos PRs que a busca do GitHub retorna para `reviewed-by:@me -author:@me`, dentro do `scope`; por isso, comentários em PRs que você mesmo abriu ficam de fora. Comentários na conversa de um PR, fora de uma revisão, não entram nisso.
- `Rodar CI com falha de novo` só roda de novo o GitHub Actions; verificações de outros serviços de CI são rodadas de novo no próprio site. Não há aprovação de vários PRs de uma vez nem aprovação com comentário.
- A revisão automática revisa o PR como está no GitHub; ela não roda testes nem builds. Uma revisão levada para um commit novo só é movida quando o patch de todos os arquivos é o mesmo, então um rebase sobre uma base que mudou os mesmos arquivos é revisado de novo.
- Uma revisão retida por `autoReviewDaily` também retém a passagem para um commit novo. `rm -rf` só existe em POSIX, então no Windows sem WSL uma pasta de execução fica na pasta de cache.

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
