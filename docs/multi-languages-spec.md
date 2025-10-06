# Multiple Languages Feature Specification

## 概要

リポジトリの主要言語だけでなく、20%以上を占める全ての言語を取得・表示する。

## GitHub API

### Endpoint

```
GET /repos/{owner}/{repo}/languages
```

### Response Example

```json
{
  "TypeScript": 123456,
  "JavaScript": 45678,
  "CSS": 12345,
  "HTML": 5678
}
```

レスポンスは言語名とバイト数のマップ。

## データ構造

### 計算ロジック

1. 全言語のバイト数を合計
2. 各言語の割合（%）を計算
3. 20%以上の言語のみ抽出
4. 割合の降順でソート

### 例

```
Total: 187,157 bytes
- TypeScript: 123,456 (66%)  ✅ 20%以上
- JavaScript: 45,678 (24%)   ✅ 20%以上
- CSS: 12,345 (6%)           ❌ 20%未満
- HTML: 5,678 (3%)           ❌ 20%未満

→ 保存: ["TypeScript", "JavaScript"]
```

## データベーススキーマ

### 変更点

`repo_inventory` テーブルの `primaryLanguage` フィールドを拡張:

```typescript
// Before
primaryLanguage: text("primary_language")

// After
languages: jsonb("languages").$type<Array<{
  name: string;
  percentage: number;
}>>()

// primaryLanguage は後方互換性のため残す（最も使用率が高い言語）
primaryLanguage: text("primary_language")
```

## 実装

### 1. GitHub API 関数

`lib/github.ts` に追加:

```typescript
export async function listRepoLanguages(
  octokit: Octokit,
  owner: string,
  repo: string,
  threshold: number = 20 // 20% threshold
): Promise<Array<{ name: string; percentage: number }>>
```

### 2. スキャン処理統合

`lib/scan.ts` の `scanOneRepo()` 内:
- `listRepoLanguages()` を呼び出し
- `languages` フィールドに保存
- `primaryLanguage` には最も使用率が高い言語を設定（後方互換性）

### 3. UI 更新

`app/app/page.tsx`:
- Language 列に複数のバッジを表示
- 各バッジに GitHub 言語カラーを適用
- ホバーで割合（%）を表示

## UI デザイン

### 表示形式

```
┌──────────────┬────────────────────────────────┐
│ Repository   │ Languages                      │
├──────────────┼────────────────────────────────┤
│ frontend     │ TypeScript (66%) JavaScript (24%) │
│ backend      │ Python (85%)                   │
│ infra        │ HCL (100%)                     │
└──────────────┴────────────────────────────────┘
```

### スタイリング

- 各言語を Badge で表示
- 言語カラーを背景色に適用
- 複数言語は横並び（flex-wrap）
- 3個以上の場合は折り返し

## テストケース

1. **単一言語リポジトリ**
   - 100% Python → ["Python"]

2. **複数言語リポジトリ**
   - TypeScript 70%, JavaScript 30% → ["TypeScript", "JavaScript"]

3. **多言語リポジトリ**
   - Python 50%, JS 30%, CSS 15%, HTML 5% → ["Python", "JavaScript"]

4. **エラーケース**
   - 言語情報なし → []
   - API エラー → primaryLanguage のみ保持

## マイグレーション戦略

1. `languages` フィールドを nullable で追加
2. 既存データは `primaryLanguage` を維持
3. 再スキャン時に `languages` を更新
4. UI は `languages` が null の場合 `primaryLanguage` にフォールバック

## パフォーマンス

- GitHub API: 追加で1リクエスト/repo
- Rate limit への影響: 最小限（既に `/contributors` で増加済み）
- データサイズ: 平均 2-3 言語 × 20 bytes = 60 bytes/repo

## 参考

- [GitHub REST API - List repository languages](https://docs.github.com/en/rest/repos/repos#list-repository-languages)
