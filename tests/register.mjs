import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
// Test-only TypeScript loader. Environment injection never enters the Vite bundle.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      if (!/\.[a-z]+$/i.test(url.pathname) && existsSync(new URL(`${url.href}.ts`))) return next(`${url.href}.ts`, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts') && !url.includes('node_modules')) {
      const source = readFileSync(new URL(url), 'utf8').replaceAll('import.meta.env', '(globalThis.__testEnv ?? {})');
      return { format: 'module', source: ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});
