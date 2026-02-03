/**
 * Shared configuration and utilities for the handwriting monorepo
 */

export const MONOREPO_NAME = "@handwriting/monorepo";
export const VERSION = "1.0.0";

export interface SharedConfig {
  apiBaseUrl: string;
  environment: "development" | "production" | "test";
}

export const getSharedConfig = (): SharedConfig => {
  return {
    apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3000",
    environment: (process.env.NODE_ENV as SharedConfig["environment"]) || "development",
  };
};

export const logSharedMessage = (message: string) => {
  console.log(`[${MONOREPO_NAME}] ${message}`);
};
