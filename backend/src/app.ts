import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/database';
import { ENV } from './config/env';
import authRoutes from './routes/authRoutes';
import serverRoutes from './routes/serverRoutes';
import adminRoutes from './routes/adminRoutes';
import afkRoutes from './routes/afkRoutes';
import upgradeRoutes from './routes/upgradeRoutes';
import { authenticate } from './middleware/auth';
import { redeemCode } from './controllers/coinController';
import { completeTask, getTasks } from './controllers/taskController';
import { discordLogin, discordCallback } from './controllers/discordAuthController';
import passport from 'passport';
import botRoutes from './routes/botRoutes';
import adRoutes from './routes/adRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(passport.initialize());

// Routes
// Routes
app.use('/api/auth', authRoutes);
app.get('/api/auth/discord', discordLogin);
app.get('/api/auth/discord/callback', discordCallback);
app.use('/api/servers', serverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/afk', afkRoutes);
app.use('/api/upgrades', upgradeRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/ads', adRoutes);

// Coins & Tasks
const coinRouter = express.Router();
coinRouter.use(authenticate as any);
coinRouter.post('/redeem', redeemCode as any);
app.use('/api/coins', coinRouter);

const taskRouter = express.Router();
taskRouter.use(authenticate as any);
taskRouter.get('/', getTasks as any);
taskRouter.post('/complete', completeTask as any);
app.use('/api/tasks', taskRouter);

// Health check
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Public settings endpoint (no auth required) for branding
app.get('/api/settings', async (req, res) => {
    try {
        const { getSettings } = await import('./services/settingsService');
        const settings = await getSettings();

        // Return only public branding information
        res.json({
            panelName: settings?.panelName || 'Panel',
            panelLogo: settings?.panelLogo || '',
            supportEmail: settings?.supportEmail || '',
            backgroundImage: settings?.backgroundImage || '',
            loginBackgroundImage: settings?.loginBackgroundImage || '',
            logoSize: settings?.logoSize || 48,
            bgColor: settings?.bgColor || '#0c0229',
            pterodactylUrl: (settings?.pterodactyl as any)?.apiUrl || '',
            theme: {
                primaryColor: (settings?.theme as any)?.primaryColor || '#7c3aed',
                secondaryColor: (settings?.theme as any)?.secondaryColor || '#3b82f6',
                cardBgColor: (settings?.theme as any)?.cardBgColor || 'rgba(255,255,255,0.05)',
                textColor: (settings?.theme as any)?.textColor || '#ffffff',
                borderColor: (settings?.theme as any)?.borderColor || 'rgba(255,255,255,0.1)',
                gradientStart: (settings?.theme as any)?.gradientStart || '#7c3aed',
                gradientEnd: (settings?.theme as any)?.gradientEnd || '#3b82f6'
            },
            socialMedia: (settings?.socialMedia as any) || {}
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});

// Start Server
const start = async () => {
    await connectDB();
    app.listen(ENV.PORT, () => {
        console.log(`Server running on port ${ENV.PORT}`);
    });
};

start();
