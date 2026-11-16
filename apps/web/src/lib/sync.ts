/**
 * Device-to-device transfer without a server.
 *
 * A sync code is the whole progress blob (attempts, SRS, notes, favorites,
 * profile) encoded as base64url with a `JB1:` prefix. Paste it on another device
 * to restore. It is a *transfer* channel, not an authentication mechanism:
 * treat a code as private data.
 */

import { exportAll, importAll, type ExportPayload } from './storage';

const PREFIX = 'JB1:';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const normalized = code.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function createSyncCode(): Promise<string> {
  return exportAll().then((payload) => {
    const trimmed: ExportPayload = {
      ...payload,
      attempts: payload.attempts.slice(-300),
    };
    return PREFIX + toBase64Url(JSON.stringify(trimmed));
  });
}

export async function applySyncCode(code: string): Promise<{ attempts: number; xp: number }> {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) throw new Error('invalid sync code');
  const json = fromBase64Url(trimmed.slice(PREFIX.length));
  const payload = JSON.parse(json) as ExportPayload;
  if (payload?.app !== 'jolbilet') throw new Error('unsupported payload');
  await importAll(payload);
  return { attempts: payload.attempts?.length ?? 0, xp: payload.profile?.xp ?? 0 };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}