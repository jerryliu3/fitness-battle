import {mkdir,open,readFile,rename,unlink,writeFile} from "node:fs/promises";
import {dirname} from "node:path";
export async function readJson(path,fallback) {
  try {return JSON.parse(await readFile(path,"utf8"));}
  catch(error) {if(error.code==="ENOENT") return fallback;throw error;}
}
export async function writeJson(path,value) {
  await mkdir(dirname(path),{recursive:true});
  const temporary=`${path}.${process.pid}.tmp`;
  try {await writeFile(temporary,JSON.stringify(value,null,2)+"\n",{mode:0o600});await rename(temporary,path);}
  finally {await unlink(temporary).catch(error=>{if(error.code!=="ENOENT") throw error;});}
}
export async function withFileLock(path,work) {
  await mkdir(dirname(path),{recursive:true});
  const lock=await open(`${path}.lock`,"wx");
  try {await lock.writeFile(String(process.pid));return await work();}
  finally {await lock.close();await unlink(`${path}.lock`);}
}
