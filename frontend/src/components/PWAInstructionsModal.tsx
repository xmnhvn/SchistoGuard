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

  React.useEffect(() => {
    if (isOpen) {
      const getOS = () => {
        if (typeof window === 'undefined') return 'ios';
        const ua = window.navigator.userAgent.toLowerCase();
        if (/android/.test(ua)) return 'android';
        return 'ios';
      };
      setOsType(getOS());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)' }}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-md bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col"
        style={{ zIndex: 1000000, backgroundColor: '#ffffff', borderRadius: '28px', maxHeight: '90vh' }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500 border border-gray-100 shadow-sm"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
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
        <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {osType === 'ios' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg">1</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold mb-1">Open Safari</p>
                  <p className="text-gray-600 text-sm">Make sure you are viewing this page in the <span className="font-semibold">Safari</span> browser.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg">2</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-bold mb-1">Tap the Share Icon</p>
                  <p className="text-gray-800 text-sm">Look for the <span className="inline-flex items-center p-1 bg-gray-100 rounded mx-1"><Share className="w-4 h-4 text-schistoguard-teal" /></span> <span className="font-bold">Share</span> button at the bottom center of your screen.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg" style={{ borderRadius: '12px' }}>3</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold mb-1">Scroll & Select</p>
                  <p className="text-gray-600 text-sm">Scroll up through the options and tap on <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 mx-1" style={{ borderRadius: '6px' }}><PlusSquare className="w-4 h-4 mr-1 text-gray-700" /> <span className="font-semibold">Add to Home Screen</span></span>.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg">4</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold mb-1">Confirm Installation</p>
                  <p className="text-gray-600 text-sm">Ensure the name is <span className="font-semibold">SchistoGuard</span> and tap <span className="text-blue-500 font-bold">Add</span> in the top right corner.</p>
                </div>
              </div>
            </div>
          )}

          {osType === 'android' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg">1</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold mb-1">Open Chrome</p>
                  <p className="text-gray-600 text-sm">This works best in the <span className="font-semibold">Google Chrome</span> browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg">2</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold mb-1">Tap the Menu</p>
                  <p className="text-gray-600 text-sm">Tap the <span className="inline-flex items-center p-1 bg-gray-100 rounded mx-1"><MoreVertical className="w-4 h-4 text-gray-700" /></span> menu icon in the top right corner.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg">3</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold mb-1">Install App</p>
                  <p className="text-gray-600 text-sm">Select <span className="font-semibold text-schistoguard-teal">Install app</span> or <span className="font-semibold text-schistoguard-teal">Add to Home screen</span> from the list.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-schistoguard-teal/10 flex items-center justify-center text-schistoguard-teal font-bold text-lg">4</div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold mb-1">Confirm</p>
                  <p className="text-gray-600 text-sm">Tap <span className="font-semibold text-schistoguard-teal">Install</span> in the confirmation pop-up.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100 mt-auto">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-schistoguard-teal text-white font-bold font-poppins shadow-lg shadow-schistoguard-teal/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            style={{ fontFamily: "'Poppins', sans-serif", borderRadius: '16px' }}
          >
            Continue to Web Version
          </button>
        </div>
        <style>{`
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
