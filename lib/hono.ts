import { Hono } from "hono";
import { stream } from "hono/streaming";
import { prisma } from "./prisma";
import { chatAgent } from "./mastra";

const app = new Hono().basePath("/api");

app.post("/chat", async (c) => {
  const { message, sessionId } = await c.req.json<{
    message: string;
    sessionId: string;
  }>();

  if (!message || !sessionId) {
    return c.json({ error: "message and sessionId are required" }, 400);
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

  const agentStream = await chatAgent.stream([
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

export default app;
