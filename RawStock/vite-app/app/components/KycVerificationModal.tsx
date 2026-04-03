import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShieldCheck, CreditCard, Camera, CheckCircle2, AlertTriangle, Fingerprint } from "lucide-react";
import { AppButton } from "./ui/AppButton";

interface KycVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export default function KycVerificationModal({ isOpen, onClose, onVerified }: KycVerificationModalProps) {
  const [step, setStep] = useState<"intro" | "camera" | "processing" | "success">("intro");

  const startVerification = () => {
    setStep("camera");
  };

  const handleCapture = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
    }, 3000);
  };

  const handleFinish = () => {
    onVerified();
    onClose();
    setStep("intro");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#334155] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-[#0891B2]" size={24} />
                  <h2 className="font-black text-white italic tracking-tighter">IDENTITY VERIFICATION</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {step === "intro" && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-4">
                    <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                    <p className="text-xs text-slate-300 leading-relaxed">
                      資金の引き出しや高額取引を行うには、マイナンバーカードによる本人確認（KYC）が必須です。
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-2xl border border-slate-700">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-[#0891B2]">
                        <CreditCard size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">マイナンバーカード</p>
                        <p className="text-[10px] text-slate-400">厚みと顔写真の確認を行います</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-2xl border border-slate-700">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-[#0891B2]">
                        <Camera size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">顔認証</p>
                        <p className="text-[10px] text-slate-400">リアルタイムでの本人確認を行います</p>
                      </div>
                    </div>
                  </div>

                  <AppButton fullWidth size="xl" onClick={startVerification}>
                    Start KYC Process
                  </AppButton>
                </motion.div>
              )}

              {step === "camera" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6 text-center"
                >
                  <div className="aspect-[3/4] bg-black rounded-3xl relative overflow-hidden border-2 border-[#0891B2]/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-64 h-80 border-2 border-dashed border-white/30 rounded-[40px] flex items-center justify-center">
                        <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Align your face</p>
                      </div>
                    </div>
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                      <button 
                        onClick={handleCapture}
                        className="w-16 h-16 bg-white rounded-full border-4 border-[#0891B2] flex items-center justify-center shadow-xl"
                      >
                        <div className="w-12 h-12 bg-white rounded-full border border-slate-300" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">明るい場所で、顔が枠に収まるようにしてください。</p>
                </motion.div>
              )}

              {step === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center space-y-6"
                >
                  <div className="relative flex justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="w-24 h-24 border-4 border-[#0891B2]/20 border-t-[#0891B2] rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Fingerprint size={32} className="text-[#0891B2] animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-white mb-2 italic tracking-tighter uppercase">Analyzing Identity...</h3>
                    <p className="text-xs text-slate-400">公的なデータベースと照合しています。<br />少々お待ちください。</p>
                  </div>
                </motion.div>
              )}

              {step === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-6"
                >
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
                      <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-white mb-2 italic tracking-tighter uppercase">VERIFICATION SUCCESSFUL</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      マイナンバーによる本人確認が完了しました。<br />
                      全ての制限が解除され、出金が可能になりました。
                    </p>
                  </div>
                  <AppButton fullWidth variant="success" size="lg" onClick={handleFinish}>
                    Complete
                  </AppButton>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
