# Titel-Migration – Vorschau zur Freigabe

Regeln: Bindestriche→Leerzeichen · echte Umlaute · deutsche Groß-/Kleinschreibung · Feature-Präfix `FT(NN): ` · Use-Case-Präfix `UC (NN/NN): ` (Feature-Nr / UC-Nr).

**Umfang:** 42 Features, 283 Use Cases – alle bekommen einen neuen Titel.

## ⚠️ Bitte bestätigen – Features ohne bisherige Nummer

Diese zwei Features hatten kein `FT(NN)`-Präfix. Ich schlage folgende Nummern vor:

- **id 42**: `Tagesplanung` → `FT(13): Tagesplanung`
- **id 43**: `Zentrale Konfliktbehandlung für Termine und Ressourcen` → `FT(35): Zentrale Konfliktbehandlung für Termine und Ressourcen`

---
## Features

- `FT (01): Authentifizierung & Benutzerverwaltung`  →  **`FT(01): Authentifizierung & Benutzerverwaltung`**
- `FT (02): Projekte`  →  **`FT(02): Projekte`**
- `FT (03): Meilensteine`  →  **`FT(03): Meilensteine`**
- `FT (04): Aufgaben`  →  **`FT(04): Aufgaben`**
- `FT (05): Ticket-System`  →  **`FT(05): Ticket-System`**
- `FT (06): Anforderungen & Planung`  →  **`FT(06): Anforderungen & Planung`**
- `FT (07): Wiki`  →  **`FT(07): Wiki`**
- `FT (08): Kalender & Ereignisse`  →  **`FT(08): Kalender & Ereignisse`**
- `FT (09): Dashboard`  →  **`FT(09): Dashboard`**
- `FT (10): Journal & Auditlog`  →  **`FT(10): Journal & Auditlog`**
- `FT (11): Querschnittsobjekte`  →  **`FT(11): Querschnittsobjekte`**
- `FT (12): Globale Suche`  →  **`FT(12): Globale Suche`**
- `FT (14): Einstellungen & Konfiguration`  →  **`FT(14): Einstellungen & Konfiguration`**
- `FT (15): Datensicherung & Import`  →  **`FT(15): Datensicherung & Import`**
- `Tagesplanung`  →  **`FT(13): Tagesplanung`** ⚠️(vorgeschlagen)
- `FT (01): Kalendertermine`  →  **`FT(01): Kalendertermine`**
- `FT (02): Projekte`  →  **`FT(02): Projekte`**
- `FT (03): Kalenderansichten`  →  **`FT(03): Kalenderansichten`**
- `FT (04): Tourenplanung`  →  **`FT(04): Tourenplanung`**
- `FT (05): Mitarbeiterverwaltung`  →  **`FT(05): Mitarbeiterverwaltung`**
- `FT (06): Automatische Regeln`  →  **`FT(06): Automatische Regeln`**
- `FT (07): Automatisierte Datensicherung und Fallback`  →  **`FT(07): Automatisierte Datensicherung und Fallback`**
- `FT (08): Journal / Änderungshistorie`  →  **`FT(08): Journal / Änderungshistorie`**
- `FT (09): Kundenverwaltung`  →  **`FT(09): Kundenverwaltung`**
- `FT (11): Team Verwaltung`  →  **`FT(11): Team Verwaltung`**
- `FT (13): Notizverwaltung`  →  **`FT(13): Notizverwaltung`**
- `FT (14): Benutzer- und Rollenverwaltung`  →  **`FT(14): Benutzer- und Rollenverwaltung`**
- `FT (16): Hilfetexte verwalten`  →  **`FT(16): Hilfetexte verwalten`**
- `FT (18): User Preferences`  →  **`FT(18): User Preferences`**
- `FT (19): Attachments`  →  **`FT(19): Attachments`**
- `FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung`  →  **`FT(20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung`**
- `FT (21): Dokumentenextraktion`  →  **`FT(21): Dokumentenextraktion`**
- `FT (24): Fahrzeugverwaltung`  →  **`FT(24): Fahrzeugverwaltung`**
- `FT (26): Auswertungen und Reports`  →  **`FT(26): Auswertungen und Reports`**
- `FT (27): Produktverwaltung und Auftragspositionen`  →  **`FT(27): Produktverwaltung und Auftragspositionen`**
- `FT (28): Universelles Tagging-System`  →  **`FT(28): Universelles Tagging-System`**
- `FT (29): Zwei-Faktor-Authentisierung mit Google Authenticator`  →  **`FT(29): Zwei-Faktor-Authentisierung mit Google Authenticator`**
- `FT (31): Dispositions-Monitoring (Konflikte)`  →  **`FT(31): Dispositions-Monitoring (Konflikte)`**
- `FT (32): Aktive Änderungsbenachrichtigung`  →  **`FT(32): Aktive Änderungsbenachrichtigung`**
- `FT (33): Abwesenheiten über interne Personalplanung`  →  **`FT(33): Abwesenheiten über interne Personalplanung`**
- `FT (34): Kalendermarker, Feiertage und Betriebsferien`  →  **`FT(34): Kalendermarker, Feiertage und Betriebsferien`**
- `Zentrale Konfliktbehandlung für Termine und Ressourcen`  →  **`FT(35): Zentrale Konfliktbehandlung für Termine und Ressourcen`** ⚠️(vorgeschlagen)

---
## Use Cases (gruppiert nach Feature)


### FT(09): Dashboard
- `UC-1: Dashboard anzeigen`
  → **`UC (09/01): Dashboard anzeigen`**
- `UC-2: Dashboard anlegen`
  → **`UC (09/02): Dashboard anlegen`**
- `UC-3: Dashboard bearbeiten`
  → **`UC (09/03): Dashboard bearbeiten`**
- `UC-4: Widget hinzufügen`
  → **`UC (09/04): Widget hinzufügen`**
- `UC-5: Widget entfernen und neu anordnen`
  → **`UC (09/05): Widget entfernen und neu anordnen`**
- `UC-6: Persönlichen Standard setzen`
  → **`UC (09/06): Persönlichen Standard setzen`**
- `UC-7: Systemweiten Standard setzen (Admin)`
  → **`UC (09/07): Systemweiten Standard setzen (Admin)`**

### FT(15): Datensicherung & Import
- `UC-1: Vollsicherung erstellen und hochladen`
  → **`UC (15/01): Vollsicherung erstellen und hochladen`**
- `UC-2: Inkrementellen Sync ausführen`
  → **`UC (15/02): Inkrementellen Sync ausführen`**
- `UC-3: Import aus Remote-Backup vorbereiten und durchführen`
  → **`UC (15/03): Import aus Remote-Backup vorbereiten und durchführen`**
- `UC-4: Inkrementellen Remote-Sync importieren`
  → **`UC (15/04): Inkrementellen Remote-Sync importieren`**

### FT(01): Kalendertermine
- `uc-01-01-termin-anlegen`
  → **`UC (01/01): Termin anlegen`**
- `uc-01-02-termin-bearbeiten`
  → **`UC (01/02): Termin bearbeiten`**
- `uc-01-03-termin-verschieben`
  → **`UC (01/03): Termin verschieben`**
- `uc-01-04-termin-loeschen`
  → **`UC (01/04): Termin löschen`**
- `uc-01-05-tour-einem-termin-zuweisen`
  → **`UC (01/05): Tour einem Termin zuweisen`**
- `uc-01-06-tourzuweisung-eines-termins-entfernen`
  → **`UC (01/06): Tourzuweisung eines Termins entfernen`**
- `uc-01-07-mitarbeiter-ueber-team-zuweisen`
  → **`UC (01/07): Mitarbeiter über Team zuweisen`**
- `uc-01-08-mitarbeiter-einem-termin-zuweisen`
  → **`UC (01/08): Mitarbeiter einem Termin zuweisen`**
- `uc-01-09-mitarbeiter-von-einem-termin-entfernen`
  → **`UC (01/09): Mitarbeiter von einem Termin entfernen`**
- `uc-01-10-termin-in-abhaengigen-sichten-anzeigen-quersicht-vertrag`
  → **`UC (01/10): Termin in abhängigen Sichten anzeigen (Quer-Sicht-Vertrag)`**
- `uc-01-11-denormalisierte-terminanzeige-aktualisieren-quersicht-vertrag`
  → **`UC (01/11): Denormalisierte Terminanzeige aktualisieren (Quer-Sicht-Vertrag)`**
- `uc-01-12-termin-anzeigen-und-filtern-kalender-listenprojektion`
  → **`UC (01/12): Termin anzeigen und filtern (Kalender-Listenprojektion)`**
- `uc-01-13-termin-farbdarstellung-ableiten`
  → **`UC (01/13): Termin-Farbdarstellung ableiten`**
- `UC 01/14: Historische Termine — Rollenbasiertes Verhalten`
  → **`UC (01/14): Historische Termine — Rollenbasiertes Verhalten`**
- `uc-01-15-konsistenz-bei-parallelen-aenderungen-optimistic-locking`
  → **`UC (01/15): Konsistenz bei parallelen Änderungen (Optimistic Locking)`**
- `uc-01-16-termin-join-konsistenz-und-duplikatvermeidung`
  → **`UC (01/16): Termin-Join-Konsistenz und Duplikatvermeidung`**
- `uc-01-17-notiz-an-termin-anlegen`
  → **`UC (01/17): Notiz an Termin anlegen`**
- `uc-01-18-notiz-am-termin-bearbeiten`
  → **`UC (01/18): Notiz am Termin bearbeiten`**
- `uc-01-19-notiz-von-termin-entfernen`
  → **`UC (01/19): Notiz von Termin entfernen`**
- `uc-01-20-notizen-beim-termin-loeschen-entfernen`
  → **`UC (01/20): Notizen beim Löschen des Termins entfernen`**
- `uc-01-21-termin-anlegen-nur-mit-kunde-ohne-projekt`
  → **`UC (01/21): Termin anlegen nur mit Kunde ohne Projekt`**
- `uc-01-22-termin-stornieren`
  → **`UC (01/22): Termin stornieren`**
- `UC 01/23: Mehrere Termine kalenderwochenweise verschieben`
  → **`UC (01/23): Mehrere Termine kalenderwochenweise verschieben`**

### FT(02): Projekte
- `uc-02-01-projekt-anlegen`
  → **`UC (02/01): Projekt anlegen`**
- `uc-02-02-projekt-bearbeiten`
  → **`UC (02/02): Projekt bearbeiten`**
- `uc-02-03-projekt-anzeigen`
  → **`UC (02/03): Projekt anzeigen`**
- `uc-02-04-projekt-tags-aendern`
  → **`UC (02/04): Projekt-Tags ändern`**
- `UC 02/05: Projektnotizen pflegen`
  → **`UC (02/05): Projektnotizen pflegen`**
- `UC 02/06: Projektanhänge verwalten`
  → **`UC (02/06): Projektanhänge verwalten`**
- `uc-02-07-projekte-anzeigen-liste`
  → **`UC (02/07): Projekte anzeigen (Liste)`**
- `uc-02-08-projekt-loeschen`
  → **`UC (02/08): Projekt löschen`**
- `uc-02-09-projektaenderung-wird-in-terminansichten-konsistent-dargestellt`
  → **`UC (02/09): Projektänderung wird in Terminansichten konsistent dargestellt`**
- `uc-02-10-projekt-tag-aenderung-wirkt-systemweit-konsistent`
  → **`UC (02/10): Projekt-Tag-Änderung wirkt systemweit konsistent`**
- `uc-02-11-projektloeschung-wird-systemweit-korrekt-verarbeitet`
  → **`UC (02/11): Projektlöschung wird systemweit korrekt verarbeitet`**
- `uc-02-12-projekt-in-abhaengigen-sichten-anzeigen-quer-sicht-vertrag`
  → **`UC (02/12): Projekt in abhängigen Sichten anzeigen (Quer-Sicht-Vertrag)`**
- `uc-02-13-denormalisierte-projektanzeige-aktualisieren-quer-sicht-vertrag`
  → **`UC (02/13): Denormalisierte Projektanzeige aktualisieren (Quer-Sicht-Vertrag)`**
- `uc-02-14-konsistenz-bei-parallelen-aenderungen-an-projekten-optimistic-locking`
  → **`UC (02/14): Konsistenz bei parallelen Änderungen an Projekten (Optimistic Locking)`**
- `uc-02-15-projekt-join-konsistenz-projekt-tags`
  → **`UC (02/15): Projekt-Join-Konsistenz (Projekt-Tags)`**
- `UC 02/16: Projekt-Referenz-Konsistenz (Projekt ↔ Kunde)`
  → **`UC (02/16): Projekt-Referenz-Konsistenz (Projekt ↔ Kunde)`**
- `uc-02-17-projekt-mengenlogik-konsistenz-projektuebersicht`
  → **`UC (02/17): Projekt-Mengenlogik-Konsistenz (Projektübersicht)`**
- `uc-02-18-race-condition-bei-projektloeschung`
  → **`UC (02/18): Race Condition bei Projektlöschung`**
- `uc-02-19-projekt-in-abhaengigen-sichten-anzeigen-quer-sicht-vertrag`
  → **`UC (02/19): Projekt in abhängigen Sichten anzeigen (Quer-Sicht-Vertrag)`**
- `uc-02-21-termin-fuer-projekt-ohne-termine-anlegen-ueber-kalendersicht`
  → **`UC (02/21): Termin für Projekt ohne Termine anlegen über Kalendersicht`**
- `uc-02-22-notiz-von-projekt-entfernen`
  → **`UC (02/22): Notiz von Projekt entfernen`**
- `uc-02-23-notiz-anpinnen-lospinnen`
  → **`UC (02/23): Notiz anpinnen / lospinnen`**
- `uc-02-24-projekt-aktivieren-deaktivieren`
  → **`UC (02/24): Projekt aktivieren / deaktivieren`**
- `UC 02/26: Auftragspositionen verwalten`
  → **`UC (02/26): Auftragspositionen verwalten`**

### FT(03): Kalenderansichten
- `uc-03-01-wochenkalender-anzeigen`
  → **`UC (03/01): Wochenkalender anzeigen`**
- `uc-03-02-zeitraum-wechseln`
  → **`UC (03/02): Zeitraum wechseln`**
- `uc-03-03-darstellungsgrad-der-wochenkacheln-umschalten`
  → **`UC (03/03): Darstellungsgrad der Wochenkacheln umschalten`**
- `uc-03-04-tour-lanes-aufklappen-oder-zuklappen`
  → **`UC (03/04): Tour-Lanes aufklappen oder zuklappen`**
- `uc-03-05-monatsuebersicht-anzeigen`
  → **`UC (03/05): Monatsübersicht anzeigen`**
- `uc-03-06-auslastungsansicht-eines-mitarbeiters-anzeigen`
  → **`UC (03/06): Auslastungsansicht eines Mitarbeiters anzeigen`**

### FT(04): Tourenplanung
- `uc-04-01-tour-anlegen`
  → **`UC (04/01): Tour anlegen`**
- `uc-04-02-tour-bearbeiten`
  → **`UC (04/02): Tour bearbeiten`**
- `uc-04-04-tour-loeschen`
  → **`UC (04/04): Tour löschen`**
- `uc-04-05-tourliste-anzeigen`
  → **`UC (04/05): Tourliste anzeigen`**
- `uc-04-06-kalenderdarstellung-nach-touraenderung-aktualisieren`
  → **`UC (04/06): Kalenderdarstellung nach Touränderung aktualisieren`**
- `uc-04-07-wochenuebersicht-nach-touraenderung-korrekt-ableiten`
  → **`UC (04/07): Wochenübersicht nach Touränderung korrekt ableiten`**
- `uc-04-09-parallele-bearbeitung-derselben-tour`
  → **`UC (04/09): Parallele Bearbeitung derselben Tour`**
- `uc-04-10-loeschkonflikt-bei-paralleler-terminzuordnung`
  → **`UC (04/10): Löschkonflikt bei paralleler Terminzuordnung`**
- `uc-04-12-kalenderwoche-einer-tour-anlegen`
  → **`UC (04/12): Kalenderwoche einer Tour anlegen`**
- `uc-04-13-mitarbeiter-einer-tour-kw-zuordnen`
  → **`UC (04/13): Mitarbeiter einer Tour-KW zuordnen`**
- `uc-04-14-mitarbeiter-aus-einer-tour-kw-entfernen`
  → **`UC (04/14): Mitarbeiter aus einer Tour-KW entfernen`**
- `UC 04/15: Tour-KW-Wochenplanung anzeigen und anwenden`
  → **`UC (04/15): Tour-KW-Wochenplanung anzeigen und anwenden`**
- `UC 04/16: Tour-KW blockieren und Termine parken`
  → **`UC (04/16): Tour-KW blockieren und Termine parken`**
- `UC 04/17: Tour-KW freigeben`
  → **`UC (04/17): Tour-KW freigeben`**

### FT(05): Mitarbeiterverwaltung
- `uc-05-01-mitarbeiter-anlegen`
  → **`UC (05/01): Mitarbeiter anlegen`**
- `uc-05-02-mitarbeiter-bearbeiten`
  → **`UC (05/02): Mitarbeiter bearbeiten`**
- `UC 05/03: Mitarbeiter-Termine anzeigen`
  → **`UC (05/03): Mitarbeiter-Termine anzeigen`**
- `uc-05-04-mitarbeiter-deaktivieren`
  → **`UC (05/04): Mitarbeiter deaktivieren`**
- `uc-05-05-mitarbeiter-reaktivieren`
  → **`UC (05/05): Mitarbeiter reaktivieren`**
- `UC 05/06: Mitarbeiteranhänge verwalten`
  → **`UC (05/06): Mitarbeiteranhänge verwalten`**
- `UC 05/07: Mitarbeiter anzeigen`
  → **`UC (05/07): Mitarbeiter anzeigen`**
- `uc-05-08-versionskonflikt-bei-paralleler-mitarbeiterbearbeitung`
  → **`UC (05/08): Versionskonflikt bei paralleler Mitarbeiterbearbeitung`**
- `uc-05-09-konflikt-bei-paralleler-deaktivierung-und-terminzuweisung`
  → **`UC (05/09): Konflikt bei paralleler Deaktivierung und Terminzuweisung`**
- `uc-05-10-loeschversuch-bei-bestehenden-terminreferenzen`
  → **`UC (05/10): Löschversuch bei bestehenden Terminreferenzen`**
- `uc-05-11-konflikt-bei-paralleler-reaktivierung-und-bearbeitung`
  → **`UC (05/11): Konflikt bei paralleler Reaktivierung und Bearbeitung`**
- `UC 05/12: Rollenverletzung bei API-Direktzugriff`
  → **`UC (05/12): Rollenverletzung bei API-Direktzugriff`**
- `uc-05-13-query-konsistenz-zwischen-listen-und-dialogansicht`
  → **`UC (05/13): Query-Konsistenz zwischen Listen- und Dialogansicht`**
- `uc-05-14-mitarbeiter-aus-csv-importieren`
  → **`UC (05/14): Mitarbeiter aus CSV importieren`**

### FT(06): Automatische Regeln
- `uc-06-00-termin-stornieren`
  → **`UC (06/00): Termin stornieren`**
- `uc-06-01-tag-anmerkungen-bei-projektbeschreibung-automatisch-setzen`
  → **`UC (06/01): Tag „Anmerkungen“ bei Projektbeschreibung automatisch setzen`**
- `uc-06-02-reklamationsnotiz-bei-reklamation-vorschlagen`
  → **`UC (06/02): Reklamationsnotiz bei Reklamation vorschlagen`**
- `uc-06-03-messe-workflow-bei-zuordnung-zur-tour-messe`
  → **`UC (06/03): Messe-Workflow bei Zuordnung zur Tour „Messe“`**
- `uc-06-04-termin-auf-parkplatz-setzen`
  → **`UC (06/04): Termin auf Parkplatz setzen`**
- `uc-06-05-wochenplanung-fuer-parkplatz-sperren`
  → **`UC (06/05): Wochenplanung für Parkplatz sperren`**
- `uc-06-06-zustand-geparkt-bei-wechsel-weg-von-parkplatz-automatisch-entfernen`
  → **`UC (06/06): Zustand „Geparkt“ bei Wechsel weg von Parkplatz automatisch entfernen`**

### FT(07): Automatisierte Datensicherung und Fallback
- `uc-07-03-pdf-anstehende-termine-erzeugen`
  → **`UC (07/03): PDF „Anstehende Termine“ erzeugen`**
- `UC 07/05: Backup-Historie einsehen`
  → **`UC (07/05): Backup-Historie einsehen`**
- `UC 07/06: Backup herunterladen`
  → **`UC (07/06): Backup herunterladen`**
- `uc-07-07-alte-backups-automatisch-loeschen`
  → **`UC (07/07): Alte Backups automatisch löschen`**
- `UC 07/08: Termin in externen Kalender übertragen`
  → **`UC (07/08): Termin in externen Kalender übertragen`**
- `UC 07/09: Synchronisationsfehler protokollieren`
  → **`UC (07/09): Synchronisationsfehler protokollieren`**
- `UC 07/10: Terminänderung im CalDAV-Kalender aktualisieren`
  → **`UC (07/10): Terminänderung im CalDAV-Kalender aktualisieren`**
- `UC 07/11: Termin im CalDAV-Kalender löschen`
  → **`UC (07/11): Termin im CalDAV-Kalender löschen`**
- `uc-07-12-db-dump-automatisch-erzeugen`
  → **`UC (07/12): DB-Dump automatisch erzeugen`**
- `uc-07-13-db-dump-herunterladen`
  → **`UC (07/13): DB-Dump herunterladen`**
- `UC 07/14: DB-Dump importieren`
  → **`UC (07/14): DB-Dump importieren`**

### FT(08): Journal / Änderungshistorie
- `uc-08-01-globales-journal-oeffnen`
  → **`UC (08/01): Globales Journal öffnen`**
- `uc-08-02-journal-filtern-und-durchsuchen`
  → **`UC (08/02): Journal filtern und durchsuchen`**
- `uc-08-03-kontextbezogenes-journal-in-einem-detailformular-lesen`
  → **`UC (08/03): Kontextbezogenes Journal in einem Detailformular lesen`**
- `uc-08-04-fachliche-aenderung-erzeugt-journal-eintrag`
  → **`UC (08/04): Fachliche Änderung erzeugt Journal-Eintrag`**
- `uc-08-05-journal-ohne-leseberechtigung-nicht-oeffnen`
  → **`UC (08/05): Journal ohne Leseberechtigung nicht öffnen`**

### FT(09): Kundenverwaltung
- `uc-09-01-kunde-anlegen`
  → **`UC (09/01): Kunde anlegen`**
- `uc-09-02-kunde-bearbeiten`
  → **`UC (09/02): Kunde bearbeiten`**
- `uc-09-03-kunde-anzeigen-inkl-terminliste`
  → **`UC (09/03): Kunde anzeigen inkl. Terminliste`**
- `uc-09-04-kunde-deaktivieren-archivieren`
  → **`UC (09/04): Kunde deaktivieren / archivieren`**
- `uc-09-06-kunde-reaktivieren`
  → **`UC (09/06): Kunde reaktivieren`**
- `UC 09/07: Kundenanhänge verwalten`
  → **`UC (09/07): Kundenanhänge verwalten`**
- `uc-09-08-versionskonflikt-bei-paralleler-kundenbearbeitung`
  → **`UC (09/08): Versionskonflikt bei paralleler Kundenbearbeitung`**
- `uc-09-09-statuskonflikt-bei-parallelem-bearbeiten-und-deaktivieren`
  → **`UC (09/09): Statuskonflikt bei parallelem Bearbeiten und Deaktivieren`**
- `UC 09/10: Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)`
  → **`UC (09/10): Parallelkonflikt bei Statuswechsel (Deaktivieren vs. Reaktivieren)`**
- `UC 09/11: Rollenabhängige Filterung von Kundenlisten`
  → **`UC (09/11): Rollenabhängige Filterung von Kundenlisten`**
- `uc-09-12-zugriff-auf-inaktiven-kunden-durch-disponent-blockieren`
  → **`UC (09/12): Zugriff auf inaktiven Kunden durch Disponent blockieren`**
- `uc-09-13-kunde-loeschen-ohne-referenzen`
  → **`UC (09/13): Kunde löschen ohne Referenzen`**
- `uc-09-14-kunde-loeschen-mit-referenzen-blockade`
  → **`UC (09/14): Kunde löschen mit Referenzen (Blockade)`**
- `UC 09/15: Konsistenz von Kundenlisten bei Statusänderung (Multi-Browser)`
  → **`UC (09/15): Konsistenz von Kundenlisten bei Statusänderung (Multi-Browser)`**
- `UC 09/16: Statusänderung des Kunden während Notiz- oder Attachment-Operation`
  → **`UC (09/16): Statusänderung des Kunden während Notiz- oder Attachment-Operation`**
- `uc-09-17-notiz-an-kunde-anlegen`
  → **`UC (09/17): Notiz an Kunde anlegen`**
- `uc-09-18-notiz-am-kunde-bearbeiten`
  → **`UC (09/18): Notiz am Kunde bearbeiten`**
- `uc-09-19-notiz-von-kunde-entfernen`
  → **`UC (09/19): Notiz von Kunde entfernen`**
- `uc-09-20-notizen-beim-kunde-loeschen-entfernen`
  → **`UC (09/20): Notizen beim Löschen des Kunden entfernen`**

### FT(11): Team Verwaltung
- `UC 11/01: Team anlegen`
  → **`UC (11/01): Team anlegen`**
- `UC 11/02: Team bearbeiten`
  → **`UC (11/02): Team bearbeiten`**
- `UC 11/03: Team löschen`
  → **`UC (11/03): Team löschen`**
- `UC 11/04: Team anzeigen`
  → **`UC (11/04): Team anzeigen`**

### FT(13): Notizverwaltung
- `uc-13-01-notiz-zu-projekt-hinzufuegen`
  → **`UC (13/01): Notiz zu Projekt hinzufügen`**
- `UC 13/02: Notiz zu Kunde hinzufügen`
  → **`UC (13/02): Notiz zu Kunde hinzufügen`**
- `UC 13/03: Notiz bearbeiten`
  → **`UC (13/03): Notiz bearbeiten`**
- `UC 13/04: Notiz löschen`
  → **`UC (13/04): Notiz löschen`**
- `UC 13/05: Notizen eines Projekts anzeigen`
  → **`UC (13/05): Notizen eines Projekts anzeigen`**
- `UC 13/06: Notizen eines Kunden anzeigen`
  → **`UC (13/06): Notizen eines Kunden anzeigen`**
- `UC 13/07: Notiz anpinnen / Pinning aufheben`
  → **`UC (13/07): Notiz anpinnen / Pinning aufheben`**
- `UC 13/08: Notizvorlage erstellen`
  → **`UC (13/08): Notizvorlage erstellen`**
- `UC 13/09: Notizvorlage bearbeiten`
  → **`UC (13/09): Notizvorlage bearbeiten`**
- `UC 13/10: Notizvorlage deaktivieren/aktivieren`
  → **`UC (13/10): Notizvorlage deaktivieren/aktivieren`**
- `UC 13/11: Notizvorlage löschen`
  → **`UC (13/11): Notizvorlage löschen`**
- `UC 13/12: Notizen bei zulässiger Projektlöschung kaskadierend entfernen`
  → **`UC (13/12): Notizen bei zulässiger Projektlöschung kaskadierend entfernen`**
- `UC 13/13: Wochen-Notiz anlegen`
  → **`UC (13/13): Wochen-Notiz anlegen`**
- `UC 13/14: Wochen-Notizen einer Kalenderwoche anzeigen`
  → **`UC (13/14): Wochen-Notizen einer Kalenderwoche anzeigen`**
- `UC 13/15: Wochen-Notiz bearbeiten`
  → **`UC (13/15): Wochen-Notiz bearbeiten`**
- `UC 13/16: Wochen-Notiz löschen`
  → **`UC (13/16): Wochen-Notiz löschen`**
- `UC 13/17: Wochen-Notizen in Druckausgabe der Kalenderwoche ausgeben`
  → **`UC (13/17): Wochen-Notizen in Druckausgabe der Kalenderwoche ausgeben`**
- `UC 13/18: Notiz zu Mitarbeiter hinzufügen`
  → **`UC (13/18): Notiz zu Mitarbeiter hinzufügen`**
- `UC 13/19: Notizen eines Mitarbeiters anzeigen`
  → **`UC (13/19): Notizen eines Mitarbeiters anzeigen`**
- `UC 13/20: Notiz zu Termin hinzufügen`
  → **`UC (13/20): Notiz zu Termin hinzufügen`**
- `UC 13/21: Notizen eines Termins anzeigen`
  → **`UC (13/21): Notizen eines Termins anzeigen`**

### FT(14): Benutzer- und Rollenverwaltung
- `uc-14-01-benutzer-anlegen`
  → **`UC (14/01): Benutzer anlegen`**
- `uc-14-02-rolle-eines-benutzers-aendern`
  → **`UC (14/02): Rolle eines Benutzers ändern`**
- `uc-14-03-unzulaessige-mutation-blockieren`
  → **`UC (14/03): Unzulässige Mutation blockieren`**
- `uc-14-04-letzten-admin-schuetzen`
  → **`UC (14/04): Letzten Admin schützen`**
- `uc-14-05-rollenabhaengige-ui-reduktion`
  → **`UC (14/05): Rollenabhängige UI-Reduktion`**
- `uc-14-06-deep-link-serverseitig-validieren`
  → **`UC (14/06): Deep-Link serverseitig validieren`**
- `uc-14-07-multi-browser-rollenaenderung-konsistent-darstellen`
  → **`UC (14/07): Multi-Browser-Rollenänderung konsistent darstellen`**

### FT(16): Hilfetexte verwalten
- `uc-16-01-hilfetext-anzeigen-kontextbezogen`
  → **`UC (16/01): Hilfetext anzeigen (kontextbezogen)`**
- `uc-16-02-hilfetext-anlegen`
  → **`UC (16/02): Hilfetext anlegen`**
- `uc-16-03-hilfetext-bearbeiten`
  → **`UC (16/03): Hilfetext bearbeiten`**
- `uc-16-04-hilfetext-aktivieren-deaktivieren`
  → **`UC (16/04): Hilfetext aktivieren / deaktivieren`**
- `uc-16-05-hilfetexte-durchsuchen-und-anzeigen`
  → **`UC (16/05): Hilfetexte durchsuchen und anzeigen`**
- `uc-16-06-hilfetext-loeschen`
  → **`UC (16/06): Hilfetext löschen`**
- `uc-16-07-versionskonflikt-bei-paralleler-bearbeitung-eines-hilfetextes`
  → **`UC (16/07): Versionskonflikt bei paralleler Bearbeitung eines Hilfetextes`**
- `uc-16-08-unberechtigter-zugriff-auf-hilfetext-verwaltung-verhindern`
  → **`UC (16/08): Unberechtigten Zugriff auf Hilfetext-Verwaltung verhindern`**
- `uc-16-09-hilfetexte-aus-datei-importieren`
  → **`UC (16/09): Hilfetexte aus Datei importieren`**
- `uc-16-10-hilfetexte-in-datei-exportieren`
  → **`UC (16/10): Hilfetexte in Datei exportieren`**

### FT(18): User Preferences
- `uc-18-01-persoenliche-einstellung-aendern`
  → **`UC (18/01): Persönliche Einstellung ändern`**
- `uc-18-02-persoenliche-einstellung-auf-standardwert-zuruecksetzen`
  → **`UC (18/02): Persönliche Einstellung auf Standardwert zurücksetzen`**
- `uc-18-03-unberechtigten-zugriff-auf-persoenliche-einstellungen-verhindern`
  → **`UC (18/03): Unberechtigten Zugriff auf persönliche Einstellungen verhindern`**
- `uc-18-04-versionskonflikt-bei-paralleler-aenderung-persoenlicher-einstellungen`
  → **`UC (18/04): Versionskonflikt bei paralleler Änderung persönlicher Einstellungen`**

### FT(19): Attachments
- `UC 19/01: Attachment hochladen`
  → **`UC (19/01): Attachment hochladen`**
- `UC 19/02: Attachmentliste anzeigen`
  → **`UC (19/02): Attachmentliste anzeigen`**
- `UC 19/03: Attachment öffnen (Inline-Anzeige)`
  → **`UC (19/03): Attachment öffnen (Inline-Anzeige)`**
- `UC 19/04: Attachment herunterladen`
  → **`UC (19/04): Attachment herunterladen`**
- `UC 19/05: Attachment-Upload validieren (Größe / Typ)`
  → **`UC (19/05): Attachment-Upload validieren (Größe / Typ)`**
- `UC 19/06: Lösch-Workflow initiieren (Action Button)`
  → **`UC (19/06): Lösch-Workflow initiieren (Action Button)`**
- `UC 19/07: Verhalten bei Löschung eines Parent-Objekts`
  → **`UC (19/07): Verhalten bei Löschung eines Parent-Objekts`**
- `UC 19/08: Serverseitige Berechtigungsprüfung bei Attachment-Zugriff`
  → **`UC (19/08): Serverseitige Berechtigungsprüfung bei Attachment-Zugriff`**
- `UC 19/09: Attachment an Termin verwalten`
  → **`UC (19/09): Attachment an Termin verwalten`**
- `UC 19/10: Attachment-Duplikat entfernen`
  → **`UC (19/10): Attachment-Duplikat entfernen`**

### FT(20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung
- `UC 20/01: Unzulässige Aktion wird blockiert`
  → **`UC (20/01): Unzulässige Aktion wird blockiert`**
- `UC 20/02: Rollenabhängige Navigation anzeigen`
  → **`UC (20/02): Rollenabhängige Navigation anzeigen`**
- `uc-20-03-admin-verwaltet-benutzerrollen`
  → **`UC (20/03): Admin verwaltet Benutzerrollen`**

### FT(21): Dokumentenextraktion
- `uc-21-01-dokumentextraktion-starten`
  → **`UC (21/01): Dokumentextraktion starten`**
- `uc-21-02-extrahierte-daten-bestaetigen`
  → **`UC (21/02): Extrahierte Daten bestätigen`**
- `uc-21-03-ungeeignetes-dokument-behandeln`
  → **`UC (21/03): Ungeeignetes Dokument behandeln`**
- `uc-21-04-kategorisierung-schlaegt-fehl`
  → **`UC (21/04): Kategorisierung schlägt fehl`**
- `uc-21-05-dokumentextraktion-im-formular-neues-projekt-starten`
  → **`UC (21/05): Dokumentextraktion im Formular „Neues Projekt“ starten`**
- `uc-21-06-dokumentextraktion-im-formular-neuer-termin-starten`
  → **`UC (21/06): Dokumentextraktion im Formular „Neuer Termin“ starten`**
- `uc-21-07-kundendaten-uebernehmen-scope-neues-projekt`
  → **`UC (21/07): Kundendaten übernehmen (Scope „Neues Projekt“)`**
- `uc-21-08-kundendaten-uebernehmen-scope-neuer-termin`
  → **`UC (21/08): Kundendaten übernehmen (Scope „Neuer Termin“)`**
- `uc-21-09-projekt-uebernehmen-scope-neues-projekt`
  → **`UC (21/09): Projekt übernehmen (Scope „Neues Projekt“)`**
- `uc-21-10-projekt-uebernehmen-scope-neuer-termin`
  → **`UC (21/10): Projekt übernehmen (Scope „Neuer Termin“)`**
- `uc-21-11-extraktionsvorgang-abbrechen`
  → **`UC (21/11): Extraktionsvorgang abbrechen`**
- `uc-21-12-extraktion-bei-bestehendem-kunden-im-termin-kontext`
  → **`UC (21/12): Extraktion bei bestehendem Kunden im Termin-Kontext`**
- `uc-21-13-wiederholte-extraktion-desselben-dokuments`
  → **`UC (21/13): Wiederholte Extraktion desselben Dokuments`**
- `uc-21-14-extraktion-bei-zwischenzeitlich-geloeschtem-parent-objekt`
  → **`UC (21/14): Extraktion bei zwischenzeitlich gelöschtem Parent-Objekt`**
- `uc-21-17-extrahiertes-pdf-als-projekt-attachment-verknuepfen`
  → **`UC (21/17): Extrahiertes PDF als Projekt-Attachment verknüpfen`**
- `UC 21/18: Dokumentextraktion im Formular „Neuer Kunde“ starten`
  → **`UC (21/18): Dokumentextraktion im Formular „Neuer Kunde“ starten`**

### FT(26): Auswertungen und Reports
- `UC 26/01: Vorlaufliste konfigurieren und erzeugen`
  → **`UC (26/01): Vorlaufliste konfigurieren und erzeugen`**
- `uc-26-02-bis-datum-nachtraeglich-entfernen`
  → **`UC (26/02): Bis-Datum nachträglich entfernen`**
- `UC 26/03: Produktionsplanung konfigurieren und erzeugen`
  → **`UC (26/03): Produktionsplanung konfigurieren und erzeugen`**
- `uc-26-04-datumsspanne-in-der-produktionsplanung-nachtraeglich-anpassen`
  → **`UC (26/04): Datumsspanne in der Produktionsplanung nachträglich anpassen`**
- `uc-26-05-produktionsplanung-drucken`
  → **`UC (26/05): Produktionsplanung drucken`**
- `UC 26/06: Auftragsliste konfigurieren und erzeugen`
  → **`UC (26/06): Auftragsliste konfigurieren und erzeugen`**
- `uc-26-07-auftragsliste-drucken`
  → **`UC (26/07): Auftragsliste drucken`**
- `UC 26/08: Tourenplan konfigurieren und erzeugen`
  → **`UC (26/08): Tourenplan konfigurieren und erzeugen`**
- `uc-26-09-tourenplan-drucken`
  → **`UC (26/09): Tourenplan drucken`**
- `UC 26/10: Report-Preset speichern und ausführen`
  → **`UC (26/10): Report-Preset speichern und ausführen`**

### FT(27): Produktverwaltung und Auftragspositionen
- `uc-27-01-produktkategorie-anlegen-admin`
  → **`UC (27/01): Produktkategorie anlegen (Admin)`**
- `uc-27-02-produkt-anlegen-admin`
  → **`UC (27/02): Produkt anlegen (Admin)`**
- `uc-27-03-komponentenkategorie-anlegen-admin`
  → **`UC (27/03): Komponentenkategorie anlegen (Admin)`**
- `uc-27-04-komponente-anlegen-admin`
  → **`UC (27/04): Komponente anlegen (Admin)`**
- `uc-27-05-auftragsposition-manuell-erfassen-disponent-admin`
  → **`UC (27/05): Auftragsposition manuell erfassen (Disponent / Admin)`**
- `uc-27-06-auftragsposition-bearbeiten-disponent-admin`
  → **`UC (27/06): Auftragsposition bearbeiten (Disponent / Admin)`**
- `uc-27-07-auftragsposition-loeschen-admin`
  → **`UC (27/07): Auftragsposition löschen (Admin)`**
- `UC 27/08: Detailseite anzeigen (Produkt / Komponente)`
  → **`UC (27/08): Detailseite anzeigen (Produkt / Komponente)`**
- `UC 27/09: Attachment an Produkt oder Komponente hochladen (Admin)`
  → **`UC (27/09): Attachment an Produkt oder Komponente hochladen (Admin)`**
- `UC 27/10: Attachment an Produkt oder Komponente löschen (Admin)`
  → **`UC (27/10): Attachment an Produkt oder Komponente löschen (Admin)`**

### FT(28): Universelles Tagging-System
- `uc-28-01-tag-anlegen`
  → **`UC (28/01): Tag anlegen`**
- `uc-28-02-tag-bearbeiten`
  → **`UC (28/02): Tag bearbeiten`**
- `uc-28-03-tag-loeschen`
  → **`UC (28/03): Tag löschen`**
- `uc-28-04-tag-an-domaenenobjekt-zuweisen`
  → **`UC (28/04): Tag an Domänenobjekt zuweisen`**
- `uc-28-05-tag-zuweisung-entfernen`
  → **`UC (28/05): Tag-Zuweisung entfernen`**
- `uc-28-06-domaenenspezifische-system-tag-filterung-im-picker`
  → **`UC (28/06): Domänenspezifische System-Tag-Filterung im Picker`**
- `uc-28-07-termin-stornieren-storniert-tag-ueber-workflow-setzen`
  → **`UC (28/07): Termin stornieren – Storniert-Tag über Workflow setzen`**

### FT(29): Zwei-Faktor-Authentisierung mit Google Authenticator
- `UC 29/01: 2FA beim Login konfigurieren (erzwungen)`
  → **`UC (29/01): 2FA beim Login konfigurieren (erzwungen)`**
- `UC 29/02: Mit Google Authenticator einloggen`
  → **`UC (29/02): Mit Google Authenticator einloggen`**
- `UC 29/03: Google Authenticator deaktivieren (Admin-Funktion)`
  → **`UC (29/03): Google Authenticator deaktivieren (Admin-Funktion)`**
- `UC 29/04: Geheimnis regenerieren (Admin-Funktion)`
  → **`UC (29/04): Geheimnis regenerieren (Admin-Funktion)`**

### FT(31): Dispositions-Monitoring (Konflikte)
- `uc-31-01-monitoring-hinweis-beim-login`
  → **`UC (31/01): Monitoring-Hinweis beim Login`**
- `uc-31-02-monitoring-ansicht-aufrufen`
  → **`UC (31/02): Monitoring-Ansicht aufrufen`**
- `uc-31-03-trigger-konfigurieren`
  → **`UC (31/03): Trigger konfigurieren`**

### FT(32): Aktive Änderungsbenachrichtigung
- `uc-32-01-sse-verbindung-aufbauen`
  → **`UC (32/01): SSE-Verbindung aufbauen`**
- `uc-32-02-aenderungsereignis-empfangen-und-hinweis-anzeigen`
  → **`UC (32/02): Änderungsereignis empfangen und Hinweis anzeigen`**
- `uc-32-03-verbindung-nach-unterbrechung-wiederherstellen`
  → **`UC (32/03): Verbindung nach Unterbrechung wiederherstellen`**
- `uc-32-04-session-ende-verbindung-schliessen`
  → **`UC (32/04): Session-Ende – Verbindung schließen`**

### FT(33): Abwesenheiten über interne Personalplanung
- `uc-33-01-abwesenheiten-anzeigen`
  → **`UC (33/01): Abwesenheiten anzeigen`**
- `UC 33/02: Abwesenheit anlegen`
  → **`UC (33/02): Abwesenheit anlegen`**
- `uc-33-03-abwesenheit-bearbeiten`
  → **`UC (33/03): Abwesenheit bearbeiten`**
- `uc-33-04-abwesenheit-loeschen`
  → **`UC (33/04): Abwesenheit löschen`**
- `uc-33-05-einplanung-mit-abwesendem-mitarbeiter-verhindern`
  → **`UC (33/05): Einplanung mit abwesendem Mitarbeiter verhindern`**

### FT(34): Kalendermarker, Feiertage und Betriebsferien
- `uc-34-01-kalendermarker-im-kalender-anzeigen`
  → **`UC (34/01): Kalendermarker im Kalender anzeigen`**
- `uc-34-02-feiertage-und-betriebsmarker-verwalten`
  → **`UC (34/02): Feiertage und Betriebsmarker verwalten`**
- `uc-34-03-gesetzliche-feiertage-automatisch-seeden`
  → **`UC (34/03): Gesetzliche Feiertage automatisch seeden`**
- `uc-34-04-marker-deaktivieren-und-reaktivieren`
  → **`UC (34/04): Marker deaktivieren und reaktivieren`**
- `uc-34-05-visualisierungsstil-global-waehlen`
  → **`UC (34/05): Visualisierungsstil global wählen`**
- `uc-34-06-unberechtigte-marker-pflege-blockieren`
  → **`UC (34/06): Unberechtigte Marker-Pflege blockieren`**

### FT(35): Zentrale Konfliktbehandlung für Termine und Ressourcen
- `MP-12: Termin per Drag-and-drop innerhalb derselben Woche und derselben Tour verschieben`
  → **`UC (35/12): Termin per Drag-and-drop innerhalb derselben Woche und derselben Tour verschieben`**
- `MP-13: Termin per Drag-and-drop innerhalb derselben Woche in eine andere Tour verschieben`
  → **`UC (35/13): Termin per Drag-and-drop innerhalb derselben Woche in eine andere Tour verschieben`**
- `MP-14: Termin per Drag-and-drop in eine andere Woche innerhalb derselben Tour verschieben`
  → **`UC (35/14): Termin per Drag-and-drop in eine andere Woche innerhalb derselben Tour verschieben`**
- `MP-15: Termin per Drag-and-drop in eine andere Woche und eine andere Tour verschieben`
  → **`UC (35/15): Termin per Drag-and-drop in eine andere Woche und eine andere Tour verschieben`**
- `MP-16: Termin im Monatskalender verschieben`
  → **`UC (35/16): Termin im Monatskalender verschieben`**
- `MP-17: Termin ausschneiden und an anderer Stelle einfügen`
  → **`UC (35/17): Termin ausschneiden und an anderer Stelle einfügen`**
- `MP-18: Termin von der Parkplatztour auf eine reguläre Tour zurückführen`
  → **`UC (35/18): Termin von der Parkplatztour auf eine reguläre Tour zurückführen`**
- `MP-19: Termin auf die Parkplatztour verschieben`
  → **`UC (35/19): Termin auf die Parkplatztour verschieben`**
- `MP-20: Termin stornieren`
  → **`UC (35/20): Termin stornieren`**
- `MP-21: Reklamationsstatus setzen oder aufheben`
  → **`UC (35/21): Reklamationsstatus setzen oder aufheben`**
- `MP-22: Termin löschen`
  → **`UC (35/22): Termin löschen`**
- `MP-23: Stornierung aufheben, sofern fachlich vorgesehen`
  → **`UC (35/23): Stornierung aufheben, sofern fachlich vorgesehen`**
- `MP-24: Gelöschten Termin wiederherstellen, sofern fachlich vorgesehen`
  → **`UC (35/24): Gelöschten Termin wiederherstellen, sofern fachlich vorgesehen`**
- `MP-25: Mitarbeiter in eine Tour-Kalenderwoche aufnehmen und auf Termine ausrollen`
  → **`UC (35/25): Mitarbeiter in eine Tour-Kalenderwoche aufnehmen und auf Termine ausrollen`**
- `MP-26: Mitarbeiter aus einer Tour-Kalenderwoche entfernen`
  → **`UC (35/26): Mitarbeiter aus einer Tour-Kalenderwoche entfernen`**
- `MP-27: Vorhandene Wochenplanung auf ausgewählte Termine anwenden`
  → **`UC (35/27): Vorhandene Wochenplanung auf ausgewählte Termine anwenden`**
- `MP-28: Tour-Kalenderwoche blockieren und betroffene Termine parken`
  → **`UC (35/28): Tour-Kalenderwoche blockieren und betroffene Termine parken`**
- `MP-29: Blockierte Tour-Kalenderwoche wieder freigeben`
  → **`UC (35/29): Blockierte Tour-Kalenderwoche wieder freigeben`**
- `MP-30: Vorgeplante Mitarbeiter bei einem Tour- oder Wochenwechsel übernehmen`
  → **`UC (35/30): Vorgeplante Mitarbeiter bei einem Tour- oder Wochenwechsel übernehmen`**
- `MP-31: Abwesenheit anlegen`
  → **`UC (35/31): Abwesenheit anlegen`**
- `MP-32: Abwesenheit ändern`
  → **`UC (35/32): Abwesenheit ändern`**
- `MP-33: Abwesenheit löschen`
  → **`UC (35/33): Abwesenheit löschen`**
- `MP-34: Mitarbeiter wegen einer Abwesenheit aus überschneidenden Terminen und Wochenplanungen entfernen`
  → **`UC (35/34): Mitarbeiter wegen einer Abwesenheit aus überschneidenden Terminen und Wochenplanungen entfernen`**
- `MP-35: System-Tags und Statusfolgen automatisch anpassen`
  → **`UC (35/35): System-Tags und Statusfolgen automatisch anpassen`**
- `MP-36: Terminänderung an den externen Kalender übertragen`
  → **`UC (35/36): Terminänderung an den externen Kalender übertragen`**