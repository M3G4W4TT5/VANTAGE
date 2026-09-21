export type PlaceResult = {
  id: string; name: string; country: string; longitude: number; latitude: number;
  sourceId: string; precision: 'approximate';
};
export interface PlaceSource {
  readonly id: string;
  readonly name: string;
  readonly coverage: string;
  readonly documentationUrl: string;
  search(query: string, cancellation: AbortSignal): Promise<PlaceResult[]>;
}
