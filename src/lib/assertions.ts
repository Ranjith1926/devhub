/**
 * assertions.ts
 * Pure evaluation engine — takes a list of Assertion definitions and an
 * ApiResponse, returns an AssertionResult for each.
 * No side effects, no imports from React.
 */

import { Assertion, AssertionOperator, AssertionResult, AssertionTarget } from '../types';
import { ApiResponse } from '../types';

// ---------------------------------------------------------------------------
// JSONPath resolver (dot-notation only, supports array indices)
// e.g. "data.items.0.id"
// ---------------------------------------------------------------------------

function resolvePath(obj: unknown, path: string): { found: boolean; value: unknown } {
  if (!path) return { found: true, value: obj };
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return { found: false, value: undefined };
    if (Array.isArray(cur)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx)) return { found: false, value: undefined };
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[part];
      if (cur === undefined) return { found: false, value: undefined };
    } else {
      return { found: false, value: undefined };
    }
  }
  return { found: true, value: cur };
}

// ---------------------------------------------------------------------------
// Resolve the "actual" value for an assertion target
// ---------------------------------------------------------------------------

function resolveActual(
  target: AssertionTarget,
  targetArg: string,
  response: ApiResponse,
): { found: boolean; actual: string } {
  switch (target) {
    case 'status':
      return { found: true, actual: String(response.status) };
    case 'status_text':
      return { found: true, actual: response.status_text ?? '' };
    case 'response_time':
      return { found: true, actual: String(response.time) };
    case 'body':
      return { found: true, actual: response.body ?? '' };
    case 'header': {
      const key = targetArg.toLowerCase();
      const val = Object.entries(response.headers ?? {}).find(
        ([k]) => k.toLowerCase() === key,
      )?.[1];
      return val !== undefined
        ? { found: true, actual: val }
        : { found: false, actual: '' };
    }
    case 'body_json': {
      let parsed: unknown;
      try {
        parsed = JSON.parse(response.body);
      } catch {
        return { found: false, actual: '(body is not valid JSON)' };
      }
      const { found, value } = resolvePath(parsed, targetArg);
      if (!found) return { found: false, actual: '(path not found)' };
      const actual =
        value === null ? 'null'
        : typeof value === 'object' ? JSON.stringify(value)
        : String(value);
      return { found: true, actual };
    }
    default:
      return { found: false, actual: '' };
  }
}

// ---------------------------------------------------------------------------
// Evaluate a single operator
// ---------------------------------------------------------------------------

function evaluate(
  operator: AssertionOperator,
  actual: string,
  expected: string,
  found: boolean,
): boolean {
  switch (operator) {
    case 'exists':     return found;
    case 'not_exists': return !found;
    case 'eq':         return actual === expected;
    case 'ne':         return actual !== expected;
    case 'gt':         return parseFloat(actual) > parseFloat(expected);
    case 'gte':        return parseFloat(actual) >= parseFloat(expected);
    case 'lt':         return parseFloat(actual) < parseFloat(expected);
    case 'lte':        return parseFloat(actual) <= parseFloat(expected);
    case 'contains':     return actual.includes(expected);
    case 'not_contains': return !actual.includes(expected);
    case 'matches': {
      try {
        return new RegExp(expected).test(actual);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Human-readable message
// ---------------------------------------------------------------------------

const OP_LABEL: Record<AssertionOperator, string> = {
  eq:          '==',
  ne:          '!=',
  gt:          '>',
  gte:         '>=',
  lt:          '<',
  lte:         '<=',
  contains:    'contains',
  not_contains:'does not contain',
  exists:      'exists',
  not_exists:  'does not exist',
  matches:     'matches',
};

function buildMessage(
  passed: boolean,
  target: AssertionTarget,
  targetArg: string,
  operator: AssertionOperator,
  expected: string,
  actual: string,
): string {
  const targetLabel =
    target === 'header'    ? `header[${targetArg}]`
    : target === 'body_json' ? `body.${targetArg}`
    : target;

  if (operator === 'exists' || operator === 'not_exists') {
    return passed
      ? `${targetLabel} ${OP_LABEL[operator]}`
      : `${targetLabel} ${passed ? '' : 'un'}expected to ${OP_LABEL[operator]}`;
  }

  return passed
    ? `${targetLabel} ${OP_LABEL[operator]} ${JSON.stringify(expected)}`
    : `Expected ${targetLabel} ${OP_LABEL[operator]} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}

// ---------------------------------------------------------------------------
// Public: run all assertions
// ---------------------------------------------------------------------------

export function runAssertions(
  assertions: Assertion[],
  response: ApiResponse,
): AssertionResult[] {
  return assertions
    .filter((a) => a.enabled)
    .map((a): AssertionResult => {
      const { found, actual } = resolveActual(a.target, a.targetArg, response);
      const passed = evaluate(a.operator, actual, a.expected, found);
      return {
        assertionId: a.id,
        passed,
        actual,
        message: buildMessage(passed, a.target, a.targetArg, a.operator, a.expected, actual),
      };
    });
}
