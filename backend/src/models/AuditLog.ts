import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    actorId?: mongoose.Types.ObjectId; // User who performed the action, null if system
    action: string;
    details: string;
    ipAddress?: string;
}

const AuditLogSchema: Schema = new Schema({
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String, required: true },
    ipAddress: { type: String }
}, { timestamps: true });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
