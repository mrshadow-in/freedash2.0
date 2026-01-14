import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useAdStore } from '../store/adStore';

const GlobalAdminControls = () => {
    const { user } = useAuthStore();
    const { setVisualMode } = useAdStore();

    // Only render for admins
    if (user?.role !== 'admin') return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed bottom-6 right-6 z-[9999]"
        >
            <button
                onClick={() => setVisualMode(true)}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
            >
                <span>🎯</span> Place Ad Visually
            </button>
        </motion.div>
    );
};

export default GlobalAdminControls;
