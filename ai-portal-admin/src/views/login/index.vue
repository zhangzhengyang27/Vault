<script setup lang="ts">
import { useRouter } from "vue-router";
import { message } from "@/utils/message";
import { loginRules } from "./utils/rule";
import { debounce } from "@pureadmin/utils";
import { useNav } from "@/layout/hooks/useNav";
import { useEventListener } from "@vueuse/core";
import type { FormInstance } from "element-plus";
import { useLayout } from "@/layout/hooks/useLayout";
import { useUserStoreHook } from "@/store/modules/user";
import { initRouter, getTopMenu } from "@/router/utils";
import { bg, illustration } from "./utils/static";
import { ref, toRaw, reactive, watch } from "vue";
import { useRenderIcon } from "@/components/ReIcon/hooks";
import { useDataThemeChange } from "@/layout/hooks/useDataThemeChange";

import dayIcon from "@/assets/svg/day.svg?component";
import darkIcon from "@/assets/svg/dark.svg?component";
import { RiIconFn } from "@/components/ReIcon/RiIcon";

const Lock = RiIconFn("lock-fill");
const User = RiIconFn("user-3-fill");

defineOptions({
  name: "Login"
});

const loginDay = ref(7);
const router = useRouter();
const loading = ref(false);
const checked = ref(false);
const disabled = ref(false);
const ruleFormRef = ref<FormInstance>();

const { initStorage } = useLayout();
initStorage();
const { dataTheme, themeMode, dataThemeChange } = useDataThemeChange();
dataThemeChange(themeMode.value);
const { title } = useNav();
// v 参数用于换 logo 后破坏浏览器缓存
const logo = new URL("/logo.svg?v=20260915", import.meta.url).href;

// 勾选"7天内免登录"登录成功后记住用户名（不存密码），下次进登录页自动回填
const REMEMBERED_USER_KEY = "login-remembered-username";
const rememberedUser = localStorage.getItem(REMEMBERED_USER_KEY);
const ruleForm = reactive({
  username: rememberedUser ?? "",
  password: ""
});
if (rememberedUser) {
  checked.value = true;
}

const onLogin = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(valid => {
    if (valid) {
      loading.value = true;
      useUserStoreHook()
        .loginByUsername({
          username: ruleForm.username,
          password: ruleForm.password
        })
        .then(async () => {
          // 按勾选状态记住/清除用户名（密码不落盘）
          if (checked.value)
            localStorage.setItem(REMEMBERED_USER_KEY, ruleForm.username);
          else localStorage.removeItem(REMEMBERED_USER_KEY);
          // 获取菜单路由
          await initRouter();
          disabled.value = true;
          router.push(getTopMenu(true).path).then(() => {
            message("登录成功", { type: "success" });
          });
        })
        .catch(msg => {
          // 透出后端具体原因（如"用户名或密码错误"、非管理员、限流提示）
          message(
            typeof msg === "string" && msg
              ? `登录失败：${msg}`
              : "登录失败：账号或密码错误",
            { type: "error" }
          );
        })
        .finally(() => {
          disabled.value = false;
          loading.value = false;
        });
    }
  });
};

const immediateDebounce: any = debounce(
  formRef => onLogin(formRef),
  1000,
  true
);

useEventListener(document, "keydown", ({ code }) => {
  if (
    ["Enter", "NumpadEnter"].includes(code) &&
    !disabled.value &&
    !loading.value
  )
    immediateDebounce(ruleFormRef.value);
});

watch(checked, bool => {
  useUserStoreHook().SET_ISREMEMBERED(bool);
});
watch(loginDay, value => {
  useUserStoreHook().SET_LOGINDAY(value);
});
</script>

<template>
  <div class="select-none">
    <img :src="bg" class="wave" />
    <div class="flex-c absolute right-5 top-3">
      <!-- 主题 -->
      <el-switch
        v-model="dataTheme"
        inline-prompt
        :active-icon="dayIcon"
        :inactive-icon="darkIcon"
        @change="dataThemeChange"
      />
    </div>
    <div class="login-container">
      <div class="img">
        <component :is="toRaw(illustration)" />
      </div>
      <div class="login-box">
        <div class="login-form">
          <img :src="logo" class="login-logo" alt="logo" />
          <h2 class="outline-hidden">{{ title }}</h2>
          <p class="mb-4 text-sm text-[var(--el-text-color-secondary)]">仅限管理员账号登录</p>

          <el-form ref="ruleFormRef" :model="ruleForm" :rules="loginRules" size="large">
            <el-form-item prop="username">
              <el-input
                v-model="ruleForm.username"
                clearable
                placeholder="账号"
                :prefix-icon="User"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="ruleForm.password"
                clearable
                show-password
                placeholder="密码"
                :prefix-icon="Lock"
              />
            </el-form-item>
            <div class="mb-4 flex items-center justify-between">
              <el-checkbox v-model="checked">7天内免登录</el-checkbox>
            </div>
            <el-button
              type="primary"
              size="large"
              class="w-full!"
              :loading="loading"
              :disabled="disabled"
              @click="immediateDebounce(ruleFormRef)"
            >
              登录
            </el-button>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
.flex-c {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wave {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 0;
  width: 100%;
  height: 45vh;
  pointer-events: none;
}

.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-around;
  min-height: 100vh;
  padding: 24px;
}

.login-box {
  width: 420px;
  max-width: 92vw;
  padding: 40px 36px;
  border-radius: 16px;
  background-color: var(--el-bg-color);
  box-shadow: 0 6px 32px rgba(0, 21, 41, 0.12);
}

.login-form h2 {
  margin: 8px 0 4px;
  font-size: 24px;
  color: var(--el-text-color-primary);
}

.login-logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.img {
  display: block;
}

@media screen and (max-width: 900px) {
  .img {
    display: none;
  }

  .login-container {
    justify-content: center;
  }
}
</style>
