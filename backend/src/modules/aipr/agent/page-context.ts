import type { PageContext } from './types';

export function formatPageContextBlock(ctx: PageContext | null | undefined): string {
  if (!ctx) return '';

  const lines = [
    '## Page context (user feedback location)',
    '',
    `- **URL:** ${ctx.url}`,
    `- **Path:** ${ctx.pathname}`,
    `- **Capture mode:** ${ctx.captureMode}`,
    `- **Viewport:** ${ctx.viewport.w}×${ctx.viewport.h}`,
    `- **Captured at:** ${ctx.capturedAt}`,
  ];

  if (ctx.selector) lines.push(`- **Element selector:** \`${ctx.selector}\``);
  if (ctx.line != null) lines.push(`- **Line:** ${ctx.line}`);
  if (ctx.column != null) lines.push(`- **Column:** ${ctx.column}`);
  if (ctx.selectedText) lines.push(`- **Selected text:** ${truncate(ctx.selectedText, 500)}`);
  if (ctx.elementText) lines.push(`- **Element text:** ${truncate(ctx.elementText, 300)}`);

  lines.push('');
  return lines.join('\n');
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}
