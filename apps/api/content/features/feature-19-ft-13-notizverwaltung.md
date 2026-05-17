# FT (13): Notizverwaltung

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature ermöglicht die Verwaltung von Notizen als eigenständige Domainobjekte, die Projekten, Kunden oder Kalenderwochen zugeordnet werden können. Notizen dienen der Dokumentation zusätzlicher Informationen, Hinweise oder Besonderheiten, die im Kontext eines Projekts, Kunden, Mitarbeiters, Termins oder einer Kalenderwoche relevant sind.

Zusätzlich bietet das Feature vordefinierte Notizvorlagen als Eingabehilfe sowie die Möglichkeit, wichtige Notizen anzupinnen, damit diese stets oben in der Notizliste erscheinen.

## Fachliche Beschreibung

Notizen sind eigenständige Textobjekte mit Titel, formatierbarer Beschreibung und Zeitstempeln für Erstellung und letzte Bearbeitung. Sie werden über Relationstabellen Projekten, Kunden, Mitarbeitern, Terminen oder Kalenderwochen zugeordnet und ermöglichen eine flexible Dokumentation ohne strukturelle Abhängigkeiten.

Eine Notiz gehört immer genau einem Parent-Objekt (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche). Eine Notiz existiert nie unabhängig – sie wird immer im Kontext ihres Parents erstellt, verwaltet und gelöscht.

Notizen werden in den Detailansichten von Projekt, Kunde und Mitarbeiter, im Terminformular und in allen Terminkontexten (Kalenderansichten, Terminkarten, Previews) sowie im Kalenderwochen-Kontext als vertikale Kärtchenliste dargestellt. Die Bearbeitung erfolgt über einen schwebenden Richtext-Editor, der Textformatierung sowie Text- und Hintergrundfarben unterstützt.

**Angepinnte Notizen** werden in der Liste immer zuerst angezeigt, unabhängig von Erstellungs- oder Änderungsdatum. Innerhalb der gepinnten und nicht-gepinnten Gruppen erfolgt die Sortierung nach Änderungsdatum (neueste zuerst).

**Notizvorlagen** sind vordefinierte Textbausteine, die beim Erstellen einer neuen Notiz als Ausgangspunkt gewählt werden können. Vorlagen werden zentral in den Stammdaten verwaltet und stehen bei der Notizerstellung als Auswahlliste zur Verfügung. Die Vorlage wird beim Erstellen in die neue Notiz kopiert – danach besteht keine Verbindung mehr zwischen Vorlage und Notiz.

Notizen haben keine fachliche Wirkung auf Termine, Status oder Planungslogik. Sie dienen ausschließlich der Information und Dokumentation. Das Löschen einer Notiz erfolgt direkt über die Detailansicht des zugehörigen Parents und ist endgültig.

**Neu: Kennzeichnungsfarbe für Notizvorlagen (optional, Admin-only).** Notizvorlagen können optional eine zusätzliche Eigenschaft `color` besitzen, die eine fachliche Kennzeichnung darstellt und nicht mit Text- oder Hintergrundfarben innerhalb des Richtext-Inhalts zu verwechseln ist. Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden. Wird anschließend eine Notiz aus dieser Vorlage erzeugt, wird diese `color` beim Erstellen auf die neue Notiz übertragen. Daraus folgt, dass `color` als administrativ gepflegte Eigenschaft zu behandeln ist, die nur durch Administratoren gesetzt oder geändert werden darf.

## Regeln & Randbedingungen

**Allgemeine Regeln für Notizen**

- Eine Notiz ist ein eigenständiges Domainobjekt mit eigener ID.
- Eine Notiz gehört immer genau einem Parent-Objekt (Projekt, Kunde, Mitarbeiter, Termin oder Kalenderwoche).
- Eine Notiz kann nie ohne Parent-Zuordnung existieren.
- Pflichtfelder einer Notiz:
    - Titel (Text)
    - Beschreibung (formatierter Text)
- Automatisch gepflegte Felder:
    - created_at (Erstellungszeitpunkt)
    - updated_at (letzter Bearbeitungszeitpunkt)
- Eine Notiz wird über Relationstabellen verknüpft mit:
    - genau 1 Projekt (über `project_note`) ODER
    - genau 1 Kunde (über `customer_note`) ODER
    - genau 1 Mitarbeiter (über `employee_note`) ODER
    - genau 1 Termin (über `appointment_note`) ODER
    - genau 1 Kalenderwoche (über `calendar_week_note`)
- Das Löschen einer Notiz ist endgültig und entfernt automatisch die zugehörige Relation (CASCADE).
- Das Löschen eines Projekts, Kunden oder Termins entfernt automatisch alle zugehörigen Notizen und deren Relationen (CASCADE). Mitarbeiter können nicht gelöscht werden; eine Kaskadenregel für Mitarbeiter-Notizen ist daher nicht erforderlich. Kalenderwochen-Notizen werden nicht kaskadierend gelöscht, da keine eigene `calendar_week`-Tabelle existiert.
- Notizen werden ausschließlich in den Detailansichten von Projekt, Kunde und Mitarbeiter, im Terminformular und in allen Terminkontexten (Kalenderansichten, Terminkarten, Previews) sowie im Kalenderwochen-Kontext verwaltet.
- Es gibt keine separate Notizverwaltung in der Navigation.
- Notizen haben keine Versionierung oder Historie.
- Notizen sind rein informativ und haben keine Auswirkung auf Terminplanung oder Geschäftslogik.

**Regeln für angepinnte Notizen**

- Eine Notiz kann über das Feld `is_pinned` als angepinnt markiert werden.
- Angepinnte Notizen erscheinen in der Notizliste immer vor nicht-angepinnten Notizen.
- Innerhalb der gepinnten Gruppe erfolgt die Sortierung nach `updated_at` absteigend.
- Innerhalb der nicht-gepinnten Gruppe erfolgt die Sortierung ebenfalls nach `updated_at` absteigend.
- Das Pinning kann jederzeit aktiviert oder deaktiviert werden.

**Regeln für Notizvorlagen**

- Notizvorlagen sind eigenständige Stammdatenobjekte mit Titel und vordefiniertem Inhalt.
- Vorlagen existieren unabhängig von Projekten und Kunden.
- Vorlagen werden in einem eigenen Stammdatenbereich verwaltet (z.B. unter Einstellungen oder Stammdaten).
- Beim Erstellen einer Notiz kann optional eine Vorlage ausgewählt werden.
- Bei Auswahl einer Vorlage werden Titel und Beschreibung in den Editor kopiert.
- Nach dem Kopieren besteht keine Verbindung zwischen Vorlage und erstellter Notiz.
- Änderungen an einer Vorlage wirken sich nicht auf bereits erstellte Notizen aus.
- Vorlagen können eine Sortierreihenfolge haben, um die Anzeige in der Auswahlliste zu steuern.
- Vorlagen können deaktiviert werden, ohne sie zu löschen.

**Neu: Regeln zur Kennzeichnungsfarbe (`color`)**

- Notizvorlagen können optional eine Kennzeichnungsfarbe `color` besitzen.
- `color` ist eine Admin-only Eigenschaft und darf nur von Administratoren gesetzt oder geändert werden.
- Wenn einer Notizvorlage eine Fahrzuweisung gegeben wird, kann dadurch eine `color` vergeben werden.
- Wird eine Notiz aus einer Vorlage erstellt, wird `color` beim Erstellen der Notiz in die Notiz übernommen, sofern die Vorlage eine `color` besitzt.
- Die Übernahme der `color` ist einmalig beim Erstellen; spätere Änderungen an der Vorlagen-`color` verändern bereits erstellte Notizen nicht automatisch.
- `color` ist fachliche Kennzeichnung und unabhängig von Richtext-Formatierungen (Text-/Hintergrundfarben) im Feld `body`.

**Regeln für Kalenderwochen-Notizen**

- Kalenderwochen-Notizen werden über die Tabelle `calendar_week_note` zugeordnet.
- Eine Kalenderwoche wird eindeutig identifiziert über `year_number` (Jahr) und `week_number` (ISO-Kalenderwochennummer gemäß ISO 8601).
- Es existiert keine eigene Tabelle `calendar_week`. Die Woche ist ausschließlich durch das Wertepaar (`year_number`, `week_number`) definiert.
- Mehrere Notizen pro Kalenderwoche sind erlaubt.
- Eine Notiz kann nicht mehrfach an dieselbe Kalenderwoche gebunden werden (Unique Constraint auf `note_id` + `year_number` + `week_number`).
- Gültige Wochennummern liegen im Bereich 1–53 (ISO 8601).
- Leser dürfen Kalenderwochen-Notizen nicht anlegen, bearbeiten oder löschen.
- Disponenten und Administratoren dürfen Kalenderwochen-Notizen anlegen, bearbeiten und löschen.
- Kalenderwochen-Notizen erscheinen in der Druckausgabe der jeweiligen Kalenderwoche.
- Bestehende Notizvorlagen stehen auch für Kalenderwochen-Notizen zur Verfügung.
- Das Pinning (`is_pinned`) gilt auch für Kalenderwochen-Notizen und folgt derselben Sortierlogik wie bei Projekt- und Kundennotizen.

**Regeln für Mitarbeiter-Notizen**

- Mitarbeiter-Notizen werden über die Tabelle `employee_note` zugeordnet.
- Alle Rollen (Leser, Disponent, Administrator) dürfen Mitarbeiter-Notizen lesen.
- Disponenten und Administratoren dürfen Mitarbeiter-Notizen anlegen, bearbeiten und löschen.
- Mitarbeiter-Notizen erscheinen ausschließlich in der Mitarbeiter-Detailansicht.
- Da Mitarbeiter nicht gelöscht werden können, entsteht keine Kaskadenregel für Mitarbeiter-Notizen.
- Pinning, Vorlagen und `color`-Übernahme gelten analog zu Projekt- und Kundennotizen.

**Regeln für Termin-Notizen**

- Termin-Notizen werden über die Tabelle `appointment_note` zugeordnet.
- Alle Rollen (Leser, Disponent, Administrator) dürfen Termin-Notizen lesen.
- Disponenten und Administratoren dürfen Termin-Notizen anlegen, bearbeiten und löschen.
- Termin-Notizen erscheinen in allen Terminkontexten: Terminformular, Kalenderansichten, Terminkarten und Previews.
- Wenn Startdatum, Enddatum oder Startzeit eines bestehenden Termins geändert werden und der Termin eigene Notizen besitzt, kann der Termin-Speichern-Review eine bewusste Prüfung dieser Notizen verlangen. Die Notiztexte werden dadurch nicht automatisch verändert.
- Das Löschen eines Termins entfernt kaskadierend alle zugehörigen Termin-Notizen (CASCADE).
- Historische Termine sind read-only; Notizen an historischen Terminen können weder angelegt noch bearbeitet noch gelöscht werden.
- Pinning, Vorlagen und `color`-Übernahme gelten analog zu Projekt- und Kundennotizen.