import { customers } from './customers';
import { interactions } from './interactions';
import { enquiries } from './enquiries';
import { pricing } from './pricing';
import { jobs } from './jobs';
import { operations } from './operations';
import { accounts } from './accounts';
import { reports } from './reports';
import { admin } from './admin';

export type { ModuleCategory, ModuleConfig, ModuleRegistry } from './types';

export { customers } from './customers';
export { interactions } from './interactions';
export { enquiries } from './enquiries';
export { pricing } from './pricing';
export { jobs } from './jobs';
export { operations } from './operations';
export { accounts } from './accounts';
export { reports } from './reports';
export { admin } from './admin';

export const modules = [
  customers,
  interactions,
  enquiries,
  pricing,
  jobs,
  operations,
  accounts,
  reports,
  admin,
] as const;

export const modulesById = modules.reduce(
  (acc, mod) => {
    acc[mod.id] = mod;
    return acc;
  },
  {} as Record<string, (typeof modules)[number]>
);

export const modulesByCategory = modules.reduce(
  (acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = [];
    acc[mod.category].push(mod);
    return acc;
  },
  {} as Record<string, (typeof modules)[number][]>
);

export function getModuleById(id: string) {
  return modulesById[id];
}

export function getModulesByCategory(category: string) {
  return modulesByCategory[category] || [];
}

export function getEnabledModules() {
  return modules.filter((m) => m.enabled);
}

export function getSortedModules() {
  return [...getEnabledModules()].sort((a, b) => a.order - b.order);
}

export function getModulesByPermission(permission: string) {
  return getEnabledModules().filter((m) => m.permission === permission);
}
