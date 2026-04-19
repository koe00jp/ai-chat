# AI チャットボット 実装TODOリスト

## Phase 1: 環境セットアップ

- [ ] Ollamaをインストールする（https://ollama.com）
- [ ] Ollamaのモデルを取得する（`ollama pull llama3.2`）
- [ ] MongoDB Atlasでアカウント作成・クラスター作成
- [ ] MongoDB の接続文字列を取得する
- [ ] Next.jsプロジェクトを作成する（`create-next-app`）

## Phase 2: 依存パッケージのインストール

- [ ] Hono をインストールする（`npm install hono`）
- [ ] Prisma をインストールする（`npm install prisma @prisma/client`）
- [ ] Mastra をインストールする（`npm install @mastra/core`）
- [ ] Ollama連携パッケージをインストールする（`npm install ollama`）
- [ ] `.env.local` を作成して環境変数を設定する

## Phase 3: DB・ORM セットアップ

- [ ] `prisma/schema.prisma` を作成する（MongoDB・Conversation・Messageモデル）
- [ ] `npx prisma generate` でクライアントを生成する
- [ ] `npx prisma db push` でスキーマをMongoDBに反映する
- [ ] `lib/prisma.ts` でPrismaクライアントのシングルトンを作成する

## Phase 4: バックエンド実装

- [ ] `lib/mastra.ts` でMastraエージェントを設定する（Ollamaと接続）
- [ ] `lib/hono.ts` でHonoアプリを定義する
- [ ] `POST /api/chat` エンドポイントを実装する（メッセージ送信・ストリーミング）
- [ ] `GET /api/conversations/:sessionId` エンドポイントを実装する（履歴取得）
- [ ] `app/api/[[...route]]/route.ts` でHonoをNext.jsのRoute Handlerに接続する

## Phase 5: フロントエンド実装

- [ ] `app/page.tsx` にチャットUIを実装する（クライアントコンポーネント）
  - [ ] localStorageからsessionIdを取得・なければ生成する
  - [ ] 会話履歴の表示
  - [ ] メッセージ入力フォーム
  - [ ] ストリーミングレスポンスの表示
  - [ ] ローディング状態の表示
- [ ] `app/layout.tsx` のメタデータを更新する
- [ ] Tailwindでスタイリングする（シンプルなChatGPTライクUI）

## Phase 6: 動作確認

- [ ] ローカルで `ollama serve` を起動する
- [ ] `npm run dev` で開発サーバーを起動する
- [ ] メッセージ送受信が動作することを確認する
- [ ] ストリーミングが正常に動作することを確認する
- [ ] 会話履歴がMongoDBに保存されることを確認する
- [ ] リロード後に履歴が復元されることを確認する

## Phase 7: デプロイ

- [ ] GitHubリポジトリを作成してプッシュする
- [ ] Vercelにプロジェクトをリンクする
- [ ] Vercelに環境変数を設定する（DATABASE_URL・OLLAMA_BASE_URL・OLLAMA_MODEL）
- [ ] `vercel --prod` でデプロイする
- [ ] 本番環境での動作確認

## 備考

- Vercelへのデプロイ後、OllamaはローカルのためVercel上では動作しない
- 本番環境でのLLM実行には別途サーバーまたはAPIサービスへの移行が必要
