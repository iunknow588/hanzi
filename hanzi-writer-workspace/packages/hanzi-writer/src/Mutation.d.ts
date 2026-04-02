import RenderState from './RenderState';
import { RecursivePartial } from './typings/types';
/** Used by `Mutation` & `Delay` */
export interface GenericMutation<TRenderStateClass extends GenericRenderStateClass = RenderState> {
    /** Allows mutations starting with the provided string to be cancelled */
    scope: string;
    /** Can be useful for checking whether the mutation is running */
    _runningPromise: Promise<void> | undefined;
    run(renderState: TRenderStateClass): Promise<void>;
    pause(): void;
    resume(): void;
    cancel(renderState: TRenderStateClass): void;
}
declare class Delay implements GenericMutation {
    scope: string;
    _runningPromise: Promise<void> | undefined;
    _duration: number;
    _startTime: number | null;
    _paused: boolean;
    _timeout: NodeJS.Timeout;
    _resolve: (() => void) | undefined;
    constructor(duration: number);
    run(): Promise<void>;
    pause(): void;
    resume(): void;
    cancel(): void;
}
type GenericRenderStateClass<T = any> = {
    state: T;
    updateState(changes: RecursivePartial<T>): void;
};
export default class Mutation<TRenderStateClass extends GenericRenderStateClass, TRenderStateObj = TRenderStateClass['state']> implements GenericMutation<TRenderStateClass> {
    static Delay: typeof Delay;
    scope: string;
    _runningPromise: Promise<void> | undefined;
    _valuesOrCallable: any;
    _duration: number;
    _force: boolean | undefined;
    _pausedDuration: number;
    _startPauseTime: number | null;
    _startTime: number | undefined;
    _startState: RecursivePartial<TRenderStateObj> | undefined;
    _renderState: TRenderStateClass | undefined;
    _frameHandle: number | undefined;
    _values: RecursivePartial<TRenderStateObj> | undefined;
    _resolve: ((_val?: any) => void) | undefined;
    /**
     *
     * @param scope a string representation of what fields this mutation affects from the state. This is used to cancel conflicting mutations
     * @param valuesOrCallable a thunk containing the value to set, or a callback which will return those values
     */
    constructor(scope: string, valuesOrCallable: any, options?: {
        duration?: number;
        /** Updates render state regardless if cancelled */
        force?: boolean;
    });
    run(renderState: TRenderStateClass): Promise<void>;
    private _inflateValues;
    pause(): void;
    resume(): void;
    private _tick;
    cancel(renderState: TRenderStateClass): void;
}
export {};
