import Character from './models/Character';
import { GenericMutation } from './Mutation';
import { ColorObject, OnCompleteFunction, Point, RecursivePartial } from './typings/types';
export type StrokeRenderState = {
    opacity: number;
    displayPortion: number;
};
export type CharacterRenderState = {
    opacity: number;
    strokes: Record<number | string, StrokeRenderState>;
};
export type RenderStateObject = {
    options: {
        drawingFadeDuration: number;
        drawingWidth: number;
        drawingColor: ColorObject;
        strokeColor: ColorObject;
        outlineColor: ColorObject;
        radicalColor: ColorObject;
        highlightColor: ColorObject;
    };
    character: {
        main: CharacterRenderState;
        outline: CharacterRenderState;
        highlight: CharacterRenderState;
    };
    userStrokes: Record<string, {
        points: Point[];
        opacity: number;
    } | undefined> | null;
};
export type CharacterName = keyof RenderStateObject['character'];
type OnStateChangeCallback = (nextState: RenderStateObject, currentState: RenderStateObject) => void;
type MutationChain = {
    _isActive: boolean;
    _index: number;
    _resolve: OnCompleteFunction;
    _mutations: GenericMutation[];
    _loop: boolean | undefined;
    _scopes: string[];
};
export type RenderStateOptions = {
    strokeColor: string;
    radicalColor: string | null;
    highlightColor: string;
    outlineColor: string;
    drawingColor: string;
    drawingFadeDuration: number;
    drawingWidth: number;
    outlineWidth: number;
    showCharacter: boolean;
    showOutline: boolean;
};
export default class RenderState {
    _mutationChains: MutationChain[];
    _onStateChange: OnStateChangeCallback;
    state: RenderStateObject;
    constructor(character: Character, options: RenderStateOptions, onStateChange?: OnStateChangeCallback);
    overwriteOnStateChange(onStateChange: OnStateChangeCallback): void;
    updateState(stateChanges: RecursivePartial<RenderStateObject>): void;
    run(mutations: GenericMutation[], options?: {
        loop?: boolean;
    }): Promise<{
        canceled: boolean;
    }>;
    _run(mutationChain: MutationChain): void;
    _getActiveMutations(): GenericMutation<RenderState>[];
    pauseAll(): void;
    resumeAll(): void;
    cancelMutations(scopesToCancel: string[]): void;
    cancelAll(): void;
    _cancelMutationChain(mutationChain: MutationChain): void;
}
export {};
