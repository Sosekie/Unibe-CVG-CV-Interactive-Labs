import {cp,mkdir,rm} from 'node:fs/promises';
await rm('out',{recursive:true,force:true});
await cp('dist','out',{recursive:true});
await mkdir('out/materials',{recursive:true});
for(const [name,legacy] of [['tutorial_09.pdf','gaussian_splatting_nerf_tutorial.pdf'],['tutorial_09_solution.pdf','gaussian_splatting_nerf_solution.pdf']]){
  await cp('materials/'+name,'out/materials/'+name);
  await cp('materials/'+name,'out/materials/'+legacy);
}
console.log('Exported Tutorial 09 to out/');
