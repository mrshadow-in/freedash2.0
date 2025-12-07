import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const BrandingLoader = () => {
    const { data: settings } = useQuery({
        queryKey: ['panelSettings'],
        queryFn: async () => {
            const res = await api.get('/settings');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnMount: false
    });

    useEffect(() => {
        if (settings?.panelName) {
            document.title = settings.panelName;
        }

        if (settings?.panelLogo) {
            const linkCallback = () => {
                let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = settings.panelLogo;
            };
            linkCallback();
        }
    }, [settings]);

    return null;
};

export default BrandingLoader;
