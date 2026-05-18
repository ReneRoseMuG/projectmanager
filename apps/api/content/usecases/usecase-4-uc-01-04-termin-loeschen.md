<h1>UC 01/04: Termin löschen</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-01-kalendertermine.md">FT (01): Kalendertermine</a></li></ul>
<h2>Akteur</h2>
<p>Disponent, Administrator</p>
<h2>Ziel</h2>
<p>Einen bestehenden Termin vollständig löschen, sodass keine fachlichen Restzustände bestehen bleiben. Insbesondere dürfen nach dem Löschen keine Mitarbeiterzuordnungen mehr existieren, und der Termin darf in keiner Sicht (Kalender, Projekt, Mitarbeiter, Tour, Kunde) mehr erscheinen.</p>
<h2>Vorbedingungen</h2>
<ul><li>Der Akteur ist authentifiziert.</li><li>Der Akteur besitzt Löschrechte (Disponent oder Administrator).</li><li><strong>Rollenbasierte Datumsbeschränkung:</strong> Disponenten dürfen nur nicht-historische Termine löschen (Startdatum ≥ heute). Administratoren dürfen Termine unabhängig vom Startdatum löschen.</li><li>Der Termin ist einem Kunden zugeordnet.</li><li>Optional: Der Termin ist einem Projekt zugeordnet.</li><li>Optional: Dem Termin sind Mitarbeiter manuell zugeordnet oder über Tour/Team übernommen.</li><li>Optional: Der Termin ist einer Tour zugeordnet.</li></ul>
<h2>Ablauf</h2>
<p>1. Der Akteur öffnet den Termin im Terminformular oder startet das Löschen aus einer Terminliste.<br>2. Der Akteur löst die Löschaktion aus und bestätigt diese, sofern eine Bestätigung vorgesehen ist.<br>3. Das System löscht den Termin in der Datenbank.<br>4. Das System entfernt alle zugehörigen Einträge in der Join-Tabelle Termin–Mitarbeiter, sodass keine Mitarbeiterzuordnungen bestehen bleiben.<br>5. Das System aktualisiert alle Sichten, die Termine anzeigen, insbesondere Kalender- und Listenansichten sowie Detailansichten zu Projekt, Mitarbeiter, Tour und Kunde.</p>
<h2>Alternativen</h2>
<ul><li>Abbruch: Der Akteur bricht den Löschvorgang ab. Der Termin bleibt unverändert bestehen, und es werden keine Daten gelöscht.</li><li>Konflikt beim Löschen: Falls das System das Löschen blockiert, muss es eine eindeutige Fehlermeldung anzeigen und sicherstellen, dass weder der Termin noch Join-Einträge teilweise entfernt wurden.</li><li>Das System blockiert das Löschen historischer Termine für Disponenten mit HTTP 409 PAST_APPOINTMENT_READONLY. Administratoren dürfen historische Termine löschen.</li></ul>
<h2>Ergebnis</h2>
<p>Der Termin ist vollständig gelöscht. Es existiert kein Termin-Datensatz mehr in der Datenbank, und es existieren keine Einträge mehr in der Join-Tabelle Termin–Mitarbeiter für diesen Termin.</p>
<p>Der Termin ist in keiner Sicht mehr auffindbar. Das bedeutet, dass er weder im Kalender noch in der Projekt-Terminliste, noch in der Mitarbeiter-Terminliste, noch in einer Tour-Terminliste, noch in einer kundenbezogenen Terminliste erscheint.</p>