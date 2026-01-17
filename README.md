Portfolio Sight
===

Express + EJS + Prisma のポートフォリオサイトです。

Getting Started
---
1) 依存関係をインストール
```
npm install
```

2) Prisma クライアント生成
```
npx prisma generate
```

3) ローカルで起動
```
npm start
```

Render Deploy
---
- Render の Build Command 例:
```
npm install && npx prisma generate
```

- Render の Start Command 例:
```
node ./bin/www
```

- 本番で Prisma migrate deploy を実行する場合:
```
npx prisma migrate deploy
```

Admin
---
- /login から管理画面にログインできます。
- 初期管理者は `prisma/seed.js` で作成されます。

Notes
---
- 作品（Projects）は `/admin/projects` から管理します。
- 作品詳細は `/works/:slug` で公開されます。
