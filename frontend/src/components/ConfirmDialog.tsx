import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}: ConfirmDialogProps) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const typeColors = {
        danger: {
            icon: 'text-red-400',
            iconBg: 'bg-red-500/20',
            border: 'border-red-500/30',
            button: 'from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'
        },
        warning: {
            icon: 'text-yellow-400',
            iconBg: 'bg-yellow-500/20',
            border: 'border-yellow-500/30',
            button: 'from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600'
        },
        info: {
            icon: 'text-blue-400',
            iconBg: 'bg-blue-500/20',
            border: 'border-blue-500/30',
            button: 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600'
        }
    };

    const colors = typeColors[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Dialog */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', duration: 0.3 }}
                            className={`bg-[#1a0f2e] border ${colors.border} rounded-2xl shadow-2xl max-w-md w-full overflow-hidden`}
                        >
                            {/* Header */}
                            <div className="relative p-6 border-b border-white/10">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>

                                <div className="flex items-start gap-4">
                                    <div className={`p-3 ${colors.iconBg} rounded-xl`}>
                                        <AlertTriangle size={24} className={colors.icon} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-1">
                                            {title}
                                        </h3>
                                        <p className="text-gray-400 text-sm">
                                            {message}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 flex gap-3">
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition"
                                >
                                    {cancelText}
                                </motion.button>
                                <motion.button
                                    onClick={handleConfirm}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex-1 px-4 py-3 bg-gradient-to-r ${colors.button} text-white rounded-xl font-bold shadow-lg transition`}
                                >
                                    {confirmText}
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDialog;
