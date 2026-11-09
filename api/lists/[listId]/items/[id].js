import { requireUser, getItem, saveItem, removeItem, sanitizeItem, validId, handleError } from '../../../_lib.js';

export default async function handler(req, res) {
  const { listId, id } = req.query;
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!validId(listId)) return res.status(404).json({ error: 'Lista nu există' });

    if (req.method === 'PATCH') {
      const existing = await getItem(user.id, listId, id);
      if (!existing) return res.status(404).json({ error: 'Elementul nu există' });
      const item = sanitizeItem(req.body || {}, existing);
      if (!item.title) return res.status(400).json({ error: 'Titlul este obligatoriu' });
      if ('rating' in (req.body || {}) && item.rating > 0 && !item.done) {
        return res.status(400).json({ error: 'Poți da o notă doar după ce bifezi elementul' });
      }
      item.updatedAt = new Date().toISOString();
      return res.status(200).json(await saveItem(user.id, listId, item));
    }
    if (req.method === 'DELETE') {
      await removeItem(user.id, listId, id);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'PATCH, DELETE');
    res.status(405).end();
  } catch (err) {
    handleError(res, err);
  }
}
