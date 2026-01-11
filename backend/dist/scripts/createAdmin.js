"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const readline_1 = __importDefault(require("readline"));
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (query) => {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
};
const createAdmin = async () => {
    try {
        console.log('--- Create Admin User ---');
        const username = await question('Username: ');
        const email = await question('Email: ');
        const password = await question('Password: ');
        if (!username || !email || !password) {
            console.log('All fields are required.');
            process.exit(1);
        }
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        if (existingUser) {
            console.log('User with this email or username already exists. Updating role and password...');
            await prisma_1.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    role: 'admin',
                    password: hashedPassword
                }
            });
            console.log(`User ${username} is now an ADMIN with updated credentials.`);
        }
        else {
            console.log('Creating new admin user...');
            await prisma_1.prisma.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    role: 'admin',
                    coins: 1000,
                    pteroUserId: 0
                }
            });
            console.log(`Admin user ${username} created successfully.`);
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
    finally {
        rl.close();
    }
};
createAdmin();
