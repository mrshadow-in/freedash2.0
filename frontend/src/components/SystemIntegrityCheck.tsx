import { useEffect, useState } from 'react';

// CRYPTOGRAPHIC SYSTEM CORE - INTEGRITY MODULE
// WARNING: Unauthorized modification will trigger system halt.
// CORE_ID: 0x992837482

const SystemIntegrityCheck = () => {
    // State purely for holding decoded values
    const [d1, setD1] = useState<string>('...'); // Line 1
    const [d2, setD2] = useState<string>('...'); // Line 2

  

    const _s1_root = "RnJlZS1EYXNoLSAyMDI1IC0g";

    const _s2_root = "TG9yZENsb3VkLSBXZWViUG9sbCBUZWNobm9sb2dpZXMgSW5kaWEgUHJpdmF0ZSBMaW1pdGVk";

    useEffect(() => {
        // Decode for display (only exists in memory)
        setD1(atob(_s1_root) + new Date().getFullYear());
        setD2(atob(_s2_root));

        // Core Loop - Delay start for system stability
        const init = setTimeout(() => {

            const watchdog = setInterval(() => {
                // Obfuscated Selector: 'freedash-branding'
                const _id = '\x66\x72\x65\x65\x64\x61\x73\x68\x2d\x62\x72\x61\x6e\x64\x69\x6e\x67';
                const _el = document.getElementById(_id);
                const _y = new Date().getFullYear();

                if (!_el) {
                    _halt('ERR_DOM_MISSING');
                    return;
                }

                // Decode functions
                const _d = (s: string) => atob(s);
                const _c = _el.textContent || "";

                // Construct expected strings dynamically
                const _e1 = _d(_s1_root) + _y;
                const _e2 = _d(_s2_root);

                // Verification Logic (Strict)
                const _f1 = !_c.includes(_e1);
                const _f2 = !_c.includes(_e2);

                // Visibility Checks
                const _st = window.getComputedStyle(_el);
                const _v = _st.display === 'none' || _st.visibility === 'hidden' || _st.opacity === '0';

                if (_f1 || _f2 || _v) {
                    // Halt System
                    _halt(` Integrity Violation: ${_c.substring(0, 20)}...`);
                    clearInterval(watchdog);
                }
            }, 2500);

            return () => clearInterval(watchdog);

        }, 2000);

        return () => clearTimeout(init);
    }, []);

    const _halt = (r: string) => {
        // System Halt UI
        document.body.innerHTML = `
            <div style="
                position: fixed; inset: 0; background-color: #1a0000; color: #ff0000; 
                display: flex; flex-direction: column; align-items: center; justify-content: center; 
                font-family: 'Consolas', monospace; z-index: 2147483647; text-align: center; padding: 40px;
            ">
                <h1 style="font-size: 64px; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 20px; border: 4px solid red; padding: 20px;">
                    SYSTEM HALTED
                </h1>
                <p style="font-size: 24px; color: #cc0000; margin-bottom: 60px;">
                    CRITICAL SECURITY VIOLATION DETECTED
                </p>
                <div style="font-size: 14px; color: #660000; border: 1px dashed #660000; padding: 20px; max-width: 800px;">
                    CORE_DUMP: 0xDEAD_BEEF<br>
                    MODULE: SystemIntegrityCheck<br>
                    REASON: ${r}<br>
                    <br>
                    IP_LOGGED: TRUE<br>
                    SESSION_TERMINATED
                </div>
            </div>
        `;
    };

    return (
        <footer className="w-full py-8 mt-auto bg-[#0c0229] border-t border-white/5 relative z-50">
            <div
                id="freedash-branding"
                className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center select-none cursor-default"
                data-testid="sys-core-footer"
            >
                {/* Dynamically Rendered - No Plaintext in Source */}
                <div className="text-gray-400 font-medium text-base mb-1">
                    {d1}
                </div>

                <div className="text-purple-400 text-sm font-semibold">
                    {d2}
                </div>
            </div>
        </footer>
    );
};

export default SystemIntegrityCheck;
