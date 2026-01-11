"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const serverController_1 = require("../controllers/serverController");
const shopController_1 = require("../controllers/shopController");
const mcController = __importStar(require("../controllers/minecraftController"));
const startupController = __importStar(require("../controllers/startupController"));
const subusersController = __importStar(require("../controllers/subusersController"));
const router = (0, express_1.Router)();
// Public route first
router.get('/plans', serverController_1.getPlans);
router.get('/pricing', serverController_1.getUpgradePricing);
// Protected routes
router.use(auth_1.authenticate);
router.post('/create', serverController_1.createServer);
router.get('/', serverController_1.getMyServers);
router.get('/:id', serverController_1.getServer);
router.delete('/:id', serverController_1.deleteServer);
router.post('/:id/upgrade', serverController_1.upgradeServer);
router.post('/:id/power', serverController_1.powerServer);
router.get('/:id/resources', serverController_1.getServerResources);
router.get('/:id/usage', serverController_1.getServerUsage);
router.get('/:id/console', serverController_1.getConsoleCredentials);
router.get('/:id/files/list', serverController_1.getServerFiles);
router.get('/:id/files/content', serverController_1.getFile);
router.post('/:id/files/write', serverController_1.writeFile);
router.post('/:id/files/rename', serverController_1.renameServerFile);
router.post('/:id/files/delete', serverController_1.deleteServerFile);
router.post('/:id/files/create-folder', serverController_1.createServerFolder);
router.get('/:id/files/upload-url', serverController_1.getServerUploadUrl);
router.post('/:id/reinstall', serverController_1.reinstallServerAction);
// Minecraft
router.get('/:id/minecraft/properties', mcController.getServerProperties);
router.put('/:id/minecraft/properties', mcController.updateServerProperties);
router.get('/:id/minecraft/plugins', mcController.searchPlugins);
router.post('/:id/minecraft/plugins/install', mcController.installPlugin);
router.get('/:id/minecraft/plugins/installed', mcController.getInstalledPlugins);
router.delete('/:id/minecraft/plugins/:filename', mcController.deletePlugin);
router.post('/:id/minecraft/version', mcController.changeServerVersion);
router.get('/:id/minecraft/versions', mcController.getMinecraftVersions);
router.get('/:id/minecraft/paper-versions', mcController.getPaperVersions);
// Shop Routes
router.post('/shop/estimate', shopController_1.estimateCost);
router.post('/shop/purchase', shopController_1.purchaseItem);
// Startup
router.get('/:id/startup', startupController.getServerStartup);
router.put('/:id/startup/variable', startupController.updateServerVariable);
// Subusers
router.get('/:id/subusers', subusersController.getServerSubusers);
router.post('/:id/subusers', subusersController.addSubuser);
router.put('/:id/subusers/:userId', subusersController.updateSubuserPermissions);
router.delete('/:id/subusers/:userId', subusersController.removeSubuser);
exports.default = router;
