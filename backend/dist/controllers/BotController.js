"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRewardTiers = exports.claimInviteReward = void 0;
const Settings_1 = __importDefault(require("../models/Settings"));
const InviteClaim_1 = __importDefault(require("../models/InviteClaim"));
const RedeemCode_1 = __importDefault(require("../models/RedeemCode"));
const generateCode = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
const claimInviteReward = async (req, res) => {
    try {
        const { discordId, inviteCount } = req.body;
        if (!discordId || typeof inviteCount !== 'number') {
            return res.status(400).json({ message: 'Missing discordId or inviteCount' });
        }
        const settings = await Settings_1.default.findOne();
        if (!settings || !settings.inviteRewards || settings.inviteRewards.length === 0) {
            return res.status(404).json({ message: 'No invite rewards configured' });
        }
        // Sort rewards descending by invites required
        const sortedRewards = settings.inviteRewards.sort((a, b) => b.invites - a.invites);
        let eligibleReward = null;
        // Find the highest tier that is met AND not yet claimed
        for (const reward of sortedRewards) {
            if (inviteCount >= reward.invites) {
                const existingClaim = await InviteClaim_1.default.findOne({
                    discordUserId: discordId,
                    invitesRequired: reward.invites
                });
                if (!existingClaim) {
                    eligibleReward = reward;
                    break;
                }
            }
        }
        if (!eligibleReward) {
            return res.status(400).json({ message: 'No new rewards available for this invite count' });
        }
        // Generate unique code
        const codeString = `INV-${discordId.substring(0, 4)}-${generateCode(6)}`;
        const newCode = new RedeemCode_1.default({
            code: codeString,
            amount: eligibleReward.coins,
            maxUses: 1,
            usedCount: 0
        });
        await newCode.save();
        const claim = new InviteClaim_1.default({
            discordUserId: discordId,
            invitesRequired: eligibleReward.invites,
            code: codeString
        });
        await claim.save();
        res.json({
            success: true,
            code: codeString,
            amount: eligibleReward.coins,
            tierInvites: eligibleReward.invites,
            message: `Reward claimed for ${eligibleReward.invites} invites!`
        });
    }
    catch (error) {
        console.error('Claim Reward Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.claimInviteReward = claimInviteReward;
const getRewardTiers = async (req, res) => {
    const settings = await Settings_1.default.findOne();
    res.json(settings?.inviteRewards || []);
};
exports.getRewardTiers = getRewardTiers;
