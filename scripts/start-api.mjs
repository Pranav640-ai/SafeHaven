import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
const executable=process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python';
if(!existsSync(executable)){
  console.error('Create .venv and install backend/requirements.txt first. See IMPLEMENTATION.md.');
  process.exit(1);
}
const child=spawn(executable,['-m','uvicorn','backend.app:app','--host','127.0.0.1','--port','8000','--reload'],{stdio:'inherit'});
child.on('error',e=>{console.error(e.message);process.exit(1)});
child.on('exit',code=>process.exit(code||0));
