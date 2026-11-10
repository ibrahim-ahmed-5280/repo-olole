import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    'cli/init-db': 'src/cli/init-db.ts',
    'cli/seed': 'src/cli/seed.ts',
    'cli/create-admin': 'src/cli/create-admin.ts',
    'cli/import-portrait': 'src/cli/import-portrait.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Bundle the workspace package (TypeScript source); keep real npm deps external.
  noExternal: ['@reveal/shared'],
});
