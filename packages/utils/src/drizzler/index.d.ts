export type FilterOperator = 'contains' | 'eq';

export interface FilterRule {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean;
}

export interface FilterGroup {
  logic: 'and' | 'or';
  filters: FilterRule[];
}

export interface SorterRule {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterBuilder {
  contains(field: string, value: string | number | boolean | undefined | null): FilterBuilder;
  equals(field: string, value: string | number | boolean | undefined | null): FilterBuilder;
  build(): FilterGroup | undefined;
}

export function createFilterBuilder(logic?: 'and' | 'or'): FilterBuilder;
export function createSorter(field: string, direction?: 'asc' | 'desc'): SorterRule;
export function serializeFilters(group?: FilterGroup): string | undefined;
export function serializeSorters(sorters?: SorterRule[]): string | undefined;
export function parseFilters(json?: string): FilterGroup | undefined;
export function parseSorters(json?: string): SorterRule[] | undefined;


