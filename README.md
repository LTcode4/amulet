# Amulet — 五行運轉．扭轉人生 (Monorepo)

> 互動式 3D 護身符抽籤體驗的全端工程庫。前端負責 3D 抽蛋互動與分享、後端提供圖片處理 API 與業務邏輯。本 repo 採 monorepo 架構,前後端各自獨立部署但共享版本與發版節奏。

---

## Monorepo 結構

```
.
├── web/                Quasar 2 + Vue 3 + TypeScript SPA(前端)
│   ├── src/
│   ├── public/
│   ├── variables/      多環境 dotenv
│   ├── quasar.config.js
│   └── package.json
│
├── server/             Node.js + Express API(後端)
│   ├── server.js       主程式(Express + sharp + node-cron)
│   ├── .env.example
│   └── package.json
│
├── README.md           本檔(monorepo 總覽)
└── .gitignore          monorepo 共用 ignore 規則
```

子專案各自有 `package.json` / `node_modules`,互不干擾。版控以 Git Flow 管理,版本以單一 SemVer tag 統籌發版(本 repo 同一個 tag 同時涵蓋 web / server)。

> 註:`server/.ebextensions/`(AWS Elastic Beanstalk 部署設定)與 server 相關 `*.md` 部署文件僅保留在本機,不入版控,由維運者另行管理。

---

## 子專案

| 路徑 | 名稱 | 技術 | 用途 |
|---|---|---|---|
| `web/` | `amulet` | Quasar 2 / Vue 3 / TypeScript / Three.js / Cannon-ES | 使用者互動前端,部署至 AWS S3 |
| `server/` | `server` | Node.js / Express / sharp / node-cron | 圖片上傳與處理 API,部署至 AWS Elastic Beanstalk |

---

## 系統概觀

```
                  ┌──────────────────┐
   browser  ──→   │   web/  (SPA)    │
                  │  Quasar/Three.js │
                  └────────┬─────────┘
                           │ XHR / fetch (POST base64 image)
                           ▼
                  ┌──────────────────┐
                  │ server/  (API)   │
                  │ Express + sharp  │
                  └────────┬─────────┘
                           │ PNG (壓縮 / 重命名)
                           ▼
                  ┌──────────────────┐
                  │  images/  (FS)   │
                  └──────────────────┘
```

- web 端透過環境變數 `IMAGE_API_URL` 指向 server。
- server 端以 CORS allow-list 控管允許來源(預設僅放行正式網域與 localhost)。
- 觀測層由 web 端 Sentry / GTM 處理,server 端使用 console + helmet hardening。

---

## 快速開始

### 前置需求

- Node.js `^18 || ^20`
- npm `>= 9`(各子專案目前未使用 workspaces,各自 install)

### 啟動全端開發環境

```bash
# 後端(終端 A)
cd server
cp .env.example .env
npm install
npm run dev          # http://localhost:3000

# 前端(終端 B)
cd web
cp variables/.env.example variables/.env.development
npm install
npm run dev          # http://localhost:9000
```

---

## 版本與發版

採 **Git Flow + Conventional Commits + SemVer**。

| 分支 | 用途 |
|---|---|
| `main` | 對應 production,只接受 release / hotfix 合併 |
| `develop` | 整合分支,日常開發起點 |
| `feature/*` | 新功能開發 |
| `release/*` | 發版前固化,bump 版本號 |
| `hotfix/*` | 上線後緊急修補 |

Tag 格式:`vX.Y.Z`(annotated tag,指向 main 上的 release merge commit)。

### Release 流程

```bash
git checkout develop
git checkout -b release/X.Y.Z
# bump web/package.json + server/package.json + lock files
git commit -am "chore(release): bump version to X.Y.Z"

git checkout main && git merge --no-ff release/X.Y.Z
git tag -a vX.Y.Z -m "Release vX.Y.Z"

git checkout develop && git merge --no-ff release/X.Y.Z
git branch -d release/X.Y.Z

git push origin main develop --tags
```

---

## Commit 規範

[Conventional Commits](https://www.conventionalcommits.org/) + scope:

```
feat(web): add gyroscope-driven amulet rotation
fix(server): handle CORS preflight for /api/upload-image
chore(release): bump version to 1.1.0
docs(readme): rewrite monorepo overview
refactor(server): extract image pipeline into module
```

scope 對應子專案資料夾名稱(`web` / `server`),或 `release` / `repo` / `ci` 等橫切議題。

---

## License

Private — 內部專案,未經授權不得散佈。

## Maintainer

**Ken** — `ken141718@gmail.com`
