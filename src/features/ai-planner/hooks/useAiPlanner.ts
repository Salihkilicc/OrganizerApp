import { useCallback, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/i18n/useI18n';
import { AiPlanBlock, AiPlanRequest, generatePlanFromAI } from '@/lib/aiPlan';
import { checkAiLimit, type AiLimitResult } from '@/lib/aiUsage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { PlanBlock, usePlans } from '@/store/usePlans';
import { usePremium } from '@/store/usePremium';

// --- Helpers moved from AiPlanModal.tsx ---

const formatDateLabel = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatMinutes = (value: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${pad(hours)}:${pad(minutes)}`;
};

const serializePlanBlocks = (blocks: AiPlanBlock[]) =>
    JSON.stringify(
        blocks.map((block) => ({
            title: block.title,
            note: block.note ?? undefined,
            start: formatMinutes(block.startMin),
            end: formatMinutes(block.endMin),
            category: block.category,
        })),
    );

const DEFAULT_WORK_START = '09:00';
const DEFAULT_WORK_END = '17:00';

const parseTimeString = (value: string) => {
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

const buildPlanBlock = (date: string, block: AiPlanBlock): PlanBlock => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: block.title,
    category: block.category,
    startMin: block.startMin,
    endMin: block.endMin,
    note: block.note ?? undefined,
    date,
    createdAt: new Date().toISOString(),
    aiGenerated: true,
    done: false,
    rewarded: false,
});

const sanitizeTimeInput = (value: string) => {
    const filtered = value.replace(/[^0-9:]/g, '');
    const colonIndex = filtered.indexOf(':');
    if (colonIndex === -1) {
        return filtered.slice(0, 4);
    }
    const before = filtered.slice(0, colonIndex).slice(0, 2);
    const after = filtered.slice(colonIndex + 1).replace(/:/g, '').slice(0, 2);
    return `${before}:${after}`;
};

// --- Hook Definition ---

export type UseAiPlannerProps = {
    visible: boolean;
    date: string;
    onClose: () => void;
    onApply: (blocks: PlanBlock[]) => void;
    hasExistingBlocks?: boolean;
    previousBlocks?: AiPlanBlock[];
};

export function useAiPlanner({
    visible,
    date,
    onClose,
    onApply,
    hasExistingBlocks,
    previousBlocks,
}: UseAiPlannerProps) {
    const { t } = useI18n();
    const user = useAuth((state) => state.user);
    const status = useAuth((state) => state.status);
    const isGuest = useAuth((state) => state.isGuest);
    const isPremium = usePremium((state) => state.isPremium);
    const isAuthenticatedUser = status === 'authenticated' && !!user && !isGuest;
    const isGuestUser = !isAuthenticatedUser;

    const lastAiPlanString = usePlans((state) => state.lastAiPlanString ?? undefined);
    const setLastAiPlanString = usePlans((state) => state.setLastAiPlanString);

    const [wakeTime, setWakeTime] = useState('07:30');
    const [sleepTime, setSleepTime] = useState('23:30');
    const [workStart, setWorkStart] = useState(DEFAULT_WORK_START);
    const [workEnd, setWorkEnd] = useState(DEFAULT_WORK_END);
    const [works, setWorks] = useState(() => Boolean(DEFAULT_WORK_START && DEFAULT_WORK_END));
    const [priorities, setPriorities] = useState('');
    const [habits, setHabits] = useState('');
    const [previewBlocks, setPreviewBlocks] = useState<AiPlanBlock[]>([]);
    const [stage, setStage] = useState<'form' | 'preview'>('form');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [aiLimitRemaining, setAiLimitRemaining] = useState<AiLimitResult['remaining'] | null>(null);
    const [aiLimitAllowed, setAiLimitAllowed] = useState(true);
    const [aiLimitReason, setAiLimitReason] = useState<AiLimitResult['reason']>();
    const [aiLimitLoading, setAiLimitLoading] = useState(false);

    const workStartMinutes = works ? parseTimeString(workStart) : undefined;
    const workEndMinutes = works ? parseTimeString(workEnd) : undefined;
    let workValidationError: string | null = null;
    if (works) {
        if (workStartMinutes === undefined || workEndMinutes === undefined) {
            workValidationError = t((d) => d.aiPlanner.workInvalid);
        } else if (workEndMinutes <= workStartMinutes) {
            workValidationError = t((d) => d.aiPlanner.workEndBeforeStart);
        }
    }
    const isLoading = isGenerating || isRegenerating;
    const aiBlocked = isGuestUser || !aiLimitAllowed; // Keep this variable if needed for logic, but don't use it to disable buttons.

    // FIX: Button stays active even if blocked, so we can show the Overlay on click.
    const generateDisabled = isLoading || aiLimitLoading || (works && Boolean(workValidationError));

    // FIX: Button stays active for regenerate too.
    const regenerateDisabled = isLoading || aiLimitLoading;

    const dateLabel = useMemo(() => formatDateLabel(date), [date]);
    const previewList = previewBlocks ?? [];
    const hasPreview = previewList.length > 0;
    const helperTexts = useMemo(
        () => ({
            priorities: t((d) => d.aiPlanner.prioritiesHelper),
            habits: t((d) => d.aiPlanner.habitsHelper),
            feedbackExamples: t((d) => d.aiPlanner.feedbackExamples),
        }),
        [t],
    );

    const updateLimitState = useCallback(
        (result: AiLimitResult) => {
            setAiLimitAllowed(result.allowed);
            setAiLimitRemaining(result.remaining ?? null);
            setAiLimitReason(result.reason);
        },
        [],
    );

    const refreshAiLimit = useCallback(async () => {
        if (!visible) {
            return;
        }

        if (isGuestUser) {
            updateLimitState({ allowed: false, reason: 'guest' });
            return;
        }
        if (isPremium) {
            updateLimitState({ allowed: true, remaining: '∞' });
            return;
        }
        setAiLimitLoading(true);
        try {
            const result = await checkAiLimit(supabase, isPremium);
            updateLimitState(result);
        } catch (refreshError) {
            console.warn('[useAiPlanner] Failed to refresh AI limit', refreshError);
            updateLimitState({ allowed: false, reason: 'error' });
        } finally {
            setAiLimitLoading(false);
        }
    }, [isGuestUser, isPremium, updateLimitState, visible]);

    useEffect(() => {
        void refreshAiLimit();
    }, [refreshAiLimit]);

    const ensureAiAllowed = useCallback(async () => {
        try {
            const result = await checkAiLimit(supabase, isPremium);
            updateLimitState(result);
            if (!result.allowed) {
                return false;
            }
            return true;
        } catch (err) {
            console.warn('[useAiPlanner] checkAiLimit failed', err);
            return false;
        }
    }, [isPremium, updateLimitState]);

    const incrementUsage = useCallback(async () => {
        const { error: incrementError } = await supabase.rpc('increment_ai_usage');
        if (incrementError) {
            console.warn('[useAiPlanner] Failed to increment AI usage', incrementError);
            return;
        }
        if (!isPremium) {
            setAiLimitRemaining((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
            void refreshAiLimit();
        }
    }, [isPremium, refreshAiLimit]);

    const parseDurationFromText = useCallback((text: string): number | null => {
        const hoursMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:saat|hour|hr|h)\b/);
        if (hoursMatch) {
            const value = Number(hoursMatch[1].replace(',', '.'));
            if (Number.isFinite(value)) return Math.round(value * 60);
        }
        const minsMatch = text.match(/(\d+)\s*(?:dk|dakika|min|mins|minute|minutes)\b/);
        if (minsMatch) {
            const value = Number(minsMatch[1]);
            if (Number.isFinite(value)) return value;
        }
        return null;
    }, []);

    const formatListInput = useCallback((value: string) => {
        const parts = value
            .split(/[\n,]+/)
            .map((item) => item.trim())
            .filter(Boolean);
        if (parts.length <= 1) return value.trim();
        return parts.map((item) => `- ${item}`).join('\n');
    }, []);

    const adjustBlocksWithFeedback = useCallback(
        (blocks: AiPlanBlock[]) => {
            const text = feedback.trim().toLowerCase();
            if (!text) return blocks;

            const isExtend = /uzat|extend|longer|increase/.test(text);
            const isShorten = /kısalt|kisalt|shorten|shorter|reduce/.test(text);
            if (!isExtend && !isShorten) return blocks;

            const parsedMinutes = parseDurationFromText(text);
            const deltaMinutes = parsedMinutes ?? (isExtend ? 30 : 15);
            const delta = isExtend ? deltaMinutes : -deltaMinutes;

            return blocks.map((block) => {
                const duration = Math.max(1, block.endMin - block.startMin);
                const nextDuration = Math.max(1, duration + delta);
                let startMin = block.startMin;
                let endMin = startMin + nextDuration;
                if (endMin > 1439) {
                    endMin = 1439;
                    startMin = Math.max(0, endMin - nextDuration);
                }
                return { ...block, startMin, endMin };
            });
        },
        [feedback, parseDurationFromText],
    );

    const enforceWorkWindow = useCallback(
        (blocks: AiPlanBlock[]) => {
            if (!works || workStartMinutes === undefined || workEndMinutes === undefined) return blocks;
            const workTitle = t((d) => d.plan.categories.work);
            const start = workStartMinutes;
            const end = workEndMinutes;

            const nonWorkBlocks = blocks.filter((block) => block.category !== 'work');
            const overlapping: AiPlanBlock[] = [];
            const nonOverlapping: AiPlanBlock[] = [];

            nonWorkBlocks.forEach((block) => {
                const overlaps = block.startMin < end && block.endMin > start;
                if (overlaps) {
                    overlapping.push(block);
                } else {
                    nonOverlapping.push(block);
                }
            });

            const latestExistingEnd = nonOverlapping.reduce((max, block) => Math.max(max, block.endMin), end);

            let cursor = Math.max(end, latestExistingEnd);
            const rescheduled = overlapping
                .sort((a, b) => a.startMin - b.startMin)
                .map((block) => {
                    const duration = Math.max(1, block.endMin - block.startMin);
                    const startMin = cursor;
                    const endMin = startMin + duration;
                    cursor = endMin;
                    return { ...block, startMin, endMin };
                });

            const workBlock: AiPlanBlock = {
                title: workTitle,
                note: undefined,
                startMin: start,
                endMin: end,
                category: 'work',
            };

            return [...nonOverlapping, workBlock, ...rescheduled].sort((a, b) => a.startMin - b.startMin);
        },
        [t, workEndMinutes, workStartMinutes, works],
    );

    const getPreviousPlanString = useCallback(() => {
        if (lastAiPlanString?.trim()) return lastAiPlanString.trim();
        if (previewBlocks.length) return serializePlanBlocks(previewBlocks);
        if (previousBlocks && previousBlocks.length) return serializePlanBlocks(previousBlocks);
        return undefined;
    }, [lastAiPlanString, previewBlocks, previousBlocks]);

    const resetState = useCallback(() => {
        setStage('form');
        setPreviewBlocks([]);
        setIsGenerating(false);
        setIsRegenerating(false);
        setError(null);
        setFeedback('');
    }, []);

    useEffect(() => {
        if (!visible) {
            resetState();
        }
    }, [resetState, visible]);

    const buildRequestPayload = useCallback(
        (options?: { includePreviousPlanString?: boolean }): AiPlanRequest => {
            const normalizedFeedback = feedback.trim();
            const normalizedPriorities = formatListInput(priorities);
            const normalizedHabits = formatListInput(habits);
            const hasWorkWindow = works && workStart.trim() && workEnd.trim();
            return {
                date,
                wakeTime: wakeTime.trim(),
                sleepTime: sleepTime.trim(),
                workStart: hasWorkWindow ? workStart.trim() : undefined,
                workEnd: hasWorkWindow ? workEnd.trim() : undefined,
                priorities: normalizedPriorities || undefined,
                habits: normalizedHabits || undefined,
                feedback: normalizedFeedback || undefined,
                previousBlocks: previousBlocks && previousBlocks.length > 0 ? previousBlocks : undefined,
                previousPlanString: options?.includePreviousPlanString ? getPreviousPlanString() : undefined,
            };
        },
        [
            date,
            feedback,
            habits,
            priorities,
            wakeTime,
            sleepTime,
            workEnd,
            workStart,
            works,
            previousBlocks,
            getPreviousPlanString,
            formatListInput,
        ],
    );

    const handleGenerate = useCallback(async (skipChecks = false): Promise<boolean> => {
        if (works && workValidationError) {
            return true; // invalid but not blocked
        }
        if (hasExistingBlocks) {
            setError(t((d) => d.aiPlanner.existingBlocksError));
            return true; // invalid but not blocked
        }

        if (!skipChecks) {
            if (isGuestUser) {
                return false;
            }
            const allowed = await ensureAiAllowed();
            if (!allowed) {
                return false;
            }
        }

        setIsGenerating(true);
        try {
            const payload = buildRequestPayload();
            console.log('[useAiPlanner] Request payload', payload);
            const { blocks } = await generatePlanFromAI(payload);
            console.log('[useAiPlanner] Received blocks', blocks);
            const blocksArray = Array.isArray(blocks) ? blocks : [];
            const feedbackAdjusted = adjustBlocksWithFeedback(blocksArray);
            const workAdjusted = enforceWorkWindow(feedbackAdjusted);
            setLastAiPlanString(serializePlanBlocks(workAdjusted));
            setPreviewBlocks(workAdjusted);
            if (workAdjusted.length === 0) {
                setError(t((d) => d.aiPlanner.noBlocks));
            } else {
                setError(null);
            }
            setStage('preview');
            // Only increment usage if checks were NOT skipped (meaning normal usage)
            // OR if checks WERE skipped (checking ad), we still might want to track usage?
            // User requirement: "one-time access". 
            // Incrementing usage here is fine as it tracks consumption, but we shouldn't block.
            // However, typical ad reward flow might not count against the limit if the limit is 0.
            await incrementUsage();
            return true;
        } catch (err) {
            console.error('[useAiPlanner] Error generating plan', err);
            setPreviewBlocks([]);
            setError(String(err));
            return true; // error/invalid but not blocked by limit
        } finally {
            setIsGenerating(false);
        }
    }, [
        adjustBlocksWithFeedback,
        buildRequestPayload,
        enforceWorkWindow,
        hasExistingBlocks,
        incrementUsage,
        isGuestUser,
        ensureAiAllowed,
        setLastAiPlanString,
        t,
        workValidationError,
        works,
    ]);

    const handleRegenerate = useCallback(async (skipChecks = false): Promise<boolean> => {
        if (!date) return true;

        if (!skipChecks) {
            if (isGuestUser) {
                return false;
            }
            const allowed = await ensureAiAllowed();
            if (!allowed) {
                return false;
            }
        }

        setIsRegenerating(true);
        try {
            const payload = buildRequestPayload({ includePreviousPlanString: true });
            console.log('[useAiPlanner] Request payload (regenerate)', payload);
            const { blocks } = await generatePlanFromAI(payload);
            console.log('[useAiPlanner] Received blocks (regenerate)', blocks);
            const blocksArray = Array.isArray(blocks) ? blocks : [];
            const feedbackAdjusted = adjustBlocksWithFeedback(blocksArray);
            const workAdjusted = enforceWorkWindow(feedbackAdjusted);
            await incrementUsage();
            if (workAdjusted.length === 0) {
                setError(t((d) => d.aiPlanner.noBetterPlan));
                setPreviewBlocks([]);
                return true; // It ran successfully, just no better plan
            }
            setError(null);
            setLastAiPlanString(serializePlanBlocks(workAdjusted));
            setPreviewBlocks(workAdjusted);
            return true;
        } catch (err) {
            console.error('[useAiPlanner] Error regenerating plan', err);
            setPreviewBlocks([]);
            setError(String(err));
            return true;
        } finally {
            setIsRegenerating(false);
        }
    }, [
        adjustBlocksWithFeedback,
        buildRequestPayload,
        date,
        enforceWorkWindow,
        incrementUsage,
        isGuestUser,
        ensureAiAllowed,
        setLastAiPlanString,
        t,
    ]);

    const handleApply = useCallback(() => {
        const planBlocks = previewBlocks.map((block) => buildPlanBlock(date, block));
        onApply(planBlocks);
        resetState();
        onClose();
    }, [date, onApply, onClose, previewBlocks, resetState]);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [onClose, resetState]);

    const isLimitReached = aiLimitReason === 'limit_reached';
    const aiUsageText = isGuestUser
        ? 'Please log in to use AI Planner'
        : isPremium
            ? 'Unlimited AI generation'
            : `Remaining: ${aiLimitRemaining ?? (aiLimitLoading ? '…' : '0')} / 3`;
    const showLimitSpinner = aiLimitLoading && !isPremium && !isGuestUser;

    return {
        // State
        wakeTime,
        setWakeTime,
        sleepTime,
        setSleepTime,
        workStart,
        setWorkStart,
        workEnd,
        setWorkEnd,
        works,
        setWorks,
        priorities,
        setPriorities,
        habits,
        setHabits,
        feedback,
        setFeedback,
        previewBlocks,
        stage,
        setStage,
        error,
        isGenerating,
        isRegenerating,
        aiLimitRemaining,
        aiLimitLoading,
        aiLimitAllowed,
        aiLimitReason,

        // Derived
        workStartMinutes,
        workEndMinutes,
        workValidationError,
        isLoading,
        generateDisabled,
        regenerateDisabled,
        dateLabel,
        previewList,
        hasPreview,
        helperTexts,
        isLimitReached,
        isGuestUser,
        isPremium,
        aiUsageText,
        showLimitSpinner,

        // Methods
        sanitizeTimeInput,
        handleGenerate,
        handleRegenerate,
        handleApply,
        handleClose,
        resetState,
        formatMinutes, // useful for preview list
    };
}
