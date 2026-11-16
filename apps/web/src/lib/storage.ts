import Dexie, { type Table } from 'dexie';
import type { AnswerRecord } from './scoring';
import type { ExamMode } from './types';
import { createSrsState, reviewSrs, type SrsState } from './srs';

export interface AttemptRecord {
  id?: number;
  at: number;
  mode: ExamMode;
  profileId: string;
  total: number;
  correct: number;
  errors: number;
  accuracy: number;
  passed: boolean;
  durationMs: number;
  answers: AnswerRecord[];
  failedQuestionIds: string[];
}

export interface NoteRecord {
  id?: number;
  questionId: string;
  text: string;
  at: number;
}

export interface ProfileRecord {
  key: string;
  xp: number;
  streakDays: number;
  lastActiveAt: number;
  activeDays: string[];
  updatedAt: number;
  /** Optional local profile (no server required). */
  name?: string;
  avatarColor?: string;
  createdAt?: number;
}

class JolBiletDb extends Dexie {
  attempts!: Table<AttemptRecord, number>;
  srs!: Table<SrsState, string>;
  notes!: Table<NoteRecord, number>;
  favorites!: Table<{ questionId: string; at: number }, string>;
  profile!: Table<ProfileRecord, string>;

  constructor() {
    super('jolbilet');
    this.version(1).stores({
      attempts: '++id, at, mode, passed',
      srs: 'questionId, dueAt',
      notes: '++id, questionId, at',
      favorites: 'questionId, at',
      profile: 'key',
    });
  }
}

export const db = new JolBiletDb();

const PROFILE_KEY = 'main';

export const defaultProfile = (): ProfileRecord => ({
  key: PROFILE_KEY,
  xp: 0,
  streakDays: 0,
  lastActiveAt: 0,
  activeDays: [],
  updatedAt: Date.now(),
});

export async function getProfile(): Promise<ProfileRecord> {
  const found = await db.profile.get(PROFILE_KEY);
  if (found) return found;
  const created = defaultProfile();
  await db.profile.put(created);
  return created;
}

export async function saveProfile(patch: Partial<ProfileRecord>): Promise<ProfileRecord> {
  const current = await getProfile();
  const next: ProfileRecord = { ...current, ...patch, key: PROFILE_KEY, updatedAt: Date.now() };
  await db.profile.put(next);
  return next;
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Registers activity, updates XP and the consecutive-day streak. */
export async function registerActivity(xp: number, at = Date.now()): Promise<ProfileRecord> {
  const profile = await getProfile();
  const today = dayKey(at);
  const yesterday = dayKey(at - 86_400_000);
  const activeDays = profile.activeDays.includes(today) ? profile.activeDays : [...profile.activeDays, today].slice(-400);
  const streakDays =
    profile.activeDays.includes(today) ? profile.streakDays : profile.activeDays.includes(yesterday) ? profile.streakDays + 1 : 1;
  return saveProfile({
    xp: profile.xp + xp,
    streakDays,
    lastActiveAt: at,
    activeDays,
  });
}

export async function addAttempt(record: Omit<AttemptRecord, 'id'>): Promise<number> {
  const id = await db.attempts.add(record);
  for (const answer of record.answers) {
    const previous = await db.srs.get(answer.questionId);
    const next = reviewSrs(previous ?? createSrsState(answer.questionId), answer.questionId, answer.correct, record.at);
    await db.srs.put(next);
  }
  const gained = 10 + Math.round(record.accuracy * 40) + (record.passed ? 30 : 0);
  await registerActivity(gained, record.at);
  return id;
}

export async function listAttempts(limit = 200): Promise<AttemptRecord[]> {
  const rows = await db.attempts.orderBy('at').reverse().limit(limit).toArray();
  return rows;
}

export async function getAttempt(id: number): Promise<AttemptRecord | undefined> {
  return db.attempts.get(id);
}

export async function listSrs(): Promise<SrsState[]> {
  return db.srs.toArray();
}

export async function getSrs(questionId: string): Promise<SrsState | undefined> {
  return db.srs.get(questionId);
}

export async function listNotes(): Promise<NoteRecord[]> {
  return db.notes.orderBy('at').reverse().toArray();
}

export async function addNote(questionId: string, text: string): Promise<void> {
  await db.notes.add({ questionId, text, at: Date.now() });
}

export async function deleteNote(id: number): Promise<void> {
  await db.notes.delete(id);
}

export async function listFavorites(): Promise<string[]> {
  const rows = await db.favorites.orderBy('at').reverse().toArray();
  return rows.map((r) => r.questionId);
}

export async function toggleFavorite(questionId: string): Promise<boolean> {
  const existing = await db.favorites.get(questionId);
  if (existing) {
    await db.favorites.delete(questionId);
    return false;
  }
  await db.favorites.put({ questionId, at: Date.now() });
  return true;
}

export interface ExportPayload {
  app: 'jolbilet';
  version: 1;
  exportedAt: number;
  attempts: AttemptRecord[];
  srs: SrsState[];
  notes: NoteRecord[];
  favorites: string[];
  profile: ProfileRecord;
}

export async function exportAll(): Promise<ExportPayload> {
  const [attempts, srs, notes, favorites, profile] = await Promise.all([
    db.attempts.toArray(),
    db.srs.toArray(),
    db.notes.toArray(),
    listFavorites(),
    getProfile(),
  ]);
  return { app: 'jolbilet', version: 1, exportedAt: Date.now(), attempts, srs, notes, favorites, profile };
}

export async function importAll(payload: ExportPayload): Promise<void> {
  if (!payload || payload.app !== 'jolbilet') throw new Error('unsupported file');
  await db.transaction('rw', db.attempts, db.srs, db.notes, db.favorites, db.profile, async () => {
    await db.attempts.clear();
    await db.srs.clear();
    await db.notes.clear();
    await db.favorites.clear();
    await db.profile.clear();
    if (payload.attempts.length) await db.attempts.bulkAdd(payload.attempts);
    if (payload.srs.length) await db.srs.bulkPut(payload.srs);
    if (payload.notes.length) await db.notes.bulkAdd(payload.notes);
    if (payload.favorites.length) {
      await db.favorites.bulkPut(payload.favorites.map((questionId) => ({ questionId, at: Date.now() })));
    }
    await db.profile.put({ ...defaultProfile(), ...payload.profile, key: PROFILE_KEY });
  });
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', db.attempts, db.srs, db.notes, db.favorites, db.profile, async () => {
    await db.attempts.clear();
    await db.srs.clear();
    await db.notes.clear();
    await db.favorites.clear();
    await db.profile.clear();
    await db.profile.put(defaultProfile());
  });
}