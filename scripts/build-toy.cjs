// Static Toy build. Never includes Node server code, player data or credentials.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
function buildToy({output,playtest=false,review=false}={}){
 if(playtest&&review)throw Error('Playtest and release review are mutually exclusive.');
 if(!output){const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});output=fs.mkdtempSync(path.join(dist,'toy-'));}
 else{output=path.resolve(output);if(fs.existsSync(output))throw Error('Build output already exists.');fs.mkdirSync(output,{recursive:true});}
 for(const file of ['index.html','style.css','assets','vendor'])fs.cpSync(path.join(root,file),path.join(output,file),{recursive:true,filter:source=>fs.statSync(source).isDirectory()||/\.(html|js|css|png|ogg|txt)$/.test(source)});
 // Toy/CDN static hosts need not advertise .mjs with a module MIME type.
 // Emit one ordinary script so neither ESM MIME nor source imports can block boot.
 const canvasImages={};
 for(const directory of ['textures','effects'])for(const name of fs.readdirSync(path.join(root,'assets',directory)).sort())if(name.endsWith('.png')){
  const relative=`assets/${directory}/${name}`;
  canvasImages[relative]=`data:image/png;base64,${fs.readFileSync(path.join(root,relative)).toString('base64')}`;
 }
 // fetch(file://...) is blocked in local previews. Keep original sound bytes
 // available without a filesystem fetch; WebAudio reads the resulting blob URL.
 const soundSources={};
 for(const name of fs.readdirSync(path.join(root,'assets','sfx')).sort())if(name.endsWith('.ogg')){
  const relative=`assets/sfx/${name}`;
  soundSources[relative]=`data:audio/ogg;base64,${fs.readFileSync(path.join(root,relative)).toString('base64')}`;
 }
 esbuild.buildSync({entryPoints:[path.join(root,'game.js')],bundle:true,format:'iife',platform:'browser',target:'es2020',minify:true,define:{__MC_PLAYTEST__:JSON.stringify(playtest),__MC_REVIEW__:JSON.stringify(review),__MC_VERSION__:JSON.stringify(require('../package.json').version),__MC_CANVAS_IMAGES__:JSON.stringify(canvasImages),__MC_SOUND_SOURCES__:JSON.stringify(soundSources)},outfile:path.join(output,'game.js')});
 fs.writeFileSync(path.join(output,'toy-config.js'),playtest||review?`globalThis.MC_PLATFORM=${JSON.stringify({toy:false,ranking:'offline'})};\n`:`globalThis.MC_PLATFORM=location.protocol==='file:'?${JSON.stringify({toy:false,ranking:'offline'})}:${JSON.stringify({toy:true,ranking:'toy'})};\n`);
 const entry=path.join(output,'index.html');fs.writeFileSync(entry,fs.readFileSync(entry,'utf8').replace('<script type="module" src="game.js">',`<script src="toy-config.js"></script>${playtest||review?'':'<script src="vendor/toy-sdk.min.js"></script>'}<script defer src="game.js">`));
 return {output,ranking:review?'offline release review':playtest?'offline playtest':'Toy SDK'};
}
module.exports={buildToy};
if(require.main===module)console.log(JSON.stringify(buildToy()));
