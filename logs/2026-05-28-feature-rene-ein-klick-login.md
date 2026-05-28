# Log: Rene Ein-Klick-Login

**Datum:** 28.05.26  
**Schritt:** Feature — Rene Ein-Klick-Login  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der bestehende Login-Screen wurde auf einen einzelnen Button „Als Rene anmelden“ reduziert. Der Button nutzt eine neue Web-API-Funktion und eine neue `useAuth`-Mutation, damit der Auth-Cache nach erfolgreichem Login wie beim bisherigen Login gesetzt wird. Im Backend wurde eine Auth-Route ergänzt, die den konfigurierten Admin-User ohne Passwort in die bestehende Session schreibt. Der lokale Datenbestand wurde readonly geprüft; der vorhandene User ist `Rene Rose` mit `schroedingerskater@web.de`, daher war keine Datenmigration nötig. Der bisherige Passwortlogin bleibt im Backend unverändert erhalten.

Für den Testentwurf wurden die Testleitplanken angewendet. Testebenen: API-Integration mit echter Test-App und isolierter Test-DB sowie Web-Unit-Test mit Hook-Mock als direkter UI-Abhängigkeit. Belegt werden sollte der echte Session-Aufbau per Ein-Klick-Route, der deaktivierte Admin als Negativfall sowie der UI-Klick auf den neuen Button.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/auth.service.ts` | geändert | Servicefunktion für passwortlosen Login des konfigurierten Admins ergänzt |
| `apps/api/src/routes/auth.ts` | geändert | `POST /api/auth/login-as-rene` ergänzt und Session-Erzeugung wiederverwendet |
| `apps/web/src/api/auth.ts` | geändert | Web-API-Funktion für den Ein-Klick-Login ergänzt |
| `apps/web/src/hooks/useAuth.ts` | geändert | Mutation, Pending-Status und Error-Zugriff für den Ein-Klick-Login ergänzt |
| `apps/web/src/pages/LoginPage.tsx` | geändert | Formular durch einen einzelnen Button „Als Rene anmelden“ ersetzt |
| `tests/integration/api/auth.test.ts` | geändert | API-Integrationstests für Ein-Klick-Login ergänzt |
| `tests/unit/web/pages/LoginPage.test.tsx` | geändert | LoginPage-Unit-Test auf neuen Button und Fehlerfall angepasst |
| `logs/2026-05-28-feature-rene-ein-klick-login.md` | neu | Schritt-Log für diese Änderung |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der gezielte API-Integrationstest `npm run test -w apps/api -- tests/integration/api/auth.test.ts` ist rot. Es schlagen auch bestehende Auth-Fälle fehl, die den konfigurierten Admin über `config.adminEmail` erwarten; sie erhalten 401, während die Fixture-Daten weiter mit `admin@local` arbeiten. Das betrifft den API-Key-Fall, den First-Login-Fall, den Admin-Bypass-Fall und die beiden neuen Ein-Klick-Login-Fälle. Der Web-Unit-Test `npm run test -w apps/web -- tests/unit/web/pages/LoginPage.test.tsx` ist grün mit 3 bestandenen Tests.

Gemäß Testregel wurden nach dem roten API-Test keine eigenständigen Test-Fixes vorgenommen. Der Blocker betrifft die API-Testkonfiguration beziehungsweise Seed-Erwartung, nicht den lokalen Produktivdatensatz: dort sind `ADMIN_EMAIL=schroedingerskater@web.de`, `ADMIN_FIRST_NAME=Rene`, `ADMIN_LAST_NAME=Rose` gesetzt und der vorhandene User passt dazu.

## Offene Punkte / Folgeaufgaben

- API-Testkonfiguration für Auth so ausrichten, dass `config.adminEmail` und die Fixture-Admin-Adresse konsistent sind.
- Danach den gezielten Auth-Integrationstest erneut ausführen.
