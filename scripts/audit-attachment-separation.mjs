#!/usr/bin/env node

import { config as loadDotenv } from "dotenv";
import fs from "node:fs";
import mysql from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotenv({ path: path.join(repoRoot, "apps", "api", ".env") });

const ssl = ["true", "1"].includes(process.env.DB_SSL ?? "")
  ? {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.join(repoRoot, "docs", "Zertifikate", "ca.pem"), "utf8")
    }
  : undefined;

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl
});

try {
  const [attachmentRows] = await connection.query(`
    WITH owner_links AS (
      SELECT attachment_id FROM project_attachments
      UNION ALL SELECT attachment_id FROM milestone_attachments
      UNION ALL SELECT attachment_id FROM task_attachments
      UNION ALL SELECT attachment_id FROM feature_attachments
      UNION ALL SELECT attachment_id FROM wiki_page_attachments
      UNION ALL SELECT attachment_id FROM ticket_attachments
    ), owner_counts AS (
      SELECT attachment_id, COUNT(*) AS owner_count
      FROM owner_links
      GROUP BY attachment_id
    )
    SELECT
      COUNT(*) AS total,
      SUM(a.is_in_document_library = 1) AS documents,
      SUM(a.is_in_document_library = 0) AS parent_attachment_candidates,
      SUM(a.is_in_document_library = 0 AND COALESCE(o.owner_count, 0) = 0) AS ownerless_candidates,
      SUM(a.is_in_document_library = 0 AND COALESCE(o.owner_count, 0) = 1) AS single_owner_candidates,
      SUM(a.is_in_document_library = 0 AND COALESCE(o.owner_count, 0) > 1) AS multi_owner_candidates,
      SUM(a.is_in_document_library = 1 AND COALESCE(o.owner_count, 0) > 0) AS linked_document_candidates
    FROM attachments a
    LEFT JOIN owner_counts o ON o.attachment_id = a.id
  `);
  const [folderRows] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM attachment_folders) AS collections,
      (SELECT COUNT(*) FROM attachment_folders WHERE project_id IS NOT NULL) AS project_bound_collections,
      (SELECT COUNT(*) FROM folder_attachments) AS collection_links,
      (
        SELECT COUNT(*)
        FROM folder_attachments fa
        INNER JOIN attachments a ON a.id = fa.attachment_id
        WHERE a.is_in_document_library = 0
      ) AS parent_candidate_collection_links,
      (SELECT COUNT(*) FROM attachment_local_folders) AS local_folder_links
  `);

  const attachmentSummary = attachmentRows[0];
  const folderSummary = folderRows[0];
  const hasAmbiguousCandidates =
    Number(attachmentSummary.ownerless_candidates) > 0 ||
    Number(attachmentSummary.multi_owner_candidates) > 0;

  process.stdout.write(`${JSON.stringify({ attachmentSummary, folderSummary, hasAmbiguousCandidates }, null, 2)}\n`);
  if (hasAmbiguousCandidates) {
    process.exitCode = 2;
  }
} finally {
  await connection.end();
}
