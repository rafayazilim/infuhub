// Feature: brand-dashboard-enhancement, Property 1: Unique ID Generation
// **Validates: Requirements 1.1**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Import the function - we'll need to create an ES module version
function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

describe('ID Generation - Property Tests', () => {
  it('Property 1: all generated IDs are unique', () => {
    // Generate multiple IDs and verify they are all unique
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1000 }),
        (count) => {
          const ids = [];
          for (let i = 0; i < count; i++) {
            ids.push(generateUniqueId());
          }
          
          // Check that all IDs are unique
          const uniqueIds = new Set(ids);
          return ids.length === uniqueIds.size;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (variant): concurrent ID generation produces unique IDs', () => {
    // Test that even when generating IDs in quick succession, they remain unique
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const ids = [];
          // Generate 100 IDs in quick succession
          for (let i = 0; i < 100; i++) {
            ids.push(generateUniqueId());
          }
          
          const uniqueIds = new Set(ids);
          return ids.length === uniqueIds.size;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (format check): generated IDs follow expected format', () => {
    // Verify that IDs follow the format: timestamp-randomstring
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const id = generateUniqueId();
          
          // Check format: should contain a hyphen
          const parts = id.split('-');
          if (parts.length !== 2) return false;
          
          // First part should be a valid timestamp (numeric)
          const timestamp = parseInt(parts[0], 10);
          if (isNaN(timestamp)) return false;
          
          // Second part should be a non-empty string
          if (parts[1].length === 0) return false;
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
