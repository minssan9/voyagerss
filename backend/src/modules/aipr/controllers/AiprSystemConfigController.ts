import { Response } from 'express';
import { AiprRequest } from '../middleware/auth';
import { aiprSystemConfigService } from '../services/AiprSystemConfigService';

export class AiprSystemConfigController {
  async getCategories(_req: AiprRequest, res: Response) {
    try {
      const categories = await aiprSystemConfigService.getCategories();
      res.json({ data: categories });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async listConfigs(req: AiprRequest, res: Response) {
    try {
      const category = req.query.category as string | undefined;
      const items = await aiprSystemConfigService.listConfigs(category);
      res.json({ data: items, total: items.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async reloadConfigs(_req: AiprRequest, res: Response) {
    try {
      await aiprSystemConfigService.reloadAll();
      res.json({ message: 'AIPR config cache reloaded from DB' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async getConfig(req: AiprRequest, res: Response) {
    try {
      const config = await aiprSystemConfigService.getConfig(req.params.key);
      if (!config) {
        res.status(404).json({ message: `Config "${req.params.key}" not found` });
        return;
      }
      res.json({ data: config });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async upsertConfig(req: AiprRequest, res: Response) {
    try {
      const { key } = req.params;
      const { value, isEncrypted, description, category } = req.body;
      const updatedBy = req.user?.email ?? 'admin';
      await aiprSystemConfigService.upsertConfig(
        key,
        String(value),
        { isEncrypted, description, category },
        updatedBy
      );
      res.json({ message: `Config "${key}" saved successfully` });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async deleteConfig(req: AiprRequest, res: Response) {
    try {
      await aiprSystemConfigService.deleteConfig(req.params.key);
      res.json({ message: `Config "${req.params.key}" deleted successfully` });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
}

export const aiprSystemConfigController = new AiprSystemConfigController();
