import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
    userId: mongoose.Types.ObjectId;
    type: string; // e.g., 'visit_link', 'watch_video'
    status: 'pending' | 'completed' | 'failed';
    rewardCoins: number;
    metadata?: any;
    completedAt?: Date;
    createdAt: Date;
}

const TaskSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    rewardCoins: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed },
    completedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model<ITask>('Task', TaskSchema);
