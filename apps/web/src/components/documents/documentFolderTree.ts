import type { AttachmentFolder } from "@taskmanager/shared-types";

export interface DocumentFolderTreeItem {
  folder: AttachmentFolder;
  depth: number;
  path: string;
}

function byName(left: AttachmentFolder, right: AttachmentFolder): number {
  return left.name.localeCompare(right.name, "de", { sensitivity: "base" });
}

export function flattenDocumentFolders(folders: AttachmentFolder[]): DocumentFolderTreeItem[] {
  const folderIds = new Set(folders.map((folder) => folder.id));
  const childrenByParent = new Map<number | null, AttachmentFolder[]>();
  for (const folder of folders) {
    const parentId = folder.parentId !== null && folderIds.has(folder.parentId) ? folder.parentId : null;
    const children = childrenByParent.get(parentId);
    if (children) {
      children.push(folder);
    } else {
      childrenByParent.set(parentId, [folder]);
    }
  }
  for (const children of childrenByParent.values()) {
    children.sort(byName);
  }

  const result: DocumentFolderTreeItem[] = [];
  const visited = new Set<number>();
  function visit(folder: AttachmentFolder, depth: number, parentPath: string): void {
    if (visited.has(folder.id)) {
      return;
    }
    visited.add(folder.id);
    const path = parentPath ? `${parentPath} / ${folder.name}` : folder.name;
    result.push({ folder, depth, path });
    for (const child of childrenByParent.get(folder.id) ?? []) {
      visit(child, depth + 1, path);
    }
  }

  for (const root of childrenByParent.get(null) ?? []) {
    visit(root, 0, "");
  }
  for (const folder of [...folders].sort(byName)) {
    visit(folder, 0, "");
  }
  return result;
}

export function documentFolderDescendantIds(folders: AttachmentFolder[], folderId: number): Set<number> {
  const childrenByParent = new Map<number, number[]>();
  for (const folder of folders) {
    if (folder.parentId !== null) {
      const children = childrenByParent.get(folder.parentId);
      if (children) {
        children.push(folder.id);
      } else {
        childrenByParent.set(folder.parentId, [folder.id]);
      }
    }
  }
  const descendants = new Set<number>();
  const queue = [...(childrenByParent.get(folderId) ?? [])];
  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    if (currentId === undefined || descendants.has(currentId)) {
      continue;
    }
    descendants.add(currentId);
    queue.push(...(childrenByParent.get(currentId) ?? []));
  }
  return descendants;
}
