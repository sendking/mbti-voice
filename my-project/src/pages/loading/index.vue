<script lang="ts" setup>
import {
  analyzeVoiceByRecording,
  getLatestVoiceRecording,
  saveLatestVoiceAnalysisResult,
} from '@/service/voice'

definePage({
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f8fafc',
  },
})

const facts = [
  '你知道吗？逻辑型（T）在表达观点时，停顿往往更具节奏感。',
  '高情感识别度的声音，通常在尾音处更柔和。',
  '外向者（E）在兴奋表达中，音域跨度通常更明显。',
]

const stages = ['提取声纹特征中...', '匹配人格模型中...', '生成个性报告中...']
const personalities = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']

const codeIndex = ref(0)
const factIndex = ref(0)
const progress = ref(0)
const stageText = ref(stages[0])

const isFailed = ref(false)
const errorMessage = ref('')
const isRedirecting = ref(false)

let codeTimer: ReturnType<typeof setInterval> | null = null
let factTimer: ReturnType<typeof setInterval> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null

const activeCode = computed(() => personalities[codeIndex.value])
const activeFact = computed(() => facts[factIndex.value])

function getIconStyle(idx: number) {
  const radius = 172
  const center = 200
  const angle = (Math.PI * 2 / personalities.length) * idx - Math.PI / 2
  const left = center + radius * Math.cos(angle)
  const top = center + radius * Math.sin(angle)

  return {
    left: `${left}rpx`,
    top: `${top}rpx`,
    animationDelay: `${idx * 120}ms`,
  }
}

function updateStage() {
  if (progress.value < 36) {
    stageText.value = stages[0]
    return
  }

  if (progress.value < 72) {
    stageText.value = stages[1]
    return
  }

  stageText.value = stages[2]
}

function setFailedState(message: string) {
  isFailed.value = true
  errorMessage.value = message
  stageText.value = '分析失败，请重试'
}

function resetFailedState() {
  isFailed.value = false
  errorMessage.value = ''
  stageText.value = stages[0]
}

function startVisualLoops() {
  stopVisualLoops()

  codeTimer = setInterval(() => {
    codeIndex.value = (codeIndex.value + 1) % personalities.length
  }, 130)

  factTimer = setInterval(() => {
    factIndex.value = (factIndex.value + 1) % facts.length
  }, 2600)

  progressTimer = setInterval(() => {
    if (isFailed.value || isRedirecting.value) {
      return
    }

    if (progress.value < 92) {
      progress.value += 2
      updateStage()
    }
  }, 120)
}

function stopVisualLoops() {
  if (codeTimer) {
    clearInterval(codeTimer)
    codeTimer = null
  }

  if (factTimer) {
    clearInterval(factTimer)
    factTimer = null
  }

  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function completeAndJump(reportId: string) {
  isRedirecting.value = true
  progress.value = 100
  stageText.value = '分析完成，正在生成报告...'

  setTimeout(() => {
    uni.redirectTo({
      url: `/pages/result/index?reportId=${encodeURIComponent(reportId)}`,
    })
  }, 300)
}

async function runAnalysis() {
  resetFailedState()

  const recording = getLatestVoiceRecording()
  if (!recording?.tempFilePath) {
    setFailedState('未找到录音文件，请返回录音页重新采样')
    return
  }

  try {
    const result = await analyzeVoiceByRecording({
      tempFilePath: recording.tempFilePath,
      duration: recording.duration,
      fileSize: recording.fileSize,
    })

    saveLatestVoiceAnalysisResult(result)
    completeAndJump(result.reportId)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '网络异常，暂时无法完成分析'
    setFailedState(message)
  }
}

function retryAnalysis() {
  progress.value = 16
  updateStage()
  runAnalysis()
}

function backToRecord() {
  uni.navigateBack()
}

onMounted(() => {
  progress.value = 16
  startVisualLoops()
  runAnalysis()
})

onUnmounted(() => {
  stopVisualLoops()
})
</script>

<template>
  <view class="loading-page">
    <text class="title">
      正在解析你的声纹
    </text>

    <view class="scanner-zone">
      <view class="hexagon" />
      <view class="hexagon inner" />

      <view class="active-code">
        {{ activeCode }}
      </view>

      <view
        v-for="(item, idx) in personalities"
        :key="item"
        class="persona-dot"
        :style="getIconStyle(idx)"
      >
        {{ item.slice(0, 2) }}
      </view>
    </view>

    <text class="stage-text">
      {{ stageText }}
    </text>

    <view class="progress-track">
      <view class="progress-fill" :style="{ width: `${progress}%` }" />
    </view>

    <view class="fact-card">
      <text class="fact-tag">
        人格百科
      </text>
      <text class="fact-text">
        {{ activeFact }}
      </text>
    </view>

    <view v-if="isFailed" class="error-card">
      <text class="error-message">
        {{ errorMessage }}
      </text>

      <view class="error-actions">
        <button class="error-btn retry" @click="retryAnalysis">
          重试分析
        </button>
        <button class="error-btn" @click="backToRecord">
          返回录音页
        </button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.loading-page {
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 68rpx) 38rpx calc(env(safe-area-inset-bottom) + 56rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  background:
    radial-gradient(circle at 16% 12%, rgba(136, 97, 154, 0.14), transparent 30%),
    radial-gradient(circle at 84% 78%, rgba(66, 152, 180, 0.14), transparent 32%), #f8fafc;
}

.title {
  font-size: 40rpx;
  color: #1f2a3c;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.scanner-zone {
  position: relative;
  margin-top: 56rpx;
  width: 400rpx;
  height: 400rpx;
}

.hexagon {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 250rpx;
  height: 216rpx;
  transform: translate(-50%, -50%);
  clip-path: polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%);
  border: 2rpx solid rgba(66, 152, 180, 0.5);
  background: rgba(255, 255, 255, 0.56);
  animation: rotateSlow 7s linear infinite;
}

.hexagon.inner {
  width: 186rpx;
  height: 162rpx;
  border-color: rgba(136, 97, 154, 0.52);
  animation-direction: reverse;
}

.active-code {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 54rpx;
  color: #273249;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.persona-dot {
  position: absolute;
  width: 58rpx;
  height: 58rpx;
  margin-left: -29rpx;
  margin-top: -29rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #fff;
  background: linear-gradient(140deg, #33a474, #4298b4);
  box-shadow: 0 8rpx 16rpx rgba(68, 104, 153, 0.22);
  animation: flicker 1.6s ease-in-out infinite;
}

.stage-text {
  margin-top: 30rpx;
  font-size: 28rpx;
  color: #5a6c8a;
}

.progress-track {
  margin-top: 16rpx;
  width: 82%;
  height: 10rpx;
  border-radius: 999px;
  background: rgba(153, 172, 204, 0.3);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #88619a 0%, #4298b4 44%, #33a474 100%);
  transition: width 160ms linear;
}

.fact-card {
  margin-top: auto;
  width: 100%;
  border-radius: var(--mbti-card-radius);
  padding: 22rpx 24rpx;
  background: linear-gradient(145deg, #edf6ff, #f4f9ff);
  border: 1px solid rgba(121, 163, 218, 0.28);
}

.fact-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 44rpx;
  padding: 0 16rpx;
  border-radius: 22rpx;
  color: #4298b4;
  font-size: 24rpx;
  background: rgba(66, 152, 180, 0.14);
}

.fact-text {
  margin-top: 12rpx;
  display: block;
  font-size: 27rpx;
  line-height: 1.6;
  color: #3f5375;
}

.error-card {
  margin-top: 14rpx;
  width: 100%;
  border-radius: 26rpx;
  padding: 18rpx;
  border: 1px solid rgba(244, 126, 126, 0.3);
  background: rgba(255, 244, 244, 0.94);
}

.error-message {
  display: block;
  color: #9f3f3f;
  font-size: 24rpx;
  line-height: 1.5;
}

.error-actions {
  margin-top: 14rpx;
  display: flex;
  gap: 14rpx;
}

.error-btn {
  flex: 1;
  height: 70rpx;
  padding: 0;
  border-radius: 35rpx;
  border: 1px solid rgba(118, 143, 183, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  color: #526684;
  font-size: 24rpx;
  background: #fff;
}

.error-btn::after {
  border: 0;
}

.error-btn.retry {
  border: 0;
  color: #fff;
  background: linear-gradient(100deg, #88619a, #4298b4 56%, #33a474);
}

@keyframes flicker {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.92);
  }

  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}

@keyframes rotateSlow {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
</style>
