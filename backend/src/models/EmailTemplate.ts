import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    variables: string[];
    createdAt: Date;
    updatedAt: Date;
}

const EmailTemplateSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ['welcome', 'password_reset', 'server_deployed', 'account_verification']
    },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    textBody: { type: String, required: true },
    variables: { type: [String], default: [] }
}, { timestamps: true });

export default mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
