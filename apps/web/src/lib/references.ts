export type ObjectReferenceType = "project" | "milestone" | "task" | "ticket" | "feature" | "useCase" | "note" | "wikiPage";

const referencePrefixes: Record<ObjectReferenceType, string> = {
  project: "PROJ",
  milestone: "MS",
  task: "TASK",
  ticket: "TKT",
  feature: "FEAT",
  useCase: "UC",
  note: "NOTE",
  wikiPage: "WIKI",
};

export function objectReference(type: ObjectReferenceType, id: number): string {
  return `${referencePrefixes[type]}-${id}`;
}
