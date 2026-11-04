import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {buildEntryModel,ENTRY_SCENE_TYPES} from '../dist/entry-models.mjs';
import {sceneMotionAllowed} from '../dist/entry-scenes.mjs';

test('decorative rendering stops for hidden routes, hidden documents and reduced motion',()=>{
  assert.equal(sceneMotionAllowed(),true);
  for(const state of [{paused:true},{hidden:true},{visible:false},{paused:true,hidden:true}])assert.equal(sceneMotionAllowed(state),false);
  assert.equal(sceneMotionAllowed({paused:false,hidden:false,visible:true}),true);
});

test('all entry assets have finite geometry, bounded mesh complexity and local materials',()=>{
  const theme={dark:false,primary:'#215FF0',surface:'#FFFFFF',grid:'#B6CBE1',toolInk:'#194AC0'};
  for(const type of ENTRY_SCENE_TYPES){
    const {group}=buildEntryModel(type,theme);let triangles=0;
    group.updateMatrixWorld(true);
    const bounds=new Box3().setFromObject(group).getSize(new Vector3());
    assert.ok([bounds.x,bounds.y,bounds.z].every(n=>Number.isFinite(n)&&n>0),type+' has visible finite bounds');
    group.traverse(object=>{
      if(!object.geometry)return;
      const positions=object.geometry.getAttribute('position');
      assert.ok(Array.from(positions.array).every(Number.isFinite),type+' has no invalid vertices');
      triangles+=(object.geometry.index?.count||positions.count)/3;
      if(object.material?.map)assert.equal(object.material.map.isDataTexture,true,'textures are bundled procedural data');
    });
    assert.ok(triangles<90000,type+' stays within the entry scene mesh budget');
  }
});
