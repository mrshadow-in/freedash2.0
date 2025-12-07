import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
    name: string;
    ramMb: number;
    diskMb: number;
    cpuPercent: number;
    cpuCores: number;
    slots: number;
    priceCoins: number;
    pteroEggId: number;
    pteroNestId: number;
    eggImage?: string; // Custom image URL for server card
    createdAt: Date;
    updatedAt: Date;
}

const PlanSchema: Schema = new Schema({
    name: { type: String, required: true },
    ramMb: { type: Number, required: true },
    diskMb: { type: Number, required: true },
    cpuPercent: { type: Number, required: true },
    cpuCores: { type: Number, required: true, default: 1 },
    slots: { type: Number, required: true },
    priceCoins: { type: Number, required: true },
    pteroEggId: { type: Number, required: true },
    pteroNestId: { type: Number, required: true },
    eggImage: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model<IPlan>('Plan', PlanSchema);

