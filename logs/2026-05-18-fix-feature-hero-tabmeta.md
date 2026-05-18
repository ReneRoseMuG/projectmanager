# Log: Feature-Hero und Tab-Meta

**Datum:** 18.05.26  
**Schritt:** Fix — Feature-Hero und Tab-Meta  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Drei-Punkt-Menü im Hero-Bereich der Feature-Detailseite wurde entfernt. Zusätzlich wurde die separate Meta-Anzeige rechts neben der Tab-Leiste entfernt, die beim Details-Tab erneut „Stammdaten" angezeigt hat. Die Tab-Leiste zeigt weiterhin die eigentlichen Tabs, aber keinen zusätzlichen erklärenden Text daneben. Dadurch bleibt der Header schlanker und die Tab-Leiste zeigt keine doppelte Beschriftung mehr.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Drei-Punkt-Menü und rechte Tab-Meta-Anzeige entfernt |
| `logs/2026-05-18-fix-feature-hero-tabmeta.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der Tab selbst heißt weiterhin „Stammdaten"; entfernt wurde nur die zusätzliche Anzeige rechts neben der Tab-Leiste.

## Offene Punkte / Folgeaufgaben

Keine.
