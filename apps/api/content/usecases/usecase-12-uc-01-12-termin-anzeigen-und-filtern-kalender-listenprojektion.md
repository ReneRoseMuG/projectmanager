<h1>UC 01/12: Termin anzeigen und filtern (Kalender-/Listenprojektion)</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Termine in Kalender- und Listenansichten anzeigen und über Filter so einschränken, dass das System konsistent genau die Termine liefert, die zum gewählten Zeitraum und zu den gewählten Kriterien passen. Die Projektion muss dabei die fachlich korrekten Beziehungen berücksichtigen, insbesondere dass jeder Termin einem Projekt zugeordnet ist und der Kunde indirekt über das Projekt bestimmt wird.</p>
<h2>Vorbedingungen</h2>
<ul><li>Es existieren Termine in der Datenbank.</li><li>Jeder Termin ist direkt einem Kunden zugeordnet (customer_id, NOT NULL).</li><li>Termine können optional einem Projekt zugeordnet sein (project_id, NULLABLE).</li><li>Es existiert mindestens ein API-Endpunkt, der Termine als Kalender-/Listenprojektion ausliefert.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet eine Kalender- oder Terminlistenansicht.<br>2. Das System lädt die Termine für einen gewählten Zeitraum, zum Beispiel für einen Tag, eine Woche oder einen frei wählbaren Zeitraum.<br>3. Der Akteur setzt optional Filterkriterien, zum Beispiel nach Projekt, nach Tour oder nach Mitarbeiter.<br>4. Das System lädt die Termine erneut und liefert dabei nur die Termine aus, die sowohl im Zeitraum liegen als auch alle gesetzten Filterkriterien erfüllen.<br>5. Der Akteur ändert Filterkriterien oder den Zeitraum, und das System aktualisiert die Ergebnisliste entsprechend.</p>
<h2>Alternativen</h2>
<ul><li>Keine Treffer: Wenn im Zeitraum oder mit den gesetzten Filtern keine Termine existieren, liefert das System eine leere Liste und die Ansicht bleibt stabil bedienbar.</li><li>Ungültiger Zeitraum: Wenn ein ungültiger Zeitraum übergeben wird, blockiert das System die Anfrage mit einer eindeutigen Fehlermeldung und liefert keine Teilantwort.</li><li>Filteränderung während paralleler Änderungen: Wenn sich Termine während der Nutzung durch andere Benutzer ändern, muss das System beim nächsten Laden konsistent den aktuellen Stand ausliefern.</li></ul>
<h2>Ergebnis</h2>
<p>Die Ansicht zeigt die vom System gelieferten Termine konsistent und reproduzierbar an. Die Terminmenge entspricht dem gewählten Zeitraum und den gesetzten Filtern. Alle in der Projektion angezeigten Kunden- und Projektinformationen entsprechen den aktuellen Daten. Der Kundenbezug ergibt sich direkt aus customer_id am Termin; Projektinformationen werden zusätzlich angezeigt, sofern project_id gesetzt ist.</p>