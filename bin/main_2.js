import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

const initialCameraPosition = new THREE.Vector3(-1, -1.5, 1);
const initialCameraTarget = new THREE.Vector3(0, 0, 0);

const viewer = new GaussianSplats3D.Viewer({
  cameraUp: [0, -1, 0],
  initialCameraPosition: initialCameraPosition.toArray(),
  initialCameraLookAt: initialCameraTarget.toArray(),
});

await viewer.addSplatScene('/scene.ply');

const hotspots = [
  {
    id: 'point-a',
    position: new THREE.Vector3(0, 0, 0),
    radius: 1.5,
    label: 'Hotspot A',
    triggered: false,
    onEnter() {
      document.getElementById('ui').textContent = 'Near hotspot A!';
    },
    onExit() {
      document.getElementById('ui').textContent = 'Move close to a hotspot to trigger interaction';
    }
  }
];

const axesMaterial = (color) => new THREE.LineBasicMaterial({ color });
const makeAxis = (from, to, color) => {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...from),
    new THREE.Vector3(...to)
  ]);
  return new THREE.Line(geo, axesMaterial(color));
};

const axesGroup = new THREE.Group();
axesGroup.add(makeAxis([0,0,0], [1,0,0], 0xff0000));
axesGroup.add(makeAxis([0,0,0], [0,1,0], 0x00ff00));
axesGroup.add(makeAxis([0,0,0], [0,0,1], 0x0000ff));
viewer.threeScene.add(axesGroup);

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

const hint = document.createElement('div');
hint.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);color:white;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.5);padding:6px 10px;border-radius:6px;';
hint.textContent = 'Click to capture mouse | W/S=forward/back  A/D=left/right  Q/E=up/down | Mouse=look';
document.body.appendChild(hint);

viewer.start();
viewer.controls.enabled = false;
viewer.controls.dispose();
viewer.controls = null;

// Init yaw/pitch from initial camera direction
const initDir = new THREE.Vector3().subVectors(initialCameraTarget, initialCameraPosition).normalize();
// let yaw = Math.atan2(initDir.x, initDir.z);
// let pitch = Math.asin(-initDir.y);

let yaw = 0;
let pitch = 0;

const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; e.preventDefault(); });
window.addEventListener('keyup', e => keys[e.code] = false);

window.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== document.body) return;
  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
});

document.body.addEventListener('click', () => {
  document.body.requestPointerLock();
});

const lookDir = new THREE.Vector3();

viewer.renderer.setAnimationLoop(() => {
  const speed = 0.05;
  const cam = viewer.camera;

  cam.rotation.order = 'YXZ';
  cam.rotation.z = 0;
  cam.rotation.z = Math.PI;

  cam.rotation.y = yaw;
  cam.rotation.x = pitch;

  // Forward vector on horizontal plane (ignore pitch for movement)
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

  if (keys['KeyW']) cam.position.addScaledVector(forward, -speed);
  if (keys['KeyS']) cam.position.addScaledVector(forward, speed);
  if (keys['KeyA']) cam.position.addScaledVector(right, speed);
  if (keys['KeyD']) cam.position.addScaledVector(right, -speed);
  if (keys['KeyQ']) cam.position.y -= speed;
  if (keys['KeyE']) cam.position.y += speed;

  const pos = cam.position;
  cam.getWorldDirection(lookDir);

  posEl.innerHTML = `pos:  x: ${pos.x.toFixed(2)}  y: ${pos.y.toFixed(2)}  z: ${pos.z.toFixed(2)}<br>look: x: ${(pos.x+lookDir.x).toFixed(2)}  y: ${(pos.y+lookDir.y).toFixed(2)}  z: ${(pos.z+lookDir.z).toFixed(2)}`;

  const W = canvas2d.width = window.innerWidth;
  const H = canvas2d.height = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.font = 'bold 16px monospace';
  for (const lb of axisLabels) {
    const p = projectToScreen(lb.pos, cam, W, H);
    if (p.w > 0) {
      ctx.fillStyle = lb.color;
      ctx.fillText(lb.text, p.x, p.y);
    }
  }

  for (const h of hotspots) {
    const dist = pos.distanceTo(h.position);
    if (dist < h.radius && !h.triggered) {
      h.triggered = true;
      h.onEnter();
    } else if (dist >= h.radius && h.triggered) {
      h.triggered = false;
      h.onExit();
    }
  }
});