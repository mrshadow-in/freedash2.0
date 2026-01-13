import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

const GlobalAdScript = () => {
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    // Fetch settings to get the ad script
    const { data: settings } = useQuery({
        queryKey: ['publicSettings'],
        queryFn: async () => {
            const res = await api.get('/settings');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        if (settings?.globalAdScript) {
            // Remove existing script if any
            if (scriptRef.current) {
                document.body.removeChild(scriptRef.current);
            }

            // Create new script element
            const range = document.createRange();
            const fragment = range.createContextualFragment(settings.globalAdScript);

            // Append to body (popunders usually work best here or head)
            // If it's a simple script src, simpler approach:
            const scripts = fragment.querySelectorAll('script');

            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                document.body.appendChild(newScript);
                scriptRef.current = newScript;
            });

            // If it's not a script but HTML (e.g. div + script), we might need to append valid HTML
            // But usually ad codes like the one shown are <script src="...">
        }
    }, [settings?.globalAdScript]);

    return null; // Render nothing
};

export default GlobalAdScript;
