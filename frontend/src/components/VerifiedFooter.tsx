import { useEffect } from 'react';

const VerifiedFooter = () => {
    useEffect(() => {
        // Integrity Check Loop
        const integrityCheck = setInterval(() => {
            const footer = document.getElementById('freedash-branding');
            const currentYear = new Date().getFullYear();

            // Expected Strings (Strict Match)
            const expectedLine1 = `Free-Dash- 2015 - ${currentYear}`;
            const expectedLine2 = "LordCloud- WeebPoll Technologies India Private Limited";

            // CRITICAL: Integrity Violation Conditions
            // 1. Footer is missing
            // 2. Footer is hidden via styles
            // 3. Footer text has been manipulated (must contain BOTH exact lines)
            const isCompromised = !footer ||
                !footer.innerText.includes(expectedLine1) ||
                !footer.innerText.includes(expectedLine2) ||
                window.getComputedStyle(footer).display === 'none' ||
                window.getComputedStyle(footer).visibility === 'hidden' ||
                window.getComputedStyle(footer).opacity === '0';

            if (isCompromised) {
                // INTEGRITY VIOLATION DETECTED - CRASH THE APP
                document.body.innerHTML = `
                    <div style="
                        position: fixed; inset: 0; background-color: #3b0000; color: #ff3333; 
                        display: flex; flex-direction: column; align-items: center; justify-content: center; 
                        font-family: monospace; z-index: 999999; text-align: center; p: 20px;
                    ">
                        <h1 style="font-size: 48px; border-bottom: 2px solid #ff3333; padding-bottom: 20px; margin-bottom: 20px;">
                            ⚠️ CORRUPTION DETECTED ⚠️
                        </h1>
                        <p style="font-size: 24px; max-width: 600px; margin-bottom: 40px;">
                            The system has detected unauthorized tampering with the branding signature. 
                            The application has been halted to prevent further execution.
                        </p>
                        <div style="font-size: 16px; color: #ff8888; border: 1px solid #ff3333; padding: 20px; border-radius: 8px;">
                            Error Code: 0xDEAD_BRANDING_MODIFIED<br>
                            Reason: Integrity Check Failed on 'freedash-branding'. Text mismatch.
                        </div>
                    </div>
                `;
                clearInterval(integrityCheck);
            }
        }, 1500); // Check every 1.5 seconds

        return () => clearInterval(integrityCheck);
    }, []);

    return (
        <footer className="w-full py-8 mt-auto bg-black/40 backdrop-blur-md border-t border-white/5 relative z-50">
            <div
                id="freedash-branding"
                className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center select-none pointer-events-none gap-2"
            >
                {/* Line 1: Center */}
                <div className="text-gray-300 font-medium text-base tracking-wide">
                    Free-Dash- 2015 - {new Date().getFullYear()}
                </div>

                {/* Line 2: Below */}
                <div className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    LordCloud- WeebPoll Technologies India Private Limited
                </div>
            </div>
        </footer>
    );
};

export default VerifiedFooter;
