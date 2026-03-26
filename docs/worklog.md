# 作業ログ

## Phase 1: 基盤構築

### Next.js プロジェクト初期化

- `npx create-next-app@latest` を使用。リポジトリ内に既存ファイル（README.md, mise.toml等）があると衝突エラーが発生するため、一時退避して実行した。
- 対話プロンプト（React Compiler, AGENTS.md）が出るため、パイプ入力やヘッドレス実行は困難。手動での実行が確実。
- オプション: `--typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack`

### 依存パッケージ

```
npm install lightweight-charts zustand papaparse uuid aws-amplify
npm install -D @types/papaparse @types/uuid
```

### mise によるNodeJS管理

- プロジェクトでは mise (mise.toml: `node = "24"`) でNodeJSを管理。
- Claude Codeのシェル環境ではmise shimsが自動でPATHに入らないため、`export PATH="$HOME/.local/share/mise/shims:$PATH"` を毎回実行する必要がある。

## Phase 1-3: コアモジュール + UI + チャート

### ディレクトリ構成

`src/core/` 配下をフレームワーク非依存のピュアTSモジュールとして実装:

- `src/core/data/types.ts` - Dataset, DataRow, PanelEntry型定義
- `src/core/data/csvParser.ts` - papaparseを使用したCSV→Dataset変換
- `src/core/chart/colors.ts` - 12色パレット + インデックスベース割当
- `src/core/chart/seriesFactory.ts` - Dataset→Lightweight Chartsデータ変換
- `src/core/chart/timeScale.ts` - タイムスタンプフォーマットヘルパー
- `src/core/datasource/interface.ts` - DataSourcePluginインターフェース
- `src/core/datasource/registry.ts` - プラグインレジストリ

### 状態管理

Zustandストア2つ:
- `datasetStore` - データセット + パネル管理
- `uiStore` - UI状態（サイドバー、ダイアログ、ツールチップ）

### チャート実装

- Lightweight Charts v5の`createChart` + `LineSeries`を使用
- `useChart` hookで: チャートライフサイクル管理、パネル↔シリーズ同期、クロスヘアツールチップ
- ResizeObserverで自動リサイズ対応

### UIコンポーネント

- `AppShell` - ヘッダー + サイドバー + メインエリアの基本レイアウト
- `PanelList` / `DatasetPanel` - サイドバーのパネル一覧（色表示、可視性トグル、削除ボタン）
- `CsvImportDialog` - CSVファイル選択→プレビュー→属性選択→インポート
- `ChartContainer` / `ChartOverlay` - グラフ表示 + ツールチップ

## Phase 4: 認証

### AWS Amplify v6 統合

- 当初、Amplify未インストール状態でdynamic importや型宣言ファイル(`aws-amplify-auth.d.ts`)による回避を試みたが、TypeScript静的解析で型エラーが解消できなかった。
- 結論: **`aws-amplify`パッケージを直接インストールし、通常のimportを使用**するのが最もシンプル。

### 認証スキップ

- `NEXT_PUBLIC_SKIP_AUTH=true` 環境変数で制御
- `AuthProvider`: SKIP_AUTH時はモックユーザー（local-dev）を即座にセット、Amplify APIを呼ばない
- `AuthGuard`: SKIP_AUTH時は常に子コンポーネントを表示

### Amplify設定

- `src/lib/amplify/config.ts` で `Amplify.configure()` を実行
- `src/app/layout.tsx` のモジュールスコープで呼び出し（Server Component内で実行される）
- SKIP_AUTH=true時はconfigure自体をスキップ

### ログインページ

- `src/app/login/page.tsx` にEmail/Password認証フォームを実装
- `signIn` from `aws-amplify/auth` を使用
- 認証成功後 `/` にリダイレクト

## Phase 5: プラグインシステム + 仕上げ

### CSVプラグイン

- `src/core/datasource/csvFileSource.ts` - DataSourcePluginインターフェースを実装
- query.params.csvTextにCSVテキストを渡して使用

### ビルド検証

- `npx next build` で全ページ（`/`, `/login`, `/_not-found`）のビルド成功を確認
- TypeScript型チェックもパス

### サンプルデータ

- `docs/sample.csv` - 動作確認用の株価サンプルCSV（7日分、株価+出来高）

## 現在のファイル構成

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx              # Amplify初期化 + 基本レイアウト
│   ├── page.tsx                # メインダッシュボード
│   └── login/page.tsx          # ログインページ
├── components/
│   ├── auth/
│   │   ├── AuthProvider.tsx    # 認証コンテキスト（SKIP_AUTH対応）
│   │   └── AuthGuard.tsx       # 認証ガード（SKIP_AUTH対応）
│   ├── chart/
│   │   ├── ChartContainer.tsx  # チャート表示領域
│   │   ├── ChartOverlay.tsx    # ツールチップオーバーレイ
│   │   └── useChart.ts        # チャートライフサイクルhook
│   ├── data-source/
│   │   └── CsvImportDialog.tsx # CSVインポートダイアログ
│   ├── layout/
│   │   ├── AppShell.tsx        # アプリシェル
│   │   └── Header.tsx          # ヘッダー
│   └── panels/
│       ├── AddPanelButton.tsx  # パネル追加ボタン
│       ├── DatasetPanel.tsx    # 個別パネル表示
│       └── PanelList.tsx       # パネル一覧
├── core/                       # フレームワーク非依存モジュール
│   ├── chart/
│   │   ├── colors.ts
│   │   ├── seriesFactory.ts
│   │   └── timeScale.ts
│   ├── data/
│   │   ├── csvParser.ts
│   │   └── types.ts
│   └── datasource/
│       ├── csvFileSource.ts
│       ├── interface.ts
│       └── registry.ts
├── hooks/
│   └── useAuth.ts
├── lib/
│   └── amplify/config.ts
└── stores/
    ├── datasetStore.ts
    └── uiStore.ts
```
