import mongoose, { Schema, Document } from 'mongoose';

export interface IInviteClaim extends Document {
    discordUserId: string;
    invitesRequired: number;
    code: string;
    createdAt: Date;
}

const InviteClaimSchema: Schema = new Schema({
    discordUserId: { type: String, required: true },
    invitesRequired: { type: Number, required: true },
    code: { type: String, required: true },
}, { timestamps: true });

InviteClaimSchema.index({ discordUserId: 1, invitesRequired: 1 }, { unique: true });

export default mongoose.model<IInviteClaim>('InviteClaim', InviteClaimSchema);
