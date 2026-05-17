# FT (27): Produktverwaltung und Auftragspositionen

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Produkte (Saunamodelle) und ihre Komponenten (Bauteile/Varianten) werden als strukturierte Stammdaten mit optionalen Spezifikationen erfasst und gepflegt. Damit werden Auftragspositionen präzise referenzierbar, statt nur Freitextbeschreibungen zu verwenden. Admin-Benutzer verwalten die Produktkatalogdaten, Disponenten nutzen diese zum Erfassen von Auftragspositionen.

## Fachliche Beschreibung

### Produkte und Produktkategorien

Ein **Produkt** repräsentiert ein fertiges Saunamodell (z.B. Kolmikko, Suuri, Mini). Jedes Produkt wird genau einer **Produktkategorie** zugeordnet (z.B. "Sauna-Modelle", "Zubehör"). Produkte haben einen eindeutigen Namen, eine optionale Beschreibung und ein Aktivitätskennzeichen. Nur Admins können Produkte anlegen, bearbeiten oder deaktivieren.

### Komponenten und Komponentenkategorien

Eine **Komponente** ist ein eigenständiges Bauteil (z.B. Rückwand, Ofen, Vorderwand, Fenster, Türen). Jede Komponente wird genau einer **Komponentenkategorie** zugeordnet (z.B. "Wände", "Heizung", "Türen") und kann eine optionale Beschreibung haben. Komponenten und Produkte sind voneinander unabhängige Stammdatenbereiche ohne strukturelle Verknüpfung.

### Detailseiten und Attachments

Für jedes Produkt und jede Komponente steht eine Detailseite bereit, die alle Stammdatenfelder strukturiert darstellt. Die Detailseite ist für Administrator und Disponent sichtbar.

Produkte und Komponenten können Attachments erhalten (z. B. technische Zeichnungen, Aufstellungspläne, Montageanleitungen). Die Attachment-Infrastruktur entspricht vollständig FT-19. Attachments sind immer genau einem Parent-Objekt zugeordnet (Produkt oder Komponente) und können nicht ohne Parent existieren.

### Integration mit Auftragsmanagement

Auftragspositionen (`project_order_items`) werden pro Projekt verwaltet, um eine Artikelliste pflegen zu können. Eine Position referenziert entweder ein Produkt oder eine Komponente — beide Felder sind unabhängig voneinander wählbar (kein Cascade-Dropdown). Mindestens eines von beiden muss gesetzt sein. Eine optionale freie Beschreibung kann zusätzlich angegeben werden. Die Zuordnung erfolgt strukturiert über Foreign Keys, nicht als Freitextbeschreibung.

## Regeln & Randbedingungen

### Detailseiten

- Jedes Produkt und jede Komponente besitzt eine Detailseite.
- Die Detailseite zeigt alle gespeicherten Stammdatenfelder sowie die zugehörige Attachmentliste.
- Sichtbarkeit: Administrator und Disponent.

### Attachments

- Produkte und Komponenten können beliebig viele Attachments erhalten.
- Es existieren je eine eigene Attachment-Tabelle für Produkte (`product_attachments`) und Komponenten (`component_attachments`).
- Upload und Löschen sind ausschließlich Administratoren vorbehalten.
- Download ist für Administrator und Disponent erlaubt.
- Der Lösch-Workflow folgt dem zweistufigen Verfahren aus FT-19 (Entkopplung und physische Löschung) mit identischer Sicherheitsfrage.
- Alle weiteren Regeln zu Upload, Speicherung, Download und Sicherheit gelten wie in FT-19 definiert.

### Namensuniqueness und Eindeutigkeit

- Produktnamen sind global eindeutig (UNIQUE).
- Komponentennamen sind global eindeutig (UNIQUE).
- Kategorienamen sind eindeutig innerhalb ihres Typs.

### Kategorien

- Jedes Produkt muss genau einer Produktkategorie zugeordnet sein.
- Jede Komponente muss genau einer Komponentenkategorie zugeordnet sein.
- Kategorien sind pflegende Stammdaten (Admin-Only).

### Lebenszyklus und Deaktivierung

- Inaktive Produkte, Komponenten und Kategorien werden nicht gelöscht, sondern über `is_active = false` deaktiviert.
- Deaktivierte Stammdaten werden in Auswahlfeldern nicht mehr angeboten.
- Historische Auftragspositionen, die auf inaktive Stammdaten verweisen, bleiben konsistent referenzierbar.
- Löschen ist blockiert, solange aktive Referenzen existieren (z.B. Auftragspositionen, die eine Komponente nutzen).

### Berechtigungen

- **Admins:** Volle Mutations- und Löschrechte auf Kategorien, Produkte und Komponenten.
- **Disponenten:** Lesezugriff auf alle Stammdaten. Keine Mutations- oder Löschrechte.
- Serverseitige Berechtigungsprüfung ist verpflichtend; UI-seitige Beschränkung reicht nicht.

### Referenzintegrität

- Beim Löschen eines Produkts oder einer Komponente wird geprüft, ob noch aktive Auftragspositionen darauf verweisen; wenn ja, wird das Löschen blockiert.