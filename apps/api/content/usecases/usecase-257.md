<h3>Akteur</h3>
<p>Administrator</p>

<h3>Ziel</h3>
<p>Den Datenstand eines anderen Servers übernehmen, der per inkrementellem Sync hochgeladen wurde — inklusive aller Dateien, die einzeln vom Server heruntergeladen und verifiziert werden.</p>

<h3>Vorbedingungen</h3>
<ul>
  <li>Remote-Server enthält ein aktuelles Manifest (manifest.json) und Datenbankdaten (data.json).</li>
  <li>Schema-Version des Remote-Manifests stimmt mit der lokalen Instanz überein.</li>
</ul>

<h3>Ablauf</h3>
<ol>
  <li>Administrator ruft die Vorschau des inkrementellen Remote-Sync auf.</li>
  <li>Das System zeigt: Manifest-Zeitstempel, erwartete Tabellen mit Zeilenzahl, Dateianzahl und Gesamtgröße aller Dateiinhalte.</li>
  <li>Administrator bestätigt den Import.</li>
  <li>Das System sichert den aktuellen Zustand als Rollback-Backup.</li>
  <li>Alle Remote-Dateien werden heruntergeladen, Größe und SHA-256-Prüfsumme werden gegen das Manifest verifiziert, bevor die Datei in das Staging-Verzeichnis geschrieben wird.</li>
  <li>Datenbanktabellen werden geleert und aus data.json neu befüllt.</li>
  <li>Dateien werden atomar aus dem Staging-Verzeichnis in die Zielverzeichnisse übernommen.</li>
  <li>Nach dem Import verifiziert das System Prüfsummen aller Tabellen und Dateiinhalte.</li>
</ol>

<h3>Alternativen / Sonderfälle</h3>
<ul>
  <li>Manifest hat sich seit der Vorschau geändert: Import wird abgebrochen; erneute Vorschau erforderlich.</li>
  <li>Eine heruntergeladene Datei stimmt nicht mit dem Manifest überein (Größe oder Hash): Import wird sofort abgebrochen; Rollback auf gesicherten Zustand.</li>
  <li>Verbindungsverlust während des Datei-Downloads: Import wird abgebrochen; Rollback wird eingeleitet.</li>
</ul>

<h3>Ergebnis</h3>
<p>Lokale Instanz spiegelt exakt den Stand des Remote-Servers wider. Jede einzelne Datei wurde vor der Übernahme verifiziert. Der Rollback-Backup bleibt erhalten.</p>