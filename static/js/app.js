/**
 * Worldcraft Online CS 1.6 - Main Application State & UI Controller
 */

// ─────────────────────────────────────────────────────────
//  Global App State
// ─────────────────────────────────────────────────────────
const appState = {
  project: {
    name: 'my_map',
    skyname: 'desert',
    auto_skybox: true,
    fast_mode: true,
    brushes: [],
    entities: []
  },
  currentTexture: 'DUST_SANDWALL',
  lastBuildId: null,
  lastMapName: null,
  editor2D: null,
  editor3D: null,
  isDirty: false,
  selectedFace: null
};

window.appState = appState;

// ─────────────────────────────────────────────────────────
//  Static Catalogs (for 100% offline & GitHub Pages support)
// ─────────────────────────────────────────────────────────
const STATIC_TEXTURES_CATALOG = [
  { name: 'DUST_SANDWALL', category: 'Dust', description: 'Dust Sandstone Wall', preview_url: './static/textures/DUST_SANDWALL.png' },
  { name: 'DUST_SANDWALL2', category: 'Dust', description: 'Dust Wall with Trim', preview_url: './static/textures/DUST_SANDWALL2.png' },
  { name: 'DUST_GROUND', category: 'Dust', description: 'Dust Sand Ground', preview_url: './static/textures/DUST_GROUND.png' },
  { name: 'DUST_PAVEMENT', category: 'Dust', description: 'Dust Stone Tiles', preview_url: './static/textures/DUST_PAVEMENT.png' },
  { name: 'CRATE_WOOD', category: 'Crates', description: 'Wooden Supply Crate', preview_url: './static/textures/CRATE_WOOD.png' },
  { name: 'CRATE_METAL', category: 'Crates', description: 'Military Metal Container', preview_url: './static/textures/CRATE_METAL.png' },
  { name: 'AZTEC_STONE', category: 'Aztec', description: 'Aztec Ruin Stone', preview_url: './static/textures/AZTEC_STONE.png' },
  { name: 'BRICK_RED', category: 'Bricks', description: 'Red Brick Wall', preview_url: './static/textures/BRICK_RED.png' },
  { name: 'CONCRETE_WALL', category: 'Industrial', description: 'Industrial Concrete Wall', preview_url: './static/textures/CONCRETE_WALL.png' },
  { name: 'CONCRETE_FLOOR', category: 'Industrial', description: 'Slab Concrete Floor', preview_url: './static/textures/CONCRETE_FLOOR.png' },
  { name: 'TILE_CHECKER', category: 'Tiles', description: 'Office Checker Tiles', preview_url: './static/textures/TILE_CHECKER.png' },
  { name: 'TILE_POOL', category: 'Tiles', description: 'Pool Day Aqua Tiles', preview_url: './static/textures/TILE_POOL.png' },
  { name: 'METAL_PANEL', category: 'Industrial', description: 'Riveted Steel Plate', preview_url: './static/textures/METAL_PANEL.png' },
  { name: 'HAZARD_STRIPE', category: 'Industrial', description: 'Yellow Warning Stripes', preview_url: './static/textures/HAZARD_STRIPE.png' },
  { name: 'WOOD_PLANKS', category: 'Wood', description: 'Weathered Wood Floor', preview_url: './static/textures/WOOD_PLANKS.png' },
  { name: 'ROOF_SHINGLES', category: 'Roofs', description: 'Red Roof Tiles', preview_url: './static/textures/ROOF_SHINGLES.png' },
  { name: 'DOOR_WOOD', category: 'Wood', description: 'Classic Wooden Door', preview_url: './static/textures/DOOR_WOOD.png' },
  { name: 'WATER', category: 'Special', description: 'Clear Pool Water', preview_url: './static/textures/WATER.png' },
  { name: 'SKY', category: 'Special', description: 'Engine Skybox Trigger', preview_url: './static/textures/SKY.png' },
  { name: 'CLIP', category: 'Special', description: 'Player Clip Barrier', preview_url: './static/textures/CLIP.png' },
  { name: '{LADDER', category: 'Special', description: 'Climbable Ladder', preview_url: './static/textures/TRANS_LADDER.png' }
];

const STATIC_PRESETS_CATALOG = [
  {
    id: "de_dust2_mini",
    name: "de_dust2_mini",
    title: "de_dust2 Mini Arena",
    description: "Классическая песчаная арена в стиле de_dust2 с ящиками и рампой на плент.",
    skyname: "desert",
    auto_skybox: true,
    brushes: [
      { x1: -512, y1: -512, z1: 0, x2: 512, y2: 512, z2: 16, texture: "DUST_GROUND", type: "SOLID" },
      { x1: -512, y1: -512, z1: 16, x2: -496, y2: 512, z2: 192, texture: "DUST_SANDWALL", type: "SOLID" },
      { x1: 496, y1: -512, z1: 16, x2: 512, y2: 512, z2: 192, texture: "DUST_SANDWALL", type: "SOLID" },
      { x1: -512, y1: -512, z1: 16, x2: 512, y2: -496, z2: 192, texture: "DUST_SANDWALL", type: "SOLID" },
      { x1: -512, y1: 496, z1: 16, x2: 512, y2: 512, z2: 192, texture: "DUST_SANDWALL", type: "SOLID" },
      { x1: -512, y1: -16, z1: 16, x2: -128, y2: 16, z2: 144, texture: "DUST_SANDWALL2", type: "SOLID" },
      { x1: 128, y1: -16, z1: 16, x2: 512, y2: 16, z2: 144, texture: "DUST_SANDWALL2", type: "SOLID" },
      { x1: 256, y1: 256, z1: 16, x2: 480, y2: 480, z2: 64, texture: "DUST_PAVEMENT", type: "SOLID" },
      { x1: 256, y1: 176, z1: 16, x2: 352, y2: 256, z2: 64, texture: "DUST_PAVEMENT", type: "ROOF", direction: 1 },
      { x1: -64, y1: -64, z1: 16, x2: 0, y2: 0, z2: 80, texture: "CRATE_WOOD", type: "CRATE" },
      { x1: 0, y1: -64, z1: 16, x2: 64, y2: 0, z2: 80, texture: "CRATE_WOOD", type: "CRATE" },
      { x1: -16, y1: -48, z1: 80, x2: 48, y2: -16, z2: 144, texture: "CRATE_WOOD", type: "CRATE" },
      { x1: 320, y1: 320, z1: 64, x2: 384, y2: 384, z2: 128, texture: "CRATE_METAL", type: "CRATE" },
      { x1: -384, y1: -384, z1: 16, x2: -320, y2: -320, z2: 80, texture: "CRATE_WOOD", type: "CRATE" }
    ],
    entities: [
      { classname: "info_player_start", x: -256, y: 384, z: 24, angle: 270 },
      { classname: "info_player_start", x: -192, y: 384, z: 24, angle: 270 },
      { classname: "info_player_start", x: 192, y: 384, z: 24, angle: 270 },
      { classname: "info_player_start", x: 256, y: 384, z: 24, angle: 270 },
      { classname: "info_player_deathmatch", x: -256, y: -384, z: 24, angle: 90 },
      { classname: "info_player_deathmatch", x: -192, y: -384, z: 24, angle: 90 },
      { classname: "info_player_deathmatch", x: 192, y: -384, z: 24, angle: 90 },
      { classname: "info_player_deathmatch", x: 256, y: -384, z: 24, angle: 90 },
      { classname: "func_bomb_target", x: 360, y: 360, z: 70 },
      { classname: "light", x: 0, y: 0, z: 160, properties: { _light: "255 240 200 200" } }
    ]
  },
  {
    id: "fy_pool_day",
    name: "fy_pool_day_online",
    title: "fy_pool_day Arena",
    description: "Легендарная карта с бассейном по центру, кафелем и оружием на полу.",
    skyname: "de_dust",
    auto_skybox: true,
    brushes: [
      { x1: -448, y1: -448, z1: 0, x2: 448, y2: 448, z2: 16, texture: "TILE_POOL", type: "SOLID" },
      { x1: -448, y1: -448, z1: 16, x2: -432, y2: 448, z2: 160, texture: "TILE_CHECKER", type: "SOLID" },
      { x1: 432, y1: -448, z1: 16, x2: 448, y2: 448, z2: 160, texture: "TILE_CHECKER", type: "SOLID" },
      { x1: -448, y1: -448, z1: 16, x2: 448, y2: -432, z2: 160, texture: "TILE_CHECKER", type: "SOLID" },
      { x1: -448, y1: 432, z1: 16, x2: 448, y2: 448, z2: 160, texture: "TILE_CHECKER", type: "SOLID" },
      { x1: -160, y1: -160, z1: 16, x2: 160, y2: 160, z2: 24, texture: "WATER", type: "WATER" },
      { x1: -280, y1: -280, z1: 16, x2: -216, y2: -216, z2: 80, texture: "CRATE_WOOD", type: "CRATE" },
      { x1: 216, y1: 216, z1: 16, x2: 280, y2: 280, z2: 80, texture: "CRATE_WOOD", type: "CRATE" }
    ],
    entities: [
      { classname: "info_player_start", x: -160, y: 350, z: 24, angle: 270 },
      { classname: "info_player_start", x: 0, y: 350, z: 24, angle: 270 },
      { classname: "info_player_start", x: 160, y: 350, z: 24, angle: 270 },
      { classname: "info_player_deathmatch", x: -160, y: -350, z: 24, angle: 90 },
      { classname: "info_player_deathmatch", x: 0, y: -350, z: 24, angle: 90 },
      { classname: "info_player_deathmatch", x: 160, y: -350, z: 24, angle: 90 },
      { classname: "armoury_entity", x: -120, y: 280, z: 20, properties: { item: "6", count: "1" } },
      { classname: "armoury_entity", x: 120, y: 280, z: 20, properties: { item: "6", count: "1" } },
      { classname: "armoury_entity", x: -120, y: -280, z: 20, properties: { item: "4", count: "1" } },
      { classname: "armoury_entity", x: 120, y: -280, z: 20, properties: { item: "4", count: "1" } },
      { classname: "light", x: 0, y: 0, z: 140, properties: { _light: "200 230 255 250" } }
    ]
  },
  {
    id: "aim_headshot",
    name: "aim_headshot",
    title: "Aim Headshot Duel",
    description: "Симметричная тренировочная карта для оттачивания аима.",
    skyname: "city",
    auto_skybox: true,
    brushes: [
      { x1: -384, y1: -640, z1: 0, x2: 384, y2: 640, z2: 16, texture: "CONCRETE_FLOOR", type: "SOLID" },
      { x1: -384, y1: -640, z1: 16, x2: -368, y2: 640, z2: 160, texture: "BRICK_RED", type: "SOLID" },
      { x1: 368, y1: -640, z1: 16, x2: 384, y2: 640, z2: 160, texture: "BRICK_RED", type: "SOLID" },
      { x1: -384, y1: -640, z1: 16, x2: 384, y2: -624, z2: 160, texture: "BRICK_RED", type: "SOLID" },
      { x1: -384, y1: 624, z1: 16, x2: 384, y2: 640, z2: 160, texture: "BRICK_RED", type: "SOLID" },
      { x1: -192, y1: -32, z1: 16, x2: -96, y2: 32, z2: 96, texture: "CRATE_WOOD", type: "CRATE" },
      { x1: 96, y1: -32, z1: 16, x2: 192, y2: 32, z2: 96, texture: "CRATE_WOOD", type: "CRATE" }
    ],
    entities: [
      { classname: "info_player_start", x: -160, y: 500, z: 24, angle: 270 },
      { classname: "info_player_start", x: 160, y: 500, z: 24, angle: 270 },
      { classname: "info_player_deathmatch", x: -160, y: -500, z: 24, angle: 90 },
      { classname: "info_player_deathmatch", x: 160, y: -500, z: 24, angle: 90 },
      { classname: "armoury_entity", x: 0, y: 420, z: 20, properties: { item: "6", count: "1" } },
      { classname: "armoury_entity", x: 0, y: -420, z: 20, properties: { item: "4", count: "1" } }
    ]
  },
  {
    id: "empty_room",
    name: "my_new_map",
    title: "Чистая комната (Blank Room)",
    description: "Базовая закрытая площадка 512x512 для строительства с нуля.",
    skyname: "desert",
    auto_skybox: true,
    brushes: [
      { x1: -256, y1: -256, z1: 0, x2: 256, y2: 256, z2: 16, texture: "DUST_GROUND", type: "SOLID" },
      { x1: -256, y1: -256, z1: 16, x2: -240, y2: 256, z2: 128, texture: "DUST_SANDWALL", type: "SOLID" },
      { x1: 240, y1: -256, z1: 16, x2: 256, y2: 256, z2: 128, texture: "DUST_SANDWALL", type: "SOLID" },
      { x1: -256, y1: -256, z1: 16, x2: 256, y2: -240, z2: 128, texture: "DUST_SANDWALL", type: "SOLID" },
      { x1: -256, y1: 240, z1: 16, x2: 256, y2: 256, z2: 128, texture: "DUST_SANDWALL", type: "SOLID" }
    ],
    entities: [
      { classname: "info_player_start", x: -96, y: 0, z: 24, angle: 0 },
      { classname: "info_player_deathmatch", x: 96, y: 0, z: 24, angle: 180 },
      { classname: "light", x: 0, y: 0, z: 100, properties: { _light: "255 255 220 200" } }
    ]
  }
];

// ─────────────────────────────────────────────────────────
//  Elevation (Z) Controls Sync
// ─────────────────────────────────────────────────────────
function updateElevationUI(minZ, maxZ) {
  const minEl = document.getElementById('elevMinZ');
  const maxEl = document.getElementById('elevMaxZ');
  if (minEl) minEl.value = Math.round(minZ);
  if (maxEl) maxEl.value = Math.round(maxZ);
}

window.updateElevationUI = updateElevationUI;

// ─────────────────────────────────────────────────────────
//  Project Change Callback
// ─────────────────────────────────────────────────────────
function onProjectChanged() {
  appState.isDirty = true;
  updateStatusBar();
  if (appState.editor3D) {
    appState.editor3D.refreshScene();
  }
}

// ─────────────────────────────────────────────────────────
//  Tool Buttons
// ─────────────────────────────────────────────────────────
function setTool(toolName) {
  if (appState.editor2D) {
    appState.editor2D.activeTool = toolName;
  }
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolName);
  });
}

// ─────────────────────────────────────────────────────────
//  Status Bar
// ─────────────────────────────────────────────────────────
function updateStatusBar() {
  const p = appState.project;
  const bEl = document.getElementById('stat-brushes');
  const eEl = document.getElementById('stat-entities');
  const ctEl = document.getElementById('stat-ct');
  const tEl  = document.getElementById('stat-t');
  const nameEl = document.getElementById('stat-mapname');

  const ctCount = p.entities.filter(e => e.classname === 'info_player_start').length;
  const tCount  = p.entities.filter(e => e.classname === 'info_player_deathmatch').length;

  if (bEl) bEl.textContent = p.brushes.length;
  if (eEl) eEl.textContent = p.entities.length;
  if (ctEl) ctEl.textContent = ctCount;
  if (tEl)  tEl.textContent = tCount;
  if (nameEl) nameEl.textContent = (p.name || 'my_map') + (appState.isDirty ? '*' : '');
}

// ─────────────────────────────────────────────────────────
//  Modal Helpers
// ─────────────────────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
}

// ─────────────────────────────────────────────────────────
//  Texture Browser
// ─────────────────────────────────────────────────────────
async function openTextureBrowser(targetFace) {
  appState.selectedFace = targetFace || 'all';
  openModal('modal-textures');

  const grid = document.getElementById('texture-browser-grid');
  if (!grid) return;

  grid.innerHTML = '<span style="color:#999">Загрузка текстур...</span>';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    const resp = await fetch('/api/textures', { signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      renderTextureBrowserGrid(data.textures, grid);
      return;
    }
  } catch (e) {
    // Static hosting fallback
  }

  renderTextureBrowserGrid(STATIC_TEXTURES_CATALOG, grid);
}

function renderTextureBrowserGrid(textures, container) {
  container.innerHTML = '';

  const categories = {};
  for (const t of textures) {
    const cat = t.category || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(t);
  }

  for (const [catName, catTextures] of Object.entries(categories)) {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'grid-column: 1 / -1; color: #f39c12; font-weight: bold; padding: 4px 0; border-bottom: 1px solid #444; margin-top: 8px;';
    hdr.textContent = '── ' + catName;
    container.appendChild(hdr);

    for (const t of catTextures) {
      const card = document.createElement('div');
      card.className = 'texture-card' + (t.name === appState.currentTexture ? ' selected' : '');

      const img = document.createElement('img');
      img.src = t.preview_url;
      img.alt = t.name;
      img.title = t.description;

      const nameEl = document.createElement('span');
      nameEl.textContent = t.name;

      card.appendChild(img);
      card.appendChild(nameEl);

      card.addEventListener('click', () => {
        selectTexture(t.name);
        container.querySelectorAll('.texture-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });

      container.appendChild(card);
    }
  }
}

function selectTexture(texName) {
  appState.currentTexture = texName;

  const editor = appState.editor2D;
  if (editor && editor.selectedItem && editor.selectedItemType === 'brush') {
    const b = editor.selectedItem;
    if (!b.textures) b.textures = {};

    if (appState.selectedFace === 'all') {
      b.texture = texName;
      for (const face of ['top', 'bottom', 'north', 'south', 'east', 'west']) {
        b.textures[face] = texName;
      }
    } else {
      b.textures[appState.selectedFace] = texName;
    }
    editor.render();
    onProjectChanged();
  }

  const prevEl = document.getElementById('current-texture-preview');
  const cleanName = texName.replace('{', 'TRANS_');
  if (prevEl) prevEl.src = `./static/textures/${cleanName}.png`;

  closeModal('modal-textures');
}

// ─────────────────────────────────────────────────────────
//  Texture Upload
// ─────────────────────────────────────────────────────────
function initTextureUpload() {
  const dropzone = document.getElementById('upload-dropzone');
  const fileInput = document.getElementById('upload-file-input');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#f39c12';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) handleTextureUpload(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleTextureUpload(fileInput.files[0]);
  });
}

async function handleTextureUpload(file) {
  const statusEl = document.getElementById('upload-status');
  if (statusEl) statusEl.textContent = 'Загрузка...';

  const nameParts = file.name.split('.');
  const suggestedName = nameParts[0].toUpperCase().replace(/[^A-Z0-9_]/g, '').substring(0, 15);
  const texName = prompt('Название текстуры (макс. 15 символов, A-Z 0-9 _):', suggestedName) || suggestedName;

  // Try server upload first
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', texName);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const resp = await fetch('/api/upload_texture', { method: 'POST', body: formData, signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (data.success) {
        if (statusEl) {
          statusEl.innerHTML = `✅ Текстура <strong>${data.name}</strong> загружена (${data.width}x${data.height})`;
          statusEl.style.color = '#2ecc71';
        }
        openTextureBrowser();
        return;
      }
    }
  } catch (e) {
    // Static hosting client-side FileReader fallback
  }

  // Pure Client-side image load for Netlify / GitHub Pages
  const reader = new FileReader();
  reader.onload = (re) => {
    const dataUrl = re.target.result;
    STATIC_TEXTURES_CATALOG.unshift({
      name: texName,
      category: 'Custom Uploads',
      description: `Пользовательская текстура ${texName}`,
      preview_url: dataUrl
    });
    if (statusEl) {
      statusEl.innerHTML = `✅ Текстура <strong>${texName}</strong> загружена в браузер!`;
      statusEl.style.color = '#2ecc71';
    }
    const grid = document.getElementById('texture-browser-grid');
    if (grid) renderTextureBrowserGrid(STATIC_TEXTURES_CATALOG, grid);
  };
  reader.readAsDataURL(file);
}

// ─────────────────────────────────────────────────────────
//  Map Presets
// ─────────────────────────────────────────────────────────
async function openPresetsModal() {
  openModal('modal-presets');
  const container = document.getElementById('presets-container');
  if (!container) return;

  let presets = STATIC_PRESETS_CATALOG;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    const resp = await fetch('/api/presets', { signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (data.presets && data.presets.length > 0) {
        presets = data.presets;
      }
    }
  } catch (e) {
    // Static fallback
  }

  container.innerHTML = '';
  for (const preset of presets) {
    const card = document.createElement('div');
    card.style.cssText = 'background:#212429;border:1px solid #444;border-radius:6px;padding:14px;margin-bottom:12px;cursor:pointer;transition:all 0.2s;';

    card.innerHTML = `
      <div style="font-size:14px;font-weight:bold;color:#f39c12;">${preset.title}</div>
      <div style="color:#9ba3af;margin-top:5px;font-size:11px;">${preset.description}</div>
      <div style="margin-top:8px;display:flex;gap:8px;">
        <span style="background:#24322d;border:1px solid #2ecc71;color:#2ecc71;border-radius:3px;padding:2px 7px;font-size:10px;">
          ⬜ ${preset.brushes.length} брашей
        </span>
        <span style="background:#1e2b3a;border:1px solid #4a90e2;color:#4a90e2;border-radius:3px;padding:2px 7px;font-size:10px;">
          ● ${preset.entities.length} энтити
        </span>
      </div>
    `;

    card.addEventListener('mouseenter', () => {
      card.style.borderColor = '#f39c12';
      card.style.background = '#272c33';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = '#444';
      card.style.background = '#212429';
    });
    card.addEventListener('click', () => loadPreset(preset));

    container.appendChild(card);
  }
}

function loadPreset(preset) {
  if (!confirm(`Загрузить пресет "${preset.title}"?\nТекущая карта будет заменена!`)) return;

  appState.project.name = preset.name;
  appState.project.skyname = preset.skyname;
  appState.project.auto_skybox = preset.auto_skybox !== false;
  appState.project.brushes = JSON.parse(JSON.stringify(preset.brushes));
  appState.project.entities = JSON.parse(JSON.stringify(preset.entities));

  for (const b of appState.project.brushes) {
    if (!b.id) b.id = 'brush_' + Math.random().toString(36).substr(2, 8);
    if (!b.textures) {
      const tx = b.texture || 'DUST_SANDWALL';
      b.textures = { top: tx, bottom: tx, north: tx, south: tx, east: tx, west: tx };
    }
  }
  for (const e of appState.project.entities) {
    if (!e.id) e.id = 'ent_' + Math.random().toString(36).substr(2, 8);
    if (!e.properties) e.properties = {};
  }

  const nameInput = document.getElementById('map-name-input');
  if (nameInput) nameInput.value = appState.project.name;

  const skyInput = document.getElementById('sky-name-input');
  if (skyInput) skyInput.value = appState.project.skyname;

  closeAllModals();
  onProjectChanged();
  if (appState.editor2D) {
    appState.editor2D.selectedItem = null;
    appState.editor2D.render();
  }
  if (appState.editor3D) {
    appState.editor3D.refreshScene();
    appState.editor3D.resetCamera();
  }
  showNotification(`✅ Пресет "${preset.title}" загружен`, 'success');
}

// ─────────────────────────────────────────────────────────
//  Save / Load Project
// ─────────────────────────────────────────────────────────
function saveProjectLocal() {
  const json = JSON.stringify(appState.project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (appState.project.name || 'my_map') + '.wconline';
  a.click();
  appState.isDirty = false;
  updateStatusBar();
  showNotification('💾 Проект сохранён!', 'success');
}

function loadProjectLocal() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.wconline,.json';
  input.onchange = async () => {
    if (!input.files[0]) return;
    const text = await input.files[0].text();
    try {
      const data = JSON.parse(text);
      appState.project.name = data.name || 'my_map';
      appState.project.skyname = data.skyname || 'desert';
      appState.project.auto_skybox = data.auto_skybox !== false;
      appState.project.brushes = data.brushes || [];
      appState.project.entities = data.entities || [];

      for (const b of appState.project.brushes) {
        if (!b.id) b.id = 'brush_' + Math.random().toString(36).substr(2, 8);
      }
      for (const e of appState.project.entities) {
        if (!e.id) e.id = 'ent_' + Math.random().toString(36).substr(2, 8);
      }

      const nameInput = document.getElementById('map-name-input');
      if (nameInput) nameInput.value = appState.project.name;
      const skyInput = document.getElementById('sky-name-input');
      if (skyInput) skyInput.value = appState.project.skyname;

      onProjectChanged();
      if (appState.editor2D) {
        appState.editor2D.selectedItem = null;
        appState.editor2D.render();
      }
      if (appState.editor3D) {
        appState.editor3D.refreshScene();
        appState.editor3D.resetCamera();
      }
      showNotification(`📂 Проект "${appState.project.name}" загружен!`, 'success');
    } catch (e) {
      showNotification('❌ Ошибка чтения файла проекта', 'error');
    }
  };
  input.click();
}

// ─────────────────────────────────────────────────────────
//  Valve 220 .MAP Exporter
// ─────────────────────────────────────────────────────────
function generateClientMapSource(proj) {
  const lines = [];
  const mapName = proj.name || 'my_map';
  lines.push('{');
  lines.push(' "classname" "worldspawn"');
  lines.push(` "skyname" "${proj.skyname || 'desert'}"`);
  lines.push(` "wad" "${mapName}.wad"`);
  lines.push(' "mapversion" "220"');

  for (const b of proj.brushes) {
    const x1 = Math.round(Math.min(b.x1, b.x2));
    const x2 = Math.round(Math.max(b.x1, b.x2));
    const y1 = Math.round(Math.min(b.y1, b.y2));
    const y2 = Math.round(Math.max(b.y1, b.y2));
    const z1 = Math.round(Math.min(b.z1, b.z2));
    const z2 = Math.round(Math.max(b.z1, b.z2));
    const top = (b.textures && b.textures.top) || b.texture || 'DUST_SANDWALL';
    const bot = (b.textures && b.textures.bottom) || b.texture || 'DUST_SANDWALL';
    const n = (b.textures && b.textures.north) || b.texture || 'DUST_SANDWALL';
    const s = (b.textures && b.textures.south) || b.texture || 'DUST_SANDWALL';
    const e = (b.textures && b.textures.east) || b.texture || 'DUST_SANDWALL';
    const w = (b.textures && b.textures.west) || b.texture || 'DUST_SANDWALL';

    lines.push(' {');
    lines.push(`  ( ${x1} ${y2} ${z2} ) ( ${x2} ${y2} ${z2} ) ( ${x2} ${y1} ${z2} ) ${top} [ 1 0 0 0 ] [ 0 -1 0 0 ] 0 1 1`);
    lines.push(`  ( ${x1} ${y1} ${z1} ) ( ${x2} ${y1} ${z1} ) ( ${x2} ${y2} ${z1} ) ${bot} [ 1 0 0 0 ] [ 0 -1 0 0 ] 0 1 1`);
    lines.push(`  ( ${x2} ${y2} ${z2} ) ( ${x1} ${y2} ${z2} ) ( ${x1} ${y2} ${z1} ) ${n} [ 1 0 0 0 ] [ 0 0 -1 0 ] 0 1 1`);
    lines.push(`  ( ${x1} ${y1} ${z2} ) ( ${x2} ${y1} ${z2} ) ( ${x2} ${y1} ${z1} ) ${s} [ 1 0 0 0 ] [ 0 0 -1 0 ] 0 1 1`);
    lines.push(`  ( ${x2} ${y1} ${z2} ) ( ${x2} ${y2} ${z2} ) ( ${x2} ${y2} ${z1} ) ${e} [ 0 1 0 0 ] [ 0 0 -1 0 ] 0 1 1`);
    lines.push(`  ( ${x1} ${y2} ${z2} ) ( ${x1} ${y1} ${z2} ) ( ${x1} ${y1} ${z1} ) ${w} [ 0 1 0 0 ] [ 0 0 -1 0 ] 0 1 1`);
    lines.push(' }');
  }

  lines.push('}');

  for (const ent of proj.entities) {
    lines.push('{');
    lines.push(` "classname" "${ent.classname}"`);
    lines.push(` "origin" "${Math.round(ent.x)} ${Math.round(ent.y)} ${Math.round(ent.z)}"`);
    if (ent.angle) lines.push(` "angle" "${Math.round(ent.angle)}"`);
    lines.push('}');
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────
//  Compile & BSP Download
// ─────────────────────────────────────────────────────────
async function compileMap() {
  const p = appState.project;
  const termEl = document.getElementById('compile-terminal');
  const progressFill = document.getElementById('compile-progress-fill');
  const downloadCards = document.getElementById('download-cards');

  openModal('modal-compile');

  if (termEl) termEl.textContent = '';
  if (progressFill) progressFill.style.width = '0%';
  if (downloadCards) downloadCards.style.display = 'none';

  const compileBtn = document.getElementById('btn-compile-start');
  if (compileBtn) compileBtn.disabled = true;

  const appendLog = (line) => {
    if (!termEl) return;
    termEl.textContent += line + '\n';
    termEl.scrollTop = termEl.scrollHeight;
  };

  const setProgress = (pct) => {
    if (progressFill) progressFill.style.width = pct + '%';
  };

  appendLog('==================================================');
  appendLog(`  WORLDCRAFT ONLINE - CS 1.6 COMPILER`);
  appendLog(`  Карта: ${p.name || 'my_map'} | Брашей: ${p.brushes.length} | Энтити: ${p.entities.length}`);
  appendLog('==================================================');
  setProgress(10);

  const compileData = {
    ...p,
    fast_mode: document.getElementById('check-fast-mode')?.checked !== false
  };

  let usedServer = false;

  // 1. Try server compilation first
  try {
    appendLog('>> Попытка компиляции через сервер...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const resp = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(compileData),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const result = await resp.json();
      if (result.logs) {
        for (const line of result.logs) {
          appendLog(line);
        }
      }
      if (result.success) {
        usedServer = true;
        setProgress(100);
        appState.lastBuildId = result.build_id;
        appState.lastMapName = result.map_name;

        if (downloadCards) {
          downloadCards.style.display = 'flex';
          const bspLink = document.getElementById('download-bsp-link');
          const mapLink = document.getElementById('download-map-link');
          const wadLink = document.getElementById('download-wad-link');
          const bspInfo = document.getElementById('bsp-info');

          if (bspLink) {
            bspLink.href = `/api/download/bsp/${result.build_id}`;
            bspLink.download = `${result.map_name}.bsp`;
          }
          if (mapLink) {
            mapLink.href = `/api/download/map/${result.build_id}`;
            mapLink.download = `${result.map_name}.map`;
          }
          if (wadLink) {
            wadLink.href = `/api/download/wad/${result.build_id}`;
            wadLink.download = `${result.map_name}.wad`;
          }
          if (bspInfo) bspInfo.textContent = `${result.map_name}.bsp — ${Math.round(result.bsp_size / 1024)} КБ`;
        }
      }
    }
  } catch (e) {
    // Server unavailable -> fallback to browser compiler
  }

  // 2. Client-Side In-Browser Compiler Fallback
  if (!usedServer) {
    appendLog('>> [Client-Side Mode] Компиляция прямо в браузере (GitHub Pages / Netlify / Offline)...');
    setProgress(30);

    try {
      const wadPacker = new BrowserWad();
      const usedTexNames = new Set();
      for (const b of p.brushes) {
        if (b.texture) usedTexNames.add(b.texture.toUpperCase());
        if (b.textures) {
          for (const face of Object.values(b.textures)) {
            if (face) usedTexNames.add(face.toUpperCase());
          }
        }
      }
      if (usedTexNames.size === 0) usedTexNames.add('DUST_SANDWALL');

      appendLog(`>> [1/4] Упаковка ${usedTexNames.size} текстур в WAD3...`);
      for (const texName of usedTexNames) {
        const clean = texName.replace('{', 'TRANS_');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = `./static/textures/${clean}.png`;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        await wadPacker.addTextureFromImage(texName, img, texName.startsWith('{'));
      }
      const wadBytes = wadPacker.buildWad();
      setProgress(60);

      appendLog('>> [2/4] Построение полигонов BSP v30 и Clipnodes коллизий...');
      const compiler = new BrowserBspCompiler(p, wadPacker.textures);
      const bspBytes = compiler.compile((msg, pct) => {
        appendLog(msg);
        setProgress(pct);
      });

      appendLog(`\n==================================================`);
      appendLog(`  УСПЕХ! КАРТА СКОМПИЛИРОВАНА ПРЯМО В БРАУЗЕРЕ!`);
      appendLog(`  Размер .BSP: ${bspBytes.length.toLocaleString()} байт (${Math.round(bspBytes.length / 1024)} КБ)`);
      appendLog(`==================================================`);
      setProgress(100);

      const mapName = p.name || 'my_map';
      const bspBlob = new Blob([bspBytes], { type: 'application/octet-stream' });
      const bspUrl = URL.createObjectURL(bspBlob);

      const wadBlob = new Blob([wadBytes], { type: 'application/octet-stream' });
      const wadUrl = URL.createObjectURL(wadBlob);

      const mapSourceText = generateClientMapSource(p);
      const mapBlob = new Blob([mapSourceText], { type: 'text/plain;charset=utf-8' });
      const mapUrl = URL.createObjectURL(mapBlob);

      if (downloadCards) {
        downloadCards.style.display = 'flex';
        const bspLink = document.getElementById('download-bsp-link');
        const mapLink = document.getElementById('download-map-link');
        const wadLink = document.getElementById('download-wad-link');
        const bspInfo = document.getElementById('bsp-info');

        if (bspLink) {
          bspLink.href = bspUrl;
          bspLink.download = `${mapName}.bsp`;
        }
        if (mapLink) {
          mapLink.href = mapUrl;
          mapLink.download = `${mapName}.map`;
        }
        if (wadLink) {
          wadLink.href = wadUrl;
          wadLink.download = `${mapName}.wad`;
        }
        if (bspInfo) bspInfo.textContent = `${mapName}.bsp — ${Math.round(bspBytes.length / 1024)} КБ (Готов к игре)`;
      }
    } catch (err) {
      appendLog(`\n❌ Ошибка компиляции в браузере: ${err.message}`);
      console.error(err);
    }
  }

  if (compileBtn) compileBtn.disabled = false;
}

// ─────────────────────────────────────────────────────────
//  Grid Snap controls
// ─────────────────────────────────────────────────────────
function setGridSnap(val) {
  if (appState.editor2D) {
    appState.editor2D.gridSnap = val;
  }
  document.querySelectorAll('.grid-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.snap) === val);
  });
}

// ─────────────────────────────────────────────────────────
//  Notifications
// ─────────────────────────────────────────────────────────
function showNotification(msg, type = 'info') {
  let el = document.getElementById('notification-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notification-toast';
    el.style.cssText = 'position:fixed;bottom:46px;right:16px;background:#2b2e33;border:1px solid #555;border-radius:6px;padding:10px 16px;color:#fff;font-size:12px;z-index:9999;transition:opacity 0.3s;max-width:280px;';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.borderColor = type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#888';
  el.style.opacity = '1';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

// ─────────────────────────────────────────────────────────
//  Properties Panel Updates
// ─────────────────────────────────────────────────────────
function updatePropertiesPanel() {
  const ed = appState.editor2D;
  const panel = document.getElementById('props-panel');
  if (!panel) return;

  if (!ed || !ed.selectedItem) {
    panel.innerHTML = '<p style="color:#666;font-style:italic;text-align:center;margin-top:20px;">Выберите объект кликом в редакторе</p>';
    return;
  }

  const item = ed.selectedItem;
  const type = ed.selectedItemType;

  if (type === 'brush') {
    const tex = (item.textures && item.textures.top) ? item.textures.top : (item.texture || 'DUST_SANDWALL');
    const cleanTex = tex.replace('{', 'TRANS_');
    panel.innerHTML = `
      <div style="padding:10px;">
        <div class="prop-section-title">📦 Браш</div>
        <div class="prop-row"><span>Тип:</span>
          <select id="prop-brush-type" class="prop-select">
            <option value="SOLID"${item.type === 'SOLID' ? ' selected' : ''}>SOLID</option>
            <option value="CRATE"${item.type === 'CRATE' ? ' selected' : ''}>CRATE</option>
            <option value="ROOF"${item.type === 'ROOF' ? ' selected' : ''}>ROOF/Ramp</option>
            <option value="WATER"${item.type === 'WATER' ? ' selected' : ''}>WATER</option>
            <option value="LADDER"${item.type === 'LADDER' ? ' selected' : ''}>LADDER</option>
            <option value="BOMBSITE"${item.type === 'BOMBSITE' ? ' selected' : ''}>BOMB SITE</option>
            <option value="BUYZONE"${item.type === 'BUYZONE' ? ' selected' : ''}>BUY ZONE</option>
          </select>
        </div>
        <div class="prop-row"><span>X1: <strong>${Math.round(item.x1)}</strong></span> <span>X2: <strong>${Math.round(item.x2)}</strong></span></div>
        <div class="prop-row"><span>Y1: <strong>${Math.round(item.y1)}</strong></span> <span>Y2: <strong>${Math.round(item.y2)}</strong></span></div>
        <div class="prop-row"><span>Z1 (пол):</span><input id="prop-z1" type="number" class="prop-input" value="${Math.round(item.z1)}" step="16"/></div>
        <div class="prop-row"><span>Z2 (потолок):</span><input id="prop-z2" type="number" class="prop-input" value="${Math.round(item.z2)}" step="16"/></div>
        
        <div class="prop-section-title" style="margin-top:10px;">🎨 Текстуры</div>
        <div style="text-align:center;margin:8px 0;">
          <img src="./static/textures/${cleanTex}.png" style="width:64px;height:64px;image-rendering:pixelated;border:1px solid #555;border-radius:3px;">
          <div style="color:#aaa;font-size:10px;margin-top:3px;">${tex}</div>
        </div>
        <div class="prop-texture-grid">
          ${['top','bottom','north','south','east','west'].map(face => {
            const ft = (item.textures && item.textures[face]) ? item.textures[face] : tex;
            const fc = ft.replace('{', 'TRANS_');
            return `<div style="text-align:center;cursor:pointer;" title="${face}: ${ft}" onclick="openTextureBrowser('${face}')">
              <img src="./static/textures/${fc}.png" style="width:38px;height:38px;image-rendering:pixelated;border:1px solid #444;border-radius:2px;">
              <div style="font-size:9px;color:#888;">${face}</div>
            </div>`;
          }).join('')}
        </div>
        <button onclick="openTextureBrowser('all')" class="btn-menu" style="width:100%;margin-top:8px;">🎨 Сменить все текстуры</button>
      </div>`;

    document.getElementById('prop-brush-type')?.addEventListener('change', (e) => {
      item.type = e.target.value;
      onProjectChanged();
    });
    document.getElementById('prop-z1')?.addEventListener('change', (e) => {
      item.z1 = parseFloat(e.target.value);
      updateElevationUI(item.z1, item.z2);
      onProjectChanged();
    });
    document.getElementById('prop-z2')?.addEventListener('change', (e) => {
      item.z2 = parseFloat(e.target.value);
      updateElevationUI(item.z1, item.z2);
      onProjectChanged();
    });
  } else if (type === 'entity') {
    panel.innerHTML = `
      <div style="padding:10px;">
        <div class="prop-section-title">● Энтити</div>
        <div class="prop-row"><span>Класс:</span><strong style="color:#4a90e2;">${item.classname}</strong></div>
        <div class="prop-row"><span>X:</span><input id="prop-ex" type="number" class="prop-input" value="${Math.round(item.x)}" step="16"/></div>
        <div class="prop-row"><span>Y:</span><input id="prop-ey" type="number" class="prop-input" value="${Math.round(item.y)}" step="16"/></div>
        <div class="prop-row"><span>Z:</span><input id="prop-ez" type="number" class="prop-input" value="${Math.round(item.z)}" step="16"/></div>
        <div class="prop-row"><span>Угол:</span><input id="prop-ea" type="number" class="prop-input" value="${Math.round(item.angle || 0)}" step="45"/></div>
      </div>`;

    document.getElementById('prop-ex')?.addEventListener('change', e => { item.x = parseFloat(e.target.value); onProjectChanged(); });
    document.getElementById('prop-ey')?.addEventListener('change', e => { item.y = parseFloat(e.target.value); onProjectChanged(); });
    document.getElementById('prop-ez')?.addEventListener('change', e => { item.z = parseFloat(e.target.value); onProjectChanged(); });
    document.getElementById('prop-ea')?.addEventListener('change', e => { item.angle = parseFloat(e.target.value); onProjectChanged(); });
  }
}

// ─────────────────────────────────────────────────────────
//  Initialize App
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const canvas2D = document.getElementById('canvas2D');
  if (canvas2D) {
    appState.editor2D = new Worldcraft2D(
      canvas2D,
      appState.project,
      () => {
        onProjectChanged();
        updatePropertiesPanel();
      }
    );
  }

  const canvas3D = document.getElementById('canvas3D');
  if (canvas3D && typeof THREE !== 'undefined') {
    appState.editor3D = new Worldcraft3D(canvas3D, appState.project);
  }

  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  document.querySelectorAll('.grid-btn[data-snap]').forEach(btn => {
    btn.addEventListener('click', () => setGridSnap(parseInt(btn.dataset.snap)));
  });

  document.getElementById('map-name-input')?.addEventListener('input', (e) => {
    appState.project.name = e.target.value;
    updateStatusBar();
  });

  document.getElementById('sky-name-input')?.addEventListener('input', (e) => {
    appState.project.skyname = e.target.value;
  });

  document.getElementById('elevMinZ')?.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (appState.editor2D) appState.editor2D.setElevation(val, parseFloat(document.getElementById('elevMaxZ')?.value || val + 128));
  });

  document.getElementById('elevMaxZ')?.addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (appState.editor2D) appState.editor2D.setElevation(parseFloat(document.getElementById('elevMinZ')?.value || 0), val);
  });

  initTextureUpload();

  document.getElementById('btn-compile')?.addEventListener('click', compileMap);
  document.getElementById('btn-compile-start')?.addEventListener('click', compileMap);
  document.getElementById('btn-presets')?.addEventListener('click', openPresetsModal);

  document.getElementById('btn-wireframe')?.addEventListener('click', (e) => {
    const wf = e.target.classList.toggle('active');
    appState.editor3D?.setWireframe(wf);
  });

  document.getElementById('btn-reset-cam')?.addEventListener('click', () => {
    appState.editor3D?.resetCamera();
  });

  window.addEventListener('resize', () => {
    appState.editor2D?.resizeCanvas();
    appState.editor3D?.resize();
  });

  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeAllModals();
    });
  });

  setTool('select');
  setGridSnap(16);
  updateStatusBar();

  // Load default de_dust2_mini preset at startup so map is not empty
  if (STATIC_PRESETS_CATALOG.length > 0) {
    loadPreset(STATIC_PRESETS_CATALOG[0]);
  }

  console.log('🎮 Worldcraft Online CS 1.6 initialized!');
});
