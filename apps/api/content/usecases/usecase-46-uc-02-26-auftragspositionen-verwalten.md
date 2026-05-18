<h1>UC 02/26: Auftragspositionen verwalten</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-02-projekte.md">FT (02): Projekte</a></li></ul>
<h2>Akteur</h2>
<p>Administrator, Disponent</p>
<h2>Ziel</h2>
<p>Positionen eines Projektauftrags (Stückliste) anlegen, bearbeiten und löschen, um den Auftragsumfang und geplante Lieferungen zu dokumentieren.</p>
<h2>Vorbedingungen</h2>
<ul><li>Das Projekt existiert.</li><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Änderungsrechte (Disponent oder Administrator).</li></ul>
<h2>Ablauf</h2>
<h3>Ablauf — Position anlegen</h3>
<p>1. Der Akteur öffnet das Projekt und navigiert zum Bereich „Auftragspositionen&quot;.<br>2. Der Akteur wählt „Position hinzufügen&quot; und erfasst Bezeichnung, Menge und ggf. Einheit.<br>3. Das System validiert Pflichtfelder und legt die Position mit Projektreferenz an.</p>
<h3>Ablauf — Position bearbeiten</h3>
<p>1. Der Akteur wählt eine bestehende Position und ändert Felder.<br>2. Das System speichert die Änderung atomar.</p>
<h3>Ablauf — Position löschen</h3>
<p>1. Der Akteur entfernt eine Position.<br>2. Das System löscht den Datensatz. Alle Positionen werden bei Projektlöschung automatisch via Cascade entfernt (siehe UC 02/08).</p>
<h2>Alternativen</h2>
<ul><li>Projekt nicht vorhanden → HTTP 404.</li><li>Akteur nicht authentifiziert → HTTP 401.</li><li>Akteur ohne Rechte → HTTP 403.</li><li>Pflichtfeld fehlt → HTTP 422.</li><li>Technischer Fehler → HTTP 500.</li></ul>
<h2>Ergebnis</h2>
<p>Die Auftragspositionen sind persistiert und dem Projekt zugeordnet. Sie dienen der internen Dokumentation des Auftragsumfangs und sind in der Projekt-Detailansicht sichtbar.</p>