import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════

const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    currentPuzzle: null,
    puzzleType: 'cube',
    cubeSize: 3,
    isAnimating: false,
    moveQueue: [],
    moves: 0,
    timer: 0,
    timerInterval: null,
    isTimerRunning: false,
    isSolved: true,
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    isDragging: false,
    dragStart: null,
    selectedFace: null,
    selectedAxis: null,
    selectedLayer: null
};

// Puzzle colors
const COLORS = {
    white: 0xffffff,
    yellow: 0xffd500,
    red: 0xc41e3a,
    orange: 0xff5800,
    blue: 0x0051ba,
    green: 0x009e60,
    black: 0x111111,
    gray: 0x333333
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function init() {
    // Scene setup
    state.scene = new THREE.Scene();
    
    // Camera
    state.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    state.camera.position.set(5, 5, 7);
    
    // Renderer
    const canvas = document.getElementById('puzzle-canvas');
    state.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    state.renderer.shadowMap.enabled = true;
    
    // Orbit controls
    state.controls = new OrbitControls(state.camera, canvas);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.05;
    state.controls.enablePan = false;
    state.controls.minDistance = 3;
    state.controls.maxDistance = 50;
    
    // Lighting
    setupLighting();
    
    // Create initial puzzle
    createPuzzle('cube', 3);
    
    // Event listeners
    setupEventListeners();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 1500);
    
    // Animation loop
    animate();
}

function setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    state.scene.add(ambient);
    
    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    state.scene.add(mainLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-5, 0, -5);
    state.scene.add(fillLight);
    
    // Rim light
    const rimLight = new THREE.DirectionalLight(0xff4488, 0.2);
    rimLight.position.set(0, -5, 5);
    state.scene.add(rimLight);
}

// ═══════════════════════════════════════════════════════════════════════════
// RUBIK'S CUBE (2x2 to 30x30)
// ═══════════════════════════════════════════════════════════════════════════

class RubiksCube {
    constructor(size = 3) {
        this.size = size;
        this.group = new THREE.Group();
        this.cubies = [];
        this.rotationGroup = new THREE.Group();
        this.cubeSize = 1;
        this.gap = 0.02;
        
        // Adjust scale for larger cubes
        if (size > 10) {
            this.cubeSize = 10 / size;
        }
        
        this.createCube();
        state.scene.add(this.group);
        state.scene.add(this.rotationGroup);
        
        // Adjust camera based on cube size
        const dist = Math.max(5, size * 0.8);
        state.camera.position.set(dist, dist, dist * 1.2);
        state.controls.minDistance = size * 0.5;
        state.controls.maxDistance = size * 5;
    }
    
    createCube() {
        const offset = (this.size - 1) / 2;
        
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    // Only create visible cubies (surface cubies)
                    if (x === 0 || x === this.size - 1 ||
                        y === 0 || y === this.size - 1 ||
                        z === 0 || z === this.size - 1) {
                        
                        const cubie = this.createCubie(x, y, z, offset);
                        cubie.userData = { x, y, z, origX: x, origY: y, origZ: z };
                        this.cubies.push(cubie);
                        this.group.add(cubie);
                    }
                }
            }
        }
    }
    
    createCubie(x, y, z, offset) {
        const size = this.cubeSize - this.gap;
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Determine colors for each face
        const materials = [
            this.getFaceMaterial(x === this.size - 1 ? COLORS.red : null),      // +X (Right)
            this.getFaceMaterial(x === 0 ? COLORS.orange : null),               // -X (Left)
            this.getFaceMaterial(y === this.size - 1 ? COLORS.white : null),    // +Y (Top)
            this.getFaceMaterial(y === 0 ? COLORS.yellow : null),               // -Y (Bottom)
            this.getFaceMaterial(z === this.size - 1 ? COLORS.blue : null),     // +Z (Front)
            this.getFaceMaterial(z === 0 ? COLORS.green : null)                 // -Z (Back)
        ];
        
        const cubie = new THREE.Mesh(geometry, materials);
        cubie.position.set(
            (x - offset) * this.cubeSize,
            (y - offset) * this.cubeSize,
            (z - offset) * this.cubeSize
        );
        
        // Add edge lines for better visibility
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        cubie.add(wireframe);
        
        return cubie;
    }
    
    getFaceMaterial(color) {
        if (color === null) {
            return new THREE.MeshLambertMaterial({ color: COLORS.black });
        }
        
        return new THREE.MeshPhongMaterial({
            color: color,
            shininess: 30,
            specular: 0x444444
        });
    }
    
    // Rotate a face/layer
    async rotate(axis, layer, direction, animate = true) {
        if (state.isAnimating) {
            state.moveQueue.push({ axis, layer, direction });
            return;
        }
        
        state.isAnimating = true;
        
        // Start timer on first move
        if (!state.isTimerRunning && state.isSolved) {
            startTimer();
            state.isSolved = false;
        }
        
        state.moves++;
        updateMoveDisplay();
        
        // Find cubies in this layer
        const cubiesInLayer = this.getCubiesInLayer(axis, layer);
        
        // Move cubies to rotation group
        cubiesInLayer.forEach(cubie => {
            this.group.remove(cubie);
            this.rotationGroup.add(cubie);
        });
        
        const angle = (Math.PI / 2) * direction;
        
        if (animate) {
            await this.animateRotation(axis, angle);
        } else {
            this.applyRotation(axis, angle);
        }
        
        // Move cubies back to main group
        cubiesInLayer.forEach(cubie => {
            // Update world matrix and position
            cubie.updateMatrixWorld();
            const worldPos = new THREE.Vector3();
            cubie.getWorldPosition(worldPos);
            
            this.rotationGroup.remove(cubie);
            this.group.add(cubie);
            
            cubie.position.copy(worldPos);
            
            // Update logical position
            this.updateCubiePosition(cubie, axis, direction);
        });
        
        // Reset rotation group
        this.rotationGroup.rotation.set(0, 0, 0);
        
        state.isAnimating = false;
        
        // Check if solved
        if (this.isSolved()) {
            state.isSolved = true;
            stopTimer();
            showSolvedModal();
        }
        
        // Process queue
        if (state.moveQueue.length > 0) {
            const next = state.moveQueue.shift();
            this.rotate(next.axis, next.layer, next.direction);
        }
    }
    
    getCubiesInLayer(axis, layer) {
        const offset = (this.size - 1) / 2;
        const threshold = 0.01;
        
        return this.cubies.filter(cubie => {
            const pos = cubie.position.clone();
            const layerPos = (layer - offset) * this.cubeSize;
            
            switch (axis) {
                case 'x': return Math.abs(pos.x - layerPos) < threshold;
                case 'y': return Math.abs(pos.y - layerPos) < threshold;
                case 'z': return Math.abs(pos.z - layerPos) < threshold;
            }
            return false;
        });
    }
    
    async animateRotation(axis, angle) {
        return new Promise(resolve => {
            const duration = 200;
            const startTime = Date.now();
            const startRotation = this.rotationGroup.rotation[axis];
            
            const animateStep = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                
                this.rotationGroup.rotation[axis] = startRotation + angle * eased;
                
                if (progress < 1) {
                    requestAnimationFrame(animateStep);
                } else {
                    resolve();
                }
            };
            
            animateStep();
        });
    }
    
    applyRotation(axis, angle) {
        this.rotationGroup.rotation[axis] = angle;
    }
    
    updateCubiePosition(cubie, axis, direction) {
        // Round positions to grid
        const offset = (this.size - 1) / 2;
        
        cubie.position.x = Math.round(cubie.position.x / this.cubeSize) * this.cubeSize;
        cubie.position.y = Math.round(cubie.position.y / this.cubeSize) * this.cubeSize;
        cubie.position.z = Math.round(cubie.position.z / this.cubeSize) * this.cubeSize;
        
        // Update userData
        cubie.userData.x = Math.round(cubie.position.x / this.cubeSize + offset);
        cubie.userData.y = Math.round(cubie.position.y / this.cubeSize + offset);
        cubie.userData.z = Math.round(cubie.position.z / this.cubeSize + offset);
    }
    
    isSolved() {
        // Check if each face has uniform color
        const faces = {
            right: [], left: [], top: [], bottom: [], front: [], back: []
        };
        
        this.cubies.forEach(cubie => {
            const { x, y, z } = cubie.userData;
            
            if (x === this.size - 1) faces.right.push(this.getFaceColor(cubie, 0));
            if (x === 0) faces.left.push(this.getFaceColor(cubie, 1));
            if (y === this.size - 1) faces.top.push(this.getFaceColor(cubie, 2));
            if (y === 0) faces.bottom.push(this.getFaceColor(cubie, 3));
            if (z === this.size - 1) faces.front.push(this.getFaceColor(cubie, 4));
            if (z === 0) faces.back.push(this.getFaceColor(cubie, 5));
        });
        
        for (const face of Object.values(faces)) {
            if (face.length > 0) {
                const firstColor = face[0];
                if (!face.every(c => c === firstColor)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    getFaceColor(cubie, faceIndex) {
        // Get the world-space normal of the face
        const localNormal = new THREE.Vector3();
        switch (faceIndex) {
            case 0: localNormal.set(1, 0, 0); break;  // Right
            case 1: localNormal.set(-1, 0, 0); break; // Left
            case 2: localNormal.set(0, 1, 0); break;  // Top
            case 3: localNormal.set(0, -1, 0); break; // Bottom
            case 4: localNormal.set(0, 0, 1); break;  // Front
            case 5: localNormal.set(0, 0, -1); break; // Back
        }
        
        // Transform by cubie's rotation
        const worldNormal = localNormal.clone().applyQuaternion(cubie.quaternion);
        
        // Find which original face this corresponds to
        const axes = [
            { axis: new THREE.Vector3(1, 0, 0), index: 0 },
            { axis: new THREE.Vector3(-1, 0, 0), index: 1 },
            { axis: new THREE.Vector3(0, 1, 0), index: 2 },
            { axis: new THREE.Vector3(0, -1, 0), index: 3 },
            { axis: new THREE.Vector3(0, 0, 1), index: 4 },
            { axis: new THREE.Vector3(0, 0, -1), index: 5 }
        ];
        
        let maxDot = -Infinity;
        let bestIndex = 0;
        
        axes.forEach(({ axis, index }) => {
            const dot = worldNormal.dot(axis);
            if (dot > maxDot) {
                maxDot = dot;
                bestIndex = index;
            }
        });
        
        const material = cubie.material[bestIndex];
        return material.color.getHex();
    }
    
    scramble(moves = null) {
        if (moves === null) {
            moves = Math.max(20, this.size * 5);
        }
        
        const axes = ['x', 'y', 'z'];
        const directions = [1, -1];
        
        for (let i = 0; i < moves; i++) {
            const axis = axes[Math.floor(Math.random() * 3)];
            const layer = Math.floor(Math.random() * this.size);
            const direction = directions[Math.floor(Math.random() * 2)];
            
            this.rotate(axis, layer, direction, false);
        }
        
        state.isSolved = false;
        state.moves = 0;
        updateMoveDisplay();
    }
    
    reset() {
        // Remove all cubies
        this.cubies.forEach(cubie => {
            this.group.remove(cubie);
        });
        this.cubies = [];
        
        // Recreate
        this.createCube();
        
        state.isSolved = true;
        state.moves = 0;
        resetTimer();
        updateMoveDisplay();
    }
    
    destroy() {
        this.cubies.forEach(cubie => {
            cubie.geometry.dispose();
            cubie.material.forEach(m => m.dispose());
            this.group.remove(cubie);
        });
        state.scene.remove(this.group);
        state.scene.remove(this.rotationGroup);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PYRAMINX
// ═══════════════════════════════════════════════════════════════════════════

class Pyraminx {
    constructor() {
        this.group = new THREE.Group();
        this.pieces = [];
        this.rotationGroup = new THREE.Group();
        
        this.createPyraminx();
        state.scene.add(this.group);
        state.scene.add(this.rotationGroup);
        
        state.camera.position.set(5, 4, 6);
        state.controls.minDistance = 3;
        state.controls.maxDistance = 20;
    }
    
    createPyraminx() {
        // Pyraminx consists of 4 axial pieces (tips), 6 edge pieces, and 4 center pieces
        const colors = [
            0xff0000, // Red - Front
            0x00ff00, // Green - Right  
            0x0000ff, // Blue - Left
            0xffff00  // Yellow - Bottom
        ];
        
        // Create the main tetrahedron with subdivisions
        const h = 2; // Height
        const r = h * Math.sqrt(2/3); // Circumradius
        
        // Vertices of tetrahedron
        const vertices = [
            new THREE.Vector3(0, h * 0.75, 0),                    // Top
            new THREE.Vector3(-r * 0.866, -h * 0.25, -r * 0.5),   // Front-left
            new THREE.Vector3(r * 0.866, -h * 0.25, -r * 0.5),    // Front-right
            new THREE.Vector3(0, -h * 0.25, r)                     // Back
        ];
        
        // Create center triangles (4 centers)
        this.createCenterPiece(vertices, colors);
        
        // Create edge pieces (6 edges)
        this.createEdgePieces(vertices, colors);
        
        // Create tip pieces (4 tips)
        this.createTipPieces(vertices, colors);
    }
    
    createCenterPiece(vertices, colors) {
        // Create the main pyramid body with 4 colored faces
        const geometry = new THREE.TetrahedronGeometry(1.8);
        
        // Custom geometry for colored faces
        const centerGeo = new THREE.BufferGeometry();
        
        const [top, fl, fr, back] = vertices;
        
        // Scale down for center pieces
        const scale = 0.4;
        const center = new THREE.Vector3(0, 0, 0);
        
        const scaledVerts = vertices.map(v => 
            v.clone().sub(center).multiplyScalar(scale).add(center)
        );
        
        // For simplicity, create as colored mesh
        const materials = colors.map(c => 
            new THREE.MeshPhongMaterial({ 
                color: c, 
                side: THREE.DoubleSide,
                shininess: 30 
            })
        );
        
        const pyrGeometry = new THREE.TetrahedronGeometry(1.2);
        const pyrMesh = new THREE.Mesh(pyrGeometry, materials[0]);
        
        // Create custom colored tetrahedron
        this.createColoredTetrahedron(1.2, colors, center);
    }
    
    createColoredTetrahedron(size, colors, position) {
        const h = size;
        const geometry = new THREE.BufferGeometry();
        
        // Tetrahedron vertices
        const a = h * Math.sqrt(8/9);
        const b = h * Math.sqrt(2/9);
        const c = h / 3;
        
        const v0 = new THREE.Vector3(0, h - c, 0);
        const v1 = new THREE.Vector3(-a/2, -c, -b);
        const v2 = new THREE.Vector3(a/2, -c, -b);
        const v3 = new THREE.Vector3(0, -c, b * 2);
        
        // Create 4 separate triangular faces with different colors
        const faces = [
            { verts: [v0, v1, v2], color: colors[0] }, // Front
            { verts: [v0, v2, v3], color: colors[1] }, // Right
            { verts: [v0, v3, v1], color: colors[2] }, // Left
            { verts: [v1, v3, v2], color: colors[3] }  // Bottom
        ];
        
        faces.forEach((face, i) => {
            const triGeo = new THREE.BufferGeometry();
            const positions = new Float32Array([
                face.verts[0].x, face.verts[0].y, face.verts[0].z,
                face.verts[1].x, face.verts[1].y, face.verts[1].z,
                face.verts[2].x, face.verts[2].y, face.verts[2].z
            ]);
            triGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            triGeo.computeVertexNormals();
            
            const material = new THREE.MeshPhongMaterial({
                color: face.color,
                side: THREE.DoubleSide,
                shininess: 50
            });
            
            const mesh = new THREE.Mesh(triGeo, material);
            mesh.position.copy(position);
            mesh.userData = { type: 'face', faceIndex: i };
            this.pieces.push(mesh);
            this.group.add(mesh);
            
            // Add edges
            const edges = new THREE.EdgesGeometry(triGeo);
            const line = new THREE.LineSegments(
                edges,
                new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
            );
            mesh.add(line);
        });
    }
    
    createEdgePieces(vertices, colors) {
        // Simplified - edges would be at midpoints
    }
    
    createTipPieces(vertices, colors) {
        // Simplified - tips are small pyramids at each vertex
        const tipSize = 0.3;
        
        vertices.forEach((vertex, i) => {
            const tipGeo = new THREE.TetrahedronGeometry(tipSize);
            const tipMat = new THREE.MeshPhongMaterial({
                color: colors[i],
                shininess: 50
            });
            const tip = new THREE.Mesh(tipGeo, tipMat);
            tip.position.copy(vertex.clone().multiplyScalar(0.85));
            tip.userData = { type: 'tip', index: i };
            this.pieces.push(tip);
            this.group.add(tip);
        });
    }
    
    rotate(tipIndex, direction, animate = true) {
        if (state.isAnimating) return;
        
        state.isAnimating = true;
        state.moves++;
        updateMoveDisplay();
        
        if (!state.isTimerRunning) {
            startTimer();
        }
        
        // Rotation logic would go here
        setTimeout(() => {
            state.isAnimating = false;
        }, 200);
    }
    
    scramble(moves = 15) {
        state.moves = 0;
        updateMoveDisplay();
        state.isSolved = false;
    }
    
    reset() {
        // Recreate pyraminx
        this.destroy();
        this.pieces = [];
        this.createPyraminx();
        state.moves = 0;
        resetTimer();
        updateMoveDisplay();
    }
    
    isSolved() {
        return false; // Simplified
    }
    
    destroy() {
        this.pieces.forEach(piece => {
            if (piece.geometry) piece.geometry.dispose();
            if (piece.material) {
                if (Array.isArray(piece.material)) {
                    piece.material.forEach(m => m.dispose());
                } else {
                    piece.material.dispose();
                }
            }
            this.group.remove(piece);
        });
        state.scene.remove(this.group);
        state.scene.remove(this.rotationGroup);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MEGAMINX (Dodecahedron)
// ═══════════════════════════════════════════════════════════════════════════

class Megaminx {
    constructor() {
        this.group = new THREE.Group();
        this.faces = [];
        this.rotationGroup = new THREE.Group();
        
        this.createMegaminx();
        state.scene.add(this.group);
        state.scene.add(this.rotationGroup);
        
        state.camera.position.set(6, 5, 8);
        state.controls.minDistance = 4;
        state.controls.maxDistance = 25;
    }
    
    createMegaminx() {
        // 12 faces with different colors
        const faceColors = [
            0xffffff, // White
            0xffff00, // Yellow
            0xff0000, // Red
            0xff8800, // Orange
            0x00ff00, // Light Green
            0x008800, // Dark Green
            0x0000ff, // Blue
            0x00ffff, // Cyan
            0xff00ff, // Magenta
            0x8800ff, // Purple
            0xffcccc, // Pink
            0x888888  // Gray
        ];
        
        // Create dodecahedron geometry
        const radius = 2;
        const geometry = new THREE.DodecahedronGeometry(radius, 0);
        
        // Get face information
        const positions = geometry.attributes.position;
        const faceCount = positions.count / 3;
        
        // Create main dodecahedron with colored faces
        this.createColoredDodecahedron(radius, faceColors);
    }
    
    createColoredDodecahedron(radius, colors) {
        // Create a dodecahedron with subdivided pentagonal faces
        const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
        
        // Vertices of a dodecahedron
        const vertices = [];
        
        // Cube vertices (±1, ±1, ±1)
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                for (let k = -1; k <= 1; k += 2) {
                    vertices.push(new THREE.Vector3(i, j, k));
                }
            }
        }
        
        // Rectangle vertices
        for (let i = -1; i <= 1; i += 2) {
            for (let j = -1; j <= 1; j += 2) {
                vertices.push(new THREE.Vector3(0, i / phi, j * phi));
                vertices.push(new THREE.Vector3(i / phi, j * phi, 0));
                vertices.push(new THREE.Vector3(i * phi, 0, j / phi));
            }
        }
        
        // Normalize to radius
        vertices.forEach(v => v.normalize().multiplyScalar(radius));
        
        // Pentagon faces (12 faces, each with 5 vertices)
        const faceIndices = [
            [0, 8, 9, 4, 16],
            [0, 16, 17, 2, 12],
            [0, 12, 13, 1, 8],
            [1, 13, 5, 10, 9],
            [1, 9, 8, 0, 12],
            [2, 17, 6, 14, 13],
            [2, 13, 12, 0, 16],
            [3, 10, 11, 7, 18],
            [3, 18, 19, 6, 14],
            [3, 14, 15, 5, 10],
            [4, 9, 10, 5, 15],
            [7, 11, 19, 18, 3]
        ];
        
        // Simplified: create a basic dodecahedron mesh
        const dodecaGeo = new THREE.DodecahedronGeometry(radius, 0);
        
        // Create groups for each face
        const faceNormals = this.getFaceNormals(dodecaGeo);
        
        // Create 12 separate pentagon meshes
        for (let i = 0; i < 12; i++) {
            this.createPentagonFace(i, radius, colors[i], faceNormals[i]);
        }
        
        // Add core
        const coreGeo = new THREE.DodecahedronGeometry(radius * 0.7, 0);
        const coreMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        this.group.add(core);
    }
    
    getFaceNormals(geometry) {
        // Get the center normals of each face of dodecahedron
        const normals = [];
        const phi = (1 + Math.sqrt(5)) / 2;
        
        // Approximate face normals for a dodecahedron
        const directions = [
            new THREE.Vector3(0, 1, phi),
            new THREE.Vector3(0, -1, phi),
            new THREE.Vector3(0, 1, -phi),
            new THREE.Vector3(0, -1, -phi),
            new THREE.Vector3(1, phi, 0),
            new THREE.Vector3(-1, phi, 0),
            new THREE.Vector3(1, -phi, 0),
            new THREE.Vector3(-1, -phi, 0),
            new THREE.Vector3(phi, 0, 1),
            new THREE.Vector3(-phi, 0, 1),
            new THREE.Vector3(phi, 0, -1),
            new THREE.Vector3(-phi, 0, -1)
        ];
        
        return directions.map(d => d.normalize());
    }
    
    createPentagonFace(index, radius, color, normal) {
        // Create a pentagon at the face position
        const pentagonShape = new THREE.Shape();
        const sides = 5;
        const size = radius * 0.5;
        
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            
            if (i === 0) {
                pentagonShape.moveTo(x, y);
            } else {
                pentagonShape.lineTo(x, y);
            }
        }
        pentagonShape.closePath();
        
        const geometry = new THREE.ShapeGeometry(pentagonShape);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            side: THREE.DoubleSide,
            shininess: 50
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position and orient the pentagon
        mesh.position.copy(normal.clone().multiplyScalar(radius * 0.95));
        mesh.lookAt(normal.clone().multiplyScalar(radius * 2));
        
        mesh.userData = { type: 'face', index };
        this.faces.push(mesh);
        this.group.add(mesh);
        
        // Add edge lines
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        mesh.add(wireframe);
        
        // Add inner divisions (simplified)
        this.addPentagonDivisions(mesh, size, color);
    }
    
    addPentagonDivisions(parentMesh, size, color) {
        // Add subdivisions to make it look like a megaminx face
        const centerDot = new THREE.Mesh(
            new THREE.CircleGeometry(size * 0.3, 5),
            new THREE.MeshPhongMaterial({ color: color, side: THREE.DoubleSide })
        );
        centerDot.position.z = 0.01;
        centerDot.rotation.z = Math.PI / 10;
        parentMesh.add(centerDot);
    }
    
    rotate(faceIndex, direction, animate = true) {
        if (state.isAnimating) return;
        
        state.isAnimating = true;
        state.moves++;
        updateMoveDisplay();
        
        if (!state.isTimerRunning) {
            startTimer();
        }
        
        // Rotation would be 72 degrees (360/5) for a pentagon face
        const angle = (Math.PI * 2 / 5) * direction;
        
        setTimeout(() => {
            state.isAnimating = false;
        }, 200);
    }
    
    scramble(moves = 20) {
        state.moves = 0;
        updateMoveDisplay();
        state.isSolved = false;
    }
    
    reset() {
        this.destroy();
        this.faces = [];
        this.createMegaminx();
        state.moves = 0;
        resetTimer();
        updateMoveDisplay();
    }
    
    isSolved() {
        return false; // Simplified
    }
    
    destroy() {
        this.faces.forEach(face => {
            if (face.geometry) face.geometry.dispose();
            if (face.material) face.material.dispose();
            this.group.remove(face);
        });
        
        // Remove core
        this.group.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        
        state.scene.remove(this.group);
        state.scene.remove(this.rotationGroup);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUZZLE FACTORY
// ═══════════════════════════════════════════════════════════════════════════

function createPuzzle(type, size = 3) {
    // Destroy current puzzle
    if (state.currentPuzzle) {
        state.currentPuzzle.destroy();
    }
    
    state.puzzleType = type;
    state.cubeSize = size;
    state.moves = 0;
    state.isSolved = true;
    resetTimer();
    updateMoveDisplay();
    
    switch (type) {
        case 'cube':
            state.currentPuzzle = new RubiksCube(size);
            break;
        case 'pyraminx':
            state.currentPuzzle = new Pyraminx();
            break;
        case 'megaminx':
            state.currentPuzzle = new Megaminx();
            break;
        default:
            state.currentPuzzle = new RubiksCube(size);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTION HANDLING
// ═══════════════════════════════════════════════════════════════════════════

function setupEventListeners() {
    const canvas = document.getElementById('puzzle-canvas');
    
    // Mouse events for cube interaction
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    
    // Touch events
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    
    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // UI buttons
    document.getElementById('scramble-btn').addEventListener('click', () => {
        if (state.currentPuzzle) {
            state.currentPuzzle.scramble();
        }
    });
    
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (state.currentPuzzle) {
            state.currentPuzzle.reset();
        }
    });
    
    document.getElementById('solve-btn').addEventListener('click', () => {
        if (state.currentPuzzle) {
            state.currentPuzzle.reset();
        }
    });
    
    document.getElementById('play-again-btn').addEventListener('click', () => {
        document.getElementById('solved-modal').classList.add('hidden');
        if (state.currentPuzzle) {
            state.currentPuzzle.scramble();
        }
    });
    
    // Puzzle selector buttons
    document.querySelectorAll('.puzzle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const puzzleType = btn.dataset.puzzle;
            
            document.querySelectorAll('.puzzle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (puzzleType === 'cube') {
                createPuzzle('cube', state.cubeSize);
            } else {
                createPuzzle(puzzleType);
            }
        });
    });
    

}

function onMouseDown(event) {
    if (event.button !== 0) return; // Only left click
    
    state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    state.raycaster.setFromCamera(state.mouse, state.camera);
    
    if (state.currentPuzzle && state.currentPuzzle.cubies) {
        const intersects = state.raycaster.intersectObjects(state.currentPuzzle.cubies);
        
        if (intersects.length > 0) {
            state.isDragging = true;
            state.dragStart = { x: event.clientX, y: event.clientY };
            state.selectedFace = intersects[0];
            state.controls.enabled = false;
        }
    }
}

function onMouseMove(event) {
    if (!state.isDragging || !state.selectedFace) return;
    
    const dx = event.clientX - state.dragStart.x;
    const dy = event.clientY - state.dragStart.y;
    const threshold = 30;
    
    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
        // Determine rotation axis and direction based on drag direction and face
        const faceNormal = state.selectedFace.face.normal.clone();
        faceNormal.applyQuaternion(state.selectedFace.object.quaternion);
        
        const cubie = state.selectedFace.object;
        const size = state.currentPuzzle.size;
        const { x, y, z } = cubie.userData;
        
        let axis, layer, direction;
        
        // Determine which axis to rotate based on drag direction and face normal
        if (Math.abs(faceNormal.y) > 0.5) {
            // Top or bottom face - use horizontal drag for x/z rotation
            if (Math.abs(dx) > Math.abs(dy)) {
                axis = 'z';
                layer = z;
                direction = dx > 0 ? 1 : -1;
                if (faceNormal.y < 0) direction *= -1;
            } else {
                axis = 'x';
                layer = x;
                direction = dy > 0 ? -1 : 1;
                if (faceNormal.y < 0) direction *= -1;
            }
        } else if (Math.abs(faceNormal.x) > 0.5) {
            // Left or right face
            if (Math.abs(dx) > Math.abs(dy)) {
                axis = 'y';
                layer = y;
                direction = dx > 0 ? -1 : 1;
                if (faceNormal.x < 0) direction *= -1;
            } else {
                axis = 'z';
                layer = z;
                direction = dy > 0 ? 1 : -1;
                if (faceNormal.x < 0) direction *= -1;
            }
        } else {
            // Front or back face
            if (Math.abs(dx) > Math.abs(dy)) {
                axis = 'y';
                layer = y;
                direction = dx > 0 ? -1 : 1;
                if (faceNormal.z < 0) direction *= -1;
            } else {
                axis = 'x';
                layer = x;
                direction = dy > 0 ? 1 : -1;
                if (faceNormal.z < 0) direction *= -1;
            }
        }
        
        state.currentPuzzle.rotate(axis, layer, direction);
        
        state.isDragging = false;
        state.selectedFace = null;
        state.controls.enabled = true;
    }
}

function onMouseUp(event) {
    state.isDragging = false;
    state.selectedFace = null;
    state.controls.enabled = true;
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        event.preventDefault();
        const touch = event.touches[0];
        onMouseDown({ button: 0, clientX: touch.clientX, clientY: touch.clientY });
    }
}

function onTouchMove(event) {
    if (event.touches.length === 1) {
        event.preventDefault();
        const touch = event.touches[0];
        onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

function onTouchEnd(event) {
    onMouseUp({});
}

function onKeyDown(event) {
    if (!state.currentPuzzle || state.puzzleType !== 'cube') return;
    
    const shift = event.shiftKey;
    const direction = shift ? -1 : 1;
    const size = state.currentPuzzle.size;
    
    switch (event.key.toUpperCase()) {
        case 'U':
            state.currentPuzzle.rotate('y', size - 1, direction);
            break;
        case 'D':
            state.currentPuzzle.rotate('y', 0, -direction);
            break;
        case 'R':
            state.currentPuzzle.rotate('x', size - 1, direction);
            break;
        case 'L':
            state.currentPuzzle.rotate('x', 0, -direction);
            break;
        case 'F':
            state.currentPuzzle.rotate('z', size - 1, direction);
            break;
        case 'B':
            state.currentPuzzle.rotate('z', 0, -direction);
            break;
        case 'M':
            // Middle layer (for 3x3 and larger)
            if (size >= 3) {
                state.currentPuzzle.rotate('x', Math.floor(size / 2), -direction);
            }
            break;
        case 'E':
            if (size >= 3) {
                state.currentPuzzle.rotate('y', Math.floor(size / 2), -direction);
            }
            break;
        case 'S':
            if (size >= 3) {
                state.currentPuzzle.rotate('z', Math.floor(size / 2), direction);
            }
            break;
    }
}

function onWindowResize() {
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMER & DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

function startTimer() {
    state.isTimerRunning = true;
    state.timer = 0;
    const startTime = Date.now();
    
    state.timerInterval = setInterval(() => {
        state.timer = Date.now() - startTime;
        updateTimerDisplay();
    }, 10);
}

function stopTimer() {
    state.isTimerRunning = false;
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    state.timer = 0;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const ms = state.timer % 1000;
    const seconds = Math.floor(state.timer / 1000) % 60;
    const minutes = Math.floor(state.timer / 60000);
    
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(Math.floor(ms / 10)).padStart(2, '0')}`;
    document.getElementById('timer').textContent = display;
}

function updateMoveDisplay() {
    document.getElementById('moves').textContent = state.moves;
}

function showSolvedModal() {
    const modal = document.getElementById('solved-modal');
    document.getElementById('final-time').textContent = document.getElementById('timer').textContent;
    document.getElementById('final-moves').textContent = state.moves;
    modal.classList.remove('hidden');
    
    // Create confetti
    createConfetti();
}

function createConfetti() {
    const container = document.querySelector('.confetti');
    container.innerHTML = '';
    
    const colors = ['#00f5ff', '#ff00aa', '#f0ff00', '#00ff88'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -20px;
            opacity: ${Math.random() * 0.5 + 0.5};
            animation: confettiFall ${Math.random() * 2 + 2}s linear forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        container.appendChild(confetti);
    }
    
    // Add keyframes dynamically
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = `
            @keyframes confettiFall {
                to {
                    top: 100%;
                    transform: rotate(${Math.random() * 720}deg) translateX(${Math.random() * 100 - 50}px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════════════

function animate() {
    requestAnimationFrame(animate);
    
    state.controls.update();
    state.renderer.render(state.scene, state.camera);
}

// ═══════════════════════════════════════════════════════════════════════════
// START THE GAME
// ═══════════════════════════════════════════════════════════════════════════

init();

