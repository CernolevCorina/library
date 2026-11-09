import { requireUser, getOne, save, remove, sanitize, handleError } from '../_lib.js';

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === 'PATCH') {
      const existing = await getOne(user.id, id);
      if (!existing) return res.status(404).json({ error: 'Cartea nu există' });
      const book = sanitize(req.body || {}, existing);
      if (!book.title) return res.status(400).json({ error: 'Denumirea este obligatorie' });
      book.updatedAt = new Date().toISOString();
      return res.status(200).json(await save(user.id, book));
    }
    if (req.method === 'DELETE') {
      await remove(user.id, id);
      return res.status(204).end();
    }
    res.setHeader('Allow', 'PATCH, DELETE');
    res.status(405).end();
  } catch (err) {
    handleError(res, err);
  }
}
