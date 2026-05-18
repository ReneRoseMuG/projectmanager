<h1>UC 02/07: Projekte anzeigen (Liste)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent, Leser</p>
<h2>Ziel</h2>
<p>Eine für die tägliche Arbeit passende Projektliste einsehen und bei Bedarf filtern oder auf andere Grundmengen umschalten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt mindestens Leserechte gemäß seiner Rolle.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Projektübersicht.<br>2. Das System lädt standardmäßig die Grundmenge „Aktuelle Projekte&quot; (mindestens ein Termin mit Startdatum ≥ heute), paginiert.<br>3. Jeder Listeneintrag zeigt: Titel, Kunde, Auftragsnummer, Anzahl Notizen, Anzahl Anhänge, nächste Termininformation, Tags.<br>4. Bei mehreren Terminen zeigt das System den nächsten Termin ab heute.<br>5. Der Akteur kann zwischen den Grundmengen <code>Alle</code>, <code>Geplante</code> und <code>Ohne Termin</code> umschalten.<br>6. Bei <code>Geplante</code> lädt das System Projekte mit mindestens einem aktuellen oder zukünftigen Termin. Bei <code>Ohne Termin</code> lädt das System ausschließlich Projekte ohne Termine.<br>7. Zusätzliche Filter wirken immer nur auf die jeweils geladene Grundmenge:</p>
<ul><li>Titelsuche (Substring, case-insensitiv)</li><li>Kundenname / Kundennummer</li><li>Auftragsnummer</li><li>Tag-Filter</li><li>Artikellistenfilter nach Sauna-Produkten und Komponenten-Kategorien</li><li>Aktiv/Inaktiv-Status</li></ul>
<p>8. Der Akteur kann die Spalte <strong>Nächster Termin</strong> sortieren. Projekte ohne nächsten Termin bleiben bei dieser Sortierung am Ende.<br>9. Der Akteur blättert bei Bedarf durch Seiten (Paginierung).</p>
<h2>Alternativen</h2>
<ul><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Leserechte → HTTP 403.</li><li>Keine Projekte in der gewählten Grundmenge → System zeigt eine leere Liste.</li><li>Filter ergibt keine Treffer → System zeigt eine leere Liste innerhalb der Grundmenge.</li></ul>
<h2>Ergebnis</h2>
<p>Der Akteur sieht die gewählte Grundmenge gefiltert, sortiert und paginiert. Die Grundmengen sind fachlich getrennt; es erfolgt keine fachliche Datenänderung.</p>