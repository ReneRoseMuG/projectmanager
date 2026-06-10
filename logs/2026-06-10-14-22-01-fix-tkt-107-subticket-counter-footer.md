# Log: TKT-107 Subticket-Counter in die Footer-Leiste

**Datum:** 10.06.26  
**Uhrzeit:** 14:22:01  
**Schritt:** Fix — TKT-107 „Subticket Count auf Cards liegt mitten im Body"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Subticket-Counter (GitBranch-Icon + Zahl) wurde auf Ticket-Karten bisher als
freistehender Meta-Block zwischen Body und Fußleiste gerendert und wirkte dadurch
„mitten im Body". Der Counter wird jetzt über die bereits vorhandene
`leadingCounters`-Schnittstelle der `CardFooterBar` in die untere Counter-Leiste
verschoben — gemeinsam mit Anhang-, Notiz- und Kommentar-Zählern. Der separate
Meta-Block zeigt nur noch Fälligkeit und Schließdatum. Keine neue Komponente,
nur Nutzung der vorhandenen Infrastruktur.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Subticket-Counter aus Meta-Block entfernt, als `leadingCounters` an `CardFooterBar` übergeben; `hasMeta` ohne Subticket-Bedingung |

## Probleme und Abweichungen

Keine. Der Counter erscheint weiterhin nur, wenn Subtickets vorhanden sind.

## Offene Punkte / Folgeaufgaben

Keine.
