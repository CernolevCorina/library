import {
  createUser,
  verifyUser,
  startSession,
  endSession,
  getSessionUser,
  normalizeUsername,
  validateCredentials,
  handleError,
} from '../_lib.js';

// Un singur endpoint pentru: /api/auth/register, /login, /logout, /me
export default async function handler(req, res) {
  const { action } = req.query;
  try {
    if (action === 'me' && req.method === 'GET') {
      const user = await getSessionUser(req);
      return user ? res.status(200).json({ username: user.username }) : res.status(401).json({ error: 'Neautentificat' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', action === 'me' ? 'GET' : 'POST');
      return res.status(405).end();
    }

    if (action === 'logout') {
      await endSession(req, res);
      return res.status(204).end();
    }

    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password;

    if (action === 'register') {
      const invalid = validateCredentials(username, password);
      if (invalid) return res.status(400).json({ error: invalid });
      const user = await createUser(username, password);
      if (!user) return res.status(409).json({ error: 'Acest nume de utilizator este deja folosit.' });
      await startSession(res, user);
      return res.status(201).json({ username: user.username });
    }

    if (action === 'login') {
      if (!username || typeof password !== 'string') {
        return res.status(400).json({ error: 'Completează numele și parola.' });
      }
      const result = await verifyUser(username, password);
      if (result.error) return res.status(result.status).json({ error: result.error });
      await startSession(res, result.user);
      return res.status(200).json({ username: result.user.username });
    }

    res.status(404).json({ error: 'Acțiune necunoscută' });
  } catch (err) {
    handleError(res, err);
  }
}
