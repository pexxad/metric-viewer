# アーキテクチャ・技術仕様

## 技術スタック

| カテゴリ | 技術 | バージョン | 選定理由 |
|---------|------|-----------|---------|
| Framework | Next.js (App Router) | 16.x | React SSR/SPA、API Routes内蔵 |
| Language | TypeScript | 5.x | 型安全性 |
| CSS | Tailwind CSS | 4.x | ユーティリティファーストCSS |
| Chart | TradingView Lightweight Charts | 5.x | TradingView品質の操作感、軽量、折れ線グラフ対応 |
| State | Zustand | 5.x | 粒度の高いsubscription、グラフ性能に有利 |
| Auth | AWS Amplify v6 | 6.x | Cognito統合が容易、モジュラー設計で軽量 |
| CSV解析 | papaparse | 5.x | 高速・堅牢なCSVパーサー |

## 設計原則

### 疎結合アーキテクチャ

`src/core/` 配下はReact/Next.jsに一切依存しない純粋なTypeScriptモジュールとして実装する。

```
src/core/          ← フレームワーク非依存（React/Next.js import禁止）
src/stores/        ← React依存だがNext.js非依存
src/components/    ← React UIコンポーネント
src/app/           ← Next.js App Router（薄いレイヤー）
```

### チャート方針

- TradingView Lightweight Charts v5 の LineSeries を使用
- 全シリーズを1つのチャートインスタンスに重ねる（時間軸自動整列）
- 欠損データ（null）はシリーズから除外し、LW Chartsがギャップ表示
- クロスヘアツールチップ: `subscribeCrosshairMove` で全シリーズの値を表示
- TimeRangeSlider: カスタムHTML slider ↔ `timeScale().setVisibleLogicalRange()` で双方向同期

### 認証

- AWS Amplify v6 で Cognito 統合
- `NEXT_PUBLIC_SKIP_AUTH=true` でローカルテスト時に認証スキップ可能
- 認証スキップ時はモックユーザーを提供し、Amplify初期化自体をスキップ

### データソースプラグイン

- `DataSourcePlugin` インターフェースに準拠するプラグインを登録
- 初期実装はCSVファイルソースのみ
- 将来的にAPIソースをプラグインとして追加可能

## カラーパレット

パネル追加時にインデックス順で割り当て。パネルのUI色とグラフのシリーズ色が一致する。

```
#2196F3, #FF5722, #4CAF50, #9C27B0,
#FF9800, #00BCD4, #E91E63, #8BC34A,
#3F51B5, #FFEB3B, #795548, #607D8B
```
