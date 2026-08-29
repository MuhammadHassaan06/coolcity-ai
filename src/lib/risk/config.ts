export interface RiskFormulaConfig {
  label: string;
  weights: {
    heatExposure: number;
    persistence: number;
    vulnerability: number;
  };
}

let currentConfig: RiskFormulaConfig = {
  label: "Track 7 Census-Tract Authoritative Risk Model",
  weights: {
    heatExposure: 0.5,
    persistence: 0.0,
    vulnerability: 0.5,
  },
};

export function getRiskFormulaConfig(): RiskFormulaConfig {
  return currentConfig;
}

export function setRiskFormulaConfig(newConfig: Partial<RiskFormulaConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    weights: {
      ...currentConfig.weights,
      ...(newConfig.weights || {}),
    },
  };
}

export function resetRiskFormulaConfig(): void {
  currentConfig = {
    label: "Track 7 Census-Tract Authoritative Risk Model",
    weights: {
      heatExposure: 0.5,
      persistence: 0.0,
      vulnerability: 0.5,
    },
  };
}
