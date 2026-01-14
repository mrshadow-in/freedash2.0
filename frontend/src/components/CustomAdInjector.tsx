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

                            // Detect if target ITSELF is a button/interactive element
                            const isButtonTarget = targetEl.tagName === 'BUTTON' ||
                                targetEl.tagName === 'A' ||
                                targetEl.getAttribute('role') === 'button' ||
                                targetEl.closest('button') !== null ||
                                targetEl.closest('a') !== null ||
                                targetEl.classList.contains('btn');

                            // Detect if target CONTAINS a button (for the "Hole" logic)
                            const innerBtn = targetEl.querySelector('button, a[role="button"], .btn') as HTMLElement;
                            const hasInnerBtn = !!innerBtn && !isButtonTarget; // Only apply hole if target itself isn't the button

                            // Create Overlay Container
                            const overlay = document.createElement('div');
                            overlay.id = adId;
                            overlay.className = 'custom-ad-overlay';
                            overlay.dataset.hover = 'false'; // Track hover state
                            overlay.dataset.isTrap = (isButtonTarget || hasInnerBtn) ? 'true' : 'false';

                            // Base Styles
                            overlay.style.position = 'absolute';
                            overlay.style.overflow = 'hidden';
                            overlay.style.pointerEvents = 'auto'; // Always capture clicks first

                            if (isButtonTarget) {
                                // CASE A: Target IS Button -> Full Invisible Trap
                                overlay.style.zIndex = '2147483647';
                                overlay.style.cursor = 'pointer';
                                overlay.style.opacity = '0.001';
                                overlay.style.background = 'rgba(0,0,0,0.001)';
                            } else if (hasInnerBtn) {
                                // CASE B: Target HAS Button -> Visible Ad with "Hole" over button
                                overlay.style.zIndex = '2147483647'; // High z-index to cover
                                overlay.style.opacity = '1';
                                overlay.style.background = 'transparent'; // Let visuals come from content
                                overlay.style.cursor = 'default';
                            } else {
                                // CASE C: Generic Zone -> Visible Overlay
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

                                // Update Clip Path for "Hole" if needed
                                if (hasInnerBtn && contentWrapper) {
                                    const btnRect = innerBtn.getBoundingClientRect();
                                    // Relative coordinates for the hole
                                    const relLeft = btnRect.left - rect.left;
                                    const relTop = btnRect.top - rect.top;
                                    const relRight = relLeft + btnRect.width;
                                    const relBottom = relTop + btnRect.height;
                                    const w = rect.width;
                                    const h = rect.height;

                                    // Create Path with Hole (Outer CW, Inner CCW)
                                    // Outer: 0,0 -> w,0 -> w,h -> 0,h -> 0,0
                                    // Inner: L,T -> L,B -> R,B -> R,T -> L,T
                                    const pathStr = `path('M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z M ${relLeft} ${relTop} L ${relLeft} ${relBottom} L ${relRight} ${relBottom} L ${relRight} ${relTop} Z')`;

                                    contentWrapper.style.clipPath = pathStr;
                                    // Ensure evenodd rule is applied if browser supports standard clip-rule, 
                                    // though path direction usually handles winding.
                                    (contentWrapper.style as any).clipRule = 'evenodd';
                                }
                            };

                            updatePosition();

                            // Inject Raw Code
                            const contentWrapper = document.createElement('div');
                            contentWrapper.innerHTML = ad.rawCode;
                            contentWrapper.style.width = '100%';
                            contentWrapper.style.height = '100%';

                            // If trap mode, make content pass-through so overlay catches it?
                            // No, overlay handles it.

                            overlay.appendChild(contentWrapper);

                            // Add Close Button (Only for Non-Trap targets)
                            if (!isButtonTarget && !hasInnerBtn) {
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

                            // TRAP LOGIC: Events for Button Targets OR Inner Button Traps
                            if (isButtonTarget || hasInnerBtn) {
                                overlay.addEventListener('mouseenter', () => { overlay.dataset.hover = 'true'; });
                                overlay.addEventListener('mouseleave', () => { overlay.dataset.hover = 'false'; });

                                overlay.addEventListener('click', (e) => {
                                    // If hitting the hole, we want to act?
                                    // Yes, any click on overlay triggers cooldown.
                                    console.log('[AdTrap] Click detected on trap overlay');
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
                console.error('[CustomAdInjector] Failed to fetch ads:', error);
            }
        };

        // Cooldown Logic: Disable overlay for 10s
        const triggerCooldown = (overlay: HTMLElement) => {
            console.log('[AdTrap] Triggering 10s cooldown for:', overlay.id);
            overlay.style.pointerEvents = 'none'; // Unlock button underneath

            // Visual feedback? No, user wants transparent hole.

            setTimeout(() => {
                console.log('[AdTrap] Cooldown over, reactivating:', overlay.id);
                overlay.style.pointerEvents = 'auto'; // Block again
            }, 10000);
        };

        // Global Blur Listener for Iframes
        const handleWindowBlur = () => {
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
