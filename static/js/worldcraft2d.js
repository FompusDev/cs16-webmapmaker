/**
 * Worldcraft Online CS 1.6 - 2D Orthographic Blueprint Grid Editor
 * Features: Grid snapping, Pan & Zoom, Drag-and-drop, Corner/Edge Resizing,
 * Rotation, Live Measurement Tooltips, and Elevation Sync.
 */

class Worldcraft2D {
  constructor(canvas, project, onProjectChanged) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.project = project;
    this.onProjectChanged = onProjectChanged;

    // Viewport transform (World -> Screen)
    this.cameraX = 0; // World coordinate at center
    this.cameraY = 0;
    this.zoom = 0.8;  // Scale factor (pixels per GoldSrc unit)
    this.gridSnap = 16;

    // Active tool state
    this.activeTool = 'select'; // 'select', 'wall', 'crate', 'ramp', 'ct', 't', 'bomb', 'weapon', 'light', 'ladder', 'water'
    this.selectedItem = null;   // Brush or Entity
    this.selectedItemType = null; // 'brush' or 'entity'

    // Interaction states
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragInitialPos = null;

    this.activeHandle = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rot'
    this.isResizing = false;
    this.isRotating = false;

    this.isDrawingNew = false;
    this.drawStartWorld = { x: 0, y: 0 };
    this.drawCurrentWorld = { x: 0, y: 0 };

    // Tooltip elements
    this.infoX = document.getElementById('measurementX');
    this.infoY = document.getElementById('measurementY');

    // Current default elevation
    this.currentMinZ = 16;
    this.currentMaxZ = 144;

    this.initEvents();
    this.resizeCanvas();
    this.render();
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.render();
  }

  screenToWorld(sx, sy) {
    const wx = (sx - this.canvas.width / 2) / this.zoom + this.cameraX;
    const wy = (this.canvas.height / 2 - sy) / this.zoom + this.cameraY;
    return { x: wx, y: wy };
  }

  worldToScreen(wx, wy) {
    const sx = (wx - this.cameraX) * this.zoom + this.canvas.width / 2;
    const sy = this.canvas.height / 2 - (wy - this.cameraY) * this.zoom;
    return { x: sx, y: sy };
  }

  snap(val) {
    return Math.round(val / this.gridSnap) * this.gridSnap;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard shortcuts (Delete, Duplicate)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelected();
      } else if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.duplicateSelected();
      }
    });
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);

    // Right-click or middle-click or Space+click -> Pan
    if (e.button === 1 || e.button === 2 || e.shiftKey) {
      this.isPanning = true;
      this.panStartX = sx;
      this.panStartY = sy;
      this.canvas.style.cursor = 'grab';
      return;
    }

    if (e.button === 0) {
      // 1. Check if clicking on resize / rotation handles of selected brush
      if (this.selectedItem && this.selectedItemType === 'brush') {
        const handle = this.hitTestHandles(sx, sy, this.selectedItem);
        if (handle) {
          if (handle === 'rot') {
            this.isRotating = true;
          } else {
            this.isResizing = true;
            this.activeHandle = handle;
            this.dragInitialPos = { ...this.selectedItem };
          }
          return;
        }
      }

      // 2. Select tool
      if (this.activeTool === 'select') {
        const hit = this.hitTest(world.x, world.y);
        if (hit) {
          this.selectedItem = hit.item;
          this.selectedItemType = hit.type;
          this.isDragging = true;
          this.dragStartX = world.x;
          this.dragStartY = world.y;
          this.dragInitialPos = hit.type === 'brush'
            ? { ...hit.item }
            : { x: hit.item.x, y: hit.item.y, z: hit.item.z };
          this.syncElevationControls();
        } else {
          this.selectedItem = null;
          this.selectedItemType = null;
        }
        this.render();
        this.onProjectChanged();
        return;
      }

      // 3. Entity placement tools
      if (['ct', 't', 'bomb', 'weapon', 'light'].includes(this.activeTool)) {
        const snappedX = this.snap(world.x);
        const snappedY = this.snap(world.y);
        let classname = 'info_player_start';
        let angle = 0;
        let props = {};

        if (this.activeTool === 'ct') {
          classname = 'info_player_start';
        } else if (this.activeTool === 't') {
          classname = 'info_player_deathmatch';
          angle = 180;
        } else if (this.activeTool === 'bomb') {
          classname = 'func_bomb_target';
        } else if (this.activeTool === 'weapon') {
          classname = 'armoury_entity';
          props = { item: '4', count: '1' }; // AK-47
        } else if (this.activeTool === 'light') {
          classname = 'light';
          props = { _light: '255 255 200 200' };
        }

        const newEnt = {
          id: 'ent_' + Math.random().toString(36).substr(2, 8),
          classname,
          x: snappedX,
          y: snappedY,
          z: this.currentMinZ + 8,
          angle,
          properties: props
        };
        this.project.entities.push(newEnt);
        this.selectedItem = newEnt;
        this.selectedItemType = 'entity';
        this.activeTool = 'select';
        this.render();
        this.onProjectChanged();
        return;
      }

      // 4. Brush drawing tools (wall, crate, ramp, ladder, water)
      this.isDrawingNew = true;
      this.drawStartWorld = { x: this.snap(world.x), y: this.snap(world.y) };
      this.drawCurrentWorld = { ...this.drawStartWorld };
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = this.screenToWorld(sx, sy);

    // Pan
    if (this.isPanning) {
      const dx = (sx - this.panStartX) / this.zoom;
      const dy = (sy - this.panStartY) / this.zoom;
      this.cameraX -= dx;
      this.cameraY += dy;
      this.panStartX = sx;
      this.panStartY = sy;
      this.render();
      return;
    }

    // Drag move
    if (this.isDragging && this.selectedItem) {
      const dx = this.snap(world.x - this.dragStartX);
      const dy = this.snap(world.y - this.dragStartY);

      if (this.selectedItemType === 'brush') {
        const w = this.dragInitialPos.x2 - this.dragInitialPos.x1;
        const l = this.dragInitialPos.y2 - this.dragInitialPos.y1;
        this.selectedItem.x1 = this.dragInitialPos.x1 + dx;
        this.selectedItem.x2 = this.selectedItem.x1 + w;
        this.selectedItem.y1 = this.dragInitialPos.y1 + dy;
        this.selectedItem.y2 = this.selectedItem.y1 + l;
      } else if (this.selectedItemType === 'entity') {
        this.selectedItem.x = this.dragInitialPos.x + dx;
        this.selectedItem.y = this.dragInitialPos.y + dy;
      }
      this.render();
      this.onProjectChanged();
      return;
    }

    // Resize handles
    if (this.isResizing && this.selectedItem && this.selectedItemType === 'brush') {
      const b = this.selectedItem;
      const init = this.dragInitialPos;
      const curX = this.snap(world.x);
      const curY = this.snap(world.y);

      if (this.activeHandle.includes('e')) b.x2 = Math.max(init.x1 + this.gridSnap, curX);
      if (this.activeHandle.includes('w')) b.x1 = Math.min(init.x2 - this.gridSnap, curX);
      if (this.activeHandle.includes('n')) b.y2 = Math.max(init.y1 + this.gridSnap, curY);
      if (this.activeHandle.includes('s')) b.y1 = Math.min(init.y2 - this.gridSnap, curY);

      this.updateMeasurementTooltips(b);
      this.render();
      this.onProjectChanged();
      return;
    }

    // Drawing new brush
    if (this.isDrawingNew) {
      this.drawCurrentWorld = { x: this.snap(world.x), y: this.snap(world.y) };
      const tempBox = {
        x1: Math.min(this.drawStartWorld.x, this.drawCurrentWorld.x),
        x2: Math.max(this.drawStartWorld.x, this.drawCurrentWorld.x),
        y1: Math.min(this.drawStartWorld.y, this.drawCurrentWorld.y),
        y2: Math.max(this.drawStartWorld.y, this.drawCurrentWorld.y)
      };
      this.updateMeasurementTooltips(tempBox);
      this.render();
      return;
    }

    // Update cursor when hovering over handles
    if (this.selectedItem && this.selectedItemType === 'brush' && !this.isPanning) {
      const handle = this.hitTestHandles(sx, sy, this.selectedItem);
      if (handle) {
        if (handle === 'nw' || handle === 'se') this.canvas.style.cursor = 'nwse-resize';
        else if (handle === 'ne' || handle === 'sw') this.canvas.style.cursor = 'nesw-resize';
        else if (handle === 'n' || handle === 's') this.canvas.style.cursor = 'ns-resize';
        else if (handle === 'e' || handle === 'w') this.canvas.style.cursor = 'ew-resize';
        else if (handle === 'rot') this.canvas.style.cursor = 'crosshair';
        return;
      }
    }

    this.canvas.style.cursor = this.activeTool === 'select' ? 'default' : 'crosshair';
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }

    if (this.isDragging) {
      this.isDragging = false;
    }

    if (this.isResizing) {
      this.isResizing = false;
      this.activeHandle = null;
      this.hideMeasurementTooltips();
    }

    if (this.isDrawingNew) {
      this.isDrawingNew = false;
      this.hideMeasurementTooltips();

      let x1 = Math.min(this.drawStartWorld.x, this.drawCurrentWorld.x);
      let x2 = Math.max(this.drawStartWorld.x, this.drawCurrentWorld.x);
      let y1 = Math.min(this.drawStartWorld.y, this.drawCurrentWorld.y);
      let y2 = Math.max(this.drawStartWorld.y, this.drawCurrentWorld.y);

      // Minimum size check (if just clicked without dragging, make a default box)
      if (x2 - x1 < this.gridSnap) x2 = x1 + (this.activeTool === 'crate' ? 64 : 128);
      if (y2 - y1 < this.gridSnap) y2 = y1 + (this.activeTool === 'crate' ? 64 : 128);

      let bType = 'SOLID';
      let tex = window.appState ? window.appState.currentTexture : 'DUST_SANDWALL';
      let z1 = this.currentMinZ;
      let z2 = this.currentMaxZ;

      if (this.activeTool === 'crate') {
        bType = 'CRATE';
        tex = 'CRATE_WOOD';
        z2 = z1 + 64;
      } else if (this.activeTool === 'ramp') {
        bType = 'ROOF';
        tex = 'ROOF_SHINGLES';
      } else if (this.activeTool === 'ladder') {
        bType = 'LADDER';
        tex = '{LADDER';
      } else if (this.activeTool === 'water') {
        bType = 'WATER';
        tex = 'WATER';
        z2 = z1 + 32;
      }

      const newBrush = {
        id: 'brush_' + Math.random().toString(36).substr(2, 8),
        type: bType,
        x1, y1, z1,
        x2, y2, z2,
        texture: tex,
        textures: { top: tex, bottom: tex, north: tex, south: tex, east: tex, west: tex },
        direction: 1
      };

      this.project.brushes.push(newBrush);
      this.selectedItem = newBrush;
      this.selectedItemType = 'brush';
      this.activeTool = 'select';
      this.syncElevationControls();
      this.render();
      this.onProjectChanged();
    }
  }

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const mouseWorldBefore = this.screenToWorld(sx, sy);

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.max(0.1, Math.min(6.0, this.zoom * zoomFactor));

    this.zoom = newZoom;
    const mouseWorldAfter = this.screenToWorld(sx, sy);
    this.cameraX += (mouseWorldBefore.x - mouseWorldAfter.x);
    this.cameraY += (mouseWorldBefore.y - mouseWorldAfter.y);

    this.render();
  }

  hitTest(wx, wy) {
    // 1. Entities (check point distance)
    for (let i = this.project.entities.length - 1; i >= 0; i--) {
      const e = this.project.entities[i];
      const dist = Math.hypot(e.x - wx, e.y - wy);
      if (dist <= 24 / this.zoom) {
        return { type: 'entity', item: e };
      }
    }

    // 2. Brushes (bounding box)
    for (let i = this.project.brushes.length - 1; i >= 0; i--) {
      const b = this.project.brushes[i];
      if (wx >= b.x1 && wx <= b.x2 && wy >= b.y1 && wy <= b.y2) {
        return { type: 'brush', item: b };
      }
    }
    return null;
  }

  hitTestHandles(sx, sy, brush) {
    const p1 = this.worldToScreen(brush.x1, brush.y2); // NW
    const p2 = this.worldToScreen(brush.x2, brush.y1); // SE
    const xMin = Math.min(p1.x, p2.x);
    const xMax = Math.max(p1.x, p2.x);
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    const xMid = (xMin + xMax) / 2;
    const yMid = (yMin + yMax) / 2;

    const handles = {
      'nw': { x: xMin, y: yMin },
      'n':  { x: xMid, y: yMin },
      'ne': { x: xMax, y: yMin },
      'e':  { x: xMax, y: yMid },
      'se': { x: xMax, y: yMax },
      's':  { x: xMid, y: yMax },
      'sw': { x: xMin, y: yMax },
      'w':  { x: xMin, y: yMid },
      'rot':{ x: xMax + 18, y: yMid }
    };

    const handleRadius = 7;
    for (const [name, pos] of Object.entries(handles)) {
      if (Math.hypot(sx - pos.x, sy - pos.y) <= handleRadius) {
        return name;
      }
    }
    return null;
  }

  updateMeasurementTooltips(box) {
    const p1 = this.worldToScreen(box.x1, box.y2);
    const p2 = this.worldToScreen(box.x2, box.y1);
    const w = Math.round(Math.abs(box.x2 - box.x1));
    const h = Math.round(Math.abs(box.y2 - box.y1));

    if (this.infoX && this.infoY) {
      this.infoX.style.display = 'block';
      this.infoX.style.left = `${(p1.x + p2.x) / 2}px`;
      this.infoX.style.top = `${Math.min(p1.y, p2.y) - 22}px`;
      this.infoX.textContent = `W: ${w}`;

      this.infoY.style.display = 'block';
      this.infoY.style.left = `${Math.max(p1.x, p2.x) + 8}px`;
      this.infoY.style.top = `${(p1.y + p2.y) / 2}px`;
      this.infoY.textContent = `L: ${h}`;
    }
  }

  hideMeasurementTooltips() {
    if (this.infoX) this.infoX.style.display = 'none';
    if (this.infoY) this.infoY.style.display = 'none';
  }

  syncElevationControls() {
    if (this.selectedItem && this.selectedItemType === 'brush') {
      this.currentMinZ = this.selectedItem.z1;
      this.currentMaxZ = this.selectedItem.z2;
    }
    if (window.updateElevationUI) {
      window.updateElevationUI(this.currentMinZ, this.currentMaxZ);
    }
  }

  setElevation(minZ, maxZ) {
    this.currentMinZ = minZ;
    this.currentMaxZ = maxZ;
    if (this.selectedItem && this.selectedItemType === 'brush') {
      this.selectedItem.z1 = minZ;
      this.selectedItem.z2 = maxZ;
      this.render();
      this.onProjectChanged();
    }
  }

  deleteSelected() {
    if (!this.selectedItem) return;
    if (this.selectedItemType === 'brush') {
      this.project.brushes = this.project.brushes.filter(b => b !== this.selectedItem);
    } else if (this.selectedItemType === 'entity') {
      this.project.entities = this.project.entities.filter(e => e !== this.selectedItem);
    }
    this.selectedItem = null;
    this.selectedItemType = null;
    this.render();
    this.onProjectChanged();
  }

  duplicateSelected() {
    if (!this.selectedItem) return;
    if (this.selectedItemType === 'brush') {
      const copy = JSON.parse(JSON.stringify(this.selectedItem));
      copy.id = 'brush_' + Math.random().toString(36).substr(2, 8);
      copy.x1 += 32;
      copy.x2 += 32;
      copy.y1 += 32;
      copy.y2 += 32;
      this.project.brushes.push(copy);
      this.selectedItem = copy;
    } else if (this.selectedItemType === 'entity') {
      const copy = JSON.parse(JSON.stringify(this.selectedItem));
      copy.id = 'ent_' + Math.random().toString(36).substr(2, 8);
      copy.x += 32;
      copy.y += 32;
      this.project.entities.push(copy);
      this.selectedItem = copy;
    }
    this.render();
    this.onProjectChanged();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.fillStyle = '#111315';
    ctx.fillRect(0, 0, w, h);

    // Render Grid
    this.renderGrid(ctx, w, h);

    // Render Brushes
    for (const b of this.project.brushes) {
      this.renderBrush(ctx, b, b === this.selectedItem);
    }

    // Render Active Draw Box
    if (this.isDrawingNew) {
      const x1 = Math.min(this.drawStartWorld.x, this.drawCurrentWorld.x);
      const x2 = Math.max(this.drawStartWorld.x, this.drawCurrentWorld.x);
      const y1 = Math.min(this.drawStartWorld.y, this.drawCurrentWorld.y);
      const y2 = Math.max(this.drawStartWorld.y, this.drawCurrentWorld.y);
      const p1 = this.worldToScreen(x1, y2);
      const p2 = this.worldToScreen(x2, y1);

      ctx.fillStyle = 'rgba(243, 156, 18, 0.25)';
      ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    }

    // Render Entities
    for (const e of this.project.entities) {
      this.renderEntity(ctx, e, e === this.selectedItem);
    }
  }

  renderGrid(ctx, w, h) {
    const topLeft = this.screenToWorld(0, 0);
    const botRight = this.screenToWorld(w, h);

    const startX = Math.floor(topLeft.x / this.gridSnap) * this.gridSnap;
    const endX = Math.ceil(botRight.x / this.gridSnap) * this.gridSnap;
    const startY = Math.floor(botRight.y / this.gridSnap) * this.gridSnap;
    const endY = Math.ceil(topLeft.y / this.gridSnap) * this.gridSnap;

    // Minor grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1b1e22';
    ctx.beginPath();
    for (let x = startX; x <= endX; x += this.gridSnap) {
      if (x % (this.gridSnap * 4) === 0) continue;
      const s = this.worldToScreen(x, 0);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, h);
    }
    for (let y = startY; y <= endY; y += this.gridSnap) {
      if (y % (this.gridSnap * 4) === 0) continue;
      const s = this.worldToScreen(0, y);
      ctx.moveTo(0, s.y);
      ctx.lineTo(w, s.y);
    }
    ctx.stroke();

    // Major grid (64 units)
    ctx.strokeStyle = '#292e34';
    ctx.beginPath();
    for (let x = startX; x <= endX; x += this.gridSnap) {
      if (x % (this.gridSnap * 4) !== 0) continue;
      const s = this.worldToScreen(x, 0);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, h);
    }
    for (let y = startY; y <= endY; y += this.gridSnap) {
      if (y % (this.gridSnap * 4) !== 0) continue;
      const s = this.worldToScreen(0, y);
      ctx.moveTo(0, s.y);
      ctx.lineTo(w, s.y);
    }
    ctx.stroke();

    // Axes (X in red, Y in green)
    const origin = this.worldToScreen(0, 0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#d9534f'; // X-axis (Red)
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(w, origin.y);
    ctx.stroke();

    ctx.strokeStyle = '#5cb85c'; // Y-axis (Green)
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, h);
    ctx.stroke();
  }

  renderBrush(ctx, b, isSelected) {
    const p1 = this.worldToScreen(b.x1, b.y2);
    const p2 = this.worldToScreen(b.x2, b.y1);
    const bw = p2.x - p1.x;
    const bh = p2.y - p1.y;

    // Colors according to brush type
    let fill = '#33373d';
    let stroke = '#6b7280';

    if (b.type === 'CRATE') {
      fill = '#5a3d28';
      stroke = '#8c5e3c';
    } else if (b.type === 'ROOF') {
      fill = '#5c2d27';
      stroke = '#a94442';
    } else if (b.type === 'WATER') {
      fill = 'rgba(40, 110, 180, 0.45)';
      stroke = '#3a87ad';
    } else if (b.type === 'LADDER') {
      fill = 'rgba(230, 160, 40, 0.25)';
      stroke = '#f0ad4e';
    }

    ctx.fillStyle = fill;
    ctx.fillRect(p1.x, p1.y, bw, bh);

    // Diagonal X inside crates (classic Hammer look)
    if (b.type === 'CRATE') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.moveTo(p1.x, p2.y);
      ctx.lineTo(p2.x, p1.y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = isSelected ? '#ff3b30' : stroke;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(p1.x, p1.y, bw, bh);

    // Direction arrow for ramps / roofs
    if (b.type === 'ROOF') {
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Selection Handles (Classic Worldcraft red handles)
    if (isSelected) {
      this.renderHandles(ctx, p1.x, p1.y, bw, bh);
    }
  }

  renderHandles(ctx, x, y, w, h) {
    const handleSize = 7;
    const half = handleSize / 2;
    const xMid = x + w / 2;
    const yMid = y + h / 2;

    const points = [
      { x: x, y: y },           // NW
      { x: xMid, y: y },        // N
      { x: x + w, y: y },       // NE
      { x: x + w, y: yMid },    // E
      { x: x + w, y: y + h },   // SE
      { x: xMid, y: y + h },    // S
      { x: x, y: y + h },       // SW
      { x: x, y: yMid }         // W
    ];

    ctx.fillStyle = '#ff4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    for (const pt of points) {
      ctx.fillRect(pt.x - half, pt.y - half, handleSize, handleSize);
      ctx.strokeRect(pt.x - half, pt.y - half, handleSize, handleSize);
    }

    // Rotation Handle (crosshair handle on right edge)
    const rotX = x + w + 18;
    const rotY = yMid;
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(rotX, rotY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  renderEntity(ctx, e, isSelected) {
    const s = this.worldToScreen(e.x, e.y);
    const radius = 14;

    ctx.save();
    ctx.translate(s.x, s.y);

    let color = '#3498db'; // CT blue
    let label = 'CT';

    if (e.classname === 'info_player_deathmatch') {
      color = '#e74c3c'; // T red
      label = 'T';
    } else if (e.classname === 'func_bomb_target') {
      color = '#f39c12';
      label = 'BOMB';
    } else if (e.classname === 'armoury_entity') {
      color = '#9b59b6';
      label = 'GUN';
    } else if (e.classname === 'light') {
      color = '#f1c40f';
      label = 'LGT';
    }

    // Entity Circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#ffffff' : '#111111';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();

    // Angle Direction Pointer
    const rad = (e.angle || 0) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(rad) * (radius + 8), -Math.sin(rad) * (radius + 8));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }
}
