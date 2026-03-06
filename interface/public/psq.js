/**
 * psq.js — PSQ (Psychoemotional Safety Quotient) visualization for the
 * psychology interface.
 *
 * Exports:
 *   renderPSQRadar(canvas, scores)    — draws a radar/spider chart on a canvas
 *   renderPSQScoreRows(container, scores) — renders score bars in a container div
 *
 * `scores` is the machine-response/v3 scores object:
 *   { DA: number, AD: number, CO: number, ... } (values 0–1)
 *
 * Dimension labels and display order follow the PSQ 10-dimension spec.
 */

// PSQ dimension display names in canonical order.
// Short code → full label mapping used in both radar and score rows.
const PSQ_DIMENSIONS = [
  { code: "DA", label: "Distress & Anxiety" },
  { code: "AD", label: "Agency & Disempowerment" },
  { code: "CO", label: "Conflict & Hostility" },
  { code: "DE", label: "Dismissiveness" },
  { code: "HC", label: "Hopelessness & Catastrophizing" },
  { code: "IM", label: "Impulsivity & Self-Harm" },
  { code: "IS", label: "Isolation & Disconnection" },
  { code: "NE", label: "Negative Self-Evaluation" },
  { code: "RE", label: "Rumination & Entrapment" },
  { code: "SH", label: "Shame & Stigma" },
];

// Score color: green (low risk) → amber (moderate) → red (high risk)
function scoreColor(value) {
  if (value < 0.35) return "#3fb950"; // green
  if (value < 0.65) return "#e3b341"; // amber
  return "#f85149";                   // red
}

// ── Radar chart ─────────────────────────────────────────────────────────────

/**
 * Draw a radar chart on `canvas` for the given `scores` object.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} scores — { DA: 0.3, AD: 0.5, ... }
 */
export function renderPSQRadar(canvas, scores) {
  const context = canvas.getContext("2d");
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const radarRadius = Math.min(centerX, centerY) - 32;
  const dimensionCount = PSQ_DIMENSIONS.length;

  context.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw grid rings (5 rings at 0.2 intervals)
  const gridRingCount = 5;
  context.strokeStyle = "#30363d";
  context.lineWidth = 1;
  for (let ringIndex = 1; ringIndex <= gridRingCount; ringIndex++) {
    const ringRadius = (radarRadius * ringIndex) / gridRingCount;
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

  // Draw axis spokes
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

  // Draw dimension labels
  context.fillStyle = "#8b949e";
  context.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const labelOffset = radarRadius + 16;
  for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
    const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
    const labelX = centerX + labelOffset * Math.cos(angle);
    const labelY = centerY + labelOffset * Math.sin(angle);
    context.fillText(PSQ_DIMENSIONS[dimensionIndex].code, labelX, labelY);
  }

  // Draw score polygon
  const scoreValues = PSQ_DIMENSIONS.map(({ code }) => scores[code] ?? 0);
  context.beginPath();
  for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
    const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
    const polygonRadius = radarRadius * scoreValues[dimensionIndex];
    const pointX = centerX + polygonRadius * Math.cos(angle);
    const pointY = centerY + polygonRadius * Math.sin(angle);
    if (dimensionIndex === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();

  // Fill polygon with a semi-transparent accent color
  context.fillStyle = "rgba(88, 166, 255, 0.15)";
  context.fill();
  context.strokeStyle = "#58a6ff";
  context.lineWidth = 2;
  context.stroke();

  // Draw score dots at each vertex
  for (let dimensionIndex = 0; dimensionIndex < dimensionCount; dimensionIndex++) {
    const angle = (2 * Math.PI * dimensionIndex) / dimensionCount - Math.PI / 2;
    const dotRadius = radarRadius * scoreValues[dimensionIndex];
    const dotX = centerX + dotRadius * Math.cos(angle);
    const dotY = centerY + dotRadius * Math.sin(angle);
    context.beginPath();
    context.arc(dotX, dotY, 3, 0, 2 * Math.PI);
    context.fillStyle = scoreColor(scoreValues[dimensionIndex]);
    context.fill();
  }
}

// ── Score rows ───────────────────────────────────────────────────────────────

/**
 * Render labeled progress bars for each PSQ dimension into `container`.
 *
 * @param {HTMLElement} container
 * @param {Object} scores — { DA: 0.3, ... }
 */
export function renderPSQScoreRows(container, scores) {
  container.innerHTML = "";

  for (const { code, label } of PSQ_DIMENSIONS) {
    const score = scores[code] ?? 0;
    const percentage = (score * 100).toFixed(0);

    const rowElement = document.createElement("div");
    rowElement.classList.add("psq-score-row");

    const labelElement = document.createElement("div");
    labelElement.classList.add("psq-score-label");
    labelElement.innerHTML = `<span>${label}</span><span>${percentage}%</span>`;

    const trackElement = document.createElement("div");
    trackElement.classList.add("psq-score-bar-track");

    const fillElement = document.createElement("div");
    fillElement.classList.add("psq-score-bar-fill");
    fillElement.style.width = `${percentage}%`;
    fillElement.style.background = scoreColor(score);

    trackElement.appendChild(fillElement);
    rowElement.appendChild(labelElement);
    rowElement.appendChild(trackElement);
    container.appendChild(rowElement);
  }
}
