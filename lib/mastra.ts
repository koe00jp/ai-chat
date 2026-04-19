import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { createOllama } from "ollama-ai-provider";

const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const modelName = process.env.OLLAMA_MODEL ?? "llama3.2";

const ollama = createOllama({ baseURL: `${baseURL}/api` });

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions:
    "あなたは親切で役立つAIアシスタントです。ユーザーの質問に丁寧に答えてください。",
  model: ollama(modelName),
});

export const mastra = new Mastra({
  agents: { chatAgent },
});
