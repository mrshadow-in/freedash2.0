const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://lord:zLTZSJMdSgy34sIN@ptro-free.3kyncba.mongodb.net/lordcloud?retryWrites=true&w=majority&appName=ptro-free";

const UserSchema = new mongoose.Schema({
    email: String,
    password_hash: String,
    username: String,
    coins: Number,
    role: String
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function checkUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({});
        console.log('\n📊 Total Users:', users.length);
        console.log('\nUsers in database:');
        users.forEach(user => {
            console.log(`- ${user.username} (${user.email}) - Role: ${user.role}, Coins: ${user.coins}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
    }
}

checkUsers();
