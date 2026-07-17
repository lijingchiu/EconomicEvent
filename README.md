# Macro Pulse EconomicEvent

Macro Pulse 是部署在 Cloudflare Workers + D1 的美國經濟事件系統。它從七個官方來源同步發布時間，對可量化事件回填官方 `Actual` / `Prior`，提供雙語管理介面、公開 JSON / ICS、PWA 離線檢視，以及可靠的多頻道提醒。

本專案不猜測數字：`Actual` 與 `Prior` 只採官方資料；`Forecast` 是市場共識，沒有可信且已設定的來源時保持未提供。演說、會議紀要與記者會等非量化事件會明確顯示為不適用。

## v2 功能

- 七個官方排程來源：BLS、BEA、Federal Reserve、EIA、U.S. Census、ISM、University of Michigan。
- 官方值回填與修訂歷史：包含資料期、來源、版本與衍生的前值變化。
- 事件生命週期：已排程、已公布、等待數值、數值可用、已修訂、已改期、已取消、來源異常。
- Discord、Telegram、Slack、LINE、Email gateway、Web Push gateway 六種通知 adapter。
- D1 outbox、冪等鍵、重試退避、逾期淘汰、安靜時段、每日摘要與來源健康警告。
- 中英文切換、亮色／暗色／跟隨系統、清單／月曆、收藏、儲存檢視、事件詳情與來源紀錄。
- 低頻設定集中在頂部 `CONTROL CENTER` 動畫抽屜，主畫面保留閱讀與篩選功能。
- Cloudflare Access JWT、`ADMIN_TOKEN` 備援、簽章 HttpOnly session cookie、來源檢查與稽核紀錄。
- 公開事件 API、單筆事件與修訂歷史、ICS 訂閱、PWA manifest 與 service worker。

Mac Widget / 原生 Mac App 不在本版本範圍。

## 資料流程

```text
Official schedules / APIs / release pages
                  |
             provider adapters
                  |
       normalized EconomicEvent records
                  |
      Cloudflare D1 + value history
                  |
        notification outbox / public API
                  |
 Discord / Telegram / Slack / LINE / Email / Push gateway
```

所有時間在資料庫中使用 UTC；顯示與每日摘要依 `APP_TIMEZONE` 轉換。排程同步與值刷新彼此獨立，單一來源失敗不會中止其他來源。

## 官方來源與數值支援

| Provider | 排程來源 | Actual / Prior |
| --- | --- | --- |
| BLS | 官方 ICS，月曆 HTML 備援 | CPI、Core CPI、PPI、NFP、失業率、JOLTS、ECI、非農生產力、單位勞動成本；官方 API，`BLS_API_KEY` 選填 |
| BEA | 官方 release dates JSON | GDP、Core PCE、Personal Income、Personal Spending；需要免費 `BEA_API_KEY` |
| Federal Reserve | 官方月曆與演說頁 | 利率決策使用官方 FRED target-rate series；文字事件不硬填數值 |
| EIA | WPSR / WNGSR 官方排程 | 原油、汽油、蒸餾油庫存變化與天然氣庫存變化；WPSR CSV 被拒時改用官方庫存歷史推導，不使用第三方 |
| U.S. Census | 官方 Economic Indicators calendar | Retail Sales、Durable Goods、Building Permits、Housing Starts 官方發布頁 |
| ISM | 官方 Report On Business calendar | Manufacturing / Services PMI 官方月報 |
| University of Michigan | 官方 Surveys of Consumers schedule | Preliminary / Final Consumer Sentiment 官方結果頁 |

值刷新會先從 D1 中同名的上一期官方 Actual 補 Prior，再查官方來源。這讓未來事件在尚未公布 Actual 時仍能顯示最近一期 Prior。

## 本機開發

需求：Node.js 20 以上、npm、可使用 Cloudflare Wrangler 的帳號。

```bash
npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply us-economic-events --local
npm run dev
```

在 `.dev.vars` 至少設定一個長且不可猜測的 `ADMIN_TOKEN`。通知憑證皆選填；只有完整設定憑證的頻道才會出現在可啟用狀態。

驗證：

```bash
npm run typecheck
npm test
npm run build
```

`npm run build` 只執行 `wrangler deploy --dry-run`，不會部署。

## D1 遷移

依序套用 `migrations/0001` 到 `0006`：

- `0001`：事件、舊版 Discord delivery、同步與來源健康。
- `0002`：可由控制中心覆寫的 app settings。
- `0003`：Actual / Forecast / Prior 與細分量化事件。
- `0004`：生命週期、值／排程歷史、排程鎖、稽核、偏好、收藏、saved views、多頻道 outbox。
- `0005`：Web Push subscription 儲存、來源快照、排除規則、每日摘要紀錄。
- `0006`：移除已拆分成 ECI、生產力與單位勞動成本的舊版 BLS 粗粒度事件。

```bash
npx wrangler d1 migrations apply us-economic-events --local
npx wrangler d1 migrations apply us-economic-events --remote
```

正式套用 migration 前應先匯出 D1 備份。

## 正式環境憑證

管理驗證至少設定：

```bash
npx wrangler secret put ADMIN_TOKEN
```

建議再以 Cloudflare Access 保護 Worker，並設定：

```bash
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
npx wrangler secret put CF_ACCESS_AUD
```

資料 API key：

```bash
npx wrangler secret put BLS_API_KEY
npx wrangler secret put BEA_API_KEY
```

通知頻道依需求設定完整的一組：

| Channel | Secrets |
| --- | --- |
| Discord | `DISCORD_WEBHOOK_URL` |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Slack | `SLACK_WEBHOOK_URL` |
| LINE | `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_USER_ID` |
| Email gateway | `EMAIL_API_URL`, `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_TO` |
| Web Push gateway | `WEB_PUSH_GATEWAY_URL`, `WEB_PUSH_API_KEY` |

Email 與 Web Push 採可替換的 HTTPS JSON gateway。Web Push gateway 不是瀏覽器 VAPID 私鑰；目前 D1 可保存瀏覽器 subscription，但 Worker 不直接持有 VAPID 發送實作。

不要把 token、webhook URL、email 或 push key 寫入 `wrangler.jsonc`、commit、issue 或截圖。系統會遮罩結構化日誌中的所有已設定憑證。

## 部署

```bash
npx wrangler d1 migrations apply us-economic-events --remote
npx wrangler deploy
```

部署後至少檢查：

```bash
curl https://YOUR_WORKER.workers.dev/health
curl https://YOUR_WORKER.workers.dev/ready
curl https://YOUR_WORKER.workers.dev/api/events
```

開啟 `https://YOUR_WORKER.workers.dev/admin`，登入後執行：

1. `立即同步事件`
2. `更新官方數值`
3. 在控制中心逐一測試已設定通知頻道
4. 確認 EIA 與最近已公布事件的 Actual / Prior

## Cron

`wrangler.jsonc` 目前設定：

- `* * * * *`：通知 outbox、發布值刷新、每日摘要。
- `7 */6 * * *`：每六小時同步排程、強制刷新值、檢查來源健康。
- `23 18 * * *`：每日完整同步與值刷新。
- `41 18 * * *`：資料清理。

每個任務會寫入執行紀錄並使用 D1 lock 避免重疊。Cloudflare Cron 使用 UTC。

## HTTP 介面

公開：

- `GET /health`、`GET /ready`
- `GET /api/events?from=&to=&provider=&category=&impact=&limit=`
- `GET /api/events/:id`
- `GET /api/events.ics`
- `GET /manifest.webmanifest`、`GET /service-worker.js`

管理端點可使用 `Authorization: Bearer ADMIN_TOKEN`、簽章 session cookie，或有效的 Cloudflare Access assertion：

- `GET /admin/overview`、`GET /admin/events`、`GET /admin/events/:id/history`
- `GET|PUT /admin/settings`、`GET|PUT /admin/preferences`
- `POST /admin/sync`、`POST /admin/refresh-values`、`POST /admin/check`
- `GET /admin/providers`、`GET /admin/notification-channels`
- `POST /admin/test-notification`
- 收藏、saved filters、audit、source snapshots 與 Web Push subscription 端點

管理端點不回傳 secret。非唯讀請求會拒絕跨來源瀏覽器操作。

## 設定

`wrangler.jsonc` 提供預設值，登入後可在頂部控制中心覆寫：

- 顯示時區、提醒分鐘、同步未來天數、最低影響程度。
- 七個 provider 開關、通知總開關、六個通知頻道開關。
- Medium 事件儲存、安靜時段、每日摘要時間。
- 語言、主題、收藏與 saved views。

控制中心不會顯示或編輯 secret；憑證仍由 Wrangler / Cloudflare 管理。

## 正確性與限制

- Forecast 沒有可信來源時保持空白，不以 Prior 或推算值冒充。
- EIA 歷史 dashboard 僅到千桶精度；CSV 無法存取時，推導的百萬桶數可能和精確 CSV 相差 `0.001`。
- 官方網站改版、延遲或封鎖時，事件會標記來源異常並重試，不會改用未核准的第三方數值。
- Webhook 與 D1 不可能跨系統交易；極少數「遠端已收到、Worker 在寫入 sent 前中斷」的情況仍可能重送一次。
- 本系統提供資料與提醒，不構成交易建議。

## 測試

測試涵蓋 provider fixtures、時區 / DST、跨月份值配對、EIA 403 fallback、BEA / Fed / Census / ISM / Michigan 值解析、通知通道、重試、每日摘要、Access / session、公開 API / ICS、排程健康、修訂衍生值、雙語 dashboard 與憑證遮罩。第三方 HTTP 在單元測試中全部 mock；正式環境 smoke test 應在部署後另外執行。
