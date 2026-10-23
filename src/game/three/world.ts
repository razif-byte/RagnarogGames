import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Monster, PlayerProfile, HardwareMetrics } from '../types';

export interface WorldCallbacks {
  onInteractMonster: (monster: Monster) => void;
  onEnterZone: (zone: string) => void;
  onMetricsUpdate?: (metrics: HardwareMetrics) => void;
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
  private playerVel: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetPlayerRotation: number = 0;
  private playerAnimTime: number = 0;
  private isMoving: boolean = false;

  // Player sub-limbs for animation
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private weaponMesh!: THREE.Mesh;

  // Environment & Monsters
  private monsterMeshes: Map<string, { group: THREE.Group; monster: Monster; initialY: number; bobOffset: number }> = new Map();
  private fountainWater!: THREE.Mesh;
  private waterParticles: THREE.Points | null = null;
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

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xaed4f8); // Bright Midgarts sky
    this.scene.fog = new THREE.FogExp2(0xaed4f8, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      45,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.5,
      250
    );
    this.camera.position.set(0, 11, 24);
    this.camera.lookAt(0, 1.2, 8);

    // Environment map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting
    this.setupLighting();

    // Build World (Prontera Plaza & Surroundings)
    this.buildWorld();

    // Build Player Hero Model
    this.playerGroup = this.buildPlayerModel(player);
    this.scene.add(this.playerGroup);

    // Initial camera target sync
    this.cameraTarget.set(0, 1.2, 12);
    this.camera.position.set(0, 10, 24);
    this.camera.lookAt(this.cameraTarget);

    // Spawn Monsters in field
    this.spawnMonsters(monsters);

    // Resize listener
    window.addEventListener('resize', this.onWindowResize);

    // Click / Raycast for moving or attacking
    this.setupInteraction();

    // Start loop
    this.tick();
  }

  private setupLighting() {
    // Warm key light
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    keyLight.position.set(25, 40, 20);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 100;
      keyLight.shadow.camera.left = -40;
      keyLight.shadow.camera.right = 40;
      keyLight.shadow.camera.top = 40;
      keyLight.shadow.camera.bottom = -40;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // Cool hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x7ec0ee, 0x3d5c26, 0.7);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);
  }

  private buildWorld() {
    // 1. Terrain Ground: Multi-tier green landscape with paved cobblestone roads
    const groundGeo = new THREE.PlaneGeometry(160, 160, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x558537,
      roughness: 0.9,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = !this.isSoftwareGl;
    this.scene.add(ground);

    // 2. Prontera Grand Plaza Center Cobblestone Disc
    const plazaGeo = new THREE.CircleGeometry(22, 32);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0xc4b9a9,
      roughness: 0.8,
      metalness: 0.05,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02; // Avoid z-fighting
    plaza.receiveShadow = !this.isSoftwareGl;
    this.scene.add(plaza);

    // Cobblestone border rim
    const rimGeo = new THREE.RingGeometry(21.5, 22.8, 32);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xa89f91,
      roughness: 0.8,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.03;
    this.scene.add(rim);

    // South Field Path leading out of town
    const pathGeo = new THREE.PlaneGeometry(8, 60);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xd6cbb8,
      roughness: 0.9,
    });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.025, 45);
    path.receiveShadow = !this.isSoftwareGl;
    this.scene.add(path);

    // 3. Prontera Central Iconic Fountain (3-tier stone fountain)
    this.buildFountain();

    // 4. Prontera North Castle Gate & Archway
    this.buildCastleGate();

    // 5. Market Stalls & Vending Carts (Classic RO Prontera Street Vending)
    this.buildMarketStalls();

    // 6. Medieval Town Houses & Towers
    this.buildTownBuildings();

    // 7. Trees & Nature (Ragnarok stylized trees & flowers)
    this.buildFoliage();

    // 8. 3D Open World Gathering Nodes (Red/White Herbs, Iron/Elunium Ores, Cedar Wood)
    this.buildResourceNodes();
  }

  private buildResourceNodes() {
    // 3D Visual representation of gathering nodes in the fields
    const nodes = [
      { x: -16, z: 28, color: 0xef4444, type: 'herb', name: 'Red Herb Bush' },
      { x: 18, z: 34, color: 0xf8fafc, type: 'herb', name: 'White Herb Patch' },
      { x: -26, z: 45, color: 0x64748b, type: 'ore', name: 'Iron Ore Deposit' },
      { x: 28, z: 48, color: 0x38bdf8, type: 'ore', name: 'Elunium Crystal' },
      { x: 8, z: 62, color: 0x78350f, type: 'wood', name: 'Ancient Cedar' },
    ];

    nodes.forEach((n) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(n.x, 0, n.z);

      if (n.type === 'herb') {
        // Herb Bush: clustered green spheres with colored blossoms
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 });
        const flowerMat = new THREE.MeshStandardMaterial({ color: n.color, roughness: 0.3 });
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), bushMat);
        bush.position.y = 0.6;
        nodeGroup.add(bush);

        // Flower blooms
        const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), flowerMat);
        blossom.position.set(0, 1.2, 0);
        nodeGroup.add(blossom);
      } else if (n.type === 'ore') {
        // Crystal / Mineral cluster: jagged angled crystals
        const oreMat = new THREE.MeshStandardMaterial({
          color: n.color,
          roughness: 0.2,
          metalness: 0.85,
        });
        for (let i = 0; i < 3; i++) {
          const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 5), oreMat);
          crystal.position.set((i - 1) * 0.4, 0.7, (Math.random() - 0.5) * 0.3);
          crystal.rotation.z = (i - 1) * 0.25;
          nodeGroup.add(crystal);
        }
      } else {
        // Timber Grove
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5b3a29, roughness: 0.9 });
        const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.2, 8), woodMat);
        stump.position.y = 0.6;
        nodeGroup.add(stump);
      }

      // Soft ground ring indicator
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.5, 16),
        new THREE.MeshBasicMaterial({ color: n.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      nodeGroup.add(ring);

      this.scene.add(nodeGroup);
    });
  }

  private buildFountain() {
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0, 0, 0);

    // Base stone basin
    const baseGeo = new THREE.CylinderGeometry(5.2, 5.5, 0.9, 24);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9e988f, roughness: 0.6 });
    const baseBasin = new THREE.Mesh(baseGeo, stoneMat);
    baseBasin.position.y = 0.45;
    baseBasin.castShadow = !this.isSoftwareGl;
    baseBasin.receiveShadow = !this.isSoftwareGl;
    fountainGroup.add(baseBasin);

    // Water surface
    const waterGeo = new THREE.CylinderGeometry(4.7, 4.7, 0.1, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    this.fountainWater = new THREE.Mesh(waterGeo, waterMat);
    this.fountainWater.position.y = 0.8;
    fountainGroup.add(this.fountainWater);

    // Middle pillar
    const midPillarGeo = new THREE.CylinderGeometry(1.0, 1.4, 2.2, 16);
    const midPillar = new THREE.Mesh(midPillarGeo, stoneMat);
    midPillar.position.y = 1.6;
    fountainGroup.add(midPillar);

    // Second upper basin
    const upperBasinGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.6, 16);
    const upperBasin = new THREE.Mesh(upperBasinGeo, stoneMat);
    upperBasin.position.y = 2.6;
    fountainGroup.add(upperBasin);

    // Golden Angel Spire / Finial
    const spireGeo = new THREE.ConeGeometry(0.5, 1.8, 8);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const spire = new THREE.Mesh(spireGeo, goldMat);
    spire.position.y = 3.6;
    fountainGroup.add(spire);

    // Water spray particles
    const particleCount = 40;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 1.5;
      pPos[i * 3] = Math.cos(angle) * radius;
      pPos[i * 3 + 1] = 2.5 + Math.random() * 1.8;
      pPos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xdbeafe,
      size: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    this.waterParticles = new THREE.Points(pGeo, pMat);
    fountainGroup.add(this.waterParticles);

    this.scene.add(fountainGroup);
  }

  private buildCastleGate() {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, -28);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8b8579, roughness: 0.7 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.4 });

    // Left tower
    const towerGeo = new THREE.CylinderGeometry(2.8, 3.2, 12, 12);
    const leftTower = new THREE.Mesh(towerGeo, stoneMat);
    leftTower.position.set(-9, 6, 0);
    leftTower.castShadow = !this.isSoftwareGl;
    gateGroup.add(leftTower);

    // Left roof
    const roofGeo = new THREE.ConeGeometry(3.6, 4.5, 12);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
    const leftRoof = new THREE.Mesh(roofGeo, roofMat);
    leftRoof.position.set(-9, 14.25, 0);
    gateGroup.add(leftRoof);

    // Right tower & roof
    const rightTower = new THREE.Mesh(towerGeo, stoneMat);
    rightTower.position.set(9, 6, 0);
    rightTower.castShadow = !this.isSoftwareGl;
    gateGroup.add(rightTower);

    const rightRoof = new THREE.Mesh(roofGeo, roofMat);
    rightRoof.position.set(9, 14.25, 0);
    gateGroup.add(rightRoof);

    // Archway cross beam
    const archGeo = new THREE.BoxGeometry(14, 3, 3);
    const arch = new THREE.Mesh(archGeo, stoneMat);
    arch.position.set(0, 8.5, 0);
    arch.castShadow = !this.isSoftwareGl;
    gateGroup.add(arch);

    // Heavy wooden gate doors
    const doorGeo = new THREE.BoxGeometry(11, 7, 0.5);
    const doors = new THREE.Mesh(doorGeo, woodMat);
    doors.position.set(0, 3.5, 0);
    gateGroup.add(doors);

    // Royal heraldry banner
    const bannerGeo = new THREE.PlaneGeometry(3, 5);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 7.5, 1.6);
    gateGroup.add(banner);

    this.scene.add(gateGroup);
  }

  private buildMarketStalls() {
    const stallConfigs = [
      { x: -14, z: -8, rot: 0.4, color: 0xef4444, title: 'Blacksmith Forges' },
      { x: -15, z: 8, rot: -0.3, color: 0x3b82f6, title: "Alchemist's Potions" },
      { x: 14, z: -8, rot: -0.4, color: 0x10b981, title: 'Rare Headgears' },
      { x: 15, z: 8, rot: 0.3, color: 0xf59e0b, title: 'Card Trader' },
      { x: -8, z: 22, rot: 0.1, color: 0x8b5cf6, title: 'Kafra Services' },
      { x: 8, z: 22, rot: -0.1, color: 0xec4899, title: 'Pet & Mount Vendor' },
    ];

    stallConfigs.forEach((cfg) => {
      const stall = new THREE.Group();
      stall.position.set(cfg.x, 0, cfg.z);
      stall.rotation.y = cfg.rot;

      // Wooden table
      const tableGeo = new THREE.BoxGeometry(4.2, 1.2, 2.2);
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const table = new THREE.Mesh(tableGeo, woodMat);
      table.position.y = 0.6;
      table.castShadow = !this.isSoftwareGl;
      stall.add(table);

      // Awning fabric canopy
      const awningGeo = new THREE.ConeGeometry(2.8, 1.4, 4);
      const awningMat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.4 });
      const awning = new THREE.Mesh(awningGeo, awningMat);
      awning.position.set(0, 3.1, 0);
      awning.rotation.y = Math.PI / 4;
      awning.castShadow = !this.isSoftwareGl;
      stall.add(awning);

      // Support posts
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8);
      const p1 = new THREE.Mesh(postGeo, woodMat);
      p1.position.set(-1.8, 1.4, -0.9);
      const p2 = new THREE.Mesh(postGeo, woodMat);
      p2.position.set(1.8, 1.4, -0.9);
      stall.add(p1);
      stall.add(p2);

      // Sample merchandise goods on table (potion jars, crates)
      const bottleGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.4);
      const bottleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1 });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.set(-0.8, 1.4, 0.2);
      stall.add(bottle);

      const crateGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
      const crate = new THREE.Mesh(crateGeo, woodMat);
      crate.position.set(0.8, 1.45, -0.2);
      stall.add(crate);

      this.scene.add(stall);
    });
  }

  private buildTownBuildings() {
    const housePositions = [
      { x: -32, z: -16, sx: 12, sz: 10, sy: 7, roofColor: 0x991b1b },
      { x: 32, z: -16, sx: 12, sz: 10, sy: 7, roofColor: 0x1e3a8a },
      { x: -34, z: 16, sx: 10, sz: 12, sy: 6, roofColor: 0x9a3412 },
      { x: 34, z: 16, sx: 10, sz: 12, sy: 6, roofColor: 0x365314 },
    ];

    housePositions.forEach((h) => {
      const houseGroup = new THREE.Group();
      houseGroup.position.set(h.x, 0, h.z);

      // Walls
      const wallGeo = new THREE.BoxGeometry(h.sx, h.sy, h.sz);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1efe7, roughness: 0.9 });
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.y = h.sy / 2;
      wall.castShadow = !this.isSoftwareGl;
      wall.receiveShadow = !this.isSoftwareGl;
      houseGroup.add(wall);

      // Roof (triangular prism / pitched roof)
      const roofGeo = new THREE.ConeGeometry(Math.max(h.sx, h.sz) * 0.75, 4.5, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: h.roofColor, roughness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = h.sy + 2.25;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = !this.isSoftwareGl;
      houseGroup.add(roof);

      // Wooden door
      const doorGeo = new THREE.PlaneGeometry(2.2, 3.2);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 1.6, h.sz / 2 + 0.05);
      houseGroup.add(door);

      this.scene.add(houseGroup);
    });
  }

  private buildFoliage() {
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x5b3a29, roughness: 0.9 });
    const leafColors = [0x3f6212, 0x4d7c0f, 0x65a30d, 0x22c55e];

    const treePositions = [
      { x: -20, z: -26 },
      { x: 20, z: -26 },
      { x: -22, z: 28 },
      { x: 22, z: 28 },
      { x: -14, z: 42 },
      { x: 14, z: 42 },
      { x: -30, z: 48 },
      { x: 30, z: 48 },
      { x: 0, z: 65 },
    ];

    treePositions.forEach((tp, i) => {
      const tree = new THREE.Group();
      tree.position.set(tp.x, 0, tp.z);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 4.5, 8);
      const trunk = new THREE.Mesh(trunkGeo, treeMat);
      trunk.position.y = 2.25;
      trunk.castShadow = !this.isSoftwareGl;
      tree.add(trunk);

      // 3-tier composite leafy canopies
      const leafColor = leafColors[i % leafColors.length];
      const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.7 });

      const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 0), leafMat);
      canopy1.position.y = 4.8;
      canopy1.castShadow = !this.isSoftwareGl;
      tree.add(canopy1);

      const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), leafMat);
      canopy2.position.set(0.6, 5.8, 0.4);
      canopy2.castShadow = !this.isSoftwareGl;
      tree.add(canopy2);

      const canopy3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), leafMat);
      canopy3.position.set(-0.5, 6.4, -0.3);
      canopy3.castShadow = !this.isSoftwareGl;
      tree.add(canopy3);

      this.scene.add(tree);
    });

    // Wind flowers on fields
    const flowerGeo = new THREE.CircleGeometry(0.2, 6);
    const flowerMats = [
      new THREE.MeshBasicMaterial({ color: 0xf43f5e }),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    ];
    for (let f = 0; f < 30; f++) {
      const fx = (Math.random() - 0.5) * 60;
      const fz = 25 + Math.random() * 45;
      const fMesh = new THREE.Mesh(flowerGeo, flowerMats[f % flowerMats.length]);
      fMesh.rotation.x = -Math.PI / 2;
      fMesh.position.set(fx, 0.04, fz);
      this.scene.add(fMesh);
    }
  }

  // Composite 3-12 Part Hero Player Model
  private buildPlayerModel(player: PlayerProfile): THREE.Group {
    const hero = new THREE.Group();
    hero.position.set(0, 0, 12); // Spawn on plaza in front of fountain
    hero.scale.set(1.25, 1.25, 1.25);

    // Contact Shadow Disc
    const shadowGeo = new THREE.CircleGeometry(0.7, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02;
    hero.add(contactShadow);

    // Torso (Job Tunic / Armor)
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
    const torsoColor =
      player.job === 'Swordsman' || player.job === 'Knight' ? 0x2563eb :
      player.job === 'Mage' || player.job === 'Wizard' ? 0x7c3aed :
      player.job === 'Archer' || player.job === 'Hunter' ? 0x16a34a :
      player.job === 'Thief' || player.job === 'Assassin' ? 0x334155 : 0xd97706;

    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.4 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.35;
    torso.castShadow = !this.isSoftwareGl;
    hero.add(torso);

    // Belt & Buckle
    const beltGeo = new THREE.BoxGeometry(0.85, 0.15, 0.55);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 0.85;
    hero.add(belt);

    // Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 2.2, 0);

    const headGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfba, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, skinMat);
    this.headGroup.add(head);

    // Hair (Spiky anime hair)
    const hairGeo = new THREE.ConeGeometry(0.48, 0.6, 8);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.28, -0.05);
    this.headGroup.add(hair);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 0.02, 0.41);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 0.02, 0.41);
    this.headGroup.add(leftEye);
    this.headGroup.add(rightEye);

    // Equipped Headgear (e.g. Cat Ear Beret / Poring Hat)
    const hatGroup = new THREE.Group();
    const beretGeo = new THREE.CylinderGeometry(0.5, 0.45, 0.2, 16);
    const beretMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 });
    const beret = new THREE.Mesh(beretGeo, beretMat);
    beret.position.set(0, 0.45, 0);
    hatGroup.add(beret);

    // Cute Ears
    const earGeo = new THREE.ConeGeometry(0.15, 0.3, 4);
    const ear1 = new THREE.Mesh(earGeo, beretMat);
    ear1.position.set(-0.35, 0.65, 0);
    ear1.rotation.z = 0.2;
    const ear2 = new THREE.Mesh(earGeo, beretMat);
    ear2.position.set(0.35, 0.65, 0);
    ear2.rotation.z = -0.2;
    hatGroup.add(ear1);
    hatGroup.add(ear2);
    this.headGroup.add(hatGroup);

    hero.add(this.headGroup);

    // Legs (Pivot at top)
    const legGeo = new THREE.BoxGeometry(0.28, 0.75, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.24, 0.45, 0);
    this.leftLeg.castShadow = !this.isSoftwareGl;
    hero.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.24, 0.45, 0);
    this.rightLeg.castShadow = !this.isSoftwareGl;
    hero.add(this.rightLeg);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.24, 0.7, 0.24);
    const armMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.5 });

    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.55, 1.3, 0);
    hero.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm.position.set(0.55, 1.3, 0);
    hero.add(this.rightArm);

    // Weapon in hand
    const bladeGeo = new THREE.BoxGeometry(0.12, 1.3, 0.05);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.1,
    });
    this.weaponMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.weaponMesh.position.set(0.65, 1.1, 0.4);
    this.weaponMesh.rotation.x = Math.PI / 3;
    hero.add(this.weaponMesh);

    return hero;
  }

  // Spawn Monsters in field
  public spawnMonsters(monsters: Monster[]) {
    // Clear old
    this.monsterMeshes.forEach((item) => {
      this.scene.remove(item.group);
    });
    this.monsterMeshes.clear();

    const spawnPositions = [
      { x: -5, z: 32 },  // Poring
      { x: 6, z: 36 },   // Fabre
      { x: -12, z: 42 }, // Lunatic
      { x: 10, z: 46 },  // Chonchon
      { x: 0, z: 58 },   // Baphomet MVP / GTB
    ];

    monsters.forEach((monster, idx) => {
      const pos = spawnPositions[idx % spawnPositions.length];
      const mGroup = this.createMonsterMesh(monster);
      mGroup.position.set(pos.x, 0, pos.z);
      this.scene.add(mGroup);
      this.monsterMeshes.set(monster.id, {
        group: mGroup,
        monster,
        initialY: 0,
        bobOffset: idx * 1.2,
      });
    });
  }

  // Create composite 3D monster models
  private createMonsterMesh(monster: Monster): THREE.Group {
    const group = new THREE.Group();

    // Shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.8 * monster.scale, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    if (monster.id === 'poring') {
      // Classic RO Poring: Cute squishy pink sphere with shiny gloss
      const poringGeo = new THREE.SphereGeometry(0.8 * monster.scale, 20, 20);
      const poringMat = new THREE.MeshStandardMaterial({
        color: 0xff7096,
        roughness: 0.15,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(poringGeo, poringMat);
      body.position.y = 0.75 * monster.scale;
      body.scale.set(1.1, 0.9, 1.1);
      body.castShadow = !this.isSoftwareGl;
      group.add(body);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.12 * monster.scale, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      const le = new THREE.Mesh(eyeGeo, eyeMat);
      le.position.set(-0.25 * monster.scale, 0.85 * monster.scale, 0.72 * monster.scale);
      const re = new THREE.Mesh(eyeGeo, eyeMat);
      re.position.set(0.25 * monster.scale, 0.85 * monster.scale, 0.72 * monster.scale);
      group.add(le);
      group.add(re);

      // Eye catchlight sparkles
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sparkGeo = new THREE.SphereGeometry(0.04 * monster.scale, 4, 4);
      const s1 = new THREE.Mesh(sparkGeo, sparkMat);
      s1.position.set(-0.22 * monster.scale, 0.88 * monster.scale, 0.82 * monster.scale);
      const s2 = new THREE.Mesh(sparkGeo, sparkMat);
      s2.position.set(0.28 * monster.scale, 0.88 * monster.scale, 0.82 * monster.scale);
      group.add(s1);
      group.add(s2);
    } else if (monster.id === 'baphomet') {
      // Epic Baphomet MVP: Imposing ram-horned goat lord of darkness
      const matDark = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.6 });
      const matHorn = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.5, roughness: 0.3 });
      const matEye = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      // Torso & Legs
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.0), matDark);
      torso.position.y = 2.4;
      torso.castShadow = !this.isSoftwareGl;
      group.add(torso);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), matDark);
      head.position.set(0, 3.8, 0.2);
      group.add(head);

      // Giant curved horns (Torus)
      const hornLeft = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.18, 8, 16, Math.PI), matHorn);
      hornLeft.position.set(-0.7, 4.3, 0);
      hornLeft.rotation.set(0, Math.PI / 4, Math.PI / 3);
      group.add(hornLeft);

      const hornRight = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.18, 8, 16, Math.PI), matHorn);
      hornRight.position.set(0.7, 4.3, 0);
      hornRight.rotation.set(0, -Math.PI / 4, -Math.PI / 3);
      group.add(hornRight);

      // Glowing Eyes
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), matEye);
      eyeL.position.set(-0.25, 3.9, 0.7);
      const eyeR = new THREE.Mesh(eyeL.geometry, matEye);
      eyeR.position.set(0.25, 3.9, 0.7);
      group.add(eyeL);
      group.add(eyeR);

      // Giant Scythe
      const scytheHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8), matDark);
      scytheHandle.position.set(1.4, 2.6, 0.4);
      scytheHandle.rotation.z = -0.3;
      group.add(scytheHandle);

      const scytheBlade = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.6, 8, 1, 0, Math.PI * 0.7),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1, side: THREE.DoubleSide })
      );
      scytheBlade.position.set(1.8, 4.8, 0.4);
      scytheBlade.rotation.set(0, Math.PI / 2, 0);
      group.add(scytheBlade);
    } else {
      // General monster (Fabre, Lunatic, Chonchon)
      const mMat = new THREE.MeshStandardMaterial({ color: monster.color, roughness: 0.4 });
      const mBody = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * monster.scale, 1), mMat);
      mBody.position.y = 0.7 * monster.scale;
      mBody.castShadow = !this.isSoftwareGl;
      group.add(mBody);

      // Eyes
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12 * monster.scale, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      eye.position.set(-0.25 * monster.scale, 0.8 * monster.scale, 0.6 * monster.scale);
      group.add(eye);
      const eye2 = eye.clone();
      eye2.position.x = 0.25 * monster.scale;
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

      // Check click on monsters
      const monsterTargets: THREE.Object3D[] = [];
      this.monsterMeshes.forEach((item) => monsterTargets.push(item.group));

      const intersects = raycaster.intersectObjects(monsterTargets, true);
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

      // Check click on ground to walk toward target
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const groundHit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, groundHit)) {
        const dir = groundHit.clone().sub(this.playerGroup.position);
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

  // Animation and Simulation Loop
  private tick = () => {
    if (this.isDisposed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05); // Clamped frame delta
    this.lastTime = now;

    // FPS Meter
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
          memoryUsageMb: Math.round((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ? (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576 : 58),
          tier: this.isSoftwareGl ? 'Low' : this.currentFps > 50 ? 'Ultra' : 'High',
        });
      }
    }

    // 1. Update Player Movement
    const speed = 7.5;
    const moveX = this.moveIntent.x;
    const moveZ = this.moveIntent.z;
    const intentLen = Math.sqrt(moveX * moveX + moveZ * moveZ);

    if (intentLen > 0.1) {
      this.isMoving = true;
      const normX = moveX / intentLen;
      const normZ = moveZ / intentLen;
      this.playerPos.x += normX * speed * dt;
      this.playerPos.z += normZ * speed * dt;

      // Bound to world perimeter
      this.playerPos.x = Math.max(-55, Math.min(55, this.playerPos.x));
      this.playerPos.z = Math.max(-25, Math.min(75, this.playerPos.z));

      this.targetPlayerRotation = Math.atan2(normX, normZ);
      this.playerAnimTime += dt * 10;
    } else {
      this.isMoving = false;
    }

    // Exponential damping for rotation
    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.y += (this.targetPlayerRotation - this.playerGroup.rotation.y) * Math.min(1, dt * 12);

    // Limb walking animation
    if (this.isMoving) {
      const swing = Math.sin(this.playerAnimTime);
      this.leftLeg.rotation.x = swing * 0.7;
      this.rightLeg.rotation.x = -swing * 0.7;
      this.leftArm.rotation.x = -swing * 0.6;
      this.rightArm.rotation.x = swing * 0.6;
      this.headGroup.position.y = 2.2 + Math.abs(Math.sin(this.playerAnimTime * 2)) * 0.08;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      // Idle breathing
      this.headGroup.position.y = 2.2 + Math.sin(now * 0.003) * 0.03;
    }

    // 2. Camera Follow with Exponential Damping
    const targetCamX = this.playerPos.x;
    const targetCamY = this.playerPos.y + 10;
    const targetCamZ = this.playerPos.z + 14;

    const camDamp = 1 - Math.exp(-6 * dt);
    this.camera.position.x += (targetCamX - this.camera.position.x) * camDamp;
    this.camera.position.y += (targetCamY - this.camera.position.y) * camDamp;
    this.camera.position.z += (targetCamZ - this.camera.position.z) * camDamp;

    this.cameraTarget.copy(this.playerPos);
    this.cameraTarget.y += 1.2;
    this.camera.lookAt(this.cameraTarget);

    // 3. Animate Monsters (Poring bounce & idle bobs)
    this.monsterMeshes.forEach((item) => {
      const time = now * 0.004 + item.bobOffset;
      if (item.monster.id === 'poring') {
        const bounce = Math.abs(Math.sin(time * 3));
        item.group.position.y = bounce * 0.6;
        item.group.scale.y = 1.0 - bounce * 0.2;
        item.group.scale.x = 1.0 + bounce * 0.1;
      } else {
        item.group.position.y = Math.sin(time) * 0.15;
      }
    });

    // 4. Animate Fountain Water
    if (this.fountainWater) {
      this.fountainWater.rotation.y += dt * 0.4;
    }
    if (this.waterParticles) {
      this.waterParticles.rotation.y += dt * 0.2;
    }

    // Render Scene
    this.renderer.render(this.scene, this.camera);

    // Software WebGL pacing or rAF
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
