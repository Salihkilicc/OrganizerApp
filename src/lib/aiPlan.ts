export type AiPlanBlock = {
  title: string;
  note?: string | null;
  startMin: number;
  endMin: number;
  category: 'focus' | 'study' | 'work' | 'gym' | 'other';
};

export type AiPlanRequest = {
  date: string;
  wakeTime: string;
  sleepTime: string;
  workStart?: string | null;
  workEnd?: string | null;
  focusHours?: number | null;
  habits?: string | null;
  priorities?: string | null;
  feedback?: string | null;
};

export type AiPlanResponse = {
  blocks: AiPlanBlock[];
};

export async function generatePlanFromAI(
  payload: AiPlanRequest,
): Promise<AiPlanResponse> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[AIPlan] URL', baseUrl);
  console.log('[AIPlan] Env present', {
    hasAnonKey: !!anonKey,
    hasUrl: !!baseUrl,
  });
  console.log('[AIPlan] Request payload', payload);

  if (!baseUrl) {
    console.error('[AIPlan] Missing EXPO_PUBLIC_SUPABASE_FUNCTION_URL');
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_FUNCTION_URL');
  }

  if (!anonKey) {
    console.error('[AIPlan] Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  const response = await fetch(`${baseUrl}/functions/v1/ai-generate-plan`, {
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
