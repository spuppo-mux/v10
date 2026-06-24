import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { inlineCssPlugin } from '../../build/plugins/inline-css-plugin.ts';
import { inlineTemplatePlugin } from '../../build/plugins/inline-template-plugin.ts';
import { baseConfig } from '../../build/tsdown.ts';

type BuildMode = 'dev' | 'prod';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const buildModes: BuildMode[] = ['dev', 'prod'];

const presets = [
  'video',
  'video-minimal',
  'video-ui',
  'video-minimal-ui',
  'live-video',
  'live-video-minimal',
  'audio',
  'audio-minimal',
  'audio-ui',
  'audio-minimal-ui',
  'background',
];
const media = [
  'hls-video',
  'mux-audio',
  'mux-video',
  'native-hls-video',
  'simple-hls-audio-only',
  'simple-hls-video',
  'simple-spf-background-video',
  'dual-hls-video',
  'dash-video',
];

const entries = [
  ...presets.map((name) => ({ src: `src/cdn/${name}.ts`, name })),
  ...media.map((name) => ({ src: `src/cdn/media/${name}.ts`, name: `media/${name}` })),
];

/**
 * Aliased CDN entries — each builds as a separate config so its alias map
 * doesn't bleed into the main shared-chunk graph.
 *
 * `hls-light-video` is the only consumer today: it reuses the `<hls-video>`
 * implementation but aliases `hls.js` → `hls.js/light` at bundle time,
 * producing a custom element backed by the trimmed hls.light build. Same
 * source, different bundled library. Used by the perf-test suite to compare
 * hls.light vs hls.js as a drop-in swap.
 */
const aliasedEntries = [
  {
    src: 'src/cdn/media/hls-light-video.ts',
    name: 'media/hls-light-video',
    alias: { 'hls.js': 'hls.js/light' },
  },
  {
    src: 'src/cdn/media/dual-hls-light-video.ts',
    name: 'media/dual-hls-light-video',
    alias: { 'hls.js': 'hls.js/light' },
  },
];

/**
 * Rolldown plugin that generates empty `.d.ts` stubs for dev CDN entry points.
 * CDN entries are side-effect-only modules with no exports — the stubs let
 * TypeScript resolve `import '@videojs/html/cdn/...'` without errors.
 */
function dtsStubsPlugin(outDir: string) {
  function generate(dir: string) {
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (file.isDirectory()) {
        generate(resolve(dir, file.name));
      } else if (file.name.endsWith('.dev.js') && !file.name.endsWith('.dev.js.map')) {
        writeFileSync(resolve(dir, file.name.replace('.dev.js', '.dev.d.ts')), 'export {};\n');
      }
    }
  }

  return {
    name: 'cdn-dts-stubs',
    writeBundle() {
      generate(outDir);
    },
  };
}

/**
 * One config per mode with all entries grouped together.
 * This lets rolldown extract shared modules (store, element, core, hls.js, etc.)
 * into shared chunks instead of duplicating them across every bundle.
 * The ES module loader handles chunk deduplication transparently.
 */
const configs: UserConfig[] = [];

const outDir = 'cdn';

for (const mode of buildModes) {
  const isProd = mode === 'prod';

  const entryMap = Object.fromEntries(entries.map(({ src, name }) => [isProd ? name : `${name}.dev`, src]));

  configs.push({
    ...baseConfig,
    entry: entryMap,
    platform: 'browser',
    format: 'es',
    target: 'es2022',
    sourcemap: true,
    clean: mode === 'dev',
    dts: false,
    minify: isProd,
    noExternal: [/.*/],
    inlineOnly: false,
    treeshake: {
      moduleSideEffects: [
        { test: /\/define\//, sideEffects: true },
        { test: /\/icons\/(?:dist\/)?element\//, sideEffects: true },
      ],
    },
    outDir,
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
    define: {
      __DEV__: isProd ? 'false' : 'true',
    },
    plugins: [
      inlineCssPlugin({ skinsDir, minify: isProd }),
      inlineTemplatePlugin({ minify: isProd }),
      ...(!isProd ? [dtsStubsPlugin(outDir)] : []),
    ],
    inputOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return;
        defaultHandler(warning);
      },
      ...(!isProd && {
        resolve: {
          conditionNames: ['development', 'import', 'browser', 'default'],
        },
      }),
    },
  });

  // One separate config per aliased entry — each must build alone so its
  // alias map doesn't leak into the main shared-chunk graph.
  for (const { src, name, alias } of aliasedEntries) {
    configs.push({
      ...baseConfig,
      entry: { [isProd ? name : `${name}.dev`]: src },
      platform: 'browser',
      format: 'es',
      target: 'es2022',
      sourcemap: true,
      clean: false,
      dts: false,
      minify: isProd,
      noExternal: [/.*/],
      inlineOnly: false,
      treeshake: {
        moduleSideEffects: [
          { test: /\/define\//, sideEffects: true },
          { test: /\/icons\/(?:dist\/)?element\//, sideEffects: true },
        ],
      },
      outDir,
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
        ...alias,
      },
      define: {
        __DEV__: isProd ? 'false' : 'true',
      },
      plugins: [
        inlineCssPlugin({ skinsDir, minify: isProd }),
        inlineTemplatePlugin({ minify: isProd }),
        ...(!isProd ? [dtsStubsPlugin(outDir)] : []),
      ],
      inputOptions: {
        onwarn(warning, defaultHandler) {
          if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return;
          defaultHandler(warning);
        },
        ...(!isProd && {
          resolve: {
            conditionNames: ['development', 'import', 'browser', 'default'],
          },
        }),
      },
    });
  }
}

export default defineConfig(configs);
