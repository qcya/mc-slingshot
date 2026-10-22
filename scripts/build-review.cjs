// Formal rules, isolated persistent saves, no online writes or free-play tools.
const {buildToy}=require('./build-toy.cjs');
if(require.main===module)console.log(JSON.stringify(buildToy({review:true})));
