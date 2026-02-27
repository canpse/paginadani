"use client";

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { sampleEntries } from "@/data/sampleEntries";
import {
  applyFilters,
  defaultFilters,
  defaultForm,
  fallbackCoverByType,
  newId,
  normalizeTags,
  parseStoredEntries,
  sortLabel,
  statusLabel,
  STORAGE_KEY,
  toExportJson,
  toFormInput,
  typeLabel,
} from "@/lib/media-utils";
import {
  mediaSorts,
  mediaStatuses,
  mediaTypes,
  type MediaEntry,
  type MediaFilters,
  type MediaFormInput,
  type MediaType,
} from "@/types/media";
import styles from "@/components/MediaTrackerApp.module.css";

type NoticeTone = "ok" | "warn";

interface NoticeState {
  tone: NoticeTone;
  text: string;
}

const COVER_PRESETS = [
  "/images/Art_of_Jessica_Cioffi_Loputyn_66.webp",
  "/images/Art_of_Jessica_Cioffi_Loputyn_40.webp",
  "/images/Art_of_Jessica_Cioffi_Loputyn_12.webp",
  "/images/Art_of_Jessica_Cioffi_Loputyn_7.webp",
];

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(value: string): string {
  if (!value) {
    return "sem data";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function stars(rating: number): string {
  if (rating <= 0) {
    return "sem nota";
  }

  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function excerpt(text: string, max = 180): string {
  const normalized = text.trim();

  if (normalized.length === 0) {
    return "Ainda sem anotacao. Vale registrar a sensacao principal desse consumo.";
  }

  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max).trimEnd()}...`;
}

function monthYear(value: string): string {
  const [year, month] = value.split("-");

  if (!year || !month) {
    return "sem data";
  }

  return `${month}/${year}`;
}

function normalizeCoverInput(raw: string, type: MediaType): string {
  const value = raw.trim();

  if (value.length === 0) {
    return fallbackCoverByType[type];
  }

  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `/${value}`;
}

export default function MediaTrackerApp() {
  const isClient = useIsClient();

  const [entries, setEntries] = useState<MediaEntry[]>(() => {
    if (typeof window === "undefined") {
      return sampleEntries;
    }

    const parsed = parseStoredEntries(window.localStorage.getItem(STORAGE_KEY));
    return parsed ?? sampleEntries;
  });

  const [filters, setFilters] = useState<MediaFilters>(defaultFilters);
  const [form, setForm] = useState<MediaFormInput>({
    ...defaultForm,
    consumedOn: todayIsoDate(),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEntries = useMemo(() => applyFilters(entries, filters), [entries, filters]);
  const featuredEntry = filteredEntries[0] ?? null;
  const secondaryEntries = filteredEntries.slice(1);
  const composerCover = normalizeCoverInput(form.coverImage, form.type);

  const stats = useMemo(() => {
    const total = entries.length;
    const completed = entries.filter((entry) => entry.status === "concluido").length;
    const inProgress = entries.filter((entry) => entry.status === "consumindo").length;
    const averageRating =
      total === 0 ? 0 : entries.reduce((sum, entry) => sum + entry.rating, 0) / total;

    return {
      total,
      completed,
      inProgress,
      averageRating,
    };
  }, [entries]);

  const topTags = useMemo(() => {
    const counter = new Map<string, number>();

    for (const entry of entries) {
      for (const tag of entry.tags) {
        counter.set(tag, (counter.get(tag) ?? 0) + 1);
      }
    }

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [entries]);

  const archive = useMemo(() => {
    const counter = new Map<string, number>();

    for (const entry of entries) {
      const key = entry.consumedOn.slice(0, 7);
      if (key.length !== 7) {
        continue;
      }

      counter.set(key, (counter.get(key) ?? 0) + 1);
    }

    return Array.from(counter.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8);
  }, [entries]);

  const isEditing = editingId !== null;

  function saveEntries(nextEntries: MediaEntry[]) {
    setEntries(nextEntries);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
    }
  }

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
    window.setTimeout(() => setNotice(null), 3200);
  }

  function updateFilter<K extends keyof MediaFilters>(key: K, value: MediaFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateForm<K extends keyof MediaFormInput>(key: K, value: MediaFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      ...defaultForm,
      consumedOn: todayIsoDate(),
      coverImage: fallbackCoverByType.filme,
    });
  }

  function openComposerForCreate() {
    resetForm();
    setComposerOpen(true);
  }

  function startEditing(entry: MediaEntry) {
    setEditingId(entry.id);
    setForm(toFormInput(entry));
    setComposerOpen(true);
  }

  function duplicateEntry(entry: MediaEntry) {
    const now = new Date().toISOString();

    const duplicated: MediaEntry = {
      ...entry,
      id: newId(),
      title: `${entry.title} (copia)`,
      createdAt: now,
      updatedAt: now,
    };

    saveEntries([duplicated, ...entries]);
    showNotice("ok", "Post duplicado.");
  }

  function removeEntry(id: string) {
    const target = entries.find((entry) => entry.id === id);
    if (!target) {
      return;
    }

    const confirmed = window.confirm(`Remover '${target.title}'?`);
    if (!confirmed) {
      return;
    }

    const next = entries.filter((entry) => entry.id !== id);
    saveEntries(next);

    if (editingId === id) {
      resetForm();
      setComposerOpen(false);
    }

    showNotice("ok", "Post removido.");
  }

  function clearAll() {
    if (entries.length === 0) {
      showNotice("warn", "Nao ha posts para limpar.");
      return;
    }

    const confirmed = window.confirm("Limpar todos os posts? Esta acao nao pode ser desfeita.");
    if (!confirmed) {
      return;
    }

    saveEntries([]);
    resetForm();
    setComposerOpen(false);
    showNotice("warn", "Todos os posts foram removidos.");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    if (title.length < 2) {
      showNotice("warn", "Titulo precisa ter pelo menos 2 caracteres.");
      return;
    }

    const now = new Date().toISOString();
    const tags = normalizeTags(form.tagsText);
    const shortNotes = form.notes.trim().slice(0, 380);
    const coverImage = normalizeCoverInput(form.coverImage, form.type);

    if (isEditing) {
      const next = entries.map((entry) => {
        if (entry.id !== editingId) {
          return entry;
        }

        return {
          ...entry,
          title,
          type: form.type,
          coverImage,
          status: form.status,
          rating: form.rating,
          consumedOn: form.consumedOn,
          notes: shortNotes,
          tags,
          updatedAt: now,
        };
      });

      saveEntries(next);
      showNotice("ok", "Post atualizado.");
      resetForm();
      setComposerOpen(false);
      return;
    }

    const newEntry: MediaEntry = {
      id: newId(),
      title,
      type: form.type,
      coverImage,
      status: form.status,
      rating: form.rating,
      consumedOn: form.consumedOn,
      notes: shortNotes,
      tags,
      createdAt: now,
      updatedAt: now,
    };

    saveEntries([newEntry, ...entries]);
    showNotice("ok", "Post criado.");
    resetForm();
    setComposerOpen(false);
  }

  function onExport() {
    const blob = new Blob([toExportJson(entries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wisenerd-backup-${todayIsoDate()}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
    showNotice("ok", "Backup exportado.");
  }

  function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      const parsed = parseStoredEntries(result);

      if (!parsed) {
        showNotice("warn", "Arquivo invalido para importacao.");
        return;
      }

      saveEntries(parsed);
      resetForm();
      setComposerOpen(false);
      showNotice("ok", `Importacao concluida com ${parsed.length} posts.`);
    };

    reader.onerror = () => {
      showNotice("warn", "Falha ao ler arquivo.");
    };

    reader.readAsText(file);
  }

  if (!isClient) {
    return (
      <div className={styles.page}>
        <section className={styles.loadingCard}>
          <p>Carregando o caderno...</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>wisenerd journal</p>
          <h1>Caderno de Midias</h1>
          <p className={styles.subtitle}>
            Um arquivo misterioso em formato de caderno antigo para registrar o que ela le,
            assiste e sente em textos curtos.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button className={styles.primaryButton} onClick={openComposerForCreate} type="button">
            Novo post
          </button>
          <button className={styles.secondaryButton} onClick={onExport} type="button">
            Exportar JSON
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            Importar JSON
          </button>
          <button className={styles.dangerButton} onClick={clearAll} type="button">
            Limpar tudo
          </button>
          <input
            accept="application/json"
            hidden
            onChange={onImport}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </header>

      {notice ? (
        <p className={notice.tone === "ok" ? styles.noticeOk : styles.noticeWarn}>{notice.text}</p>
      ) : null}

      <section className={styles.controls}>
        <label className={styles.controlField}>
          <span>Buscar no caderno</span>
          <input
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder="Titulo, tag ou trecho"
            type="search"
            value={filters.query}
          />
        </label>

        <label className={styles.controlField}>
          <span>Tipo</span>
          <select
            onChange={(event) => updateFilter("type", event.target.value as MediaFilters["type"])}
            value={filters.type}
          >
            <option value="all">Todos</option>
            {mediaTypes.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.controlField}>
          <span>Status</span>
          <select
            onChange={(event) =>
              updateFilter("status", event.target.value as MediaFilters["status"])
            }
            value={filters.status}
          >
            <option value="all">Todos</option>
            {mediaStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.controlField}>
          <span>Nota minima: {filters.minRating}</span>
          <input
            max={5}
            min={0}
            onChange={(event) => updateFilter("minRating", Number(event.target.value))}
            step={1}
            type="range"
            value={filters.minRating}
          />
        </label>

        <label className={styles.controlField}>
          <span>Ordenar por</span>
          <select
            onChange={(event) =>
              updateFilter("sortBy", event.target.value as MediaFilters["sortBy"])
            }
            value={filters.sortBy}
          >
            {mediaSorts.map((sortBy) => (
              <option key={sortBy} value={sortBy}>
                {sortLabel(sortBy)}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.controlField}>
          <span>Direcao</span>
          <select
            onChange={(event) =>
              updateFilter("sortDirection", event.target.value as MediaFilters["sortDirection"])
            }
            value={filters.sortDirection}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </label>

        <button
          className={styles.resetButton}
          onClick={() => setFilters(defaultFilters)}
          type="button"
        >
          Limpar filtros
        </button>
      </section>

      <section className={styles.blogLayout}>
        <main className={styles.feedColumn}>
          {featuredEntry ? (
            <article className={styles.featuredPost}>
              <div className={styles.featuredMedia}>
                <img alt={`Capa de ${featuredEntry.title}`} src={featuredEntry.coverImage} />
              </div>

              <div className={styles.postMetaTop}>
                <span>{typeLabel(featuredEntry.type)}</span>
                <span>{statusLabel(featuredEntry.status)}</span>
                <span>{stars(featuredEntry.rating)}</span>
              </div>

              <h2>{featuredEntry.title}</h2>

              <p className={styles.postDates}>
                Consumido em {prettyDate(featuredEntry.consumedOn)} | atualizado em{" "}
                {prettyDate(featuredEntry.updatedAt.slice(0, 10))}
              </p>

              <p className={styles.postBody}>{excerpt(featuredEntry.notes, 250)}</p>

              {featuredEntry.tags.length > 0 ? (
                <div className={styles.tagRow}>
                  {featuredEntry.tags.map((tag) => (
                    <span key={`${featuredEntry.id}-${tag}`}>#{tag}</span>
                  ))}
                </div>
              ) : null}

              <div className={styles.postActions}>
                <button onClick={() => startEditing(featuredEntry)} type="button">
                  Editar post
                </button>
                <button onClick={() => duplicateEntry(featuredEntry)} type="button">
                  Duplicar
                </button>
                <button
                  className={styles.textDanger}
                  onClick={() => removeEntry(featuredEntry.id)}
                  type="button"
                >
                  Remover
                </button>
              </div>
            </article>
          ) : (
            <article className={styles.emptyState}>
              <h2>Seu caderno ainda esta vazio</h2>
              <p>Crie o primeiro post para começar o arquivo de midias.</p>
              <button className={styles.primaryButton} onClick={openComposerForCreate} type="button">
                Criar primeiro post
              </button>
            </article>
          )}

          {secondaryEntries.length > 0 ? (
            <div className={styles.postGrid}>
              {secondaryEntries.map((entry) => (
                <article className={styles.postCard} key={entry.id}>
                  <div className={styles.postThumbWrap}>
                    <img alt={`Capa de ${entry.title}`} className={styles.postThumb} src={entry.coverImage} />
                  </div>

                  <div className={styles.postMetaTop}>
                    <span>{typeLabel(entry.type)}</span>
                    <span>{prettyDate(entry.consumedOn)}</span>
                    <span>{stars(entry.rating)}</span>
                  </div>

                  <h3>{entry.title}</h3>
                  <p className={styles.postExcerpt}>{excerpt(entry.notes, 140)}</p>

                  {entry.tags.length > 0 ? (
                    <div className={styles.tagRow}>
                      {entry.tags.map((tag) => (
                        <span key={`${entry.id}-${tag}`}>#{tag}</span>
                      ))}
                    </div>
                  ) : null}

                  <div className={styles.postActions}>
                    <button onClick={() => startEditing(entry)} type="button">
                      Editar
                    </button>
                    <button onClick={() => duplicateEntry(entry)} type="button">
                      Duplicar
                    </button>
                    <button
                      className={styles.textDanger}
                      onClick={() => removeEntry(entry.id)}
                      type="button"
                    >
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </main>

        <aside className={styles.sidebar}>
          <section className={styles.sideCard}>
            <h3>Resumo</h3>
            <ul>
              <li>Total de posts: {stats.total}</li>
              <li>Concluidos: {stats.completed}</li>
              <li>Consumindo: {stats.inProgress}</li>
              <li>Nota media: {stats.averageRating.toFixed(1)}</li>
              <li>Posts visiveis: {filteredEntries.length}</li>
            </ul>
          </section>

          <section className={styles.sideCard}>
            <h3>Tags frequentes</h3>
            {topTags.length > 0 ? (
              <div className={styles.tagCloud}>
                {topTags.map(([tag, count]) => (
                  <span key={tag}>#{tag} ({count})</span>
                ))}
              </div>
            ) : (
              <p className={styles.sideEmpty}>Sem tags ainda.</p>
            )}
          </section>

          <section className={styles.sideCard}>
            <h3>Arquivo</h3>
            {archive.length > 0 ? (
              <ul>
                {archive.map(([month, count]) => (
                  <li key={month}>
                    {monthYear(month)}: {count}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.sideEmpty}>Sem datas registradas.</p>
            )}
          </section>
        </aside>
      </section>

      {composerOpen ? (
        <section className={styles.composerPanel}>
          <div className={styles.composerHeader}>
            <h2>{isEditing ? "Editar post" : "Escrever novo post"}</h2>
            <button className={styles.secondaryButton} onClick={() => setComposerOpen(false)} type="button">
              Fechar
            </button>
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <label>
              <span>Titulo</span>
              <input
                maxLength={120}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="Ex: Past Lives"
                required
                type="text"
                value={form.title}
              />
            </label>

            <div className={styles.formRow}>
              <label>
                <span>Tipo</span>
                <select
                  onChange={(event) => updateForm("type", event.target.value as MediaFormInput["type"])}
                  value={form.type}
                >
                  {mediaTypes.map((type) => (
                    <option key={type} value={type}>
                      {typeLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  onChange={(event) =>
                    updateForm("status", event.target.value as MediaFormInput["status"])
                  }
                  value={form.status}
                >
                  {mediaStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.formRow}>
              <label>
                <span>Nota (0 a 5)</span>
                <input
                  max={5}
                  min={0}
                  onChange={(event) => updateForm("rating", Number(event.target.value))}
                  step={1}
                  type="number"
                  value={form.rating}
                />
              </label>

              <label>
                <span>Data de consumo</span>
                <input
                  onChange={(event) => updateForm("consumedOn", event.target.value)}
                  type="date"
                  value={form.consumedOn}
                />
              </label>
            </div>

            <label>
              <span>Imagem do post (caminho)</span>
              <input
                onChange={(event) => updateForm("coverImage", event.target.value)}
                placeholder="/images/Art_of_Jessica_Cioffi_Loputyn_66.webp"
                type="text"
                value={form.coverImage}
              />
            </label>

            <div className={styles.coverPresetRow}>
              {COVER_PRESETS.map((path, index) => (
                <button
                  className={styles.presetButton}
                  key={path}
                  onClick={() => updateForm("coverImage", path)}
                  type="button"
                >
                  imagem {index + 1}
                </button>
              ))}
            </div>

            <div className={styles.coverPreview}>
              <img alt="Preview da capa" src={composerCover} />
            </div>

            <label>
              <span>Tags (separadas por virgula)</span>
              <input
                maxLength={200}
                onChange={(event) => updateForm("tagsText", event.target.value)}
                placeholder="ex: romance, conforto"
                type="text"
                value={form.tagsText}
              />
            </label>

            <label>
              <span>Texto do post (curto, ate 380 caracteres)</span>
              <textarea
                maxLength={380}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Escreva em 2-4 linhas a impressao principal"
                rows={5}
                value={form.notes}
              />
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit">
                {isEditing ? "Salvar post" : "Publicar post"}
              </button>

              <button className={styles.secondaryButton} onClick={resetForm} type="button">
                {isEditing ? "Cancelar edicao" : "Limpar"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
