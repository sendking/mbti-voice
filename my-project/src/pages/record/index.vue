<script lang="ts" setup>
import {
  getLatestVoiceRecording,
  saveLatestVoiceRecording,
} from '@/service/voice'

definePage({
  style: {
    navigationBarTitleText: '声音采样',
    navigationBarBackgroundColor: '#0d1628',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0b1322',
  },
})

const prompts = [
  '讲讲你最理想的一天是怎样的？',
  '回忆一次让你最投入、最忘我的时刻。',
  '你做重要决定时，通常先考虑什么？',
  '描述一个让你突然感觉被理解的瞬间。',
]

const maxDuration = 60
const minAnalyzeDuration = 15

const canvasId = 'voice-wave-canvas'
const canvasWidth = 320
const canvasHeight = 120

const isRecording = ref(false)
const isRecorderReady = ref(false)
const elapsed = ref(0)
const tipText = ref('保持自然语速，系统正在捕捉你的声学指纹')

const latestRecording = ref(getLatestVoiceRecording())

let timer: ReturnType<typeof setInterval> | null = null
let waveTimer: ReturnType<typeof setInterval> | null = null
let phase = 0
let recordStartedAt = 0
let pendingAnalyzeAfterStop = false
let stopping = false
let recorderListenersBound = false

let recorderManager: any = null

const elapsedText = computed(() => formatDuration(elapsed.value))
const canAnalyze = computed(() => {
  const hasRecordFile = Boolean(latestRecording.value?.tempFilePath)
  return elapsed.value >= minAnalyzeDuration && (isRecording.value || hasRecordFile)
})

function formatDuration(seconds: number) {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function drawIdleLine() {
  const ctx = uni.createCanvasContext(canvasId)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.setLineWidth(2)
  ctx.setStrokeStyle('rgba(199, 214, 244, 0.52)')
  ctx.beginPath()
  ctx.moveTo(24, canvasHeight / 2)
  ctx.lineTo(canvasWidth - 24, canvasHeight / 2)
  ctx.stroke()
  ctx.draw()
}

function drawActiveWave() {
  const ctx = uni.createCanvasContext(canvasId)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const centerY = canvasHeight / 2
  const intensity = Math.min(1, 0.42 + elapsed.value / maxDuration * 0.68)
  const palette = ['#33a474', '#4298b4', '#88619a']

  palette.forEach((color, lineIndex) => {
    ctx.setStrokeStyle(color)
    ctx.setLineWidth(lineIndex === 1 ? 5 : 3)
    ctx.beginPath()

    for (let x = 0; x <= canvasWidth; x += 6) {
      const waveLength = 34 + lineIndex * 14
      const amplitude = (11 + lineIndex * 9) * intensity
      const jitter = (Math.random() - 0.5) * (3 + lineIndex * 2)
      const y = centerY + Math.sin(x / waveLength + phase + lineIndex * 0.6) * amplitude + jitter

      if (x === 0) {
        ctx.moveTo(x, y)
      }
      else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  })

  ctx.draw()
  phase += 0.28
}

function startWaveLoop() {
  stopWaveLoop()
  waveTimer = setInterval(() => {
    if (isRecording.value) {
      drawActiveWave()
    }
    else {
      drawIdleLine()
    }
  }, 90)
}

function stopWaveLoop() {
  if (waveTimer) {
    clearInterval(waveTimer)
    waveTimer = null
  }
}

function startRecordTimer() {
  stopRecordTimer()
  timer = setInterval(() => {
    const seconds = Math.min(maxDuration, Math.floor((Date.now() - recordStartedAt) / 1000))
    elapsed.value = seconds

    if (seconds >= maxDuration) {
      pendingAnalyzeAfterStop = true
      stopRecording()
    }
  }, 120)
}

function stopRecordTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function bindRecorderListeners() {
  if (!recorderManager || recorderListenersBound) {
    return
  }

  recorderListenersBound = true

  recorderManager.onStart(() => {
    isRecording.value = true
    stopping = false
    recordStartedAt = Date.now()
    elapsed.value = 0
    tipText.value = '语音采集中，尽量放松并保持自然表达...'
    startRecordTimer()
  })

  recorderManager.onStop((res: any) => {
    isRecording.value = false
    stopping = false
    stopRecordTimer()

    const duration = Math.min(maxDuration, Math.max(Math.round((res?.duration ?? 0) / 1000), elapsed.value))
    elapsed.value = duration

    if (res?.tempFilePath) {
      latestRecording.value = {
        tempFilePath: res.tempFilePath,
        duration,
        fileSize: Number(res.fileSize) || 0,
        createdAt: new Date().toISOString(),
      }
      saveLatestVoiceRecording(latestRecording.value)
    }

    tipText.value = '录音已完成，可继续优化或直接分析'

    if (pendingAnalyzeAfterStop) {
      pendingAnalyzeAfterStop = false
      goAnalyze()
    }
  })

  recorderManager.onError((err: any) => {
    isRecording.value = false
    stopping = false
    pendingAnalyzeAfterStop = false
    stopRecordTimer()
    tipText.value = '录音失败，请检查麦克风权限后重试'

    const errMsg = typeof err?.errMsg === 'string' ? err.errMsg : '录音失败'
    uni.showToast({
      title: errMsg,
      icon: 'none',
    })
  })
}

function setupRecorderManager() {
  // #ifdef MP-WEIXIN
  try {
    recorderManager = wx.getRecorderManager()
    bindRecorderListeners()
    isRecorderReady.value = true

    if (latestRecording.value?.duration) {
      elapsed.value = Math.min(maxDuration, latestRecording.value.duration)
      tipText.value = '检测到最近一次录音，可直接开始分析'
    }
  }
  catch {
    isRecorderReady.value = false
    tipText.value = '当前设备不支持录音功能'
  }
  // #endif

  // #ifndef MP-WEIXIN
  isRecorderReady.value = false
  tipText.value = '请在微信小程序环境使用录音分析'
  // #endif
}

function startRecording() {
  if (!isRecorderReady.value || !recorderManager) {
    uni.showToast({
      title: '当前环境暂不支持录音',
      icon: 'none',
    })
    return
  }

  if (isRecording.value) {
    return
  }

  pendingAnalyzeAfterStop = false
  latestRecording.value = null

  try {
    recorderManager.start({
      duration: maxDuration * 1000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3',
      frameSize: 50,
    })
  }
  catch {
    uni.showToast({
      title: '录音启动失败',
      icon: 'none',
    })
  }
}

function stopRecording() {
  if (!isRecording.value || !recorderManager || stopping) {
    return
  }

  stopping = true
  try {
    recorderManager.stop()
  }
  catch {
    stopping = false
  }
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
    return
  }

  startRecording()
}

function goAnalyze() {
  if (!canAnalyze.value) {
    uni.showToast({
      title: `至少录制 ${minAnalyzeDuration} 秒`,
      icon: 'none',
    })
    return
  }

  if (isRecording.value) {
    pendingAnalyzeAfterStop = true
    stopRecording()
    return
  }

  if (!latestRecording.value?.tempFilePath) {
    uni.showToast({
      title: '没有可分析的录音文件',
      icon: 'none',
    })
    return
  }

  uni.navigateTo({
    url: '/pages/loading/index',
  })
}

onMounted(() => {
  setupRecorderManager()
  drawIdleLine()
  startWaveLoop()
})

onUnmounted(() => {
  stopRecordTimer()
  stopWaveLoop()

  if (isRecording.value && recorderManager && !stopping) {
    try {
      recorderManager.stop()
    }
    catch {
      // ignore
    }
  }
})
</script>

<template>
  <view class="record-page">
    <view class="ambient ambient-top" />
    <view class="ambient ambient-bottom" />

    <view class="guide-card">
      <text class="guide-tag">
        引导问题
      </text>
      <swiper class="prompt-swiper" vertical circular autoplay :interval="3000" :duration="560">
        <swiper-item v-for="item in prompts" :key="item">
          <view class="prompt-item">
            {{ item }}
          </view>
        </swiper-item>
      </swiper>
    </view>

    <view class="wave-wrapper">
      <canvas
        :canvas-id="canvasId"
        class="wave-canvas"
        :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
      />
      <text class="wave-subtitle">
        实时声波反馈
      </text>
    </view>

    <view class="control-zone">
      <text class="timer">
        {{ elapsedText }} / 01:00
      </text>

      <button class="record-btn" :class="{ active: isRecording }" @click="toggleRecording">
        <view class="record-icon" :class="{ active: isRecording }" />
      </button>

      <button class="analyze-btn" :class="{ disabled: !canAnalyze }" @click="goAnalyze">
        开始分析
      </button>

      <text class="tip-text">
        {{ tipText }}
      </text>
      <text v-if="!isRecorderReady" class="support-tip">
        当前仅支持微信小程序真机录音
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.record-page {
  position: relative;
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 24rpx) 30rpx calc(env(safe-area-inset-bottom) + 34rpx);
  display: flex;
  flex-direction: column;
  gap: 22rpx;
  background: radial-gradient(circle at 20% 8%, #1b2842 0%, #0f182a 46%, #0b1322 100%);
  overflow: hidden;
}

.ambient {
  position: absolute;
  border-radius: 50%;
  filter: blur(8rpx);
  pointer-events: none;
}

.ambient-top {
  width: 300rpx;
  height: 300rpx;
  right: -120rpx;
  top: 120rpx;
  background: rgba(136, 97, 154, 0.26);
}

.ambient-bottom {
  width: 360rpx;
  height: 360rpx;
  left: -180rpx;
  bottom: 40rpx;
  background: rgba(51, 164, 116, 0.2);
}

.guide-card {
  position: relative;
  z-index: 1;
  border-radius: var(--mbti-card-radius);
  padding: 22rpx 24rpx;
  background: rgba(153, 122, 181, 0.18);
  border: 1px solid rgba(207, 190, 235, 0.24);
  backdrop-filter: blur(10rpx);
}

.guide-tag {
  display: block;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: rgba(231, 223, 255, 0.9);
}

.prompt-swiper {
  margin-top: 10rpx;
  height: 88rpx;
}

.prompt-item {
  font-size: 30rpx;
  color: #f4f8ff;
  line-height: 1.5;
}

.wave-wrapper {
  position: relative;
  z-index: 1;
  flex: 1;
  border-radius: var(--mbti-card-radius);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(170deg, rgba(33, 48, 73, 0.88), rgba(18, 28, 45, 0.9));
  border: 1px solid rgba(168, 188, 224, 0.2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.wave-canvas {
  border-radius: 16rpx;
}

.wave-subtitle {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: rgba(190, 206, 234, 0.74);
  letter-spacing: 2rpx;
}

.control-zone {
  position: relative;
  z-index: 1;
  text-align: center;
}

.timer {
  font-size: 56rpx;
  color: #ecf3ff;
  font-family: var(--mbti-font-number);
  letter-spacing: 2rpx;
}

.record-btn {
  margin-top: 18rpx;
  width: 182rpx;
  height: 182rpx;
  border-radius: 50%;
  border: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  box-shadow:
    0 0 0 10rpx rgba(255, 255, 255, 0.08),
    0 20rpx 48rpx rgba(8, 17, 33, 0.52);
}

.record-btn::after {
  border: 0;
}

.record-btn.active {
  animation: breath 2s ease-in-out infinite;
}

.record-icon {
  width: 74rpx;
  height: 74rpx;
  border-radius: 50%;
  background: linear-gradient(130deg, #ffffff, #dde8ff);
  transition: all 180ms ease;
}

.record-icon.active {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: linear-gradient(130deg, #ff9b7a, #ff5473);
}

.analyze-btn {
  margin-top: 28rpx;
  width: 80%;
  height: 92rpx;
  border: 0;
  padding: 0;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(132deg, #88619a, #4298b4 56%, #33a474);
  box-shadow: 0 16rpx 36rpx rgba(58, 87, 131, 0.42);
}

.analyze-btn::after {
  border: 0;
}

.analyze-btn.disabled {
  opacity: 0.5;
}

.tip-text {
  margin-top: 18rpx;
  display: block;
  font-size: 24rpx;
  color: rgba(213, 225, 247, 0.84);
  line-height: 1.5;
}

.support-tip {
  margin-top: 8rpx;
  display: block;
  font-size: 21rpx;
  color: rgba(173, 191, 223, 0.72);
}

@keyframes breath {
  0%,
  100% {
    box-shadow:
      0 0 0 10rpx rgba(255, 255, 255, 0.08),
      0 20rpx 48rpx rgba(8, 17, 33, 0.52);
  }

  50% {
    box-shadow:
      0 0 0 16rpx rgba(255, 255, 255, 0.12),
      0 22rpx 56rpx rgba(66, 152, 180, 0.42);
  }
}
</style>
