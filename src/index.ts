import { NormalizedOutputOptions, OutputBundle } from 'rollup';

export interface AntiChonkConfig {
  bootstrapChunkName?: string;
  maxBootstrapChunkSizeKb: number;
  additionalInstructionsMsg: string;
}

export default function antiChonk(config: AntiChonkConfig) {
  const {
    bootstrapChunkName,
    maxBootstrapChunkSizeKb,
    additionalInstructionsMsg,
  } = config;

  const expectedChunkName = bootstrapChunkName ?? 'bootstrap';

  return {
    name: 'anti-chonk',

    generateBundle: (
      outputOptions: NormalizedOutputOptions,
      outputBundle: OutputBundle
    ) => {
      for (const [_, bundle] of Object.entries(outputBundle)) {
        if (bundle.name === expectedChunkName && bundle.type === 'chunk') {
          const sizeBytes = new Blob([bundle.code]).size;

          if (sizeBytes > maxBootstrapChunkSizeKb * 1000) {
            const errorMsg = `The bootstrap bundle size (${
              sizeBytes / 1000
            }kB) exceeds limit ${maxBootstrapChunkSizeKb}kB. ${
              additionalInstructionsMsg ?? ''
            }`;

            throw new Error(errorMsg);
          }
        }
      }
    },
  };
}
