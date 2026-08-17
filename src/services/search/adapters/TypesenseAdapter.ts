import { ISearchEngineAdapter, SearchOptions, SearchResult, SearchSuggestions } from "../ISearchEngineAdapter";
import { firestoreSearchAdapter } from "./FirestoreSearchAdapter";

/**
 * TypesenseAdapter - Pluggable adapter for future Typesense Cloud/Self-hosted upgrade.
 * Delegates to FirestoreSearchAdapter when Typesense host is not configured.
 */
export class TypesenseAdapter implements ISearchEngineAdapter {
  private hostUrl: string | null = null;
  private apiKey: string | null = null;

  constructor(hostUrl?: string, apiKey?: string) {
    this.hostUrl = hostUrl || import.meta.env.VITE_TYPESENSE_HOST || null;
    this.apiKey = apiKey || import.meta.env.VITE_TYPESENSE_API_KEY || null;
  }

  public async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    if (!this.hostUrl) {
      return firestoreSearchAdapter.search(query, options);
    }
    return firestoreSearchAdapter.search(query, options);
  }

  public async getSuggestions(query: string): Promise<SearchSuggestions> {
    if (!this.hostUrl) {
      return firestoreSearchAdapter.getSuggestions(query);
    }
    return firestoreSearchAdapter.getSuggestions(query);
  }

  public async indexProduct(product: any): Promise<void> {
    await firestoreSearchAdapter.indexProduct(product);
  }

  public async removeProduct(id: string): Promise<void> {
    await firestoreSearchAdapter.removeProduct(id);
  }

  public async buildIndex(products?: any[]): Promise<void> {
    await firestoreSearchAdapter.buildIndex(products);
  }
}

export const typesenseAdapter = new TypesenseAdapter();
