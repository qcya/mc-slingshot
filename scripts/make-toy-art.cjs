// Export the approved artwork without regenerating it.
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../docs/publishing'),art=path.join(out,'laman-de-shi');
fs.copyFileSync(path.join(art,'cover-original.png'),path.join(out,'toy-cover.png'));
fs.copyFileSync(path.join(art,'toy-icon.png'),path.join(out,'toy-icon.png'));
console.log('拉满的石 / Stone at Full Draw: approved Toy artwork exported.');
