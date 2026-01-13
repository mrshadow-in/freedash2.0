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
                else if (location.pathname === '/afk') pageType = 'afk';

                // Fetch script ads
                const { data: ads } = await api.get('/ads?type=script');

                // Filter relevant ads
                // Note: database stores JSON array, so we check if it includes our pageType
                const relevantAds = ads.filter((ad: any) =>
                    ad.pageTargets &&
                    Array.isArray(ad.pageTargets) &&
                    ad.pageTargets.includes(pageType) &&
                    ad.status === 'active'
                );

                // Sort by priority (desc)
                relevantAds.sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));

                relevantAds.forEach((ad: any) => {
                    // Prevent duplicates per session/page load. 
                    // Note: If user navigates away and back, we might re-inject if we don't track globally.
                    // But usually ad networks handle deduplication or we want them to re-fire on new page view.
                    // For SPA, "page view" is route change.
                    // If we want to strictly run ONCE per app session for some, we'd need better tracking.
                    // For now, allow re-injection on route change if the script logic allows it, 
                    // BUT my code uses 'injectedScriptsRef' which persists for component lifetime.
                    // Since this component will likely be at App root, it persists.
                    // So we need to reset the ref on route change? Or keep it?
                    // Usually ads should show on every "page view".
                    // So we should NOT prevent re-injection if the route changed.
                    // But we should prevent DOUBLE injection on the SAME route change.

                    // Actually, if we use UUIDs for element IDs, we can check existence in DOM.

                    // Let's rely on ad networks to handle frequency capping.
                    // We just inject. But we check current DOM to avoid stacking if React re-renders affect us.
                    // React Strict Mode might run effect twice.

                    const existingId = `script-ad-${ad.id}`;
                    if (document.getElementById(existingId)) return;

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

                        // Inject
                        if (ad.scriptLocation === 'head') {
                            document.head.appendChild(newScript);
                        } else {
                            document.body.appendChild(newScript);
                        }
                    });

                    // Also handle non-script tags (like iframes or tracking pixels img)
                    // If rawCode has other elements, we might want to append them too?
                    // User prompt specifically said "Script Ad", but "Popunder" checks out.
                    // Usually popunder is just JS.
                });

            } catch (error) {
                console.error('Failed to inject script ads', error);
            }
        };

        fetchAndInject();
    }, [location.pathname]);

    return null;
}
