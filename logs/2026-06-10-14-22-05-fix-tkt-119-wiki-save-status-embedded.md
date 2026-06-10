# Log: TKT-119 Wiki-Save zeigt keine „Gespeichert"-Meldung

**Datum:** 10.06.26  
**Uhrzeit:** 14:22:05  
**Schritt:** Fix — TKT-119 „Wiki-Save per Header-Klick zeigt keine Meldung"  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

In der Wiki-Ansicht läuft das Seitenformular eingebettet (`inline` + `embedded`).
In diesem Modus wurde weder der Standalone- noch der Modal-Header gerendert — und
damit auch die `SaveStatus`-Anzeige nicht. Ein Speichern per Fokuswechsel
(Autosave) blieb deshalb ohne sichtbare Rückmeldung. Die eingebettete Aktionsleiste
zeigt jetzt die `SaveStatus`-Anzeige („Speichern…" / „Gespeichert" / Fehler).

Da diese Leiste hellen Hintergrund hat, der bestehende `SaveStatus` aber für den
dunklen Hero-Header weiße Schrift nutzt, wurde `SaveStatus` um eine abwärts-
kompatible `tone`-Variante erweitert (`onDark` als Default, neu `onLight` mit
dunkler Schrift). Bestehende Aufrufe bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/SaveStatus.tsx` | geändert | `tone`-Prop (`onDark`/`onLight`), Farbschemata; Default abwärtskompatibel |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Embedded-Aktionsleiste rendert `SaveStatus` (tone `onLight`) bei Autosave |

## Probleme und Abweichungen

Die Embedded-Leiste ist jetzt im Editiermodus dauerhaft als schmaler Statusstreifen
vorhanden (im Idle leer). Bewusst so gewählt, damit der Save-Status einen festen
Platz hat. Styling kann bei Bedarf später angepasst werden.

## Offene Punkte / Folgeaufgaben

Verwandt mit TKT-95 (Autosave bei Navigation): Das Aufräumen der formularlokalen
„Verwerfen"-Dialoge bleibt dort verortet, nicht Teil dieses Fixes.
