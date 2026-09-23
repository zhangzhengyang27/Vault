<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { useDark, useECharts } from "@pureadmin/utils";
import {
  Monitor,
  ChatDotRound,
  Reading,
  News,
  User,
  ChatLineSquare,
  ArrowRight
} from "@element-plus/icons-vue";
import { useUserStoreHook } from "@/store/modules/user";
import {
  getStats,
  getStatsTrend,
  getOnlineUsers,
  getSources,
  errMsg,
  type AdminStats,
  type TrendPoint
} from "@/api/admin";

defineOptions({ name: "Welcome" });

dayjs.locale("zh-cn");

const router = useRouter();
const userStore = useUserStoreHook();
const { isDark } = useDark();

const stats = ref<AdminStats | null>(null);
const trend = ref<TrendPoint[]>([]);
const onlineCount = ref(0);
const sourceTotal = ref(0);
const sourceEnabled = ref(0);
const loading = ref(true);
const chartRef = ref<HTMLDivElement>();

const theme = computed(() => (isDark.value ? "dark" : "light"));
const { setOptions } = useECharts(chartRef, { theme });

/** 问候语按时段区分 */
const greeting = computed(() => {
  const hour = dayjs().hour();
  if (hour < 6) return "凌晨好";
  if (hour < 9) return "早上好";
  if (hour < 12) return "上午好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
});
const dateText = dayjs().format("YYYY年MM月DD日 dddd");

interface StatCard {
  label: string;
  value: number;
  icon: typeof Monitor;
  color: string;
  path: string;
}

const cards = computed<StatCard[]>(() => [
  {
    label: "收录工具",
    value: stats.value?.tools ?? 0,
    icon: Monitor,
    color: "#409EFF",
    path: "/content/tools"
  },
  {
    label: "提示词",
    value: stats.value?.prompts ?? 0,
    icon: ChatDotRound,
    color: "#67C23A",
    path: "/content/prompts"
  },
  {
    label: "知识库文章",
    value: stats.value?.articles ?? 0,
    icon: Reading,
    color: "#E6A23C",
    path: "/content/articles"
  },
  {
    label: "AI 资讯",
    value: stats.value?.news ?? 0,
    icon: News,
    color: "#F56C6C",
    path: "/content/news"
  },
  {
    label: "注册用户",
    value: stats.value?.users ?? 0,
    icon: User,
    color: "#9E6BF0",
    path: "/users"
  },
  {
    label: "社区帖子",
    value: stats.value?.posts ?? 0,
    icon: ChatLineSquare,
    color: "#14B8A6",
    path: ""
  }
]);

const hasTrend = computed(() => trend.value.length > 0);
const pendingTotal = computed(
  () => (stats.value?.pendingSubmissions ?? 0) + (stats.value?.pendingContent ?? 0)
);

function renderChart() {
  if (!hasTrend.value) return;
  const textColor = isDark.value ? "#cfd3dc" : "#606266";
  const splitColor = isDark.value
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.06)";
  setOptions({
    tooltip: { trigger: "axis" },
    legend: {
      data: ["新增内容", "新增用户"],
      bottom: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: textColor, fontSize: 12 }
    },
    grid: { left: 42, right: 24, top: 24, bottom: 56 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: trend.value.map(t => t.date.slice(5)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: textColor, fontSize: 11 }
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: textColor, fontSize: 11 },
      splitLine: { lineStyle: { color: splitColor } }
    },
    series: [
      {
        name: "新增内容",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: false,
        data: trend.value.map(t => t.content),
        lineStyle: { width: 3, color: "#409EFF" },
        itemStyle: { color: "#409EFF" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(64,158,255,0.25)" },
              { offset: 1, color: "rgba(64,158,255,0.02)" }
            ]
          }
        }
      },
      {
        name: "新增用户",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: false,
        data: trend.value.map(t => t.users),
        lineStyle: { width: 3, color: "#67C23A" },
        itemStyle: { color: "#67C23A" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(103,194,58,0.22)" },
              { offset: 1, color: "rgba(103,194,58,0.02)" }
            ]
          }
        }
      }
    ]
  });
}

// 深浅色切换时重绘图表
watch(isDark, () => renderChart());

onMounted(async () => {
  try {
    const [s, t, online, sources] = await Promise.all([
      getStats(),
      getStatsTrend(7),
      getOnlineUsers().catch(() => []),
      getSources().catch(() => [])
    ]);
    stats.value = s;
    trend.value = Array.isArray(t) ? t : [];
    onlineCount.value = Array.isArray(online) ? online.length : 0;
    if (Array.isArray(sources)) {
      sourceTotal.value = sources.length;
      sourceEnabled.value = sources.filter(x => x.enabled).length;
    }
    renderChart();
  } catch (e) {
    console.error(errMsg(e, "加载概览失败"));
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-5">
    <!-- 问候横幅 -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">
          {{ greeting }}，{{ userStore.username }}
        </h2>
        <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
          {{ dateText }} · 站点运行一切尽在掌握。
        </p>
      </div>
      <div class="flex gap-2">
        <el-button
          v-if="pendingTotal > 0"
          type="primary"
          plain
          @click="router.push('/review')"
        >
          待处理审核 {{ pendingTotal }}
        </el-button>
        <el-button @click="router.push('/content/tools')">工具管理</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div v-loading="loading" class="grid grid-cols-2 gap-4 md:grid-cols-3">
      <el-card
        v-for="c in cards"
        :key="c.label"
        shadow="hover"
        class="transition-all!"
        :class="c.path ? 'cursor-pointer! hover:-translate-y-0.5' : ''"
        @click="c.path && router.push(c.path)"
      >
        <div class="flex items-center gap-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            :style="{ backgroundColor: c.color + '1f', color: c.color }"
          >
            <el-icon :size="22"><component :is="c.icon" /></el-icon>
          </div>
          <div class="min-w-0">
            <div class="text-sm text-[var(--el-text-color-secondary)]">
              {{ c.label }}
            </div>
            <div class="mt-0.5 truncate text-2xl font-bold leading-7">
              {{ c.value }}
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 趋势 + 待办/系统状态 -->
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <!-- 近 7 日趋势 -->
      <el-card shadow="never" class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">近 7 日新增趋势</span>
            <span class="text-xs text-[var(--el-text-color-secondary)]">
              内容与用户增长
            </span>
          </div>
        </template>
        <div v-show="hasTrend" ref="chartRef" class="h-[300px] w-full" />
        <el-empty
          v-if="!loading && !hasTrend"
          description="暂无趋势数据"
          :image-size="80"
        />
      </el-card>

      <!-- 审核待办 + 系统状态 -->
      <div class="grid content-start gap-4">
        <el-card shadow="never">
          <template #header>
            <span class="font-medium">审核待办</span>
          </template>
          <div v-loading="loading" class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-lg"
                  style="background-color: rgba(230, 162, 60, 0.14); color: #e6a23c"
                >
                  {{ stats?.pendingSubmissions ?? 0 }}
                </div>
                <span class="text-sm">用户投稿待审</span>
              </div>
              <el-button link type="primary" @click="router.push('/submissions')">
                去处理 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 items-center justify-center rounded-lg"
                  style="background-color: rgba(64, 158, 255, 0.14); color: #409eff"
                >
                  {{ stats?.pendingContent ?? 0 }}
                </div>
                <span class="text-sm">采集内容待审</span>
              </div>
              <el-button link type="primary" @click="router.push('/review')">
                去处理 <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <span class="font-medium">系统状态</span>
          </template>
          <div v-loading="loading" class="space-y-4">
            <div
              class="cursor-pointer! flex items-center justify-between"
              @click="router.push('/monitor/online')"
            >
              <span class="text-sm text-[var(--el-text-color-regular)]">在线用户</span>
              <span class="text-sm font-medium">
                {{ onlineCount }}
                <span class="text-[var(--el-text-color-secondary)]">人</span>
              </span>
            </div>
            <div
              class="cursor-pointer! flex items-center justify-between"
              @click="router.push('/sources')"
            >
              <span class="text-sm text-[var(--el-text-color-regular)]">启用数据源</span>
              <span class="text-sm font-medium">
                {{ sourceEnabled }}
                <span class="text-[var(--el-text-color-secondary)]">/ {{ sourceTotal }}</span>
              </span>
            </div>
            <el-alert
              type="warning"
              show-icon
              :closable="false"
              title="采集内容需保留来源并支持一键下架，投稿须审核后发布。"
            />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>
