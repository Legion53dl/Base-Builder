const canvas = document.getElementById('baseCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 50;
const MAX_LEVEL = 10;

// --- The Piece Catalog ---
const pieceCatalog = {
    foundation: { gridWidth: 1, gridHeight: 1, color: 'sandybrown', faction: 'General', type: 'Structural' },
    harkonnen_floor_quarter: { gridWidth: 1, gridHeight: 1, color: 'sandybrown', faction: 'Harkonnen', type: 'Structural' },
    harkonnen_floor_triangle: { gridWidth: 1, gridHeight: 1, color: 'sandybrown', faction: 'Harkonnen', type: 'Structural' },
    wall: { gridWidth: 1, gridHeight: 0.2, color: 'darkgrey', faction: 'General', type: 'Walls' },
    harkonnen_window_wall: { gridWidth: 1, gridHeight: 0.2, color: 'darkgrey', faction: 'Harkonnen', type: 'Walls' },
    harkonnen_wall_quarter: { gridWidth: 1, gridHeight: 1, color: 'darkgrey', faction: 'Harkonnen', type: 'Walls' },
    harkonnen_door: { gridWidth: 1, gridHeight: 0.2, color: 'darkgrey', faction: 'Harkonnen', type: 'Walls' },
    harkonnen_center_column: { gridWidth: 0.5, gridHeight: 0.5, color: 'darkgrey', shape: 'hexagon', faction: 'Harkonnen', type: 'Structural' },
    harkonnen_corner_column: { gridWidth: 0.5, gridHeight: 0.5, color: 'darkgrey', shape: 'hexagon', faction: 'Harkonnen', type: 'Structural' },
    sub_fief: { gridWidth: 0.5, gridHeight: 0.5, color: '#6a5acd', shape: 'circle', faction: 'General', type: 'Special' },
    advanced_sub_fief: { gridWidth: 0.5, gridHeight: 0.5, color: '#6a5acd', shape: 'circle', faction: 'General', type: 'Special' },
    stairs: { gridWidth: 1, gridHeight: 2, color: 'sienna', faction: 'General', type: 'Inclines' },
    harkonnen_half_stairs: { gridWidth: 1, gridHeight: 1, color: 'sienna', faction: 'Harkonnen', type: 'Inclines' }
};

// --- State ---
let piecesByLevel = {};
let bordersByLevel = {};
let selectedPiece = null;
let placingPieceType = null;
let ghostPiece = null;
let isBaseStarted = false;
let currentLevel = 0;
let currentFaction = 'General';
let currentType = 'All';
let searchTerm = '';
let undoHistory = [];
let redoHistory = [];
let cameraOffset = { x: 0, y: 0 };
let cameraZoom = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// --- UI Elements ---
const pieceListContainer = document.getElementById('piece-list');
const allSidebarPieces = document.querySelectorAll('.sidebar-piece');
const searchInput = document.getElementById('search-input');
const factionFilterBtns = document.querySelectorAll('#faction-filters .filter-btn');
const typeFilterBtns = document.querySelectorAll('#type-filters .filter-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const levelDownBtn = document.getElementById('level-down-btn');
const levelUpBtn = document.getElementById('level-up-btn');
const levelDisplay = document.getElementById('level-display');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

// --- History Management ---
function saveStateForUndo() {
    const state = {
        pieces: JSON.parse(JSON.stringify(piecesByLevel)),
        borders: JSON.parse(JSON.stringify(bordersByLevel)),
        baseStarted: isBaseStarted
    };
    undoHistory.push(state);
    redoHistory = [];
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    undoBtn.disabled = undoHistory.length === 0;
    redoBtn.disabled = redoHistory.length === 0;
}

undoBtn.addEventListener('click', () => {
    if (undoHistory.length > 0) {
        const currentState = {
            pieces: JSON.parse(JSON.stringify(piecesByLevel)),
            borders: JSON.parse(JSON.stringify(bordersByLevel)),
            baseStarted: isBaseStarted
        };
        redoHistory.push(currentState);

        const prevState = undoHistory.pop();
        piecesByLevel = prevState.pieces;
        bordersByLevel = prevState.borders;
        isBaseStarted = prevState.baseStarted;
        
        selectedPiece = null;
        placingPieceType = null;
        ghostPiece = null;

        updatePieceList();
        updateSidebarSelection();
        updateLevelDisplay();
        updateUndoRedoButtons();
        redrawCanvas();
    }
});

redoBtn.addEventListener('click', () => {
    if (redoHistory.length > 0) {
        const currentState = {
            pieces: JSON.parse(JSON.stringify(piecesByLevel)),
            borders: JSON.parse(JSON.stringify(bordersByLevel)),
            baseStarted: isBaseStarted
        };
        undoHistory.push(currentState);
        
        const nextState = redoHistory.pop();
        piecesByLevel = nextState.pieces;
        bordersByLevel = nextState.borders;
        isBaseStarted = nextState.baseStarted;

        selectedPiece = null;
        placingPieceType = null;
        ghostPiece = null;
        
        updatePieceList();
        updateSidebarSelection();
        updateLevelDisplay();
        updateUndoRedoButtons();
        redrawCanvas();
    }
});


// --- Sidebar Filtering ---
function updatePieceList() {
    const searchTermLower = searchTerm.toLowerCase();

    if (!isBaseStarted) {
        pieceListContainer.classList.add('locked');
    } else {
        pieceListContainer.classList.remove('locked');
    }

    allSidebarPieces.forEach(elem => {
        const pieceType = elem.getAttribute('data-piece-type');
        const pieceData = pieceCatalog[pieceType];
        const pieceName = elem.textContent.toLowerCase();

        const factionMatch = currentFaction === 'General' || pieceData.faction === currentFaction;
        const typeMatch = currentType === 'All' || pieceData.type === currentType;
        const searchMatch = pieceName.includes(searchTermLower);
        
        const isFief = pieceData.type === 'Special';

        if (!isBaseStarted) {
            if (isFief) {
                 elem.style.display = 'block';
            } else {
                elem.style.display = 'none';
            }
        } else {
             if ((isFief && searchMatch) || (factionMatch && typeMatch && searchMatch)) {
                elem.style.display = 'block';
            } else {
                elem.style.display = 'none';
            }
        }
    });
}

searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    updatePieceList();
});

factionFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentFaction = e.target.getAttribute('data-faction');
        factionFilterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        updatePieceList();
    });
});

typeFilterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentType = e.target.getAttribute('data-type');
        typeFilterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        updatePieceList();
    });
});


// --- Initialization ---
function initializeLevels() {
    piecesByLevel = {};
    bordersByLevel = {};
    for (let i = 0; i <= MAX_LEVEL; i++) {
        piecesByLevel[i] = [];
        bordersByLevel[i] = [];
    }
}

// --- Level Management ---
function updateLevelDisplay() {
    levelDisplay.textContent = `Level ${currentLevel}`;
    levelDownBtn.disabled = currentLevel === 0;
    levelUpBtn.disabled = currentLevel === MAX_LEVEL;
    redrawCanvas();
}

levelUpBtn.addEventListener('click', () => {
    if (currentLevel < MAX_LEVEL) {
        currentLevel++;
        selectedPiece = null;
        updateLevelDisplay();
    }
});

levelDownBtn.addEventListener('click', () => {
    if (currentLevel > 0) {
        currentLevel--;
        selectedPiece = null;
        updateLevelDisplay();
    }
});

// --- State Management ---
saveBtn.addEventListener('click', () => {
    const layout = { pieces: piecesByLevel, borders: bordersByLevel, baseStarted: isBaseStarted };
    localStorage.setItem('duneBaseLayout', JSON.stringify(layout));
    alert('Layout Saved!');
});
loadBtn.addEventListener('click', () => {
    const layoutJSON = localStorage.getItem('duneBaseLayout');
    if (layoutJSON) {
        const layout = JSON.parse(layoutJSON);
        initializeLevels();
        if (layout.pieces) {
            Object.assign(piecesByLevel, layout.pieces);
            if (layout.borders) {
                Object.assign(bordersByLevel, layout.borders);
            }
            isBaseStarted = layout.baseStarted || false;
        } else {
            piecesByLevel[0] = layout;
            isBaseStarted = layout.length > 0;
        }
        currentLevel = 0;
        
        undoHistory = [];
        redoHistory = [];
        saveStateForUndo();

        updatePieceList();
        updateLevelDisplay();
        alert('Layout Loaded!');
    } else {
        alert('No saved layout found.');
    }
});
clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire base?')) {
        saveStateForUndo();
        initializeLevels();
        selectedPiece = null;
        isBaseStarted = false;
        currentLevel = 0;
        updatePieceList();
        updateLevelDisplay();
    }
});
exportBtn.addEventListener('click', () => {
    const currentSelected = selectedPiece;
    selectedPiece = null;
    redrawCanvas();
    const link = document.createElement('a');
    link.download = `dune-base-level-${currentLevel}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    selectedPiece = currentSelected;
    redrawCanvas();
});


// --- Drawing ---
function drawGrid() {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;

    const worldView = {
        x: -cameraOffset.x / cameraZoom,
        y: -cameraOffset.y / cameraZoom,
        width: canvas.width / cameraZoom,
        height: canvas.height / cameraZoom
    };

    const startX = Math.floor(worldView.x / gridSize) * gridSize;
    const endX = Math.ceil((worldView.x + worldView.width) / gridSize) * gridSize;
    const startY = Math.floor(worldView.y / gridSize) * gridSize;
    const endY = Math.ceil((worldView.y + worldView.height) / gridSize) * gridSize;

    for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
    }
}

function drawBorder(border, isGhost = false) {
    const lineWidth = 4;
    ctx.strokeStyle = isGhost ? 'rgba(100, 100, 100, 0.5)' : border.color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(border.x + lineWidth / 2, border.y + lineWidth / 2, border.width - lineWidth, border.height - lineWidth);
}

function drawPiece(piece, isGhost = false, customAlpha = 1.0) {
    const template = pieceCatalog[piece.type];
    const baseWidth = template.gridWidth * gridSize;
    const baseHeight = template.gridHeight * gridSize;
    ctx.save();
    ctx.globalAlpha = customAlpha;
    ctx.translate(piece.x + piece.width / 2, piece.y + piece.height / 2);
    ctx.rotate(piece.rotation * Math.PI / 180);
    drawPieceShape(ctx, piece, baseWidth, baseHeight, isGhost);
    ctx.restore();
}

function drawPieceShape(context, piece, width, height, isGhost) {
    const template = pieceCatalog[piece.type];
    if (isGhost) {
        context.fillStyle = 'rgba(128, 128, 128, 0.3)';
        context.strokeStyle = 'rgba(100, 100, 100, 0.5)';
        context.lineWidth = 2;
    } else {
        context.strokeStyle = '#000000';
        context.lineWidth = 2;
        context.fillStyle = piece.color;
    }

    if (template.shape === 'hexagon') {
        drawHexagonShape(context, width, height);
        return;
    } else if (template.shape === 'circle') {
        context.beginPath();
        context.arc(0, 0, width / 2, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
        return;
    }

    let isDrawn = false;
    if (piece.type === 'harkonnen_floor_quarter') {
        context.beginPath(); context.moveTo(width / 2, height / 2); context.arc(width / 2, height / 2, width, Math.PI, 1.5 * Math.PI); context.closePath(); context.fill(); context.stroke(); isDrawn = true;
    } else if (piece.type === 'harkonnen_floor_triangle') {
        context.beginPath(); context.moveTo(-width / 2, -height / 2); context.lineTo(width / 2, -height / 2); context.lineTo(0, 0); context.closePath(); context.fill(); context.stroke(); isDrawn = true;
    } else if (piece.type === 'harkonnen_door') {
        const doorWidth = width * 0.4; const wallSegmentWidth = (width - doorWidth) / 2;
        context.fillRect(-width / 2, -height / 2, wallSegmentWidth, height); context.strokeRect(-width / 2, -height / 2, wallSegmentWidth, height);
        context.fillRect(doorWidth / 2, -height / 2, wallSegmentWidth, height); context.strokeRect(doorWidth / 2, -height / 2, wallSegmentWidth, height);
        if (!isGhost) context.fillStyle = '#add8e6'; context.fillRect(-doorWidth / 2, -height / 2, doorWidth, height); isDrawn = true;
    } else if (piece.type === 'harkonnen_window_wall') {
        context.fillRect(-width / 2, -height / 2, width, height);
        if (!isGhost) {
            context.fillStyle = 'green';
            const windowWidth = width * 0.5;
            const windowHeight = height * 0.6;
            context.fillRect(-windowWidth / 2, -windowHeight / 2, windowWidth, windowHeight);
        }
        context.strokeRect(-width / 2, -height / 2, width, height); isDrawn = true;
    } else if (piece.type === 'harkonnen_wall_quarter') {
        const wallThickness = 0.2 * gridSize; context.beginPath(); context.arc(width / 2, height / 2, width, 1.5 * Math.PI, Math.PI, true); context.arc(width / 2, height / 2, width - wallThickness, Math.PI, 1.5 * Math.PI, false); context.closePath(); context.fill(); context.stroke(); isDrawn = true;
    } else if (piece.type === 'wall') {
        context.fillRect(-width / 2, -height / 2, width, height);
        if (!isGhost) {
            context.save(); context.beginPath(); context.rect(-width / 2, -height / 2, width, height); context.clip(); context.strokeStyle = '#333333'; context.lineWidth = 1; context.beginPath();
            for (let i = -width / 2; i < width / 2 + height; i += 5) { context.moveTo(-width / 2 + i, -height / 2); context.lineTo(-width / 2 + i - height, height / 2); }
            context.stroke(); context.restore();
        }
        context.strokeRect(-width / 2, -height / 2, width, height); isDrawn = true;
    } else if (piece.type === 'stairs' || piece.type === 'harkonnen_half_stairs') {
        context.fillRect(-width / 2, -height / 2, width, height);
        if(!isGhost) {
            context.strokeStyle = '#603813'; context.lineWidth = 2; context.beginPath(); const stepHeight = gridSize / 5;
            for (let i = -height/2 + stepHeight; i < height/2; i += stepHeight) { context.moveTo(-width/2, i); context.lineTo(width/2, i); }
            context.stroke();
        }
        context.strokeRect(-width / 2, -height / 2, width, height); isDrawn = true;
    }

    if (!isDrawn) {
        context.fillRect(-width / 2, -height / 2, width, height); context.strokeRect(-width / 2, -height / 2, width, height);
    }
}

function drawHexagonShape(context, width, height) {
    const radius = width / 2;
    context.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i + Math.PI / 6;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) { context.moveTo(x, y); } else { context.lineTo(x, y); }
    }
    context.closePath(); context.fill(); context.stroke();
}

function redrawCanvas() {
    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    console.log(`Canvas container size: ${canvas.width}w x ${canvas.height}h`);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(cameraOffset.x, cameraOffset.y);
    ctx.scale(cameraZoom, cameraZoom);
    
    drawGrid();

    if (currentLevel > 0) {
        bordersByLevel[currentLevel - 1].forEach(border => drawBorder(border, true));
        piecesByLevel[currentLevel - 1].forEach(piece => drawPiece(piece, true));
    }

    bordersByLevel[currentLevel].forEach(border => drawBorder(border));
    piecesByLevel[currentLevel].forEach(piece => drawPiece(piece));
    
    if (ghostPiece && placingPieceType && ghostPiece.visible) {
        drawPiece(ghostPiece, false, 0.7);
    }
    
    if (selectedPiece) {
        const template = pieceCatalog[selectedPiece.type];
        const baseWidth = template.gridWidth * gridSize;
        const baseHeight = template.gridHeight * gridSize;
        ctx.save();
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3 / cameraZoom;
        ctx.translate(selectedPiece.x + selectedPiece.width / 2, selectedPiece.y + selectedPiece.height / 2);
        ctx.rotate(selectedPiece.rotation * Math.PI / 180);
        ctx.strokeRect(-baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
        ctx.restore();
    }
    ctx.restore();
}

// --- Piece Creation & Placement ---
function createNewPiece(type, x, y, rotation = 0) {
    saveStateForUndo();
    const template = pieceCatalog[type];
    if (!template) return;
    const piece = { id: Date.now(), type, rotation, x, y, width: template.gridWidth * gridSize, height: template.gridHeight * gridSize, color: template.color, homeGridX: 0, homeGridY: 0, };
    piece.x = x; piece.y = y;
    piece.homeGridX = Math.floor((piece.x + piece.width / 2) / gridSize) * gridSize;
    piece.homeGridY = Math.floor((piece.y + piece.height / 2) / gridSize) * gridSize;
    
    if (rotation === 90 || rotation === 270) {
        if (template.gridWidth !== template.gridHeight) {
            [piece.width, piece.height] = [piece.height, piece.width];
        }
    }

    piecesByLevel[currentLevel].push(piece);

    if (type === 'sub_fief' || type === 'advanced_sub_fief') {
        const borderSize = (type === 'sub_fief') ? 5 : 11;
        const borderWidth = borderSize * gridSize; const borderHeight = borderSize * gridSize;
        let epicenterX, epicenterY;
        if (borderSize % 2 !== 0) { epicenterX = piece.homeGridX + gridSize / 2; epicenterY = piece.homeGridY + gridSize / 2; }
        else { epicenterX = piece.homeGridX; epicenterY = piece.homeGridY; }
        const border = { x: epicenterX - borderWidth / 2, y: epicenterY - borderHeight / 2, width: borderWidth, height: borderHeight, color: 'darkblue', ownerId: piece.id };
        bordersByLevel[currentLevel].push(border);

        if (!isBaseStarted) { isBaseStarted = true; updatePieceList(); }
    }
    redrawCanvas();
}

// --- Helpers ---
function getSnappedPosition(piece) {
    const template = pieceCatalog[piece.type];
    let pieceWidth = template.gridWidth * gridSize;
    let pieceHeight = template.gridHeight * gridSize;

    if (piece.rotation === 90 || piece.rotation === 270) {
        [pieceWidth, pieceHeight] = [pieceHeight, pieceWidth];
    }

    const centerX = piece.homeGridX + gridSize / 2;
    const centerY = piece.homeGridY + gridSize / 2;

    return {
        x: centerX - pieceWidth / 2,
        y: centerY - pieceHeight / 2
    };
}

function isPointInPiece(point, piece) {
    const template = pieceCatalog[piece.type];
    const centerX = piece.x + piece.width / 2;
    const centerY = piece.y + piece.height / 2;
    const angle = -piece.rotation * Math.PI / 180;
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
    const baseWidth = template.gridWidth * gridSize;
    const baseHeight = template.gridHeight * gridSize;
    return Math.abs(rotatedX) <= baseWidth / 2 && Math.abs(rotatedY) <= baseHeight / 2;
}

// --- Event Handlers ---

allSidebarPieces.forEach(elem => {
    elem.addEventListener('click', (e) => {
        const pieceType = e.target.getAttribute('data-piece-type');
        if (pieceType === placingPieceType) {
            placingPieceType = null; ghostPiece = null;
        } else {
            placingPieceType = pieceType;
            const template = pieceCatalog[placingPieceType];
            ghostPiece = { type: placingPieceType, rotation: 0, width: template.gridWidth * gridSize, height: template.gridHeight * gridSize, x: -100, y: -100, homeGridX: 0, homeGridY: 0, visible: true };
        }
        updateSidebarSelection();
        redrawCanvas();
    });
});

function updateSidebarSelection() {
    allSidebarPieces.forEach(elem => {
        if (elem.getAttribute('data-piece-type') === placingPieceType) {
            elem.classList.add('selected');
        } else {
            elem.classList.remove('selected');
        }
    });
}

canvas.addEventListener('click', (e) => {
    if (placingPieceType && ghostPiece) {
        const worldX = (e.offsetX - cameraOffset.x) / cameraZoom;
        const worldY = (e.offsetY - cameraOffset.y) / cameraZoom;
        createNewPiece(placingPieceType, worldX, worldY, ghostPiece.rotation);
    }
});
canvas.addEventListener('mouseleave', () => {
    if (ghostPiece) {
        ghostPiece.visible = false;
        redrawCanvas();
    }
});
canvas.addEventListener('mouseenter', () => {
    if (ghostPiece) {
        ghostPiece.visible = true;
    }
});
canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        cameraOffset.x = e.offsetX - dragStart.x;
        cameraOffset.y = e.offsetY - dragStart.y;
        redrawCanvas();
        return;
    }

    const worldX = (e.offsetX - cameraOffset.x) / cameraZoom;
    const worldY = (e.offsetY - cameraOffset.y) / cameraZoom;

    if (ghostPiece && placingPieceType) {
        ghostPiece.rawMouseX = worldX;
        ghostPiece.rawMouseY = worldY;
        ghostPiece.homeGridX = Math.floor(worldX / gridSize) * gridSize;
        ghostPiece.homeGridY = Math.floor(worldY / gridSize) * gridSize;

        const snappedPos = getSnappedPosition(ghostPiece);
        ghostPiece.x = snappedPos.x;
        ghostPiece.y = snappedPos.y;
        redrawCanvas();
        return;
    }
    if (selectedPiece && e.buttons === 1) {
        selectedPiece.x = worldX - selectedPiece.width / 2;
        selectedPiece.y = worldY - selectedPiece.height / 2;
        redrawCanvas();
    }
});
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
        isDragging = true;
        dragStart.x = e.offsetX - cameraOffset.x;
        dragStart.y = e.offsetY - cameraOffset.y;
        e.preventDefault();
        return;
    }

    if (placingPieceType) return;
    const worldX = (e.offsetX - cameraOffset.x) / cameraZoom;
    const worldY = (e.offsetY - cameraOffset.y) / cameraZoom;
    let clickedPiece = null;

    for (let i = piecesByLevel[currentLevel].length - 1; i >= 0; i--) {
        const piece = piecesByLevel[currentLevel][i];
        if (isPointInPiece({ x: worldX, y: worldY }, piece)) {
            clickedPiece = piece;
            break;
        }
    }
    
    if (clickedPiece) {
        saveStateForUndo();
        selectedPiece = clickedPiece;
        const index = piecesByLevel[currentLevel].indexOf(selectedPiece);
        piecesByLevel[currentLevel].splice(index, 1);
        piecesByLevel[currentLevel].push(selectedPiece);
    } else {
        selectedPiece = null;
    }

    redrawCanvas();
});
canvas.addEventListener('mouseup', (e) => {
    if (isDragging && e.button === 1) {
        isDragging = false;
    }
    
    if (selectedPiece) {
        const worldX = (e.offsetX - cameraOffset.x) / cameraZoom;
        const worldY = (e.offsetY - cameraOffset.y) / cameraZoom;
        selectedPiece.homeGridX = Math.floor(worldX / gridSize) * gridSize;
        selectedPiece.homeGridY = Math.floor(worldY / gridSize) * gridSize;
        const snappedPos = getSnappedPosition(selectedPiece);
        selectedPiece.x = snappedPos.x;
        selectedPiece.y = snappedPos.y;
        redrawCanvas();
    }
});
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomAmount = 0.1;
    const worldX = (e.offsetX - cameraOffset.x) / cameraZoom;
    const worldY = (e.offsetY - cameraOffset.y) / cameraZoom;
    
    if (e.deltaY < 0) {
        cameraZoom += zoomAmount;
    } else {
        cameraZoom -= zoomAmount;
    }
    cameraZoom = Math.max(0.1, Math.min(cameraZoom, 5));

    cameraOffset.x = e.offsetX - worldX * cameraZoom;
    cameraOffset.y = e.offsetY - worldY * cameraZoom;
    
    redrawCanvas();
});

document.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && ghostPiece) {
        ghostPiece.rotation = (ghostPiece.rotation + 90) % 360;
        const template = pieceCatalog[ghostPiece.type];
        if (template.gridWidth !== template.gridHeight) {
            [ghostPiece.width, ghostPiece.height] = [ghostPiece.height, ghostPiece.width];
        }
        const snappedPos = getSnappedPosition(ghostPiece);
        ghostPiece.x = snappedPos.x;
        ghostPiece.y = snappedPos.y;
        redrawCanvas();
        return;
    }
    
    if (!selectedPiece) return;

    if (e.key === 'r' || e.key === 'R' || e.key === 'Delete' || e.key === 'Backspace') {
        saveStateForUndo();
    }

    if (e.key === 'r' || e.key === 'R') {
        selectedPiece.rotation = (selectedPiece.rotation + 90) % 360;
        const template = pieceCatalog[selectedPiece.type];
        if (template.gridWidth !== template.gridHeight) {
            [selectedPiece.width, selectedPiece.height] = [selectedPiece.height, selectedPiece.width];
        }
        const snappedPos = getSnappedPosition(selectedPiece);
        selectedPiece.x = snappedPos.x;
        selectedPiece.y = snappedPos.y;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        const pieceToDelete = selectedPiece;
        const index = piecesByLevel[currentLevel].indexOf(pieceToDelete);
        if (index > -1) {
            piecesByLevel[currentLevel].splice(index, 1);
        }
        if (pieceToDelete.type === 'sub_fief' || pieceToDelete.type === 'advanced_sub_fief') {
            const borderIndex = bordersByLevel[currentLevel].findIndex(border => border.ownerId === pieceToDelete.id);
            if (borderIndex > -1) {
                bordersByLevel[currentLevel].splice(borderIndex, 1);
            }
        }
        selectedPiece = null;
    }
    redrawCanvas();
});

// --- Initial Setup ---
initializeLevels();
saveStateForUndo();
updateUndoRedoButtons();
updatePieceList();
updateLevelDisplay();

window.addEventListener('resize', redrawCanvas);