import mongoose, { Schema, Document } from 'mongoose';

export interface IAFKSession extends Document {
    userId: mongoose.Types.ObjectId;
    startedAt: Date;
    lastHeartbeat: Date;
    coinsEarned: number;
    isActive: boolean;
    dailyCoinsEarned: number;
    lastResetDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AFKSessionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    startedAt: { type: Date, required: true },
    lastHeartbeat: { type: Date, required: true },
    coinsEarned: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    dailyCoinsEarned: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IAFKSession>('AFKSession', AFKSessionSchema);
