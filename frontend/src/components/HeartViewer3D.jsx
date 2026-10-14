import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCcw, 
  Activity, 
  Eye, 
  EyeOff, 
  Info, 
  Sliders, 
  ShieldCheck, 
  Heart,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Sparkles
} from 'lucide-react';

/**
 * Anatomically Realistic 3D Heart & Coronary Circulation Viewer
 * CardioVision - Track A Medical Prototype
 * 
 * Clean 2-column layout:
 * - Left/Main: Unobstructed high-fidelity 3D viewport with minimal top presets.
 * - Right/Secondary: Dedicated vessel selection, clinical predictions, threshold sliders & legend.
 */
export default function HeartViewer3D({ 
  predictions, 
  thresholds = { low: 0.35, high: 0.65 }, 
  setThresholds,
  selectedVessel = 'LAD', 
  setSelectedVessel,
  colorblindMode = false 
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameIdRef = useRef(null);
  
  // Interactive 3D object references
  const vesselsRef = useRef({});
  const heartGroupRef = useRef(null);
  const heartMeshRef = useRef(null);
  const torsoRef = useRef(null);
  const lightsRef = useRef({});
  
  // Viewer state
  const [loadingModel, setLoadingModel] = useState(true);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [pulsing, setPulsing] = useState(true);
  const [showTorso, setShowTorso] = useState(false);
  const [tissueOpacity, setTissueOpacity] = useState(1.0); // 1.0 = solid, 0.55 = translucent
  const [hoveredVessel, setHoveredVessel] = useState(null);
  const [activePreset, setActivePreset] = useState('Anterior');
  const [showAnatomyModal, setShowAnatomyModal] = useState(false);

  // Smooth camera animation target
  const cameraAnimRef = useRef({
    animating: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    progress: 1.0,
    duration: 0.8
  });

  // Mouse interaction state for raycasting
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  // Vessel clinical descriptions
  const vesselInfo = {
    LAD: {
      fullName: 'Left Anterior Descending Artery',
      subtitle: 'Anterior Interventricular Branch',
      territory: 'Anterior 2/3 of interventricular septum, anterior LV wall, apex, anterolateral papillary muscle.',
      clinicalRelevance: 'Known clinically as the "Widow Maker". Occlusion leads to large anterior myocardial infarction with high risk of cardiogenic shock.',
      model: 'Random Forest (100 Trees, Gini Impurity)',
      branches: ['Diagonal 1 (D1)', 'Diagonal 2 (D2)', 'Septal Perforators']
    },
    LCX: {
      fullName: 'Left Circumflex Artery',
      subtitle: 'Left Atrioventricular Circumflex Branch',
      territory: 'Posterolateral left ventricular wall, lateral LV free wall, and in 15% left-dominant hearts the AV node and posterior wall.',
      clinicalRelevance: 'Stenosis can cause lateral ischemia often presenting with subtle or non-diagnostic standard 12-lead ECG changes.',
      model: 'XGBoost Classifier (n_estimators=100, max_depth=3)',
      branches: ['Obtuse Marginal 1 (OM1)', 'Obtuse Marginal 2 (OM2)', 'Posterolateral Branches']
    },
    RCA: {
      fullName: 'Right Coronary Artery',
      subtitle: 'Right Atrioventricular Trunk & Branches',
      territory: 'Right ventricular myocardium, inferior/diaphragmatic LV wall, SA node (60% patients), AV node (90% right-dominant).',
      clinicalRelevance: 'Inferior wall myocardial infarction. Occlusion frequently causes high-degree AV conduction blocks and sinus bradycardia.',
      model: 'Support Vector Machine (RBF Kernel, Class-Balanced)',
      branches: ['Conus Branch', 'Acute Marginal (AM)', 'Posterior Descending Artery (PDA)']
    },
    CAD: {
      fullName: 'Overall CAD Status',
      subtitle: 'Global Cardiac Risk Status (Cath Ground Truth)',
      territory: 'Systemic evaluation across all epicardial coronary arteries (≥50% diameter narrowing in any major branch).',
      clinicalRelevance: 'Composite clinical CAD diagnosis mapped from coronary angiography (Cath) benchmark.',
      model: 'Balanced SVM Classifier (RBF Kernel, Probability Calibrated)',
      branches: ['LAD Territory', 'LCX Territory', 'RCA Territory']
    }
  };

  // Determine vessel color based on backend prediction probability
  const getVesselColor = (prob) => {
    if (prob === undefined || prob === null) return '#94A3B8';
    
    if (colorblindMode) {
      if (prob < thresholds.low) return '#0D9488'; // Accessible Teal
      if (prob <= thresholds.high) return '#7C3AED'; // Accessible Purple
      return '#EAB308'; // High-contrast Gold
    } else {
      if (prob < thresholds.low) return '#10B981'; // Reassuring Medical Green
      if (prob <= thresholds.high) return '#F59E0B'; // Clinical Amber / Warning
      return '#EF4444'; // Clinical Crimson / High Stenosis
    }
  };

  // Get status string
  const getVesselStatusText = (prob) => {
    if (prob === undefined || prob === null) return 'Awaiting Assessment';
    if (prob < thresholds.low) return 'Low Risk / Normal';
    if (prob <= thresholds.high) return 'Borderline Stenosis';
    return 'Significant Stenosis Risk';
  };

  // Animate camera to target preset
  const triggerCameraMove = (endPos, endTarget = new THREE.Vector3(0, 0, 0)) => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraAnimRef.current = {
      animating: true,
      startPos: cameraRef.current.position.clone(),
      endPos: endPos.clone(),
      startTarget: controlsRef.current.target.clone(),
      endTarget: endTarget.clone(),
      progress: 0.0,
      duration: 0.8
    };
  };

  // Preset Views Handler
  const handlePresetView = (preset) => {
    setActivePreset(preset);
    if (preset === 'Anterior') {
      triggerCameraMove(new THREE.Vector3(0, 0, 14.5), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'Posterior') {
      triggerCameraMove(new THREE.Vector3(0, 0, -14.5), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'Left Lateral') {
      triggerCameraMove(new THREE.Vector3(-14, 1.5, 3), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'Right Lateral') {
      triggerCameraMove(new THREE.Vector3(14, 1.5, 3), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'Reset') {
      setSelectedVessel('CAD');
      triggerCameraMove(new THREE.Vector3(3.5, 2.0, 14.0), new THREE.Vector3(0, 0, 0));
    }
  };

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 580;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC); // Clean Medical Light Slate
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(3.5, 2.0, 14.0); // Natural 3/4 anatomical clinical view
    cameraRef.current = camera;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6.0;
    controls.maxDistance = 24.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 4. Professional Studio Lighting for Medical Light Theme
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);
    lightsRef.current.ambient = ambientLight;

    // Key Light (Top-Right Front)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(12, 16, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    lightsRef.current.key = keyLight;

    // Fill Light (Cool Medical Blue from Left)
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.85);
    fillLight.position.set(-14, -6, 10);
    scene.add(fillLight);
    lightsRef.current.fill = fillLight;

    // Back / Rim Light (Warm biological rim from posterior)
    const rimLight = new THREE.DirectionalLight(0xffedd5, 0.95);
    rimLight.position.set(0, 12, -14);
    scene.add(rimLight);
    lightsRef.current.rim = rimLight;

    // Subtle localized point light near root of aorta
    const aorticLight = new THREE.PointLight(0xffffff, 0.45, 20);
    aorticLight.position.set(0, 4, 6);
    scene.add(aorticLight);

    // 5. Root Heart Assembly Group
    const heartGroup = new THREE.Group();
    heartGroupRef.current = heartGroup;
    scene.add(heartGroup);

    // --- A. Thoracic Rib Cage Reference ---
    const torsoGroup = new THREE.Group();
    torsoRef.current = torsoGroup;
    torsoGroup.visible = showTorso;

    for (let i = -3; i <= 3; i++) {
      const ribCurve = new THREE.EllipseCurve(
        0, i * 1.5,
        7.5 - Math.abs(i) * 0.45, 5.0 - Math.abs(i) * 0.35,
        0, 2 * Math.PI,
        false, 0
      );
      const ribPoints = ribCurve.getPoints(60);
      const ribGeom = new THREE.BufferGeometry().setFromPoints(ribPoints);
      const ribMat = new THREE.LineBasicMaterial({ 
        color: 0x94A3B8, 
        transparent: true, 
        opacity: 0.32 
      });
      const rib = new THREE.Line(ribGeom, ribMat);
      rib.rotation.x = Math.PI / 2.25;
      torsoGroup.add(rib);
    }
    const sternumGeom = new THREE.CylinderGeometry(0.12, 0.12, 9, 8);
    const sternumMat = new THREE.MeshBasicMaterial({ color: 0x64748B, transparent: true, opacity: 0.35 });
    const sternum = new THREE.Mesh(sternumGeom, sternumMat);
    sternum.position.set(0, 0, 5.0);
    torsoGroup.add(sternum);
    scene.add(torsoGroup);

    // --- B. BUILD ANATOMICALLY ACCURATE CORONARY ARTERY VASCULAR TREES ---
    const arteryMaterials = {};

    ['LAD', 'LCX', 'RCA'].forEach((vessel) => {
      const initColor = getVesselColor(predictions?.[vessel]?.probability);
      arteryMaterials[vessel] = new THREE.MeshStandardMaterial({
        color: new THREE.Color(initColor),
        roughness: 0.28,
        metalness: 0.12,
        emissive: new THREE.Color(initColor),
        emissiveIntensity: selectedVessel === vessel ? 0.8 : 0.3
      });
    });

    const vesselMeshes = { LAD: [], LCX: [], RCA: [] };

    // 1. LAD: Left Anterior Descending Artery Tree
    const ladMainSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.30, 1.85, 1.85),
      new THREE.Vector3(-0.42, 1.10, 2.38),
      new THREE.Vector3(-0.35, 0.30, 2.68),
      new THREE.Vector3(-0.15, -0.65, 2.70),
      new THREE.Vector3(0.08, -1.65, 2.45),
      new THREE.Vector3(0.32, -2.60, 2.05),
      new THREE.Vector3(0.48, -3.45, 1.45),
      new THREE.Vector3(0.55, -4.05, 0.65)
    ]);
    const ladGeom = new THREE.TubeGeometry(ladMainSpline, 64, 0.22, 14, false);
    const ladMesh = new THREE.Mesh(ladGeom, arteryMaterials['LAD']);
    ladMesh.userData = { vessel: 'LAD', name: 'LAD Main Trunk (Anterior Interventricular)' };
    ladMesh.castShadow = true;
    heartGroup.add(ladMesh);
    vesselMeshes.LAD.push(ladMesh);

    // LAD Diagonal 1 Branch (D1)
    const d1Spline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 0.30, 2.68),
      new THREE.Vector3(-1.15, -0.20, 2.45),
      new THREE.Vector3(-1.85, -0.85, 2.05),
      new THREE.Vector3(-2.25, -1.60, 1.45)
    ]);
    const d1Geom = new THREE.TubeGeometry(d1Spline, 32, 0.14, 10, false);
    const d1Mesh = new THREE.Mesh(d1Geom, arteryMaterials['LAD']);
    d1Mesh.userData = { vessel: 'LAD', name: 'LAD Diagonal 1 Branch (D1)' };
    d1Mesh.castShadow = true;
    heartGroup.add(d1Mesh);
    vesselMeshes.LAD.push(d1Mesh);

    // LAD Diagonal 2 Branch (D2)
    const d2Spline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, -1.65, 2.45),
      new THREE.Vector3(-0.65, -2.15, 2.25),
      new THREE.Vector3(-1.35, -2.85, 1.70)
    ]);
    const d2Geom = new THREE.TubeGeometry(d2Spline, 24, 0.12, 8, false);
    const d2Mesh = new THREE.Mesh(d2Geom, arteryMaterials['LAD']);
    d2Mesh.userData = { vessel: 'LAD', name: 'LAD Diagonal 2 Branch (D2)' };
    d2Mesh.castShadow = true;
    heartGroup.add(d2Mesh);
    vesselMeshes.LAD.push(d2Mesh);

    // 2. LCX: Left Circumflex Artery Tree
    const lcxMainSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.30, 1.85, 1.85),
      new THREE.Vector3(-1.25, 1.60, 1.60),
      new THREE.Vector3(-2.15, 1.15, 0.95),
      new THREE.Vector3(-2.75, 0.45, -0.25),
      new THREE.Vector3(-2.70, -0.45, -1.25),
      new THREE.Vector3(-2.10, -1.15, -1.85),
      new THREE.Vector3(-1.30, -1.55, -1.95),
      new THREE.Vector3(-0.60, -1.75, -1.80)
    ]);
    const lcxGeom = new THREE.TubeGeometry(lcxMainSpline, 64, 0.20, 14, false);
    const lcxMesh = new THREE.Mesh(lcxGeom, arteryMaterials['LCX']);
    lcxMesh.userData = { vessel: 'LCX', name: 'LCX Main Trunk (Circumflex)' };
    lcxMesh.castShadow = true;
    heartGroup.add(lcxMesh);
    vesselMeshes.LCX.push(lcxMesh);

    // LCX Obtuse Marginal 1 Branch (OM1)
    const om1Spline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.15, 1.15, 0.95),
      new THREE.Vector3(-2.55, 0.15, 0.65),
      new THREE.Vector3(-2.60, -1.05, 0.40),
      new THREE.Vector3(-2.30, -2.15, 0.20)
    ]);
    const om1Geom = new THREE.TubeGeometry(om1Spline, 32, 0.13, 10, false);
    const om1Mesh = new THREE.Mesh(om1Geom, arteryMaterials['LCX']);
    om1Mesh.userData = { vessel: 'LCX', name: 'LCX Obtuse Marginal 1 Branch (OM1)' };
    om1Mesh.castShadow = true;
    heartGroup.add(om1Mesh);
    vesselMeshes.LCX.push(om1Mesh);

    // LCX Obtuse Marginal 2 Branch (OM2)
    const om2Spline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.75, 0.45, -0.25),
      new THREE.Vector3(-2.85, -0.65, -0.45),
      new THREE.Vector3(-2.55, -1.70, -0.65)
    ]);
    const om2Geom = new THREE.TubeGeometry(om2Spline, 24, 0.11, 8, false);
    const om2Mesh = new THREE.Mesh(om2Geom, arteryMaterials['LCX']);
    om2Mesh.userData = { vessel: 'LCX', name: 'LCX Obtuse Marginal 2 Branch (OM2)' };
    om2Mesh.castShadow = true;
    heartGroup.add(om2Mesh);
    vesselMeshes.LCX.push(om2Mesh);

    // 3. RCA: Right Coronary Artery Tree
    const rcaMainSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.65, 1.80, 1.70),
      new THREE.Vector3(1.65, 1.55, 1.60),
      new THREE.Vector3(2.35, 0.90, 1.25),
      new THREE.Vector3(2.65, 0.05, 0.65),
      new THREE.Vector3(2.55, -0.95, -0.15),
      new THREE.Vector3(2.15, -1.85, -0.95),
      new THREE.Vector3(1.35, -2.45, -1.45),
      new THREE.Vector3(0.70, -2.75, -1.35)
    ]);
    const rcaGeom = new THREE.TubeGeometry(rcaMainSpline, 64, 0.22, 14, false);
    const rcaMesh = new THREE.Mesh(rcaGeom, arteryMaterials['RCA']);
    rcaMesh.userData = { vessel: 'RCA', name: 'RCA Main Trunk (Right Coronary)' };
    rcaMesh.castShadow = true;
    heartGroup.add(rcaMesh);
    vesselMeshes.RCA.push(rcaMesh);

    // RCA Acute Marginal Branch (AM)
    const amSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.65, 0.05, 0.65),
      new THREE.Vector3(2.55, -0.75, 1.15),
      new THREE.Vector3(2.15, -1.65, 1.45),
      new THREE.Vector3(1.45, -2.35, 1.55)
    ]);
    const amGeom = new THREE.TubeGeometry(amSpline, 32, 0.13, 10, false);
    const amMesh = new THREE.Mesh(amGeom, arteryMaterials['RCA']);
    amMesh.userData = { vessel: 'RCA', name: 'RCA Acute Marginal Branch (AM)' };
    amMesh.castShadow = true;
    heartGroup.add(amMesh);
    vesselMeshes.RCA.push(amMesh);

    // RCA Posterior Descending Artery (PDA)
    const pdaSpline = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.35, -2.45, -1.45),
      new THREE.Vector3(1.05, -3.05, -1.15),
      new THREE.Vector3(0.75, -3.60, -0.55),
      new THREE.Vector3(0.58, -3.95, 0.25)
    ]);
    const pdaGeom = new THREE.TubeGeometry(pdaSpline, 32, 0.14, 10, false);
    const pdaMesh = new THREE.Mesh(pdaGeom, arteryMaterials['RCA']);
    pdaMesh.userData = { vessel: 'RCA', name: 'RCA Posterior Descending Artery (PDA)' };
    pdaMesh.castShadow = true;
    heartGroup.add(pdaMesh);
    vesselMeshes.RCA.push(pdaMesh);

    // Save vessel meshes for raycasting & material updates
    vesselsRef.current = vesselMeshes;

    // --- C. LOAD HIGH-FIDELITY PHOTOREALISTIC ANATOMICAL HEART MODEL ---
    const loader = new GLTFLoader();
    
    loader.load(
      '/models/realistic_heart.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Compute bounding box and center
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        
        // Translate model so center aligns with origin
        model.position.sub(center);
        
        // Scale factor: scale so height matches our coronary vascular tree (~8.8 units)
        const size = box.getSize(new THREE.Vector3());
        const targetHeight = 8.8;
        const scale = targetHeight / (size.y || 1);
        model.scale.set(scale, scale, scale);

        // Adjust materials for realistic medical tissue appearance
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = 0.42;
              child.material.metalness = 0.08;
              child.material.transparent = true;
              child.material.opacity = tissueOpacity;
              child.material.depthWrite = true;
            }
          }
        });

        heartMeshRef.current = model;
        heartGroup.add(model);
        setLoadingModel(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          setModelLoadProgress(pct);
        }
      },
      (error) => {
        console.warn('Falling back to compound anatomical organ assembly:', error);
        
        // Compound procedural fallback
        const proceduralGroup = new THREE.Group();
        const lvGeom = new THREE.SphereGeometry(3.1, 48, 48);
        const lvPos = lvGeom.attributes.position;
        for (let i = 0; i < lvPos.count; i++) {
          let y = lvPos.getY(i);
          let x = lvPos.getX(i);
          let z = lvPos.getZ(i);
          if (y < 0) {
            const taper = 1.0 + (y / 3.1) * 0.72;
            lvPos.setX(i, x * taper + 0.35);
            lvPos.setZ(i, z * taper);
          }
        }
        lvGeom.computeVertexNormals();
        const myoMat = new THREE.MeshStandardMaterial({
          color: 0x881337,
          roughness: 0.40,
          metalness: 0.08,
          emissive: 0x4c0519,
          emissiveIntensity: 0.12,
          transparent: true,
          opacity: tissueOpacity
        });
        const lvMesh = new THREE.Mesh(lvGeom, myoMat);
        lvMesh.rotation.z = 0.22;
        proceduralGroup.add(lvMesh);

        heartMeshRef.current = proceduralGroup;
        heartGroup.add(proceduralGroup);
        setLoadingModel(false);
      }
    );

    // 6. Interactive Raycasting & Click Handling
    const handlePointerDown = (e) => {
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.set(mouseX, mouseY);

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      const allMeshes = [
        ...vesselMeshes.LAD,
        ...vesselMeshes.LCX,
        ...vesselMeshes.RCA
      ];
      const intersects = raycasterRef.current.intersectObjects(allMeshes, true);

      if (intersects.length > 0) {
        const v = intersects[0].object.userData.vessel;
        setHoveredVessel(v);
        container.style.cursor = 'pointer';
      } else {
        setHoveredVessel(null);
        container.style.cursor = 'grab';
      }
    };

    const handlePointerUp = (e) => {
      const dist = Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y);
      if (dist < 6) {
        const rect = container.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        mouseRef.current.set(mouseX, mouseY);

        raycasterRef.current.setFromCamera(mouseRef.current, camera);
        const allMeshes = [
          ...vesselMeshes.LAD,
          ...vesselMeshes.LCX,
          ...vesselMeshes.RCA
        ];
        const intersects = raycasterRef.current.intersectObjects(allMeshes, true);

        if (intersects.length > 0) {
          const target = intersects[0].object.userData.vessel;
          setSelectedVessel(target);
        }
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);

    // 7. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 8. Render Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth camera interpolation
      const anim = cameraAnimRef.current;
      if (anim.animating) {
        anim.progress += delta / anim.duration;
        if (anim.progress >= 1.0) {
          anim.progress = 1.0;
          anim.animating = false;
        }
        const t = 1 - Math.pow(1 - anim.progress, 3);
        camera.position.lerpVectors(anim.startPos, anim.endPos, t);
        controls.target.lerpVectors(anim.startTarget, anim.endTarget, t);
      }

      // Smooth physiological cardiac pulse (~70 bpm)
      if (pulsing && heartGroupRef.current) {
        const beatCycle = time * 2.3;
        const p1 = Math.sin(beatCycle);
        const p2 = Math.sin(beatCycle * 2.0);
        const contraction = (p1 > 0 ? Math.pow(p1, 6) * 0.038 : 0) + (p2 > 0 ? Math.pow(p2, 6) * 0.018 : 0);
        const s = 1.0 + contraction;
        heartGroupRef.current.scale.set(s, s, s);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update Coronary Vessel Colors & Emissive Highlights
  useEffect(() => {
    const vessels = vesselsRef.current;
    if (!vessels) return;

    ['LAD', 'LCX', 'RCA'].forEach((vesselKey) => {
      const meshes = vessels[vesselKey] || [];
      const prob = predictions?.[vesselKey]?.probability;
      const colorHex = getVesselColor(prob);
      const isSelected = selectedVessel === vesselKey;
      const isHovered = hoveredVessel === vesselKey;

      meshes.forEach((mesh) => {
        if (mesh.material) {
          mesh.material.color.set(colorHex);
          mesh.material.emissive.set(colorHex);
          
          if (isSelected) {
            mesh.material.emissiveIntensity = 0.95;
            mesh.scale.set(1.08, 1.08, 1.08);
          } else if (isHovered) {
            mesh.material.emissiveIntensity = 0.65;
            mesh.scale.set(1.04, 1.04, 1.04);
          } else {
            mesh.material.emissiveIntensity = 0.28;
            mesh.scale.set(1.0, 1.0, 1.0);
          }
          mesh.material.needsUpdate = true;
        }
      });
    });
  }, [predictions, thresholds, selectedVessel, hoveredVessel, colorblindMode]);

  // Update Tissue Opacity
  useEffect(() => {
    if (heartMeshRef.current) {
      heartMeshRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.opacity = tissueOpacity;
          child.material.transparent = tissueOpacity < 0.99;
          child.material.needsUpdate = true;
        }
      });
    }
  }, [tissueOpacity]);

  // Update Torso Visibility
  useEffect(() => {
    if (torsoRef.current) {
      torsoRef.current.visible = showTorso;
    }
  }, [showTorso]);

  // Smoothly orient camera when selected vessel changes from an external control
  useEffect(() => {
    if (selectedVessel === 'LAD') {
      triggerCameraMove(new THREE.Vector3(0, 0, 14.5));
      setActivePreset('Anterior');
    } else if (selectedVessel === 'LCX') {
      triggerCameraMove(new THREE.Vector3(-14, 1.5, 3));
      setActivePreset('Left Lateral');
    } else if (selectedVessel === 'RCA') {
      triggerCameraMove(new THREE.Vector3(14, 1.5, 3));
      setActivePreset('Right Lateral');
    } else {
      triggerCameraMove(new THREE.Vector3(3.5, 2.0, 14.0));
      setActivePreset('Reset');
    }
  }, [selectedVessel]);

  // Active vessel prediction info
  const currentProb = selectedVessel && selectedVessel !== 'CAD'
    ? predictions?.[selectedVessel]?.probability
    : predictions?.CAD?.probability;

  const currentInfo = vesselInfo[selectedVessel] || vesselInfo['CAD'];

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* =========================================================================
          LEFT / MAIN COLUMN: SPACIOUS 3D WEBGL HEART CANVAS
         ========================================================================= */}
      <div className="relative flex-1 w-full h-[580px] lg:h-[660px] bg-slate-50 rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs select-none">
        {/* 3D WebGL Canvas Mount */}
        <div 
          ref={mountRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none" 
        />

        {/* Loading Overlay */}
        {loadingModel && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30 transition-opacity">
            <div className="relative">
              <Heart className="w-10 h-10 text-rose-500 animate-pulse" />
              <div className="absolute inset-0 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">
                Loading Anatomical 3D Heart Organ
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Preparing photorealistic PBR myocardial surfaces ({modelLoadProgress}%)
              </p>
            </div>
          </div>
        )}

        {/* TOP FLOATING MINIMAL CONTROLS (PRESETS & QUICK TOOLS ONLY) */}
        <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
          {/* Camera View Angle Presets */}
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-1 rounded-xl shadow-xs pointer-events-auto">
            {[
              { id: 'Anterior', label: 'Front (AP)' },
              { id: 'Posterior', label: 'Back (Post)' },
              { id: 'Left Lateral', label: 'LAO (LCX)' },
              { id: 'Right Lateral', label: 'RAO (RCA)' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetView(preset.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  activePreset === preset.id
                    ? 'bg-[#0F766E] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <button
              onClick={() => handlePresetView('Reset')}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition ml-0.5"
              title="Reset camera to default 3/4 perspective"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Inspection Toggles */}
          <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-1 rounded-xl shadow-xs pointer-events-auto">
            {/* Heartbeat toggle */}
            <button
              onClick={() => setPulsing(!pulsing)}
              className={`p-1.5 rounded-lg text-xs transition ${
                pulsing ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:text-slate-900'
              }`}
              title={pulsing ? 'Pause physiological heartbeat' : 'Resume heartbeat'}
            >
              <Activity className="w-4 h-4" />
            </button>

            {/* X-Ray translucency toggle */}
            <button
              onClick={() => setTissueOpacity(tissueOpacity === 1.0 ? 0.55 : 1.0)}
              className={`p-1.5 rounded-lg text-xs transition ${
                tissueOpacity < 1.0 ? 'text-[#0F766E] bg-teal-50' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Toggle myocardial X-ray translucency"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Torso cage toggle */}
            <button
              onClick={() => setShowTorso(!showTorso)}
              className={`p-1.5 rounded-lg text-xs transition ${
                showTorso ? 'text-[#0F766E] bg-teal-50' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Toggle thoracic rib cage reference"
            >
              {showTorso ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Anatomy guide button */}
            <button
              onClick={() => setShowAnatomyModal(true)}
              className="p-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Clinical Coronary Anatomy Guide"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hover Tooltip when pointer is over a vessel */}
        {hoveredVessel && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs px-3.5 py-1 rounded-full font-medium shadow-md backdrop-blur-md pointer-events-none flex items-center gap-1.5 border border-slate-700 z-20">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span>Click to inspect <strong>{hoveredVessel}</strong></span>
          </div>
        )}
      </div>

      {/* =========================================================================
          RIGHT / SECONDARY COLUMN: DEDICATED CLINICAL SELECTION & PREDICTION PANEL
         ========================================================================= */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        {/* 1. Vessel Focus Selector Pills */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1E293B]">Coronary Vessel Focus</span>
            <span className="text-[10px] text-slate-400">Click to inspect</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {['CAD', 'LAD', 'LCX', 'RCA'].map((v) => {
              const prob = predictions?.[v]?.probability;
              const isSel = selectedVessel === v;
              const colorHex = getVesselColor(prob);
              return (
                <button
                  key={v}
                  onClick={() => setSelectedVessel(v)}
                  className={`
                    px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between border
                    ${isSel 
                      ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-2xs' 
                      : 'bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-50'
                    }
                  `}
                >
                  <span>{v === 'CAD' ? 'Full Heart (CAD)' : v}</span>
                  {prob !== undefined && (
                    <span 
                      className="w-2.5 h-2.5 rounded-full border border-white/50 shrink-0" 
                      style={{ backgroundColor: colorHex }} 
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Selected Vessel Clinical Prediction Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold block">
                Target Classification
              </span>
              <h3 className="text-sm font-bold text-[#172B4D]">{currentInfo.fullName}</h3>
            </div>
            <span
              className="text-xs font-mono px-2 py-0.5 rounded-full font-bold border"
              style={{
                color: getVesselColor(currentProb),
                borderColor: `${getVesselColor(currentProb)}50`,
                backgroundColor: `${getVesselColor(currentProb)}15`
              }}
            >
              {currentProb !== undefined ? `${(currentProb * 100).toFixed(1)}%` : '--'}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-slate-900">
                {getVesselStatusText(currentProb)}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              <strong>Territory:</strong> {currentInfo.territory}
            </p>
          </div>

          {/* Branches Badges */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-slate-400 font-semibold mr-1">Branches:</span>
            {currentInfo.branches.map((b) => (
              <span key={b} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                {b}
              </span>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 pt-1 font-mono">
            Model: {currentInfo.model}
          </div>
        </div>

        {/* 3. Configurable Risk Threshold Sliders (if setThresholds provided) */}
        {setThresholds && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#172B4D]">Risk Cutoff Thresholds</span>
              <span className="text-[10px] font-mono text-slate-500">
                [{thresholds.low} / {thresholds.high}]
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Low Risk Cutoff:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.10"
                    max="0.45"
                    step="0.05"
                    value={thresholds.low}
                    onChange={(e) => setThresholds(prev => ({ ...prev, low: parseFloat(e.target.value) }))}
                    className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="font-mono font-bold text-slate-800 w-8 text-right">{thresholds.low}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px]">High Risk Cutoff:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.55"
                    max="0.90"
                    step="0.05"
                    value={thresholds.high}
                    onChange={(e) => setThresholds(prev => ({ ...prev, high: parseFloat(e.target.value) }))}
                    className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                  />
                  <span className="font-mono font-bold text-slate-800 w-8 text-right">{thresholds.high}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Accessible Color Legend */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Decision Scale Legend
          </span>
          <div className="space-y-1.5 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getVesselColor(0.2) }} />
              <span>p &lt; {thresholds.low}: Low Risk / Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getVesselColor(0.5) }} />
              <span>{thresholds.low} ≤ p ≤ {thresholds.high}: Borderline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getVesselColor(0.8) }} />
              <span className="font-semibold">p &gt; {thresholds.high}: Significant Stenosis</span>
            </div>
          </div>
        </div>

        {/* 5. Scope Boundary Note */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-700">Anatomical Scope: </span>
          The 3D model visualizes overall vessel-level binary classification (LAD, LCX, RCA). It does not infer millimeter lesion coordinates along the vessel lumen.
        </div>
      </div>

      {/* CLINICAL ANATOMY & MODEL SOURCING MODAL */}
      {showAnatomyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-base font-bold text-slate-900">
                  Coronary Circulation & 3D Model Guide
                </h3>
              </div>
              <button 
                onClick={() => setShowAnatomyModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="bg-[#F0FDF8] border border-teal-200/80 p-3 rounded-xl">
                <span className="font-bold text-teal-950 block mb-1">
                  1. Clinical Vessel Territories
                </span>
                <ul className="list-disc list-inside space-y-1 text-teal-900">
                  <li><strong>LAD:</strong> Anterior wall of LV and septum. Chief contributor to global ejection fraction.</li>
                  <li><strong>LCX:</strong> Lateral and posterior walls of the left ventricle. Often causes subtle ECG changes.</li>
                  <li><strong>RCA:</strong> Inferior wall and right ventricle. Major supplier of SA and AV conducting nodes.</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <span className="font-bold text-amber-900 block mb-1">
                  2. Prediction Scope Boundary
                </span>
                <p className="text-amber-800">
                  The ML models predict patient-level binary vessel stenosis (≥50% diameter narrowing) trained on the Z-Alizadeh Sani cohort (N=303). 
                  The 3D model visualizes overall vessel-level risk; it does not infer millimeter lesion coordinates.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="font-bold text-slate-900 block mb-1">
                  3. 3D Model Provenance & License
                </span>
                <p className="text-slate-700">
                  • <strong>Anatomical Organ Base:</strong> NLM Visible Human Project and Human Reference Atlas (HRA CCF 3D Reference Library v1.2, NIH). CC-BY 4.0.<br />
                  • <strong>Coronary Arteries:</strong> High-fidelity 3D spline-based vascular trees anatomically aligned to epicardial sulci with real-time PBR shaders.
                </p>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setShowAnatomyModal(false)}
                className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D6D65] text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
