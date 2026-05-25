<h1>UC 04/02: Tour bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Name oder Farbe einer bestehenden Tour anpassen.</p>
<h2>Beschreibung</h2>
<p>Vorhandene Touren können bearbeitet werden. Die Pflege der Tour-KW-Mitarbeiter erfolgt nicht hier, sondern über die zugehörigen Wochenplanungs-Use-Cases.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Der Akteur ist berechtigt.</li></ul>
<h2>Ablauf</h2>
<ol><li>Der Akteur öffnet die Tourenverwaltung.</li><li>Der Akteur wählt eine Tour.</li><li>Das System zeigt die Tourdetails.</li><li>Der Akteur ändert bei Bedarf den Namen.</li><li>Der Akteur ändert bei Bedarf die Farbe.</li><li>Der Akteur bestätigt die Änderung.</li><li>Das System speichert die Änderung.</li><li>Das System aktualisiert die betroffenen Sichten.</li></ol>
<h2>Alternativen</h2>
<ul><li>Abbruch durch den Akteur: Es wird keine Änderung gespeichert.</li><li>Technischer Konflikt: Das System blockiert die Speicherung mit Fehlermeldung.</li></ul>
<h2>Ergebnis</h2>
<p>Name oder Farbe der Tour sind aktualisiert. Abhängige Ansichten übernehmen die neuen Tourdaten.</p>