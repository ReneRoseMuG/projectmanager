<h1>UC 09/15: Konsistenz von Kundenlisten bei Statusänderung (Multi-Browser)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-09-kundenverwaltung.md">FT (09): Kundenverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Sicherstellen, dass Kundenlisten bei Statusänderungen (Deaktivieren / Reaktivieren / Löschen) konsistent bleiben und keine veralteten Zustände persistieren.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Kunde existiert.</li><li>Mindestens zwei Browser-Sitzungen sind aktiv.</li><li>Mindestens ein Akteur besitzt Administratorrechte.</li></ul>
<p>---</p>
<h2>Ablauf</h2>
<h3>Ablauf – Beispiel: Deaktivieren in Browser A</h3>
<p>1. Browser A (Administrator) öffnet die Kundendetailansicht eines aktiven Kunden.<br>2. Browser B (Disponent) zeigt eine Kundenliste mit diesem Kunden an.<br>3. Administrator in Browser A deaktiviert den Kunden.<br>4. Das System setzt <code>is_active = false</code> und persistiert die Änderung.<br>5. Browser B führt eine erneute Abfrage der Kundenliste aus (z. B. durch Seitenwechsel, Filterwechsel oder explizites Neuladen).<br>6. Das System liefert serverseitig gefilterte Daten gemäß Rolle.<br>7. Der deaktivierte Kunde erscheint nicht mehr in der Liste des Disponenten.</p>
<p>---</p>
<h3>Ablauf – Beispiel: Löschen</h3>
<p>1. Administrator löscht einen Kunden ohne Referenzen (UC 13).<br>2. Ein anderer Browser versucht, denselben Kunden erneut zu laden.<br>3. Das System prüft Existenz.<br>4. Das System antwortet mit 404.</p>
<p>---</p>
<h3>Konsistenzregeln</h3>
<ul><li>Die Datenquelle ist ausschließlich serverseitig maßgeblich.</li><li>Es existiert keine clientseitige Cache-Logik, die serverseitige Filter übersteuern darf.</li><li>Jede neue Anfrage muss den aktuellen Persistenzzustand widerspiegeln.</li><li>Es ist nicht erforderlich, dass andere Browser aktiv gepusht werden; Konsistenz ist spätestens bei der nächsten Serverabfrage garantiert.</li></ul>
<p>---</p>
<h2>Alternativen</h2>
<ul><li>Browser verwendet veralteten lokalen Zustand → bei nächster Serveranfrage wird Zustand korrigiert.</li><li>Technischer Fehler → System antwortet mit 500.</li></ul>
<p>---</p>
<h2>Ergebnis</h2>
<ul><li>Kundenlisten sind rollenabhängig und statusabhängig konsistent.</li><li>Es entstehen keine dauerhaft sichtbaren veralteten Zustände.</li><li>Gelöschte oder deaktivierte Kunden können nicht dauerhaft angezeigt werden.</li></ul>