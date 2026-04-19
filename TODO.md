# AI チャットボット 実装TODOリスト

## Phase 1: 環境セットアップ

- [x] Ollamaをインストールする（https://ollama.com）
- [x] Ollamaのモデルを取得する（`ollama pull llama3.2`）
- [x] MongoDB Atlasでアカウント作成・クラスター作成
- [x] MongoDB の接続文字列を取得する
- [x] Next.jsプロジェクトを作成する（`create-next-app`）

## Phase 2: 依存パッケージのインストール

- [x] Hono をインストールする（`npm install hono`）
- [x] Prisma をインストールする（`npm install prisma @prisma/client`）
- [x] Mastra をインストールする（`npm install @mastra/core`）
- [x] Ollama連携パッケージをインストールする（`npm install ollama-ai-provider`）
- [x] `.env.local` を作成して環境変数を設定する

## Phase 3: DB・ORM セットアップ

- [x] `prisma/schema.prisma` を作成する（MongoDB・Conversation・Messageモデル）
- [x] `npx prisma generate` でクライアントを生成する
- [x] `npx prisma db push` でスキーマをMongoDBに反映する
- [x] `lib/prisma.ts` でPrismaクライアントのシングルトンを作成する

## Phase 4: バックエンド実装

- [x] `lib/mastra.ts` でMastraエージェントを設定する（Groq / Ollama フォールバック）
- [x] `lib/hono.ts` でHonoアプリを定義する
- [x] `POST /api/chat` エンドポイントを実装する（メッセージ送信・ストリーミング）
- [x] `GET /api/conversations/:sessionId` エンドポイントを実装する（履歴取得）
- [x] `app/api/[[...route]]/route.ts` でHonoをNext.jsのRoute Handlerに接続する

## Phase 5: フロントエンド実装

- [x] `app/page.tsx` にチャットUIを実装する（クライアントコンポーネント）
  - [x] localStorageからsessionIdを取得・なければ生成する
  - [x] 会話履歴の表示
  - [x] メッセージ入力フォーム
  - [x] ストリーミングレスポンスの表示
  - [x] ローディング状態の表示
- [x] `app/layout.tsx` のメタデータを更新する
- [x] Tailwindでスタイリングする（マークダウン・アバター・シンタックスハイライト付きUI）

## Phase 6: 動作確認

- [x] ローカルで `ollama serve` を起動する（systemdサービスとして自動起動）
- [x] `npm run dev` で開発サーバーを起動する
- [x] メッセージ送受信が動作することを確認する
- [x] ストリーミングが正常に動作することを確認する
- [x] 会話履歴がMongoDBに保存されることを確認する
- [x] リロード後に履歴が復元されることを確認する

## Phase 7: デプロイ

- [x] GitHubリポジトリを作成してプッシュする
- [x] Vercelにプロジェクトをリンクする
- [x] Vercelに環境変数を設定する（DATABASE_URL・GROQ_API_KEY）
- [x] `vercel --prod` でデプロイする
- [x] 本番環境での動作確認

## Phase 8: UX改善

### 8-1. 会話リセット機能
- [ ] 「新しい会話」ボタンをヘッダーに追加する
- [ ] ボタン押下でsessionIdを新規生成しlocalStorageを更新する
- [ ] メッセージ一覧をクリアしてUI上も初期状態に戻す

### 8-2. エラーハンドリングの改善
- [ ] APIエラーの種別（レート制限・タイムアウト・サーバーエラー）を判定する
- [ ] エラー種別に応じたメッセージをUI上に表示する
- [ ] 再試行ボタンを表示する

### 8-3. メッセージのコピーボタン
- [ ] AIメッセージにホバーするとコピーボタンを表示する
- [ ] コードブロックにコピーボタンを追加する（クリップボードにコピー）
- [ ] コピー完了のフィードバック（「コピーしました」トースト等）を表示する

### 8-4. システムプロンプトのカスタマイズ
- [ ] プリセット（汎用・翻訳・コードレビュー・要約）を定義する
- [ ] ヘッダーにプリセット選択UIを追加する
- [ ] 選択したプリセットをMastraエージェントの `instructions` に反映する

### 8-5. Vercel Function タイムアウト対策
- [ ] `vercel.json` を作成して `/api/*` の `maxDuration` を60秒に設定する

### 8-6. 入力文字数制限・バリデーション
- [ ] フロントエンドで入力を2000文字に制限する
- [ ] 残り文字数カウンターを入力欄の下に表示する
- [ ] バックエンドでも文字数を検証してエラーを返す

### 8-7. サイドバーで過去の会話一覧
- [ ] `GET /api/conversations` エンドポイントを追加する（全セッション取得）
- [ ] `DELETE /api/conversations/:sessionId` エンドポイントを追加する
- [ ] サイドバーコンポーネントを実装する（会話一覧・選択・削除）
- [ ] セッション切り替え時にメッセージ履歴を切り替える

### 8-8. レスポンシブ対応の強化
- [ ] スマートフォンでキーボード表示時にフッターが隠れないよう修正する（`dvh` 単位使用）
- [ ] サイドバーをモバイルではドロワーとして表示する
- [ ] タッチ操作でのスクロールを改善する

## 備考

- 本番環境のLLMはGroq（llama-3.3-70b-versatile）を使用
- GROQ_API_KEY が未設定の場合はOllama（ローカル）にフォールバック
- 本番URL: https://ai-chat-sigma-topaz.vercel.app
