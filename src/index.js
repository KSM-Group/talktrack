// Cloudflare Worker (new unified Workers flow — matches "npx wrangler deploy" in the dashboard).
// Serves the static app from /public (via the ASSETS binding) and handles POST /api/ai itself.
// Requires an environment variable / secret ANTHROPIC_API_KEY set in the Worker's settings.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ai" && request.method === "POST") {
      return handleAI(request, env);
    }

    // everything else: serve the static files in /public
    return env.ASSETS.fetch(request);
  }
};

async function handleAI(request, env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: "ANTHROPIC_API_KEY not configured on the server." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { messages, json: wantJson, maxTokens } = body || {};
  if (!messages) {
    return json({ error: "messages is required (string or array of {role, content})" }, 400);
  }

  const anthropicMessages = Array.isArray(messages)
    ? messages
    : [{ role: "user", content: String(messages) }];

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens || 1000,
        messages: anthropicMessages
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return json({ error: "Anthropic API error", detail: errText }, apiRes.status);
    }

    const data = await apiRes.json();
    const text = (data.content || [])
      .map((block) => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n");

    if (wantJson) {
      const cleaned = text.replace(/```json|```/g, "").trim();
      try {
        return json({ parsed: JSON.parse(cleaned), raw: text }, 200);
      } catch (e) {
        return json({ parsed: null, raw: text }, 200);
      }
    }

    return json({ text }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
