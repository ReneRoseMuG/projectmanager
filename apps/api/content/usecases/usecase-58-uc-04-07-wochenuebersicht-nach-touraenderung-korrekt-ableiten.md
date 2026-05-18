<h1>UC 04/07: Wochenübersicht nach Touränderung korrekt ableiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Mitarbeiter- und tourbezogene Wochenübersichten aus den aktuellen Tour- und Mitarbeiterdaten korrekt ableiten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Termine mit Tour- oder Mitarbeiterbezug sind vorhanden.</li><li>Mindestens eine relevante Kalenderwoche existiert.</li><li>Der Akteur darf die Wochenübersicht sehen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur ruft die Wochenübersicht auf.<br>2. Das System ermittelt Termine und leitet Touren und Mitarbeiter pro Woche ab.<br>3. Der Akteur ändert eine Tour.<br>4. Das System speichert die Änderung.<br>5. Das System aktualisiert die Wochenübersicht.<br>6. Das System entfernt oder ergänzt Mitarbeiterzuordnungen korrekt.<br>7. Leere Wochen bleiben leer.</p>
<h2>Alternativen</h2>
<ul><li>Keine Termine vorhanden: Das System zeigt eine leere Übersicht.</li><li>Abbruch der Touränderung: Die Wochenübersicht bleibt unverändert.</li></ul>
<h2>Ergebnis</h2>
<p>Die Wochenübersicht ist konsistent zur aktuellen Tour- und Mitarbeiterlage. Der Use Case ist rein informativ und ändert selbst keine Daten.</p>