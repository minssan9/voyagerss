import { Router } from 'express';
import aviationRoutes from '../modules/aviation/routes';
import investandRoutes from '../modules/investand/routes';
// import workschdRoutes from '../modules/workschd/routes'; // Temporarily disabled - Prisma client issue
import findashRoutes from '../modules/findash/routes';

const router = Router();

router.use('/aviation', aviationRoutes);
router.use('/investand', investandRoutes);
// router.use('/workschd', workschdRoutes); // Temporarily disabled
router.use('/findash', findashRoutes);

export default router;
