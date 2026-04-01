/**
 * RegexTester.tsx
 * Interactive regular-expression testing tool.
 *
 * Features:
 *  – Pattern input with flag toggles (g, i, m, s)
 *  – Live match highlighting in the test string
 *  – Match list with capture groups and character indices
 *  – Replace tab showing substitution result
 *  – Quick-reference cheat sheet
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  Regex,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  BookOpen,
  Replace,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegexMatch {
  fullMatch: string;
  groups: (string | undefined)[];
  namedGroups: Record<string, string | undefined>;
  index: number;
  end: number;
}

type ActiveTab = 'matches' | 'replace' | 'reference';

type FlagKey = 'g' | 'i' | 'm' | 's';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLAG_DESCRIPTIONS: Record<FlagKey, string> = {
  g: 'Global — find all matches',
  i: 'Case insensitive',
  m: 'Multiline — ^ and $ match line boundaries',
  s: 'Dotall — . matches newline',
};

const HIGHLIGHT_COLORS = [
  'bg-amber-400/30 border-b-2 border-amber-400',
  'bg-sky-400/30 border-b-2 border-sky-400',
  'bg-emerald-400/30 border-b-2 border-emerald-400',
  'bg-rose-400/30 border-b-2 border-rose-400',
  'bg-purple-400/30 border-b-2 border-purple-400',
  'bg-orange-400/30 border-b-2 border-orange-400',
];

const REFERENCE_GROUPS = [
  {
    title: 'Anchors',
    items: [
      { pattern: '^', desc: 'Start of string / line' },
      { pattern: '$', desc: 'End of string / line' },
      { pattern: '\\b', desc: 'Word boundary' },
      { pattern: '\\B', desc: 'Non-word boundary' },
    ],
  },
  {
    title: 'Character Classes',
    items: [
      { pattern: '.', desc: 'Any character except newline' },
      { pattern: '\\d', desc: 'Digit [0-9]' },
      { pattern: '\\D', desc: 'Non-digit' },
      { pattern: '\\w', desc: 'Word character [a-zA-Z0-9_]' },
      { pattern: '\\W', desc: 'Non-word character' },
      { pattern: '\\s', desc: 'Whitespace' },
      { pattern: '\\S', desc: 'Non-whitespace' },
      { pattern: '[abc]', desc: 'Character set' },
      { pattern: '[^abc]', desc: 'Negated character set' },
      { pattern: '[a-z]', desc: 'Character range' },
    ],
  },
  {
    title: 'Quantifiers',
    items: [
      { pattern: '*', desc: 'Zero or more (greedy)' },
      { pattern: '+', desc: 'One or more (greedy)' },
      { pattern: '?', desc: 'Zero or one (greedy)' },
      { pattern: '{n}', desc: 'Exactly n times' },
      { pattern: '{n,}', desc: 'At least n times' },
      { pattern: '{n,m}', desc: 'Between n and m times' },
      { pattern: '*?', desc: 'Zero or more (lazy)' },
      { pattern: '+?', desc: 'One or more (lazy)' },
    ],
  },
  {
    title: 'Groups',
    items: [
      { pattern: '(abc)', desc: 'Capture group' },
      { pattern: '(?:abc)', desc: 'Non-capturing group' },
      { pattern: '(?<name>abc)', desc: 'Named capture group' },
      { pattern: '(?=abc)', desc: 'Positive lookahead' },
      { pattern: '(?!abc)', desc: 'Negative lookahead' },
      { pattern: '(?<=abc)', desc: 'Positive lookbehind' },
      { pattern: '(?<!abc)', desc: 'Negative lookbehind' },
    ],
  },
  {
    title: 'Common Patterns',
    items: [
      { pattern: '^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$', desc: 'Email address' },
      { pattern: 'https?://[^\\s]+', desc: 'URL' },
      { pattern: '^\\d{4}-\\d{2}-\\d{2}$', desc: 'Date (YYYY-MM-DD)' },
      { pattern: '^\\+?\\d[\\d\\s()-]{6,}\\d$', desc: 'Phone number' },
      { pattern: '^(?=.*[A-Z])(?=.*\\d).{8,}$', desc: 'Strong password' },
      { pattern: '#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b', desc: 'Hex color' },
      { pattern: '^\\d{1,3}(\\.\\d{1,3}){3}$', desc: 'IPv4 address' },
      { pattern: '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$', desc: 'UUID v4' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRegex(
  pattern: string,
  flags: Set<FlagKey>,
): { regex: RegExp; error: string | null } {
  if (!pattern) return { regex: new RegExp(''), error: null };
  try {
    const flagStr = [...flags].join('');
    // Always include 'd' if supported for indices, fall back gracefully
    return { regex: new RegExp(pattern, flagStr), error: null };
  } catch (e: unknown) {
    return { regex: new RegExp(''), error: (e as Error).message };
  }
}

function runMatches(regex: RegExp, text: string, global: boolean): RegexMatch[] {
  if (!text) return [];
  const results: RegexMatch[] = [];
  const re = global
    ? new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
    : new RegExp(regex.source, regex.flags.replace('g', ''));

  if (global) {
    let m: RegExpExecArray | null;
    let safety = 0;
    while ((m = re.exec(text)) !== null && safety++ < 10_000) {
      results.push({
        fullMatch: m[0],
        groups: m.slice(1),
        namedGroups: (m.groups as Record<string, string | undefined>) ?? {},
        index: m.index,
        end: m.index + m[0].length,
      });
      // Avoid infinite loop on zero-length matches
      if (m[0].length === 0) re.lastIndex++;
    }
  } else {
    const m = re.exec(text);
    if (m) {
      results.push({
        fullMatch: m[0],
        groups: m.slice(1),
        namedGroups: (m.groups as Record<string, string | undefined>) ?? {},
        index: m.index,
        end: m.index + m[0].length,
      });
    }
  }
  return results;
}

/** Split text into segments: non-match and match pieces for rendering. */
interface Segment {
  text: string;
  matchIndex: number | null; // index into matches array, null = plain text
}

function buildSegments(text: string, matches: RegexMatch[]): Segment[] {
  if (matches.length === 0) return [{ text, matchIndex: null }];
  const segments: Segment[] = [];
  let cursor = 0;
  matches.forEach((m, mi) => {
    if (m.index > cursor) {
      segments.push({ text: text.slice(cursor, m.index), matchIndex: null });
    }
    segments.push({ text: m.fullMatch, matchIndex: mi });
    cursor = m.end;
  });
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matchIndex: null });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FlagToggle({
  flag,
  active,
  onToggle,
}: {
  flag: FlagKey;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      title={FLAG_DESCRIPTIONS[flag]}
      onClick={onToggle}
      className={[
        'px-2 py-0.5 rounded text-xs font-mono font-semibold border transition-colors',
        active
          ? 'bg-gh-accent/20 border-gh-accent text-gh-accent'
          : 'border-gh-border text-gh-fg-subtle hover:border-gh-fg-muted hover:text-gh-fg',
      ].join(' ')}
    >
      {flag}
    </button>
  );
}

function ReferenceSection({
  title,
  items,
  onInsert,
}: {
  title: string;
  items: { pattern: string; desc: string }[];
  onInsert: (p: string) => void;
}) {
  const [open, setOpen] = useState(title === 'Character Classes');
  return (
    <div className="border border-gh-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gh-subtle hover:bg-gh-overlay text-xs font-semibold text-gh-fg transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && (
        <div className="divide-y divide-gh-border/40">
          {items.map(({ pattern, desc }) => (
            <div
              key={pattern}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-gh-subtle group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <code className="text-[11px] font-mono text-gh-accent shrink-0 bg-gh-canvas px-1.5 py-0.5 rounded border border-gh-border/60">
                  {pattern}
                </code>
                <span className="text-xs text-gh-fg-muted truncate">{desc}</span>
              </div>
              <button
                onClick={() => onInsert(pattern)}
                title="Insert into pattern"
                className="text-[10px] text-gh-fg-subtle hover:text-gh-fg ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded border border-gh-border hover:bg-gh-overlay"
              >
                Insert
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState<Set<FlagKey>>(new Set(['g']));
  const [testString, setTestString] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('matches');
  const [copiedPattern, setCopiedPattern] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);
  const patternRef = useRef<HTMLInputElement>(null);

  const toggleFlag = useCallback((f: FlagKey) => {
    setFlags((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }, []);

  const { regex, error } = useMemo(
    () => buildRegex(pattern, flags),
    [pattern, flags],
  );

  const matches = useMemo(() => {
    if (error || !pattern) return [];
    return runMatches(regex, testString, flags.has('g'));
  }, [regex, testString, error, pattern, flags]);

  const segments = useMemo(
    () => buildSegments(testString, matches),
    [testString, matches],
  );

  const replaceResult = useMemo(() => {
    if (error || !pattern || !testString) return '';
    try {
      const re = new RegExp(
        regex.source,
        flags.has('g') ? regex.flags : regex.flags.replace('g', ''),
      );
      return testString.replace(re, replaceWith);
    } catch {
      return '';
    }
  }, [regex, testString, replaceWith, error, pattern, flags]);

  const handleCopyPattern = useCallback(async () => {
    if (!pattern) return;
    await navigator.clipboard.writeText(`/${pattern}/${[...flags].join('')}`);
    setCopiedPattern(true);
    setTimeout(() => setCopiedPattern(false), 1800);
  }, [pattern, flags]);

  const handleCopyResult = useCallback(async () => {
    if (!replaceResult) return;
    await navigator.clipboard.writeText(replaceResult);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 1800);
  }, [replaceResult]);

  const handleClear = useCallback(() => {
    setPattern('');
    setTestString('');
    setReplaceWith('');
    setFlags(new Set(['g']));
    patternRef.current?.focus();
  }, []);

  const handleInsertFromRef = useCallback(
    (p: string) => {
      setPattern((prev) => prev + p);
      patternRef.current?.focus();
    },
    [],
  );

  const matchCountLabel =
    matches.length === 0
      ? 'No matches'
      : matches.length === 1
      ? '1 match'
      : `${matches.length} matches`;

  // Hint: multiline test string + anchors used + no m flag
  const showMultilineHint =
    !!pattern &&
    !error &&
    matches.length === 0 &&
    testString.includes('\n') &&
    !flags.has('m') &&
    /\^|\$/.test(pattern);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full overflow-hidden text-gh-fg">
      {/* ── Left column: pattern + test string + highlighted preview ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-gh-border">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gh-border shrink-0 bg-gh-canvas">
          <div className="flex items-center gap-2">
            <Regex size={15} className="text-gh-accent" />
            <span className="text-sm font-semibold text-gh-fg">Regex Tester</span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            icon={<RefreshCw size={12} />}
            onClick={handleClear}
            title="Clear all"
          >
            Clear
          </Button>
        </div>

        {/* Pattern input */}
        <div className="px-4 pt-3 pb-2 border-b border-gh-border shrink-0">
          <label className="block text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider mb-1.5">
            Pattern
          </label>
          <div
            className={[
              'flex items-center gap-0 rounded-md border overflow-hidden transition-colors',
              error ? 'border-gh-danger' : 'border-gh-border focus-within:border-gh-accent',
            ].join(' ')}
          >
            {/* Delimiter */}
            <span className="px-2 py-1.5 text-gh-fg-muted font-mono text-sm bg-gh-subtle select-none border-r border-gh-border">
              /
            </span>
            <input
              ref={patternRef}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. (\w+)@(\w+\.\w+)"
              spellCheck={false}
              className="flex-1 bg-gh-overlay px-2 py-1.5 text-sm font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none"
            />
            {/* Closing delimiter + flags inline */}
            <span className="px-1 py-1.5 text-gh-fg-muted font-mono text-sm bg-gh-subtle select-none border-l border-gh-border">
              /
            </span>
            <div className="flex items-center gap-1 px-2 bg-gh-subtle">
              {(['g', 'i', 'm', 's'] as FlagKey[]).map((f) => (
                <FlagToggle
                  key={f}
                  flag={f}
                  active={flags.has(f)}
                  onToggle={() => toggleFlag(f)}
                />
              ))}
            </div>
            {/* Copy pattern */}
            <button
              onClick={handleCopyPattern}
              title="Copy as /pattern/flags"
              disabled={!pattern}
              className="px-2 py-1.5 border-l border-gh-border bg-gh-subtle text-gh-fg-subtle hover:text-gh-fg disabled:opacity-40 transition-colors"
            >
              {copiedPattern ? <Check size={13} className="text-gh-success" /> : <Copy size={13} />}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-1.5 mt-1.5 text-gh-danger text-xs">
              <AlertCircle size={12} />
              <span className="font-mono">{error}</span>
            </div>
          )}
        </div>

        {/* Test string */}
        <div className="px-4 pt-3 pb-2 flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider">
              Test String
            </label>
            {pattern && !error && (
              <span
                className={[
                  'text-[11px] font-medium px-2 py-0.5 rounded-full',
                  matches.length > 0
                    ? 'bg-gh-success/15 text-gh-success'
                    : 'bg-gh-fg-subtle/10 text-gh-fg-subtle',
                ].join(' ')}
              >
                {matchCountLabel}
              </span>
            )}
          </div>

          {/* Multiline hint */}
          {showMultilineHint && (
            <div className="flex items-center gap-1.5 mb-1.5 px-2.5 py-1.5 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs">
              <AlertCircle size={12} className="shrink-0" />
              <span>
                Your pattern uses <code className="font-mono">^</code> or <code className="font-mono">$</code> but the test string has multiple lines.{' '}
                Enable the{' '}
                <button
                  onClick={() => toggleFlag('m')}
                  className="underline font-semibold hover:text-amber-300 transition-colors"
                >
                  m flag
                </button>{' '}
                to match per-line.
              </span>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Paste or type your test string here…"
            spellCheck={false}
            className="flex-1 w-full min-h-0 resize-none rounded-md border border-gh-border bg-gh-overlay px-3 py-2 text-sm font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent transition-colors"
          />
        </div>

        {/* Highlighted preview */}
        {testString && matches.length > 0 && (
          <div className="px-4 pb-3 shrink-0">
            <label className="block text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider mb-1.5">
              Highlighted Matches
            </label>
            <div className="rounded-md border border-gh-border bg-gh-canvas px-3 py-2 text-sm font-mono text-gh-fg leading-relaxed max-h-40 overflow-y-auto">
              {segments.map((seg, i) =>
                seg.matchIndex !== null ? (
                  <mark
                    key={i}
                    className={[
                      'rounded-sm',
                      HIGHLIGHT_COLORS[seg.matchIndex % HIGHLIGHT_COLORS.length],
                    ].join(' ')}
                    style={{ background: 'transparent' }}
                    title={`Match ${seg.matchIndex + 1}`}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right column: tabs ── */}
      <div className="flex flex-col w-[380px] min-w-[300px] overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-gh-border bg-gh-canvas shrink-0">
          {(
            [
              { id: 'matches' as ActiveTab, label: 'Matches', icon: <Search size={12} /> },
              { id: 'replace' as ActiveTab, label: 'Replace', icon: <Replace size={12} /> },
              { id: 'reference' as ActiveTab, label: 'Reference', icon: <BookOpen size={12} /> },
            ] as const
          ).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                activeTab === id
                  ? 'border-gh-accent text-gh-accent'
                  : 'border-transparent text-gh-fg-muted hover:text-gh-fg',
              ].join(' ')}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Matches tab ── */}
          {activeTab === 'matches' && (
            <div className="p-3">
              {!pattern ? (
                <p className="text-xs text-gh-fg-subtle text-center py-8">
                  Enter a pattern to see matches
                </p>
              ) : error ? (
                <p className="text-xs text-gh-danger text-center py-8">
                  Fix the regex error to see matches
                </p>
              ) : matches.length === 0 ? (
                <p className="text-xs text-gh-fg-subtle text-center py-8">
                  {testString ? 'No matches found' : 'Enter a test string'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {matches.map((m, mi) => (
                    <div
                      key={mi}
                      className="rounded-lg border border-gh-border bg-gh-overlay overflow-hidden"
                    >
                      {/* Match header */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gh-subtle border-b border-gh-border">
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                              `bg-[hsl(${(mi * 47) % 360},60%,50%)]`,
                            ].join(' ')}
                          >
                            {mi + 1}
                          </span>
                          <code className="text-xs font-mono text-gh-fg break-all">
                            {m.fullMatch || <span className="text-gh-fg-subtle italic">empty string</span>}
                          </code>
                        </div>
                        <span className="text-[10px] text-gh-fg-subtle shrink-0 ml-2">
                          {m.index}–{m.end}
                        </span>
                      </div>

                      {/* Capture groups */}
                      {(m.groups.length > 0 || Object.keys(m.namedGroups).length > 0) && (
                        <div className="px-3 py-1.5">
                          {/* Named groups first */}
                          {Object.entries(m.namedGroups).map(([name, val]) => (
                            <div key={name} className="flex items-center gap-2 py-0.5">
                              <span className="text-[10px] text-gh-fg-muted font-mono shrink-0">
                                (?&lt;{name}&gt;)
                              </span>
                              <code className="text-[11px] font-mono text-gh-accent truncate">
                                {val ?? <span className="text-gh-fg-subtle italic">undefined</span>}
                              </code>
                            </div>
                          ))}
                          {/* Numbered groups */}
                          {m.groups.map((g, gi) => (
                            <div key={gi} className="flex items-center gap-2 py-0.5">
                              <span className="text-[10px] text-gh-fg-muted font-mono shrink-0">
                                ${gi + 1}
                              </span>
                              <code className="text-[11px] font-mono text-gh-accent truncate">
                                {g !== undefined ? g : <span className="text-gh-fg-subtle italic">undefined</span>}
                              </code>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Replace tab ── */}
          {activeTab === 'replace' && (
            <div className="p-3 flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider mb-1.5">
                  Replace With
                </label>
                <input
                  value={replaceWith}
                  onChange={(e) => setReplaceWith(e.target.value)}
                  placeholder="e.g. $1 or ${name}"
                  spellCheck={false}
                  className="w-full rounded-md border border-gh-border bg-gh-overlay px-3 py-1.5 text-sm font-mono text-gh-fg placeholder:text-gh-fg-subtle focus:outline-none focus:border-gh-accent transition-colors"
                />
                <p className="text-[11px] text-gh-fg-subtle mt-1">
                  Use <code className="text-gh-accent font-mono">$1</code>,{' '}
                  <code className="text-gh-accent font-mono">$2</code> for groups,{' '}
                  <code className="text-gh-accent font-mono">$&amp;</code> for full match
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gh-fg-muted uppercase tracking-wider">
                    Result
                  </label>
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={copiedResult ? <Check size={11} className="text-gh-success" /> : <Copy size={11} />}
                    onClick={handleCopyResult}
                    disabled={!replaceResult}
                  >
                    Copy
                  </Button>
                </div>
                <pre className="rounded-md border border-gh-border bg-gh-canvas p-3 text-xs font-mono text-gh-fg whitespace-pre-wrap break-all min-h-[80px] max-h-72 overflow-y-auto">
                  {replaceResult || (
                    <span className="text-gh-fg-subtle italic">
                      {!pattern ? 'Enter a pattern above' : !testString ? 'Enter a test string' : 'No matches to replace'}
                    </span>
                  )}
                </pre>
              </div>

              {pattern && !error && matches.length > 0 && (
                <p className="text-[11px] text-gh-fg-subtle">
                  {flags.has('g')
                    ? `Replaces all ${matches.length} match${matches.length !== 1 ? 'es' : ''}`
                    : 'Replaces only the first match (enable g flag for global)'}
                </p>
              )}
            </div>
          )}

          {/* ── Reference tab ── */}
          {activeTab === 'reference' && (
            <div className="p-3 flex flex-col gap-2">
              <p className="text-[11px] text-gh-fg-subtle mb-1">
                Click <strong>Insert</strong> to append a token to your pattern.
              </p>
              {REFERENCE_GROUPS.map((group) => (
                <ReferenceSection
                  key={group.title}
                  title={group.title}
                  items={group.items}
                  onInsert={handleInsertFromRef}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
