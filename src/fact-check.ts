/**
 * Code-only fact-survival check (no LLM judge). Rules per fact come from data/logs/logNN.json.
 *   all:      every group needs one alternative somewhere in the output
 *   sameLine: one output line must hold an alternative from every group (used for negatives,
 *             preferences, rules, refusals, attribution, so the qualifier has to stay with the fact)
 *   current:  the new value is present, and either the old value is gone or a line with the new
 *             value also says it is current ("now", "changed", "updated", ...)
 *   absent:   control case, passes when none of the tokens survive
 * Matching is case-insensitive on normalized text: accents stripped, curly quotes and dashes
 * flattened, thousands separators removed ("$4,750" -> "$4750"). A token must start at a word
 * boundary; a token ending in a digit must also end at one ("500" does not match "1500" or "5000").
 */
export type Check = {
  all?: string[][];
  sameLine?: string[][];
  current?: { new: string[]; old: string[]; markers: string[] };
  absent?: string[];
};
export type CheckResult = { pass: boolean; reason: string };

export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/(?<=\d),(?=\d{3})/g, '');
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function hasToken(text: string, token: string): boolean {
  const t = normalize(token);
  const tail = /\d$/.test(t) ? '(?![0-9])' : '';
  return new RegExp(`(?<![a-z0-9])${esc(t)}${tail}`).test(normalize(text));
}

const anyOf = (text: string, alts: string[]) => alts.find(a => hasToken(text, a));

export function checkFact(output: string, check: Check): CheckResult {
  const lines = output.split('\n').filter(l => l.trim());
  if (check.absent) {
    const hit = anyOf(output, check.absent);
    return hit ? { pass: false, reason: `noise kept: "${hit}"` } : { pass: true, reason: 'noise dropped' };
  }
  if (check.all) {
    for (const group of check.all) {
      if (!anyOf(output, group)) return { pass: false, reason: `missing any of [${group.slice(0, 4).join(' | ')}]` };
    }
  }
  if (check.sameLine) {
    const line = lines.find(l => check.sameLine!.every(g => anyOf(l, g)));
    if (!line) {
      const keyLine = lines.find(l => anyOf(l, check.sameLine![0]));
      return {
        pass: false,
        reason: keyLine
          ? `fact present but qualifier missing on its line: "${keyLine.trim().slice(0, 140)}"`
          : `missing any of [${check.sameLine[0].slice(0, 4).join(' | ')}]`,
      };
    }
  }
  if (check.current) {
    const { new: nw, old, markers } = check.current;
    const newLines = lines.filter(l => anyOf(l, nw));
    if (!newLines.length) return { pass: false, reason: `new value missing [${nw.join(' | ')}]` };
    const oldKept = !!anyOf(output, old);
    if (oldKept && !newLines.some(l => anyOf(l, markers))) {
      return { pass: false, reason: 'old and new both present, new not marked current' };
    }
  }
  return { pass: true, reason: 'found' };
}
