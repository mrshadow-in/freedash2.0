import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    createServer,
    getMyServers,
    deleteServer,
    getPlans, // Kept as it's used in a route
    upgradeServer,
    powerServer,
    getUpgradePricing,
    getServer,
    getServerUsage,
    getConsoleCredentials,
    getServerFiles,
    getFile,
    writeFile,
    createServerFolder,
    getServerUploadUrl,
    reinstallServerAction,
    getServerResources,
    renameServerFile,
    deleteServerFile
} from '../controllers/serverController';
import { estimateCost, purchaseItem } from '../controllers/shopController';
import * as mcController from '../controllers/minecraftController';
import * as startupController from '../controllers/startupController';
import * as subusersController from '../controllers/subusersController';

const router = Router();

// Public route first
router.get('/plans', getPlans);
router.get('/pricing', getUpgradePricing);

// Protected routes
router.use(authenticate as any);
router.post('/create', createServer as any);
router.get('/', getMyServers as any);
router.get('/:id', getServer as any);
router.delete('/:id', deleteServer as any);
router.post('/:id/upgrade', upgradeServer as any);
router.post('/:id/power', powerServer as any);
router.get('/:id/resources', getServerResources as any);
router.get('/:id/usage', getServerUsage as any);
router.get('/:id/console', getConsoleCredentials as any);
router.get('/:id/files/list', getServerFiles as any);
router.get('/:id/files/content', getFile as any);
router.post('/:id/files/write', writeFile as any);
router.post('/:id/files/rename', renameServerFile as any);
router.post('/:id/files/delete', deleteServerFile as any);
router.post('/:id/files/create-folder', createServerFolder as any);
router.get('/:id/files/upload-url', getServerUploadUrl as any);
router.post('/:id/reinstall', reinstallServerAction as any);

// Minecraft
router.get('/:id/minecraft/properties', mcController.getServerProperties as any);
router.put('/:id/minecraft/properties', mcController.updateServerProperties as any);
router.get('/:id/minecraft/plugins', mcController.searchPlugins as any);
router.post('/:id/minecraft/plugins/install', mcController.installPlugin as any);
router.get('/:id/minecraft/plugins/installed', mcController.getInstalledPlugins as any);
router.delete('/:id/minecraft/plugins/:filename', mcController.deletePlugin as any);
router.post('/:id/minecraft/version', mcController.changeServerVersion as any);

// Shop Routes
router.post('/shop/estimate', estimateCost as any);
router.post('/shop/purchase', purchaseItem as any);

// Startup
router.get('/:id/startup', startupController.getServerStartup as any);
router.put('/:id/startup/variable', startupController.updateServerVariable as any);

// Subusers
router.get('/:id/subusers', subusersController.getServerSubusers as any);
router.post('/:id/subusers', subusersController.addSubuser as any);
router.put('/:id/subusers/:userId', subusersController.updateSubuserPermissions as any);
router.delete('/:id/subusers/:userId', subusersController.removeSubuser as any);

export default router;
