# Log: Wiki Detail Kopfbereich

**Datum:** 28.05.26  
**Uhrzeit:** 16:39:13  
**Schritt:** Fix — Wiki Detail Kopfbereich  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Kopfbereich der Wiki-Seiten-Maske wurde auf den steel-farbenen Detail-Hero-Gradient umgestellt, der auch in den gültigen Detail-Hero-Bereichen verwendet wird. Die Buttons „Vorschau“ und „Versionen“ wurden aus dem Kopfbereich entfernt; die dazugehörigen lokalen Zustände und bedingten Inhaltsbereiche wurden ebenfalls entfernt. Bestehende Wiki-Seiten zeigen nun im Kopfbereich den vorhandenen `CopyReferenceButton`, sodass die Seiten-ID in die Zwischenablage kopiert werden kann. Neue Wiki-Seiten zeigen diese Aktion nicht, weil vor dem Speichern noch keine ID existiert. Die Testentwurfsleitplanken wurden für einen Unit-Test angewendet: gerendert wird die echte `WikiPageForm` mit echten Props, der Rich-Text-Editor bleibt als bestehender direkter Unit-Mock isoliert, und die Clipboard-API wird kontrolliert gedoppelt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Header-Farbe angepasst, Vorschau-/Versionsaktionen entfernt, ID-Kopieraktion ergänzt |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | Unit-Test für ID-Kopieren und entfernte Kopfbereich-Aktionen ergänzt |
| `logs/2026-05-28-16-39-13-fix-wiki-detail-kopfbereich.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
