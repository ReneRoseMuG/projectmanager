<h1>FT (16): Hilfetexte verwalten</h1>
<h2>Metadaten</h2>
<ul><li>Status: Abgeschlossen</li><li>Typ: Feature</li></ul>
<h2>Ziel / Zweck</h2>
<p>Dieses Feature ermöglicht die zentrale Verwaltung von Hilfetexten in der Anwendung, die von Benutzern kontextbezogen über Hilfe-Symbole in der UI abgerufen werden können. Ziel ist, fachliche Bedienhinweise konsistent, wartbar und rollenbasiert bereitzustellen, ohne dass Hilfetexte in einzelnen UI-Views dupliziert oder fest im Frontend verdrahtet werden müssen.</p>
<h2>Fachliche Beschreibung</h2>
<p>Ein Hilfetext ist ein eigenständiges, administrierbares Objekt mit eindeutiger Kennung („help_key“), Titel und formatierbarem Inhalt (Markdown). Hilfetexte werden in der UI kontextbezogen über ein Hilfe-Symbol (z. B. „?“ oder „i“) angezeigt. Die UI übergibt beim Abruf den help_key, das System liefert den passenden Hilfetext zurück.</p>
<p>Hilfetexte sind rein informativ. Sie verändern keine fachlichen Daten (Kunden, Projekte, Termine, Touren etc.) und sind unabhängig von Termin- und Planungslogik. Sie dienen der besseren Bedienbarkeit, der Einarbeitung und der Reduzierung von Rückfragen.</p>
<p>Die Pflege der Hilfetexte erfolgt administrativ. Disponenten und Leser können Hilfetexte anzeigen, aber nicht verändern. Admins können Hilfetexte anlegen, bearbeiten, aktivieren/deaktivieren und verwalten.</p>
<h2>Regeln &amp; Randbedingungen</h2>
<p>Ein Hilfetext besitzt einen eindeutigen help_key und darf pro help_key nur einmal existieren.</p>
<p>Hilfetexte sind global gültig; die Kontextbindung erfolgt ausschließlich über den help_key, nicht über direkte Fremdschlüssel auf Domainobjekte.</p>
<p>Hilfetexte haben keine fachliche Wirkung und sind ausschließlich Anzeige-/Dokumentationsinhalte.</p>
<p>Hilfetexte können aktiviert/deaktiviert werden; deaktivierte Hilfetexte sind in der UI nicht abrufbar, bleiben aber aus Gründen der Nachvollziehbarkeit erhalten.</p>
<p>Die Verwaltung (CRUD) der Hilfetexte ist ausschließlich der Rolle Admin vorbehalten.</p>
<p>Die Anzeige der Hilfetexte ist für alle Rollen erlaubt, sofern der Text aktiv ist.</p>
<p>Der Inhalt wird als Markdown gespeichert; externe Ressourcen- oder Dateipfadabhängigkeiten aus dem Client sind nicht vorgesehen.</p>