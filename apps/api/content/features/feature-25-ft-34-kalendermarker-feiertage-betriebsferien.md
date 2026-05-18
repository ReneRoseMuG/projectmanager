<h1>FT (34): Kalendermarker, Feiertage und Betriebsferien</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<p>Dieses Feature beschreibt Kalendermarker als eigenständige, nicht planungswirksame Zusatzinformationen für die Kalenderansichten. Dazu gehören gesetzliche Feiertage, Betriebsfeiertage und Betriebsferien.</p>
<p>Ziel ist es, kalendarisch relevante Tage sichtbar zu machen, ohne daraus Termine, Mitarbeiterabwesenheiten, Konflikte, Locks, Reporteffekte oder Terminmutationen abzuleiten. Kalendermarker dienen der Orientierung in Wochen- und Monatskalender und können durch Administratoren und Disponenten gepflegt werden.</p>
<h2>Fachliche Beschreibung</h2>
<p>Kalendermarker sind gespeicherte Markierungen auf einem Datum oder Zeitraum. Sie stehen fachlich neben Terminen und werden nicht als Termin modelliert.</p>
<p>Es gibt drei Markerarten:</p>
<ul><li><strong>Gesetzlicher Feiertag</strong>: automatisch berechneter Feiertag mit bundesweiter oder regionaler Geltung.</li><li><strong>Betriebsfeiertag</strong>: firmenweiter einzelner Schließtag.</li><li><strong>Betriebsferien</strong>: firmenweiter Zeitraum.</li></ul>
<p>Gesetzliche Feiertage werden über einen Seed aus der Feiertagsberechnung erzeugt und anschließend im Kalendermarker-Bestand gespeichert. Die Anzeige im Kalender liest ausschließlich gespeicherte, aktive Marker. Eine Live-Berechnung in der Kalenderanzeige findet nicht statt.</p>
<p>Der automatische Seed kann über zwei technische Auslöser laufen: über den System-Seed und zusätzlich nach dem ersten erfolgreichen Admin-Login eines Tages. Mehrere spätere Admin-Logins am selben Tag lösen keinen weiteren Tages-Seed aus.</p>
<p>Administratoren und Disponenten können gespeicherte Marker bearbeiten, deaktivieren, reaktivieren und löschen. Editierte Marker haben Vorrang vor dem automatischen Sollzustand. Ein Seed darf bestehende Marker nicht überschreiben, wenn sie anhand ihrer fachlichen Identität bereits vorhanden sind.</p>
<p>Die Visualisierung der Marker ist global konfigurierbar. Es gibt die Stile <strong>Dezent</strong>, <strong>Standard</strong> und <strong>Hervorgehoben</strong>. Die Stile verändern nur die Intensität der Darstellung, nicht die fachliche Bedeutung des Markers.</p>
<p>Die Markeranzeige folgt in den Kalenderansichten einer kontextbezogenen Darstellung. Im Wochenkalender wird der betroffene Tag als durchgehende Spalte über alle sichtbaren Tour-Lanes markiert. Im Monatskalender wird die volle Tageskachel markiert. Die textliche Markeranzeige wird im Kopf des Tages gezeigt und verwendet abhängig vom Platz entweder den vollen Namen, einen kompakten Platzhalter oder ein Icon. In kompakten Varianten bleibt der vollständige Markername per Hover erreichbar.</p>
<h2>Regeln &amp; Randbedingungen</h2>
<p><strong>R-01 Keine Terminwirkung</strong></p>
<p>Kalendermarker sind keine Termine. Sie erzeugen keine Mitarbeiterzuweisungen, keine Terminüberschneidungen, keine Sperren, keine Abwesenheiten, keine Projekt- oder Kundenbezüge und keine Reporteffekte.</p>
<p><strong>R-02 Persistenz vor Berechnung</strong></p>
<p>Die Kalenderanzeige verwendet gespeicherte Marker. Automatisch berechnete gesetzliche Feiertage werden vorab in den gespeicherten Bestand geseedet.</p>
<p><strong>R-03 Seed-Zeitraum</strong></p>
<p>Der automatische Feiertags-Seed erzeugt Marker für das aktuelle Jahr bis einschließlich aktuelles Jahr plus fünf Jahre.</p>
<p><strong>R-03a Seed-Auslöser</strong></p>
<p>Der automatische Feiertags-Seed wird über den System-Seed sowie nach dem ersten erfolgreichen Admin-Login eines Tages ausgelöst. Nicht-Admin-Logins dürfen keinen Feiertags-Seed starten.</p>
<p><strong>R-04 Seed-Idempotenz</strong></p>
<p>Ein Seed erkennt bestehende gesetzliche Feiertage über Datum, Typ, Quelle, Geltung und Bundesländer. Existiert ein Marker mit dieser fachlichen Identität bereits, wird er nicht überschrieben.</p>
<p><strong>R-05 Editierte Daten haben Vorrang</strong></p>
<p>Name, Notiz, Aktiv-Status und Version eines bestehenden Markers bleiben bei späteren Seeds erhalten.</p>
<p><strong>R-06 Aktiv-Status steuert Kalenderanzeige</strong></p>
<p>Nur aktive Marker erscheinen im Kalender-Leseendpunkt und damit in Wochen- und Monatskalender. Deaktivierte Marker bleiben im Admin-Bestand sichtbar.</p>
<p><strong>R-07 Rollen</strong></p>
<p>Kalenderlesen ist für Administratoren, Disponenten und Leser erlaubt. Pflege von Markern sowie Änderung des globalen Visualisierungsstils ist für Administratoren und Disponenten erlaubt und serverseitig abzusichern. Leser dürfen Marker ausschließlich lesen.</p>
<p><strong>R-08 Visualisierung</strong></p>
<p>Gesetzliche Feiertage werden rot, Betriebsfeiertage grün und Betriebsferien blau dargestellt. Die globale Stilauswahl steuert nur die Farbintensität.</p>
<p><strong>R-09 Primärmarker pro Tag</strong></p>
<p>Sind an einem Tag mehrere Marker aktiv, zeigt die kompakte Kalenderdarstellung nur einen Primärmarker sichtbar im Tageskopf. Die vollständige Markerinformation bleibt über Hover erreichbar.</p>
<p><strong>R-10 Monatskopf ohne Zusatzzeile</strong></p>
<p>Im Monatskalender darf die Markerbeschriftung keine zusätzliche Zeile unterhalb des Tageskopfs erzeugen. Die Darstellung muss im bestehenden Kopfbereich der Tageskachel bleiben, damit die Grid-Logik stabil bleibt.</p>