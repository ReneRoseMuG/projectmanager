# Log: E2E-Auth- und Kalender-Startblocker

**Datum:** 01.09.26  
**Uhrzeit:** 08:59:51  
**Schritt:** Fix — E2E-Auth- und Kalender-Startblocker  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der zunächst sichtbare E2E-Fehler lag nicht im DMS-/Attachment-Code, sondern in der Browser-Testisolierung: Ein manuell erzeugter Browser-Kontext im Auth-Test erbte den Worker-StorageState und war dadurch bereits angemeldet. Der Test setzt nun explizit einen leeren `storageState`, damit der Direktaufruf ohne Session tatsächlich die Login-Seite prüft. Zusätzlich wurde im Kalenderformular die bereits vorgesehene Owner-Auswahl für Projekte, Meilensteine und Aufgaben wieder sichtbar gemacht; `EventForm` erhielt die nötige Owner-State-Verwaltung und übergibt die ausgewählten Owner an die bestehende API. Zwei Kalender-E2E-Assertions wurden an den aktuellen FormModal-/CSS-Vertrag angepasst, ohne die fachliche Aussage abzuschwächen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/browser/web/auth.spec.ts` | geändert | Manuell erzeugter Browser-Kontext startet explizit ohne StorageState |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Owner-Checkboxen für Projekte, Meilensteine und Aufgaben ergänzt |
| `tests/browser/web/calendar.spec.ts` | geändert | E2E-Erwartungen an aktuellen Formular- und CSS-Vertrag angepasst |
| `logs/2026-09-01-08-59-51-fix-e2e-auth-und-kalender-startblocker.md` | neu | Fix und Verifikation dokumentiert |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Testleitplanken

Der Skill `test-entwurfsleitplanken` wurde angewendet. Betroffen war Browser/E2E mit echten per Worker isolierten API-/Web-Servern, eigener Testdatenbank und eigener Storage-Isolation. Ergänzend wurde der Web-Typecheck ausgeführt. Es wurden keine produktiven Daten, Uploads, Content-Verzeichnisse oder Backups verwendet.

## Probleme und Abweichungen

Der E2E-Blocker bestand aus mehreren übereinanderliegenden Ursachen: zuerst ein geerbter Login-Zustand im Auth-Test, danach eine fehlende Owner-Auswahl im Kalenderformular und zwei Testdrifts durch geänderte UI-Verträge. Die volle Browser-/E2E-Matrix wurde bewusst nicht erneut gestartet, um den Nutzerwunsch nach begrenztem Budget einzuhalten; verifiziert wurden die betroffenen Auth- und Kalender-Specs.

## Offene Punkte / Folgeaufgaben

Keine für den behobenen Auth-/Kalender-Startblocker. Ein späterer vollständiger E2E-Gesamtlauf kann noch weitere unabhängige Spec-Drifts sichtbar machen, wurde aber hier bewusst nicht ausgeführt.
