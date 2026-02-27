import type {
  MediaEntry,
  MediaFilters,
  MediaFormInput,
  MediaSortBy,
  MediaStatus,
  MediaType,
} from "@/types/media";

export const STORAGE_KEY = "wisenerd:media-entries:v1";

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

    const parsed: MediaEntry[] = [];

    for (const entry of data) {
      if (!isMediaEntry(entry)) {
        continue;
      }

      parsed.push(entry);
    }

    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function isMediaEntry(value: unknown): value is MediaEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    (entry.type === "livro" || entry.type === "filme" || entry.type === "serie") &&
    (entry.status === "quero" ||
      entry.status === "consumindo" ||
      entry.status === "concluido" ||
      entry.status === "pausado") &&
    typeof entry.rating === "number" &&
    typeof entry.consumedOn === "string" &&
    typeof entry.notes === "string" &&
    Array.isArray(entry.tags) &&
    typeof entry.createdAt === "string" &&
    typeof entry.updatedAt === "string"
  );
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
    status: entry.status,
    rating: entry.rating,
    consumedOn: entry.consumedOn,
    notes: entry.notes,
    tagsText: tagsToText(entry.tags),
  };
}
