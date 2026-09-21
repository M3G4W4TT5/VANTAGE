import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schemas from '../../../contracts/schemas/v1/records.schema.json';

export type Selection = { entityIds: string[]; observationIds: string[] };
export type PaneTime = { mode: 'live' | 'paused' | 'replay'; cursor: string | null; from: string | null; to: string | null };
export type Context = {
  schemaVersion: 1; workspaceId: string; paneId: string; selection: Selection;
  area: Record<string, unknown> | null; time: PaneTime; layerIds: string[];
  filters: Record<string, unknown>; linkGroupId: string | null;
};
export type ContextField = 'selection' | 'area' | 'time' | 'layerIds' | 'filters';
export type ContextEvent = {
  schemaVersion: 1; eventId: string; originPaneId: string; linkGroupId: string | null;
  revision: number; changedFields: ContextField[]; context: Context; causationId?: string;
};
export type Pane = { id: string; appId: string; stateSchemaVersion: number; state: Record<string, unknown>; context: Context };
export type Workspace = {
  id: string; name: string; revision: number; schemaVersion: 1;
  panes: Pane[]; linkGroups: { id: string; paneIds: string[]; fields: ('selection' | 'area' | 'time')[] }[];
  appStates: { shell: { theme: 'dark' | 'light'; activePaneId: string } };
  createdAt: string; updatedAt: string;
};
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schemas);
export function validateContract<T>(name: keyof typeof schemas.definitions, value: unknown): asserts value is T {
  const validate = ajv.getSchema(`${schemas.$id}#/definitions/${name}`)!;
  if (!validate(value)) throw new Error(`Unsupported or invalid ${name}: ${ajv.errorsText(validate.errors)}`);
}
export function readWorkspace(value: unknown): Workspace {
  validateContract<Workspace>('Workspace', value);
  return value;
}
