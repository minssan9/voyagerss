import { applyLinearProjectId } from './linear-project';

describe('applyLinearProjectId', () => {
  it('sets projectId only when the config value is present', () => {
    const withProject: Record<string, unknown> = { teamId: 't' };
    applyLinearProjectId(withProject, 'p1');
    expect(withProject.projectId).toBe('p1');

    const teamOnly: Record<string, unknown> = { teamId: 't' };
    applyLinearProjectId(teamOnly, '');
    expect(teamOnly.projectId).toBeUndefined();
  });
});
