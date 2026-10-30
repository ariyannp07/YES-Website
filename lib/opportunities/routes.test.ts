import { describe, expect, it } from 'vitest';
import { opportunitiesReturnPath } from './routes';

describe('Opportunities sign-in return links', () => {
  it('preserves event, filter and profile links and canonicalizes old Calendar links', () => {
    expect(opportunitiesReturnPath('/calendar/index.html?view=month&month=2026-11&event=one')).toBe('/opportunities?view=month&month=2026-11&event=one');
    expect(opportunitiesReturnPath('/opportunities?section=network&company=notion')).toBe('/opportunities?section=network&company=notion');
  });
  it('rejects external, protocol-relative, encoded and unrelated destinations', () => {
    for (const path of ['https://example.com/opportunities', '//example.com/opportunities', '/\\example.com/opportunities', '/%2fexample.com', '/api/calendar/auth/logout', null]) {
      expect(opportunitiesReturnPath(path)).toBe('/opportunities');
    }
    expect(opportunitiesReturnPath('/opportunities?redirect=https://example.com')).toBe('/opportunities');
  });
});
