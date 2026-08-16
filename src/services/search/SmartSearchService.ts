import { ISearchEngineAdapter, SearchOptions, SearchResult, SearchSuggestions } from "./ISearchEngineAdapter";
import { firestoreSearchAdapter } from "./adapters/FirestoreSearchAdapter";
import { meilisearchAdapter } from "./adapters/MeilisearchAdapter";
import { typesenseAdapter } from "./adapters/TypesenseAdapter";

export class SmartSearchService {
  private adapter: ISearchEngineAdapter;

  constructor(adapterType: "firestore" | "meilisearch" | "typesense" = "firestore") {
    switch (adapterType) {
      case "meilisearch":
        this.adapter = meilisearchAdapter;
        break;
      case "typesense":
        this.adapter = typesenseAdapter;
        break;
      case "firestore":
      default:
        this.adapter = firestoreSearchAdapter;
        break;
    }
  }

  public setAdapter(adapter: ISearchEngineAdapter): void {
    this.adapter = adapter;
  }

  public async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    return this.adapter.search(query, options);
  }

  public async getSuggestions(query: string): Promise<SearchSuggestions> {
    return this.adapter.getSuggestions(query);
  }

  public async indexProduct(product: any): Promise<void> {
    return this.adapter.indexProduct(product);
  }

  public async removeProduct(id: string): Promise<void> {
    return this.adapter.removeProduct(id);
  }

  public async buildIndex(products?: any[]): Promise<void> {
    return this.adapter.buildIndex(products);
  }
}

export const smartSearchService = new SmartSearchService("firestore");
