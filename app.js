// ===== Gate Type Definitions =====
const GATE_TYPES = {
    INPUT:  { name: 'INPUT',  label: 'I',  inputs: 0, outputs: 1, shape: 'input',  desc: 'Toggle Input' },
    OUTPUT: { name: 'OUTPUT', label: 'O',  inputs: 1, outputs: 0, shape: 'output', desc: 'Output Display' },
    NOT:    { name: 'NOT',    label: 'NOT', inputs: 1, outputs: 1, shape: 'not',    desc: 'Inverter' },
    AND:    { name: 'AND',    label: 'AND', inputs: 2, outputs: 1, shape: 'and',    desc: 'AND Gate' },
    OR:     { name: 'OR',     label: 'OR',  inputs: 2, outputs: 1, shape: 'or',     desc: 'OR Gate' },
    NAND:   { name: 'NAND',   label: 'NAND',inputs: 2, outputs: 1, shape: 'nand',   desc: 'NAND Gate' },
    NOR:    { name: 'NOR',    label: 'NOR', inputs: 2, outputs: 1, shape: 'nor',    desc: 'NOR Gate' },
    XOR:    { name: 'XOR',    label: 'XOR', inputs: 2, outputs: 1, shape: 'xor',    desc: 'XOR Gate' },
    DFF:    { name: 'DFF',    label: 'DFF', inputs: 2, outputs: 2, shape: 'dff',    desc: 'D Flip-Flop' },
    JKFF:   { name: 'JKFF',   label: 'JK',  inputs: 3, outputs: 2, shape: 'jkff',   desc: 'JK Flip-Flop' }
};

const NUM_PINS = { 'and': 2, 'or': 2, 'nand': 2, 'nor': 2, 'xor': 2, 'not': 1, 'input': 0, 'output': 1 };

// ===== State =====
let gates = [];
let wires = [];
let nextGateId = 1;
let nextWireId = 1;
let dragState = null;
let wiringState = null;
let selectedGateIds = new Set();
let selectedWireId = null;
let tempWireEnd = null;
let wasDragged = false;
let mouseDownPos = null;
let marqueeState = null;
let zoomLevel = 1;

// ===== Touch State =====
let touchHandled = false;
let longPressTimer = null;
let pinchStartDist = null;
let pinchStartZoom = null;
let touchDragType = null;
let touchDragGhost = null;
let lastTouchEnd = 0;

// ===== History (Undo/Redo) =====
const MAX_HISTORY = 50;
let undoStack = [];
let redoStack = [];
let ignoreHistory = false;

// ===== Clipboard (Copy/Paste) =====
let clipboard = null;

// ===== SVG Shape Generators =====
const GATE_SHAPES = {
    input() {
        return `<circle cx="24" cy="32" r="18" class="gate-shape-fill" stroke="var(--pin-color,#555)" stroke-width="2.5"/>
                <text x="24" y="37" text-anchor="middle" font-size="16" fill="#aaa" font-weight="bold" class="val-text">0</text>`;
    },
    output() {
        return `<circle cx="24" cy="32" r="18" class="gate-shape-fill" stroke="var(--pin-color,#555)" stroke-width="2.5"/>
                <text x="24" y="37" text-anchor="middle" font-size="16" fill="#aaa" font-weight="bold" class="val-text">0</text>`;
    },
    and() {
        return `<path d="M 8,6 L 35,6 Q 82,6 82,32 Q 82,58 35,58 L 8,58 Z" class="gate-shape-fill gate-shape-stroke"/>`;
    },
    nand() {
        return `<path d="M 8,6 L 35,6 Q 72,6 72,32 Q 72,58 35,58 L 8,58 Z" class="gate-shape-fill gate-shape-stroke"/>
                <circle cx="79" cy="32" r="5" class="gate-shape-fill gate-shape-stroke"/>`;
    },
    or() {
        return `<path d="M 8,6 L 30,6 Q 68,6 78,32 Q 68,58 30,58 L 8,58 Q 18,32 8,6 Z" class="gate-shape-fill gate-shape-stroke"/>`;
    },
    nor() {
        return `<path d="M 8,6 L 30,6 Q 62,6 72,32 Q 62,58 30,58 L 8,58 Q 18,32 8,6 Z" class="gate-shape-fill gate-shape-stroke"/>
                <circle cx="79" cy="32" r="5" class="gate-shape-fill gate-shape-stroke"/>`;
    },
    xor() {
        return `<path d="M 0,6 Q 10,32 0,58" class="gate-shape-stroke" fill="none"/>
                <path d="M 8,6 L 30,6 Q 68,6 78,32 Q 68,58 30,58 L 8,58 Q 18,32 8,6 Z" class="gate-shape-fill gate-shape-stroke"/>`;
    },
    not() {
        return `<path d="M 8,6 L 70,32 L 8,58 Z" class="gate-shape-fill gate-shape-stroke"/>
                <circle cx="77" cy="32" r="5" class="gate-shape-fill gate-shape-stroke"/>`;
    },
    dff() {
        return `<rect x="8" y="6" width="64" height="52" class="gate-shape-fill gate-shape-stroke" rx="2"/>
                <text x="40" y="38" text-anchor="middle" font-size="13" fill="var(--text-dim)" font-weight="bold" font-family="sans-serif" font-style="italic">FF</text>
                <path d="M 16,36 L 22,42 L 16,48 Z" class="gate-shape-fill" stroke="var(--text-dim)" stroke-width="1"/>`;
    },
    jkff() {
        return `<rect x="8" y="6" width="64" height="52" class="gate-shape-fill gate-shape-stroke" rx="2"/>
                <text x="40" y="24" text-anchor="middle" font-size="12" fill="var(--text-dim)" font-weight="bold" font-family="sans-serif">JK</text>
                <text x="40" y="50" text-anchor="middle" font-size="13" fill="var(--text-dim)" font-weight="bold" font-family="sans-serif" font-style="italic">FF</text>
                <path d="M 16,26 L 22,32 L 16,38 Z" class="gate-shape-fill" stroke="var(--text-dim)" stroke-width="1"/>`;
    }
};

// ===== Logic Functions =====
const GATE_FNS = {
    INPUT:  (inputs) => inputs[0] || 0,
    OUTPUT: (inputs) => inputs[0] || 0,
    NOT:    (inputs) => inputs[0] ? 0 : 1,
    AND:    (inputs) => inputs[0] && inputs[1] ? 1 : 0,
    OR:     (inputs) => inputs[0] || inputs[1] ? 1 : 0,
    NAND:   (inputs) => inputs[0] && inputs[1] ? 0 : 1,
    NOR:    (inputs) => inputs[0] || inputs[1] ? 0 : 1,
    XOR:    (inputs) => (inputs[0] ? 1 : 0) !== (inputs[1] ? 1 : 0) ? 1 : 0
};

function getOutputForPin(gate, pinIdx) {
    if ((gate.type === 'DFF' || gate.type === 'JKFF') && pinIdx === 1) {
        return gate.output ? 0 : 1;
    }
    return gate.output || 0;
}

// ===== Rendering =====
const $ = id => document.getElementById(id);
const workspace = $('workspace');
const dropZone = $('dropZone');
const wiresSvg = $('wiresOverlay');

function updateSelectionUI() {
    for (const gate of gates) {
        const el = dropZone.querySelector(`.gate[data-gate-id="${gate.id}"]`);
        if (el) el.classList.toggle('selected', selectedGateIds.has(gate.id));
    }
    updateInfoBar();
}

function renderAll() {
    renderGates();
    renderWires();
    updateInfoBar();
    adjustWorkspaceSize();
}

// ===== Zoom =====
function screenToWorkspace(cx, cy) {
    const r = dropZone.getBoundingClientRect();
    return { x: (cx - r.left) / zoomLevel, y: (cy - r.top) / zoomLevel };
}

function setZoom(z) {
    zoomLevel = Math.max(0.25, Math.min(3, Math.round(z * 20) / 20));
    dropZone.style.transform = `scale(${zoomLevel})`;
    dropZone.style.transformOrigin = '0 0';
    $('zoomDisplay').textContent = Math.round(zoomLevel * 100) + '%';
    adjustWorkspaceSize();
    renderWires();
}

function adjustWorkspaceSize() {
    const pad = 500;
    const maxX = gates.length > 0 ? Math.max(...gates.map(g => g.x + 150)) : 1000;
    const maxY = gates.length > 0 ? Math.max(...gates.map(g => g.y + 100)) : 1000;
    const w = Math.max((maxX + pad) * zoomLevel, workspace.clientWidth);
    const h = Math.max((maxY + pad) * zoomLevel, workspace.clientHeight);
    dropZone.style.width = w + 'px';
    dropZone.style.height = h + 'px';
    workspace.style.backgroundSize = (24 * zoomLevel) + 'px ' + (24 * zoomLevel) + 'px';
}

function zoomToFit() {
    if (gates.length === 0) { setZoom(1); return; }
    const pad = 80;
    const minX = Math.min(...gates.map(g => g.x));
    const minY = Math.min(...gates.map(g => g.y));
    const maxX = Math.max(...gates.map(g => g.x + 90));
    const maxY = Math.max(...gates.map(g => g.y + 64));
    const contentW = maxX - minX + pad * 2;
    const contentH = maxY - minY + pad * 2;
    const scaleX = workspace.clientWidth / contentW;
    const scaleY = workspace.clientHeight / contentH;
    setZoom(Math.min(scaleX, scaleY, 1.5));
}

// ===== Undo / Redo =====
function pushHistory() {
    if (ignoreHistory) return;
    undoStack.push({
        gates: JSON.parse(JSON.stringify(gates)),
        wires: wires.map(w => ({...w})),
        nextGateId,
        nextWireId
    });
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    $('modeIndicator').textContent = '✓ History saved';
    setTimeout(() => updateInfoBar(), 100);
}

function restoreState(state) {
    ignoreHistory = true;
    gates = state.gates;
    wires = state.wires;
    nextGateId = state.nextGateId;
    nextWireId = state.nextWireId;
    cancelWiring();
    selectedGateIds.clear();
    selectedWireId = null;
    dragState = null;
    isDragging = false;
    renderAll();
    simulate();
    ignoreHistory = false;
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push({
        gates: JSON.parse(JSON.stringify(gates)),
        wires: wires.map(w => ({...w})),
        nextGateId,
        nextWireId
    });
    restoreState(undoStack.pop());
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push({
        gates: JSON.parse(JSON.stringify(gates)),
        wires: wires.map(w => ({...w})),
        nextGateId,
        nextWireId
    });
    restoreState(redoStack.pop());
}

// ===== Copy / Paste =====
function copySelected() {
    if (selectedGateIds.size === 0) return;
    const sel = gates.filter(g => selectedGateIds.has(g.id));
    const ids = new Set(sel.map(g => g.id));
    const selWires = wires.filter(w => ids.has(w.fromGateId) && ids.has(w.toGateId));
    const minX = Math.min(...sel.map(g => g.x));
    const minY = Math.min(...sel.map(g => g.y));
    clipboard = {
        gates: sel.map(g => ({
            type: g.type, x: g.x - minX, y: g.y - minY,
            inputValues: g.inputValues ? [...g.inputValues] : [],
            storedValue: g.storedValue,
            prevClk: g.prevClk
        })),
        wires: selWires.map(w => ({
            fromGateIdx: sel.findIndex(g => g.id === w.fromGateId),
            fromPinIdx: w.fromPinIdx,
            toGateIdx: sel.findIndex(g => g.id === w.toGateId),
            toPinIdx: w.toPinIdx
        }))
    };
    $('modeIndicator').textContent = `Copied ${clipboard.gates.length} gate(s)`;
    setTimeout(() => updateInfoBar(), 1200);
}

function pasteClipboard() {
    if (!clipboard || clipboard.gates.length === 0) return;
    pushHistory();
    const newIds = [];
    for (const cg of clipboard.gates) {
        const id = nextGateId++;
        newIds.push(id);
        gates.push({
            id, type: cg.type, x: cg.x + 48, y: cg.y + 48,
            inputValues: cg.inputValues ? [...cg.inputValues] : [],
            storedValue: (cg.type === 'DFF' || cg.type === 'JKFF') ? (cg.storedValue || 0) : undefined,
            prevClk: (cg.type === 'DFF' || cg.type === 'JKFF') ? (cg.prevClk || 0) : undefined,
            output: 0
        });
    }
    for (const cw of clipboard.wires) {
        const fromId = newIds[cw.fromGateIdx];
        const toId = newIds[cw.toGateIdx];
        if (fromId === undefined || toId === undefined) continue;
        wires.push({ id: nextWireId++, fromGateId: fromId, fromPinIdx: cw.fromPinIdx, toGateId: toId, toPinIdx: cw.toPinIdx });
    }
    selectedGateIds.clear();
    for (const id of newIds) selectedGateIds.add(id);
    renderAll();
    simulate();
}

function svgShape(type) {
    const fn = GATE_SHAPES[type.toLowerCase()];
    return fn ? fn() : '';
}

function pinY(gate, index, isOutput) {
    const h = 64;
    const numPins = isOutput ? (GATE_TYPES[gate.type]?.outputs || 1) : (GATE_TYPES[gate.type]?.inputs || 0);
    if (numPins <= 1) return h / 2;
    const spacing = h / (numPins + 1);
    return spacing * (index + 1);
}

function createGateElement(gate) {
    const div = document.createElement('div');
    div.className = 'gate';
    div.dataset.gateId = gate.id;
    div.dataset.type = gate.type;
    div.style.left = gate.x + 'px';
    div.style.top = gate.y + 'px';

    const body = document.createElement('div');
    body.className = 'gate-body';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 90 64');
    svg.setAttribute('width', '90');
    svg.setAttribute('height', '64');
    svg.innerHTML = svgShape(gate.type);
    body.appendChild(svg);

    const label = document.createElement('span');
    label.className = 'gate-label';
    label.textContent = GATE_TYPES[gate.type]?.label || gate.type;
    body.appendChild(label);

    div.appendChild(body);

    const gt = GATE_TYPES[gate.type];
    const numInputs = gt.inputs;
    const numOutputs = gt.outputs;

    for (let i = 0; i < numInputs; i++) {
        const pin = document.createElement('div');
        pin.className = 'pin input-pin';
        pin.dataset.gateId = gate.id;
        pin.dataset.pinIdx = i;
        pin.dataset.isOutput = 'false';
        pin.style.top = (pinY(gate, i, false) - 6) + 'px';
        div.appendChild(pin);
    }

    for (let i = 0; i < numOutputs; i++) {
        const pin = document.createElement('div');
        pin.className = 'pin output-pin';
        pin.dataset.gateId = gate.id;
        pin.dataset.pinIdx = i;
        pin.dataset.isOutput = 'true';
        pin.style.top = (pinY(gate, i, true) - 6) + 'px';
        div.appendChild(pin);
    }

    if (gate.type === 'DFF' || gate.type === 'JKFF') {
        const inputLabels = gate.type === 'DFF' ? ['D', 'CLK'] : ['J', 'CLK', 'K'];
        const outputLabels = ['Q', 'Q̅'];
        for (let i = 0; i < numInputs; i++) {
            const lbl = document.createElement('span');
            lbl.className = 'gate-pin-label';
            lbl.textContent = inputLabels[i];
            lbl.style.left = '-28px';
            lbl.style.top = (pinY(gate, i, false) - 4) + 'px';
            div.appendChild(lbl);
        }
        for (let i = 0; i < numOutputs; i++) {
            const lbl = document.createElement('span');
            lbl.className = 'gate-pin-label';
            lbl.textContent = outputLabels[i];
            lbl.style.right = '-20px';
            lbl.style.top = (pinY(gate, i, true) - 4) + 'px';
            div.appendChild(lbl);
        }
    }

    return div;
}

function renderGates() {
    dropZone.querySelectorAll('.gate').forEach(el => el.remove());
    for (const gate of gates) {
        const el = createGateElement(gate);
        dropZone.appendChild(el);
        updateGateDisplay(gate);
        el.classList.toggle('selected', selectedGateIds.has(gate.id));
    }
    updateInfoBar();
}

function updateGateDisplay(gate) {
    const el = dropZone.querySelector(`.gate[data-gate-id="${gate.id}"]`);
    if (!el) return;
    const output = gate.output !== undefined ? gate.output : 0;
    el.classList.toggle('gate-output-high', output === 1);
    if (gate.type === 'INPUT' || gate.type === 'OUTPUT') {
        const txt = el.querySelector('.val-text');
        if (txt) txt.textContent = output ? '1' : '0';
    }

    const pins = el.querySelectorAll('.pin');
    const gt = GATE_TYPES[gate.type];
    const numInputs = gt.inputs;

    pins.forEach(pin => {
        const isOut = pin.dataset.isOutput === 'true';
        const idx = parseInt(pin.dataset.pinIdx);
        if (isOut) {
            const val = getOutputForPin(gate, idx);
            pin.classList.toggle('active', val === 1);
            pin.classList.toggle('inactive', val !== 1);
        } else {
            const val = (gate.inputValues && gate.inputValues[idx] !== undefined) ? gate.inputValues[idx] : 0;
            pin.classList.toggle('active', val === 1);
            pin.classList.toggle('inactive', val !== 1);

            const hasWire = wires.some(w => w.toGateId === gate.id && w.toPinIdx === idx);
            if (!hasWire) {
                pin.style.cursor = 'pointer';
            } else {
                pin.style.cursor = 'crosshair';
            }
        }
    });
}

function renderWires() {
    let svg = wiresSvg.querySelector('svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('overflow', 'visible');
        wiresSvg.appendChild(svg);
    }

    const maxX = Math.max(...gates.map(g => g.x + 200), 1000);
    const maxY = Math.max(...gates.map(g => g.y + 100), 1000);
    svg.style.width = maxX + 'px';
    svg.style.height = maxY + 'px';

    let html = '';
    for (const wire of wires) {
        const fromPos = getPinPos(wire.fromGateId, wire.fromPinIdx, true);
        const toPos = getPinPos(wire.toGateId, wire.toPinIdx, false);
        if (!fromPos || !toPos) continue;
        const midX = (fromPos.x + toPos.x) / 2;
        const path = `M ${fromPos.x},${fromPos.y} C ${midX},${fromPos.y} ${midX},${toPos.y} ${toPos.x},${toPos.y}`;
        const fromGate = gates.find(g => g.id === wire.fromGateId);
        const signalHigh = fromGate && getOutputForPin(fromGate, wire.fromPinIdx) === 1;
        const sel = wire.id === selectedWireId ? ' selected' : '';
        html += `<path d="${path}" class="wire ${signalHigh ? 'high-1' : ''}${sel}" data-wire-id="${wire.id}"/>`;
    }

    if (wiringState && tempWireEnd) {
        const fromPos = getPinPos(wiringState.gateId, wiringState.pinIdx, wiringState.isOutput);
        if (fromPos) {
            const midX = (fromPos.x + tempWireEnd.x) / 2;
            html += `<path d="M ${fromPos.x},${fromPos.y} C ${midX},${fromPos.y} ${midX},${tempWireEnd.y} ${tempWireEnd.x},${tempWireEnd.y}" class="wire temp-wire"/>`;
        }
    }

    svg.innerHTML = html;
}

function getPinPos(gateId, pinIdx, isOutput) {
    const gate = gates.find(g => g.id === gateId);
    if (!gate) return null;
    const el = dropZone.querySelector(`.gate[data-gate-id="${gateId}"]`);
    if (!el) return null;
    const rect = dropZone.getBoundingClientRect();
    const gateRect = el.getBoundingClientRect();
    const y = pinY(gate, pinIdx, isOutput);
    const x = isOutput ? gateRect.right - rect.left : gateRect.left - rect.left;
    return { x: x / zoomLevel, y: (gateRect.top - rect.top) / zoomLevel + y };
}

// ===== Simulation =====
function evalGate(gate) {
    const gt = GATE_TYPES[gate.type];
    const inputs = [];
    for (let i = 0; i < gt.inputs; i++) {
        const wire = wires.find(w => w.toGateId === gate.id && w.toPinIdx === i);
        if (wire) {
            const srcGate = gates.find(g => g.id === wire.fromGateId);
            inputs.push(srcGate ? getOutputForPin(srcGate, wire.fromPinIdx) : 0);
        } else {
            inputs.push(gate.inputValues[i] || 0);
        }
    }
    if (gate.type === 'INPUT') {
        gate.output = gate.inputValues[0] || 0;
    } else if (gate.type === 'DFF' || gate.type === 'JKFF') {
        gate.output = gate.storedValue || 0;
    } else {
        const fn = GATE_FNS[gate.type];
        gate.output = fn ? fn(inputs) : 0;
    }
}

function simulate() {
    for (const gate of gates) {
        if (!gate.inputValues) gate.inputValues = new Array(GATE_TYPES[gate.type].inputs).fill(0);
        if ((gate.type === 'DFF' || gate.type === 'JKFF') && gate.storedValue === undefined) {
            gate.storedValue = 0;
            gate.prevClk = 0;
        }
    }

    const isSeq = g => g.type === 'DFF' || g.type === 'JKFF';

    for (let iter = 0; iter < 20; iter++) {
        for (const gate of gates) evalGate(gate);
    }

    for (const gate of gates) {
        if (!isSeq(gate)) continue;
        const gt = GATE_TYPES[gate.type];
        const inputs = [];
        for (let i = 0; i < gt.inputs; i++) {
            const wire = wires.find(w => w.toGateId === gate.id && w.toPinIdx === i);
            if (wire) {
                const srcGate = gates.find(g => g.id === wire.fromGateId);
                inputs.push(srcGate ? getOutputForPin(srcGate, wire.fromPinIdx) : 0);
            } else {
                inputs.push(gate.inputValues[i] || 0);
            }
        }
        const clkVal = inputs[1] || 0;
        if (gate.prevClk === 0 && clkVal === 1) {
            if (gate.type === 'DFF') {
                gate.storedValue = inputs[0] || 0;
            } else {
                const j = inputs[0] || 0;
                const k = inputs[2] || 0;
                if (j === 0 && k === 1) gate.storedValue = 0;
                else if (j === 1 && k === 0) gate.storedValue = 1;
                else if (j === 1 && k === 1) gate.storedValue = gate.storedValue ? 0 : 1;
            }
        }
        gate.prevClk = clkVal;
    }

    for (let iter = 0; iter < 10; iter++) {
        for (const gate of gates) evalGate(gate);
    }

    for (const gate of gates) updateGateDisplay(gate);
    renderWires();
}

// ===== INPUT Gate Toggle =====
function toggleInputGate(gateId) {
    const gate = gates.find(g => g.id === gateId);
    if (!gate || gate.type !== 'INPUT') return;
    pushHistory();
    if (!gate.inputValues) gate.inputValues = [0];
    gate.inputValues[0] = gate.inputValues[0] ? 0 : 1;
    simulate();
    const el = dropZone.querySelector(`.gate[data-gate-id="${gate.id}"]`);
    if (el) {
        el.style.transition = 'transform 0.1s';
        el.style.transform = 'scale(0.88)';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
            setTimeout(() => el.style.transition = '', 120);
        }, 100);
    }
}

// ===== Interaction Handlers =====
function getGateAtPos(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const gateEl = el.closest('.gate');
    if (!gateEl) return null;
    return parseInt(gateEl.dataset.gateId);
}

function getPinAtPos(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const pinEl = el.closest('.pin');
    if (!pinEl) return null;
    return {
        gateId: parseInt(pinEl.dataset.gateId),
        pinIdx: parseInt(pinEl.dataset.pinIdx),
        isOutput: pinEl.dataset.isOutput === 'true'
    };
}

function getWireAtPos(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const pathEl = el.closest('.wire[data-wire-id]');
    if (!pathEl) return null;
    return parseInt(pathEl.dataset.wireId);
}

function handlePinClick(pinInfo, e) {
    e.stopPropagation();

    if (!wiringState) {
        if (pinInfo.isOutput) {
            wiringState = { gateId: pinInfo.gateId, pinIdx: pinInfo.pinIdx, isOutput: true };
            $('modeIndicator').textContent = 'Wiring mode — click an input pin to connect';
            setModeUI('Wiring', '#ffd700');
            renderWires();
            return;
        } else {
            wiringState = { gateId: pinInfo.gateId, pinIdx: pinInfo.pinIdx, isOutput: false };
            $('modeIndicator').textContent = 'Wiring mode — click an output pin to connect';
            setModeUI('Wiring', '#ffd700');
            renderWires();
            return;
        }
    }

    const fromIsOutput = wiringState.isOutput;
    const toIsOutput = pinInfo.isOutput;

    if (fromIsOutput === toIsOutput) {
        wiringState = { gateId: pinInfo.gateId, pinIdx: pinInfo.pinIdx, isOutput: pinInfo.isOutput };
        $('modeIndicator').textContent = pinInfo.isOutput ? 'Wiring mode — click an input pin' : 'Wiring mode — click an output pin';
        renderWires();
        return;
    }

    const fromGateId = wiringState.isOutput ? wiringState.gateId : pinInfo.gateId;
    const fromPinIdx = wiringState.isOutput ? wiringState.pinIdx : pinInfo.pinIdx;
    const toGateId = wiringState.isOutput ? pinInfo.gateId : wiringState.gateId;
    const toPinIdx = wiringState.isOutput ? pinInfo.pinIdx : wiringState.pinIdx;

    if (fromGateId === toGateId) {
        cancelWiring();
        return;
    }

    pushHistory();
    wires = wires.filter(w => !(w.toGateId === toGateId && w.toPinIdx === toPinIdx));

    const wire = { id: nextWireId++, fromGateId, fromPinIdx, toGateId, toPinIdx };
    wires.push(wire);
    cancelWiring();
    $('modeIndicator').textContent = 'Select mode — click a pin to start wiring';
    simulate();
}

function setModeUI(label, color) {
    $('modeLabel').textContent = label;
    $('modeDot').style.background = color;
}

function cancelWiring() {
    wiringState = null;
    tempWireEnd = null;
    selectedWireId = null;
    $('modeIndicator').textContent = 'Select mode — click a pin to start wiring';
    setModeUI('Select', '#888');
    renderWires();
}

// ===== Drag from Toolbox =====
document.querySelectorAll('.tool-btn[draggable]').forEach(btn => {
    btn.addEventListener('dragstart', e => {
        const gateType = btn.dataset.gate;
        e.dataTransfer.setData('text/plain', gateType);
        e.dataTransfer.effectAllowed = 'copy';
        const ghost = $('dragGhost');
        ghost.textContent = gateType;
        ghost.style.display = 'flex';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 50, 27);
        setTimeout(() => ghost.style.display = 'none', 0);
    });
});

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', e => {
    e.preventDefault();
    const gateType = e.dataTransfer.getData('text/plain');
    if (!GATE_TYPES[gateType]) return;

    const SNAP = 24;
    const ws = screenToWorkspace(e.clientX, e.clientY);
    const x = Math.round((ws.x - 45) / SNAP) * SNAP;
    const y = Math.round((ws.y - 32) / SNAP) * SNAP;

    const gate = {
        id: nextGateId++,
        type: gateType,
        x: Math.max(0, x),
        y: Math.max(0, y),
        inputValues: new Array(GATE_TYPES[gateType].inputs).fill(0),
        output: 0
    };
    if (gateType === 'DFF' || gateType === 'JKFF') { gate.storedValue = 0; gate.prevClk = 0; }
    pushHistory();
    gates.push(gate);
    renderAll();
    simulate();
    $('modeIndicator').textContent = 'Select mode — click a pin to start wiring';
});

// ===== Gate dragging within workspace =====
let isDragging = false;

dropZone.addEventListener('mousedown', e => {
    if (touchHandled) { touchHandled = false; return; }
    const wirePath = e.target.closest('.wire[data-wire-id]');
    if (!wirePath && selectedWireId !== null) {
        selectedWireId = null;
        renderWires();
    }

    const gateEl = e.target.closest('.gate');
    if (!gateEl) {
        if (wiringState) {
            cancelWiring();
            selectedGateIds.clear();
            updateSelectionUI();
            hideContextMenu();
            return;
        }
        const ws = screenToWorkspace(e.clientX, e.clientY);
        marqueeState = { startX: ws.x, startY: ws.y };
        mouseDownPos = { x: e.clientX, y: e.clientY };
        wasDragged = false;
        hideContextMenu();
        return;
    }

    const pinEl = e.target.closest('.pin');
    if (pinEl) {
        const info = {
            gateId: parseInt(pinEl.dataset.gateId),
            pinIdx: parseInt(pinEl.dataset.pinIdx),
            isOutput: pinEl.dataset.isOutput === 'true'
        };
        handlePinClick(info, e);
        return;
    }

    const gateId = parseInt(gateEl.dataset.gateId);
    const gate = gates.find(g => g.id === gateId);
    if (!gate) return;

    if (e.shiftKey) {
        if (selectedGateIds.has(gateId)) {
            selectedGateIds.delete(gateId);
        } else {
            selectedGateIds.add(gateId);
        }
    } else {
        if (!selectedGateIds.has(gateId)) {
            selectedGateIds.clear();
            selectedGateIds.add(gateId);
        }
    }
    updateSelectionUI();

    hideContextMenu();
    wasDragged = false;
    mouseDownPos = { x: e.clientX, y: e.clientY };
    pushHistory();

    const ws = screenToWorkspace(e.clientX, e.clientY);
    const ids = [...selectedGateIds];
    dragState = {
        gateIds: ids,
        origins: ids.map(id => {
            const g = gates.find(gg => gg.id === id);
            return { id, x: g ? g.x : 0, y: g ? g.y : 0 };
        }),
        startX: ws.x,
        startY: ws.y
    };
    isDragging = true;
    gateEl.style.zIndex = 20;
});

document.addEventListener('mousemove', e => {
    if (touchHandled) return;
    if (isDragging && dragState) {
        if (mouseDownPos && (Math.abs(e.clientX - mouseDownPos.x) > 4 || Math.abs(e.clientY - mouseDownPos.y) > 4)) {
            wasDragged = true;
        }
        const SNAP = 24;
        const ws = screenToWorkspace(e.clientX, e.clientY);
        const dx = Math.round((ws.x - dragState.startX) / SNAP) * SNAP;
        const dy = Math.round((ws.y - dragState.startY) / SNAP) * SNAP;
        for (const origin of dragState.origins) {
            const gate = gates.find(g => g.id === origin.id);
            if (gate) {
                gate.x = Math.max(0, origin.x + dx);
                gate.y = Math.max(0, origin.y + dy);
                const el = dropZone.querySelector(`.gate[data-gate-id="${gate.id}"]`);
                if (el) {
                    el.style.left = gate.x + 'px';
                    el.style.top = gate.y + 'px';
                }
            }
        }
        renderWires();

        let anyOverlap = false;
        for (const id of dragState.gateIds) {
            const el = dropZone.querySelector(`.gate[data-gate-id="${id}"]`);
            if (!el) continue;
            const binEl = $('trashBin');
            if (!binEl) continue;
            const g = el.getBoundingClientRect();
            const b = binEl.getBoundingClientRect();
            if (g.right > b.left && g.left < b.right && g.bottom > b.top && g.top < b.bottom) {
                anyOverlap = true;
                break;
            }
        }
        const binEl = $('trashBin');
        if (binEl) binEl.classList.toggle('drag-over', anyOverlap);
    }

    if (wiringState) {
        tempWireEnd = screenToWorkspace(e.clientX, e.clientY);
        renderWires();
    }

    if (marqueeState) {
        if (mouseDownPos && (Math.abs(e.clientX - mouseDownPos.x) > 4 || Math.abs(e.clientY - mouseDownPos.y) > 4)) {
            wasDragged = true;
        }
        const ws = screenToWorkspace(e.clientX, e.clientY);
        const overlay = $('marqueeOverlay');
        const minX = Math.min(marqueeState.startX, ws.x);
        const minY = Math.min(marqueeState.startY, ws.y);
        const maxX = Math.max(marqueeState.startX, ws.x);
        const maxY = Math.max(marqueeState.startY, ws.y);
        overlay.style.left = minX + 'px';
        overlay.style.top = minY + 'px';
        overlay.style.width = (maxX - minX) + 'px';
        overlay.style.height = (maxY - minY) + 'px';
        overlay.style.display = 'block';
    }
});

document.addEventListener('mouseup', e => {
    if (touchHandled) return;
    if (isDragging && dragState) {
        const binEl = $('trashBin');
        const overBin = binEl && binEl.classList.contains('drag-over');
        if (overBin) {
            if (binEl) binEl.classList.remove('drag-over');
            deleteGates(dragState.gateIds);
        } else {
            for (const id of dragState.gateIds) {
                const el = dropZone.querySelector(`.gate[data-gate-id="${id}"]`);
                if (el) el.style.zIndex = 10;
            }
            renderWires();
        }
        dragState = null;
        isDragging = false;
        return;
    }

    if (marqueeState) {
        const overlay = $('marqueeOverlay');
        overlay.style.display = 'none';
        if (wasDragged) {
            const ws = screenToWorkspace(e.clientX, e.clientY);
            const minX = Math.min(marqueeState.startX, ws.x);
            const minY = Math.min(marqueeState.startY, ws.y);
            const maxX = Math.max(marqueeState.startX, ws.x);
            const maxY = Math.max(marqueeState.startY, ws.y);
            if (!e.shiftKey) selectedGateIds.clear();
            for (const gate of gates) {
                if (gate.x < maxX && gate.x + 90 > minX && gate.y < maxY && gate.y + 64 > minY) {
                    selectedGateIds.add(gate.id);
                }
            }
            updateSelectionUI();
        } else {
            selectedGateIds.clear();
            updateSelectionUI();
        }
        marqueeState = null;
    }
});

// ===== Wire interaction =====
dropZone.addEventListener('click', e => {
    if (touchHandled) { touchHandled = false; return; }
    const wirePath = e.target.closest('.wire[data-wire-id]');
    if (wirePath) {
        const id = parseInt(wirePath.dataset.wireId);
        if (selectedWireId === id) {
            deleteWire(id);
        } else {
            selectedWireId = id;
            selectedGateIds.clear();
            updateSelectionUI();
            hideContextMenu();
            renderWires();
        }
        return;
    }
    if (selectedWireId !== null) {
        selectedWireId = null;
        renderWires();
    }
    const gateEl = e.target.closest('.gate');
    if (gateEl) {
        const gateId = parseInt(gateEl.dataset.gateId);
        const gate = gates.find(g => g.id === gateId);
        if (gate && gate.type === 'INPUT' && !e.target.closest('.pin') && !wasDragged) {
            toggleInputGate(gateId);
            return;
        }
    }
    wasDragged = false;
});

dropZone.addEventListener('dblclick', e => {
    const wirePath = e.target.closest('.wire[data-wire-id]');
    if (wirePath) {
        const id = parseInt(wirePath.dataset.wireId);
        deleteWire(id);
    }
});

function deleteWire(id) {
    pushHistory();
    wires = wires.filter(w => w.id !== id);
    if (selectedWireId === id) selectedWireId = null;
    simulate();
}

dropZone.addEventListener('mouseover', e => {
    const wirePath = e.target.closest('.wire[data-wire-id]');
    if (wirePath) {
        const tooltip = $('tooltip');
        tooltip.textContent = 'Click to select, double-click or Delete to remove';
        tooltip.style.display = 'block';
    }
});

dropZone.addEventListener('mousemove', e => {
    const tooltip = $('tooltip');
    if (tooltip.style.display === 'block') {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY + 12) + 'px';
    }
});

dropZone.addEventListener('mouseout', e => {
    if (!dropZone.contains(e.relatedTarget)) {
        $('tooltip').style.display = 'none';
    }
});

// ===== Right Click Context Menu =====
dropZone.addEventListener('contextmenu', e => {
    e.preventDefault();
    const wirePath = e.target.closest('.wire[data-wire-id]');
    if (wirePath) {
        const id = parseInt(wirePath.dataset.wireId);
        const wire = wires.find(w => w.id === id);
        if (!wire) return;
        showWireContextMenu(e.clientX, e.clientY, wire);
        return;
    }
    const gateEl = e.target.closest('.gate');
    if (!gateEl) { hideContextMenu(); return; }
    const gateId = parseInt(gateEl.dataset.gateId);
    showGateContextMenu(e.clientX, e.clientY, gateId);
});

function showGateContextMenu(x, y, gateId) {
    const menu = $('contextMenu');
    menu.innerHTML = '';
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    const ids = selectedGateIds.has(gateId) ? [...selectedGateIds] : [gateId];

    const title = document.createElement('div');
    title.style.cssText = 'padding: 8px 16px; font-size: 11px; color: #888; border-bottom: 1px solid #333;';
    title.textContent = ids.length > 1 ? `${ids.length} gates selected` : `${GATE_TYPES[gates.find(g => g.id === gateId)?.type]?.name || ''} Gate #${gateId}`;
    menu.appendChild(title);

    const btn = document.createElement('button');
    btn.className = 'danger';
    btn.textContent = ids.length > 1 ? `✕ Delete ${ids.length} Gates` : '✕ Delete Gate';
    btn.addEventListener('click', () => { deleteGates(ids); hideContextMenu(); });
    menu.appendChild(btn);

    if (!selectedGateIds.has(gateId)) {
        selectedGateIds.clear();
        selectedGateIds.add(gateId);
        updateSelectionUI();
    }
}

function showWireContextMenu(x, y, wire) {
    const menu = $('contextMenu');
    menu.innerHTML = '';
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    const title = document.createElement('div');
    title.style.cssText = 'padding: 8px 16px; font-size: 11px; color: #888; border-bottom: 1px solid #333;';
    title.textContent = `Wire #${wire.id}`;
    menu.appendChild(title);

    const btn = document.createElement('button');
    btn.className = 'danger';
    btn.textContent = '✕ Delete Wire';
    btn.addEventListener('click', () => { deleteWire(wire.id); hideContextMenu(); });
    menu.appendChild(btn);

    selectedWireId = wire.id;
}

function hideContextMenu() {
    $('contextMenu').style.display = 'none';
}

function deleteGate(gateId) {
    gates = gates.filter(g => g.id !== gateId);
    wires = wires.filter(w => w.fromGateId !== gateId && w.toGateId !== gateId);
    selectedGateIds.delete(gateId);
    renderAll();
    simulate();
}

function deleteGates(ids) {
    if (ids.length === 0) return;
    pushHistory();
    for (const id of ids) deleteGate(id);
}

document.addEventListener('click', e => {
    if (!e.target.closest('.context-menu')) hideContextMenu();
});

// ===== Keyboard =====
document.addEventListener('keydown', e => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId !== null) {
            deleteWire(selectedWireId);
            e.preventDefault();
        } else if (selectedGateIds.size > 0) {
            deleteGates([...selectedGateIds]);
            e.preventDefault();
        }
    }
    if (e.key === 'Escape') {
        cancelWiring();
        selectedGateIds.clear();
        selectedWireId = null;
        updateSelectionUI();
        hideContextMenu();
        renderWires();
    }
});

// ===== Undo/Redo & Copy/Paste via Keyboard =====
document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    switch (e.key.toLowerCase()) {
        case 'z':
            e.preventDefault();
            e.shiftKey ? redo() : undo();
            break;
        case 'y':
            e.preventDefault();
            redo();
            break;
        case 'c':
            e.preventDefault();
            copySelected();
            break;
        case 'v':
            e.preventDefault();
            pasteClipboard();
            break;
    }
});

// ===== Zoom Controls =====
$('zoomInBtn').addEventListener('click', () => setZoom(zoomLevel + 0.15));
$('zoomOutBtn').addEventListener('click', () => setZoom(zoomLevel - 0.15));
$('zoomFitBtn').addEventListener('click', zoomToFit);

workspace.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(zoomLevel + (e.deltaY > 0 ? -0.1 : 0.1));
    }
}, { passive: false });

// ===== Save / Load =====
function serialize() {
    return JSON.stringify({
        version: 1,
        gates: gates.map(g => ({
            id: g.id, type: g.type, x: g.x, y: g.y,
            inputValues: g.inputValues ? [...g.inputValues] : [],
            storedValue: (g.type === 'DFF' || g.type === 'JKFF') ? (g.storedValue || 0) : undefined,
            prevClk: (g.type === 'DFF' || g.type === 'JKFF') ? (g.prevClk || 0) : undefined
        })),
        wires: wires.map(w => ({
            fromGateId: w.fromGateId, fromPinIdx: w.fromPinIdx,
            toGateId: w.toGateId, toPinIdx: w.toPinIdx
        }))
    }, null, 2);
}

function deserialize(json) {
    const data = JSON.parse(json);
    if (!data.version) throw new Error('Invalid file');
    gates = data.gates.map(g => ({
        id: g.id, type: g.type, x: g.x, y: g.y,
        inputValues: g.inputValues || new Array(GATE_TYPES[g.type].inputs).fill(0),
        storedValue: (g.type === 'DFF' || g.type === 'JKFF') ? (g.storedValue || 0) : undefined,
        prevClk: (g.type === 'DFF' || g.type === 'JKFF') ? (g.prevClk || 0) : undefined,
        output: 0
    }));
    wires = data.wires.map(w => ({
        id: 0, fromGateId: w.fromGateId, fromPinIdx: w.fromPinIdx,
        toGateId: w.toGateId, toPinIdx: w.toPinIdx
    }));
    nextGateId = Math.max(1, ...gates.map(g => g.id)) + 1;
    wires.forEach((w, i) => w.id = i + 1);
    nextWireId = wires.length + 1;
}

$('saveBtn').addEventListener('click', () => {
    if (gates.length === 0) return;
    const name = prompt('Save circuit as:', 'circuit.dcs');
    if (!name) return;
    const blob = new Blob([serialize()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.endsWith('.dcs') ? name : name + '.dcs';
    a.click();
    URL.revokeObjectURL(a.href);
});

$('loadBtn').addEventListener('click', () => {
    if (gates.length > 0 && !confirm('Load will replace current circuit. Continue?')) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dcs,application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                pushHistory();
                deserialize(ev.target.result);
                cancelWiring();
                renderAll();
                simulate();
            } catch (err) {
                alert('Failed to load file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// ===== Clear =====
$('clearBtn').addEventListener('click', () => {
    if (gates.length === 0) return;
    if (confirm('Clear all gates and wires?')) {
        pushHistory();
        gates = [];
        wires = [];
        nextGateId = 1;
        nextWireId = 1;
        cancelWiring();
        renderAll();
        simulate();
    }
});

// ===== Utility =====
function updateInfoBar() {
    let text = `Gates: ${gates.length} | Wires: ${wires.length}`;
    if (selectedGateIds.size > 0) text += ` | Selected: ${selectedGateIds.size}`;
    $('gateCount').textContent = text;
}

// ===== Toolbar SVG Icons =====
function renderToolbarIcons() {
    document.querySelectorAll('.tool-btn[data-gate]').forEach(btn => {
        const type = btn.dataset.gate.toLowerCase();
        const fn = GATE_SHAPES[type];
        if (!fn) return;
        const icon = btn.querySelector('.icon');
        if (!icon) return;
        let content = fn();
        content = content.replace(/\s+stroke-width="[^"]*"/g, '');
        if (type === 'input' || type === 'output' || type === 'dff' || type === 'jkff') {
            content = content.replace(/<text[^>]*>.*<\/text>/g, '');
            content = content.replace(/<path[^>]*\/>/g, '');
        }
        icon.innerHTML = `<svg viewBox="0 0 90 64" width="28" height="20">${content}</svg>`;
    });
}

// ===== Dropdown Palettes =====
document.addEventListener('click', e => {
    const trigger = e.target.closest('.dropdown-trigger');
    document.querySelectorAll('.dropdown-panel.open').forEach(p => p.classList.remove('open'));
    if (trigger) {
        const panel = trigger.closest('.gate-dropdown').querySelector('.dropdown-panel');
        panel.classList.add('open');
    }
});

function placeGateAtCenter(gateType) {
    if (!GATE_TYPES[gateType]) return;
    const wr = workspace.getBoundingClientRect();
    const ws = screenToWorkspace(wr.left + wr.width / 2, wr.top + wr.height / 2);
    const SNAP = 24;
    const x = Math.round((ws.x - 45) / SNAP) * SNAP;
    const y = Math.round((ws.y - 32) / SNAP) * SNAP;
    const gate = {
        id: nextGateId++,
        type: gateType,
        x: Math.max(0, x),
        y: Math.max(0, y),
        inputValues: new Array(GATE_TYPES[gateType].inputs).fill(0),
        output: 0
    };
    if (gateType === 'DFF' || gateType === 'JKFF') { gate.storedValue = 0; gate.prevClk = 0; }
    pushHistory();
    gates.push(gate);
    renderAll();
    simulate();
}

document.querySelectorAll('.dropdown-panel .tool-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        const gateType = btn.dataset.gate;
        if (!gateType) return;
        placeGateAtCenter(gateType);
    });
    btn.addEventListener('dragend', e => {
        btn.closest('.dropdown-panel').classList.remove('open');
    });
});

// ===== About Modal =====
$('aboutBtn').addEventListener('click', () => $('aboutModal').style.display = 'flex');
$('aboutCloseBtn').addEventListener('click', () => $('aboutModal').style.display = 'none');
$('aboutModal').addEventListener('click', e => { if (e.target === e.currentTarget) $('aboutModal').style.display = 'none'; });

// ===== Theme Toggle =====
(function initTheme() {
    if (localStorage.getItem('dcs-theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();

$('themeBtn').addEventListener('click', () => {
    const html = document.documentElement;
    if (html.getAttribute('data-theme') === 'light') {
        html.removeAttribute('data-theme');
        localStorage.setItem('dcs-theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('dcs-theme', 'light');
    }
});

// ===== Touch Support =====
function getTouchPos(e) {
    const t = e.changedTouches[0];
    return { x: t.clientX, y: t.clientY };
}

// Toolbar drag via touch
document.querySelectorAll('.tool-btn[draggable]').forEach(btn => {
    btn.addEventListener('touchstart', e => {
        touchHandled = true;
        touchDragType = btn.dataset.gate;
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.style.display = 'flex';
        ghost.textContent = touchDragType;
        const pos = getTouchPos(e);
        ghost.style.left = (pos.x - 50) + 'px';
        ghost.style.top = (pos.y - 27) + 'px';
        document.body.appendChild(ghost);
        touchDragGhost = ghost;
    }, { passive: true });

    btn.addEventListener('touchmove', e => {
        if (!touchDragGhost) return;
        e.preventDefault();
        const pos = getTouchPos(e);
        touchDragGhost.style.left = (pos.x - 50) + 'px';
        touchDragGhost.style.top = (pos.y - 27) + 'px';
    }, { passive: false });

    btn.addEventListener('touchend', e => {
        if (!touchDragGhost || !touchDragType) return;
        if (touchDragGhost.parentNode) touchDragGhost.parentNode.removeChild(touchDragGhost);
        touchDragGhost = null;
        const pos = getTouchPos(e);
        const target = document.elementFromPoint(pos.x, pos.y);
        if (!target || !target.closest('.workspace-drop-zone')) {
            touchDragType = null;
            return;
        }
        if (!GATE_TYPES[touchDragType]) { touchDragType = null; return; }
        const SNAP = 24;
        const ws = screenToWorkspace(pos.x, pos.y);
        const x = Math.round((ws.x - 45) / SNAP) * SNAP;
        const y = Math.round((ws.y - 32) / SNAP) * SNAP;
        const gate = {
            id: nextGateId++, type: touchDragType,
            x: Math.max(0, x), y: Math.max(0, y),
            inputValues: new Array(GATE_TYPES[touchDragType].inputs).fill(0), output: 0
        };
        if (touchDragType === 'DFF' || touchDragType === 'JKFF') { gate.storedValue = 0; gate.prevClk = 0; }
        pushHistory();
        gates.push(gate);
        renderAll();
        simulate();
        $('modeIndicator').textContent = 'Select mode — click a pin to start wiring';
        touchDragType = null;
    }, { passive: true });
});

// Workspace touch interactions
(function() {
    let touchState = null;
    let touchStartPos = null;
    let touchMoved = false;

    dropZone.addEventListener('touchstart', e => {
        if (e.touches.length > 1) return;
        touchHandled = true;
        touchMoved = false;
        const pos = getTouchPos(e);
        touchStartPos = pos;
        const target = document.elementFromPoint(pos.x, pos.y);

        if (!target) return;

        const wirePath = target.closest('.wire[data-wire-id]');

        if (!wirePath && selectedWireId !== null) {
            selectedWireId = null;
            renderWires();
        }

        const pinEl = target.closest('.pin');
        if (pinEl) {
            e.preventDefault();
            const info = {
                gateId: parseInt(pinEl.dataset.gateId),
                pinIdx: parseInt(pinEl.dataset.pinIdx),
                isOutput: pinEl.dataset.isOutput === 'true'
            };
            handlePinClick(info, { stopPropagation: () => {}, clientX: pos.x, clientY: pos.y });
            return;
        }

        const gateEl = target.closest('.gate');
        if (gateEl) {
            e.preventDefault();
            const gateId = parseInt(gateEl.dataset.gateId);
            const gate = gates.find(g => g.id === gateId);

            if (gate && gate.type === 'INPUT') {
                touchState = { type: 'tap-input', gateId };
                return;
            }

            if (!gate) return;

            longPressTimer = setTimeout(() => {
                if (!touchMoved) {
                    showGateContextMenu(pos.x, pos.y, gateId);
                    longPressTimer = null;
                }
            }, 500);

            if (!selectedGateIds.has(gateId)) {
                selectedGateIds.clear();
                selectedGateIds.add(gateId);
            }
            updateSelectionUI();
            hideContextMenu();
            pushHistory();

            const ws = screenToWorkspace(pos.x, pos.y);
            const ids = [...selectedGateIds];
            touchState = {
                type: 'drag',
                gateIds: ids,
                origins: ids.map(id => {
                    const g = gates.find(gg => gg.id === id);
                    return { id, x: g ? g.x : 0, y: g ? g.y : 0 };
                }),
                startX: ws.x,
                startY: ws.y
            };
            gateEl.style.zIndex = 20;
            return;
        }

        if (wirePath) {
            e.preventDefault();
            const id = parseInt(wirePath.dataset.wireId);
            const now = Date.now();
            if (selectedWireId === id && now - lastTouchEnd < 400) {
                deleteWire(id);
                lastTouchEnd = 0;
                return;
            }
            selectedWireId = id;
            selectedGateIds.clear();
            updateSelectionUI();
            hideContextMenu();
            renderWires();
            lastTouchEnd = now;
            return;
        }

        if (wiringState) {
            cancelWiring();
            selectedGateIds.clear();
            updateSelectionUI();
            hideContextMenu();
            return;
        }

        const ws = screenToWorkspace(pos.x, pos.y);
        touchState = { type: 'marquee', startX: ws.x, startY: ws.y };
    }, { passive: true });

    dropZone.addEventListener('touchmove', e => {
        if (!touchState) return;
        if (longPressTimer) {
            const pos = getTouchPos(e);
            if (Math.abs(pos.x - touchStartPos.x) > 10 || Math.abs(pos.y - touchStartPos.y) > 10) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
        e.preventDefault();
        const pos = getTouchPos(e);
        touchMoved = true;

        if (touchState.type === 'drag') {
            const SNAP = 24;
            const ws = screenToWorkspace(pos.x, pos.y);
            const dx = Math.round((ws.x - touchState.startX) / SNAP) * SNAP;
            const dy = Math.round((ws.y - touchState.startY) / SNAP) * SNAP;
            for (const origin of touchState.origins) {
                const gate = gates.find(g => g.id === origin.id);
                if (gate) {
                    gate.x = Math.max(0, origin.x + dx);
                    gate.y = Math.max(0, origin.y + dy);
                    const el = dropZone.querySelector(`.gate[data-gate-id="${gate.id}"]`);
                    if (el) {
                        el.style.left = gate.x + 'px';
                        el.style.top = gate.y + 'px';
                    }
                }
            }
            renderWires();

            let anyOverlap = false;
            for (const id of touchState.gateIds) {
                const el = dropZone.querySelector(`.gate[data-gate-id="${id}"]`);
                if (!el) continue;
                const b = $('trashBin');
                if (!b) continue;
                const gr = el.getBoundingClientRect();
                const br = b.getBoundingClientRect();
                if (gr.right > br.left && gr.left < br.right && gr.bottom > br.top && gr.top < br.bottom) {
                    anyOverlap = true; break;
                }
            }
            const binEl = $('trashBin');
            if (binEl) binEl.classList.toggle('drag-over', anyOverlap);
        } else if (touchState.type === 'marquee') {
            const ws = screenToWorkspace(pos.x, pos.y);
            const overlay = $('marqueeOverlay');
            const minX = Math.min(touchState.startX, ws.x);
            const minY = Math.min(touchState.startY, ws.y);
            const maxX = Math.max(touchState.startX, ws.x);
            const maxY = Math.max(touchState.startY, ws.y);
            overlay.style.left = minX + 'px';
            overlay.style.top = minY + 'px';
            overlay.style.width = (maxX - minX) + 'px';
            overlay.style.height = (maxY - minY) + 'px';
            overlay.style.display = 'block';
        }
    }, { passive: false });

    dropZone.addEventListener('touchend', e => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        if (!touchState) return;
        const pos = getTouchPos(e);

        if (touchState.type === 'drag') {
            const binEl = $('trashBin');
            const overBin = binEl && binEl.classList.contains('drag-over');
            if (overBin) {
                if (binEl) binEl.classList.remove('drag-over');
                deleteGates(touchState.gateIds);
            } else {
                for (const id of touchState.gateIds) {
                    const el = dropZone.querySelector(`.gate[data-gate-id="${id}"]`);
                    if (el) el.style.zIndex = 10;
                }
                renderWires();
            }
        } else if (touchState.type === 'marquee') {
            const overlay = $('marqueeOverlay');
            overlay.style.display = 'none';
            if (touchMoved) {
                const ws = screenToWorkspace(pos.x, pos.y);
                const minX = Math.min(touchState.startX, ws.x);
                const minY = Math.min(touchState.startY, ws.y);
                const maxX = Math.max(touchState.startX, ws.x);
                const maxY = Math.max(touchState.startY, ws.y);
                for (const gate of gates) {
                    if (gate.x < maxX && gate.x + 90 > minX && gate.y < maxY && gate.y + 64 > minY) {
                        selectedGateIds.add(gate.id);
                    }
                }
                updateSelectionUI();
            }
        } else if (touchState.type === 'tap-input') {
            if (!touchMoved) toggleInputGate(touchState.gateId);
        }
        touchState = null;
        touchMoved = false;
    }, { passive: true });
})();

// Pinch-to-zoom
workspace.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        pinchStartZoom = zoomLevel;
    }
}, { passive: true });

workspace.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinchStartDist) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        setZoom(pinchStartZoom * (dist / pinchStartDist));
    }
}, { passive: false });

workspace.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
        pinchStartDist = null;
        pinchStartZoom = null;
    }
}, { passive: true });

// ===== Init =====
setZoom(1);
renderAll();
renderToolbarIcons();
$('modeIndicator').textContent = 'Click/Shift+click to select. Drag group to move. Ctrl+C copy, Ctrl+V paste, Ctrl+Z undo, Ctrl+Y redo. Click INPUT body to toggle.';
