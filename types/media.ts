export const mediaTypes = ["livro", "filme", "serie"] as const;
export const mediaStatuses = ["quero", "consumindo", "concluido", "pausado"] as const;
export const mediaSorts = ["updatedAt", "consumedOn", "rating", "title"] as const;

export type MediaType = (typeof mediaTypes)[number];
export type MediaStatus = (typeof mediaStatuses)[number];
export type MediaSortBy = (typeof mediaSorts)[number];

export interface MediaEntry {
  id: string;
  title: string;
  type: MediaType;
  coverImage: string;
  status: MediaStatus;
  rating: number;
  consumedOn: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaFilters {
  query: string;
  type: MediaType | "all";
  status: MediaStatus | "all";
  minRating: number;
  sortBy: MediaSortBy;
  sortDirection: "asc" | "desc";
}

export interface MediaFormInput {
  title: string;
  type: MediaType;
  coverImage: string;
  status: MediaStatus;
  rating: number;
  consumedOn: string;
  notes: string;
  tagsText: string;
}
