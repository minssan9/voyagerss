import { Router, Request, Response } from 'express';
import { TodoService } from '../services/TodoService';

const router = Router();
const todoService = new TodoService();

router.get('/', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const resolvedParam = req.query.resolved as string | undefined;
    const resolved = resolvedParam !== undefined ? resolvedParam === 'true' : undefined;
    const todos = await todoService.list(date, resolved);
    res.json(todos);
  } catch (err) {
    console.error('[TodoController] list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const todo = await todoService.update(id, req.body);
    res.json(todo);
  } catch (err) {
    console.error('[TodoController] update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
