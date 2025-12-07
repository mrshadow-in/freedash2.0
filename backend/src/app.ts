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

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/auth', authRoutes);
app.get('/auth/discord', discordLogin);
app.get('/auth/discord/callback', discordCallback);
app.use('/servers', serverRoutes);
app.use('/admin', adminRoutes);
app.use('/afk', afkRoutes);
app.use('/upgrades', upgradeRoutes);
app.use('/api/bot', botRoutes);

// Coins & Tasks
const coinRouter = express.Router();
coinRouter.use(authenticate as any);
coinRouter.post('/redeem', redeemCode as any);
app.use('/coins', coinRouter);

const taskRouter = express.Router();
taskRouter.use(authenticate as any);
taskRouter.get('/', getTasks as any);
taskRouter.post('/complete', completeTask as any);
app.use('/tasks', taskRouter);

// Health check
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Public settings endpoint (no auth required) for branding
app.get('/settings', async (req, res) => {
    try {
        const { default: Settings } = await import('./models/Settings');
        const settings = await Settings.findOne();

        // Return only public branding information
        res.json({
            panelName: settings?.panelName || 'LordCloud',
            panelLogo: settings?.panelLogo || '',
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
