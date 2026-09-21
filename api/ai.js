// Vercel serverless function (Node runtime).
// Keeps the Anthropic API key secret on the server — never sent to the browser.
// Requires an environment variable ANTHROPIC_API_KEY set in your Vercel project settings.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server.' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const { messages, json, maxTokens } = body || {};
  if (!messages) {
    res.status(400).json({ error: 'messages is required (string or array of {role, content})' });
    return;
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
      res.status(apiRes.status).json({ error: 'Anthropic API error', detail: errText });
      return;
    }

    const data = await apiRes.json();
    const text = (data.content || [])
      .map((block) => (block.type === 'text' ? block.text : ''))
      .filter(Boolean)
      .join('\n');

    if (json) {
      const cleaned = text.replace(/```json|```/g, '').trim();
      try {
        res.status(200).json({ parsed: JSON.parse(cleaned), raw: text });
      } catch (e) {
        res.status(200).json({ parsed: null, raw: text });
      }
      return;
    }

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
