import mongoose, { Schema, Document } from 'mongoose';

export interface IRedeemCode extends Document {
    code: string;
    amount: number;  // Changed from amountCoins
    maxUses: number | null;  // Changed from usesAllowed
    usedCount: number;  // Changed from usesDone
    expiresAt?: Date | null;
}

const RedeemCodeSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    maxUses: { type: Number, default: null },  // null = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model<IRedeemCode>('RedeemCode', RedeemCodeSchema);
