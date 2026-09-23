/* DailyCheckin Dashboard — Vue 3 */
const { createApp, ref, computed, onMounted, nextTick } = Vue;

const DEMO = {
  offline: true,
  day: "2026-09-21",
  signed: 5,
  missed: 0,
  total: 5,
  rate: 100,
  platforms: [
    {
      id: "kuro",
      name: "库街区",
      detail: "鸣潮 / 战双 / 社区",
      status: "全部完成 3/3",
      tone: "ok",
      color: "#a78bfa",
    },
    {
      id: "mihoyo",
      name: "米游社",
      detail: "原神 / 星穹铁道 · 多账号",
      status: "全部完成 2/2",
      tone: "ok",
      color: "#35c4e8",
    },
  ],
  rewards: [
    {
      reward: "中级密音筒",
      category: "材料",
      emoji: "🧱",
      platform: "库街区",
      account: "",
      source: "official",
      icon: "./assets/icons_bundle/中级密音筒_53c3a6536d4fc0aa.png",
    },
    {
      reward: "武器强化素材Ⅳ",
      category: "材料",
      emoji: "🧱",
      platform: "库街区",
      account: "",
      source: "official",
      icon: "./assets/icons_bundle/武器强化素材Ⅳ_4a296cdef725dc87.png",
    },
    {
      reward: "摩拉 ×8000",
      category: "通用货币",
      emoji: "🪙",
      platform: "米游社",
      account: "原神 - 星流",
      source: "official",
      icon: "./assets/icons_bundle/摩拉_×8000_0fac073e05820435.png",
    },
    {
      reward: "星琼 ×20",
      category: "抽卡资源",
      emoji: "💠",
      platform: "米游社",
      account: "星铁 - siin",
      source: "official",
      icon: "./assets/icons_bundle/星琼_×20_c5b3bd3c20284f86.png",
    },
  ],
  history: [
    {
      ts: "2026-09-21 08:52",
      platform: "库街区",
      game_name: "鸣潮",
      account: "",
      status: "already",
      reward: "中级密音筒",
    },
    {
      ts: "2026-09-21 08:52",
      platform: "库街区",
      game_name: "战双帕弥什",
      account: "",
      status: "already",
      reward: "武器强化素材Ⅳ",
    },
    {
      ts: "2026-09-21 08:52",
      platform: "米游社",
      game_name: "原神",
      account: "原神 - 星流",
      status: "already",
      reward: "摩拉 ×8000",
    },
    {
      ts: "2026-09-21 08:52",
      platform: "米游社",
      game_name: "星穹铁道",
      account: "星铁 - siin",
      status: "already",
      reward: "星琼 ×20",
    },
  ],
  series: [0, 0, 0, 20, 100, 100, 100],
  log:
    "[已签] 鸣潮: 今天已签到 · 中级密音筒\n" +
    "[已签] 战双帕弥什: 今天已签到 · 武器强化素材Ⅳ\n" +
    "[已签] 原神: 今天已签到 · 摩拉 ×8000\n" +
    "[已签] 星穹铁道: 今天已签到 · 星琼 ×20",
};

createApp({
  setup() {
    const tab = ref("home");
    const busy = ref(false);
    const offline = ref(false);
    const message = ref("");
    const messageKind = ref("");
    const overview = ref({ signed: 0, missed: 0, total: 0, rate: 0, day: "" });
    const platforms = ref([]);
    const rewards = ref([]);
    const history = ref([]);
    const series = ref([]);
    const logText = ref("");
    const tokenInfo = ref({ kuro_status: "unknown", kuro_detail: "未检测" });

    function applyTokenInfo(info) {
      if (info && typeof info === "object") tokenInfo.value = { ...tokenInfo.value, ...info };
    }

    async function refreshTokenStatus() {
      // Local API first
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          applyTokenInfo({
            kuro_status: data.kuro_status || "unknown",
            kuro_detail: data.kuro_detail || (data.output || "").split("\n")[0] || "",
            source: "api",
          });
          return;
        }
      } catch (_) {}
      // Snapshot field
      try {
        const res = await fetch("data/overview.json", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          applyTokenInfo(data.token || { kuro_status: "snapshot", kuro_detail: "见签到快照" });
        }
      } catch (_) {}
    }

    async function kuroSync() {
      message.value = "";
      try {
        const res = await fetch("/api/kuro/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await res.json();
        message.value = data.message || data.action || "同步完成";
        messageKind.value = data.ok === false ? "bad" : "ok";
        applyTokenInfo(data.token || {});
        await refresh();
      } catch (e) {
        message.value =
          "远程无法读取本机浏览器：请在本地 EXE/客户端点「同步浏览器 token」，或打开库街区登录。";
        messageKind.value = "warn";
        window.open("https://www.kurobbs.com/", "_blank");
      }
    }

    function openKuroLogin() {
      window.open("https://www.kurobbs.com/", "_blank");
      message.value = "请在浏览器登录 www.kurobbs.com，再点「同步浏览器 token」";
      messageKind.value = "ok";
    }

    const rateClass = computed(() => {
      const r = overview.value.rate;
      if (r >= 99) return "ok";
      if (r > 0) return "warn";
      return "muted";
    });

    function statusText(s) {
      return (
        {
          success: "成功",
          already: "已签",
          error: "失败",
          expired: "过期",
          skip: "跳过",
          info: "信息",
        }[s] || s
      );
    }
    function statusTone(s) {
      if (s === "success" || s === "already") return "ok";
      if (s === "error" || s === "expired") return "bad";
      return "";
    }

    function applyPayload(data, isOffline) {
      offline.value = !!isOffline;
      overview.value = {
        signed: data.signed ?? 0,
        missed: data.missed ?? 0,
        total: data.total ?? 0,
        rate: data.rate ?? 0,
        day: data.day || "",
      };
      platforms.value = data.platforms || [];
      rewards.value = data.rewards || [];
      history.value = data.history || [];
      series.value = data.series || [];
      logText.value = data.log || "";
      nextTick(drawChart);
    }

    async function refresh() {
      // 1) local static snapshot (GitHub Pages / file preview)
      for (const url of ["./data/overview.json", "data/overview.json", "/data/overview.json"]) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data && (data.total || data.history || data.rewards)) {
              applyPayload(data, false);
              message.value = "已加载签到快照 " + (data.generated_at || "");
              messageKind.value = "ok";
              return;
            }
          }
        } catch (_) {}
      }
      // 2) local Express API
      try {
        const res = await fetch("/api/overview", { cache: "no-store" });
        if (!res.ok) throw new Error("http " + res.status);
        const data = await res.json();
        applyPayload(data, false);
        message.value = "已同步最新签到数据";
        messageKind.value = "ok";
      } catch (e) {
        applyPayload(DEMO, true);
        message.value = "";
      }
    }

    async function runCheckin(mode) {
      busy.value = true;
      message.value = "";
      // Prefer local API (desktop server)
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });
        if (res.ok) {
          const data = await res.json();
          message.value = data.message || "签到完成";
          messageKind.value = data.ok === false ? "bad" : "ok";
          await refresh();
          return;
        }
      } catch (_) {}

      // Remote: GitHub Actions workflow_dispatch
      const token =
        localStorage.getItem("GH_TOKEN") ||
        window.DAILYCHECKIN_GH_TOKEN ||
        "";
      const repo = localStorage.getItem("GH_REPO") || "gitlafc/DailyCheckin";
      if (!token) {
        message.value =
          "远程手动签到需要 GitHub Token：点「设置 Token」，或到 Actions 页面手动 Run workflow。";
        messageKind.value = "warn";
        busy.value = false;
        window.open(
          "https://github.com/gitlafc/DailyCheckin/actions/workflows/daily-checkin.yml",
          "_blank"
        );
        return;
      }
      try {
        const res = await fetch(
          `https://api.github.com/repos/${repo}/actions/workflows/daily-checkin.yml/dispatches`,
          {
            method: "POST",
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${token}`,
              "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({ ref: "main" }),
          }
        );
        if (!res.ok) {
          const t = await res.text();
          throw new Error("GitHub API " + res.status + " " + t.slice(0, 120));
        }
        message.value =
          "已触发 GitHub Actions 签到（约 1–2 分钟后刷新页面查看结果）";
        messageKind.value = "ok";
      } catch (e) {
        message.value = "触发失败：" + (e.message || e);
        messageKind.value = "bad";
      } finally {
        busy.value = false;
      }
    }

    function setupToken() {
      const token = prompt(
        "粘贴 GitHub Personal Access Token（仅存本机浏览器，需 actions:write）",
        localStorage.getItem("GH_TOKEN") || ""
      );
      if (token) {
        localStorage.setItem("GH_TOKEN", token.trim());
        message.value = "Token 已保存在浏览器本地";
        messageKind.value = "ok";
      }
    }

    function drawChart() {
      const canvas = document.getElementById("dash");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = (canvas.width = canvas.clientWidth * 2);
      const h = (canvas.height = 320);
      ctx.clearRect(0, 0, w, h);
      ctx.scale(1, 1);
      const dprFix = 1;
      const signed = overview.value.signed || 0;
      const missed = overview.value.missed || 0;
      const total = overview.value.total || 0;
      const rate = overview.value.rate || 0;

      // donut
      const cx = 160 * dprFix;
      const cy = 140;
      const r = 78;
      ctx.lineWidth = 2;
      ctx.font = "24px Microsoft YaHei";
      ctx.fillStyle = "#93a4c7";
      ctx.fillText("完成分布", 80, 36);

      const denom = Math.max(signed + missed, 1);
      if (total <= 0) {
        ctx.strokeStyle = "#27354f";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const extent = (signed / denom) * Math.PI * 2;
        if (signed > 0) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + extent);
          ctx.closePath();
          ctx.fillStyle = "#2dd4a8";
          ctx.fill();
        }
        if (missed > 0) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, -Math.PI / 2 + extent, Math.PI * 1.5);
          ctx.closePath();
          ctx.fillStyle = "#ff6b7a";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.58, 0, Math.PI * 2);
        ctx.fillStyle = "#0e1628";
        ctx.fill();
        ctx.fillStyle = "#f4f7ff";
        ctx.font = "bold 32px Microsoft YaHei";
        ctx.textAlign = "center";
        ctx.fillText(Math.round(rate) + "%", cx, cy + 8);
        ctx.font = "20px Microsoft YaHei";
        ctx.fillStyle = "#5e7195";
        ctx.fillText("完成率", cx, cy + 36);
        ctx.textAlign = "left";
      }

      // platform bars
      const bx = 320;
      ctx.fillStyle = "#93a4c7";
      ctx.font = "24px Microsoft YaHei";
      ctx.fillText("按平台", bx, 36);
      const rows = platforms.value.map((p) => {
        // parse "全部完成 3/3" or "成功 2 · 失败 1" roughly from detail numbers
        const m = /(\d+)\s*\/\s*(\d+)/.exec(p.status || "");
        if (m) return { name: p.name, ok: +m[1], total: +m[2], color: p.color };
        return { name: p.name, ok: signed, total: Math.max(total, 1), color: p.color };
      });
      rows.forEach((row, i) => {
        const y = 78 + i * 48;
        ctx.fillStyle = "#f4f7ff";
        ctx.font = "22px Microsoft YaHei";
        ctx.fillText(row.name, bx, y);
        const x0 = bx + 120;
        const bw = 360;
        ctx.fillStyle = "#18223a";
        ctx.fillRect(x0, y - 20, bw, 24);
        ctx.strokeStyle = "#27354f";
        ctx.strokeRect(x0, y - 20, bw, 24);
        const fill = (bw * row.ok) / Math.max(row.total, 1);
        ctx.fillStyle = "#2dd4a8";
        ctx.fillRect(x0, y - 20, fill, 24);
        ctx.fillStyle = "#93a4c7";
        ctx.font = "20px Microsoft YaHei";
        ctx.fillText(row.ok + "/" + row.total, x0 + bw + 16, y);
      });

      // trend
      const ty = 230;
      ctx.fillStyle = "#93a4c7";
      ctx.font = "20px Microsoft YaHei";
      ctx.fillText("近7日完成率", bx, ty);
      const ser = series.value.length ? series.value : [rate];
      const n = ser.length;
      const step = Math.max(360 / Math.max(n - 1, 1), 20);
      ctx.beginPath();
      ser.forEach((v, i) => {
        const x = bx + i * step;
        const y = ty + 60 - (v / 100) * 50;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#4c7dff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ser.forEach((v, i) => {
        const x = bx + i * step;
        const y = ty + 60 - (v / 100) * 50;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#2dd4a8";
        ctx.fill();
      });
    }

    onMounted(() => {
      refresh();
      refreshTokenStatus();
      window.addEventListener("resize", () => nextTick(drawChart));
    });

    return {
      tab,
      busy,
      offline,
      message,
      messageKind,
      overview,
      platforms,
      rewards,
      history,
      series,
      logText,
      tokenInfo,
      rateClass,
      statusText,
      statusTone,
      refresh,
      runCheckin,
      setupToken,
      kuroSync,
      openKuroLogin,
      refreshTokenStatus,
    };
  },
}).mount("#app");
