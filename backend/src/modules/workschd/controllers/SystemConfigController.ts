import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { SystemConfigService } from '../services/SystemConfigService';

const svc = new SystemConfigService();

export class SystemConfigController {
  async listConfigs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { category } = req.query;
      const items = await svc.listConfigs(category as string | undefined);
      res.json({ data: items, total: items.length });
    } catch (err: any) {
      console.error('[SystemConfigController] listConfigs error:', err);
      res.status(500).json({ message: 'Failed to list configs' });
    }
  }

  async getConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const item = await svc.getConfig(key);
      if (!item) {
        res.status(404).json({ message: `Config key "${key}" not found` });
        return;
      }
      res.json(item);
    } catch (err: any) {
      console.error('[SystemConfigController] getConfig error:', err);
      res.status(500).json({ message: 'Failed to get config' });
    }
  }

  async upsertConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { value, isEncrypted, description, category } = req.body;

      if (value === undefined || value === null) {
        res.status(400).json({ message: '"value" is required' });
        return;
      }

      const updatedBy = req.user?.email ?? 'admin';
      await svc.upsertConfig(key, String(value), { isEncrypted, description, category }, updatedBy);
      res.json({ message: `Config "${key}" saved successfully` });
    } catch (err: any) {
      console.error('[SystemConfigController] upsertConfig error:', err);
      res.status(500).json({ message: 'Failed to save config' });
    }
  }

  async deleteConfig(req: AuthRequest, res: Response): Promise<void> {
    const { key } = req.params;
    try {
      await svc.deleteConfig(key);
      res.json({ message: `Config "${key}" deleted successfully` });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        res.status(404).json({ message: `Config key "${key}" not found` });
        return;
      }
      console.error('[SystemConfigController] deleteConfig error:', err);
      res.status(500).json({ message: 'Failed to delete config' });
    }
  }

  async reloadConfigs(_req: AuthRequest, res: Response): Promise<void> {
    try {
      await svc.reloadAll();
      res.json({ message: 'Config cache reloaded from DB' });
    } catch (err: any) {
      console.error('[SystemConfigController] reloadConfigs error:', err);
      res.status(500).json({ message: 'Failed to reload configs' });
    }
  }

  async getCategories(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const categories = await svc.getCategories();
      res.json({ data: categories });
    } catch (err: any) {
      console.error('[SystemConfigController] getCategories error:', err);
      res.status(500).json({ message: 'Failed to get categories' });
    }
  }
}
