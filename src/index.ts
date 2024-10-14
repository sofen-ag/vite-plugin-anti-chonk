import { NormalizedOutputOptions, OutputBundle } from 'rollup';

export function enforceBootstrapBundleSize(
  maxSizeKb: number,
  additionalInstructionsMsg?: string
) {
  return {
    name: 'enforce-bootstrap-bundle-size-limit',

    generateBundle: (
      outputOptions: NormalizedOutputOptions,
      outputBundle: OutputBundle
    ) => {
      for (const [_, bundle] of Object.entries(outputBundle)) {
        if (bundle.name === 'bootstrap' && bundle.type === 'chunk') {
          const sizeBytes = new Blob([bundle.code]).size;

          if (sizeBytes > maxSizeKb * 1000) {
            // eslint-disable-next-line max-len
            const errorMsg = `The bootstrap bundle size (${
              sizeBytes / 1000
            }kB) exceeds limit ${maxSizeKb}kB. ${additionalInstructionsMsg ?? ''}`;
            throw new Error(errorMsg);
          }
        }
      }
    },
  };
}
