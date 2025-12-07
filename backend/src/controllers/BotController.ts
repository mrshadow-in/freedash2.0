import { Request, Response } from 'express';
import Settings from '../models/Settings';
import InviteClaim from '../models/InviteClaim';
import RedeemCode from '../models/RedeemCode';

const generateCode = (length: number = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const claimInviteReward = async (req: Request, res: Response) => {
    try {
        const { discordId, inviteCount } = req.body;

        if (!discordId || typeof inviteCount !== 'number') {
            return res.status(400).json({ message: 'Missing discordId or inviteCount' });
        }

        const settings = await Settings.findOne();
        if (!settings || !settings.inviteRewards || settings.inviteRewards.length === 0) {
            return res.status(404).json({ message: 'No invite rewards configured' });
        }

        // Sort rewards descending by invites required
        const sortedRewards = settings.inviteRewards.sort((a, b) => b.invites - a.invites);

        let eligibleReward = null;

        // Find the highest tier that is met AND not yet claimed
        for (const reward of sortedRewards) {
            if (inviteCount >= reward.invites) {
                const existingClaim = await InviteClaim.findOne({
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

        const newCode = new RedeemCode({
            code: codeString,
            amount: eligibleReward.coins,
            maxUses: 1,
            usedCount: 0
        });
        await newCode.save();

        const claim = new InviteClaim({
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

    } catch (error) {
        console.error('Claim Reward Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getRewardTiers = async (req: Request, res: Response) => {
    const settings = await Settings.findOne();
    res.json(settings?.inviteRewards || []);
};
