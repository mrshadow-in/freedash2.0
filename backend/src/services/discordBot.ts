import { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes, Guild, EmbedBuilder } from 'discord.js';
import { prisma } from '../prisma';

let client: Client | null = null;
let inviteCache = new Map<string, Map<string, number>>();

const linkCodes = new Map<string, string>();
let triviaActive = false;
let currentTriviaAnswer: string | null = null;

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

// Register Slash Commands
async function registerCommands(token: string, clientId: string, guildId: string) {
    const commands = [
        new SlashCommandBuilder().setName('invite-code').setDescription('Claim your invite reward code'),
        new SlashCommandBuilder().setName('boost-reward').setDescription('Claim your boost reward'),
        new SlashCommandBuilder().setName('my-invites').setDescription('Check your invite count'),
        new SlashCommandBuilder().setName('leaderboard').setDescription('View invite leaderboard'),
        new SlashCommandBuilder().setName('link').setDescription('Link your Discord account to the panel'),
        new SlashCommandBuilder().setName('daily').setDescription('Claim your daily coin reward'),
        new SlashCommandBuilder().setName('task').setDescription('Start a random chat task for coins'),
        new SlashCommandBuilder().setName('task-reward').setDescription('Claim reward for your completed chat task'),
        new SlashCommandBuilder().setName('trivia').setDescription('Start a trivia round (Admin Only)'),
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
        const guildInvites = new Map<string, number>();
        invites.forEach(invite => {
            if (invite.inviter) {
                const current = guildInvites.get(invite.inviter.id) || 0;
                guildInvites.set(invite.inviter.id, current + (invite.uses || 0));
            }
        });
        inviteCache.set(guild.id, guildInvites);
    } catch (e) { }
}

async function getUserInvites(guild: Guild, userId: string): Promise<number> {
    try {
        const invites = await guild.invites.fetch();
        let total = 0;
        invites.forEach(invite => {
            if (invite.inviter?.id === userId) total += invite.uses || 0;
        });
        return total;
    } catch (e) { return 0; }
}

async function createRewardCode(coins: number, prefix: string): Promise<string> {
    const code = generateCode(prefix);
    await prisma.redeemCode.create({
        data: { code, amount: coins, maxUses: 1, usedCount: 0 }
    });
    return code;
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
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        client.once(Events.ClientReady, async (c) => {
            console.log(`🤖 Discord bot logged in as ${c.user.tag}`);
            try {
                const guild = c.guilds.cache.get(discordBot.guildId);
                if (guild) {
                    await cacheInvites(guild);
                    await registerCommands(discordBot.token, c.user.id, discordBot.guildId);
                }
            } catch (error) {
                console.error('Failed to init guild cache:', error);
            }
        });

        // Member Add
        client.on(Events.GuildMemberAdd, async (member) => {
            try {
                const oldInvites = inviteCache.get(member.guild.id) || new Map();
                const newInvites = await member.guild.invites.fetch();
                let inviter: string | null = null;
                newInvites.forEach(invite => {
                    if (invite.inviter) {
                        const oldUses = oldInvites.get(invite.inviter.id) || 0;
                        if ((invite.uses || 0) > oldUses) inviter = invite.inviter.id;
                    }
                });
                await cacheInvites(member.guild);
            } catch (e) { }
        });

        // Message Handling (Tasks, Bumps, Trivia)
        client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) {
                // Disboard Bump Check
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
                                const code = await createRewardCode(50, 'BUMP');
                                await message.channel.send(`🎉 <@${userId}> earned **50 coins**! Code: \`${code}\``);
                            }
                        }
                    }
                }
                return;
            }

            // Trivia
            if (triviaActive && currentTriviaAnswer && message.content.toLowerCase().includes(currentTriviaAnswer.toLowerCase())) {
                triviaActive = false;
                currentTriviaAnswer = null;
                const reward = 25;
                const user = await prisma.user.findUnique({ where: { discordId: message.author.id } });
                if (user) {
                    await prisma.user.update({ where: { id: user.id }, data: { coins: { increment: reward } } });
                    await message.reply(`🎉 Correct! Earned **${reward} coins**!`);
                } else {
                    const code = await createRewardCode(reward, 'TRIVIA');
                    await message.reply(`🎉 Correct! Code: \`${code}\``);
                }
                return;
            }

            // Chat Tasks
            try {
                const activeTask = await prisma.discordChatTask.findUnique({ where: { discordId: message.author.id } });
                if (activeTask && activeTask.currentMessages < activeTask.targetMessages) {
                    await prisma.discordChatTask.update({
                        where: { id: activeTask.id },
                        data: { currentMessages: { increment: 1 } }
                    });
                }
            } catch (e) {
                console.error('Chat task update error:', e);
            }
        });

        // Voice Farming
        client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            const userId = newState.member?.id;
            if (!userId || newState.member?.user.bot) return;

            // Joined Voice
            if (!oldState.channelId && newState.channelId) {
                await prisma.discordVoiceSession.upsert({
                    where: { discordId: userId },
                    update: { joinedAt: new Date() },
                    create: { discordId: userId, joinedAt: new Date() }
                });
            }
            // Left Voice
            else if (oldState.channelId && !newState.channelId) {
                const session = await prisma.discordVoiceSession.findUnique({ where: { discordId: userId } });
                if (session) {
                    const now = new Date();
                    const diffMs = now.getTime() - session.joinedAt.getTime();
                    const minutes = Math.floor(diffMs / 60000);

                    if (minutes >= 10) {
                        const coinsEarned = Math.floor(minutes / 10) * 10;
                        if (coinsEarned > 0) {
                            const user = await prisma.user.findUnique({ where: { discordId: userId } });
                            if (user) {
                                await prisma.user.update({
                                    where: { id: user.id },
                                    data: { coins: { increment: coinsEarned } }
                                });
                            }
                        }
                    }
                    // Always delete session on leave
                    await prisma.discordVoiceSession.delete({ where: { discordId: userId } }).catch(() => { });
                }
            }
        });

        // Interactions - Using deferReply for everything to prevent timeouts!
        client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            try {
                // /link
                if (interaction.commandName === 'link') {
                    await interaction.deferReply({ ephemeral: true });
                    const code = generateCode('LINK');
                    linkCodes.set(code, interaction.user.id);
                    setTimeout(() => linkCodes.delete(code), 300000);

                    await interaction.editReply({
                        content: `🔐 **Link Account Code**\nCode: \`${code}\`\nEnter this in your Dashboard > Account.\n*Expires in 5 mins.*`
                    });
                }

                // /daily
                else if (interaction.commandName === 'daily') {
                    await interaction.deferReply();
                    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });

                    if (!user) {
                        await interaction.editReply({ content: '❌ Not linked! Use `/link` first.' });
                        return;
                    }

                    const lastDaily = await prisma.transaction.findFirst({
                        where: {
                            userId: user.id,
                            description: 'Daily Discord Reward',
                            createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                        }
                    });

                    if (lastDaily) {
                        await interaction.editReply({ content: '⏳ Already claimed today. Come back tomorrow!' });
                        return;
                    }

                    const amount = 50;
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { coins: { increment: amount } }
                    });
                    await prisma.transaction.create({
                        data: {
                            userId: user.id,
                            type: 'credit',
                            amount,
                            description: 'Daily Discord Reward',
                            balanceAfter: user.coins + amount
                        }
                    });

                    await interaction.editReply(`💰 Claimed **${amount} coins**!`);
                }

                // /task
                else if (interaction.commandName === 'task') {
                    await interaction.deferReply();
                    const existing = await prisma.discordChatTask.findUnique({ where: { discordId: interaction.user.id } });

                    if (existing) {
                        await interaction.editReply({
                            content: `⚠️ Active task exists!\nTarget: **${existing.currentMessages}/${existing.targetMessages}** messages.`
                        });
                        return;
                    }

                    const target = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
                    const reward = Math.floor(Math.random() * (300 - 50 + 1)) + 50;

                    await prisma.discordChatTask.create({
                        data: {
                            discordId: interaction.user.id,
                            targetMessages: target,
                            rewardAmount: reward
                        }
                    });

                    await interaction.editReply(`📝 **Task Started!**\nSend **${target}** messages to earn **${reward} coins**!\nCheck progress: \`/task-reward\``);
                }

                // /task-reward
                else if (interaction.commandName === 'task-reward') {
                    await interaction.deferReply();
                    const task = await prisma.discordChatTask.findUnique({ where: { discordId: interaction.user.id } });

                    if (!task) {
                        await interaction.editReply({ content: '❌ No active task. Start with `/task`.' });
                        return;
                    }

                    if (task.currentMessages >= task.targetMessages) {
                        const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
                        if (user) {
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { coins: { increment: task.rewardAmount } }
                            });
                            await prisma.discordChatTask.delete({ where: { id: task.id } });
                            await interaction.editReply(`🎉 Task Complete! **${task.rewardAmount} coins** added!`);
                        } else {
                            const code = await createRewardCode(task.rewardAmount, 'TASK');
                            await prisma.discordChatTask.delete({ where: { id: task.id } });
                            await interaction.editReply(`🎉 Task Complete! Code: \`${code}\` (${task.rewardAmount} coins).`);
                        }
                    } else {
                        await interaction.editReply({
                            content: `📊 Progress: **${task.currentMessages}/${task.targetMessages}** messages.`
                        });
                    }
                }

                // /trivia
                else if (interaction.commandName === 'trivia') {
                    await interaction.deferReply();
                    if (!interaction.memberPermissions?.has('Administrator')) {
                        await interaction.editReply({ content: '❌ Admin only.' });
                        return;
                    }

                    const questions = [
                        { q: "Max RAM of free server?", a: "Variable" },
                        { q: "Bot language?", a: "TypeScript" },
                        { q: "Database used?", a: "PostgreSQL" },
                    ];
                    const q = questions[Math.floor(Math.random() * questions.length)];

                    triviaActive = true;
                    currentTriviaAnswer = q.a;
                    await interaction.editReply(`🧠 **TRIVIA!**\nFirst correct answer wins **25 coins**!\n\nQuestion: **${q.q}**`);
                }

            } catch (err) {
                console.error('Interaction error:', err);
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.editReply({ content: '❌ An error occurred.' });
                    } else {
                        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
                    }
                } catch (e) { }
            }
        });

        await client.login(discordBot.token);

    } catch (error) {
        console.error('❌ Failed to start Discord bot:', error);
    }
}

export function stopDiscordBot() {
    if (client) {
        client.destroy();
        client = null;
        console.log('🛑 Discord bot stopped');
    }
}

export function getBotStatus() {
    return {
        running: client !== null && client.isReady(),
        user: client?.user?.tag || null
    };
}
