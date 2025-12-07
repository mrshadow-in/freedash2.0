import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password_hash: string;
    username: string;
    coins: number;
    role: 'user' | 'mod' | 'admin';
    discordId?: string;
    pteroUserId?: number;
    isBanned: boolean;
    bannedAt?: Date;
    bannedBy?: mongoose.Types.ObjectId;
    preferences?: {
        theme?: 'light' | 'dark';
        language?: string;
        sounds?: boolean;
    };
    createdAt: Date;
    lastActiveAt: Date;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    coins: { type: Number, default: 0, min: 0 },
    role: { type: String, enum: ['user', 'mod', 'admin'], default: 'user' },
    discordId: { type: String, unique: true, sparse: true },
    pteroUserId: { type: Number },
    isBanned: { type: Boolean, default: false },
    bannedAt: { type: Date },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    preferences: {
        theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
        language: { type: String, default: 'en' },
        sounds: { type: Boolean, default: true }
    },
    lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
