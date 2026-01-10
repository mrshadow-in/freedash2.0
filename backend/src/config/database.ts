import { prisma } from '../prisma';

export const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('✅ PostgreSQL Connected Successfully (via Prisma)');
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};
