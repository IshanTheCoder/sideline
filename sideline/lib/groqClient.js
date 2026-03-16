const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const MODELS = [
  'llama-3.3-70b-versatile',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
];

let activeModel = MODELS[0];

export function getGroqApiKey() {
  return groqApiKey;
}

async function tryRequest(model, messages, max_tokens, temperature) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens, temperature }),
  });

  if (response.ok) {
    return { ok: true, data: await response.json() };
  }

  const errorText = await response.text();
  const status = response.status;
  const lower = errorText.toLowerCase();
  const isModelError = status === 404 || lower.includes('decommission') || lower.includes('not found');
  const isRateLimit = status === 429;

  return { ok: false, status, errorText, isModelError, isRateLimit };
}

export async function groqChat({ messages, max_tokens = 200, temperature = 0.3 }) {
  if (!groqApiKey) {
    throw new Error('Groq API key not configured');
  }

  const startIdx = Math.max(0, MODELS.indexOf(activeModel));

  for (let i = startIdx; i < MODELS.length; i++) {
    const model = MODELS[i];

    const result = await tryRequest(model, messages, max_tokens, temperature);

    if (result.ok) {
      if (model !== activeModel) {
        console.log(`✅ Switched Groq model to ${model}`);
        activeModel = model;
      }
      return result.data;
    }

    if (result.isRateLimit) {
      const wait = Math.min(2000 + i * 1000, 5000);
      console.warn(`⚠️ Rate limited on ${model}, waiting ${wait}ms and retrying...`);
      await new Promise((r) => setTimeout(r, wait));

      const retry = await tryRequest(model, messages, max_tokens, temperature);
      if (retry.ok) {
        activeModel = model;
        return retry.data;
      }

      if (retry.isRateLimit && i < MODELS.length - 1) {
        console.warn(`⚠️ Still rate limited on ${model}, trying ${MODELS[i + 1]}...`);
        continue;
      }
      if (retry.isModelError && i < MODELS.length - 1) continue;
      throw new Error(`Groq API ${retry.status}: ${(retry.errorText || '').substring(0, 200)}`);
    }

    if (result.isModelError && i < MODELS.length - 1) {
      console.warn(`⚠️ Model ${model} unavailable, trying ${MODELS[i + 1]}...`);
      continue;
    }

    throw new Error(`Groq API ${result.status}: ${(result.errorText || '').substring(0, 200)}`);
  }

  throw new Error('All Groq models unavailable');
}
