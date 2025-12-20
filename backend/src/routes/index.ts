import { Router } from 'express';
// import aviationRoutes from '../modules/aviation/routes'; // Temporarily disabled
// import investandRoutes from '../modules/investand/routes'; // Temporarily disabled - needs Prisma migration
import workschdRoutes from '../modules/workschd/routes';
import findashRoutes from '../modules/findash/routes';

const router = Router();

// router.use('/aviation', aviationRoutes); // Temporarily disabled
// router.use('/investand', investandRoutes); // Temporarily disabled - needs Prisma migration
router.use('/workschd', workschdRoutes);
router.use('/findash', findashRoutes);

export default router;
