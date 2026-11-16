import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));

vi.mock('../src/lib/storage', () => {
  const emptyProfile = { key: 'main', xp: 0, streakDays: 0, lastActiveAt: 0, activeDays: [], updatedAt: 0 };
  return {
    db: {
      attempts: {
        orderBy: () => ({ reverse: () => ({ limit: () => ({ toArray: async () => [] }) }) }),
        toArray: async () => [],
      },
      profile: { get: async () => undefined },
      srs: { toArray: async () => [] },
      notes: { orderBy: () => ({ reverse: () => ({ toArray: async () => [] }) }) },
      favorites: {
        orderBy: () => ({ reverse: () => ({ toArray: async () => [] }) }),
        toArray: async () => [],
      },
    },
    defaultProfile: () => emptyProfile,
    getProfile: async () => emptyProfile,
    saveProfile: async () => emptyProfile,
    registerActivity: async () => emptyProfile,
    addAttempt: async () => 1,
    listAttempts: async () => [],
    getAttempt: async () => undefined,
    listSrs: async () => [],
    getSrs: async () => undefined,
    listNotes: async () => [],
    addNote: async () => undefined,
    deleteNote: async () => undefined,
    listFavorites: async () => [],
    toggleFavorite: async () => true,
    exportAll: async () => ({
      app: 'jolbilet',
      version: 1,
      exportedAt: 0,
      attempts: [],
      srs: [],
      notes: [],
      favorites: [],
      profile: emptyProfile,
    }),
    importAll: async () => undefined,
    resetAll: async () => undefined,
  };
});

const FILES = ['content.json', 'questions.json', 'signs.json', 'markings.json', 'pdd.json', 'fines.json'];

const okFetch = () =>
  vi.fn(async (input: string | URL | Request) => {
    const name = String(input).split('/').pop() ?? '';
    const raw = readFileSync(join(process.cwd(), 'public', 'content', 'v1', name), 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(raw) } as Response;
  });

/** Fresh module graph + successful content bundle. */
async function renderApp() {
  vi.resetModules();
  vi.stubGlobal('fetch', okFetch());
  const { default: App } = await import('../src/App');
  render(<App />);
}

beforeEach(() => {
  vi.stubGlobal('fetch', okFetch());
});

describe('app shell', () => {
  it('renders the app instead of crashing while the bundle loads', async () => {
    await renderApp();

    expect(await screen.findAllByText(/45 questions/, {}, { timeout: 4000 })).not.toHaveLength(0);
  });

  it('loads every content file', async () => {
    await renderApp();
    await screen.findAllByText(/45 questions/, {}, { timeout: 4000 });
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(FILES.length);
  });

  it('shows a retry card when the content bundle fails to load', async () => {
    vi.resetModules();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );
    const { default: App } = await import('../src/App');
    render(<App />);
    expect(await screen.findByText(/Could not load data|Не удалось загрузить данные/)).toBeInTheDocument();
  });

  it.each([
    ['/top', /Tops|Топы|Топтар/],
    ['/profile', /Profile|Профиль/],
    ['/signs', /Road signs|Дорожные знаки|Жол белгілері/],
    ['/tickets', /Tickets|Билеты|Билеттер/],
    ['/topics', /Topics|Темы|Тақырыптар/],
    ['/markings', /Road markings|Разметка|Жол сызықтары/],
    ['/reference', /Rules|ПДД|Ережелер/],
    ['/fines', /Fines|Штрафы|Айыппұлдар/],
    ['/progress', /progress|Прогресс|Прогресс/],
    ['/favorites', /Saved|Избранное|Таңдаулы/],
    ['/exam', /mode|Режим|Режим/],
  ])('renders %s without crashing', async (route, matcher) => {
    window.history.pushState({}, '', route);
    await renderApp();
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(matcher);
  });
});