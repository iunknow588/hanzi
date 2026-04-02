export type CharacterJson = Record<string, any>;

export type LoaderSource = 'cdn' | 'local' | 'hybrid';

export type LocalDataMap = Record<string, CharacterJson> | ((char: string) => CharacterJson | Promise<CharacterJson | undefined> | undefined);

export type LoaderFetcher = (url: string) => Promise<CharacterJson>;

export type LoaderHook = (char: string, resource: string, dataOrError?: any) => void;

export interface CreateLoaderOptions {
  source?: LoaderSource;
  cdnBaseUrl?: string;
  dataVersion?: string;
  localData?: LocalDataMap | null;
  fetcher?: LoaderFetcher;
  onRequestStart?: LoaderHook;
  onRequestSuccess?: LoaderHook;
  onRequestError?: LoaderHook;
}

export type HanziCharDataLoader = (
  char: string,
  onLoad?: (data: CharacterJson) => void,
  onError?: (error: unknown) => void,
) => Promise<CharacterJson>;

export declare function createCharDataLoader(options?: CreateLoaderOptions): HanziCharDataLoader;
export declare function loadMany(loader: HanziCharDataLoader, chars?: string[]): Promise<Record<string, CharacterJson | null>>;
export declare const DEFAULT_CDN_BASE: string;
