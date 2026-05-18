<h1>FT (19): Attachments</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<p>Dieses Feature stellt eine domänenübergreifende Infrastruktur zur Verfügung, um Dateien strukturiert an fachliche Objekte zu binden. Ziel ist es, Upload, Speicherung, Anzeige und Download von Dokumenten einheitlich, sicher und wartbar umzusetzen, ohne die jeweilige Fachdomäne mit technischer Dateilogik zu belasten.</p>
<p>Attachments sind keine fachlichen Kerndaten, sondern ergänzende Dokumente zur Dokumentation, Nachvollziehbarkeit und Kommunikation.</p>
<h2>Fachliche Beschreibung</h2>
<p>Ein Attachment ist eine Datei, die eindeutig einem Parent-Objekt zugeordnet ist. Ein Attachment kann nie ohne Parent existieren.</p>
<p>Das System unterstützt Attachments aktuell für folgende Domänen:</p>
<ul><li>Projekt</li><li>Kunde</li><li>Mitarbeiter</li><li>Termin</li></ul>
<p>Die technische Behandlung ist für alle Domänen identisch. Unterschiede bestehen ausschließlich in der Parent-Zuordnung.</p>
<p>Ein Attachment besitzt Metadaten wie:</p>
<ul><li>Originaldateiname</li><li>Persistenter Speichername</li><li>MIME-Typ</li><li>Dateigröße</li><li>Erstellungszeitpunkt</li></ul>
<p>Dateien werden serverseitig gespeichert und über einen gesicherten Download-Endpunkt ausgeliefert. Die UI zeigt Attachments als kompakte Liste mit Vorschau- bzw. Download-Funktion.</p>
<p>Das Öffnen eines Attachments kann je nach Dateityp inline (z. B. PDF, Bild) oder als Download erfolgen. Eine explizite Download-Option ist zusätzlich verfügbar.</p>
<p>Attachments können über einen expliziten Lösch-Workflow entfernt werden. Der Workflow unterscheidet zwei Stufen: Entkopplung (Datensatz wird entfernt, physische Datei bleibt erhalten) und physische Löschung (Datensatz und Datei werden vollständig entfernt). Die physische Löschung erfordert eine explizite Nutzerentscheidung und ist bei Auftragsdokumenten nicht empfohlen.</p>
<h2>Regeln &amp; Randbedingungen</h2>
<h3>Allgemeine Struktur</h3>
<ul><li>Ein Attachment gehört immer genau einem Parent-Objekt.</li><li>Ein Attachment kann nie ohne Parent-Zuordnung existieren.</li><li>Für jede unterstützte Domäne existiert eine eigene Attachment-Tabelle.</li><li>Die Tabellen sind strukturgleich aufgebaut.</li><li>Zwischen Parent und Attachment besteht eine referenzielle Integrität (FK).</li></ul>
<h3>Upload</h3>
<ul><li>Upload erfolgt über Multipart-Request.</li><li>Feldname für die Datei ist systemweit einheitlich.</li><li>Es gilt eine definierte maximale Dateigröße.</li><li>Der Originaldateiname wird serverseitig sanitisiert.</li><li>Der persistente Dateiname wird eindeutig generiert.</li><li>Metadaten werden in der jeweiligen Attachment-Tabelle gespeichert.</li></ul>
<p>Ungültige Dateien oder Überschreiten der Größenbegrenzung führen zu einem Fehler und werden nicht gespeichert.</p>
<h3>Speicherung</h3>
<ul><li>Dateien werden serverseitig in einem definierten Upload-Verzeichnis gespeichert.</li><li>Der physische Speicherort wird nicht vom Client bestimmt.</li><li>Der Storage-Pfad wird als Metadatum gespeichert.</li><li>Attachments werden nicht versioniert.</li></ul>
<h3>Download</h3>
<ul><li>Download erfolgt ausschließlich über definierte API-Endpunkte.</li><li>Der Endpunkt liefert:</li><li>korrekten MIME-Typ</li><li>passende Content-Disposition</li><li>Für bestimmte Dateitypen (z. B. PDF, Bilder) kann Inline-Anzeige erlaubt sein.</li><li>Über einen expliziten Parameter kann Download erzwungen werden.</li></ul>
<p>Direkter Zugriff auf das Upload-Verzeichnis ist nicht vorgesehen.</p>
<h3>Löschung</h3>
<ul><li>Attachments können über einen Lösch-Workflow entfernt werden, der zwei Stufen unterscheidet.</li><li>Stufe 1 — Entkopplung: Der Attachment-Datensatz wird entfernt, die physische Datei bleibt im Upload-Verzeichnis erhalten.</li><li>Stufe 2 — Physische Löschung: Datensatz und physische Datei werden vollständig entfernt. Nur mit expliziter Nutzerentscheidung.</li><li>Vor jeder Löschoperation wird dem Akteur folgende Sicherheitsfrage gestellt: „Soll nur die Verknüpfung zum [Termin / Projekt / Kunde / Mitarbeiter] entfernt oder auch die physische Datei gelöscht werden? (Nicht empfohlen bei Auftragsdokumenten.)“</li><li>Die Sicherheitsfrage benennt den konkreten Parent-Typ dynamisch.</li><li>Löschung setzt Änderungsrechte auf das Parent-Objekt voraus.</li><li>UI: Jedes Attachment-Badge erhält einen Action-Button, der den Lösch-Workflow auslöst.</li><li>API-seitig sind Delete-Endpunkte vorhanden und durch Berechtigungsprüfung abgesichert.</li></ul>
<h3>Sicherheit und Verantwortlichkeit</h3>
<ul><li>Die Parent-Existenz wird vor Speicherung eines Attachments geprüft.</li><li>Attachments haben keine eigenständigen Berechtigungen, sondern folgen den Berechtigungen ihres Parents.</li><li>UI-seitige Einschränkungen ersetzen keine serverseitige Prüfung.</li><li>Der Download erfolgt ausschließlich nach erfolgreicher Identifikation des Attachments.</li></ul>