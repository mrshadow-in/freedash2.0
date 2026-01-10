import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CreditCard, Upload, AlertCircle, Calendar, Target, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSlotId?: string;
}

const steps = [
    { id: 1, title: 'Select Slot', icon: <Target size={20} /> },
    { id: 2, title: 'Duration', icon: <Calendar size={20} /> },
    { id: 3, title: 'Creative', icon: <Upload size={20} /> },
    { id: 4, title: 'Payment', icon: <CreditCard size={20} /> },
];

const slotOptions = [
    { id: 'top-leaderboard', name: 'Top Banner', size: '728x90', price: 1500, description: 'Highest visibility at the top of the dashboard' },
    { id: 'middle-banner', name: 'Middle Banner', size: '468x60', price: 1000, description: 'Integrated between server cards' },
    { id: 'sidebar-square', name: 'Sidebar Square', size: '300x100', price: 700, description: 'Compact placement for sidebar or footer' },
];

const durationOptions = [
    { days: 7, label: '7 Days', discount: 0 },
    { days: 15, label: '15 Days', discount: 5 },
    { days: 30, label: '30 Days', discount: 15 },
];

const AdPurchaseModal: React.FC<AdPurchaseModalProps> = ({ isOpen, onClose, initialSlotId }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedSlot, setSelectedSlot] = useState(initialSlotId || '');
    const [duration, setDuration] = useState(7);
    const [formData, setFormData] = useState({
        title: '',
        redirectUrl: '',
        banner: null as File | null,
        bannerUrl: '',
    });

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.match('image.*')) {
                toast.error('Please upload an image or GIF');
                return;
            }
            setFormData({ ...formData, banner: file, bannerUrl: URL.createObjectURL(file) });
        }
    };

    const calculateTotal = () => {
        const slot = slotOptions.find(s => s.id === selectedSlot);
        if (!slot) return 0;
        const basePrice = slot.price;
        const opt = durationOptions.find(d => d.days === duration);
        const multiplier = duration / 7;
        const total = basePrice * multiplier;
        const discount = total * ((opt?.discount || 0) / 100);
        return Math.round(total - discount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative bg-[#130b2e] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white">Purchase Ad Spot</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Reach thousands of active users on Freedash</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="flex px-8 py-4 bg-black/20 border-b border-white/5 overflow-x-auto no-scrollbar">
                    {steps.map((step, i) => (
                        <React.Fragment key={step.id}>
                            <div className={`flex items-center gap-2 shrink-0 ${currentStep >= step.id ? 'text-purple-400' : 'text-gray-500'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${currentStep >= step.id ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
                                    {currentStep > step.id ? <Check size={16} /> : step.icon}
                                </div>
                                <span className="text-xs font-bold whitespace-nowrap">{step.title}</span>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="mx-4 h-px w-12 bg-white/10 self-center shrink-0" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <h3 className="text-lg font-bold text-white mb-2">Choose Ad Placement</h3>
                                <div className="grid gap-3">
                                    {slotOptions.map(slot => (
                                        <button
                                            key={slot.id}
                                            onClick={() => setSelectedSlot(slot.id)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${selectedSlot === slot.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-white">{slot.name}</span>
                                                <span className="text-purple-400 font-bold">₹{slot.price} / 7d</span>
                                            </div>
                                            <div className="text-xs text-gray-400 mb-2">{slot.description}</div>
                                            <div className="text-[10px] text-gray-500 font-mono bg-black/30 w-fit px-2 py-0.5 rounded uppercase tracking-widest">{slot.size}</div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <Target size={24} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white uppercase tracking-wider">Placement Selected</div>
                                        <div className="text-purple-300 font-medium">{slotOptions.find(s => s.id === selectedSlot)?.name} ({slotOptions.find(s => s.id === selectedSlot)?.size})</div>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2">Select Duration</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {durationOptions.map(opt => (
                                        <button
                                            key={opt.days}
                                            onClick={() => setDuration(opt.days)}
                                            className={`p-6 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-2 ${duration === opt.days ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                                        >
                                            <span className="text-lg font-bold text-white">{opt.label}</span>
                                            {opt.discount > 0 && (
                                                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">SAVE {opt.discount}%</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="grid gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Upload Banner (IMG/GIF)</label>
                                        <div
                                            onClick={() => document.getElementById('ad-banner-upload')?.click()}
                                            className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-white/5 hover:bg-white/10 cursor-pointer transition-all hover:border-purple-500/30 overflow-hidden relative"
                                        >
                                            {formData.bannerUrl ? (
                                                <img src={formData.bannerUrl} alt="Preview" className="max-w-full max-h-40 rounded-lg shadow-xl" />
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                                                        <Upload size={24} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold text-white">Click to upload banner</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">Recommended size: {slotOptions.find(s => s.id === selectedSlot)?.size}</p>
                                                    </div>
                                                </>
                                            )}
                                            <input id="ad-banner-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-base font-medium text-gray-400 mb-2">Destination URL</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-purple-400 transition-colors">
                                                    <ExternalLink size={18} />
                                                </div>
                                                <input
                                                    type="url"
                                                    value={formData.redirectUrl}
                                                    onChange={e => setFormData({ ...formData, redirectUrl: e.target.value })}
                                                    placeholder="https://yourwebsite.com"
                                                    className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white outline-none focus:border-purple-500 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-base font-medium text-gray-400 mb-2">Ad Title (Optional)</label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="e.g. Join our Discord Community"
                                                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-purple-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {currentStep === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-6 rounded-2xl border border-white/10">
                                    <h4 className="font-bold text-white mb-4 flex items-center gap-2 underline decoration-purple-500/50 underline-offset-4">Order Summary</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Ad Slot</span>
                                            <span className="text-white font-medium">{slotOptions.find(s => s.id === selectedSlot)?.name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Duration</span>
                                            <span className="text-white font-medium">{duration} Days</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Daily Average</span>
                                            <span className="text-white font-medium">₹{Math.round(calculateTotal() / duration)}</span>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                            <span className="text-lg font-bold text-white">Total Amount</span>
                                            <span className="text-2xl font-bold text-purple-400 tracking-tight">₹{calculateTotal()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10 flex gap-3">
                                    <AlertCircle size={20} className="text-yellow-500 shrink-0" />
                                    <p className="text-[11px] text-yellow-500/80 leading-relaxed font-medium">Your ad will be reviewed by administrators before going live. If rejected, coins will be refunded.</p>
                                </div>

                                <div className="grid gap-3">
                                    <button onClick={() => toast.success('Redirecting to gateway...')} className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-gray-200 transition-all">
                                        <CreditCard size={20} />
                                        Pay with Card / UPI
                                    </button>
                                    <button onClick={() => toast.success('Mock successful!')} className="w-full py-4 bg-purple-600/20 text-purple-400 border border-purple-500/30 font-bold rounded-xl hover:bg-purple-600/30 transition-all">
                                        Pay with Store Coins (Mock)
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Navigation */}
                <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-between">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className="px-6 py-2.5 rounded-lg font-bold text-gray-400 hover:text-white disabled:opacity-0 transition-opacity"
                    >
                        Back
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={(currentStep === 1 && !selectedSlot) || (currentStep === 3 && (!formData.banner || !formData.redirectUrl)) || currentStep === 4}
                        className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold text-white shadow-lg shadow-purple-500/20 hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {currentStep === 4 ? 'Confirm Order' : 'Continue'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AdPurchaseModal;
