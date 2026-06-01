import { Router } from 'express';
import db from '../db';

const router = Router();

router.get('/api/seriesupdates', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const items = await db.getSeriesUpdates(search || undefined);
    res.json(items);
  } catch (error) {
    console.error(
      '[seriesupdate] 获取列表失败:',
      error instanceof Error ? error.message : String(error),
    );
    res.status(500).json({ error: '获取列表失败' });
  }
});

router.post('/api/seriesupdates', async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { name, SERIES_ID, SEASON_ID, URL } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '名称不能为空' });
  }

  try {
    const item = await db.createSeriesUpdate({
      name: name.trim(),
      SERIES_ID: typeof SERIES_ID === 'string' ? SERIES_ID : '',
      SEASON_ID: typeof SEASON_ID === 'string' ? SEASON_ID : '',
      URL: typeof URL === 'string' ? URL : '',
    });
    console.log(`[seriesupdate] created: ${item.name}`);
    res.status(201).json(item);
  } catch (error) {
    console.error(
      '[seriesupdate] 创建失败:',
      error instanceof Error ? error.message : String(error),
    );
    res.status(500).json({ error: '创建失败' });
  }
});

router.put('/api/seriesupdates/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, string> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return res.status(400).json({ error: '名称必须是非空字符串' });
    }
    updates.name = body.name.trim();
  }
  if (typeof body.SERIES_ID === 'string') updates.SERIES_ID = body.SERIES_ID;
  if (typeof body.SEASON_ID === 'string') updates.SEASON_ID = body.SEASON_ID;
  if (typeof body.URL === 'string') updates.URL = body.URL;

  try {
    const item = await db.updateSeriesUpdate(id, updates);
    res.json(item);
  } catch (error) {
    console.error(
      '[seriesupdate] 更新失败:',
      error instanceof Error ? error.message : String(error),
    );
    const status = (error as { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ error: '记录不存在' });
    } else {
      res.status(500).json({ error: '更新失败' });
    }
  }
});

router.delete('/api/seriesupdates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.deleteSeriesUpdate(id);
    console.log(`[seriesupdate] deleted: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error(
      '[seriesupdate] 删除失败:',
      error instanceof Error ? error.message : String(error),
    );
    const status = (error as { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ error: '记录不存在' });
    } else {
      res.status(500).json({ error: '删除失败' });
    }
  }
});

export default router;
