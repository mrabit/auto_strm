import { Router } from 'express';
import crypto from 'node:crypto';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

const todos: Todo[] = [];

const router = Router();

router.get('/api/todos', (_req, res) => {
  res.json(todos);
});

router.post('/api/todos', (req, res) => {
  const { title } = req.body as { title?: string };
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: title.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  console.log(`[todo] created: ${todo.title}`);
  res.status(201).json(todo);
});

router.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  const { title, done } = req.body as { title?: string; done?: boolean };
  if (title !== undefined) todo.title = title.trim();
  if (done !== undefined) todo.done = done;
  res.json(todo);
});

router.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  todos.splice(index, 1);
  console.log(`[todo] deleted: ${id}`);
  res.json({ success: true });
});

export default router;
