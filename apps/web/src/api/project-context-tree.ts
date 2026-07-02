import type { MoveOwner, ProjectContextTreeNode } from "@taskmanager/shared-types";
import { api } from "./client";

export async function getProjectContextTree(projectId: number): Promise<ProjectContextTreeNode> {
  return api.get(`projects/${projectId}/context-tree`).json<ProjectContextTreeNode>();
}

export async function getProjectContextTreeForOwner(owner: MoveOwner): Promise<ProjectContextTreeNode> {
  const searchParams = {
    ownerType: owner.type,
    ownerId: owner.id
  };
  return api.get("projects/context-tree", { searchParams }).json<ProjectContextTreeNode>();
}
