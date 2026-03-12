<script lang="ts" setup>
import type { VoiceAnalysisResult, VoiceMetric } from '@/service/voice'
import {
  fetchVoiceShareCode,
  getLatestVoiceAnalysisResult,
  saveLatestVoiceAnalysisResult,
} from '@/service/voice'

definePage({
  style: {
    navigationBarTitleText: '声音人格报告',
    navigationBarBackgroundColor: '#f8fafc',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f8fafc',
  },
})

const posterCanvasId = 'voice-report-poster-canvas'
const posterWidth = 600
const posterHeight = 980
const official16pUrl = 'https://www.16personalities.com/ch/%E4%BA%BA%E6%A0%BC%E6%B5%8B%E8%AF%95'

const result = ref<VoiceAnalysisResult | null>(null)
const isSavingPoster = ref(false)

const typeCode = computed(() => result.value?.typeCode || 'ENFP-T')
const personaTitle = computed(() => result.value?.roleTitle || '竞选者')
const groupInfo = computed(() => ({
  group: result.value?.groupName || '外交官',
  color: result.value?.groupColor || '#33a474',
  evaluation: result.value?.evaluation || '你的声音充满了坚定而温暖的感染力，频率稳定，展现出清晰的理想主义与共情能力。',
}))

const metrics = computed<VoiceMetric[]>(() => result.value?.metrics || [])

const groupKey = computed(() => {
  const groupName = groupInfo.value.group
  if (groupName.includes('分析')) {
    return 'analyst'
  }
  if (groupName.includes('外交')) {
    return 'diplomat'
  }
  if (groupName.includes('守护')) {
    return 'sentinel'
  }
  if (groupName.includes('探险')) {
    return 'explorer'
  }
  return 'default'
})

const illustrationCandidates = computed(() => {
  const type = typeCode.value.slice(0, 4).toUpperCase()
  const group = groupKey.value
  return [
    `/static/illustrations/result/types/${type}.svg`,
    `/static/illustrations/result/types/${type}.png`,
    `/static/illustrations/result/types/${type}.webp`,
    `/static/illustrations/result/groups/${group}.svg`,
    `/static/illustrations/result/groups/${group}.png`,
    `/static/illustrations/result/groups/${group}.webp`,
    '/static/illustrations/result/groups/default.svg',
    '/static/illustrations/result/groups/default.png',
    '/static/illustrations/result/groups/default.webp',
  ]
})
const illustrationIndex = ref(0)
const illustrationSrc = computed(() => illustrationCandidates.value[illustrationIndex.value] || '/static/illustrations/result/groups/default.svg')

const dimensionAxes = computed(() => {
  const base = typeCode.value.slice(0, 4)

  return [
    {
      left: 'E',
      right: 'I',
      label: '表达能量',
      value: base[0] === 'E' ? 76 : 24,
    },
    {
      left: 'N',
      right: 'S',
      label: '信息取向',
      value: base[1] === 'N' ? 72 : 28,
    },
    {
      left: 'T',
      right: 'F',
      label: '决策风格',
      value: base[2] === 'T' ? 68 : 78,
    },
    {
      left: 'J',
      right: 'P',
      label: '节奏偏好',
      value: base[3] === 'J' ? 36 : 74,
    },
  ]
})

function createFallbackMetrics(type: string) {
  const base = type.slice(0, 4)
  return [
    {
      label: '能量流向',
      detail: base[0] === 'E' ? '语速快 -> E' : '语速稳 -> I',
      value: base[0] === 'E' ? 85 : 72,
    },
    {
      label: '决策偏好',
      detail: base[2] === 'F' ? '语调柔和 -> F' : '结构清晰 -> T',
      value: base[2] === 'F' ? 62 : 69,
    },
    {
      label: '生活节奏',
      detail: base[3] === 'P' ? '表达自由 -> P' : '表达严谨 -> J',
      value: base[3] === 'P' ? 74 : 58,
    },
  ] satisfies VoiceMetric[]
}

function createFallbackResult(type: string): VoiceAnalysisResult {
  const normalizedType = type.toUpperCase()
  const base = normalizedType.slice(0, 4)

  const roleMap: Record<string, string> = {
    INTJ: '建筑师',
    INTP: '逻辑学家',
    ENTJ: '指挥官',
    ENTP: '辩论家',
    INFJ: '提倡者',
    INFP: '调停者',
    ENFJ: '主人公',
    ENFP: '竞选者',
    ISTJ: '物流师',
    ISFJ: '守卫者',
    ESTJ: '总经理',
    ESFJ: '执政官',
    ISTP: '鉴赏家',
    ISFP: '探险家',
    ESTP: '企业家',
    ESFP: '表演者',
  }

  const groupMap: Record<string, { name: string, color: string }> = {
    analyst: { name: '分析师', color: '#88619a' },
    diplomat: { name: '外交官', color: '#33a474' },
    sentinel: { name: '守护者', color: '#4298b4' },
    explorer: { name: '探险家', color: '#e4ae3a' },
  }

  let group = groupMap.explorer
  if (['INTJ', 'INTP', 'ENTJ', 'ENTP'].includes(base)) {
    group = groupMap.analyst
  }
  else if (['INFJ', 'INFP', 'ENFJ', 'ENFP'].includes(base)) {
    group = groupMap.diplomat
  }
  else if (['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'].includes(base)) {
    group = groupMap.sentinel
  }

  return {
    reportId: `demo-${Date.now()}`,
    typeCode: normalizedType,
    roleTitle: roleMap[base] || '探索者',
    groupName: group.name,
    groupColor: group.color,
    metrics: createFallbackMetrics(normalizedType),
    evaluation: '你的声音呈现出清晰的表达边界与稳定节奏，兼具辨识度与感染力，能在沟通中快速建立信任。',
    duration: 0,
    createdAt: new Date().toISOString(),
    audioUrl: '',
    shareCodeUrl: '',
    shareCodeBase64: '',
  }
}

function openOfficialTest() {
  uni.setClipboardData({
    data: official16pUrl,
    success: () => {
      uni.showToast({
        title: '已复制 16P 官方测试链接',
        icon: 'none',
      })
    },
  })
}

function handleIllustrationError() {
  if (illustrationIndex.value < illustrationCandidates.value.length - 1) {
    illustrationIndex.value += 1
  }
}

function retest() {
  uni.navigateTo({
    url: '/pages/record/index',
  })
}

function fillRoundRect(ctx: UniApp.CanvasContext, x: number, y: number, width: number, height: number, radius: number, fillStyle: string) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
  ctx.setFillStyle(fillStyle)
  ctx.fill()
}

function chunkText(input: string, maxCharsPerLine: number, maxLines: number) {
  const text = input.trim()
  if (!text) {
    return [] as string[]
  }

  const lines: string[] = []
  let cursor = 0

  while (cursor < text.length && lines.length < maxLines) {
    const rest = text.slice(cursor)
    if (rest.length <= maxCharsPerLine) {
      lines.push(rest)
      break
    }

    lines.push(rest.slice(0, maxCharsPerLine))
    cursor += maxCharsPerLine
  }

  if (cursor < text.length && lines.length) {
    const last = lines[lines.length - 1]
    lines[lines.length - 1] = `${last.slice(0, Math.max(0, last.length - 1))}...`
  }

  return lines
}

function drawMetricBars(ctx: UniApp.CanvasContext, metricList: VoiceMetric[]) {
  const startY = 300

  metricList.slice(0, 3).forEach((item, idx) => {
    const y = startY + idx * 86
    const value = Math.max(0, Math.min(100, Number(item.value) || 0))

    ctx.setFillStyle('#4d5d79')
    ctx.setFontSize(22)
    ctx.fillText(item.label, 56, y)

    ctx.setFillStyle('#7486a3')
    ctx.setFontSize(20)
    const detail = item.detail ? `${item.detail} (${value}%)` : `${value}%`
    ctx.fillText(detail, 56, y + 30)

    fillRoundRect(ctx, 56, y + 40, 488, 12, 6, '#e8edf7')
    fillRoundRect(ctx, 56, y + 40, 488 * value / 100, 12, 6, groupInfo.value.color)
  })
}

function downloadImage(url: string) {
  return new Promise<string>((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          resolve(res.tempFilePath)
          return
        }
        reject(new Error('下载图片失败'))
      },
      fail: reject,
    })
  })
}

function base64ToTempImage(base64Content: string) {
  return new Promise<string>((resolve, reject) => {
    // #ifdef MP-WEIXIN
    try {
      const fs = wx.getFileSystemManager()
      const filePath = `${wx.env.USER_DATA_PATH}/voice_share_code_${Date.now()}.png`
      const pureBase64 = base64Content.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
      const buffer = wx.base64ToArrayBuffer(pureBase64)
      fs.writeFile({
        filePath,
        data: buffer,
        encoding: 'binary',
        success: () => resolve(filePath),
        fail: reject,
      })
    }
    catch (error) {
      reject(error)
    }
    // #endif

    // #ifndef MP-WEIXIN
    reject(new Error('base64 图片转换仅支持微信小程序'))
    // #endif
  })
}

async function ensureShareCodeImage() {
  if (!result.value) {
    return ''
  }

  if (result.value.shareCodeUrl) {
    try {
      return await downloadImage(result.value.shareCodeUrl)
    }
    catch {
      // continue
    }
  }

  if (result.value.shareCodeBase64) {
    try {
      return await base64ToTempImage(result.value.shareCodeBase64)
    }
    catch {
      // continue
    }
  }

  try {
    const shareCode = await fetchVoiceShareCode({
      reportId: result.value.reportId,
      typeCode: result.value.typeCode,
    })

    result.value = {
      ...result.value,
      shareCodeUrl: shareCode.shareCodeUrl,
      shareCodeBase64: shareCode.shareCodeBase64,
    }

    saveLatestVoiceAnalysisResult(result.value)

    if (shareCode.shareCodeUrl) {
      return await downloadImage(shareCode.shareCodeUrl)
    }

    if (shareCode.shareCodeBase64) {
      return await base64ToTempImage(shareCode.shareCodeBase64)
    }
  }
  catch {
    return ''
  }

  return ''
}

function drawPosterCanvas(codeImagePath: string) {
  return new Promise<string>((resolve, reject) => {
    const ctx = uni.createCanvasContext(posterCanvasId)

    const background = ctx.createLinearGradient(0, 0, 0, posterHeight)
    background.addColorStop(0, '#f8fafc')
    background.addColorStop(1, '#e9eff9')
    ctx.setFillStyle(background)
    ctx.fillRect(0, 0, posterWidth, posterHeight)

    ctx.setFillStyle('#1f2a3b')
    ctx.setFontSize(36)
    ctx.fillText('声音人格报告', 40, 70)

    fillRoundRect(ctx, 40, 104, 520, 170, 24, '#ffffff')

    ctx.setFillStyle(groupInfo.value.color)
    fillRoundRect(ctx, 62, 130, 112, 42, 21, groupInfo.value.color)
    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(20)
    ctx.fillText(groupInfo.value.group, 86, 158)

    ctx.setFillStyle('#1f2a3b')
    ctx.setFontSize(56)
    ctx.fillText(typeCode.value, 62, 225)

    ctx.setFillStyle('#4e5d78')
    ctx.setFontSize(26)
    ctx.fillText(personaTitle.value, 62, 257)

    fillRoundRect(ctx, 40, 296, 520, 286, 24, '#ffffff')
    ctx.setFillStyle('#1f2a3a')
    ctx.setFontSize(30)
    ctx.fillText('声学维度', 56, 338)
    drawMetricBars(ctx, metrics.value)

    fillRoundRect(ctx, 40, 602, 520, 178, 24, '#ffffff')
    ctx.setFillStyle('#1f2a3a')
    ctx.setFontSize(30)
    ctx.fillText('声音评价', 56, 644)

    ctx.setFillStyle('#445572')
    ctx.setFontSize(24)
    const lines = chunkText(groupInfo.value.evaluation, 18, 4)
    lines.forEach((line, idx) => {
      ctx.fillText(line, 56, 680 + idx * 34)
    })

    fillRoundRect(ctx, 40, 806, 520, 144, 24, '#ffffff')
    ctx.setFillStyle('#2b3b57')
    ctx.setFontSize(24)
    ctx.fillText('扫码查看完整报告', 56, 850)

    ctx.setFillStyle('#6f7f9a')
    ctx.setFontSize(20)
    ctx.fillText(`报告编号：${result.value?.reportId ?? '--'}`, 56, 886)
    ctx.fillText('Voice Persona by MBTI', 56, 916)

    if (codeImagePath) {
      ctx.drawImage(codeImagePath, 418, 826, 116, 116)
    }
    else {
      fillRoundRect(ctx, 418, 826, 116, 116, 12, '#eef2f8')
      ctx.setFillStyle('#95a4bf')
      ctx.setFontSize(20)
      ctx.fillText('无小程序码', 430, 890)
    }

    ctx.draw(false, () => {
      uni.canvasToTempFilePath({
        canvasId: posterCanvasId,
        fileType: 'png',
        quality: 1,
        destWidth: posterWidth * 2,
        destHeight: posterHeight * 2,
        success: res => resolve(res.tempFilePath),
        fail: reject,
      })
    })
  })
}

function authorizeAlbum() {
  return new Promise<boolean>((resolve) => {
    uni.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: async () => {
        try {
          const setting = await uni.openSetting()
          resolve(Boolean(setting.authSetting?.['scope.writePhotosAlbum']))
        }
        catch {
          resolve(false)
        }
      },
    })
  })
}

function saveImage(tempPath: string) {
  return new Promise<void>((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: tempPath,
      success: () => resolve(),
      fail: reject,
    })
  })
}

async function savePoster() {
  if (!result.value || isSavingPoster.value) {
    return
  }

  isSavingPoster.value = true
  uni.showLoading({
    title: '生成长图中...',
    mask: true,
  })

  try {
    const shareCodeImage = await ensureShareCodeImage()
    const posterPath = await drawPosterCanvas(shareCodeImage)

    const hasPermission = await authorizeAlbum()
    if (!hasPermission) {
      uni.showToast({
        title: '请先授权保存到相册',
        icon: 'none',
      })
      return
    }

    await saveImage(posterPath)

    uni.showToast({
      title: '已保存到相册',
      icon: 'success',
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '长图生成失败'
    uni.showToast({
      title: message,
      icon: 'none',
    })
  }
  finally {
    isSavingPoster.value = false
    uni.hideLoading()
  }
}

onLoad((query) => {
  const cached = getLatestVoiceAnalysisResult()
  if (cached) {
    result.value = cached
    return
  }

  if (typeof query?.type === 'string' && query.type) {
    result.value = createFallbackResult(query.type)
    return
  }

  uni.showToast({
    title: '未找到分析结果，请重新测试',
    icon: 'none',
  })

  result.value = createFallbackResult('ENFP-T')
})

watch([typeCode, groupKey], () => {
  illustrationIndex.value = 0
})
</script>

<template>
  <view class="result-page">
    <view class="persona-card" :style="{ background: `linear-gradient(140deg, ${groupInfo.color}, #f6fbff)` }">
      <view class="persona-illust">
        <image class="persona-image" :src="illustrationSrc" mode="aspectFit" @error="handleIllustrationError" />
      </view>

      <view class="persona-info">
        <text class="persona-type">
          {{ typeCode }}
        </text>
        <text class="persona-name">
          {{ personaTitle }}
        </text>
        <text class="persona-group">
          {{ groupInfo.group }}
        </text>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">
        声音能量图谱
      </text>

      <view v-for="item in dimensionAxes" :key="item.label" class="axis-row">
        <view class="axis-head">
          <text>{{ item.label }}</text>
          <text>{{ item.left }} · {{ item.right }}</text>
        </view>

        <view class="axis-track">
          <view class="axis-middle" />
          <view class="axis-dot" :style="{ left: `${item.value}%`, backgroundColor: groupInfo.color }" />
          <text class="axis-label left">
            {{ item.left }}
          </text>
          <text class="axis-label right">
            {{ item.right }}
          </text>
        </view>
      </view>
    </view>

    <view class="section-card quote-card">
      <text class="section-title">
        声音评价
      </text>
      <text class="quote-text">
        “{{ groupInfo.evaluation }}”
      </text>
    </view>

    <view class="section-card test-card">
      <text class="section-title">
        推荐 16P 官方测试入口
      </text>
      <text class="test-copy">
        如果你想进一步对照文本问卷，可前往 16Personalities 官方测试。
      </text>
      <button class="official-btn" @click="openOfficialTest">
        复制官方链接
      </button>
    </view>

    <view class="actions">
      <button class="action-btn primary" :loading="isSavingPoster" @click="savePoster">
        生成海报
      </button>
      <button class="action-btn ghost" @click="retest">
        重新测试
      </button>
    </view>

    <canvas
      :canvas-id="posterCanvasId"
      class="poster-canvas"
      :style="{ width: `${posterWidth}px`, height: `${posterHeight}px` }"
    />
  </view>
</template>

<style lang="scss" scoped>
.result-page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(env(safe-area-inset-bottom) + 28rpx);
  background:
    radial-gradient(circle at 18% 6%, rgba(136, 97, 154, 0.12), transparent 24%),
    radial-gradient(circle at 84% 22%, rgba(66, 152, 180, 0.1), transparent 24%), #f8fafc;
}

.persona-card,
.section-card {
  border-radius: var(--mbti-card-radius);
  box-shadow: var(--mbti-shadow);
}

.persona-card {
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.persona-illust {
  width: 160rpx;
  height: 160rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.45);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.64);
  display: flex;
  align-items: center;
  justify-content: center;
}

.persona-image {
  width: 132rpx;
  height: 132rpx;
}

.persona-info {
  flex: 1;
  min-width: 0;
}

.persona-type {
  display: block;
  color: #fff;
  font-size: 60rpx;
  line-height: 1.08;
  font-weight: 700;
}

.persona-name {
  margin-top: 8rpx;
  display: block;
  color: rgba(255, 255, 255, 0.94);
  font-size: 30rpx;
}

.persona-group {
  margin-top: 6rpx;
  display: block;
  color: rgba(255, 255, 255, 0.88);
  font-size: 24rpx;
}

.section-card {
  margin-top: 18rpx;
  padding: 22rpx;
  background: #fff;
}

.section-title {
  display: block;
  font-size: 30rpx;
  color: #223047;
  font-weight: 700;
}

.axis-row {
  margin-top: 18rpx;
}

.axis-head {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #5c6e8d;
}

.axis-track {
  position: relative;
  margin-top: 10rpx;
  height: 34rpx;
}

.axis-middle {
  position: absolute;
  left: 50%;
  top: 5rpx;
  width: 2rpx;
  height: 24rpx;
  background: #cad7eb;
}

.axis-dot {
  position: absolute;
  top: 7rpx;
  transform: translateX(-50%);
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  box-shadow: 0 0 0 4rpx rgba(66, 152, 180, 0.15);
}

.axis-label {
  position: absolute;
  bottom: 0;
  font-size: 22rpx;
  color: #94a3b8;
}

.axis-label.left {
  left: 0;
}

.axis-label.right {
  right: 0;
}

.quote-card {
  background: linear-gradient(145deg, #ffffff, #f6f9ff);
}

.quote-text {
  margin-top: 12rpx;
  display: block;
  color: #33465f;
  font-size: 28rpx;
  line-height: 1.7;
  font-style: italic;
}

.test-card {
  border: 1px solid rgba(66, 152, 180, 0.2);
}

.test-copy {
  margin-top: 10rpx;
  display: block;
  color: #5f7394;
  font-size: 25rpx;
  line-height: 1.6;
}

.official-btn {
  margin-top: 14rpx;
  width: 100%;
  height: 78rpx;
  padding: 0;
  border-radius: 39rpx;
  border: 1px solid #caddf2;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  color: #3b5a7d;
  background: #fff;
  font-size: 26rpx;
}

.official-btn::after {
  border: 0;
}

.actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 90rpx;
  padding: 0;
  border-radius: 45rpx;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  font-size: 28rpx;
  font-weight: 700;
}

.action-btn::after {
  border: 0;
}

.action-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, #33a474, #4298b4);
}

.action-btn.ghost {
  color: #4f647f;
  background: #fff;
  border: 1px solid #d2dfef;
}

.poster-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  z-index: -1;
  pointer-events: none;
}
</style>
