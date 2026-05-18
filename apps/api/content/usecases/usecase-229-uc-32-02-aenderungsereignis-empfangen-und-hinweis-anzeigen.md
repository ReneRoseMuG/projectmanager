<h1>UC 32/02: Änderungsereignis empfangen und Hinweis anzeigen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-32-aktive-aenderungsbenachrichtigung.md">FT (32): Aktive Änderungsbenachrichtigung</a></li></ul>
<h2>Akteur</h2>
<p>Angemeldeter Benutzer aller Rollen</p>
<h2>Ziel</h2>
<p>Den Benutzer nicht-blockierend informieren, dass in seiner aktuellen Session fremde Änderungen vorliegen und eine zentrale Aktualisierung verfügbar ist.</p>
<h2>Vorbedingungen</h2>
<ul><li>Die SSE-Verbindung der Session ist aktiv.</li><li>Eine andere Session hat eine mutierende Operation erfolgreich abgeschlossen.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Client empfängt ein SSE-Ereignis zu einer Fremdänderung.<br>2. Das System setzt für die aktuelle Session den Status „Updates verfügbar“.<br>3. Das System zeigt einen globalen, länger sichtbaren Toast mit dem Hinweis, dass über „Neu laden“ in der Hauptnavigation alle offenen Ansichten aktualisiert werden können.<br>4. Weitere eingehende Fremdänderungen erzeugen keine zusätzlichen Einzelmeldungen, solange der Status bereits aktiv ist.<br>5. Ist in der aktuellen Session kein Edit-Form geöffnet, kann der Benutzer bei Bedarf die zentrale Funktion „Neu laden“ auslösen.<br>6. Das System aktualisiert alle offenen, refresh-fähigen Ansichten der aktuellen Session.</p>
<h2>Alternativen</h2>
<ul><li>Es liegt bereits ein aktiver Status „Updates verfügbar“ vor: Das neue Ereignis erzeugt keine zusätzliche Meldung.</li><li>In der aktuellen Session ist ein Edit-Form geöffnet: Die Funktion „Neu laden“ ist gesperrt und kann nicht ausgelöst werden.</li><li>Eine Ansicht befindet sich in laufender Bearbeitung oder enthält ungespeicherte Änderungen: Diese Ansicht darf nicht still überschrieben werden.</li></ul>
<h2>Ergebnis</h2>
<p>Der Benutzer ist informiert und kann die Aktualisierung zentral auslösen, sofern kein Edit-Form geöffnet ist. Seine laufende Bearbeitung bleibt unberührt. Der Versionskonflikt beim Speichern gemäß NFR (01) bleibt als harte Absicherung aktiv.</p>