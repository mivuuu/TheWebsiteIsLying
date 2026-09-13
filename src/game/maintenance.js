export const MAINTENANCE_ROUTES = Object.freeze(['help/system', 'help/endings', 'help/reset']);
export const isMaintenance = page => MAINTENANCE_ROUTES.includes(page);
