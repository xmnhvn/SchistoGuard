import React from 'react';
import { 
  X, 
  Share, 
  MoreVertical, 
  PlusSquare, 
  Smartphone, 
  Monitor, 
  ArrowUp,
  Download
} from 'lucide-react';
import { Button } from './ui/button';

interface PWAInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstructionsModal: React.FC<PWAInstructionsModalProps> = ({ isOpen, onClose }) => {
  const [osType, setOsType] = React.useState<'ios' | 'android' | 'desktop'>('ios');
  const [isClosing, setIsClosing] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(isOpen);

  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      const getOS = () => {
        if (typeof window === 'undefined') return 'ios';
        const ua = window.navigator.userAgent.toLowerCase();
        if (/android/.test(ua)) return 'android';
        return 'ios';
      };
      setOsType(getOS());
    } else {
      // Trigger closing animation if it was previously open
      if (shouldRender) {
        setIsClosing(true);
        const timer = setTimeout(() => {
          setShouldRender(false);
          setIsClosing(false);
        }, 400); // Match animation duration
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, shouldRender]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!shouldRender) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div 
        className={`relative w-full max-w-md bg-white shadow-2xl overflow-hidden flex flex-col ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
        style={{ zIndex: 1000000, backgroundColor: '#ffffff', borderRadius: '28px', maxHeight: '90vh' }}
      >
        {/* Close Button */}
        <button 
          onClick={handleClose} 
          style={{ 
            width: 32, height: 32, borderRadius: "50%", 
            border: "none", background: "#f3f4f6", 
            color: "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center", 
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          className="absolute top-4 right-4 z-50 hover:bg-[#e5e7eb] hover:text-slate-700 active:scale-95 transition-all outline-none"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        {/* Header */}
        <div className="p-6 sm:p-8 text-center relative border-b border-gray-100">
          <div className="mx-auto w-14 h-14 bg-schistoguard-teal/10 flex items-center justify-center mb-4" style={{ borderRadius: '16px' }}>
            <Smartphone className="w-8 h-8 text-schistoguard-teal" />
          </div>
          <h2 className="text-2xl font-bold text-schistoguard-navy" style={{ fontFamily: "'Poppins', sans-serif" }}>Install SchistoGuard</h2>
          <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: "'Poppins', sans-serif" }}>Get the full app experience on your device</p>
          
          {/* OS Switcher */}
          <div className="flex bg-gray-100 p-1 mt-6" style={{ borderRadius: '18px' }}>
            <button 
              onClick={() => setOsType('ios')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold transition-all duration-200 ${osType === 'ios' ? 'bg-white text-schistoguard-teal shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
              style={{ fontFamily: "'Poppins', sans-serif", borderRadius: '14px' }}
            >
              <Smartphone className="w-4 h-4" />
              iOS / Safari
            </button>
            <button 
              onClick={() => setOsType('android')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold transition-all duration-200 ${osType === 'android' ? 'bg-white text-schistoguard-teal shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
              style={{ fontFamily: "'Poppins', sans-serif", borderRadius: '14px' }}
            >
              <Smartphone className="w-4 h-4 rotate-180" />
              Android / Chrome
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div 
          className="p-6 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar"
          style={{ height: '440px', maxHeight: '50vh' }}
        >
          {osType === 'ios' && (
            <div className="space-y-8">
              {[
                {
                  id: 1,
                  title: 'Open Safari',
                  desc: <span>Make sure you are viewing this page in the <span className="font-bold">Safari</span> browser.</span>
                },
                {
                  id: 2,
                  title: 'Tap the Share Icon',
                  desc: <span>Look for the <span className="inline-flex items-center p-1 bg-gray-100 mx-1" style={{ borderRadius: '6px' }}><Share className="w-4 h-4 text-schistoguard-teal" /></span> <span className="font-bold">Share</span> button at the bottom center of your screen.</span>
                },
                {
                  id: 3,
                  title: 'Scroll & Select',
                  desc: <span>Scroll up through the options and tap on <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 mx-1" style={{ borderRadius: '6px' }}><PlusSquare className="w-4 h-4 mr-1 text-gray-700" /> <span className="font-bold">Add to Home Screen</span></span>.</span>
                },
                {
                  id: 4,
                  title: 'Confirm Installation',
                  desc: <span>Ensure the name is <span className="font-bold">SchistoGuard</span> and tap <span className="text-blue-500 font-bold font-poppins">Add</span> in the top right corner.</span>
                }
              ].map((step) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div 
                    className="flex-shrink-0 w-8 h-8 bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-sm" 
                    style={{ borderRadius: '10px' }}
                  >
                    {step.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center h-8">
                      <p className="text-gray-900 font-bold text-base" style={{ fontFamily: "'Poppins', sans-serif" }}>{step.title}</p>
                    </div>
                    <p className="text-gray-600 text-sm leading-snug" style={{ fontFamily: "'Poppins', sans-serif" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {osType === 'android' && (
            <div className="space-y-8">
              {[
                {
                  id: 1,
                  title: 'Open Chrome',
                  desc: <span>This works best in the <span className="font-bold">Google Chrome</span> browser.</span>
                },
                {
                  id: 2,
                  title: 'Tap the Menu',
                  desc: <span>Tap the <span className="inline-flex items-center p-1 bg-gray-100 mx-1" style={{ borderRadius: '6px' }}><MoreVertical className="w-4 h-4 text-gray-700" /></span> menu icon in the top right corner.</span>
                },
                {
                  id: 3,
                  title: 'Install App',
                  desc: <span>Select <span className="font-bold text-schistoguard-teal">Install app</span> or <span className="font-bold text-schistoguard-teal">Add to Home screen</span> from the list.</span>
                },
                {
                  id: 4,
                  title: 'Confirm',
                  desc: <span>Tap <span className="font-bold text-schistoguard-teal">Install</span> in the confirmation pop-up.</span>
                }
              ].map((step) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div 
                    className="flex-shrink-0 w-8 h-8 bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-sm" 
                    style={{ borderRadius: '10px' }}
                  >
                    {step.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center h-8">
                      <p className="text-gray-900 font-bold text-base" style={{ fontFamily: "'Poppins', sans-serif" }}>{step.title}</p>
                    </div>
                    <p className="text-gray-600 text-sm leading-snug" style={{ fontFamily: "'Poppins', sans-serif" }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100 mt-auto">
          <button 
            onClick={handleClose}
            className="w-full py-4 bg-schistoguard-teal text-white font-bold font-poppins shadow-lg shadow-schistoguard-teal/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            style={{ fontFamily: "'Poppins', sans-serif", borderRadius: '16px' }}
          >
            Continue to Web Version
          </button>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideDown {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(20px); opacity: 0; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
          }
          .animate-fade-out {
            animation: fadeOut 0.4s ease-in forwards;
          }
          .animate-slide-up {
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-slide-down {
            animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e5e7eb;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #d1d5db;
          }
        `}</style>
      </div>
    </div>
  );
};
