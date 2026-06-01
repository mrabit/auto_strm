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
  const body = req.body as Record<string, unknown>;
  const title = body?.title;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: '标题不能为空' });
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
    return res.status(404).json({ error: '待办事项不存在' });
  }
  const body = req.body as Record<string, unknown>;
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return res.status(400).json({ error: '标题必须是非空字符串' });
    }
    todo.title = body.title.trim();
  }
  if (body.done !== undefined) {
    if (typeof body.done !== 'boolean') {
      return res.status(400).json({ error: 'done 必须是布尔值' });
    }
    todo.done = body.done;
  }
  res.json(todo);
});

router.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '待办事项不存在' });
  }
  todos.splice(index, 1);
  console.log(`[todo] deleted: ${id}`);
  res.json({ success: true });
});

export default router;
