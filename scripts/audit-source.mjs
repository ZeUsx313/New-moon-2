import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
const revision = process.argv[2] || 'bb075d3b4af6431bd3eb2662875ab980eae85734';
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', revision], { cwd: root, encoding: 'utf8' }).trim().split('\n');
const entries = files.map(file => {
  const bytes = execFileSync('git', ['show', `${revision}:${file}`], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  const binary = /\.(png|jpe?g|ico|ttf|woff2?)$/i.test(file);
  const entry = { path: file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), type: binary ? 'binary' : 'text' };
  if (binary) return entry;
  const text = bytes.toString('utf8'); entry.lines = text.split('\n').length;
  if (!/\.[cm]?[jt]sx?$/.test(file)) return entry;
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  const imports = new Set(), functions = [], apiCalls = [], routes = [];
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.add(node.moduleSpecifier.text);
    if (ts.isFunctionDeclaration(node) && node.name) functions.push(node.name.text);
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && /^(get|post|put|patch|delete)$/.test(node.expression.name.text) && node.arguments[0]) {
      const arg = node.arguments[0]; if (ts.isStringLiteral(arg) || ts.isTemplateExpression(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) apiCalls.push({ method: node.expression.name.text.toUpperCase(), target: arg.getText(ast) });
    }
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'path' && node.initializer && ts.isStringLiteral(node.initializer)) routes.push(node.initializer.text);
    ts.forEachChild(node, visit);
  }
  visit(ast); return { ...entry, imports: [...imports], functions, apiCalls, routes, parseErrors: ast.parseDiagnostics.length };
});
const result = { repository: 'https://github.com/ZeUsx313/New-moon-2', revision, files: files.length, textFiles: entries.filter(e => e.type === 'text').length,
  textLines: entries.reduce((sum, entry) => sum + (entry.lines || 0), 0), entries };
fs.mkdirSync(path.join(root, 'docs'), { recursive: true }); fs.writeFileSync(path.join(root, 'docs/source-inventory.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ files: result.files, textFiles: result.textFiles, textLines: result.textLines, parseErrors: entries.reduce((s, e) => s + (e.parseErrors || 0), 0) }));
