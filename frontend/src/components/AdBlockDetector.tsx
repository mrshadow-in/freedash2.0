import { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

export default function AdBlockDetector() {
    const [isBlocked, setIsBlocked] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const detectAdBlock = async () => {
            try {
                // Check if user is admin - admins can use ad blockers
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        if (user?.role === 'admin') {
                            console.log('[AdBlockDetector] Admin detected - bypassing check ✅');
                            setIsBlocked(false);
                            setIsChecking(false);
                            return;
                        }
                    } catch (e) {
                        console.warn('[AdBlockDetector] Failed to parse user data', e);
                    }
                }

                let detectionCount = 0;
                const totalMethods = 5;

                // Method 1: DOM-based detection with multiple ad class names
                const testAd = document.createElement('div');
                testAd.innerHTML = '&nbsp;';
                testAd.className = 'ad ads adsbox ad-placement ad-container adsbygoogle advertisement';
                testAd.style.height = '1px';
                testAd.style.width = '1px';
                testAd.style.position = 'absolute';
                testAd.style.top = '-9999px';
                testAd.style.left = '-9999px';
                document.body.appendChild(testAd);

                await new Promise(resolve => setTimeout(resolve, 100));

                const computedStyle = window.getComputedStyle(testAd);
                const isHidden = testAd.offsetHeight === 0 ||
                    testAd.offsetParent === null ||
                    computedStyle.display === 'none' ||
                    computedStyle.visibility === 'hidden';

                if (isHidden) {
                    console.log('[AdBlockDetector] ✓ Method 1: Fake ad div is hidden');
                    detectionCount++;
                }

                document.body.removeChild(testAd);

                // Method 2: Try to create ad-like iframe
                const adFrame = document.createElement('iframe');
                adFrame.src = 'about:blank';
                adFrame.className = 'ad-frame';
                adFrame.style.width = '1px';
                adFrame.style.height = '1px';
                adFrame.style.position = 'absolute';
                adFrame.style.top = '-9999px';
                document.body.appendChild(adFrame);

                await new Promise(resolve => setTimeout(resolve, 50));

                if (adFrame.offsetHeight === 0 || adFrame.offsetParent === null) {
                    console.log('[AdBlockDetector] ✓ Method 2: Ad iframe blocked');
                    detectionCount++;
                }

                document.body.removeChild(adFrame);

                // Method 3: Try to fetch a known ad network domain
                try {
                    await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-store'
                    });
                    console.log('[AdBlockDetector] ✗ Method 3: Ad network fetch allowed');
                } catch {
                    console.log('[AdBlockDetector] ✓ Method 3: Ad network fetch blocked');
                    detectionCount++;
                }

                // Method 4: Check for common ad blocker JavaScript signatures
                if ((window as any).blockAdBlock ||
                    (window as any).canRunAds === false ||
                    (window as any).__firefox__ ||
                    (document as any).AdBlockDetected) {
                    console.log('[AdBlockDetector] ✓ Method 4: JS signature detected');
                    detectionCount++;
                }

                // Method 5: Try to access a bait element
                const bait = document.createElement('div');
                bait.setAttribute('class', 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links');
                bait.setAttribute('style', 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;');
                document.body.appendChild(bait);

                await new Promise(resolve => setTimeout(resolve, 100));

                if (window.getComputedStyle(bait).display === 'none' ||
                    bait.offsetHeight === 0 ||
                    bait.offsetParent === null) {
                    console.log('[AdBlockDetector] ✓ Method 5: Bait element blocked');
                    detectionCount++;
                }

                document.body.removeChild(bait);

                // Lower threshold - if ANY 1 method detects, we block
                const hasAdBlocker = detectionCount >= 1;
                console.log('[AdBlockDetector] Detection count:', detectionCount, '/', totalMethods, '→', hasAdBlocker ? '🔴 BLOCKED' : '✅ ALLOWED');

                setIsBlocked(hasAdBlocker);
                setIsChecking(false);

                // Recheck every 5 seconds if blocked
                if (hasAdBlocker) {
                    setTimeout(detectAdBlock, 5000);
                }
            } catch (error) {
                console.error('AdBlock detection error:', error);
                setIsChecking(false);
            }
        };

        detectAdBlock();
    }, []);

    // Don't show anything while checking
    if (isChecking) return null;

    // Don't show if no ad blocker detected
    if (!isBlocked) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-lg">
            <div className="max-w-md w-full mx-4">
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 shadow-2xl border border-red-500/30">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500 blur-3xl opacity-50 animate-pulse"></div>
                            <div className="relative bg-red-500/20 p-6 rounded-full border-2 border-red-500">
                                <Shield className="w-16 h-16 text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                        Ad Blocker Detected!
                    </h2>

                    {/* Message */}
                    <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-300 text-sm leading-relaxed">
                                We've detected that you're using an ad blocker. To continue using our free services,
                                please <strong className="text-white">disable your ad blocker</strong> for this website.
                            </p>
                        </div>

                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                            <p className="text-gray-400 text-xs leading-relaxed">
                                <strong className="text-white">Why?</strong> Ads help us keep this platform free for everyone.
                                We use non-intrusive ads to support our servers and services.
                            </p>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-3 mb-6">
                        <p className="text-sm font-semibold text-gray-300">How to disable:</p>
                        <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                            <li>Click on your ad blocker extension icon (usually in the top-right corner)</li>
                            <li>Select "Disable on this site" or "Pause on this site"</li>
                            <li>Refresh the page</li>
                        </ol>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-green-500/20"
                    >
                        ✓ I've Disabled It – Refresh Page
                    </button>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-500 mt-6">
                        Thank you for supporting our free platform! 💜
                    </p>
                </div>
            </div>
        </div>
    );
}
