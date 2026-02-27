import type {
  MediaEntry,
  MediaFilters,
  MediaFormInput,
  MediaSortBy,
  MediaStatus,
  MediaType,
} from "@/types/media";

export const STORAGE_KEY = "wisenerd:media-entries:v1";

export const fallbackCoverByType: Record<MediaType, string> = {
  livro: "/images/Art_of_Jessica_Cioffi_Loputyn_40.webp",
  filme: "/images/Art_of_Jessica_Cioffi_Loputyn_66.webp",
  serie: "/images/Art_of_Jessica_Cioffi_Loputyn_12.webp",
};

export const defaultFilters: MediaFilters = {
  query: "",
  type: "all",
  status: "all",
  minRating: 0,
  sortBy: "updatedAt",
  sortDirection: "desc",
};

export const defaultForm: MediaFormInput = {
  title: "",
  type: "filme",
  coverImage: fallbackCoverByType.filme,
  status: "quero",
  rating: 0,
  consumedOn: "",
  notes: "",
  tagsText: "",
};

export function newId(): string {
  return `m-${Math.random().toString(36).slice(2, 10)}`;
}

export function statusLabel(status: MediaStatus): string {
  switch (status) {
    case "quero":
      return "Quero consumir";
    case "consumindo":
      return "Consumindo";
    case "concluido":
      return "Concluido";
    case "pausado":
      return "Pausado";
    default:
      return status;
  }
}

export function typeLabel(type: MediaType): string {
  switch (type) {
    case "livro":
      return "Livro";
    case "filme":
      return "Filme";
    case "serie":
      return "Serie";
    default:
      return type;
  }
}

export function sortLabel(sortBy: MediaSortBy): string {
  switch (sortBy) {
    case "updatedAt":
      return "Atualizacao";
    case "consumedOn":
      return "Data de consumo";
    case "rating":
      return "Nota";
    case "title":
      return "Titulo";
    default:
      return sortBy;
  }
}

export function normalizeTags(tagsText: string): string[] {
  const unique = new Set<string>();

  tagsText
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .forEach((value) => unique.add(value));

  return Array.from(unique).slice(0, 8);
}

export function tagsToText(tags: string[]): string {
  return tags.join(", ");
}

export function parseStoredEntries(raw: string | null): MediaEntry[] | null {
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as unknown;

    if (!Array.isArray(data)) {
      return null;
    }

    if (data.length === 0) {
      return [];
    }

    const parsed = data
      .map((entry) => normalizeStoredEntry(entry))
      .filter((entry): entry is MediaEntry => entry !== null);

    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeStoredEntry(value: unknown): MediaEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;

  const validType = entry.type === "livro" || entry.type === "filme" || entry.type === "serie";
  const validStatus =
    entry.status === "quero" ||
    entry.status === "consumindo" ||
    entry.status === "concluido" ||
    entry.status === "pausado";

  if (
    typeof entry.id !== "string" ||
    typeof entry.title !== "string" ||
    !validType ||
    !validStatus ||
    typeof entry.rating !== "number" ||
    typeof entry.consumedOn !== "string" ||
    typeof entry.notes !== "string" ||
    !Array.isArray(entry.tags) ||
    typeof entry.createdAt !== "string" ||
    typeof entry.updatedAt !== "string"
  ) {
    return null;
  }

  const type = entry.type as MediaType;
  const status = entry.status as MediaStatus;

  const coverImage =
    typeof entry.coverImage === "string" && entry.coverImage.trim().length > 0
      ? entry.coverImage
      : fallbackCoverByType[type];

  return {
    id: entry.id,
    title: entry.title,
    type,
    coverImage,
    status,
    rating: entry.rating,
    consumedOn: entry.consumedOn,
    notes: entry.notes,
    tags: entry.tags.filter((tag): tag is string => typeof tag === "string"),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function applyFilters(entries: MediaEntry[], filters: MediaFilters): MediaEntry[] {
  const query = filters.query.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    const byText =
      query.length === 0 ||
      entry.title.toLowerCase().includes(query) ||
      entry.notes.toLowerCase().includes(query) ||
      entry.tags.some((tag) => tag.includes(query));

    const byType = filters.type === "all" || entry.type === filters.type;
    const byStatus = filters.status === "all" || entry.status === filters.status;
    const byRating = entry.rating >= filters.minRating;

    return byText && byType && byStatus && byRating;
  });

  return filtered.sort((a, b) => compareEntries(a, b, filters.sortBy, filters.sortDirection));
}

function compareEntries(
  a: MediaEntry,
  b: MediaEntry,
  sortBy: MediaSortBy,
  sortDirection: "asc" | "desc",
): number {
  const factor = sortDirection === "asc" ? 1 : -1;

  if (sortBy === "title") {
    return a.title.localeCompare(b.title) * factor;
  }

  if (sortBy === "rating") {
    return (a.rating - b.rating) * factor;
  }

  const dateA = sortBy === "consumedOn" ? a.consumedOn : a.updatedAt;
  const dateB = sortBy === "consumedOn" ? b.consumedOn : b.updatedAt;

  return dateA.localeCompare(dateB) * factor;
}

export function toExportJson(entries: MediaEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function toFormInput(entry: MediaEntry): MediaFormInput {
  return {
    title: entry.title,
    type: entry.type,
    coverImage: entry.coverImage,
    status: entry.status,
    rating: entry.rating,
    consumedOn: entry.consumedOn,
    notes: entry.notes,
    tagsText: tagsToText(entry.tags),
  };
}
