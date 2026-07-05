# Log: Rich Text Bold Auswahl

**Datum:** 05.07.26  
**Uhrzeit:** 06:54:43  
**Schritt:** Fix — Rich Text Bold Auswahl  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Fehler wurde auf die CSS-Regel `.rich-text-surface p:has(> strong:only-child)` zurückgeführt. Diese Regel konnte auch bei einem Absatz mit normalem Text plus genau einem `<strong>`-Element matchen, weil `:only-child` nur Elementknoten bewertet und Textknoten ignoriert. Dadurch erschien nach einer korrekten Inline-Bold-Markierung optisch der gesamte Absatz fett. Die blockweite Absatzregel wurde entfernt und durch eine einfache Inline-Regel für `.rich-text-surface strong` ersetzt. Zusätzlich wurde ein CSS-Contract-Test ergänzt, der die Rückkehr der alten Absatzregel verhindert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/styles.css` | geändert | Blockweite Strong-Absatzregel entfernt und Inline-Strong-Regel ergänzt |
| `tests/unit/web/styles/rich-text-surface-css.test.ts` | neu | CSS-Contract-Test gegen die Bold-Absatz-Regression |

## Probleme und Abweichungen

Der erste Testlauf schlug fehl, weil `import.meta.url` unter Vitest nicht als `file:`-URL aufgelöst wurde. Der Test wurde auf `process.cwd()` plus `src/styles.css` umgestellt und danach erfolgreich ausgeführt. Bereits vorher vorhandene Änderungen an `rich-text-inline-field.tsx`, dem zugehörigen Unit-Test und einem Sticky-Toolbar-Log wurden nicht verändert oder zurückgesetzt.

Testleitplanken: Testebene Unit / CSS-Contract; echte Daten sind die reale CSS-Quelldatei; Isolation erfolgt read-only ohne Produktionsdaten; keine Mocks. Bewiesen wird: Eine Inline-`strong`-Markierung darf keine blockweite Absatz-Fettformatierung auslösen.

## Offene Punkte / Folgeaufgaben

Keine.
