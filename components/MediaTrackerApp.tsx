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
} from "@/types/media";
import styles from "@/components/MediaTrackerApp.module.css";

type NoticeTone = "ok" | "warn";

interface NoticeState {
  tone: NoticeTone;
  text: string;
}

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
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredEntries = useMemo(() => applyFilters(entries, filters), [entries, filters]);

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
      .slice(0, 4);
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
    setForm({ ...defaultForm, consumedOn: todayIsoDate() });
  }

  function startEditing(entry: MediaEntry) {
    setEditingId(entry.id);
    setForm(toFormInput(entry));
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
    showNotice("ok", "Registro duplicado.");
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
    }

    showNotice("ok", "Registro removido.");
  }

  function clearAll() {
    if (entries.length === 0) {
      showNotice("warn", "Nao ha registros para limpar.");
      return;
    }

    const confirmed = window.confirm("Limpar todos os registros? Esta acao nao pode ser desfeita.");
    if (!confirmed) {
      return;
    }

    saveEntries([]);
    resetForm();
    showNotice("warn", "Todos os registros foram removidos.");
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

    if (isEditing) {
      const next = entries.map((entry) => {
        if (entry.id !== editingId) {
          return entry;
        }

        return {
          ...entry,
          title,
          type: form.type,
          status: form.status,
          rating: form.rating,
          consumedOn: form.consumedOn,
          notes: form.notes.trim(),
          tags,
          updatedAt: now,
        };
      });

      saveEntries(next);
      showNotice("ok", "Registro atualizado.");
      resetForm();
      return;
    }

    const newEntry: MediaEntry = {
      id: newId(),
      title,
      type: form.type,
      status: form.status,
      rating: form.rating,
      consumedOn: form.consumedOn,
      notes: form.notes.trim(),
      tags,
      createdAt: now,
      updatedAt: now,
    };

    saveEntries([newEntry, ...entries]);
    showNotice("ok", "Registro criado.");
    resetForm();
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
      showNotice("ok", `Importacao concluida com ${parsed.length} registros.`);
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
          <p>Carregando seus registros...</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Wisenerd Tracker</p>
          <h1>Diario de Midias</h1>
          <p className={styles.subtitle}>
            Uma plataforma simples para registrar o que ela assiste e le com conforto,
            clareza e controle total dos dados.
          </p>
        </div>

        <div className={styles.headerActions}>
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

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p>Total</p>
          <strong>{stats.total}</strong>
        </article>
        <article className={styles.statCard}>
          <p>Concluidos</p>
          <strong>{stats.completed}</strong>
        </article>
        <article className={styles.statCard}>
          <p>Consumindo</p>
          <strong>{stats.inProgress}</strong>
        </article>
        <article className={styles.statCard}>
          <p>Nota media</p>
          <strong>{stats.averageRating.toFixed(1)}</strong>
        </article>
      </section>

      <section className={styles.controls}>
        <label className={styles.controlField}>
          <span>Buscar</span>
          <input
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder="Titulo, nota ou tag"
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

      <section className={styles.contentGrid}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <h2>Registros</h2>
            <p>{filteredEntries.length} visiveis</p>
          </div>

          {topTags.length > 0 ? (
            <div className={styles.tagCloud}>
              {topTags.map(([tag, count]) => (
                <span key={tag}>{tag} ({count})</span>
              ))}
            </div>
          ) : null}

          {filteredEntries.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhum registro encontrado para os filtros atuais.</p>
            </div>
          ) : (
            <ul className={styles.entryList}>
              {filteredEntries.map((entry) => (
                <li className={styles.entryCard} key={entry.id}>
                  <div className={styles.entryTop}>
                    <span className={styles.badge}>{typeLabel(entry.type)}</span>
                    <span className={styles.rating}>{stars(entry.rating)}</span>
                  </div>

                  <h3>{entry.title}</h3>

                  <p className={styles.entryMeta}>
                    {statusLabel(entry.status)} | {prettyDate(entry.consumedOn)}
                  </p>

                  <p className={styles.entryNotes}>
                    {entry.notes.length > 0 ? entry.notes : "Sem anotacoes por enquanto."}
                  </p>

                  {entry.tags.length > 0 ? (
                    <div className={styles.tagRow}>
                      {entry.tags.map((tag) => (
                        <span key={`${entry.id}-${tag}`}>#{tag}</span>
                      ))}
                    </div>
                  ) : null}

                  <div className={styles.entryActions}>
                    <button onClick={() => startEditing(entry)} type="button">
                      Editar
                    </button>
                    <button onClick={() => duplicateEntry(entry)} type="button">
                      Duplicar
                    </button>
                    <button className={styles.textDanger} onClick={() => removeEntry(entry.id)} type="button">
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <h2>{isEditing ? "Editar registro" : "Novo registro"}</h2>
            {isEditing ? <p>id: {editingId}</p> : <p>preencha os campos</p>}
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
              <span>Anotacoes</span>
              <textarea
                maxLength={1200}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Escreva sua impressao principal"
                rows={8}
                value={form.notes}
              />
            </label>

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit">
                {isEditing ? "Salvar alteracoes" : "Criar registro"}
              </button>

              <button className={styles.secondaryButton} onClick={resetForm} type="button">
                {isEditing ? "Cancelar edicao" : "Limpar formulario"}
              </button>
            </div>
          </form>
        </aside>
      </section>
    </div>
  );
}
