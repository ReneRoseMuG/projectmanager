<h1>UC 04/06: Kalenderdarstellung nach Touränderung aktualisieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Änderungen an einer Tour in Kalenderansichten sichtbar machen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Der Tour sind Termine zugeordnet.</li><li>Der Akteur ist berechtigt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur bearbeitet eine Tour.<br>2. Der Akteur ändert Farbe oder Mitarbeiterliste.<br>3. Der Akteur bestätigt die Änderung.<br>4. Das System speichert die Änderung.<br>5. Das System aktualisiert die Kalenderansichten.<br>6. Das System stellt sicher, dass Termine dieser Tour die neue Farbe verwenden.<br>7. Das System lässt die Terminzuordnungen unverändert.<br>8. Andere Touren und tourlose Termine bleiben unverändert.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch durch den Akteur: Es wird keine Änderung gespeichert.</li><li>Tour ohne Termine: Die Änderung ist gespeichert, erzeugt aber keine sichtbare Terminänderung.</li></ul>
<h2>Ergebnis</h2>
<p>Termine der Tour werden konsistent mit der aktuellen Tourfarbe dargestellt. Andere Termine bleiben unverändert.</p>