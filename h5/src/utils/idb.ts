/**
 * 极简 IndexedDB 封装：用于存储较大的二进制数据（语音复盘 base64）。
 *
 * 为什么不用 localStorage：localStorage 容量约 5MB，单段语音就可能几百 KB，
 * 多段即爆。语音文件统一落 IndexedDB，summary store 只保存「小索引」
 * （日期 → 音频 meta 列表，meta 不含 base64），播放时再按 id 从 IDB 取全量。
 *
 * 仅在浏览器环境存在 indexedDB；原生 WebView 同样支持 IndexedDB，故真机也能用。
 */
const DB_NAME = 'notepad';
const STORE_NAME = 'audios';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** 单条语音记录（base64 不含 data: 前缀） */
export interface StoredAudio {
  id: string;
  /** 所属日期 YYYY-MM-DD */
  date: string;
  /** 时长（秒） */
  duration: number;
  /** 完整 mime，如 audio/webm、audio/mp4 */
  mime: string;
  /** base64 编码的音频数据（不含 data: 前缀） */
  data: string;
  createdAt: number;
}

export async function putAudio(audio: StoredAudio): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(audio);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudio(id: string): Promise<StoredAudio | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as StoredAudio | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudio(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
