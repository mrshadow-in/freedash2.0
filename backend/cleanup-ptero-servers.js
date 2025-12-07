// Script to delete all servers from Pterodactyl that are marked as deleted in dashboard
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI;

// Pterodactyl config  
const PTERO_URL = process.env.PTERODACTYL_URL;
const PTERO_KEY = process.env.PTERODACTYL_API_KEY;

const ServerSchema = new mongoose.Schema({
    ownerId: mongoose.Schema.Types.ObjectId,
    pteroServerId: Number,
    pteroIdentifier: String,
    name: String,
    status: String,
    ramMb: Number,
    diskMb: Number,
    cpuCores: Number
}, { timestamps: true });

const Server = mongoose.model('Server', ServerSchema);

async function cleanupDeletedServers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all servers marked as 'deleted' in dashboard
        const deletedServers = await Server.find({ status: 'deleted' });
        console.log(`📋 Found ${deletedServers.length} servers marked as deleted`);

        if (deletedServers.length === 0) {
            console.log('✅ No deleted servers to clean up');
            process.exit(0);
        }

        // Delete each from Pterodactyl
        let successCount = 0;
        let failCount = 0;

        for (const server of deletedServers) {
            try {
                if (server.pteroServerId) {
                    await axios.delete(
                        `${PTERO_URL}/api/application/servers/${server.pteroServerId}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${PTERO_KEY}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/vnd.pterodactyl.v1+json'
                            }
                        }
                    );
                    console.log(`✅ Deleted from Pterodactyl: ${server.name} (ID: ${server.pteroServerId})`);
                    successCount++;
                } else {
                    console.log(`⚠️  No Pterodactyl ID for: ${server.name}`);
                }
            } catch (error) {
                console.error(`❌ Failed to delete ${server.name}:`, error.response?.data || error.message);
                failCount++;
            }
        }

        console.log(`\n📊 Cleanup Complete:`);
        console.log(`   ✅ Successfully deleted: ${successCount}`);
        console.log(`   ❌ Failed: ${failCount}`);

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanupDeletedServers();
