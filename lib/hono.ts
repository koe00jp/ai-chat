import { Hono } from "hono";
import { stream } from "hono/streaming";
import { prisma } from "./prisma";
import { chatAgent, buildAgent } from "./mastra";

const MAX_CHARS = 2000;

const app = new Hono().basePath("/api");

app.post("/chat", async (c) => {
  const { message, sessionId, instructions } = await c.req.json<{
    message: string;
    sessionId: string;
    instructions?: string;
  }>();

  if (!message || !sessionId) {
    return c.json({ error: "message and sessionId are required" }, 400);
  }

  if (message.length > MAX_CHARS) {
    return c.json({ error: "message too long" }, 400);
  }

  let conversation = await prisma.conversation.findFirst({
    where: { sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { sessionId, messages: { create: [] } },
      include: { messages: true },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content: message },
  });

  const history = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const agent = instructions ? buildAgent(instructions) : chatAgent;
  const agentStream = await agent.stream([
    ...history,
    { role: "user", content: message },
  ]);

  let fullResponse = "";

  return stream(c, async (s) => {
    for await (const chunk of agentStream.textStream) {
      fullResponse += chunk;
      await s.write(chunk);
    }

    await prisma.message.create({
      data: {
        conversationId: conversation!.id,
        role: "assistant",
        content: fullResponse,
      },
    });
  });
});

app.get("/conversations/:sessionId", async (c) => {
  const { sessionId } = c.req.param();

  const conversation = await prisma.conversation.findFirst({
    where: { sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return c.json({ messages: [] });
  }

  return c.json({
    messages: conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });
});

app.get("/conversations", async (c) => {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    take: 50,
  });

  return c.json({
    conversations: conversations.map((conv) => ({
      sessionId: conv.sessionId,
      preview: conv.messages[0]?.content.slice(0, 60) ?? "（メッセージなし）",
      updatedAt: conv.updatedAt,
    })),
  });
});

app.delete("/conversations/:sessionId", async (c) => {
  const { sessionId } = c.req.param();

  const conversation = await prisma.conversation.findFirst({ where: { sessionId } });
  if (!conversation) return c.json({ error: "not found" }, 404);

  await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
  await prisma.conversation.delete({ where: { id: conversation.id } });

  return c.json({ ok: true });
});

export default app;
