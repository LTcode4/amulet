# 五行運轉 扭轉人生 — UI Flow 文件

> 整合來源：Figma Prototype + 程式碼（Vue 3 + Three.js + Cannon-ES）
> 裝置尺寸：375 × 667 px（Mobile）
> 最後更新：2026-03-28

---

## 總覽流程圖

```
[Loading]
    │ 資源載入完成（1.5s min）
    ▼
[HomePage] ──── 首次進入 TypeWriter Phase 1（4.5s）
    │ 點擊任意處
    ▼
[GamePage - 待機]
    │ 長按按鈕 ≥ 2s
    ▼
[GamePage - 球落入]
    │ 點擊畫面
    ▼
[PlayPage - 開蛋動畫]
    │ 動畫結束（10s / 特殊卡 15s）
    ▼
[MakePage - 文字輸入]
    ├─ 切換畫圖 ──→ [DrawingModal] ──→ 確定 ──→ [MakePage - 繪圖完成]
    │
    │ 確定生成（Loading 5s）
    ▼
[ResultPage]
    ├─ 分享 → navigator.share API
    ├─ 下載 → <a> download 觸發
    └─ 回至首頁 → reset state → [HomePage]
```

---

## Screen 詳細說明

---

### S1 · Loading

| 項目 | 內容 |
|------|------|
| **對應 Page** | `MainLayout.vue` preloader |
| **Figma Frame** | `8:2` |
| **目的** | 預載所有資源，避免後續畫面閃爍 |

**UI 元件：**
- `RippleLoader.vue`：同心圓波紋動畫，由內向外擴散
- `LoadingIcon.vue`：中央黑色圓形 + SVG 扭字圖示
- 文字：`Loading • •`（點點閃爍）

**動畫：**
| 動畫 | 類型 | 時長 | 細節 |
|------|------|------|------|
| 波紋擴散 | CSS keyframe | loop | 3 個同心圓，透明度 0.8→0，延遲交錯 |
| 點點閃爍 | CSS animation | loop | `opacity` 1→0→1，0.5s interval |

**狀態轉換：**
- 觸發：所有 assets 載入完成 AND 已顯示 ≥ 1500ms
- 動作：隱藏 Loading，顯示 HomePage（`v-if` 切換）

---

### S2 · HomePage

| 項目 | 內容 |
|------|------|
| **對應 Page** | `HomePage.vue` |
| **Figma Frame** | `3:2`（待機）/ `4:2`（TypeWriter 進行中） |
| **目的** | 品牌印象建立，引導用戶點擊進入 |

**UI 元件（由上至下）：**
1. **主標題 × 2**（黑色圓角 pill）
   - Pill 1：「五行運轉」
   - Pill 2：「扭」圓形圖示 ＋「轉人生」pill
2. **六邊形中央區塊**：背景裝飾 + TypeWriter 文字
3. **5 個御守卡**：扇形疊排於下方
4. **點擊提示**：最底部，fade-in 動畫

**動畫詳細：**

| 動畫 | 元件 | 時長 | 觸發 | 細節 |
|------|------|------|------|------|
| TypeWriter Phase 1 | `TypeWriter.vue` | 4.5s | 頁面載入 | 說明文字逐字出現，50ms/字，末尾游標閃爍（`blink-caret` 0.75s step-end loop） |
| TypeWriter Phase 2 | `TypeWriter.vue` | — | 點擊後 | 切換至「請點擊畫面開始」文字 |
| TypeWriter Phase 3 | `TypeWriter.vue` | — | 再次點擊 | 顯示旋轉提示文字（spin animation） |
| 御守卡跳動 | CSS `@keyframes amulet` | 1s loop | 頁面載入 | `translateY(0→-5%)` bounce，5 個卡片各有 stagger delay（0/0.1/0.2/0.3/0.4s） |
| 點擊提示 fade | CSS `@keyframes fade-in` | 0.8s | 自動 | `opacity 0→1` + `translateY 10px→0` |

**互動：**
- **點擊任意處** → `router.push('/game')`

---

### S3 · GamePage — 待機狀態

| 項目 | 內容 |
|------|------|
| **對應 Page** | `GamePage.vue` |
| **Figma Frame** | `9:2` |

**UI 元件（由上至下）：**
1. **GameHeader**（上方約 45%）
   - Three.js Canvas：物理球群，多顆球堆疊
   - 黑色 pill 標題：「扭轉御守」
2. **六邊形長按按鈕**（中央）
   - 文字：「扭轉」
   - 深色六邊形外框
3. **GameBox**（下方約 30%）
   - Three.js Canvas：收球盒（深色方形容器）
   - 底部裝飾紋樣

**動畫：**
| 動畫 | 類型 | 細節 |
|------|------|------|
| 物理球模擬 | Three.js + Cannon-ES | 60fps，球有重力/碰撞/摩擦力，陀螺儀影響重力方向 |
| 球顏色（5種） | 材質 | 木綠 `#8EC743`、金黃 `#FFD700`、水藍 `#64A8DC`、火紅 `#EC0000`、土褐 `#652D1A` |
| 陀螺儀 | `useGyroscope.ts` | `DeviceOrientationEvent`，iOS 需 `requestPermission()`，更新 `world.gravity` 向量 |

---

### S4 · GamePage — 長按中

| 項目 | 內容 |
|------|------|
| **Figma Frame** | `10:2` |

**觸發：** 按下六邊形按鈕不放

**動畫：**
| 動畫 | 實作 | 細節 |
|------|------|------|
| 按鈕旋轉 | `requestAnimationFrame` | 每幀依 `elapsed / 2000 * 360°` 累積旋轉，`transform: rotate(Xdeg)` |
| 進度環 | CSS stroke-dasharray | 隨長按進度 0→360° 繪製環形進度條 |
| 按鈕文字變化 | `v-if` | 未達 2s 中斷 → 顯示「請繼續長按」 |
| 按鈕縮放 | `ZoomOut.vue` | 點下瞬間 scale 1→0.95→1，500ms |

**中斷條件：**
- 放開手指未達 2s → 顯示「請繼續長按」提示，重置計時器
- 達到 2s → 觸發球抽取邏輯

---

### S5 · GamePage — 球落入（抽出扭蛋）

| 項目 | 內容 |
|------|------|
| **Figma Frame** | `11:2` |

**動畫序列：**
1. 找最靠近底部的球（`GameHeader` 計算）
2. 球以物理拋射軌跡落入 `GameBox`
3. 收球盒出現球的 3D 模型
4. 顯示「請取出扭蛋」文字
   - 動畫：`@keyframes pulse`，2s，`opacity 1→0.7→1` loop
5. `userCardId` 寫入 Pinia store（1–6 隨機，cardId=6 機率 10%）

**互動：**
- **點擊畫面** → `router.push('/play')`

---

### S6 · PlayPage — 3D 開蛋動畫（完整序列）

| 項目 | 內容 |
|------|------|
| **對應 Page** | `PlayPage.vue` |
| **Figma Frame** | `12:2`（閉合）→ `13:2`（分開）→ `14:2`（卡片展現） |

**動畫序列：**

```
Step 1  場景入場（1s）
        scale: 0.1→1, opacity: 0.5→1
        CSS @keyframes scene-scale-up

Step 2  特殊卡判斷（cardId=6 only）
        「驚！」警告文字出現（3.5s 序列）：
          0–1s   pop-out：scale 0→1.2，文字陰影 glow
          1–3s   靜止顯示
          3–3.5s fade-out：opacity 1→0

Step 3  扭蛋機旋轉（2s）
        Three.js：capsule 沿 Y 軸旋轉 360°
        useThreeGashapon.ts → startRotation()

Step 4  開蛋動畫（3s）
        上半球：向上位移（translateY: 0→-200px）
        下半球：向下位移（translateY: 0→+200px）
        Glow Effect 同時擴散（useGlowEffect.ts）

Step 5  卡片展開（3s）
        CSS @keyframes zoom-in
        width: 0px → 75vw（max 600px）
        御守卡圖片從中心展開

Step 6  自動跳轉
        一般卡：10s 後 → router.push('/make')
        特殊卡（6）：15s 後 → router.push('/make')
```

**Glow Effect：**
- `useGlowEffect.ts`：`requestAnimationFrame`
- `radial-gradient` 半徑從 0 → 200px，`progress` 0→1 over 3s
- 黃色輝光 `rgba(255, 215, 0, 0.6)`

---

### S7 · MakePage — 文字輸入

| 項目 | 內容 |
|------|------|
| **對應 Page** | `MakePage.vue` |
| **Figma Frame** | `15:2` |

**UI 元件（由上至下）：**
1. **頁面標題**：黑色 pill「您的御守」
2. **御守底圖**（300×300，中央）
   - 4 角裝飾圓形圖示（好/運/御/守）
   - 中央：五行對應符號（火字=`火`）
   - 下方白色文字輸入覆蓋區
3. **說明文字**：「星際旅者，留下宇宙印記...」
4. **文字輸入框**：`<textarea>` 最多 15 字，placeholder 顯示範例
5. **按鈕列**（2 個）：
   - 「切換畫圖」（空心邊框）
   - 「確定生成」（黑色填滿，主要 CTA）

**互動：**
| 動作 | 結果 |
|------|------|
| 輸入文字 | 即時渲染至御守底圖覆蓋區（canvas 疊加） |
| 點擊「切換畫圖」 | 開啟 DrawingModal |
| 點擊「確定生成」 | 觸發 html2canvas 截圖 → 上傳 → Loading 5s → ResultPage |

**文字渲染規格：**
- `html2canvas` 截圖 600×600px
- 支援中英文自動換行
- `letter-spacing: 0.1em`，`word-spacing` 自訂
- 最終輸出加 drop-shadow 效果
- JPEG 壓縮 quality: 0.9

---

### S8 · MakePage — 繪圖 Modal

| 項目 | 內容 |
|------|------|
| **Figma Frame** | `16:2` |
| **對應元件** | `DrawingModal.vue` |

**UI 元件：**
1. **Modal 遮罩**：半透明白色覆蓋底層
2. **Canvas 繪圖區**（全螢幕）
3. **工具列**：
   - 顏色選擇器：`q-color`（Quasar），顯示 3 個預設色點
   - 筆刷大小：3 個圓形按鈕（小/中/大）
   - 橡皮擦：圖示按鈕（切換 eraser 模式）
4. **按鈕列**：
   - 「取消」（空心邊框）
   - 「確定」（黑色填滿）

**繪圖技術：**
- HTML5 Canvas `getContext('2d')`
- `pointerdown/pointermove/pointerup` 事件（支援滑鼠＋觸控）
- 輸出：`canvas.toDataURL('image/png')` → base64

---

### S9 · MakePage — 繪圖完成

| 項目 | 內容 |
|------|------|
| **Figma Frame** | `22:2` |

**變化（相較 S7）：**
- 御守底圖：顯示使用者繪製內容（波浪線等）
- 按鈕列變為 **3 個**：
  - 「重製」（空心）
  - 「清空」（空心）
  - 「確定生成」（黑色填滿）

**互動：**
| 按鈕 | 動作 |
|------|------|
| 重製 | 清除繪圖，回到初始文字模式 |
| 清空 | 清除畫布內容但保留繪圖模式 |
| 確定生成 | 同 S7，觸發截圖上傳流程 |

---

### S10 · ResultPage

| 項目 | 內容 |
|------|------|
| **對應 Page** | `ResultPage.vue` |
| **Figma Frame** | `25:2` |

**UI 元件（由上至下）：**
1. **頁面標題**：黑色 pill「生成成功」+ 星星裝飾
2. **御守成品圖**（Quasar `q-img`，`box-shadow` 效果）
3. **提示文字**：「可長按下載圖片」（LINE 環境提示）
4. **分享按鈕**（全寬，黑色填滿）
5. **底部按鈕列**：
   - 「回至首頁」（空心邊框）
   - 「下載」（空心邊框）

**互動：**
| 按鈕 | 技術實作 | 備註 |
|------|------|------|
| 分享 | `navigator.share({ files: [imageFile] })` | 需 HTTPS，不支援 LINE 內建瀏覽器 |
| 下載 | 動態建立 `<a download>` + `blob URL` | 觸發系統下載 |
| 回至首頁 | `store.reseat()` + `router.push('/')` | 清除所有 Pinia 狀態 |

---

## 動畫總覽

| 動畫名稱 | 所在頁面 | 類型 | 時長 | 說明 |
|----------|----------|------|------|------|
| `amulet` | HomePage | CSS keyframe | 1s loop | 御守卡跳動，translateY bounce |
| `blink-caret` | HomePage | CSS keyframe | 0.75s loop | TypeWriter 游標閃爍，step-end |
| `fade-in` | HomePage | CSS keyframe | 0.8s | 點擊提示淡入 + translateY |
| `btnKeyframe` | GamePage | CSS keyframe | 0.5s | 按鈕縮放回饋 1→0.95→1 |
| `start` | GamePage | CSS keyframe | 1s | 按鈕啟動旋轉 360° + scale out |
| `pulse` | GamePage | CSS keyframe | 2s loop | 「請取出扭蛋」opacity 閃爍 |
| `scene-scale-up` | PlayPage | CSS keyframe | 1s | 3D 場景入場 scale 0.1→1 |
| `warning-sequence` | PlayPage | CSS keyframe | 3.5s | 特殊卡警告文字 pop→hold→fade |
| `zoom-in` | PlayPage | CSS keyframe | 3s | 御守卡片寬度展開 0→75% |
| 物理球模擬 | GamePage | Cannon-ES | 60fps | 重力、碰撞、陀螺儀 |
| 3D 扭蛋旋轉 | PlayPage | Three.js | 2s | Y 軸旋轉 360° |
| 3D 開蛋 | PlayPage | Three.js | 3s | 上下半球位移分離 |
| Glow Effect | PlayPage | rAF | 3s | 放射狀黃色光暈擴散 |
| 長按旋轉 | GamePage | rAF | 持續 | 依 elapsed 累積旋轉角度 |

---

## 狀態管理（Pinia Store）

```typescript
// src/stores/store.ts
{
  userCardId: number,   // 1=木健康 2=金財富 3=水順利 4=火好運 5=土平安 6=日(特殊)
  userText: string,     // 使用者輸入文字
  userImage: string,    // 最終生成圖片 URL
}
```

| cardId | 元素 | 御守名稱 | 顏色 | 特殊行為 |
|--------|------|----------|------|----------|
| 1 | 木 | 健康御守 | `#8EC743` 綠 | — |
| 2 | 金 | 財富御守 | `#FFD700` 金 | — |
| 3 | 水 | 順利御守 | `#64A8DC` 藍 | — |
| 4 | 火 | 好運御守 | `#EC0000` 紅 | — |
| 5 | 土 | 平安御守 | `#652D1A` 褐 | — |
| 6 | 日 | 特殊卡 | `#000000` 黑 | 機率 10%，PlayPage 警告文字，15s 自動跳轉 |

---

## 路由結構

```
/          → HomePage.vue
/game      → GamePage.vue
/play      → PlayPage.vue
/make      → MakePage.vue
/result    → ResultPage.vue
```

---

## 埋點事件（GTM）

| 事件名稱 | 觸發時機 | 參數 |
|----------|----------|------|
| `manual_button_click` | 點擊按鈕 | `click_id: string` |

---

## 後端 API

| 端點 | 方法 | 用途 |
|------|------|------|
| `/api/upload` | POST | 上傳 base64 圖片，回傳圖片 URL |
| 回傳 URL 存入 | — | `store.userImage`，ResultPage 顯示 |
