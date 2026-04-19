import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core/mastra";
import { createGroq } from "@ai-sdk/groq";
import { createOllama } from "ollama-ai-provider";

function buildModel() {
  if (process.env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return groq("llama-3.3-70b-versatile");
  }
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const modelName = process.env.OLLAMA_MODEL ?? "llama3.2";
  const ollama = createOllama({ baseURL: `${baseURL}/api` });
  return ollama(modelName);
}

export const chatAgent = new Agent({
  id: "chat-agent",
  name: "Chat Agent",
  instructions:
    "あなたは親切で役立つAIアシスタントです。ユーザーの質問に丁寧に答えてください。",
  model: buildModel(),
});

export const mastra = new Mastra({
  agents: { chatAgent },
});
