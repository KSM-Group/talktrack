// Cloudflare Worker (new unified Workers flow — matches "npx wrangler deploy" in the dashboard).
// Serves the static app from /public (via the ASSETS binding) and handles POST /api/ai itself.
// Uses Cloudflare Workers AI (free daily tier, no separate API key needed) — see the "ai" binding
// in wrangler.jsonc. No ANTHROPIC_API_KEY required for this version.

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

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
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { messages, json: wantJson } = body || {};
  if (!messages) {
    return json({ error: "messages is required (string or array of {role, content})" }, 400);
  }

  const workersAiMessages = Array.isArray(messages)
    ? messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
    : [{ role: "user", content: String(messages) }];

  try {
    const result = await env.AI.run(MODEL, {
      messages: workersAiMessages,
      max_tokens: 600
    });

    // Workers AI text-generation models return { response: "..." } (non-streaming).
    const text = (result && (result.response || result.result || "")) + "";

    if (wantJson) {
      const cleaned = text.replace(/```json|```/g, "").trim();
      try {
        return json({ parsed: JSON.parse(cleaned), raw: text }, 200);
      } catch (e) {
        // model sometimes wraps JSON in prose — try to find the first {...} block
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return json({ parsed: JSON.parse(match[0]), raw: text }, 200);
          } catch (e2) { /* fall through */ }
        }
        return json({ parsed: null, raw: text }, 200);
      }
    }

    return json({ text: text.trim() }, 200);
  } catch (e) {
    return json({ error: "Workers AI error", detail: String(e) }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
