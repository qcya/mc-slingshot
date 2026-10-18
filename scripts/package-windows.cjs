// Developer packaging only. Players launch the bundled runtime without installs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),runtime=require('./windows-runtime.json'),version=require('../package.json').version;
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function packageWindows(output,node=process.execPath){
 if(process.platform!=='win32')throw Error('Build the Windows player package on Windows.');
 if(hash(node)!==runtime.sha256)throw Error(`Runtime hash mismatch. Use the official ${runtime.version} Windows x64 node.exe: ${runtime.url}`);
 output=path.resolve(output);if(fs.existsSync(output))throw Error('Output already exists: '+output);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mc-player-build-')),stage=path.join(temp,'MC_Slingshot');fs.mkdirSync(stage);
 try{
  for(const name of ['index.html','game.js','style.css','START_GAME.bat','LICENSES.md','assets','src','vendor'])fs.cpSync(path.join(root,name),path.join(stage,name),{recursive:true});
  fs.mkdirSync(path.join(stage,'scripts'));for(const name of ['serve.cjs','leaderboard.cjs','serve.py','launcher-help.txt'])fs.copyFileSync(path.join(root,'scripts',name),path.join(stage,'scripts',name));
  fs.copyFileSync(path.join(root,'package.json'),path.join(stage,'package.json'));
  fs.mkdirSync(path.join(stage,'docs'));fs.copyFileSync(path.join(root,'docs/combat-assets.md'),path.join(stage,'docs/combat-assets.md'));
  // Always emit a CMD-compatible launcher, including when building from a Git ZIP.
  const bat=path.join(stage,'START_GAME.bat');fs.writeFileSync(bat,fs.readFileSync(bat,'utf8').replace(/\r?\n/g,'\r\n'),'ascii');
  fs.mkdirSync(path.join(stage,'runtime'));fs.copyFileSync(node,path.join(stage,'runtime/node.exe'));
  fs.writeFileSync(path.join(stage,'开始游戏.txt'),`拉满的石 ${version} · Windows 10/11 64位免安装试玩包\r\n\r\n1. 完整解压整个文件夹，不要直接在压缩包里运行。\r\n2. 双击 START_GAME.bat，浏览器会自动打开游戏。\r\n3. 保留启动窗口；关闭窗口会停止游戏服务。\r\n\r\n无需安装 Node.js、Python 或 npm，无需联网，无需管理员权限。\r\n不要直接打开 index.html，也不要把本机的 127.0.0.1 地址发给别人。\r\n若浏览器没有自动打开，复制启动窗口中实际显示的完整 http://127.0.0.1:端口 地址。\r\n发给朋友请发整个试玩 ZIP，不要只发启动器或网页。\r\n\r\n滚轮/数字键换物品，拖动发射，右键取消，ESC 菜单。\r\n项目：https://github.com/qcya/stone-at-full-draw\r\n`,'utf8');
  const manifest={gameVersion:version,runtime,files:{}};
  function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else manifest.files[path.relative(stage,file).split(path.sep).join('/')]=hash(file);}}scan(stage);
  fs.writeFileSync(path.join(stage,'package-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const zipped=spawnSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command','Compress-Archive -LiteralPath $env:MC_PLAYER_STAGE -DestinationPath $env:MC_PLAYER_ZIP -CompressionLevel Optimal'],{windowsHide:true,encoding:'utf8',env:{...process.env,MC_PLAYER_STAGE:stage,MC_PLAYER_ZIP:output}});
  if(zipped.status!==0)throw Error('ZIP build failed: '+zipped.stderr);
  return {output,bytes:fs.statSync(output).size,sha256:hash(output),runtime:runtime.version,files:Object.keys(manifest.files).length};
 }finally{
  const resolved=fs.realpathSync(temp),base=fs.realpathSync(os.tmpdir())+path.sep;
  if(!resolved.startsWith(base)||!path.basename(resolved).startsWith('mc-player-build-'))throw Error('Unexpected cleanup path');
  fs.rmSync(resolved,{recursive:true,force:true,maxRetries:10,retryDelay:100});
 }
}
module.exports={packageWindows};
if(require.main===module){try{if(!process.argv[2])throw Error('Usage: node scripts/package-windows.cjs output.zip [official-node.exe]');console.log(JSON.stringify(packageWindows(process.argv[2],process.argv[3]),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
