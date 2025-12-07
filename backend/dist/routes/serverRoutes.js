"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const serverController_1 = require("../controllers/serverController");
const shopController_1 = require("../controllers/shopController"); // Added
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
router.get('/:id/usage', serverController_1.getServerUsage);
// Shop Routes
router.post('/shop/estimate', shopController_1.estimateCost);
router.post('/shop/purchase', shopController_1.purchaseItem);
exports.default = router;
