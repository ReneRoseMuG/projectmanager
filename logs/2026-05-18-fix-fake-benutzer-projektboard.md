# Log: Fake-Benutzer und Projektboard

**Datum:** 18.05.26  
**Schritt:** Fix — Fake-Benutzer und Projektboard  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Fake-Benutzerbereich wurde aus der TopBar entfernt. Der `RM`-Avatar, das Account-Menü und die statischen Texte zu „René Müller" und `single-user@local` existieren im Frontend nicht mehr. In Projektkarten wurde die künstliche Avatar-Reihe entfernt; die violetten Badges waren nur Platzhalter-Avatare aus Projektname, `Team` und `OK` beziehungsweise offener Aufgabenanzahl. Das Projektboard nutzt seine Statusspalten jetzt aus `PROJECT_STATUSES` und den zentralen deutschen Labels, statt die Spalten lokal zu duplizieren. Die gemeinsame Board-Ansicht stellt Statusspalten horizontal als Spalten dar und bricht sie nicht mehr nach drei Spalten als weiteres Grid-Element um.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/TopBar.tsx` | geändert | Fake-Avatar und Account-Menü aus der TopBar entfernt |
| `apps/web/src/components/layout/AvatarMenu.tsx` | gelöscht | Unbeauftragtes Account-/Einstellungsmenü entfernt |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Künstliche Projekt-Avatar-Badges entfernt |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | geändert | Projektstatus-Spalten aus `PROJECT_STATUSES` abgeleitet |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Statusboards als horizontale Spalten statt 3er-Grid-Umbruch |
| `apps/web/src/components/ui/__tests__/ProjectListBoardView.test.tsx` | geändert | Layout-Erwartung für Statusspalten aktualisiert |
| `apps/web/src/components/ui/__tests__/FeatureListBoardView.test.tsx` | geändert | Layout-Erwartung für Statusspalten aktualisiert |
| `apps/web/src/components/ui/__tests__/TaskListBoardView.test.tsx` | geändert | Layout-Erwartung für Statusspalten aktualisiert |
| `logs/2026-05-18-fix-fake-benutzer-projektboard.md` | neu | Log-Eintrag für den UI-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine. `npm run build -w apps/web` und `npm run lint -w apps/web` wurden erfolgreich ausgeführt. Vite meldet weiterhin nur die bekannte Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Die technischen Projektstatuswerte liegen weiterhin zentral in `packages/shared-types/src/index.ts` als `PROJECT_STATUSES`. Die deutschen Labels und Tones liegen in `apps/web/src/utils/domainLabels.ts`. Wenn Statuswerte fachlich änderbar in der App werden sollen, ist dafür ein separater Konfigurations-/Datenmodellauftrag nötig.
