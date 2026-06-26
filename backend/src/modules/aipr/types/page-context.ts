import { z } from 'zod';

export const PageContextSchema = z.object({
  url: z.string().url(),
  pathname: z.string(),
  selector: z.string().optional(),
  line: z.number().int().optional(),
  column: z.number().int().optional(),
  selectedText: z.string().optional(),
  elementText: z.string().optional(),
  viewport: z.object({ w: z.number(), h: z.number() }),
  capturedAt: z.string(),
  captureMode: z.enum(['fab_open', 'element_pick', 'text_selection']),
});

export type PageContext = z.infer<typeof PageContextSchema>;
