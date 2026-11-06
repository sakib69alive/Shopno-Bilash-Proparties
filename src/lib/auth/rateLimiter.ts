import "server-only";
import { prisma } from "@/lib/db";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
// A second, slower ceiling: without it, 5 guesses per 15 minutes still lets someone walk through all 10,000
// four-digit PINs in about three weeks. 20 per day stretches that past a year and a half.
const MAX_ATTEMPTS_PER_DAY = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Attempt {
  count: number;
  windowStart: number;
  dayCount?: number;
  dayStart?: number;
}

/**
 * DB-persisted limiter, keyed by the submitted email/phone (lowercased) —
 * not by IP, since a shared office/VPN IP shouldn't lock out every real user
 * behind it. Stored in the shared database (not memory) because a serverless
 * deploy runs requests on several short-lived instances.
 *
 * `takeAttempt` RESERVES an attempt before the password/PIN is checked,
 * instead of counting a failure afterwards. The old order (check, verify,
 * then record) left a gap of one whole slow password hash during which a
 * burst of parallel guesses all saw "0 attempts so far" and all got through.
 * Calls for the same key inside one server instance are also run one at a
 * time, so that burst can't interleave its read-then-write either.
 * A correct login calls `clearAttempts` to give the attempt back.
 */
const chains = new Map<string, Promise<unknown>>();

function serialized<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  chains.set(key, tail);
  void tail.then(() => {
    if (chains.get(key) === tail) chains.delete(key);
  });
  return run;
}

async function readAttempt(key: string): Promise<Attempt | null> {
  const row = await prisma.rateLimitAttempt.findUnique({ where: { id: key } });
  if (!row) return null;
  return row.data as unknown as Attempt;
}

/** Returns `true` when this attempt may go ahead (and has been counted), `false` when the key is locked out. */
export function takeAttempt(email: string): Promise<boolean> {
  const key = email.toLowerCase();
  return serialized(key, async () => {
    const now = Date.now();
    const entry = await readAttempt(key);

    const shortExpired = !entry || now - entry.windowStart > WINDOW_MS;
    const dayExpired = !entry || entry.dayStart === undefined || now - entry.dayStart > DAY_MS;

    const count = shortExpired ? 0 : entry.count;
    const dayCount = dayExpired ? 0 : (entry.dayCount ?? 0);

    if (count >= MAX_ATTEMPTS || dayCount >= MAX_ATTEMPTS_PER_DAY) return false;

    const next: Attempt = {
      count: count + 1,
      windowStart: shortExpired ? now : entry.windowStart,
      dayCount: dayCount + 1,
      dayStart: dayExpired ? now : entry.dayStart,
    };
    await prisma.rateLimitAttempt.upsert({
      where: { id: key },
      create: { id: key, data: next as object },
      update: { data: next as object },
    });
    return true;
  });
}

/** A correct login: forget the failed attempts so a real user is never slowly locked out by their own typos. */
export function clearAttempts(email: string): Promise<void> {
  const key = email.toLowerCase();
  return serialized(key, async () => {
    await prisma.rateLimitAttempt.delete({ where: { id: key } }).catch(() => {});
  });
}
