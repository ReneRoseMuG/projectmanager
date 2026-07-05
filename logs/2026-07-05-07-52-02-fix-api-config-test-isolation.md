# Log: API Config Test Isolation

**Datum:** 05.07.26  
**Uhrzeit:** 07:52:02  
**Schritt:** Fix - API Config Test Isolation  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der API-Config-Unit-Test wurde gegen lokale `.env`-Werte isoliert. Vor dem dynamischen Import von `apps/api/src/config.ts` setzt der Test nun `DOTENV_CONFIG_PATH` auf eine nicht vorhandene Test-Env-Datei, damit `dotenv/config` keine lokale `apps/api/.env` in den Test hineinlädt. `DOTENV_CONFIG_PATH` wird in die getrackten Env-Keys aufgenommen und nach jedem Test wieder sauber zurückgesetzt. Produktcode wurde nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/api/config.test.ts` | geändert | Dotenv-Ladepfad im Test isoliert |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Testleitplanken: Unit-Test ohne DB und ohne Dateisystemzugriff; Isolation über Prozess-Env und Vitest-Modulcache. Der Test beweist weiterhin konkret: fehlender oder leerer API-Key deaktiviert API-Key-Auth, gesetzter API-Key wird getrimmt gelesen, Notification-/SMTP-/VAPID-Config bleibt stabil.

## Offene Punkte / Folgeaufgaben

Der vollständige API-Testlauf ist nach den bisherigen Test-Fixes grün. Offen bleiben Web-spezifische Gruppen aus dem Audit, insbesondere ParentContextField-Referenzanzeige, Details-Tab-Flex-Fill und E2E-Selektoren.
