import { useState } from "react";
import { useNavigate } from "react-router";
import { Radio } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LiveStreamModal from "./LiveStreamModal";

export function BroadcastFab() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartStream = (settings: any) => {
    setIsModalOpen(false);
    navigate("/live/stream123");
  };

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-gradient-to-br from-[#0891B2] to-[#0d9488] rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-[#0891B2]/40 group"
        >
          <div className="flex flex-col items-center">
            <Radio size={24} className="group-hover:animate-pulse" />
            <span className="text-[8px] font-black uppercase mt-0.5 tracking-tighter">Start</span>
          </div>
        </motion.button>
      </div>

      <LiveStreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStart={handleStartStream}
      />
    </>
  );
}
