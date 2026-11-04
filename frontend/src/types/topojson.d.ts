/**
 * frontend/src/types/topojson.d.ts
 * Type definitions for topojson-client feature extraction.
 */
declare module 'topojson-client' {
  export function feature<T = any>(topology: any, object: any): {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      id?: string | number;
      properties?: Record<string, any>;
      geometry: {
        type: string;
        coordinates: any;
      };
    }>;
  };
  export function mesh(topology: any, object?: any, filter?: any): any;
  export function bbox(topology: any): [number, number, number, number];
}
