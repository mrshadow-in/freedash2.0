import api from '../api/client';

/**
 * Loads theme settings from the server and applies them as CSS variables
 * to the document root element, enabling global theme changes
 */
export const loadAndApplyTheme = async (): Promise<void> => {
    try {
        const res = await api.get('/settings');
        const data = res.data;

        // Extract theme object (it might be nested under theme property)
        const theme = data.theme || {};

        // Apply CSS variables to document root
        const root = document.documentElement;

        root.style.setProperty('--bg-color', data.bgColor || theme.bgColor || '#0c0229');
        root.style.setProperty('--primary-color', theme.primaryColor || '#7c3aed');
        root.style.setProperty('--secondary-color', theme.secondaryColor || '#3b82f6');
        root.style.setProperty('--card-bg-color', theme.cardBgColor || 'rgba(255, 255, 255, 0.05)');
        root.style.setProperty('--text-color', theme.textColor || '#ffffff');
        root.style.setProperty('--border-color', theme.borderColor || 'rgba(255, 255, 255, 0.1)');
        root.style.setProperty('--gradient-start', theme.gradientStart || '#7c3aed');
        root.style.setProperty('--gradient-end', theme.gradientEnd || '#3b82f6');

        console.log('✅ Theme loaded and applied');
    } catch (error) {
        console.error('Failed to load theme:', error);
        // Keep default theme values on error
    }
};

/**
 * Triggers a theme reload across all open tabs via localStorage event
 */
export const broadcastThemeUpdate = (): void => {
    localStorage.setItem('theme-updated', Date.now().toString());
};
