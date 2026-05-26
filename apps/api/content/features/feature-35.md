<h2>Dashboard-Builder: Kontextbezogene Übersichtsseiten</h2>

<h3>Ziel / Zweck</h3>
<p>Das Dashboard-Feature ermöglicht es Nutzern, für jede Seite der Anwendung eine persönliche Übersicht aus konfigurierbaren Widgets zusammenzustellen. Statt festgelegter Ansichten kann jeder Nutzer — je nach Kontext — genau die Informationen einblenden, die für seinen Arbeitsalltag relevant sind. Admins definieren darüber hinaus systemweite Standardlayouts, die für alle Nutzer als Ausgangspunkt dienen.</p>

<h3>Fachliche Beschreibung</h3>
<p>Dashboards sind benannte Widget-Sammlungen, die einem bestimmten <strong>Seitenkontext</strong> zugeordnet sind. Es gibt fünf Kontexte: <strong>Startseite</strong>, <strong>Global</strong>, <strong>Projekt</strong>, <strong>Meilenstein</strong> und <strong>Aufgabe</strong>. Die Startseite zeigt beim Öffnen der Anwendung direkt ein vollständig konfigurierbares Dashboard — es gibt keine separate Dashboard-Seite mehr. Auf Projekt- und Meilenstein-Detailseiten sowie auf Aufgabendetails ist das jeweilige Dashboard direkt in die Seite eingebettet.</p>
<p>Pro Kontext können mehrere Dashboards existieren. Der Nutzer wechselt per kompaktem Dropdown zwischen ihnen. Ein unauffälliger Einstellungs-Toggle blendet das Bearbeitungs-Panel ein, über das neue Dashboards angelegt, bestehende bearbeitet und Standard-Dashboards festgelegt werden können. Für Nutzer ohne Schreibrecht ist dieser Toggle nicht sichtbar.</p>
<p>Jedes Widget bezieht seine Daten aus dem Kontext der umschließenden Seite: Auf einer Projektdetailseite zeigt das Widget „Aufgaben nach Status" nur die Aufgaben dieses Projekts; auf der Startseite die systemweite Gesamtmenge.</p>

<h4>Widget-Bibliothek</h4>
<p>Die folgenden Widgets stehen — je nach Kontext — zur Auswahl:</p>
<ul>
  <li><strong>Aufgaben nach Status</strong> — Statusverteilung aller Aufgaben im aktuellen Kontext</li>
  <li><strong>Tickets nach Status</strong> — Statusverteilung aller Tickets im aktuellen Kontext</li>
  <li><strong>Aufgaben-Aktivitäten</strong> — zuletzt geänderte Aufgaben</li>
  <li><strong>Ticket-Aktivitäten</strong> — zuletzt geänderte Tickets</li>
  <li><strong>Gesamtaktivitäten</strong> — alle Aktivitäten über Objekte hinweg (global / Projekt)</li>
  <li><strong>Kommentare</strong> — neueste Kommentare im Kontext</li>
  <li><strong>Dateien &amp; Anhänge</strong> — zuletzt hochgeladene Anhänge</li>
  <li><strong>Meilensteinfortschritt</strong> — Fortschrittsübersicht der Meilensteine eines Projekts (ausschließlich im Projekt-Kontext)</li>
  <li><strong>Überfällige Aufgaben</strong> — Aufgaben mit überschrittenem Fälligkeitsdatum</li>
  <li><strong>Kalender</strong> — Monats- oder Wochenansicht der Termine</li>
  <li><strong>Nächste Termine</strong> — kommende Kalendereinträge auf einen Blick</li>
  <li><strong>Aufgaben-Board / -Liste</strong> — Kanban-Board oder Listenansicht für Aufgaben</li>
  <li><strong>Ticket-Board / -Liste</strong> — Kanban-Board oder Listenansicht für Tickets</li>
  <li><strong>Meilenstein-Board / -Liste / -Übersicht</strong> — verschiedene Ansichten für Meilensteine</li>
  <li><strong>Projekt-Board / -Liste</strong> — Projektübersicht (nur im globalen Kontext und auf der Startseite)</li>
</ul>

<h4>Dashboard-Builder</h4>
<p>Im Dashboard-Builder werden Widgets in einem zweispaltigen Raster angeordnet. Jedes Widget kann eine oder zwei Spalten breit sein. Pro Widget-Instanz können <em>Anzeigelimit</em> (1–50 Einträge) und <em>Sortierung</em> (nach Erstelldatum oder Änderungsdatum) konfiguriert werden.</p>

<h3>Regeln &amp; Randbedingungen</h3>
<ul>
  <li>Jedes Dashboard muss mindestens ein Widget enthalten — leere Dashboards werden abgelehnt.</li>
  <li>Jedes Widget kann pro Dashboard nur einmal verwendet werden (kein doppeltes Vorkommen).</li>
  <li>Der Kontext eines Dashboards ist nach der Erstellung unveränderlich.</li>
  <li>Das Widget „Meilensteinfortschritt" ist ausschließlich im Kontext <em>Projekt</em> zulässig.</li>
  <li>Vollbreite Widgets (Breite 2 Spalten) müssen in der linken Spalte beginnen.</li>
  <li>Das Anzeigelimit pro Widget muss zwischen 1 und 50 liegen; die Sortierung kann nach Erstelldatum oder Änderungsdatum erfolgen.</li>
  <li>Standard-Dashboards gibt es in zwei Geltungsbereichen: <em>Global</em> (Admin) und <em>Persönlich</em> (Nutzer). Der persönliche Standard überschreibt den globalen.</li>
  <li>Nur Admins dürfen systemweite Dashboards anlegen, bearbeiten und löschen sowie den globalen Standard eines Kontexts festlegen.</li>
  <li>Als globaler Standard kann ausschließlich ein System-Dashboard gesetzt werden.</li>
  <li>Nutzer können ihren persönlichen Standard auf eigene Dashboards oder System-Dashboards setzen, aber nicht auf Dashboards anderer Nutzer.</li>
  <li>Aufgaben-Statistiken im Projekt-Kontext umfassen derzeit nur direkt am Projekt hängende Aufgaben — Meilensteinaufgaben desselben Projekts sind noch nicht einbezogen (bekannter Mangel, offenes Ticket).</li>
  <li>Widget-Daten aktualisieren sich automatisch in Echtzeit (SSE), wenn ein anderer Tab oder Nutzer eine änderungsrelevante Aktion ausführt.</li>
  <li>Updates sind versionsgeschützt — beim Speichern muss die zuletzt gelesene Version angegeben werden, um gleichzeitige Änderungskonflikte zu erkennen.</li>
</ul>

<h2>Architektur &amp; Kontext</h2>

<h3>Betroffene Schema-Objekte</h3>
<ul>
  <li><strong>Dashboard</strong> — Benannte Widget-Sammlung mit Kontext, System-Flag und optionalem Eigentümer. Gehört entweder einem Nutzer oder ist systemweit (ohne Eigentümer). Besitzt einen Template-Schlüssel für vordefinierte Systemvorlagen.</li>
  <li><strong>Widget-Layout</strong> — Positionierung und Konfiguration eines Widgets innerhalb eines Dashboards (Spalte, Zeile, Spaltenbreite, Parameter).</li>
  <li><strong>Dashboard-Standard</strong> — Verknüpfung zwischen einem Dashboard und einem Geltungsbereich (Global oder persönliche Nutzer-ID) pro Kontext. Steuert, welches Dashboard initial angezeigt wird.</li>
</ul>

<pre class="mermaid">erDiagram
  Dashboard {
    int id
    string name
    string context
    bool isSystem
    string templateKey
    int ownerId
  }
  WidgetLayout {
    string widgetId
    int col
    int row
    int colSpan
    json params
  }
  DashboardDefault {
    string scopeType
    string scopeId
    string context
    int dashboardId
  }
  Dashboard ||--o{ WidgetLayout : "enthält"
  Dashboard ||--o{ DashboardDefault : "ist Standard für"
</pre>

<h3>Verwandte Features &amp; Abhängigkeiten</h3>
<ul>
  <li><strong>Kalender / Termine</strong> — Die Widgets „Kalender" und „Nächste Termine" beziehen ihre Daten aus dem Kalender-Feature.</li>
  <li><strong>Aufgaben, Tickets, Meilensteine, Projekte</strong> — Alle Status- und Aktivitäts-Widgets greifen auf diese Kernentitäten zu und filtern sie auf den jeweiligen Seitenkontext.</li>
  <li><strong>Rollen &amp; Berechtigungen</strong> — Die Ressource <em>dashboards</em> kennt die Aktionen <em>read</em>, <em>write</em>, <em>delete</em> und <em>admin</em>. Der Bearbeitungs-Toggle ist nur für Nutzer mit Schreibrecht sichtbar; Admin-Aktionen erfordern die Dashboard-Admin-Berechtigung.</li>
  <li><strong>Echtzeit / SSE</strong> — Widget-Inhalte werden über den SSE-Kanal der Anwendung automatisch aktualisiert.</li>
</ul>