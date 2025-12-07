import mongoose from 'mongoose';
import { ENV } from './env';

export const connectDB = async () => {
    try {
        const mongooseOptions = {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(ENV.MONGODB_URI, mongooseOptions);
        console.log('✅ MongoDB Connected Successfully');
        console.log('📍 Database:', ENV.MONGODB_URI.includes('localhost') ? 'Local' : 'MongoDB Atlas');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        console.log('⚠️  Starting without database - API will have limited functionality!');
        // Don't crash - let the app run for demo purposes
    }
};
