# Log: App-Name Projekt Manager

**Datum:** 18.05.26  
**Schritt:** Fix — App-Name Projekt Manager  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der sichtbare App-Name wurde auf `Projekt Manager` geändert. Betroffen sind der Browser-Titel, das Sidebar-Branding, die Branding-Initialen im Layout, das lokale Startskript, Dokumentationsüberschriften und lesbare Testbeschreibungen. Außerdem wurde der Mailto-Betreff im ErrorBoundary-Fallback auf den neuen Namen angepasst. Technische Slugs wie npm-Package-Namen, Importpfade, Datenbankdateinamen und die bestehende Test-Environment-Variable wurden bewusst unverändert gelassen, damit Build-, Runtime- und Datenpfade stabil bleiben. Eine erneute Suche nach dem bisherigen App-Namen mit dieser Schreibweise ergab keine Treffer mehr.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Repository-Anweisung und Log-Beispielüberschrift auf Projekt Manager umbenannt |
| `apps/web/index.html` | geändert | Browser-Titel auf Projekt Manager umbenannt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Sidebar-Branding auf Projekt Manager umbenannt |
| `apps/web/src/components/layout/TopBar.tsx` | geändert | Branding-Initialen auf Projekt Manager angepasst |
| `apps/web/src/components/error/ErrorBoundary.tsx` | geändert | Mailto-Betreff für Fehlermeldungen umbenannt |
| `Projekt Manager starten.bat` | geändert | Fenstertitel, Konsolentexte und Prozessfenster auf Projekt Manager umbenannt |
| `docs/README.md` | geändert | Dokumentationsüberschrift umbenannt |
| `docs/design-system.md` | geändert | Design-System-Überschrift umbenannt |
| `apps/api/src/app.integration.test.ts` | geändert | Lesbare API-Testbeschreibung umbenannt |
| `apps/api/src/runtime-safety.test.ts` | geändert | Lokalen Variablennamen ohne Vertragsänderung umbenannt |
| `logs/README.md` | geändert | Log-Übersicht auf Projekt Manager umbenannt und neuen Eintrag ergänzt |
| `logs/2026-05-18-fix-app-name-projekt-manager.md` | neu | Schritt-Log für die Umbenennung |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
