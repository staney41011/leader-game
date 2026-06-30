# 立德 LEADER 遊戲系統

這是一個給《立德 LEADER》課程活動使用的 Firebase 靜態網頁遊戲系統。

系統包含：

- 主持人主控台：控制輪次、投票、事件牌、封鎖、制裁、結局揭示
- 國家介面：13 個國家各自投票與查看資訊
- 大螢幕：即時顯示世界和平進度、排名、事件與結局
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

## 遊戲代碼

網址可帶 `?game=leader-main` 指定同一場活動資料。

不同遊戲代碼會寫入不同資料節點：

```text
leaderGames/{gameId}
```

預設遊戲代碼是 `leader-main`。
