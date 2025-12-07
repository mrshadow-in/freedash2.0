import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

interface Theme {
    bgColor: string;
    primaryColor: string;
    secondaryColor: string;
    cardBgColor: string;
    textColor: string;
    borderColor: string;
    gradientStart: string;
    gradientEnd: string;
}

const defaultTheme: Theme = {
    bgColor: '#0c0229',
    primaryColor: '#7c3aed',
    secondaryColor: '#3b82f6',
    cardBgColor: 'rgba(255,255,255,0.05)',
    textColor: '#ffffff',
    borderColor: 'rgba(255,255,255,0.1)',
    gradientStart: '#7c3aed',
    gradientEnd: '#3b82f6'
};

const ThemeContext = createContext<Theme>(defaultTheme);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(defaultTheme);

    useEffect(() => {
        // Fetch theme from API
        const fetchTheme = async () => {
            try {
                console.log('🎨 Fetching theme settings...');
                const res = await api.get('/settings');
                console.log('🎨 Theme API Response:', res.data);

                if (res.data) {
                    const newTheme = {
                        bgColor: res.data.bgColor || defaultTheme.bgColor,
                        primaryColor: res.data.theme?.primaryColor || defaultTheme.primaryColor,
                        secondaryColor: res.data.theme?.secondaryColor || defaultTheme.secondaryColor,
                        cardBgColor: res.data.theme?.cardBgColor || defaultTheme.cardBgColor,
                        textColor: res.data.theme?.textColor || defaultTheme.textColor,
                        borderColor: res.data.theme?.borderColor || defaultTheme.borderColor,
                        gradientStart: res.data.theme?.gradientStart || defaultTheme.gradientStart,
                        gradientEnd: res.data.theme?.gradientEnd || defaultTheme.gradientEnd
                    };
                    console.log('🎨 Applying new theme:', newTheme);
                    setTheme(newTheme);

                    // Apply CSS variables to root
                    const root = document.documentElement;
                    root.style.setProperty('--bg-color', newTheme.bgColor);
                    root.style.setProperty('--primary-color', newTheme.primaryColor);
                    root.style.setProperty('--secondary-color', newTheme.secondaryColor);
                    root.style.setProperty('--card-bg-color', newTheme.cardBgColor);
                    root.style.setProperty('--text-color', newTheme.textColor);
                    root.style.setProperty('--border-color', newTheme.borderColor);
                    root.style.setProperty('--gradient-start', newTheme.gradientStart);
                    root.style.setProperty('--gradient-end', newTheme.gradientEnd);
                }
            } catch (err) {
                console.error('❌ Failed to fetch theme:', err);
            }
        };

        fetchTheme();
    }, []);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
