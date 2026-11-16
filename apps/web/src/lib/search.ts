import type { ContentBundle, Locale, Localized } from './types';
import { pickLocalized } from './utils';

export type SearchKind = 'question' | 'sign' | 'pdd' | 'fine';

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: Localized;
  snippet: Localized;
  to: string;
  score: number;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-яәғқңөұүһі0-9.]+/gi, ' ')
    .trim();
}

function tokenize(query: string): string[] {
  return normalize(query).split(' ').filter((t) => t.length > 1);
}

function score(text: string, tokens: readonly string[]): number {
  const haystack = normalize(text);
  let total = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) total += 1;
    else return 0;
  }
  return total / tokens.length;
}

export function searchContent(bundle: ContentBundle, query: string, locale: Locale, limit = 40): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const hits: SearchHit[] = [];

  for (const q of bundle.questions) {
    const haystack = [pickLocalized(q.text, locale), q.pdDRefs.map((r) => r.point ?? r.chapter).join(' '), (q.tags ?? []).join(' ')].join(' ');
    const s = score(haystack, tokens);
    if (s === 0) continue;
    hits.push({
      kind: 'question',
      id: q.id,
      title: q.text,
      snippet: q.explanation,
      to: `/exam/preview/${q.id}`,
      score: s * 0.85,
    });
  }

  for (const sign of bundle.signs) {
    const s = score([sign.code, pickLocalized(sign.title, locale), pickLocalized(sign.desc, locale)].join(' '), tokens);
    if (s === 0) continue;
    hits.push({
      kind: 'sign',
      id: sign.id,
      title: sign.title,
      snippet: sign.desc,
      to: `/signs/${sign.code}`,
      score: s * 1.15,
    });
  }

  for (const chapter of bundle.chapters) {
    for (const point of chapter.points) {
      const s = score([point.id, pickLocalized(point.text, locale), pickLocalized(chapter.title, locale)].join(' '), tokens);
      if (s === 0) continue;
      hits.push({
        kind: 'pdd',
        id: `${chapter.id}-${point.id}`,
        title: { ru: `Пункт ${point.id} · ${pickLocalized(chapter.title, 'ru')}`, kk: `${point.id} тармағы`, en: `Point ${point.id}` },
        snippet: point.text,
        to: `/reference/${chapter.id}#p-${point.id}`,
        score: s,
      });
    }
  }

  for (const fine of bundle.fines) {
    const s = score([fine.article, pickLocalized(fine.title, locale), pickLocalized(fine.note ?? fine.title, locale)].join(' '), tokens);
    if (s === 0) continue;
    hits.push({
      kind: 'fine',
      id: fine.id,
      title: fine.title,
      snippet: fine.note ?? fine.title,
      to: `/fines#${fine.id}`,
      score: s * 0.95,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}