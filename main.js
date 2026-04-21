import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';

// Determine view mode from URL param: ?view=center (default), left, right
const params = new URLSearchParams(window.location.search);
const viewMode = params.get('view') || 'center';
const isCenter = viewMode === 'center';

// Left camera is rotated -60deg (left side), right camera +60deg
const VIEW_OFFSET_YAW = {
  center: 0,
  left: -Math.PI / 3,
  right: Math.PI / 3,
};
const yawOffset = VIEW_OFFSET_YAW[viewMode] ?? 0;

// BroadcastChannel for syncing camera state from center to left/right
const channel = new BroadcastChannel('camera-sync');

const initialCameraPosition = new THREE.Vector3(-1, -1.5, 1);
const initialCameraTarget = new THREE.Vector3(0, 0, 0);

const viewer = new GaussianSplats3D.Viewer({
  cameraUp: [0, -1, 0],
  initialCameraPosition: initialCameraPosition.toArray(),
  initialCameraLookAt: initialCameraTarget.toArray(),
});

await viewer.addSplatScene('/scene.ply');

// Audio only on center view
const audio = new Audio('/children.mp3');
audio.loop = true;
audio.volume = 0;
const audio2 = new Audio('/party.mp3');
audio2.loop = true;
audio2.volume = 0;
const audio3 = new Audio('/garden.mp3');
audio3.loop = true;
audio3.volume = 0;
const audio4 = new Audio('/piano.mp3');
audio4.loop = true;
audio4.volume = 0;

const hotspots = [
  {
    id: 'point-a',
    position: new THREE.Vector3(-7.04, -1.50, 4.85),
    radius: 5,
    audio: audio,
    triggered: false,
    onEnter() { if (isCenter) document.getElementById('ui').textContent = 'Near hotspot A!'; },
    onExit() { if (isCenter) document.getElementById('ui').textContent = 'Move close to a hotspot to trigger interaction'; }
  },
  {
    id: 'point-b',
    position: new THREE.Vector3(-1, -1.5, 1),
    radius: 5,
    audio: audio2,
    triggered: false,
    onEnter() { if (isCenter) document.getElementById('ui').textContent = 'Near hotspot B!'; },
    onExit() { if (isCenter) document.getElementById('ui').textContent = 'Move close to a hotspot to trigger interaction'; }
  },
  {
    id: 'point-c',
    position: new THREE.Vector3(-5, -1.5, -4),
    radius: 5,
    audio: audio3,
    triggered: false,
    onEnter() { if (isCenter) document.getElementById('ui').textContent = 'Near hotspot C!'; },
    onExit() { if (isCenter) document.getElementById('ui').textContent = 'Move close to a hotspot to trigger interaction'; }
  },
  {
    id: 'point-d',
    position: new THREE.Vector3(7, -1.5, -4),
    radius: 5,
    audio: audio4,
    triggered: false,
    onEnter() { if (isCenter) document.getElementById('ui').textContent = 'Near hotspot D!'; },
    onExit() { if (isCenter) document.getElementById('ui').textContent = 'Move close to a hotspot to trigger interaction'; }
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

if (isCenter) {
  const hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);color:white;font-family:monospace;font-size:13px;background:rgba(0,0,0,0.5);padding:6px 10px;border-radius:6px;';
  hint.textContent = 'Click to capture mouse | W/S=forward/back  A/D=left/right  Q/E=up/down | Mouse=look';
  document.body.appendChild(hint);
}

viewer.start();
viewer.controls.enabled = false;
viewer.controls.dispose();
viewer.controls = null;

let yaw = 0;
let pitch = 0;

// Received state for left/right views
let remoteState = null;

if (isCenter) {
  const keys = {};
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', e => keys[e.code] = false);

  window.addEventListener('mousemove', e => {
    if (document.pointerLockElement !== document.body) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
  });

  document.body.addEventListener('click', () => {
    document.body.requestPointerLock();
    if (audio.paused) audio.play().catch(e => console.error(e));
    if (audio2.paused) audio2.play().catch(e => console.error(e));
    if (audio3.paused) audio3.play().catch(e => console.error(e));
    if (audio4.paused) audio4.play().catch(e => console.error(e));
  });

  const lookDir = new THREE.Vector3();

  viewer.renderer.setAnimationLoop(() => {
    const speed = 0.05;
    const cam = viewer.camera;

    cam.rotation.order = 'YXZ';
    cam.rotation.z = Math.PI;
    cam.rotation.y = yaw;
    cam.rotation.x = pitch;

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

    // Broadcast state to left/right windows
    channel.postMessage({
      px: pos.x, py: pos.y, pz: pos.z,
      yaw, pitch
    });

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
      if (dist < h.radius && !h.triggered) { h.triggered = true; h.onEnter(); }
      else if (dist >= h.radius && h.triggered) { h.triggered = false; h.onExit(); }
      h.audio.volume = dist < h.radius ? Math.max(0, 1 - dist / h.radius) : 0;
    }
  });

} else {
  // Left / right views: receive state from center
  channel.addEventListener('message', e => { remoteState = e.data; });

  const lookDir = new THREE.Vector3();

  viewer.renderer.setAnimationLoop(() => {
    if (!remoteState) return;

    const cam = viewer.camera;
    cam.position.set(remoteState.px, remoteState.py, remoteState.pz);

    const totalYaw = remoteState.yaw + yawOffset;
    cam.rotation.order = 'YXZ';
    cam.rotation.z = Math.PI;
    cam.rotation.y = totalYaw;
    cam.rotation.x = remoteState.pitch;

    const pos = cam.position;
    cam.getWorldDirection(lookDir);

    posEl.innerHTML = `[${viewMode}] pos: x: ${pos.x.toFixed(2)}  y: ${pos.y.toFixed(2)}  z: ${pos.z.toFixed(2)}`;

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
  });
}