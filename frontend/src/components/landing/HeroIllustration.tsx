import React from 'react';

export const HeroIllustration: React.FC = () => {
  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px]">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-blue-200 rounded-lg overflow-hidden">
        
        <svg 
          className="absolute bottom-0 w-full h-32 text-green-800 opacity-20" 
          viewBox="0 0 400 128" 
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M0,128 L0,80 L50,60 L80,70 L120,50 L160,65 L200,45 L240,60 L280,40 L320,55 L360,35 L400,50 L400,128 Z"/>
        </svg>

        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300 opacity-70"></div>
        <div className="absolute bottom-0 left-0 right-0 h-20 overflow-hidden">
          <div className="animate-pulse">
            <svg 
              className="absolute bottom-0 w-full h-8 text-blue-500 opacity-50" 
              viewBox="0 0 400 32" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M0,16 Q50,8 100,16 T200,16 T300,16 T400,16 L400,32 L0,32 Z">
                <animate 
                  attributeName="d" 
                  values="M0,16 Q50,8 100,16 T200,16 T300,16 T400,16 L400,32 L0,32 Z;M0,16 Q50,24 100,16 T200,16 T300,16 T400,16 L400,32 L0,32 Z;M0,16 Q50,8 100,16 T200,16 T300,16 T400,16 L400,32 L0,32 Z" 
                  dur="3s" 
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          </div>
        </div>
        <div className="absolute bottom-16 right-20 lg:right-32">
          <div className="relative">
            <div className="w-2 h-16 bg-gray-600 mx-auto"></div>
            <div className="w-8 h-6 bg-white border-2 border-gray-400 rounded shadow-md -mt-2 relative">
              <div className="w-2 h-2 bg-green-500 rounded-full absolute top-1 left-1 animate-pulse"></div>
            </div>
            <div className="absolute -top-4 left-4">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-12 left-16 lg:left-24">
          <div className="relative">
            <div className="w-8 h-12 bg-white rounded-t-full border-2 border-blue-600 flex items-center justify-center">
              <div className="w-4 h-2 bg-blue-600 rounded"></div>
            </div>
            <div className="w-2 h-2 bg-yellow-600 rounded-full mx-auto -mt-8"></div>
          </div>
        </div>
        <div className="absolute bottom-12 left-32 lg:left-48">
          <div className="relative">
            <div className="w-7 h-11 bg-green-100 rounded-t-full border-2 border-green-600 flex items-center justify-center">
              <div className="w-3 h-2 bg-green-600 rounded"></div>
            </div>
            <div className="w-2 h-2 bg-yellow-800 rounded-full mx-auto -mt-8"></div>
          </div>
        </div>
        <div className="absolute bottom-12 left-44 lg:left-60">
          <div className="relative">
            <div className="w-5 h-8 bg-yellow-100 rounded-t-full border-2 border-yellow-600 flex items-center justify-center">
              <div className="w-2 h-1 bg-yellow-600 rounded"></div>
            </div>
            <div className="w-1.5 h-1.5 bg-yellow-800 rounded-full mx-auto -mt-6"></div>
          </div>
        </div>

        <div className="absolute top-8 right-8 lg:right-16 bg-white rounded-full p-2 shadow-lg border-2 border-orange-300">
          <div className="w-6 h-6 relative">
            <div className="w-4 h-1 bg-orange-500 rounded-full absolute top-2 left-1 transform rotate-12"></div>
            <div className="w-3 h-0.5 bg-orange-600 rounded-full absolute top-3 left-1.5 transform -rotate-12"></div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-20 h-12">
          <svg className="w-full h-full text-green-600 opacity-60" viewBox="0 0 80 48" fill="currentColor" aria-hidden="true">
            <circle cx="10" cy="40" r="8"/>
            <circle cx="25" cy="35" r="6"/>
            <circle cx="40" cy="38" r="7"/>
            <circle cx="55" cy="42" r="5"/>
            <circle cx="70" cy="40" r="6"/>
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-16 h-10">
          <svg className="w-full h-full text-green-600 opacity-60" viewBox="0 0 64 40" fill="currentColor" aria-hidden="true">
            <circle cx="50" cy="32" r="6"/>
            <circle cx="35" cy="30" r="5"/>
            <circle cx="20" cy="35" r="4"/>
          </svg>
        </div>
      </div>
      <div className="absolute top-4 left-4 lg:top-6 lg:left-6 bg-white rounded-lg shadow-lg border-l-4 border-red-500 p-3 max-w-xs animate-pulse">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-xs font-medium text-red-700">Critical Alert</span>
        </div>
        <p className="text-xs text-gray-700 mt-1">
          Turbidity 18.2 NTU — Barangay San Miguel River
        </p>
        <div className="text-xs text-gray-500 mt-1">2025-09-15 14:31</div>
      </div>
    </div>
  );
};