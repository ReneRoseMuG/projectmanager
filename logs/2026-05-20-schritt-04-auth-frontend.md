# Log: Auth-Frontend

**Datum:** 20.05.26  
**Schritt:** 4 — Frontend Auth-Gating und Admin-UI  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Web-Client sendet Session-Cookies mit API-Requests. Das Routing ist hinter einen Auth-Guard gelegt: nicht eingeloggte Nutzer landen auf der Login-Seite, der First-Login-Flow landet auf der Passwort-Setup-Seite, und Admin-Routen werden im Frontend gegen Benutzer-/Rollen-Adminrechte geprüft. Login, Passwortvergabe, Benutzerliste, Benutzerformular, Rollenliste und Rollenformular wurden ergänzt. Die Sidebar zeigt Admin-Navigation und Abmeldung abhängig vom aktuellen Benutzer.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/client.ts` | geändert | API-Client sendet Cookies mit |
| `apps/web/src/api/auth.ts` | neu | Auth-API-Funktionen |
| `apps/web/src/api/admin-users.ts` | neu | Admin-User-API-Funktionen |
| `apps/web/src/api/admin-roles.ts` | neu | Admin-Rollen-API-Funktionen |
| `apps/web/src/hooks/useAuth.ts` | neu | Auth-Query und Mutations |
| `apps/web/src/hooks/useAdminUsers.ts` | neu | Benutzerverwaltungs-Hooks |
| `apps/web/src/hooks/useAdminRoles.ts` | neu | Rollenverwaltungs-Hooks |
| `apps/web/src/App.tsx` | geändert | Auth-Gating und Admin-Routen ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Admin-Navigation und Logout ergänzt |
| `apps/web/src/pages/LoginPage.tsx` | neu | Login-Screen |
| `apps/web/src/pages/SetupPasswordPage.tsx` | neu | First-Login-Passwortvergabe |
| `apps/web/src/pages/admin/*` | neu | Benutzer- und Rollenverwaltung |

## Probleme und Abweichungen

Der Web-Build meldet eine Vite-Warnung zu großen Chunks. Das ist kein neuer Funktionsfehler und wurde nicht im Rahmen dieser Auth-Aufgabe durch Code-Splitting verändert.

## Offene Punkte / Folgeaufgaben

Gezielte API-, Frontend- und E2E-Tests für Auth, Rollen und Admin-Randfälle müssen ergänzt und ausgeführt werden.
