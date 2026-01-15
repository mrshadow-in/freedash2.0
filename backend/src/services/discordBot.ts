import { Client, GatewayIntentBits, Events, EmbedBuilder, SlashCommandBuilder, REST, Routes, Guild, GuildMember } from 'discord.js';
import { prisma } from '../prisma';

// Type definitions
interface RewardTier {
    invites: number;
    coins: number;
}

let client: Client | null = null;
let inviteCache = new Map<string, Map<string, number>>(); // guildId -> (inviterId -> uses)
const linkCodes = new Map<string, string>();

// Generate random code
const generateCode = (prefix: string = 'REWARD') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${result}`;
};

export const verifyLinkCode = (code: string): string | null => {
    if (linkCodes.has(code)) {
        const discordId = linkCodes.get(code)!;
        linkCodes.delete(code);
        return discordId;
    }
    return null;
};

// Register slash commands
async function registerCommands(token: string, clientId: string, guildId: string) {
    const commands = [
        new SlashCommandBuilder().setName('invite-code').setDescription('Claim your invite reward code'),
        new SlashCommandBuilder().setName('invite-reward-list').setDescription('View all available invite reward tiers'),
        new SlashCommandBuilder().setName('boost-reward').setDescription('Claim your boost reward'),
        new SlashCommandBuilder().setName('my-invites').setDescription('Check your invite count'),
        new SlashCommandBuilder().setName('leaderboard').setDescription('View invite leaderboard'),
        new SlashCommandBuilder().setName('link-account').setDescription('Link your Discord account to the panel'),
        new SlashCommandBuilder().setName('unlink-account').setDescription('Unlink your Discord account from the panel'),
        new SlashCommandBuilder().setName('daily').setDescription('Claim your daily coin reward'),
        new SlashCommandBuilder().setName('help').setDescription('How to link account & bot features'),
        new SlashCommandBuilder().setName('free-server').setDescription('Learn how to get and keep a free server'),
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
}

// Cache invites for a guild
async function cacheInvites(guild: Guild) {
    try {
        const invites = await guild.invites.fetch();
        const guildInvites = new Map<string, number>();

        invites.forEach(invite => {
            if (invite.inviter) {
                const current = guildInvites.get(invite.inviter.id) || 0;
                guildInvites.set(invite.inviter.id, current + (invite.uses || 0));
            }
        });

        inviteCache.set(guild.id, guildInvites);
        console.log(`📊 Cached ${invites.size} invites for ${guild.name}`);
    } catch (error) {
        console.error(`Failed to cache invites for ${guild.name}:`, error);
    }
}

// Get user's total invites
async function getUserInvites(guild: Guild, userId: string): Promise<number> {
    try {
        const invites = await guild.invites.fetch();
        let total = 0;

        invites.forEach(invite => {
            if (invite.inviter?.id === userId) {
                total += invite.uses || 0;
            }
        });

        return total;
    } catch (error) {
        console.error('Error fetching invites:', error);
        return 0;
    }
}

// Create reward code in database
async function createRewardCode(coins: number, prefix: string): Promise<string> {
    const code = generateCode(prefix);

    await prisma.redeemCode.create({
        data: {
            code,
            amount: coins,
            maxUses: 1,
            usedCount: 0
        }
    });

    return code;
}

// Start Discord Bot
export async function startDiscordBot() {
    try {
        const { getSettings } = await import('./settingsService');
        const settings = await getSettings();
        const discordBot = (settings?.discordBot as any);

        if (!discordBot?.enabled || !discordBot?.token || !discordBot?.guildId) {
            console.log('⚠️ Discord bot is disabled or not configured');
            return;
        }

        if (client) {
            console.log('🔄 Restarting Discord bot...');
            client.destroy();
        }

        client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        // Ready event
        client.once(Events.ClientReady, async (c) => {
            console.log(`🤖 Discord bot logged in as ${c.user.tag}`);

            const guild = c.guilds.cache.get(discordBot.guildId);
            if (guild) {
                await cacheInvites(guild);
                await registerCommands(discordBot.token, c.user.id, discordBot.guildId);
            }
        });

        // Member join - track invites
        client.on(Events.GuildMemberAdd, async (member) => {
            try {
                const { getSettings } = await import('./settingsService');
                const settings = await getSettings();
                const discordBot = (settings?.discordBot as any);

                if (!discordBot?.guildId) return;

                const oldInvites = inviteCache.get(member.guild.id) || new Map();
                const newInvites = await member.guild.invites.fetch();

                let inviter: string | null = null;

                newInvites.forEach(invite => {
                    if (invite.inviter) {
                        const oldUses = oldInvites.get(invite.inviter.id) || 0;
                        const currentInviterTotal = Array.from(newInvites.values())
                            .filter(i => i.inviter?.id === invite.inviter!.id)
                            .reduce((sum, i) => sum + (i.uses || 0), 0);

                        if (currentInviterTotal > oldUses) {
                            inviter = invite.inviter.id;
                        }
                    }
                });

                await cacheInvites(member.guild);

                if (discordBot?.inviteChannelId && inviter) {
                    try {
                        const channel = member.guild.channels.cache.get(discordBot.inviteChannelId);
                        if (channel?.isTextBased()) {
                            const inviteCount = await getUserInvites(member.guild, inviter);

                            const embed = new EmbedBuilder()
                                .setColor(0x7c3aed)
                                .setTitle('👋 New Member!')
                                .setDescription(`${member.user.tag} joined the server!`)
                                .addFields(
                                    { name: 'Invited by', value: `<@${inviter}>`, inline: true },
                                    { name: 'Total Invites', value: `${inviteCount}`, inline: true }
                                )
                                .setTimestamp();

                            await (channel as any).send({ embeds: [embed] }).catch(() => {
                                console.log('⚠️ Could not send to invite channel (missing permission)');
                            });
                        }
                    } catch (e) {
                        console.log('⚠️ Invite channel message failed');
                    }
                }
            } catch (error) {
                console.error('Error tracking invite:', error);
            }
        });

        // Boost event
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                const { getSettings } = await import('./settingsService');
                const settings = await getSettings();
                const discordBot = (settings?.discordBot as any);

                if (!discordBot?.guildId) return;

                const wasBoosting = oldMember.premiumSince !== null;
                const isBoosting = newMember.premiumSince !== null;

                if (!wasBoosting && isBoosting) {
                    console.log(`🚀 ${newMember.user.tag} started boosting!`);

                    if (discordBot?.boostChannelId) {
                        try {
                            const channel = newMember.guild.channels.cache.get(discordBot.boostChannelId);
                            if (channel?.isTextBased()) {
                                const embed = new EmbedBuilder()
                                    .setColor(0xf47fff)
                                    .setTitle('🚀 New Server Boost!')
                                    .setDescription(`${newMember.user.tag} just boosted the server!`)
                                    .addFields(
                                        { name: 'Claim Reward', value: 'Use `/boost-reward` to claim your coins!', inline: false }
                                    )
                                    .setTimestamp();

                                await (channel as any).send({ embeds: [embed] }).catch(() => {
                                    console.log('⚠️ Could not send to boost channel');
                                });
                            }
                        } catch (e) {
                            console.log('⚠️ Boost channel message failed');
                        }
                    }
                }
            } catch (error) {
                console.error('Error tracking boost:', error);
            }
        });

        // Slash commands
        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            try {
                console.log(`[Bot] Received command: ${interaction.commandName} from ${interaction.user.tag}`);

                // HELP
                if (interaction.commandName === 'help') {
                    await interaction.deferReply({ ephemeral: false });
                    const helpMsg = `🤖 **Bot Assistance**\n\n` +
                        `**🔗 How to Connect:**\n` +
                        `1. Go to your **Dashboard > Account** page.\n` +
                        `2. Run \`/link-account\` here to get your unique code.\n` +
                        `3. Enter the code in the dashboard to sync balance.\n\n` +
                        `**💸 Features:**\n` +
                        `• **Daily**: \`/daily\` (50 coins)\n` +
                        `• **Invites**: Earn rewards by inviting members!\n` +
                        `• **Boost**: Server boosters get special rewards!`;
                    await interaction.editReply(helpMsg);
                    return;
                }

                // LINK ACCOUNT
                if (interaction.commandName === 'link-account') {
                    await interaction.deferReply({ ephemeral: true }); // MUST BE PRIVATE (Security)
                    const code = generateCode('LINK');
                    linkCodes.set(code, interaction.user.id);
                    setTimeout(() => linkCodes.delete(code), 300000);

                    const linkEmbed = new EmbedBuilder()
                        .setTitle('🔗 Link Your Account')
                        .setColor(0x7289DA)
                        .setDescription('Follow these steps to connect your Discord account to the panel:')
                        .addFields(
                            { name: 'Step 1: Copy Code', value: `\`\`\`${code}\`\`\``, inline: false },
                            { name: 'Step 2: Go to Dashboard', value: 'Navigate to **Settings > Account Connections** on the website.', inline: false },
                            { name: 'Step 3: Enter Code', value: 'Paste the code above into the "Link Discord" box and click Link.', inline: false }
                        )
                        .setFooter({ text: 'Code expires in 5 minutes' });
                    await interaction.editReply({ embeds: [linkEmbed] });
                    return;
                }

                // UNLINK ACCOUNT
                if (interaction.commandName === 'unlink-account') {
                    await interaction.deferReply({ ephemeral: false });
                    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                    if (!user) {
                        await interaction.editReply('❌ No account found linked to this Discord ID.');
                    } else {
                        await prisma.user.update({ where: { id: user.id }, data: { discordId: null } });
                        await interaction.editReply('✅ **Unlink Successful!**');
                    }
                    return;
                }

                // DAILY
                if (interaction.commandName === 'daily') {
                    await interaction.deferReply();

                    try {
                        // Check if user has linked their account
                        const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                        if (!user) {
                            await interaction.editReply('❌ You need to link your account first! Use `/link-account` to get started.');
                            return;
                        }

                        // Check if user is a server booster (Force fetch for fresh status)
                        const member = await interaction.guild?.members.fetch({ user: interaction.user.id, force: true });
                        const isBoosting = member ? member.premiumSince !== null : false;

                        // Get or create game stats for cooldown tracking
                        let gameStats = await prisma.discordGameStats.findUnique({
                            where: { discordId: interaction.user.id }
                        });

                        if (!gameStats) {
                            gameStats = await prisma.discordGameStats.create({
                                data: {
                                    discordId: interaction.user.id,
                                    dailyEarnings: 0,
                                    lastDailyReset: new Date(),
                                    invitesConsumed: 0,
                                    cooldowns: {}
                                }
                            });
                        }

                        // Parse cooldowns
                        const cooldowns = (gameStats.cooldowns as any) || {};
                        const lastDailyClaim = cooldowns['daily'] ? new Date(cooldowns['daily']) : null;

                        // Determine cooldown period based on boost status
                        const cooldownHours = isBoosting ? 12 : 24; // Boosters: 12 hours, Regular: 24 hours
                        const cooldownMs = cooldownHours * 60 * 60 * 1000;

                        // Check if cooldown has passed
                        if (lastDailyClaim) {
                            const timeSinceClaim = Date.now() - lastDailyClaim.getTime();

                            if (timeSinceClaim < cooldownMs) {
                                const timeRemaining = cooldownMs - timeSinceClaim;
                                const hoursLeft = Math.floor(timeRemaining / (1000 * 60 * 60));
                                const minutesLeft = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

                                const boostInfo = isBoosting ? ' 🚀 (Booster: 12h cooldown)' : ' (24h cooldown)';

                                await interaction.editReply(
                                    `⏰ **Daily Cooldown Active**\n\n` +
                                    `You can claim your next daily reward in **${hoursLeft}h ${minutesLeft}m**${boostInfo}\n\n` +
                                    `💡 Tip: Boost the server to reduce cooldown to 12 hours!`
                                );
                                return;
                            }
                        }

                        // Award the daily coins
                        const dailyReward = 50;
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { coins: { increment: dailyReward } }
                        });

                        // Update cooldown tracker
                        cooldowns['daily'] = new Date().toISOString();
                        await prisma.discordGameStats.update({
                            where: { discordId: interaction.user.id },
                            data: { cooldowns: cooldowns }
                        });

                        const boostBadge = isBoosting ? ' 🚀' : '';
                        const nextClaimInfo = isBoosting
                            ? '\n⏰ Next claim: **12 hours** (Booster perk!)'
                            : '\n⏰ Next claim: **24 hours**\n💡 Boost server for 12h cooldown!';

                        await interaction.editReply(
                            `💰 **Daily Reward Claimed!**${boostBadge}\n\n` +
                            `+${dailyReward} coins added to your account!${nextClaimInfo}`
                        );

                    } catch (error) {
                        console.error('Error in daily command:', error);
                        await interaction.editReply('❌ An error occurred while claiming your daily reward. Please try again later.');
                    }
                    return;
                }

                // MY INVITES
                if (interaction.commandName === 'my-invites') {
                    await interaction.deferReply({ ephemeral: false });

                    const guild = interaction.guild;
                    if (!guild) {
                        await interaction.editReply('❌ This command must be used in a server.');
                        return;
                    }

                    const inviteCount = await getUserInvites(guild, interaction.user.id);

                    const embed = new EmbedBuilder()
                        .setColor(0x7c3aed)
                        .setTitle('📊 Your Invites')
                        .setDescription(`You have **${inviteCount}** total invites!`)
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                // LEADERBOARD
                if (interaction.commandName === 'leaderboard') {
                    await interaction.deferReply();

                    const guild = interaction.guild;
                    if (!guild) {
                        await interaction.editReply('❌ This command must be used in a server.');
                        return;
                    }

                    const invites = await guild.invites.fetch();
                    const inviteMap = new Map<string, number>();

                    invites.forEach(invite => {
                        if (invite.inviter) {
                            const current = inviteMap.get(invite.inviter.id) || 0;
                            inviteMap.set(invite.inviter.id, current + (invite.uses || 0));
                        }
                    });

                    const sorted = Array.from(inviteMap.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10);

                    let description = '';
                    for (let i = 0; i < sorted.length; i++) {
                        const [userId, count] = sorted[i];
                        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                        description += `${medal} <@${userId}> - **${count}** invites\n`;
                    }

                    const embed = new EmbedBuilder()
                        .setColor(0xffd700)
                        .setTitle('🏆 Invite Leaderboard')
                        .setDescription(description || 'No invites yet!')
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                    return;
                }

                // INVITE-REWARD-LIST
                if (interaction.commandName === 'invite-reward-list') {
                    await interaction.deferReply();

                    try {
                        const { getSettings } = await import('./settingsService');
                        const settings = await getSettings();
                        let rewardArray: any[] = (settings?.inviteRewards as any) || [];

                        // Handle both array and object formats
                        if (!Array.isArray(rewardArray)) {
                            rewardArray = Object.entries(rewardArray).map(([invites, coins]) => ({
                                invites: parseInt(invites),
                                coins: Number(coins)
                            }));
                        }

                        // Filter valid rewards
                        const validRewards: RewardTier[] = rewardArray.filter((r: any) =>
                            r && typeof r === 'object' &&
                            !isNaN(Number(r.invites)) && !isNaN(Number(r.coins)) &&
                            Number(r.invites) > 0 && Number(r.coins) > 0
                        ).map((r: any) => ({
                            invites: Number(r.invites),
                            coins: Number(r.coins)
                        })).sort((a: RewardTier, b: RewardTier) => a.invites - b.invites);

                        if (validRewards.length === 0) {
                            await interaction.editReply('❌ No invite rewards configured. Ask admin to add rewards!');
                            return;
                        }

                        // Build reward list
                        let description = '**📋 Available Invite Reward Tiers:**\n\n';
                        for (const reward of validRewards) {
                            description += `🎯 **${reward.invites}** invites → **${reward.coins}** coins\n`;
                        }
                        description += '\nUse `/invite-code` to claim your rewards!';

                        const embed = new EmbedBuilder()
                            .setColor(0x7c3aed)
                            .setTitle('💰 Invite Rewards')
                            .setDescription(description)
                            .setFooter({ text: 'Invite more members to earn coins!' })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });
                    } catch (error) {
                        console.error('Error in invite-reward-list command:', error);
                        await interaction.editReply('❌ An error occurred.');
                    }
                    return;
                }

                // INVITE-CODE
                if (interaction.commandName === 'invite-code') {
                    await interaction.deferReply({ ephemeral: true });

                    try {
                        const guild = interaction.guild;
                        if (!guild) {
                            await interaction.editReply('❌ This command must be used in a server.');
                            return;
                        }

                        const inviteCount = await getUserInvites(guild, interaction.user.id);

                        const { getSettings } = await import('./settingsService');
                        const settings = await getSettings();
                        let rewardArray = (settings?.inviteRewards as any) || [];

                        // Handle both array and object formats
                        if (!Array.isArray(rewardArray)) {
                            // Convert object to array if needed
                            rewardArray = Object.entries(rewardArray).map(([invites, coins]) => ({
                                invites: parseInt(invites),
                                coins: Number(coins)
                            }));
                        }

                        // Filter valid rewards
                        const validRewards = rewardArray.filter((r: any) =>
                            r && typeof r === 'object' &&
                            !isNaN(Number(r.invites)) && !isNaN(Number(r.coins)) &&
                            Number(r.invites) > 0 && Number(r.coins) > 0
                        ).map((r: any) => ({
                            invites: Number(r.invites),
                            coins: Number(r.coins)
                        }));

                        if (validRewards.length === 0) {
                            await interaction.editReply('❌ No valid invite rewards configured. Ask admin to add rewards in the Admin Panel.');
                            return;
                        }

                        // Find eligible reward (highest tier not yet claimed)
                        const sortedRewards: RewardTier[] = validRewards.sort((a: RewardTier, b: RewardTier) => b.invites - a.invites);
                        let eligibleReward = null;

                        for (const reward of sortedRewards) {
                            if (inviteCount >= reward.invites) {
                                const existingClaim = await prisma.inviteClaim.findUnique({
                                    where: {
                                        discordUserId_invitesRequired: {
                                            discordUserId: interaction.user.id,
                                            invitesRequired: reward.invites
                                        }
                                    }
                                });

                                if (!existingClaim) {
                                    eligibleReward = reward;
                                    break;
                                }
                            }
                        }

                        if (!eligibleReward) {
                            // Show progress
                            const nextReward = validRewards
                                .filter((r: RewardTier) => r.invites > inviteCount)
                                .sort((a: RewardTier, b: RewardTier) => a.invites - b.invites)[0];

                            if (nextReward) {
                                await interaction.editReply(
                                    `📊 You have **${inviteCount}** invites.\n` +
                                    `🎯 Next reward at **${nextReward.invites}** invites (${nextReward.coins} coins)\n` +
                                    `⏳ You need **${nextReward.invites - inviteCount}** more invites!`
                                );
                            } else {
                                await interaction.editReply(`✅ You've claimed all available rewards! You have **${inviteCount}** invites.`);
                            }
                            return;
                        }

                        // Create code and claim
                        const code = await createRewardCode(eligibleReward.coins, 'INV');

                        await prisma.inviteClaim.create({
                            data: {
                                discordUserId: interaction.user.id,
                                invitesRequired: eligibleReward.invites,
                                code
                            }
                        });

                        const embed = new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle('🎉 Invite Reward Claimed!')
                            .setDescription(`You've earned a reward for **${eligibleReward.invites}** invites!`)
                            .addFields(
                                { name: '🎁 Your Code', value: `\`${code}\``, inline: false },
                                { name: '💰 Coins', value: `${eligibleReward.coins}`, inline: true },
                                { name: '📊 Total Invites', value: `${inviteCount}`, inline: true }
                            )
                            .setFooter({ text: 'Redeem this code on the dashboard!' })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } catch (error) {
                        console.error('Error in invite-code command:', error);
                        await interaction.editReply('❌ An error occurred. Please try again later.');
                    }
                    return;
                }

                // BOOST-REWARD
                if (interaction.commandName === 'boost-reward') {
                    await interaction.deferReply({ ephemeral: true });

                    try {
                        // Force fetch member to ensure fresh boost status
                        const member = await interaction.guild?.members.fetch({ user: interaction.user.id, force: true });

                        if (!member || !member.premiumSince) {
                            await interaction.editReply('❌ You need to be a server booster to claim this reward!');
                            return;
                        }

                        const { getSettings } = await import('./settingsService');
                        const settings = await getSettings();
                        const boostRewards = (settings?.boostRewards as any) || {};

                        // Get first boost reward (1 boost = reward)
                        const boostReward = boostRewards['1'] || 500; // Default 500 if not configured
                        const coins = Number(boostReward);

                        if (isNaN(coins) || coins <= 0) {
                            await interaction.editReply('❌ No boost reward configured.');
                            return;
                        }

                        // Check if already claimed (using -1 to indicate boost)
                        const existingClaim = await prisma.inviteClaim.findUnique({
                            where: {
                                discordUserId_invitesRequired: {
                                    discordUserId: interaction.user.id,
                                    invitesRequired: -1
                                }
                            }
                        });

                        if (existingClaim) {
                            await interaction.editReply(
                                '✅ **You have already claimed your Booster Reward!**\n\n' +
                                'Note: This reward is for **becoming a booster**. It can only be claimed once per account, regardless of how many times you boost.'
                            );
                            return;
                        }

                        // Create code and save claim
                        const code = await createRewardCode(coins, 'BOOST');

                        await prisma.inviteClaim.create({
                            data: {
                                discordUserId: interaction.user.id,
                                invitesRequired: -1,
                                code
                            }
                        });

                        const embed = new EmbedBuilder()
                            .setColor(0xf47fff)
                            .setTitle('🚀 Boost Reward Claimed!')
                            .setDescription('Thank you for boosting the server!')
                            .addFields(
                                { name: '🎁 Your Code', value: `\`${code}\``, inline: false },
                                { name: '💰 Coins', value: `${coins}`, inline: true }
                            )
                            .setFooter({ text: 'Redeem this code on the dashboard!' })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } catch (error) {
                        console.error('Error in boost-reward command:', error);
                        await interaction.editReply('❌ An error occurred. Please try again later.');
                    }
                    return;
                }

                // FREE-SERVER
                if (interaction.commandName === 'free-server') {
                    await interaction.deferReply();

                    try {
                        const { getSettings } = await import('./settingsService');
                        const settings = await getSettings();
                        const discordBot = (settings?.discordBot as any);
                        const dashboardUrl = discordBot?.dashboardUrl || 'https://your-dashboard-url.com';

                        const embed = new EmbedBuilder()
                            .setColor(0x00ff00)
                            .setTitle('🚀 How to Get a Free Server')
                            .setDescription('Follow these steps to start your free server journey!')
                            .addFields(
                                {
                                    name: '📜 Server Rules (RAM Billing)',
                                    value: '• We use a **Pay-As-You-Go** system based on RAM usage.\n• Coins are deducted automatically while your server is running.\n• If you run out of coins, your server will be **suspended** (Data is safe!).\n• Earn more coins to resume your server instantly.'
                                },
                                {
                                    name: '💰 How to Earn Coins',
                                    value: '1. **Boost the Server**: Get BIG coin rewards!\n2. **Invite Friends**: Use `/invite-reward-list` to see rewards.\n3. **Daily Rewards**: Use `/daily` every 24h (12h for boosters).\n4. **AFK Page**: Earn coins by keeping the AFK page open on the dashboard.\n5. **Play Games**: Play minigames on the dashboard.'
                                },
                                {
                                    name: '🔗 Get Started',
                                    value: `[**Click Here to Visit Dashboard**](${dashboardUrl})\n*Link your Discord account in Settings > Account to sync coins!*`
                                }
                            )
                            .setFooter({ text: 'Start your free server today!' })
                            .setTimestamp();

                        await interaction.editReply({ embeds: [embed] });

                    } catch (error) {
                        console.error('Error in free-server command:', error);
                        await interaction.editReply('❌ An error occurred.');
                    }
                    return;
                }

            } catch (err) {
                console.error('FATAL Interaction Error:', err);
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content: '❌ System Error occurred.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ System Error occurred.', ephemeral: true });
                    }
                } catch (ignore) { }
            }
        });

        // Login
        await client.login(discordBot.token);

    } catch (error) {
        console.error('❌ Failed to start Discord bot:', error);
    }
}

// Stop Discord Bot
export function stopDiscordBot() {
    if (client) {
        client.destroy();
        client = null;
        console.log('🛑 Discord bot stopped');
    }
}

// Get bot status
export function getBotStatus() {
    return {
        running: client !== null && client.isReady(),
        user: client?.user?.tag || null
    };
}
