import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const exec = (cmd, args) => {const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'}); if(r.status!==0)process.exit(r.status || 1)};
if (!fs.existsSync('android/app/build.gradle')) exec('npx',['cap','add','android']);
exec('npx',['cap','sync','android']);
exec('node',['scripts/install-rescuemesh.mjs']);
