# Log: ToastProvider

**Datum:** 16.05.26  
**Schritt:** 8 — Toast + ToastProvider  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Toast-Stack wurde auf das neue Studie-2-Pattern umgestellt. Es gibt nun eine eigene Toast-Komponente mit Tone-Border, Icon-Box, Actions, Close-X und Timebar. Der Provider zeigt maximal drei Toasts unten rechts und unterstützt `success`, `error`, `warn` und `info`. Die bestehende `showToast`-API bleibt kompatibel, zusätzlich steht eine `toast()`-Funktion mit Convenience-Methoden bereit.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Toast.tsx` | neu | Wiederverwendbare Toast-Ansicht |
| `apps/web/src/components/ui/ToastProvider.tsx` | geändert | Stack, Timeout, Actions und API erweitert |
| `apps/web/src/styles.css` | geändert | Toast-Animationen und Timebar ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
