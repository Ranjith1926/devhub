/**
 * interpolate.ts
 * Replace {{variableName}} tokens with values from the active environment.
 * Unresolved tokens are left as-is so the user can see what's missing.
 */

import { Environment } from '../types';

/**
 * Replace all {{key}} occurrences in `text` with the matching enabled
 * variable value from the given environment.
 * Returns the interpolated string and a list of unresolved variable names.
 */
export function interpolate(
  text: string,
  env: Environment | null,
): { result: string; unresolved: string[] } {
  const unresolved: string[] = [];

  if (!env) {
    // Collect variable names even when no env is set, so we can warn
    const names: string[] = [];
    text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      names.push(name);
      return _;
    });
    return { result: text, unresolved: names };
  }

  const result = text.replace(/\{\{(\w+)\}\}/g, (original, name) => {
    const variable = env.variables.find((v) => v.enabled && v.key === name);
    if (variable) return variable.value;
    unresolved.push(name);
    return original;
  });

  return { result, unresolved };
}

/**
 * Returns variable names referenced in `text` (e.g. ["baseUrl", "token"]).
 */
export function extractVariableNames(text: string): string[] {
  const names: string[] = [];
  text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!names.includes(name)) names.push(name);
    return _;
  });
  return names;
}
