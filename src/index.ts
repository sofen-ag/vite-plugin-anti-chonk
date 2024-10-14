import { NormalizedOutputOptions, OutputBundle } from 'rollup';

export interface AntiChonkConfig {
  bootstrapChunkName?: string;
  maxBootstrapChunkSizeBytes: number;
  additionalInstructionsMsg: string;
}

export default function antiChonk(config: AntiChonkConfig) {
  const {
    bootstrapChunkName,
    maxBootstrapChunkSizeBytes,
    additionalInstructionsMsg,
  } = config;

  const expectedChunkName = bootstrapChunkName ?? 'bootstrap';

  return {
    name: 'enforce-bootstrap-bundle-size-limit',

    generateBundle: (
      outputOptions: NormalizedOutputOptions,
      outputBundle: OutputBundle
    ) => {
      for (const [_, bundle] of Object.entries(outputBundle)) {
        if (bundle.name === expectedChunkName && bundle.type === 'chunk') {
          const sizeBytes = new Blob([bundle.code]).size;

          if (sizeBytes > maxBootstrapChunkSizeBytes * 1000) {
            const errorMsg = `The bootstrap bundle size (${
              sizeBytes / 1000
            }kB) exceeds limit ${maxBootstrapChunkSizeBytes}kB. ${
              additionalInstructionsMsg ?? ''
            }`;

            throw new Error(errorMsg);
          }
        }
      }
    },
  };
}
