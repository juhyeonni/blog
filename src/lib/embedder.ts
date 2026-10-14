import { MODEL } from './semantic';

export type Embedder = (query: string) => Promise<Float32Array>;

const CACHE_NAME = 'transformers-cache';

export async function loadEmbedder(onProgress: (percent: number) => void): Promise<Embedder> {
  const [{ pipeline, env }, wasm, loader] = await Promise.all([
    import('@huggingface/transformers'),
    import('onnxruntime-web/ort-wasm-simd-threaded.wasm?url'),
    import('onnxruntime-web/ort-wasm-simd-threaded.mjs?url'),
  ]);

  env.allowLocalModels = false;
  env.backends.onnx.wasm!.wasmPaths = { wasm: wasm.default, mjs: loader.default };
  env.backends.onnx.wasm!.numThreads = 1;

  const files = new Map<string, { loaded: number; total: number }>();
  const extractor = await pipeline('feature-extraction', MODEL, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (event: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (event.status !== 'progress' || !event.file || !event.total) return;
      files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
      const all = [...files.values()];
      const total = all.reduce((sum, f) => sum + f.total, 0);
      const loaded = all.reduce((sum, f) => sum + f.loaded, 0);
      onProgress(Math.min(100, Math.round((loaded / total) * 100)));
    },
  });

  return async (query) => {
    const output = await extractor(`query: ${query}`, { pooling: 'mean', normalize: true });
    return Float32Array.from(output.data as Float32Array);
  };
}

export async function deleteModel(): Promise<void> {
  await caches.delete(CACHE_NAME);
}
