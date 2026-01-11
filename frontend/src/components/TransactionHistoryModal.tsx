
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { X, Calendar, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    balanceAfter: number;
    createdAt: string;
}

interface TransactionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ isOpen, onClose }) => {

    const { data: transactions, isLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const res = await api.get('/coins/history');
            return res.data as Transaction[];
        },
        enabled: isOpen,
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Calendar className="text-purple-400" size={20} />
                                    Transaction History
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">Recent coin activity on your account</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Loader2 className="animate-spin mb-3 text-purple-500" size={32} />
                                    <p>Loading transactions...</p>
                                </div>
                            ) : !transactions || transactions.length === 0 ? (
                                <div className="text-center py-20 text-gray-500">
                                    No transactions found.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10 text-xs text-gray-400 uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="p-4 pl-6">Description</th>
                                            <th className="p-4">Date</th>
                                            <th className="p-4 text-right pr-6">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="p-4 pl-6">
                                                    <div className="font-medium text-white">{tx.description}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Type: {tx.type}</div>
                                                </td>
                                                <td className="p-4 text-sm text-gray-400 whitespace-nowrap">
                                                    {formatDate(tx.createdAt)}
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    <div className={`flex items-center justify-end gap-1 font-bold ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {tx.type === 'credit' ? '+' : '-'}
                                                        {tx.amount.toFixed(2)}
                                                        {tx.type === 'credit' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                    </div>
                                                    <div className="text-xs text-gray-600 mt-0.5">
                                                        Bal: {tx.balanceAfter.toFixed(2)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/5 text-center text-xs text-gray-500">
                            Showing last 50 transactions
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TransactionHistoryModal;
