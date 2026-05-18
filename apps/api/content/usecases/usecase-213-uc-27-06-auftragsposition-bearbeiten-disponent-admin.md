<h1>UC 27/06: Auftragsposition bearbeiten (Disponent / Admin)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-27-produktverwaltung-und-auftragspositionen.md">FT (27): Produktverwaltung und Auftragspositionen</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Menge und Beschreibung einer bestehenden Auftragsposition ändern.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Nutzer ist angemeldet und besitzt Änderungsrechte.</li><li>Die Auftragsposition existiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Nutzer öffnet die Auftragsposition (z.B. durch Klick in der Tabelle).<br>2. Das System lädt die Positionsdaten (readonly: order_number, project_id, Stammdatenbezüge).<br>3. Der Nutzer ändert Menge und/oder Beschreibung.<br>4. Der Nutzer speichert die Änderung.<br>5. Das System validiert: quantity &gt; 0.<br>6. Das System speichert die neuen Werte mit Versionskontrolle (Optimistic Locking).</p>
<h2>Alternativen</h2>
<ul><li>Versionkonflikt (parallele Änderung) → HTTP 409, Fehlermeldung mit Aufforderung zum Neuladen.</li><li>Menge ≤ 0 → Validierungsfehler.</li></ul>
<h2>Ergebnis</h2>
<p>Die Auftragsposition ist aktualisiert.&lt;br&gt;</p>