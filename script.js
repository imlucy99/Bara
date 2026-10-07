const MPS_TO_MPH = 2.236936;
const MAX_SPEED = 260;
const MIN_ANGLE = -120;
const MAX_ANGLE = 120;

const elSpeed = document.getElementById('speed-display');
const elGear = document.getElementById('gear');
const elOdo = document.getElementById('odometer');
const elNeedle = document.getElementById('needle');
const elNeedleShadow = document.getElementById('needle-shadow');
const elFuelSegments = document.getElementById('fuel-segments');
const elHealthSegments = document.getElementById('health-segments');
const elRpm = document.getElementById('rpm');

const fuelSegs = [];
const healthSegs = [];
const rpmSegs = [];

function isLockedState(val) {
    return val === true || val === 1 || val === '1' || val === 'true' || val === 2 || val === '2';
}
function isTrueValue(val) {
    return val === true || val === 1 || val === '1' || val === 'true';
}

function polar(cx, cy, radius, angleDeg) {
    const a = angleDeg * Math.PI / 180;
    return {
        x: cx + radius * Math.cos(a),
        y: cy + radius * Math.sin(a)
    };
}

function svgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function buildGauge() {
    const ticks = document.getElementById('ticks');
    const numbers = document.getElementById('numbers');

    // 0-260 MPH, 10 MPH minor divisions and 20 MPH major divisions.
    for (let speed = 0; speed <= MAX_SPEED; speed += 10) {
        const angle = MIN_ANGLE + (speed / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);
        const major = speed % 20 === 0;
        const p1 = polar(160, 190, major ? 122 : 127, angle);
        const p2 = polar(160, 190, 132, angle);

        const line = svgEl('line');
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x);
        line.setAttribute('y2', p2.y);
        line.setAttribute('class', major ? 'tick major' : 'tick minor');
        ticks.appendChild(line);

        if (major) {
            const n = polar(160, 190, 105, angle);
            const text = svgEl('text');
            text.setAttribute('x', n.x);
            text.setAttribute('y', n.y + 5);
            text.setAttribute('class', 'speed-number');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = String(speed);
            numbers.appendChild(text);
        }
    }

    // 10 fuel segments, matching the old API.
    for (let i = 0; i < 10; i++) {
        const r = svgEl('rect');
        r.setAttribute('x', 62 + i * 4.2);
        r.setAttribute('y', 221);
        r.setAttribute('width', 3.2);
        r.setAttribute('height', 3);
        r.setAttribute('rx', 0.8);
        r.setAttribute('class', 'fuel-seg');
        elFuelSegments.appendChild(r);
        fuelSegs.push(r);
    }

    // Hidden compatibility segment collections for scripts that inspect them.
    for (let i = 0; i < 10; i++) {
        const h = document.createElement('span');
        h.className = 'h-seg';
        elHealthSegments.appendChild(h);
        healthSegs.push(h);
    }
    for (let i = 0; i < 20; i++) {
        const r = document.createElement('span');
        r.className = 'rpm-segment';
        elRpm.appendChild(r);
        rpmSegs.push(r);
    }
}
buildGauge();

function setNeedleMPH(mph) {
    const value = Math.max(0, Math.min(MAX_SPEED, Number(mph) || 0));
    const angle = MIN_ANGLE + (value / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);
    const p = polar(160, 190, 104, angle);
    const ps = polar(160, 190, 99, angle);

    // Direct endpoint calculation fixes the missing needle issue from the previous version.
    elNeedle.setAttribute('x2', p.x);
    elNeedle.setAttribute('y2', p.y);
    elNeedleShadow.setAttribute('x2', ps.x);
    elNeedleShadow.setAttribute('y2', ps.y);

    if (elSpeed) elSpeed.textContent = String(Math.round(value));
}

// 1. Speed: existing API expects m/s and is converted to MPH.
window.setSpeed = function(speed) {
    setNeedleMPH(Number(speed || 0) * MPS_TO_MPH);
};

// Optional direct MPH API.
window.setSpeedMPH = function(mph) {
    setNeedleMPH(mph);
};

// 2. RPM
window.setRPM = function(rpm) {
    const val = Number(rpm || 0);
    const active = Math.round(Math.max(0, Math.min(1, val)) * rpmSegs.length);
    rpmSegs.forEach((seg, i) => seg.classList.toggle('active', i < active));
};

// 3. Fuel - supports 0..1 and 0..100.
window.setFuel = function(fuel) {
    const val = Number(fuel || 0);
    const percent = Math.max(0, Math.min(1, val > 1 ? val / 100 : val));
    const active = Math.round(percent * fuelSegs.length);
    fuelSegs.forEach((seg, i) => seg.classList.toggle('active', i < active));
};

// 4. Engine health - supports 0..1 and the common 0..1000 scale.
window.setHealth = function(health) {
    let val = Number(health || 0);
    let percent = val > 1 ? val / 1000 : val;
    percent = Math.max(0, Math.min(1, percent));
    const active = Math.round(percent * healthSegs.length);
    healthSegs.forEach((seg, i) => seg.classList.toggle('active', i < active));
};

// 5. Gear
window.setGear = function(gear) {
    if (!elGear) return;
    elGear.textContent = (gear == 0 || gear === '0') ? 'R' : String(gear);
};

// 6. Door lock aliases
window.updateLockStatus = function(state) {
    const el = document.getElementById('door-lock');
    if (!el) return;
    el.classList.toggle('locked', isLockedState(state));
};
window.setDoors = window.updateLockStatus;
window.setDoorLock = window.updateLockStatus;
window.setVehicleLocked = window.updateLockStatus;
window.setLocked = window.updateLockStatus;
window.setLock = window.updateLockStatus;
window.toggleLock = window.updateLockStatus;

// 7. Headlights
window.setHeadlights = function(state) {
    const low = document.getElementById('headlight-low');
    const high = document.getElementById('headlight-high');
    const val = Number(state || 0);
    if (low) low.classList.toggle('active', val === 1);
    if (high) high.classList.toggle('high-beam', val === 2);
};

// 8. Turn signals
window.setLeftIndicator = function(state) {
    const el = document.getElementById('indicator-left');
    if (el) el.classList.toggle('active', isTrueValue(state));
};
window.setRightIndicator = function(state) {
    const el = document.getElementById('indicator-right');
    if (el) el.classList.toggle('active', isTrueValue(state));
};

// 9. Seatbelt
window.setSeatbelts = function(state) {
    const el = document.getElementById('seatbelts');
    if (el) {
        el.classList.toggle('active', isTrueValue(state));
        el.classList.toggle('warn', !isTrueValue(state));
    }
};

// 10. Odometer
window.setOdometer = function(distance) {
    if (elOdo) elOdo.textContent = `${Number(distance || 0).toFixed(1)} mi`;
};

// Keep the old event-message compatibility.
window.addEventListener('message', function(event) {
    const data = event.data;
    if (!data) return;

    if (data.type === 'speed' || data.action === 'speed' || data.type === 'setSpeed' || data.action === 'setSpeed') {
        window.setSpeed(data.speed ?? data.value ?? data.data ?? 0);
    }
    if (data.type === 'setDoors' || data.action === 'setDoors' || data.type === 'lock') {
        window.updateLockStatus(data.status !== undefined ? data.status : data.state);
    }
});

// Start at zero with a visible needle.
setNeedleMPH(0);
