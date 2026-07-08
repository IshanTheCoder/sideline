const groqApiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// llama-3.3-70b-versatile was deprecated 2026-07-08 (decommission 2026-08-16);
// openai/gpt-oss-120b is Groq's recommended replacement
const MODELS = [
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
];

let activeModel = MODELS[0];

export function getGroqApiKey() {
  return groqApiKey;
}

// gpt-oss models are reasoning models: their hidden reasoning tokens count toward
// max_tokens, so an unpadded budget truncates the actual answer mid-JSON. Keep
// effort low (we want extraction, not deliberation) and add headroom. Fallback
// llama models get the caller's params untouched — they reject reasoning_effort.
function buildRequestBody(model, messages, max_tokens, temperature) {
  if (model.startsWith('openai/gpt-oss')) {
    return { model, messages, temperature, max_tokens: max_tokens + 800, reasoning_effort: 'low' };
  }
  return { model, messages, max_tokens, temperature };
}

async function tryRequest(model, messages, max_tokens, temperature) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for chat completions
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildRequestBody(model, messages, max_tokens, temperature)),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

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
