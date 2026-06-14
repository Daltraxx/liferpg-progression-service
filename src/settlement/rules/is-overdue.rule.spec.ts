import isOverdue from './is-overdue.rule';

describe('isOverdue', () => {
  it('returns true when lastCompletedDate is null', () => {
    const result = isOverdue(3, null, '2026-06-13T00:00:00.000Z');

    expect(result).toBe(true);
  });

  it('returns false when elapsed days are less than frequency', () => {
    const result = isOverdue(
      3,
      '2026-06-10T00:00:00.000Z',
      '2026-06-12T00:00:00.000Z',
    );

    expect(result).toBe(false);
  });

  it('returns true when elapsed days equal frequency', () => {
    const result = isOverdue(
      3,
      '2026-06-10T00:00:00.000Z',
      '2026-06-13T00:00:00.000Z',
    );

    expect(result).toBe(true);
  });

  it('returns true when elapsed days are greater than frequency', () => {
    const result = isOverdue(
      3,
      '2026-06-10T00:00:00.000Z',
      '2026-06-14T00:00:00.000Z',
    );

    expect(result).toBe(true);
  });

  it('rounds down partial days before comparing with frequency', () => {
    const result = isOverdue(
      2,
      '2026-06-10T12:00:00.000Z',
      '2026-06-12T11:59:59.000Z',
    );

    expect(result).toBe(false);
  });

  it('treats exact full-day boundaries as elapsed days', () => {
    const result = isOverdue(
      2,
      '2026-06-10T12:00:00.000Z',
      '2026-06-12T12:00:00.000Z',
    );

    expect(result).toBe(true);
  });
});
