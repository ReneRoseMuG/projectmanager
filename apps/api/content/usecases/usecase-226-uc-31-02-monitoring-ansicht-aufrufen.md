<h1>UC 31/02: Monitoring-Ansicht aufrufen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-31-dispositions-monitoring-konflikte.md">FT (31): Dispositions-Monitoring (Konflikte)</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Die vollständige aktuelle Monitoring-Konfliktmenge einsehen und nach Konfliktart bewerten.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist angemeldet.</li><li>Der Akteur besitzt Administrator- oder Disponentenrechte.</li></ul>
<h2>Ablauf</h2>
<p>1. Akteur öffnet den Navigationspunkt <strong>Monitoring</strong>.<br>2. System berechnet die Monitoring-Ergebnisse frisch aus dem aktuellen Terminbestand.<br>3. System zeigt Termine, die aktive Trigger erfüllen.<br>4. System trennt mindestens Ressourcenunterschreitung und Parkplatztermine.<br>5. Akteur öffnet bei Bedarf einen betroffenen Termin über die bestehenden Terminpfade.</p>
<h2>Alternativen</h2>
<ul><li>Keine Konflikte vorhanden → System zeigt einen leeren Zustand.</li><li>Leser ruft die Ansicht oder API direkt auf → System verweigert den Zugriff.</li><li>Ein Termin wird zwischenzeitlich korrigiert → Nach Aktualisierung verschwindet er aus der Konfliktmenge, sofern kein aktiver Trigger mehr greift.</li></ul>
<h2>Ergebnis</h2>
<p>Akteur sieht die vollständige aktuelle Konfliktlage. Die Monitoring-Ansicht selbst verändert keine Termine.</p>