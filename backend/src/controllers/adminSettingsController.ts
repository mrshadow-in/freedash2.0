import { Request, Response } from 'express';
import Settings from '../models/Settings';
import User from '../models/User';
import Server from '../models/Server';
import RedeemCode from '../models/RedeemCode';
import Plan from '../models/Plan';
import { createPteroUser, suspendPteroServer, unsuspendPteroServer, deletePteroServer } from '../services/pterodactyl';
import bcrypt from 'bcrypt';

// Get settings
export const getSettings = async (req: Request, res: Response) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};

// Update panel settings
export const updatePanelSettings = async (req: Request, res: Response) => {
    try {
        const { panelName, panelLogo, backgroundImage, loginBackgroundImage, logoSize, bgColor } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        if (panelName) settings.panelName = panelName;
        if (panelLogo !== undefined) settings.panelLogo = panelLogo;
        if (backgroundImage !== undefined) settings.backgroundImage = backgroundImage;
        if (loginBackgroundImage !== undefined) settings.loginBackgroundImage = loginBackgroundImage;
        if (logoSize !== undefined) settings.logoSize = logoSize;
        if (bgColor !== undefined) settings.bgColor = bgColor;

        await settings.save();
        res.json({ message: 'Panel settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update settings' });
    }
};

// Update theme settings
export const updateThemeSettings = async (req: Request, res: Response) => {
    try {
        const { primaryColor, secondaryColor, cardBgColor, textColor, borderColor, gradientStart, gradientEnd, bgColor } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        if (bgColor !== undefined) settings.bgColor = bgColor;

        if (!settings.theme) {
            settings.theme = {
                primaryColor: '#7c3aed',
                secondaryColor: '#3b82f6',
                cardBgColor: 'rgba(255,255,255,0.05)',
                textColor: '#ffffff',
                borderColor: 'rgba(255,255,255,0.1)',
                gradientStart: '#7c3aed',
                gradientEnd: '#3b82f6'
            };
        }

        if (primaryColor !== undefined) settings.theme.primaryColor = primaryColor;
        if (secondaryColor !== undefined) settings.theme.secondaryColor = secondaryColor;
        if (cardBgColor !== undefined) settings.theme.cardBgColor = cardBgColor;
        if (textColor !== undefined) settings.theme.textColor = textColor;
        if (borderColor !== undefined) settings.theme.borderColor = borderColor;
        if (gradientStart !== undefined) settings.theme.gradientStart = gradientStart;
        if (gradientEnd !== undefined) settings.theme.gradientEnd = gradientEnd;

        await settings.save();
        res.json({ message: 'Theme settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update theme settings' });
    }
};

// Update SMTP settings
export const updateSmtpSettings = async (req: Request, res: Response) => {
    try {
        const { host, port, secure, username, password, fromEmail, fromName } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        settings.smtp = {
            host,
            port,
            secure,
            username,
            password,
            fromEmail,
            fromName
        };

        await settings.save();
        res.json({ message: 'SMTP settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update SMTP settings' });
    }
};

// Update Bot settings (rewards and discord config)
export const updateBotSettings = async (req: Request, res: Response) => {
    try {
        const { inviteRewards, boostRewards, discordBot } = req.body;
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});

        if (inviteRewards !== undefined) {
            settings.inviteRewards = inviteRewards;
        }

        if (boostRewards !== undefined) {
            settings.boostRewards = boostRewards;
        }

        if (discordBot !== undefined) {
            if (!settings.discordBot) {
                settings.discordBot = {
                    token: '',
                    guildId: '',
                    enabled: false,
                    inviteChannelId: '',
                    boostChannelId: ''
                };
            }
            Object.assign(settings.discordBot, discordBot);
        }

        await settings.save();

        // Restart bot if config changed
        if (discordBot !== undefined) {
            const { startDiscordBot, stopDiscordBot } = await import('../services/discordBot');
            if (settings.discordBot?.enabled) {
                await startDiscordBot();
            } else {
                stopDiscordBot();
            }
        }

        res.json({ message: 'Bot settings updated', settings });
    } catch (error) {
        console.error('Update bot settings error:', error);
        res.status(500).json({ message: 'Failed to update bot settings' });
    }
};

export const regenerateBotKey = async (req: Request, res: Response) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});

        const crypto = require('crypto');
        settings.botApiKey = 'lc_bot_' + crypto.randomBytes(24).toString('hex');

        await settings.save();
        res.json({ message: 'Bot key regenerated', apiKey: settings.botApiKey });
    } catch (error) {
        res.status(500).json({ message: 'Failed to regenerate bot key' });
    }
};

// Get Discord bot status
export const getBotStatus = async (req: Request, res: Response) => {
    try {
        const { getBotStatus: getStatus } = await import('../services/discordBot');
        const status = getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get bot status' });
    }
};

// Start/Stop Discord bot
export const toggleBot = async (req: Request, res: Response) => {
    try {
        const { action } = req.body; // 'start' or 'stop'
        const { startDiscordBot, stopDiscordBot } = await import('../services/discordBot');

        if (action === 'start') {
            await startDiscordBot();
            res.json({ message: 'Bot started' });
        } else if (action === 'stop') {
            stopDiscordBot();
            res.json({ message: 'Bot stopped' });
        } else {
            res.status(400).json({ message: 'Invalid action' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle bot' });
    }
};

// Update SMTP settings

// Test SMTP connection
export const testSmtpConnection = async (req: Request, res: Response) => {
    try {
        const { testSmtpConnection: testConnection } = await import('../services/emailService');
        const result = await testConnection();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Send test email
export const sendTestEmail = async (req: Request, res: Response) => {
    try {
        const { testEmail } = req.body;
        if (!testEmail) {
            return res.status(400).json({ message: 'Test email address is required' });
        }

        const { sendEmail } = await import('../services/emailService');
        await sendEmail(
            testEmail,
            'Test Email from LordCloud',
            '<h1>Test Email</h1><p>This is a test email from your LordCloud panel. If you received this, your SMTP configuration is working correctly!</p>',
            'Test Email - This is a test email from your LordCloud panel.'
        );

        res.json({ message: 'Test email sent successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Update AFK settings
export const updateAFKSettings = async (req: Request, res: Response) => {
    try {
        const { enabled, coinsPerMinute, maxCoinsPerDay } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        if (enabled !== undefined) settings.afk.enabled = enabled;
        if (coinsPerMinute !== undefined) settings.afk.coinsPerMinute = coinsPerMinute;
        if (maxCoinsPerDay !== undefined) settings.afk.maxCoinsPerDay = maxCoinsPerDay;

        await settings.save();
        res.json({ message: 'AFK settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update AFK settings' });
    }
};

// Update upgrade pricing
export const updateUpgradePricing = async (req: Request, res: Response) => {
    try {
        const { ramPerGB, diskPerGB, cpuPerCore } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        if (ramPerGB !== undefined) settings.upgradePricing.ramPerGB = ramPerGB;
        if (diskPerGB !== undefined) settings.upgradePricing.diskPerGB = diskPerGB;
        if (cpuPerCore !== undefined) settings.upgradePricing.cpuPerCore = cpuPerCore;

        await settings.save();
        res.json({ message: 'Upgrade pricing updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update pricing' });
    }
};

// Update Pterodactyl settings
export const updatePterodactylSettings = async (req: Request, res: Response) => {
    try {
        const { apiUrl, apiKey, clientApiKey, defaultEggId, defaultNestId, defaultLocationId } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({
                pterodactyl: {
                    apiUrl: '',
                    apiKey: '',
                    clientApiKey: '',
                    defaultEggId: 0,
                    defaultNestId: 0,
                    defaultLocationId: 0
                }
            });
        }

        // Ensure pterodactyl object exists
        if (!settings.pterodactyl) {
            settings.pterodactyl = {
                apiUrl: '',
                apiKey: '',
                clientApiKey: '',
                defaultEggId: 0,
                defaultNestId: 0,
                defaultLocationId: 0
            };
        }

        if (apiUrl !== undefined) settings.pterodactyl.apiUrl = apiUrl;
        if (apiKey !== undefined) settings.pterodactyl.apiKey = apiKey;
        if (clientApiKey !== undefined) settings.pterodactyl.clientApiKey = clientApiKey;
        if (defaultEggId !== undefined) settings.pterodactyl.defaultEggId = defaultEggId;
        if (defaultNestId !== undefined) settings.pterodactyl.defaultNestId = defaultNestId;
        if (defaultLocationId !== undefined) settings.pterodactyl.defaultLocationId = defaultLocationId;

        await settings.save();
        res.json({ message: 'Pterodactyl settings updated', settings });
    } catch (error) {
        console.error('Pterodactyl settings update error:', error);
        res.status(500).json({ message: 'Failed to update Pterodactyl settings' });
    }
};

// Test Pterodactyl connection
export const testPterodactylConnection = async (req: Request, res: Response) => {
    try {
        const { apiUrl, apiKey } = req.body;

        if (!apiUrl || !apiKey) {
            return res.status(400).json({ message: 'API URL and API Key are required' });
        }

        // Test connection by fetching user account info
        const axios = require('axios');
        const response = await axios.get(`${apiUrl}/api/application/users`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.status === 200) {
            res.json({
                success: true,
                message: 'Connection successful!',
                data: {
                    userCount: response.data.meta?.pagination?.total || 0
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Connection failed' });
        }
    } catch (error: any) {
        let message = 'Connection failed';
        if (error.response) {
            if (error.response.status === 401 || error.response.status === 403) {
                message = 'Invalid API key';
            } else if (error.response.status === 404) {
                message = 'Invalid panel URL';
            } else {
                message = `Error: ${error.response.statusText}`;
            }
        } else if (error.code === 'ECONNREFUSED') {
            message = 'Cannot connect to panel - check URL';
        } else if (error.code === 'ETIMEDOUT') {
            message = 'Connection timeout';
        }
        res.status(400).json({ success: false, message });
    }
};

// Add webhook
export const addWebhook = async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        if (!url || !url.startsWith('https://discord.com/api/webhooks/')) {
            return res.status(400).json({ message: 'Invalid webhook URL' });
        }

        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        if (!settings.discordWebhooks.includes(url)) {
            settings.discordWebhooks.push(url);
            await settings.save();
        }

        res.json({ message: 'Webhook added', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add webhook' });
    }
};

// Remove webhook
export const removeWebhook = async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            return res.status(404).json({ message: 'Settings not found' });
        }

        settings.discordWebhooks = settings.discordWebhooks.filter(w => w !== url);
        await settings.save();

        res.json({ message: 'Webhook removed', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove webhook' });
    }
};

// Get all users (paginated)
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password_hash')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments();

        res.json({ users, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

// Edit user coins
export const editUserCoins = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { coins } = req.body;

        if (coins < 0) {
            return res.status(400).json({ message: 'Coins cannot be negative' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { coins },
            { new: true }
        ).select('-password_hash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User coins updated', user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update coins' });
    }
};

// Ban user
export const banUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const adminId = (req.user as any).userId;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                isBanned: true,
                bannedAt: new Date(),
                bannedBy: adminId
            },
            { new: true }
        ).select('-password_hash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User banned', user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to ban user' });
    }
};

// Unban user
export const unbanUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndUpdate(
            userId,
            {
                isBanned: false,
                $unset: { bannedAt: 1, bannedBy: 1 }
            },
            { new: true }
        ).select('-password_hash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User unbanned', user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to unban user' });
    }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Delete user's servers first
        await Server.deleteMany({ ownerId: userId });

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
};

// Get all servers
export const getAllServers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const servers = await Server.find({ status: { $ne: 'deleted' } }) // Exclude deleted servers
            .populate('ownerId', 'username email')
            .populate('planId', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Server.countDocuments({ status: { $ne: 'deleted' } });

        res.json({ servers, total, page, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch servers' });
    }
};

// Suspend server
export const suspendServer = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;
        const adminId = (req.user as any).userId;

        const server = await Server.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Suspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await suspendPteroServer(server.pteroServerId);
                console.log(`✅ Pterodactyl server ${server.pteroServerId} suspended`);
            } catch (pteroError: any) {
                console.error('⚠️  Failed to suspend Pterodactyl server:', pteroError.message);
                // Continue with dashboard suspension even if Pterodactyl fails
            }
        }

        // Update in database
        server.isSuspended = true;
        server.suspendedAt = new Date();
        server.suspendedBy = adminId;
        server.status = 'suspended';
        await server.save();

        res.json({ message: 'Server suspended', server });
    } catch (error) {
        console.error('Suspend server error:', error);
        res.status(500).json({ message: 'Failed to suspend server' });
    }
};

// Unsuspend server
export const unsuspendServer = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;

        const server = await Server.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Unsuspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await unsuspendPteroServer(server.pteroServerId);
                console.log(`✅ Pterodactyl server ${server.pteroServerId} unsuspended`);
            } catch (pteroError: any) {
                console.error('⚠️  Failed to unsuspend Pterodactyl server:', pteroError.message);
                // Continue with dashboard unsuspension even if Pterodactyl fails
            }
        }

        // Update in database
        server.isSuspended = false;
        server.suspendedAt = undefined;
        server.suspendedBy = undefined;
        server.status = 'active';
        await server.save();

        res.json({ message: 'Server unsuspended', server });
    } catch (error) {
        console.error('Unsuspend server error:', error);
        res.status(500).json({ message: 'Failed to unsuspend server' });
    }
};

// Delete server (admin)
export const deleteServerAdmin = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;

        const server = await Server.findById(serverId);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Delete from Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await deletePteroServer(server.pteroServerId);
                console.log(`✅ Pterodactyl server ${server.pteroServerId} deleted`);
            } catch (pteroError: any) {
                console.error('⚠️  Failed to delete Pterodactyl server:', pteroError.message);
                // Continue with dashboard deletion even if Pterodactyl fails
            }
        }

        // Delete from database
        await Server.findByIdAndDelete(serverId);

        res.json({ message: 'Server deleted' });
    } catch (error) {
        console.error('Delete server error:', error);
        res.status(500).json({ message: 'Failed to delete server' });
    }
};

// Get all redeem codes
export const getAllCodes = async (req: Request, res: Response) => {
    try {
        const codes = await RedeemCode.find().sort({ createdAt: -1 });
        res.json(codes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch codes' });
    }
};

// Create redeem code
export const createRedeemCode = async (req: Request, res: Response) => {
    try {
        const { code, amount, expiresAt, maxUses } = req.body;

        const existingCode = await RedeemCode.findOne({ code });
        if (existingCode) {
            return res.status(400).json({ message: 'Code already exists' });
        }

        const newCode = await RedeemCode.create({
            code,
            amount,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            maxUses: maxUses || null,
            usedCount: 0
        });

        res.status(201).json({ message: 'Code created', code: newCode });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create code' });
    }
};

// Delete redeem code
export const deleteRedeemCode = async (req: Request, res: Response) => {
    try {
        const { codeId } = req.params;

        const code = await RedeemCode.findByIdAndDelete(codeId);
        if (!code) {
            return res.status(404).json({ message: 'Code not found' });
        }

        res.json({ message: 'Code deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete code' });
    }
};

// Update redeem code
export const updateRedeemCode = async (req: Request, res: Response) => {
    try {
        const { code, amount, maxUses } = req.body;
        const codeId = req.params.codeId;

        // Check if code name conflicts with another code
        if (code) {
            const existingCode = await RedeemCode.findOne({ code, _id: { $ne: codeId } });
            if (existingCode) {
                return res.status(400).json({ message: 'Code name already exists' });
            }
        }

        const updatedCode = await RedeemCode.findByIdAndUpdate(
            codeId,
            { code, amount, maxUses },
            { new: true, runValidators: true }
        );

        if (!updatedCode) {
            return res.status(404).json({ message: 'Code not found' });
        }

        res.json(updatedCode);
    } catch (error) {
        res.status(400).json({ message: 'Failed to update code' });
    }
};

// Plan management
export const createPlan = async (req: Request, res: Response) => {
    try {
        const { name, ramMb, diskMb, cpuPercent, cpuCores, slots, priceCoins, pteroEggId, pteroNestId } = req.body;

        if (!name || !ramMb || !diskMb || !cpuPercent || !priceCoins || !pteroEggId || !pteroNestId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const plan = await Plan.create({
            name,
            ramMb,
            diskMb,
            cpuPercent,
            cpuCores: cpuCores || 1,
            slots: slots || 1,
            priceCoins,
            pteroEggId,
            pteroNestId
        });

        res.status(201).json(plan);
    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({ message: 'Failed to create plan' });
    }
};

export const deletePlan = async (req: Request, res: Response) => {
    try {
        const { planId } = req.params;
        const plan = await Plan.findByIdAndDelete(planId);

        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        res.json({ message: 'Plan deleted' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ message: 'Failed to delete plan' });
    }
};

export const updatePlan = async (req: Request, res: Response) => {
    try {
        const { planId } = req.params;
        const { name, ramMb, diskMb, cpuPercent, cpuCores, priceCoins, pteroEggId, pteroNestId, eggImage } = req.body;

        const plan = await Plan.findByIdAndUpdate(
            planId,
            { name, ramMb, diskMb, cpuPercent, cpuCores, priceCoins, pteroEggId, pteroNestId, eggImage },
            { new: true }
        );

        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        res.json(plan);
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ message: 'Failed to update plan' });
    }
};

// Create user by admin
export const createUserByAdmin = async (req: Request, res: Response) => {
    try {
        const { username, email, password, coins, role } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create Pterodactyl user with the same password
        let pteroUserId: number | undefined;
        try {
            const pteroUser = await createPteroUser(email, username, password);
            pteroUserId = pteroUser.id;
            console.log(`✅ Pterodactyl user created for ${email} with ID: ${pteroUserId}`);
        } catch (pteroError: any) {
            console.error('⚠️  Failed to create Pterodactyl user:', pteroError.message);
            // Continue with user creation even if Pterodactyl fails
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password_hash,
            coins: coins || 0,
            role: role || 'user',
            pteroUserId
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                coins: user.coins,
                role: user.role,
                pteroUserId: user.pteroUserId
            }
        });
    } catch (error: any) {
        console.error('Create user error:', error);
        res.status(500).json({ message: error.message || 'Failed to create user' });
    }
};

// Update user role
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['user', 'mod', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role. Must be user, mod, or admin' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password_hash');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User role updated', user });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ message: 'Failed to update user role' });
    }
};

// Update user details (email, password, coins, role)
export const updateUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { email, password, coins, role } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update email if provided
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        // Update password if provided
        if (password) {
            const bcrypt = await import('bcrypt');
            user.password_hash = await bcrypt.hash(password, 10);
        }

        // Update coins if provided
        if (coins !== undefined) {
            if (coins < 0) {
                return res.status(400).json({ message: 'Coins cannot be negative' });
            }
            user.coins = coins;
        }

        // Update role if provided
        if (role) {
            if (!['user', 'mod', 'admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            user.role = role;
        }

        await user.save();

        // Return user without password
        const updatedUser = await User.findById(userId).select('-password_hash');
        res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
};

// Update social media links
export const updateSocialMedia = async (req: Request, res: Response) => {
    try {
        const { discord, instagram, twitter, facebook, youtube, github, website } = req.body;

        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        // Initialize socialMedia if it doesn't exist
        if (!settings.socialMedia) {
            settings.socialMedia = {};
        }

        // Update only provided fields
        if (discord !== undefined) settings.socialMedia.discord = discord;
        if (instagram !== undefined) settings.socialMedia.instagram = instagram;
        if (twitter !== undefined) settings.socialMedia.twitter = twitter;
        if (facebook !== undefined) settings.socialMedia.facebook = facebook;
        if (youtube !== undefined) settings.socialMedia.youtube = youtube;
        if (github !== undefined) settings.socialMedia.github = github;
        if (website !== undefined) settings.socialMedia.website = website;

        await settings.save();
        res.json({ message: 'Social media links updated successfully', socialMedia: settings.socialMedia });
    } catch (error) {
        console.error('Update social media error:', error);
        res.status(500).json({ message: 'Failed to update social media links' });
    }
};
