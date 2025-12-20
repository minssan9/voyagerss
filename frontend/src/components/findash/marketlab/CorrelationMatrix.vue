<template>
  <div class="correlation-section">
    <div class="info-panel">
      <h3>Correlation Matrix (Example)</h3>
      <p class="description">
        Visualizes how assets move in relation to each other using historical data correlations.
      </p>
      
      <div class="legend">
        <div class="legend-item">
          <span class="dot positive"></span>
          <span><strong>Positive (+1):</strong> Moves together</span>
        </div>
        <div class="legend-item">
          <span class="dot negative"></span>
          <span><strong>Negative (-1):</strong> Moves opposite</span>
        </div>
      </div>

      <div class="insight-box">
        <strong>Insight:</strong>
        <p>Typically, a stronger Dollar exerts downward pressure on commodity prices like Gold and Oil, indicating an inverse correlation.</p>
      </div>
    </div>

    <div class="matrix-wrapper">
      <table>
        <thead>
          <tr>
            <th></th>
            <th v-for="h in headers" :key="h">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rIndex) in matrix" :key="rIndex">
            <td class="row-header">{{ headers[rIndex] }}</td>
            <td v-for="(val, cIndex) in row" :key="cIndex" :class="getCellClass(val)">
              {{ val.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const headers = ['Gold', 'S&P 500', 'USD', 'Oil'];
const matrix = [
  [1.00, 0.25, -0.45, 0.30], // Gold row
  [0.25, 1.00, -0.15, 0.40], // S&P row
  [-0.45, -0.15, 1.00, -0.35], // USD row
  [0.30, 0.40, -0.35, 1.00]  // Oil row
];

function getCellClass(val: number) {
  if (val === 1) return 'identity';
  if (val > 0.5) return 'high-pos';
  if (val > 0) return 'low-pos';
  if (val < -0.3) return 'high-neg';
  return 'low-neg';
}
</script>

<style lang="scss" scoped>
@import '@/assets/sass/findash/variables';

.correlation-section {
  @include findash-card;
  background: lighten($findash-indigo, 46%); // very light indigo
  border: 1px solid lighten($findash-indigo, 40%);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
}

.info-panel {
  flex: 1;

  h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: $findash-slate-800;
    margin: 0 0 0.5rem;
  }

  .description {
    font-size: 0.875rem;
    color: $findash-slate-600;
    margin-bottom: 1rem;
    line-height: 1.5;
  }
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.legend-item {
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  
  &.positive { background: lighten($findash-rose, 20%); } // using rose as 'hot'/positive corr for this heatmap style to match user request red/blue but kept variable based
  &.negative { background: lighten($findash-primary, 20%); }
}

.insight-box {
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: $findash-slate-500;
  box-shadow: $shadow-sm;
  
  p { margin: 0.25rem 0 0; }
}

.matrix-wrapper {
  flex: 2;
  overflow-x: auto;
  
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    text-align: center;
  }

  th {
    padding: 0.75rem;
    color: $findash-slate-500;
    font-weight: 600;
  }

  td {
    padding: 0.75rem;
    border-radius: 0.375rem;
    font-family: monospace;
    font-weight: 500;
  }

  .row-header {
    text-align: right;
    font-weight: 700;
    color: $findash-slate-700;
    background: transparent !important;
  }

  // Heatmap colors
  .identity { background: rgba($findash-slate-400, 0.1); color: $findash-slate-400; }
  .high-pos { background: rgba($findash-rose, 0.2); color: darken($findash-rose, 20%); }
  .low-pos { background: rgba($findash-rose, 0.1); color: darken($findash-rose, 10%); }
  .high-neg { background: rgba($findash-primary, 0.2); color: darken($findash-primary, 20%); }
  .low-neg { background: rgba($findash-primary, 0.1); color: darken($findash-primary, 10%); }
}
</style>
