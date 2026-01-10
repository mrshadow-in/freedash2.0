import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { createPteroUser, suspendPteroServer, unsuspendPteroServer, deletePteroServer } from '../services/pterodactyl';
import bcrypt from 'bcrypt';
import { ENV } from '../config/env';

import { getSettingsOrCreate, invalidateSettingsCache } from '../services/settingsService';

// (Removed local getSettingsOrCreate helper as we import it)

// Get settings
export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await getSettingsOrCreate();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
};

// Update panel settings
export const updatePanelSettings = async (req: Request, res: Response) => {
    try {
        const { panelName, panelLogo, backgroundImage, loginBackgroundImage, logoSize, bgColor, supportEmail } = req.body;
        const currentSettings = await getSettingsOrCreate();

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                panelName: panelName ?? undefined,
                panelLogo: panelLogo ?? undefined,
                supportEmail: supportEmail ?? undefined,
                backgroundImage: backgroundImage ?? undefined,
                loginBackgroundImage: loginBackgroundImage ?? undefined,
                logoSize: logoSize ?? undefined,
                bgColor: bgColor ?? undefined
            }
        });
        await invalidateSettingsCache();
        res.json({ message: 'Panel settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update settings' });
    }
};


// Update theme settings
export const updateThemeSettings = async (req: Request, res: Response) => {
    try {
        const { primaryColor, secondaryColor, cardBgColor, textColor, borderColor, gradientStart, gradientEnd, bgColor } = req.body;
        const currentSettings = await getSettingsOrCreate();

        const currentTheme = (currentSettings.theme as any) || {
            primaryColor: '#7c3aed',
            secondaryColor: '#3b82f6',
            cardBgColor: 'rgba(255,255,255,0.05)',
            textColor: '#ffffff',
            borderColor: 'rgba(255,255,255,0.1)',
            gradientStart: '#7c3aed',
            gradientEnd: '#3b82f6'
        };

        const newTheme = {
            ...currentTheme,
            primaryColor: primaryColor ?? currentTheme.primaryColor,
            secondaryColor: secondaryColor ?? currentTheme.secondaryColor,
            cardBgColor: cardBgColor ?? currentTheme.cardBgColor,
            textColor: textColor ?? currentTheme.textColor,
            borderColor: borderColor ?? currentTheme.borderColor,
            gradientStart: gradientStart ?? currentTheme.gradientStart,
            gradientEnd: gradientEnd ?? currentTheme.gradientEnd
        };

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                bgColor: bgColor ?? undefined,
                theme: newTheme
            }
        });

        await invalidateSettingsCache();
        res.json({ message: 'Theme settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update theme settings' });
    }
};

// Update SMTP settings
export const updateSmtpSettings = async (req: Request, res: Response) => {
    try {
        const { host, port, secure, username, password, fromEmail, fromName } = req.body;
        const currentSettings = await getSettingsOrCreate();

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                smtp: {
                    host,
                    port,
                    secure,
                    username,
                    password,
                    fromEmail,
                    fromName
                }
            }
        });
        await invalidateSettingsCache();
        res.json({ message: 'SMTP settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update SMTP settings' });
    }
};

// Update Bot settings (rewards and discord config)
export const updateBotSettings = async (req: Request, res: Response) => {
    try {
        const { inviteRewards, boostRewards, discordBot } = req.body;
        const currentSettings = await getSettingsOrCreate();

        const data: any = {};
        if (inviteRewards !== undefined) data.inviteRewards = inviteRewards;
        if (boostRewards !== undefined) data.boostRewards = boostRewards;

        if (discordBot !== undefined) {
            const currentBot = (currentSettings.discordBot as any) || {
                token: '',
                guildId: '',
                enabled: false,
                inviteChannelId: '',
                boostChannelId: ''
            };
            data.discordBot = { ...currentBot, ...discordBot };
        }

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data
        });

        await invalidateSettingsCache();

        // Restart bot if config changed
        if (discordBot !== undefined) {
            const { startDiscordBot, stopDiscordBot } = await import('../services/discordBot');
            if ((settings.discordBot as any)?.enabled) {
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
        const currentSettings = await getSettingsOrCreate();
        const crypto = require('crypto');
        const botApiKey = 'lc_bot_' + crypto.randomBytes(24).toString('hex');

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: { botApiKey }
        });
        await invalidateSettingsCache();
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

        // Get panel name for branding
        const settings = await getSettingsOrCreate();
        const panelName = settings?.panelName || 'Panel';

        const { sendEmail } = await import('../services/emailService');
        await sendEmail(
            testEmail,
            `Test Email from ${panelName}`,
            `<h1>Test Email</h1><p>This is a test email from your ${panelName} panel. If you received this, your SMTP configuration is working correctly!</p>`,
            `Test Email - This is a test email from your ${panelName} panel.`
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
        const currentSettings = await getSettingsOrCreate();

        const currentAFK = (currentSettings.afk as any) || { enabled: false, coinsPerMinute: 1, maxCoinsPerDay: 100 };
        const newAFK = {
            ...currentAFK,
            enabled: enabled ?? currentAFK.enabled,
            coinsPerMinute: coinsPerMinute ?? currentAFK.coinsPerMinute,
            maxCoinsPerDay: maxCoinsPerDay ?? currentAFK.maxCoinsPerDay
        };

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: { afk: newAFK }
        });
        await invalidateSettingsCache();
        res.json({ message: 'AFK settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update AFK settings' });
    }
};

// Update upgrade pricing
export const updateUpgradePricing = async (req: Request, res: Response) => {
    try {
        const { ramPerGB, diskPerGB, cpuPerCore } = req.body;
        const currentSettings = await getSettingsOrCreate();

        const currentPricing = (currentSettings.upgradePricing as any) || { ramPerGB: 100, diskPerGB: 50, cpuPerCore: 20 };
        const newPricing = {
            ...currentPricing,
            ramPerGB: ramPerGB ?? currentPricing.ramPerGB,
            diskPerGB: diskPerGB ?? currentPricing.diskPerGB,
            cpuPerCore: cpuPerCore ?? currentPricing.cpuPerCore
        };

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: { upgradePricing: newPricing }
        });
        await invalidateSettingsCache();
        res.json({ message: 'Upgrade pricing updated', settings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update pricing' });
    }
};

// Update Pterodactyl settings
export const updatePterodactylSettings = async (req: Request, res: Response) => {
    try {
        const { apiUrl, apiKey, clientApiKey, defaultEggId, defaultNestId, defaultLocationId } = req.body;
        const currentSettings = await getSettingsOrCreate();

        const currentPtero = (currentSettings.pterodactyl as any) || {
            apiUrl: '',
            apiKey: '',
            clientApiKey: '',
            defaultEggId: 0,
            defaultNestId: 0,
            defaultLocationId: 0
        };

        const newPtero = {
            ...currentPtero,
            apiUrl: apiUrl ?? currentPtero.apiUrl,
            apiKey: apiKey ?? currentPtero.apiKey,
            clientApiKey: clientApiKey ?? currentPtero.clientApiKey,
            defaultEggId: defaultEggId ?? currentPtero.defaultEggId,
            defaultNestId: defaultNestId ?? currentPtero.defaultNestId,
            defaultLocationId: defaultLocationId ?? currentPtero.defaultLocationId
        };

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: { pterodactyl: newPtero }
        });
        await invalidateSettingsCache();
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

        const currentSettings = await getSettingsOrCreate();
        const hooks = currentSettings.discordWebhooks as string[];

        if (!hooks.includes(url)) {
            const newHooks = [...hooks, url];
            const settings = await prisma.settings.update({
                where: { id: currentSettings.id },
                data: {
                    discordWebhooks: newHooks
                }
            });
            await invalidateSettingsCache();
            return res.json({ message: 'Webhook added', settings });
        }

        res.json({ message: 'Webhook already exists', settings: currentSettings });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add webhook' });
    }
};

// Remove webhook
export const removeWebhook = async (req: Request, res: Response) => {
    try {
        const { url } = req.body;
        const currentSettings = await getSettingsOrCreate();
        const hooks = currentSettings.discordWebhooks as string[];

        const newHooks = hooks.filter((w: string) => w !== url);

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: {
                discordWebhooks: newHooks
            }
        });

        await invalidateSettingsCache();
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

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                // select: { ... } // exclude password if desired, but maybe admin needs full view? Assuming full view minus password for safety
            }),
            prisma.user.count()
        ]);

        // Clean passwords
        const safeUsers = users.map((u: any) => {
            const { password, ...rest } = u;
            return rest;
        });

        res.json({ users: safeUsers, total, page, pages: Math.ceil(total / limit) });
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

        const user = await prisma.user.update({
            where: { id: userId },
            data: { coins }
        });

        const { password, ...safeUser } = user;
        res.json({ message: 'User coins updated', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update coins' });
    }
};

// Ban user
export const banUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const adminId = (req.user as any).userId;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: true,
                bannedAt: new Date(),
                bannedBy: adminId
            }
        });

        const { password, ...safeUser } = user;
        res.json({ message: 'User banned', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: 'Failed to ban user' });
    }
};

// Unban user
export const unbanUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                isBanned: false,
                bannedAt: null,
                bannedBy: null
            }
        });

        const { password, ...safeUser } = user;
        res.json({ message: 'User unbanned', user: safeUser });
    } catch (error) {
        res.status(500).json({ message: 'Failed to unban user' });
    }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Delete user's servers first
        await prisma.server.deleteMany({ where: { ownerId: userId } });

        await prisma.user.delete({ where: { id: userId } });

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

        const [servers, total] = await prisma.$transaction([
            prisma.server.findMany({
                where: { status: { not: 'deleted' } },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: { select: { username: true, email: true } },
                    plan: { select: { name: true } }
                }
            }),
            prisma.server.count({ where: { status: { not: 'deleted' } } })
        ]);

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

        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Suspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await suspendPteroServer(server.pteroServerId);
            } catch (pteroError: any) {
                console.error('⚠️  Failed to suspend Pterodactyl server:', pteroError.message);
            }
        }

        // Update in database
        const updatedServer = await prisma.server.update({
            where: { id: serverId },
            data: {
                isSuspended: true,
                suspendedAt: new Date(),
                suspendedBy: adminId,
                status: 'suspended'
            }
        });

        res.json({ message: 'Server suspended', server: updatedServer });
    } catch (error) {
        console.error('Suspend server error:', error);
        res.status(500).json({ message: 'Failed to suspend server' });
    }
};

// Unsuspend server
export const unsuspendServer = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;

        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Unsuspend in Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await unsuspendPteroServer(server.pteroServerId);
            } catch (pteroError: any) {
                console.error('⚠️  Failed to unsuspend Pterodactyl server:', pteroError.message);
            }
        }

        // Update in database
        const updatedServer = await prisma.server.update({
            where: { id: serverId },
            data: {
                isSuspended: false,
                suspendedAt: null,
                suspendedBy: null,
                status: 'active'
            }
        });

        res.json({ message: 'Server unsuspended', server: updatedServer });
    } catch (error) {
        console.error('Unsuspend server error:', error);
        res.status(500).json({ message: 'Failed to unsuspend server' });
    }
};

// Delete server (admin)
export const deleteServerAdmin = async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;

        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Delete from Pterodactyl if pteroServerId exists
        if (server.pteroServerId) {
            try {
                await deletePteroServer(server.pteroServerId);
            } catch (pteroError: any) {
                console.error('⚠️  Failed to delete Pterodactyl server:', pteroError.message);
            }
        }

        // Delete from database
        await prisma.server.delete({ where: { id: serverId } });

        res.json({ message: 'Server deleted' });
    } catch (error) {
        console.error('Delete server error:', error);
        res.status(500).json({ message: 'Failed to delete server' });
    }
};

// Get all redeem codes
export const getAllCodes = async (req: Request, res: Response) => {
    try {
        const codes = await prisma.redeemCode.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(codes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch codes' });
    }
};

// Create redeem code
export const createRedeemCode = async (req: Request, res: Response) => {
    try {
        const { code, amount, expiresAt, maxUses } = req.body;

        const existingCode = await prisma.redeemCode.findUnique({ where: { code } });
        if (existingCode) {
            return res.status(400).json({ message: 'Code already exists' });
        }

        const newCode = await prisma.redeemCode.create({
            data: {
                code,
                amount,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxUses: maxUses || null,
                usedCount: 0
            }
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

        await prisma.redeemCode.delete({ where: { id: codeId } });

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
            const existingCode = await prisma.redeemCode.findFirst({
                where: {
                    code,
                    id: { not: codeId }
                }
            });
            if (existingCode) {
                return res.status(400).json({ message: 'Code name already exists' });
            }
        }

        const updatedCode = await prisma.redeemCode.update({
            where: { id: codeId },
            data: { code, amount, maxUses }
        });

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

        const plan = await prisma.plan.create({
            data: {
                name,
                ramMb,
                diskMb,
                cpuPercent,
                cpuCores: cpuCores || 1,
                slots: slots || 1,
                priceCoins,
                pteroEggId,
                pteroNestId
            }
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
        await prisma.plan.delete({ where: { id: planId } });

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

        const plan = await prisma.plan.update({
            where: { id: planId },
            data: { name, ramMb, diskMb, cpuPercent, cpuCores, priceCoins, pteroEggId, pteroNestId, eggImage }
        });

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
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });

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
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: password_hash,
                coins: coins || 0,
                role: role || 'user',
                pteroUserId // Optional in schema?
            }
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
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

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role }
        });

        const { password, ...safeUser } = user;
        res.json({ message: 'User role updated', user: safeUser });
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

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const data: any = {};

        // Update email if provided
        if (email && email !== user.email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            data.email = email;
        }

        // Update password if provided
        if (password) {
            const bcrypt = await import('bcrypt');
            data.password = await bcrypt.hash(password, 10);
        }

        // Update coins if provided
        if (coins !== undefined) {
            if (coins < 0) {
                return res.status(400).json({ message: 'Coins cannot be negative' });
            }
            data.coins = coins;
        }

        // Update role if provided
        if (role) {
            if (!['user', 'mod', 'admin'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            data.role = role;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data
        });

        // Return user without password
        const { password: _, ...safeUser } = updatedUser;
        res.json({ message: 'User updated successfully', user: safeUser });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
};

// Update social media links
export const updateSocialMedia = async (req: Request, res: Response) => {
    try {
        const { discord, instagram, twitter, facebook, youtube, github, website } = req.body;

        const currentSettings = await getSettingsOrCreate();

        const currentSocial = (currentSettings.socialMedia as any) || {};
        const newSocial = {
            ...currentSocial,
            discord: discord ?? currentSocial.discord,
            instagram: instagram ?? currentSocial.instagram,
            twitter: twitter ?? currentSocial.twitter,
            facebook: facebook ?? currentSocial.facebook,
            youtube: youtube ?? currentSocial.youtube,
            github: github ?? currentSocial.github,
            website: website ?? currentSocial.website
        };

        const settings = await prisma.settings.update({
            where: { id: currentSettings.id },
            data: { socialMedia: newSocial }
        });

        res.json({ message: 'Social media links updated successfully', socialMedia: settings.socialMedia });
    } catch (error) {
        console.error('Update social media error:', error);
        res.status(500).json({ message: 'Failed to update social media links' });
    }
};
