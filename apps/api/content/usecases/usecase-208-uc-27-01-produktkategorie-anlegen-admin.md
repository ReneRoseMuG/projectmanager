<h1>UC 27/01: Produktkategorie anlegen (Admin)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-27-produktverwaltung-und-auftragspositionen.md">FT (27): Produktverwaltung und Auftragspositionen</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Eine neue Produktkategorie anlegen, um Produkte später kategorisieren zu können.&lt;br&gt;</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Nutzer ist angemeldet.</li><li>Der Nutzer besitzt die Rolle Administrator.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Administrator öffnet die Produktverwaltung.<br>2. Der Administrator navigiert zu „Produktkategorien&quot;.<br>3. Der Administrator klickt auf „+ Neue Kategorie&quot;.<br>4. Der Administrator gibt einen eindeutigen Namen ein (Pflichtfeld).<br>5. Der Administrator gibt optional eine Beschreibung ein.<br>6. Der Administrator speichert die Kategorie.<br>7. Das System validiert die Eindeutigkeit des Namens.<br>8. Das System persistiert die Kategorie mit <code>is_active = true</code>.</p>
<h2>Alternativen</h2>
<ul><li>Der Name ist leer → Validierungsfehler, kein Speichern.</li><li>Der Name existiert bereits → Validierungsfehler mit Hinweis auf Duplikat.</li><li>Der Administrator bricht ab → Keine Kategorie wird gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Die Produktkategorie existiert und steht in Dropdowns beim Anlegen/Bearbeiten von Produkten zur Verfügung.&lt;br&gt;</p>