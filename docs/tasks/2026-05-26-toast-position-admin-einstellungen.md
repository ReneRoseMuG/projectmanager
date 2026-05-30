# Codex-Auftrag: Toast-Position in Admin-Einstellungen konfigurierbar machen

**Parent:** PROJ-3 — Projekt Manager  
**Datum:** 2026-05-26  
**Aufgaben-ID:** 63

---

## Ziel

In den Admin-Einstellungen der App soll eine neue Option eingeführt werden, mit der Administratoren
die Anzeigeposition von Toast-Benachrichtigungen global festlegen können. Unterstützte Positionen
sind mindestens: oben rechts, oben links, unten rechts, unten links. Die gewählte Position wird
persistiert und von der Toast-Komponente beim Einblenden berücksichtigt.

## Hintergrund & Kontext

Die App verwendet Toasts als kurzlebige Bestätigungsmeldungen für verschiedene Aktionen (z. B.
Speichern, Löschen, Fehler). Die Position ist bisher fest verdrahtet. Nutzer bzw. Admins sollen
die Position an ihren Workflow anpassen können — z. B. um Überlagerungen mit anderen UI-Elementen
zu vermeiden.

## Aufgabe

1. **Einstellungsfeld anlegen**  
   In der Admin-Einstellungsseite (Settings) ein neues Feld „Toast-Position" hinzufügen.  
   Empfohlen: Dropdown oder Radio-Group mit den Optionen:
   - `top-right` (Standard / bisheriges Verhalten)
   - `top-left`
   - `bottom-right`
   - `bottom-left`

2. **Persistenz implementieren**  
   Den gewählten Wert in der globalen App-Konfiguration speichern (gleicher Mechanismus wie
   bestehende Admin-Einstellungen). Der Wert muss beim App-Start geladen und der Toast-Komponente
   bereitgestellt werden.

3. **Toast-Komponente anpassen**  
   Die Toast-Komponente (bzw. der zugehörige Provider/Context) soll die konfigurierte Position
   auslesen und die CSS-Positionierung entsprechend setzen. Kein Hard-Code mehr — stattdessen
   dynamische Klasse oder Inline-Style aus dem Konfigurationswert.

4. **Standardwert sicherstellen**  
   Falls noch kein Wert gespeichert ist (Erstinstallation, Migration), muss `top-right` als
   Fallback greifen, damit bestehende Instanzen ohne sichtbare Änderung weiterarbeiten.

## Technische Leitplanken

- Kein Breaking Change am bestehenden Toast-Verhalten: Standardposition bleibt `top-right`.
- Die Einstellung ist global (Admin-only), keine benutzerspezifische Einstellung.
- Naming-Konvention für den Konfigurationsschlüssel an bestehendem Schema orientieren
  (z. B. `ui.toastPosition` oder `settings.toastPosition`).
- Codebase vor der Implementierung lesen: bestehende Einstellungsstruktur, Toast-Provider und
  Admin-Settings-Seite analysieren, bevor neue Felder hinzugefügt werden.

## Regeln & Randfälle

- Ungültige gespeicherte Werte (z. B. durch manuelle DB-Eingriffe) müssen auf `top-right`
  fallen, kein Runtime-Error.
- Die vier Positionen sind eine abgeschlossene Menge — kein freies Eingabefeld.
- Änderungen sollen sofort wirksam sein (kein App-Neustart nötig), sofern der Toast-State
  reaktiv auf die Einstellung reagiert.

## Seiteneffekte

- Admin-Einstellungsseite: neues Feld erscheint im UI.
- Toast-Provider / Toast-Komponente: liest jetzt externe Konfiguration statt Hard-Code.
- Datenbank / Konfigurationsspeicher: neuer Schlüssel wird persistiert — ggf. Migration oder
  Seed-Datei anpassen.

## Testanforderungen

- **Unit-Test**: Toast-Komponente rendert korrekte CSS-Klasse/Position für jeden der vier Werte.
- **Unit-Test**: Fallback auf `top-right` bei fehlendem/ungültigem Konfigurationswert.
- **Integration-Test**: Admin speichert einen neuen Wert → Einstellung wird korrekt
  persistiert und beim nächsten Laden zurückgegeben.
- **E2E-Test** (optional): Admin ändert Position in den Settings → nächster Toast erscheint
  an der gewählten Position.

## Abnahmekriterien

- Im Admin-Bereich ist ein Feld „Toast-Position" sichtbar mit den vier Optionen.
- Die gewählte Position wird gespeichert und überlebt einen App-Neustart.
- Toasts erscheinen nach der Einstellung an der konfigurierten Position.
- Bestehende Instanzen ohne gespeicherten Wert verhalten sich unverändert (oben rechts).
- Alle neuen Tests sind grün.
