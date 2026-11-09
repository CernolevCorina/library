import { requireUser, getList, saveList, removeList, countLists, sanitizeList, handleError } from '../../_lib.js';

export default async function handler(req, res) {
  const { listId } = req.query;
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const existing = await getList(user.id, listId);
    if (!existing) return res.status(404).json({ error: 'Lista nu există' });

    if (req.method === 'PATCH') {
      const list = sanitizeList(req.body || {}, existing);
      if (!list.name) return res.status(400).json({ error: 'Numele listei este obligatoriu' });
      return res.status(200).json(await saveList(user.id, list));
    }
    if (req.method === 'DELETE') {
      if ((await countLists(user.id)) <= 1) {
        return res.status(400).json({ error: 'Nu poți șterge ultima listă' });
      }
      await removeList(user.id, listId);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'PATCH, DELETE');
    res.status(405).end();
  } catch (err) {
    handleError(res, err);
  }
}
