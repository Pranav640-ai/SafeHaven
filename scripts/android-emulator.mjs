import {spawnSync} from 'node:child_process';
const npm=process.env.npm_execpath;
if(!npm)throw new Error('Run this script using npm run android:emulator.');
console.log('Preparing Android emulator preview at http://10.0.2.2:5173.');
console.log('Keep npm run api and npm run dev running, then press Run in Android Studio.');
const result=spawnSync(process.execPath,[npm,'run','android:sync'],{
  stdio:'inherit',env:{...process.env,SAFEHAVEN_EMULATOR_PREVIEW:'1'},
});
if(result.error)throw result.error;
if(result.status===0)console.log('Before packaging a release, run npm run android:sync normally to remove the local preview URL.');
process.exit(result.status??1);
