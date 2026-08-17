/**
 * 录音封装（语音复盘）
 *
 * 双适配：
 * - 浏览器（isWeb，localhost 是安全上下文）：用原生 MediaRecorder 直接录，
 *   产出 Blob → base64。
 * - 原生环境（真机离线包是 file://，getUserMedia 不可用）：走录音桥
 *   call('device.audio.start' / 'device.audio.stop')，原生录完回传 base64。
 *
 * 统一返回 AudioClip { id, duration, mime, base64 }，播放端自行拼
 * `data:${mime};base64,${base64}`。
 *
 * 注意：usePlatform 必须在 composable 函数体内调用（setup 上下文），
 * 不能在模块顶层调用，否则 pinia 未激活。
 */
import { ref, onUnmounted } from 'vue';
import { call } from '@/bridge';
import { usePlatform } from '@/composables/useApp';
import { uid } from '@/utils/uid';

export interface AudioClip {
  id: string;
  /** 时长（秒） */
  duration: number;
  /** 完整 mime，如 audio/webm、audio/mp4 */
  mime: string;
  /** base64（不含 data: 前缀） */
  base64: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const result = (r.result as string) ?? '';
      resolve(result.split(',')[1] ?? '');
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function formatToMime(f: string): string {
  switch (f) {
    case 'webm':
      return 'audio/webm';
    case 'mp3':
      return 'audio/mpeg';
    case '3gp':
      return 'audio/3gpp';
    default:
      return 'audio/mp4'; // m4a
  }
}

export function useAudioRecorder() {
  const { isWeb } = usePlatform();

  const recording = ref(false);
  const elapsed = ref(0);
  let timer: number | undefined;
  let startTime = 0;
  let mediaStream: MediaStream | undefined;
  let mediaRecorder: MediaRecorder | undefined;
  let chunks: BlobPart[] = [];

  function tick(): void {
    elapsed.value = Math.floor((Date.now() - startTime) / 1000);
  }

  async function start(): Promise<void> {
    if (recording.value) return;
    if (isWeb.value) {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前环境不支持录音');
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
      chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      mediaRecorder.start();
    } else {
      // 真机：原生录音桥。权限由原生侧在录音前请求（Android 启动预请求 / iOS AVAudioSession）
      await call('device.audio.start', {});
    }
    recording.value = true;
    startTime = Date.now();
    elapsed.value = 0;
    timer = window.setInterval(tick, 200);
  }

  function stopBrowser(duration: number): Promise<AudioClip> {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('recorder unavailable'));
        return;
      }
      const mr = mediaRecorder;
      const cleanup = (): void => {
        mediaStream?.getTracks().forEach((t) => t.stop());
        mediaStream = undefined;
      };
      mr.onerror = () => {
        cleanup();
        reject(new Error('录音失败'));
      };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType });
        blobToBase64(blob)
          .then((base64) => {
            cleanup();
            resolve({ id: uid('aud'), duration, mime: mr.mimeType, base64 });
          })
          .catch((err) => {
            cleanup();
            reject(err);
          });
      };
      mr.stop();
    });
  }

  async function stop(): Promise<AudioClip> {
    if (!recording.value) throw new Error('当前未在录音');
    recording.value = false;
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    const duration = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    if (isWeb.value) {
      return stopBrowser(duration);
    }
    const res = await call('device.audio.stop');
    mediaStream = undefined;
    return {
      id: uid('aud'),
      duration: res.duration || duration,
      mime: formatToMime(res.format),
      base64: res.base64
    };
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer);
    mediaStream?.getTracks().forEach((t) => t.stop());
  });

  return { recording, elapsed, start, stop };
}
