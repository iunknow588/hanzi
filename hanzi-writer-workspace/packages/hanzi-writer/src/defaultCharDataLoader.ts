import { createCharDataLoader } from 'hanzi-writer-data-client';
import { CharacterJson } from './typings/types';

const defaultLoader = createCharDataLoader({
  source: 'hybrid',
  // 默认依旧以 CDN 为真实来源；localData 可在运行时注入
  localData: null,
});

const defaultCharDataLoader = (
  char: string,
  onLoad: (parsedJson: CharacterJson) => void,
  onError: (error?: any, context?: any) => void,
) => {
  return defaultLoader(char, onLoad, onError);
};

export default defaultCharDataLoader;
