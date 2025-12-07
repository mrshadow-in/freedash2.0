const axios = require('axios');

async function testAdminAccess() {
    try {
        // Login as admin
        const loginRes = await axios.post('http://localhost:3000/auth/login', {
            email: 'admin@lordcloud.in',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        const user = loginRes.data.user;
        console.log('Logged in as:', user.email);
        console.log('Role:', user.role);
        console.log('Token:', token.substring(0, 20) + '...');

        // Try to access admin endpoint
        console.log('\n--- Testing /admin/users endpoint ---');
        const usersRes = await axios.get('http://localhost:3000/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('SUCCESS! Users:', usersRes.data.users.length);

    } catch (error) {
        console.error('ERROR:', error.response?.status, error.response?.statusText);
        console.error('Error data:', error.response?.data);
    }
}

testAdminAccess();
