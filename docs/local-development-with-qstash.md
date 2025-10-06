# ローカル開発環境でのQStash使用ガイド

## 問題点

QStashは外部サービスなので、`http://localhost:3000`にはアクセスできません。
ローカル環境でテストするには、トンネルサービスが必要です。

## 解決方法: ngrok を使用

### 1. ngrokのセットアップ

ngrokは既にインストール済みです。認証トークンを設定します：

```bash
# ngrokにサインアップ（無料）
# https://dashboard.ngrok.com/signup

# 認証トークンを設定
ngrok config add-authtoken YOUR_AUTHTOKEN
```

### 2. 開発サーバーとngrokを起動

**ターミナル1**: 開発サーバー
```bash
pnpm dev
```

**ターミナル2**: ngrokトンネル
```bash
ngrok http 3000
```

ngrokが起動すると、以下のように表示されます：
```
Forwarding  https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3000
```

### 3. 環境変数を更新

`.env`ファイルを編集：
```bash
NEXT_PUBLIC_APP_URL="https://xxxx-xxxx-xxxx.ngrok-free.app"
# または
BETTER_AUTH_URL="https://xxxx-xxxx-xxxx.ngrok-free.app"
```

### 4. 開発サーバーを再起動

```bash
# ターミナル1でCtrl+C
pnpm dev
```

### 5. テスト

1. ngrokのURL（`https://xxxx.ngrok-free.app`）をブラウザで開く
2. GitHubでサインイン
3. 「Scan All Repositories」をクリック

## 代替案: 本番環境でテスト

ローカル開発でトンネルを使いたくない場合：

### 1. Vercel Preview環境を使用

```bash
git add .
git commit -m "test: QStash integration"
git push
```

Vercelが自動的にPreview Deploymentを作成します。

### 2. 環境変数をVercelに設定

Vercelダッシュボードで以下を設定：
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`
- その他すべての環境変数

### 3. Preview URLでテスト

`https://your-app-git-branch.vercel.app` でテストできます。

## トラブルシューティング

### ngrok "command not found"
```bash
brew install ngrok
```

### ngrok "authentication required"
```bash
# https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_TOKEN
```

### localtunnel "connection refused"
localtunnelは不安定なので、ngrokを推奨します。

## 推奨ワークフロー

**開発中（機能実装）**: QStashなしで同期処理
**統合テスト**: ngrok または Vercel Preview
**本番環境**: QStash有効化

開発中にQStashを無効化したい場合は、環境変数チェックを追加できます。
