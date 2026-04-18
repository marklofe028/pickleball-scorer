import { pipeline, env } from '../lib/transformers.min.js';

// Use browser Cache API so model survives offline
env.allowLocalModels = false;
env.useBrowserCache = true;

let asr = null;

self.onmessage = async ({ data }) => {
  switch (data.type) {
    case 'load': {
      try {
        asr = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            quantized: true,
            progress_callback: (p) => {
              if (p.status === 'progress') {
                self.postMessage({ type: 'progress', value: Math.round(p.progress), file: p.file });
              }
            },
          }
        );
        self.postMessage({ type: 'ready' });
      } catch (e) {
        self.postMessage({ type: 'error', message: e.message });
      }
      break;
    }
    case 'transcribe': {
      if (!asr) { self.postMessage({ type: 'error', message: 'Model not loaded' }); return; }
      try {
        const result = await asr(
          { array: data.audio, sampling_rate: data.sampleRate },
          { language: 'english', task: 'transcribe' }
        );
        self.postMessage({ type: 'transcript', text: result.text.trim() });
      } catch (e) {
        self.postMessage({ type: 'error', message: e.message });
      }
      break;
    }
  }
};
