import { describe, expect, it } from 'vitest';
import { draftChanged, draftFromConnection, draftFromTemplate, validateDraft } from '../src/platform/nexus/nexusDraft';

const schema = { required: ['pollSeconds'], properties: { pollSeconds: {
  type: 'integer', readOnly: true, minimum: 30, maximum: 600,
} } };

describe('NEXUS connection drafts', () => {
  it('creates an explicit unsaved template draft without mutating the versioned template', () => {
    const template = { id: 'adsb-lol-default', version: 1, connectorTypeId: 'adsb-lol', name: 'Aircraft',
      schemaVersion: 1, settings: { pollSeconds: 30 } };
    const draft = draftFromTemplate(template, { id: 'adsb-lol', name: 'Aircraft' });
    expect(draftChanged(draft, null)).toBe(true);
    draft.settings.pollSeconds = 60;
    expect(template.settings.pollSeconds).toBe(30);
    expect(validateDraft(draft, schema, [])).toEqual([]);
  });

  it('preserves the saved revision and rejects invalid scope and settings before Save', () => {
    const draft = draftFromConnection({ id: 'connection-1', name: 'Saved', connectorTypeId: 'adsb-lol',
      schemaVersion: 1, revision: 7, scope: 'global', enabled: true, settings: { pollSeconds: 30 } });
    expect(draftChanged(draft, structuredClone(draft))).toBe(false);
    const invalid = { ...draft, scope: 'workspace' as const, workspaceId: 'foreign', settings: { pollSeconds: 5 } };
    expect(validateDraft(invalid, schema, ['owned'])).toEqual([
      'Choose an owned workspace for workspace-only availability.', 'Poll Seconds is outside the allowed range.',
    ]);
    expect(invalid.revision).toBe(7);
  });
});
