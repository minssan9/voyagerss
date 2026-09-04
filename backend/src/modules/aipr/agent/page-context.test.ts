import { formatPageContextBlock } from './page-context';

describe('formatPageContextBlock', () => {
  it('should_return_empty_for_null_context', () => {
    expect(formatPageContextBlock(null)).toBe('');
    expect(formatPageContextBlock(undefined)).toBe('');
  });

  it('should_format_page_context_fields', () => {
    const block = formatPageContextBlock({
      url: 'https://app.example.com/issues/1',
      pathname: '/issues/1',
      selector: 'div.issue-title',
      line: 42,
      column: 8,
      selectedText: 'bug here',
      elementText: 'Issue title',
      viewport: { w: 1280, h: 720 },
      capturedAt: '2026-06-12T00:00:00.000Z',
      captureMode: 'fab_open',
    });

    expect(block).toContain('Page context');
    expect(block).toContain('https://app.example.com/issues/1');
    expect(block).toContain('div.issue-title');
    expect(block).toContain('**Line:** 42');
    expect(block).toContain('**Column:** 8');
    expect(block).toContain('bug here');
  });
});
