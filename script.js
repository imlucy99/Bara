const MPS_TO_MPH = 2.236936;
const MIN_ANGLE = -110;
const MAX_ANGLE = 110;
const MAX_SPEED = 260;

const elGear = document.getElementById('gear');
const elOdo = document.getElementById('odometer');
const elNeedle = document.getElementById('needle');
const elSpeedDigital = document.getElementById('speed-digital');
const elFuelBar = document.getElementById('fuel-bar');
const elFuelValue = document.getElementById('fuel-value');
const elHealthBar = document.getElementById('health-bar');
const elHealthValue = document.getElementById('health-value');
const rpmGroup = document.getElementById('rpm');

function isLockedState(val) {
    return val === true || val === 1 || val === "1" || val === "true" || val === 2 || val === "2";
}
function isTrueValue(val) {
    return val === true || val === 1 || val === "1" || val === "true";
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function polar(cx, cy, radius, angleDeg) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
}

function buildGauge() {
    const ticks = document.getElementById('ticks');
    const numbers = document.getElementById('numbers');
    for (let speed = 0; speed <= MAX_SPEED; speed += 5) {
        const angle = MIN_ANGLE + (speed / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);
        const major = speed % 20 === 0;
        const medium = speed % 10 === 0;
        const p1 = polar(260, 310, major ? 199 : (medium ? 203 : 207), angle);
        const p2 = polar(260, 310, 216, angle);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
        line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
        line.setAttribute('class', major ? 'tick major' : (medium ? 'tick medium' : 'tick minor'));
        ticks.appendChild(line);
        if (major) {
            const n = polar(260, 310, 177, angle);
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', n.x); t.setAttribute('y', n.y + 6);
            t.setAttribute('class', 'speed-number'); t.setAttribute('text-anchor', 'middle');
            t.textContent = speed;
            numbers.appendChild(t);
        }
    }

    // 20 RPM segments, retained from the original API.
    for (let i = 0; i < 20; i++) {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('class', 'rpm-segment');
        r.setAttribute('x', 185 + i * 8);
        r.setAttribute('y', 324);
        r.setAttribute('width', 6);
        r.setAttribute('height', 3);
        r.setAttribute('rx', 1);
        rpmGroup.appendChild(r);
    }
}
buildGauge();

function setNeedleMPH(mph) {
    const value = clamp(Number(mph) || 0, 0, MAX_SPEED);
    const angle = MIN_ANGLE + (value / MAX_SPEED) * (MAX_ANGLE - MIN_ANGLE);
    elNeedle.setAttribute('transform', `rotate(${angle} 260 310)`);
    elSpeedDigital.textContent = Math.round(value);
}

// === ORIGINAL API ===
window.setSpeed = function(speed) {
    setNeedleMPH(Number(speed || 0) * MPS_TO_MPH);
};
window.setRPM = function(rpm) {
    const val = clamp(Number(rpm || 0), 0, 1);
    const active = Math.round(val * 20);
    document.querySelectorAll('.rpm-segment').forEach((seg, i) => {
        seg.classList.toggle('active', i < active);
    });
};
window.setFuel = function(fuel) {
    const val = Number(fuel || 0);
    const percent = clamp(val > 1 ? val / 100 : val, 0, 1);
    elFuelBar.setAttribute('width', 34 * percent);
    elFuelValue.textContent = `${Math.round(percent * 100)}%`;
    elFuelBar.classList.toggle('low', percent <= 0.20);
};
window.setHealth = function(health) {
    let val = Number(health || 0);
    let percent = val > 1 ? val / 1000 : val;
    percent = clamp(percent, 0, 1);
    elHealthBar.setAttribute('width', 34 * percent);
    elHealthValue.textContent = `${Math.round(percent * 100)}%`;
    elHealthBar.classList.toggle('danger', percent <= 0.25);
    elHealthBar.classList.toggle('warn', percent > 0.25 && percent <= 0.50);
};
window.setGear = function(gear) {
    elGear.innerText = (gear == 0 || gear === "0") ? 'R' : String(gear);
};
window.updateLockStatus = function(state) {
    document.getElementById('door-lock').classList.toggle('locked', isLockedState(state));
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
window.setLeftIndicator = function(state) {
    document.getElementById('indicator-left').classList.toggle('active', isTrueValue(state));
};
window.setRightIndicator = function(state) {
    document.getElementById('indicator-right').classList.toggle('active', isTrueValue(state));
};
window.setSeatbelts = function(state) {
    const el = document.getElementById('seatbelts');
    el.classList.toggle('active', isTrueValue(state));
    el.classList.toggle('warn', !isTrueValue(state));
};
window.setOdometer = function(distance) {
    elOdo.innerText = `${Number(distance || 0).toFixed(1)} mi`;
};

window.addEventListener('message', function(event) {
    if (!event.data) return;
    const data = event.data;
    if (data.type === 'setDoors' || data.action === 'setDoors' || data.type === 'lock') {
        window.updateLockStatus(data.status !== undefined ? data.status : data.state);
    }
});
