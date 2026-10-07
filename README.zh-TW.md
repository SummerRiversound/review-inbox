# Review Inbox

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

一個 [Claude Code](https://claude.com/claude-code) mod，讓你寫程式時也能隨時掌握 GitHub 上的工作：等待你審查的 pull request（開啟前就先用淺白的文字摘要好）、你自己開啟中的 PR 與它們收到的審查，以及牽涉到你的議題。

- **輸入框上方的資訊列** — 一行文字，只計算需要你處理的項目：等待你審查的 PR、你的 PR 中待處理的項目，以及指派給你或提及你的議題。顏色代表最久的審查請求已等待多久（3 天起為黃色，14 天起為紅色）。按 `開啟` 會開啟收件匣。
- **審查收件匣** — `/review-inbox`，分為三個分頁：待審查、我的 PR 和我的議題。
- **通知** — 你工作時有新動態，就會跳出一則簡短的通知。

![輸入框上方的資訊列，接著是收件匣的三個分頁：待審查、我的 PR 和我的議題](docs/images/en/overview.gif)

介面和摘要支援九種語言，請參閱[語言](#語言)。

## 分頁

### 待審查

每個等待你審查的 PR 各顯示為一張卡片，內容包括一句話摘要、這個 PR 的原因、影響範圍、變更規模和作者，以及你的審查已等待多久。有風險的項目，例如 schema 變更或必須遵守的部署順序，會標上 ⚠️。

- 按 `審查` 會把卡片標示為 `已加入`，收件匣維持開啟，讓你可以一次挑選多個 PR。關閉收件匣時（按 Esc 或 ×），每個已加入的 PR 都會產生一則審查請求放進輸入框，並附上需要特別檢查的地方，以及你上次審查後的變更。在你按下 Enter 之前，不會送出任何內容。若輸入框中正在撰寫的內容已經請求審查某個 PR，開啟收件匣時該 PR 會顯示為 `已加入`。
- `隱藏` 會隱藏該卡片，直到這個 PR 有新的 commit 為止。
- `已重新請求` 表示你審查過的 PR 再次請求你審查，並附上你上次審查後變更內容的簡短摘要。
- 直接請求排在團隊請求之前。草稿會另外列出。

![在兩張卡片上按「審查」使其標示為「已加入」，隱藏第三張卡片，再按 Esc 把兩則審查請求放進輸入框](docs/images/en/review.gif)

審查請求中還會附上一行文字，描述你平常的審查方式，讓 Claude 照你的習慣審查。mod 每週一次讀取你最近審查過的至多 30 個 PR 中你自己留下的留言，請 Claude 描述你使用的語言和語氣、你會先看哪些地方，以及你提出要求時的措辭。可供學習的留言少於 5 則時，審查請求不會附上這一行；學習失敗時，會保留上一次的描述，並在一天後重試。

### 我的 PR

列出你開啟中的 PR，顯示狀態而不是摘要，並依你需要處理的順序排列：請求變更、CI 失敗、合併衝突、等待審查（等待最久的在前）、已核准、草稿。CI 執行中時，會標示在狀態旁邊。

![我的 PR：從請求變更到草稿共六個 PR，其中兩個有新審查](docs/images/en/my-prs.png)

在你最新一次 commit 之後提交的審查，會顯示為 `新審查` 並附上審查者，直到你再次 commit 為止。核准、請求變更和只有留言的審查都算在內，包括討論串中的回覆，不論來自真人或機器人；已撤銷（dismissed）的審查則不算。這樣的 PR 會算作待處理，並排在同一狀態中沒有新動態的 PR 前面。不會呼叫模型。

### 我的議題

列出指派給你的開啟中議題，以及提及你的開啟中議題和 PR；同時符合兩者的項目只會顯示一次，歸為「指派給我」。下方列出最近 30 天內引用了你的議題或 PR 的其他議題和 PR，並註明是誰引用的。你自己建立的引用不會列出，而且只顯示最新的 20 筆。不會呼叫模型。

![我的議題：指派給你的議題、提及你的項目，以及其他地方對你工作的引用](docs/images/en/my-issues.png)

### 通知

以下情況會跳出通知：新的審查請求、你的 PR 有新審查、你的 PR 變成請求變更、CI 失敗或合併衝突，以及新的指派、提及或引用。工作階段第一次讀取時不會發出任何通知。同時有多則通知時，會依序逐一顯示，間隔 4.5 秒。

![輸入框下方依序出現三則通知：新的審查請求、你的 PR 被請求變更，以及新的提及](docs/images/en/toasts.gif)

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

`scope` 可以填入 GitHub [議題與 PR 搜尋](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)接受的任何條件：

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

重複使用 `org:`、`repo:` 和 `user:` 限定詞時，符合其中任何一個即可。依照 GitHub 對 `review-requested:@me` 的定義，送給團隊的審查請求也算是給你的請求。

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

- **執行 `gh`**：以 `gh api graphql` 取得清單，並每週一次取得你最近的審查留言；對已重新請求審查的 PR 執行 `gh api repos/<owner>/<repo>/compare/<from>...<to>`；設定了 `githubUser` 時執行 `gh auth token -u <githubUser>`。除此之外，mod 本身不會發出任何網路請求。
- **詢問 Claude**（`sonnet` 模型）：為每份摘要傳送 PR 的儲存庫名稱、標題、說明（前 12,000 個字元）、變更的檔案路徑（最多 80 個）和變更規模；若是已重新請求審查的 PR，還會傳送你上次審查後每個 commit 訊息的第一行，以及最多 60 個檔案路徑。這會計入你的 Claude Code 用量。每個 PR 在每個 head commit 和語言下只摘要一次；摘要失敗時，每個 commit 最多嘗試三次。此外，每週一次會傳送你在最近審查過的至多 30 個 PR 上留下的審查留言，用來描述你的審查風格：每則截至 500 個字元，最多 60 則，總計不超過 12,000 個字元；少於 5 則時不會傳送任何內容。
- **寫入檔案**：只寫入快取資料夾 `~/.claude/plugins/data/review-inbox`（設定了 `CLAUDE_CONFIG_DIR` 時，會以它取代 `~/.claude`）。`inbox-<hash>.json` 存放清單和摘要；`hidden-<hash>.json` 存放已隱藏的 PR；`style-<hash>.json` 存放你的審查風格描述。
- **讀取環境變數**：讀取 `CLAUDE_CONFIG_DIR`、`HOME` 和 `USERPROFILE` 來找到該資料夾；只有在 `language` 為 `auto` 時才讀取 `LC_ALL`、`LC_MESSAGES` 和 `LANG`。不會設定任何環境變數。
- **讀取 Claude Code 設定**：只在 `language` 為 `auto` 時讀取，而且只使用 `language` 這個鍵。
- **讀取並填入輸入框**：只在收件匣開啟和關閉時進行。開啟時會讀取輸入框中正在撰寫的內容，標示出其中已請求審查的 PR；關閉時會在原有內容之後另起新行，加入你所加入 PR 的審查請求。

## 運作方式

所有開啟中的工作階段共用同一次擷取的結果：最多每 10 分鐘由一個工作階段向 GitHub 查詢一次，其他工作階段則讀取它儲存的結果。

每個開啟中的 Claude Code 工作階段都會執行這個 mod，但同一組帳號、scope 和語言只共用一個快取檔案，已隱藏的 PR 也是如此。每個工作階段每 30 秒讀取一次這個檔案。只有發現檔案已超過 10 分鐘、並搶到短暫佔用權（claim）的工作階段會呼叫 GitHub，所以即使開了十個工作階段，也只會發出一次請求。負責擷取的工作階段在作業期間會持續更新佔用權；超過 3 分鐘未更新的佔用權會被其他工作階段接手。擷取失敗時會保留上一次成功取得的清單，並在 1 分鐘後重試。在收件匣中按 `↻` 會立即擷取。

一次 GraphQL 搜尋就能取得所有等待你審查的 PR 和卡片所需的資訊，另一個包含三項搜尋的請求則負責填入「我的 PR」和「我的議題」。引用來自你建立的 PR 和議題上的交叉引用（cross-reference）事件。項目被引用時，GitHub 不會更新該項目的 `updatedAt`，因此會在最近 60 天內有更新的項目中，找出最近 30 天內的引用，每個請求檢查 50 個項目。若 GitHub 拒絕引用搜尋（每個查詢都有資源上限），會保留上一次的引用結果，其他分頁仍會照常更新。

## 限制

- 等待你審查的 PR 最多 100 個，依 GitHub 的最佳符合（best match）順序排列。其他分頁最多讀取你開啟中的 PR 100 個、指派給你的議題 50 個、提及你的議題 50 個，以及最多 500 個最近有更新的項目上的引用，各自依最新活動排序。
- 若被引用的是你超過 60 天沒有更新的項目，這筆引用會被漏掉。
- PR 只要有任何新的 commit，`新審查` 就會消失，包括透過 GitHub 的「Update branch」按鈕或由機器人建立的 commit。
- 若 force push 改寫了你審查過的 commit，已重新請求審查的 PR 不會顯示「我上次審查後的變更」這一行。
- 你的審查風格只從 GitHub 搜尋 `reviewed-by:@me -author:@me` 在 `scope` 範圍內回傳的 PR 中學習，因此你在自己建立的 PR 上的留言不包含在內。在 PR 對話中、不屬於任何審查的留言不包含在內。

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

## 授權

[MIT](LICENSE)
