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

/* ---------- Cărți (separat pentru fiecare utilizator) ---------- */

export async function getAll(userId) {
  const data = (await redis().hgetall(booksKey(userId))) || {};
  return Object.values(data).map(parse);
}

export async function getOne(userId, id) {
  const v = await redis().hget(booksKey(userId), id);
  return v ? parse(v) : null;
}

export async function save(userId, book) {
  await redis().hset(booksKey(userId), { [book.id]: JSON.stringify(book) });
  return book;
}

export async function remove(userId, id) {
  await redis().hdel(booksKey(userId), id);
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function sanitize(input, base = {}) {
  const out = { ...base };
  if ('title' in input) out.title = str(input.title, 300);
  if ('author' in input) out.author = str(input.author, 200);
  if ('comment' in input) out.comment = str(input.comment, 5000);
  if ('read' in input) out.read = Boolean(input.read);
  return out;
}

export function handleError(res, err) {
  console.error(err);
  res.status(500).json({ error: err.message || 'Eroare de server' });
}
