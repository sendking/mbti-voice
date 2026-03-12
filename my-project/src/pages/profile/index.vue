<script lang="ts" setup>
import dayjs from 'dayjs'
import { getLatestVoiceAnalysisResult } from '@/service/voice'

definePage({
  style: {
    navigationBarTitleText: '个人中心',
    navigationBarBackgroundColor: '#f8fafc',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f8fafc',
  },
})

interface HistoryItem {
  date: string
  type: string
  duration: string
}

interface BadgeItem {
  key: string
  unlocked: boolean
}

const user = {
  avatar: '/static/images/default-avatar.png',
  nickname: '声纹旅人',
  favoriteType: 'ENFP-T',
}

const histories = ref<HistoryItem[]>([
  { date: '2026.03.12 10:30', type: 'INFP-T', duration: '00:56' },
  { date: '2026.03.01 09:14', type: 'ENFP-A', duration: '00:43' },
  { date: '2026.02.24 21:06', type: 'INFJ-A', duration: '01:04' },
])

const badgeCatalog = [
  'INTJ',
  'INTP',
  'ENTJ',
  'ENTP',
  'INFJ',
  'INFP',
  'ENFJ',
  'ENFP',
  'ISTJ',
  'ISFJ',
  'ESTJ',
  'ESFJ',
  'ISTP',
  'ISFP',
  'ESTP',
  'ESFP',
]

const badges = ref<BadgeItem[]>(badgeCatalog.map((key, idx) => ({
  key,
  unlocked: idx < 3,
})))

const unlockedCount = computed(() => badges.value.filter(item => item.unlocked).length)

function reviewHistory(item: HistoryItem) {
  uni.navigateTo({
    url: `/pages/result/index?type=${item.type}`,
  })
}

function replayRecord(item: HistoryItem) {
  uni.showToast({
    title: `回听 ${item.type} (${item.duration})`,
    icon: 'none',
  })
}

onShow(() => {
  const latestResult = getLatestVoiceAnalysisResult()
  if (!latestResult) {
    return
  }

  const latestType = latestResult.typeCode
  const existing = histories.value.find(item => item.type === latestType)
  if (!existing) {
    histories.value.unshift({
      date: dayjs(latestResult.createdAt).format('YYYY.MM.DD HH:mm'),
      type: latestType,
      duration: `00:${String(Math.min(59, latestResult.duration || 0)).padStart(2, '0')}`,
    })

    if (histories.value.length > 8) {
      histories.value.length = 8
    }
  }

  const key = latestType.slice(0, 4)
  const target = badges.value.find(item => item.key === key)
  if (target) {
    target.unlocked = true
  }

  user.favoriteType = latestType
})
</script>

<template>
  <view class="profile-page">
    <view class="header-card">
      <image class="avatar" :src="user.avatar" mode="aspectFill" />
      <view class="header-meta">
        <text class="nickname">
          {{ user.nickname }}
        </text>
        <text class="favorite">
          人格标签：{{ user.favoriteType }}
        </text>
        <text class="summary">
          已录制 {{ histories.length }} 次声纹，探索过 {{ unlockedCount }} 种灵魂颜色
        </text>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">
        历史记录
      </text>

      <view v-for="item in histories" :key="`${item.date}-${item.type}`" class="history-item">
        <view class="history-left">
          <view class="type-icon">
            {{ item.type.slice(0, 2) }}
          </view>
          <view>
            <text class="history-type">
              {{ item.type }}
            </text>
            <text class="history-date">
              {{ item.date }} · {{ item.duration }}
            </text>
          </view>
        </view>

        <view class="history-right">
          <text class="history-link" @click="replayRecord(item)">
            回听
          </text>
          <text class="history-link primary" @click="reviewHistory(item)">
            查看 >
          </text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">
        解锁的人格声纹 ({{ unlockedCount }}/16)
      </text>

      <view class="badge-grid">
        <view
          v-for="item in badges"
          :key="item.key"
          class="badge"
          :class="{ locked: !item.unlocked }"
        >
          <view class="badge-chip">
            {{ item.key }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(env(safe-area-inset-bottom) + 30rpx);
  background:
    radial-gradient(circle at 10% 6%, rgba(66, 152, 180, 0.12), transparent 26%),
    radial-gradient(circle at 86% 16%, rgba(51, 164, 116, 0.12), transparent 26%), #f8fafc;
}

.header-card,
.section-card {
  border-radius: var(--mbti-card-radius);
  box-shadow: var(--mbti-shadow);
}

.header-card {
  padding: 24rpx;
  background: linear-gradient(145deg, #ffffff, #f6f9ff);
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.avatar {
  width: 126rpx;
  height: 126rpx;
  border-radius: 50%;
  background: #ecf1fa;
}

.header-meta {
  flex: 1;
  min-width: 0;
}

.nickname {
  display: block;
  font-size: 34rpx;
  color: #1f2d42;
  font-weight: 700;
}

.favorite {
  margin-top: 6rpx;
  display: block;
  font-size: 24rpx;
  color: #4e6686;
}

.summary {
  margin-top: 8rpx;
  display: block;
  color: #64748b;
  font-size: 23rpx;
  line-height: 1.5;
}

.section-card {
  margin-top: 18rpx;
  padding: 20rpx;
  background: #fff;
}

.section-title {
  display: block;
  margin-bottom: 14rpx;
  font-size: 29rpx;
  color: #233249;
  font-weight: 700;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 18rpx 0;
  border-bottom: 1px solid #edf2f9;
}

.history-item:last-child {
  border-bottom: 0;
}

.history-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.type-icon {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: linear-gradient(140deg, #33a474, #4298b4);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21rpx;
  font-weight: 700;
}

.history-type {
  display: block;
  color: #2f4160;
  font-size: 28rpx;
  font-weight: 600;
}

.history-date {
  margin-top: 4rpx;
  display: block;
  color: #8092af;
  font-size: 22rpx;
}

.history-right {
  display: flex;
  gap: 14rpx;
}

.history-link {
  color: #6d7f9d;
  font-size: 24rpx;
}

.history-link.primary {
  color: #33a474;
  font-weight: 600;
}

.badge-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
}

.badge {
  border-radius: 14rpx;
  padding: 10rpx 6rpx;
  background: linear-gradient(145deg, #eef6ff, #f5fbf9);
  border: 1px solid rgba(94, 141, 208, 0.2);
}

.badge.locked {
  filter: grayscale(1);
  opacity: 0.5;
}

.badge-chip {
  height: 48rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #3b5272;
  background: rgba(255, 255, 255, 0.82);
}
</style>
