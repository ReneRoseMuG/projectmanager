# Log: Kommentar-Dialog Speichern

**Datum:** 26.05.26  
**Schritt:** Fix — Kommentar-Dialog Speichern  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Kommentar-Dialog schließt beim Speichern jetzt zuverlässig. Dafür wurde der `RichTextInlineField` um einen Modal-tauglichen Modus erweitert: Mit `liveUpdate` meldet der Editor den aktuellen HTML-Stand während der Bearbeitung, und mit `commitOnBlur={false}` bleibt der Editor beim Klick auf den Speichern-Button stabil gemountet. Der Kommentar-Editor im `CommentThread` nutzt diesen Modus, sodass der Speichern-Klick nicht mehr durch den vorherigen Editor-Blur abgefangen wird. Das Speichern selbst läuft weiterhin über den bestehenden versionierten Kommentar-Update-Pfad mit `expectedVersion`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | `liveUpdate` und `commitOnBlur` für Modal-Nutzung ergänzt |
| `apps/web/src/components/ui/CommentThread.tsx` | geändert | Kommentar-Modal nutzt den stabilen RichText-Modus |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Live-Update und Blur-Verhalten abgesichert |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Testleitplanken wurden angewendet: Web-Unit-Tests und Web-Hook-/Komponenten-Integration mit Test-Doubles; keine produktiven Daten oder Upload-Verzeichnisse.

## Offene Punkte / Folgeaufgaben

Keine.
