import React from 'react';
import { AlertTriangle, CheckCircle, Info, X, MapPin, Droplets, Activity } from 'lucide-react';
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

export const CTAButton: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ariaLabel 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-schistoguard-teal';
  
  const variantClasses = {
    primary: 'bg-schistoguard-teal text-white hover:bg-opacity-90 hover:scale-105 hover:shadow-lg',
    secondary: 'border-2 border-schistoguard-teal text-schistoguard-teal bg-white hover:bg-schistoguard-teal hover:text-white hover:scale-105 hover:shadow-lg',
    tertiary: 'text-schistoguard-teal hover:text-schistoguard-navy hover:underline'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};
interface BadgeProps {
  children: React.ReactNode;
  variant: 'info' | 'warning' | 'critical' | 'safe';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ children, variant, size = 'md' }) => {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';
  
  const variantClasses = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
    safe: 'bg-green-100 text-green-800'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };
  
  const icons = {
    info: <Info className="w-3 h-3 mr-1" />,
    warning: <AlertTriangle className="w-3 h-3 mr-1" />,
    critical: <AlertTriangle className="w-3 h-3 mr-1" />,
    safe: <CheckCircle className="w-3 h-3 mr-1" />
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {icons[variant]}
      {children}
    </span>
  );
};
interface TrustBadgeProps {
  icon: React.ReactNode;
  label: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ icon, label }) => {
  return (
    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white bg-opacity-90 rounded-full text-sm text-gray-700 border border-gray-200">
      {icon}
      <span>{label}</span>
    </div>
  );
};
interface AlertOverlayProps {
  level: 'warning' | 'critical';
  title: string;
  details: string;
  timestamp: string;
  onAcknowledge?: () => void;
  onViewSite?: () => void;
}

export const AlertOverlay: React.FC<AlertOverlayProps> = ({
  level,
  title,
  details,
  timestamp,
  onAcknowledge,
  onViewSite
}) => {
  const levelColors = {
    warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
    critical: 'border-red-500 bg-red-50 text-red-800'
  };

  return (
    <div className={`rounded-lg border-l-4 p-4 shadow-lg bg-white ${levelColors[level]} animate-pulse`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${level === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
            <span className="font-medium text-sm">{title}</span>
          </div>
          <p className="text-xs text-gray-700 mb-2">{details}</p>
          <div className="text-xs text-gray-500">{timestamp}</div>
        </div>
      </div>
      
      <div className="flex space-x-2 mt-3">
        {onAcknowledge && (
          <button 
            onClick={onAcknowledge}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
          >
            Acknowledge
          </button>
        )}
        {onViewSite && (
          <button 
            onClick={onViewSite}
            className="px-3 py-1 bg-schistoguard-teal text-white rounded text-xs hover:bg-opacity-90 transition-colors"
          >
            View Site
          </button>
        )}
      </div>
    </div>
  );
};
interface SiteSpotProps {
  siteName: string;
  barangay: string;
  readings: {
    turbidity: number;
    temperature: number;
    ph: number;
    uv: number;
  };
  riskLevel: 'safe' | 'warning' | 'critical';
  timestamp: string;
  onViewDetails?: () => void;
}

export const SiteSpotCard: React.FC<SiteSpotProps> = ({
  siteName,
  barangay,
  readings,
  riskLevel,
  timestamp,
  onViewDetails
}) => {
  const riskColors = {
    safe: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    critical: 'text-red-600 bg-red-100'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{siteName}</h4>
          <p className="text-sm text-gray-600">{barangay}</p>
        </div>
        <StatusBadge variant={riskLevel} size="sm">
          {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
        </StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex items-center space-x-1">
          <Droplets className="w-3 h-3 text-blue-500" />
          <span className="text-gray-600">Turbidity: {readings.turbidity} NTU</span>
        </div>
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3 text-orange-500" />
          <span className="text-gray-600">Temp: {readings.temperature}°C</span>
        </div>
        <div className="text-gray-600">pH: {readings.ph}</div>
        <div className="text-gray-600">UV: {readings.uv}</div>
      </div>

      <div className="h-6 bg-gray-100 rounded mb-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent transform -skew-x-12 animate-pulse"></div>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{timestamp}</span>
        <button
          onClick={onViewDetails}
          className="text-xs px-3 py-1 rounded border border-schistoguard-teal text-schistoguard-teal hover:bg-schistoguard-teal hover:text-white transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
};
interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Array<{
    id: string;
    title: string;
    details: string;
    level: 'warning' | 'critical';
    timestamp: string;
  }>;
  onAcknowledge?: (id: string) => void;
  onViewSite?: (id: string) => void;
}

export const AlertsQuickviewModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledge,
  onViewSite
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium">Recent Alerts</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close alerts modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          {alerts.map(alert => (
            <AlertOverlay
              key={alert.id}
              level={alert.level}
              title={alert.title}
              details={alert.details}
              timestamp={alert.timestamp}
              onAcknowledge={onAcknowledge ? () => onAcknowledge(alert.id) : undefined}
              onViewSite={onViewSite ? () => onViewSite(alert.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const SchistoIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C13.1 2 14 2.9 14 4V6C15.1 6 16 6.9 16 8V10C17.1 10 18 10.9 18 12C18 13.1 17.1 14 16 14V16C16 17.1 15.1 18 14 18V20C14 21.1 13.1 22 12 22C10.9 22 10 21.1 10 20V18C8.9 18 8 17.1 8 16V14C6.9 14 6 13.1 6 12C6 10.9 6.9 10 8 10V8C8 6.9 8.9 6 10 6V4C10 2.9 10.9 2 12 2Z"/>
  </svg>
);

export const OpenAccessIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);

export const SensorIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <circle cx="8" cy="8" r="2"/>
    <path d="M14 8h2"/>
    <path d="M14 12h2"/>
    <path d="M14 16h2"/>
    <path d="M8 12h2"/>
    <path d="M8 16h2"/>
  </svg>
);