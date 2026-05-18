<h1>FT (20): Rollenbasierte Zugriffsbeschränkungen und UI-Steuerung</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<p>Dieses Feature definiert die fachliche Bedeutung der Rollen <strong>Admin</strong>, <strong>Disponent(in)</strong> und <strong>Leser</strong> innerhalb der Anwendung und regelt, welche Funktionen, Aktionen und Navigationsbereiche rollenspezifisch verfügbar sind.</p>
<p>Ziel ist es, eine klare Verantwortungsstruktur im System zu etablieren, ohne die bestehende Daten- oder Terminlogik zu verändern. Die Zugriffsbeschränkungen betreffen ausschließlich Sichtbarkeit, Bedienbarkeit und serverseitig durchgesetzte Autorisierung.</p>
<p>Die fachliche Sicherheit bleibt stets serverseitig abgesichert (vgl. FT (14)); FT (20) ergänzt diese Grundlage um UI-seitige Steuerung und klare Nutzungsmodelle.</p>
<h2>Fachliche Beschreibung</h2>
<p>Jeder Benutzer besitzt genau eine Rolle. Diese Rolle definiert seinen funktionalen Handlungsspielraum im System.</p>
<p>Die Anwendung unterscheidet drei Rollen:</p>
<h3>1. Admin</h3>
<p>Der Admin besitzt systemweite Verantwortung.</p>
<p>Er darf:</p>
<ul><li>Benutzer verwalten und Rollen ändern</li><li>Systemnahe Stammdaten verwalten</li><li>Gesperrte Termine bearbeiten</li><li>Alle Funktionen der Disposition nutzen</li></ul>
<p>Der Admin ist die höchste Berechtigungsstufe. Es muss stets mindestens ein Admin im System existieren.</p>
<h3>2. Disponent(in)</h3>
<p>Der Disponent ist der operative Hauptnutzer der Anwendung.</p>
<p>Er darf:</p>
<ul><li>Kunden anlegen und bearbeiten</li><li>Projekte anlegen, bearbeiten und deaktivieren</li><li>Termine anlegen, verschieben, bearbeiten und löschen</li><li>Mitarbeiter zuweisen</li><li>Touren und Teams verwalten</li><li>Notizen und Anhänge verwalten</li><li>Druckfunktionen nutzen</li></ul>
<p>Der Disponent darf keine Benutzerrollen ändern und keine systemweiten Administrationsfunktionen ausführen.</p>
<h3>3. Leser</h3>
<p>Der Leser ist ein rein lesender Nutzer.</p>
<p>Er darf:</p>
<ul><li>Kalenderansichten anzeigen</li><li>Projekt- und Kundendetails einsehen</li><li>Eigene und fremde Termine einsehen</li><li>Mitarbeiteransichten im Lesemodus öffnen</li><li>Reports lesend aufrufen und erzeugen</li></ul>
<p>Der Leser darf keine Daten verändern, anlegen oder löschen.</p>
<p>Die Oberfläche für Leser ist funktional reduziert und enthält keine aktiven Bearbeitungselemente. Das Journal bleibt für Leser verborgen. Monitoring bleibt weiterhin Disponenten und Admins vorbehalten.</p>
<h2>Grundprinzipien</h2>
<p>1. Sicherheit wird serverseitig durchgesetzt.<br>2. UI-Sichtbarkeit ist eine Komfortfunktion, keine Sicherheitsmaßnahme.<br>3. Die fachliche Datenstruktur bleibt unverändert.<br>4. Es wird keine Rechte-Matrix eingeführt.<br>5. Rollen wirken ausschließlich auf Funktionsverfügbarkeit, nicht auf Datenmodellierung.</p>
<h2>Regeln &amp; Randbedingungen</h2>
<ul><li>Rollen ändern keine Datenmodelle.</li><li>Rollen beeinflussen keine Aggregationslogik.</li><li>Rollen beeinflussen keine Query-Struktur.</li><li>Rollen verändern keine Termin-Lane-Logik.</li><li>Navigation wird nicht umstrukturiert, sondern nur ergänzt oder konditional gerendert.</li><li>Deep-Link-Aufrufe werden serverseitig validiert.</li><li>Es darf keine clientseitige Autorisierungslogik ohne serverseitige Gegenprüfung existieren.</li><li>Ein Leser sieht alle Termine, jedoch ausschließlich im Lesemodus.</li><li>Reports sind für Leser serverseitig lesbar; globale Preset-Verwaltung und andere administrative Reportfunktionen bleiben eingeschränkt.</li><li>Der Mitarbeiterbereich darf für Leser sichtbar sein, bleibt dort aber vollständig read-only.</li><li>Das Journal bleibt für Leser unsichtbar und serverseitig gesperrt.</li><li>Der letzte Admin darf nicht entfernt oder herabgestuft werden.</li><li>Dokumentextraktion eröffnet keine zusätzlichen Rechte. Kunden-, Projekt- und Terminanlage aus einem Extraktionsdialog sind serverseitig nach denselben Rollenregeln zu prüfen wie die manuelle Anlage.</li></ul>