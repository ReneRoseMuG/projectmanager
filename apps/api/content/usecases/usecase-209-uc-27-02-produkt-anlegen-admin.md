<h1>UC 27/02: Produkt anlegen (Admin)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-27-produktverwaltung-und-auftragspositionen.md">FT (27): Produktverwaltung und Auftragspositionen</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Ein neues Saunamodell (Produkt) in den Katalog aufnehmen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Nutzer ist angemeldet und besitzt die Rolle Administrator.</li><li>Mindestens eine Produktkategorie existiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Administrator öffnet die Produktverwaltung.<br>2. Der Administrator klickt auf „+ Neues Produkt&quot;.<br>3. Der Administrator wählt eine Produktkategorie aus einem Dropdown.<br>4. Der Administrator gibt einen eindeutigen Produktnamen ein (Pflichtfeld, z.B. &quot;Kolmikko&quot;, &quot;Suuri&quot;).<br>5. Der Administrator gibt optional eine Beschreibung ein (z.B. Technische Daten, Abmessungen).<br>6. Der Administrator speichert das Produkt.<br>7. Das System validiert die Eindeutigkeit des Namens.<br>8. Das System persistiert das Produkt mit <code>is_active = true</code>.</p>
<h2>Alternativen</h2>
<ul><li>Der Name ist leer oder bereits vergeben → Validierungsfehler.</li><li>Keine Kategorie gewählt → Validierungsfehler.</li><li>Keine aktive Kategorie vorhanden → Fehlermeldung mit Hinweis, zuerst Kategorie anzulegen.</li></ul>
<h2>Ergebnis</h2>
<p>Das Produkt existiert und steht für Auftragspositionen zur Verfügung.&lt;br&gt;</p>