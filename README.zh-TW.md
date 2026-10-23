# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox) [![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

一個 [Claude Code](https://claude.com/claude-code) mod，讓你寫程式時也能隨時掌握 GitHub 上的工作：等待你審查的 pull request（開啟前就先用淺白的文字摘要好）、你自己開啟中的 PR 與它們收到的審查，以及牽涉到你的議題。

- **輸入框上方的資訊列** — 一行文字，只計算需要你處理的項目：等待你審查的 PR、你的 PR 中待處理的項目，以及指派給你或提及你的議題。顏色代表最久的審查請求已等待多久（3 天起為黃色，14 天起為紅色）。按 `開啟` 會開啟收件匣。 數字減少時會短暫變成綠色。
- **審查收件匣** — `/review-inbox`，分為五個分頁：待審查、我的 PR、我的議題、搜尋和動態。
- **通知** — 你工作時有新動態，就會跳出一則簡短的通知。

![輸入框上方的資訊列，接著是收件匣的三個分頁：待審查、我的 PR 和我的議題](docs/images/en/overview.gif)

介面和摘要支援九種語言，請參閱[語言](#語言)。

## 分頁

每個分頁都會依類別分組顯示卡片。按下類別標題可收合，再按一次即可展開。分頁頂端的 `已隱藏 N · 全部顯示` 只會恢復該分頁中隱藏的卡片。

卡片 `▸ 更多` 裡的 `備註` 可以在標題上方寫一行，用來記下你檢查了什麼，或約定了何時做什麼。按下 `儲存` 後卡片仍會顯示。`延後到明天` 和 `延後到下週` 會把卡片隱藏到明天或下週一上午 9 點；在那之前若有新動態，會立刻重新顯示。新動態是指：待審查 PR 有新的 commit、你的 PR 狀態改變或有新審查、議題有新活動。延後的卡片回來時，會帶著備註跳出通知。`清除` 會刪除備註。

頂端的搜尋框不分分頁，一次搜尋全部內容：儲存庫、編號、標題、作者、內文前 2,000 個字元、摘要和你的備註。已隱藏或已延後的卡片也搜得到，並標示 `已隱藏`。清空搜尋框即可回到分頁。Claude 行動版 App 尚未繪製輸入框，因此在行動裝置上只顯示備註，沒有搜尋和 `備註` 按鈕。

工作階段正在處理的卡片會集中到待審查和我的 PR 分頁頂端的 `工作階段中正在處理`，並顯示該工作階段的資料夾名稱或 `此工作階段`。如果某個工作階段的資料夾在該儲存庫中簽出了我的 PR 的分支，這個 PR 就會出現在這裡；任何卡片只要其 PR 連結出現在某個工作階段的提示中（就像 `審查` 所做的那樣），也會出現在這裡。工作階段關閉或 10 分鐘沒有消息後，卡片會回到原本的分組。

目前工作階段所在儲存庫的卡片會排在每個分組最前面，並標示 `這個儲存庫`。如果分頁中還有其他儲存庫，分頁上方的 `這個儲存庫 N` 和 `全部 N` 可以只看這個儲存庫，或恢復顯示全部；提示列上方的那一行一律統計全部。目前工作階段的儲存庫與 `gh` 的判斷方式相同：有設定 `GH_REPO` 時用它，否則用資料夾的 GitHub 遠端儲存庫。

卡片標題下方會顯示最多兩個標籤（其餘顯示數量）、留言數，以及 PR 指向的不是儲存庫預設分支時的 `→ 分支`。

卡片儲存庫名稱前的 `●` 表示自你上次關閉收件匣以來有更新，就像 GitHub 收件匣標出你上次造訪後變動的內容。第一次關閉之前不會標記任何卡片。

沒有任何需要你處理的事項時（沒有審查請求、沒有需要處理的 PR、沒有指派給你或提到你的議題），收件匣會在分頁上方顯示 `✓ 沒有需要你處理的事項`，提示列上方的那一行維持隱藏。

### 待審查

每個等待你審查的 PR 各顯示為一張卡片，內容包括一句話摘要、這個 PR 的原因、影響範圍、變更規模和作者，以及你的審查已等待多久。有風險的項目，例如 schema 變更或必須遵守的部署順序，會標上 ⚠️。

- 按 `審查` 會把卡片標示為 `已加入`，收件匣維持開啟，讓你可以一次挑選多個 PR。關閉收件匣時（按 Esc 或 ×），每個已加入的 PR 都會產生一則審查請求放進輸入框，並附上需要特別檢查的地方，以及你上次審查後的變更。在你按下 Enter 之前，不會送出任何內容。若輸入框中正在撰寫的內容已經請求審查某個 PR，開啟收件匣時該 PR 會顯示為 `已加入`。
- `▸ 更多` 裡的 `隱藏` 會隱藏該卡片，直到這個 PR 有新的 commit 為止。
- `已重新請求` 表示你審查過的 PR 再次請求你審查，並附上你上次審查後變更內容的簡短摘要。
- 卡片分為直接請求、團隊請求和草稿三組。

![在兩張卡片上按「審查」使其標示為「已加入」，隱藏第三張卡片，再按 Esc 把兩則審查請求放進輸入框](docs/images/en/review.gif)

審查請求中還會附上一行文字，描述你平常的審查方式，讓 Claude 照你的習慣審查。mod 每週一次讀取你最近審查過的至多 30 個 PR 中你自己留下的留言，請 Claude 描述你使用的語言和語氣、你會先看哪些地方，以及你提出要求時的措辭。可供學習的留言少於 5 則時，審查請求不會附上這一行；學習失敗時，會保留上一次的描述，並在一天後重試。

### 我的 PR

列出你開啟中的 PR，顯示狀態而不是摘要，並依你需要處理的順序排列：請求變更、CI 失敗、合併衝突、等待審查（等待最久的在前）、已核准、在合併佇列中、草稿。CI 執行中時，會標示在狀態旁邊。進入合併佇列的 PR 會顯示為 `在合併佇列中`：佇列檢查通過後 GitHub 會合併它，所以提示列上方的那一行不計入它，也不會顯示 `可以合併`。

`隱藏` 會隱藏 PR，直到它的狀態改變或有人新提交審查；僅僅你自己推送新的 commit 不會讓它重新出現。

![我的 PR：從請求變更到草稿共六個 PR，其中兩個有新審查](docs/images/en/my-prs.png)

在你最新一次 commit 之後提交的審查，會顯示為 `新審查` 並附上審查者，直到你再次 commit 為止。核准、請求變更和只有留言的審查都算在內，包括討論串中的回覆，不論來自真人或機器人；已撤銷（dismissed）的審查則不算。這樣的 PR 會算作待處理，並排在同一狀態中沒有新動態的 PR 前面。不會呼叫模型。

輪到你處理的 PR（請求變更、CI 失敗或合併衝突）會有一個下一步按鈕：`處理留言`、`修正 CI` 或 `解決衝突`。按鈕旁會顯示 Claude 將要工作的資料夾：目前工作階段位於該儲存庫的複本中時顯示 `這個資料夾`，有工作階段曾在該儲存庫中執行時顯示那個資料夾，否則顯示 `沒有本機複本`。按鈕會像 `審查` 一樣加入卡片。關閉收件匣時，請求會寫明這一步以及讀取留言或失敗記錄的 `gh` 指令，並要求 Claude 在新的 worktree 中工作，不動那個資料夾的分支。沒有已知資料夾時，Claude 會問你複本在哪裡，或建議 `gh repo clone` 並等你同意。不會增加 GitHub 呼叫，也不會呼叫模型。

### 我的議題

列出指派給你的開啟中議題，以及提及你的開啟中議題和 PR；同時符合兩者的項目只會顯示一次，歸為「指派給我」。下方列出最近 30 天內引用了你的議題或 PR 的其他議題和 PR，並註明是誰引用的。你自己建立的引用不會列出，而且只顯示最新的 20 筆。不會呼叫模型。

項目分為指派、提及和引用三組。`隱藏` 會隱藏項目，直到它有新的動態。

![我的議題：指派給你的議題、提及你的項目，以及其他地方對你工作的引用](docs/images/en/my-issues.png)

指派給你的議題會有一個運作方式相同的 `開始處理` 按鈕：Claude 會閱讀議題、規劃變更，並在新 worktree 的新分支上開始。

### 搜尋

你自己定義的每個搜尋都會成為一個區段，顯示結果數量和最近更新的 20 項。點擊標題會在 GitHub 上開啟那個 PR 或議題，`在 GitHub 上還有 N 個` 會在 GitHub 上開啟同一個搜尋。和 GitHub 自己的 PR 收件匣一樣，內建了三個：`與我相關的 PR`（我參與但不是我建立的開啟中 PR）、`我審查過且仍開啟的 PR` 和 `我建立的開啟議題`。點擊區段標題可以收合。每次重新整理時搜尋三個一組地執行；失敗的搜尋只顯示原因，不影響其他搜尋。不呼叫模型。

自己的搜尋新增到與卡片按鈕相同的 `actions.json` 的 `groups` 中；`/review-inbox add-search` 會讓 Claude 和你一起寫一個。

```json
{
  "groups": [
    { "id": "team", "name": "團隊 PR", "query": "org:acme is:open label:urgent", "scope": "prs", "countInBand": true },
    { "id": "reviewed-by-me", "hidden": true }
  ]
}
```

`query` 使用 GitHub 搜尋語法。`scope` 為 `prs` 或 `issues`：查詢沒有寫明類型時會加上 `is:pr` 或 `is:issue`；查詢沒有自己的 `sort:` 時會加上 `sort:updated-desc`。`scope` 設定和 `這個儲存庫` 按鈕不會縮小這些搜尋，需要時請直接在查詢裡寫 `org:` 或 `repo:`。`"countInBand": true` 會把該群組的數量以 `搜尋 N` 加到提示列上方的那一行。與內建群組 id 相同的群組會取代它，`"hidden": true` 會移除它。缺少欄位或 scope 不正確的項目會被略過，收件匣底部會顯示警告，`/review-inbox buttons` 會列出原因。只搜尋前 15 個群組。

### 動態

依從新到舊顯示其他分頁尚未顯示的 GitHub 通知：你建立或參與的討論串中的留言、狀態變更和新動態，團隊被提及以及安全性警示。審查請求、指派和提及不在這裡，PR 或議題已經是卡片的討論串也不在這裡。未讀的討論串標有 `●`，只要有一個未讀，分頁名稱上也會顯示 `●`。讀取最近 30 天的通知，最多 100 則。

按下 `完成` 或 `取消訂閱` 後，該列會立即消失，原處顯示 `已完成 · 復原` 或 `已取消訂閱 · 復原` 10 秒；在此之前關閉收件匣會立即送出。之後 `完成` 會像 GitHub 收件匣一樣把討論串標為完成，`取消訂閱` 還會停止該討論串的通知，直到有人提及你或你留言。標為完成的討論串有新動態時會再次出現。如果失敗，該列會連同原因回來。不呼叫模型。

GitHub 只向 gh 本身的登入和傳統權杖提供通知。沒有權限時，分頁會說明這點並提供方法（`gh auth login` 或 `gh auth refresh -s notifications`）。

### 通知

以下情況會跳出通知：新的審查請求、你的 PR 有新審查、你的 PR 變成請求變更、CI 失敗或合併衝突，以及新的指派、提及或引用。工作階段第一次讀取時不會發出任何通知。同時有多則通知時，會依序逐一顯示，間隔 4.5 秒。

你的 PR 獲得核准且沒有正在執行的 CI 時，會提示一次 `可以合併`。

![輸入框下方依序出現三則通知：新的審查請求、你的 PR 被請求變更，以及新的提及](docs/images/en/toasts.gif)

### 卡片按鈕

點選卡片上的 `▸ 更多` 會開啟 `備註` 和 `隱藏`，以及一排按鈕，每個按鈕都會帶著預設的請求把卡片交給 Claude：審查請求上有 `摘要風險`、`說明變更` 和 `草擬核准留言`，你的 PR 上有 `草擬給審查者的回覆` 和 `調查 CI 失敗`。按鈕會像 `審查` 一樣加入卡片，關閉收件匣時請求會進入你的輸入框。在你按下 Enter 之前，不會執行或發布任何內容。

可以在快取資料夾的 `actions.json` 中加入自己的按鈕。`/review-inbox buttons` 會顯示它的路徑、內容和被略過的項目，`/review-inbox add-button` 會讓 Claude 和你一起寫一個。

```json
{
  "buttons": [
    { "id": "test-plan", "name": "測試計畫", "scope": "review", "prompt": "在 {{.RepoPath}} 中為 {{.PrUrl}} 寫一份測試計畫。" },
    { "id": "draft-approval", "scope": "review", "hidden": true }
  ]
}
```

`scope` 是 `review`、`pr` 或 `issue`。prompt 中可以像 gh-dash 一樣以 `{{.Name}}`, `{{Name}}`, `{{ .Name }}` 的形式使用 `RepoName`, `RepoPath`, `PrNumber`, `PrUrl`, `PrTitle`, `Author`, `HeadRefName`, `BaseRefName`, `IssueNumber`, `IssueTitle`, `IssueUrl`；卡片沒有值的變數會留空。與內建按鈕 id 相同的按鈕會取代它，`"hidden": true` 會移除它。缺少欄位、scope 或變數名稱未知的項目會被略過，收件匣底部會顯示警告，`/review-inbox buttons` 會列出原因；其餘按鈕照常運作。`PrTitle` 和 `Author` 原樣來自 GitHub，所以使用它們的 prompt 會把別人寫的文字交給 Claude。

### 直接寫入 GitHub

把 `directActions` 設為 `on` 後，卡片上會多出直接寫入 GitHub 的按鈕，以你的 `gh` 帳號送出。

- 審查請求上有 `核准`，你的草稿 PR 上有 `標記為可審查`，基礎分支已經前進的你的 PR 上有 `更新分支`。這些動作別人看得到，也無法撤回，所以第一次按下時，按鈕那一列會變成一行說明：要送出什麼、以哪個帳號送出，例如 `核准 o/r#5 "Fix login"，身分 kim —（無留言）`。按 `確認核准`，或在收件匣接收按鍵時按 `y`，才會送出；按 `取消` 或等 10 秒，按鈕就會回來。焦點會移到 `取消`，第一次按下後 300ms 內的確認會被忽略，所以按住 Enter 也不會送出。
- 核准不附留言，並指定你看過的那個提交。如果之後有了新的提交，就不送出，並在卡片上說明。`更新分支` 會合併基礎分支，從不 rebase。
- 檢查失敗的你的 PR 上，`重新執行失敗的 CI` 會重新執行最新提交上 GitHub Actions 執行中失敗的工作。提到你的 issue 上，`指派給我` 會立即送出，並在 10 秒內顯示 `復原`。
- 失敗的寫入會和 GitHub 的訊息一起留在卡片上，按鈕也會回來。

不會直接合併。已核准且沒有正在執行的檢查的你的 PR，即使 `directActions` 關閉，也會有 `合併` 按鈕：按下後，提示列會加入一則請求，讓 Claude 先確認儲存庫允許的合併方式再執行 `gh pr merge`；你按 Enter 送出後，Claude Code 會請求執行權限。

## 系統需求

- Claude Code 2.1.287 或更新版本，也就是最早支援 mod（function-hook 外掛）的版本。已在 2.1.292 上測試。mod 目前仍處於搶先體驗（early access）階段，API 可能在不同版本之間變更。
- [GitHub CLI](https://cli.github.com/)（`gh`）必須在你的 `PATH` 中，並已登入（`gh auth login`）可存取你要審查之儲存庫的帳號。
- GitHub Enterprise Server：在啟動 Claude Code 的環境中設定 `GH_HOST`，所有 `gh` 呼叫都會送往該主機。

## 安裝

在 Claude Code 工作階段的輸入框中執行：

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

安裝畫面會詢問下方的選項，全部都可以留空或維持預設值。

### 更新與解除安裝

```sh
claude plugin marketplace update review-inbox
claude plugin update review-inbox@review-inbox
claude plugin uninstall review-inbox@review-inbox
```

更新會在重新啟動後生效。解除安裝後，mod 的快取資料夾 `~/.claude/plugins/data/review-inbox` 仍會保留；若要移除快取的清單和摘要，請自行刪除。各版本的變更內容請見[變更記錄](CHANGELOG.md)。

## 設定

在安裝畫面設定，之後可在 `/config` 中修改。修改會立即生效。

| 選項 | 預設值 | 用途 |
| --- | --- | --- |
| `scope` | 空白 | 加在每次搜尋（`review-requested:@me`、`author:@me`、`assignee:@me`、`mentions:@me`）上的 GitHub 搜尋限定詞。空白表示搜尋整個 GitHub。 |
| `githubUser` | 空白 | 登入多個帳號時要使用的 `gh` 帳號（`gh auth token -u <user>`）。空白則使用目前作用中的帳號。 |
| `language` | `auto` | `auto`，或[語言](#語言)中列出的代碼之一。 |
| `refreshMinutes` | `10` | 從 GitHub 重新取得的間隔（分鐘）：5、10、15、30 或 60。所有工作階段共用一次取得。 |
| `repoPaths` | 空白 | 下一步按鈕為每個儲存庫讓 Claude 工作的資料夾。見下文。 |
| `motion` | `auto` | 設為 `off` 時，提示列上方那一行的數字不再閃爍。設為 `auto` 時，如果 Claude Code 的減少動態效果設定（`prefersReducedMotion`）已開啟，也不閃爍。 |
| `directActions` | `off` | 設為 `on` 時，卡片上會有直接寫入 GitHub 的按鈕。詳見上方的「直接寫入 GitHub」。 |

`scope` 可以填入 GitHub [議題與 PR 搜尋](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)接受的任何條件：

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

重複使用 `org:`、`repo:` 和 `user:` 限定詞時，符合其中任何一個即可。依照 GitHub 對 `review-requested:@me` 的定義，送給團隊的審查請求也算是給你的請求。

`repoPaths` 以逗號分隔多個 `owner/repo=路徑`。`owner/*=路徑/*` 適用於該 owner 的所有儲存庫，路徑中的 `*` 代表儲存庫名稱；完整名稱優先於萬用字元，`~` 是家目錄。這裡指定的資料夾優先於工作階段自己的資料夾和 mod 記住的資料夾。

```text
my-org/*=~/code/*
my-org/legacy=~/old/legacy-app
```

## 語言

資訊列、收件匣、通知、放進輸入框的審查請求，以及模型撰寫的摘要和審查風格描述，全都使用同一種語言。

| 代碼 | 語言 |
| --- | --- |
| `en` | 英文 (English) |
| `ko` | 韓文 (한국어) |
| `ja` | 日文 (日本語) |
| `zh-CN` | 簡體中文 (简体中文) |
| `zh-TW` | 繁體中文 |
| `es` | 西班牙文 (Español) |
| `pt-BR` | 巴西葡萄牙文 (Português do Brasil) |
| `de` | 德文 (Deutsch) |
| `fr` | 法文 (Français) |

- 指定代碼時，就使用該語言。
- `auto`（預設值）會依照 Claude Code 本身的 `language` 設定，前提是該設定以代碼、英文名稱或該語言自己的名稱（`ja-JP`、`Japanese`、`日本語`）指向上述其中一種語言。否則依照系統地區設定（依序為 `LC_ALL`、`LC_MESSAGES`、`LANG`），再不然就使用英文。中文一律視為簡體中文，除非標示為台灣、香港、澳門或繁體（`zh-TW`、`zh-Hant`、`繁體中文`）；葡萄牙文則視為巴西葡萄牙文。

摘要和審查風格描述會依語言分別快取，因此切換語言後，每份摘要和該描述都會用新語言再產生一次。其他任何語言都會改用英文。

英文和韓文以外的語言是用 Claude 翻譯的，尚未經過母語人士檢查；這份 README 也是用同樣的方式翻譯。歡迎透過議題或 pull request 提出修正：每種語言都是 [`hooks/locales/`](hooks/locales/) 中的一個檔案，而其他所有語言都依循的英文對照表位於 [`hooks/i18n.ts`](hooks/i18n.ts)。

## 讀取與執行的內容

這個 mod 只透過你自己的 `gh` 存取 GitHub；它會把 PR 的文字送給 Claude 撰寫摘要，並每週一次把你自己的審查留言送給 Claude 描述你的風格；它只會寫入自己的快取資料夾。以下逐項列出它存取的內容和原因，與 `claude plugin validate .` 為這個 mod 列出的項目一致。

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **執行 `gh`**：以 `gh api graphql` 取得清單，並每週一次取得你最近的審查留言；對已重新請求審查的 PR 執行 `gh api repos/<owner>/<repo>/compare/<from>...<to>`；設定了 `githubUser` 時執行 `gh auth token -u <githubUser>`。動態分頁執行 `gh api notifications`；按下 `完成` 或 `取消訂閱` 時執行 `gh api -X DELETE notifications/threads/<id>`（取消訂閱時先加上 `/subscription`）。`directActions` 為 `on` 時，按下按鈕會先執行 `gh api user` 取得帳號名稱、`gh api repos/<owner>/<repo>/pulls/<n>` 讀取最新提交，再執行 `gh api -X POST …/pulls/<n>/reviews`（`event=APPROVE`、`commit_id`）、`gh pr ready`、`gh api -X PUT …/pulls/<n>/update-branch`、`gh api …/actions/runs?head_sha=<sha>&status=failure` 加 `gh api -X POST …/actions/runs/<id>/rerun-failed-jobs`，或 `gh api -X POST`/`-X DELETE …/issues/<n>/assignees` 之一。除此之外，mod 本身不會發出任何網路請求。
- **執行 `git`**：每 30 秒在工作階段資料夾中執行 `git branch --show-current` 和 `git remote -v`，以找到位於你的 PR 分支上的工作階段；並執行 `git rev-parse --path-format=absolute --git-common-dir`，以記住該儲存庫的主資料夾。
- **詢問 Claude**（`sonnet` 模型）：為每份摘要傳送 PR 的儲存庫名稱、標題、說明（前 12,000 個字元）、變更的檔案路徑（最多 80 個）和變更規模；若是已重新請求審查的 PR，還會傳送你上次審查後每個 commit 訊息的第一行，以及最多 60 個檔案路徑。這會計入你的 Claude Code 用量。每個 PR 在每個 head commit 和語言下只摘要一次；摘要失敗時，每個 commit 最多嘗試三次。此外，每週一次會傳送你在最近審查過的至多 30 個 PR 上留下的審查留言，用來描述你的審查風格：每則截至 500 個字元，最多 60 則，總計不超過 12,000 個字元；少於 5 則時不會傳送任何內容。
- **寫入檔案**：只寫入快取資料夾 `~/.claude/plugins/data/review-inbox`（設定了 `CLAUDE_CONFIG_DIR` 時，會以它取代 `~/.claude`）。`inbox-<hash>.json` 存放清單和摘要；`hidden-<hash>.json` 存放已隱藏的 PR；`notes-<hash>.json` 存放備註和延後（與語言無關，每個帳號和範圍一個檔案）；`sessions.json` 存放每個活動工作階段的資料夾名稱、分支、GitHub 遠端儲存庫和提示中出現的 PR 連結（與帳號無關，一個檔案）； `repos.json` 存放工作階段執行過的每個 GitHub 儲存庫的主資料夾（供下一步按鈕使用）； `style-<hash>.json` 存放你的審查風格描述。每個檔案會先寫入旁邊的暫存檔，再用 `mv` 取代，因此其他工作階段不會讀到寫到一半的檔案；在沒有 `mv` 的環境（如 Windows）則直接寫入。如果你建立了 `actions.json`，只會從那裡讀取，從不寫入。
- **讀取環境變數**：讀取 `CLAUDE_CONFIG_DIR`、`HOME` 和 `USERPROFILE` 來找到該資料夾；像 `gh` 一樣讀取 `GH_REPO` 來確定目前工作階段的儲存庫；只有 `language` 為 `auto` 時才讀取 `LC_ALL`、`LC_MESSAGES` 和 `LANG`。不設定任何環境變數。
- **讀取 Claude Code 設定**：只有 `language` 為 `auto` 時才讀取 `language` 鍵，只有 `motion` 為 `auto` 時才讀取 `prefersReducedMotion` 鍵。
- **讀取並填入輸入框**：只在收件匣開啟和關閉時進行。開啟時會讀取輸入框中正在撰寫的內容，標示出其中已請求審查的 PR；關閉時會在原有內容之後另起新行，加入你所加入 PR 的審查請求。

## 運作方式

所有開啟中的工作階段共用同一次擷取的結果：最多每 10 分鐘由一個工作階段向 GitHub 查詢一次，其他工作階段則讀取它儲存的結果。

每個開啟中的 Claude Code 工作階段都會執行這個 mod，但同一組帳號、scope 和語言只共用一個快取檔案，已隱藏的 PR 也是如此。每個工作階段每 30 秒讀取一次這個檔案。只有發現檔案已超過 10 分鐘、並搶到短暫佔用權（claim）的工作階段會呼叫 GitHub，所以即使開了十個工作階段，也只會發出一次請求。負責擷取的工作階段在作業期間會持續更新佔用權；超過 3 分鐘未更新的佔用權會被其他工作階段接手。擷取失敗時會保留上一次成功取得的清單，並在 1 分鐘後重試。在收件匣中按 `↻` 會立即擷取。

一次 GraphQL 搜尋就能取得所有等待你審查的 PR 和卡片所需的資訊，另一個包含三項搜尋的請求則負責填入「我的 PR」和「我的議題」。引用來自你建立的 PR 和議題上的交叉引用（cross-reference）事件。項目被引用時，GitHub 不會更新該項目的 `updatedAt`，因此會在最近 60 天內有更新的項目中，找出最近 30 天內的引用，每個請求檢查 50 個項目。若 GitHub 拒絕引用搜尋（每個查詢都有資源上限），會保留上一次的引用結果，其他分頁仍會照常更新。

`refreshMinutes` 可以修改這 10 分鐘。

## 限制

- 等待你審查的 PR 最多 100 個，依 GitHub 的最佳符合（best match）順序排列。其他分頁最多讀取你開啟中的 PR 100 個、指派給你的議題 100 個、提及你的議題 100 個，以及最多 500 個最近有更新的項目上的引用，各自依最新活動排序。 超過這些數量時，計數會顯示為 `100+`。 每個清單每次讀取 25 個；GitHub 逾時的那一頁會以一半的大小重新請求，因此 PR 很多的帳號也不會超出 GitHub 的時間限制。
- 搜尋群組只顯示最近更新的 20 項；數量是 GitHub 給出的該搜尋的總數。
- 動態分頁讀取最近 30 天的通知，最多 100 則，且不會比 GitHub 規定的輪詢間隔更頻繁地查詢。
- 若被引用的是你超過 60 天沒有更新的項目，這筆引用會被漏掉。
- PR 只要有任何新的 commit，`新審查` 就會消失，包括透過 GitHub 的「Update branch」按鈕或由機器人建立的 commit。
- 若 force push 改寫了你審查過的 commit，已重新請求審查的 PR 不會顯示「我上次審查後的變更」這一行。
- 你的審查風格只從 GitHub 搜尋 `reviewed-by:@me -author:@me` 在 `scope` 範圍內回傳的 PR 中學習，因此你在自己建立的 PR 上的留言不包含在內。在 PR 對話中、不屬於任何審查的留言不包含在內。
- `重新執行失敗的 CI` 只重新執行 GitHub Actions；其他 CI 服務的檢查請到該服務重新執行。不提供一次核准多個 PR，也不提供附留言的核准。

## 疑難排解

- **收件匣顯示 `gh` 錯誤。** 執行 `gh auth status`。若登入了多個帳號，請設定 `githubUser`。mod 每分鐘會重試一次。
- **資訊列沒有出現。** 只有在有事項需要你處理時才會顯示；數量為 0 的項目不會顯示。
- **語言不是你預期的語言。** 在 `/config` 中把 `language` 設為某個語言代碼，而不是 `auto`。
- **其他問題。** 用 `claude --debug` 啟動 Claude Code；這個 mod 輸出的記錄都以 `review-inbox:` 開頭。

## 開發

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin validate` 和 `claude plugin test` 不需要登入，CI 會在經過測試的 Claude Code 版本上執行這兩者。`tsconfig.json` 繼承 `.claude-plugin/types/tsconfig.json`，這個檔案是 Claude Code 第一次從這個資料夾載入 mod 時產生的（並由 `.gitignore` 排除），因此在用 `tsc -p .` 進行型別檢查之前，請先執行一次 `claude --plugin-dir .`。

## 支持

如果 Review Inbox 幫你省下了時間，歡迎[請我喝杯咖啡](https://ko-fi.com/riversound) ☕ —— 這能讓專案持續前進。謝謝！

<a href="https://ko-fi.com/riversound"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" height="36"></a>

## 授權

[MIT](LICENSE)
