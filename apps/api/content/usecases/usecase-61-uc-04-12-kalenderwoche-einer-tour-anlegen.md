<h1>UC 04/12: Kalenderwoche einer Tour anlegen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-04-tourenplanung.md">FT (04): Tourenplanung</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Eine neue Kalenderwoche in der Tour-Wochenplanung anlegen.</p>
<h2>Beschreibung</h2>
<p>Im Tab „Wochenplanung“ kann über „KW einfügen“ eine leere Wochenkarte angelegt werden. Zulässig sind nur zukünftige Kalenderwochen; doppelte Wochenkarten sind nicht erlaubt.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die Tour existiert.</li><li>Der Akteur ist berechtigt.</li><li>Die gewünschte Kalenderwoche liegt in der Zukunft.</li><li>Für die Tour existiert noch keine Wochenkarte für diese Kalenderwoche.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur wählt eine Tour und öffnet den Tab „Wochenplanung“.<br>2. Der Akteur klickt auf „KW einfügen“.<br>3. Das System öffnet einen Dialog mit der nächsten freien editierbaren Kalenderwoche.<br>4. Der Akteur übernimmt oder ändert die Kalenderwoche.<br>5. Das System prüft, dass die Kalenderwoche nach heute liegt und noch nicht vorhanden ist.<br>6. Der Akteur bestätigt die Anlage.<br>7. Das System legt eine leere Wochenkarte ohne <code>tour_week_employees</code> an.<br>8. Das System zeigt die Karte sortiert an.</p>
<h2>Alternativen</h2>
<ul><li>Vergangenheit oder laufende Woche: Das System blockiert die Anlage.</li><li>Kalenderwoche bereits vorhanden: Das System blockiert die Anlage.</li><li>Abbruch durch den Akteur: Es wird nichts angelegt.</li></ul>
<h2>Ergebnis</h2>
<p>Eine leere Wochenkarte ist sichtbar und editierbar. Terminmutationen finden nicht statt.</p>