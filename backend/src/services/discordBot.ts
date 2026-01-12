import { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes, Guild, EmbedBuilder } from 'discord.js';
import { prisma } from '../prisma';

let client: Client | null = null;
const linkCodes = new Map<string, string>();
let triviaActive = false;
let currentTriviaAnswer: string | null = null;
let inviteCache = new Map<string, Map<string, number>>(); // GuildId -> UserId -> Count

// Helper to generate codes
function generateRandomCode(length = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 Q
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Helpers
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

// Check Game Limits & Anti-Abuse
async function checkGameLimits(discordId: string, cmd: string, channelId: string, settings: any): Promise<{ allowed: boolean, reason?: string }> {
    const gamesChannelId = settings?.discordBot?.gamesChannelId;

    // 1. Channel Restriction
    if (gamesChannelId && channelId !== gamesChannelId) {
        return { allowed: false, reason: `❌ wrong_channel` }; // Handle in UI
    }

    // 2. Fetch Stats
    let stats = await prisma.discordGameStats.findUnique({ where: { discordId } });
    if (!stats) {
        stats = await prisma.discordGameStats.create({ data: { discordId } });
    }

    // 3. Daily Reset
    const now = new Date();
    if (new Date(stats.lastDailyReset).getDate() !== now.getDate()) {
        await prisma.discordGameStats.update({
            where: { discordId },
            data: { dailyEarnings: 0, lastDailyReset: now }
        });
        stats.dailyEarnings = 0;
    }

    // 4. Daily Limit
    const DAILY_Limit = 50; // Hardcoded for now, or fetch from settings
    if (stats.dailyEarnings >= DAILY_Limit) {
        return { allowed: false, reason: '🛑 Daily earning limit reached (50 coins)!' };
    }

    // 5. Cooldowns
    const cooldowns = (stats.cooldowns as any) || {};
    const lastTime = cooldowns[cmd] ? new Date(cooldowns[cmd]).getTime() : 0;
    const cooldownMs = 60000; // 1 min default
    if (now.getTime() - lastTime < cooldownMs) {
        const wait = Math.ceil((cooldownMs - (now.getTime() - lastTime)) / 1000);
        return { allowed: false, reason: `⏳ Cooldown! Wait ${wait}s.` };
    }

    return { allowed: true };
}

async function updateGameStats(discordId: string, cmd: string, earnings: number) {
    const stats = await prisma.discordGameStats.findUnique({ where: { discordId } });
    const cooldowns = (stats?.cooldowns as any) || {};
    cooldowns[cmd] = new Date();

    await prisma.discordGameStats.update({
        where: { discordId },
        data: {
            cooldowns,
            dailyEarnings: { increment: earnings > 0 ? earnings : 0 }
        }
    });
}

// Register Slash Commands
async function registerCommands(token: string, clientId: string, guildId: string) {
    const commands = [
        new SlashCommandBuilder().setName('invite-code').setDescription('Claim your invite reward code'),
        new SlashCommandBuilder().setName('boost-reward').setDescription('Claim your boost reward'),
        new SlashCommandBuilder().setName('my-invites').setDescription('Check your invite count'),
        new SlashCommandBuilder().setName('leaderboard').setDescription('View invite leaderboard'),

        // Auth
        new SlashCommandBuilder().setName('link-account').setDescription('Link your Discord account to the panel'),
        new SlashCommandBuilder().setName('unlink-account').setDescription('Unlink your Discord account from the panel'),

        // Earning Tasks
        new SlashCommandBuilder().setName('daily').setDescription('Claim your daily coin reward'),
        new SlashCommandBuilder().setName('task').setDescription('Start a random chat task for coins'),
        new SlashCommandBuilder().setName('task-reward').setDescription('Claim reward for your completed chat task'),
        new SlashCommandBuilder().setName('trivia').setDescription('Start a trivia round (Admin Only)'),

        // Minigames
        new SlashCommandBuilder().setName('dice').setDescription('Roll a dice (1-6). Win on 6!'),
        new SlashCommandBuilder().setName('flip').setDescription('Flip a coin. Heads(+3) or Tails(-1)?').addStringOption(o => o.setName('side').setDescription('Heads or Tails').setRequired(true).addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),
        new SlashCommandBuilder().setName('hunt').setDescription('Go on a daily hunt for coins'),
        new SlashCommandBuilder().setName('bet').setDescription('Bet coins (50/50 chance)').addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),

        // Help
        new SlashCommandBuilder().setName('help').setDescription('How to link account & bot features'),
        new SlashCommandBuilder().setName('game-help').setDescription('How to play minigames & rules'),
        new SlashCommandBuilder().setName('active-list').setDescription('List all linked dashboard users (Admin Only)'),
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

// Invite Tracking Helpers
async function cacheInvites(guild: Guild) {
    try {
        const invites = await guild.invites.fetch();
        const memberInvites = new Map<string, number>();
        invites.forEach(inv => {
            const count = (memberInvites.get(inv.inviterId!) || 0) + (inv.uses || 0);
            memberInvites.set(inv.inviterId!, count);
        });
        inviteCache.set(guild.id, memberInvites);
    } catch (err) {
        console.error('Invite cache error:', err);
    }
}


// Start Bot
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
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
        });

        client.once(Events.ClientReady, async (c) => {
            console.log(`🤖 Discord bot logged in as ${c.user.tag}`);
            try {
                await cacheInvites(c.guilds.cache.get(discordBot.guildId)!);
                await registerCommands(discordBot.token, c.user.id, discordBot.guildId);
            } catch (error) { console.error('Failed to init guild cache:', error); }
        });

        // Message Handling (Tasks, Bumps, Trivia)
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) {
                // Disboard Bump Logic
                if (message.author.id === '302050872383242240' && message.embeds.length > 0) {
                    const desc = message.embeds[0].description || '';
                    if (desc.includes('Bumped!')) {
                        const match = desc.match(/<@!?(\d+)>/);
                        if (match) {
                            const userId = match[1];
                            const user = await prisma.user.findUnique({ where: { discordId: userId } });
                            if (user) {
                                await prisma.user.update({
                                    where: { id: user.id },
                                    data: { coins: { increment: 50 } }
                                });
                                await message.channel.send(`🎉 <@${userId}> earned **50 coins** for bumping!`);
                            } else {
                                // const code = ...
                                await message.channel.send(`🎉 <@${userId}> earned **50 coins**! Link account to claim.`);
                            }
                        }
                    }
                }
                return;
            }

            // Trivia Logic
            if (triviaActive && currentTriviaAnswer && message.content.toLowerCase().includes(currentTriviaAnswer.toLowerCase())) {
                triviaActive = false;
                currentTriviaAnswer = null;
                const reward = 25;
                const user = await prisma.user.findUnique({ where: { discordId: message.author.id } });
                if (user) {
                    await prisma.user.update({ where: { id: user.id }, data: { coins: { increment: reward } } });
                    await message.reply(`🎉 Correct! Earned **${reward} coins**!`);
                } else {
                    await message.reply(`🎉 Correct! Link account to claim **${reward} coins**.`);
                }
                return;
            }

            // Chat Tasks Logic
            const activeTask = await prisma.discordChatTask.findUnique({ where: { discordId: message.author.id } });
            if (activeTask && activeTask.currentMessages < activeTask.targetMessages) {
                await prisma.discordChatTask.update({ where: { id: activeTask.id }, data: { currentMessages: { increment: 1 } } });
            }
        });

        // Voice Farming
        client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            /* Logic for voice farming - kept simple/placeholder if not requested to change */
            // ... (keeping existing voice logic assumes it's elsewhere or handled by another PR, but for now we follow the file provided)
            // The file provided had empty logic for this, so keeping it empty/commented as provided.
        });

        // Interactions
        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            try {
                console.log(`[Bot] Received command: ${interaction.commandName} from ${interaction.user.tag}`);

                switch (interaction.commandName) {
                    // --- ADMIN ---
                    case 'active-list':
                        if (!(interaction.member as any)?.permissions.has('Administrator')) {
                            await interaction.reply({ content: '❌ Admin Only.', ephemeral: true });
                            return;
                        }
                        await interaction.deferReply({ ephemeral: true });
                        try {
                            const users = await prisma.user.findMany({
                                where: { discordId: { not: null } },
                                select: { username: true, discordId: true, email: true }
                            });
                            const embed = new EmbedBuilder()
                                .setTitle(`📋 Linked Users (${users.length})`)
                                .setColor(0x00FF00)
                                .setDescription(users.map(u => `• **${u.username}** - <@${u.discordId}>`).join('\n').slice(0, 4000) || 'No active users linked.');
                            await interaction.editReply({ embeds: [embed] });
                        } catch (e) { console.error(e); await interaction.editReply('❌ Database error.'); }
                        break;

                    // --- HELP ---
                    case 'help':
                        await interaction.deferReply({ ephemeral: true });
                        const helpMsg = `🤖 **Bot Assistance**\n\n` +
                            `**🔗 How to Connect:**\n` +
                            `1. Go to your **Dashboard > Account** page.\n` +
                            `2. Run \`/link-account\` here to get your unique code.\n` +
                            `3. Enter the code in the dashboard to sync balance.\n\n` +
                            `**💸 Features:**\n` +
                            `• **Daily**: \`/daily\` (50 coins)\n` +
                            `• **Chat**: Random tasks trigger while chatting.\n` +
                            `• **Voice**: Earn coins for being in VC (10 coins/10min).\n` +
                            `• **Games**: Run \`/game-help\` for info.`;
                        await interaction.editReply(helpMsg);
                        break;

                    case 'game-help':
                        await interaction.deferReply({ ephemeral: true });
                        const gameMsg = `🎮 **Minigames Guide**\n\n` +
                            `**🎲 Dice** (\`/dice\`)\n` +
                            `Roll 1-6. If you roll a **6**, you win **+5 coins**.\n` +
                            `*Cost: Free*\n\n` +
                            `**🪙 Coin Flip** (\`/flip <heads/tails>\`)\n` +
                            `Win: **+3 coins** | Lose: **-1 coin** penalty!\n\n` +
                            `**🐾 Hunt** (\`/hunt\`)\n` +
                            `Daily adventure. Find **2-20 coins** or nothing.\n\n` +
                            `**🎰 Bet** (\`/bet <amount>\`)\n` +
                            `50/50 chance. Double your bet or lose it all.\n` +
                            `*Max Bet: 50 coins*`;
                        await interaction.editReply(gameMsg);
                        break;

                    // --- ACCOUNT ---
                    case 'link-account':
                        await interaction.deferReply({ ephemeral: true });
                        const code = generateCode('LINK');
                        linkCodes.set(code, interaction.user.id);
                        setTimeout(() => linkCodes.delete(code), 300000); // 5 mins

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
                        break;

                    case 'unlink-account':
                        await interaction.deferReply({ ephemeral: true });
                        const uUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                        if (!uUser) {
                            await interaction.editReply('❌ No account found linked to this Discord ID.');
                        } else {
                            await prisma.user.update({ where: { id: uUser.id }, data: { discordId: null } });
                            await interaction.editReply('✅ **Unlink Successful!**');
                        }
                        break;

                    case 'my-invites':
                        await interaction.deferReply({ ephemeral: true });
                        const invData = inviteCache.get(interaction.guildId!) || new Map();
                        const count = invData.get(interaction.user.id) || 0;
                        await interaction.editReply(`📩 **Invite Stats**\nYou have **${count}** tracked invites in this server.`);
                        break;

                    case 'leaderboard':
                        await interaction.deferReply();
                        try {
                            const lbData = inviteCache.get(interaction.guildId!) || new Map();
                            const sorted = [...lbData.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

                            if (sorted.length === 0) {
                                await interaction.editReply('📉 Leaderboard is empty.');
                            } else {
                                const lines = sorted.map((entry, i) => `**#${i + 1}** <@${entry[0]}> - **${entry[1]} invites**`);
                                const lbEmbed = new EmbedBuilder()
                                    .setTitle('🏆 Top 10 Inviters')
                                    .setColor(0xFFD700)
                                    .setDescription(lines.join('\n'));
                                await interaction.editReply({ embeds: [lbEmbed] });
                            }
                        } catch (e) {
                            console.error('[Bot] Leaderboard Error:', e);
                            await interaction.editReply('❌ Failed to load leaderboard.');
                        }
                        break;

                    // --- EARNINGS ---
                    case 'daily':
                        await interaction.deferReply();
                        const dUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                        if (!dUser) {
                            await interaction.editReply('❌ Link account first.');
                        } else {
                            // Can add cooldown check here if needed in future
                            await prisma.user.update({ where: { id: dUser.id }, data: { coins: { increment: 50 } } });
                            await interaction.editReply('💰 Daily claimed: **50 coins**');
                        }
                        break;

                    case 'invite-code': // Reward Claimer (SPENDABLE INVITES LOGIC)
                        await interaction.deferReply({ ephemeral: true });

                        try {
                            const { getSettings } = await import('./settingsService');
                            const settings = await getSettings();

                            // User check
                            const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                            if (!user) {
                                await interaction.editReply('❌ Link your dashboard account first (`/link-account`).');
                                break;
                            }

                            // Get Game Stats for "Consumed" Invites
                            let stats = await prisma.discordGameStats.findUnique({ where: { discordId: interaction.user.id } });
                            if (!stats) stats = await prisma.discordGameStats.create({ data: { discordId: interaction.user.id } });

                            const consumed = stats.invitesConsumed || 0;

                            // Get Total Invites from Discord Cache
                            const invData = inviteCache.get(interaction.guildId!) || new Map();
                            const totalInvites = invData.get(interaction.user.id) || 0;
                            const availableInvites = Math.max(0, totalInvites - consumed);

                            if (availableInvites === 0) {
                                await interaction.editReply(`ℹ️ **No Available Invites**\nTotal: ${totalInvites} | Consumed: ${consumed}\nInvite more people to earn rewards!`);
                            } else {
                                // Check Milestones from Settings
                                const rewards = (settings?.inviteRewards as any) || {};

                                // Validate rewards configuration
                                if (Object.keys(rewards).length === 0) {
                                    await interaction.editReply('⚠️ **No Rewards Configured**\nAsk the admin to set up invite rewards in the Admin Panel.');
                                    break;
                                }

                                let bestTierCost = 0;
                                let bestTierReward = 0;

                                // Find the HIGHEST affordable tier
                                for (const [reqStr, amount] of Object.entries(rewards)) {
                                    const cost = parseInt(reqStr);
                                    const reward = Number(amount);

                                    // Validate tier
                                    if (isNaN(cost) || isNaN(reward) || cost <= 0 || reward <= 0) {
                                        console.warn(`[Bot] Invalid invite reward tier: ${reqStr} -> ${amount}`);
                                        continue;
                                    }

                                    if (availableInvites >= cost && cost > bestTierCost) {
                                        bestTierCost = cost;
                                        bestTierReward = reward;
                                    }
                                }

                                // Ensure we have a valid reward
                                if (bestTierCost > 0 && bestTierReward > 0 && !isNaN(bestTierReward)) {
                                    // CLAIM REWARD
                                    const codeStr = `INV-${bestTierCost}-${generateRandomCode()}`;

                                    // 1. Create RedeemCode
                                    await prisma.redeemCode.create({
                                        data: {
                                            code: codeStr,
                                            amount: bestTierReward,
                                            maxUses: 1,
                                            usedCount: 0
                                        }
                                    });

                                    // 2. RESET Logic: Consumed becomes Total
                                    await prisma.discordGameStats.update({
                                        where: { id: stats.id },
                                        data: { invitesConsumed: totalInvites }
                                    });

                                    await interaction.editReply(`🎉 **Reward Unlocked!**\n\n**Tier Reached**: ${bestTierCost} Invites\n**Reward**: ${bestTierReward} Coins\n**Code**: \`${codeStr}\`\n\n⚠️ **Invites Reset**: Your available invites have been reset to 0.`);
                                } else {
                                    // Has invites but not enough for any tier
                                    let nextTier = 999999;
                                    for (const r of Object.keys(rewards)) {
                                        const rv = parseInt(r);
                                        if (rv > availableInvites && rv < nextTier) nextTier = rv;
                                    }
                                    let msg = `ℹ️ **Progress**\nYou have **${availableInvites} available invites**.\n`;
                                    if (nextTier < 999999) msg += `Next reward at **${nextTier}**.`;

                                    await interaction.editReply(msg);
                                }
                            }
                        } catch (err) {
                            console.error('Invite-code error:', err);
                            await interaction.editReply('❌ An error occurred while checking rewards.');
                        }
                        break;

                    case 'boost-reward':
                        await interaction.deferReply({ ephemeral: true });
                        const bMember = await interaction.guild?.members.fetch(interaction.user.id);
                        if (!bMember?.premiumSince) {
                            await interaction.editReply('❌ You are not boosting this server!');
                            break; // Changed return to break for cleaner switch
                        }

                        const bUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                        if (!bUser) {
                            await interaction.editReply('❌ Link your dashboard account first.');
                            break;
                        }

                        let bStats = await prisma.discordGameStats.findUnique({ where: { discordId: interaction.user.id } });
                        if (!bStats) bStats = await prisma.discordGameStats.create({ data: { discordId: interaction.user.id } });

                        const bCdMap = (bStats.cooldowns as any) || {};
                        const bLast = bCdMap['boost-reward'] ? new Date(bCdMap['boost-reward']).getTime() : 0;
                        const bNow = Date.now();
                        const bThirtyDays = 30 * 24 * 60 * 60 * 1000;

                        if (bNow - bLast < bThirtyDays) {
                            const days = Math.ceil((bThirtyDays - (bNow - bLast)) / (1000 * 60 * 60 * 24));
                            await interaction.editReply(`⏳ Already claimed. Come back in **${days} days**.`);
                        } else {
                            try {
                                const reward = 500; // Configurable ideally
                                const codeStr = `BOOST-${generateRandomCode()}`;

                                await prisma.redeemCode.create({
                                    data: {
                                        code: codeStr,
                                        amount: reward,
                                        maxUses: 1,
                                        usedCount: 0
                                    }
                                });

                                bCdMap['boost-reward'] = new Date();
                                await prisma.discordGameStats.update({ where: { id: bStats.id }, data: { cooldowns: bCdMap } });
                                await interaction.editReply(`💎 **Thank You for Boosting!**\nReward Code: \`${codeStr}\`\nRedeem for **${reward} coins**.`);
                            } catch (err) {
                                console.error('Boost reward error:', err);
                                await interaction.editReply('❌ Error generating boost reward.');
                            }
                        }
                        break;

                    // --- GAMES ---
                    case 'dice':
                    case 'flip':
                    case 'hunt':
                    case 'bet':
                        await interaction.deferReply(); // Defer FIRST

                        // 1. Check User
                        const gUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                        if (!gUser) {
                            await interaction.editReply('❌ Link your account (`/link-account`) to play.');
                            break;
                        }

                        // 2. Check Limits
                        const { getSettings } = await import('./settingsService');
                        const gSettings = await getSettings();
                        const gCheck = await checkGameLimits(interaction.user.id, interaction.commandName, interaction.channelId, gSettings);

                        if (!gCheck.allowed) {
                            const gChan = gSettings?.discordBot?.gamesChannelId;
                            if (gCheck.reason === '❌ wrong_channel') {
                                await interaction.editReply(`❌ Play in: <#${gChan}>`);
                            } else {
                                await interaction.editReply(gCheck.reason || '❌ Not allowed');
                            }
                            break;
                        }

                        const gConfig = (gSettings?.games as any) || {};

                        // 3. Game Logic
                        if (interaction.commandName === 'dice') {
                            const win = (gConfig.dice?.win || 5);
                            const roll = Math.floor(Math.random() * 6) + 1;
                            if (roll === 6) {
                                await prisma.user.update({ where: { id: gUser.id }, data: { coins: { increment: win } } });
                                await updateGameStats(interaction.user.id, 'dice', win);
                                await interaction.editReply(`🎲 Rolled a **6**! Won **${win} coins**!`);
                            } else {
                                await updateGameStats(interaction.user.id, 'dice', 0);
                                await interaction.editReply(`🎲 Rolled a **${roll}**. (Need 6)`);
                            }

                        } else if (interaction.commandName === 'flip') {
                            const win = (gConfig.flip?.win || 3);
                            const loss = (gConfig.flip?.loss || 1);
                            const choice = interaction.options.getString('side');
                            const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
                            const isWin = choice?.toLowerCase() === outcome;

                            if (isWin) {
                                await prisma.user.update({ where: { id: gUser.id }, data: { coins: { increment: win } } });
                                await updateGameStats(interaction.user.id, 'flip', win);
                                await interaction.editReply(`🪙 It was **${outcome}**! Won **${win} coins**!`);
                            } else {
                                await prisma.user.update({ where: { id: gUser.id }, data: { coins: { decrement: loss } } });
                                await updateGameStats(interaction.user.id, 'flip', 0);
                                await interaction.editReply(`🪙 It was **${outcome}**. Lost **${loss} coins**!`);
                            }

                        } else if (interaction.commandName === 'hunt') {
                            const rand = Math.random();
                            const rare = (gConfig.hunt?.max || 20);
                            const common = (gConfig.hunt?.min || 2);
                            let earn = 0;
                            let msg = '';

                            if (rand < 0.1) { earn = rare; msg = `🌟 **LEGENDARY!** Found **${earn} coins**!`; }
                            else if (rand < 0.5) { earn = common; msg = `🐾 Found **${earn} coins**.`; }
                            else { msg = '🍃 Found nothing...'; }

                            if (earn > 0) {
                                await prisma.user.update({ where: { id: gUser.id }, data: { coins: { increment: earn } } });
                            }
                            await updateGameStats(interaction.user.id, 'hunt', earn);
                            await interaction.editReply(msg);

                        } else if (interaction.commandName === 'bet') {
                            const max = (gConfig.bet?.max || 50);
                            const amount = interaction.options.getInteger('amount') || 0;

                            if (amount <= 0) { await interaction.editReply('❌ Bet positive amount.'); break; }
                            if (gUser.coins < amount) { await interaction.editReply(`❌ Too poor. Balance: ${gUser.coins}`); break; }
                            if (amount > max) { await interaction.editReply(`❌ Max bet is ${max}.`); break; }

                            const isWin = Math.random() < 0.5;
                            if (isWin) {
                                await prisma.user.update({ where: { id: gUser.id }, data: { coins: { increment: amount } } });
                                await updateGameStats(interaction.user.id, 'bet', amount);
                                await interaction.editReply(`🎰 **WINNER!** Won **${amount} coins**!`);
                            } else {
                                await prisma.user.update({ where: { id: gUser.id }, data: { coins: { decrement: amount } } });
                                await updateGameStats(interaction.user.id, 'bet', 0);
                                await interaction.editReply(`📉 **LOST.** Lost **${amount} coins**.`);
                            }
                        }
                        break;

                    default:
                        // No handler found
                        break;
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

        // --- 1. USER LEFT GUILD -> SUSPEND SERVERS ---
        client.on(Events.GuildMemberRemove, async (member) => {
            console.log(`[Bot] User left guild: ${member.user.tag} (${member.id})`);
            try {
                // Find Dashboard User
                const user = await prisma.user.findUnique({ where: { discordId: member.id } });
                if (!user) return; // Not a dashboard user

                // Find active servers
                const servers = await prisma.server.findMany({
                    where: {
                        ownerId: user.id,
                        status: { not: 'suspended' },
                        isSuspended: false
                    }
                });

                if (servers.length === 0) return;

                console.log(`[Bot] Suspending ${servers.length} servers for user ${user.username} (Left Discord)`);

                // Suspend Loop
                const { suspendPteroServer } = await import('./pterodactyl');
                const { sendServerSuspendedWebhook } = await import('./webhookService');

                for (const server of servers) {
                    // Ptero Suspend
                    if (server.pteroServerId) {
                        try {
                            await suspendPteroServer(server.pteroServerId);
                        } catch (err) {
                            console.error(`[Bot] Failed to suspend ptero server ${server.id}:`, err);
                        }
                    }

                    // DB Update
                    await prisma.server.update({
                        where: { id: server.id },
                        data: {
                            isSuspended: true,
                            suspendedAt: new Date(),
                            suspendedBy: 'System (Discord Enforcement)',
                            suspendReason: 'User left Discord server',
                            status: 'suspended'
                        }
                    });

                    // Log Webhook
                    sendServerSuspendedWebhook({
                        username: user.username,
                        serverName: server.name,
                        reason: 'User left Discord server'
                    }).catch(console.error);

                    // Send Real-time Notification
                    const { sendUserNotification } = await import('./websocket');
                    sendUserNotification(user.id, 'Server Suspended', `Server "${server.name}" suspended because you left our Discord server.`, 'error');
                }

            } catch (error) {
                console.error('[Bot] GuildMemberRemove Error:', error);
            }
        });

        await client.login(discordBot.token);

    } catch (error) {
        console.error('❌ Failed to start Discord bot:', error);
    }
}

// STOP & STATUS
export function stopDiscordBot() { if (client) { client.destroy(); client = null; } }
export function getBotStatus() { return { running: client !== null && client.isReady(), user: client?.user?.tag || null }; }
