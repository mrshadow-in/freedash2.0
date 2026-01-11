"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adController_1 = require("../controllers/adController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public / User routes
router.get('/', adController_1.getActiveAds);
router.post('/:id/click', adController_1.trackClick);
// Admin routes
router.get('/admin/all', auth_1.authenticate, (0, auth_1.authorize)('admin'), adController_1.getAllAds);
router.post('/admin/create', auth_1.authenticate, (0, auth_1.authorize)('admin'), adController_1.createAd);
router.put('/admin/update/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), adController_1.updateAd);
router.delete('/admin/delete/:id', auth_1.authenticate, (0, auth_1.authorize)('admin'), adController_1.deleteAd);
exports.default = router;
