# 立德 LEADER 遊戲系統

這是一個給《立德 LEADER》課程活動使用的 Firebase 靜態網頁遊戲系統。

系統包含：

- 主持人主控台：設定參與組別與人數，控制輪次、投票、事件牌、元首行動、外交會議、制裁、結局揭示
- 國家介面：參與組別各自投票與查看資訊
- 編號投票：各國人民依序以 1 號、2 號、3 號等身份獨立投票
- 動態規則：依本場總人數自動計算世界和平門檻，依啟用國家產生秘密目標對戰圈
- 大螢幕：即時顯示世界和平進度、排名、事件、元首行動與結局
- QR 列印：列印主控台、大螢幕與各國入口
- Realtime Database：跨裝置即時同步

## Firebase 專案

本專案使用新的 Firebase project：

- Project ID：`leader-game`
- Realtime Database：`https://leader-game-default-rtdb.asia-southeast1.firebasedatabase.app`

這個 repo 不會使用舊的 `charging-station-game`。部署時請固定帶上 `--project leader-game`。

## 本機啟動

```powershell
npm install
npm start
```

開啟本機網址後可進入：

- `index.html`：首頁
- `admin.html`：主持人主控台
- `display.html`：大螢幕
- `country.html?id=US`：美國介面
- `print.html`：QR 列印
- `health.html`：連線檢查

## 部署

```powershell
firebase deploy --project leader-game --only hosting,database
```

只更新網頁：

```powershell
firebase deploy --project leader-game --only hosting
```

只更新 Realtime Database 規則：

```powershell
firebase deploy --project leader-game --only database
```

## 初始化與場次

一般使用不需要設定遊戲代碼。系統預設使用正式場次 `leader-main`，從首頁直接進入即可。

活動開場前：

1. 開啟 `admin.html`
2. 在「本場組別」勾選這次參與的組別，輸入各組人數
3. 按「儲存設定與組別」
4. 確認「本場配置摘要」與「秘密目標對戰圈」，需要時可按「隨機產生對戰圈」
5. 按「初始化本場遊戲」
6. 開啟 `display.html` 到投影畫面
7. 開啟 `print.html` 列印 QR
8. 各組掃自己的國家 QR

## 遊戲流程

每輪主要流程：

1. 開始本輪
2. 開放投票，各國人民依編號獨立投票並送出
3. 抽事件牌
4. 元首行動：可選封鎖、結盟或略過
5. 開票計分
6. 外交會議

第二輪外交後可開啟「制裁投票」並結算制裁；第三輪計分後揭示結局。

目前計分規則：

- 世界和平門檻：`總人數 x 3 輪 x 60%`，自動進位
- 公幣池：`全場有效公幣 x 1.5 / 啟用國家數`
- 私幣：每票 2 分
- 封鎖：目標本輪有私幣即成功，目標本輪分數歸零
- 結盟：兩國互選結盟才成功，雙方本輪各加 2 分
- 制裁：有資格投票國家的過半數通過
- 秘密目標：最終分數高於對戰圈下一國，可獲得秘密目標加分

如果臨時需要測試場次，可以手動在網址加 `?game=test-name`。不同場次會寫入不同資料節點 `leaderGames/{gameId}`。
