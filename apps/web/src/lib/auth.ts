/**
 * Optional local profile / account layer.
 *
 * The app is fully usable without an account: progress lives in IndexedDB on the
 * device. Signing in is optional and currently *local only* — the profile is
 * stored next to the progress, so it survives reloads but not a cleared browser.
 *
 * A real cross-device account needs a server (see `docs/auth.md` and the Rust API
 * contract in the plan). To plug one in later, implement `AuthApi` against your
 * backend and swap `localAuth` for it in `ProfilePage`; nothing else changes.
 */

import { getProfile, saveProfile } from './storage';

export interface LocalAccount {
  name: string;
  avatarColor: string;
  createdAt: number;
}

export interface AuthApi {
  mode: 'local' | 'remote';
  current: () => Promise<LocalAccount | null>;
  create: (name: string, avatarColor?: string) => Promise<LocalAccount>;
  update: (patch: Partial<Pick<LocalAccount, 'name' | 'avatarColor'>>) => Promise<LocalAccount>;
  remove: () => Promise<void>;
}

export const AVATAR_COLORS = ['#7c5cff', '#22d3ee', '#34d399', '#fbbf24', '#f87171', '#f472b6', '#60a5fa'] as const;

export class AuthUnavailableError extends Error {
  constructor(message = 'Account service is not configured') {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

function pickColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] as string;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] as string).slice(0, 2).toUpperCase();
  return `${(parts[0] as string)[0]}${(parts[1] as string)[0]}`.toUpperCase();
}

export const localAuth: AuthApi = {
  mode: 'local',
  async current() {
    const profile = await getProfile();
    if (!profile.name) return null;
    return {
      name: profile.name,
      avatarColor: profile.avatarColor ?? pickColor(profile.name),
      createdAt: profile.createdAt ?? profile.updatedAt,
    };
  },
  async create(name, avatarColor) {
    const trimmed = name.trim().slice(0, 48);
    if (trimmed.length < 2) throw new Error('Name must be at least 2 characters');
    const account: LocalAccount = {
      name: trimmed,
      avatarColor: avatarColor ?? pickColor(trimmed),
      createdAt: Date.now(),
    };
    await saveProfile({ name: account.name, avatarColor: account.avatarColor, createdAt: account.createdAt });
    return account;
  },
  async update(patch) {
    const profile = await getProfile();
    const nextName = patch.name?.trim().slice(0, 48) || profile.name || 'Водитель';
    const next: LocalAccount = {
      name: nextName,
      avatarColor: patch.avatarColor ?? profile.avatarColor ?? pickColor(nextName),
      createdAt: profile.createdAt ?? Date.now(),
    };
    await saveProfile({ name: next.name, avatarColor: next.avatarColor, createdAt: next.createdAt });
    return next;
  },
  async remove() {
    await saveProfile({ name: undefined, avatarColor: undefined, createdAt: undefined });
  },
};

/**
 * Remote adapter placeholder. Kept so the UI can switch to a real backend by
 * setting VITE_AUTH_URL and replacing `localAuth` in the profile page.
 */
export function createRemoteAuth(baseUrl: string): AuthApi {
  return {
    mode: 'remote',
    current: async () => {
      void baseUrl;
      throw new AuthUnavailableError();
    },
    create: async () => {
      throw new AuthUnavailableError();
    },
    update: async () => {
      throw new AuthUnavailableError();
    },
    remove: async () => {
      throw new AuthUnavailableError();
    },
  };
}