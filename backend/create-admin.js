const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB connection
const MONGODB_URI = "mongodb+srv://lord:zLTZSJMdSgy34sIN@ptro-free.3kyncba.mongodb.net/lordcloud?retryWrites=true&w=majority&appName=ptro-free";

const UserSchema = new mongoose.Schema({
    email: String,
    password_hash: String,
    username: String,
    coins: Number,
    role: String,
    discordId: String,
    isBanned: Boolean
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createAdminUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existing = await User.findOne({ email: 'admin@lordcloud.in' });
        if (existing) {
            console.log('⚠️  Admin user already exists');
            console.log('Email:', existing.email);
            console.log('Username:', existing.username);
            console.log('Role:', existing.role);
            await mongoose.disconnect();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('admin123', 10);

        // Create admin user
        const admin = await User.create({
            email: 'admin@lordcloud.in',
            password_hash: hashedPassword,
            username: 'admin',
            coins: 10000,
            role: 'admin',
            isBanned: false
        });

        console.log('✅ Admin user created successfully!');
        console.log('=====================================');
        console.log('Email: admin@lordcloud.in');
        console.log('Password: admin123');
        console.log('Role: admin');
        console.log('Coins: 10000');
        console.log('=====================================');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

createAdminUser();
