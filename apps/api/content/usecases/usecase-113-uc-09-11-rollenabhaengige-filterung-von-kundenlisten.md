<h1>UC 09/11: Rollenabhängige Filterung von Kundenlisten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Kundenlisten serverseitig rollenabhängig gefiltert werden und Disponenten ausschließlich aktive Kunden sehen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Mindestens ein aktiver oder inaktiver Kunde existiert.</li></ul>
<p>---</p>
<h2>Ablauf</h2>
<h3>Ablauf – Disponent</h3>
<p>1. Der Akteur mit Rolle Disponent ruft die Kundenliste auf.<br>2. Das System ermittelt die Rolle des Akteurs.<br>3. Das System führt eine serverseitige Abfrage aus, die ausschließlich Kunden mit <code>is_active = true</code> berücksichtigt.<br>4. Das System liefert die gefilterte Liste zurück.<br>5. Die UI zeigt ausschließlich aktive Kunden an.</p>
<p>---</p>
<h3>Ablauf – Administrator</h3>
<p>1. Der Akteur mit Rolle Administrator ruft die Kundenliste auf.<br>2. Das System erkennt die Rolle Administrator.<br>3. Das System führt eine Abfrage ohne Aktiv-Filter aus oder ermöglicht eine explizite Filterauswahl.<br>4. Das System liefert aktive und inaktive Kunden zurück.<br>5. Die UI kennzeichnet inaktive Kunden eindeutig.</p>
<p>---</p>
<h3>Query-Vertrag</h3>
<ul><li>Die Filterung erfolgt serverseitig.</li><li>Ein Disponent kann durch Manipulation der UI oder Query-Parameter keine inaktiven Kunden erhalten.</li><li>Die API muss rollenabhängig prüfen und darf sich nicht auf clientseitige Filter verlassen.</li></ul>
<p>---</p>
<h2>Alternativen</h2>
<ul><li>Keine Kunden vorhanden → System liefert leere Liste.</li><li>Akteur nicht authentifiziert → System antwortet mit 401.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Disponenten sehen ausschließlich aktive Kunden.</li><li>Administratoren sehen vollständige Daten.</li><li>Die Datenintegrität ist unabhängig vom Client garantiert.</li></ul>