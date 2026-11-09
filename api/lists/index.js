import { randomUUID } from 'node:crypto';
import { requireUser, getLists, saveList, sanitizeList, handleError } from '../_lib.js';

export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      return res.status(200).json(await getLists(user.id));
    }
    if (req.method === 'POST') {
      const list = sanitizeList(req.body || {}, { emoji: '', kind: 'other', creatorLabel: '' });
      if (!list.name) return res.status(400).json({ error: 'Numele listei este obligatoriu' });
      list.id = randomUUID();
      list.createdAt = new Date().toISOString();
      await saveList(user.id, list);
      return res.status(201).json({ ...list, count: 0 });
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).end();
  } catch (err) {
    handleError(res, err);
  }
}
