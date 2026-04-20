// import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
// import * as THREE from 'three';

// const viewer = new GaussianSplats3D.Viewer({
//   cameraUp: [0, -1, 0],
//   initialCameraPosition: [0, 0, 0],
//   initialCameraLookAt: [0.3, 0.1, -0.8]
// });

// await viewer.addSplatScene('/scene.ply', {
//   position: [1, 1.5, -1],
//   rotation: [0, 0, 0, 1],
//   scale: [1, 1, 1]
// });

// const hotspots = [
//   {
//     id: 'point-a',
//     position: new THREE.Vector3(0, 0, 0),
//     radius: 1.5,
//     label: 'Hotspot A',
//     triggered: false,
//     onEnter() {
//       console.log('Entered hotspot A');
//       document.getElementById('ui').textContent = 'Near hotspot A!';
//     },
//     onExit() {
//       document.getElementById('ui').textContent = 'Move close to a hotspot to trigger interaction';
//     }
//   }
// ];

// const posEl = document.createElement('div');
// posEl.style.cssText = 'position:fixed;bottom:20px;left:20px;color:white;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.5);padding:6px 10px;border-radius:6px;line-height:1.8;';
// document.body.appendChild(posEl);

// const lookAt = new THREE.Vector3();

// viewer.renderer.setAnimationLoop(() => {
//   const cam = viewer.camera.position;
//   viewer.camera.getWorldDirection(lookAt);
//   const lx = cam.x + lookAt.x;
//   const ly = cam.y + lookAt.y;
//   const lz = cam.z + lookAt.z;

//   posEl.innerHTML = `pos:  x: ${cam.x.toFixed(2)}  y: ${cam.y.toFixed(2)}  z: ${cam.z.toFixed(2)}<br>look: x: ${lx.toFixed(2)}  y: ${ly.toFixed(2)}  z: ${lz.toFixed(2)}`;

//   for (const h of hotspots) {
//     const dist = cam.distanceTo(h.position);
//     if (dist < h.radius && !h.triggered) {
//       h.triggered = true;
//       h.onEnter();
//     } else if (dist >= h.radius && h.triggered) {
//       h.triggered = false;
//       h.onExit();
//     }
//   }
// });

// viewer.start();

import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

const viewer = new GaussianSplats3D.Viewer({
  cameraUp: [0, -1, 0],
  initialCameraPosition: [0, 0, 0],
  initialCameraLookAt: [0.3, 0.1, -0.8],
//   minZoomDistance: 0.01,
//   maxZoomDistance: 1000
});

await viewer.addSplatScene('/scene.ply', {
  position: [1, 1.5, -1],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1]
});

const hotspots = [
  {
    id: 'point-a',
    position: new THREE.Vector3(0, 0, 0),
    radius: 1.5,
    label: 'Hotspot A',
    triggered: false,
    onEnter() {
      console.log('Entered hotspot A');
      document.getElementById('ui').textContent = 'Near hotspot A!';
    },
    onExit() {
      document.getElementById('ui').textContent = 'Move close to a hotspot to trigger interaction';
    }
  }
];

// World axes
const axesScene = new THREE.Scene();
const axesMaterial = (color) => new THREE.LineBasicMaterial({ color });
const makeAxis = (from, to, color) => {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...from),
    new THREE.Vector3(...to)
  ]);
  return new THREE.Line(geo, axesMaterial(color));
};

const axesGroup = new THREE.Group();
axesGroup.add(makeAxis([0,0,0], [1,0,0], 0xff0000)); // X red
axesGroup.add(makeAxis([0,0,0], [0,1,0], 0x00ff00)); // Y green
axesGroup.add(makeAxis([0,0,0], [0,0,1], 0x0000ff)); // Z blue
// viewer.scene.add(axesGroup);
viewer.threeScene.add(axesGroup);

// Axis labels via CSS2D-style div overlay
const canvas2d = document.createElement('canvas');
canvas2d.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;';
document.body.appendChild(canvas2d);
const ctx = canvas2d.getContext('2d');

const axisLabels = [
  { pos: new THREE.Vector3(1.1, 0, 0), text: 'X', color: '#ff4444' },
  { pos: new THREE.Vector3(0, 1.1, 0), text: 'Y', color: '#44ff44' },
  { pos: new THREE.Vector3(0, 0, 1.1), text: 'Z', color: '#4488ff' },
];

function projectToScreen(vec3, camera, width, height) {
  const v = vec3.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * width,
    y: (-v.y * 0.5 + 0.5) * height,
    w: v.w
  };
}

const posEl = document.createElement('div');
posEl.style.cssText = 'position:fixed;bottom:20px;left:20px;color:white;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.5);padding:6px 10px;border-radius:6px;line-height:1.8;';
document.body.appendChild(posEl);

const lookAt = new THREE.Vector3();

viewer.renderer.setAnimationLoop(() => {
  const cam = viewer.camera.position;
  viewer.camera.getWorldDirection(lookAt);
  const lx = cam.x + lookAt.x;
  const ly = cam.y + lookAt.y;
  const lz = cam.z + lookAt.z;

  posEl.innerHTML = `pos:  x: ${cam.x.toFixed(2)}  y: ${cam.y.toFixed(2)}  z: ${cam.z.toFixed(2)}<br>look: x: ${lx.toFixed(2)}  y: ${ly.toFixed(2)}  z: ${lz.toFixed(2)}`;

  // Draw axis labels
  const W = canvas2d.width = window.innerWidth;
  const H = canvas2d.height = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.font = 'bold 16px monospace';
  for (const lb of axisLabels) {
    const p = projectToScreen(lb.pos, viewer.camera, W, H);
    if (p.w > 0) {
      ctx.fillStyle = lb.color;
      ctx.fillText(lb.text, p.x, p.y);
    }
  }

  for (const h of hotspots) {
    const dist = cam.distanceTo(h.position);
    if (dist < h.radius && !h.triggered) {
      h.triggered = true;
      h.onEnter();
    } else if (dist >= h.radius && h.triggered) {
      h.triggered = false;
      h.onExit();
    }
  }
});

viewer.start();

// viewer.start();
viewer.controls.minDistance = 0.01;
viewer.controls.maxDistance = 1000;

