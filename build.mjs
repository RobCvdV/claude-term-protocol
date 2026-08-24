// Two outputs, because the two consumers load differently: claude-term's main
// process is bundled as CommonJS by electron-vite, while the Expo app is ESM.
// An ESM-only package typechecks and builds fine in both and then fails at
// runtime in Electron, which is a bad way to find out.
import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

execSync('tsc -p tsconfig.json', { stdio: 'inherit' })
execSync('tsc -p tsconfig.cjs.json', { stdio: 'inherit' })
mkdirSync('dist/cjs', { recursive: true })
// this package is "type": "module", so the CJS output needs its own declaration
writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }, null, 2) + '\n')
