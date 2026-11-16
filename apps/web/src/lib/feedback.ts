/**
 * "Report a problem" queue for content issues.
 *
 * There is no server yet, so reports are queued locally and can be exported from
 * the profile page as JSON. This keeps the feedback loop real (nothing is
 * silently dropped) without pretending the data reached anyone.
 */

export type FeedbackKind = 'error' | 'typo' | 'idea';

export interface FeedbackItem {
  id: string;
  questionId: string;
  kind: FeedbackKind;
  text: string;
  at: number;
  locale: string;
}

const KEY = 'jb.feedback.v1';
const MAX_ITEMS = 200;

function read(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedbackItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: FeedbackItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* storage may be full or blocked */
  }
}

export function addFeedback(input: {
  questionId: string;
  kind: FeedbackKind;
  text: string;
  locale: string;
}): FeedbackItem {
  const item: FeedbackItem = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    questionId: input.questionId,
    kind: input.kind,
    text: input.text.trim().slice(0, 500),
    at: Date.now(),
    locale: input.locale,
  };
  write([...read(), item]);
  return item;
}

export function listFeedback(): FeedbackItem[] {
  return read().sort((a, b) => b.at - a.at);
}

export function countFeedback(): number {
  return read().length;
}

export function clearFeedback(): void {
  write([]);
}

export function feedbackAsJson(): string {
  return JSON.stringify({ app: 'jolbilet', exportedAt: new Date().toISOString(), items: read() }, null, 2);
}