# Log: Legacy-Kategorievertrag

**Datum:** 19.07.26  
**Uhrzeit:** 20:41:01  
**Schritt:** 13 — Legacy-Kategorieparameter sicher ablehnen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die DMS-Listen- und Uploadroute erkennt den früheren Queryparameter `category` jetzt ausdrücklich und lehnt ihn mit `400 BAD_REQUEST` und einem verständlichen MS-80-Hinweis ab. Die Prüfung erfolgt beim Upload vor dem Einlesen und Speichern der Datei, sodass weder Dateisystem noch Datenbank verändert werden. Gültige Importe ohne Sammlung oder mit genau einer Sammlung und DMS-Tags bleiben unverändert. Der Integrationstest prüft GET und POST, das einheitliche Fehlerformat sowie unveränderte Datei- und Dokumentzahlen. Die Testentwurfsleitplanken wurden auf API-Integrationsebene mit echter Fastify-App, temporärer MySQL-Datenbank, realem Multipart-Upload und temporärem Uploadverzeichnis angewendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/dms.ts` | geändert | Legacy-Kategorieparameter bei Liste und Upload explizit abgelehnt |
| `tests/integration/api/dms.test.ts` | geändert | Fehlerformat und ausbleibende DB-/Dateisystemänderung abgesichert |

## Probleme und Abweichungen

Der erste gezielte Testlauf konnte `dms.test.ts` wegen einer fehlerhaften Klammer in der neu ergänzten Abschlussassertion nicht transformieren. Die ausschließlich syntaktische Abweichung wurde korrigiert; der unveränderte Gesamtnachweis lief anschließend mit 52/52 Fällen grün. API-Typecheck und die 18 DMS-Integrationsfälle sind grün.

## Offene Punkte / Folgeaufgaben

Keine.
