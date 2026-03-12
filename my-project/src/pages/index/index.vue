<script lang="ts" setup>
defineOptions({
  name: 'Home',
})

definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f8fafc',
  },
})

const discoveredUsers = '10w+'

function startAssessment() {
  uni.navigateTo({
    url: '/pages/record/index',
  })
}
</script>

<template>
  <view class="home-page">
    <view class="content-card">
      <view class="hero-illustration">
        <view class="halo halo-purple" />
        <view class="halo halo-blue" />
        <view class="halo halo-green" />
        <image
          class="hero-img"
          src="/static/illustrations/home/home-hero.svg"
          mode="aspectFit"
        />

        <view class="voice-rings">
          <view class="ring ring-green" />
          <view class="ring ring-blue" />
          <view class="ring ring-purple" />
        </view>
      </view>

      <view class="copy-area">
        <text class="title">
          听见，未知的自己
        </text>
        <text class="subtitle-main">
          听你的声音里藏着哪种灵魂
        </text>
        <text class="subtitle-sub">
          声纹 MBTI 测试 · 开启灵魂对话
        </text>
      </view>

      <view class="action-area">
        <button class="start-btn" hover-class="start-btn-hover" @click="startAssessment">
          开启录音识别
        </button>

        <text class="detail-text">
          基于声学特征的性格深度解析系统
        </text>
        <text class="joined-text">
          已有 {{ discoveredUsers }} 人参与
        </text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.home-page {
  height: 100vh;
  min-height: 100vh;
  box-sizing: border-box;
  padding-top: calc(env(safe-area-inset-top) + 12rpx);
  padding-right: 26rpx;
  padding-left: 26rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 104rpx);
  display: flex;
  justify-content: center;
  align-items: stretch;
  overflow: hidden;
  overflow-y: hidden;
  background:
    radial-gradient(circle at 18% 8%, rgba(136, 97, 154, 0.16), transparent 36%),
    radial-gradient(circle at 84% 16%, rgba(66, 152, 180, 0.16), transparent 34%), #f8fafc;
}

.content-card {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 36rpx;
  padding: 22rpx;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 20rpx 44rpx rgba(77, 103, 150, 0.14);
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  gap: 14rpx;
  overflow: hidden;
}

.hero-illustration {
  position: relative;
  min-height: 0;
  border-radius: var(--mbti-card-radius);
  background: linear-gradient(180deg, #ffffff 0%, #f1f7fb 100%);
  overflow: hidden;
  box-shadow: var(--mbti-shadow);
}

.halo {
  position: absolute;
  border-radius: 50%;
  filter: blur(8rpx);
}

.halo-purple {
  width: 250rpx;
  height: 250rpx;
  left: -60rpx;
  top: 30rpx;
  background: rgba(136, 97, 154, 0.25);
}

.halo-blue {
  width: 220rpx;
  height: 220rpx;
  right: -40rpx;
  top: 120rpx;
  background: rgba(66, 152, 180, 0.24);
}

.halo-green {
  width: 260rpx;
  height: 260rpx;
  left: 220rpx;
  bottom: -80rpx;
  background: rgba(51, 164, 116, 0.18);
}

.hero-img {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 84%;
  height: 80%;
  transform: translate(-50%, -50%);
}

.voice-rings {
  position: absolute;
  left: 50%;
  top: 56%;
  width: 280rpx;
  height: 196rpx;
  transform: translate(-50%, -50%);
}

.ring {
  position: absolute;
  border: 3rpx solid;
  border-radius: 50%;
  opacity: 0.55;
  animation: wave 2.6s ease-out infinite;
}

.ring-green {
  inset: 14rpx;
  border-color: rgba(51, 164, 116, 0.46);
}

.ring-blue {
  inset: 0;
  border-color: rgba(66, 152, 180, 0.45);
  animation-delay: 0.6s;
}

.ring-purple {
  inset: -14rpx;
  border-color: rgba(136, 97, 154, 0.44);
  animation-delay: 1.2s;
}

.copy-area {
  text-align: center;
}

.title {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.subtitle-main {
  margin-top: 8rpx;
  display: block;
  font-size: 27rpx;
  color: #475569;
}

.subtitle-sub {
  margin-top: 8rpx;
  display: block;
  font-size: 24rpx;
  color: #64748b;
}

.action-area {
  text-align: center;
}

.start-btn {
  width: 84%;
  height: 88rpx;
  border: 0;
  padding: 0;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #33a474, #4298b4);
  box-shadow: 0 10rpx 20rpx rgba(51, 164, 116, 0.3);
}

.start-btn::after {
  border: 0;
}

.start-btn-hover {
  opacity: 0.95;
  transform: scale(0.988);
}

.detail-text {
  margin-top: 14rpx;
  display: block;
  color: #94a3b8;
  font-size: 23rpx;
}

.joined-text {
  margin-top: 6rpx;
  display: block;
  color: #64748b;
  font-size: 23rpx;
}

@keyframes wave {
  0% {
    transform: scale(0.92);
    opacity: 0.2;
  }

  70% {
    transform: scale(1.02);
    opacity: 0.6;
  }

  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}
</style>
