export interface RuntimeConfig {
  readonly appEnv: string;
  readonly financialMode: string;
  readonly integrationMode: string;
  readonly productionRealMoney: boolean;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const config: RuntimeConfig = {
    appEnv: env["APP_ENV"] ?? "development",
    financialMode: env["FINANCIAL_MODE"] ?? "DEMO",
    integrationMode: env["INTEGRATION_MODE"] ?? "MOCK",
    productionRealMoney: env["PRODUCTION_REAL_MONEY"] === "true",
  };

  if (config.productionRealMoney && config.integrationMode === "MOCK") {
    throw new Error("Production real-money mode cannot use MOCK integrations");
  }
  if (config.productionRealMoney && config.financialMode !== "PRODUCTION") {
    throw new Error("Production real-money mode requires FINANCIAL_MODE=PRODUCTION");
  }
  return Object.freeze(config);
}
