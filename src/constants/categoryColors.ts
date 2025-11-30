import type { PlanCategory } from '@/store/usePlans';

export const PLAN_CATEGORY_COLORS: Record<PlanCategory, { border: string; background: string }> = {
  focus: { border: '#FF6B6B', background: 'rgba(255, 107, 107, 0.25)' },
  study: { border: '#4D96FF', background: 'rgba(77, 150, 255, 0.25)' },
  work: { border: '#FFB020', background: 'rgba(255, 176, 32, 0.25)' },
  gym: { border: '#2ECC71', background: 'rgba(46, 204, 113, 0.25)' },
  meeting: { border: '#1ABC9C', background: 'rgba(26, 188, 156, 0.25)' },
  reading: { border: '#8E44AD', background: 'rgba(142, 68, 173, 0.25)' },
  break: { border: '#F39C12', background: 'rgba(243, 156, 18, 0.25)' },
  personal: { border: '#E84393', background: 'rgba(232, 67, 147, 0.25)' },
  other: { border: '#9B59B6', background: 'rgba(155, 89, 182, 0.25)' },
};
