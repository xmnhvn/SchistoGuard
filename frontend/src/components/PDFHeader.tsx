import React from 'react';
import { formatAddress } from '../utils/addressFormat';

const POPPINS = "'Poppins', sans-serif";

interface PDFHeaderProps {
  dynamicSiteName?: string | null;
  siteName?: string | null;
  address?: string | null;
  barangay?: string | null;
  logoNudge?: number;
}

export const PDFHeader: React.FC<PDFHeaderProps> = ({
  dynamicSiteName,
  siteName,
  address,
  barangay,
  logoNudge = 0
}) => {
  const displaySiteName = dynamicSiteName || siteName || 'System Summary Report';
  const displayAddress = formatAddress({
    fullAddress: address,
    locality: address,
    barangay,
    fallback: 'Davao City, Davao Region, Philippines',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '100%', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 36, transform: `translateY(${logoNudge}px)` }}>
          <img src="/LOGO.png?v=3" alt="SchistoGuard Logo" style={{ height: 30, width: 'auto', display: 'block' }} />
        </div>
        <h2 style={{ margin: '-1px 0 0 0', fontSize: 28, color: '#357d86', fontFamily: POPPINS, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: '30px' }}>SchistoGuard</h2>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontFamily: POPPINS, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, lineHeight: 1 }}>ENVIRONMENTAL MONITORING PDF REPORT</p>
      <p style={{ margin: 0, fontSize: 16, color: '#1a2a3a', fontFamily: POPPINS, fontWeight: 800, lineHeight: 1 }}>{displaySiteName}</p>
      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontFamily: POPPINS, fontWeight: 500, lineHeight: 1.4, maxWidth: '85%' }}>{displayAddress}</p>
    </div>
  );
};
