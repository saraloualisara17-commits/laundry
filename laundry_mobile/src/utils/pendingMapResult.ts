export type MapResult = {
  address: string;
  region: string;
  lat: number;
  lng: number;
};

let _pending: MapResult | null = null;

export const pendingMapResult = {
  set: (r: MapResult) => { _pending = r; },
  consume: (): MapResult | null => { const r = _pending; _pending = null; return r; },
};
