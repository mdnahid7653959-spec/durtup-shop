import { db } from "@/integrations/firebase/client";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

export interface SynonymRule {
  id: string;
  term: string;
  synonyms: string[];
  category?: string;
  language?: "en" | "bn" | "bilingual";
  updated_at?: string;
}

// Built-in initial bilingual synonym dictionary for instant out-of-the-box matching
const DEFAULT_SYNONYMS: SynonymRule[] = [
  {
    id: "syn-motorcycle",
    term: "motorcycle",
    synonyms: ["bike", "motor bike", "motorbike", "two wheeler", "বাইক", "মোটরসাইকেল", "মটরসাইকেল"],
    language: "bilingual"
  },
  {
    id: "syn-mobile",
    term: "mobile phone",
    synonyms: ["mobile", "phone", "smartphone", "cell phone", "cellphone", "মোবাইল", "ফোন", "স্মার্টফোন"],
    language: "bilingual"
  },
  {
    id: "syn-laptop",
    term: "laptop",
    synonyms: ["notebook", "computer", "pc", "desktop", "ল্যাপটপ", "কম্পিউটার", "পিসি"],
    language: "bilingual"
  },
  {
    id: "syn-clothing",
    term: "clothing",
    synonyms: ["shirt", "pant", "dress", "t-shirt", "tshirt", "jeans", "পোশাক", "জামাকাপড়", "শার্ট", "প্যান্ট"],
    language: "bilingual"
  },
  {
    id: "syn-headphones",
    term: "headphones",
    synonyms: ["earphones", "earbuds", "headset", "airpods", "হেডফোন", "ইয়ারফোন"],
    language: "bilingual"
  },
  {
    id: "syn-smartwatch",
    term: "smartwatch",
    synonyms: ["smart watch", "fitness band", "smartband", "স্মার্টওয়াচ", "ঘড়ি"],
    language: "bilingual"
  },
  {
    id: "syn-powerbank",
    term: "power bank",
    synonyms: ["powerbank", "portable charger", "battery pack", "পাওয়ার ব্যাংক"],
    language: "bilingual"
  },
  {
    id: "syn-keyboard",
    term: "keyboard",
    synonyms: ["key pad", "keypad", "mechanical keyboard", "কীবোর্ড"],
    language: "bilingual"
  },
  {
    id: "syn-mouse",
    term: "mouse",
    synonyms: ["gaming mouse", "wireless mouse", "মাউস"],
    language: "bilingual"
  },
  {
    id: "syn-shoes",
    term: "shoes",
    synonyms: ["sneakers", "footwear", "boots", "sandals", "জুতা", "স্নিকার্স"],
    language: "bilingual"
  }
];

class SynonymManager {
  private rules: Map<string, SynonymRule> = new Map();
  private synonymToTermMap: Map<string, string> = new Map();
  private termToSynonymsMap: Map<string, Set<string>> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadDefaultRules();
  }

  private loadDefaultRules() {
    for (const rule of DEFAULT_SYNONYMS) {
      this.addRuleToMemory(rule);
    }
  }

  private addRuleToMemory(rule: SynonymRule) {
    this.rules.set(rule.id, rule);
    const mainTerm = rule.term.toLowerCase().trim();
    
    if (!this.termToSynonymsMap.has(mainTerm)) {
      this.termToSynonymsMap.set(mainTerm, new Set([mainTerm]));
    }
    
    for (const syn of rule.synonyms) {
      const normalizedSyn = syn.toLowerCase().trim();
      this.synonymToTermMap.set(normalizedSyn, mainTerm);
      this.termToSynonymsMap.get(mainTerm)?.add(normalizedSyn);
    }
  }

  public async init(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const snapshot = await getDocs(collection(db, "search_synonyms"));
      if (!snapshot.empty) {
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as SynonymRule;
          this.addRuleToMemory({ ...data, id: docSnap.id });
        });
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn("[SynonymManager] Firestore fetch failed, using default synonyms", err);
      this.isLoaded = true;
    }
  }

  public getAllRules(): SynonymRule[] {
    return Array.from(this.rules.values());
  }

  public expandQuery(query: string): { expandedTerms: string[]; matchedRules: string[] } {
    const rawTokens = query.toLowerCase().trim().split(/\s+/);
    const expandedSet = new Set<string>([query.toLowerCase().trim()]);
    const matchedRulesSet = new Set<string>();

    // 1. Exact phrase match in synonym dictionary
    const fullQuery = query.toLowerCase().trim();
    for (const rule of this.rules.values()) {
      const allSyns = [rule.term, ...rule.synonyms].map((s) => s.toLowerCase().trim());
      if (allSyns.some((syn) => syn === fullQuery || fullQuery.includes(syn) || syn.includes(fullQuery))) {
        matchedRulesSet.add(rule.term);
        allSyns.forEach((syn) => expandedSet.add(syn));
      }
    }

    // 2. Individual token matching
    for (const token of rawTokens) {
      if (token.length <= 1) continue;
      for (const rule of this.rules.values()) {
        const allSyns = [rule.term, ...rule.synonyms].map((s) => s.toLowerCase().trim());
        if (allSyns.some((syn) => syn === token || syn.includes(token))) {
          matchedRulesSet.add(rule.term);
          allSyns.forEach((syn) => expandedSet.add(syn));
        }
      }
    }

    return {
      expandedTerms: Array.from(expandedSet),
      matchedRules: Array.from(matchedRulesSet)
    };
  }

  public async saveRule(rule: Omit<SynonymRule, "id"> & { id?: string }): Promise<SynonymRule> {
    const id = rule.id || `syn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const fullRule: SynonymRule = {
      id,
      term: rule.term,
      synonyms: rule.synonyms,
      category: rule.category || "General",
      language: rule.language || "bilingual",
      updated_at: new Date().toISOString()
    };

    this.addRuleToMemory(fullRule);

    try {
      await setDoc(doc(db, "search_synonyms", id), fullRule, { merge: true });
    } catch (e) {
      console.warn("[SynonymManager] Save to Firestore warning:", e);
    }

    return fullRule;
  }

  public async deleteRule(id: string): Promise<void> {
    this.rules.delete(id);
    try {
      await deleteDoc(doc(db, "search_synonyms", id));
    } catch (e) {
      console.warn("[SynonymManager] Delete from Firestore warning:", e);
    }
  }
}

export const synonymManager = new SynonymManager();
