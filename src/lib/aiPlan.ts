export type AiPlanBlock = {
  title: string;
  startMin: number;
  endMin: number;
  category: 'focus' | 'study' | 'work' | 'gym' | 'other';
};

export type AiPlanRequest = {
  date: string;
  wakeTime?: string;
  sleepTime?: string;
  focusHours?: number;
  hobbies?: string[];
};

export type AiPlanResponse = {
  blocks: AiPlanBlock[];
};

export async function generatePlanFromAI(
  payload: AiPlanRequest,
): Promise<AiPlanResponse> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    console.error('[AIPlan] Missing EXPO_PUBLIC_SUPABASE_FUNCTION_URL');
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_FUNCTION_URL');
  }

  if (!anonKey) {
    console.error('[AIPlan] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  console.log('[AIPlan] URL', url);
  console.log('[AIPlan] Env present', {
    hasUrl: Boolean(url),
    hasAnonKey: Boolean(anonKey),
  });
  console.log('[AIPlan] Request payload', payload);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  });

  console.log('[AIPlan] Response status', response.status, response.statusText);

  if (!response.ok) {
    let text = '';
    try {
      text = await response.text();
    } catch {
      text = '';
    }
    console.error('[AIPlan] Failed response', {
      status: response.status,
      statusText: response.statusText,
      text,
    });
    throw new Error(text || `AI plan request failed with status ${response.status}`);
  }

  const json = (await response.json()) as { blocks?: AiPlanBlock[] };
  console.log('[AIPlan] Parsed JSON', json);
  return {
    blocks: json.blocks ?? [],
  };
}
