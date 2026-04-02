const DEFAULT_DATA_VERSION = '2.0.1';
export const DEFAULT_CDN_BASE = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${DEFAULT_DATA_VERSION}`;

const noop = () => {};

const buildUrl = (baseUrl, char) => {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  return `${normalizedBase}/${encodeURIComponent(char)}.json`;
};

const xhrFetch = (url) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.overrideMimeType?.('application/json');
    xhr.onerror = (event) => reject(event || new Error('Network error'));
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
      } else if (xhr.status !== 0) {
        reject(new Error(`Failed to load ${url} (${xhr.status})`));
      }
    };
    xhr.send(null);
  });

const defaultFetcher = (url) => {
  if (typeof fetch === 'function') {
    return fetch(url).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${url} (${res.status})`);
      }
      return res.json();
    });
  }
  if (typeof XMLHttpRequest !== 'undefined') {
    return xhrFetch(url);
  }
  throw new Error('No fetch/XMLHttpRequest implementation available');
};

const normalizeLocalData = (localData = {}) => {
  if (!localData) return {};
  if (typeof localData === 'function') return localData;
  return (char) => localData[char];
};

const resolveLocal = async (char, localResolver) => {
  if (typeof localResolver === 'function') {
    return localResolver(char);
  }
  return undefined;
};

export const createCharDataLoader = (options = {}) => {
  const {
    source = 'cdn',
    cdnBaseUrl = DEFAULT_CDN_BASE,
    dataVersion = DEFAULT_DATA_VERSION,
    localData = null,
    fetcher = defaultFetcher,
    onRequestStart = noop,
    onRequestSuccess = noop,
    onRequestError = noop,
  } = options;

  const effectiveBase = options.cdnBaseUrl ? options.cdnBaseUrl : DEFAULT_CDN_BASE.replace(
    DEFAULT_DATA_VERSION,
    dataVersion,
  );

  const localResolver = normalizeLocalData(localData);

  const shouldUseLocal = source === 'local' || source === 'hybrid';
  const shouldUseRemote = source === 'cdn' || source === 'hybrid';

  const loadFromRemote = async (char) => {
    const url = buildUrl(effectiveBase, char);
    onRequestStart(char, url);
    try {
      const data = await fetcher(url);
      onRequestSuccess(char, url, data);
      return data;
    } catch (error) {
      onRequestError(char, url, error);
      throw error;
    }
  };

  const loadFromLocal = async (char) => {
    if (!shouldUseLocal) return undefined;
    const data = await resolveLocal(char, localResolver);
    if (data) {
      onRequestSuccess(char, 'local', data);
      return data;
    }
    return undefined;
  };

  return function hanziCharDataLoader(char, onLoad = noop, onError = noop) {
    const exec = async () => {
      if (!char) {
        throw new Error('Character is required');
      }
      if (shouldUseLocal) {
        const localDataResult = await loadFromLocal(char);
        if (localDataResult) {
          onLoad(localDataResult);
          return localDataResult;
        }
      }

      if (shouldUseRemote) {
        const remoteData = await loadFromRemote(char);
        onLoad(remoteData);
        return remoteData;
      }

      const err = new Error(`Unable to load data for ${char}`);
      onError(err);
      throw err;
    };

    return exec().catch((error) => {
      onError(error);
      throw error;
    });
  };
};

export const loadMany = async (loader, chars = []) => {
  const results = {};
  for (const char of chars) {
    try {
      results[char] = await loader(char);
    } catch (err) {
      results[char] = null;
    }
  }
  return results;
};
