<h1>FT (27): Produktverwaltung und Auftragspositionen</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<p>Produkte (Saunamodelle) und ihre Komponenten (Bauteile/Varianten) werden als strukturierte Stammdaten mit optionalen Spezifikationen erfasst und gepflegt. Damit werden Auftragspositionen präzise referenzierbar, statt nur Freitextbeschreibungen zu verwenden. Admin-Benutzer verwalten die Produktkatalogdaten, Disponenten nutzen diese zum Erfassen von Auftragspositionen.</p>
<h2>Fachliche Beschreibung</h2>
<h3>Produkte und Produktkategorien</h3>
<p>Ein <strong>Produkt</strong> repräsentiert ein fertiges Saunamodell (z.B. Kolmikko, Suuri, Mini). Jedes Produkt wird genau einer <strong>Produktkategorie</strong> zugeordnet (z.B. &quot;Sauna-Modelle&quot;, &quot;Zubehör&quot;). Produkte haben einen eindeutigen Namen, eine optionale Beschreibung und ein Aktivitätskennzeichen. Nur Admins können Produkte anlegen, bearbeiten oder deaktivieren.</p>
<h3>Komponenten und Komponentenkategorien</h3>
<p>Eine <strong>Komponente</strong> ist ein eigenständiges Bauteil (z.B. Rückwand, Ofen, Vorderwand, Fenster, Türen). Jede Komponente wird genau einer <strong>Komponentenkategorie</strong> zugeordnet (z.B. &quot;Wände&quot;, &quot;Heizung&quot;, &quot;Türen&quot;) und kann eine optionale Beschreibung haben. Komponenten und Produkte sind voneinander unabhängige Stammdatenbereiche ohne strukturelle Verknüpfung.</p>
<h3>Detailseiten und Attachments</h3>
<p>Für jedes Produkt und jede Komponente steht eine Detailseite bereit, die alle Stammdatenfelder strukturiert darstellt. Die Detailseite ist für Administrator und Disponent sichtbar.</p>
<p>Produkte und Komponenten können Attachments erhalten (z. B. technische Zeichnungen, Aufstellungspläne, Montageanleitungen). Die Attachment-Infrastruktur entspricht vollständig FT-19. Attachments sind immer genau einem Parent-Objekt zugeordnet (Produkt oder Komponente) und können nicht ohne Parent existieren.</p>
<h3>Integration mit Auftragsmanagement</h3>
<p>Auftragspositionen (<code>project_order_items</code>) werden pro Projekt verwaltet, um eine Artikelliste pflegen zu können. Eine Position referenziert entweder ein Produkt oder eine Komponente — beide Felder sind unabhängig voneinander wählbar (kein Cascade-Dropdown). Mindestens eines von beiden muss gesetzt sein. Eine optionale freie Beschreibung kann zusätzlich angegeben werden. Die Zuordnung erfolgt strukturiert über Foreign Keys, nicht als Freitextbeschreibung.</p>
<h2>Regeln &amp; Randbedingungen</h2>
<h3>Detailseiten</h3>
<ul><li>Jedes Produkt und jede Komponente besitzt eine Detailseite.</li><li>Die Detailseite zeigt alle gespeicherten Stammdatenfelder sowie die zugehörige Attachmentliste.</li><li>Sichtbarkeit: Administrator und Disponent.</li></ul>
<h3>Attachments</h3>
<ul><li>Produkte und Komponenten können beliebig viele Attachments erhalten.</li><li>Es existieren je eine eigene Attachment-Tabelle für Produkte (<code>product_attachments</code>) und Komponenten (<code>component_attachments</code>).</li><li>Upload und Löschen sind ausschließlich Administratoren vorbehalten.</li><li>Download ist für Administrator und Disponent erlaubt.</li><li>Der Lösch-Workflow folgt dem zweistufigen Verfahren aus FT-19 (Entkopplung und physische Löschung) mit identischer Sicherheitsfrage.</li><li>Alle weiteren Regeln zu Upload, Speicherung, Download und Sicherheit gelten wie in FT-19 definiert.</li></ul>
<h3>Namensuniqueness und Eindeutigkeit</h3>
<ul><li>Produktnamen sind global eindeutig (UNIQUE).</li><li>Komponentennamen sind global eindeutig (UNIQUE).</li><li>Kategorienamen sind eindeutig innerhalb ihres Typs.</li></ul>
<h3>Kategorien</h3>
<ul><li>Jedes Produkt muss genau einer Produktkategorie zugeordnet sein.</li><li>Jede Komponente muss genau einer Komponentenkategorie zugeordnet sein.</li><li>Kategorien sind pflegende Stammdaten (Admin-Only).</li></ul>
<h3>Lebenszyklus und Deaktivierung</h3>
<ul><li>Inaktive Produkte, Komponenten und Kategorien werden nicht gelöscht, sondern über <code>is_active = false</code> deaktiviert.</li><li>Deaktivierte Stammdaten werden in Auswahlfeldern nicht mehr angeboten.</li><li>Historische Auftragspositionen, die auf inaktive Stammdaten verweisen, bleiben konsistent referenzierbar.</li><li>Löschen ist blockiert, solange aktive Referenzen existieren (z.B. Auftragspositionen, die eine Komponente nutzen).</li></ul>
<h3>Berechtigungen</h3>
<ul><li><strong>Admins:</strong> Volle Mutations- und Löschrechte auf Kategorien, Produkte und Komponenten.</li><li><strong>Disponenten:</strong> Lesezugriff auf alle Stammdaten. Keine Mutations- oder Löschrechte.</li><li>Serverseitige Berechtigungsprüfung ist verpflichtend; UI-seitige Beschränkung reicht nicht.</li></ul>
<h3>Referenzintegrität</h3>
<ul><li>Beim Löschen eines Produkts oder einer Komponente wird geprüft, ob noch aktive Auftragspositionen darauf verweisen; wenn ja, wird das Löschen blockiert.</li></ul>