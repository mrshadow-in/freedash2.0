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
                    DEFAULT: '#0c0229', // Fallback
                    light: '#2a1a5e',
                    dark: '#050114',
                },
                accent: {
                    DEFAULT: '#8b5cf6',
                    hover: '#7c3aed',
                },
                // Dynamic Theme Colors
                theme: {
                    bg: 'var(--bg-color)',
                    card: 'var(--card-bg-color)',
                    text: 'var(--text-color)',
                    border: 'var(--border-color)',
                    primary: 'var(--primary-color)',
                    secondary: 'var(--secondary-color)',
                    gradientStart: 'var(--gradient-start)',
                    gradientEnd: 'var(--gradient-end)',
                }
            }
        },
    },
    plugins: [],
}
