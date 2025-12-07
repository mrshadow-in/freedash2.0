const axios = require('axios');

async function testPteroAPI() {
    const apiUrl = 'https://panel.xitenodes.ovh';
    const apiKey = 'ptla_MksQafFoLY0iH13fnJ6tBcSBBkXj2PdLQmfJLLrK6ly';

    try {
        console.log('Testing Pterodactyl API call...');
        console.log('URL:', apiUrl);
        console.log('Key:', apiKey.substring(0, 10) + '...');

        // Test getting users
        const response = await axios.get(`${apiUrl}/api/application/users`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/vnd.pterodactyl.v1+json',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('SUCCESS! Response:', response.status);
        console.log('Users found:', response.data.meta?.pagination?.total || 0);

        // Now try to create a server
        console.log('\n--- Testing server creation ---');
        const serverResponse = await axios.post(
            `${apiUrl}/api/application/servers`,
            {
                name: 'DirectAPITest',
                user: 1, // Assuming user ID 1 exists
                egg: 2,
                docker_image: 'ghcr.io/pterodactyl/yolks:java_17',
                startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
                environment: {
                    SERVER_JARFILE: 'server.jar',
                    VANILLA_VERSION: 'latest'
                },
                limits: {
                    memory: 2048,
                    swap: 0,
                    disk: 10240,
                    io: 500,
                    cpu: 100
                },
                feature_limits: {
                    databases: 0,
                    backups: 0,
                    allocations: 1
                },
                allocation: {
                    default: 1
                },
                deploy: {
                    locations: [1],
                    dedicated_ip: false,
                    port_range: []
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/vnd.pterodactyl.v1+json',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Server created!', serverResponse.data);

    } catch (error) {
        console.error('ERROR:', error.response?.status, error.response?.statusText);
        console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Full error:', error.message);
    }
}

testPteroAPI();
