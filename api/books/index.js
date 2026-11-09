import { randomUUID } from 'node:crypto';
import { requireUser, getAll, save, sanitize, handleError } from '../_lib.js';

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      return res.status(200).json(await getAll(user.id));
    }
    if (req.method === 'POST') {
      const book = sanitize(req.body || {}, { read: false, comment: '' });
      if (!book.title) return res.status(400).json({ error: 'Denumirea este obligatorie' });
      const now = new Date().toISOString();
      book.id = randomUUID();
      book.createdAt = now;
      book.updatedAt = now;
      return res.status(201).json(await save(user.id, book));
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).end();
  } catch (err) {
    handleError(res, err);
  }
}
