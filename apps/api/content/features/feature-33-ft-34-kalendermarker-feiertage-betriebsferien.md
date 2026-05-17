# FT (34): Kalendermarker, Feiertage und Betriebsferien

## Metadaten

- Status: Abgeschlossen
- Typ: Feature

## Ziel / Zweck

Dieses Feature beschreibt Kalendermarker als eigenständige, nicht planungswirksame Zusatzinformationen für die Kalenderansichten. Dazu gehören gesetzliche Feiertage, Betriebsfeiertage und Betriebsferien.

Ziel ist es, kalendarisch relevante Tage sichtbar zu machen, ohne daraus Termine, Mitarbeiterabwesenheiten, Konflikte, Locks, Reporteffekte oder Terminmutationen abzuleiten. Kalendermarker dienen der Orientierung in Wochen- und Monatskalender und können durch Administratoren und Disponenten gepflegt werden.

## Fachliche Beschreibung

Kalendermarker sind gespeicherte Markierungen auf einem Datum oder Zeitraum. Sie stehen fachlich neben Terminen und werden nicht als Termin modelliert.

Es gibt drei Markerarten:

- **Gesetzlicher Feiertag**: automatisch berechneter Feiertag mit bundesweiter oder regionaler Geltung.
- **Betriebsfeiertag**: firmenweiter einzelner Schließtag.
- **Betriebsferien**: firmenweiter Zeitraum.

Gesetzliche Feiertage werden über einen Seed aus der Feiertagsberechnung erzeugt und anschließend im Kalendermarker-Bestand gespeichert. Die Anzeige im Kalender liest ausschließlich gespeicherte, aktive Marker. Eine Live-Berechnung in der Kalenderanzeige findet nicht statt.

Der automatische Seed kann über zwei technische Auslöser laufen: über den System-Seed und zusätzlich nach dem ersten erfolgreichen Admin-Login eines Tages. Mehrere spätere Admin-Logins am selben Tag lösen keinen weiteren Tages-Seed aus.

Administratoren und Disponenten können gespeicherte Marker bearbeiten, deaktivieren, reaktivieren und löschen. Editierte Marker haben Vorrang vor dem automatischen Sollzustand. Ein Seed darf bestehende Marker nicht überschreiben, wenn sie anhand ihrer fachlichen Identität bereits vorhanden sind.

Die Visualisierung der Marker ist global konfigurierbar. Es gibt die Stile **Dezent**, **Standard** und **Hervorgehoben**. Die Stile verändern nur die Intensität der Darstellung, nicht die fachliche Bedeutung des Markers.

Die Markeranzeige folgt in den Kalenderansichten einer kontextbezogenen Darstellung. Im Wochenkalender wird der betroffene Tag als durchgehende Spalte über alle sichtbaren Tour-Lanes markiert. Im Monatskalender wird die volle Tageskachel markiert. Die textliche Markeranzeige wird im Kopf des Tages gezeigt und verwendet abhängig vom Platz entweder den vollen Namen, einen kompakten Platzhalter oder ein Icon. In kompakten Varianten bleibt der vollständige Markername per Hover erreichbar.

## Regeln & Randbedingungen

**R-01 Keine Terminwirkung**

Kalendermarker sind keine Termine. Sie erzeugen keine Mitarbeiterzuweisungen, keine Terminüberschneidungen, keine Sperren, keine Abwesenheiten, keine Projekt- oder Kundenbezüge und keine Reporteffekte.

**R-02 Persistenz vor Berechnung**

Die Kalenderanzeige verwendet gespeicherte Marker. Automatisch berechnete gesetzliche Feiertage werden vorab in den gespeicherten Bestand geseedet.

**R-03 Seed-Zeitraum**

Der automatische Feiertags-Seed erzeugt Marker für das aktuelle Jahr bis einschließlich aktuelles Jahr plus fünf Jahre.

**R-03a Seed-Auslöser**

Der automatische Feiertags-Seed wird über den System-Seed sowie nach dem ersten erfolgreichen Admin-Login eines Tages ausgelöst. Nicht-Admin-Logins dürfen keinen Feiertags-Seed starten.

**R-04 Seed-Idempotenz**

Ein Seed erkennt bestehende gesetzliche Feiertage über Datum, Typ, Quelle, Geltung und Bundesländer. Existiert ein Marker mit dieser fachlichen Identität bereits, wird er nicht überschrieben.

**R-05 Editierte Daten haben Vorrang**

Name, Notiz, Aktiv-Status und Version eines bestehenden Markers bleiben bei späteren Seeds erhalten.

**R-06 Aktiv-Status steuert Kalenderanzeige**

Nur aktive Marker erscheinen im Kalender-Leseendpunkt und damit in Wochen- und Monatskalender. Deaktivierte Marker bleiben im Admin-Bestand sichtbar.

**R-07 Rollen**

Kalenderlesen ist für Administratoren, Disponenten und Leser erlaubt. Pflege von Markern sowie Änderung des globalen Visualisierungsstils ist für Administratoren und Disponenten erlaubt und serverseitig abzusichern. Leser dürfen Marker ausschließlich lesen.

**R-08 Visualisierung**

Gesetzliche Feiertage werden rot, Betriebsfeiertage grün und Betriebsferien blau dargestellt. Die globale Stilauswahl steuert nur die Farbintensität.

**R-09 Primärmarker pro Tag**

Sind an einem Tag mehrere Marker aktiv, zeigt die kompakte Kalenderdarstellung nur einen Primärmarker sichtbar im Tageskopf. Die vollständige Markerinformation bleibt über Hover erreichbar.

**R-10 Monatskopf ohne Zusatzzeile**

Im Monatskalender darf die Markerbeschriftung keine zusätzliche Zeile unterhalb des Tageskopfs erzeugen. Die Darstellung muss im bestehenden Kopfbereich der Tageskachel bleiben, damit die Grid-Logik stabil bleibt.