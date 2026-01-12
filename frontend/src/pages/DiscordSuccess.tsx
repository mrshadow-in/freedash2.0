import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Disc, Check } from 'lucide-react';

const DiscordSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuthStore();
    const [status, setStatus] = useState('Processing...');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const refresh = params.get('refresh');

        if (token && refresh) {
            // Login flow
            login(token, refresh);
            toast.success('Successfully logged in with Discord!');
            navigate('/');
        } else {
            // Linking flow (backend might render a success page or redirect here without tokens if it was just a link action)
            // But usually OAuth link redirects back to this or Account page.
            // If we are here without tokens, maybe we just display closed window text?

            // Assume if we are here, it's a success
            setStatus('Discord account successfully linked!');

            // Close window after 2 seconds if opened as popup, or redirect to account
            setTimeout(() => {
                if (window.opener) {
                    window.close();
                } else {
                    navigate('/account');
                }
            }, 2000);
        }
    }, [location, login, navigate]);

    return (
        <div className="min-h-screen bg-[#0c0229] flex items-center justify-center text-white">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md w-full mx-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Success!</h2>
                <p className="text-gray-400">{status}</p>
            </div>
        </div>
    );
};

export default DiscordSuccess;
