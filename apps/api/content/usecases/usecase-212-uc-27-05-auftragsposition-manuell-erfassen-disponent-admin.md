<h1>UC 27/05: Auftragsposition manuell erfassen (Disponent / Admin)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-27-produktverwaltung-und-auftragspositionen.md">FT (27): Produktverwaltung und Auftragspositionen</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine Auftragsposition unter einem Projekt mit strukturiertem Bezug zu einem Produkt oder einer Komponente (optional mit freier Beschreibung) erfassen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Nutzer ist angemeldet und besitzt Änderungsrechte.</li><li>Das Projekt existiert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Nutzer öffnet ein Projekt.<br>2. Der Nutzer öffnet die Artikelliste des Projekts.<br>3. Der Nutzer klickt auf „+ Position hinzufügen&quot;.<br>4. Das System öffnet ein Eingabeformular für eine neue Auftragsposition.<br>5. Der Nutzer wählt optional ein Produkt aus einem Dropdown (alle aktiven Produkte).<br>6. Der Nutzer wählt optional eine Komponente aus einem Dropdown (alle aktiven Komponenten, unabhängig vom gewählten Produkt).<br>7. Der Nutzer gibt optional eine freie Beschreibung ein.<br>8. Der Nutzer gibt die Menge ein (Pflichtfeld, Zahl &gt; 0).<br>9. Der Nutzer speichert die Position.<br>10. Das System validiert: Mindestens eines von (product_id, component_id) muss gesetzt sein.<br>11. Das System validiert: quantity &gt; 0.<br>12. Das System persistiert die Position mit project_id.</p>
<h2>Alternativen</h2>
<ul><li>Nutzer gibt weder Produkt noch Komponente an → Validierungsfehler.</li><li>Menge ist ≤ 0 oder nicht numerisch → Validierungsfehler.</li><li>Inaktive Produkte oder Komponenten → werden aus den Dropdowns herausgefiltert.</li><li>Der Nutzer bricht ab → Keine Position wird gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Die Auftragsposition ist gespeichert und in der Artikelliste des Projekts sichtbar. Sie ist strukturiert mit einem Produkt oder einer Komponente verknüpft.</p>