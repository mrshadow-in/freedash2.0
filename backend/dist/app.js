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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const database_1 = require("./config/database");
const env_1 = require("./config/env");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const serverRoutes_1 = __importDefault(require("./routes/serverRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const afkRoutes_1 = __importDefault(require("./routes/afkRoutes"));
const upgradeRoutes_1 = __importDefault(require("./routes/upgradeRoutes"));
const auth_1 = require("./middleware/auth");
const coinController_1 = require("./controllers/coinController");
const taskController_1 = require("./controllers/taskController");
const discordAuthController_1 = require("./controllers/discordAuthController");
const passport_1 = __importDefault(require("passport"));
const botRoutes_1 = __importDefault(require("./routes/botRoutes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
// Routes
app.use('/auth', authRoutes_1.default);
app.get('/auth/discord', discordAuthController_1.discordLogin);
app.get('/auth/discord/callback', discordAuthController_1.discordCallback);
app.use('/servers', serverRoutes_1.default);
app.use('/admin', adminRoutes_1.default);
app.use('/afk', afkRoutes_1.default);
app.use('/upgrades', upgradeRoutes_1.default);
app.use('/api/bot', botRoutes_1.default);
// Coins & Tasks
const coinRouter = express_1.default.Router();
coinRouter.use(auth_1.authenticate);
coinRouter.post('/redeem', coinController_1.redeemCode);
app.use('/coins', coinRouter);
const taskRouter = express_1.default.Router();
taskRouter.use(auth_1.authenticate);
taskRouter.get('/', taskController_1.getTasks);
taskRouter.post('/complete', taskController_1.completeTask);
app.use('/tasks', taskRouter);
// Health check
app.get('/', (req, res) => {
    res.send('API is running...');
});
// Public settings endpoint (no auth required) for branding
app.get('/settings', async (req, res) => {
    try {
        const { default: Settings } = await Promise.resolve().then(() => __importStar(require('./models/Settings')));
        const settings = await Settings.findOne();
        // Return only public branding information
        res.json({
            panelName: settings?.panelName || 'Panel',
            panelLogo: settings?.panelLogo || '',
            supportEmail: settings?.supportEmail || '',
            backgroundImage: settings?.backgroundImage || '',
            loginBackgroundImage: settings?.loginBackgroundImage || '',
            logoSize: settings?.logoSize || 48,
            bgColor: settings?.bgColor || '#0c0229',
            theme: {
                primaryColor: settings?.theme?.primaryColor || '#7c3aed',
                secondaryColor: settings?.theme?.secondaryColor || '#3b82f6',
                cardBgColor: settings?.theme?.cardBgColor || 'rgba(255,255,255,0.05)',
                textColor: settings?.theme?.textColor || '#ffffff',
                borderColor: settings?.theme?.borderColor || 'rgba(255,255,255,0.1)',
                gradientStart: settings?.theme?.gradientStart || '#7c3aed',
                gradientEnd: settings?.theme?.gradientEnd || '#3b82f6'
            },
            socialMedia: settings?.socialMedia || {}
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});
// Start Server
const start = async () => {
    await (0, database_1.connectDB)();
    app.listen(env_1.ENV.PORT, () => {
        console.log(`Server running on port ${env_1.ENV.PORT}`);
    });
};
start();
