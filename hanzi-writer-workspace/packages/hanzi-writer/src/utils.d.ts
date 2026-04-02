import { ColorObject, RecursivePartial } from './typings/types';
export declare const performanceNow: () => number;
export declare const requestAnimationFrame: typeof globalThis.requestAnimationFrame;
export declare const cancelAnimationFrame: typeof globalThis.cancelAnimationFrame;
export declare const _assign: (target: any, ...overrides: any[]) => any;
export declare const assign: {
    <T extends {}, U>(target: T, source: U): T & U;
    <T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
    <T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
    (target: object, ...sources: any[]): any;
};
export declare function arrLast<TValue>(arr: Array<TValue>): TValue;
export declare const fixIndex: (index: number, length: number) => number;
export declare const selectIndex: <T>(arr: Array<T>, index: number) => T;
export declare function copyAndMergeDeep<T>(base: T, override: RecursivePartial<T> | undefined): T;
/** basically a simplified version of lodash.get, selects a key out of an object like 'a.b' from {a: {b: 7}} */
export declare function inflate(scope: string, obj: any): any;
export declare function counter(): number;
export declare function average(arr: number[]): number;
export declare function timeout(duration?: number): Promise<unknown>;
export declare function colorStringToVals(colorString: string): ColorObject;
export declare const trim: (string: string) => string;
export declare function objRepeat<T>(item: T, times: number): Record<number, T>;
export declare function objRepeatCb<T>(times: number, cb: (i: number) => T): Record<number, T>;
export declare const isMsBrowser: boolean;
export declare const noop: () => void;
