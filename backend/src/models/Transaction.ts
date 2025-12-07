import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'credit' | 'debit';
    amount: number;
    description: string;  // Changed from 'reason'
    balanceAfter: number;
    metadata?: any;
}

const TransactionSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    balanceAfter: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
