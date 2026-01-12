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
exports.getTransactionHistory = exports.redeemCode = void 0;
const prisma_1 = require("../prisma");
const redeemCode = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.userId;
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // 1. Find Code
            // Note: pessimistic locks are harder in Prisma without raw queries or select for update support in some providers.
            // But we can check constraints.
            const redeemCodeDoc = await tx.redeemCode.findFirst({
                where: { code }
            });
            if (!redeemCodeDoc)
                throw new Error('Invalid code');
            if (redeemCodeDoc.maxUses !== null && redeemCodeDoc.usedCount >= redeemCodeDoc.maxUses) {
                throw new Error('Code fully claimed');
            }
            if (redeemCodeDoc.expiresAt && redeemCodeDoc.expiresAt < new Date()) {
                throw new Error('Code expired');
            }
            // Check if user already redeemed
            const existingTx = await tx.transaction.findFirst({
                where: {
                    userId,
                    type: 'credit',
                    metadata: {
                        path: ['code'],
                        equals: code
                    }
                }
            });
            // Note: Filtering JSON in Prisma depends on underlying DB. Postgres supports it.
            // If Json filtering is tricky, we can fetch recently or use a separate Claim model if needed.
            // But let's assume the JSON filter works for Postgres `metadata->>'code'`.
            // Alternative: Fetch all transactions for this user w/ 'credit' and check in memory if volume is low.
            // Or use `string_contains` if metadata is stored as string... but it's Json.
            // If explicit JSON helper not available, use raw query or just fetch latest.
            // Check if the user has a transaction with description containing the code?
            // Or better: Implement a `Redemption` table?
            // For now, I will try to use the `equals` filter on Json if supported or just check description if consistent.
            // Description was `Redeemed code ${code}`.
            const existingTxByDesc = await tx.transaction.findFirst({
                where: {
                    userId,
                    type: 'credit',
                    description: `Redeemed code ${code}`
                }
            });
            if (existingTxByDesc)
                throw new Error('You already claimed this code');
            // Update Code usage
            await tx.redeemCode.update({
                where: { id: redeemCodeDoc.id },
                data: { usedCount: { increment: 1 } }
            });
            // Update User Balance
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: { coins: { increment: redeemCodeDoc.amount } }
            });
            // Record Transaction
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'credit',
                    amount: redeemCodeDoc.amount,
                    description: `Redeemed code ${code}`,
                    balanceAfter: updatedUser.coins,
                    metadata: { code }
                }
            });
            return redeemCodeDoc.amount;
        });
        // Send Real-time Notification
        const { sendUserNotification } = await Promise.resolve().then(() => __importStar(require('../services/websocket')));
        sendUserNotification(userId, 'Code Redeemed', `You successfully redeemed code "${code}" for ${result} coins.`, 'success');
        res.json({ message: 'Code redeemed', added: result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.redeemCode = redeemCode;
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const transactions = await prisma_1.prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch transaction history' });
    }
};
exports.getTransactionHistory = getTransactionHistory;
