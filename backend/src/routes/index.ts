import { Router } from 'express';
import aviationRoutes from '../modules/aviation/routes';
import investandRoutes from '../modules/investand/routes';
// import workschdRoutes from '../modules/workschd/routes'; // Temporarily disabled - Prisma client issue

const router = Router();

router.use('/aviation', aviationRoutes);
router.use('/investand', investandRoutes);
// router.use('/workschd', workschdRoutes); // Temporarily disabled

export default router;
