<template>
  <q-page class="modern-page page-container">
    <div class="modern-bg__pattern absolute-full"></div>

    <!-- Hero Section -->
    <div class="modern-page__header fade-in">
      <div class="row justify-center items-center q-py-xl q-px-md">
        <div class="col-12 col-md-10 text-center">
          <h1 class="modern-text__title q-mb-md text-h2 text-weight-bold">
            VoyagerSS Platform
          </h1>
          <p class="modern-text__subtitle q-mb-xl text-h5">
            Your All-in-One Solution for Investment Analysis, Schedule Management, and Aviation Data
          </p>
          <div class="text-body1 text-grey-7 q-mb-xl">
            Explore our comprehensive suite of applications designed to streamline your professional workflow
          </div>
        </div>
      </div>
    </div>

    <!-- Applications Grid -->
    <div class="modern-page__content q-pt-xl q-px-md">
      <div class="row q-col-gutter-xl justify-center">
        <!-- Investand Application Card -->
        <div class="col-12 col-md-4">
          <div class="modern-card slide-up stagger-1 app-card" style="height: 100%;">
            <div class="modern-card__header app-card__header investand-gradient">
              <q-icon name="show_chart" size="64px" class="q-mb-md" />
              <h2 class="modern-text__title text-h4 q-mb-md">Investand</h2>
              <div class="text-subtitle1">Financial Intelligence Platform</div>
            </div>
            <div class="modern-card__body q-pa-lg">
              <p class="text-body1 q-mb-lg">
                Advanced investment analysis platform with real-time market data, DART integration,
                and AI-powered insights for smarter financial decisions.
              </p>

              <q-list dense class="q-mb-lg">
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="analytics" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Market Lab & Analysis</q-item-label>
                    <q-item-label caption>Real-time market insights</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="description" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>DART Data Integration</q-item-label>
                    <q-item-label caption>Korean corporate disclosures</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="primary" name="psychology" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Fear & Greed Index</q-item-label>
                    <q-item-label caption>Market sentiment analysis</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="row q-col-gutter-sm">
                <div class="col-12">
                  <q-btn
                    class="modern-button full-width"
                    label="Launch Investand"
                    icon-right="arrow_forward"
                    :to="{ name: 'investand-landing' }"
                    no-caps
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- WorkSchd Application Card -->
        <div class="col-12 col-md-4">
          <div class="modern-card slide-up stagger-2 app-card" style="height: 100%;">
            <div class="modern-card__header app-card__header workschd-gradient">
              <q-icon name="schedule" size="64px" class="q-mb-md" />
              <h2 class="modern-text__title text-h4 q-mb-md">WorkSchd</h2>
              <div class="text-subtitle1">Work Schedule Automation</div>
            </div>
            <div class="modern-card__body q-pa-lg">
              <p class="text-body1 q-mb-lg">
                Intelligent work schedule management system that automates team scheduling,
                task assignment, and attendance tracking for optimal productivity.
              </p>

              <q-list dense class="q-mb-lg">
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="accent" name="auto_awesome" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Automated Scheduling</q-item-label>
                    <q-item-label caption>AI-powered schedule generation</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="accent" name="groups" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Team Management</q-item-label>
                    <q-item-label caption>Collaborative workspace</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="accent" name="task_alt" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Task Tracking</q-item-label>
                    <q-item-label caption>Real-time progress monitoring</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="row q-col-gutter-sm">
                <div class="col-12">
                  <q-btn
                    class="modern-button modern-button--secondary full-width"
                    label="Launch WorkSchd"
                    icon-right="arrow_forward"
                    :to="{ name: 'workschd-home' }"
                    no-caps
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Aviation Application Card -->
        <div class="col-12 col-md-4">
          <div class="modern-card slide-up stagger-3 app-card" style="height: 100%;">
            <div class="modern-card__header app-card__header aviation-gradient">
              <q-icon name="flight" size="64px" class="q-mb-md" />
              <h2 class="modern-text__title text-h4 q-mb-md">Aviation</h2>
              <div class="text-subtitle1">Aviation Data Management</div>
            </div>
            <div class="modern-card__body q-pa-lg">
              <p class="text-body1 q-mb-lg">
                Comprehensive aviation data platform providing weather information,
                topic management, and secure backup solutions for aviation professionals.
              </p>

              <q-list dense class="q-mb-lg">
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="info" name="wb_cloudy" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Weather Data</q-item-label>
                    <q-item-label caption>Real-time aviation weather</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="info" name="topic" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Topics Management</q-item-label>
                    <q-item-label caption>Organized information hub</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon color="info" name="backup" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Secure Backups</q-item-label>
                    <q-item-label caption>Data protection & recovery</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="row q-col-gutter-sm">
                <div class="col-12">
                  <q-btn
                    class="modern-button modern-button--tertiary full-width"
                    label="Launch Aviation"
                    icon-right="arrow_forward"
                    :to="{ name: 'aviation-dashboard' }"
                    no-caps
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform Features Section -->
      <div class="row justify-center q-mt-xl q-py-xl">
        <div class="col-12 col-md-10">
          <div class="modern-bg__glass q-pa-xl" style="border-radius: 24px;">
            <h2 class="modern-text__title text-center q-mb-lg text-h4">Why Choose VoyagerSS?</h2>

            <div class="row q-col-gutter-lg q-mt-md">
              <div class="col-12 col-md-4 text-center">
                <q-icon name="security" size="48px" color="primary" class="q-mb-md" />
                <h5 class="text-weight-bold q-mb-sm">Secure & Reliable</h5>
                <p class="text-body2">Enterprise-grade security with encrypted data storage and reliable uptime</p>
              </div>
              <div class="col-12 col-md-4 text-center">
                <q-icon name="speed" size="48px" color="accent" class="q-mb-md" />
                <h5 class="text-weight-bold q-mb-sm">Fast & Efficient</h5>
                <p class="text-body2">Optimized performance for real-time data processing and analysis</p>
              </div>
              <div class="col-12 col-md-4 text-center">
                <q-icon name="devices" size="48px" color="info" class="q-mb-md" />
                <h5 class="text-weight-bold q-mb-sm">Multi-Platform</h5>
                <p class="text-body2">Access from any device - desktop, tablet, or mobile with responsive design</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="modern-page__footer q-mt-xl">
      <div class="row justify-center">
        <div class="col-12 col-md-10">
          <q-separator dark class="q-mb-lg" />
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <h5 class="text-weight-bold q-mb-sm">VoyagerSS Platform</h5>
              <p class="text-caption">
                Empowering professionals with integrated solutions for investment analysis,
                schedule management, and aviation data.
              </p>
            </div>
            <div class="col-12 col-md-3">
              <h6 class="text-weight-bold q-mb-sm">Applications</h6>
              <q-list dense>
                <q-item clickable :to="{ name: 'investand-landing' }">
                  <q-item-section>Investand</q-item-section>
                </q-item>
                <q-item clickable :to="{ name: 'workschd-home' }">
                  <q-item-section>WorkSchd</q-item-section>
                </q-item>
                <q-item clickable :to="{ name: 'aviation-dashboard' }">
                  <q-item-section>Aviation</q-item-section>
                </q-item>
              </q-list>
            </div>
            <div class="col-12 col-md-3">
              <h6 class="text-weight-bold q-mb-sm">Resources</h6>
              <q-list dense>
                <q-item clickable>
                  <q-item-section>Documentation</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Support</q-item-section>
                </q-item>
                <q-item clickable>
                  <q-item-section>Privacy Policy</q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
          <div class="row q-mt-lg">
            <div class="col-12 text-center">
              <p class="text-caption q-mb-none">© 2024 VoyagerSS Platform. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
// No additional logic needed for static landing page
</script>

<style scoped lang="scss">
.app-card {
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }

  &__header {
    padding: 2rem;
    text-align: center;
    color: white;
    border-radius: 16px 16px 0 0;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
}

.investand-gradient {
  background: linear-gradient(145deg, #4361ee, #3a0ca3);
}

.workschd-gradient {
  background: linear-gradient(145deg, #4cc9f0, #4361ee);
}

.aviation-gradient {
  background: linear-gradient(145deg, #06d6a0, #118ab2);
}

.modern-button {
  &--secondary {
    background: linear-gradient(145deg, #4cc9f0, #4361ee);
  }

  &--tertiary {
    background: linear-gradient(145deg, #06d6a0, #118ab2);
  }
}

// Animation stagger delays
.stagger-1 {
  animation-delay: 0.1s;
}

.stagger-2 {
  animation-delay: 0.2s;
}

.stagger-3 {
  animation-delay: 0.3s;
}
</style>