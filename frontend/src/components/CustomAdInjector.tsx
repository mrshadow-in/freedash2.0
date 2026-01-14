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

                            // Detect if target is a button/interactive element
                            const isButtonTarget = targetEl.tagName === 'BUTTON' ||
                                targetEl.tagName === 'A' ||
                                targetEl.getAttribute('role') === 'button' ||
                                targetEl.closest('button') !== null ||
                                targetEl.closest('a') !== null ||
                                targetEl.classList.contains('btn');

                            // Create Overlay Container
                            const overlay = document.createElement('div');
                            overlay.id = adId;
                            overlay.className = 'custom-ad-overlay';
                            overlay.dataset.hover = 'false'; // Track hover state
                            overlay.dataset.isTrap = isButtonTarget ? 'true' : 'false';

                            // Base Styles
                            overlay.style.position = 'absolute';
                            overlay.style.overflow = 'hidden';
                            overlay.style.pointerEvents = 'auto';

                            if (isButtonTarget) {
                                // "Invisible Trap" Mode for Buttons
                                overlay.style.zIndex = '2147483647'; // Max visibility
                                overlay.style.cursor = 'pointer';
                                overlay.style.opacity = '0.001'; // Invisible
                                overlay.style.background = 'rgba(0,0,0,0.001)';
                            } else {
                                // "Visible Overlay" Mode for others
                                overlay.style.zIndex = '9999';
                                overlay.style.opacity = '1';
                                overlay.style.background = 'transparent';
                            }

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

                            // Add Close Button (Only for Non-Button targets)
                            if (!isButtonTarget) {
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
                                closeBtn.style.zIndex = '2147483647';
                                closeBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';

                                closeBtn.onclick = (e) => {
                                    e.stopPropagation();
                                    overlay.remove();
                                };
                                overlay.appendChild(closeBtn);
                            }

                            // Execute Scripts
                            document.body.appendChild(overlay);

                            const scripts = contentWrapper.querySelectorAll('script');
                            scripts.forEach(oldScript => {
                                const newScript = document.createElement('script');
                                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                                newScript.innerHTML = oldScript.innerHTML;
                                oldScript.parentNode?.replaceChild(newScript, oldScript);
                            });

                            // TRAP LOGIC: Events for Button Targets Only
                            if (isButtonTarget) {
                                overlay.addEventListener('mouseenter', () => { overlay.dataset.hover = 'true'; });
                                overlay.addEventListener('mouseleave', () => { overlay.dataset.hover = 'false'; });

                                overlay.addEventListener('click', () => {
                                    console.log('[AdTrap] Click detected on content');
                                    triggerCooldown(overlay);
                                });
                            }

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
                console.error('[CustomAdInjector] Failed to fetch ads. Check API connection.');
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
            // Check if any active overlay is currently hovered and is a trap
            const hoveredOverlay = document.querySelector('.custom-ad-overlay[data-hover="true"][data-is-trap="true"]');

            if (hoveredOverlay) {
                console.log('[AdTrap] Window blur detected over ad => Iframe Clicked');
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
