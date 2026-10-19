import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { EventBus } from '../game/EventBus';

export interface Unit3DInstance {
  id: string;
  model: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: string;
  isDragging: boolean;
  baseScale: number;
}

interface PendingSpawn {
  id: string;
  modelKey: string;
  screenX: number;
  screenY: number;
  isPlayerOwned: boolean;
  starLevel: number;
}

export class ThreeSceneManager {
  private static instance: ThreeSceneManager | null = null;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private canvas!: HTMLCanvasElement;
  private clock = new THREE.Clock();

  private gltfLoader = new GLTFLoader();
  private loadedGltfTemplates = new Map<string, any>();
  private pendingSpawns = new Map<string, PendingSpawn>();
  private units = new Map<string, Unit3DInstance>();
  private isLoaded = false;

  private width = window.innerWidth;
  private height = window.innerHeight;
  private animationFrameId: number | null = null;

  public static getInstance(): ThreeSceneManager {
    if (!ThreeSceneManager.instance) {
      ThreeSceneManager.instance = new ThreeSceneManager();
    }
    return ThreeSceneManager.instance;
  }

  public async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. Scene & Transparent Renderer
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 2. Orthographic Camera matching screen pixels
    this.updateCamera();

    // 3. Lighting Setup tailored for Warcraft stylized models
    const ambientLight = new THREE.AmbientLight(0xe2e8f0, 1.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    dirLight.position.set(100, 250, 300);
    this.scene.add(dirLight);

    const blueRimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    blueRimLight.position.set(-150, -50, 150);
    this.scene.add(blueRimLight);

    const warmFillLight = new THREE.PointLight(0xf59e0b, 1.2, 800);
    warmFillLight.position.set(0, -100, 200);
    this.scene.add(warmFillLight);

    // 4. Preload GLB Character Models
    await this.preloadModels();

    // 5. Setup EventBus Listeners
    this.setupEventListeners();

    // 6. Start Render Loop
    this.startLoop();

    window.addEventListener('resize', this.onWindowResize);
  }

  private updateCamera() {
    this.camera = new THREE.OrthographicCamera(
      -this.width / 2,
      this.width / 2,
      this.height / 2,
      -this.height / 2,
      -2000,
      2000
    );
    this.camera.position.set(0, 0, 800);
    this.camera.lookAt(0, 0, 0);
  }

  private async preloadModels() {
    const modelsToLoad = [
      { key: 'warrior', path: '/models/knight.glb' },
      { key: 'paladin', path: '/models/knight.glb' },
      { key: 'mage', path: '/models/mage.glb' },
      { key: 'hunter', path: '/models/rogue_hooded.glb' },
      { key: 'shaman', path: '/models/barbarian.glb' },
    ];

    const promises = modelsToLoad.map(({ key, path }) => {
      return new Promise<void>((resolve) => {
        this.gltfLoader.load(
          path,
          (gltf) => {
            this.loadedGltfTemplates.set(key, gltf);
            resolve();
          },
          undefined,
          (err) => {
            console.error(`Error loading GLB model ${key}:`, err);
            resolve();
          }
        );
      });
    });

    await Promise.all(promises);
    this.isLoaded = true;

    // Flush any units that were requested before GLB assets finished downloading
    if (this.pendingSpawns.size > 0) {
      this.pendingSpawns.forEach((p) => {
        this.spawnUnit(p.id, p.modelKey, p.screenX, p.screenY, p.isPlayerOwned, p.starLevel);
      });
      this.pendingSpawns.clear();
    }
  }

  private setupEventListeners() {
    EventBus.on('three-unit-spawn', (data: {
      id: string;
      modelKey: string;
      x: number;
      y: number;
      isPlayerOwned: boolean;
      starLevel: number;
    }) => {
      this.spawnUnit(data.id, data.modelKey, data.x, data.y, data.isPlayerOwned, data.starLevel);
    });

    EventBus.on('three-unit-update', (data: {
      id: string;
      x: number;
      y: number;
      isDragging?: boolean;
    }) => {
      this.updateUnitPosition(data.id, data.x, data.y, data.isDragging ?? false);
    });

    EventBus.on('three-unit-animate', (data: {
      id: string;
      animation: 'idle' | 'walk' | 'attack' | 'death';
    }) => {
      this.playUnitAnimation(data.id, data.animation);
    });

    EventBus.on('three-unit-remove', (data: { id: string }) => {
      this.removeUnit(data.id);
    });
  }

  public spawnUnit(
    id: string,
    modelKey: string,
    screenX: number,
    screenY: number,
    isPlayerOwned: boolean,
    starLevel = 1
  ) {
    if (this.units.has(id)) {
      this.updateUnitPosition(id, screenX, screenY, false);
      return;
    }

    if (!this.isLoaded) {
      // Model files are still loading over the network; queue this spawn
      this.pendingSpawns.set(id, { id, modelKey, screenX, screenY, isPlayerOwned, starLevel });
      return;
    }

    // Determine template
    const templateKey = modelKey.replace('model_', '');
    const gltf = this.loadedGltfTemplates.get(templateKey) || this.loadedGltfTemplates.get('warrior');
    if (!gltf) return;

    // Correctly clone SkinnedMesh and bones using SkeletonUtils
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Group;

    // Apply materials and tints if needed
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          if (templateKey === 'paladin') {
            // Give Paladin a holy golden/bronze specular tint
            child.material.color.setHex(0xffdf80);
          }
        }
      }
    });

    // Isometric auto-battler scale (fits the hex/isometric cell)
    // Star level scaling: 1★ = 36, 2★ = 42, 3★ = 50
    const starMult = starLevel === 1 ? 1.0 : starLevel === 2 ? 1.18 : 1.38;
    const baseScale = 36 * starMult;
    clone.scale.set(baseScale, baseScale, baseScale);

    // Rotate character:
    // Slightly tilted forward towards the camera (approx 20°) to match isometric perspective
    // Player units face upwards towards enemy lines (Y rotation: 0)
    // Enemy units face downwards towards player lines (Y rotation: Math.PI)
    clone.rotation.x = 0.35;
    clone.rotation.y = isPlayerOwned ? 0.2 : Math.PI - 0.2;

    // Set screen position in Three space (feet anchored at tile center)
    const threePos = this.screenToThree(screenX, screenY);
    clone.position.set(threePos.x, threePos.y, threePos.z);

    this.scene.add(clone);

    // Animation Mixer with embedded clips
    const mixer = new THREE.AnimationMixer(clone);
    const actions = new Map<string, THREE.AnimationAction>();

    gltf.animations.forEach((clip: THREE.AnimationClip) => {
      const action = mixer.clipAction(clip);
      actions.set(clip.name.toLowerCase(), action);
    });

    // Default to Idle animation
    const idleAction =
      actions.get('idle') ||
      actions.get('2h_melee_idle') ||
      actions.get('unarmed_idle');

    let currentAction = 'idle';
    if (idleAction) {
      idleAction.play();
    }

    this.units.set(id, {
      id,
      model: clone,
      mixer,
      actions,
      currentAction,
      isDragging: false,
      baseScale,
    });
  }

  public updateUnitPosition(id: string, screenX: number, screenY: number, isDragging: boolean) {
    if (this.pendingSpawns.has(id)) {
      const pending = this.pendingSpawns.get(id)!;
      pending.screenX = screenX;
      pending.screenY = screenY;
      return;
    }

    const unit = this.units.get(id);
    if (!unit) return;

    const threePos = this.screenToThree(screenX, screenY);
    unit.model.position.x = threePos.x;
    unit.model.position.y = threePos.y; // Feet planted precisely at tile center
    unit.model.position.z = threePos.z;

    if (isDragging !== unit.isDragging) {
      unit.isDragging = isDragging;
      const targetScale = unit.baseScale * (isDragging ? 1.18 : 1.0);
      unit.model.scale.set(targetScale, targetScale, targetScale);
    }
  }

  public playUnitAnimation(id: string, anim: 'idle' | 'walk' | 'attack' | 'death') {
    const unit = this.units.get(id);
    if (!unit) return;

    let clipName = 'idle';
    if (anim === 'walk') clipName = 'walking_a';
    if (anim === 'attack') clipName = '1h_melee_attack_slice_horizontal';
    if (anim === 'death') clipName = 'death_a';

    let action = unit.actions.get(clipName);
    if (!action) {
      // Fallback searches
      for (const [key, act] of unit.actions.entries()) {
        if (key.includes(anim)) {
          action = act;
          break;
        }
      }
    }

    if (action) {
      unit.mixer.stopAllAction();
      if (anim === 'attack') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = false;
        action.play();
        // Return to idle after attack finishes
        setTimeout(() => {
          this.playUnitAnimation(id, 'idle');
        }, action.getClip().duration * 1000);
      } else if (anim === 'death') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
      }
      unit.currentAction = anim;
    }
  }

  public removeUnit(id: string) {
    const unit = this.units.get(id);
    if (!unit) return;

    this.scene.remove(unit.model);
    unit.mixer.stopAllAction();
    this.units.delete(id);
  }

  private screenToThree(screenX: number, screenY: number): { x: number; y: number; z: number } {
    const x = screenX - this.width / 2;
    // Invert Y coordinate because Three.js Y goes up, screen Y goes down
    const y = -(screenY - this.height / 2);
    // Depth layering: lower rows on screen (larger screenY) should render in front
    const z = (screenY / this.height) * 100;
    return { x, y, z };
  }

  private onWindowResize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.updateCamera();
    this.renderer.setSize(this.width, this.height);
  };

  private startLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      // Update character skeletal animation mixers
      this.units.forEach((unit) => {
        unit.mixer.update(delta);
      });

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    this.units.clear();
    this.renderer.dispose();
  }
}
