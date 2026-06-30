# Firebase 設定筆記

## 已完成

- 建立新 Firebase project：`leader-game`
- 建立 Web App 並填入 `public/firebase-config.js`
- 建立 Realtime Database
- 補上 `databaseURL`
- 建立 Hosting 設定：`firebase.json`
- 建立 Realtime Database 規則：`database.rules.json`

## Console 檢查

Firebase Console：

1. Project 選 `leader-game`
2. Build → Realtime Database
3. 確認 URL 是：

```text
https://leader-game-default-rtdb.asia-southeast1.firebasedatabase.app
```

4. Build → Hosting
5. 確認 Hosting site 是 `leader-game`

## 避免部署到舊專案

不要只執行：

```powershell
firebase deploy
```

請執行：

```powershell
firebase deploy --project leader-game --only hosting,database
```

本 repo 的 `.firebaserc` 已加入 `.gitignore`，避免把預設專案綁死或誤用舊站。
