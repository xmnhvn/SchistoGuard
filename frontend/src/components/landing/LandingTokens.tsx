import React from 'react';

export const tokens = {
  colors: {
    primary: {
      teal: '#007E88',
      green: '#28A745',
      coral: '#FF6B6B',
      navy: '#0F2135'
    },
    
    status: {
      safe: '#28A745',
      warning: '#FFC107',
      critical: '#FF6B6B'
    },
    
    neutral: {
      white: '#FFFFFF',
      gray50: '#F8F9FA',
      gray100: '#F3F4F6',
      gray200: '#E5E7EB',
      gray300: '#D1D5DB',
      gray400: '#9CA3AF',
      gray500: '#6B7280',
      gray600: '#4B5563',
      gray700: '#374151',
      gray800: '#1F2937',
      gray900: '#111827'
    }
  },
  
  typography: {
    display: {
      fontSize: '3.5rem',
      fontWeight: '700',
      lineHeight: '1.1',
      letterSpacing: '-0.02em'
    },
    h1: {
      fontSize: '2.5rem',
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.01em'
    },
    h2: {
      fontSize: '2rem',
      fontWeight: '600',
      lineHeight: '1.25',
      letterSpacing: '-0.01em'
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: '600',
      lineHeight: '1.33',
      letterSpacing: '0'
    },
    body: {
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0'
    },
    small: {
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.43',
      letterSpacing: '0'
    }
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  }
};

export const TokensDisplay: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4">Design Tokens</h2>

        <div className="mb-6">
          <h3 className="mb-3">Colors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div>
              <h4 className="mb-2">Primary</h4>
              <div className="space-y-2">
                {Object.entries(tokens.colors.primary).map(([name, value]) => (
                  <div key={name} className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded border" 
                      style={{ backgroundColor: value }}
                    ></div>
                    <div className="text-sm">
                      <div className="font-medium">{name}</div>
                      <div className="text-gray-500">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="mb-2">Status</h4>
              <div className="space-y-2">
                {Object.entries(tokens.colors.status).map(([name, value]) => (
                  <div key={name} className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded border" 
                      style={{ backgroundColor: value }}
                    ></div>
                    <div className="text-sm">
                      <div className="font-medium">{name}</div>
                      <div className="text-gray-500">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="mb-3">Typography</h3>
          <div className="space-y-4">
            {Object.entries(tokens.typography).map(([name, styles]) => (
              <div key={name} className="p-4 border rounded">
                <div 
                  className="mb-2" 
                  style={styles}
                >
                  {name} - The quick brown fox jumps over the lazy dog
                </div>
                <div className="text-sm text-gray-500">
                  Size: {styles.fontSize} | Weight: {styles.fontWeight} | Line Height: {styles.lineHeight}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3">Spacing</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(tokens.spacing).map(([name, value]) => (
              <div key={name} className="text-sm">
                <div className="font-medium">{name}</div>
                <div className="text-gray-500">{value}</div>
                <div 
                  className="bg-blue-200 mt-1" 
                  style={{ height: '4px', width: value }}
                ></div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="mb-3">Shadows</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tokens.shadows).map(([name, value]) => (
              <div key={name} className="text-sm">
                <div 
                  className="w-16 h-16 bg-white rounded mb-2" 
                  style={{ boxShadow: value }}
                ></div>
                <div className="font-medium">{name}</div>
                <div className="text-gray-500 text-xs">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const cssVariables = `
:root {
  /* Colors */
  --color-primary-teal: ${tokens.colors.primary.teal};
  --color-primary-green: ${tokens.colors.primary.green};
  --color-primary-coral: ${tokens.colors.primary.coral};
  --color-primary-navy: ${tokens.colors.primary.navy};
  
  /* Status */
  --color-status-safe: ${tokens.colors.status.safe};
  --color-status-warning: ${tokens.colors.status.warning};
  --color-status-critical: ${tokens.colors.status.critical};
  
  /* Typography */
  --font-size-display: ${tokens.typography.display.fontSize};
  --font-size-h1: ${tokens.typography.h1.fontSize};
  --font-size-h2: ${tokens.typography.h2.fontSize};
  --font-size-h3: ${tokens.typography.h3.fontSize};
  --font-size-body: ${tokens.typography.body.fontSize};
  --font-size-small: ${tokens.typography.small.fontSize};
  
  /* Spacing */
  --spacing-xs: ${tokens.spacing.xs};
  --spacing-sm: ${tokens.spacing.sm};
  --spacing-md: ${tokens.spacing.md};
  --spacing-lg: ${tokens.spacing.lg};
  --spacing-xl: ${tokens.spacing.xl};
  --spacing-2xl: ${tokens.spacing['2xl']};
  --spacing-3xl: ${tokens.spacing['3xl']};
  --spacing-4xl: ${tokens.spacing['4xl']};
  
  /* Shadows */
  --shadow-sm: ${tokens.shadows.sm};
  --shadow-md: ${tokens.shadows.md};
  --shadow-lg: ${tokens.shadows.lg};
  --shadow-xl: ${tokens.shadows.xl};
  --shadow-2xl: ${tokens.shadows['2xl']};
}
`;