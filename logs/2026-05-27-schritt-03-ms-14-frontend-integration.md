# Log: MS-14 Frontend Integration

**Datum:** 27.05.26  
**Schritt:** 3 — Frontend-Eventformular, Push-Hook, Service Worker und Einstellungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Terminformular speichert nun den Erinnerungsvorlauf mit den vorgesehenen Auswahlwerten 15 Minuten, 1 Stunde und 1 Tag. Die Einstellungen zeigen für berechtigte Nutzer einen Abschnitt für Desktop-Benachrichtigungen mit Aktivieren-/Deaktivieren-Aktion, Browser-Support-Prüfung und serverseitigem Aktivierungsstatus. Die Push-API wird über `apps/web/src/api/` und TanStack Query Hooks angebunden, inklusive zentraler Query Keys und Invalidierung. Ein Service Worker verarbeitet Push-Payloads und öffnet beim Klick den Kalender mit `eventId`, woraufhin die Kalenderseite das bestehende Terminformular öffnet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Erinnerungs-Vorlauf im Terminformular ergänzt |
| `apps/web/src/hooks/usePushNotifications.ts` | neu | Browser-Push-Aktivierung, Deaktivierung und Query-Anbindung |
| `apps/web/src/components/settings/PushNotificationsPanel.tsx` | neu | UI für Desktop-Benachrichtigungen in den Einstellungen |
| `apps/web/public/sw.js` | neu | Service Worker für Push und Notification-Klick |
| `apps/web/src/pages/CalendarPage.tsx` | geändert | Öffnet Terminformular bei `/calendar?eventId=<id>` |

## Probleme und Abweichungen

Keine. Das Klickziel wurde wie geplant auf den bestehenden Kalender-Flow gelegt, statt eine neue Event-Detailroute einzuführen.

## Offene Punkte / Folgeaufgaben

Die UI- und Hook-Pfade werden im nächsten Schritt mit Unit-/Integrationstests und einem Browser-Szenario abgesichert.
