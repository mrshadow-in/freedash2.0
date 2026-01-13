import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client';

export default function ScriptAdInjector() {
    const location = useLocation();

    useEffect(() => {
        const fetchAndInject = async () => {
            try {
                // Determine page type
                let pageType = 'dashboard';
                if (location.pathname.startsWith('/server/')) pageType = 'server';
                else if (location.pathname.includes('/afk')) pageType = 'afk';

                console.log('[ScriptAdInjector] Current page:', location.pathname, '→ Detected as:', pageType);

                // Fetch script ads
                const { data: ads } = await api.get('/ads?type=script');
                console.log('[ScriptAdInjector] Fetched ads:', ads);

                // Filter relevant ads
                const relevantAds = ads.filter((ad: any) => {
                    const hasTargets = ad.pageTargets && Array.isArray(ad.pageTargets);
                    const matchesPage = hasTargets && ad.pageTargets.includes(pageType);
                    const isActive = ad.status === 'active';

                    console.log(`[ScriptAdInjector] Ad "${ad.title}":`, {
                        pageTargets: ad.pageTargets,
                        matchesPage,
                        isActive,
                        willInject: matchesPage && isActive
                    });

                    return matchesPage && isActive;
                });

                console.log('[ScriptAdInjector] Relevant ads to inject:', relevantAds.length);

                // Sort by priority (desc)
                relevantAds.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));

                relevantAds.forEach((ad: any) => {
                    const existingId = `script-ad-${ad.id}`;
                    if (document.getElementById(existingId)) {
                        console.log('[ScriptAdInjector] Ad already injected:', ad.title);
                        return;
                    }

                    console.log('[ScriptAdInjector] Injecting ad:', ad.title, 'to', ad.scriptLocation);

                    // Parse the raw code to find script tags
                    const container = document.createElement('div');
                    container.innerHTML = ad.rawCode;

                    const scripts = container.querySelectorAll('script');
                    scripts.forEach((oldScript, index) => {
                        const newScript = document.createElement('script');

                        // Copy attributes
                        Array.from(oldScript.attributes).forEach(attr => {
                            newScript.setAttribute(attr.name, attr.value);
                        });

                        // Copy content
                        newScript.innerHTML = oldScript.innerHTML;
                        newScript.id = `${existingId}-${index}`;
                        newScript.dataset.adId = ad.id;
                        newScript.dataset.adName = ad.title;

                        // Inject
                        if (ad.scriptLocation === 'head') {
                            document.head.appendChild(newScript);
                            console.log('[ScriptAdInjector] ✅ Injected to <head>:', ad.title);
                        } else {
                            document.body.appendChild(newScript);
                            console.log('[ScriptAdInjector] ✅ Injected to <body>:', ad.title);
                        }
                    });
                });

            } catch (error) {
                console.error('[ScriptAdInjector] ❌ Error:', error);
            }
        };

        fetchAndInject();
    }, [location.pathname]);

    return null;
}
