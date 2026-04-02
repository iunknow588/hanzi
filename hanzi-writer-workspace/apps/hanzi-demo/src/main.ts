import HanziWriter from 'hanzi-writer';
import { createCharDataLoader } from 'hanzi-writer-data-client';
import localDataMap from './local-data.json';

const loader = createCharDataLoader({
  source: 'hybrid',
  localData: (char) => localDataMap[char as keyof typeof localDataMap],
});

const writerContainer = document.getElementById('writer');
const statusElm = document.getElementById('loader-status');
const scoreTotalElm = document.getElementById('score-total-value');
const scoreListElm = document.getElementById('score-strokes');

if (!writerContainer) {
  throw new Error('#writer element missing');
}

const setStatus = (msg: string) => {
  if (statusElm) {
    statusElm.textContent = msg;
  }
};

type ScoreComponents = {
  endpoints: number;
  direction: number;
  shape: number;
  order: number;
};

type ScoreEntry = {
  strokeIndex: number;
  overall: number;
  accepted: boolean;
  components: ScoreComponents;
};

type ScoreUpdatePayload = {
  overallScore: number;
  strokeIndex: number;
  score: ScoreEntry;
  history: Array<ScoreEntry | null>;
};

const resetScorePanel = () => {
  if (scoreTotalElm) scoreTotalElm.textContent = '--';
  if (scoreListElm) {
    scoreListElm.innerHTML = '<li class="score-pending">等待评分…</li>';
  }
};

const formatScore = (value: number) => `${Math.round(value * 100)}`;

const getScoreBand = (value: number) => {
  if (value >= 0.8) return 'good';
  if (value >= 0.5) return 'medium';
  return 'poor';
};

const renderScoreHistory = (history: Array<ScoreEntry | null>) => {
  if (!scoreListElm) return;
  scoreListElm.innerHTML = '';
  if (!history.length) {
    scoreListElm.innerHTML = '<li class="score-pending">等待评分…</li>';
    return;
  }
  history.forEach((entry, index) => {
    const li = document.createElement('li');
    if (!entry) {
      li.className = 'score-pending';
      li.textContent = `第 ${index + 1} 笔：待评分`;
    } else {
      li.classList.add(`score-${getScoreBand(entry.overall)}`);
      const label = document.createElement('span');
      label.textContent = `第 ${index + 1} 笔：${formatScore(entry.overall)}`;
      const detail = document.createElement('span');
      detail.className = 'score-chip';
      detail.textContent = `起止${formatScore(entry.components.endpoints)} · 走向${formatScore(
        entry.components.direction,
      )} · 形态${formatScore(entry.components.shape)}`;
      li.append(label, detail);
    }
    scoreListElm.appendChild(li);
  });
};

const handleScoreUpdate = (payload: ScoreUpdatePayload) => {
  if (scoreTotalElm) {
    scoreTotalElm.textContent = `${formatScore(payload.overallScore)}`;
  }
  renderScoreHistory(payload.history);
};

const createWriter = (char: string) => {
  writerContainer.innerHTML = '';
  return HanziWriter.create(writerContainer, char, {
    width: 360,
    height: 360,
    padding: 10,
    charDataLoader: loader,
    enableLocalScoring: true,
    onScoreUpdate: handleScoreUpdate,
  });
};

const loadCharacter = (char: string) => {
  if (!char) return;
  resetScorePanel();
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

resetScorePanel();
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
