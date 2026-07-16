import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TARGET_META, calculateRisk } from "./riskModel.js";
import { calculateDecision } from "./decisionModel.js";
import { calculateCarePlan } from "./carePlan.js";

const state = {
  mode: "space",
  objectType: "paper",
  motionMode: "stand",
  target: "tibia",
  mass: 5,
  speed: 82,
  angle: 76,
  contactArea: 2,
  boneIndex: 0.74,
  microgravityDays: 240,
  fatigue: 0.48,
  painScore: 6,
  swelling: "moderate",
  mobility: "limited",
  sensationChange: false,
};

const aiState = {
  loaded: false,
  fractureProbability: null,
  fractureDetected: false,
  maskAreaFraction: null,
  overlaySrc: "",
  warning: "Research output only. Not a clinical diagnosis.",
};

let workflowStage = 0;
const incidentLog = [];
const completedCareActions = new Set();

const workflowStages = [
  {
    title: "Collect structural evidence",
    description:
      "Connect an image result when available, while preserving a clear path for action when imaging is delayed or unavailable.",
    nextLabel: "Next: event",
  },
  {
    title: "Reconstruct the event",
    description:
      "Define where the load lands and how mass, speed, angle, and contact area concentrate energy.",
    nextLabel: "Next: crew",
  },
  {
    title: "Assess reserve and condition",
    description:
      "Combine skeletal reserve with reported symptoms and function to set operational urgency.",
    nextLabel: "Next: response",
  },
  {
    title: "Build the response and handoff",
    description:
      "Turn evidence into checkable actions, a trend log, and a compact packet for remote medical review.",
    nextLabel: "Restart review",
  },
];

const OBJECT_META = {
  paper: { label: "Paper sheet", hudLabel: "Paper sheet / sharp edge" },
  evaTool: { label: "EVA hand tool", hudLabel: "EVA hand tool" },
  runnerLoad: { label: "Foot-strike load proxy", hudLabel: "Repeated foot strike" },
};

const presets = {
  paper: {
    mode: "space",
    objectType: "paper",
    motionMode: "stand",
    target: "tibia",
    mass: 5,
    speed: 82,
    angle: 76,
    contactArea: 2,
    boneIndex: 0.74,
    microgravityDays: 240,
    fatigue: 0.48,
    painScore: 6,
    swelling: "moderate",
    mobility: "limited",
    sensationChange: false,
  },
  eva: {
    mode: "space",
    objectType: "evaTool",
    motionMode: "stand",
    target: "ankle",
    mass: 92,
    speed: 18,
    angle: 54,
    contactArea: 18,
    boneIndex: 0.84,
    microgravityDays: 210,
    fatigue: 0.48,
    painScore: 6,
    swelling: "moderate",
    mobility: "limited",
    sensationChange: false,
  },
  runner: {
    mode: "sport",
    objectType: "runnerLoad",
    motionMode: "walk",
    target: "tibia",
    mass: 70,
    speed: 12,
    angle: 42,
    contactArea: 68,
    boneIndex: 0.9,
    microgravityDays: 0,
    fatigue: 0.78,
    painScore: 5,
    swelling: "mild",
    mobility: "limited",
    sensationChange: false,
  },
};

const refs = {
  canvas: document.querySelector("#twin-canvas"),
  twinViewGrid: document.querySelector("#twin-view-grid"),
  brandSubtitle: document.querySelector("#brand-subtitle"),
  missionQuestion: document.querySelector("#mission-question"),
  problemCopy: document.querySelector("#problem-copy"),
  solutionCopy: document.querySelector("#solution-copy"),
  lifecycleTitle: document.querySelector("#lifecycle-title"),
  helpPrevent: document.querySelector("#help-prevent"),
  helpAssess: document.querySelector("#help-assess"),
  helpRespond: document.querySelector("#help-respond"),
  helpMonitor: document.querySelector("#help-monitor"),
  guidedDemo: document.querySelector("#guided-demo"),
  sceneDecisionScore: document.querySelector("#scene-decision-score"),
  sceneEvidenceCount: document.querySelector("#scene-evidence-count"),
  riskScore: document.querySelector("#risk-score"),
  riskStatus: document.querySelector("#risk-status"),
  loadPath: document.querySelector("#load-path"),
  impactObjectLabel: document.querySelector("#impact-object-label"),
  activeObjectName: document.querySelector("#active-object-name"),
  energyMetric: document.querySelector("#energy-metric"),
  stressMetric: document.querySelector("#stress-metric"),
  fragilityMetric: document.querySelector("#fragility-metric"),
  confidenceMetric: document.querySelector("#confidence-metric"),
  targetRegion: document.querySelector("#target-region"),
  mass: document.querySelector("#mass"),
  speed: document.querySelector("#speed"),
  angle: document.querySelector("#angle"),
  contactArea: document.querySelector("#contact-area"),
  boneIndex: document.querySelector("#bone-index"),
  microgravityDays: document.querySelector("#microgravity-days"),
  fatigue: document.querySelector("#fatigue"),
  painScore: document.querySelector("#pain-score"),
  swelling: document.querySelector("#swelling"),
  mobility: document.querySelector("#mobility"),
  sensationChange: document.querySelector("#sensation-change"),
  massOutput: document.querySelector("#mass-output"),
  speedOutput: document.querySelector("#speed-output"),
  angleOutput: document.querySelector("#angle-output"),
  areaOutput: document.querySelector("#area-output"),
  boneOutput: document.querySelector("#bone-output"),
  daysOutput: document.querySelector("#days-output"),
  fatigueOutput: document.querySelector("#fatigue-output"),
  painOutput: document.querySelector("#pain-output"),
  spaceFields: document.querySelector("#space-fields"),
  sportFields: document.querySelector("#sport-fields"),
  assistantMode: document.querySelector("#assistant-mode"),
  supportPanelTitle: document.querySelector("#support-panel-title"),
  conditionHeading: document.querySelector("#condition-heading"),
  mobilityLabel: document.querySelector("#mobility-label"),
  tabLabelEvidence: document.querySelector("#tab-label-evidence"),
  tabLabelImpact: document.querySelector("#tab-label-impact"),
  tabLabelBone: document.querySelector("#tab-label-bone"),
  tabLabelDecision: document.querySelector("#tab-label-decision"),
  responseTimelineLabel: document.querySelector("#response-timeline-label"),
  chatLog: document.querySelector("#chat-log"),
  chatForm: document.querySelector("#chat-form"),
  chatInput: document.querySelector("#chat-input"),
  resetButton: document.querySelector("#reset-button"),
  aiPanel: document.querySelector("#ai-panel"),
  aiDecision: document.querySelector("#ai-decision"),
  aiProbability: document.querySelector("#ai-probability"),
  aiMaskArea: document.querySelector("#ai-mask-area"),
  aiOverlay: document.querySelector("#ai-overlay"),
  aiEmptyState: document.querySelector("#ai-empty-state"),
  aiEmptyText: document.querySelector("#ai-empty-text"),
  aiWarning: document.querySelector("#ai-warning"),
  loadDemoPrediction: document.querySelector("#load-demo-prediction"),
  importPrediction: document.querySelector("#import-prediction"),
  clearPrediction: document.querySelector("#clear-prediction"),
  predictionFile: document.querySelector("#prediction-file"),
  workflowTabs: [...document.querySelectorAll(".workflow-tab")],
  stagePanels: [...document.querySelectorAll("[data-stage-panel]")],
  stageKicker: document.querySelector("#stage-kicker"),
  stageTitle: document.querySelector("#stage-title"),
  stageDescription: document.querySelector("#stage-description"),
  workflowBack: document.querySelector("#workflow-back"),
  workflowNext: document.querySelector("#workflow-next"),
  workflowProgress: document.querySelector("#workflow-progress"),
  decisionSummary: document.querySelector("#decision-summary"),
  decisionGauge: document.querySelector("#decision-gauge"),
  decisionScore: document.querySelector("#decision-score"),
  decisionBand: document.querySelector("#decision-band"),
  decisionTitle: document.querySelector("#decision-title"),
  decisionRecommendation: document.querySelector("#decision-recommendation"),
  decisionCoverage: document.querySelector("#decision-coverage"),
  decisionUncertainty: document.querySelector("#decision-uncertainty"),
  decisionRationale: document.querySelector("#decision-rationale"),
  sourceImagingValue: document.querySelector("#source-imaging-value"),
  sourceImpactValue: document.querySelector("#source-impact-value"),
  sourceFragilityValue: document.querySelector("#source-fragility-value"),
  sourceImagingBar: document.querySelector("#source-imaging-bar"),
  sourceImpactBar: document.querySelector("#source-impact-bar"),
  sourceFragilityBar: document.querySelector("#source-fragility-bar"),
  carePriority: document.querySelector("#care-priority"),
  careSummary: document.querySelector("#care-summary"),
  careActions: document.querySelector("#care-actions"),
  logObservation: document.querySelector("#log-observation"),
  exportHandoff: document.querySelector("#export-handoff"),
  exportCompetitionBrief: document.querySelector("#export-competition-brief"),
  exportValidationReport: document.querySelector("#export-validation-report"),
  observationCount: document.querySelector("#observation-count"),
  protocolNote: document.querySelector("#protocol-note"),
  timelineSteps: [...document.querySelectorAll(".timeline-step")],
  modeButtons: [...document.querySelectorAll(".mode-button")],
  motionButtons: [...document.querySelectorAll(".motion-button")],
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111613);
scene.fog = new THREE.Fog(0x111613, 7, 15);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(4.8, 2.3, 6.8);

const renderer = new THREE.WebGLRenderer({
  canvas: refs.canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, refs.twinViewGrid);
controls.target.set(0, -0.1, 0);
controls.enableDamping = true;
controls.minDistance = 3.6;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI * 0.88;

scene.add(new THREE.HemisphereLight(0xdcefe8, 0x16211d, 2.4));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(4, 5, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x85ffd9, 1.4);
rimLight.position.set(-4, 1, -3);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 18),
  new THREE.MeshStandardMaterial({
    color: 0x26302b,
    roughness: 0.78,
    metalness: 0.08,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -4.4;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(18, 18, 0x4a5c53, 0x303c37);
grid.position.y = -4.38;
scene.add(grid);

const boneMaterial = new THREE.MeshStandardMaterial({
  color: 0xf3ead8,
  roughness: 0.52,
  metalness: 0.08,
});
const jointMaterial = new THREE.MeshStandardMaterial({
  color: 0xe5d5bd,
  roughness: 0.48,
});
const stressMaterial = new THREE.MeshStandardMaterial({
  color: 0xc58218,
  emissive: 0x8f3900,
  emissiveIntensity: 0.25,
  transparent: true,
  opacity: 0.72,
});
const envelopeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x7bd3c2,
  transparent: true,
  opacity: 0.12,
  roughness: 0.32,
  metalness: 0,
  transmission: 0.25,
  depthWrite: false,
});
const crackMaterial = new THREE.LineBasicMaterial({ color: 0xff564f, linewidth: 2 });

const leg = new THREE.Group();
leg.rotation.y = -0.26;
leg.position.y = 1.28;
scene.add(leg);

const rig = buildLegRig();
leg.add(rig.root);

const externalSkeleton = {
  group: new THREE.Group(),
  model: null,
  mixer: null,
  action: null,
  clip: null,
  bones: {},
  neutralPose: {},
  loaded: false,
};
const SKELETON_MODEL_URLS = [
  "/models/grumpy_skeleton_walk_cycle.glb",
  "https://raw.githubusercontent.com/mysunatislam/astrobone-twin/main/public/models/grumpy_skeleton_walk_cycle.glb",
];
externalSkeleton.group.name = "Rigged skeleton GLB display";
externalSkeleton.group.position.set(-0.1, 0.45, -0.1);
externalSkeleton.group.rotation.y = -0.32;
scene.add(externalSkeleton.group);
loadRiggedSkeleton();

const impactMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 24, 24),
  stressMaterial,
);
impactMarker.castShadow = true;
scene.add(impactMarker);

const stressRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.42, 0.015, 12, 80),
  stressMaterial,
);
stressRing.rotation.x = Math.PI / 2;
scene.add(stressRing);

const crackLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.12, 0.02, 0),
    new THREE.Vector3(-0.04, -0.12, 0.02),
    new THREE.Vector3(0.04, -0.02, -0.03),
    new THREE.Vector3(0.12, -0.18, 0.02),
  ]),
  crackMaterial,
);
scene.add(crackLine);

const projectile = new THREE.Group();
projectile.name = "Scenario impact object";
const projectileModels = {
  paper: createPaperProjectile(),
  evaTool: createEvaToolProjectile(),
  runnerLoad: createRunnerLoadProjectile(),
};
Object.entries(projectileModels).forEach(([objectType, model]) => {
  model.userData.objectType = objectType;
  projectile.add(model);
});
scene.add(projectile);

const arrow = new THREE.ArrowHelper(
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, 0),
  1,
  0x5fe0c8,
  0.25,
  0.12,
);
scene.add(arrow);

const normalArrow = new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 0),
  0.7,
  0xf2b44b,
  0.16,
  0.08,
);
scene.add(normalArrow);

let latestModel = calculateRisk(state);
let latestDecision = calculateDecision({
  physicsScore: latestModel.score,
  fragility: latestModel.fragility,
});
let latestCarePlan = calculateCarePlan({
  mode: state.mode,
  decisionBand: latestDecision.band.key,
  aiLoaded: aiState.loaded,
  painScore: state.painScore,
  swelling: state.swelling,
  mobility: state.mobility,
  sensationChange: state.sensationChange,
});
let animationStart = performance.now();
let animationPhase = 0;

function createPaperProjectile() {
  const group = new THREE.Group();
  group.name = "Ultra-thin paper rectangle";

  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.31),
    new THREE.MeshStandardMaterial({
      color: 0xf5f2e7,
      emissive: 0x24221d,
      emissiveIntensity: 0.05,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  sheet.castShadow = true;
  sheet.receiveShadow = true;
  group.add(sheet);

  const edge = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.24, -0.155, 0.002),
      new THREE.Vector3(0.24, -0.155, 0.002),
      new THREE.Vector3(0.24, 0.155, 0.002),
      new THREE.Vector3(-0.24, 0.155, 0.002),
    ]),
    new THREE.LineBasicMaterial({ color: 0xa5aaa3 }),
  );
  group.add(edge);
  return group;
}

function createEvaToolProjectile() {
  const group = new THREE.Group();
  group.name = "EVA hand tool";

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.55, 16),
    new THREE.MeshStandardMaterial({
      color: 0xd3d9dc,
      roughness: 0.34,
      metalness: 0.55,
    }),
  );
  handle.rotation.z = Math.PI / 2;
  handle.castShadow = true;
  group.add(handle);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.22, 0.13),
    new THREE.MeshStandardMaterial({
      color: 0x9aa6ad,
      roughness: 0.3,
      metalness: 0.68,
    }),
  );
  head.position.x = 0.31;
  head.castShadow = true;
  group.add(head);

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.068, 0.24, 16),
    new THREE.MeshStandardMaterial({
      color: 0x2d3935,
      roughness: 0.82,
    }),
  );
  grip.rotation.z = Math.PI / 2;
  grip.position.x = -0.12;
  group.add(grip);
  return group;
}

function createRunnerLoadProjectile() {
  const group = new THREE.Group();
  group.name = "Foot-strike load proxy";

  const sole = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.12, 0.27),
    new THREE.MeshStandardMaterial({
      color: 0xc7d1cc,
      roughness: 0.72,
      metalness: 0.02,
    }),
  );
  sole.castShadow = true;
  group.add(sole);

  const heel = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0x4b5954,
      roughness: 0.78,
    }),
  );
  heel.position.x = -0.24;
  heel.position.y = 0.08;
  heel.castShadow = true;
  group.add(heel);
  return group;
}

function buildLegRig() {
  const root = new THREE.Group();
  root.name = "Procedural leg rig";

  const skeletonRoot = new THREE.Bone();
  skeletonRoot.name = "hip";
  skeletonRoot.position.set(0, 0, 0);
  const kneeBone = new THREE.Bone();
  kneeBone.name = "knee";
  kneeBone.position.y = -2.16;
  const ankleBone = new THREE.Bone();
  ankleBone.name = "ankle";
  ankleBone.position.y = -2;
  const toeBone = new THREE.Bone();
  toeBone.name = "toe";
  toeBone.position.set(0.86, -0.15, 0.1);
  skeletonRoot.add(kneeBone);
  kneeBone.add(ankleBone);
  ankleBone.add(toeBone);
  root.add(skeletonRoot);

  const helper = new THREE.SkeletonHelper(skeletonRoot);
  helper.material.color.set(0x66dbc8);
  helper.material.opacity = 0.65;
  helper.material.transparent = true;
  root.add(helper);

  const pelvis = new THREE.Group();
  pelvis.name = "Pelvis support";
  pelvis.add(segmentMesh(1.35, 0.18, "pelvis-left", Math.PI / 2, 0, 0));
  pelvis.children[0].position.set(-0.22, 0.25, 0);
  const pelvisRight = segmentMesh(1.35, 0.18, "pelvis-right", Math.PI / 2, 0, 0);
  pelvisRight.position.set(0.22, 0.25, 0);
  pelvis.add(pelvisRight);
  root.add(pelvis);

  const hipJoint = jointMesh(0.24, "hip joint");
  hipJoint.position.set(0, 0, 0);
  root.add(hipJoint);

  const femurPivot = new THREE.Group();
  femurPivot.name = "Femur pivot";
  femurPivot.position.set(0, 0, 0);
  root.add(femurPivot);

  const femur = segmentMesh(2.16, 0.15, "femur", 0, 0, 0);
  femur.position.y = -1.08;
  femur.castShadow = true;
  femurPivot.add(femur);

  const kneePivot = new THREE.Group();
  kneePivot.name = "Knee pivot";
  kneePivot.position.y = -2.16;
  femurPivot.add(kneePivot);

  const kneeJoint = jointMesh(0.22, "knee joint");
  kneePivot.add(kneeJoint);

  const patella = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 32, 16).scale(1, 1.25, 0.5),
    jointMaterial,
  );
  patella.name = "patella";
  patella.position.set(0, -0.05, 0.25);
  patella.castShadow = true;
  kneePivot.add(patella);

  const shinPivot = new THREE.Group();
  shinPivot.name = "Shin pivot";
  kneePivot.add(shinPivot);

  const tibia = segmentMesh(1.98, 0.13, "tibia", 0, 0, 0);
  tibia.position.set(0.04, -0.99, 0);
  shinPivot.add(tibia);

  const fibula = segmentMesh(1.86, 0.055, "fibula", 0, 0, 0);
  fibula.position.set(0.24, -0.96, -0.03);
  shinPivot.add(fibula);

  const anklePivot = new THREE.Group();
  anklePivot.name = "Ankle pivot";
  anklePivot.position.y = -1.98;
  shinPivot.add(anklePivot);

  const ankleJoint = jointMesh(0.16, "ankle joint");
  anklePivot.add(ankleJoint);

  const footPivot = new THREE.Group();
  footPivot.name = "Foot pivot";
  footPivot.rotation.z = -0.2;
  anklePivot.add(footPivot);

  const foot = segmentMesh(1.02, 0.11, "foot", 0, 0, Math.PI / 2);
  foot.position.set(0.47, -0.12, 0.08);
  footPivot.add(foot);

  const toes = segmentMesh(0.42, 0.055, "toes", 0, 0, Math.PI / 2);
  toes.position.set(1.1, -0.16, 0.1);
  footPivot.add(toes);

  const envelope = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 3.75, 24, 48).scale(0.82, 1, 0.74),
    envelopeMaterial,
  );
  envelope.name = "transparent leg envelope";
  envelope.position.set(0.08, -2.03, 0.02);
  envelope.renderOrder = 3;
  root.add(envelope);

  return {
    root,
    skeletonRoot,
    kneeBone,
    ankleBone,
    femurPivot,
    shinPivot,
    anklePivot,
    femur,
    tibia,
    fibula,
    kneeJoint,
    ankleJoint,
    envelope,
  };
}

function segmentMesh(length, radius, name, rotX = 0, rotY = 0, rotZ = 0) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 20, 36),
    boneMaterial.clone(),
  );
  mesh.name = name;
  mesh.rotation.set(rotX, rotY, rotZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function jointMesh(radius, name) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 18), jointMaterial);
  mesh.name = name;
  mesh.castShadow = true;
  return mesh;
}

function loadRiggedSkeleton() {
  const loader = new GLTFLoader();
  const loadFromCandidate = (index = 0) => loader.load(
    SKELETON_MODEL_URLS[index],
    (gltf) => {
      const model = gltf.scene;
      model.name = "Rigged human skeleton";
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material = child.material.clone();
            child.material.roughness = 0.5;
            child.material.metalness = 0.02;
          }
        }
      });

      fitModelToTwin(model, 4.35);
      externalSkeleton.group.add(model);
      externalSkeleton.model = model;
      externalSkeleton.bones = {
        root: findObjectByPattern(model, /Hips/i),
        torso: findObjectByPattern(model, /Spine2/i),
        leftArm: findObjectByPattern(model, /LeftArm/i),
        leftForeArm: findObjectByPattern(model, /LeftForeArm/i),
        rightArm: findObjectByPattern(model, /RightArm/i),
        rightForeArm: findObjectByPattern(model, /RightForeArm/i),
        leftUpLeg: findObjectByPattern(model, /LeftUpLeg/i),
        leftLeg: findObjectByPattern(model, /LeftLeg/i),
        leftFoot: findObjectByPattern(model, /LeftFoot/i),
        rightUpLeg: findObjectByPattern(model, /RightUpLeg/i),
        rightLeg: findObjectByPattern(model, /RightLeg/i),
        rightFoot: findObjectByPattern(model, /RightFoot/i),
      };
      externalSkeleton.loaded = Boolean(
        externalSkeleton.bones.leftUpLeg
          && externalSkeleton.bones.leftLeg
          && externalSkeleton.bones.leftFoot,
      );

      if (gltf.animations.length > 0) {
        externalSkeleton.mixer = new THREE.AnimationMixer(model);
        externalSkeleton.clip = gltf.animations[0];
        externalSkeleton.action = externalSkeleton.mixer.clipAction(externalSkeleton.clip);
        externalSkeleton.action.play();
        captureRigPose(externalSkeleton, 0.25);
      }

      leg.visible = false;
      updateScene();
      appendAssistantMessage(
        "Rigged skeleton GLB loaded. I am using its Mixamo leg bones for the impact hotspot while keeping the procedural leg as the hidden physics proxy.",
      );
    },
    undefined,
    (error) => {
      if (index + 1 < SKELETON_MODEL_URLS.length) {
        loadFromCandidate(index + 1);
        return;
      }
      console.warn("Rigged skeleton failed to load; using procedural fallback.", error);
      leg.visible = true;
    },
  );

  loadFromCandidate();
}

function fitModelToTwin(model, targetHeight) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.001);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale - 0.45, -center.z * scale);
}

function findObjectByPattern(root, pattern) {
  let match = null;
  root.traverse((object) => {
    if (!match && pattern.test(object.name || "")) {
      match = object;
    }
  });
  return match;
}

function captureRigPose(rigState, normalizedPhase) {
  if (!rigState.mixer || !rigState.clip) return;
  const duration = Math.max(rigState.clip.duration, 0.001);
  rigState.mixer.setTime(THREE.MathUtils.euclideanModulo(normalizedPhase, 1) * duration);
  rigState.model?.updateMatrixWorld(true);
  rigState.neutralPose = {};

  Object.entries(rigState.bones).forEach(([key, bone]) => {
    if (!bone) return;
    rigState.neutralPose[key] = {
      quaternion: bone.quaternion.clone(),
      position: bone.position.clone(),
      scale: bone.scale.clone(),
    };
  });
}

function updateFromInputs() {
  state.target = refs.targetRegion.value;
  state.mass = Number(refs.mass.value);
  state.speed = Number(refs.speed.value);
  state.angle = Number(refs.angle.value);
  state.contactArea = Number(refs.contactArea.value);
  state.boneIndex = Number(refs.boneIndex.value) / 100;
  state.microgravityDays = Number(refs.microgravityDays.value);
  state.fatigue = Number(refs.fatigue.value) / 100;
  state.painScore = Number(refs.painScore.value);
  state.swelling = refs.swelling.value;
  state.mobility = refs.mobility.value;
  state.sensationChange = refs.sensationChange.checked;
  latestModel = calculateRisk(state);
  updateUi();
  updateScene();
}

function syncInputs() {
  refs.targetRegion.value = state.target;
  refs.mass.value = state.mass;
  refs.speed.value = state.speed;
  refs.angle.value = state.angle;
  refs.contactArea.value = state.contactArea;
  refs.boneIndex.value = Math.round(state.boneIndex * 100);
  refs.microgravityDays.value = state.microgravityDays;
  refs.fatigue.value = Math.round(state.fatigue * 100);
  refs.painScore.value = state.painScore;
  refs.swelling.value = state.swelling;
  refs.mobility.value = state.mobility;
  refs.sensationChange.checked = state.sensationChange;
  refs.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  refs.motionButtons.forEach((button) => {
    const isActive = button.dataset.motion === state.motionMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  refs.spaceFields.classList.toggle("hidden", state.mode !== "space");
  refs.sportFields.classList.toggle("hidden", state.mode !== "sport");
  refs.assistantMode.textContent = state.mode === "space" ? "Crew mode" : "Sports mode";
  updateMissionCopy();
}

function updateUi() {
  latestDecision = calculateDecision({
    physicsScore: latestModel.score,
    fragility: latestModel.fragility,
    aiLoaded: aiState.loaded,
    fractureProbability: aiState.fractureProbability,
    physicsConfidence: latestModel.confidence,
  });

  refs.massOutput.textContent = `${state.mass} g`;
  refs.speedOutput.textContent = `${state.speed} m/s`;
  refs.angleOutput.textContent = `${state.angle} deg`;
  refs.areaOutput.textContent = `${state.contactArea} mm2`;
  refs.boneOutput.textContent = state.boneIndex.toFixed(2);
  refs.daysOutput.textContent = `${state.microgravityDays} d`;
  refs.fatigueOutput.textContent = `${Math.round(state.fatigue * 100)}%`;
  refs.painOutput.textContent = `${state.painScore} / 10`;
  refs.impactObjectLabel.textContent = OBJECT_META[state.objectType].hudLabel;
  refs.activeObjectName.textContent = OBJECT_META[state.objectType].label;

  latestCarePlan = calculateCarePlan({
    mode: state.mode,
    decisionBand: latestDecision.band.key,
    aiLoaded: aiState.loaded,
    painScore: state.painScore,
    swelling: state.swelling,
    mobility: state.mobility,
    sensationChange: state.sensationChange,
  });

  refs.riskScore.textContent = `${Math.round(latestModel.score)}/100`;
  refs.riskStatus.textContent = aiState.loaded
    ? latestDecision.band.label
    : `${latestModel.status} / incomplete`;
  refs.loadPath.textContent = `${Math.round(latestModel.normalComponent * 100)}% normal load path`;
  refs.energyMetric.textContent = `${latestModel.kineticEnergy.toFixed(1)} J`;
  refs.stressMetric.textContent = `${latestModel.energyDensity.toFixed(2)} J/mm2`;
  refs.fragilityMetric.textContent = `${latestModel.fragility.toFixed(2)}x`;
  refs.confidenceMetric.textContent = latestModel.confidence;
  refs.sceneDecisionScore.textContent = aiState.loaded
    ? `${latestDecision.score}/100`
    : "Incomplete";
  refs.sceneEvidenceCount.textContent = `${latestDecision.sourceCount} of 3`;

  const riskColor = getRiskColor(aiState.loaded ? latestDecision.score : latestModel.score);
  refs.riskScore.style.color = riskColor.css;
  refs.riskStatus.style.color = riskColor.css;
  updateAiUi();
  updateDecisionUi();
  updateCarePlanUi();
}

function updateMissionCopy() {
  if (state.mode === "space") {
    refs.brandSubtitle.textContent =
      "Onboard musculoskeletal decision support for exploration crews";
    refs.missionQuestion.textContent =
      "Can a modest impact become dangerous when bone reserve is reduced?";
    refs.problemCopy.textContent =
      "In deep space, bone reserve may be reduced while evacuation, resupply, and real-time specialist support are limited.";
    refs.solutionCopy.textContent =
      "Screen risk before a task, assess an event, guide an approved crew response, monitor change, and export a medical handoff.";
    refs.lifecycleTitle.textContent =
      "One onboard workflow from prevention to delayed medical handoff";
    refs.helpPrevent.textContent =
      "Screen planned EVA tasks and loose-object impacts before exposure.";
    refs.helpAssess.textContent =
      "Fuse imaging, event mechanics, skeletal reserve, and crew condition.";
    refs.helpRespond.textContent =
      "Turn urgency into a checkable, protocol-linked crew action plan.";
    refs.helpMonitor.textContent =
      "Log change and package evidence for flight-surgeon review.";
    refs.guidedDemo.textContent = "Run guided space case";
    refs.tabLabelEvidence.textContent = "Scan";
    refs.tabLabelImpact.textContent = "Event";
    refs.tabLabelBone.textContent = "Crew";
    refs.tabLabelDecision.textContent = "Response";
    refs.supportPanelTitle.textContent = "Crew medical support";
    refs.conditionHeading.textContent = "Crew condition";
    refs.mobilityLabel.textContent = "Ability to use limb";
    refs.responseTimelineLabel.textContent = "Crew response";
    return;
  }

  refs.brandSubtitle.textContent =
    "Explainable stress-injury decision support for athletes and clinicians";
  refs.missionQuestion.textContent =
    "Can repeated loading become a stress injury before a complete fracture appears?";
  refs.problemCopy.textContent =
    "In sport, repetitive impact, fatigue, and incomplete recovery can accumulate damage before the athlete has a clear structural warning.";
  refs.solutionCopy.textContent =
    "Screen training load, assess injury evidence, guide load modification, monitor recovery, and export a clinician handoff.";
  refs.lifecycleTitle.textContent =
    "One workflow from training-load prevention to return-to-care handoff";
  refs.helpPrevent.textContent =
    "Screen training load and recovery before a high-risk session.";
  refs.helpAssess.textContent =
    "Fuse imaging, repeated loading, fatigue, and athlete condition.";
  refs.helpRespond.textContent =
    "Turn urgency into a checkable load-management and review plan.";
  refs.helpMonitor.textContent =
    "Log symptoms and function for sports-medicine review.";
  refs.guidedDemo.textContent = "Run guided sport case";
  refs.tabLabelEvidence.textContent = "Image";
  refs.tabLabelImpact.textContent = "Load";
  refs.tabLabelBone.textContent = "Athlete";
  refs.tabLabelDecision.textContent = "Plan";
  refs.supportPanelTitle.textContent = "Athlete support";
  refs.conditionHeading.textContent = "Athlete condition";
  refs.mobilityLabel.textContent = "Ability to train or bear load";
  refs.responseTimelineLabel.textContent = "Recovery plan";
}

function updateAiUi() {
  refs.aiPanel.classList.toggle("detected", aiState.loaded && aiState.fractureDetected);
  refs.aiPanel.classList.toggle("clear", aiState.loaded && !aiState.fractureDetected);
  refs.aiDecision.textContent = !aiState.loaded
    ? "Not loaded"
    : aiState.fractureDetected
      ? "Detected"
      : "Not detected";
  refs.aiProbability.textContent = aiState.loaded
    ? `${(aiState.fractureProbability * 100).toFixed(1)}%`
    : "--";
  refs.aiMaskArea.textContent = aiState.loaded
    ? `${(aiState.maskAreaFraction * 100).toFixed(2)}%`
    : "--";
  refs.aiWarning.textContent = aiState.warning;

  if (aiState.overlaySrc) {
    refs.aiOverlay.src = aiState.overlaySrc;
    refs.aiOverlay.classList.remove("hidden");
    refs.aiEmptyState.classList.add("hidden");
  } else {
    refs.aiOverlay.removeAttribute("src");
    refs.aiOverlay.classList.add("hidden");
    refs.aiEmptyState.classList.remove("hidden");
    refs.aiEmptyText.textContent = aiState.loaded
      ? "Prediction loaded without a browser-accessible overlay."
      : "No image result is connected to this case.";
  }
}

function updateDecisionUi() {
  const { score, band } = latestDecision;
  const gaugeColor = band.key === "high"
    ? "#b7372f"
    : band.key === "watch"
      ? "#bd7b13"
      : "#2f8f46";

  refs.decisionSummary.dataset.band = aiState.loaded ? band.key : "incomplete";
  refs.decisionGauge.style.setProperty("--score-angle", `${score * 3.6}deg`);
  refs.decisionGauge.style.setProperty("--gauge-color", aiState.loaded ? gaugeColor : "#9eaaa4");
  refs.decisionScore.textContent = aiState.loaded ? String(score) : "--";
  refs.decisionBand.textContent = aiState.loaded ? band.label : "Incomplete evidence";
  refs.decisionTitle.textContent = aiState.loaded
    ? band.title
    : "Connect all three evidence sources";
  refs.decisionRecommendation.textContent = latestDecision.recommendation;
  refs.decisionCoverage.textContent = `${latestDecision.sourceCount} of 3 sources`;
  refs.decisionUncertainty.textContent = latestDecision.uncertainty;
  refs.decisionRationale.textContent = latestDecision.rationale;

  refs.sourceImagingValue.textContent = latestDecision.imagingScore === null
    ? "Missing"
    : `${latestDecision.imagingScore.toFixed(1)}/100`;
  refs.sourceImpactValue.textContent = `${latestDecision.impactScore.toFixed(0)}/100`;
  refs.sourceFragilityValue.textContent = `${latestDecision.fragilityScore.toFixed(0)}/100`;
  refs.sourceImagingBar.style.width = `${latestDecision.imagingScore ?? 0}%`;
  refs.sourceImpactBar.style.width = `${latestDecision.impactScore}%`;
  refs.sourceFragilityBar.style.width = `${latestDecision.fragilityScore}%`;
}

function updateCarePlanUi() {
  refs.carePriority.textContent = latestCarePlan.priority.label;
  refs.carePriority.dataset.priority = latestCarePlan.priority.key;
  refs.careSummary.textContent = latestCarePlan.summary;
  refs.protocolNote.textContent = latestCarePlan.protocolNote;
  refs.careActions.replaceChildren();

  latestCarePlan.actions.forEach((action, index) => {
    const label = document.createElement("label");
    label.className = "care-action";
    label.classList.toggle("completed", completedCareActions.has(action.id));

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = completedCareActions.has(action.id);
    checkbox.setAttribute("aria-label", `Complete action: ${action.label}`);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        completedCareActions.add(action.id);
      } else {
        completedCareActions.delete(action.id);
      }
      label.classList.toggle("completed", checkbox.checked);
    });

    const number = document.createElement("span");
    number.className = "care-action-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const content = document.createElement("span");
    content.className = "care-action-content";
    const phase = document.createElement("small");
    phase.textContent = action.phase;
    const title = document.createElement("strong");
    title.textContent = action.label;
    const detail = document.createElement("span");
    detail.textContent = action.detail;
    content.append(phase, title, detail);

    label.append(checkbox, number, content);
    refs.careActions.appendChild(label);
  });

  updateObservationCount();
}

function updateObservationCount() {
  const count = incidentLog.length;
  refs.observationCount.textContent = `${count} observation${count === 1 ? "" : "s"}`;
}

function updateScene() {
  setActiveProjectile(state.objectType);
  const flex = state.mode === "sport" ? 0.24 : 0.08;
  rig.femurPivot.rotation.x = THREE.MathUtils.degToRad(3);
  rig.shinPivot.rotation.x = flex + latestModel.score * 0.0018;
  rig.anklePivot.rotation.x = -0.12 - latestModel.score * 0.0009;
  rig.kneeBone.rotation.x = rig.shinPivot.rotation.x;
  rig.ankleBone.rotation.x = rig.anklePivot.rotation.x;
  rig.envelope.material.opacity = state.mode === "space" ? 0.11 : 0.16;

  const riskColor = getRiskColor(latestModel.score);
  [rig.femur, rig.tibia, rig.fibula].forEach((mesh) => {
    mesh.material.color.set(0xf3ead8);
    mesh.material.emissive = new THREE.Color(0x000000);
    mesh.material.emissiveIntensity = 0;
  });
  const targetMesh = state.target === "femur" ? rig.femur : rig.tibia;
  targetMesh.material.color.set(riskColor.hex);
  targetMesh.material.emissive = new THREE.Color(riskColor.hex);
  targetMesh.material.emissiveIntensity = latestModel.score / 220;

  const impactPoint = getImpactPoint();
  const direction = getImpactDirection();
  stressMaterial.color.set(riskColor.hex);
  stressMaterial.emissive.set(riskColor.hex);
  stressMaterial.opacity = 0.36 + latestModel.score / 180;

  updateImpactVisuals({
    impactPoint,
    direction,
    viewCamera: camera,
    marker: impactMarker,
    ring: stressRing,
    fracture: crackLine,
    loadArrow: arrow,
    surfaceNormalArrow: normalArrow,
    projectileGroup: projectile,
  });
}

function updateImpactVisuals({
  impactPoint,
  direction,
  viewCamera,
  marker,
  ring,
  fracture,
  loadArrow,
  surfaceNormalArrow,
  projectileGroup,
}) {
  marker.position.copy(impactPoint);
  ring.position.copy(impactPoint);
  ring.lookAt(viewCamera.position);
  ring.scale.setScalar(0.42 + latestModel.score / 180);

  fracture.position.copy(impactPoint);
  fracture.lookAt(viewCamera.position);
  fracture.scale.setScalar(0.4 + latestModel.score / 70);
  fracture.visible = latestModel.score >= 42;

  const start = impactPoint.clone().sub(direction.clone().multiplyScalar(3.1));
  loadArrow.position.copy(start);
  loadArrow.setDirection(direction);
  loadArrow.setLength(3.1, 0.28, 0.12);
  loadArrow.setColor(0x5fe0c8);

  surfaceNormalArrow.position.copy(impactPoint);
  surfaceNormalArrow.setDirection(new THREE.Vector3(1, 0.08, 0.04).normalize());
  surfaceNormalArrow.setLength(
    0.55 + latestModel.normalComponent * 0.65,
    0.16,
    0.08,
  );

  orientProjectile(projectileGroup, direction, viewCamera);
}

function setActiveProjectile(objectType) {
  projectile.children.forEach((model) => {
    model.visible = model.userData.objectType === objectType;
  });
}

function orientProjectile(projectileGroup, direction, viewCamera) {
  if (state.objectType === "paper") {
    const xAxis = direction.clone().normalize();
    const zAxis = viewCamera.position.clone().sub(projectileGroup.position);
    zAxis.addScaledVector(xAxis, -zAxis.dot(xAxis));
    if (zAxis.lengthSq() < 0.0001) zAxis.set(0, 0, 1);
    zAxis.normalize();
    const yAxis = zAxis.clone().cross(xAxis).normalize();
    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    projectileGroup.quaternion.setFromRotationMatrix(basis);
    projectileGroup.rotateX(0.18 + Math.sin(animationPhase * Math.PI * 2) * 0.06);
    projectileGroup.rotateZ(0.04);
    return;
  }

  projectileGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    direction.clone().normalize(),
  );

  if (state.objectType === "runnerLoad") {
    projectileGroup.rotateX(-0.22);
    projectileGroup.rotateZ(0.12);
    return;
  }

  projectileGroup.rotateX(0.16);
}

function getProjectileScale() {
  if (state.objectType === "paper") return 0.46 + latestModel.score / 1800;
  if (state.objectType === "runnerLoad") return 0.8 + latestModel.score / 500;
  return 0.92 + latestModel.score / 340;
}

function getImpactPoint() {
  const externalPoint = getExternalSkeletonImpactPoint();
  if (externalPoint) return externalPoint;

  const points = {
    femur: new THREE.Vector3(0.02, -0.96, 0.25),
    tibia: new THREE.Vector3(0.08, -0.92, 0.25),
    knee: new THREE.Vector3(0.02, -0.05, 0.28),
    ankle: new THREE.Vector3(0.04, 0.02, 0.24),
  };
  const carriers = {
    femur: rig.femurPivot,
    tibia: rig.shinPivot,
    knee: rig.shinPivot,
    ankle: rig.anklePivot,
  };
  return carriers[state.target].localToWorld(points[state.target].clone());
}

function getExternalSkeletonImpactPoint() {
  if (!externalSkeleton.loaded) return null;

  const { leftUpLeg, leftLeg, leftFoot } = externalSkeleton.bones;
  if (!leftUpLeg || !leftLeg || !leftFoot) return null;

  const hip = getWorldPoint(leftUpLeg);
  const knee = getWorldPoint(leftLeg);
  const ankle = getWorldPoint(leftFoot);
  const point = new THREE.Vector3();

  if (state.target === "femur") {
    point.lerpVectors(hip, knee, 0.54);
  } else if (state.target === "knee") {
    point.copy(knee);
  } else if (state.target === "ankle") {
    point.copy(ankle);
  } else {
    point.lerpVectors(knee, ankle, 0.48);
  }

  const lateralOffset = new THREE.Vector3(0.11, 0.02, 0.08);
  return point.add(lateralOffset);
}

function getWorldPoint(object) {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new THREE.Vector3());
}

function getImpactDirection() {
  const angle = THREE.MathUtils.degToRad(state.angle);
  return new THREE.Vector3(Math.sin(angle), -0.13, Math.cos(angle) * 0.56).normalize();
}

function updateLinkedMotion(elapsed) {
  let skeletonPhase = 0.25;
  let lateralOffset = 0;
  let verticalOffset = 0;
  let depthOffset = 0;
  let roll = 0;
  let pitch = 0;

  if (state.motionMode === "walk") {
    const cycle = (elapsed * 0.58) % 1;
    skeletonPhase = cycle;
    verticalOffset = Math.abs(Math.sin(cycle * Math.PI * 2)) * 0.012;
  } else if (state.motionMode === "space") {
    const wave = elapsed * 0.55;
    skeletonPhase = 0.23 + Math.sin(wave) * 0.06;
    lateralOffset = Math.sin(wave * 0.72) * 0.08;
    verticalOffset = 0.22 + Math.sin(wave) * 0.11;
    depthOffset = Math.cos(wave * 0.64) * 0.02;
    roll = Math.sin(wave * 0.7) * 0.05;
    pitch = -0.06 + Math.cos(wave * 0.58) * 0.022;
  }

  setRigAnimationPhase(externalSkeleton, skeletonPhase);
  lockRigRootTransform(externalSkeleton);
  if (state.motionMode === "walk") {
    blendRigTowardNeutral(externalSkeleton, {
      torso: 0.7,
      upperArm: 0.52,
      foreArm: 0.55,
      thigh: 0.78,
      shin: 0.8,
      foot: 0.85,
    });
  } else if (state.motionMode === "space") {
    blendRigTowardNeutral(externalSkeleton, {
      torso: 0.82,
      upperArm: 0.88,
      foreArm: 0.9,
      thigh: 0.9,
      shin: 0.92,
      foot: 0.94,
    });
  }

  externalSkeleton.group.position.set(
    -0.1 + lateralOffset,
    0.45 + verticalOffset,
    -0.1 + depthOffset,
  );
  externalSkeleton.group.rotation.set(pitch, -0.32, roll);
}

function setRigAnimationPhase(rigState, normalizedPhase) {
  if (!rigState.mixer || !rigState.clip) return;
  const duration = Math.max(rigState.clip.duration, 0.001);
  const phase = THREE.MathUtils.euclideanModulo(normalizedPhase, 1);
  rigState.mixer.setTime(phase * duration);
}

function lockRigRootTransform(rigState) {
  const root = rigState.bones.root;
  const neutralRoot = rigState.neutralPose.root;
  if (!root || !neutralRoot) return;
  root.position.copy(neutralRoot.position);
  root.quaternion.copy(neutralRoot.quaternion);
}

function blendRigTowardNeutral(rigState, retention) {
  const pose = rigState.neutralPose;
  if (!pose) return;

  blendBoneToNeutral(rigState.bones.torso, pose.torso, retention.torso);
  blendBoneToNeutral(rigState.bones.leftArm, pose.leftArm, retention.upperArm);
  blendBoneToNeutral(rigState.bones.rightArm, pose.rightArm, retention.upperArm);
  blendBoneToNeutral(
    rigState.bones.leftForeArm,
    pose.leftForeArm,
    retention.foreArm,
  );
  blendBoneToNeutral(
    rigState.bones.rightForeArm,
    pose.rightForeArm,
    retention.foreArm,
  );
  blendBoneToNeutral(rigState.bones.leftUpLeg, pose.leftUpLeg, retention.thigh);
  blendBoneToNeutral(rigState.bones.rightUpLeg, pose.rightUpLeg, retention.thigh);
  blendBoneToNeutral(rigState.bones.leftLeg, pose.leftLeg, retention.shin);
  blendBoneToNeutral(rigState.bones.rightLeg, pose.rightLeg, retention.shin);
  blendBoneToNeutral(rigState.bones.leftFoot, pose.leftFoot, retention.foot);
  blendBoneToNeutral(rigState.bones.rightFoot, pose.rightFoot, retention.foot);
}

function blendBoneToNeutral(bone, neutralPose, animationRetention) {
  if (!bone || !neutralPose) return;
  const retention = THREE.MathUtils.clamp(animationRetention, 0, 1);
  const animatedQuaternion = bone.quaternion.clone();
  bone.quaternion
    .copy(neutralPose.quaternion)
    .slerp(animatedQuaternion, retention);
}

function setMotionMode(mode) {
  if (!["stand", "walk", "space"].includes(mode)) return;
  state.motionMode = mode;
  syncInputs();

  const messages = {
    stand: "Stand selected. The skeleton holds a stable upright pose for target and load-path inspection.",
    walk: "Normal walk selected. The imported skeleton replays its walking cycle at a human-scale cadence.",
    space: "Space movement selected. The skeleton moves slowly through a floating cycle with gentle translation and body rotation.",
  };
  appendAssistantMessage(messages[mode]);
}

function getRiskColor(score) {
  if (score >= 72) return { css: "#ff756d", hex: 0xff5e56 };
  if (score >= 42) return { css: "#f2b44b", hex: 0xf2b44b };
  return { css: "#65d479", hex: 0x65d479 };
}

async function loadDemoPrediction(targetRegion = state.target) {
  const response = await fetch("/inference/demo/IMG0001739_prediction.json");
  if (!response.ok) {
    throw new Error(`Prediction JSON failed to load: ${response.status}`);
  }
  const payload = await response.json();
  applyAiPrediction(payload, "/inference/demo/IMG0001739_overlay.png", targetRegion);
}

function applyAiPrediction(payload, overlaySrc = "", targetRegion = "") {
  aiState.loaded = true;
  aiState.fractureProbability = Number(payload.fractureProbability ?? 0);
  aiState.fractureDetected = Boolean(payload.fractureDetected);
  aiState.maskAreaFraction = Number(payload.maskAreaFraction ?? 0);
  aiState.overlaySrc = overlaySrc || normalizeOverlayPath(payload.overlayPath || "");
  aiState.warning = payload.modelWarning || "Research prototype only. Not a clinical diagnosis.";

  if (targetRegion) {
    state.target = targetRegion;
    syncInputs();
  }

  latestModel = calculateRisk(state);
  updateUi();
  updateScene();
  appendAssistantMessage(
    aiState.fractureDetected
      ? `AI X-ray result loaded: fracture probability <strong>${(aiState.fractureProbability * 100).toFixed(1)}%</strong>. The combined review signal is now <strong>${latestDecision.score}/100</strong>, with the ${TARGET_META[state.target].label.toLowerCase()} used as the 3D hotspot.`
      : `AI X-ray result loaded: fracture probability <strong>${(aiState.fractureProbability * 100).toFixed(1)}%</strong>. No visible fracture was detected by the research model.`,
  );
}

function clearAiPrediction({ announce = true } = {}) {
  aiState.loaded = false;
  aiState.fractureProbability = null;
  aiState.fractureDetected = false;
  aiState.maskAreaFraction = null;
  aiState.overlaySrc = "";
  aiState.warning = "Research output only. Not a clinical diagnosis.";
  updateUi();
  if (announce) {
    appendAssistantMessage(
      "AI X-ray result cleared. The decision is marked incomplete until structural image evidence is connected again.",
    );
  }
}

function normalizeOverlayPath(path) {
  if (!path) return "";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  return "";
}

function logObservation() {
  incidentLog.push({
    recordedAt: new Date().toISOString(),
    crewCondition: {
      painScore: state.painScore,
      swelling: state.swelling,
      mobility: state.mobility,
      sensationChange: state.sensationChange,
    },
    combinedSignal: aiState.loaded ? latestDecision.score : null,
    impactDemand: Math.round(latestModel.score),
    carePriority: latestCarePlan.priority.label,
    completedActions: [...completedCareActions],
  });
  updateObservationCount();
  appendAssistantMessage(
    `Observation ${incidentLog.length} recorded with pain <strong>${state.painScore}/10</strong>, ${state.swelling} swelling, and ${state.mobility} limb use.`,
  );
}

function exportHandoffPacket() {
  const packet = {
    schemaVersion: "astrobone-handoff-v1",
    generatedAt: new Date().toISOString(),
    purpose:
      "Research prototype handoff packet for qualified medical or mission review.",
    mode: state.mode,
    scenario: {
      objectType: state.objectType,
      objectLabel: OBJECT_META[state.objectType].label,
      targetRegion: state.target,
      massGrams: state.mass,
      speedMetersPerSecond: state.speed,
      impactAngleDegrees: state.angle,
      contactAreaSquareMillimeters: state.contactArea,
      boneStrengthIndex: state.boneIndex,
      microgravityDays: state.mode === "space" ? state.microgravityDays : null,
      trainingFatigue: state.mode === "sport" ? state.fatigue : null,
    },
    condition: {
      painScore: state.painScore,
      swelling: state.swelling,
      mobility: state.mobility,
      sensationChange: state.sensationChange,
    },
    imageEvidence: {
      loaded: aiState.loaded,
      fractureProbability: aiState.fractureProbability,
      fractureDetected: aiState.fractureDetected,
      maskAreaFraction: aiState.maskAreaFraction,
      modelWarning: aiState.warning,
    },
    impactModel: latestModel,
    combinedDecision: latestDecision,
    responsePlan: {
      priority: latestCarePlan.priority,
      redFlags: latestCarePlan.redFlags,
      summary: latestCarePlan.summary,
      actions: latestCarePlan.actions,
      completedActions: [...completedCareActions],
      protocolNote: latestCarePlan.protocolNote,
    },
    observations: incidentLog,
    limitations: [
      "Not a diagnosis or autonomous treatment system.",
      "Requires an approved medical protocol and qualified oversight.",
      "Impact mechanics and evidence fusion remain research models requiring external validation.",
    ],
  };

  downloadJson("astrobone-handoff", packet);

  appendAssistantMessage(
    "Medical handoff packet exported with the scenario, image evidence, crew condition, model uncertainty, response plan, and observation trend.",
  );
}

function exportCompetitionBrief() {
  const brief = {
    schemaVersion: "astrobone-competition-brief-v1",
    generatedAt: new Date().toISOString(),
    projectName: "AstroBone Twin",
    tagline:
      "Explainable musculoskeletal decision support for exploration crews when care is delayed.",
    problem:
      "Small or moderate impacts can become harder to judge when bone reserve is reduced and specialist support is delayed.",
    solution:
      "A digital twin links a 3D impact scenario, AI X-ray evidence, impact mechanics, skeletal fragility, crew condition, and a response handoff.",
    currentPrototype: {
      mode: state.mode,
      scenario: OBJECT_META[state.objectType].label,
      targetRegion: TARGET_META[state.target].label,
      impactDemand: Math.round(latestModel.score),
      sourceCoverage: `${latestDecision.sourceCount} of 3`,
      uncertainty: latestDecision.uncertainty,
      carePriority: latestCarePlan.priority.label,
    },
    modelEvidence: {
      classifier: {
        architecture: "DenseNet121 fracture classifier",
        dataset: "FracAtlas prototype split",
        testAuc: 0.899,
        fractureRecall: 0.656,
      },
      segmenter: {
        architecture: "U-Net++ with DenseNet121 encoder",
        dataset: "FracAtlas mask prototype split",
        testDice: 0.394,
      },
      limitations: [
        "Research prototype only, not a diagnosis.",
        "External clinical validation is still required.",
        "External lab contact validation is still required for impact mechanics.",
        "NASA or spaceflight data must be cited or integrated for a NASA competition submission.",
      ],
    },
    judgingAlignment: [
      {
        criterion: "Impact",
        currentStatus:
          "Strong problem framing for exploration crews, delayed care, and prevention-to-handoff workflow.",
      },
      {
        criterion: "Creativity",
        currentStatus:
          "Combines 3D digital twin, fracture AI, mechanics, fragility, and crew response in one workflow.",
      },
      {
        criterion: "Validity",
        currentStatus:
          "Needs stronger biomechanics references, model cards, dataset cards, and simulation validation.",
      },
      {
        criterion: "Relevance",
        currentStatus:
          "Must be mapped to an official competition challenge and supported with NASA/open data citations.",
      },
      {
        criterion: "Presentation",
        currentStatus:
          "Needs a 30-second demo video or seven-slide deck with a clear problem-solution story.",
      },
    ],
    nextUpgrades: [
      "Create a model card and dataset card page inside the app.",
      "Add a validation tab showing formulas, units, assumptions, and comparison cases.",
      "Connect public NASA Human Research Program bone-health citations and open datasets.",
      "Prepare a 30-second narrated demo and seven-slide backup deck.",
      "Publish a public repo or hosted demo link with setup instructions.",
    ],
    sourceLinks: getValidationSourceLinks(),
  };

  downloadJson("astrobone-competition-brief", brief);
  appendAssistantMessage(
    "Competition brief exported with the problem, solution, model evidence, judging alignment, and next validation gaps.",
  );
}

function exportValidationReport() {
  const report = {
    schemaVersion: "astrobone-validation-report-v1",
    generatedAt: new Date().toISOString(),
    purpose:
      "Transparent validation report for judges, reviewers, and future scientific calibration.",
    currentScenario: {
      mode: state.mode,
      objectType: state.objectType,
      objectLabel: OBJECT_META[state.objectType].label,
      targetRegion: TARGET_META[state.target].label,
      massGrams: state.mass,
      speedMetersPerSecond: state.speed,
      impactAngleDegrees: state.angle,
      contactAreaSquareMillimeters: state.contactArea,
      boneStrengthIndex: state.boneIndex,
      microgravityDays: state.mode === "space" ? state.microgravityDays : null,
      trainingFatigue: state.mode === "sport" ? state.fatigue : null,
    },
    mechanicsModel: {
      kineticEnergy: {
        formula: "0.5 * massKg * speedMetersPerSecond^2",
        currentJoules: Number(latestModel.kineticEnergy.toFixed(4)),
      },
      normalLoadComponent: {
        formula: "sin(impactAngleDegrees)",
        currentFraction: Number(latestModel.normalComponent.toFixed(4)),
      },
      effectiveEnergy: {
        formula: "kineticEnergy * (0.22 + normalLoadComponent * 0.78)",
        currentJoules: Number(latestModel.effectiveEnergy.toFixed(4)),
      },
      stressProxy: {
        formula: "effectiveEnergy / max(1, contactAreaSquareMillimeters)",
        currentJoulesPerSquareMillimeter: Number(latestModel.energyDensity.toFixed(4)),
      },
      fragilityMultiplier: {
        formula:
          "0.82 + boneReservePenalty + microgravityTerm + sportFatigueTerm",
        currentMultiplier: Number(latestModel.fragility.toFixed(4)),
      },
      riskScore:
        "Prototype bounded score from stress proxy, effective energy, speed excess, fragility, and target-site modifier.",
      validationStatus: latestModel.confidence,
    },
    imageModelCard: {
      intendedUse:
        "Research triage layer for fracture image evidence within an explainable workflow.",
      nonUse:
        "Not a diagnostic model, not a treatment tool, and not validated for astronaut-specific fracture imaging.",
      classifier: {
        architecture: "DenseNet121",
        dataset: "FracAtlas prototype split",
        testAuc: 0.899,
        fractureRecall: 0.656,
      },
      segmenter: {
        architecture: "U-Net++ with DenseNet121 encoder",
        dataset: "FracAtlas mask prototype split",
        testDice: 0.394,
      },
      failureModes: [
        "Subtle or occult fractures may be missed.",
        "Mask area can be inaccurate with weak boundaries.",
        "Clinical X-ray data does not equal astronaut-specific data.",
        "Image prediction should be reviewed with event mechanics and symptoms.",
      ],
    },
    datasetCard: {
      fractureImaging: {
        dataset: "FracAtlas",
        role: "Prototype fracture classification and segmentation training.",
        limitation:
          "Public musculoskeletal radiographs are a proxy for image evidence, not a spaceflight dataset.",
      },
      spaceflightEvidence: {
        role: "NASA bone-health evidence motivates microgravity fragility inputs.",
        limitation:
          "Astronaut skeletal health data is sensitive and often aggregated or controlled.",
      },
    },
    requiredNextValidation: [
      "Physics sanity checks against hand calculations.",
      "Biomechanics comparison with published bone-strength and contact-loading literature.",
      "Finite-element, benchtop, or external contact-validation cases for contact-area assumptions.",
      "External image validation on an independent fracture dataset.",
      "Clinician or mission-medical expert review of response actions.",
    ],
    sourceLinks: getValidationSourceLinks(),
  };

  downloadJson("astrobone-validation-report", report);
  appendAssistantMessage(
    "Validation report exported with formulas, current mechanics values, model-card limits, dataset-card notes, and source links.",
  );
}

function getValidationSourceLinks() {
  return [
    {
      label: "NASA Risk of Bone Fracture due to Spaceflight-induced Changes to Bone",
      url: "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/",
      role: "Spaceflight fracture risk depends on expected loads and skeletal fragility.",
    },
    {
      label: "NASA Risk of Spaceflight-Induced Bone Changes",
      url: "https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/",
      role: "NASA summarizes microgravity-linked bone density loss and fracture susceptibility.",
    },
    {
      label: "NASA Human Research Program",
      url: "https://www.nasa.gov/hrp/",
      role: "NASA program context and data repositories for astronaut health research.",
    },
    {
      label: "FracAtlas Scientific Data paper",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10404222/",
      role: "Public fracture X-ray dataset used for prototype imaging models.",
    },
  ];
}

function downloadJson(filenameBase, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `${filenameBase}-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function resetResponseRecord() {
  incidentLog.length = 0;
  completedCareActions.clear();
  updateObservationCount();
}

function setWorkflowStage(stage, { announce = false } = {}) {
  const nextStage = Math.max(0, Math.min(workflowStages.length - 1, Number(stage) || 0));
  workflowStage = nextStage;
  const meta = workflowStages[workflowStage];

  refs.workflowTabs.forEach((button, index) => {
    const isActive = index === workflowStage;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  refs.stagePanels.forEach((panel, index) => {
    panel.hidden = index !== workflowStage;
  });

  refs.stageKicker.textContent = `Step ${workflowStage + 1} of ${workflowStages.length}`;
  refs.stageTitle.textContent = getStageTitle(workflowStage);
  refs.stageDescription.textContent = getStageDescription(workflowStage);
  refs.workflowProgress.textContent = `${workflowStage + 1} / ${workflowStages.length}`;
  refs.workflowBack.disabled = workflowStage === 0;
  refs.workflowNext.textContent = getNextLabel(workflowStage, meta.nextLabel);

  if (announce) {
    appendAssistantMessage(
      workflowStage === 3
        ? `Decision review opened. Current evidence coverage is <strong>${latestDecision.sourceCount} of 3 sources</strong>, with ${latestDecision.uncertainty.toLowerCase()}.`
        : `${meta.title} selected. Changes here update the same 3D case and decision signal.`,
    );
  }
}

function getStageTitle(stage) {
  if (stage === 2) {
    return state.mode === "space"
      ? "Assess crew reserve and condition"
      : "Assess athlete reserve and condition";
  }
  if (stage === 3) {
    return state.mode === "space"
      ? "Build the onboard response"
      : "Build the recovery and handoff plan";
  }
  return workflowStages[stage].title;
}

function getStageDescription(stage) {
  if (stage === 2) {
    return state.mode === "space"
      ? "Combine bone strength, microgravity exposure, reported pain, swelling, limb use, and sensation. Condition flags affect response urgency, not the image probability."
      : "Combine bone strength, training fatigue, pain, swelling, function, and sensation. Condition flags affect response urgency, not the image probability.";
  }
  if (stage === 3) {
    return state.mode === "space"
      ? "Use the same record to protect the crew member, follow an approved protocol, monitor change, and prepare a flight-surgeon handoff."
      : "Use the same record to modify load, follow an approved care plan, monitor recovery, and prepare a clinician handoff.";
  }
  return workflowStages[stage].description;
}

function getNextLabel(stage, fallback) {
  if (stage === 1) return state.mode === "space" ? "Next: crew" : "Next: athlete";
  return fallback;
}

async function runGuidedDemo() {
  const presetName = state.mode === "space" ? "paper" : "runner";
  applyPreset(presetName, { announce: false });
  setWorkflowStage(0);
  refs.guidedDemo.disabled = true;
  refs.guidedDemo.textContent = "Loading case...";

  try {
    await loadDemoPrediction(state.target);
    appendAssistantMessage(
      state.mode === "space"
        ? "Guided exploration case loaded: a distal-leg X-ray signal is now compared with a visible paper-edge impact and 240 days of microgravity exposure. The response plan can be used even if ground advice is delayed."
        : "Guided sport case loaded: a distal-leg X-ray signal is now compared with repetitive runner loading and elevated training fatigue.",
    );
  } catch (error) {
    appendAssistantMessage(`I could not load the guided case: ${error.message}`);
  } finally {
    refs.guidedDemo.disabled = false;
    updateMissionCopy();
  }
}

function setMode(mode) {
  const presetName = mode === "space" ? "paper" : "runner";
  Object.assign(state, presets[presetName]);
  resetResponseRecord();
  clearAiPrediction({ announce: false });
  syncInputs();
  latestModel = calculateRisk(state);
  updateUi();
  updateScene();
  setWorkflowStage(workflowStage);
  appendAssistantMessage(
    mode === "space"
      ? "Space mode now opens on the paper-edge scenario so the demo starts with the small-object stress-concentration case."
      : "Sports mode shifts the same physics toward repetitive load, fatigue, and impact location.",
  );
}

function applyPreset(name, { announce = true } = {}) {
  Object.assign(state, presets[name]);
  resetResponseRecord();
  syncInputs();
  latestModel = calculateRisk(state);
  updateUi();
  updateScene();
  setWorkflowStage(workflowStage);
  if (announce) {
    appendAssistantMessage(getPresetMessage(name));
  }
}

function getPresetMessage(name) {
  if (name === "paper") {
    return "Paper edge preset: the 3D object is now a plain ultra-thin rectangle. Its small mass is paired with high speed, a narrow edge, and a near-normal impact to explore stress concentration.";
  }
  if (name === "eva") {
    return "EVA tool preset: moderate speed and a compact contact patch can become concerning when the astronaut has months of reduced mechanical loading.";
  }
  return "Runner load preset: the risk comes less from one dramatic collision and more from repeated tibial loading plus fatigue.";
}

function appendMessage(text, role = "assistant") {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  if (role === "user") {
    message.textContent = text;
  } else {
    message.innerHTML = text;
  }
  refs.chatLog.appendChild(message);
  refs.chatLog.scrollTop = refs.chatLog.scrollHeight;
}

function appendAssistantMessage(text) {
  appendMessage(text, "assistant");
}

function replyTo(prompt) {
  const cleaned = prompt.toLowerCase();
  if (
    cleaned.includes("help")
    || cleaned.includes("action")
    || cleaned.includes("respond")
    || cleaned.includes("monitor")
  ) {
    return state.mode === "space"
      ? `AstroBone helps at four points: screen the task before exposure, assess the event and crew condition, open a protocol-linked response plan, then log change and export a flight-surgeon handoff. The current operational priority is <strong>${latestCarePlan.priority.label}</strong>.`
      : `AstroBone helps before and after injury: screen training load, combine image and load evidence, guide load modification and review, then track recovery for a clinician handoff. The current operational priority is <strong>${latestCarePlan.priority.label}</strong>.`;
  }
  if (cleaned.includes("paper")) {
    return `The paper scenario uses a ${state.mass} g sheet moving at ${state.speed} m/s. The visible paper edge approaches the ${TARGET_META[state.target].label.toLowerCase()} at ${state.angle} degrees, and the model treats the ${state.contactArea} mm2 contact patch as the stress-concentrating feature.`;
  }
  if (cleaned.includes("problem") || cleaned.includes("solution")) {
    return state.mode === "space"
      ? "The problem is not impact alone: reduced skeletal reserve and delayed access to definitive care can make an otherwise manageable event harder to judge. AstroBone's solution is to keep the X-ray signal, impact mechanics, fragility estimate, and uncertainty in one explainable decision record."
      : "The problem is accumulated loading before a complete fracture becomes obvious. AstroBone's solution is to combine image evidence with reconstructed impact and fatigue so the athlete or clinician can see what is driving the warning.";
  }
  if (cleaned.includes("nasa") || cleaned.includes("ready")) {
    return "To make this NASA-ready, connect the response plan to flight-surgeon-approved procedures and medical inventory, replace generic bone strength with validated exposure priors, add parameter-sweep uncertainty, and test the complete prevention-to-handoff workflow in crew analog studies.";
  }
  if (cleaned.includes("sport") || cleaned.includes("athlete")) {
    return "For sports, this becomes an early warning twin for stress injury. Use training load, pain score, recovery, previous injury, and wearable acceleration as inputs; then show how repeated tibial stress changes the risk map before a visible fracture appears.";
  }
  if (cleaned.includes("angle") || cleaned.includes("speed") || cleaned.includes("force")) {
    return `In this run, ${state.speed} m/s and a ${state.angle} degree angle create ${latestModel.kineticEnergy.toFixed(1)} J of kinetic energy. The model converts part of that into a normal load path, then divides by the ${state.contactArea} mm2 contact patch to estimate local stress density.`;
  }
  if (cleaned.includes("risk") || cleaned.includes("score") || cleaned.includes("explain")) {
    return aiState.loaded
      ? `Combined review signal: <strong>${latestDecision.score}/100</strong>. It combines ${(latestDecision.imagingScore).toFixed(1)}/100 image evidence, ${latestDecision.impactScore.toFixed(0)}/100 impact demand, and ${latestDecision.fragilityScore.toFixed(0)}/100 fragility. Uncertainty remains ${latestDecision.uncertainty.toLowerCase()}.`
      : `Impact demand is <strong>${Math.round(latestModel.score)}/100</strong>, but the combined decision is incomplete because image evidence is missing. The current mechanical drivers are ${latestModel.energyDensity.toFixed(2)} J/mm2 stress density and ${latestModel.fragility.toFixed(2)}x fragility.`;
  }
  if (cleaned.includes("validate") || cleaned.includes("data")) {
    return "Validation should happen in layers: first physics sanity checks, then biomechanics literature comparison, then open motion or impact datasets, then expert review. A NASA-facing demo should show every assumption and let judges change inputs live.";
  }
  return "Good question. For this prototype, I would connect your question back to four inputs: applied energy, contact area, impact angle, and skeletal fragility. Those are the variables that make the digital twin defensible.";
}

function resizeRendererToView(viewRenderer, viewCamera, canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  viewRenderer.setSize(width, height, false);
  viewCamera.aspect = width / height;
  viewCamera.updateProjectionMatrix();
}

function resize() {
  resizeRendererToView(renderer, camera, refs.canvas);
}

function animate(now) {
  requestAnimationFrame(animate);
  const elapsed = (now - animationStart) / 1000;
  const phase = (elapsed % 5) / 5;
  animationPhase = phase;
  const activeStep = Math.min(4, Math.floor(phase * 5));
  refs.timelineSteps.forEach((step, index) => {
    step.classList.toggle("active", index === activeStep);
  });

  controls.update();
  updateLinkedMotion(elapsed);

  const impactPoint = getImpactPoint();
  const direction = getImpactDirection();
  const travel = Math.abs(Math.sin(phase * Math.PI));
  projectile.position.copy(
    impactPoint.clone().sub(direction.clone().multiplyScalar(2.7 * (1 - travel))),
  );
  projectile.scale.setScalar(getProjectileScale());

  updateScene();
  impactMarker.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.08 + latestModel.score / 240);
  stressRing.rotation.z += 0.012 + latestModel.score / 9000;
  renderer.render(scene, camera);
}

function bindEvents() {
  [
    refs.targetRegion,
    refs.mass,
    refs.speed,
    refs.angle,
    refs.contactArea,
    refs.boneIndex,
    refs.microgravityDays,
    refs.fatigue,
    refs.painScore,
    refs.swelling,
    refs.mobility,
    refs.sensationChange,
  ].forEach((input) => input.addEventListener("input", updateFromInputs));

  refs.modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  refs.motionButtons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setMotionMode(button.dataset.motion);
    });
  });

  refs.guidedDemo.addEventListener("click", runGuidedDemo);
  refs.logObservation.addEventListener("click", logObservation);
  refs.exportHandoff.addEventListener("click", exportHandoffPacket);
  refs.exportCompetitionBrief.addEventListener("click", exportCompetitionBrief);
  refs.exportValidationReport.addEventListener("click", exportValidationReport);

  refs.workflowTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setWorkflowStage(Number(button.dataset.workflowStage), { announce: true });
    });
  });

  refs.workflowBack.addEventListener("click", () => {
    setWorkflowStage(workflowStage - 1);
  });

  refs.workflowNext.addEventListener("click", () => {
    const nextStage = workflowStage === workflowStages.length - 1 ? 0 : workflowStage + 1;
    setWorkflowStage(nextStage);
  });

  document.querySelectorAll(".preset-button").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  refs.resetButton.addEventListener("click", () => {
    const presetName = state.mode === "sport" ? "runner" : "paper";
    Object.assign(state, presets[presetName]);
    resetResponseRecord();
    latestModel = calculateRisk(state);
    clearAiPrediction({ announce: false });
    syncInputs();
    updateUi();
    updateScene();
    setWorkflowStage(0);
    appendAssistantMessage(
      state.mode === "space"
        ? "Investigation reset to the paper-edge case. Image evidence is cleared so the workflow begins with a visible missing-data state."
        : "Investigation reset to the runner case. Image evidence is cleared so the workflow begins with a visible missing-data state.",
    );
  });

  document.querySelectorAll(".suggestions button").forEach((button) => {
    button.addEventListener("click", () => {
      refs.chatInput.value = button.dataset.prompt;
      refs.chatForm.requestSubmit();
    });
  });

  refs.loadDemoPrediction.addEventListener("click", async () => {
    try {
      await loadDemoPrediction();
    } catch (error) {
      appendAssistantMessage(`I could not load the demo prediction: ${error.message}`);
    }
  });

  refs.importPrediction.addEventListener("click", () => {
    refs.predictionFile.click();
  });

  refs.predictionFile.addEventListener("change", async () => {
    const file = refs.predictionFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      applyAiPrediction(payload);
    } catch (error) {
      appendAssistantMessage(`I could not import that prediction JSON: ${error.message}`);
    } finally {
      refs.predictionFile.value = "";
    }
  });

  refs.clearPrediction.addEventListener("click", clearAiPrediction);

  refs.chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const prompt = refs.chatInput.value.trim();
    if (!prompt) return;
    appendMessage(prompt, "user");
    refs.chatInput.value = "";
    appendAssistantMessage(replyTo(prompt));
  });

  window.addEventListener("resize", resize);
}

bindEvents();
syncInputs();
latestModel = calculateRisk(state);
updateUi();
updateScene();
setWorkflowStage(0);
appendAssistantMessage(
  "AstroBone frames one question: does image evidence agree with the reconstructed load and the person's available bone reserve? The investigation begins with evidence and ends with an explicit next action.",
);
resize();
requestAnimationFrame(animate);
