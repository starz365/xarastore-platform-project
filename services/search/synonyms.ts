import { supabase } from '@/lib/supabase/client';

export interface SynonymGroup {
  id: string;
  terms: string[];
  category?: string;
  boost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SynonymMatch {
  original: string;
  synonyms: string[];
  boost: number;
}

export class SynonymManager {
  private static instance: SynonymManager;
  private synonymCache = new Map<string, SynonymGroup[]>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  private constructor() {
    this.loadSynonyms();
    // Refresh cache periodically
    setInterval(() => this.refreshCache(), this.cacheTTL);
  }

  static getInstance(): SynonymManager {
    if (!SynonymManager.instance) {
      SynonymManager.instance = new SynonymManager();
    }
    return SynonymManager.instance;
  }

  async expandQuery(query: string): Promise<string[]> {
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    const expansions: Set<string> = new Set([query]);
    
    // Get synonyms for each term
    const synonymPromises = terms.map(term => this.getSynonyms(term));
    const synonymResults = await Promise.all(synonymPromises);
    
    // Generate all possible expansions
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      const synonyms = synonymResults[i];
      
      if (synonyms.length > 0) {
        // Create new query variations with each synonym
        synonyms.forEach(synonym => {
          const newTerms = [...terms];
          newTerms[i] = synonym.term;
          expansions.add(newTerms.join(' '));
        });
      }
    }
    
    // Also try multi-word synonyms
    const multiWordSynonyms = await this.getMultiWordSynonyms(query);
    multiWordSynonyms.forEach(synonym => {
      expansions.add(synonym.term);
    });
    
    return Array.from(expansions);
  }

  async getSynonyms(term: string): Promise<Array<{ term: string; boost: number }>> {
    const synonyms: Array<{ term: string; boost: number }> = [];
    
    // Check cache first
    const cachedGroups = this.synonymCache.get(term);
    if (cachedGroups) {
      cachedGroups.forEach(group => {
        group.terms.forEach(synonym => {
          if (synonym !== term) {
            synonyms.push({ term: synonym, boost: group.boost });
          }
        });
      });
      return synonyms;
    }
    
    // Query database for synonyms
    try {
      const { data, error } = await supabase
        .from('search_synonyms')
        .select('*')
        .contains('terms', [term])
        .order('boost', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Cache the results
        this.synonymCache.set(term, data.map(this.transformGroup));
        
        // Add all synonyms from matching groups
        data.forEach(group => {
          group.terms.forEach((synonym: string) => {
            if (synonym !== term) {
              synonyms.push({ term: synonym, boost: group.boost });
            }
          });
        });
      }
    } catch (error) {
      console.error('Failed to get synonyms:', error);
    }
    
    return synonyms;
  }

  async getMultiWordSynonyms(phrase: string): Promise<Array<{ term: string; boost: number }>> {
    const synonyms: Array<{ term: string; boost: number }> = [];
    
    try {
      // Look for exact phrase matches
      const { data, error } = await supabase
        .from('search_synonyms')
        .select('*')
        .contains('terms', [phrase.toLowerCase()])
        .order('boost', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach(group => {
          group.terms.forEach((term: string) => {
            if (term !== phrase) {
              synonyms.push({ term, boost: group.boost });
            }
          });
        });
      }
    } catch (error) {
      console.error('Failed to get multi-word synonyms:', error);
    }
    
    return synonyms;
  }

  async addSynonymGroup(terms: string[], category?: string, boost: number = 1.0): Promise<void> {
    if (terms.length < 2) {
      throw new Error('Synonym group must have at least 2 terms');
    }
    
    try {
      const { error } = await supabase
        .from('search_synonyms')
        .insert({
          terms: terms.map(term => term.toLowerCase()),
          category,
          boost,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      // Clear cache for all terms in the group
      terms.forEach(term => this.synonymCache.delete(term));
      
      console.log(`Added synonym group: ${terms.join(', ')}`);
    } catch (error) {
      console.error('Failed to add synonym group:', error);
      throw error;
    }
  }

  async removeSynonymGroup(groupId: string): Promise<void> {
    try {
      // Get terms before deletion to clear cache
      const { data: group } = await supabase
        .from('search_synonyms')
        .select('terms')
        .eq('id', groupId)
        .single();

      const { error } = await supabase
        .from('search_synonyms')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      
      // Clear cache for terms in the deleted group
      if (group?.terms) {
        group.terms.forEach((term: string) => this.synonymCache.delete(term));
      }
      
      console.log(`Removed synonym group: ${groupId}`);
    } catch (error) {
      console.error('Failed to remove synonym group:', error);
      throw error;
    }
  }

  async updateSynonymGroup(groupId: string, updates: Partial<SynonymGroup>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.terms) {
        updateData.terms = updates.terms.map(term => term.toLowerCase());
      }
      if (updates.category !== undefined) {
        updateData.category = updates.category;
      }
      if (updates.boost !== undefined) {
        updateData.boost = updates.boost;
      }

      const { error } = await supabase
        .from('search_synonyms')
        .update(updateData)
        .eq('id', groupId);

      if (error) throw error;
      
      // Clear cache for old and new terms
      if (updates.terms) {
        updates.terms.forEach(term => this.synonymCache.delete(term));
      }
      
      console.log(`Updated synonym group: ${groupId}`);
    } catch (error) {
      console.error('Failed to update synonym group:', error);
      throw error;
    }
  }

  async getSynonymGroups(category?: string): Promise<SynonymGroup[]> {
    try {
      let query = supabase
        .from('search_synonyms')
        .select('*')
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.transformGroup);
    } catch (error) {
      console.error('Failed to get synonym groups:', error);
      return [];
    }
  }

  async searchSynonyms(query: string): Promise<SynonymGroup[]> {
    try {
      const { data, error } = await supabase
        .from('search_synonyms')
        .select('*')
        .or(`terms.cs.{${query}},category.ilike.%${query}%`)
        .order('boost', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformGroup);
    } catch (error) {
      console.error('Failed to search synonyms:', error);
      return [];
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('search_synonyms')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;

      const categories = new Set<string>();
      (data || []).forEach(item => {
        if (item.category) {
          categories.add(item.category);
        }
      });

      return Array.from(categories);
    } catch (error) {
      console.error('Failed to get synonym categories:', error);
      return [];
    }
  }

  async getStats(): Promise<{
    totalGroups: number;
    totalTerms: number;
    byCategory: Record<string, number>;
    averageTermsPerGroup: number;
  }> {
    try {
      const groups = await this.getSynonymGroups();
      
      let totalTerms = 0;
      const byCategory: Record<string, number> = {};

      groups.forEach(group => {
        totalTerms += group.terms.length;
        
        if (group.category) {
          byCategory[group.category] = (byCategory[group.category] || 0) + 1;
        } else {
          byCategory['uncategorized'] = (byCategory['uncategorized'] || 0) + 1;
        }
      });

      return {
        totalGroups: groups.length,
        totalTerms,
        byCategory,
        averageTermsPerGroup: groups.length > 0 ? totalTerms / groups.length : 0,
      };
    } catch (error) {
      console.error('Failed to get synonym stats:', error);
      throw error;
    }
  }

  async importSynonyms(synonyms: Array<{ terms: string[]; category?: string; boost?: number }>): Promise<void> {
    const batchSize = 50;
    
    for (let i = 0; i < synonyms.length; i += batchSize) {
      const batch = synonyms.slice(i, i + batchSize);
      
      const batchPromises = batch.map(synonym =>
        this.addSynonymGroup(
          synonym.terms,
          synonym.category,
          synonym.boost || 1.0
        ).catch(error => {
          console.error('Failed to import synonym:', synonym, error);
        })
      );
      
      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < synonyms.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Refresh cache after import
    await this.refreshCache();
  }

  async exportSynonyms(): Promise<Array<{ terms: string[]; category?: string; boost: number }>> {
    const groups = await this.getSynonymGroups();
    
    return groups.map(group => ({
      terms: group.terms,
      category: group.category,
      boost: group.boost,
    }));
  }

  private async loadSynonyms(): Promise<void> {
    try {
      // Load default synonyms if table is empty
      const { count } = await supabase
        .from('search_synonyms')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        await this.loadDefaultSynonyms();
      }
    } catch (error) {
      console.error('Failed to load synonyms:', error);
    }
  }

  private async loadDefaultSynonyms(): Promise<void> {
    const defaultSynonyms = [
      // Electronics
      { terms: ['phone', 'smartphone', 'mobile', 'cellphone'], category: 'electronics', boost: 1.2 },
      { terms: ['laptop', 'notebook', 'computer'], category: 'electronics', boost: 1.2 },
      { terms: ['tv', 'television', 'smart tv'], category: 'electronics', boost: 1.1 },
      { terms: ['headphones', 'earphones', 'earbuds'], category: 'electronics', boost: 1.1 },
      
      // Fashion
      { terms: ['shirt', 't-shirt', 'tee'], category: 'fashion', boost: 1.1 },
      { terms: ['pants', 'trousers'], category: 'fashion', boost: 1.0 },
      { terms: ['shoes', 'sneakers', 'footwear'], category: 'fashion', boost: 1.1 },
      { terms: ['bag', 'purse', 'handbag'], category: 'fashion', boost: 1.0 },
      
      // Home & Kitchen
      { terms: ['fridge', 'refrigerator'], category: 'home', boost: 1.0 },
      { terms: ['microwave', 'oven'], category: 'home', boost: 1.0 },
      { terms: ['sofa', 'couch'], category: 'home', boost: 1.0 },
      
      // General
      { terms: ['buy', 'purchase', 'shop'], category: 'general', boost: 1.0 },
      { terms: ['cheap', 'affordable', 'inexpensive'], category: 'general', boost: 1.1 },
      { terms: ['best', 'top', 'excellent'], category: 'general', boost: 1.2 },
      { terms: ['new', 'latest', 'recent'], category: 'general', boost: 1.1 },
    ];

    await this.importSynonyms(defaultSynonyms);
    console.log('Loaded default synonyms');
  }

  private async refreshCache(): Promise<void> {
    if (Date.now() - this.lastCacheUpdate > this.cacheTTL) {
      this.synonymCache.clear();
      this.lastCacheUpdate = Date.now();
      console.log('Refreshed synonym cache');
    }
  }

  private transformGroup(data: any): SynonymGroup {
    return {
      id: data.id,
      terms: data.terms || [],
      category: data.category,
      boost: data.boost || 1.0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  // Helper method for search query expansion
  static expandSearchQuery(query: string, synonyms: SynonymMatch[]): string {
    let expandedQuery = query;
    
    synonyms.forEach(match => {
      const regex = new RegExp(`\\b${match.original}\\b`, 'gi');
      const replacement = `(${match.original} OR ${match.synonyms.join(' OR ')})`;
      expandedQuery = expandedQuery.replace(regex, replacement);
    });
    
    return expandedQuery;
  }
}

export const synonymManager = SynonymManager.getInstance();
