module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed." }));
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing OPENAI_API_KEY." }));
    return;
  }

  const readBody = () =>
    new Promise((resolve, reject) => {
      if (req.body && typeof req.body === "object") {
        resolve(req.body);
        return;
      }
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => {
        try {
          resolve(JSON.parse(data || "{}"));
        } catch (error) {
          reject(error);
        }
      });
      req.on("error", reject);
    });

  try {
    const body = await readBody();
    const url = body.url ? String(body.url) : "";
    if (!url) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing URL." }));
      return;
    }

    const { createLinkPreviewClient } = await import("@steipete/summarize-core/content");
    const { buildLinkSummaryPrompt } = await import("@steipete/summarize-core/prompts");

    const client = createLinkPreviewClient({ env: process.env });
    const extracted = await client.fetchLinkContent(url, { format: "text" });

    const prompt = buildLinkSummaryPrompt({
      url: extracted.url,
      title: extracted.title,
      siteName: extracted.siteName,
      description: extracted.description,
      content: extracted.content,
      truncated: extracted.truncated,
      hasTranscript: Boolean(extracted.transcriptSource),
      hasTranscriptTimestamps: Boolean(extracted.transcriptTimedText),
      slides: null,
      outputLanguage: { kind: "auto" },
      summaryLength: "medium",
      shares: [],
    });

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const llmResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      throw new Error(`OpenAI error: ${errorText}`);
    }

    const data = await llmResponse.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) {
      throw new Error("No summary returned.");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ summary }));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: error.message }));
  }
};
