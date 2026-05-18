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
<p>1. Der Akteur öffnet die Tourenverwaltung.<br>2. Der Akteur wählt eine Tour.<br>3. Das System zeigt die Tourdetails.<br>4. Der Akteur ändert bei Bedarf den Namen.<br>5. Der Akteur ändert bei Bedarf die Farbe.<br>6. Der Akteur bestätigt die Änderung.<br>7. Das System speichert die Änderung.<br>8. Das System aktualisiert die betroffenen Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch durch den Akteur: Es wird keine Änderung gespeichert.</li><li>Technischer Konflikt: Das System blockiert die Speicherung mit Fehlermeldung.</li></ul>
<h2>Ergebnis</h2>
<p>Name oder Farbe der Tour sind aktualisiert. Abhängige Ansichten übernehmen die neuen Tourdaten.</p>