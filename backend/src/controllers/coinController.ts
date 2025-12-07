import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import RedeemCode from '../models/RedeemCode';
import User from '../models/User';
import Transaction from '../models/Transaction';

export const redeemCode = async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { code } = req.body;
        const userId = req.user!.userId;

        // 1. Find Code with pessimistic write lock (if simple update not enough)
        // Mongoose doesn't support select...for update easily but we can use atomic $inc and check result.
        // However, we need to check if user already redeemed? The Schema for RedeemCode tracks total uses, not PER USER.
        // If we want PER USER once, we need logic for that. The prompt says "maxUses, usedCount".
        // Usually, we also track "who redeemed" to prevent double redeem.
        // I will add a check using Transaction history or a new collection 'Redemptions'.
        // For simplicity, I'll check Transaction history for type 'redeem' and metadata.code === code.

        const redeemCodeDoc = await RedeemCode.findOne({ code }).session(session);
        if (!redeemCodeDoc) throw new Error('Invalid code');

        if (redeemCodeDoc.maxUses !== null && redeemCodeDoc.usedCount >= redeemCodeDoc.maxUses) throw new Error('Code fully claimed');
        if (redeemCodeDoc.expiresAt && redeemCodeDoc.expiresAt < new Date()) throw new Error('Code expired');

        // Check if user already redeemed
        const existingTx = await Transaction.findOne({
            userId,
            type: 'credit',
            'metadata.code': code
        }).session(session);

        if (existingTx) throw new Error('You already claimed this code');

        // Update Code usage
        redeemCodeDoc.usedCount += 1;
        await redeemCodeDoc.save({ session });

        // Update User Balance and get updated user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $inc: { coins: redeemCodeDoc.amount }
            },
            { new: true, session }
        );

        if (!updatedUser) throw new Error('User not found');

        // Record Transaction with balanceAfter
        await Transaction.create([{
            userId,
            type: 'credit',
            amount: redeemCodeDoc.amount,
            description: `Redeemed code ${code}`,
            balanceAfter: updatedUser.coins,
            metadata: { code }
        }], { session });

        await session.commitTransaction();
        res.json({ message: 'Code redeemed', added: redeemCodeDoc.amount });

    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};
