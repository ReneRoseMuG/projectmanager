<h1>UC 07/14: DB-Dump importieren</h1>
<h2>Metadaten</h2>
<ul><li>Feature: <a href="../ft-07-automatisierte-datensicherung-und-fallback.md">FT (07): Automatisierte Datensicherung und Fallback</a></li></ul>
<h2>Akteur</h2>
<p>Administrator</p>
<h2>Ziel</h2>
<p>Einen vorhandenen DB-Dump nach Vorprüfung kontrolliert in die Zielinstanz importieren.</p>
<h2>Vorbedingungen</h2>
<ul><li>Administrator ist angemeldet.</li><li>Dump-ZIP liegt vor.</li><li>Zielumgebung erfüllt die konfigurierten Datenbank-Sicherheitsregeln.</li></ul>
<h2>Ablauf</h2>
<ul><li>Administrator lädt das Dump-ZIP zur Preview hoch.</li><li>System prüft ZIP, <code>data.json</code>, optionales <code>manifest.json</code>, Tabellen- und Upload-Prüfsummen sowie blockierende Sicherheitsregeln.</li><li>System zeigt Importbereitschaft, Warnungen, Blocker und Sicherheitsbestätigung an.</li><li>Administrator bestätigt den Import mit der erwarteten Sicherheitsphrase.</li><li>System legt vor dem Import ein Zielbackup und Transfer-Artefakte an.</li><li>System importiert Tabellen und Anhänge, mappt <code>users.roleCode</code> auf lokale Systemrollen und verifiziert Tabellen- und Upload-Ergebnis.</li></ul>
<h2>Alternativen</h2>
<ul><li>Nicht-Admin ruft Preview oder Apply auf → Zugriff wird serverseitig verweigert.</li><li>Dump ist beschädigt oder unvollständig → Preview beziehungsweise Apply bricht mit fachlichem Fehler ab.</li><li>Manifest-Prüfsummen widersprechen dem ZIP-Inhalt → Import wird blockiert.</li><li>Benutzer referenzieren eine unbekannte Rolle → Apply bricht ab und die Datenbanktransaktion wird zurückgerollt.</li><li>Legacy-Dump ohne <code>users</code> → Import bleibt tolerant; lokale Benutzer werden nicht gelöscht.</li></ul>
<h2>Ergebnis</h2>
<p>Der Dump ist importiert und verifiziert oder der Import wurde ohne Teilübernahme blockiert. Ein echter DB-Dry-Run vor dem Apply ist als offene Erweiterung dokumentiert, aber noch nicht Bestandteil dieses Use Cases.</p>