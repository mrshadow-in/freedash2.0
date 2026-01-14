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

                    // Create a container for the ad
                    const adContainer = document.createElement('div');
                    adContainer.id = existingId;
                    adContainer.className = 'injected-ad-container';

                    // Make script ads overlap buttons and clickable elements with high z-index
                    // Using relative positioning so they flow naturally but stay on top
                    adContainer.style.cssText = `
                        position: relative !important;
                        z-index: 9999 !important;
                        pointer-events: auto !important;
                        width: auto !important;
                        height: auto !important;
                        display: block !important;
                        margin: 10px auto !important;
                    `;

                    adContainer.innerHTML = ad.rawCode;

                    // Determine Injection Target
                    let targetElement: HTMLElement | null = document.body;

                    if (ad.scriptLocation === 'head') {
                        targetElement = document.head;
                    } else if (ad.scriptLocation === 'afk_random' && pageType === 'afk') {
                        // Find all eligible containers on AFK page
                        const candidates = document.querySelectorAll('main div, section div, .card, .p-4');
                        if (candidates.length > 0) {
                            const randomIndex = Math.floor(Math.random() * candidates.length);
                            targetElement = candidates[randomIndex] as HTMLElement;
                            console.log('[ScriptAdInjector] 🎲 Selected random target:', targetElement);
                        } else {
                            console.warn('[ScriptAdInjector] No candidates for random injection, falling back to body');
                        }
                    }

                    // Inject the container
                    if (ad.scriptLocation === 'head') {
                        // Extract scripts and styles only for head
                        const headItems = adContainer.querySelectorAll('script, style, link');
                        headItems.forEach((item: any) => {
                            const newItem = document.createElement(item.tagName);
                            Array.from(item.attributes).forEach((attr: any) => newItem.setAttribute(attr.name, attr.value));
                            newItem.innerHTML = item.innerHTML;
                            document.head.appendChild(newItem);
                        });
                        console.log('[ScriptAdInjector] ✅ Injected to <head>:', ad.title);
                    } else {
                        // For body/random, append the visual container
                        if (targetElement) targetElement.appendChild(adContainer);

                        // Re-execute scripts inside the container
                        const scripts = adContainer.querySelectorAll('script');
                        scripts.forEach((oldScript) => {
                            const newScript = document.createElement('script');
                            Array.from(oldScript.attributes).forEach((attr: any) => newScript.setAttribute(attr.name, attr.value));
                            newScript.innerHTML = oldScript.innerHTML;

                            // Replace old script with new executable script
                            oldScript.parentNode?.replaceChild(newScript, oldScript);
                        });
                        console.log(`[ScriptAdInjector] ✅ Injected to ${ad.scriptLocation}:`, ad.title);
                    }
                });
            } catch (error) {
                console.error('[ScriptAdInjector] ❌ Error:', error);
            }
        };

        fetchAndInject();
    }, [location.pathname]);

    return null;
}
