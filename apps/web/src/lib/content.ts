import type { ContentBundle } from './types';

const BASE = '/content/v1';

let bundle: ContentBundle | null = null;
let inflight: Promise<ContentBundle> | null = null;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}/${file}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`content ${file}: ${res.status}`);
  return (await res.json()) as T;
}

export async function loadContent(): Promise<ContentBundle> {
  if (bundle) return bundle;
  if (inflight) return inflight;

  inflight = (async () => {
    const [meta, questions, signs, markings, pdd, fines] = await Promise.all([
      getJson<{ version: string; topics: ContentBundle['topics']; examProfiles: ContentBundle['examProfiles'] }>('content.json'),
      getJson<{ version: string; questions: ContentBundle['questions'] }>('questions.json'),
      getJson<{ version: string; signs: ContentBundle['signs'] }>('signs.json'),
      getJson<{ version: string; markings: ContentBundle['markings'] }>('markings.json'),
      getJson<{ version: string; chapters: ContentBundle['chapters'] }>('pdd.json'),
      getJson<{ version: string; fines: ContentBundle['fines'] }>('fines.json'),
    ]);

    bundle = {
      version: meta.version,
      topics: meta.topics,
      examProfiles: meta.examProfiles,
      questions: questions.questions,
      signs: signs.signs,
      markings: markings.markings,
      chapters: pdd.chapters,
      fines: fines.fines,
    };
    inflight = null;
    return bundle;
  })();

  return inflight;
}

export function peekContent(): ContentBundle | null {
  return bundle;
}

export function signById(bundle: ContentBundle, id: string) {
  return bundle.signs.find((s) => s.id === id);
}

export function questionsBySign(bundle: ContentBundle, signId: string) {
  return bundle.questions.filter((q) => q.signIds?.includes(signId));
}

export function chapterById(bundle: ContentBundle, id: string) {
  return bundle.chapters.find((c) => c.id === id);
}