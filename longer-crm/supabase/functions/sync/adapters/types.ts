// Shared shape every CRM adapter receives. The sync function normalizes a call
// into this once; each adapter maps it to its own API. Add a new CRM by adding
// a new adapter — nothing else changes.
export interface NormalizedDeal {
  contact: {
    name?: string | null;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
    externalId?: string | null; // existing id in this CRM, if known
  };
  signal: string;
  intent: string;
  summary?: string | null;
  nextAction?: string | null;
  suggestedDoc?: string | null;
  lineItems: Array<{
    description: string;
    quantity?: number | null;
    unit?: string | null;
    amount?: number | null;
    amountBasis?: string | null;
    figureType?: string | null; // firm_quote | ballpark
  }>;
}

export interface AdapterResult {
  ok: boolean;
  externalId?: string;
  error?: string;
}

export interface CrmAdapter {
  name: string;
  push(deal: NormalizedDeal): Promise<AdapterResult>;
}
