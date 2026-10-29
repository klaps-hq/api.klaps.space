/** Encje obslugiwane przez kaskadowe usuwanie panelu (po slugu). */
export const DELETABLE_ENTITIES = [
  'movies',
  'cinemas',
  'cities',
  'genres',
  'directors',
] as const;

export type DeletableEntity = (typeof DELETABLE_ENTITIES)[number];

export function isDeletableEntity(value: string): value is DeletableEntity {
  return (DELETABLE_ENTITIES as readonly string[]).includes(value);
}

export interface DependentCount {
  /** Etykieta widoczna w panelu, np. "seanse". */
  label: string;
  count: number;
}

export interface DeletePreview {
  entity: DeletableEntity;
  slug: string;
  /** Nazwa/tytul usuwanego rekordu (do potwierdzenia w panelu). */
  name: string;
  /** Rekordy powiazane, ktore zostana usuniete kaskadowo. */
  dependents: DependentCount[];
}
