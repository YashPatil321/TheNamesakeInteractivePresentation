// Loads the Blender-made models in public/models (glTF binary, Draco-compressed).
// Source scripts that build them live in /blender and run headless: /opt/blendervenv/bin/python blender/<script>.py
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let loader: GLTFLoader | null = null;
let draco: DRACOLoader | null = null;
const cache = new Map<string, Promise<GLTF>>();

export function loadGLB(url: string): Promise<GLTF> {
  if (!loader) {
    draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
  }
  let p = cache.get(url);
  if (!p) { p = loader.loadAsync(url); cache.set(url, p); }
  return p;
}

/** Free the shared decoder worker (call from World.dispose). */
export function disposeLoaders() {
  draco?.dispose(); draco = null; loader = null; cache.clear();
}

/** Enable shadows on every mesh of a loaded scene. */
export function shadowAll(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });
}
