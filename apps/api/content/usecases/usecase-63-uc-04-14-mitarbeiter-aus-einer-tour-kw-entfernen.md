<h1>UC 04/14: Mitarbeiter aus einer Tour-KW entfernen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen Mitarbeiter aus einer Tour-Kalenderwoche entfernen und nach Bestätigung von Terminen abziehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Der Mitarbeiter ist in <code>tour_week_employees</code> für die Kalenderwoche enthalten.</li><li>Die Kalenderwoche liegt in der Zukunft.</li><li>Der Akteur ist berechtigt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Tab „Wochenplanung“.<br>2. Der Akteur klickt den Entfernen-Button am Mitarbeiter-Badge.<br>3. Das System ermittelt Termine der Tour in dieser Woche, denen der Mitarbeiter zugeordnet ist.<br>4. Das System prüft, ob durch die Entfernung Unterbesetzung entstehen würde.<br>5. Das System zeigt eine Vorschau je Termin mit Datum, Projekt, aktuellem Mitarbeiterbestand und Status.<br>6. Alle Termine sind vorausgewählt.<br>7. Der Akteur kann einzelne Termine abwählen.<br>8. Der Akteur bestätigt die Auswahl.<br>9. Das System entfernt die <code>tour_week_employees</code>-Zuordnung.<br>10. Das System zieht den Mitarbeiter atomar von den bestätigten Terminen ab.<br>11. Unterbesetzte Termine werden an das Dispositions-Monitoring gemeldet.<br>12. Das System aktualisiert die betroffenen Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Keine Termine mit diesem Mitarbeiter vorhanden: Die Vorschau ist leer, die Tour-KW-Zuordnung wird trotzdem entfernt.</li><li>Abbruch durch den Akteur: Es wird keine Zuordnung und keine Terminmutation geändert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Mitarbeiter ist nicht mehr in <code>tour_week_employees</code> enthalten und von den bestätigten Terminen entfernt. Unterbesetzung ist im Monitoring sichtbar, historische Termine bleiben unverändert und es gibt keine stillen Änderungen.</p>