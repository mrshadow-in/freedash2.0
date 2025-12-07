const axios = require('axios');

async function testServerCreation() {
    try {
        console.log('Testing server creation...');

        // Login as admin
        const loginRes = await axios.post('http://localhost:3000/auth/login', {
            email: 'admin@lordcloud.in',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('Logged in successfully');

        // Try to create a server
        const createRes = await axios.post('http://localhost:3000/servers/create', {
            name: 'DebugTestServer',
            planId: '6756c6c5-placeholder' // We'll get real plan ID
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Server created:', createRes.data);
    } catch (error) {
        console.error('ERROR:', error.response?.data || error.message);
        if (error.response?.data?.error) {
            console.error('Detailed error:', error.response.data.error);
        }
    }
}

testServerCreation();
