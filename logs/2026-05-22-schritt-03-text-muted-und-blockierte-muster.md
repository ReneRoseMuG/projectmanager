# Log: text-muted und blockierte Muster

**Datum:** 22.05.26  
**Schritt:** 3 — text-muted nach Freigabe umsetzen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Nach Freigabe wurden alle 15 `text-muted`-Fundstellen in `apps/web/src` durch `text-steel-500` ersetzt. Dadurch konnte `PageHeader` selbst bereinigt und wieder für blockierte Übersichtsseiten genutzt werden. Die Admin-Übersichten für Benutzer und Rollen sowie die Backup- und Präferenzseiten verwenden nun `PageHeader`. Die Admin-Tabellenköpfe wurden auf `bg-steel-50 text-xs font-semibold uppercase text-steel-500` vereinheitlicht, Tabellenzeilen erhielten ein einheitliches Border-/Textmuster und leere Admin-Tabellen verwenden `EmptyState variant="tinted"`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/PageHeader.tsx` | geändert | Subtitle-Farbe von `text-muted` auf `text-steel-500` umgestellt |
| `apps/web/src/components/ui/ProjectMilestoneFilterBar.tsx` | geändert | Filterlabels auf `text-steel-500` umgestellt |
| `apps/web/src/pages/SetupPasswordPage.tsx` | geändert | Untertitel auf `text-steel-500` umgestellt |
| `apps/web/src/pages/admin/UsersPage.tsx` | geändert | PageHeader und Admin-Tabellenmuster eingesetzt |
| `apps/web/src/pages/admin/RolesPage.tsx` | geändert | PageHeader und Admin-Tabellenmuster eingesetzt |
| `apps/web/src/pages/admin/UserDetailPage.tsx` | geändert | Admin-Hinweis- und Ladefarbe bereinigt |
| `apps/web/src/pages/admin/RoleDetailPage.tsx` | geändert | Admin-Hinweis-, Lade- und Tabellenkopffarbe bereinigt |
| `apps/web/src/pages/SettingsBackupPage.tsx` | geändert | PageHeader eingesetzt und Tabellenmuster ergänzt |
| `apps/web/src/pages/SettingsPreferencesPage.tsx` | geändert | PageHeader eingesetzt |
| `logs/2026-05-22-schritt-03-text-muted-und-blockierte-muster.md` | neu | Schritt-Log zur finalen `text-muted`-Umsetzung |
| `logs/README.md` | geändert | Log-Übersicht um den neuen Schritt ergänzt |

## Probleme und Abweichungen

Keine fachlichen Abweichungen. `git diff --check` meldet nur bestehende CRLF-Hinweise der Windows-Arbeitskopie, aber keine Whitespace-Fehler.

## Offene Punkte / Folgeaufgaben

Der offizielle Testlauf nach Abschnitt 12 wurde noch nicht gestartet.
