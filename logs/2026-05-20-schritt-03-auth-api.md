# Log: Auth-API

**Datum:** 20.05.26  
**Schritt:** 3 — Auth-, Permission- und Admin-API  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die API registriert jetzt Cookie- und Session-Plugins, führt beim App-Start den Auth-Seed aus und schützt Domain-Routen über einen globalen Guard. Auth-Endpunkte für Login, Logout, Me und First-Login-Passwortvergabe wurden ergänzt. Zusätzlich gibt es Admin-Endpunkte für Benutzer, Rollen und den Permission-Katalog. Die Services kapseln Passwort-Hashing, Last-Admin-Schutz, Systemrollen-Schutz, Permission-Prüfung und versionierte Updates.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/app.ts` | geändert | Auth-Plugins, Seed, Guards und Admin-Routen registriert |
| `apps/api/src/plugins/auth.ts` | neu | Session-Registrierung, Auth-Guard und Permission-Guard |
| `apps/api/src/routes/auth.ts` | neu | Login, Logout, Me und Passwort-Setup |
| `apps/api/src/routes/admin-users.ts` | neu | Admin-Benutzerverwaltung |
| `apps/api/src/routes/admin-roles.ts` | neu | Admin-Rollen- und Permission-Verwaltung |
| `apps/api/src/repositories/user.repository.ts` | neu | Persistenzzugriff für Benutzer |
| `apps/api/src/repositories/role.repository.ts` | neu | Persistenzzugriff für Rollen und Rechte |
| `apps/api/src/services/users.service.ts` | neu | Benutzerverwaltung mit Passwort-Hashing und Admin-Schutz |
| `apps/api/src/services/roles.service.ts` | neu | Rollen-/Permission-Logik |
| `apps/api/src/utils/errors.ts` | geändert | 401/403-Fehlercodes ergänzt |
| `apps/api/tests/helpers/app.ts` | geändert | Test-App kann Auth-Modus gezielt aktivieren |

## Probleme und Abweichungen

Die bestehende Integrationstest-Suite wird nicht pauschal umgeschrieben, sondern die Test-App erhält einen expliziten Auth-Modus. So bleiben bestehende Fachtests stabil, während Auth-/Guard-Verhalten in eigenen Tests mit aktivierter Auth-Schicht geprüft wird.

## Offene Punkte / Folgeaufgaben

Frontend-Gating, Login-/Setup-Seiten, Admin-UI sowie gezielte Auth-, Rollen- und E2E-Tests fehlen noch.
