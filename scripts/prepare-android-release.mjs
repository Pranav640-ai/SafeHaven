import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=fs.existsSync('.env.production')?fs.readFileSync('.env.production','utf8'):'';
const base=process.env.VITE_API_BASE_URL || source.match(/^VITE_API_BASE_URL=(.*)$/m)?.[1]?.trim();
if(!base || new URL(base).protocol!=='https:') throw new Error('Set a reachable HTTPS VITE_API_BASE_URL in .env.production before preparing the online Android app. An APK with a relative /api URL cannot reach FastAPI.');
const response=await fetch(base.replace(/\/+$/,'')+'/api/health',{signal:AbortSignal.timeout(10000)});
if(!response.ok || (await response.json()).status!=='ok')throw new Error('The configured API did not pass its health check. Deploy the backend before preparing the online APK.');
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','android:sync'],{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,VITE_API_BASE_URL:base}});
process.exit(result.status??1);
