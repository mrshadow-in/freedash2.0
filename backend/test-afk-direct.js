const axios = require('axios');

async function testAFK() {
    try {
        console.log('🔄 Testing AFK Start...');

        // First login to get token
        console.log('1️⃣ Logging in...');
        const loginRes = await axios.post('http://localhost:3000/auth/login', {
            email: 'admin@lordcloud.in',
            password: 'admin123'
        });

        const token = loginRes.data.accessToken;  // Use accessToken instead of token
        console.log('✅ Login successful, got token');

        // Try to start AFK session
        console.log('2️⃣ Starting AFK session...');
        const afkRes = await axios.post('http://localhost:3000/afk/start', {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ AFK session started successfully!');
        console.log('Response:', afkRes.data);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Full response:', error.response.data);
        }
    }
}

testAFK();
