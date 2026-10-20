// Ambient type shim — fontkit ships no TypeScript types (checked 2026-10-20, v2.0.4);
// only the cmap-coverage gate's surface is declared. Property names follow fontkit's
// public Font API.
declare module 'fontkit' {
  export interface Font {
    readonly characterSet: number[];
    readonly postscriptName: string;
    readonly familyName: string;
  }
  export function openSync(path: string): Font;
}
