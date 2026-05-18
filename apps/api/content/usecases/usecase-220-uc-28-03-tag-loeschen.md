<h1>UC 28/03: Tag löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-28-universelles-tagging-system.md">FT (28): Universelles Tagging-System</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen nicht mehr benötigten Tag entfernen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Tag ist kein Default Tag.</li><li>Der Nutzer ist als Administrator angemeldet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Administrator wählt einen Tag in der Verwaltung.<br>2. Der Administrator initiiert die Löschung.<br>3. Das System zeigt die Anzahl betroffener Zuweisungen als Warnhinweis.<br>4. Das System verhindert das Löschen, wenn Relationen vorhanden sind.<br>5. Der Administrator bestätigt die Löschung.<br>6. Das System entfernt den Tag und alle zugehörigen Join-Einträge per Cascade Delete.</p>
<h2>Alternativen</h2>
<ul><li>Der Tag ist ein Default Tag: Das System blockiert die Löschung serverseitig mit Fehlermeldung.</li></ul>
<h2>Ergebnis</h2>
<p>Der Tag ist vollständig entfernt. Betroffene Domänenobjekte haben keine verwaisten Referenzen mehr.</p>