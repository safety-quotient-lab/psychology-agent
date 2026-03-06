/**
 * psq.js — PSQ (Psychoemotional Safety Quotient) visualization.
 *
 * Exports:
 *   renderPSQPanel(canvas, scoresTable, hierarchyContainer, v3Response)
 *     — renders radar chart, score rows, and hierarchy from a full
 *       machine-response/v3 object.
 *
 * machine-response/v3 shape (interagent sync psq-endpoint-001.json, 2026-03-06):
 *   {
 *     scores: { composite: number, calibration_applied: bool, calibration_version: string },
 *     dimensions: [{ dimension: string, score: number (0–10), raw_score: number,
 *                    confidence: number, meets_threshold: bool, psq_lite_mapped: bool }],
 *     hierarchy: { factors_2, factors_3, factors_5, g_psq }  ← extension field
 *     limitations: [...]
 *   }
 *
 * Dimension display order and abbreviated radar labels follow the PSQ-10 spec.
 * Radar normalizes scores from 0–10 to 0–1.
 */

// PSQ-10 dimensions in display order.
// `key` matches the `dimension` field in machine-response/v3 dimensions[].
// `radar_label` is the abbreviated label shown on the radar axes.
const PSQ_DIMENSIONS = [
  { key: "threat_exposure",       radar_label: "Threat",    label: "Threat Exposure" },
  { key: "hostility_index",       radar_label: "Hostile",   label: "Hostility Index" },
  { key: "trust_conditions",      radar_label: "Trust",     label: "Trust Conditions" },
  { key: "energy_dissipation",    radar_label: "Energy",    label: "Energy Dissipation" },
  { key: "cooling_capacity",      radar_label: "Cooling",   label: "Cooling Capacity" },
  { key: "resilience_baseline",   radar_label: "Resil.",    label: "Resilience Baseline" },
  { key: "defensive_architecture",radar_label: "Defense",   label: "Defensive Architecture" },
  { key: "regulatory_capacity",   radar_label: "Regulate",  label: "Regulatory Capacity" },
  { key: "contractual_clarity",   radar_label: "Contract",  label: "Contractual Clarity" },
  { key: "authority_dynamics",    radar_label: "Authority", label: "Authority Dynamics" },
];

// Score color (input: 0–10 scale)
function scoreColor(score10) {
  const normalized = score10 / 10;
  if (normalized < 0.35) return "#3fb950"; // green — low concern
  if (normalized < 0.65) return "#e3b341"; // amber — moderate
  return "#f85149";                        // red — high concern
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Render PSQ panel from a full machine-response/v3 object.
 *
 * @param {HTMLCanvasElement}  radarCanvas
 * @param {HTMLElement}        scoresTableContainer
 * @param {HTMLElement|null}   hierarchyContainer — null to skip hierarchy display
 * @param {Object}             v3Response — full machine-response/v3 object
 */
export function renderPSQPanel(radarCanvas, scoresTableContainer, hierarchyContainer, v3Response) {
  if (!v3Response?.dimensions?.length) return;

  // Build a lookup map from dimension key → dimension data
  const dimensionMap = Object.fromEntries(
    v3Response.dimensions.map(dimensionData => [dimensionData.dimension, dimensionData])
  );

  renderPSQRadar(radarCanvas, dimensionMap);
  renderPSQScoreRows(scoresTableContainer, dimensionMap);

  if (hierarchyContainer && v3Response.hierarchy) {
    renderHierarchy(hierarchyContainer, v3Response.hierarchy, v3Response.scores?.composite);
  }
}

// ── Radar chart ───────────────────────────────────────────────────────────────

function renderPSQRadar(canvas, dimensionMap) {
  const context = canvas.getContext("2d");
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const radarRadius = Math.min(centerX, centerY) - 32;
  const dimensionCount = PSQ_DIMENSIONS.length;

  context.clearRect(0, 0, canvasWidth, canvasHeight);

  // Grid rings (5 rings at 20% intervals)
  context.lineWidth = 1;
  for (let ringIndex = 1; ringIndex <= 5; ringIndex++) {
    const ringRadius = (radarRadius * ringIndex) / 5;
    context.strokeStyle = ringIndex === 5 ? "#444c56" : "#30363d";
    context.beginPath();
    for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
      const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
      const pointX = centerX + ringRadius * Math.cos(angle);
      const pointY = centerY + ringRadius * Math.sin(angle);
      if (dimensionIndex === 0) context.moveTo(pointX, pointY);
      else context.lineTo(pointX, pointY);
    }
    context.closePath();
    context.stroke();
  }

  // Axis spokes
  context.strokeStyle = "#30363d";
  for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
    const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(
      centerX + radarRadius * Math.cos(angle),
      centerY + radarRadius * Math.sin(angle)
    );
    context.stroke();
  }

  // Radar labels
  context.fillStyle = "#8b949e";
  context.font = "9px -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const labelOffset = radarRadius + 18;
  for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
    const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
    const labelX = centerX + labelOffset * Math.cos(angle);
    const labelY = centerY + labelOffset * Math.sin(angle);
    context.fillText(PSQ_DIMENSIONS[dimensionIndex].radar_label, labelX, labelY);
  }

  // Score polygon — normalized to 0–1
  const normalizedScores = PSQ_DIMENSIONS.map(({ key }) => {
    const dimensionData = dimensionMap[key];
    return dimensionData ? (dimensionData.score ?? 0) / 10 : 0;
  });

  context.beginPath();
  for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
    const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
    const polygonRadius = radarRadius * normalizedScores[dimensionIndex];
    const pointX = centerX + polygonRadius * Math.cos(angle);
    const pointY = centerY + polygonRadius * Math.sin(angle);
    if (dimensionIndex === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();
  context.fillStyle = "rgba(88, 166, 255, 0.12)";
  context.fill();
  context.strokeStyle = "#58a6ff";
  context.lineWidth = 1.5;
  context.stroke();

  // Score dots — color-coded, hollow if below threshold
  for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
    const { key } = PSQ_DIMENSIONS[dimensionIndex];
    const dimensionData = dimensionMap[key];
    const score10 = dimensionData?.score ?? 0;
    const meetsThreshold = dimensionData?.meets_threshold ?? false;
    const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
    const dotRadius = radarRadius * (score10 / 10);
    const dotX = centerX + dotRadius * Math.cos(angle);
    const dotY = centerY + dotRadius * Math.sin(angle);

    context.beginPath();
    context.arc(dotX, dotY, 3.5, 0, 2 * Math.PI);
    if (meetsThreshold) {
      context.fillStyle = scoreColor(score10);
      context.fill();
    } else {
      // Hollow dot for dimensions below confidence threshold
      context.strokeStyle = scoreColor(score10);
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = "rgba(0,0,0,0.3)";
      context.fill();
    }
  }
}

// ── Score rows ────────────────────────────────────────────────────────────────

function renderPSQScoreRows(container, dimensionMap) {
  container.innerHTML = "";

  for (const { key, label } of PSQ_DIMENSIONS) {
    const dimensionData = dimensionMap[key];
    const score10 = dimensionData?.score ?? 0;
    const rawScore10 = dimensionData?.raw_score ?? null;
    const meetsThreshold = dimensionData?.meets_threshold ?? false;
    const percentage = ((score10 / 10) * 100).toFixed(0);

    const rowElement = document.createElement("div");
    rowElement.classList.add("psq-score-row");
    if (!meetsThreshold) rowElement.classList.add("below-threshold");

    // Label row: dimension name + score value
    const labelElement = document.createElement("div");
    labelElement.classList.add("psq-score-label");

    const dimensionNameSpan = document.createElement("span");
    dimensionNameSpan.textContent = label;
    if (!meetsThreshold) dimensionNameSpan.title = "Below confidence threshold — score less reliable";

    const scoreValueSpan = document.createElement("span");
    scoreValueSpan.classList.add("psq-score-value");

    // Show calibrated score; add raw_score tooltip if calibration artifact present
    const calibratedDisplay = score10.toFixed(1);
    scoreValueSpan.textContent = `${calibratedDisplay}/10`;
    if (rawScore10 !== null && Math.abs(rawScore10 - score10) > 0.5) {
      scoreValueSpan.title = `Raw: ${rawScore10.toFixed(2)} → Calibrated: ${calibratedDisplay} (calibration artifact)`;
      scoreValueSpan.classList.add("has-artifact");
    }

    labelElement.appendChild(dimensionNameSpan);
    labelElement.appendChild(scoreValueSpan);

    // Progress bar
    const trackElement = document.createElement("div");
    trackElement.classList.add("psq-score-bar-track");

    const fillElement = document.createElement("div");
    fillElement.classList.add("psq-score-bar-fill");
    fillElement.style.width = `${percentage}%`;
    fillElement.style.background = meetsThreshold
      ? scoreColor(score10)
      : "rgba(88, 166, 255, 0.3)"; // muted blue for below-threshold

    trackElement.appendChild(fillElement);
    rowElement.appendChild(labelElement);
    rowElement.appendChild(trackElement);
    container.appendChild(rowElement);
  }
}

// ── Hierarchy display ─────────────────────────────────────────────────────────

function renderHierarchy(container, hierarchy, compositePSQ) {
  container.innerHTML = "";

  const hierarchyHeader = document.createElement("h3");
  hierarchyHeader.classList.add("psq-hierarchy-header");
  hierarchyHeader.textContent = "Factor Structure";
  container.appendChild(hierarchyHeader);

  if (compositePSQ != null) {
    const compositeRow = document.createElement("div");
    compositeRow.classList.add("psq-hierarchy-row", "psq-composite-row");
    compositeRow.innerHTML = `<span>g<sub>PSQ</sub> (composite)</span><span>${compositePSQ.toFixed(1)}/100</span>`;
    container.appendChild(compositeRow);
  }

  const factorDisplayNames = {
    factors_2: "2-Factor",
    factors_3: "3-Factor",
    factors_5: "5-Factor",
    g_psq:     "g_PSQ",
  };

  for (const [factorKey, factorValue] of Object.entries(hierarchy)) {
    if (factorKey === "g_psq" && compositePSQ != null) continue; // already shown above
    if (factorValue == null || typeof factorValue !== "object") continue;

    const factorSection = document.createElement("div");
    factorSection.classList.add("psq-hierarchy-section");

    const sectionHeader = document.createElement("div");
    sectionHeader.classList.add("psq-hierarchy-section-label");
    sectionHeader.textContent = factorDisplayNames[factorKey] ?? factorKey;
    factorSection.appendChild(sectionHeader);

    for (const [factorName, factorScore] of Object.entries(factorValue)) {
      const factorRow = document.createElement("div");
      factorRow.classList.add("psq-hierarchy-row");
      const scoreDisplay = typeof factorScore === "number" ? factorScore.toFixed(2) : String(factorScore);
      factorRow.innerHTML = `<span>${factorName}</span><span>${scoreDisplay}</span>`;
      factorSection.appendChild(factorRow);
    }

    container.appendChild(factorSection);
  }
}
