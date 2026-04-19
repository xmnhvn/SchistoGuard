export type SiteRiskThresholds = {
  temperature: {
    highMin: number;
    highMax: number;
    moderateLowMin: number;
    moderateLowMax: number;
    moderateHighMin: number;
    moderateHighMax: number;
  };
  ph: {
    highMin: number;
    highMax: number;
    moderateLowMin: number;
    moderateLowMax: number;
    moderateHighMin: number;
    moderateHighMax: number;
  };
  turbidity: {
    highMax: number;
    moderateMin: number;
    moderateMax: number;
  };
};

export const DEFAULT_SITE_RISK_THRESHOLDS: SiteRiskThresholds = {
  temperature: {
    highMin: 22,
    highMax: 30,
    moderateLowMin: 20,
    moderateLowMax: 22,
    moderateHighMin: 30,
    moderateHighMax: 35,
  },
  ph: {
    highMin: 6.5,
    highMax: 8,
    moderateLowMin: 6,
    moderateLowMax: 6.5,
    moderateHighMin: 8,
    moderateHighMax: 8.5,
  },
  turbidity: {
    highMax: 5,
    moderateMin: 5,
    moderateMax: 15,
  },
};

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeSiteRiskThresholds(value: unknown): SiteRiskThresholds {
  const base: SiteRiskThresholds = JSON.parse(JSON.stringify(DEFAULT_SITE_RISK_THRESHOLDS));
  const source = value && typeof value === 'object' ? value as Record<string, any> : {};

  (['temperature', 'ph', 'turbidity'] as const).forEach((sensorKey) => {
    const sensorSource = source[sensorKey];
    if (!sensorSource || typeof sensorSource !== 'object') return;

    Object.keys(base[sensorKey]).forEach((field) => {
      const nextValue = toFiniteNumber(sensorSource[field]);
      if (nextValue !== null) {
        (base[sensorKey] as any)[field] = nextValue;
      }
    });
  });

  return base;
}

export function getSensorStatus(
  type: 'temperature' | 'turbidity' | 'ph',
  value: number,
  thresholds?: SiteRiskThresholds | null,
): { label: string; color: string; severity: 'critical' | 'warning' | 'safe' } {
  const config = normalizeSiteRiskThresholds(thresholds);

  if (type === 'temperature') {
    if (value >= config.temperature.highMin && value <= config.temperature.highMax) {
      return { label: 'Needs Attention', color: '#ef4444', severity: 'critical' };
    }
    if (
      (value >= config.temperature.moderateLowMin && value < config.temperature.moderateLowMax) ||
      (value > config.temperature.moderateHighMin && value <= config.temperature.moderateHighMax)
    ) {
      return { label: 'Watch Zone', color: '#E7B213', severity: 'warning' };
    }
    return { label: 'Safe', color: '#22c55e', severity: 'safe' };
  }

  if (type === 'turbidity') {
    if (value < config.turbidity.highMax) {
      return { label: 'Needs Attention', color: '#ef4444', severity: 'critical' };
    }
    if (value >= config.turbidity.moderateMin && value <= config.turbidity.moderateMax) {
      return { label: 'Watch Zone', color: '#E7B213', severity: 'warning' };
    }
    return { label: 'Safe', color: '#22c55e', severity: 'safe' };
  }

  if (value >= config.ph.highMin && value <= config.ph.highMax) {
    return { label: 'Needs Attention', color: '#ef4444', severity: 'critical' };
  }
  if (
    (value >= config.ph.moderateLowMin && value < config.ph.moderateLowMax) ||
    (value > config.ph.moderateHighMin && value <= config.ph.moderateHighMax)
  ) {
    return { label: 'Watch Zone', color: '#f59e0b', severity: 'warning' };
  }
  return { label: 'Safe', color: '#22c55e', severity: 'safe' };
}

export function getOverallRiskFromReading(
  reading: { temperature?: number | null; turbidity?: number | null; ph?: number | null },
  thresholds?: SiteRiskThresholds | null,
): 'critical' | 'warning' | 'safe' {
  const values = [
    reading.temperature != null ? getSensorStatus('temperature', Number(reading.temperature), thresholds).severity : 'safe',
    reading.turbidity != null ? getSensorStatus('turbidity', Number(reading.turbidity), thresholds).severity : 'safe',
    reading.ph != null ? getSensorStatus('ph', Number(reading.ph), thresholds).severity : 'safe',
  ];

  if (values.includes('critical')) return 'critical';
  if (values.includes('warning')) return 'warning';
  return 'safe';
}
