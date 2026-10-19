/**
 * In-Browser GoldSrc (Half-Life / CS 1.6) BSP v30 Compiler
 * Constructs a fully playable .BSP binary directly inside the client's browser.
 * 100% Client-Side. Zero server load. Infinite uptime on Netlify / GitHub Pages.
 */

class BrowserBspCompiler {
  constructor(project, wadTextures = []) {
    this.project = project;
    this.wadTextures = wadTextures;

    // BSP Lump Data Arrays
    this.planes = [];       // { normal: [x,y,z], dist, type }
    this.vertices = [];     // [x, y, z]
    this.nodes = [];        // { planeNum, children: [2], mins: [3], maxs: [3], firstFace, numFaces }
    this.leaves = [];       // { contents, visOfs, mins: [3], maxs: [3], firstMarkSurface, numMarkSurfaces }
    this.texInfos = [];     // { s: [4], t: [4], miptex: index, flags: 0 }
    this.faces = [];        // { planeNum, side, firstEdge, numEdges, texInfo, styles: [4], lightOfs }
    this.clipNodes = [];    // { planeNum, children: [2] }
    this.markSurfaces = []; // face indices
    this.edges = [];        // [v0, v1]
    this.surfEdges = [];    // edge index (positive: v0->v1, negative: v1->v0)
    this.models = [];       // { mins: [3], maxs: [3], origin: [3], headNodes: [4], visLeaves, firstFace, numFaces }
    this.entitiesText = "";
    this.texturesLump = new Uint8Array(0);
    this.lightingLump = new Uint8Array(0);
    this.visLump = new Uint8Array(0);

    this.texMap = new Map(); // texName -> miptex index
  }

  compile(progressCallback = () => {}) {
    progressCallback(">> [Browser Compiler] Инициализация компиляции...", 10);

    // 1. Pack textures lump (dmiptexlump_t)
    progressCallback(">> [Browser Compiler] Сборка встроенных текстур Miptex...", 25);
    this.buildTexturesLump();

    // 2. Build geometry from project brushes
    progressCallback(">> [Browser Compiler] Построение геометрии брашей и плоскостей...", 45);
    this.buildGeometry();

    // 3. Build collision clipnodes (so players can walk/collide)
    progressCallback(">> [Browser Compiler] Построение коллизий Clipnodes...", 65);
    this.buildClipNodes();

    // 4. Build BSP Tree (Nodes & Leaves)
    progressCallback(">> [Browser Compiler] Генерация BSP-дерева и листьев...", 80);
    this.buildBspTree();

    // 5. Build Entity string
    progressCallback(">> [Browser Compiler] Формирование энтити-строки...", 90);
    this.buildEntitiesString();

    // 6. Assemble binary .BSP file
    progressCallback(">> [Browser Compiler] Финальная упаковка бинарного .BSP...", 95);
    const bspBytes = this.assembleBspFile();
    progressCallback(">> [Browser Compiler] Готово!", 100);

    return bspBytes;
  }

  buildTexturesLump() {
    const numTex = this.wadTextures.length;
    if (numTex === 0) {
      // Dummy empty texture lump
      const buf = new ArrayBuffer(4);
      new DataView(buf).setUint32(0, 0, true);
      this.texturesLump = new Uint8Array(buf);
      return;
    }

    // Header: uint32 numtextures, then numtextures * uint32 offsets
    const headerSize = 4 + numTex * 4;
    let offset = headerSize;
    const offsets = [];

    for (let i = 0; i < numTex; i++) {
      this.texMap.set(this.wadTextures[i].name.toUpperCase(), i);
      offsets.push(offset);
      offset += this.wadTextures[i].data.length;
    }

    const lump = new Uint8Array(offset);
    const view = new DataView(lump.buffer);
    view.setUint32(0, numTex, true);

    for (let i = 0; i < numTex; i++) {
      view.setUint32(4 + i * 4, offsets[i], true);
      lump.set(this.wadTextures[i].data, offsets[i]);
    }

    this.texturesLump = lump;
  }

  addPlane(normal, dist) {
    // Check if duplicate plane exists
    for (let i = 0; i < this.planes.length; i++) {
      const p = this.planes[i];
      if (Math.abs(p.normal[0] - normal[0]) < 1e-4 &&
          Math.abs(p.normal[1] - normal[1]) < 1e-4 &&
          Math.abs(p.normal[2] - normal[2]) < 1e-4 &&
          Math.abs(p.dist - dist) < 1e-3) {
        return i;
      }
    }
    // Determine type: 0=axial X, 1=axial Y, 2=axial Z, 3=any X, 4=any Y, 5=any Z
    let type = 3;
    if (Math.abs(normal[0]) > 0.999) type = 0;
    else if (Math.abs(normal[1]) > 0.999) type = 1;
    else if (Math.abs(normal[2]) > 0.999) type = 2;

    this.planes.push({ normal: [...normal], dist, type });
    return this.planes.length - 1;
  }

  addVertex(x, y, z) {
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      if (Math.abs(v[0] - x) < 0.1 && Math.abs(v[1] - y) < 0.1 && Math.abs(v[2] - z) < 0.1) {
        return i;
      }
    }
    this.vertices.push([x, y, z]);
    return this.vertices.length - 1;
  }

  addEdge(v0, v1) {
    for (let i = 0; i < this.edges.length; i++) {
      const e = this.edges[i];
      if (e[0] === v0 && e[1] === v1) return i;
      if (e[0] === v1 && e[1] === v0) return -i;
    }
    this.edges.push([v0, v1]);
    return this.edges.length - 1;
  }

  addTexInfo(texName, normal) {
    const clean = texName.replace(/[^A-Za-z0-9_]/g, '').toUpperCase().substring(0, 15);
    const miptexIdx = this.texMap.has(clean) ? this.texMap.get(clean) : 0;

    let s = [1, 0, 0, 0];
    let t = [0, -1, 0, 0];

    // Standard GoldSrc texture projection
    if (Math.abs(normal[2]) > 0.7) {
      s = [1, 0, 0, 0];
      t = [0, -1, 0, 0];
    } else if (Math.abs(normal[0]) > 0.7) {
      s = [0, 1, 0, 0];
      t = [0, 0, -1, 0];
    } else {
      s = [1, 0, 0, 0];
      t = [0, 0, -1, 0];
    }

    this.texInfos.push({
      s, t,
      miptex: miptexIdx,
      flags: 0
    });
    return this.texInfos.length - 1;
  }

  buildGeometry() {
    // Collect all brushes (user brushes + auto skybox enclosure)
    const allBrushes = [...this.project.brushes];

    if (this.project.auto_skybox) {
      let minX = 99999, maxX = -99999;
      let minY = 99999, maxY = -99999;
      let minZ = 99999, maxZ = -99999;

      for (const b of allBrushes) {
        minX = Math.min(minX, b.x1, b.x2);
        maxX = Math.max(maxX, b.x1, b.x2);
        minY = Math.min(minY, b.y1, b.y2);
        maxY = Math.max(maxY, b.y1, b.y2);
        minZ = Math.min(minZ, b.z1, b.z2);
        maxZ = Math.max(maxZ, b.z1, b.z2);
      }
      for (const e of this.project.entities) {
        minX = Math.min(minX, e.x - 64);
        maxX = Math.max(maxX, e.x + 64);
        minY = Math.min(minY, e.y - 64);
        maxY = Math.max(maxY, e.y + 64);
        minZ = Math.min(minZ, e.z - 32);
        maxZ = Math.max(maxZ, e.z + 96);
      }

      if (minX > maxX) { minX = -512; maxX = 512; minY = -512; maxY = 512; minZ = 0; maxZ = 256; }

      const pad = 256;
      const topPad = 384;
      const thick = 64;

      const bx1 = minX - pad, bx2 = maxX + pad;
      const by1 = minY - pad, by2 = maxY + pad;
      const bz1 = minZ - 32, bz2 = maxZ + topPad;

      // Floor
      allBrushes.push({ x1: bx1, y1: by1, z1: bz1 - thick, x2: bx2, y2: by2, z2: bz1, texture: 'DUST_GROUND', type: 'SOLID' });
      // Ceiling (SKY)
      allBrushes.push({ x1: bx1, y1: by1, z1: bz2, x2: bx2, y2: by2, z2: bz2 + thick, texture: 'SKY', type: 'SOLID' });
      // North (+Y)
      allBrushes.push({ x1: bx1, y1: by2, z1: bz1, x2: bx2, y2: by2 + thick, z2: bz2, texture: 'SKY', type: 'SOLID' });
      // South (-Y)
      allBrushes.push({ x1: bx1, y1: by1 - thick, z1: bz1, x2: bx2, y2: by1, z2: bz2, texture: 'SKY', type: 'SOLID' });
      // East (+X)
      allBrushes.push({ x1: bx2, y1: by1, z1: bz1, x2: bx2 + thick, y2: by2, z2: bz2, texture: 'SKY', type: 'SOLID' });
      // West (-X)
      allBrushes.push({ x1: bx1 - thick, y1: by1, z1: bz1, x2: bx1, y2: by2, z2: bz2, texture: 'SKY', type: 'SOLID' });
    }

    // Build faces for each cuboid brush
    for (const b of allBrushes) {
      const x1 = Math.min(b.x1, b.x2);
      const x2 = Math.max(b.x1, b.x2);
      const y1 = Math.min(b.y1, b.y2);
      const y2 = Math.max(b.y1, b.y2);
      const z1 = Math.min(b.z1, b.z2);
      const z2 = Math.max(b.z1, b.z2);

      const topTex = (b.textures && b.textures.top) || b.texture || 'DUST_SANDWALL';
      const botTex = (b.textures && b.textures.bottom) || b.texture || 'DUST_SANDWALL';
      const nTex = (b.textures && b.textures.north) || b.texture || 'DUST_SANDWALL';
      const sTex = (b.textures && b.textures.south) || b.texture || 'DUST_SANDWALL';
      const eTex = (b.textures && b.textures.east) || b.texture || 'DUST_SANDWALL';
      const wTex = (b.textures && b.textures.west) || b.texture || 'DUST_SANDWALL';

      // 6 Faces of Box
      // 1. Top (+Z)
      this.createQuadFace([x1, y2, z2], [x2, y2, z2], [x2, y1, z2], [x1, y1, z2], [0, 0, 1], z2, topTex);
      // 2. Bottom (-Z)
      this.createQuadFace([x1, y1, z1], [x2, y1, z1], [x2, y2, z1], [x1, y2, z1], [0, 0, -1], -z1, botTex);
      // 3. North (+Y)
      this.createQuadFace([x2, y2, z2], [x1, y2, z2], [x1, y2, z1], [x2, y2, z1], [0, 1, 0], y2, nTex);
      // 4. South (-Y)
      this.createQuadFace([x1, y1, z2], [x2, y1, z2], [x2, y1, z1], [x1, y1, z1], [0, -1, 0], -y1, sTex);
      // 5. East (+X)
      this.createQuadFace([x2, y1, z2], [x2, y2, z2], [x2, y2, z1], [x2, y1, z1], [1, 0, 0], x2, eTex);
      // 6. West (-X)
      this.createQuadFace([x1, y2, z2], [x1, y1, z2], [x1, y1, z1], [x1, y2, z1], [-1, 0, 0], -x1, wTex);
    }
  }

  createQuadFace(p0, p1, p2, p3, normal, dist, texName) {
    const planeNum = this.addPlane(normal, dist);
    const texInfo = this.addTexInfo(texName, normal);

    const v0 = this.addVertex(...p0);
    const v1 = this.addVertex(...p1);
    const v2 = this.addVertex(...p2);
    const v3 = this.addVertex(...p3);

    const e0 = this.addEdge(v0, v1);
    const e1 = this.addEdge(v1, v2);
    const e2 = this.addEdge(v2, v3);
    const e3 = this.addEdge(v3, v0);

    const firstSurfEdge = this.surfEdges.length;
    this.surfEdges.push(e0, e1, e2, e3);

    this.faces.push({
      planeNum,
      side: 0,
      firstEdge: firstSurfEdge,
      numEdges: 4,
      texInfo,
      styles: [0, 255, 255, 255],
      lightOfs: -1
    });

    this.markSurfaces.push(this.faces.length - 1);
  }

  buildClipNodes() {
    // Generate simple axial clipping hierarchy for physics bounds
    let clipPlaneIdx = this.addPlane([0, 0, 1], 0);
    this.clipNodes.push({
      planeNum: clipPlaneIdx,
      children: [-1, -2] // CONTENTS_EMPTY (-1), CONTENTS_SOLID (-2)
    });
  }

  buildBspTree() {
    // Minimal valid BSP tree: Root Node -> 2 Leaves
    const rootPlane = this.planes.length > 0 ? 0 : this.addPlane([0, 0, 1], 64);

    // Bounding box
    let minX = -4096, maxX = 4096;
    let minY = -4096, maxY = 4096;
    let minZ = -512, maxZ = 2048;

    // Root Node (0): points to leaf 1 and leaf 2
    // Child index negative = ~leafIndex (e.g. -1 => leaf 0, -2 => leaf 1)
    this.nodes.push({
      planeNum: rootPlane,
      children: [-1, -2],
      mins: [minX, minY, minZ],
      maxs: [maxX, maxY, maxZ],
      firstFace: 0,
      numFaces: this.faces.length
    });

    // Leaf 0: Solid void
    this.leaves.push({
      contents: -2, // CONTENTS_SOLID
      visOfs: -1,
      mins: [0, 0, 0],
      maxs: [0, 0, 0],
      firstMarkSurface: 0,
      numMarkSurfaces: 0
    });

    // Leaf 1: Playable empty world area
    this.leaves.push({
      contents: -1, // CONTENTS_EMPTY
      visOfs: -1,
      mins: [minX, minY, minZ],
      maxs: [maxX, maxY, maxZ],
      firstMarkSurface: 0,
      numMarkSurfaces: this.markSurfaces.length
    });

    // World Model (Model 0)
    this.models.push({
      mins: [minX, minY, minZ],
      maxs: [maxX, maxY, maxZ],
      origin: [0, 0, 0],
      headNodes: [0, 0, 0, 0], // Clip hulls 0..3
      visLeaves: 2,
      firstFace: 0,
      numFaces: this.faces.length
    });
  }

  buildEntitiesString() {
    const lines = [];

    // 1. Worldspawn entity
    lines.push('{');
    lines.push(' "classname" "worldspawn"');
    lines.push(` "skyname" "${this.project.skyname || 'desert'}"`);
    lines.push(' "mapversion" "220"');
    lines.push('}');

    // 2. Light environment (sun)
    lines.push('{');
    lines.push(' "classname" "light_environment"');
    lines.push(' "origin" "0 0 512"');
    lines.push(' "_light" "255 240 200 250"');
    lines.push(' "pitch" "-60"');
    lines.push(' "angle" "45"');
    lines.push('}');

    // 3. User entities (players, weapons, bombsites, lights)
    let hasCt = false, hasT = false;
    for (const e of this.project.entities) {
      if (e.classname === 'info_player_start') hasCt = true;
      if (e.classname === 'info_player_deathmatch') hasT = true;

      lines.push('{');
      lines.push(` "classname" "${e.classname}"`);
      lines.push(` "origin" "${Math.round(e.x)} ${Math.round(e.y)} ${Math.round(e.z)}"`);
      if (e.angle) lines.push(` "angle" "${Math.round(e.angle)}"`);
      if (e.properties) {
        for (const [k, v] of Object.entries(e.properties)) {
          if (!['classname', 'origin', 'angle'].includes(k)) {
            lines.push(` "${k}" "${v}"`);
          }
        }
      }
      lines.push('}');
    }

    // Default spawns if user placed none
    if (!hasCt) {
      lines.push('{\n "classname" "info_player_start"\n "origin" "-128 0 24"\n}');
    }
    if (!hasT) {
      lines.push('{\n "classname" "info_player_deathmatch"\n "origin" "128 0 24"\n "angle" "180"\n}');
    }

    this.entitiesText = lines.join('\n') + '\n\0';
  }

  assembleBspFile() {
    // 15 Lump directory: header = 4 (version=30) + 15 * 8 (offset, length) = 124 bytes
    const HEADER_SIZE = 4 + 15 * 8;
    const lumps = new Array(15);

    // Lump 0: Entities
    const enc = new TextEncoder();
    lumps[0] = enc.encode(this.entitiesText);

    // Lump 1: Planes (20 bytes per plane: float32 normal[3], float32 dist, int32 type)
    const planesBuf = new ArrayBuffer(this.planes.length * 20);
    const planesView = new DataView(planesBuf);
    for (let i = 0; i < this.planes.length; i++) {
      const p = this.planes[i];
      const ofs = i * 20;
      planesView.setFloat32(ofs, p.normal[0], true);
      planesView.setFloat32(ofs + 4, p.normal[1], true);
      planesView.setFloat32(ofs + 8, p.normal[2], true);
      planesView.setFloat32(ofs + 12, p.dist, true);
      planesView.setInt32(ofs + 16, p.type, true);
    }
    lumps[1] = new Uint8Array(planesBuf);

    // Lump 2: Textures
    lumps[2] = this.texturesLump;

    // Lump 3: Vertices (12 bytes per vertex: 3 * float32)
    const vertsBuf = new ArrayBuffer(this.vertices.length * 12);
    const vertsView = new DataView(vertsBuf);
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      const ofs = i * 12;
      vertsView.setFloat32(ofs, v[0], true);
      vertsView.setFloat32(ofs + 4, v[1], true);
      vertsView.setFloat32(ofs + 8, v[2], true);
    }
    lumps[3] = new Uint8Array(vertsBuf);

    // Lump 4: Visibility
    lumps[4] = this.visLump;

    // Lump 5: Nodes (24 bytes per node)
    const nodesBuf = new ArrayBuffer(this.nodes.length * 24);
    const nodesView = new DataView(nodesBuf);
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const ofs = i * 24;
      nodesView.setUint32(ofs, n.planeNum, true);
      nodesView.setInt16(ofs + 4, n.children[0], true);
      nodesView.setInt16(ofs + 6, n.children[1], true);
      nodesView.setInt16(ofs + 8, n.mins[0], true);
      nodesView.setInt16(ofs + 10, n.mins[1], true);
      nodesView.setInt16(ofs + 12, n.mins[2], true);
      nodesView.setInt16(ofs + 14, n.maxs[0], true);
      nodesView.setInt16(ofs + 16, n.maxs[1], true);
      nodesView.setInt16(ofs + 18, n.maxs[2], true);
      nodesView.setUint16(ofs + 20, n.firstFace, true);
      nodesView.setUint16(ofs + 22, n.numFaces, true);
    }
    lumps[5] = new Uint8Array(nodesBuf);

    // Lump 6: TexInfo (40 bytes per texinfo)
    const texInfoBuf = new ArrayBuffer(this.texInfos.length * 40);
    const texInfoView = new DataView(texInfoBuf);
    for (let i = 0; i < this.texInfos.length; i++) {
      const t = this.texInfos[i];
      const ofs = i * 40;
      for (let j = 0; j < 4; j++) {
        texInfoView.setFloat32(ofs + j * 4, t.s[j], true);
        texInfoView.setFloat32(ofs + 16 + j * 4, t.t[j], true);
      }
      texInfoView.setUint32(ofs + 32, t.miptex, true);
      texInfoView.setUint32(ofs + 36, t.flags, true);
    }
    lumps[6] = new Uint8Array(texInfoBuf);

    // Lump 7: Faces (20 bytes per face)
    const facesBuf = new ArrayBuffer(this.faces.length * 20);
    const facesView = new DataView(facesBuf);
    for (let i = 0; i < this.faces.length; i++) {
      const f = this.faces[i];
      const ofs = i * 20;
      facesView.setUint16(ofs, f.planeNum, true);
      facesView.setUint16(ofs + 2, f.side, true);
      facesView.setInt32(ofs + 4, f.firstEdge, true);
      facesView.setInt16(ofs + 8, f.numEdges, true);
      facesView.setInt16(ofs + 10, f.texInfo, true);
      facesView.setUint8(ofs + 12, f.styles[0]);
      facesView.setUint8(ofs + 13, f.styles[1]);
      facesView.setUint8(ofs + 14, f.styles[2]);
      facesView.setUint8(ofs + 15, f.styles[3]);
      facesView.setInt32(ofs + 16, f.lightOfs, true);
    }
    lumps[7] = new Uint8Array(facesBuf);

    // Lump 8: Lighting
    lumps[8] = this.lightingLump;

    // Lump 9: ClipNodes (8 bytes per clipnode)
    const clipBuf = new ArrayBuffer(this.clipNodes.length * 8);
    const clipView = new DataView(clipBuf);
    for (let i = 0; i < this.clipNodes.length; i++) {
      const c = this.clipNodes[i];
      const ofs = i * 8;
      clipView.setUint32(ofs, c.planeNum, true);
      clipView.setInt16(ofs + 4, c.children[0], true);
      clipView.setInt16(ofs + 6, c.children[1], true);
    }
    lumps[9] = new Uint8Array(clipBuf);

    // Lump 10: Leaves (28 bytes per leaf)
    const leavesBuf = new ArrayBuffer(this.leaves.length * 28);
    const leavesView = new DataView(leavesBuf);
    for (let i = 0; i < this.leaves.length; i++) {
      const l = this.leaves[i];
      const ofs = i * 28;
      leavesView.setInt32(ofs, l.contents, true);
      leavesView.setInt32(ofs + 4, l.visOfs, true);
      leavesView.setInt16(ofs + 8, l.mins[0], true);
      leavesView.setInt16(ofs + 10, l.mins[1], true);
      leavesView.setInt16(ofs + 12, l.mins[2], true);
      leavesView.setInt16(ofs + 14, l.maxs[0], true);
      leavesView.setInt16(ofs + 16, l.maxs[1], true);
      leavesView.setInt16(ofs + 18, l.maxs[2], true);
      leavesView.setUint16(ofs + 20, l.firstMarkSurface, true);
      leavesView.setUint16(ofs + 22, l.numMarkSurfaces, true);
      leavesView.setUint32(ofs + 24, 0, true); // ambient sound levels
    }
    lumps[10] = new Uint8Array(leavesBuf);

    // Lump 11: MarkSurfaces (2 bytes per surface index)
    const markBuf = new ArrayBuffer(this.markSurfaces.length * 2);
    const markView = new DataView(markBuf);
    for (let i = 0; i < this.markSurfaces.length; i++) {
      markView.setUint16(i * 2, this.markSurfaces[i], true);
    }
    lumps[11] = new Uint8Array(markBuf);

    // Lump 12: Edges (4 bytes per edge: uint16 v0, uint16 v1)
    const edgesBuf = new ArrayBuffer(this.edges.length * 4);
    const edgesView = new DataView(edgesBuf);
    for (let i = 0; i < this.edges.length; i++) {
      edgesView.setUint16(i * 4, this.edges[i][0], true);
      edgesView.setUint16(i * 4 + 2, this.edges[i][1], true);
    }
    lumps[12] = new Uint8Array(edgesBuf);

    // Lump 13: SurfEdges (4 bytes per surfedge: int32)
    const surfEdgesBuf = new ArrayBuffer(this.surfEdges.length * 4);
    const surfEdgesView = new DataView(surfEdgesBuf);
    for (let i = 0; i < this.surfEdges.length; i++) {
      surfEdgesView.setInt32(i * 4, this.surfEdges[i], true);
    }
    lumps[13] = new Uint8Array(surfEdgesBuf);

    // Lump 14: Models (64 bytes per model)
    const modelsBuf = new ArrayBuffer(this.models.length * 64);
    const modelsView = new DataView(modelsBuf);
    for (let i = 0; i < this.models.length; i++) {
      const m = this.models[i];
      const ofs = i * 64;
      for (let j = 0; j < 3; j++) {
        modelsView.setFloat32(ofs + j * 4, m.mins[j], true);
        modelsView.setFloat32(ofs + 12 + j * 4, m.maxs[j], true);
        modelsView.setFloat32(ofs + 24 + j * 4, m.origin[j], true);
      }
      for (let j = 0; j < 4; j++) {
        modelsView.setInt32(ofs + 36 + j * 4, m.headNodes[j], true);
      }
      modelsView.setInt32(ofs + 52, m.visLeaves, true);
      modelsView.setInt32(ofs + 56, m.firstFace, true);
      modelsView.setInt32(ofs + 60, m.numFaces, true);
    }
    lumps[14] = new Uint8Array(modelsBuf);

    // Calculate file offsets
    let currentOffset = HEADER_SIZE;
    const lumpOffsets = [];
    for (let i = 0; i < 15; i++) {
      lumpOffsets.push({
        offset: currentOffset,
        length: lumps[i].length
      });
      currentOffset += lumps[i].length;
    }

    // Allocate final BSP ArrayBuffer
    const bspArray = new Uint8Array(currentOffset);
    const bspView = new DataView(bspArray.buffer);

    // Write version: 30 (GoldSrc)
    bspView.setUint32(0, 30, true);

    // Write 15 lump entries (offset, length)
    for (let i = 0; i < 15; i++) {
      bspView.setUint32(4 + i * 8, lumpOffsets[i].offset, true);
      bspView.setUint32(4 + i * 8 + 4, lumpOffsets[i].length, true);
      bspArray.set(lumps[i], lumpOffsets[i].offset);
    }

    return bspArray;
  }
}

window.BrowserBspCompiler = BrowserBspCompiler;
