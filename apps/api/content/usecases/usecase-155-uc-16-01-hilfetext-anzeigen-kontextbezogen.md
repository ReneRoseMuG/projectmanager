<h1>UC 16/01: Hilfetext anzeigen (kontextbezogen)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-16-hilfetexte-verwalten.md">FT (16): Hilfetexte verwalten</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Leser, Admin</p>
<h2>Ziel</h2>
<p>Einen aktiven Hilfetext im jeweiligen UI-Kontext abrufen und anzeigen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Ein Hilfetext mit dem entsprechenden help_key existiert.</li><li>Der Hilfetext ist als aktiv gekennzeichnet.</li><li>Der help_key ist im UI-Kontext hinterlegt.</li><li>Der Akteur ist authentifiziert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur klickt in der UI auf das Hilfe-Symbol des jeweiligen Elements.<br>2. Die UI übergibt den hinterlegten help_key an das System.<br>3. Das System prüft, ob ein aktiver Hilfetext mit diesem help_key existiert.<br>4. Das System lädt Titel und Markdown-Inhalt des Hilfetextes.<br>5. Die UI stellt den Hilfetext als Tooltip, Popover oder Modal dar.</p>
<h2>Alternativen</h2>
<ul><li>Es existiert kein Hilfetext mit diesem help_key → Das System liefert einen leeren Status zurück; die UI zeigt „Keine Hilfe verfügbar“ oder blendet das Symbol aus.</li><li>Der Hilfetext ist deaktiviert → Das System liefert keinen Inhalt zurück; die UI zeigt keine Hilfe an.</li><li>Technischer Fehler → Das System antwortet mit einem Fehlerstatus; die UI zeigt eine Fehlermeldung oder keine Hilfe an.</li></ul>
<h2>Ergebnis</h2>
<p>Der Akteur sieht den zum aktuellen UI-Kontext passenden Hilfetext. Es werden keine fachlichen Daten verändert.</p>