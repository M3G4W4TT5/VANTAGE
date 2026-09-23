import type { ConnectionDto, ConnectionTemplateDto, ConnectorTypeDto } from '../../api/generated/client';

export type SettingField = { type?: string; title?: string; description?: string; readOnly?: boolean;
  enum?: (string | number)[]; minimum?: number; maximum?: number };
export type SettingsSchema = { title?: string; required?: string[]; properties?: Record<string, SettingField> };
export type ConnectionDraft = { id: string | null; name: string; connectorTypeId: string; templateId: string | null;
  schemaVersion: number; revision: number | null; scope: 'global' | 'workspace'; workspaceId: string | null;
  enabled: boolean; settings: Record<string, unknown> };

export function draftFromConnection(row: ConnectionDto): ConnectionDraft {
  return { id: row.id ?? null, name: row.name ?? '', connectorTypeId: row.connectorTypeId ?? '',
    templateId: row.templateId ?? null, schemaVersion: row.schemaVersion ?? 1, revision: row.revision ?? 1,
    scope: row.scope === 'workspace' ? 'workspace' : 'global', workspaceId: row.workspaceId ?? null,
    enabled: row.enabled ?? false, settings: structuredClone(row.settings ?? {}) };
}

export function draftFromTemplate(template: ConnectionTemplateDto, type: ConnectorTypeDto): ConnectionDraft {
  return { id: null, name: template.name ?? type.name ?? '', connectorTypeId: type.id ?? '',
    templateId: template.id ?? null, schemaVersion: template.schemaVersion ?? 1, revision: null,
    scope: 'global', workspaceId: null, enabled: true, settings: structuredClone(template.settings ?? {}) };
}

export function validateDraft(draft: ConnectionDraft, schema: SettingsSchema | null, workspaceIds: string[]): string[] {
  const problems: string[] = [];
  if (!draft.name.trim() || draft.name.trim().length > 120) problems.push('Name must contain 1–120 characters.');
  if (draft.scope === 'workspace' && (!draft.workspaceId || !workspaceIds.includes(draft.workspaceId)))
    problems.push('Choose an owned workspace for workspace-only availability.');
  if (!schema?.properties) { problems.push('Settings schema is unavailable. Retry before saving.'); return problems; }
  for (const key of Object.keys(draft.settings)) if (!(key in schema.properties)) problems.push(`${key} is not in this settings schema.`);
  for (const [key, field] of Object.entries(schema.properties)) {
    const value = draft.settings[key];
    const label = field.title ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase());
    if (value === undefined) { if (schema.required?.includes(key)) problems.push(`${label} is required.`); continue; }
    if (field.type === 'integer' || field.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value) || field.type === 'integer' && !Number.isInteger(value) ||
        field.minimum !== undefined && value < field.minimum || field.maximum !== undefined && value > field.maximum)
        problems.push(`${label} is outside the allowed range.`);
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') problems.push(`${label} must be on or off.`);
    } else if (field.type === 'string') {
      if (typeof value !== 'string') problems.push(`${label} must be text.`);
    } else problems.push(`${label} uses an unsupported field type.`);
    if (field.enum && !field.enum.includes(value as string | number)) problems.push(`${label} has an unsupported value.`);
  }
  return problems;
}

export function draftChanged(draft: ConnectionDraft | null, baseline: ConnectionDraft | null): boolean {
  return !!draft && (!baseline || JSON.stringify(draft) !== JSON.stringify(baseline));
}
