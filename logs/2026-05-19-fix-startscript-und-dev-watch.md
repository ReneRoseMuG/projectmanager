# Log: Startscript und Dev-Watch

**Datum:** 19.05.26  
**Schritt:** Fix — Startscript und Dev-Watch  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Startabbruch über `Projekt Manager starten.bat` wurde behoben, indem die untypisierte TipTap-`onBlur`-Callbackstelle in `RichTextInlineField` explizit typisiert wurde. Dadurch läuft der Web-TypeScript-Build wieder durch und das Startscript kommt über den Build-Schritt hinaus. Zusätzlich wurde der API-Dev-Start entschärft: `node --watch dist/index.js` wurde durch `node dist/index.js` ersetzt, weil der Node-Watcher auf dem lokalen Windows-/Node-24-Setup permanent Neustarts ausgelöst hat. `npm run dev` startet dadurch wieder ruhig; Backend-Codeänderungen benötigen im Dev-Modus vorerst einen manuellen API-Neustart.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | TipTap-Blur-Editor explizit typisiert |
| `apps/api/package.json` | geändert | API-Dev-Start ohne instabile Node-Watch-Schleife |
| `logs/2026-05-19-fix-startscript-und-dev-watch.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Beim kontrollierten Batch-Test wurde das Script nach erfolgreichem Start künstlich beendet; die dabei sichtbare Meldung zur Eingabeumleitung stammt aus der Testausführung mit umgeleitetem Output und ist nicht der ursprüngliche Startfehler. Die bekannte Vite-Warnung zu großen Bundles und die Node-Deprecation-Warnung aus Abhängigkeiten bleiben bestehen, blockieren den Start aber nicht.

## Offene Punkte / Folgeaufgaben

Ein stabiler automatischer API-Restart für den Dev-Modus kann später separat ergänzt werden. Bis dahin muss die API nach Backend-Codeänderungen im Dev-Modus manuell neu gestartet werden.
