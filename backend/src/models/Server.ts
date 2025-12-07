import mongoose, { Schema, Document } from 'mongoose';

export interface IServer extends Document {
    ownerId: mongoose.Types.ObjectId;
    pteroServerId: number;
    pteroIdentifier: string;
    planId: mongoose.Types.ObjectId;
    name: string;
    status: 'installing' | 'active' | 'suspended' | 'deleted';
    ramMb: number;
    diskMb: number;
    cpuCores: number;
    isSuspended: boolean;
    suspendedAt?: Date;
    suspendedBy?: mongoose.Types.ObjectId;
    expiresAt?: Date;
    serverIp?: string;
    createdAt: Date;
}

const ServerSchema: Schema = new Schema({
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pteroServerId: { type: Number, required: true },
    pteroIdentifier: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['installing', 'active', 'suspended', 'deleted'], default: 'installing' },
    ramMb: { type: Number, required: true },
    diskMb: { type: Number, required: true },
    cpuCores: { type: Number, required: true },
    isSuspended: { type: Boolean, default: false },
    suspendedAt: { type: Date },
    suspendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date },
    serverIp: { type: String }
}, { timestamps: true });

export default mongoose.model<IServer>('Server', ServerSchema);
