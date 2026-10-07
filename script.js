const MPS_TO_MPH = 2.236936;
const MIN_ANGLE = -90;
const MAX_ANGLE = 90;
const MAX_SPEED = 260;

const elGear = document.getElementById('gear');
const elOdo = document.getElementById('odometer');
const elNeedlePath = document.getElementById('needle-path');
const elNeedleShadow = document.getElementById('needle-shadow');
const elSpeedDigital = document.getElementById('speed-digital');
const elFuelValue = document.getElementById('fuel-value');
const fuelSegments = document.getElementById('fuel-segments');

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function isTrueValue(val) {
    return val === true || val === 1 || val === "1" || val === "true";
}

function isLockedState(val) {
    return isTrueValue(val) || val === 2 || val === "2";
}

function polar(cx, cy, radius, angleDeg) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return {
        x: cx + radius * Math.cos(a),
        y: cy + radius * Math.sin(a)
    };
}

function buildGauge() {
    const ticks = document.getElementById('ticks');
    const numbers = document.getElementById('numbers');

    // 0..260, 10 MPH minor divisions, 20 MPH numbered marks.
    for (let speed = 0; speed <= MAX_SPEED; speed += 10) {
        const angle = MIN_ANGLE + (speed / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);
        const major = speed % 20 === 0;
        const p1 = polar(260, 302, major ? 176 : 181, angle);
        const p2 = polar(260, 302, 188, angle);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x);
        line.setAttribute('y2', p2.y);
        line.setAttribute('class', major ? 'tick major' : 'tick minor');
        ticks.appendChild(line);

        if (major) {
            const n = polar(260, 302, 158, angle);
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', n.x);
            t.setAttribute('y', n.y + 5);
            t.setAttribute('class', 'speed-number');
            t.setAttribute('text-anchor', 'middle');
            t.textContent = speed;
            numbers.appendChild(t);
        }
    }

    // Compact fuel segments.
    if (fuelSegments) {
        for (let i = 0; i < 8; i++) {
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', 119 + i * 7);
            r.setAttribute('y', 327);
            r.setAttribute('width', 5);
            r.setAttribute('height', 4);
            r.setAttribute('rx', 1);
            r.setAttribute('class', 'fuel-segment');
            fuelSegments.appendChild(r);
        }
    }

    // Engine health segments.
    const healthSegments = document.getElementById('health-segments');
    if (healthSegments) {
        for (let i = 0; i < 6; i++) {
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', 379 + i * 7);
            r.setAttribute('y', 332);
            r.setAttribute('width', 5);
            r.setAttribute('height', 4);
            r.setAttribute('rx', 1);
            r.setAttribute('class', 'health-segment');
            healthSegments.appendChild(r);
        }
    }
}

buildGauge();

function setNeedleMPH(mph) {
    const value = clamp(Number(mph) || 0, 0, MAX_SPEED);
    const angle = MIN_ANGLE + (value / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);

    // Gauge center is (260,302). Directly draw the needle so it cannot
    // disappear because of SVG transform-origin/browser differences.
    const rad = (angle - 90) * Math.PI / 180;
    const length = 128;
    const shadowLength = 132;
    const tipX = 260 + Math.cos(rad) * length;
    const tipY = 302 + Math.sin(rad) * length;
    const shadowX = 260 + Math.cos(rad) * shadowLength;
    const shadowY = 302 + Math.sin(rad) * shadowLength;
    const px = -Math.sin(rad);
    const py = Math.cos(rad);
    const half = 1.8;
    const tail = 7;

    const path = [
        `${260 + px * half} ${302 + py * half}`,
        `${tipX} ${tipY}`,
        `${260 - px * half} ${302 - py * half}`,
        `${260 - px * tail} ${302 - py * tail}`,
        `${260 + px * tail} ${302 + py * tail}`
    ].join(' L ');

    const shadowPath = [
        `${260 + px * 2.4} ${302 + py * 2.4}`,
        `${shadowX} ${shadowY}`,
        `${260 - px * 2.4} ${302 - py * 2.4}`,
        `${260 - px * 6} ${302 - py * 6}`,
        `${260 + px * 6} ${302 + py * 6}`
    ].join(' L ');

    elNeedlePath.setAttribute('d', `M ${path} Z`);
    elNeedleShadow.setAttribute('d', `M ${shadowPath} Z`);
    elSpeedDigital.textContent = Math.round(value);
}

// Existing API
window.setSpeed = function(speed) {
    setNeedleMPH(Number(speed || 0) * MPS_TO_MPH);
};

window.setRPM = function(_) {
    // Kept for compatibility; RPM is intentionally not displayed.
};

window.setFuel = function(fuel) {
    const raw = Number(fuel || 0);
    const percent = clamp(raw > 1 ? raw / 100 : raw, 0, 1);
    const active = Math.round(percent * 8);

    document.querySelectorAll('.fuel-segment').forEach((seg, i) => {
        seg.classList.toggle('active', i < active);
    });

    elFuelValue.textContent = `${Math.round(percent * 100)}%`;
};

window.setHealth = function(health) {
    let val = Number(health || 0);
    let percent = val > 1 ? val / 1000 : val;
    percent = clamp(percent, 0, 1);

    const active = Math.round(percent * 6);
    document.querySelectorAll('.health-segment').forEach((seg, i) => {
        seg.classList.toggle('active', i < active);
        seg.classList.toggle('danger', percent <= 0.25 && i < active);
        seg.classList.toggle('warn', percent > 0.25 && percent <= 0.50 && i < active);
    });

    const el = document.getElementById('health-value');
    if (el) el.textContent = `${Math.round(percent * 100)}%`;
};

window.setGear = function(gear) {
    elGear.textContent = (gear == 0 || gear === "0") ? 'R' : String(gear);
};

window.setOdometer = function(distance) {
    const value = Number(distance || 0);
    elOdo.textContent = `ODO  ${value.toFixed(1).padStart(8, '0')}`;
};

// Keep lock/headlight/seatbelt APIs because they are useful.
// Turn-signal APIs are intentionally no-op because the UI no longer displays them.
window.updateLockStatus = function(_) {
    // Door lock indicator intentionally hidden.
};
window.setDoors = window.updateLockStatus;
window.setDoorLock = window.updateLockStatus;
window.setVehicleLocked = window.updateLockStatus;
window.setLocked = window.updateLockStatus;
window.setLock = window.updateLockStatus;
window.toggleLock = window.updateLockStatus;

window.setHeadlights = function(state) {
    const low = document.getElementById('headlight-low');
    const high = document.getElementById('headlight-high');
    const val = Number(state || 0);

    low.classList.toggle('active', val === 1);
    high.classList.toggle('high-beam', val === 2);
};

window.setSeatbelts = function(state) {
    const el = document.getElementById('seatbelts');
    const on = isTrueValue(state);
    el.classList.toggle('active', on);
    el.classList.toggle('warn', !on);
};

// Deliberately disabled visually; API calls won't cause errors.
window.setLeftIndicator = function(_) {};
window.setRightIndicator = function(_) {};

window.addEventListener('message', function(event) {
    if (!event.data) return;
    const data = event.data;

    if (data.type === 'speed' || data.action === 'speed' ||
        data.type === 'setSpeed' || data.action === 'setSpeed') {
        const value = data.speed ?? data.value ?? data.data;
        if (value !== undefined) window.setSpeed(value);
    }

    if (data.type === 'setFuel' || data.action === 'setFuel') {
        window.setFuel(data.fuel ?? data.value ?? 0);
    }

    if (data.type === 'setGear' || data.action === 'setGear') {
        window.setGear(data.gear ?? data.value ?? 1);
    }

    if (data.type === 'setOdometer' || data.action === 'setOdometer') {
        window.setOdometer(data.distance ?? data.value ?? 0);
    }

    if (data.type === 'setSeatbelts' || data.action === 'setSeatbelts') {
        window.setSeatbelts(data.state ?? data.status ?? false);
    }

    if (data.type === 'setHeadlights' || data.action === 'setHeadlights') {
        window.setHeadlights(data.state ?? data.status ?? 0);
    }

    if (data.type === 'setDoors' || data.action === 'setDoors' || data.type === 'lock') {
        window.updateLockStatus(data.status !== undefined ? data.status : data.state);
    }
});
