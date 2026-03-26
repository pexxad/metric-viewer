# Better Auth + Cognito ハイブリッド認証 設計書

> **ステータス**: 未着手
> **作成日**: 2026-03-26
> **対象**: metric-viewer サーバサイド認証移行

---

## 1. 背景と目的

### 現状の問題

- aws-amplify v6 によるクライアントサイドのみの Cognito 認証
- トークンがブラウザの localStorage に保存されセキュリティリスクがある
- サーバサイドの認証チェックが一切ない（ミドルウェア・API保護なし）
- Amplify のサーバサイドアダプタ（`@aws-amplify/adapter-nextjs`）は Next.js <16 のみ対応で、本プロジェクトの Next.js 16.2.1 では使えない

### 解決策

**Better Auth** でサーバサイドセッション管理を行い、パスワード検証は **Cognito API を内部呼出し** するハイブリッド構成。カスタムログインフォームの UX を維持しつつ、認証ロジックを完全にサーバサイドに移す。

### 前提条件

- Cognito アプリクライアントで **ALLOW_USER_PASSWORD_AUTH** フローを有効にすること（AWS Console / IaC 側の設定変更）

---

## 2. アーキテクチャ概要

```
ログインフォーム（クライアント）
  → Better Auth client: signIn.email({ email, password })
    → POST /api/auth/sign-in/email
      → Cognito Plugin (before hook)
        → @aws-sdk InitiateAuth(USER_PASSWORD_AUTH) で Cognito 検証
        → 成功: Better Auth がセッション作成 + Cognito トークンを session テーブルに保存
        → 失敗: エラー返却
      → httpOnly セッション Cookie をクライアントに返却
```

### 技術選定理由

| 選択肢 | 採否 | 理由 |
|---|---|---|
| Better Auth + Cognito 内部呼出し | **採用** | カスタムフォーム維持、サーバサイド完備、Next.js 16 対応 |
| Amplify サーバサイドアダプタ | 不可 | Next.js 16 非対応 |
| Better Auth Cognito ソーシャルプロバイダ | 不採用 | Hosted UI リダイレクト必須でUX変更が必要 |
| AWS SDK 直接 + iron-session | 候補 | 実現可能だが自前実装が多い |
| Auth.js + Credentials | 候補 | Credentials プロバイダに制限あり |

---

## 3. 依存パッケージ

### 追加

```bash
npm install better-auth @aws-sdk/client-cognito-identity-provider better-sqlite3 drizzle-orm
npm install -D drizzle-kit @types/better-sqlite3
```

### 削除

```bash
npm uninstall aws-amplify
```

---

## 4. ファイル変更一覧

### 新規作成

| ファイル | 内容 |
|---|---|
| `src/lib/auth/server.ts` | Better Auth サーバインスタンス（メイン設定） |
| `src/lib/auth/client.ts` | Better Auth クライアント（`createAuthClient`） |
| `src/lib/auth/cognito.ts` | Cognito SDK ヘルパー |
| `src/lib/auth/cognito-plugin.ts` | カスタムプラグイン: sign-in の before フックで Cognito 検証 |
| `src/lib/auth/db.ts` | Drizzle + SQLite クライアント初期化 |
| `src/lib/auth/schema.ts` | Drizzle スキーマ（Better Auth 標準 + Cognito トークン拡張カラム） |
| `src/app/api/auth/[...all]/route.ts` | Better Auth API ルートハンドラ |
| `src/proxy.ts` | Next.js 16 Proxy（旧 middleware）— 認証リダイレクト |
| `drizzle.config.ts` | Drizzle Kit 設定ファイル |

### 修正

| ファイル | 変更内容 |
|---|---|
| `src/app/login/page.tsx` | `aws-amplify/auth` → Better Auth client `signIn.email()` |
| `src/components/auth/AuthProvider.tsx` | Amplify → Better Auth `useSession` ベースに書き換え |
| `src/components/auth/AuthGuard.tsx` | Better Auth セッションベースに書き換え |
| `src/app/page.tsx` | AuthProvider/AuthGuard ラッパーの調整 |
| `src/app/layout.tsx` | `configureAmplify()` 削除 |
| `src/hooks/useAuth.ts` | Better Auth client ベースに書き換え |
| `next.config.ts` | `serverExternalPackages: ["better-sqlite3"]` 追加 |
| `package.json` | 依存パッケージ追加・削除 |
| `.gitignore` | `data/auth.db` 追加 |

### 削除

| ファイル | 理由 |
|---|---|
| `src/lib/amplify/config.ts` | Amplify 不要 |

---

## 5. 実装の詳細

### 5.1 DB 層 (`src/lib/auth/db.ts`)

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database("data/auth.db");
export const db = drizzle(sqlite);
```

### 5.2 スキーマ (`src/lib/auth/schema.ts`)

Better Auth の標準テーブル（`user`, `session`, `account`, `verification`）に加え、session テーブルに Cognito トークン用の拡張カラムを追加。

```typescript
// Better Auth が自動マイグレーションで作成する標準テーブルに加え、
// additionalFields で以下を session に追加:
//
// cognitoAccessToken  TEXT
// cognitoIdToken      TEXT
// cognitoRefreshToken TEXT
// cognitoTokenExpiry  INTEGER (Unix timestamp)
//
// user テーブルには:
// cognitoSub          TEXT (Cognito User Pool sub)
```

### 5.3 Cognito SDK ヘルパー (`src/lib/auth/cognito.ts`)

```typescript
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION,
});

interface CognitoAuthResult {
  success: true;
  tokens: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

interface CognitoAuthError {
  success: false;
  error: string;
}

export async function authenticateWithCognito(
  email: string,
  password: string,
): Promise<CognitoAuthResult | CognitoAuthError> {
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);
    const result = response.AuthenticationResult;

    if (!result?.AccessToken || !result.IdToken) {
      return { success: false, error: "Authentication failed" };
    }

    return {
      success: true,
      tokens: {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        refreshToken: result.RefreshToken ?? "",
        expiresIn: result.ExpiresIn ?? 3600,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return { success: false, error: message };
  }
}
```

### 5.4 カスタムプラグイン (`src/lib/auth/cognito-plugin.ts`)

**設計ポイント**: Better Auth の `password.verify` フックは `{ hash, password }` しか受け取れずメールアドレスにアクセスできない。そのためプラグインの `hooks.before` で `/sign-in/email` をインターセプトし、フルのリクエストボディ（email + password）でCognito検証を行う。

```typescript
import type { BetterAuthPlugin } from "better-auth";
import { authenticateWithCognito } from "./cognito";

// 一時的にCognitoトークンを保持するMap（sign-in → session作成間の橋渡し）
// シングルインスタンス前提。TTL付きで安全に運用。
export const cognitoTokenStore = new Map<
  string,
  {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
    storedAt: number;
  }
>();

// 5分以上経過したエントリを自動削除
function cleanupTokenStore() {
  const now = Date.now();
  for (const [key, value] of cognitoTokenStore) {
    if (now - value.storedAt > 5 * 60 * 1000) {
      cognitoTokenStore.delete(key);
    }
  }
}

const SKIP_AUTH = process.env.SKIP_AUTH === "true";

export const cognitoPlugin = {
  id: "cognito-auth",
  hooks: {
    before: [
      {
        matcher: (context) => context.path === "/sign-in/email",
        handler: async (context) => {
          if (SKIP_AUTH) {
            return { context }; // バイパス: Better Auth 自体の認証に任せる
          }

          cleanupTokenStore();

          const { email, password } = context.body;
          const result = await authenticateWithCognito(email, password);

          if (!result.success) {
            throw new APIError("UNAUTHORIZED", {
              message: result.error,
            });
          }

          // トークンを一時保存（session作成後にDBに書き込む）
          cognitoTokenStore.set(email, {
            ...result.tokens,
            storedAt: Date.now(),
          });

          // ユーザが Better Auth DB に未登録の場合の処理は
          // server.ts の databaseHooks で対応

          return { context };
        },
      },
    ],
  },
} satisfies BetterAuthPlugin;
```

### 5.5 Better Auth サーバ設定 (`src/lib/auth/server.ts`)

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { cognitoPlugin, cognitoTokenStore } from "./cognito-plugin";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, { provider: "sqlite" }),

  plugins: [nextCookies(), cognitoPlugin],

  emailAndPassword: {
    enabled: true,
    password: {
      // Cognito プラグインで既に検証済みなので常に true を返す
      verify: async () => true,
      // ユーザ作成時のダミーハッシュ
      hash: async () => "COGNITO_MANAGED",
    },
  },

  // セッション作成後に Cognito トークンを DB に書き込む
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // session.userId からユーザのemailを取得し、
          // cognitoTokenStore から対応するトークンを取り出して
          // session テーブルの拡張カラムに UPDATE する
          // （実装時に Better Auth の内部APIで対応）
        },
      },
    },
  },

  // セッション拡張フィールド（Cognito トークン）
  session: {
    additionalFields: {
      cognitoAccessToken: { type: "string", required: false },
      cognitoIdToken: { type: "string", required: false },
      cognitoRefreshToken: { type: "string", required: false },
      cognitoTokenExpiry: { type: "number", required: false },
    },
  },

  user: {
    additionalFields: {
      cognitoSub: { type: "string", required: false },
    },
  },
});
```

### 5.6 Better Auth クライアント (`src/lib/auth/client.ts`)

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "",
});
```

### 5.7 API ルートハンドラ (`src/app/api/auth/[...all]/route.ts`)

```typescript
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

export const { GET, POST } = toNextJsHandler(auth);
```

### 5.8 Proxy (`src/proxy.ts`)

Next.js 16 では `middleware.ts` は非推奨、`proxy.ts` が後継。

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SKIP_AUTH = process.env.SKIP_AUTH === "true";

export function proxy(request: NextRequest) {
  if (SKIP_AUTH) {
    return NextResponse.next();
  }

  // Better Auth のデフォルトセッション Cookie 名
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const { pathname } = request.nextUrl;

  // API ルートと静的アセットは除外
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 未認証 → ログインへリダイレクト
  if (!sessionCookie && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 認証済み → ログインページからリダイレクト
  if (sessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

> **注意**: Proxy はセッション Cookie の有無による**楽観的チェック**のみ。真のセッション検証は Server Components 内で `auth.api.getSession()` を使う。

### 5.9 ログインページ書き換え (`src/app/login/page.tsx`)

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
      });
      if (authError) {
        setError(authError.message ?? "Sign in failed");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    // ... 既存の JSX をほぼそのまま維持
    // signIn の呼び出し部分のみ上記に差し替え
  );
}
```

### 5.10 AuthProvider 書き換え (`src/components/auth/AuthProvider.tsx`)

```typescript
"use client";

import { createContext } from "react";
import { authClient } from "@/lib/auth/client";

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  const user: AuthUser | null = session?.user
    ? { userId: session.user.id, email: session.user.email }
    : null;

  const signOut = async () => {
    await authClient.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: isPending,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
```

### 5.11 next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

---

## 6. 環境変数

### 削除（クライアント公開 → サーバ専用に移行）

| 旧 | 新 |
|---|---|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `COGNITO_USER_POOL_ID` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | `COGNITO_CLIENT_ID` |

### 新規追加

| 変数名 | 説明 | 例 |
|---|---|---|
| `COGNITO_REGION` | AWS リージョン | `ap-northeast-1` |
| `BETTER_AUTH_SECRET` | セッション署名シークレット | `openssl rand -base64 32` で生成 |
| `BETTER_AUTH_URL` | アプリケーション URL | `http://localhost:3000` |
| `SKIP_AUTH` | サーバ側開発バイパス | `true` |

### 維持

| 変数名 | 説明 |
|---|---|
| `NEXT_PUBLIC_SKIP_AUTH` | クライアント UI 制御用（開発バイパス） |

---

## 7. 実装順序

1. 依存パッケージのインストール
2. `.gitignore` に `data/auth.db` 追加
3. DB 層の作成（`db.ts`）
4. Drizzle スキーマ作成（`schema.ts`）
5. Cognito SDK ヘルパー作成（`cognito.ts`）
6. カスタムプラグイン作成（`cognito-plugin.ts`）
7. Better Auth サーバ設定（`server.ts`）
8. Better Auth クライアント（`client.ts`）
9. API ルートハンドラ作成（`[...all]/route.ts`）
10. Proxy 作成（`proxy.ts`）
11. `next.config.ts` 更新
12. ログインページ書き換え（`login/page.tsx`）
13. AuthProvider 書き換え
14. AuthGuard 書き換え
15. `page.tsx` 調整（AuthProvider/AuthGuard ラッパー）
16. `layout.tsx` から `configureAmplify()` 削除
17. `useAuth.ts` 書き換え
18. `src/lib/amplify/config.ts` 削除
19. `aws-amplify` アンインストール
20. Drizzle マイグレーション実行（`npx drizzle-kit push` または `better-auth migrate`）
21. 動作確認

---

## 8. 検証手順

1. `npm run dev` でアプリ起動
2. **SKIP_AUTH=true 時**:
   - ログインページがバイパスされ開発ユーザでアクセスできること
3. **SKIP_AUTH 未設定時**:
   - `/` にアクセス → `/login` にリダイレクトされること
   - ログインフォームで email/password 入力 → サインイン成功 → `/` に遷移すること
   - ページリロード → セッション維持されること
   - サインアウト → `/login` にリダイレクトされること
4. ブラウザ DevTools で Cookie を確認:
   - httpOnly のセッション Cookie が設定されていること
   - localStorage にトークンがないこと
5. `npm run build` が成功すること

---

## 9. 注意事項・リスク

| 項目 | 詳細 |
|---|---|
| Cognito フロー設定 | アプリクライアントで `ALLOW_USER_PASSWORD_AUTH` の有効化が**前提条件** |
| ネイティブモジュール | `better-sqlite3` は C++ ネイティブモジュール。`serverExternalPackages` 設定必須 |
| トークン一時保存 | プロセスメモリ上の Map はシングルインスタンス前提（SQLite 使用時は問題なし） |
| 初回ログイン | Cognito にユーザが存在するが Better Auth DB にない場合、自動的にユーザレコードを作成する処理が必要 |
| トークンリフレッシュ | Cognito アクセストークンは通常1時間で期限切れ。必要に応じてリフレッシュトークンで更新するユーティリティを実装 |

---

## 10. 参考リンク

- [Better Auth 公式ドキュメント](https://better-auth.com/docs)
- [Better Auth Cognito プロバイダ](https://better-auth.com/docs/authentication/cognito)
- [Better Auth Next.js 統合](https://better-auth.com/docs/integrations/next)
- [AWS SDK InitiateAuth](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity-provider_example_cognito-identity-provider_InitiateAuth_section.html)
- [Next.js 16 Proxy ドキュメント](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) （ローカル: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`）
- [Next.js 16 認証ガイド](https://nextjs.org/docs/app/guides/authentication) （ローカル: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`）
