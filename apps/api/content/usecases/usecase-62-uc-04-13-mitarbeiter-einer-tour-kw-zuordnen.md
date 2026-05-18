<h1>UC 04/13: Mitarbeiter einer Tour-KW zuordnen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen Mitarbeiter einer Tour-Kalenderwoche zuordnen und nach selektiver Bestätigung auf Termine ausrollen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Der Mitarbeiter ist aktiv.</li><li>Die Kalenderwoche liegt in der Zukunft.</li><li>Der Akteur ist berechtigt.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Tab „Wochenplanung“ der Tour.<br>2. Der Akteur klickt im Kartenheader auf das Plus.<br>3. Das System zeigt aktive Mitarbeiter, für die in dieser Kalenderwoche kein Typ-1-Konflikt besteht.<br>4. Ein Typ-1-Konflikt liegt vor, wenn der Mitarbeiter in derselben Kalenderwoche bereits einer anderen Tour zugeordnet ist; solche Mitarbeiter werden nicht angezeigt.<br>5. Der Akteur wählt einen Mitarbeiter.<br>6. Das System ermittelt Termine der Tour in dieser Kalenderwoche.<br>7. Das System prüft je betroffenen Termin, ob beim Ausrollen ein Typ-2-Konflikt durch eine zeitliche Terminüberschneidung entstehen würde.<br>8. Das System zeigt eine Vorschau je Termin mit Datum, Projekt, Kunde, aktuellem Mitarbeiterbestand und Status.<br>9. Konfliktfreie Termine sind vorausgewählt, Konflikte sind deaktiviert.<br>10. Der Akteur kann vorausgewählte Termine abwählen.<br>11. Der Akteur bestätigt die Auswahl.<br>12. Das System legt die <code>tour_week_employees</code>-Zuordnung an.<br>13. Das System fügt den Mitarbeiter atomar den bestätigten konfliktfreien Terminen hinzu.<br>14. Das System aktualisiert die betroffenen Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Alle Termine haben Konflikte: Die Vorschau enthält keine auswählbaren Terminmutationen, die Tour-KW-Zuordnung wird trotzdem angelegt.</li><li>Keine Termine vorhanden: Das System legt die Tour-KW-Zuordnung direkt an.</li><li>Abbruch durch den Akteur: Es wird keine Zuordnung und keine Terminmutation gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Der Mitarbeiter ist in <code>tour_week_employees</code> gespeichert und auf den bestätigten Terminen zugeordnet. Historische Termine bleiben unverändert; die Ausrollung erfolgt nur nach expliziter Bestätigung.</p>