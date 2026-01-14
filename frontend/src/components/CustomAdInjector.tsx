import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/client';

export default function CustomAdInjector() {
    const location = useLocation();

    useEffect(() => {
        const injectCustomAds = async () => {
            try {
                const { data: ads } = await api.get('/ads');

                // Filter for custom positioned ads
                const customAds = ads.filter((ad: any) =>
                    ad.status === 'active' &&
                    ad.position &&
                    ad.position.startsWith('custom:')
                );

                customAds.forEach((ad: any) => {
                    const selector = ad.position.replace('custom:', '');
                    const adId = `custom-ad-${ad.id}`;

                    // Check if already injected
                    if (document.getElementById(adId)) return;

                    // Attempts to find element (retry logic for dynamic content)
                    let attempts = 0;
                    const maxAttempts = 10;

                    const tryInject = () => {
                        const targetEl = document.querySelector(selector) as HTMLElement;

                        if (targetEl) {
                            console.log(`[CustomAdInjector] 🎯 Found target for "${ad.title}":`, selector);

                            // Create Overlay Container
                            const overlay = document.createElement('div');
                            overlay.id = adId;
                            overlay.className = 'custom-ad-overlay';
                            overlay.style.position = 'absolute';
                            overlay.style.zIndex = '2147483647'; // Max z-index to ensure visibility
                            overlay.style.overflow = 'hidden';
                            overlay.style.pointerEvents = 'auto'; // Ad is clickable

                            // Initial Position Sync
                            const updatePosition = () => {
                                if (!targetEl.isConnected) {
                                    overlay.remove();
                                    return;
                                }
                                const rect = targetEl.getBoundingClientRect();
                                overlay.style.top = `${rect.top + window.scrollY}px`;
                                overlay.style.left = `${rect.left + window.scrollX}px`;
                                overlay.style.width = `${rect.width}px`;
                                overlay.style.height = `${rect.height}px`;
                            };

                            updatePosition();

                            // Add Close Button
                            const closeBtn = document.createElement('button');
                            closeBtn.innerHTML = '×';
                            closeBtn.style.position = 'absolute';
                            closeBtn.style.top = '-10px';
                            closeBtn.style.right = '-10px';
                            closeBtn.style.width = '24px';
                            closeBtn.style.height = '24px';
                            closeBtn.style.background = 'red';
                            closeBtn.style.color = 'white';
                            closeBtn.style.border = '2px solid white';
                            closeBtn.style.borderRadius = '50%';
                            closeBtn.style.fontSize = '16px';
                            closeBtn.style.fontWeight = 'bold';
                            closeBtn.style.cursor = 'pointer';
                            closeBtn.style.display = 'flex';
                            closeBtn.style.alignItems = 'center';
                            closeBtn.style.justifyContent = 'center';
                            closeBtn.style.zIndex = '2147483647'; // Ensure button is on top of ad content
                            closeBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';

                            closeBtn.onclick = (e) => {
                                e.stopPropagation();
                                overlay.remove();
                            };

                            overlay.appendChild(closeBtn);

                            // Inject Raw Code
                            const contentWrapper = document.createElement('div');
                            contentWrapper.innerHTML = ad.rawCode;
                            overlay.appendChild(contentWrapper);

                            // Execute Scripts
                            document.body.appendChild(overlay);

                            const scripts = contentWrapper.querySelectorAll('script');
                            scripts.forEach(oldScript => {
                                const newScript = document.createElement('script');
                                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                                newScript.innerHTML = oldScript.innerHTML;
                                oldScript.parentNode?.replaceChild(newScript, oldScript);
                            });

                            // Keep synced
                            window.addEventListener('resize', updatePosition);
                            window.addEventListener('scroll', updatePosition);

                            // ResizeObserver for element changes
                            const resizeObserver = new ResizeObserver(updatePosition);
                            resizeObserver.observe(targetEl);

                        } else {
                            attempts++;
                            if (attempts < maxAttempts) {
                                setTimeout(tryInject, 500);
                            }
                        }
                    };

                    tryInject();
                });

            } catch (error) {
                console.error('[CustomAdInjector] Failed to fetch ads:', error);
            }
        };

        injectCustomAds();

        // Cleanup on unmount or route change (optional, but good for SPA)
        return () => {
            const overlays = document.querySelectorAll('.custom-ad-overlay');
            overlays.forEach(el => el.remove());
        };
    }, [location.pathname]);

    return null;
}
