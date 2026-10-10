import { describe, expect, it } from 'vitest';
import { checkFact } from './fact-check';

// Known passes, known failures and borderline cases for each rule kind (write-code-eval step 3).
describe('checkFact', () => {
  it('all: matches across number formats and rejects longer numbers', () => {
    const c = { all: [['1850', '1.85k']] };
    expect(checkFact('* 🔴 Budget capped at $1,850/month', c).pass).toBe(true);
    expect(checkFact('* 🔴 Budget capped at $18,500/month', c).pass).toBe(false);
    expect(checkFact('* 🔴 Budget about $1.85k', c).pass).toBe(true);
  });
  it('all: dates in several formats', () => {
    const c = { all: [['june 9', 'jun 9', '2026-06-09']] };
    expect(checkFact('Audit starts Jun 9, 2026', c).pass).toBe(true);
    expect(checkFact('Audit starts 2026-06-09', c).pass).toBe(true);
    expect(checkFact('Audit starts June 19, 2026', c).pass).toBe(false);
  });
  it('all: accents are flattened', () => {
    expect(checkFact('Booked Casa do Príncipe', { all: [['casa do principe']] }).pass).toBe(true);
  });
  it('sameLine: negative must stay on the fact line', () => {
    const c = { sameLine: [['morocco'], ['never', 'first time']] };
    expect(checkFact('* User has never been to Morocco', c).pass).toBe(true);
    expect(checkFact('* Trip includes Morocco ferry\n* User never flew Ryanair', c).pass).toBe(false);
    expect(checkFact('* First time visiting Morocco', c).pass).toBe(true);
  });
  it('current: new value present and old dropped, or marked current', () => {
    const c = { current: { new: ['500'], old: ['300'], markers: ['now', 'raised'] } };
    expect(checkFact('* API rate limit: 500 req/min', c).pass).toBe(true);
    expect(checkFact('* API rate limit raised from 300 to 500 req/min', c).pass).toBe(true);
    expect(checkFact('* Limit 300 req/min\n* Limit 500 req/min', c).pass).toBe(false);
    expect(checkFact('* Limit 300 req/min', c).pass).toBe(false);
  });
  it('absent: control noise', () => {
    expect(checkFact('* Flight search retried', { absent: ['req_8fk2pq'] }).pass).toBe(true);
    expect(checkFact('* request id req_8fK2pQ', { absent: ['req_8fk2pq'] }).pass).toBe(false);
  });
});
