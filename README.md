# 美國官方經濟事件 Discord 提醒

這是一個只使用免費官方資料來源的 Cloudflare Workers 專案。Worker 會定期讀取美國重要經濟發布時間，將事件標準化後寫入 Cloudflare D1，並在發布前 60、30、15、5 分鐘透過 Discord Incoming Webhook 發送提醒。

本系統主要做「官方公布時間提醒」。事件模型與 Discord/前端已支援 Actual、Forecast、Prior 欄位；但官方排程頁通常只提供時間，沒有數值時會顯示 `—`，不會自行猜測。系統不提供即時行情、新聞分析或做多/做空方向建議。事件時間可能被官方臨時調整，請以來源頁面為準。

## 架構

```text
官方 schedule / JSON
        ↓
provider adapters
        ↓
EconomicEvent + SHA-256 deterministic ID
        ↓
Cloudflare D1
        ↓
notification_deliveries（條件式 sending lock）
        ↓
Discord Incoming Webhook embed
```

目錄職責如下：

- `src/providers/`：BLS、BEA、Federal Reserve、EIA、U.S. Census、ISM、University of Michigan 與 Discord adapter。
- `src/domain/`：名稱正規化、事件分類、商品關聯、UTC/時區、ID 與提醒時間。
- `src/parsers/`：受大小限制的 HTML、XML/RSS、ICS parser；不執行 script、不使用 DOM、eval 或 headless browser。
- `src/repositories/`：所有 D1 讀寫、upsert、delivery claim 與 provider health。
- `src/services/`：provider sync、通知檢查、健康警告與資料清理。
- `test/fixtures/`：官方格式的最小化 fixture；測試不呼叫第三方網站。

Discord Webhook 不需要 Discord Bot、Gateway 或常駐程序。Worker 直接向 Discord 的 webhook URL 發送 HTTP POST，因此適合免費額度與個人使用情境。

## 官方資料來源與格式

截至 2026-07-14 已透過官方頁面確認下列現行格式與欄位：

| Provider | 官方 URL | 使用格式 | 時間規則 | 線上研究狀態 |
| --- | --- | --- | --- | --- |
| BLS | <https://www.bls.gov/schedule/news_release/bls.ics> | Official ICS calendar; monthly HTML list fallback | Release times are Eastern Time | ICS is primary; monthly list is used when BLS blocks one representation |
| BEA | <https://apps.bea.gov/API/signup/release_dates.json> | JSON release dates | 排程頁提供日期與時間；本專案用 `America/New_York` | 已線上確認 JSON endpoint；fixture 驗證 parser |
| BEA 備援格式 | <https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics> | ICS | `DTSTART` 為 UTC，含 `UID` | 已線上確認，保留作為格式參考 |
| Federal Reserve | <https://www.federalreserve.gov/newsevents/{year}-{month}.htm> | 每月 HTML calendar | 頁面事件時間為 Eastern Time | 已線上確認頁面與 FOMC/Beige Book 區塊 |
| EIA WPSR | <https://www.eia.gov/petroleum/supply/weekly/schedule.php> | HTML schedule | 通常週三 10:30 a.m. Eastern；holiday 可延後 | 已線上確認頁面與 holiday table |
| EIA WNGSR | <https://ir.eia.gov/ngs/schedule.html> | HTML schedule | 通常週四 10:30 a.m. Eastern；holiday 可延後 | 已線上確認頁面與 holiday table |
| U.S. Census | <https://www.census.gov/economic-indicators/calendar-listview.html> | HTML release calendar | 官方日期/時間，拆出 Retail Sales、Durable Goods、Building Permits、Housing Starts | 已線上確認 2026 calendar |
| ISM PMI | <https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/> | HTML release calendar | Manufacturing/Services 依官方月表，10:00 a.m. Eastern | 已線上確認 2026 dates 與 holiday adjustment |
| University of Michigan | <https://data.sca.isr.umich.edu/fetchdoc.php?docid=75443> | Official release schedule PDF | Preliminary/Final release dates，10:00 a.m. Eastern | 已線上確認 2026 schedule |

本環境的 shell outbound network 不可用，因此沒有把 live response 寫入 repository，也沒有執行會發送正式 Discord 訊息的 smoke test。`test/fixtures/` 與測試會驗證 parser、時區、HTTP 錯誤與空資料；部署後可透過 `/admin/sync` 做個人環境的手動驗證。

EIA 的值欄位會再讀官方報表資料：WPSR 使用 Table 1 CSV，WNGSR 使用官方 JSON；當 release date 對上排程日期時，事件會帶入官方實際數值與前一期比較。

目前 adapter 追蹤的核心事件包括 CPI 四項指標、PPI MoM、PCE、Employment Situation/NFP/Unemployment/JOLTS、GDP/Personal Income/Personal Spending、Retail Sales、Durable Goods、Building Permits/Housing Starts、Michigan Consumer Sentiment、ISM Manufacturing/Services PMI、FOMC Minutes/Press Conference/Interest Rate Decision、Waller speeches/testimony、Beige Book、WPSR、Crude Oil Inventories、Gasoline/Distillate Inventories 與 Natural Gas Storage。

## 本機安裝與測試

需要 Node.js 20 以上與 npm。

```bash
npm install
npm run typecheck
npm test
npm run build
```

`npm run build` 使用 `wrangler deploy --dry-run`，只做 Worker bundle/設定驗證，不會部署。

本機開發：

```bash
copy .dev.vars.example .dev.vars
# 編輯 .dev.vars，填入本機測試用 webhook 與 admin token
npm run dev
```

本機 Cron 測試（Wrangler 提供的 scheduled route）：

```bash
curl "http://localhost:8787/cdn-cgi/handler/scheduled?cron=*+*+*+*+*&format=json"
```

## 建立 Discord Webhook

1. Discord 伺服器設定 → Integrations → Webhooks → New Webhook。
2. 選擇要接收通知的 channel，複製 webhook URL。
3. Discord 手機 App 的通知設定中，開啟該伺服器與 channel 的通知；若要在鎖定畫面收到通知，也要在手機作業系統通知設定中允許 Discord。
4. 不要把 webhook URL 貼到 Git、issue、截圖或公開 log。若 URL 外洩，立即在 Discord 刪除舊 webhook 並建立新 webhook。

測試端點會送出藍色、明確標示「經濟事件通知系統測試」的 embed，不會偽裝成真實事件。

## Cloudflare D1 與部署

先登入 Wrangler：

```bash
npx wrangler login
npx wrangler d1 create us-economic-events
```

將輸出中的 database UUID 寫入 `wrangler.jsonc` 的 `d1_databases[0].database_id`，不要改掉 binding `DB`。本地 migration：

```bash
npx wrangler d1 migrations apply us-economic-events --local
```

正式 D1 migration：

```bash
npx wrangler d1 migrations apply us-economic-events --remote
```

設定 secrets：

```bash
npx wrangler secret put DISCORD_WEBHOOK_URL
npx wrangler secret put ADMIN_TOKEN
```

目前 provider 優先使用不需要 API key 的官方 schedule/JSON。若將來 adapter 改用官方 API，再以 secret 設定 `BLS_API_KEY`、`BEA_API_KEY` 或 `EIA_API_KEY`；不要把 key 放到 `vars` 或 source code。

部署：

```bash
npx wrangler deploy
```

確認 Cron：

```bash
npx wrangler deployments list
npx wrangler tail us-economic-event-alerts
```

Cloudflare Cron Triggers 一律使用 UTC。設定檔目前包含：

- `* * * * *`：每分鐘只檢查 D1 due delivery。
- `7 */6 * * *`：每 6 小時同步未來事件。
- `23 18 * * *`：每日完整同步。
- `41 18 * * *`：清除過舊事件與 sync run。

新增或修改 Cron 後可能需要數分鐘傳播。若改 `APP_TIMEZONE`，只會改 Discord 顯示時區；資料庫與排程仍使用 UTC。

## 設定值

`wrangler.jsonc` 中的非秘密 vars：

```text
APP_TIMEZONE=Asia/Taipei
REMINDER_MINUTES=60,30,15,5
SYNC_DAYS_AHEAD=45
EVENT_IMPACT_FILTER=high
ENABLE_BLS=true
ENABLE_BEA=true
ENABLE_FEDERAL_RESERVE=true
ENABLE_EIA=true
ENABLE_CENSUS=true
ENABLE_ISM=true
ENABLE_UMICH=true
DISCORD_MENTION=
STORE_MEDIUM_EVENTS=false
```

設定 `DISCORD_MENTION` 時只接受明確的 `@everyone`、`@here`、Discord user mention 或 role mention。其他字串會保持 `allowed_mentions.parse=[]`，不讓官方事件文字觸發 mention。

## 管理端點

除 `/health` 外，所有端點都要使用 `Authorization: Bearer ADMIN_TOKEN`。管理 endpoint 不回傳 secrets，也不回傳完整 raw HTML。

```bash
# 健康檢查
curl https://YOUR_WORKER.workers.dev/health

# 發送測試訊息
curl -X POST https://YOUR_WORKER.workers.dev/admin/test-discord \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 手動同步全部已啟用 provider
curl -X POST https://YOUR_WORKER.workers.dev/admin/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"providers":["bls","bea","federal_reserve","eia","census","ism","umich"]}'

# 查詢未來 30 天事件
curl "https://YOUR_WORKER.workers.dev/admin/events?limit=30" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 立即檢查 due notification
curl -X POST https://YOUR_WORKER.workers.dev/admin/check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 查詢 provider health
curl https://YOUR_WORKER.workers.dev/admin/providers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 維護指南

修改 aliases 或 false-positive 規則：`src/domain/importance.ts`、`src/domain/normalization.ts`。

修改 NQ、黃金、原油等關聯：`src/domain/market-impact.ts`。

修改官方格式：只改對應 `src/providers/` adapter 與需要的 `src/parsers/`，保留 fixture 與回歸測試。

新增 provider：實作 `EconomicCalendarProvider`，在 `src/providers/index.ts` 註冊，加入 `ProviderName`、config 開關、health/sync 測試與 fixture；不要讓 route 直接解析第三方 response。

若官方頁面格式改變：先看 `/admin/providers` 的 consecutive failures，再看 `npx wrangler tail` 的結構化錯誤；檢查官方 Content-Type、HTTP status、最小事件數與關鍵欄位，更新 fixture 後再部署。同步時單一 provider 失敗不會中止其他 provider。

若要更換 webhook，先在 Discord 撤銷舊 webhook，再重新執行 `npx wrangler secret put DISCORD_WEBHOOK_URL`，最後呼叫 `/admin/test-discord`。若 token 外洩，立即撤銷並輪替 `ADMIN_TOKEN`。

## 已知限制與安全語意

- Cron 與 D1 delivery claim 採條件式 `UPDATE`，可避免 Cron 重疊時的重複 claim；但若 Discord 已成功而 Worker 在寫入 `sent` 前崩潰，HTTP webhook 本身沒有跨系統 transaction，理論上仍可能出現一次重送。
- due delivery 只接受 `scheduled_for_utc <= now` 且大於 now 減 3 分鐘，過期 delivery 會標記 `expired`，不補發已錯過很久的提醒，也不會在事件公布後發出「即將公布」通知。
- 官方時間無法安全判定時會跳過事件並留下 structured warning，不會靜默猜測伺服器時區。
- EIA holiday schedule 會解析官方 schedule 頁面中的 alternate date/time；若官方推出新的表格格式，EIA health 會失敗，需要更新 `src/providers/eia.ts` 與 fixture。
- 系統不宣稱事件對 NQ、黃金、原油、美元或殖利率的方向。`affectedMarkets` 僅是可能受關注的市場分類，不是交易建議。

## 測試涵蓋

測試包含七個 provider adapter fixture、JSON/HTML/ICS/XML parser、空資料與 HTTP 失敗、Content-Type、timezone/DST、名稱 aliases 與 false-positive、deterministic ID、Discord 200/204/429/500/400、allowed mentions、admin Bearer token，以及不把 webhook URL 放進 payload/log 的安全邊界。所有第三方 HTTP 都使用 mock；正式 smoke test 請在你自己的 Cloudflare/Discord 環境手動執行 `/admin/test-discord`。
