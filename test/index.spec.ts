import { NormalizedOutputOptions, OutputBundle, OutputChunk } from 'rollup';
import antiChonk, { AntiChonkConfig } from '../src/index';

describe('antiChonk', () => {
  const mockOutputOptions: NormalizedOutputOptions =
    {} as NormalizedOutputOptions;

  const createMockChunk = (name: string, code: string): OutputChunk => ({
    type: 'chunk',
    name,
    code,
    fileName: `${name}.js`,
    facadeModuleId: null,
    isDynamicEntry: false,
    isEntry: false,
    isImplicitEntry: false,
    map: null,
    modules: {},
    referencedFiles: [],
    imports: [],
    dynamicImports: [],
    exports: [],
    moduleIds: [],
    sourcemapFileName: null,
    preliminaryFileName: `${name}.js`,
    implicitlyLoadedBefore: [],
    importedBindings: {},
  });

  const createOutputBundle = (chunks: OutputChunk[]): OutputBundle => {
    const bundle: OutputBundle = {};
    chunks.forEach(chunk => {
      bundle[chunk.fileName] = chunk;
    });
    return bundle;
  };

  describe('plugin configuration', () => {
    it('should return a plugin with correct name', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 100,
        additionalInstructionsMsg: 'Test message',
      };

      const plugin = antiChonk(config);
      expect(plugin.name).toBe('anti-chonk');
      expect(plugin.generateBundle).toBeInstanceOf(Function);
    });

    it('should use default bootstrap chunk name when not provided', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 100,
        additionalInstructionsMsg: 'Test message',
      };

      const plugin = antiChonk(config);
      const smallCode = 'console.log("small");';
      const bootstrapChunk = createMockChunk('bootstrap', smallCode);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      // Should not throw because chunk is small
      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).not.toThrow();
    });

    it('should use custom bootstrap chunk name when provided', () => {
      const config: AntiChonkConfig = {
        bootstrapChunkName: 'custom-bootstrap',
        maxBootstrapChunkSizeKb: 1, // Very small limit
        additionalInstructionsMsg: 'Custom message',
      };

      const plugin = antiChonk(config);
      const largeCode = 'a'.repeat(2000); // 2KB of code
      const customChunk = createMockChunk('custom-bootstrap', largeCode);
      const outputBundle = createOutputBundle([customChunk]);

      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).toThrow(/exceeds limit 1kB/);
    });
  });

  describe('bundle size validation', () => {
    it('should not throw when bootstrap chunk is within size limit', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 10,
        additionalInstructionsMsg: 'Keep it small',
      };

      const plugin = antiChonk(config);
      const smallCode = 'console.log("small code");'; // Well under 10KB
      const bootstrapChunk = createMockChunk('bootstrap', smallCode);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).not.toThrow();
    });

    it('should throw when bootstrap chunk exceeds size limit', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 1,
        additionalInstructionsMsg: 'Optimize your code!',
      };

      const plugin = antiChonk(config);
      const largeCode = 'a'.repeat(2000); // 2KB of code
      const bootstrapChunk = createMockChunk('bootstrap', largeCode);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).toThrow();
    });

    it('should include correct error message with size information', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 1,
        additionalInstructionsMsg: 'Please optimize your bundle',
      };

      const plugin = antiChonk(config);
      const largeCode = 'a'.repeat(2000); // 2KB of code
      const bootstrapChunk = createMockChunk('bootstrap', largeCode);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).toThrow(
        /The bootstrap bundle size \(2kB\) exceeds limit 1kB\. Please optimize your bundle/
      );
    });

    it('should handle empty additional instructions message', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 1,
        additionalInstructionsMsg: '',
      };

      const plugin = antiChonk(config);
      const largeCode = 'a'.repeat(2000);
      const bootstrapChunk = createMockChunk('bootstrap', largeCode);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).toThrow(/The bootstrap bundle size \(2kB\) exceeds limit 1kB\. $/);
    });
  });

  describe('bundle filtering', () => {
    it('should only check chunks with matching name', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 1,
        additionalInstructionsMsg: 'Test',
      };

      const plugin = antiChonk(config);
      const largeCode = 'a'.repeat(2000); // 2KB - would exceed limit

      // Create chunks with different names
      const otherChunk = createMockChunk('other-chunk', largeCode);
      const vendorChunk = createMockChunk('vendor', largeCode);
      const smallBootstrap = createMockChunk('bootstrap', 'small');

      const outputBundle = createOutputBundle([
        otherChunk,
        vendorChunk,
        smallBootstrap,
      ]);

      // Should not throw because bootstrap chunk is small, even though others are large
      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).not.toThrow();
    });

    it('should only check chunks of type "chunk"', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 1,
        additionalInstructionsMsg: 'Test',
      };

      const plugin = antiChonk(config);
      const largeCode = 'a'.repeat(2000);

      // Create an asset with bootstrap name (not a chunk)
      const outputBundle: OutputBundle = {
        'bootstrap.css': {
          type: 'asset',
          fileName: 'bootstrap.css',
          name: 'bootstrap',
          source: largeCode,
        } as any,
      };

      // Should not throw because it's not a chunk
      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).not.toThrow();
    });

    it('should handle multiple matching chunks', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 1,
        additionalInstructionsMsg: 'Test',
      };

      const plugin = antiChonk(config);
      const largeCode = 'a'.repeat(2000);

      // Create multiple bootstrap chunks (edge case)
      const bootstrap1 = createMockChunk('bootstrap', 'small');
      const bootstrap2 = createMockChunk('bootstrap', largeCode);

      const outputBundle = createOutputBundle([bootstrap1, bootstrap2]);

      // Should throw because one of the bootstrap chunks is too large
      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).toThrow();
    });

    it('should handle empty output bundle', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 1,
        additionalInstructionsMsg: 'Test',
      };

      const plugin = antiChonk(config);
      const outputBundle: OutputBundle = {};

      // Should not throw with empty bundle
      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle exactly at the size limit', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 2,
        additionalInstructionsMsg: 'Test',
      };

      const plugin = antiChonk(config);
      const exactCode = 'a'.repeat(2000); // Exactly 2KB
      const bootstrapChunk = createMockChunk('bootstrap', exactCode);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      // Should not throw when exactly at limit
      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).not.toThrow();
    });

    it('should handle one byte over the limit', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 2,
        additionalInstructionsMsg: 'Test',
      };

      const plugin = antiChonk(config);
      const overLimitCode = 'a'.repeat(2001); // 2001 bytes, just over 2KB
      const bootstrapChunk = createMockChunk('bootstrap', overLimitCode);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      // Should throw when over limit by just 1 byte
      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).toThrow();
    });

    it('should handle very large size limits', () => {
      const config: AntiChonkConfig = {
        maxBootstrapChunkSizeKb: 10000, // 10MB limit
        additionalInstructionsMsg: 'Test',
      };

      const plugin = antiChonk(config);
      const code = 'a'.repeat(1000); // 1KB of code
      const bootstrapChunk = createMockChunk('bootstrap', code);
      const outputBundle = createOutputBundle([bootstrapChunk]);

      expect(() => {
        plugin.generateBundle(mockOutputOptions, outputBundle);
      }).not.toThrow();
    });
  });
});
