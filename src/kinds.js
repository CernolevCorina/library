// Tipuri de liste: fiecare are propriile cuvinte pentru „creator” și pentru starea bifat / nebifat.
export const KINDS = {
  books: {
    label: 'Cărți', addWhat: 'o carte', emoji: '📚', creator: 'Autor',
    one: 'carte', many: 'cărți', done: 'Citite', todo: 'Necitite',
    doneOne: 'citită', prompt: 'Ai terminat-o!',
  },
  games: {
    label: 'Jocuri', addWhat: 'un joc', emoji: '🎮', creator: 'Studio / platformă',
    one: 'joc', many: 'jocuri', done: 'Jucate', todo: 'Nejucate',
    doneOne: 'jucat', prompt: 'L-ai jucat!',
  },
  drinks: {
    label: 'Energizante', addWhat: 'un energizant', emoji: '⚡', creator: 'Brand',
    one: 'energizant', many: 'energizante', done: 'Încercate', todo: 'Neîncercate',
    doneOne: 'încercat', prompt: 'L-ai încercat!',
  },
  movies: {
    label: 'Filme / seriale', addWhat: 'un film sau serial', emoji: '🎬', creator: 'Regizor / platformă',
    one: 'titlu', many: 'titluri', done: 'Văzute', todo: 'Nevăzute',
    doneOne: 'văzut', prompt: 'L-ai văzut!',
  },
  other: {
    label: 'Altceva', addWhat: 'ceva', emoji: '✨', creator: 'Creator',
    one: 'element', many: 'elemente', done: 'Bifate', todo: 'Nebifate',
    doneOne: 'bifat', prompt: 'Bifat!',
  },
};

export function kindOf(list) {
  const k = KINDS[list?.kind] || KINDS.other;
  return { ...k, creator: list?.creatorLabel || k.creator };
}

export const plural = (n, k) => `${n} ${n === 1 ? k.one : k.many}`;
