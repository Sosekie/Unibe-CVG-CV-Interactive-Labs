import {cp, rm} from 'node:fs/promises';
await rm('out',{recursive:true,force:true});
await cp('dist','out',{recursive:true});
await cp('materials/tutorial_10.pdf','out/materials/exercises.pdf');
await cp('materials/tutorial_10_solution.pdf','out/materials/solutions.pdf');
console.log('Exported Tutorial 10 to out/');
