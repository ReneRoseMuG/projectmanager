# Log: Feature-Input Container

**Datum:** 17.05.26  
**Schritt:** Fix — Feature-Input Container  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Eingabefelder in den Feature-Formularen wurden auf die Breite ihrer jeweiligen Grid-Spalte begrenzt. Dafür wurden die betroffenen Label-, Wrapper- und Input-Elemente mit `min-w-0` beziehungsweise `w-full` versehen. Die Status-/Sortierungszeile nutzt jetzt eine flexible `minmax(0, 1fr)`-Spalte, damit der Sortierungs-Input nicht rechts aus dem Container läuft. Es wurden ausschließlich CSS-Klassen angepasst; Datenmodell, API und Formularlogik bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Feature-Detail-Inputs auf Containerbreite begrenzt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Feature-Formular-Inputs auf Containerbreite begrenzt |

## Probleme und Abweichungen

Der Web-Build ist erfolgreich. Die bestehende Vite-Warnung zu Chunks über 500 kB bleibt unverändert und liegt außerhalb dieses Fixes.

## Offene Punkte / Folgeaufgaben

Keine.
