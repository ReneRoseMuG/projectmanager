<h1>UC 09/02: Kunde bearbeiten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Bestehende Kundendaten werden aktualisiert, ohne referenzierende Projekte oder Termine inkonsistent zu machen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Kunde existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte.</li><li>Eine gültige Versionskennung des Kunden liegt vor (Optimistic Locking).</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Detailansicht eines bestehenden Kunden.<br>2. Das System zeigt:</p>
<ul><li>Kundendaten,</li><li>Projektliste,</li><li>Notizenliste,</li><li>Anhangsliste.</li></ul>
<p>3. Der Akteur startet die Funktion „Bearbeiten“.<br>4. Das System zeigt ein editierbares Formular mit den aktuellen Werten.<br>5. Der Akteur ändert zulässige Felder (z. B. Adresse, Telefonnummer, Kundennummer, Name).<br>6. Optional stammen neue Werte aus der Dokumentextraktion. In diesem Fall darf das System nur bisher leere Stammdatenfelder ergänzen, wenn der Akteur dies sichtbar bestätigt hat. Vorhandene Werte werden nicht automatisch überschrieben.<br>7. Der Akteur bestätigt die Änderungen.<br>8. Das System prüft:</p>
<ul><li>Berechtigung,</li><li>Pflichtfelder,</li><li>formale Validierung,</li><li>Versionskennung (Konfliktprüfung).</li></ul>
<p>9. Bei erfolgreicher Prüfung speichert das System die Änderungen.<br>10. Das System erhöht die Versionskennung.<br>11. Das System aktualisiert abhängige Ansichten.</p>
<h2>Alternativen</h2>
<ul><li>Kunde existiert nicht → System antwortet mit 404.</li><li>Akteur nicht berechtigt → System blockiert mit 403.</li><li>Validierungsfehler → System lehnt ab, keine Speicherung.</li><li>Versionskonflikt → System blockiert mit 409, fordert Neuladen.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<h2>Ergebnis</h2>
<ul><li>Kundendaten sind aktualisiert persistiert.</li><li>Bestehende Projekte und Termine referenzieren weiterhin denselben Kunden.</li><li>In Projektansichten, Kalender-Tooltips und Druckfunktionen erscheinen die aktualisierten Kundendaten.</li><li>Es werden keine Projekte, Termine oder Notizen verändert.</li></ul>