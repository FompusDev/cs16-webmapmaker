/**
 * Worldcraft Online - Three.js 3D Viewport
 * Real-time 3D preview of the current map project (box brushes + entities)
 */

class Worldcraft3D {
  constructor(canvas, project) {
    this.canvas = canvas;
    this.project = project;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.brushMeshes = new Map();
    this.entityMeshes = new Map();
    this.textureCache = new Map();
    this.initialized = false;
    this.wireframe = false;
    this.init();
  }

  init() {
    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0b0c0f);
      this.scene.fog = new THREE.FogExp2(0x0b0c0f, 0.0008);

      // Camera
      this.camera = new THREE.PerspectiveCamera(
        72,
        this.canvas.clientWidth / this.canvas.clientHeight,
        1,
        32000
      );
      this.camera.position.set(600, 600, 800);
      this.camera.lookAt(0, 0, 80);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false
      });
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Orbit Controls
      this.controls = new THREE.OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.screenSpacePanning = false;
      this.controls.target.set(0, 0, 80);
      this.controls.update();

      // Grid Helper (like Worldcraft XY plane)
      const gridHelper = new THREE.GridHelper(4096, 128, 0x2e3438, 0x222628);
      gridHelper.position.y = 0;
      this.scene.add(gridHelper);

      // Ambient + Hemisphere Light for balanced outdoor lighting
      const ambient = new THREE.AmbientLight(0xffffff, 0.9);
      this.scene.add(ambient);

      const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x332211, 0.8);
      this.scene.add(hemiLight);

      // Directional Sun Light
      const sun = new THREE.DirectionalLight(0xfffae0, 1.4);
      sun.position.set(1200, 2000, 1500);
      this.scene.add(sun);

      this.initialized = true;
      this.refreshScene();
      this.animate();
    } catch (err) {
      console.error('3D init failed:', err);
    }
  }

  getTextureMaterial(textureName) {
    const key = textureName || 'DEFAULT';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key);
    }

    let cleanName = key.replace('{', 'TRANS_');
    const imgUrl = `./static/textures/${cleanName}.png`;

    // Authentic CS 1.6 base fallback colors (never black!)
    let baseColor = 0xd4ba88; // Default sand/dust color
    if (key.includes('CRATE') || key.includes('WOOD')) baseColor = 0x8a5d3b;
    else if (key.includes('BRICK') || key.includes('ROOF')) baseColor = 0x9c4136;
    else if (key.includes('METAL') || key.includes('CONCRETE')) baseColor = 0x7b8189;
    else if (key.includes('POOL') || key.includes('TILE')) baseColor = 0x4a9ebb;
    else if (key.includes('AZTEC')) baseColor = 0x5a6358;
    else if (key === 'SKY') baseColor = 0x4fa3e0;
    else if (key === 'WATER') baseColor = 0x2c7ab0;

    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff, // White so texture colors are fully preserved
      wireframe: this.wireframe
    });

    if (key === 'SKY') {
      material.color.setHex(0x4fa3e0);
      material.side = THREE.BackSide;
    } else if (key === 'WATER') {
      material.color.setHex(0x2c7ab0);
      material.transparent = true;
      material.opacity = 0.7;
    } else if (key.startsWith('{') || key.startsWith('TRANS_')) {
      material.transparent = true;
      material.alphaTest = 0.5;
    } else if (key === 'CLIP') {
      material.color.setHex(0xcc3333);
      material.transparent = true;
      material.opacity = 0.25;
    } else {
      const loader = new THREE.TextureLoader();
      loader.load(
        imgUrl,
        (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.magFilter = THREE.NearestFilter;
          tex.minFilter = THREE.LinearMipMapLinearFilter;
          material.map = tex;
          material.color.setHex(0xffffff);
          material.needsUpdate = true;
        },
        undefined,
        () => {
          // Fallback if image not yet loaded
          material.color.setHex(baseColor);
          material.needsUpdate = true;
        }
      );
    }

    this.textureCache.set(key, material);
    return material;
  }

  scaleBrush(b) {
    // GoldSrc uses 1 unit = ~1 inch; in Three.js Z is vertical
    return {
      x1: b.x1, x2: b.x2,
      y1: b.y1, y2: b.y2,
      z1: b.z1, z2: b.z2
    };
  }

  refreshScene() {
    if (!this.initialized) return;

    // Remove old brush meshes no longer in project
    const currentBrushIds = new Set(this.project.brushes.map(b => b.id));
    for (const [id, mesh] of this.brushMeshes) {
      if (!currentBrushIds.has(id)) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        this.brushMeshes.delete(id);
      }
    }

    // Add / Update brush meshes
    for (const b of this.project.brushes) {
      if (this.brushMeshes.has(b.id)) {
        this.scene.remove(this.brushMeshes.get(b.id));
      }

      const bx = (b.x1 + b.x2) / 2;
      const by = (b.y1 + b.y2) / 2;
      const bz = (b.z1 + b.z2) / 2;
      const bw = Math.max(1, b.x2 - b.x1);
      const bl = Math.max(1, b.y2 - b.y1);
      const bh = Math.max(1, b.z2 - b.z1);

      let geometry;
      let mesh;
      const tex = (b.textures && b.textures.top) ? b.textures.top : (b.texture || 'DUST_SANDWALL');

      if (b.type === 'ROOF') {
        // Wedge shape using BufferGeometry
        const hw = bw / 2, hl = bl / 2, hh = bh;
        const verts = new Float32Array([
          // Bottom face
          -hw, -hl, 0,   hw, -hl, 0,   hw, hl, 0,
          -hw, -hl, 0,   hw,  hl, 0,  -hw, hl, 0,
          // North slope
          -hw, hl, 0,   hw, hl, 0,   hw, hl, hh,
          -hw, hl, 0,   hw, hl, hh, -hw, hl, hh,
          // West side
          -hw, -hl, 0,  -hw, hl, hh,  -hw, hl, 0,
          // East side
          hw, -hl, 0,   hw, hl, 0,    hw, hl, hh,
          // South slope (triangle)
          -hw, -hl, 0,   hw, -hl, 0,  hw, hl, hh,
          -hw, -hl, 0,   hw,  hl, hh, -hw, hl, hh,
        ]);
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geometry.computeVertexNormals();
        mesh = new THREE.Mesh(geometry, this.getTextureMaterial(tex));
        mesh.position.set(bx, by, b.z1);
      } else {
      } else {
        // In Three.js: X is width, Y is height (GoldSrc Z), Z is depth (GoldSrc -Y)
        geometry = new THREE.BoxGeometry(bw, bh, bl);

        // UV texturing per 128 units
        const uvAttr = geometry.attributes.uv;
        const repX = bw / 128;
        const repY = bh / 128;
        for (let i = 0; i < uvAttr.count; i++) {
          uvAttr.setXY(i, uvAttr.getX(i) * repX, uvAttr.getY(i) * repY);
        }
        uvAttr.needsUpdate = true;

        const topTex = (b.textures && b.textures.top) ? b.textures.top : tex;
        const botTex = (b.textures && b.textures.bottom) ? b.textures.bottom : tex;
        const eastTex = (b.textures && b.textures.east) ? b.textures.east : tex;
        const westTex = (b.textures && b.textures.west) ? b.textures.west : tex;
        const northTex = (b.textures && b.textures.north) ? b.textures.north : tex;
        const southTex = (b.textures && b.textures.south) ? b.textures.south : tex;

        // Three.js BoxGeometry material order: [+X, -X, +Y, -Y, +Z, -Z]
        // +X: East, -X: West, +Y: Top, -Y: Bottom, +Z: South (-Y in GoldSrc), -Z: North (+Y in GoldSrc)
        const materials = [
          this.getTextureMaterial(eastTex),
          this.getTextureMaterial(westTex),
          this.getTextureMaterial(topTex),
          this.getTextureMaterial(botTex),
          this.getTextureMaterial(southTex),
          this.getTextureMaterial(northTex)
        ];

        mesh = new THREE.Mesh(geometry, materials);
        // Correct position: X -> bx, Y -> bz (height), Z -> -by (depth)
        mesh.position.set(bx, bz, -by);
      }

      this.scene.add(mesh);
      this.brushMeshes.set(b.id, mesh);
    }

    // Entities
    for (const [id, mesh] of this.entityMeshes) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      this.entityMeshes.delete(id);
    }

    for (const e of this.project.entities) {
      let geo, mat, mesh;
      const esc = e.classname;

      if (esc === 'info_player_start') {
        // CT: Blue cylinder
        geo = new THREE.CylinderGeometry(14, 14, 72, 12);
        mat = new THREE.MeshLambertMaterial({ color: 0x2d7dd2, wireframe: false });
      } else if (esc === 'info_player_deathmatch') {
        // T: Red cylinder
        geo = new THREE.CylinderGeometry(14, 14, 72, 12);
        mat = new THREE.MeshLambertMaterial({ color: 0xcd2027, wireframe: false });
      } else if (esc === 'light') {
        geo = new THREE.SphereGeometry(8, 8, 8);
        mat = new THREE.MeshBasicMaterial({ color: 0xffee66 });
        // Add a real point light too
        const ptLight = new THREE.PointLight(0xffe8a0, 1.2, 800);
        ptLight.position.set(e.x, e.z + 8, -e.y);
        this.scene.add(ptLight);
      } else if (esc === 'func_bomb_target') {
        geo = new THREE.BoxGeometry(64, 64, 8);
        mat = new THREE.MeshLambertMaterial({ color: 0xe8a020, wireframe: true });
      } else {
        geo = new THREE.OctahedronGeometry(14);
        mat = new THREE.MeshLambertMaterial({ color: 0x9b59b6 });
      }

      mesh = new THREE.Mesh(geo, mat);
      // GoldSrc Z-up -> Three.js Y-up
      mesh.position.set(e.x, e.z + 36, -e.y);
      this.scene.add(mesh);
      this.entityMeshes.set(e.id, mesh);
    }
  }

  animate() {
    if (!this.initialized) return;
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    if (!this.initialized) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  setWireframe(enabled) {
    this.wireframe = enabled;
    for (const [_, mesh] of this.brushMeshes) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m && typeof m.wireframe !== 'undefined') m.wireframe = enabled;
      }
    }
  }

  resetCamera() {
    this.camera.position.set(600, 600, 800);
    this.controls.target.set(0, 0, 80);
    this.controls.update();
  }
}
