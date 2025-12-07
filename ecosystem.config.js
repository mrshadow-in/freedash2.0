module.exports = {
    apps: [
        {
            name: 'lordcloud-backend',
            script: './backend/dist/app.js',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                MONGODB_URI: "mongodb+srv://lord:admin@cluster0.kbrgism.mongodb.net/?appName=Cluster0"
            }
        },
        // For frontend, usually served via Nginx, but can serve static via serve
        // {
        //   name: 'lordcloud-frontend',
        //   script: 'serve',
        //   env: {
        //     PM2_SERVE_PATH: './frontend/dist',
        //     PM2_SERVE_PORT: 5173,
        //     PM2_SERVE_SPA: 'true',
        //     PM2_SERVE_HOMEPAGE: '/index.html'
        //   }
        // }
    ]
};
