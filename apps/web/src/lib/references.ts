export type ObjectReferenceType = "project" | "milestone" | "task" | "ticket" | "feature" | "useCase";

const referencePrefixes: Record<ObjectReferenceType, string> = {
  project: "PROJ",
  milestone: "MS",
  task: "TASK",
  ticket: "TKT",
  feature: "FEAT",
  useCase: "UC",
};

export function objectReference(type: ObjectReferenceType, id: number): string {
  return `${referencePrefixes[type]}-${id}`;
}
