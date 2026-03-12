import { http } from '@/http/http'
import { useTokenStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'

export interface VoiceMetric {
  label: string
  detail: string
  value: number
}

export interface VoiceAnalysisResult {
  reportId: string
  typeCode: string
  roleTitle: string
  groupName: string
  groupColor: string
  metrics: VoiceMetric[]
  evaluation: string
  duration: number
  createdAt: string
  audioUrl: string
  shareCodeUrl: string
  shareCodeBase64: string
}

export interface VoiceRecordingCache {
  tempFilePath: string
  duration: number
  fileSize: number
  createdAt: string
}

interface AnalyzeVoiceParams {
  tempFilePath: string
  duration: number
  fileSize?: number
}

interface ShareCodeParams {
  reportId?: string
  typeCode?: string
}

interface ApiEnvelope<T = any> {
  code?: number
  msg?: string
  message?: string
  data?: T
  [key: string]: any
}

interface VoiceShareCodeResponse {
  shareCodeUrl?: string
  shareCodeBase64?: string
  miniProgramCodeUrl?: string
  miniProgramCodeBase64?: string
  qrCodeUrl?: string
  [key: string]: any
}

const VOICE_RECORDING_CACHE_KEY = 'voice_recording_cache'
const VOICE_ANALYSIS_CACHE_KEY = 'voice_analysis_cache'

const VOICE_ANALYZE_ENDPOINT = '/voice/analyze'
const VOICE_SHARE_CODE_ENDPOINT = '/voice/share-code'

const TYPE_TO_ROLE: Record<string, string> = {
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

const GROUP_META = {
  analyst: {
    name: '分析师',
    color: '#88619a',
  },
  diplomat: {
    name: '外交官',
    color: '#33a474',
  },
  sentinel: {
    name: '守护者',
    color: '#4298b4',
  },
  explorer: {
    name: '探险家',
    color: '#e4ae3a',
  },
}

function getGroupByType(typeCode: string) {
  const baseCode = typeCode.slice(0, 4)

  if (['INTJ', 'INTP', 'ENTJ', 'ENTP'].includes(baseCode)) {
    return GROUP_META.analyst
  }

  if (['INFJ', 'INFP', 'ENFJ', 'ENFP'].includes(baseCode)) {
    return GROUP_META.diplomat
  }

  if (['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'].includes(baseCode)) {
    return GROUP_META.sentinel
  }

  return GROUP_META.explorer
}

function normalizeTypeCode(rawType: unknown) {
  if (typeof rawType === 'string' && rawType.trim()) {
    return rawType.trim().toUpperCase()
  }
  return 'ENFP-T'
}

function resolveRoleTitle(typeCode: string, roleTitle?: unknown) {
  if (typeof roleTitle === 'string' && roleTitle.trim()) {
    return roleTitle.trim()
  }
  const baseCode = typeCode.slice(0, 4)
  return TYPE_TO_ROLE[baseCode] ?? '探索者'
}

function normalizeMetricItem(item: any): VoiceMetric | null {
  const label = item?.label ?? item?.name ?? item?.title
  const detail = item?.detail ?? item?.description ?? item?.desc
  const value = Number(item?.value ?? item?.score ?? item?.percent)

  if (typeof label !== 'string' || Number.isNaN(value)) {
    return null
  }

  return {
    label,
    detail: typeof detail === 'string' ? detail : '',
    value: Math.max(0, Math.min(100, Math.round(value))),
  }
}

function buildDefaultMetrics(typeCode: string) {
  const baseCode = typeCode.slice(0, 4)
  const energy = baseCode[0] === 'E' ? 85 : 78
  const decision = baseCode[2] === 'F' ? 60 : 68
  const style = baseCode[3] === 'P' ? 73 : 66

  return [
    {
      label: '能量流向',
      detail: baseCode[0] === 'E' ? '语速快 -> E' : '语速稳 -> I',
      value: energy,
    },
    {
      label: '决策偏好',
      detail: baseCode[2] === 'F' ? '语调柔和 -> F' : '结构清晰 -> T',
      value: decision,
    },
    {
      label: '生活节奏',
      detail: baseCode[3] === 'P' ? '表达自由 -> P' : '表达严谨 -> J',
      value: style,
    },
  ] satisfies VoiceMetric[]
}

function normalizeMetrics(raw: any, typeCode: string) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.list)
      ? raw.list
      : []

  const normalized = list
    .map(normalizeMetricItem)
    .filter((item): item is VoiceMetric => !!item)

  return normalized.length ? normalized : buildDefaultMetrics(typeCode)
}

function extractEnvelopeData<T = any>(raw: any): T {
  if (!raw || typeof raw !== 'object') {
    return raw as T
  }

  const envelope = raw as ApiEnvelope<T>
  const code = Number(envelope.code)

  if (!Number.isNaN(code) && code !== 0 && code !== 200) {
    throw new Error(envelope.msg || envelope.message || '接口请求失败')
  }

  if ('data' in envelope) {
    return envelope.data as T
  }

  return raw as T
}

function resolveApiUrl(endpoint: string) {
  if (endpoint.startsWith('http')) {
    return endpoint
  }
  return `${getEnvBaseUrl()}${endpoint}`
}

function getAuthHeader() {
  const tokenStore = useTokenStore()
  const token = tokenStore.updateNowTime().validToken

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

function parseUploadResponse(uploadRes: UniApp.UploadFileSuccessCallbackResult) {
  const { statusCode, data } = uploadRes

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`分析接口请求失败(${statusCode})`)
  }

  if (typeof data === 'string' && data) {
    try {
      return JSON.parse(data)
    }
    catch {
      return data
    }
  }

  return data
}

function normalizeAnalysisResult(raw: any, duration: number): VoiceAnalysisResult {
  const data = extractEnvelopeData(raw)

  const typeCode = normalizeTypeCode(data?.typeCode ?? data?.personalityType ?? data?.mbti ?? data?.type)
  const groupMeta = getGroupByType(typeCode)

  const metrics = normalizeMetrics(data?.metrics ?? data?.dimensions, typeCode)

  const reportId = String(data?.reportId ?? data?.id ?? Date.now())
  const roleTitle = resolveRoleTitle(typeCode, data?.roleTitle ?? data?.roleName)

  const evaluation = typeof data?.evaluation === 'string' && data.evaluation.trim()
    ? data.evaluation
    : typeof data?.comment === 'string' && data.comment.trim()
      ? data.comment
      : '你的声音呈现出稳定的情绪波动与鲜明表达风格，具备较高的个人辨识度。'

  const createdAt = typeof data?.createdAt === 'string' && data.createdAt
    ? data.createdAt
    : new Date().toISOString()

  return {
    reportId,
    typeCode,
    roleTitle,
    groupName: groupMeta.name,
    groupColor: groupMeta.color,
    metrics,
    evaluation,
    duration,
    createdAt,
    audioUrl: String(data?.audioUrl ?? data?.voiceUrl ?? ''),
    shareCodeUrl: String(data?.shareCodeUrl ?? data?.miniProgramCodeUrl ?? data?.qrCodeUrl ?? ''),
    shareCodeBase64: String(data?.shareCodeBase64 ?? data?.miniProgramCodeBase64 ?? ''),
  }
}

export function saveLatestVoiceRecording(payload: VoiceRecordingCache) {
  uni.setStorageSync(VOICE_RECORDING_CACHE_KEY, payload)
}

export function getLatestVoiceRecording(): VoiceRecordingCache | null {
  const data = uni.getStorageSync(VOICE_RECORDING_CACHE_KEY)
  if (!data) {
    return null
  }
  return data as VoiceRecordingCache
}

export function clearLatestVoiceRecording() {
  uni.removeStorageSync(VOICE_RECORDING_CACHE_KEY)
}

export function saveLatestVoiceAnalysisResult(payload: VoiceAnalysisResult) {
  uni.setStorageSync(VOICE_ANALYSIS_CACHE_KEY, payload)
}

export function getLatestVoiceAnalysisResult(): VoiceAnalysisResult | null {
  const data = uni.getStorageSync(VOICE_ANALYSIS_CACHE_KEY)
  if (!data) {
    return null
  }
  return data as VoiceAnalysisResult
}

export async function analyzeVoiceByRecording(params: AnalyzeVoiceParams) {
  const { tempFilePath, duration, fileSize = 0 } = params

  if (!tempFilePath) {
    throw new Error('缺少录音文件')
  }

  const uploadUrl = resolveApiUrl(VOICE_ANALYZE_ENDPOINT)
  const headers = getAuthHeader()

  const uploadRes = await new Promise<UniApp.UploadFileSuccessCallbackResult>((resolve, reject) => {
    uni.uploadFile({
      url: uploadUrl,
      filePath: tempFilePath,
      name: 'file',
      formData: {
        duration,
        fileSize,
      },
      header: {
        ...headers,
      },
      success: resolve,
      fail: reject,
    })
  })

  const parsed = parseUploadResponse(uploadRes)
  return normalizeAnalysisResult(parsed, duration)
}

export async function fetchVoiceShareCode(params: ShareCodeParams) {
  const raw = await http.get<VoiceShareCodeResponse>(VOICE_SHARE_CODE_ENDPOINT, {
    reportId: params.reportId,
    typeCode: params.typeCode,
  })

  const data = extractEnvelopeData<VoiceShareCodeResponse>(raw)

  return {
    shareCodeUrl: String(data?.shareCodeUrl ?? data?.miniProgramCodeUrl ?? data?.qrCodeUrl ?? ''),
    shareCodeBase64: String(data?.shareCodeBase64 ?? data?.miniProgramCodeBase64 ?? ''),
  }
}
