<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { message } from "@/utils/message";
import { updatePassword, updateProfile, getMe } from "@/api/user";
import { useUserStoreHook } from "@/store/modules/user";

defineOptions({ name: "AccountSettings" });

const userStore = useUserStoreHook();

const email = ref("");
const savingProfile = ref(false);

const pwdFormRef = ref();
const pwdForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});
const savingPwd = ref(false);

const pwdRules = {
  oldPassword: [{ required: true, message: "请输入原密码", trigger: "blur" }],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    { min: 6, message: "新密码至少 6 位", trigger: "blur" }
  ],
  confirmPassword: [
    { required: true, message: "请再次输入新密码", trigger: "blur" },
    {
      validator: (_rule, value, callback) => {
        if (value !== pwdForm.newPassword) {
          callback(new Error("两次输入的新密码不一致"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ]
};

onMounted(async () => {
  // 邮箱初值取 /auth/me（无则留空）
  const res = await getMe();
  if (res.code === 0 && res.data) {
    email.value = res.data.email ?? "";
  }
});

async function saveProfile() {
  savingProfile.value = true;
  try {
    const res = await updateProfile({ email: email.value.trim() });
    if (res.code === 0) {
      message("已保存", { type: "success" });
    } else {
      message(res.message, { type: "error" });
    }
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  await pwdFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return;
    savingPwd.value = true;
    try {
      const res = await updatePassword({
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword
      });
      if (res.code === 0) {
        message("密码已修改", { type: "success" });
        pwdForm.oldPassword = "";
        pwdForm.newPassword = "";
        pwdForm.confirmPassword = "";
        pwdFormRef.value.clearValidate();
      } else {
        message(res.message, { type: "error" });
      }
    } finally {
      savingPwd.value = false;
    }
  });
}
</script>

<template>
  <div class="p-5">
    <div class="mb-4">
      <h2 class="text-lg font-semibold">账户设置</h2>
      <p class="mt-1 text-sm text-[var(--el-text-color-secondary)]">
        当前账号：{{ userStore.username }}（{{ userStore.roles.includes("admin") ? "管理员" : "普通用户" }}）
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <!-- 个人资料 -->
      <el-card shadow="never">
        <template #header>
          <span class="font-medium">个人资料</span>
        </template>
        <el-form label-position="top">
          <el-form-item label="用户名">
            <el-input :model-value="userStore.username" disabled />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input
              v-model="email"
              placeholder="用于找回密码与通知（可留空）"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingProfile" @click="saveProfile">
              保存资料
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 修改密码 -->
      <el-card shadow="never">
        <template #header>
          <span class="font-medium">修改密码</span>
        </template>
        <el-form
          ref="pwdFormRef"
          label-position="top"
          :model="pwdForm"
          :rules="pwdRules"
        >
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="pwdForm.oldPassword" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="pwdForm.newPassword" show-password />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input v-model="pwdForm.confirmPassword" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingPwd" @click="changePassword">
              修改密码
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>
