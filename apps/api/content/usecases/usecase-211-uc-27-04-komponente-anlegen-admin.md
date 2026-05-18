<h1>UC 27/04: Komponente anlegen (Admin)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-27-produktverwaltung-und-auftragspositionen.md">FT (27): Produktverwaltung und Auftragspositionen</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Eine neue Komponente (Bauteil) in den Katalog aufnehmen.&lt;br&gt;</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Nutzer ist angemeldet und besitzt die Rolle Administrator.</li><li>Mindestens eine Komponentenkategorie existiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Administrator öffnet die Komponentenverwaltung.<br>2. Der Administrator klickt auf „+ Neue Komponente&quot;.<br>3. Der Administrator wählt eine Komponentenkategorie aus einem Dropdown.<br>4. Der Administrator gibt einen eindeutigen Komponentennamen ein (z.B. &quot;Rückwand mit Fenster&quot;, &quot;Ofen&quot;, &quot;Vorderwand&quot;).<br>5. Der Administrator gibt optional eine Beschreibung ein.<br>6. Der Administrator speichert die Komponente.<br>7. Das System validiert die Eindeutigkeit des Namens.<br>8. Das System persistiert die Komponente mit <code>is_active = true</code>.</p>
<h2>Alternativen</h2>
<ul><li>Der Name ist leer oder bereits vergeben → Validierungsfehler.</li><li>Keine Kategorie gewählt → Validierungsfehler.</li></ul>
<h2>Ergebnis</h2>
<p>Die Komponente existiert und steht für Auftragspositionen zur Verfügung.&lt;br&gt;</p>