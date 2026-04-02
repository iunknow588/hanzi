import HanziWriter from 'hanzi-writer';
import { createCharDataLoader } from 'hanzi-writer-data-client';
import localDataMap from './local-data.json';

const loader = createCharDataLoader({
  source: 'hybrid',
  localData: (char) => localDataMap[char as keyof typeof localDataMap],
});

const writerContainer = document.getElementById('writer');
const statusElm = document.getElementById('loader-status');

if (!writerContainer) {
  throw new Error('#writer element missing');
}

const setStatus = (msg: string) => {
  if (statusElm) {
    statusElm.textContent = msg;
  }
};

const createWriter = (char: string) => {
  writerContainer.innerHTML = '';
  return HanziWriter.create(writerContainer, char, {
    width: 360,
    height: 360,
    padding: 10,
    charDataLoader: loader,
  });
};

const loadCharacter = (char: string) => {
  if (!char) return;
  const hasLocal = Boolean(localDataMap[char as keyof typeof localDataMap]);
  setStatus(hasLocal ? `使用本地缓存加载 ${char}` : `从 CDN 拉取 ${char} 数据...`);
  currentWriter
    .setCharacter(char)
    .then(() => setStatus(`已加载 ${char}`))
    .catch((error) => {
      console.error(error);
      setStatus(`加载 ${char} 失败，重建画布...`);
      currentWriter = createWriter(char);
    });
};

let currentWriter = createWriter('我');
loadCharacter('我');

const input = document.getElementById('char-input') as HTMLInputElement | null;
const button = document.getElementById('load-btn');
const chipList = document.getElementById('local-chip-list');

if (chipList) {
  Object.keys(localDataMap).forEach((char) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = char;
    chip.addEventListener('click', () => {
      if (input) input.value = char;
      loadCharacter(char);
    });
    chipList.appendChild(chip);
  });
}

button?.addEventListener('click', () => {
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  loadCharacter(value);
});
