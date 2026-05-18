<h1>UC 13/01: Notiz zu Projekt hinzufügen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-13-notizverwaltung.md">FT (13): Notizverwaltung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent</p>
<h2>Ziel</h2>
<p>Eine neue Notiz erstellen und einem Projekt zuordnen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Schreibrechte für Projektnotizen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Projektdetailansicht.<br>2. Der Akteur wählt „Notiz hinzufügen&quot;.<br>3. Das System öffnet einen Richtext-Editor.<br>4. Optional zeigt das System aktive Vorlagen an.<br>5. Wählt der Akteur eine Vorlage, übernimmt das System Titel und Inhalt.<br>6. Besitzt die Vorlage eine Kennzeichnungsfarbe (<code>color</code>), übernimmt das System diese einmalig.<br>7. Der Akteur erfasst oder ändert Titel und Beschreibung.<br>8. Der Akteur bestätigt.<br>9. Das System validiert Pflichtfelder.<br>10. Das System persistiert die Notiz mit Projektreferenz.<br>11. Das System aktualisiert die Notizenliste.</p>
<h2>Alternativen</h2>
<ul><li>Pflichtfelder fehlen → Validierungsfehler.</li><li>Abbruch → keine Persistenz.</li></ul>
<h2>Ergebnis</h2>
<p>Die Notiz ist persistent gespeichert und projektbezogen referenziert.</p>