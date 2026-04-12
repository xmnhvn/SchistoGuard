import React, { type CSSProperties } from 'react';

const POPPINS = "'Poppins', sans-serif";

const SENSOR_CARD_STYLE = {
  // Card
  padding: "12px 16px 12px 16px",
  borderRadius: 16,
  height: 155,

  // Icon
  iconSize: 30,
  iconGap: 6,

  // Label
  labelColor: "#77ABB2",
  labelSize: 11,
  labelWeight: 500,
  labelGap: 3,

  // Value
  valueColor: "#6b7280",
  valueSize: 22,
  valueWeight: 600,

  // Unit
  unitColor: "#6b7280",
  unitSize: 12,
  unitWeight: 700,
  valueGap: 3,

  // Sub-text
  subColor: "#8E8B8B",
  subSize: 10,
  subWeight: 400,

  // Status dot
  dotSize: 8,
  dotInset: 14,
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface SensorMiniCardProps {
  label: string;
  iconSrc: string;
  value: string;
  unit?: string;
  sub?: string;
  dot: string;
  active: boolean;
  compact?: boolean;
  fadeIn?: boolean;
  style?: CSSProperties;
}

export function SensorMiniCard({
  label,
  iconSrc,
  value,
  unit,
  sub,
  dot,
  active,
  compact = false,
  fadeIn = false,
  style,
}: SensorMiniCardProps) {
  const S = SENSOR_CARD_STYLE;
  const cardHeight = compact ? "auto" : (S.height as any);
  const cardPad = compact ? "16px 18px 14px" : S.padding;
  const iconSize = compact ? 26 : S.iconSize;
  const iconGap = compact ? 4 : S.iconGap;
  const labelSize = compact ? 10 : S.labelSize;
  const labelGap = compact ? 3 : S.labelGap;
  const valueSize = compact ? 18 : S.valueSize;
  const unitSize = compact ? 10 : S.unitSize;
  const valueGap = compact ? 2 : S.valueGap;
  const subSize = compact ? 9 : S.subSize;
  const dotInset = compact ? 12 : S.dotInset;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: S.borderRadius,
        padding: cardPad,
        boxShadow: "0 2px 12px rgba(0,0,0,0.09)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: cardHeight,
        boxSizing: "border-box" as const,
        fontFamily: POPPINS,
        ...style,
      }}
    >
      {/* Status dot */}
      <span
        style={{
          position: "absolute",
          top: dotInset,
          right: dotInset,
          width: S.dotSize,
          height: S.dotSize,
          borderRadius: "50%",
          background: active ? dot : "#9ca3af",
          display: "inline-block",
          animation: active ? "dotPulse 3s ease-in-out infinite" : "none",
          transition: "background 0.4s",
          "--dot-glow": active ? hexToRgba(dot, 0.5) : "transparent",
        } as React.CSSProperties}
      />

      {/* Icon */}
      <img
        src={iconSrc}
        alt={label}
        style={{
          width: iconSize,
          height: iconSize,
          objectFit: "contain",
          marginBottom: iconGap
        }}
      />

      {/* Label */}
      <p
        style={{
          margin: `0 0 ${labelGap}px`,
          fontFamily: POPPINS,
          fontWeight: S.labelWeight,
          fontSize: labelSize,
          color: S.labelColor,
          lineHeight: 1.2,
        }}
      >
        {label}
      </p>

      {/* Value + Unit + Sub */}
      <div style={{ animation: fadeIn ? 'cardDataFadeIn 0.8s ease both' : undefined }}>
        <p style={{
          margin: `0 0 ${valueGap}px`,
          lineHeight: 1.2,
          display: "flex",
          alignItems: "baseline",
          gap: 3
        }}>
          <span
            style={{
              fontFamily: POPPINS,
              fontWeight: S.valueWeight,
              fontSize: valueSize,
              color: S.valueColor
            }}
          >
            {value}
          </span>
          {unit && (
            <span
              style={{
                fontFamily: POPPINS,
                fontWeight: S.unitWeight,
                fontSize: unitSize,
                color: S.unitColor
              }}
            >
              {" "}{unit}
            </span>
          )}
        </p>

        {sub && (
          <p
            style={{
              margin: 0,
              fontFamily: POPPINS,
              fontWeight: S.subWeight,
              fontSize: subSize,
              color: S.subColor,
              lineHeight: 1.3,
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default SensorMiniCard;
