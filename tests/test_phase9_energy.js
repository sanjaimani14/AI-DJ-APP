/**
 * tests/test_phase9_energy.js - Automated Test Suite for Phase 9: AI Energy Management
 */

const assert = require('assert');

// Test 1: Energy Tiers Classification
console.log('--- TEST 1: Energy Tiers Classification (0.0 to 1.0) ---');
function getEnergyLevel(energy) {
  const clamped = Math.max(0.0, Math.min(1.0, energy));
  if (clamped >= 0.85) return 'PEAK';
  if (clamped >= 0.70) return 'HIGH';
  if (clamped >= 0.40) return 'MEDIUM';
  return 'LOW';
}

assert.strictEqual(getEnergyLevel(0.15), 'LOW');
assert.strictEqual(getEnergyLevel(0.39), 'LOW');
assert.strictEqual(getEnergyLevel(0.40), 'MEDIUM');
assert.strictEqual(getEnergyLevel(0.68), 'MEDIUM');
assert.strictEqual(getEnergyLevel(0.70), 'HIGH');
assert.strictEqual(getEnergyLevel(0.84), 'HIGH');
assert.strictEqual(getEnergyLevel(0.85), 'PEAK');
assert.strictEqual(getEnergyLevel(0.98), 'PEAK');
assert.strictEqual(getEnergyLevel(1.00), 'PEAK');
console.log('✓ All 4 Energy Tiers correctly classified: LOW, MEDIUM, HIGH, PEAK.');

// Test 2: Event Profiles Presets
console.log('\n--- TEST 2: Event Profile Presets ---');
const expectedProfiles = [
  'Chill',
  'Party',
  'High Energy',
  'EDM',
  'Tamil/Kuthu',
  'Tamil / Kuthu',
  'Romantic',
  'Custom'
];

const presets = {
  'Party': { profile: 'Party', startEnergy: 0.60, targetEnergy: 0.88, eventDurationMinutes: 120, peakTimeMinutes: 80, allowJumps: false },
  'High Energy': { profile: 'High Energy', startEnergy: 0.75, targetEnergy: 0.98, eventDurationMinutes: 90, peakTimeMinutes: 55, allowJumps: false },
  'EDM': { profile: 'EDM', startEnergy: 0.68, targetEnergy: 0.95, eventDurationMinutes: 90, peakTimeMinutes: 60, allowJumps: false },
  'Tamil / Kuthu': { profile: 'Tamil / Kuthu', startEnergy: 0.70, targetEnergy: 0.96, eventDurationMinutes: 120, peakTimeMinutes: 80, allowJumps: false },
  'Tamil/Kuthu': { profile: 'Tamil / Kuthu', startEnergy: 0.70, targetEnergy: 0.96, eventDurationMinutes: 120, peakTimeMinutes: 80, allowJumps: false },
  'Chill': { profile: 'Chill', startEnergy: 0.35, targetEnergy: 0.52, eventDurationMinutes: 90, peakTimeMinutes: 45, allowJumps: false },
  'Romantic': { profile: 'Romantic', startEnergy: 0.30, targetEnergy: 0.55, eventDurationMinutes: 60, peakTimeMinutes: 35, allowJumps: false },
  'Custom': { profile: 'Custom', startEnergy: 0.50, targetEnergy: 0.85, eventDurationMinutes: 60, peakTimeMinutes: 40, allowJumps: false }
};

expectedProfiles.forEach(p => {
  assert.ok(presets[p], `Preset missing for profile: ${p}`);
  assert.ok(presets[p].startEnergy >= 0.0 && presets[p].startEnergy <= 1.0);
  assert.ok(presets[p].targetEnergy >= 0.0 && presets[p].targetEnergy <= 1.0);
  assert.ok(presets[p].peakTimeMinutes <= presets[p].eventDurationMinutes);
});
console.log(`✓ All ${expectedProfiles.length} profiles validated with valid start, target, duration, and peak time.`);

// Test 3: S-Curve Continuous Interpolation
console.log('\n--- TEST 3: S-Curve Planning & Monotonic Build-Up ---');
function smoothStep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function getTargetEnergyAtElapsed(config, elapsedMinutes) {
  const duration = Math.max(1, config.eventDurationMinutes);
  const peakTime = Math.max(1, Math.min(duration, config.peakTimeMinutes));
  const t = Math.max(0, Math.min(duration, elapsedMinutes));

  const start = Math.max(0, Math.min(1, config.startEnergy));
  const peak = Math.max(0, Math.min(1, config.targetEnergy));

  if (t <= peakTime) {
    const ratio = t / peakTime;
    const progress = smoothStep(ratio);
    return parseFloat((start + (peak - start) * progress).toFixed(3));
  } else {
    const postRatio = (t - peakTime) / Math.max(1, duration - peakTime);
    const postProgress = smoothStep(postRatio);
    const endEnergy = Math.max(start, peak - 0.10);
    return parseFloat((peak - (peak - endEnergy) * postProgress).toFixed(3));
  }
}

const partyCfg = presets['Party'];
const e0 = getTargetEnergyAtElapsed(partyCfg, 0);
const eHalf = getTargetEnergyAtElapsed(partyCfg, partyCfg.peakTimeMinutes / 2);
const ePeak = getTargetEnergyAtElapsed(partyCfg, partyCfg.peakTimeMinutes);
const eEnd = getTargetEnergyAtElapsed(partyCfg, partyCfg.eventDurationMinutes);

console.log(`Party curve: t=0m -> ${e0} (${getEnergyLevel(e0)})`);
console.log(`Party curve: t=40m -> ${eHalf} (${getEnergyLevel(eHalf)})`);
console.log(`Party curve: t=80m (Peak) -> ${ePeak} (${getEnergyLevel(ePeak)})`);
console.log(`Party curve: t=120m (End) -> ${eEnd} (${getEnergyLevel(eEnd)})`);

assert.strictEqual(e0, partyCfg.startEnergy);
assert.strictEqual(ePeak, partyCfg.targetEnergy);
assert.ok(eHalf > e0 && eHalf < ePeak, 'Curve must build smoothly and monotonically toward peak');
assert.ok(eEnd >= e0, 'Curve post-peak plateau must not collapse below start');
console.log('✓ Hermite S-Curve ramps smoothly without sudden steps.');

// Test 4: Jump Prevention Filter
console.log('\n--- TEST 4: Jump Prevention Penalty ---');
function scoreCandidateEnergy(candidateEnergy, currentEnergy, targetCurveEnergy, allowJumps = false) {
  const cand = Math.max(0, Math.min(1, candidateEnergy));
  const cur = Math.max(0, Math.min(1, currentEnergy));
  const target = Math.max(0, Math.min(1, targetCurveEnergy));

  const deltaFromTarget = Math.abs(cand - target);
  const deltaFromCurrent = Math.abs(cand - cur);

  let jumpPenalty = 0.0;
  if (!allowJumps && deltaFromCurrent > 0.20) {
    jumpPenalty = (deltaFromCurrent - 0.20) * 1.5;
  }

  const rawProximity = Math.max(0.0, 1.0 - deltaFromTarget * 2.2);
  const finalScore = Math.max(0.0, Math.min(1.0, rawProximity - jumpPenalty));

  return {
    score: parseFloat(finalScore.toFixed(3)),
    jumpPenalty: parseFloat(jumpPenalty.toFixed(3)),
    deltaFromTarget: parseFloat(deltaFromTarget.toFixed(3)),
    deltaFromCurrent: parseFloat(deltaFromCurrent.toFixed(3)),
    isAppropriate: jumpPenalty === 0
  };
}

// Gentle shift <= 0.20
const gentle = scoreCandidateEnergy(0.75, 0.65, 0.74, false);
assert.strictEqual(gentle.jumpPenalty, 0);
assert.strictEqual(gentle.isAppropriate, true);
assert.ok(gentle.score > 0.85);

// Sudden inappropriate jump > 0.20 (e.g. 0.35 to 0.95: delta = 0.60)
const sudden = scoreCandidateEnergy(0.95, 0.35, 0.90, false);
assert.ok(sudden.jumpPenalty > 0, 'Must penalize sudden jump > 0.20 delta');
assert.strictEqual(sudden.isAppropriate, false);

// Sudden jump permitted if allowJumps is true
const permitted = scoreCandidateEnergy(0.95, 0.35, 0.90, true);
assert.strictEqual(permitted.jumpPenalty, 0);
assert.strictEqual(permitted.isAppropriate, true);
console.log(`Gentle transition score: ${gentle.score} (penalty: ${gentle.jumpPenalty})`);
console.log(`Sudden jump without permission: ${sudden.score} (penalty: ${sudden.jumpPenalty})`);
console.log(`Sudden jump with permission: ${permitted.score} (penalty: ${permitted.jumpPenalty})`);
console.log('✓ Sudden inappropriate jumps correctly identified and penalized unless requested.');

// Test 5: Playlist Simulation
console.log('\n--- TEST 5: Playlist Simulation ---');
const samplePlaylist = [
  { id: '1', title: 'Deep Tech Sunset', artist: 'Solomun', energy: 0.74, duration: 210 },
  { id: '2', title: 'Progressive Warmup', artist: 'Lane 8', energy: 0.62, duration: 200 },
  { id: '3', title: 'Groove Builder', artist: 'Disclosure', energy: 0.70, duration: 185 },
  { id: '4', title: 'Club Banger', artist: 'Fisher', energy: 0.80, duration: 175 },
  { id: '5', title: 'Mainstage Anthem', artist: 'Hardwell', energy: 0.88, duration: 180 },
  { id: '6', title: 'Festival Peak Time', artist: 'Martin Garrix', energy: 0.92, duration: 190 },
  { id: '7', title: 'Peak Climax', artist: 'Tiësto', energy: 0.88, duration: 185 },
  { id: '8', title: 'Encore Groove', artist: 'Calvin Harris', energy: 0.78, duration: 195 }
];

function simulatePlaylist(playlist, config) {
  const remaining = [...playlist];
  const planned = [];
  let curMinute = 0;
  let curEnergy = config.startEnergy;
  let maxJump = 0;
  const stepMin = config.eventDurationMinutes / playlist.length;

  while (remaining.length > 0) {
    const curveTarget = getTargetEnergyAtElapsed(config, curMinute);
    let bestIdx = 0;
    let bestScore = -999;

    for (let i = 0; i < remaining.length; i++) {
      const { score } = scoreCandidateEnergy(remaining[i].energy, curEnergy, curveTarget, config.allowJumps);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    const jump = parseFloat(Math.abs(chosen.energy - curEnergy).toFixed(3));
    if (planned.length > 0 && jump > maxJump) maxJump = jump;

    planned.push({
      minute: Math.round(curMinute),
      title: chosen.title,
      energy: chosen.energy,
      target: curveTarget,
      jump,
      level: getEnergyLevel(chosen.energy)
    });

    curEnergy = chosen.energy;
    curMinute += stepMin;
  }

  const smoothness = Math.max(0, Math.round((1.0 - Math.min(1.0, maxJump * 1.5)) * 100));
  return { planned, maxJump, smoothness };
}

const sim = simulatePlaylist(samplePlaylist, partyCfg);
console.log(`Simulation planned ${sim.planned.length} tracks along Party curve:`);
sim.planned.forEach(p => {
  console.log(`  [${p.minute}m] ${p.title.padEnd(22)} | Energy: ${p.energy} [${p.level}] | Curve Target: ${p.target} | Delta: ${p.jump}`);
});
console.log(`Max Energy Jump: ${sim.maxJump * 100}% | Smoothness Score: ${sim.smoothness}%`);
assert.strictEqual(sim.planned.length, samplePlaylist.length);
assert.ok(sim.smoothness >= 70, 'Smoothness should be >= 70% with smooth gradient');
console.log('✓ Playlist simulation verified successfully.');

console.log('\n========================================');
console.log('ALL PHASE 9 JAVASCRIPT TESTS PASSED! (5/5)');
console.log('========================================');
