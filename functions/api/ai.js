// Cloudflare Pages Function.
// Lives at /functions/api/ai.js -> automatically served at the URL path /api/ai
// Keeps the Anthropic API key secret on the server — never sent to the browser.
// Requires an environment variable ANTHROPIC_API_KEY set in the Cloudflare Pages project settings.

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on the server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { messages, json, maxTokens } = body || {};
  if (!messages) {
    return new Response(JSON.stringify({ error: 'messages is required (string or array of {role, content})' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const anthropicMessages = Array.isArray(messages)
    ? messages
    : [{ role: 'user', content: String(messages) }];

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens || 1000,
        messages: anthropicMessages
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return new Response(JSON.stringify({ error: 'Anthropic API error', detail: errText }), {
        status: apiRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await apiRes.json();
    const text = (data.content || [])
      .map((block) => (block.type === 'text' ? block.text : ''))
      .filter(Boolean)
      .join('\n');

    if (json) {
      const cleaned = text.replace(/```json|```/g, '').trim();
      try {
        return new Response(JSON.stringify({ parsed: JSON.parse(cleaned), raw: text }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ parsed: null, raw: text }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
