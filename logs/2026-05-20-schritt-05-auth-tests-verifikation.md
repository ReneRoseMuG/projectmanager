# Log: Auth-Tests und Verifikation

**Datum:** 20.05.26  
**Schritt:** 5 — Tests und Verifikation  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Auth- und Rollenänderung wurde über API-, Web- und Browser-Tests abgesichert. API-Test-Fixtures und Dump-Roundtrip-Fixtures wurden auf das neue Rollen- und Benutzer-Schema angepasst. Die E2E-Hilfen melden sich jetzt vor geschützten Routen als Admin an und die Auth-E2E-Suite deckt Login, Logout-Rückkehr, inaktive Benutzer und fehlenden Admin-Zugriff für Nicht-Admins ab. Zusätzlich wurden Encoding-Artefakte in E2E-Erwartungen bereinigt, damit die Tests wieder echte UTF-8-Umlaute prüfen. Nach der Bereinigung liefen alle Pflicht-Testebenen grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/app.integration.test.ts` | geändert | Integrationstest nutzt authentifizierten Supertest-Agent |
| `apps/api/tests/integration/dumps-drive.test.ts` | geändert | Dump-Fixture enthält rollenpflichtige User-Daten |
| `apps/web/e2e/domain-test-utils.ts` | geändert | Authentifizierte API- und Browser-Helfer ergänzt |
| `apps/web/e2e/auth.spec.ts` | neu | Authentifizierungs- und Admin-Rechte-Flows |
| `apps/web/e2e/*.spec.ts` | geändert | Geschützte Browser-Routen über Auth-Helfer geöffnet |
| `apps/web/src/pages/__tests__/LoginPage.test.tsx` | neu | Login-Seite und Fehlerpfad abgesichert |
| `apps/web/src/pages/__tests__/SetupPasswordPage.test.tsx` | neu | Passwort-Setup und Bestätigungsfehler abgesichert |
| `apps/web/src/components/layout/__tests__/Sidebar.test.tsx` | geändert | Admin-Navigation nur bei Berechtigung abgesichert |

## Probleme und Abweichungen

Der erste vollständige Testlauf zeigte erwartete Anpassungslücken in alten API- und E2E-Fixtures: unautorisierte Supertest-Requests, `users` ohne `role_id` im Dump-Seed und falsch kodierte E2E-Erwartungen. Diese Punkte wurden als Testanpassung des geplanten Auth-Umbaus behoben. Die Lint-Skripte laufen noch nicht vollständig grün wegen bestehender Befunde außerhalb des Auth-Features: `apps/api/src/services/ai.service.ts:789` sowie mehrere ältere Web-Testdateien mit `consistent-type-imports`/unbenutzter Testvariable.

## Offene Punkte / Folgeaufgaben

Die bestehenden Lint-Befunde außerhalb dieses Features sollten in einem eigenen Folgeauftrag bereinigt werden.
