import { randomUUID } from 'node:crypto';
import { requireUser, getList, getItems, saveItem, sanitizeItem, handleError } from '../../../_lib.js';

export default async function handler(req, res) {
  const { listId } = req.query;
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!(await getList(user.id, listId))) return res.status(404).json({ error: 'Lista nu există' });

    if (req.method === 'GET') {
      return res.status(200).json(await getItems(user.id, listId));
    }
    if (req.method === 'POST') {
      const item = sanitizeItem(req.body || {}, { creator: '', done: false, rating: 0, comment: '' });
      if (!item.done) item.rating = 0; // nota doar pentru elementele bifate
      if (!item.title) return res.status(400).json({ error: 'Titlul este obligatoriu' });
      const now = new Date().toISOString();
      item.id = randomUUID();
      item.createdAt = now;
      item.updatedAt = now;
      return res.status(201).json(await saveItem(user.id, listId, item));
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).end();
  } catch (err) {
    handleError(res, err);
  }
}
