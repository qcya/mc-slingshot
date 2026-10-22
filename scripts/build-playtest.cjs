// A separate, offline review build; never used by build:toy.
const {buildToy}=require('./build-toy.cjs');
module.exports=options=>buildToy({...options,playtest:true});
if(require.main===module)console.log(JSON.stringify(module.exports()));
