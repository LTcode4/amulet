# Amulet — 五行運轉．扭轉人生

> 互動式 3D 護身符抽籤體驗。透過 Three.js 即時渲染 + Cannon-ES 物理引擎模擬扭蛋掉落,結合五行籤詩劇情與分享機制,提供完整的網頁互動敘事體驗。

---

## 專案概述

Amulet 是一個 SPA 形式的互動式行銷活動網站,使用者依序經歷「進入 → 選籤 → 搖蛋 → 結果 → 分享」的流程。整體設計強調沉浸感:

- **3D 即時演算**:以 Three.js + Cannon-ES 實作護身符扭蛋的物理掉落、彈跳與光暈效果。
- **多裝置適配**:支援陀螺儀互動 (`useGyroscope`)、觸控與滑鼠操控,使用 Quasar 響應式佈局兼容行動 / 桌面。
- **可分享結果**:透過 `html2canvas` 將最終籤詩畫面合成為圖檔,搭配自訂分享連結回傳到使用者。
- **可觀測性**:前端錯誤由 Sentry 收斂,使用者行為事件由 Google Tag Manager 觸發。

---

## 技術

| 類別 | 技術 | 用途 |
|---|---|---|
| 框架 | Quasar 2 + Vue 3 (Composition API) | UI 元件 / 路由 / SPA scaffold |
| 語言 | TypeScript 4.5 | 型別安全 |
| 狀態管理 | Pinia 2 | 跨頁狀態(玩家選擇、抽籤結果等) |
| 路由 | Vue Router 4 (history mode) | 多頁面切換 |
| 建置工具 | Vite (Quasar Vite CLI) | 開發伺服器 / 打包 |
| 樣式 | SCSS + Tailwind CSS 3 + PostCSS + Autoprefixer | 樣式系統與跨瀏覽器前綴 |
| 3D / 動畫 | Three.js (r176) + Cannon-ES | 護身符 3D 模型與物理模擬 |
| HTTP | Axios | API 通訊 |
| 圖片合成 | html2canvas | 將結果頁渲染為可下載 / 可分享圖檔 |
| 觀測 | Sentry (`@sentry/vue`) + GTM (`@gtm-support/vue-gtm`) | 錯誤追蹤 / 行為分析 |
| Lint / Format | ESLint (airbnb-base) + Prettier | 程式風格統一 |

---

## 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                           │
│                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│   │  HomePage    │ -> │  GamePage    │ -> │  PlayPage    │  │
│   │  (引導 / CTA)│    │  (選籤入口)  │    │  (3D 抽蛋)   │  │
│   └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                  │           │
│   ┌──────────────┐    ┌──────────────┐          ▼           │
│   │  ResultPage  │ <- │  MakePage    │ <-  Three.js /       │
│   │  (籤詩 + 分享│    │ (合成中載入) │     Cannon-ES        │
│   └──────────────┘    └──────────────┘                      │
│           │                                                  │
│           └─> html2canvas ─> 分享圖 ─> QUASAR_SHARE_URL      │
│                                                              │
│   Pinia (跨頁狀態) | Vue Router (history) | Boot files       │
└──────┬──────────────────────────────────┬───────────────────┘
       │                                  │
       ▼                                  ▼
   IMAGE_API_URL                  Sentry / GTM
 (後端圖片素材)                    (觀測層)
       │
       ▼
   AWS S3 (CDN-fronted static hosting)
```

**啟動順序**(`src/boot/`):
1. `axios.ts` — 建立 HTTP client、注入 base URL。
2. `gtm.ts` — 初始化 Google Tag Manager。
3. `sentry.ts` — 初始化 Sentry,綁定 Vue 錯誤邊界。

**狀態流向**(Pinia store `src/stores/store.ts`):使用者抽到的籤、產生的圖檔、頁面進度由單一 store 統一保存,跨頁面讀寫。

---

## 資料夾結構

```
.
├── public/                  靜態資源(favicon、預先載入的卡牌與結果圖)
├── src/
│   ├── App.vue              根元件
│   ├── assets/              經 bundler 處理的圖片素材
│   ├── boot/                Quasar Boot Files(axios / gtm / sentry)
│   ├── components/          可重用 UI 元件
│   │   ├── DrawingModal.vue       抽籤過場彈窗
│   │   ├── GameBox.vue            扭蛋互動容器
│   │   ├── GameHeader.vue         遊戲頂欄
│   │   ├── LoadingIcon.vue        載入動畫
│   │   ├── RippleLoader.vue       水波紋載入
│   │   ├── SecondStep.vue         第二步流程
│   │   ├── TypeWriter.vue         打字機文字效果
│   │   └── ZoomOut.vue            鏡頭拉遠動畫
│   ├── composables/
│   │   ├── play/
│   │   │   ├── useGlowEffect.ts   護身符光暈效果
│   │   │   └── useThreeGashapon.ts 扭蛋 3D 場景核心邏輯
│   │   └── useGyroscope.ts        陀螺儀感測
│   ├── css/                 全域樣式(app / quasar 變數 / reset / tailwind)
│   ├── data/
│   │   └── balls-message.ts       籤詩文案資料
│   ├── layouts/
│   │   └── MainLayout.vue         全站共用 Layout
│   ├── pages/                     5 個主要頁面(見下)
│   ├── router/                    Vue Router 設定
│   ├── stores/                    Pinia stores
│   ├── types/                     全域型別宣告
│   └── utils/
│       └── preloader.ts           圖片 / 資源預載
├── variables/
│   ├── parser.js                  多環境 dotenv 載入器
│   └── .env.example               環境變數範本
├── quasar.config.js               Quasar 主設定
├── tailwind.config.js
├── postcss.config.cjs
├── tsconfig.json
└── Makefile                       AWS S3 部署指令
```

---

## 頁面與路由

| Path | Name | 元件 | 用途 |
|---|---|---|---|
| `/` | HomePage | `HomePage.vue` | 引導頁、活動 CTA |
| `/game` | GamePage | `GamePage.vue` | 選籤主畫面 |
| `/play` | PlayPage | `PlayPage.vue` | 3D 扭蛋抽籤互動 |
| `/make` | MakePage | `MakePage.vue` | 結果合成中過場 |
| `/result` | ResultPage | `ResultPage.vue` | 籤詩結果與分享 |
| `/:catchAll(.*)*` | — | `HomePage` | 未匹配路徑 fallback |

路由模式為 `history`,部署時須由 S3 / CDN 將未匹配路由 fallback 至 `index.html`。

---

## 環境變數

採用自製 `variables/parser.js` 載入器,先讀 `variables/.env`,再覆寫 `variables/.env.${ENVIRONMENT}`。

| 變數 | 說明 |
|---|---|
| `QUASAR_ENVIRONMENT` | `development` / `staging` / `production` |
| `QUASAR_GTM_ID` | Google Tag Manager 容器 ID |
| `QUASAR_SENTRY_DSN` | Sentry DSN |
| `QUASAR_SHARE_URL` | 對外分享連結 base |
| `PROJECT_NAME` | 專案識別名稱 |
| `IMAGE_API_URL` | 後端圖片 / 素材 API 來源 |

---

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

> Node 版本:`^14.19 || ^16 || ^18`(見 `package.json` engines)

### 2. 建立環境變數

```bash
cp variables/.env.example variables/.env
cp variables/.env.example variables/.env.development
# 依需求填入實際值
```

### 3. 啟動開發伺服器

```bash
npm run dev               # ENVIRONMENT=development
npm run dev:staging       # 用 staging 環境變數啟動
npm run dev:production    # 用 production 環境變數啟動
```

預設 dev server 為 `http://localhost:9000`(可於 `quasar.config.js` 調整)。

---

## 建置與部署

### Build

```bash
npm run build:staging      # 產出 dist/spa(staging 設定)
npm run build:production   # 產出 dist/spa(production 設定)
```

### Deploy(AWS S3)

需先設定本機 AWS CLI credentials。

```bash
make deploy-stg            # build:staging → s3://preview-amulet.web-interactive.org
make deploy-prd            # build:production → s3://amulet.web-interactive.org
```

> Makefile 使用 `aws s3 sync ... --delete`,部署等同於完整覆蓋目標 bucket。

---

## 程式規範

| 工具 | 設定檔 |
|---|---|
| ESLint | `.eslintrc.cjs`(extends `airbnb-base`、`@typescript-eslint`、`prettier`) |
| Prettier | `.prettierrc` |
| EditorConfig | `.editorconfig` |
| TypeScript | `tsconfig.json` |

```bash
npm run lint               # 檢查所有 .js / .ts / .vue / .cjs
npm run format             # Prettier 全專案格式化
```

---

## 第三方服務整合

- **Sentry**(`src/boot/sentry.ts`):捕捉 Vue 錯誤、Promise rejection、效能 trace。DSN 由 `QUASAR_SENTRY_DSN` 提供。
- **Google Tag Manager**(`src/boot/gtm.ts`):透過 `@gtm-support/vue-gtm` 自動注入,`QUASAR_GTM_ID` 控制環境。
- **AWS S3**:作為靜態檔案 origin,前端流量由 CDN 分發。

---

## 瀏覽器支援

於 `quasar.config.js > build.target`:

```
browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1']
```

不支援 IE。行動裝置以 iOS Safari 13.1+ / Android Chrome 等近 4 個主版本為主。


