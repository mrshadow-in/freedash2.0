import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordReset extends Document {
    userId: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}

const PasswordResetSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
