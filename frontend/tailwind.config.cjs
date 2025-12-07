/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0c0229', // Dark Purple
                    light: '#2a1a5e',
                    dark: '#050114',
                },
                accent: {
                    DEFAULT: '#8b5cf6', // Violet
                    hover: '#7c3aed',
                }
            }
        },
    },
    plugins: [],
}
