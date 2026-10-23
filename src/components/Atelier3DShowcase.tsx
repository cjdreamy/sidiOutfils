import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { ChevronDown, ChevronUp, RotateCcw, ShoppingBag, Sparkles, Layers, Eye } from 'lucide-react';
import { CatalogProduct, Featured3DModelType } from '../data/defaultCatalog';

// Pre-allocated module-scope math helpers (Zero GC in render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _partTargetPos = new THREE.Vector3();

type FinishPresetId = 'royal_plum' | 'mulberry_velvet' | 'aubergine_noir' | 'lavender_silk';
type HardwarePresetId = 'brushed_gold' | 'rose_brass' | 'platinum';
type CameraPresetId = 'front' | 'macro' | 'profile' | 'top';

interface FinishPreset {
  id: FinishPresetId;
  label: string;
  hex: string;
  secondaryHex: string;
  roughness: number;
  sheen: number;
}

interface HardwarePreset {
  id: HardwarePresetId;
  label: string;
  hex: string;
  roughness: number;
  metalness: number;
}

const FINISH_PRESETS: FinishPreset[] = [
  {
    id: 'royal_plum',
    label: 'Royal Plum Calfskin',
    hex: '#4A154B',
    secondaryHex: '#330C35',
    roughness: 0.42,
    sheen: 0.35,
  },
  {
    id: 'mulberry_velvet',
    label: 'Mulberry Silk-Velvet',
    hex: '#651A6E',
    secondaryHex: '#430E4B',
    roughness: 0.68,
    sheen: 0.92,
  },
  {
    id: 'aubergine_noir',
    label: 'Aubergine Croc-Embossed',
    hex: '#280A2C',
    secondaryHex: '#18051A',
    roughness: 0.24,
    sheen: 0.2,
  },
  {
    id: 'lavender_silk',
    label: 'Imperial Lavender Satin',
    hex: '#844C8E',
    secondaryHex: '#5B2B63',
    roughness: 0.34,
    sheen: 0.75,
  },
];

const HARDWARE_PRESETS: HardwarePreset[] = [
  { id: 'brushed_gold', label: 'Brushed 24k Gold', hex: '#D4AF37', roughness: 0.18, metalness: 0.94 },
  { id: 'rose_brass', label: 'Artisanal Rose Brass', hex: '#D99B78', roughness: 0.22, metalness: 0.92 },
  { id: 'platinum', label: 'Palladium Silver', hex: '#D8DCE3', roughness: 0.15, metalness: 0.96 },
];

const CAMERA_PRESETS: Record<CameraPresetId, { pos: [number, number, number]; look: [number, number, number]; label: string }> = {
  front: { pos: [0, 1.35, 3.85], look: [0, 0.85, 0], label: 'Studio Front' },
  macro: { pos: [0.65, 1.15, 2.05], look: [0, 0.92, 0.2], label: 'Hardware Macro' },
  profile: { pos: [3.45, 1.3, 1.4], look: [0, 0.85, 0], label: 'Side Profile' },
  top: { pos: [0, 3.6, 1.65], look: [0, 0.75, 0], label: 'Top Plinth' },
};

interface ExplodablePart {
  mesh: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
}

interface Atelier3DShowcaseProps {
  activeModel: Featured3DModelType;
  onSelectModel: (model: Featured3DModelType) => void;
  products: CatalogProduct[];
  onAddToCart: (product: CatalogProduct) => void;
  fullScreenMode?: boolean;
}

export const Atelier3DShowcase: React.FC<Atelier3DShowcaseProps> = ({
  activeModel,
  onSelectModel,
  products,
  onAddToCart,
  fullScreenMode = false,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [selectedFinish, setSelectedFinish] = useState<FinishPresetId>('royal_plum');
  const [selectedHardware, setSelectedHardware] = useState<HardwarePresetId>('brushed_gold');
  const [selectedCamera, setSelectedCamera] = useState<CameraPresetId>('front');
  const [explodeFactor, setExplodeFactor] = useState<number>(0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [webglReady, setWebglReady] = useState<boolean>(true);

  const currentModelType: Exclude<Featured3DModelType, 'none'> =
    activeModel === 'none' ? 'handbag' : activeModel;

  // Store mutable refs for the 60fps animation loop without tearing down canvas
  const stateRef = useRef({
    modelType: currentModelType,
    finishId: selectedFinish,
    hardwareId: selectedHardware,
    cameraId: selectedCamera,
    explode: explodeFactor,
    autoRotate: autoRotate,
    cameraTransitioning: false,
  });

  useEffect(() => {
    stateRef.current.modelType = currentModelType;
  }, [currentModelType]);

  useEffect(() => {
    stateRef.current.finishId = selectedFinish;
  }, [selectedFinish]);

  useEffect(() => {
    stateRef.current.hardwareId = selectedHardware;
  }, [selectedHardware]);

  useEffect(() => {
    stateRef.current.cameraId = selectedCamera;
    stateRef.current.cameraTransitioning = true;
  }, [selectedCamera]);

  useEffect(() => {
    stateRef.current.explode = explodeFactor;
  }, [explodeFactor]);

  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  const matchingProduct =
    products.find((p) => p.featured3dModel === currentModelType) || products[0];

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglReady(false);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 560;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // WebGL context loss safety listeners
    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    // 2. Scene, Horizon Fog & Studio RoomEnvironment
    const scene = new THREE.Scene();
    const horizonHex = 0x1a0d22;
    scene.background = new THREE.Color(horizonHex);
    scene.fog = new THREE.FogExp2(horizonHex, 0.065);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Perspective Camera & Damped OrbitControls
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
    camera.position.set(0, 1.35, 3.85);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.85, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 1.6;
    controls.maxDistance = 6.5;

    controls.addEventListener('start', () => {
      stateRef.current.cameraTransitioning = false;
      stateRef.current.autoRotate = false;
      setAutoRotate(false);
    });

    // 4. Procedural Textures (Leather Pebble Grain, Travertine Stone, Contact Shadow)
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const createLeatherBumpTexture = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3200; i++) {
        const x = (i * 73) % 256;
        const y = (i * 137) % 256;
        const shade = 110 + ((i * 29) % 40);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      tex.anisotropy = maxAniso;
      return tex;
    };

    const createTravertineTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#EDE4DC';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = '#DFD2C7';
      ctx.lineWidth = 2;
      for (let y = 0; y < 512; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(170, y + ((y * 7) % 9) - 4, 340, y - ((y * 5) % 9) + 4, 512, y);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = maxAniso;
      return tex;
    };

    const createRadialShadowTexture = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
      grad.addColorStop(0, 'rgba(10, 4, 15, 0.72)');
      grad.addColorStop(0.55, 'rgba(10, 4, 15, 0.25)');
      grad.addColorStop(1, 'rgba(10, 4, 15, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const leatherBumpTex = createLeatherBumpTexture();
    const travertineTex = createTravertineTexture();
    const contactShadowTex = createRadialShadowTexture();

    // 5. Shared PBR Materials
    const primaryLeatherMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#4A154B'),
      roughness: 0.42,
      metalness: 0.05,
      bumpMap: leatherBumpTex,
      bumpScale: 0.008,
      sheen: 0.35,
      sheenColor: new THREE.Color('#9A4EAE'),
      sheenRoughness: 0.5,
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
    });

    const secondaryTrimMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#330C35'),
      roughness: 0.68,
      metalness: 0.04,
      bumpMap: leatherBumpTex,
      bumpScale: 0.005,
      sheen: 0.55,
      sheenColor: new THREE.Color('#70297A'),
    });

    const hardwareMetalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#D4AF37'),
      roughness: 0.18,
      metalness: 0.94,
      anisotropy: 0.75,
      clearcoat: 0.3,
    });

    const darkSuedeLiningMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1E0921'),
      roughness: 0.88,
      metalness: 0.02,
    });

    const plinthMat = new THREE.MeshStandardMaterial({
      map: travertineTex,
      roughness: 0.65,
      metalness: 0.05,
    });

    // 6. Studio 3-Point Lighting Rig + Area Softboxes
    const hemiLight = new THREE.HemisphereLight(0xf6e8ff, 0x261230, 0.85);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
    keyLight.position.set(3.5, 5.5, 4.0);
    keyLight.castShadow = !isSoftwareGl;
    const d = 3.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd99bff, 1.45);
    rimLight.position.set(-3.5, 3.8, -3.5);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxLeft = new THREE.RectAreaLight(0xfff0dd, 3.2, 2.2, 3.2);
      softboxLeft.position.set(-2.8, 2.4, 2.2);
      softboxLeft.lookAt(0, 0.9, 0);
      scene.add(softboxLeft);

      const softboxRight = new THREE.RectAreaLight(0xe5c4ff, 2.4, 2.0, 2.8);
      softboxRight.position.set(2.8, 2.2, -1.8);
      softboxRight.lookAt(0, 0.9, 0);
      scene.add(softboxRight);
    }

    // 7. Architectural Studio Plinth & Grounding Contact Shadow
    const studioGroup = new THREE.Group();
    scene.add(studioGroup);

    const floorGeo = new THREE.CylinderGeometry(7, 7, 0.08, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x160b1d,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.34;
    floorMesh.receiveShadow = true;
    studioGroup.add(floorMesh);

    // Stepped Travertine Pedestal (3 parts: base ring, fluted drum, brass inlay trim)
    const plinthDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 0.3, 48), plinthMat);
    plinthDrum.position.y = -0.15;
    plinthDrum.receiveShadow = true;
    plinthDrum.castShadow = true;
    studioGroup.add(plinthDrum);

    const plinthBrassRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.19, 0.014, 16, 64),
      hardwareMetalMat
    );
    plinthBrassRing.rotation.x = Math.PI / 2;
    plinthBrassRing.position.y = -0.01;
    studioGroup.add(plinthBrassRing);

    // Contact shadow plane directly on top of the plinth (Y = 0.005 to prevent Z-fighting)
    const contactShadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, 1.85),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.y = 0.005;
    studioGroup.add(contactShadowPlane);

    // Subtle InstancedMesh Boutique Brass Studs around the gallery perimeter (24 instances)
    const perimeterStudGeo = new THREE.CylinderGeometry(0.025, 0.032, 0.08, 12);
    const perimeterStuds = new THREE.InstancedMesh(perimeterStudGeo, hardwareMetalMat, 24);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * 2.2, -0.26, Math.sin(angle) * 2.2);
      dummy.scale.setScalar(0.9 + (i % 3) * 0.1);
      dummy.updateMatrix();
      perimeterStuds.setMatrixAt(i, dummy.matrix);
    }
    perimeterStuds.instanceMatrix.needsUpdate = true;
    perimeterStuds.computeBoundingSphere();
    studioGroup.add(perimeterStuds);

    // 8. Build Composite 8–10 Part Procedural Fashion Models
    const subjectRoot = new THREE.Group();
    scene.add(subjectRoot);

    const modelGroups: Record<Exclude<Featured3DModelType, 'none'>, THREE.Group> = {
      handbag: new THREE.Group(),
      dress: new THREE.Group(),
      keychain: new THREE.Group(),
      outfit: new THREE.Group(),
    };
    const explodableMap: Record<Exclude<Featured3DModelType, 'none'>, ExplodablePart[]> = {
      handbag: [],
      dress: [],
      keychain: [],
      outfit: [],
    };

    const registerPart = (
      type: Exclude<Featured3DModelType, 'none'>,
      mesh: THREE.Object3D,
      basePos: [number, number, number],
      explodeOffset: [number, number, number]
    ) => {
      mesh.position.set(basePos[0], basePos[1], basePos[2]);
      mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      modelGroups[type].add(mesh);
      explodableMap[type].push({
        mesh,
        basePos: new THREE.Vector3(...basePos),
        explodeOffset: new THREE.Vector3(...explodeOffset),
      });
    };

    // --- MODEL A: THE SIDI SOVEREIGN HANDBAG (10 distinct parts) ---
    {
      // Part 1: Main trapezoid calfskin body via ExtrudeGeometry with bevels
      const bodyShape = new THREE.Shape();
      bodyShape.moveTo(-0.68, 0);
      bodyShape.lineTo(0.68, 0);
      bodyShape.lineTo(0.58, 1.05);
      bodyShape.lineTo(-0.58, 1.05);
      bodyShape.closePath();
      const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
        depth: 0.42,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 4,
      });
      bodyGeo.translate(0, 0, -0.21);
      const bagBody = new THREE.Mesh(bodyGeo, primaryLeatherMat);
      registerPart('handbag', bagBody, [0, 0.06, 0], [0, 0, 0]);

      // Part 2: Suede interior compartment block
      const liningMesh = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.96, 0.34), darkSuedeLiningMat);
      registerPart('handbag', liningMesh, [0, 0.56, 0], [0, 0.28, 0]);

      // Part 3: Left & Right Pleated Accordion Side Gussets
      const gussetGroup = new THREE.Group();
      const leftGusset = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.38), secondaryTrimMat);
      leftGusset.position.set(-0.62, 0.54, 0);
      const rightGusset = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.38), secondaryTrimMat);
      rightGusset.position.set(0.62, 0.54, 0);
      gussetGroup.add(leftGusset, rightGusset);
      registerPart('handbag', gussetGroup, [0, 0, 0], [0, 0, -0.28]);

      // Part 4: Sculpted Front Over-Flap via ExtrudeGeometry
      const flapShape = new THREE.Shape();
      flapShape.moveTo(-0.6, 0.35);
      flapShape.lineTo(0.6, 0.35);
      flapShape.lineTo(0.52, -0.18);
      flapShape.quadraticCurveTo(0, -0.28, -0.52, -0.18);
      flapShape.closePath();
      const flapGeo = new THREE.ExtrudeGeometry(flapShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.025,
        bevelSegments: 3,
      });
      const flapMesh = new THREE.Mesh(flapGeo, secondaryTrimMat);
      registerPart('handbag', flapMesh, [0, 0.78, 0.21], [0, 0.26, 0.35]);

      // Part 5: Arched Tubular Top Handle via TubeGeometry
      const handleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.34, 1.12, 0),
        new THREE.Vector3(-0.3, 1.48, 0),
        new THREE.Vector3(0, 1.62, 0),
        new THREE.Vector3(0.3, 1.48, 0),
        new THREE.Vector3(0.34, 1.12, 0),
      ]);
      const handleMesh = new THREE.Mesh(
        new THREE.TubeGeometry(handleCurve, 40, 0.045, 16, false),
        primaryLeatherMat
      );
      registerPart('handbag', handleMesh, [0, 0, 0], [0, 0.48, 0]);

      // Part 6: Twin Brushed Brass Handle Mount Pedestals & D-Rings
      const mountsGroup = new THREE.Group();
      [-0.34, 0.34].forEach((xPos) => {
        const baseMount = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.065, 0.07, 20),
          hardwareMetalMat
        );
        baseMount.position.set(xPos, 1.14, 0);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 12, 24), hardwareMetalMat);
        ring.position.set(xPos, 1.18, 0);
        mountsGroup.add(baseMount, ring);
      });
      registerPart('handbag', mountsGroup, [0, 0, 0], [0, 0.32, 0]);

      // Part 7: Signature Sidi Brushed Gold Turn-Lock Escutcheon Plate
      const plateGeo = new THREE.BoxGeometry(0.24, 0.28, 0.045);
      const lockPlate = new THREE.Mesh(plateGeo, hardwareMetalMat);
      registerPart('handbag', lockPlate, [0, 0.56, 0.27], [0, 0, 0.55]);

      // Part 8: Rotary Turn-Lock Twist Clasp & Side Studs
      const twistClaspGroup = new THREE.Group();
      const spindle = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.028, 0.07, 8, 16),
        hardwareMetalMat
      );
      spindle.rotation.z = Math.PI / 4;
      twistClaspGroup.add(spindle);
      registerPart('handbag', twistClaspGroup, [0, 0.56, 0.31], [0, 0, 0.72]);

      // Part 9: 4 Brushed Brass Bottom Protective Feet
      const feetGroup = new THREE.Group();
      [
        [-0.48, -0.14],
        [0.48, -0.14],
        [-0.48, 0.14],
        [0.48, 0.14],
      ].forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.03, 0.06, 16),
          hardwareMetalMat
        );
        foot.position.set(fx, 0.03, fz);
        feetGroup.add(foot);
      });
      registerPart('handbag', feetGroup, [0, 0, 0], [0, -0.18, 0]);

      // Part 10: Detachable Leather Clochette & Gold Medallion Charm
      const charmGroup = new THREE.Group();
      const strapCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.34, 1.14, 0.04),
        new THREE.Vector3(0.45, 0.94, 0.24),
        new THREE.Vector3(0.42, 0.72, 0.28),
      ]);
      const strapMesh = new THREE.Mesh(
        new THREE.TubeGeometry(strapCurve, 20, 0.014, 8, false),
        secondaryTrimMat
      );
      const medallion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.022, 24),
        hardwareMetalMat
      );
      medallion.rotation.x = Math.PI / 2;
      medallion.position.set(0.42, 0.66, 0.29);
      charmGroup.add(strapMesh, medallion);
      registerPart('handbag', charmGroup, [0, 0, 0], [0.35, 0.12, 0.35]);
    }

    // --- MODEL B: THE MULBERRY SILK-VELVET COUTURE GOWN ON ATELIER BUST (8 distinct parts) ---
    {
      // Part 1: Heavy Brass & Travertine Mannequin Base Stand
      const standBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.38, 0.12, 32),
        hardwareMetalMat
      );
      registerPart('dress', standBase, [0, 0.06, 0], [0, -0.15, 0]);

      // Part 2: Polished Brass Center Pillar
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 1.55, 20),
        hardwareMetalMat
      );
      registerPart('dress', pillar, [0, 0.82, 0], [0, 0, 0]);

      // Part 3: Sculpted Couture Bodice via LatheGeometry
      const bodicePoints = [
        new THREE.Vector2(0.01, 0),
        new THREE.Vector2(0.22, 0.02),
        new THREE.Vector2(0.19, 0.22),
        new THREE.Vector2(0.29, 0.48),
        new THREE.Vector2(0.24, 0.68),
        new THREE.Vector2(0.12, 0.74),
      ];
      const bodiceGeo = new THREE.LatheGeometry(bodicePoints, 36);
      const bodiceMesh = new THREE.Mesh(bodiceGeo, primaryLeatherMat);
      bodiceMesh.scale.set(1.12, 1, 0.82);
      registerPart('dress', bodiceMesh, [0, 0.92, 0], [0, 0.25, 0]);

      // Part 4: Flared Architectural Pleated Midi Skirt via custom fluted Lathe/Buffer modulation
      const skirtGeo = new THREE.CylinderGeometry(0.21, 0.64, 0.88, 64, 24, false);
      const posAttr = skirtGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const vz = posAttr.getZ(i);
        const angle = Math.atan2(vz, vx);
        const lowerFactor = (0.44 - vy) / 0.88;
        const pleatWave = Math.sin(angle * 14) * 0.045 * Math.max(0, lowerFactor);
        const r = Math.sqrt(vx * vx + vz * vz) + pleatWave;
        posAttr.setX(i, Math.cos(angle) * r);
        posAttr.setZ(i, Math.sin(angle) * r);
      }
      skirtGeo.computeVertexNormals();
      const skirtMesh = new THREE.Mesh(skirtGeo, primaryLeatherMat);
      skirtMesh.scale.set(1.06, 1, 0.88);
      registerPart('dress', skirtMesh, [0, 0.52, 0], [0, -0.22, 0]);

      // Part 5: Draped Peplum Shoulder Shawl Collar
      const collarMesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.065, 16, 40),
        secondaryTrimMat
      );
      collarMesh.rotation.x = Math.PI / 2 + 0.18;
      collarMesh.scale.set(1.18, 0.88, 1);
      registerPart('dress', collarMesh, [0, 1.52, 0.02], [0, 0.42, 0.15]);

      // Part 6: Cinched Waist Satin Sash Belt
      const beltMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.225, 0.225, 0.09, 36),
        secondaryTrimMat
      );
      beltMesh.scale.set(1.12, 1, 0.84);
      registerPart('dress', beltMesh, [0, 0.96, 0], [0, 0.05, 0.28]);

      // Part 7: Brushed Gold Geometric Waist Buckle
      const buckleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), hardwareMetalMat);
      registerPart('dress', buckleMesh, [0, 0.96, 0.2], [0, 0.05, 0.52]);

      // Part 8: Turned Brass Atelier Neck Finial
      const finialGroup = new THREE.Group();
      const neckCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.08, 24),
        darkSuedeLiningMat
      );
      const finialSphere = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 24), hardwareMetalMat);
      finialSphere.position.y = 0.09;
      finialGroup.add(neckCap, finialSphere);
      registerPart('dress', finialGroup, [0, 1.69, 0], [0, 0.58, 0]);
    }

    // --- MODEL C: ARTISANAL BRAIDED LEATHER & BRASS KEYCHAIN (8 distinct parts) ---
    {
      // Part 1: Display Arch Stand on Plinth
      const standCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.45, 0.02, -0.2),
        new THREE.Vector3(-0.45, 1.68, -0.1),
        new THREE.Vector3(0, 1.72, 0),
      ]);
      const displayStand = new THREE.Mesh(
        new THREE.TubeGeometry(standCurve, 32, 0.025, 12, false),
        darkSuedeLiningMat
      );
      registerPart('keychain', displayStand, [0, 0, 0], [-0.35, 0, -0.25]);

      // Part 2: Heavy Turned Brass Split Key Ring
      const splitRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.26, 0.042, 20, 48),
        hardwareMetalMat
      );
      registerPart('keychain', splitRing, [0, 1.42, 0], [0, 0.42, 0]);

      // Part 3: Swivel Connector Barrel via LatheGeometry
      const swivelMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.055, 0.1, 12, 24),
        hardwareMetalMat
      );
      registerPart('keychain', swivelMesh, [0, 1.09, 0], [0, 0.22, 0]);

      // Part 4: Braided Imperial Plum Leather Loop Strap via TorusKnot/Tube
      const braidedLoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.055, 16, 40),
        primaryLeatherMat
      );
      braidedLoop.scale.set(0.68, 1.45, 0.55);
      registerPart('keychain', braidedLoop, [0, 0.72, 0], [-0.28, 0, 0]);

      // Part 5: Embossed Calfskin Monogram Fob Tag
      const fobShape = new THREE.Shape();
      fobShape.moveTo(-0.22, -0.34);
      fobShape.lineTo(0.22, -0.34);
      fobShape.lineTo(0.26, 0.28);
      fobShape.quadraticCurveTo(0, 0.38, -0.26, 0.28);
      fobShape.closePath();
      const fobGeo = new THREE.ExtrudeGeometry(fobShape, {
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3,
      });
      fobGeo.translate(0, 0, -0.025);
      const fobMesh = new THREE.Mesh(fobGeo, secondaryTrimMat);
      fobMesh.rotation.z = -0.14;
      registerPart('keychain', fobMesh, [0.16, 0.62, 0.08], [0.28, -0.1, 0.28]);

      // Part 6: Solid Gold Sidi Crest Medallion Coin
      const coinMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.035, 32),
        hardwareMetalMat
      );
      coinMesh.rotation.x = Math.PI / 2;
      registerPart('keychain', coinMesh, [0.16, 0.62, 0.13], [0.35, -0.1, 0.52]);

      // Part 7: Artisanal Silk Tassel Bell Cap
      const tasselCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.095, 0.12, 24),
        hardwareMetalMat
      );
      registerPart('keychain', tasselCap, [-0.18, 0.56, -0.04], [-0.38, -0.12, -0.18]);

      // Part 8: Layered Silk Tassel Skirt
      const tasselSkirt = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.38, 28),
        primaryLeatherMat
      );
      registerPart('keychain', tasselSkirt, [-0.18, 0.33, -0.04], [-0.38, -0.34, -0.18]);
    }

    // --- MODEL D: IMPERIAL TAILORED TWO-PIECE OUTFIT (8 distinct parts) ---
    {
      // Part 1: Architectural Brass Valet Stand Base & Pole
      const valetGroup = new THREE.Group();
      const vBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.38, 0.08, 32),
        hardwareMetalMat
      );
      vBase.position.y = 0.04;
      const vPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.65, 16),
        hardwareMetalMat
      );
      vPole.position.y = 0.85;
      valetGroup.add(vBase, vPole);
      registerPart('outfit', valetGroup, [0, 0, -0.08], [0, 0, -0.35]);

      // Part 2: Structured Double-Breasted Blazer Torso
      const blazerGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.76, 32);
      const blazerMesh = new THREE.Mesh(blazerGeo, primaryLeatherMat);
      blazerMesh.scale.set(1.18, 1, 0.72);
      registerPart('outfit', blazerMesh, [0, 1.24, 0], [0, 0.25, 0]);

      // Part 3: Peak Satin Lapels (Left & Right)
      const lapelsGroup = new THREE.Group();
      const leftLapel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.04), secondaryTrimMat);
      leftLapel.position.set(-0.1, 0.1, 0.26);
      leftLapel.rotation.z = -0.26;
      const rightLapel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.04), secondaryTrimMat);
      rightLapel.position.set(0.1, 0.1, 0.26);
      rightLapel.rotation.z = 0.26;
      lapelsGroup.add(leftLapel, rightLapel);
      registerPart('outfit', lapelsGroup, [0, 1.26, 0], [0, 0.3, 0.35]);

      // Part 4: Tailored Structured Sleeves (Left & Right)
      const sleevesGroup = new THREE.Group();
      const leftSleeve = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.095, 0.58, 12, 20),
        primaryLeatherMat
      );
      leftSleeve.position.set(-0.46, 1.22, 0);
      leftSleeve.rotation.z = 0.12;
      const rightSleeve = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.095, 0.58, 12, 20),
        primaryLeatherMat
      );
      rightSleeve.position.set(0.46, 1.22, 0);
      rightSleeve.rotation.z = -0.12;
      sleevesGroup.add(leftSleeve, rightSleeve);
      registerPart('outfit', sleevesGroup, [0, 0, 0], [0, 0.18, -0.2]);

      // Part 5: 6 Double-Breasted Brushed Gold Bullion Buttons
      const buttonsGroup = new THREE.Group();
      [-0.09, 0.09].forEach((bx) => {
        [1.02, 1.16, 1.3].forEach((by) => {
          const btn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.026, 0.026, 0.02, 16),
            hardwareMetalMat
          );
          btn.rotation.x = Math.PI / 2;
          btn.position.set(bx, by, 0.27);
          buttonsGroup.add(btn);
        });
      });
      registerPart('outfit', buttonsGroup, [0, 0, 0], [0, 0.15, 0.55]);

      // Part 6: High-Waisted Pleated Wide-Leg Trousers (Left & Right Columns)
      const trousersGroup = new THREE.Group();
      const leftLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.21, 0.82, 24),
        secondaryTrimMat
      );
      leftLeg.position.set(-0.17, 0.45, 0);
      const rightLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.21, 0.82, 24),
        secondaryTrimMat
      );
      rightLeg.position.set(0.17, 0.45, 0);
      trousersGroup.add(leftLeg, rightLeg);
      registerPart('outfit', trousersGroup, [0, 0, 0], [0, -0.25, 0]);

      // Part 7: Sculpted Leather Waist Belt & Brass Clasp
      const beltGroup = new THREE.Group();
      const beltRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.07, 32),
        darkSuedeLiningMat
      );
      beltRing.scale.set(1.16, 1, 0.74);
      const beltClasp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.04), hardwareMetalMat);
      beltClasp.position.set(0, 0, 0.26);
      beltGroup.add(beltRing, beltClasp);
      registerPart('outfit', beltGroup, [0, 0.88, 0], [0, 0, 0.35]);

      // Part 8: Carved Wood & Brass Valet Shoulder Yoke
      const hangerYoke = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.035, 12, 32, Math.PI),
        hardwareMetalMat
      );
      hangerYoke.scale.set(1.2, 0.4, 0.8);
      registerPart('outfit', hangerYoke, [0, 1.58, 0], [0, 0.55, 0]);
    }

    Object.values(modelGroups).forEach((grp) => subjectRoot.add(grp));

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 9. Paced Render Loop with Exponential Damping & Software-WebGL Fence Sync
    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const st = stateRef.current;

      // Toggle active 3D model visibility
      (Object.keys(modelGroups) as Array<Exclude<Featured3DModelType, 'none'>>).forEach((key) => {
        modelGroups[key].visible = key === st.modelType;
      });

      // Smoothly damp material finish colors & roughness
      const finish = FINISH_PRESETS.find((f) => f.id === st.finishId) || FINISH_PRESETS[0];
      primaryLeatherMat.color.lerp(new THREE.Color(finish.hex), 1 - Math.exp(-8 * dt));
      primaryLeatherMat.roughness = THREE.MathUtils.damp(
        primaryLeatherMat.roughness,
        finish.roughness,
        8,
        dt
      );
      primaryLeatherMat.sheen = THREE.MathUtils.damp(primaryLeatherMat.sheen, finish.sheen, 8, dt);

      secondaryTrimMat.color.lerp(new THREE.Color(finish.secondaryHex), 1 - Math.exp(-8 * dt));

      const hw = HARDWARE_PRESETS.find((h) => h.id === st.hardwareId) || HARDWARE_PRESETS[0];
      hardwareMetalMat.color.lerp(new THREE.Color(hw.hex), 1 - Math.exp(-8 * dt));
      hardwareMetalMat.roughness = THREE.MathUtils.damp(
        hardwareMetalMat.roughness,
        hw.roughness,
        8,
        dt
      );
      hardwareMetalMat.metalness = THREE.MathUtils.damp(
        hardwareMetalMat.metalness,
        hw.metalness,
        8,
        dt
      );

      // Smoothly damp exploded-view parts
      const activeParts = explodableMap[st.modelType];
      for (let i = 0; i < activeParts.length; i++) {
        const part = activeParts[i];
        _partTargetPos
          .copy(part.basePos)
          .addScaledVector(part.explodeOffset, st.explode);
        part.mesh.position.x = THREE.MathUtils.damp(
          part.mesh.position.x,
          _partTargetPos.x,
          7,
          dt
        );
        part.mesh.position.y = THREE.MathUtils.damp(
          part.mesh.position.y,
          _partTargetPos.y,
          7,
          dt
        );
        part.mesh.position.z = THREE.MathUtils.damp(
          part.mesh.position.z,
          _partTargetPos.z,
          7,
          dt
        );
      }

      // Gentle turntable rotation when autoRotate is enabled
      if (st.autoRotate && !isSoftwareGl) {
        subjectRoot.rotation.y += dt * 0.38;
      }

      // Smoothly damp camera preset transitions
      if (st.cameraTransitioning) {
        const camPreset = CAMERA_PRESETS[st.cameraId];
        _targetCamPos.set(...camPreset.pos);
        _targetLookAt.set(...camPreset.look);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 6, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 6, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 6, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 6, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 6, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 6, dt);

        if (camera.position.distanceTo(_targetCamPos) < 0.02) {
          st.cameraTransitioning = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      leatherBumpTex.dispose();
      travertineTex.dispose();
      contactShadowTex.dispose();
      primaryLeatherMat.dispose();
      secondaryTrimMat.dispose();
      hardwareMetalMat.dispose();
      darkSuedeLiningMat.dispose();
      plinthMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#1A0D22] ${
        fullScreenMode ? 'h-[calc(100vh-64px)] min-h-[580px]' : 'h-[580px] sm:h-[640px] rounded-2xl'
      }`}
    >
      {/* Isolated WebGL Canvas Container (Outside React HUD overlays) */}
      <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {!webglReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1E1028] text-white p-6 text-center">
          <p className="font-serif text-2xl mb-2">Sidi 3D Atelier Interactive Plinth</p>
          <p className="text-sm text-[#D6C5DF] max-w-md">
            Interactive 3D inspection is ready. Select a piece below to add to your booking bag.
          </p>
        </div>
      )}

      {/* Minimal Top-Left Spec Header Overlay (Zero Center Viewport Occlusion) */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto z-10 pointer-events-none flex flex-col sm:max-w-xs bg-[#1E1028]/90 border border-[#4A154B] rounded-xl px-4 py-3 text-white">
        <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-medium">
          <span>3D Atelier Inspection</span>
          <span aria-hidden="true">·</span>
          <span>Drag to Orbit</span>
        </div>
        <h3 className="font-serif text-lg sm:text-xl font-semibold text-white mt-0.5 truncate">
          {matchingProduct?.name || 'Sidi Sovereign Piece'}
        </h3>
        <div className="flex items-center justify-between gap-4 mt-2 pointer-events-auto">
          <span className="font-mono text-sm font-semibold text-[#F4E8FA] tabular-nums">
            ${matchingProduct?.price.toFixed(2)}
          </span>
          {matchingProduct && (
            <button
              type="button"
              onClick={() => onAddToCart(matchingProduct)}
              className="px-3 py-1.5 rounded-lg bg-[#4A154B] hover:bg-[#5E1B60] text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Add Piece to Bag
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Unified Bottom Control Dock (Solid/RGBA surface, no backdrop-filter over WebGL) */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[94vw] max-w-[920px] transition-transform duration-200"
        style={{
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 38px))'
            : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Toggle Tab */}
        <div className="flex justify-center mb-1.5">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-lg bg-[#1E1028] border border-[#4A154B] text-[#F4E8FA] text-xs font-medium flex items-center gap-1.5 hover:bg-[#2D163B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#D4AF37]" />
                Show 3D Controls
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />
                Hide Controls
              </>
            )}
          </button>
        </div>

        {/* Main Dock Panel */}
        <div className="bg-[#180B20] border border-[#4A154B] rounded-2xl p-3 sm:p-4 text-white shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* 1. Piece Selector */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <span className="text-[11px] text-[#C8B5D1] font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                Atelier Sculpture
              </span>
              <div className="grid grid-cols-4 gap-1 bg-[#261233] p-1 rounded-lg">
                {(
                  [
                    { id: 'handbag', label: 'Handbag' },
                    { id: 'dress', label: 'Dress' },
                    { id: 'keychain', label: 'Keychain' },
                    { id: 'outfit', label: 'Outfit' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(item.id);
                      setExplodeFactor(0);
                    }}
                    className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      currentModelType === item.id
                        ? 'bg-[#4A154B] text-white'
                        : 'text-[#C8B5D1] hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Leather / Silk Finish Swatches & Hardware */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <span className="text-[11px] text-[#C8B5D1] font-medium">
                Material & Hardware Finish
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {FINISH_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.label}
                    onClick={() => setSelectedFinish(preset.id)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                      selectedFinish === preset.id
                        ? 'border-[#D4AF37] scale-110'
                        : 'border-white/25 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    aria-label={preset.label}
                  />
                ))}
                <span className="text-[#6E537A] mx-0.5">|</span>
                {HARDWARE_PRESETS.map((hw) => (
                  <button
                    key={hw.id}
                    type="button"
                    title={hw.label}
                    onClick={() => setSelectedHardware(hw.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedHardware === hw.id
                        ? 'bg-[#361946] border-[#D4AF37] text-white'
                        : 'bg-[#24102E] border-transparent text-[#C8B5D1] hover:text-white'
                    }`}
                  >
                    {hw.id === 'brushed_gold'
                      ? '24k Gold'
                      : hw.id === 'rose_brass'
                      ? 'Rose Brass'
                      : 'Platinum'}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Exploded Craft Slider & Camera Presets */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#C8B5D1]">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#D4AF37]" />
                  Exploded Craft ({Math.round(explodeFactor * 100)}%)
                </span>
                <button
                  type="button"
                  onClick={() => setAutoRotate((prev) => !prev)}
                  className="text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {autoRotate ? 'Pause Spin' : 'Auto Spin'}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodeFactor}
                onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                className="w-full accent-[#D4AF37] h-1.5 bg-[#2D153B] rounded-lg cursor-pointer"
                aria-label="Exploded view separation"
              />
              <div className="flex items-center gap-1 pt-0.5 overflow-x-auto">
                <Eye className="w-3 h-3 text-[#C8B5D1] shrink-0 mr-0.5" />
                {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map((camKey) => (
                  <button
                    key={camKey}
                    type="button"
                    onClick={() => setSelectedCamera(camKey)}
                    className={`px-2 py-0.5 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCamera === camKey
                        ? 'bg-[#4A154B] text-white font-medium'
                        : 'text-[#C8B5D1] hover:text-white'
                    }`}
                  >
                    {CAMERA_PRESETS[camKey].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
