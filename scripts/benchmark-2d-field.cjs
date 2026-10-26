// CPU-only scene construction benchmark; does not measure browser/device FPS.
const fs = require('node:fs');
const path = require('node:path');
const {performance} = require('node:perf_hooks');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const baseline = process.argv[2];
if (!baseline) throw new Error('Usage: node scripts/benchmark-2d-field.cjs <baseline-git-ref>');
const beforeSource = execFileSync('git',['show',baseline+':packages/shared/src/field-course.ts'],{cwd:root,encoding:'utf8'});
const ts = require(path.join(root,'node_modules/typescript'));
const cache = new Map();
function load(file) {
  if(cache.has(file)) return cache.get(file);
  const mod = {exports:{}};
  cache.set(file,mod.exports);
  const code = ts.transpileModule(file === 'baseline' ? beforeSource : fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const base = file === 'baseline' ? path.join(root,'packages/shared/src') : path.dirname(file);
  new Function('require','exports','module',code)(id=>load(path.resolve(base,id+'.ts')),mod.exports,mod);
  return mod.exports;
}
const before = load('baseline');
const after = load(path.join(root,'packages/shared/src/field-course.ts'));
const appearance = {ground:'trail',edges:'club'};
const lanes = Array.from({length:12},(_,i)=>({id:String(i),name:'Athlete '+i,initials:'A',you:i===6,value:18+i*.07}));
const flatten = nodes=>nodes.flatMap(n=>[n,...flatten(n.children||[])]);
function run(lib,ground,iterations=400) {
  const app = {...appearance,ground};
  const start = performance.now();
  let last;
  for(let i=0;i<iterations;i++) {
    const view = {center:18+(i%100)/100,span:1.2};
    const course = lib.fieldCourse(390,750,lanes.length,view,'km',app);
    last = lib.fieldCourseScene(course,app,lanes,'km','perf');
  }
  return {ms:Math.round((performance.now()-start)*100)/100,nodes:flatten(last).length,svgDataBytes:JSON.stringify(last).length};
}
for(const ground of ['trail','oval']) {
  run(before,ground,50);run(after,ground,50);
  const old=run(before,ground),next=run(after,ground);
  console.log(JSON.stringify({ground,frames:400,before:old,after:next,speedup:Math.round(old.ms/next.ms*10)/10}));
}
