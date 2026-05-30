# Log: Auth-Form-Labels

**Datum:** 22.05.26  
**Schritt:** Fix — Auth-Form-Labels  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Label/Input-Verknüpfung der Auth-Formulare wurde repariert. `FormField` unterstützt jetzt eine explizite `htmlFor`-Weitergabe und kann bei einem einzelnen Control automatisch dessen `id` verwenden oder eine stabile React-ID setzen. `LoginPage` und `SetupPasswordPage` setzen für ihre Eingabefelder konkrete IDs, sodass `getByLabelText` und Screenreader die Controls korrekt finden. Auth-Logik, Navigation, API-Zugriffe und Rollen-/Permission-Verhalten wurden nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/FormField.tsx` | geändert | Label-Control-Verknüpfung über `htmlFor`, vorhandene Child-ID oder generierte ID ergänzt |
| `apps/web/src/pages/LoginPage.tsx` | geändert | E-Mail- und Passwort-Input mit stabilen IDs an Labels gebunden |
| `apps/web/src/pages/SetupPasswordPage.tsx` | geändert | Passwort- und Bestätigungsinput mit stabilen IDs an Labels gebunden |
| `logs/2026-05-22-fix-auth-form-labels.md` | neu | Schritt-Log für den Auth-Form-Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. `git diff --check` meldet nur bestehende CRLF-Warnungen.

## Offene Punkte / Folgeaufgaben

Keine.
