import { Title } from './models';
export const titleKey = (title: Pick<Title,'media_type'|'id'>) => `${title.media_type}:${title.id}`;

// Mantener la tarjeta que se está leyendo; promover las siguientes sin repetir títulos.
export function mergePriorities(deck: Title[], priorities: Title[]): Title[] {
  const current = deck[0];
  const known = new Set(current ? [titleKey(current)] : []);
  const favored = priorities.filter(t=>!known.has(titleKey(t)));
  const priorityKeys = new Set(favored.map(titleKey));
  const remaining = deck.slice(current ? 1 : 0).filter(t=>!priorityKeys.has(titleKey(t)));
  const result = current ? [current] : [];
  while (favored.length || remaining.length) {
    for (let slot=0;slot<3;slot++) {
      const title = slot<2 && favored.length ? favored.shift() : remaining.shift() ?? favored.shift();
      if (title && !known.has(titleKey(title))) {result.push(title);known.add(titleKey(title));}
    }
  }
  return result;
}
