"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const prisma_1 = require("../prisma");
const connectDB = async () => {
    try {
        await prisma_1.prisma.$connect();
        console.log('✅ PostgreSQL Connected Successfully (via Prisma)');
    }
    catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
