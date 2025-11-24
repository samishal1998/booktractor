function isEmptyValue(value) {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  }
  
  function createFilterBuilder(logic = 'and') {
    const state = {
      logic,
      filters: [],
    };
  
    return {
      contains(field, value) {
        if (!isEmptyValue(value)) {
          state.filters.push({
            field,
            operator: 'contains',
            value,
          });
        }
        return this;
      },
      equals(field, value) {
        if (!isEmptyValue(value)) {
          state.filters.push({
            field,
            operator: 'eq',
            value,
          });
        }
        return this;
      },
      build() {
        return state.filters.length ? state : undefined;
      },
    };
  }
  
  function createSorter(field, direction = 'asc') {
    return {
      field,
      direction: direction === 'desc' ? 'desc' : 'asc',
    };
  }
  
  function serializeFilters(group) {
    if (!group || !group.filters?.length) return undefined;
    return JSON.stringify(group);
  }
  
  function serializeSorters(sorters) {
    if (!Array.isArray(sorters) || sorters.length === 0) return undefined;
    return JSON.stringify(sorters);
  }
  
  function parseFilters(json) {
    if (!json) return undefined;
    try {
      const parsed = JSON.parse(json);
      if (parsed && Array.isArray(parsed.filters)) {
        return parsed;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  
  function parseSorters(json) {
    if (!json) return undefined;
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  
  module.exports = {
    createFilterBuilder,
    createSorter,
    serializeFilters,
    serializeSorters,
    parseFilters,
    parseSorters,
  };
  
  
  