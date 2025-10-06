# QStash Setup Guide

## 1. QStashアカウント作成とトークン取得

1. [Upstash Console](https://console.upstash.com) にアクセス
2. サインアップまたはログイン
3. 左メニューから **QStash** をクリック
4. **Request Builder** セクションに以下の情報が表示されます：

### 必要な環境変数

コンソールの **Request Builder** タブに以下が表示されています：

```bash
# これをコピー
QSTASH_TOKEN="qstash_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Signing Keys セクションから
QSTASH_CURRENT_SIGNING_KEY="sig_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
QSTASH_NEXT_SIGNING_KEY="sig_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 重要な注意点

- `QSTASH_TOKEN` は `qstash_` で始まる文字列です
- Base64エンコードされたJSONではありません
- コンソールの **Request Builder** タブにそのまま表示されています

## 2. .envファイルに設定

`.env` ファイルを編集：

```bash
# Upstash QStash
QSTASH_TOKEN="qstash_xxxxxxxxxxxxxxxxxxxxxxxxxx"  # "qstash_"で始まる
QSTASH_CURRENT_SIGNING_KEY="sig_xxxxxxxxxxxxxxxxxx"
QSTASH_NEXT_SIGNING_KEY="sig_xxxxxxxxxxxxxxxxxx"
```

## 3. 開発サーバーを再起動

```bash
# Ctrl+C で停止して再起動
pnpm dev
```

## トークンの見つけ方

1. https://console.upstash.com/qstash にアクセス
2. **Request Builder** タブを選択
3. 右側のコードサンプルに `QSTASH_TOKEN` が表示されています
4. **Settings** タブで Signing Keys を確認

## トラブルシューティング

### "invalid token" エラー
- トークンが `qstash_` で始まっているか確認
- `.env` ファイルに引用符 `"` が正しく含まれているか確認
- 開発サーバーを再起動したか確認

### トークンが見つからない
- QStashは無料プランがあります
- 新規プロジェクトの場合、自動的に作成されます
- コンソールの **Request Builder** タブを確認
