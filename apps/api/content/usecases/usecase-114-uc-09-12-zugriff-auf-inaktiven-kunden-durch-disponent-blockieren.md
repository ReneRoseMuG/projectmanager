<h1>UC 09/12: Zugriff auf inaktiven Kunden durch Disponent blockieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass ein Disponent weder über direkte URL noch über manipulierte API-Requests auf einen inaktiven Kunden zugreifen kann.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Kunde existiert mit <code>is_active = false</code>.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt die Rolle Disponent.</li></ul>
<p>---</p>
<h2>Ablauf</h2>
<p>1. Der Disponent versucht, einen inaktiven Kunden zu laden, z. B.:</p>
<ul><li>durch direkte URL-Eingabe,</li><li>durch manipulierten API-Request,</li><li>durch gespeicherte alte Detailansicht.</li></ul>
<p>2. Das System ermittelt:</p>
<ul><li>Rolle des Akteurs,</li><li>Aktiv-Status des Kunden.</li></ul>
<p>3. Das System prüft serverseitig die Zugriffsberechtigung.<br>4. Das System blockiert den Zugriff.<br>5. Das System antwortet mit 404 oder 403 gemäß Sicherheitskonzept.</p>
<p>---</p>
<h3>Sicherheits- und Query-Regel</h3>
<ul><li>Die Zugriffskontrolle erfolgt ausschließlich serverseitig.</li><li>Der Aktiv-Status wird vor Auslieferung des Datensatzes geprüft.</li><li>Es darf kein vollständiger Kundendatensatz an einen Disponenten ausgeliefert werden, wenn <code>is_active = false</code>.</li></ul>
<p>---</p>
<h2>Alternativen</h2>
<ul><li>Kunde existiert nicht → System antwortet mit 404.</li><li>Akteur ist Administrator → Zugriff wird erlaubt.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Disponenten können inaktive Kunden nicht laden oder anzeigen.</li><li>Administratoren behalten vollständigen Zugriff.</li><li>Die Zugriffskontrolle ist unabhängig von der UI durchgesetzt.</li></ul>