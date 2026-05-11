import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.post("/chat", async (req: Request, res: Response) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });
    return;
  }

  const { messages, system } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    system?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required." });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: system ?? "Você é um assistente especializado em investimentos e finanças pessoais, integrado ao dashboard Reinhardt AI. Responda em português, de forma objetiva e útil.",
        messages,
      }),
    });

    const data = await upstream.json() as Record<string, unknown>;

    if (!upstream.ok) {
      req.log.error({ status: upstream.status, data }, "Anthropic API error");
      res.status(upstream.status).json({ error: (data as any)?.error?.message ?? "Upstream error." });
      return;
    }

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to reach Anthropic API");
    res.status(502).json({ error: "Could not reach the Anthropic API. Try again later." });
  }
});

export default router;
