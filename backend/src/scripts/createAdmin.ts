import { prisma } from '../prisma';
import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => {
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

        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingUser) {
            console.log('User with this email or username already exists. Updating role to ADMIN...');
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'admin' }
            });
            console.log(`User ${username} is now an ADMIN.`);
        } else {
            console.log('Creating new admin user...');
            const password_hash = await bcrypt.hash(password, 10);

            await prisma.user.create({
                data: {
                    username,
                    email,
                    password: password_hash,
                    role: 'admin',
                    coins: 1000, // Bonus for admin
                    pteroUserId: 0 // Placeholder or managed by Pterodactyl hook
                }
            });
            console.log(`Admin user ${username} created successfully.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
};

createAdmin();
