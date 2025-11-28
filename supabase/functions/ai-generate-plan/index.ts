import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4.1';
const VALID_CATEGORIES = ['focus', 'study', 'work', 'gym', 'other'] as const;
const BREAK_KEYWORDS = [
  'break',
  'breaks',
  'short break',
  'rest',
  'resting',
  'relax',
  'relaxing',
  'downtime',
  'wind down',
  'chill',
  'unwind',
  'nap',
  'pause',
  'free time',
  'gap',
  'idle',
  'empty',
  'coffee',
  'tea',
  'snack',
  'snacks',
  'snack time',
  'lunch',
  'dinner',
  'breakfast',
  'meal',
  'meals',
  'eat',
  'eating',
  'recharge',
  'stretch',
  'stretching',
  'leisure',
  'commute',
  'commuting',
  'travel',
  'buffer',
  'prep',
  'preparation',
  'transition',
  'evening break',
  'buffer block',
];

const padNumber = (value: number) => value.toString().padStart(2, '0');

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${padNumber(hours)}:${padNumber(mins)}`;
};

const normalizeTitle = (value: string) => value.trim().toLowerCase();

const parseTimeToMinutes = (value?: string) => {
  if (!value) return undefined;
  const normalized = value.trim();
  const parts = normalized.split(':');
  if (parts.length !== 2) return undefined;
  const [hoursPart, minutesPart] = parts;
  if (hoursPart.trim() === '' || minutesPart.trim() === '') return undefined;
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined;
  }
  return hours * 60 + minutes;
};

const normalizeTimeString = (value?: string) => {
  const minutes = parseTimeToMinutes(value);
  if (minutes === undefined) return undefined;
  return formatMinutes(minutes);
};

type NormalizedBlock = {
  title: string;
  startMin: number;
  endMin: number;
  start: string;
  end: string;
  category?: string;
  note?: string;
};

const parseTimeField = (value: unknown): { minutes?: number; text?: string } => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const minutes = Math.floor(value);
    if (minutes < 0 || minutes > 1439) return { minutes: undefined, text: undefined };
    return { minutes, text: formatMinutes(minutes) };
  }
  if (typeof value === 'string') {
    const minutes = parseTimeToMinutes(value);
    if (minutes === undefined) return { minutes: undefined, text: undefined };
    return { minutes, text: normalizeTimeString(value) ?? formatMinutes(minutes) };
  }
  return { minutes: undefined, text: undefined };
};

const parseRequest = async (req: Request) => {
  const json = await req.json().catch(() => null);
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid request JSON');
  }
  const {
    date,
    wakeTime,
    sleepTime,
    workStart,
    workEnd,
    priorities,
    habits,
    feedback,
    previousBlocks: rawPreviousBlocks,
  } = json as Record<string, unknown>;

  if (typeof date !== 'string' || !date) {
    throw new Error('`date` is required and must be a string');
  }

  const normalizedPreviousBlocks: NormalizedBlock[] = Array.isArray(rawPreviousBlocks)
    ? rawPreviousBlocks
        .map((value) => {
          if (!value || typeof value !== 'object') return null;
          const block = value as Record<string, unknown>;
          const title = typeof block.title === 'string' ? block.title.trim() : '';
          const category = typeof block.category === 'string' ? block.category.trim() : undefined;
          const note = typeof block.note === 'string' ? block.note.trim() : undefined;
          const { minutes: startMin, text: start } = parseTimeField(
            block.start ?? block.startTime ?? block.start_min ?? block.startMin,
          );
          const { minutes: endMin, text: end } = parseTimeField(
            block.end ?? block.endTime ?? block.end_min ?? block.endMin,
          );
          if (!title || startMin === undefined || endMin === undefined) return null;
          if (startMin < 0 || endMin < 0 || startMin > 1439 || endMin > 1439) {
            return null;
          }
          if (endMin <= startMin) return null;
          return {
            title,
            category,
            note,
            startMin,
            endMin,
            start: start ?? formatMinutes(startMin),
            end: end ?? formatMinutes(endMin),
          };
        })
        .filter((value): value is NormalizedBlock => Boolean(value))
    : [];

  return {
    date,
    wakeTime: typeof wakeTime === 'string' ? wakeTime : undefined,
    sleepTime: typeof sleepTime === 'string' ? sleepTime : undefined,
    workStart: typeof workStart === 'string' ? workStart : undefined,
    workEnd: typeof workEnd === 'string' ? workEnd : undefined,
    priorities: typeof priorities === 'string' ? priorities : undefined,
    habits: typeof habits === 'string' ? habits : undefined,
    feedback:
      typeof feedback === 'string' && feedback.trim()
        ? feedback.trim()
        : undefined,
    previousBlocks: normalizedPreviousBlocks,
  };
};

const buildPrompt = (payload: Awaited<ReturnType<typeof parseRequest>>) => {
  const workWindowSummary =
    payload.workStart && payload.workEnd
      ? `${payload.workStart} - ${payload.workEnd}`
      : 'not provided (the user does not have fixed work hours)';

  const userContextPart = [
    'You create a deterministic daily schedule for the Organizer app.',
    'Respect wake/sleep times, optional work window, priorities, habits, and the latest feedback as strict constraints.',
    'Use only the tasks the user provided (priorities, habits, feedback). Leave unused time empty instead of inventing filler tasks.',
    '',
    'User context:',
    `Date: ${payload.date}`,
    `Wake time: ${payload.wakeTime ?? 'not provided'}`,
    `Sleep time: ${payload.sleepTime ?? 'not provided'}`,
    `Work hours: ${workWindowSummary}`,
    `User habits: ${payload.habits ?? 'None provided.'}`,
    `User priorities: ${payload.priorities ?? 'None provided.'}`,
    `User feedback from previous plan: ${payload.feedback ?? 'None provided.'}`,
  ];

  const previousPlanInstruction = payload.previousBlocks.length
    ? 'A previous plan is provided. Treat it as the baseline truth. Only change blocks the feedback explicitly mentions (move/shift/extend/shorten/swap/add/remove). All other blocks must stay untouched.'
    : 'No previous AI plan data was provided for this date. Build only from the supplied priorities/habits and optional work window.';

  const strictRulesPart = [
    '',
    'STRICT RULES:',
    '1) Break/meal/leisure/stretch/commute/buffer/prep/pause/idle/empty/rest blocks are forbidden unless the user explicitly listed them. If not provided, leave that time empty.',
    '2) If workStart/workEnd are provided, output exactly ONE block titled "WORK" spanning the full work window. Do NOT split it. If workStart/workEnd are missing, output ZERO work blocks.',
    '3) All blocks must be between wakeTime and sleepTime and in chronological order. Gaps are allowed.',
    '4) Never fabricate new tasks. Use only what appears in priorities/habits/feedback (plus the WORK block when applicable).',
    '5) Output must be pure JSON with NO commentary: an array like [{"title":"...", "start":"HH:MM", "end":"HH:MM"}]. Keep the colon in every time.',
    '6) During regenerate, modify only the blocks referenced in feedback verbs such as shift, extend, move, swap, delay, shorten, push later, bring earlier, add, insert, remove, delete. Keep all other baseline blocks unchanged.',
    previousPlanInstruction,
  ];

  return [...userContextPart, ...strictRulesPart].join('\n');
};

const buildMessages = (
  prompt: string,
  payload: Awaited<ReturnType<typeof parseRequest>>,
) => {
  const previousBlocksJson = JSON.stringify(
    (payload.previousBlocks ?? []).map((block) => ({
      title: block.title,
      start: block.start,
      end: block.end,
    })),
  );
  const feedbackSummary = payload.feedback && payload.feedback.length > 0 ? payload.feedback : 'None provided.';
  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant that designs realistic daily plans for productivity-focused users.',
    },
    {
      role: 'user',
      content: prompt,
    },
    {
      role: 'user',
      content: `Previous plan blocks (if any): ${previousBlocksJson}\nUser feedback: ${feedbackSummary}`,
    },
  ];
};

const CHANGE_KEYWORDS = [
  'shift',
  'extend',
  'move',
  'swap',
  'delay',
  'shorten',
  'make shorter',
  'make longer',
  'push later',
  'bring earlier',
  'earlier',
  'later',
  'update',
  'adjust',
  'reschedule',
  'resched',
];

const REMOVAL_KEYWORDS = ['remove', 'delete', 'drop', 'cancel', 'skip'];

const matchesTitle = (title: string, haystack: string) => {
  const normalized = normalizeTitle(title);
  if (haystack.includes(normalized)) return true;
  const parts = normalized.split(/\s+/).filter((part) => part.length >= 3);
  return parts.some((part) => haystack.includes(part));
};

const isBreaklikeBlock = (block: NormalizedBlock, allowanceText: string) => {
  const text = `${block.title} ${block.note ?? ''}`.toLowerCase();
  return BREAK_KEYWORDS.some(
    (keyword) => text.includes(keyword) && !allowanceText.includes(keyword),
  );
};

const isWorkBlock = (block: NormalizedBlock) => {
  const titleLower = normalizeTitle(block.title);
  const hasIsolatedWork = /\bwork\b/.test(titleLower);
  return hasIsolatedWork || block.category === 'work';
};

const sanitizeBlocks = (
  blocks: NormalizedBlock[],
  options: {
    allowanceText: string;
    wakeMinutes?: number;
    sleepMinutes?: number;
  },
) => {
  return blocks
    .filter((block) => !isBreaklikeBlock(block, options.allowanceText))
    .filter((block) => !isWorkBlock(block)) // work handled separately
    .map((block) => {
      let startMin = block.startMin;
      let endMin = block.endMin;
      if (typeof options.wakeMinutes === 'number') {
        if (endMin <= options.wakeMinutes) return null;
        startMin = Math.max(startMin, options.wakeMinutes);
      }
      if (typeof options.sleepMinutes === 'number') {
        if (startMin >= options.sleepMinutes) return null;
        endMin = Math.min(endMin, options.sleepMinutes);
      }
      if (endMin <= startMin) return null;
      return {
        ...block,
        startMin,
        endMin,
        start: formatMinutes(startMin),
        end: formatMinutes(endMin),
      };
    })
    .filter((value): value is NormalizedBlock => Boolean(value))
    .filter((block) => block.endMin - block.startMin >= 10);
};

const isChangeRequested = (title: string, feedback: string) => {
  const text = feedback.toLowerCase();
  return CHANGE_KEYWORDS.some((keyword) => text.includes(keyword)) && matchesTitle(title, text);
};

const isRemovalRequested = (title: string, feedback: string) => {
  const text = feedback.toLowerCase();
  return REMOVAL_KEYWORDS.some((keyword) => text.includes(keyword)) && matchesTitle(title, text);
};

const isRequestedTask = (title: string, requestText: string) => {
  return matchesTitle(title, requestText);
};

const mergeWithPrevious = (
  previousBlocks: NormalizedBlock[],
  newBlocks: NormalizedBlock[],
  feedback: string,
  requestText: string,
) => {
  const usedPrevious = new Set<number>();
  const merged: NormalizedBlock[] = [];

  newBlocks.forEach((block) => {
    const normalizedTitle = normalizeTitle(block.title);
    const prevIndex = previousBlocks.findIndex(
      (prev, index) => !usedPrevious.has(index) && normalizeTitle(prev.title) === normalizedTitle,
    );
    const removal = isRemovalRequested(block.title, feedback);
    const changeRequested = isChangeRequested(block.title, feedback);
    const requestedAddition = isRequestedTask(block.title, requestText) || changeRequested;

    if (prevIndex >= 0) {
      const prev = previousBlocks[prevIndex];
      usedPrevious.add(prevIndex);
      if (removal) {
        return;
      }
      if (changeRequested || block.startMin !== prev.startMin || block.endMin !== prev.endMin) {
        merged.push({ ...block, title: prev.title });
      } else {
        merged.push(prev);
      }
      return;
    }

    if (!removal && requestedAddition) {
      merged.push(block);
    }
  });

  previousBlocks.forEach((block, index) => {
    if (usedPrevious.has(index)) return;
    if (isRemovalRequested(block.title, feedback)) return;
    merged.push(block);
  });

  return merged;
};

const extractBlocksFromContent = (content: string) => {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.blocks)) return parsed.blocks;
  throw new Error('Missing blocks array in OpenAI response');
};

const normalizeModelBlocks = (blocks: any[]): NormalizedBlock[] => {
  return blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return null;
      const raw = block as Record<string, unknown>;
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      const category =
        typeof raw.category === 'string' && VALID_CATEGORIES.includes(raw.category as any)
          ? (raw.category as string)
          : undefined;
      const note = typeof raw.note === 'string' ? raw.note.trim() : undefined;
      const { minutes: startMin, text: start } = parseTimeField(
        raw.start ?? raw.startTime ?? raw.start_min ?? raw.startMin,
      );
      const { minutes: endMin, text: end } = parseTimeField(
        raw.end ?? raw.endTime ?? raw.end_min ?? raw.endMin,
      );
      if (!title || startMin === undefined || endMin === undefined) return null;
      if (endMin <= startMin) return null;
      return {
        title,
        category,
        note,
        startMin,
        endMin,
        start: start ?? formatMinutes(startMin),
        end: end ?? formatMinutes(endMin),
      };
    })
    .filter((value): value is NormalizedBlock => Boolean(value));
};

const callOpenAI = async (payload: Awaited<ReturnType<typeof parseRequest>>) => {
  const prompt = buildPrompt(payload);
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY') ?? ''}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: buildMessages(prompt, payload),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const body = await response.json();
  const content = body?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('OpenAI returned an unexpected response');
  }

  const parsedBlocks = extractBlocksFromContent(content);
  return normalizeModelBlocks(parsedBlocks);
};

serve(async (req) => {
  console.log('[ai-generate-plan] Incoming request', {
    method: req.method,
    url: req.url,
    pathname: (() => {
      try {
        return new URL(req.url).pathname;
      } catch {
        return undefined;
      }
    })(),
    headers: {
      accept: req.headers.get('accept'),
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent'),
    },
  });

  let payload: Awaited<ReturnType<typeof parseRequest>>;
  try {
    payload = await parseRequest(req);
    console.log('[ai-generate-plan] Parsed payload', {
      date: payload.date,
      wakeTime: payload.wakeTime ?? null,
      sleepTime: payload.sleepTime ?? null,
      workStart: payload.workStart ?? null,
      workEnd: payload.workEnd ?? null,
      priorities: payload.priorities ?? null,
      habits: payload.habits ?? null,
    });
  } catch (error) {
    console.error('[ai-generate-plan] Request parse error', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid request payload' },
      { status: 400 },
    );
  }

  const envKey = Deno.env.get('OPENAI_API_KEY');
  console.log('[ai-generate-plan] has OPENAI_API_KEY', Boolean(envKey));
  if (!envKey) {
    console.error('[ai-generate-plan] Missing OPENAI_API_KEY');
    return Response.json(
      { error: 'Missing OPENAI_API_KEY in environment.' },
      { status: 500 },
    );
  }

  try {
    const wakeMinutes = parseTimeToMinutes(payload.wakeTime);
    const sleepMinutes = parseTimeToMinutes(payload.sleepTime);
    const workStartMinutes = parseTimeToMinutes(payload.workStart);
    const workEndMinutes = parseTimeToMinutes(payload.workEnd);
    const hasWorkSchedule =
      typeof workStartMinutes === 'number' &&
      typeof workEndMinutes === 'number' &&
      workEndMinutes > workStartMinutes;

    const allowanceText = `${payload.priorities ?? ''} ${payload.habits ?? ''} ${
      payload.feedback ?? ''
    }`.toLowerCase();

    const previousSanitized = sanitizeBlocks(payload.previousBlocks, {
      allowanceText,
      wakeMinutes,
      sleepMinutes,
    });

    const aiBlocks = await callOpenAI(payload);
    const sanitizedNew = sanitizeBlocks(aiBlocks, {
      allowanceText,
      wakeMinutes,
      sleepMinutes,
    });
    const requestedNew = sanitizedNew.filter((block) => isRequestedTask(block.title, allowanceText));

    const merged =
      previousSanitized.length > 0
        ? mergeWithPrevious(previousSanitized, requestedNew, payload.feedback ?? '', allowanceText)
        : requestedNew;

    const clampedWork =
      hasWorkSchedule && typeof workStartMinutes === 'number' && typeof workEndMinutes === 'number'
        ? {
            startMin:
              typeof wakeMinutes === 'number'
                ? Math.max(workStartMinutes, wakeMinutes)
                : workStartMinutes,
            endMin:
              typeof sleepMinutes === 'number'
                ? Math.min(workEndMinutes, sleepMinutes)
                : workEndMinutes,
          }
        : null;

    const mergedWithoutOverlap =
      clampedWork && clampedWork.endMin > clampedWork.startMin
        ? merged.filter(
            (block) => block.endMin <= clampedWork.startMin || block.startMin >= clampedWork.endMin,
          )
        : merged;

    const workBlock =
      clampedWork && clampedWork.endMin > clampedWork.startMin
        ? ({
            title: 'WORK',
            category: 'work',
            startMin: clampedWork.startMin,
            endMin: clampedWork.endMin,
            start: formatMinutes(clampedWork.startMin),
            end: formatMinutes(clampedWork.endMin),
          } as NormalizedBlock)
        : null;

    const finalBlocks = [
      ...mergedWithoutOverlap,
      ...(workBlock ? [workBlock] : []),
    ].sort((a, b) => a.startMin - b.startMin);

    const responseBlocks = finalBlocks.map((block) => ({
      title: block.title,
      start: formatMinutes(block.startMin),
      end: formatMinutes(block.endMin),
    }));

    console.log('[ai-generate-plan] Generated blocks', {
      totalFromModel: aiBlocks.length,
      sanitizedNewCount: sanitizedNew.length,
      previousCount: previousSanitized.length,
      mergedCount: merged.length,
      finalCount: responseBlocks.length,
      hasWorkSchedule,
    });

    return Response.json(responseBlocks);
  } catch (error) {
    console.error('[ai-generate-plan] Error', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
});
