export const ENDING_REGISTRY = Object.freeze(['escaped', 'null', 'replaced', 'obeyed', 'freed', 'trapped'].map(id => Object.freeze({ id, titleKey: `story.ending.${id}` })));

// Pure recording operation; GameProvider persists the resulting meta record.
export function recordEnding(meta, endingId, runStats) {
  if (!ENDING_REGISTRY.some(ending => ending.id === endingId) || meta.completedIds.includes(runStats.id)) return meta;
  const run = { ...runStats, endingId, runNumber: meta.completedRuns + 1 };
  return {
    ...meta,
    completedRuns: run.runNumber,
    completedIds: [...meta.completedIds, run.id],
    discoveredEndings: [...new Set([...meta.discoveredEndings, endingId])],
    // Migrated discoveries without a timestamp stay undated; a repeat is not their first discovery.
    endingRecords: meta.discoveredEndings.includes(endingId) ? (meta.endingRecords || {}) : { ...meta.endingRecords, [endingId]: run },
    runHistory: [...(meta.runHistory || []), run],
  };
}
