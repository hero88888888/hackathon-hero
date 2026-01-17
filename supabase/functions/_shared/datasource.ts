/**
 * Data Source Abstraction Layer
 * 
 * Implements the IDataSource interface pattern for swappable data providers.
 * Default implementation uses the public Hyperliquid API.
 * Can be swapped to Insilico-HL or HyperServe as needed.
 */

import type { HyperliquidFill, ClearinghouseState, DepositRecord, IDataSource } from './types.ts';

const HL_API_URL = "https://api.hyperliquid.xyz/info";

/**
 * Public Hyperliquid API Adapter
 * Default data source using the public REST API
 */
export class PublicAPIAdapter implements IDataSource {
  private readonly apiUrl: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000;

  constructor(apiUrl: string = HL_API_URL) {
    this.apiUrl = apiUrl;
  }

  private async fetchWithRetry<T>(body: object): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Attempt ${attempt + 1}/${this.maxRetries} failed:`, lastError.message);
        
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }

  async fetchUserFills(user: string): Promise<HyperliquidFill[]> {
    return this.fetchWithRetry<HyperliquidFill[]>({
      type: "userFills",
      user: user.toLowerCase(),
    });
  }

  async fetchClearinghouseState(user: string): Promise<ClearinghouseState> {
    return this.fetchWithRetry<ClearinghouseState>({
      type: "clearinghouseState",
      user: user.toLowerCase(),
    });
  }

  async fetchUserDeposits(user: string): Promise<DepositRecord[]> {
    // Hyperliquid doesn't have a direct deposits endpoint in the public API
    // This would need to be implemented via on-chain data or alternative source
    // For now, return empty array - this is noted as a limitation
    console.warn('Deposit tracking via public API not directly supported');
    return [];
  }
}

/**
 * Factory function to create the appropriate data source
 * Environment variable DATASOURCE_TYPE can be used to switch implementations
 */
export function createDataSource(): IDataSource {
  const sourceType = Deno.env.get('DATASOURCE_TYPE') || 'public';
  
  switch (sourceType) {
    case 'insilico':
      // Placeholder for Insilico-HL integration
      console.log('Using Insilico-HL data source (not yet implemented)');
      return new PublicAPIAdapter();
    
    case 'hyperserve':
      // Placeholder for HyperServe integration
      console.log('Using HyperServe data source (not yet implemented)');
      return new PublicAPIAdapter();
    
    case 'public':
    default:
      return new PublicAPIAdapter();
  }
}

// Default export for convenience
export const defaultDataSource = createDataSource();
