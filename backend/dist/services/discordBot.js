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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDiscordBot = startDiscordBot;
exports.stopDiscordBot = stopDiscordBot;
exports.getBotStatus = getBotStatus;
const discord_js_1 = require("discord.js");
const prisma_1 = require("../prisma");
let client = null;
let inviteCache = new Map(); // guildId -> (inviterId -> uses)
// Generate random code
const generateCode = (prefix = 'REWARD') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${result}`;
};
// Register slash commands
async function registerCommands(token, clientId, guildId) {
    const commands = [
        new discord_js_1.SlashCommandBuilder()
            .setName('invite-code')
            .setDescription('Claim your invite reward code'),
        new discord_js_1.SlashCommandBuilder()
            .setName('boost-reward')
            .setDescription('Claim your boost reward'),
        new discord_js_1.SlashCommandBuilder()
            .setName('my-invites')
            .setDescription('Check your invite count'),
        new discord_js_1.SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('View invite leaderboard'),
    ].map(cmd => cmd.toJSON());
    const rest = new discord_js_1.REST({ version: '10' }).setToken(token);
    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(discord_js_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('✅ Slash commands registered!');
    }
    catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
}
// Cache invites for a guild
async function cacheInvites(guild) {
    try {
        const invites = await guild.invites.fetch();
        const guildInvites = new Map();
        invites.forEach(invite => {
            if (invite.inviter) {
                const current = guildInvites.get(invite.inviter.id) || 0;
                guildInvites.set(invite.inviter.id, current + (invite.uses || 0));
            }
        });
        inviteCache.set(guild.id, guildInvites);
        console.log(`📊 Cached ${invites.size} invites for ${guild.name}`);
    }
    catch (error) {
        console.error(`Failed to cache invites for ${guild.name}:`, error);
    }
}
// Get user's total invites
async function getUserInvites(guild, userId) {
    try {
        const invites = await guild.invites.fetch();
        let total = 0;
        invites.forEach(invite => {
            if (invite.inviter?.id === userId) {
                total += invite.uses || 0;
            }
        });
        return total;
    }
    catch (error) {
        console.error('Error fetching invites:', error);
        return 0;
    }
}
// Create reward code in database
async function createRewardCode(coins, prefix) {
    const code = generateCode(prefix);
    await prisma_1.prisma.redeemCode.create({
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
async function startDiscordBot() {
    try {
        const { getSettings } = await Promise.resolve().then(() => __importStar(require('./settingsService')));
        const settings = await getSettings();
        const discordBot = settings?.discordBot;
        const token = settings?.discordBot?.token;
        if (!discordBot?.enabled || !discordBot?.token || !discordBot?.guildId) {
            console.log('⚠️ Discord bot is disabled or not configured');
            return;
        }
        if (client) {
            console.log('🔄 Restarting Discord bot...');
            client.destroy();
        }
        client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMembers,
                discord_js_1.GatewayIntentBits.GuildInvites,
                discord_js_1.GatewayIntentBits.GuildMessages,
            ]
        });
        // Ready event
        client.once(discord_js_1.Events.ClientReady, async (c) => {
            console.log(`🤖 Discord bot logged in as ${c.user.tag}`);
            // Cache invites
            const guild = c.guilds.cache.get(discordBot.guildId);
            if (guild) {
                await cacheInvites(guild);
                // Register commands
                await registerCommands(discordBot.token, c.user.id, discordBot.guildId);
            }
        });
        // Member join - track invites
        client.on(discord_js_1.Events.GuildMemberAdd, async (member) => {
            try {
                const settings = await prisma_1.prisma.settings.findFirst();
                const discordBot = settings?.discordBot;
                if (!discordBot?.guildId)
                    return;
                const oldInvites = inviteCache.get(member.guild.id) || new Map();
                const newInvites = await member.guild.invites.fetch();
                // Find who invited
                let inviter = null;
                newInvites.forEach(invite => {
                    if (invite.inviter) {
                        const oldUses = oldInvites.get(invite.inviter.id) || 0;
                        const currentInviterTotal = Array.from(newInvites.values())
                            .filter(i => i.inviter?.id === invite.inviter.id)
                            .reduce((sum, i) => sum + (i.uses || 0), 0);
                        if (currentInviterTotal > oldUses) {
                            inviter = invite.inviter.id;
                        }
                    }
                });
                // Update cache
                await cacheInvites(member.guild);
                // Send message if channel is configured (optional - don't fail if no permission)
                if (discordBot?.inviteChannelId && inviter) {
                    try {
                        const channel = member.guild.channels.cache.get(discordBot.inviteChannelId);
                        if (channel?.isTextBased()) {
                            const inviteCount = await getUserInvites(member.guild, inviter);
                            const embed = new discord_js_1.EmbedBuilder()
                                .setColor(0x7c3aed)
                                .setTitle('👋 New Member!')
                                .setDescription(`${member.user.tag} joined the server!`)
                                .addFields({ name: 'Invited by', value: `<@${inviter}>`, inline: true }, { name: 'Total Invites', value: `${inviteCount}`, inline: true })
                                .setTimestamp();
                            await channel.send({ embeds: [embed] }).catch(() => {
                                console.log('⚠️ Could not send to invite channel (missing permission)');
                            });
                        }
                    }
                    catch (e) {
                        console.log('⚠️ Invite channel message failed:', e.message);
                    }
                }
            }
            catch (error) {
                console.error('Error tracking invite:', error);
            }
        });
        // Boost event
        client.on(discord_js_1.Events.GuildMemberUpdate, async (oldMember, newMember) => {
            try {
                const settings = await prisma_1.prisma.settings.findFirst();
                const discordBot = settings?.discordBot;
                if (!discordBot?.guildId)
                    return;
                // Check if user started boosting
                const wasBoosting = oldMember.premiumSince !== null;
                const isBoosting = newMember.premiumSince !== null;
                if (!wasBoosting && isBoosting) {
                    console.log(`🚀 ${newMember.user.tag} started boosting!`);
                    // Send message if channel is configured
                    if (discordBot?.boostChannelId) {
                        try {
                            const channel = newMember.guild.channels.cache.get(discordBot.boostChannelId);
                            if (channel?.isTextBased()) {
                                const embed = new discord_js_1.EmbedBuilder()
                                    .setColor(0xf47fff)
                                    .setTitle('🚀 New Server Boost!')
                                    .setDescription(`${newMember.user.tag} just boosted the server!`)
                                    .addFields({ name: 'Claim Reward', value: 'Use `/boost-reward` to claim your coins!', inline: false })
                                    .setTimestamp();
                                await channel.send({ embeds: [embed] }).catch(() => {
                                    console.log('⚠️ Could not send to boost channel (missing permission)');
                                });
                            }
                        }
                        catch (e) {
                            console.log('⚠️ Boost channel message failed:', e.message);
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error tracking boost:', error);
            }
        });
        // Slash commands
        client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            const settings = await prisma_1.prisma.settings.findFirst();
            if (!settings)
                return;
            const inviteRewards = settings.inviteRewards || [];
            const boostRewards = settings.boostRewards || [];
            // /invite-code command
            if (interaction.commandName === 'invite-code') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const guild = interaction.guild;
                    if (!guild) {
                        await interaction.editReply('❌ This command must be used in a server.');
                        return;
                    }
                    const inviteCount = await getUserInvites(guild, interaction.user.id);
                    if (!inviteRewards || inviteRewards.length === 0) {
                        await interaction.editReply('❌ No invite rewards are configured.');
                        return;
                    }
                    // Find eligible reward
                    const sortedRewards = inviteRewards.sort((a, b) => b.invites - a.invites);
                    let eligibleReward = null;
                    for (const reward of sortedRewards) {
                        if (inviteCount >= reward.invites) {
                            // Check constraint composite
                            const existingClaim = await prisma_1.prisma.inviteClaim.findUnique({
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
                        const nextReward = sortedRewards
                            .filter((r) => r.invites > inviteCount)
                            .sort((a, b) => a.invites - b.invites)[0];
                        if (nextReward) {
                            await interaction.editReply(`📊 You have **${inviteCount}** invites.\n` +
                                `🎯 Next reward at **${nextReward.invites}** invites (${nextReward.coins} coins)\n` +
                                `⏳ You need **${nextReward.invites - inviteCount}** more invites!`);
                        }
                        else {
                            await interaction.editReply(`✅ You've claimed all available rewards! You have **${inviteCount}** invites.`);
                        }
                        return;
                    }
                    // Create code and claim
                    const code = await createRewardCode(eligibleReward.coins, 'INV');
                    await prisma_1.prisma.inviteClaim.create({
                        data: {
                            discordUserId: interaction.user.id,
                            invitesRequired: eligibleReward.invites,
                            code
                        }
                    });
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle('🎉 Invite Reward Claimed!')
                        .setDescription(`You've earned a reward for **${eligibleReward.invites}** invites!`)
                        .addFields({ name: '🎁 Your Code', value: `\`${code}\``, inline: false }, { name: '💰 Coins', value: `${eligibleReward.coins}`, inline: true }, { name: '📊 Total Invites', value: `${inviteCount}`, inline: true })
                        .setFooter({ text: 'Redeem this code on the dashboard!' })
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });
                }
                catch (error) {
                    console.error('Error in invite-code command:', error);
                    await interaction.editReply('❌ An error occurred. Please try again later.');
                }
            }
            // /boost-reward command
            if (interaction.commandName === 'boost-reward') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const member = interaction.member;
                    if (!member.premiumSince) {
                        await interaction.editReply('❌ You need to be a server booster to claim this reward!');
                        return;
                    }
                    if (!boostRewards || boostRewards.length === 0) {
                        await interaction.editReply('❌ No boost rewards are configured.');
                        return;
                    }
                    // For boost, we give the first tier (1 boost = 1 claim)
                    const boostReward = boostRewards.find((r) => r.boosts === 1);
                    if (!boostReward) {
                        await interaction.editReply('❌ No boost reward available.');
                        return;
                    }
                    // Check if already claimed
                    // Assuming invitesRequired = -1 for boosts
                    const existingClaim = await prisma_1.prisma.inviteClaim.findUnique({
                        where: {
                            discordUserId_invitesRequired: {
                                discordUserId: interaction.user.id,
                                invitesRequired: -1
                            }
                        }
                    });
                    if (existingClaim) {
                        await interaction.editReply('✅ You have already claimed your boost reward!');
                        return;
                    }
                    // Create code and save claim
                    const code = await createRewardCode(boostReward.coins, 'BOOST');
                    await prisma_1.prisma.inviteClaim.create({
                        data: {
                            discordUserId: interaction.user.id,
                            invitesRequired: -1,
                            code
                        }
                    });
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0xf47fff)
                        .setTitle('🚀 Boost Reward Claimed!')
                        .setDescription('Thank you for boosting the server!')
                        .addFields({ name: '🎁 Your Code', value: `\`${code}\``, inline: false }, { name: '💰 Coins', value: `${boostReward.coins}`, inline: true })
                        .setFooter({ text: 'Redeem this code on the dashboard!' })
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });
                }
                catch (error) {
                    console.error('Error in boost-reward command:', error);
                    await interaction.editReply('❌ An error occurred. Please try again later.');
                }
            }
            // /my-invites command
            if (interaction.commandName === 'my-invites') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const guild = interaction.guild;
                    if (!guild) {
                        await interaction.editReply('❌ This command must be used in a server.');
                        return;
                    }
                    const inviteCount = await getUserInvites(guild, interaction.user.id);
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0x7c3aed)
                        .setTitle('📊 Your Invites')
                        .setDescription(`You have **${inviteCount}** total invites!`)
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });
                }
                catch (error) {
                    console.error('Error in my-invites command:', error);
                    await interaction.editReply('❌ An error occurred.');
                }
            }
            // /leaderboard command
            if (interaction.commandName === 'leaderboard') {
                await interaction.deferReply();
                try {
                    const guild = interaction.guild;
                    if (!guild) {
                        await interaction.editReply('❌ This command must be used in a server.');
                        return;
                    }
                    const invites = await guild.invites.fetch();
                    const inviteMap = new Map();
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
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0xffd700)
                        .setTitle('🏆 Invite Leaderboard')
                        .setDescription(description || 'No invites yet!')
                        .setTimestamp();
                    await interaction.editReply({ embeds: [embed] });
                }
                catch (error) {
                    console.error('Error in leaderboard command:', error);
                    await interaction.editReply('❌ An error occurred.');
                }
            }
        });
        // Login
        await client.login(discordBot.token);
    }
    catch (error) {
        console.error('❌ Failed to start Discord bot:', error);
    }
}
// Stop Discord Bot
function stopDiscordBot() {
    if (client) {
        client.destroy();
        client = null;
        console.log('🛑 Discord bot stopped');
    }
}
// Get bot status
function getBotStatus() {
    return {
        running: client !== null && client.isReady(),
        user: client?.user?.tag || null
    };
}
