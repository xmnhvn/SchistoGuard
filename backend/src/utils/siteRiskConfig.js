const DEFAULT_SITE_RISK_THRESHOLDS = Object.freeze({
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
});

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampThresholds(candidate = {}) {
  const next = {
    temperature: { ...DEFAULT_SITE_RISK_THRESHOLDS.temperature },
    ph: { ...DEFAULT_SITE_RISK_THRESHOLDS.ph },
    turbidity: { ...DEFAULT_SITE_RISK_THRESHOLDS.turbidity },
  };

  ['temperature', 'ph', 'turbidity'].forEach((sensorKey) => {
    const source = candidate[sensorKey];
    if (!source || typeof source !== 'object') return;

    Object.keys(next[sensorKey]).forEach((field) => {
      const value = toFiniteNumber(source[field]);
      if (value !== null) {
        next[sensorKey][field] = value;
      }
    });
  });

  return next;
}

function validateThresholds(candidate = {}) {
  const thresholds = clampThresholds(candidate);
  const errors = [];

  const temp = thresholds.temperature;
  if (!(temp.highMin < temp.highMax)) {
    errors.push('Temperature high-risk minimum must be less than maximum.');
  }
  if (!(temp.moderateLowMin < temp.moderateLowMax)) {
    errors.push('Temperature moderate lower range must have a valid minimum and maximum.');
  }
  if (!(temp.moderateHighMin < temp.moderateHighMax)) {
    errors.push('Temperature moderate upper range must have a valid minimum and maximum.');
  }

  const ph = thresholds.ph;
  if (!(ph.highMin < ph.highMax)) {
    errors.push('pH high-risk minimum must be less than maximum.');
  }
  if (!(ph.moderateLowMin < ph.moderateLowMax)) {
    errors.push('pH moderate lower range must have a valid minimum and maximum.');
  }
  if (!(ph.moderateHighMin < ph.moderateHighMax)) {
    errors.push('pH moderate upper range must have a valid minimum and maximum.');
  }

  const turbidity = thresholds.turbidity;
  if (!(turbidity.highMax > 0)) {
    errors.push('Turbidity high-risk maximum must be greater than 0.');
  }
  if (!(turbidity.moderateMin <= turbidity.moderateMax)) {
    errors.push('Turbidity moderate range must have a valid minimum and maximum.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    thresholds,
  };
}

function extractThresholdsFromSiteRow(row = {}) {
  return clampThresholds({
    temperature: {
      highMin: row.temp_high_min,
      highMax: row.temp_high_max,
      moderateLowMin: row.temp_moderate_low_min,
      moderateLowMax: row.temp_moderate_low_max,
      moderateHighMin: row.temp_moderate_high_min,
      moderateHighMax: row.temp_moderate_high_max,
    },
    ph: {
      highMin: row.ph_high_min,
      highMax: row.ph_high_max,
      moderateLowMin: row.ph_moderate_low_min,
      moderateLowMax: row.ph_moderate_low_max,
      moderateHighMin: row.ph_moderate_high_min,
      moderateHighMax: row.ph_moderate_high_max,
    },
    turbidity: {
      highMax: row.turbidity_high_max,
      moderateMin: row.turbidity_moderate_min,
      moderateMax: row.turbidity_moderate_max,
    },
  });
}

function buildThresholdDbFields(thresholds = DEFAULT_SITE_RISK_THRESHOLDS) {
  const normalized = clampThresholds(thresholds);
  return {
    temp_high_min: normalized.temperature.highMin,
    temp_high_max: normalized.temperature.highMax,
    temp_moderate_low_min: normalized.temperature.moderateLowMin,
    temp_moderate_low_max: normalized.temperature.moderateLowMax,
    temp_moderate_high_min: normalized.temperature.moderateHighMin,
    temp_moderate_high_max: normalized.temperature.moderateHighMax,
    ph_high_min: normalized.ph.highMin,
    ph_high_max: normalized.ph.highMax,
    ph_moderate_low_min: normalized.ph.moderateLowMin,
    ph_moderate_low_max: normalized.ph.moderateLowMax,
    ph_moderate_high_min: normalized.ph.moderateHighMin,
    ph_moderate_high_max: normalized.ph.moderateHighMax,
    turbidity_high_max: normalized.turbidity.highMax,
    turbidity_moderate_min: normalized.turbidity.moderateMin,
    turbidity_moderate_max: normalized.turbidity.moderateMax,
  };
}

function classifySensorValue(sensorKey, value, thresholds = DEFAULT_SITE_RISK_THRESHOLDS) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return 'safe';
  }

  const normalizedValue = Number(value);
  const config = clampThresholds(thresholds);

  if (sensorKey === 'temperature') {
    const temp = config.temperature;
    if (normalizedValue >= temp.highMin && normalizedValue <= temp.highMax) return 'critical';
    if (
      (normalizedValue >= temp.moderateLowMin && normalizedValue < temp.moderateLowMax) ||
      (normalizedValue > temp.moderateHighMin && normalizedValue <= temp.moderateHighMax)
    ) {
      return 'warning';
    }
    return 'safe';
  }

  if (sensorKey === 'ph') {
    const ph = config.ph;
    if (normalizedValue >= ph.highMin && normalizedValue <= ph.highMax) return 'critical';
    if (
      (normalizedValue >= ph.moderateLowMin && normalizedValue < ph.moderateLowMax) ||
      (normalizedValue > ph.moderateHighMin && normalizedValue <= ph.moderateHighMax)
    ) {
      return 'warning';
    }
    return 'safe';
  }

  if (sensorKey === 'turbidity') {
    const turbidity = config.turbidity;
    if (normalizedValue < turbidity.highMax) return 'critical';
    if (normalizedValue >= turbidity.moderateMin && normalizedValue <= turbidity.moderateMax) return 'warning';
    return 'safe';
  }

  return 'safe';
}

module.exports = {
  DEFAULT_SITE_RISK_THRESHOLDS,
  clampThresholds,
  validateThresholds,
  extractThresholdsFromSiteRow,
  buildThresholdDbFields,
  classifySensorValue,
};
