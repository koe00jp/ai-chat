# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

汎用AIチャットボット。ログイン不要で誰でも使える一般公開向けWebアプリ。

## 技術スタック

- **フレームワーク**: Next.js 16（App Router） + TypeScript + Tailwind CSS v4
- **APIサーバー**: Hono（Next.js の API Route Handler 内で動作）
- **ORM**: Prisma（MongoDB アダプター使用）
- **AIエージェント**: Mastra
- **LLM**: Ollama（ローカル実行・APIキー不要）
- **推奨モデル**: llama3.2 または gemma3（日本語品質重視）
- **DB**: MongoDB Atlas（会話履歴の永続化・無料枠）
- **デプロイ**: Vercel

## 機能仕様

- ログイン不要（認証なし）
- 匿名ユーザーの会話履歴をMongoDBに保存
- シンプルなチャットUI（ChatGPTライク）
- セッションはブラウザ側で管理（sessionIdをlocalStorageに保持）
- MastraエージェントがOllamaを呼び出しストリーミングで返答

## アーキテクチャ

```
[ブラウザ]
  └─ Next.js App Router（フロントエンド）
       └─ Hono（APIルーティング / app/api/[[...route]]/route.ts）
            └─ Mastra Agent（Ollama呼び出し・ストリーミング）
            └─ Prisma（MongoDB への読み書き）
```

## データ設計（Prismaスキーマ）

```prisma
model Conversation {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  sessionId String
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  conversationId String       @db.ObjectId
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  role           String       // "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())
}
```

## ディレクトリ構成

```
app/
  api/
    [[...route]]/
      route.ts        # Hono ルーターのエントリーポイント
  page.tsx            # チャットUI（クライアントコンポーネント）
  layout.tsx
lib/
  hono.ts             # Hono アプリケーション定義
  mastra.ts           # Mastra エージェント設定
  prisma.ts           # Prisma クライアント
prisma/
  schema.prisma
```

## 環境変数

```
OLLAMA_BASE_URL=http://localhost:11434   # Ollama ローカルサーバー
OLLAMA_MODEL=llama3.2                   # 使用モデル名
DATABASE_URL=                           # MongoDB接続文字列（Prisma用）
```

## Commands

```bash
npm run dev                      # 開発サーバー起動（localhost:3000）
npm run build                    # プロダクションビルド
npm run lint                     # ESLint
npx prisma generate              # Prismaクライアント生成
npx prisma db push               # スキーマをDBに反映
```

## 開発時の注意

- Honoは `app/api/[[...route]]/route.ts` でNext.jsのRoute Handlerとして動かす
- Mastraエージェントのストリーミングレスポンスを活用する
- Prismaのサーバーレス環境での接続管理に注意（接続プールの使い回し）
- sessionIdはクライアント側でUUIDを生成しlocalStorageに保持する
