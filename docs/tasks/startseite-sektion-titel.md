# Startseite — Sektion-Titel vereinheitlichen

Meilenstein: MS-15 · UI Überarbeitung

---

## Ist-Zustand

- Über dem Dashboard-Bereich steht eine separate Headline **„Startseiten-Dashboard"**.
- Unter dem Kalender-Titel steht ein Infotext: *„Kommende Termine und fällige Aufgaben."*
- Dashboard und Kalender haben keinen einheitlichen Sektion-Titel-Stil.

## Soll-Zustand

- **Dashboard** und **Kalender** erhalten je einen Sektion-Titel im gleichen Stil.
- Die Zwischenüberschrift **„Startseiten-Dashboard"** wird entfernt.
- Der Infotext unter dem Kalender-Titel (*„Kommende Termine und fällige Aufgaben."*) wird entfernt.

## Umsetzung

1. Sektion-Titel für „Dashboard" und „Kalender" im gleichen Stil anlegen (analog zur bestehenden Kalender-Überschrift).
2. Die Komponente/den Render-Abschnitt, der „Startseiten-Dashboard" ausgibt, entfernen.
3. Den Infotext unterhalb des Kalender-Titels entfernen.

## Hinweis

Der Stil der Sektion-Titel soll konsistent sein — beide Titel sehen identisch aus.
