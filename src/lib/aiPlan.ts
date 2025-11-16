import { PlanCategory } from '@/store/usePlans';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const functionEndpoint =
  process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL ??
  `${supabaseUrl ?? ''}/functions/v1/ai-generate-plan`;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export type AiPlanRequest = {
  date: string;
  wakeTime?: string;
  sleepTime?: string;
  workStart?: string;
  workEnd?: string;
  focusHours?: number;
  priorities?: string;
  habits?: string;
};

export type AiPlanBlock = {
  title: string;
  category: PlanCategory;
  startMin: number;
  endMin: number;
  note?: string;
};

export async function generatePlanFromAI(req: AiPlanRequest): Promise<AiPlanBlock[]> {
  if (!functionEndpoint) {
    throw new Error('Missing Supabase function URL for AI plan generation.');
  }

  const response = await fetch(functionEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    console.error('[AIPlan] Failed', await response.text());
    throw new Error('AI plan request failed');
  }

  const json = (await response.json()) as { blocks?: AiPlanBlock[] };
  return json.blocks ?? [];
}
