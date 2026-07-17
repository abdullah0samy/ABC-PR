import type { Answer } from "../types";

/**
 * Compute satisfaction percentage (0-100) from a survey's answer scores.
 * Each answer is 1-5, where 1 = very unsatisfied and 5 = very satisfied.
 * Percentage = (sum / (count * 5)) * 100, rounded to integer, 0 when empty.
 *
 * This replaces the broken `_survey.satisfactionPercentage_` field that was
 * read by the Excel export in `App.tsx` (audit finding #7).
 */
export function computeSatisfactionPercentage(answers: Answer[]): number {
  if (!Array.isArray(answers) || answers.length === 0) return 0;
  const total = answers.reduce((sum, a) => sum + clampScore(a.score), 0);
  const max = answers.length * 5;
  if (max <= 0) return 0;
  return Math.round((total / max) * 100);
}

function clampScore(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(5, n));
}
