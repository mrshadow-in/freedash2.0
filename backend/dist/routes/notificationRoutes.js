"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const notificationController_1 = require("../controllers/notificationController");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
router.get('/', notificationController_1.getNotifications);
router.patch('/read-all', notificationController_1.markAllRead);
router.patch('/:id/read', notificationController_1.markRead);
exports.default = router;
