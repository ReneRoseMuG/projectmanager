# Log: TKT-95 Auto-Save vor Navigationsvorgang abschließen

**Datum:** 10.06.26
**Uhrzeit:** 16:02:46
**Schritt:** Fix / Auftragsklasse 5
**Status:** ✅ Abgeschlossen
**Parent:** TKT-95 (Meilenstein MS-56 „Refaktoring Wiki/HTML Editor/Forms")

## Worum es ging

Im Wiki-Editor erschien beim Klick auf einen Link (Seitenbaum, verwandte Seiten,
Inhalts-Link) bzw. beim Schließen eine „Änderungen verwerfen?"-Meldung, obwohl
Auto-Save aktiv ist. Soll-Verhalten: Verlasse ich ein Feld/den Editor, wird
gespeichert; kommt es zu einer Navigation, muss der Save **vorher** abgeschlossen
werden — kein Verwerfen-Dialog im Normalfall.

## Was umgesetzt wurde

- **`useAutoSave.flush()` ist jetzt awaitbar** (`Promise<boolean>`): löst zu `true`
  auf, sobald gespeichert wurde (oder nichts zu speichern war), und zu `false` bei
  einem Save-Fehler. Ein `flush()` während eines laufenden Saves wartet auf den
  nachgelagerten Save. Aufrufer können so „erst speichern, dann navigieren".
- **WikiPageForm** stellt dem Eltern-Container einen Leave-Guard bereit
  (`onRegisterLeaveGuard`). Der Guard speichert bei ungespeicherten Änderungen,
  navigiert nur nach Erfolg und zeigt nur bei **fehlgeschlagenem** Save einen
  Fallback-Dialog („Speichern fehlgeschlagen – trotzdem fortfahren und verwerfen?").
  Schließen, verwandte Seiten und Inhalts-Wiki-Links laufen über denselben Guard.
- **WikiPage** leitet die Seitenbaum-Navigation über diesen Guard statt über den
  alten Verwerfen-Dialog (Dialog bleibt nur als Fallback, falls der Guard noch nicht
  registriert ist).
- **RichTextInlineField** erhielt einen optionalen `onBeforeNavigate`-Hook; In-Content-
  Wiki-Links speichern vor der Navigation. Additiv — alle anderen Nutzer unverändert.

## Entscheidungen

- Save-Fehler beim Navigieren → Navigation blockiert + einmaliger Verwerfen-Fallback
  (Nutzer wird nicht eingesperrt). Mit dem Nutzer abgestimmt.
- NoteEditor (eigener 2-Sekunden-Autosave, Modal) bewusst außen vor gelassen — kein
  Scope-Creep; ggf. separater Folgeauftrag.
- Kein globaler App-weiter Router-Blocker (zu breit) — die Seitenleisten-Navigation
  ist durch Blur→Autosave abgedeckt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useAutoSave.ts` | geändert | `flush()` gibt awaitbares `Promise<boolean>` zurück |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | `saveBeforeLeave`, Leave-Guard-Registrierung, interne Navigation |
| `apps/web/src/pages/WikiPage.tsx` | geändert | Tree-Navigation über Leave-Guard |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | optionaler `onBeforeNavigate`-Hook für Inhalts-Links |
| `tests/unit/web/hooks/useAutoSave.test.ts` | geändert | 4 Tests für awaitbaren flush-Vertrag |
| `tests/unit/web/pages/WikiPage.test.tsx` | geändert | Navigationstests auf Leave-Guard umgestellt |
| `tests/unit/web/components/wiki/WikiPageForm.test.tsx` | geändert | 2 Tests: Save-vor-Schließen + Fehler-Fallback |

## Tests

- Typecheck `apps/web`: grün.
- Gezielter Lauf (useAutoSave, WikiPage, WikiPageForm, rich-text-inline-field):
  **79 Tests grün**.
- Voller Web-Lauf: meine Änderungen erzeugen **keinen** neuen Fehler (Baseline ohne
  meine Änderungen: 30 fehlgeschlagen / 653 grün; mit meinen Änderungen: 30
  fehlgeschlagen / 659 grün — +6 grüne Tests).

## Probleme und Abweichungen

- Die 30 vorbestehenden Fehler im vollen Web-Lauf stammen aus unverwandten,
  uncommitteten Working-Tree-Änderungen (u. a. Board-Views, Formulare, DashboardWidgets)
  und nicht aus diesem Fix. Per Stash-Vergleich verifiziert.
- E2E nicht ausgeführt (bekannter `UPLOAD_DIR`-Startblocker).

## Offene Punkte

- NoteEditor-Angleichung optional als Folgeauftrag.
- App-weiter Navigations-Guard (Router-Blocker/`beforeunload`) für Detail-Pages
  optional, falls die Blur→Autosave-Absicherung dort nicht ausreicht.
