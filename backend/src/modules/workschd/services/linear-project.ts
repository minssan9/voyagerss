export function applyLinearProjectId(input: Record<string, unknown>, projectId: string): void {
  if (projectId) input.projectId = projectId;
}
