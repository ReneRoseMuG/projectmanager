import { FolderOpen, Monitor } from "lucide-react";
import { useState } from "react";
import { Input } from "../../components/ui/Input";
import { PageHero } from "../../components/ui/PageHero";
import { Section } from "../../components/ui/Section";

const STORAGE_KEY = "ui.kanban-sidebar-width";
const WIKI_EXPORT_PATH_KEY = "ui.wiki-export-path";
const WIKI_EXPORT_PATH_DEFAULT = "~/Dokumente/Projekt Manager/Wiki";
const DEFAULT_WIDTH = 270;
const MIN_WIDTH = 150;
const MAX_WIDTH = 600;

function readWidth(): number {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WIDTH;
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH
      ? parsed
      : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function writeWidth(value: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable
  }
}

function readWikiExportPath(): string {
  try {
    return window.localStorage.getItem(WIKI_EXPORT_PATH_KEY) ?? WIKI_EXPORT_PATH_DEFAULT;
  } catch {
    return WIKI_EXPORT_PATH_DEFAULT;
  }
}

function writeWikiExportPath(value: string): void {
  try {
    window.localStorage.setItem(WIKI_EXPORT_PATH_KEY, value);
  } catch {
    // localStorage unavailable
  }
}

export function UISettingsPage() {
  const [width, setWidth] = useState(() => readWidth());
  const [saved, setSaved] = useState(false);
  const [wikiExportPath, setWikiExportPath] = useState(() => readWikiExportPath());
  const [wikiExportPathSaved, setWikiExportPathSaved] = useState(false);

  function handleChange(raw: string) {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      setWidth(parsed);
      setSaved(false);
    }
  }

  function handleSave() {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
    setWidth(clamped);
    writeWidth(clamped);
    setSaved(true);
  }

  function handleReset() {
    setWidth(DEFAULT_WIDTH);
    writeWidth(DEFAULT_WIDTH);
    setSaved(true);
  }

  function handleWikiExportPathSave() {
    writeWikiExportPath(wikiExportPath.trim() || WIKI_EXPORT_PATH_DEFAULT);
    setWikiExportPath(wikiExportPath.trim() || WIKI_EXPORT_PATH_DEFAULT);
    setWikiExportPathSaved(true);
  }

  function handleWikiExportPathReset() {
    setWikiExportPath(WIKI_EXPORT_PATH_DEFAULT);
    writeWikiExportPath(WIKI_EXPORT_PATH_DEFAULT);
    setWikiExportPathSaved(true);
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="User Interface"
        subtitle="Darstellungseinstellungen der Oberfläche"
      />

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-5 overflow-auto px-4 pt-5 md:px-5">
        <Section title="Kanban Board">
          <div className="grid gap-4">
            <div className="grid gap-4 rounded-md border border-line bg-shell/40 p-4 md:grid-cols-[1fr_auto]">
              <div className="grid gap-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Monitor size={15} className="text-steel-500" />
                  Kanban Sidebar Breite
                </span>
                <span className="text-xs text-steel-500">
                  Breite der Geschlossen-Sidebar im Kanban Board View (px). Standard: {DEFAULT_WIDTH} px, Bereich: {MIN_WIDTH}–{MAX_WIDTH} px.
                </span>
              </div>
              <div className="flex items-end gap-2">
                <div className="w-32">
                  <Input
                    type="number"
                    min={MIN_WIDTH}
                    max={MAX_WIDTH}
                    step={10}
                    value={String(width)}
                    onChange={(e) => handleChange(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="flex h-11 items-center gap-2 rounded-md border border-fern bg-fern px-4 text-sm font-semibold text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-fern/40"
                  onClick={handleSave}
                >
                  Speichern
                </button>
                <button
                  type="button"
                  className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-steel-600 transition hover:bg-shell focus:outline-none focus:ring-2 focus:ring-steel-400/20"
                  onClick={handleReset}
                >
                  Zurücksetzen
                </button>
              </div>
            </div>
            {saved ? (
              <p className="text-xs font-semibold text-fern">
                Gespeichert. Wirkt beim nächsten Öffnen einer Board-Ansicht.
              </p>
            ) : null}
          </div>
        </Section>

        <Section title="Wiki">
          <div className="grid gap-4">
            <div className="grid gap-4 rounded-md border border-line bg-shell/40 p-4 md:grid-cols-[1fr_auto]">
              <div className="grid gap-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <FolderOpen size={15} className="text-steel-500" />
                  Wiki Export-Pfad
                </span>
                <span className="text-xs text-steel-500">
                  Zielverzeichnis für den Wiki-HTML-Export. Tilde (~) wird als Home-Verzeichnis aufgelöst.
                </span>
              </div>
              <div className="flex items-end gap-2">
                <div className="w-72">
                  <Input
                    type="text"
                    value={wikiExportPath}
                    onChange={(e) => { setWikiExportPath(e.target.value); setWikiExportPathSaved(false); }}
                  />
                </div>
                <button
                  type="button"
                  className="flex h-11 items-center gap-2 rounded-md border border-fern bg-fern px-4 text-sm font-semibold text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-fern/40"
                  onClick={handleWikiExportPathSave}
                >
                  Speichern
                </button>
                <button
                  type="button"
                  className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-steel-600 transition hover:bg-shell focus:outline-none focus:ring-2 focus:ring-steel-400/20"
                  onClick={handleWikiExportPathReset}
                >
                  Zurücksetzen
                </button>
              </div>
            </div>
            {wikiExportPathSaved ? (
              <p className="text-xs font-semibold text-fern">
                Gespeichert.
              </p>
            ) : null}
          </div>
        </Section>
      </div>
    </div>
  );
}
