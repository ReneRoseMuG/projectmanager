# Log: Collapsed Plus Button Position

**Datum:** 24.05.26  
**Schritt:** Fix — Collapsed Plus Button Position  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der `+`-Button in kollabierten Board-Spalten wird jetzt am oberen Rand der schmalen Status-Spalte gerendert. Dafür wurde im kollabierten Board-Rendering der Button vor das vertikale Status-Label gesetzt, ohne den bestehenden Button selbst, die Droppable-Registrierung oder das Status-Label zu verändern. Der bestehende Unit-Test für kollabierte Board-Spalten prüft nun zusätzlich, dass der Button im ersten Section-Kind liegt. Der Testentwurfs-Skill wurde angewendet; Testebene ist Unit, mit jsdom und ohne DB- oder Dateisystemzugriff.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | `+`-Button im kollabierten Board-Layout nach oben verschoben |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Reihenfolge des Buttons in kollabierter Board-Spalte abgesichert |

## Probleme und Abweichungen

Keine. Der vollständige Web-Unitlauf wurde nicht erneut ausgeführt, weil bereits bekannte rote Fremderwartungen außerhalb dieses Fixes bestehen. Stattdessen wurde der betroffene Unit-Test gezielt ausgeführt und der Web-Typecheck geprüft.

## Offene Punkte / Folgeaufgaben

Die bekannten roten Web-Unit-Erwartungen aus dem vorherigen TASK-39-Lauf bleiben ein separater Folgeauftrag.
