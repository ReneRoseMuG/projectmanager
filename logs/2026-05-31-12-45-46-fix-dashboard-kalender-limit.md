# Log: Dashboard Kalender Limit

**Datum:** 31.05.26  
**Uhrzeit:** 12:45:46  
**Schritt:** Fix — Dashboard Kalender Limit  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Dashboard-Editor wird die Limit-Option für Kalender-Widgets nicht mehr angezeigt. Das Kalender-Widget behält nur die Layoutbreite als editierbare Einstellung, weil der Kalender alle Termine des sichtbaren Zeitraums anzeigen soll und kein Widget-Limit verwendet. Beim Hinzufügen eines Kalender-Widgets werden keine Datenparameter mehr gesetzt. Beim Speichern werden vorhandene `params` am Kalender-Widget entfernt, damit ältere oder zuvor gespeicherte Limit-Werte nicht weitergetragen werden.

Testleitplanken: Der Testentwurfs-Skill wurde angewendet. Testebene ist Unit/jsdom mit echter React-Komponente und Testing Library; es werden keine DB- oder Dateisystemdaten berührt. Abgedeckt ist das beobachtbare UI-Verhalten im Builder sowie der Save-Payload ohne Kalender-`params`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardBuilder.tsx` | geändert | Kalender-Widget blendet Datenparameter aus und speichert ohne `params` |
| `tests/unit/web/components/dashboard/DashboardBuilder.test.tsx` | geändert | Unit-Test prüft fehlendes Kalender-Limit und Save-Payload ohne Kalender-`params` |
| `logs/2026-05-31-12-45-46-fix-dashboard-kalender-limit.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Der erste gezielte Testlauf schlug wegen einer falschen Testannahme zum Button-Label bei neuen Dashboards fehl. Der Test wurde auf das tatsächliche Label „Als eigenes Dashboard speichern“ korrigiert. Danach war der gezielte Testlauf grün.

## Offene Punkte / Folgeaufgaben

Keine.
