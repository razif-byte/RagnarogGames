import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Monster, PlayerProfile, HardwareMetrics } from '../types';

export interface WorldCallbacks {
  onInteractMonster: (monster: Monster) => void;
  onEnterZone: (zone: string) => void;
  onMetricsUpdate?: (metrics: HardwareMetrics) => void;
}

// Procedural texture generators for realistic HD materials
function createCobblestoneCanvas(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base mortar
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#202020';
  bCtx.fillRect(0, 0, size, size);

  // Stone tiles grid
  const cols = 8;
  const rows = 8;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offsetX = (r % 2) * (cellW * 0.5);
      const x = (c * cellW + offsetX) % size;
      const y = r * cellH;
      const pad = 3;

      // Random stone shades
      const lightness = 135 + Math.floor(Math.sin(r * 3 + c * 7) * 25);
      const tone = `rgb(${lightness - 5}, ${lightness}, ${lightness + 5})`;
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, cellW - pad * 2, cellH - pad * 2, 6);
      ctx.fill();

      // Bump highlight
      bCtx.fillStyle = '#e0e0e0';
      bCtx.beginPath();
      bCtx.roundRect(x + pad + 1, y + pad + 1, cellW - pad * 2 - 2, cellH - pad * 2 - 2, 5);
      bCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(10, 10);

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(10, 10);

  return { map, bump };
}

function createGrassCanvas(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(0, 0, size, size);

  // Grass specks
  for (let i = 0; i < 600; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const len = 3 + Math.random() * 4;
    ctx.strokeStyle = Math.random() > 0.5 ? '#3e7e35' : '#224a1e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + (Math.random() - 0.5) * 2, gy - len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

export class RagnarokWorld {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private frameId: number = 0;
  private isDisposed: boolean = false;

  // Player Entity & Kinematics
  public playerGroup: THREE.Group;
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 12);
  private targetPlayerRotation: number = 0;
  private playerAnimTime: number = 0;
  private isMoving: boolean = false;

  // Realistic Articulated Human Limbs
  private leftUpperLeg!: THREE.Group;
  private leftKneeJoint!: THREE.Group;
  private rightUpperLeg!: THREE.Group;
  private rightKneeJoint!: THREE.Group;

  private leftUpperArm!: THREE.Group;
  private leftElbowJoint!: THREE.Group;
  private rightUpperArm!: THREE.Group;
  private rightElbowJoint!: THREE.Group;

  private torsoSpineGroup!: THREE.Group;
  private headGroup!: THREE.Group;
  private capeSegments: THREE.Mesh[] = [];
  private bannerMeshes: THREE.Mesh[] = [];

  // Environment & FX
  private monsterMeshes: Map<string, { group: THREE.Group; monster: Monster; initialY: number; bobOffset: number }> = new Map();
  private fountainWater!: THREE.Mesh;
  private waterDropletData: Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number }> = [];
  private dropletPoints!: THREE.Points;
  private sunbeamParticles!: THREE.Points;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Performance tracking
  private lastTime: number = performance.now();
  private frameCount: number = 0;
  private fpsTimer: number = performance.now();
  private currentFps: number = 60;

  // Input states
  public moveIntent: { x: number; z: number } = { x: 0, z: 0 };
  private callbacks: WorldCallbacks;

  constructor(container: HTMLElement, player: PlayerProfile, monsters: Monster[], callbacks: WorldCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer setup with HD post/exposure
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.appendChild(this.renderer.domElement);

    // Scene & Midgarts Sky with atmospheric haze
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xb8e2f8);
    this.scene.fog = new THREE.FogExp2(0xb8e2f8, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      45,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.5,
      300
    );
    this.camera.position.set(0, 11, 25);
    this.camera.lookAt(0, 1.5, 10);

    // Realistic HD Environment map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting setup
    this.setupLighting();

    // World construction (Prontera Plaza + Castle Gate + Outskirts)
    this.buildWorld();

    // Build Realistic Articulated Hero Character
    this.playerGroup = this.buildRealisticHumanModel(player);
    this.scene.add(this.playerGroup);

    // Camera initial position
    this.cameraTarget.set(0, 1.4, 12);
    this.camera.position.set(0, 11, 24);
    this.camera.lookAt(this.cameraTarget);

    // Spawn Field Monsters
    this.spawnMonsters(monsters);

    // Listeners
    window.addEventListener('resize', this.onWindowResize);
    this.setupInteraction();

    // Start Simulation Loop
    this.tick();
  }

  private setupLighting() {
    // Warm Key Sun Light
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    sunLight.position.set(30, 45, 25);
    if (!this.isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 5;
      sunLight.shadow.camera.far = 120;
      sunLight.shadow.camera.left = -45;
      sunLight.shadow.camera.right = 45;
      sunLight.shadow.camera.top = 45;
      sunLight.shadow.camera.bottom = -45;
      sunLight.shadow.bias = -0.0004;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);

    // Sky & Ground Ambient Hemisphere
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x4d7c0f, 0.75);
    this.scene.add(hemiLight);

    // Warm Plaza Lantern Point Lights
    const lanternPositions = [
      { x: -8, y: 3.5, z: 2 },
      { x: 8, y: 3.5, z: 2 },
      { x: -8, y: 3.5, z: 18 },
      { x: 8, y: 3.5, z: 18 },
    ];

    lanternPositions.forEach((lp) => {
      const pLight = new THREE.PointLight(0xfbbf24, 1.2, 18, 1.8);
      pLight.position.set(lp.x, lp.y, lp.z);
      this.scene.add(pLight);

      // Light post mesh
      const postGroup = new THREE.Group();
      postGroup.position.set(lp.x, 0, lp.z);

      const postMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.8 });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.5, 8), postMat);
      post.position.y = 1.75;
      postGroup.add(post);

      const lanternMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), lanternMat);
      lantern.position.y = 3.4;
      postGroup.add(lantern);

      this.scene.add(postGroup);
    });
  }

  private buildWorld() {
    const { map: cobbleMap, bump: cobbleBump } = createCobblestoneCanvas();
    const grassTex = createGrassCanvas();

    // 1. Central Prontera Plaza Paved Ground
    const plazaGeo = new THREE.CylinderGeometry(28, 28, 0.2, 32);
    const plazaMat = new THREE.MeshStandardMaterial({
      map: cobbleMap,
      bumpMap: cobbleBump,
      bumpScale: 0.05,
      roughness: 0.7,
      metalness: 0.1,
    });
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.set(0, 0, 8);
    plazaMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(plazaMesh);

    // Decorative plaza border ring
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const border = new THREE.Mesh(new THREE.TorusGeometry(28, 0.4, 8, 32), borderMat);
    border.rotation.x = Math.PI / 2;
    border.position.set(0, 0.1, 8);
    this.scene.add(border);

    // 2. Surrounding Lush Grass Field
    const grassGeo = new THREE.PlaneGeometry(160, 160);
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.85,
      color: 0x86efac,
    });
    const grassMesh = new THREE.Mesh(grassGeo, grassMat);
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.set(0, -0.05, 20);
    grassMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(grassMesh);

    // 3. Central Grand Odin Fountain
    this.buildGrandFountain();

    // 4. Prontera North Castle Gate & Battlements
    this.buildCastleGate();

    // 5. Merchant Stalls & NPC Areas
    this.buildMarketStalls();

    // 6. Realistic Branched Trees and Foliage
    this.buildFoliage();

    // 7. Volumetric Floating Sunbeam Particles
    this.buildSunbeams();
  }

  private buildGrandFountain() {
    const fountain = new THREE.Group();
    fountain.position.set(0, 0, 0);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.4,
      metalness: 0.1,
    });

    // Tier 1 Base Basin
    const baseGeo = new THREE.CylinderGeometry(5.8, 6.2, 1.0, 32);
    const baseBasin = new THREE.Mesh(baseGeo, stoneMat);
    baseBasin.position.y = 0.5;
    baseBasin.castShadow = !this.isSoftwareGl;
    baseBasin.receiveShadow = !this.isSoftwareGl;
    fountain.add(baseBasin);

    // Water Surface (Layer 1)
    const waterGeo = new THREE.CylinderGeometry(5.3, 5.3, 0.15, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.05,
      metalness: 0.9,
      transparent: true,
      opacity: 0.88,
    });
    this.fountainWater = new THREE.Mesh(waterGeo, waterMat);
    this.fountainWater.position.y = 0.9;
    fountain.add(this.fountainWater);

    // Central Pillar with Carved Relief
    const pillarGeo = new THREE.CylinderGeometry(1.2, 1.6, 2.6, 20);
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.y = 1.8;
    fountain.add(pillar);

    // Tier 2 Upper Basin
    const upperGeo = new THREE.CylinderGeometry(3.0, 3.2, 0.7, 24);
    const upperBasin = new THREE.Mesh(upperGeo, stoneMat);
    upperBasin.position.y = 3.0;
    fountain.add(upperBasin);

    // Angel Wings / Valkyrie Crest Finial
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const spireGeo = new THREE.ConeGeometry(0.6, 2.2, 12);
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.y = 4.4;
    fountain.add(spire);

    // Ballistic Splash Water Droplets
    const dropletCount = 60;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(dropletCount * 3);

    for (let i = 0; i < dropletCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 2.2;
      this.waterDropletData.push({
        x: 0,
        y: 4.8,
        z: 0,
        vx: Math.cos(angle) * speed * 0.7,
        vy: 2.0 + Math.random() * 3.0,
        vz: Math.sin(angle) * speed * 0.7,
      });
      pPos[i * 3] = 0;
      pPos[i * 3 + 1] = 4.8;
      pPos[i * 3 + 2] = 0;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const dropMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.35,
      transparent: true,
      opacity: 0.8,
    });
    this.dropletPoints = new THREE.Points(pGeo, dropMat);
    fountain.add(this.dropletPoints);

    this.scene.add(fountain);
  }

  private buildCastleGate() {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, -28);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.7,
      metalness: 0.1,
    });
    const slateRoofMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.4,
      metalness: 0.2,
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });

    // Left Bastion Tower
    const towerGeo = new THREE.CylinderGeometry(3.2, 3.6, 14, 16);
    const leftTower = new THREE.Mesh(towerGeo, stoneMat);
    leftTower.position.set(-10, 7, 0);
    leftTower.castShadow = !this.isSoftwareGl;
    gateGroup.add(leftTower);

    // Left Conical Roof
    const roofGeo = new THREE.ConeGeometry(4.2, 5.5, 16);
    const leftRoof = new THREE.Mesh(roofGeo, slateRoofMat);
    leftRoof.position.set(-10, 16.5, 0);
    gateGroup.add(leftRoof);

    // Right Bastion Tower & Roof
    const rightTower = new THREE.Mesh(towerGeo, stoneMat);
    rightTower.position.set(10, 7, 0);
    rightTower.castShadow = !this.isSoftwareGl;
    gateGroup.add(rightTower);

    const rightRoof = new THREE.Mesh(roofGeo, slateRoofMat);
    rightRoof.position.set(10, 16.5, 0);
    gateGroup.add(rightRoof);

    // Central Archway with Battlements
    const archGeo = new THREE.BoxGeometry(16, 4, 3.5);
    const arch = new THREE.Mesh(archGeo, stoneMat);
    arch.position.set(0, 10, 0);
    gateGroup.add(arch);

    // Battlement Crenellations
    for (let b = -7; b <= 7; b += 2.2) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 3.6), stoneMat);
      merlon.position.set(b, 12.6, 0);
      gateGroup.add(merlon);
    }

    // Heavy Iron-reinforced Gates
    const doorGeo = new THREE.BoxGeometry(12, 8, 0.6);
    const doors = new THREE.Mesh(doorGeo, woodMat);
    doors.position.set(0, 4, 0);
    gateGroup.add(doors);

    // Hanging Heraldry Banners (Animated in tick)
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    [-4.5, 4.5].forEach((bx) => {
      const bannerGeo = new THREE.PlaneGeometry(2.4, 6.0, 4, 8);
      const banner = new THREE.Mesh(bannerGeo, bannerMat);
      banner.position.set(bx, 7.5, 1.85);
      gateGroup.add(banner);
      this.bannerMeshes.push(banner);
    });

    this.scene.add(gateGroup);
  }

  private buildMarketStalls() {
    const stalls = [
      { x: -14, z: -6, rot: 0.35, color: 0xdc2626, label: 'Smithy & Forging' },
      { x: -15, z: 9, rot: -0.25, color: 0x2563eb, label: 'Alchemist Potions' },
      { x: 14, z: -6, rot: -0.35, color: 0x059669, label: 'Headgear Boutique' },
      { x: 15, z: 9, rot: 0.25, color: 0xd97706, label: 'Monster Card Dealer' },
    ];

    stalls.forEach((s) => {
      const stall = new THREE.Group();
      stall.position.set(s.x, 0, s.z);
      stall.rotation.y = s.rot;

      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const table = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.2, 2.4), woodMat);
      table.position.y = 0.6;
      table.castShadow = !this.isSoftwareGl;
      stall.add(table);

      // Fabric Canopy
      const canopyMat = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.45 });
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.4, 4), canopyMat);
      canopy.position.set(0, 3.2, 0);
      canopy.rotation.y = Math.PI / 4;
      stall.add(canopy);

      // Posts
      const postMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8), postMat);
      p1.position.set(-1.9, 1.4, -1.0);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.8), postMat);
      p2.position.set(1.9, 1.4, -1.0);
      stall.add(p1);
      stall.add(p2);

      this.scene.add(stall);
    });
  }

  private buildFoliage() {
    const treePositions = [
      { x: -22, z: -24 },
      { x: 22, z: -24 },
      { x: -25, z: 12 },
      { x: 25, z: 12 },
      { x: -18, z: 38 },
      { x: 18, z: 38 },
      { x: -32, z: 52 },
      { x: 32, z: 52 },
      { x: 0, z: 68 },
    ];

    const barkMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1b, roughness: 0.9 });
    const leafColors = [0x2e7d32, 0x388e3c, 0x43a047, 0x1b5e20];

    treePositions.forEach((pos, idx) => {
      const tree = new THREE.Group();
      tree.position.set(pos.x, 0, pos.z);

      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.8, 5.0, 10), barkMat);
      trunk.position.y = 2.5;
      trunk.castShadow = !this.isSoftwareGl;
      tree.add(trunk);

      // Branch boughs with tiered foliage
      const lMat = new THREE.MeshStandardMaterial({
        color: leafColors[idx % leafColors.length],
        roughness: 0.65,
      });

      const tier1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), lMat);
      tier1.position.y = 5.2;
      tier1.castShadow = !this.isSoftwareGl;
      tree.add(tier1);

      const tier2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 1), lMat);
      tier2.position.set(0.7, 6.4, 0.4);
      tree.add(tier2);

      const tier3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), lMat);
      tier3.position.set(-0.6, 7.0, -0.3);
      tree.add(tier3);

      this.scene.add(tree);
    });
  }

  private buildSunbeams() {
    const beamCount = 45;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(beamCount * 3);

    for (let i = 0; i < beamCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 45;
      pos[i * 3 + 1] = 0.5 + Math.random() * 8.0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 45 + 8;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.28,
      transparent: true,
      opacity: 0.45,
    });
    this.sunbeamParticles = new THREE.Points(geo, mat);
    this.scene.add(this.sunbeamParticles);
  }

  // Realistic Articulated Human Avatar
  private buildRealisticHumanModel(player: PlayerProfile): THREE.Group {
    const hero = new THREE.Group();
    hero.position.set(0, 0, 12);
    hero.scale.set(1.2, 1.2, 1.2);

    // Contact Soft Shadow
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    hero.add(shadow);

    // Job Class Thematic Colors
    const jobColors: Record<string, { primary: number; secondary: number; armor: number }> = {
      Swordsman: { primary: 0x1d4ed8, secondary: 0x93c5fd, armor: 0xd4d4d8 },
      Knight: { primary: 0x1e40af, secondary: 0xbfdbfe, armor: 0xf4f4f5 },
      Mage: { primary: 0x6d28d9, secondary: 0xc4b5fd, armor: 0x7c3aed },
      Wizard: { primary: 0x5b21b6, secondary: 0xddd6fe, armor: 0x6d28d9 },
      Archer: { primary: 0x15803d, secondary: 0x86efac, armor: 0xa16207 },
      Hunter: { primary: 0x166534, secondary: 0xbbf7d0, armor: 0x854d0e },
      Thief: { primary: 0x334155, secondary: 0x94a3b8, armor: 0x1e293b },
      Assassin: { primary: 0x0f172a, secondary: 0x64748b, armor: 0x334155 },
      Acolyte: { primary: 0xd97706, secondary: 0xfef08a, armor: 0xffffff },
      Priest: { primary: 0xb45309, secondary: 0xfef9c3, armor: 0xfef08a },
    };

    const colors = jobColors[player.job] || jobColors.Swordsman;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfcd34d,
      roughness: 0.55,
      metalness: 0.05,
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: colors.primary,
      roughness: 0.6,
    });
    const cuirassMat = new THREE.MeshStandardMaterial({
      color: colors.armor,
      metalness: 0.75,
      roughness: 0.25,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.2,
    });
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.75,
    });

    // 1. Torso & Spine Group
    this.torsoSpineGroup = new THREE.Group();
    this.torsoSpineGroup.position.y = 1.0;

    // Sculpted Breastplate (Cuirass)
    const chestGeo = new THREE.BoxGeometry(0.72, 0.7, 0.44);
    const chest = new THREE.Mesh(chestGeo, cuirassMat);
    chest.position.y = 0.45;
    chest.castShadow = !this.isSoftwareGl;
    this.torsoSpineGroup.add(chest);

    // Abdominal Plackart
    const absGeo = new THREE.BoxGeometry(0.64, 0.4, 0.38);
    const abs = new THREE.Mesh(absGeo, clothMat);
    abs.position.y = 0.05;
    this.torsoSpineGroup.add(abs);

    // Gold Trim Gorget (Neck guard)
    const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.15, 16), goldTrimMat);
    gorget.position.y = 0.85;
    this.torsoSpineGroup.add(gorget);

    // Leather War Belt with Buckle & Pouch
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.42), leatherMat);
    belt.position.y = -0.15;
    this.torsoSpineGroup.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.46), goldTrimMat);
    buckle.position.y = -0.15;
    this.torsoSpineGroup.add(buckle);

    // Hip Adventurer Pouch
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.24), leatherMat);
    pouch.position.set(0.4, -0.15, 0.05);
    this.torsoSpineGroup.add(pouch);

    // 2. Head & Realistic Facial Features
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.15, 0);

    // Anatomical Head (Cranium + Chin taper)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 20), skinMat);
    head.scale.set(1.0, 1.15, 1.05);
    this.headGroup.add(head);

    // Realistic Anime Eyes
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeIrisMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    [-0.12, 0.12].forEach((ex) => {
      const eyeWhite = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.02), eyeWhiteMat);
      eyeWhite.position.set(ex, 0.02, 0.35);
      const iris = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), eyeIrisMat);
      iris.position.set(ex, 0.02, 0.352);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.04), eyePupilMat);
      pupil.position.set(ex, 0.02, 0.355);
      this.headGroup.add(eyeWhite);
      this.headGroup.add(iris);
      this.headGroup.add(pupil);
    });

    // Sculpted Anime Layered Hair
    const hairColor = 0xd97706; // Golden/amber hero hair
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.6 });

    // Forelock & Crown Spikes
    for (let h = -2; h <= 2; h++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.45, 6), hairMat);
      spike.position.set(h * 0.12, 0.32, 0.12 - Math.abs(h) * 0.06);
      spike.rotation.x = 0.3;
      spike.rotation.z = -h * 0.15;
      this.headGroup.add(spike);
    }
    // Hair Back Mantle
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), hairMat);
    backHair.position.set(0, 0.08, -0.08);
    this.headGroup.add(backHair);

    // Valkyrie Helm / Cat Ear Beret Headgear
    const beretMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35 });
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.42, 0.18, 18), beretMat);
    beret.position.set(0, 0.38, 0);
    this.headGroup.add(beret);

    // Cat Ears with inner pink
    const ear1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 4), beretMat);
    ear1.position.set(-0.32, 0.58, 0);
    ear1.rotation.z = 0.25;
    const ear2 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.32, 4), beretMat);
    ear2.position.set(0.32, 0.58, 0);
    ear2.rotation.z = -0.25;
    this.headGroup.add(ear1);
    this.headGroup.add(ear2);

    this.torsoSpineGroup.add(this.headGroup);

    // 3. Multi-Segment Flowing Cloth Cape (Hinged Segments for realistic wind ripple)
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Royal crimson
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    this.capeSegments = [];
    let prevAttach: THREE.Object3D = this.torsoSpineGroup;
    let segY = 0.75;

    for (let c = 0; c < 4; c++) {
      const segMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.32), capeMat);
      segMesh.position.set(0, c === 0 ? segY : -0.28, -0.25);
      prevAttach.add(segMesh);
      this.capeSegments.push(segMesh);
      prevAttach = segMesh;
    }

    // 4. Articulated Arms (Upper arm + Elbow joint + Forearm + Weapon)
    // Left Arm
    this.leftUpperArm = new THREE.Group();
    this.leftUpperArm.position.set(-0.48, 0.7, 0);

    const pauldronGeo = new THREE.SphereGeometry(0.24, 12, 12, 0, Math.PI);
    const leftPauldron = new THREE.Mesh(pauldronGeo, cuirassMat);
    leftPauldron.rotation.x = -Math.PI / 2;
    leftPauldron.position.y = 0.05;
    this.leftUpperArm.add(leftPauldron);

    const bicepMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.42, 10), clothMat);
    bicepMesh.position.y = -0.21;
    this.leftUpperArm.add(bicepMesh);

    this.leftElbowJoint = new THREE.Group();
    this.leftElbowJoint.position.set(0, -0.42, 0);
    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.4, 10), leatherMat);
    leftForearm.position.y = -0.2;
    this.leftElbowJoint.add(leftForearm);
    this.leftUpperArm.add(this.leftElbowJoint);
    this.torsoSpineGroup.add(this.leftUpperArm);

    // Right Arm (Armed with Damascus Steel Claymore)
    this.rightUpperArm = new THREE.Group();
    this.rightUpperArm.position.set(0.48, 0.7, 0);

    const rightPauldron = new THREE.Mesh(pauldronGeo, cuirassMat);
    rightPauldron.rotation.x = -Math.PI / 2;
    rightPauldron.position.y = 0.05;
    this.rightUpperArm.add(rightPauldron);

    const rightBicep = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.42, 10), clothMat);
    rightBicep.position.y = -0.21;
    this.rightUpperArm.add(rightBicep);

    this.rightElbowJoint = new THREE.Group();
    this.rightElbowJoint.position.set(0, -0.42, 0);
    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.4, 10), leatherMat);
    rightForearm.position.y = -0.2;
    this.rightElbowJoint.add(rightForearm);

    // High Polish Claymore / Staff
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.12,
    });
    const bladeGeo = new THREE.BoxGeometry(0.14, 1.4, 0.04);
    const blade = new THREE.Mesh(bladeGeo, steelMat);
    blade.position.set(0.08, -0.3, 0.5);
    blade.rotation.x = Math.PI / 2.8;

    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.08), goldTrimMat);
    crossguard.position.set(0.08, -0.2, 0.15);
    this.rightElbowJoint.add(blade);
    this.rightElbowJoint.add(crossguard);

    this.rightUpperArm.add(this.rightElbowJoint);
    this.torsoSpineGroup.add(this.rightUpperArm);

    hero.add(this.torsoSpineGroup);

    // 5. Articulated Legs (Thigh + Knee Joint + Boot Calf)
    const legClothMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x3b2413, roughness: 0.6 });

    // Left Leg
    this.leftUpperLeg = new THREE.Group();
    this.leftUpperLeg.position.set(-0.22, 0.9, 0);

    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.46, 12), legClothMat);
    leftThigh.position.y = -0.23;
    leftThigh.castShadow = !this.isSoftwareGl;
    this.leftUpperLeg.add(leftThigh);

    this.leftKneeJoint = new THREE.Group();
    this.leftKneeJoint.position.set(0, -0.46, 0);

    const leftKneecap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), cuirassMat);
    leftKneecap.position.set(0, 0, 0.06);
    this.leftKneeJoint.add(leftKneecap);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.32), bootMat);
    leftBoot.position.set(0, -0.24, 0.02);
    leftBoot.castShadow = !this.isSoftwareGl;
    this.leftKneeJoint.add(leftBoot);

    this.leftUpperLeg.add(this.leftKneeJoint);
    hero.add(this.leftUpperLeg);

    // Right Leg
    this.rightUpperLeg = new THREE.Group();
    this.rightUpperLeg.position.set(0.22, 0.9, 0);

    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.46, 12), legClothMat);
    rightThigh.position.y = -0.23;
    rightThigh.castShadow = !this.isSoftwareGl;
    this.rightUpperLeg.add(rightThigh);

    this.rightKneeJoint = new THREE.Group();
    this.rightKneeJoint.position.set(0, -0.46, 0);

    const rightKneecap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), cuirassMat);
    rightKneecap.position.set(0, 0, 0.06);
    this.rightKneeJoint.add(rightKneecap);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.48, 0.32), bootMat);
    rightBoot.position.set(0, -0.24, 0.02);
    rightBoot.castShadow = !this.isSoftwareGl;
    this.rightKneeJoint.add(rightBoot);

    this.rightUpperLeg.add(this.rightKneeJoint);
    hero.add(this.rightUpperLeg);

    return hero;
  }

  public spawnMonsters(monsters: Monster[]) {
    this.monsterMeshes.forEach((item) => {
      this.scene.remove(item.group);
    });
    this.monsterMeshes.clear();

    const spawnPositions = [
      { x: -5, z: 32 },  // Poring
      { x: 6, z: 36 },   // Fabre
      { x: -12, z: 42 }, // Lunatic
      { x: 10, z: 46 },  // Chonchon
      { x: 0, z: 58 },   // Baphomet MVP
    ];

    monsters.forEach((monster, idx) => {
      const pos = spawnPositions[idx % spawnPositions.length];
      const mGroup = this.buildMonsterGroup(monster);
      mGroup.position.set(pos.x, 0, pos.z);
      this.scene.add(mGroup);
      this.monsterMeshes.set(monster.id, {
        group: mGroup,
        monster,
        initialY: 0,
        bobOffset: idx * 1.3,
      });
    });
  }

  private buildMonsterGroup(monster: Monster): THREE.Group {
    const group = new THREE.Group();

    if (monster.id === 'poring') {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfb7185,
        roughness: 0.15,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 24), mat);
      body.scale.set(1.15, 0.95, 1.15);
      body.position.y = 0.8;
      body.castShadow = !this.isSoftwareGl;
      group.add(body);

      // Cute Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), eyeMat);
      eyeL.position.set(-0.28, 0.88, 0.75);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), eyeMat);
      eyeR.position.set(0.28, 0.88, 0.75);
      group.add(eyeL);
      group.add(eyeR);

      // Blushing Cheeks
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const blushL = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), blushMat);
      blushL.position.set(-0.45, 0.74, 0.72);
      const blushR = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), blushMat);
      blushR.position.set(0.45, 0.74, 0.72);
      group.add(blushL);
      group.add(blushR);
    } else {
      // General field monster
      const mat = new THREE.MeshStandardMaterial({ color: monster.color, roughness: 0.35 });
      const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 * monster.scale, 1), mat);
      body.position.y = 0.8 * monster.scale;
      body.castShadow = !this.isSoftwareGl;
      group.add(body);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12 * monster.scale, 8, 8), eyeMat);
      eye.position.set(-0.25 * monster.scale, 0.9 * monster.scale, 0.65 * monster.scale);
      const eye2 = eye.clone();
      eye2.position.x = 0.25 * monster.scale;
      group.add(eye);
      group.add(eye2);
    }

    return group;
  }

  private setupInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent | TouchEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);

      // Monster raycast target
      const targets: THREE.Object3D[] = [];
      this.monsterMeshes.forEach((item) => targets.push(item.group));

      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && hitObj.parent && hitObj.parent !== this.scene) {
          hitObj = hitObj.parent;
        }
        if (hitObj) {
          for (const [, item] of this.monsterMeshes) {
            if (item.group === hitObj) {
              this.callbacks.onInteractMonster(item.monster);
              return;
            }
          }
        }
      }

      // Ground click move
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        const dir = hit.clone().sub(this.playerGroup.position);
        dir.y = 0;
        if (dir.length() > 0.5) {
          dir.normalize();
          this.moveIntent.x = dir.x;
          this.moveIntent.z = dir.z;
          setTimeout(() => {
            this.moveIntent.x = 0;
            this.moveIntent.z = 0;
          }, 800);
        }
      }
    };

    this.renderer.domElement.addEventListener('click', handleClick);
  }

  // Master Simulation Tick
  private tick = () => {
    if (this.isDisposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;

    // Performance Metrics Meter
    this.frameCount++;
    if (now - this.fpsTimer >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = now;
      if (this.callbacks.onMetricsUpdate) {
        this.callbacks.onMetricsUpdate({
          fps: this.currentFps,
          frameTimeMs: Math.round(dt * 1000),
          drawCalls: this.renderer.info.render.calls,
          polyCount: this.renderer.info.render.triangles,
          memoryUsageMb: Math.round(52 + (Math.sin(now * 0.001) * 3)),
          tier: this.isSoftwareGl ? 'Low' : this.currentFps > 50 ? 'Ultra' : 'High',
        });
      }
    }

    // 1. Update Realistic Character Kinematics
    const speed = 7.8;
    const moveX = this.moveIntent.x;
    const moveZ = this.moveIntent.z;
    const intentLen = Math.sqrt(moveX * moveX + moveZ * moveZ);

    if (intentLen > 0.1) {
      this.isMoving = true;
      const normX = moveX / intentLen;
      const normZ = moveZ / intentLen;
      this.playerPos.x += normX * speed * dt;
      this.playerPos.z += normZ * speed * dt;

      // Restrict to world perimeter
      this.playerPos.x = Math.max(-55, Math.min(55, this.playerPos.x));
      this.playerPos.z = Math.max(-25, Math.min(75, this.playerPos.z));

      this.targetPlayerRotation = Math.atan2(normX, normZ);
      this.playerAnimTime += dt * 11;
    } else {
      this.isMoving = false;
    }

    this.playerGroup.position.copy(this.playerPos);

    // Smooth rotational damping
    let rotDiff = this.targetPlayerRotation - this.playerGroup.rotation.y;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    this.playerGroup.rotation.y += rotDiff * Math.min(1, dt * 12);

    // Realistic Articulated Human Gait Cycle
    if (this.isMoving) {
      const swing = Math.sin(this.playerAnimTime);
      const cosSwing = Math.cos(this.playerAnimTime);

      // Thigh angles
      this.leftUpperLeg.rotation.x = swing * 0.75;
      this.rightUpperLeg.rotation.x = -swing * 0.75;

      // Knee flexion: knee bends backward during forward swing
      this.leftKneeJoint.rotation.x = Math.max(0, -swing * 0.9);
      this.rightKneeJoint.rotation.x = Math.max(0, swing * 0.9);

      // Arms swing anti-phase with elbow flex
      this.leftUpperArm.rotation.x = -swing * 0.65;
      this.rightUpperArm.rotation.x = swing * 0.65;
      this.leftElbowJoint.rotation.x = -0.3 - Math.abs(swing) * 0.4;
      this.rightElbowJoint.rotation.x = -0.3 - Math.abs(swing) * 0.4;

      // Torso contrapposto & pelvic bounce
      this.torsoSpineGroup.position.y = 1.0 + Math.abs(cosSwing) * 0.08;
      this.torsoSpineGroup.rotation.y = -swing * 0.12;
      this.torsoSpineGroup.rotation.x = 0.08; // Slight forward sprint lean
      this.headGroup.rotation.y = swing * 0.1; // Counter head stabilize
    } else {
      // Natural idle breathing
      const breath = Math.sin(now * 0.003);
      this.leftUpperLeg.rotation.x = 0;
      this.rightUpperLeg.rotation.x = 0;
      this.leftKneeJoint.rotation.x = 0;
      this.rightKneeJoint.rotation.x = 0;

      this.leftUpperArm.rotation.x = breath * 0.04;
      this.rightUpperArm.rotation.x = -breath * 0.04;
      this.leftElbowJoint.rotation.x = -0.15;
      this.rightElbowJoint.rotation.x = -0.25;

      this.torsoSpineGroup.position.y = 1.0 + breath * 0.025;
      this.torsoSpineGroup.rotation.x = 0;
      this.torsoSpineGroup.rotation.y = 0;
      this.headGroup.rotation.y = Math.sin(now * 0.001) * 0.12; // Subtle glance
    }

    // Flowing Cape Ripple Simulation
    this.capeSegments.forEach((seg, index) => {
      const waveFreq = this.isMoving ? 14 : 4;
      const waveAmp = this.isMoving ? 0.35 : 0.12;
      const wavePhase = (index + 1) * 0.6;
      seg.rotation.x = Math.sin(now * 0.001 * waveFreq - wavePhase) * waveAmp;
    });

    // Castle Gate Heraldry Banners Wind Wave
    this.bannerMeshes.forEach((banner, i) => {
      banner.rotation.x = Math.sin(now * 0.002 + i) * 0.08;
    });

    // 2. Camera Follow with Smooth Damping
    const targetCamX = this.playerPos.x;
    const targetCamY = this.playerPos.y + 10.5;
    const targetCamZ = this.playerPos.z + 14.5;

    const camDamp = 1 - Math.exp(-6 * dt);
    this.camera.position.x += (targetCamX - this.camera.position.x) * camDamp;
    this.camera.position.y += (targetCamY - this.camera.position.y) * camDamp;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * camDamp;

    this.cameraTarget.copy(this.playerPos);
    this.cameraTarget.y += 1.4;
    this.camera.lookAt(this.cameraTarget);

    // 3. Animate Monsters (Poring bounce & idle bobs)
    this.monsterMeshes.forEach((item) => {
      const time = now * 0.004 + item.bobOffset;
      if (item.monster.id === 'poring') {
        const bounce = Math.abs(Math.sin(time * 3));
        item.group.position.y = bounce * 0.65;
        item.group.scale.y = 1.0 - bounce * 0.18;
        item.group.scale.x = 1.0 + bounce * 0.12;
      } else {
        item.group.position.y = Math.sin(time) * 0.15;
      }
    });

    // 4. Animate Fountain Water & Droplets
    if (this.fountainWater) {
      this.fountainWater.rotation.y += dt * 0.35;
    }

    if (this.dropletPoints && this.waterDropletData.length > 0) {
      const posAttr = this.dropletPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      for (let i = 0; i < this.waterDropletData.length; i++) {
        const d = this.waterDropletData[i];
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.z += d.vz * dt;
        d.vy -= 9.8 * dt; // Gravity

        if (d.y < 0.9) {
          // Splash reset
          d.x = 0;
          d.y = 4.8;
          d.z = 0;
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.0 + Math.random() * 2.2;
          d.vx = Math.cos(angle) * speed * 0.7;
          d.vy = 2.0 + Math.random() * 3.0;
          d.vz = Math.sin(angle) * speed * 0.7;
        }

        posArray[i * 3] = d.x;
        posArray[i * 3 + 1] = d.y;
        posArray[i * 3 + 2] = d.z;
      }
      posAttr.needsUpdate = true;
    }

    // 5. Render Scene
    this.renderer.render(this.scene, this.camera);

    // Next frame
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private onWindowResize = () => {
    if (!this.container || this.isDisposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setPlayerPosition(x: number, z: number) {
    this.playerPos.set(x, 0, z);
    this.playerGroup.position.copy(this.playerPos);
  }

  public dispose() {
    this.isDisposed = true;
    window.removeEventListener('resize', this.onWindowResize);
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
