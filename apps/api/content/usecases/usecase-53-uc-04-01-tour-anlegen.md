<h1>UC 04/01: Tour anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine neue Tour zur organisatorischen Gruppierung von Terminen anlegen.</p>
<h2>Beschreibung</h2>
<p>Der Name wird beim Anlegen automatisch mit dem nächsten freien Index vorgeschlagen. Er ist beim Anlegen sichtbar und nachträglich änderbar. Zusätzlich legt der Akteur eine Farbe fest.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist angemeldet.</li><li>Das System ist betriebsbereit.</li><li>Die Tourenverwaltung ist verfügbar.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet die Tourenverwaltung.<br>2. Der Akteur wählt „Tour anlegen“.<br>3. Das System erzeugt einen neuen Tourdatensatz mit automatisch generiertem Namen.<br>4. Das System zeigt den vorgeschlagenen Namen an.<br>5. Der Akteur ändert den Namen bei Bedarf.<br>6. Der Akteur wählt eine Farbe.<br>7. Der Akteur bestätigt die Anlage.<br>8. Das System speichert die Tour.<br>9. Das System führt keine Kaskadenänderung an Terminen oder Mitarbeitern aus.<br>10. Das System aktualisiert die betroffenen Sichten.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch durch den Akteur: Es wird keine Tour gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Die neue Tour ist gespeichert, ihr Name ist generiert, aber änderbar, und eine Farbe ist definiert. Die Tour steht für Terminzuweisungen bereit und wird in Kalender- und Wochenansichten berücksichtigt.</p>