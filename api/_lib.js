import { Redis } from '@upstash/redis';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

const SESSION_COOKIE = 'lib_session';
const SESSION_TTL = 60 * 60 * 24 * 180; // 180 de zile

const booksKey = (userId) => `library:books:${userId}`;
const userKey = (username) => `library:user:${username}`;
const sessionKey = (token) => `library:session:${token}`;
const failKey = (username) => `library:loginfail:${username}`;

let client;
export function redis() {
  if (!client) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error('Baza de date nu este configurată (lipsesc KV_REST_API_URL / KV_REST_API_TOKEN).');
    }
    client = new Redis({ url, token });
  }
  return client;
}

const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

/* ---------- Utilizatori ---------- */

export function normalizeUsername(u) {
  return typeof u === 'string' ? u.trim().toLowerCase() : '';
}

export function validateCredentials(username, password) {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return 'Numele de utilizator trebuie să aibă 3–32 caractere: litere, cifre, „.”, „_” sau „-”.';
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    return 'Parola trebuie să aibă cel puțin 6 caractere.';
  }
  return null;
}

async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return { salt, hash };
}

export async function createUser(username, password) {
  const { salt, hash } = await hashPassword(password);
  const user = { id: randomBytes(12).toString('hex'), username, salt, hash, createdAt: new Date().toISOString() };
  // NX: nu suprascrie dacă numele e deja luat
  const ok = await redis().set(userKey(username), JSON.stringify(user), { nx: true });
  return ok ? user : null;
}

export async function verifyUser(username, password) {
  const fails = Number(await redis().get(failKey(username))) || 0;
  if (fails >= 10) return { error: 'Prea multe încercări. Încearcă din nou peste 15 minute.', status: 429 };

  const raw = await redis().get(userKey(username));
  const user = raw && parse(raw);
  if (user) {
    const { hash } = await hashPassword(password, user.salt);
    if (timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'))) {
      await redis().del(failKey(username));
      return { user };
    }
  }
  await redis().pipeline().incr(failKey(username)).expire(failKey(username), 15 * 60).exec();
  return { error: 'Nume de utilizator sau parolă greșită.', status: 401 };
}

/* ---------- Sesiuni (cookie httpOnly + token în Redis) ---------- */

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function cookie(value, maxAge) {
  const secure = process.env.VERCEL_ENV ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function startSession(res, user) {
  const token = randomBytes(32).toString('hex');
  await redis().set(sessionKey(token), JSON.stringify({ id: user.id, username: user.username }), { ex: SESSION_TTL });
  res.setHeader('Set-Cookie', cookie(token, SESSION_TTL));
}

export async function endSession(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await redis().del(sessionKey(token));
  res.setHeader('Set-Cookie', cookie('', 0));
}

export async function getSessionUser(req) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const raw = await redis().get(sessionKey(token));
  return raw ? parse(raw) : null;
}

// Returnează utilizatorul logat sau trimite 401 și returnează null.
export async function requireUser(req, res) {
  const user = await getSessionUser(req);
  if (!user) res.status(401).json({ error: 'Nu ești autentificat' });
  return user;
}

/* ---------- Liste și elemente (separat pentru fiecare utilizator) ---------- */

const listsKey = (userId) => `library:lists:${userId}`;
const itemsKey = (userId, listId) => `library:items:${userId}:${listId}`;

export const LIST_KINDS = ['books', 'games', 'drinks', 'movies', 'other'];
const DEFAULT_LIST_ID = 'books';

export function validId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(id);
}

export async function getLists(userId) {
  const data = (await redis().hgetall(listsKey(userId))) || {};
  let lists = Object.values(data).map(parse);

  // Prima rulare după trecerea la liste: cărțile vechi devin lista „Cărți”.
  if (lists.length === 0) {
    const list = {
      id: DEFAULT_LIST_ID,
      name: 'Cărți',
      emoji: '📚',
      kind: 'books',
      creatorLabel: '',
      createdAt: new Date().toISOString(),
    };
    if (await redis().exists(booksKey(userId))) {
      await redis().renamenx(booksKey(userId), itemsKey(userId, list.id));
    }
    await redis().hsetnx(listsKey(userId), list.id, JSON.stringify(list));
    lists = [parse(await redis().hget(listsKey(userId), list.id))];
  }

  const p = redis().pipeline();
  for (const l of lists) p.hlen(itemsKey(userId, l.id));
  const counts = await p.exec();
  return lists
    .map((l, i) => ({ ...l, count: Number(counts[i]) || 0 }))
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export async function getList(userId, listId) {
  if (!validId(listId)) return null;
  const v = await redis().hget(listsKey(userId), listId);
  return v ? parse(v) : null;
}

export async function saveList(userId, list) {
  const { count, ...rest } = list;
  await redis().hset(listsKey(userId), { [list.id]: JSON.stringify(rest) });
  return list;
}

export async function removeList(userId, listId) {
  await redis().pipeline().hdel(listsKey(userId), listId).del(itemsKey(userId, listId)).exec();
}

export async function countLists(userId) {
  return redis().hlen(listsKey(userId));
}

export function sanitizeList(input, base = {}) {
  const out = { ...base };
  if ('name' in input) out.name = str(input.name, 60);
  if ('emoji' in input) out.emoji = str(input.emoji, 16);
  if ('kind' in input) out.kind = LIST_KINDS.includes(input.kind) ? input.kind : 'other';
  if ('creatorLabel' in input) out.creatorLabel = str(input.creatorLabel, 40);
  return out;
}

// Elementele vechi aveau `author` și `read`; le aducem la forma nouă la citire.
function normalizeItem(i) {
  const { author, read, ...rest } = i;
  return {
    ...rest,
    creator: i.creator ?? author ?? '',
    done: Boolean(i.done ?? read),
    rating: Number(i.rating) || 0,
    comment: i.comment || '',
  };
}

export async function getItems(userId, listId) {
  const data = (await redis().hgetall(itemsKey(userId, listId))) || {};
  return Object.values(data).map((v) => normalizeItem(parse(v)));
}

export async function getItem(userId, listId, id) {
  const v = await redis().hget(itemsKey(userId, listId), id);
  return v ? normalizeItem(parse(v)) : null;
}

export async function saveItem(userId, listId, item) {
  await redis().hset(itemsKey(userId, listId), { [item.id]: JSON.stringify(item) });
  return item;
}

export async function removeItem(userId, listId, id) {
  await redis().hdel(itemsKey(userId, listId), id);
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function sanitizeItem(input, base = {}) {
  const out = { ...base };
  if ('title' in input) out.title = str(input.title, 300);
  if ('creator' in input) out.creator = str(input.creator, 200);
  if ('comment' in input) out.comment = str(input.comment, 5000);
  if ('done' in input) out.done = Boolean(input.done);
  if ('rating' in input) {
    // Notă 1–10 cu pas de 0.5; 0 = fără notă.
    const r = Math.round((Number(input.rating) || 0) * 2) / 2;
    out.rating = r <= 0 ? 0 : Math.min(10, Math.max(1, r));
  }
  return out;
}

export function handleError(res, err) {
  console.error(err);
  res.status(500).json({ error: err.message || 'Eroare de server' });
}
