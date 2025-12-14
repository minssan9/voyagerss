<template>
  <q-page class="q-pa-md">
    <div class="row">
      <div class="col-12">
        <div class="text-h4 q-mb-md">
          ℹ️ About investand
        </div>
        <div class="text-subtitle1 text-grey-7 q-mb-xl">
          한국 주식시장 투자자 심리 지수에 대한 정보
        </div>
      </div>
    </div>

    <!-- What is Fear & Greed Index -->
    <div class="row q-mb-xl">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h5 q-mb-md">Fear & Greed Index란?</div>
            <div class="text-body1 q-mb-md">
              Fear & Greed Index는 투자자들의 감정을 수치화한 지표로, 시장의 탐욕과 공포를 0부터 100까지의 척도로 나타냅니다.
              이 지수는 CNN이 처음 개발했으며, 한국 주식시장에 맞게 조정된 버전입니다.
            </div>
            <div class="text-body1">
              지수가 낮을수록 투자자들이 두려워하고 있음을 의미하며, 이는 종종 매수 기회로 해석됩니다.
              반대로 지수가 높을수록 탐욕이 지배적이며, 이는 조심스러운 접근이 필요한 시점을 나타냅니다.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Index Levels -->
    <div class="row q-mb-xl">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h5 q-mb-md">지수 레벨</div>
            <div class="row q-gutter-md">
              <div class="col-12 col-md-2">
                <q-card class="level-card extreme-fear">
                  <q-card-section class="text-center">
                    <div class="text-h6 text-white">0-24</div>
                    <div class="text-subtitle2 text-white">Extreme Fear</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-2">
                <q-card class="level-card fear">
                  <q-card-section class="text-center">
                    <div class="text-h6 text-white">25-44</div>
                    <div class="text-subtitle2 text-white">Fear</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-2">
                <q-card class="level-card neutral">
                  <q-card-section class="text-center">
                    <div class="text-h6 text-grey-8">45-54</div>
                    <div class="text-subtitle2 text-grey-8">Neutral</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-2">
                <q-card class="level-card greed">
                  <q-card-section class="text-center">
                    <div class="text-h6 text-white">55-74</div>
                    <div class="text-subtitle2 text-white">Greed</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-2">
                <q-card class="level-card extreme-greed">
                  <q-card-section class="text-center">
                    <div class="text-h6 text-white">75-100</div>
                    <div class="text-subtitle2 text-white">Extreme Greed</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Components -->
    <div class="row q-mb-xl">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h5 q-mb-md">구성 요소</div>
            <q-list>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="trending_up" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">주가 모멘텀</q-item-label>
                  <q-item-label caption>
                    KOSPI 지수의 단기 및 중기 가격 움직임을 분석하여 시장의 추세를 파악합니다.
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="psychology" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">투자자 심리</q-item-label>
                  <q-item-label caption>
                    뉴스 감정 분석, 소셜 미디어 분석 등을 통해 투자자들의 전반적인 심리 상태를 측정합니다.
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="balance" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">풋/콜 비율</q-item-label>
                  <q-item-label caption>
                    풋옵션과 콜옵션의 거래량 비율을 통해 투자자들의 방향성 베팅을 분석합니다.
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="show_chart" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">변동성 지수</q-item-label>
                  <q-item-label caption>
                    KOSPI200 옵션의 내재 변동성을 통해 시장의 불확실성 정도를 측정합니다.
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="security" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">안전자산 수요</q-item-label>
                  <q-item-label caption>
                    국채, 금 등 안전자산에 대한 수요 변화를 통해 위험 회피 성향을 분석합니다.
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Technical Information -->
    <div class="row q-gutter-md">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">기술 스택</div>
            <q-list>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="code" color="positive" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Frontend</q-item-label>
                  <q-item-label caption>Vue 3, Quasar Framework, TypeScript</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="storage" color="info" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Backend</q-item-label>
                  <q-item-label caption>Node.js, Express, TypeScript</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="analytics" color="warning" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Data Analysis</q-item-label>
                  <q-item-label caption>Python, Pandas, NumPy</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">면책 조항</div>
            <div class="text-body2 q-mb-md">
              이 정보는 교육 및 참고 목적으로만 제공됩니다. 투자 결정을 내리기 전에 전문가와 상담하시기 바랍니다.
            </div>
            <div class="text-body2 q-mb-md">
              시장 데이터는 지연될 수 있으며, 실시간 거래에는 적합하지 않을 수 있습니다.
            </div>
            <div class="text-body2">
              투자에는 항상 위험이 따르며, 과거 성과가 미래 수익을 보장하지 않습니다.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
// No reactive data needed for this static page
</script>

<style lang="scss" scoped>
.level-card {
  border-radius: 8px;
  min-height: 80px;
  
  &.extreme-fear {
    background: linear-gradient(135deg, #c62828, #d32f2f);
  }
  
  &.fear {
    background: linear-gradient(135deg, #ef6c00, #f57c00);
  }
  
  &.neutral {
    background: linear-gradient(135deg, #fbc02d, #fdd835);
  }
  
  &.greed {
    background: linear-gradient(135deg, #689f38, #7cb342);
  }
  
  &.extreme-greed {
    background: linear-gradient(135deg, #388e3c, #43a047);
  }
}

@media (max-width: 768px) {
  .level-card {
    min-height: 60px;
  }
}
</style> 