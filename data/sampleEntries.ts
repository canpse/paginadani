import type { MediaEntry } from "@/types/media";

const now = "2026-02-27T00:00:00.000Z";

export const sampleEntries: MediaEntry[] = [
  {
    id: "m-001",
    title: "Frieren",
    type: "serie",
    coverImage: "/images/Art_of_Jessica_Cioffi_Loputyn_12.webp",
    status: "consumindo",
    rating: 5,
    consumedOn: "2026-02-22",
    notes: "Ritmo calmo, bonito e muito emocional.",
    tags: ["fantasia", "emocional"],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "m-002",
    title: "Spirited Away",
    type: "filme",
    coverImage: "/images/Art_of_Jessica_Cioffi_Loputyn_66.webp",
    status: "concluido",
    rating: 5,
    consumedOn: "2026-01-18",
    notes: "Visual incrivel e atmosfera unica.",
    tags: ["animacao", "favorito"],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "m-003",
    title: "A Biblioteca da Meia-Noite",
    type: "livro",
    coverImage: "/images/Art_of_Jessica_Cioffi_Loputyn_40.webp",
    status: "concluido",
    rating: 4,
    consumedOn: "2026-02-01",
    notes: "Leitura fluida, boas reflexoes.",
    tags: ["ficcao", "reflexivo"],
    createdAt: now,
    updatedAt: now,
  },
];
