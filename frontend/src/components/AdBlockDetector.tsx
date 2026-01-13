import { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

export default function AdBlockDetector() {
    const [isBlocked, setIsBlocked] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const detectAdBlock = async () => {
            try {
                // Method 1: Try to fetch a common ad script
                const testAd = document.createElement('div');
                testAd.innerHTML = '&nbsp;';
                testAd.className = 'adsbox ad-placement ad-container';
                testAd.style.height = '1px';
                testAd.style.position = 'absolute';
                testAd.style.top = '-9999px';
                document.body.appendChild(testAd);

                await new Promise(resolve => setTimeout(resolve, 100));

                const isHidden = testAd.offsetHeight === 0 ||
                    window.getComputedStyle(testAd).display === 'none' ||
                    window.getComputedStyle(testAd).visibility === 'hidden';

                document.body.removeChild(testAd);

                // Method 2: Check for common ad blocker properties
                const hasAdBlocker = !!(
                    isHidden ||
                    typeof (window as any).adsbygoogle === 'undefined' ||
                    (window as any).adblockDetected
                );

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
