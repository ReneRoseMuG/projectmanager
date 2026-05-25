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
<ol><li>Der Akteur öffnet die Tourenverwaltung.</li><li>Der Akteur wählt „Tour anlegen“.</li><li>Das System erzeugt einen neuen Tourdatensatz mit automatisch generiertem Namen.</li><li>Das System zeigt den vorgeschlagenen Namen an.</li><li>Der Akteur ändert den Namen bei Bedarf.</li><li>Der Akteur wählt eine Farbe.</li><li>Der Akteur bestätigt die Anlage.</li><li>Das System speichert die Tour.</li><li>Das System führt keine Kaskadenänderung an Terminen oder Mitarbeitern aus.</li><li>Das System aktualisiert die betroffenen Sichten.</li></ol>
<h2>Alternativen</h2>
<ul><li>Abbruch durch den Akteur: Es wird keine Tour gespeichert.</li></ul>
<h2>Ergebnis</h2>
<p>Die neue Tour ist gespeichert, ihr Name ist generiert, aber änderbar, und eine Farbe ist definiert. Die Tour steht für Terminzuweisungen bereit und wird in Kalender- und Wochenansichten berücksichtigt.</p>