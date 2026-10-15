"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __decorateClass = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
    for (var i = decorators.length - 1, decorator; i >= 0; i--)
      if (decorator = decorators[i])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp(target, key, result);
    return result;
  };

  // src/rules/daily-tasks.ts
  var DAY = 864e5;
  var OFFSET = 8 * 36e5;
  var dailyDay = (now) => Math.floor((now + OFFSET) / DAY);
  var DAILY_TASKS = [
    { key: "work", title: "今日首条创作", description: "今天完成并领取1条作品结算。", target: 1, coins: 20, points: 0 },
    { key: "topics", title: "换个题材试试", description: "今天完成并结算2种不同题材的作品。", target: 2, coins: 0, points: 1 },
    { key: "cuts", title: "点亮三段高光", description: "今天有效加入3段高光剪辑；同一作品的同一片段只计一次。", target: 3, coins: 20, points: 0 }
  ];
  var progress = (d, key) => key === "work" ? d.works : key === "topics" ? d.topics.length : d.cuts;
  function ensureDaily(s, now = Date.now()) {
    const day = dailyDay(now);
    let d = s.tasks.daily;
    if (!d || d.version !== 1 || !Number.isSafeInteger(d.day) || d.day < 0) {
      d = s.tasks.daily = { version: 1, day, works: 0, topics: [], cuts: 0, claimed: [], pending: { coins: 0, points: 0, count: 0 } };
    }
    for (const key of ["works", "cuts"]) d[key] = Number.isSafeInteger(d[key]) && d[key] >= 0 ? d[key] : 0;
    d.topics = [...new Set((Array.isArray(d.topics) ? d.topics : []).filter((x) => ["cat", "pose", "dance"].includes(x)))];
    d.claimed = [...new Set((Array.isArray(d.claimed) ? d.claimed : []).filter((x) => DAILY_TASKS.some((t) => t.key === x)))];
    if (!d.pending || typeof d.pending !== "object" || Array.isArray(d.pending)) d.pending = {};
    for (const k of ["coins", "points", "count"]) d.pending[k] = Number.isSafeInteger(d.pending[k]) && d.pending[k] >= 0 ? d.pending[k] : 0;
    if (day > d.day) {
      for (const t of DAILY_TASKS) if (!d.claimed.includes(t.key) && progress(d, t.key) >= t.target) {
        d.pending.coins += t.coins;
        d.pending.points += t.points;
        d.pending.count++;
      }
      d = s.tasks.daily = { version: 1, day, works: 0, topics: [], cuts: 0, claimed: [], pending: d.pending };
    }
    return d;
  }
  function recordDaily(s, kind, topic, now = Date.now()) {
    const d = ensureDaily(s, now);
    if (!s.works.length) return;
    if (kind === "cut") d.cuts = Math.min(3, d.cuts + 1);
    if (kind === "work") {
      d.works = Math.min(1, d.works + 1);
      if (topic && !d.topics.includes(topic)) d.topics.push(topic);
    }
  }
  function dailyList(s, now = Date.now()) {
    const d = ensureDaily(s, now);
    return DAILY_TASKS.map((t) => ({
      ...t,
      id: `daily_${d.day}_${t.key}`,
      group: "daily",
      action: "phone",
      current: progress(d, t.key),
      status: !s.works.length ? "locked" : d.claimed.includes(t.key) ? "claimed" : progress(d, t.key) >= t.target ? "ready" : "progress",
      complete: progress(d, t.key) >= t.target
    }));
  }
  function dailyMeta(s, now = Date.now()) {
    const d = ensureDaily(s, now);
    return { date: new Date(d.day * DAY).toISOString().slice(0, 10), next: (d.day + 1) * DAY - OFFSET, pending: { ...d.pending }, unlocked: s.works.length > 0 };
  }

  // src/rules/tasks.ts
  var MILESTONES = [
    [100, "100", "萌新博主", 50, 1],
    [1e3, "1,000", "小透明UP", 100, 2],
    [1e4, "1万", "潜力新人", 200, 3],
    [1e5, "10万", "人气博主", 400, 4],
    [1e6, "100万", "百万大V", 800, 5],
    [1e7, "1,000万", "顶流博主", 1600, 6],
    [1e8, "1亿", "超级巨星", 3200, 8],
    [5e8, "5亿", "全球传奇", 5e3, 10],
    [1e9, "10亿", "世界级顶流", 1e4, 12]
  ];
  function migrateTasks(s) {
    const valid = /* @__PURE__ */ new Set(["first", "upgrade", "lamp", "topic", "score", "works", "support_100", "support_1000", "use_tripod", "use_room1", "use_mic", "use_computer", "use_room2", "use_camera", ...MILESTONES.map((m) => "fan_" + m[0])]);
    if (!s.tasks || s.tasks.version !== 1) {
      const spent = Math.max(0, s.works.length * 2 - s.points);
      s.tasks = { version: 1, claimed: [], manualUpgrades: spent };
    }
    s.tasks.claimed = [...new Set((Array.isArray(s.tasks.claimed) ? s.tasks.claimed : []).filter((id) => valid.has(id)))];
    s.tasks.manualUpgrades = Number.isFinite(s.tasks.manualUpgrades) ? Math.max(0, s.tasks.manualUpgrades) : 0;
    if (s.works.length && !s.tasks.claimed.includes("first")) s.tasks.claimed.push("first");
    return s.tasks;
  }
  function taskList(s, now = Date.now()) {
    const claimed = new Set(s.tasks.claimed), works = s.works;
    const make = (id, title, description, current, target, coins, points, action, group = "growth", extra = {}) => ({
      id,
      title,
      description,
      current,
      target,
      coins,
      points,
      action,
      group,
      ...extra,
      status: claimed.has(id) ? "claimed" : current >= target ? "ready" : "progress",
      complete: current >= target
    });
    const growth = [
      make("first", "完成首条创作", "拍摄、剪辑、发布，推流结束后领取作品结算。", works.length, 1, 120, 0, "phone", "growth", { workReward: true }),
      make("upgrade", "提升一项能力", "前往成长，手动升级任意属性一次。", s.tasks.manualUpgrades, 1, 0, 1, "growth"),
      make("lamp", "点亮创作角落", "购买第一盏补光灯，提升未来作品质量。", s.lamp ? 1 : 0, 1, 30, 0, "equipment"),
      make("topic", "尝试新题材", "完成两种不同题材的作品并领取结算。", new Set(works.map((w) => w.topicId).filter(Boolean)).size, 2, 0, 2, "phone"),
      make("score", "找到拍摄节奏", "任意已结算作品的拍摄评分达到80分。", works.reduce((best, w) => Math.max(best, Number(w.shot) || 0), 0), 80, 30, 0, "phone"),
      make("works", "坚持更新", "累计完成并结算3条作品。", works.length, 3, 0, 2, "phone")
    ];
    const usedGear = (id) => works.some((w) => w.inputs?.gear?.[id]) ? 1 : 0;
    const usedRoom = (tier) => works.some((w) => w.inputs?.roomTier >= tier) ? 1 : 0;
    const lessons = [
      [100, "support_100", "百粉创作补助", "达到100粉丝，领取布置创作间的启动资金。", s.fans, 100, 200, 0, "equipment"],
      [100, "use_tripod", "稳稳拍出下一条", "购买三脚架，用它完成并结算1条作品。", usedGear("tripod"), 1, 30, 0, "equipment"],
      [100, "use_room1", "在新房间开拍", "升级温馨创作间，在新环境完成并结算1条作品。", usedRoom(1), 1, 0, 2, "equipment"],
      [1e3, "support_1000", "千粉设备补助", "达到1000粉丝，领取专业创作设备补助。", s.fans, 1e3, 500, 0, "equipment"],
      [1e3, "use_mic", "让声音更清晰", "购买麦克风，用它完成并结算1条作品。", usedGear("mic"), 1, 40, 0, "equipment"],
      [1e3, "use_computer", "剪辑效率升级", "购买剪辑笔记本，用它完成并结算1条作品。", usedGear("computer"), 1, 0, 2, "equipment"],
      [1e3, "use_room2", "我的专业工作室", "升级专业工作室，在新环境完成并结算1条作品。", usedRoom(2), 1, 0, 3, "equipment"],
      [1e4, "use_camera", "用高清记录成长", "购买高清相机，用它完成并结算1条作品。", usedGear("camera"), 1, 0, 3, "equipment"]
    ];
    for (const [gate, ...args] of lessons) if (s.fans >= gate || claimed.has(args[0])) growth.push(make(...args));
    const milestones = MILESTONES.map(([target, label, rank, coins, points]) => make(
      "fan_" + target,
      "冲刺 " + label + " 粉丝",
      target === 100 ? "解锁三脚架、温馨创作间和200钱币创作补助。" : target === 1e3 ? "解锁麦克风、剪辑笔记本、专业工作室和500钱币设备补助；新作品开放播放收入。" : target === 1e4 ? "解锁高清创作相机。" : target === 1e9 ? "达成世界级顶流，获得顶流纪念徽章。" : "达成称号：" + rank + "。",
      s.fans,
      target,
      coins,
      points,
      "phone",
      "milestones",
      { rank, badge: target === 1e9 }
    ));
    const hundred = milestones[0];
    growth.push({ ...hundred, title: "收获第一批关注", description: "收获100粉丝，领取首个粉丝里程碑奖励。", group: "growth", linked: true });
    return { growth, milestones, daily: dailyList(s, now) };
  }
  var TASK_DISPLAY_PRIORITY = { progress: 0, ready: 1, locked: 2, claimed: 3 };
  function sortTasksForDisplay(items) {
    return [...items].sort((a, b) => (TASK_DISPLAY_PRIORITY[a.status] ?? 4) - (TASK_DISPLAY_PRIORITY[b.status] ?? 4));
  }
  function recommendedTask(s, now = Date.now()) {
    const { growth, milestones, daily } = taskList(s, now), all = [...growth, ...milestones, ...daily];
    return all.find((t) => t.status === "ready") || growth.find((t) => t.status === "progress") || daily.find((t) => t.status === "progress") || milestones.find((t) => t.status === "progress") || null;
  }
  function rankTitle(s) {
    return [...MILESTONES].reverse().find((m) => s.fans >= m[0])?.[2] || "新人博主";
  }

  // src/rules/studio.ts
  var EQUIPMENT = [
    { id: "lamp", name: "二手补光灯", price: 99, fans: 0, icon: "bulb", benefit: "未来作品质量 +10%", effect: "照亮下一条作品", x: 0.75, y: 0.39 },
    { id: "tripod", name: "稳定三脚架", price: 149, fans: 100, icon: "equipment", benefit: "内容质量 +3", effect: "拍摄更稳定", x: 0.72, y: 0.59 },
    { id: "mic", name: "桌面麦克风", price: 199, fans: 1e3, icon: "chat", benefit: "完播表现 +4", effect: "让声音更清楚", x: 0.92, y: 0.49 },
    { id: "computer", name: "剪辑笔记本", price: 399, fans: 1e3, icon: "film", benefit: "剪辑耗时缩短15%", effect: "更快剪出高光", x: 0.68, y: 0.48 },
    { id: "camera", name: "高清创作相机", price: 1299, fans: 1e4, icon: "equipment", benefit: "播放增长 +15%", effect: "吸引更多观众", x: 0.9, y: 0.56 }
  ];
  var ROOMS = [
    { tier: 0, name: "起步出租屋", price: 0, fans: 0, quality: 0, editFactor: 1, art: "room-interior-v103.webp" },
    { tier: 1, name: "温馨创作间", price: 249, fans: 100, quality: 2, editFactor: 0.95, art: "room-cozy-v130.webp" },
    { tier: 2, name: "专业工作室", price: 999, fans: 1e3, quality: 4, editFactor: 0.9, art: "room-studio-v130.webp" }
  ];
  var STAGE_UNLOCKS = { 100: "稳定三脚架、温馨创作间；200钱币创作补助", 1e3: "桌面麦克风、剪辑笔记本、专业工作室；500钱币设备补助", 1e4: "高清创作相机" };
  function migrateStudio(s) {
    const old = s.studio;
    if (!old || old.version !== 1) s.studio = { version: 1, tier: 0, gear: {}, celebrations: [] };
    const st = s.studio;
    st.tier = Number.isInteger(st.tier) ? Math.max(0, Math.min(2, st.tier)) : 0;
    if (!st.gear || typeof st.gear !== "object" || Array.isArray(st.gear)) st.gear = {};
    const lamp = !!s.lamp || st.gear.lamp === true;
    st.gear = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.id === "lamp" ? lamp : st.gear[e.id] === true]));
    s.lamp = lamp;
    st.celebrations = [...new Set((Array.isArray(st.celebrations) ? st.celebrations : []).filter((n) => Number.isSafeInteger(n) && n >= 100 && n <= s.fans))];
    return st;
  }
  function studioBenefits(s) {
    const room = ROOMS[s.studio.tier], gear = s.studio.gear;
    return { quality: room.quality + (gear.tripod ? 3 : 0), editFactor: room.editFactor * (gear.computer ? 0.85 : 1), completion: gear.mic ? 4 : 0, viewsFactor: gear.camera ? 1.15 : 1 };
  }

  // src/rules/creator-engine.ts
  var SAVE_KEY = "creator-simulator-ftue-v10";
  var clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  var STAT_LABELS = { sense: "网感", luck: "幸运", filming: "拍摄", editing: "剪辑", trend: "热点敏感", persistence: "坚持" };
  var FAN_QUESTS = MILESTONES.map((m) => [m[0], "冲刺 " + m[1] + " 粉丝"]);
  var TOPICS = [
    { id: "cat", title: "小博主的第一支舞", tag: "表情舞蹈", heat: 0 },
    { id: "pose", title: "表情包挑战", tag: "表情演绎", heat: 4 },
    { id: "dance", title: "星奇摇挑战", tag: "热门舞蹈", heat: 8 }
  ];
  function initial(seed = Math.floor(Math.random() * 4294967295)) {
    return {
      version: 1,
      seed: seed >>> 0,
      fans: 0,
      wallet: 100,
      views: 0,
      points: 0,
      lamp: false,
      stats: { sense: 1, luck: 1, filming: 1, editing: 1, trend: 1, persistence: 1 },
      works: [],
      active: null,
      grantClaimed: false
    };
  }
  function random(seed, id, round, channel) {
    let h = 2166136261;
    for (const c of `${seed}:${id}:${round}:${channel}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  }
  var CreatorGame = class _CreatorGame {
    constructor(state = initial(), storage = null, clock = Date.now) {
      this.clock = clock;
      this.s = state;
      this.storage = storage;
      this.storageFailed = false;
      migrateStudio(this.s);
      migrateTasks(this.s);
      ensureDaily(this.s, this.clock());
    }
    static load(storage, clock = Date.now) {
      try {
        const s = JSON.parse(storage.getItem(SAVE_KEY) || "null");
        if (s?.version === 1 && Array.isArray(s.works) && s.stats && Object.keys(STAT_LABELS).every((k) => Number.isFinite(s.stats[k]) && s.stats[k] >= 1) && ["fans", "wallet", "views", "points"].every((k) => Number.isFinite(s[k]) && s[k] >= 0) && (!s.active || ["shoot", "edit", "ready", "live", "ended"].includes(s.active.phase))) {
          const g = new _CreatorGame(s, storage, clock);
          g.tick(Date.now());
          return g;
        }
      } catch {
      }
      return new _CreatorGame(initial(), storage, clock);
    }
    save() {
      try {
        this.storage?.setItem(SAVE_KEY, JSON.stringify(this.s));
        this.storageFailed = false;
      } catch {
        this.storageFailed = true;
      }
    }
    get room() {
      return ROOMS[this.s.studio.tier];
    }
    get benefits() {
      return studioBenefits(this.s);
    }
    get first() {
      return this.s.works.length === 0;
    }
    get unlocked() {
      return this.s.works.length > 0;
    }
    syncDaily() {
      const old = this.s.tasks.daily;
      ensureDaily(this.s, this.clock());
      if (old !== this.s.tasks.daily) {
        this.save();
        return true;
      }
      return false;
    }
    get daily() {
      return dailyMeta(this.s, this.clock());
    }
    get tasks() {
      this.syncDaily();
      return taskList(this.s, this.clock());
    }
    get title() {
      return rankTitle(this.s);
    }
    get quest() {
      this.syncDaily();
      const bank = this.daily.pending;
      if (bank.count) return { id: "daily_pending", title: "领取往日每日奖励", status: "ready", current: 1, target: 1, coins: bank.coins, points: bank.points };
      return recommendedTask(this.s, this.clock());
    }
    get readyTaskCount() {
      const tasks = this.tasks;
      return new Set([...tasks.growth, ...tasks.milestones, ...tasks.daily].filter((t) => t.status === "ready").map((t) => t.id)).size + this.daily.pending.count;
    }
    claimTasks(id = "all") {
      if (this.s.active) return false;
      const tasks = this.tasks, all = [...tasks.growth, ...tasks.milestones, ...tasks.daily], pending = this.daily.pending;
      const bank = (id === "all" || id === "daily_pending") && pending.count > 0;
      const ready = [...new Map(all.filter((t) => t.status === "ready" && !t.workReward && (id === "all" || t.id === id)).map((t) => [t.id, t])).values()];
      if (!ready.length && !bank) return false;
      const reward = { coins: bank ? pending.coins : 0, points: bank ? pending.points : 0, count: ready.length + (bank ? pending.count : 0), badge: false };
      if (bank) this.s.tasks.daily.pending = { coins: 0, points: 0, count: 0 };
      for (const t of ready) {
        if (t.group === "daily") this.s.tasks.daily.claimed.push(t.key);
        else this.s.tasks.claimed.push(t.id);
        reward.coins += t.coins;
        reward.points += t.points;
        reward.badge || (reward.badge = !!t.badge);
      }
      this.s.wallet += reward.coins;
      this.s.points += reward.points;
      this.save();
      return reward;
    }
    start(topicId = "cat") {
      if (this.s.active) return false;
      const topic = this.first ? TOPICS[0] : TOPICS.find((t) => t.id === topicId) || TOPICS[0];
      this.s.active = {
        id: this.s.works.length + 1,
        topicId: topic.id,
        title: topic.title,
        phase: "shoot",
        x: 0,
        y: 0,
        shootAt: 0,
        shootTaps: 0,
        shootLast: 0,
        shootSmooth: 0,
        shot: 0,
        taps: 0,
        cuts: [],
        remaining: 1e4,
        editAt: 0,
        views: 0,
        likes: 0,
        comments: 0,
        fans: 0,
        round: 0,
        tier: 0,
        event: "测试流量",
        history: [],
        claimed: false
      };
      this.save();
      return true;
    }
    move(dx, dy) {
      const v = this.s.active;
      if (v?.phase !== "shoot") return false;
      v.x = clamp(v.x + dx, -130, 130);
      v.y = clamp(v.y + dy, -100, 100);
      this.save();
      return true;
    }
    beginShoot(now = Date.now()) {
      const v = this.s.active;
      if (v?.phase !== "shoot" || v.shootAt) return false;
      v.shootAt = now;
      v.shootTaps = 0;
      v.shootSmooth = 0;
      v.shootLast = 0;
      this.save();
      return true;
    }
    shootTap(now = Date.now()) {
      const v = this.s.active;
      if (v?.phase !== "shoot" || !v.shootAt) return false;
      if (now - v.shootAt >= 7e3) {
        this.capture(v.shootAt + 7e3);
        return false;
      }
      if (now < v.shootAt || now < v.shootLast) return false;
      const gap = v.shootLast ? now - v.shootLast : 0;
      if (gap > 0 && gap <= 350) v.shootSmooth++;
      v.shootTaps++;
      v.shootLast = now;
      this.save();
      return true;
    }
    shootScore() {
      const v = this.s.active;
      if (!v) return 0;
      return Math.round(clamp(20 + Math.min(60, (v.shootTaps || 0) * 1.5) + Math.min(20, (v.shootSmooth || 0) * 0.5), 20, 100));
    }
    capture(now = Date.now()) {
      const v = this.s.active;
      if (v?.phase !== "shoot" || !v.shootAt || now - v.shootAt < 7e3) return false;
      v.shot = this.shootScore();
      v.phase = "edit";
      v.editAt = now;
      v.remaining = this.first ? 1e4 : Math.max(2500, 1e4 / (1 + 0.06 * (this.s.stats.editing - 1)) * this.benefits.editFactor);
      v.editTotal = v.remaining;
      this.save();
      return true;
    }
    tick(now = Date.now()) {
      const v = this.s.active;
      if (v?.phase === "shoot") {
        if (v.shootAt && now - v.shootAt >= 7e3) {
          this.capture(v.shootAt + 7e3);
          this.tick(now);
          return true;
        }
        return false;
      }
      if (v?.phase !== "edit") return false;
      const elapsed = Math.max(0, now - v.editAt);
      v.remaining = Math.max(0, v.remaining - elapsed);
      v.editAt = now;
      if (v.remaining === 0) v.phase = "ready";
      this.save();
      return v.phase === "ready";
    }
    edit(kind = "tap", now = Date.now()) {
      this.tick(now);
      const v = this.s.active;
      if (v?.phase !== "edit") return false;
      if (kind !== "tap" && (!["open", "highlight", "end"].includes(kind) || v.cuts.includes(kind))) return false;
      if (kind !== "tap") {
        v.cuts.push(kind);
        recordDaily(this.s, "cut", null, this.clock());
      }
      v.taps++;
      v.remaining = Math.max(0, v.remaining - (kind === "tap" ? 550 : 1800) * (1 + 0.025 * (this.s.stats.editing - 1)));
      if (v.remaining === 0) v.phase = "ready";
      this.save();
      return true;
    }
    publish() {
      const v = this.s.active;
      if (v?.phase !== "ready") return false;
      const s = this.s, t = TOPICS.find((t2) => t2.id === v.topicId);
      v.inputs = { ...s.stats, lamp: s.lamp, audience: s.fans, first: this.first, heat: t.heat, gear: { ...s.studio.gear }, roomTier: s.studio.tier, benefits: { ...this.benefits } };
      v.quality = Math.round(clamp((28 + v.shot * 0.4 + v.cuts.length * 5 + Math.min(12, (s.stats.filming - 1) * 1.2) + v.inputs.benefits.quality) * (s.lamp ? 1.1 : 1), 15, 100));
      v.completion = Math.round(clamp(35 + v.quality * 0.4 + v.cuts.length * 4 + v.inputs.benefits.completion, 0, 95));
      v.phase = "live";
      v.views = Math.round((180 + v.quality * 2) * v.inputs.benefits.viewsFactor);
      v.likes = Math.floor(v.views * 0.04);
      v.comments = Math.floor(v.views * 4e-3);
      v.fans = Math.max(1, Math.floor(v.views * 0.012));
      v.history.push({ round: 0, event: "测试流量", delta: v.views, target: v.views, tier: 0 });
      this.save();
      return true;
    }
    probabilities(v = this.s.active) {
      if (!v?.inputs) return null;
      const a = v.inputs, q = v.quality;
      const stop = clamp(0.055 + v.round * 0.025 + (v.round >= 5 ? 0.12 : 0), 0.055, 0.37);
      const sink = clamp(0.24 - (q - 40) * 4e-3 - (a.persistence - 1) * 8e-3, 0.025, 0.32);
      const viral = clamp(0.012 + (q - 50) * 6e-4 + (a.sense - 1) * 15e-4 + (a.luck - 1) * 2e-3 + (a.trend - 1) * 1e-3, 5e-3, 0.12);
      const boost = clamp(0.2 + (q - 50) * 4e-3 + (a.sense - 1) * 8e-3 + v.inputs.heat * 4e-3, 0.12, 0.46);
      const budget = 1 - stop - sink, factor = Math.min(1, budget / (viral + boost));
      return { stop, sink, viral: viral * factor, boost: boost * factor, hold: Math.max(0, budget - (viral + boost) * factor) };
    }
    refresh() {
      const v = this.s.active;
      if (v?.phase !== "live") return false;
      v.round++;
      let event, delta = 0;
      const r = random(this.s.seed, v.id, v.round, "event"), p = this.probabilities(v);
      if (v.inputs.first) event = ["维持", "推流", "维持", "停流"][Math.min(v.round - 1, 3)];
      else if (v.round >= 8) event = "停流";
      else if (r < p.stop) event = "停流";
      else if (r < p.stop + p.sink) event = "沉没";
      else if (r < p.stop + p.sink + p.viral) event = "爆火";
      else if (r < p.stop + p.sink + p.viral + p.boost) event = "推流";
      else event = "维持";
      const noise = random(this.s.seed, v.id, v.round, "gain");
      const maxTier = clamp(1 + Math.floor(Math.log10(1 + v.inputs.audience / 100)) + Math.floor((v.inputs.sense - 1) / 12), 1, 6);
      if (event === "爆火") v.tier = Math.min(maxTier, v.tier + 2);
      if (event === "推流") v.tier = Math.min(maxTier, v.tier + 1);
      if (["维持", "推流", "爆火"].includes(event)) {
        const scale = [1, 4, 18, 90, 500, 3e3, 15e3][v.tier];
        delta = Math.round((100 + v.quality * 3) * scale * (0.75 + noise * 0.5) * (event === "爆火" ? 2.4 : event === "推流" ? 1.25 : 0.3));
        if (v.inputs.first) delta = Math.round((event === "推流" ? 520 : 100) * (1 + v.quality / 150));
      }
      delta = Math.round(delta * (v.inputs.benefits?.viewsFactor || 1));
      v.views += delta;
      v.likes += Math.floor(delta * (0.025 + v.quality * 4e-4));
      v.comments += Math.floor(delta * 6e-3);
      v.fans += Math.floor(delta * (7e-3 + v.completion * 1e-4) * (1 + Math.min(0.8, (v.inputs.sense - 1) * 0.012)));
      v.event = event;
      v.history.push({ round: v.round, event, delta, target: v.views, tier: v.tier });
      if (event === "沉没" || event === "停流") {
        v.phase = "ended";
        v.reason = event === "沉没" ? "本轮测试未能获得更多推荐" : "这一轮推荐结束，准备下一条作品吧";
      }
      this.save();
      return event;
    }
    get reward() {
      const v = this.s.active;
      if (v?.phase !== "ended") return null;
      const income = v.inputs.audience >= 1e3 ? Math.floor(v.views * 3e-3) : 0;
      return { fans: v.fans, income, grant: this.s.grantClaimed ? 0 : 120, points: 2 };
    }
    claim() {
      const v = this.s.active, reward = this.reward;
      if (!reward || v.claimed) return false;
      v.claimed = true;
      const oldFans = this.s.fans;
      this.s.fans += reward.fans;
      for (const [target] of MILESTONES) if (oldFans < target && this.s.fans >= target && !this.s.studio.celebrations.includes(target)) this.s.studio.celebrations.push(target);
      this.s.wallet += reward.income + reward.grant;
      this.s.views += v.views;
      this.s.points += reward.points;
      this.s.grantClaimed = true;
      this.s.stats.filming = Math.min(50, this.s.stats.filming + 1);
      this.s.stats.editing = Math.min(50, this.s.stats.editing + 1);
      this.s.stats.persistence = Math.min(50, this.s.stats.persistence + 1);
      if (v.shot >= 85) this.s.stats.sense = Math.min(50, this.s.stats.sense + 1);
      recordDaily(this.s, "work", v.topicId, this.clock());
      this.s.works.push({ ...v, reward, phase: "done" });
      this.s.active = null;
      if (!this.s.tasks.claimed.includes("first")) this.s.tasks.claimed.push("first");
      this.save();
      return reward;
    }
    upgrade(stat) {
      if (this.s.active || !this.unlocked || !Object.prototype.hasOwnProperty.call(STAT_LABELS, stat) || this.s.points < 1 || this.s.stats[stat] >= 50) return false;
      this.s.stats[stat]++;
      this.s.points--;
      this.s.tasks.manualUpgrades++;
      this.save();
      return true;
    }
    buyLamp() {
      return this.buyEquipment("lamp");
    }
    buyEquipment(id) {
      const item = EQUIPMENT.find((e) => e.id === id), s = this.s;
      if (!item || s.active || !this.unlocked || s.studio.gear[id] || s.fans < item.fans || s.wallet < item.price) return false;
      s.wallet -= item.price;
      s.studio.gear[id] = true;
      if (id === "lamp") s.lamp = true;
      this.save();
      return true;
    }
    upgradeRoom() {
      const s = this.s, next = ROOMS[s.studio.tier + 1];
      if (!next || s.active || !this.unlocked || s.fans < next.fans || s.wallet < next.price) return false;
      s.wallet -= next.price;
      s.studio.tier = next.tier;
      this.save();
      return true;
    }
    dismissMilestones() {
      this.s.studio.celebrations = [];
      this.save();
    }
  };

  // src/Platform.ts
  var Platform = class {
    constructor() {
      this.storage = {
        getItem: (key) => Laya.LocalStorage.getItem(key),
        setItem: (key, value) => {
          Laya.LocalStorage.setItem(key, value);
          if (Laya.LocalStorage.getItem(key) !== value) throw new Error("Save not persisted");
        }
      };
      this.muted = false;
      this.owner = null;
      this.hidden = null;
      this.shown = null;
      this.onVisibility = () => {
        if (Laya.stage.isVisibility) this.shown?.();
        else this.hidden?.();
      };
    }
    sound(kind = "tap") {
      if (this.muted) return;
      Laya.SoundManager.playSound("resources/audio/" + kind + ".wav", 1);
    }
    mute() {
      this.muted = !this.muted;
      Laya.SoundManager.soundMuted = this.muted;
      return this.muted;
    }
    bindLifecycle(owner, hidden, shown) {
      this.owner = owner;
      this.hidden = hidden;
      this.shown = shown;
      Laya.stage.on(Laya.Event.BLUR, owner, hidden);
      Laya.stage.on(Laya.Event.FOCUS, owner, shown);
      Laya.stage.on(Laya.Event.VISIBILITY_CHANGE, owner, this.onVisibility);
    }
    destroy() {
      if (!this.owner) return;
      Laya.stage.off(Laya.Event.BLUR, this.owner, this.hidden);
      Laya.stage.off(Laya.Event.FOCUS, this.owner, this.shown);
      Laya.stage.off(Laya.Event.VISIBILITY_CHANGE, this.owner, this.onVisibility);
      this.owner = null;
      this.hidden = null;
      this.shown = null;
    }
  };

  // src/UI.ts
  var palette = { ink: "#594a3d", muted: "#88796b", cream: "#fff9ec", paper: "#f3ead7", green: "#55785b", light: "#e0e9d7", peach: "#ebc29e", line: "#ddceb6" };
  function box(parent, x, y, w, h, color = palette.cream, radius = 18, name = "") {
    const node = new Laya.Sprite();
    node.name = name;
    node.pos(x, y);
    node.size(w, h);
    node.graphics.drawRoundRect(0, 0, w, h, radius, radius, radius, radius, color);
    parent.addChild(node);
    return node;
  }
  function text(parent, value, x, y, w, size = 16, color = palette.ink, bold = false, h = 36) {
    const node = new Laya.Text();
    node.text = value;
    node.font = "sans-serif";
    node.fontSize = size;
    node.color = color;
    node.bold = bold;
    node.wordWrap = true;
    node.leading = 5;
    node.pos(x, y);
    node.size(w, h);
    node.mouseEnabled = false;
    parent.addChild(node);
    return node;
  }
  function button(parent, name, label, x, y, w, h, action, enabled = true, primary = true) {
    const node = box(parent, x, y, w, h, primary ? palette.green : palette.light, 15, name);
    const caption = text(node, label, 8, 0, w - 16, 15, primary ? "#fffaf0" : palette.ink, true, h);
    caption.align = "center";
    caption.valign = "middle";
    node.mouseEnabled = enabled;
    node.alpha = enabled ? 1 : 0.45;
    if (enabled) {
      let startX = 0, startY = 0;
      node.on(Laya.Event.MOUSE_DOWN, node, (e) => {
        startX = Laya.stage.mouseX;
        startY = Laya.stage.mouseY;
      });
      node.on(Laya.Event.CLICK, node, (e) => {
        e.stopPropagation();
        if (Math.hypot(Laya.stage.mouseX - startX, Laya.stage.mouseY - startY) < 14) action();
      });
    }
    return node;
  }
  function progress2(parent, x, y, w, ratio) {
    const node = box(parent, x, y, w, 8, palette.line, 4);
    node.graphics.drawRoundRect(0, 0, Math.max(0, Math.min(1, ratio)) * w, 8, 4, 4, 4, 4, palette.green);
    return node;
  }
  function image(parent, url, x, y, w, h, cover = false) {
    const texture = Laya.loader.getRes(url);
    const node = new Laya.Sprite();
    node.pos(x, y);
    node.size(w, h);
    node.mouseEnabled = false;
    if (texture) {
      const factor = cover ? Math.max(w / texture.width, h / texture.height) : Math.min(w / texture.width, h / texture.height);
      const tw = texture.width * factor, th = texture.height * factor;
      node.graphics.drawTexture(texture, (w - tw) / 2, (h - th) / 2, tw, th);
      node.scrollRect = new Laya.Rectangle(0, 0, w, h);
    }
    parent.addChild(node);
    return node;
  }
  function scroller(parent, y, height) {
    const panel = new Laya.Panel();
    panel.name = "scroll";
    panel.pos(16, y);
    panel.size(358, height);
    panel.scrollType = Laya.ScrollType.Vertical;
    panel.elasticEnabled = false;
    panel.vScrollBarSkin = "";
    parent.addChild(panel);
    return panel;
  }

  // src/CreatorApp.ts
  var num = (n) => n >= 1e8 ? (n / 1e8).toFixed(2) + "亿" : n >= 1e4 ? (n / 1e4).toFixed(2) + "万" : Math.floor(n).toLocaleString("zh-CN");
  var DESC = { sense: "提升推流与爆火概率", luck: "提高稀有爆火概率", filming: "提高作品基础质量", editing: "缩短剪辑并增强加速", trend: "提升热点作品爆火概率", persistence: "降低下一条的沉没概率" };
  var CreatorApp = class {
    constructor() {
      this.platform = new Platform();
      this.game = CreatorGame.load(this.platform.storage);
      this.root = new Laya.Sprite();
      this.toast = new Laya.Sprite();
      this.screen = this.phase();
      this.tab = "growth";
      this.labels = {};
      this.performer = null;
      this.frames = /* @__PURE__ */ new Map();
      this.lastFrame = -1;
      this.editAt = 0;
      this.phaseEnteredAt = Date.now();
      this.refreshAt = 0;
      this.checkAt = 0;
      this.suspended = false;
      this.positions = {};
      this.panel = null;
      this.drag = null;
      this.modal = false;
      this.destroyed = false;
      this.hide = () => {
        this.game.save();
        this.suspended = true;
        this.drag = null;
      };
      this.show = () => {
        if (this.destroyed) return;
        this.suspended = false;
        this.game.tick();
        if (this.game.s.active) this.screen = this.phase();
        this.game.syncDaily();
        this.render();
      };
      this.render = () => {
        if (this.destroyed) return;
        this.drag = null;
        this.modal = false;
        this.panel = null;
        this.labels = {};
        this.performer = null;
        this.lastFrame = -1;
        this.root.destroyChildren();
        this.root.size(390, this.h);
        this.root.x = (Laya.stage.width - 390) / 2;
        this.root.name = "creator-game:" + this.screen;
        box(this.root, 0, 0, 390, this.h, palette.paper, 0);
        if (this.screen === "room") this.room();
        else {
          this.header();
          if (["phone", "shoot", "edit", "ready", "live", "result"].includes(this.screen)) this.steps();
          else this.panelHeader();
          const views = { phone: this.phone, shoot: this.shoot, edit: this.editView, ready: this.ready, live: this.live, result: this.result, growth: this.growth, works: this.works, equipment: this.equipment, tasks: this.tasks };
          views[this.screen].call(this);
        }
        this.toast = new Laya.Sprite();
        this.toast.mouseEnabled = false;
        this.toast.zOrder = 200;
        this.root.addChild(this.toast);
        if (this.game.storageFailed) this.hint("进度未能保存，请检查设备存储空间");
        if (this.screen === "room" && this.game.s.studio.celebrations.length) this.promotion();
      };
    }
    get h() {
      return Laya.stage.height;
    }
    phase() {
      return this.game.s.active?.phase === "ended" ? "result" : this.game.s.active?.phase || "room";
    }
    async start() {
      Laya.stage.bgColor = palette.paper;
      this.root.name = "creator-game";
      Laya.stage.addChild(this.root);
      text(this.root, "正在整理你的创作间…", 40, 300, 310, 20, palette.ink, true);
      const art = ["room-interior-v103.webp", "room-interior-lamp-v103.webp", "room-cozy-v130.webp", "room-studio-v130.webp", "creator-avatar-v102.webp", "creator-dance-v105.webp", "creator-expressions-v105.webp", "creator-xingqiyao-v106.webp"];
      await Laya.loader.load(art.map((name) => "resources/" + name));
      if (this.destroyed) return;
      if (art.some((name) => !Laya.loader.getRes("resources/" + name))) throw new Error("Required creator art did not load");
      for (const [topic, file, count] of [["cat", art[5], 24], ["pose", art[6], 12], ["dance", art[7], 24]]) {
        const atlas = Laya.loader.getRes("resources/" + file);
        this.frames.set(topic, Array.from({ length: count }, (_, i) => Laya.Texture.create(atlas, i % 4 * 256, Math.floor(i / 4) * 352, 256, 352)));
      }
      this.game.tick();
      this.screen = this.phase();
      this.platform.bindLifecycle(this, this.hide, this.show);
      Laya.stage.on(Laya.Event.RESIZE, this, this.render);
      Laya.stage.on(Laya.Event.MOUSE_UP, this, this.endPull);
      Laya.stage.on(Laya.Event.KEY_DOWN, this, this.keyDown);
      Laya.timer.loop(50, this, this.tick);
      this.render();
    }
    keyDown(e) {
      if (!this.modal && (e.keyCode === 32 || e.keyCode === 13) && this.screen === "shoot") this.dance();
    }
    remember() {
      if (this.panel && !this.panel.destroyed) this.positions[this.screen + ":" + this.tab] = this.panel.vScrollBar?.value || 0;
    }
    go(screen) {
      this.remember();
      if (this.screen !== screen) this.phaseEnteredAt = Date.now();
      this.screen = screen;
      this.render();
    }
    header() {
      box(this.root, 12, 22, 366, 62, palette.cream, 19);
      image(this.root, "resources/creator-avatar-v102.webp", 20, 24, 40, 56);
      text(this.root, this.game.title, 66, 31, 158, 16, palette.ink, true);
      text(this.root, "第 " + (this.game.s.works.length + 1) + " 条创作", 66, 55, 158, 11, palette.muted);
      text(this.root, num(this.game.s.fans) + " 粉丝", 226, 31, 142, 14, palette.green, true);
      text(this.root, num(this.game.s.wallet) + " 钱币", 226, 55, 142, 12, palette.ink);
    }
    steps() {
      const current = { phone: 0, shoot: 1, edit: 2, ready: 3, live: 3, result: 4 }[this.screen] || 0;
      button(this.root, "home", "‹", 16, 96, 38, 42, () => this.home(), true, false);
      ["选题", "拍视频", "剪辑", "发布"].forEach((name, i) => {
        box(this.root, 62 + i * 78, 96, 72, 42, current === i ? palette.green : current > i ? palette.light : "#e7ddc9", 12);
        const label = text(this.root, (current > i ? "✓ " : "") + name, 62 + i * 78, 96, 72, 13, current === i ? palette.cream : palette.ink, current === i, 42);
        label.align = "center";
        label.valign = "middle";
      });
    }
    panelHeader() {
      button(this.root, "home", "‹", 16, 96, 42, 42, () => this.home(), true, false);
      text(this.root, { growth: "你的创作能力", works: "作品档案", equipment: "我的创作间", tasks: "成长手账" }[this.screen] || "", 72, 102, 280, 23, palette.ink, true);
    }
    home() {
      if (this.game.s.active) this.hint("先完成当前作品，进度会自动保存");
      else this.go("room");
    }
    room() {
      const s = this.game.s, url = "resources/" + (s.studio.tier ? this.game.room.art : s.lamp ? "room-interior-lamp-v103.webp" : "room-interior-v103.webp");
      image(this.root, url, 0, 0, 390, this.h, true);
      this.header();
      text(this.root, "顶流博主模拟器", 22, 100, 350, 25, palette.ink, true);
      text(this.root, this.game.room.name, 24, 137, 270, 13, palette.muted);
      const quest = this.game.quest;
      button(this.root, "tasks", (quest?.status === "ready" ? "✓ 可领奖  " : "当前任务  ") + (quest?.title || "继续刷新纪录"), 16, 165, 358, 58, () => this.go("tasks"), true, false);
      if (quest) text(this.root, quest.status === "ready" ? this.game.readyTaskCount + " 项奖励等待领取" : num(Math.min(quest.current, quest.target)) + " / " + num(quest.target), 30, 229, 320, 12);
      const texture = Laya.loader.getRes(url), scale = Math.max(390 / texture.width, this.h / texture.height);
      const x = (390 - texture.width * scale) / 2 + texture.width * scale * 0.835;
      const y = (this.h - texture.height * scale) / 2 + texture.height * scale * 0.463;
      for (const gear of EQUIPMENT.filter((e) => s.studio.gear[e.id] && e.id !== "lamp")) {
        const gx = (390 - texture.width * scale) / 2 + texture.width * scale * gear.x;
        const gy = (this.h - texture.height * scale) / 2 + texture.height * scale * gear.y;
        this.gear(this.root, gear.id, Math.max(12, Math.min(330, gx)), gy);
      }
      button(this.root, "phone", "拿起手机\n" + (this.game.unlocked ? "继续创作" : "点击开始"), Math.max(16, Math.min(266, x - 52)), y - 28, 108, 64, () => this.go("phone"));
      box(this.root, 16, this.h - 210, 358, 102, palette.cream, 22);
      image(this.root, "resources/creator-avatar-v102.webp", 24, this.h - 214, 65, 106);
      text(this.root, "小博主", 100, this.h - 198, 220, 12, palette.green, true);
      text(this.root, this.game.unlocked ? "下一条，一定会更精彩！" : "我的顶流之路，现在开始！", 100, this.h - 175, 258, 17, palette.ink, true);
      text(this.root, "拿起桌上的手机，记录生活吧。", 100, this.h - 143, 250, 12, palette.muted);
      if (this.game.unlocked) [["growth", "能力成长"], ["works", "作品 " + s.works.length], ["equipment", "创作间"]].forEach(([id, name], i) => button(this.root, id, name, 16 + i * 122, this.h - 91, 114, 58, () => this.go(id), true, false));
      else text(this.root, "完成首条作品后解锁：成长 · 作品 · 装备", 24, this.h - 75, 342, 13, palette.ink, true);
    }
    gear(parent, id, x, y) {
      const node = new Laya.Sprite();
      node.name = "gear:" + id;
      node.pos(x, y);
      parent.addChild(node);
      node.mouseEnabled = false;
      const g = node.graphics;
      if (id === "tripod") {
        g.drawLine(0, 4, -15, 43, "#615b50", 3);
        g.drawLine(0, 4, 15, 43, "#615b50", 3);
        g.drawLine(0, 4, 0, 43, "#615b50", 3);
        g.drawRect(-11, -8, 22, 15, "#7e8c7d");
      } else if (id === "mic") {
        g.drawRect(-2, 5, 4, 25, "#70645b");
        g.drawCircle(0, 2, 9, "#70645b");
        g.drawEllipse(-14, 27, 28, 6, "#70645b", null, 0);
      } else if (id === "computer") {
        g.drawRect(-23, -13, 46, 28, "#606b65");
        g.drawRect(-19, -9, 38, 20, "#b9d1c3");
        g.drawRect(-26, 15, 52, 5, "#8f9b91");
      } else if (id === "camera") {
        g.drawRect(-20, -6, 40, 25, "#545b53");
        g.drawCircle(0, 6, 10, "#adc9c2");
        g.drawCircle(0, 6, 5, "#566e6c");
      }
    }
    title(kicker, title, copy) {
      text(this.root, kicker, 24, 160, 340, 12, palette.green, true);
      text(this.root, title, 24, 185, 342, 22, palette.ink, true, 60);
      text(this.root, copy, 24, 240, 342, 13, palette.muted, false, 46);
    }
    phone() {
      this.title(this.game.first ? "新手挑战" : "创作准备", "想拍什么类型的视频？", this.game.first ? "先试试第一支舞，每次点击都让动作前进一步。" : "选择一个题材，把今天的灵感拍下来。");
      this.performer = new Laya.Sprite();
      this.root.addChild(this.performer);
      this.performer.pos(110, 292);
      this.paint(0, "cat", 170, 234);
      if (this.game.first) {
        text(this.root, "首次完成：120 钱币 ＋ 成长点", 32, this.h - 170, 326, 15, palette.green, true);
        button(this.root, "start:cat", "开始拍摄", 24, this.h - 104, 342, 60, () => this.startVideo("cat"));
      } else TOPICS.forEach((t, i) => {
        const b = button(this.root, "start:" + t.id, t.tag, 16 + i * 122, this.h - 169, 114, 91, () => this.startVideo(t.id), true, i === 2);
        text(b, t.heat ? "热度 +" + t.heat : "随心记录", 8, 64, 98, 11, i === 2 ? palette.cream : palette.muted).align = "center";
      });
    }
    startVideo(topic) {
      if (this.game.start(topic)) {
        this.platform.sound();
        this.go("shoot");
      }
    }
    stageArt(y, height, tap) {
      const view = box(this.root, 24, y, 342, height, "#e6d9e5", 22, "performance-stage");
      view.graphics.drawRect(0, height * 0.72, 342, height * 0.28, "#c8b9ca");
      view.scrollRect = new Laya.Rectangle(0, 0, 342, height);
      this.performer = new Laya.Sprite();
      view.addChild(this.performer);
      const ph = Math.min(height - 26, 300), pw = ph * 256 / 352;
      this.performer.pos((342 - pw) / 2, height - ph - 7);
      this.performer.size(pw, ph);
      this.paint(this.game.s.active?.shootTaps || 0, this.game.s.active?.topicId || "cat", pw, ph);
      if (tap) {
        view.mouseEnabled = true;
        view.on(Laya.Event.MOUSE_DOWN, view, (e) => {
          e.stopPropagation();
          tap();
        });
      }
    }
    paint(frame, topic, width, height) {
      if (!this.performer || this.performer.destroyed) return;
      const frames = this.frames.get(topic) || this.frames.get("cat");
      if (!frames) return;
      const i = Math.floor(frame) % frames.length;
      if (i === this.lastFrame) return;
      this.lastFrame = i;
      this.performer.name = "performer:frame:" + i;
      this.performer.graphics.clear();
      this.performer.graphics.drawTexture(frames[i], 0, 0, width || this.performer.width, height || this.performer.height);
    }
    shoot() {
      this.title("7 秒翻页表演", "连点屏幕，让小博主跳起来！", "每点一下换一帧，点击越连贯，拍摄评分越高。");
      this.stageArt(292, this.h - 525, () => this.dance());
      this.labels.time = text(this.root, "", 40, 305, 290, 16, "#8b4c6b", true);
      box(this.root, 24, this.h - 217, 342, 93, palette.cream, 18);
      this.labels.score = text(this.root, "", 40, this.h - 201, 310, 17, palette.green, true);
      this.labels.taps = text(this.root, "", 40, this.h - 164, 310, 13, palette.muted);
      button(this.root, "dance", this.game.s.active.shootAt ? "继续点击 · 推进动作" : "开始 7 秒拍摄", 24, this.h - 104, 342, 60, () => this.dance());
      this.updateShoot();
    }
    dance() {
      if (this.screen !== "shoot" || this.modal) return;
      const v = this.game.s.active;
      if (!v.shootAt) this.game.beginShoot();
      if (this.game.shootTap()) {
        this.paint(v.shootTaps, v.topicId);
        this.platform.sound();
        this.updateShoot();
      } else if (this.screen !== this.phase()) this.go(this.phase());
    }
    updateShoot() {
      const v = this.game.s.active;
      if (!v || !this.labels.time) return;
      this.labels.time.text = "● REC   " + (v.shootAt ? Math.max(0, 7e3 - (Date.now() - v.shootAt)) / 1e3 : 7).toFixed(1) + " 秒";
      this.labels.score.text = "拍摄质量 " + this.game.shootScore() + " / 100";
      this.labels.taps.text = "已拍 " + v.shootTaps + " 帧 · 连贯衔接 " + v.shootSmooth + " 次";
    }
    editView() {
      this.title("剪辑挑战", "剪出一个高光瞬间", "点亮三段胶片，也可以点击表演画面加速剪辑。");
      this.stageArt(286, this.h - 574, () => this.edit("tap"));
      this.labels.edit = text(this.root, "", 28, this.h - 272, 334, 21, palette.green, true);
      text(this.root, "加入高光", 28, this.h - 229, 320, 13, palette.muted);
      [["open", "开头"], ["highlight", "高光"], ["end", "结尾"]].forEach(([id, name], i) => button(this.root, "cut:" + id, (this.game.s.active.cuts.includes(id) ? "✓ " : "＋ ") + name, 24 + i * 116, this.h - 200, 110, 52, () => this.edit(id), !this.game.s.active.cuts.includes(id), false));
      button(this.root, "edit", "点击加速剪辑", 24, this.h - 110, 342, 60, () => this.edit("tap"));
      this.updateEdit();
    }
    edit(kind) {
      if (Date.now() - this.editAt < 80 && kind === "tap") return;
      this.editAt = Date.now();
      const edited = this.game.edit(kind);
      if (edited) this.platform.sound();
      if (this.phase() !== this.screen || kind !== "tap") this.go(this.phase());
      else this.updateEdit();
    }
    updateEdit() {
      if (this.labels.edit) this.labels.edit.text = "剪辑剩余  " + (this.game.s.active.remaining / 1e3).toFixed(1) + " 秒";
    }
    ready() {
      this.title("准备发布", "这一条，准备好见面了", "每一次尝试，都会积累创作经验。");
      this.stageArt(286, this.h - 488);
      text(this.root, "拍摄 " + this.game.s.active.shot + " 分 · " + this.game.s.active.cuts.length + " 段高光", 30, this.h - 178, 330, 17, palette.green, true);
      button(this.root, "publish", "发布作品", 24, this.h - 104, 342, 60, () => {
        if (Date.now() - this.phaseEnteredAt < 450) return;
        if (this.game.publish()) {
          this.platform.sound("capture");
          this.go("live");
        }
      });
    }
    live() {
      const v = this.game.s.active;
      this.title("作品数据", v.title, "↓ 向下滑动数据区域，揭晓一轮推荐反馈");
      const feed = box(this.root, 24, 292, 342, this.h - 435, palette.cream, 22, "feed");
      feed.mouseEnabled = true;
      feed.on(Laya.Event.MOUSE_DOWN, this, (e) => {
        this.drag = { x: Laya.stage.mouseX, y: Laya.stage.mouseY, id: e.touchId };
      });
      text(feed, v.event, 18, 16, 306, 22, v.event === "爆火" ? "#b26b46" : palette.green, true).align = "center";
      text(feed, num(v.views), 18, Math.min(80, feed.height * 0.2), 306, 42, palette.ink, true, 60).align = "center";
      text(feed, "累计播放", 18, Math.min(150, feed.height * 0.43), 306, 14, palette.muted).align = "center";
      text(feed, num(v.likes) + " 点赞     " + num(v.comments) + " 评论\n新增粉丝  +" + num(v.fans), 22, Math.min(197, feed.height * 0.56), 298, 16, palette.ink, true, 64).align = "center";
      const chartY = feed.height - 64;
      v.history.forEach((row, i) => box(feed, 25 + i * 33, chartY + 50 * (1 - row.target / v.views), 22, Math.max(3, 50 * row.target / v.views), palette.green, 4));
      text(this.root, "第 " + v.round + " 轮推荐 · 作品属性在发布时锁定", 28, this.h - 127, 334, 12, palette.muted);
      button(this.root, "refresh", "↓ 下拉或点击刷新数据", 24, this.h - 99, 342, 58, () => this.refresh());
    }
    endPull(e) {
      const d = this.drag;
      this.drag = null;
      if (!d || d.id !== e.touchId || this.screen !== "live") return;
      if (Laya.stage.mouseY - d.y > 55 && Math.abs(Laya.stage.mouseX - d.x) < 95) this.refresh();
    }
    refresh() {
      if (Date.now() < this.refreshAt) {
        this.hint("正在揭晓本轮数据");
        return;
      }
      const event = this.game.refresh();
      if (!event) return;
      this.refreshAt = Date.now() + 650;
      this.platform.sound(event === "爆火" ? "viral" : "tap");
      if (this.game.s.active.phase === "ended") this.go("result");
      else this.render();
    }
    result() {
      const v = this.game.s.active, r = this.game.reward;
      if (!r) {
        this.go("room");
        return;
      }
      this.title("第 " + v.id + " 条作品 · " + v.event, v.id === 1 ? "首条创作成功！" : "本次创作完成！", v.reason || "收好这次经验，下一条继续冲击更大流量。");
      const card = box(this.root, 24, 292, 342, this.h - 430, palette.cream, 24);
      text(card, num(v.views), 18, 18, 306, 44, palette.green, true, 60).align = "center";
      text(card, "最终播放", 18, 85, 306, 13, palette.muted).align = "center";
      text(card, "新增粉丝    +" + num(r.fans) + "\n作品收入    " + r.income + " 钱币\n首创奖励    " + r.grant + " 钱币\n成长点        +" + r.points, 30, 124, 282, 17, palette.ink, true, 128);
      button(this.root, "claim", "领取奖励，回到创作间", 24, this.h - 99, 342, 58, () => {
        if (Date.now() - this.phaseEnteredAt < 450) return;
        const reward = this.game.claim();
        if (!reward) return;
        this.platform.sound("viral");
        this.go("room");
        this.hint("新增 " + reward.fans + " 位粉丝，成长 +" + reward.points + " 点");
      });
    }
    scroll(y = 156) {
      this.panel = scroller(this.root, y, this.h - y - 26);
      const value = this.positions[this.screen + ":" + this.tab] || 0, panel = this.panel;
      Laya.timer.callLater(this, () => {
        if (!panel.destroyed) panel.scrollTo(0, value);
      });
      return panel;
    }
    growth() {
      const panel = this.scroll();
      text(panel, "可分配成长点  " + this.game.s.points, 10, 10, 340, 18, palette.green, true);
      Object.entries(STAT_LABELS).forEach(([key, name], i) => {
        const card = box(panel, 0, 60 + i * 116, 358, 104, palette.cream, 18);
        text(card, name + "   " + this.game.s.stats[key], 16, 15, 224, 19, palette.ink, true);
        text(card, DESC[key], 16, 55, 222, 13, palette.muted);
        button(card, "upgrade:" + key, "＋ 升级", 250, 27, 94, 48, () => {
          if (this.game.upgrade(key)) {
            this.remember();
            this.platform.sound();
            this.render();
          }
        }, this.game.s.points > 0 && this.game.s.stats[key] < 50);
      });
    }
    works() {
      const panel = this.scroll();
      let y = 0;
      for (const v of [...this.game.s.works].reverse()) {
        const h = 120 + v.history.length * 28, card = box(panel, 0, y, 358, h, palette.cream, 20);
        text(card, v.id + ". " + v.title, 16, 15, 330, 18, palette.ink, true);
        text(card, num(v.views) + " 播放 · +" + num(v.fans) + " 粉丝", 16, 51, 330, 15, palette.green);
        text(card, "拍摄 " + v.shot + " 分 · 内容质量 " + v.quality, 16, 82, 330, 12, palette.muted);
        v.history.forEach((row, i) => text(card, row.event + "     +" + num(row.delta) + " 播放", 16, 112 + i * 28, 328, 13));
        y += h + 12;
      }
    }
    equipment() {
      const panel = this.scroll(), s = this.game.s, next = ROOMS[s.studio.tier + 1], card = box(panel, 0, 0, 358, next ? 310 : 230, palette.cream, 20);
      image(card, "resources/" + this.game.room.art, 12, 12, 108, 178, true);
      text(card, "当前 · " + this.game.room.name, 136, 16, 204, 18, palette.ink, true, 54);
      text(card, "品质 +" + this.game.room.quality + "\n剪辑提速 " + Math.round((1 - this.game.room.editFactor) * 100) + "%", 136, 83, 200, 15, palette.green, false, 70);
      if (next) {
        text(card, "下一步：" + next.name + "\n" + num(next.fans) + " 粉丝 · " + next.price + " 钱币", 16, 205, 330, 15, palette.ink, true, 55);
        button(card, "buy-room", "升级房间", 16, 264, 326, 38, () => {
          if (this.game.upgradeRoom()) {
            this.platform.sound("viral");
            this.go("room");
          }
        }, s.fans >= next.fans && s.wallet >= next.price);
      } else text(card, "✓ 当前房间已升满", 16, 199, 330, 15, palette.green);
      let y = card.height + 16;
      for (const e of EQUIPMENT) {
        const owned = s.studio.gear[e.id], item = box(panel, 0, y, 358, 147, palette.cream, 20);
        text(item, e.name, 16, 16, 330, 19, palette.ink, true);
        text(item, e.benefit, 16, 50, 330, 14, palette.green);
        const reason = owned ? "✓ 已装备" : s.fans < e.fans ? num(e.fans) + "粉丝解锁" : s.wallet < e.price ? "还差 " + num(e.price - s.wallet) + " 钱币" : "购买 · " + e.price + " 钱币";
        button(item, "buy:" + e.id, reason, 16, 88, 326, 46, () => {
          if (this.game.buyEquipment(e.id)) {
            this.remember();
            this.platform.sound();
            this.render();
            this.hint("新装备已摆进房间，下一条作品开始生效");
          }
        }, !owned && s.fans >= e.fans && s.wallet >= e.price);
        y += 160;
      }
      button(panel, "equipment-tasks", "查看升级任务与补助 →", 0, y, 358, 52, () => this.go("tasks"), true, false);
    }
    tasks() {
      const ready = this.game.readyTaskCount;
      button(this.root, "claim-all", ready ? "一键领取 " + ready + " 项奖励" : "暂无待领奖励", 16, 152, 358, 48, () => this.claimTasks("all"), ready > 0);
      [["growth", "成长任务"], ["milestones", "粉丝里程碑"], ["daily", "每日任务"]].forEach(([id, name], i) => button(this.root, "tab:" + id, name, 16 + i * 122, 214, 114, 43, () => {
        this.remember();
        this.tab = id;
        this.render();
      }, true, this.tab === id));
      const panel = this.scroll(271);
      let y = 0;
      if (this.tab === "daily") {
        const d = this.game.daily;
        text(panel, d.date + " · 北京时间0点刷新\n已完成未领的奖励会保留。", 10, 8, 340, 14, palette.muted, false, 65);
        y = 78;
        if (d.pending.count) {
          button(panel, "daily-pending", "领取往日保留奖励 " + d.pending.count + " 项", 0, y, 358, 48, () => this.claimTasks("daily_pending"));
          y += 62;
        }
      }
      const statuses = { progress: "进行中", ready: "可领取", claimed: "已领取", locked: "未开放" };
      for (const t of sortTasksForDisplay(this.game.tasks[this.tab])) {
        const card = box(panel, 0, y, 358, 212, palette.cream, 19, "task:" + t.id + ":" + t.status);
        text(card, t.title, 16, 15, 251, 18, palette.ink, true);
        text(card, statuses[t.status], 278, 18, 76, 12, t.status === "ready" ? palette.green : palette.muted);
        text(card, t.description, 16, 52, 326, 13, palette.muted, false, 59);
        progress2(card, 16, 114, 326, t.current / t.target);
        text(card, num(Math.min(t.current, t.target)) + " / " + num(t.target), 16, 130, 326, 12, palette.muted);
        text(card, t.workReward ? "120 钱币 · 首条作品结算领取" : (t.coins ? t.coins + " 钱币 " : "") + (t.points ? t.points + " 成长点" : "") + (t.badge ? " · 纪念徽章" : ""), 16, 168, 216, 12, palette.green, false, 38);
        if (t.status === "ready") button(card, "claim-task:" + t.id, "领取", 256, 158, 86, 42, () => this.claimTasks(t.id));
        else if (t.status === "progress") button(card, "task-go:" + t.id, "去完成", 256, 158, 86, 42, () => this.go(t.action), this.game.unlocked || t.action === "phone", false);
        else text(card, t.status === "claimed" ? "✓ 已领取" : "首条结算后开放", 238, 168, 108, 12, palette.muted);
        y += 225;
      }
    }
    claimTasks(id) {
      const r = this.game.claimTasks(id);
      if (!r) return;
      this.remember();
      this.platform.sound("viral");
      this.render();
      this.hint("奖励已领取：" + r.coins + " 钱币 ＋ " + r.points + " 成长点");
    }
    promotion() {
      this.modal = true;
      const shade = box(this.root, 0, 0, 390, this.h, "#514a40", 0, "promotion");
      shade.zOrder = 100;
      shade.mouseEnabled = true;
      const dialog = box(shade, 20, (this.h - 350) / 2, 350, 350, palette.cream, 26), reached = this.game.s.studio.celebrations;
      text(dialog, "突破 " + num(Math.max(...reached)) + " 粉丝！", 22, 26, 306, 26, palette.green, true, 64);
      text(dialog, this.game.title + "，你好！", 22, 96, 306, 20, palette.ink, true);
      const unlocks = Object.entries(STAGE_UNLOCKS).filter(([target]) => reached.includes(Number(target))).map(([, copy]) => copy).join("；");
      text(dialog, unlocks || "新的称号已达成，继续创造下一个纪录。", 22, 140, 306, 14, palette.muted, false, 84);
      button(dialog, "promotion-tasks", "查看升级任务与补助", 22, 231, 306, 48, () => {
        this.game.dismissMilestones();
        this.go("tasks");
      });
      button(dialog, "promotion-dismiss", "收下鼓励，继续创作", 22, 291, 306, 42, () => {
        this.game.dismissMilestones();
        this.render();
      }, true, false);
    }
    hint(value) {
      Laya.timer.clear(this, this.clearToast);
      if (this.toast.destroyed) return;
      this.toast.destroyChildren();
      const card = box(this.toast, 20, this.h - 175, 350, 82, "#435b46", 18), label = text(card, value, 14, 10, 322, 14, palette.cream, true, 62);
      label.align = "center";
      label.valign = "middle";
      Laya.timer.once(2400, this, this.clearToast);
    }
    clearToast() {
      if (!this.toast.destroyed) this.toast.destroyChildren();
    }
    tick() {
      if (this.suspended || this.destroyed) return;
      const v = this.game.s.active;
      if (v && ["shoot", "edit"].includes(v.phase)) {
        this.game.tick();
        if (this.phase() !== this.screen) {
          this.platform.sound("capture");
          this.go(this.phase());
        } else if (this.screen === "shoot") this.updateShoot();
        else this.updateEdit();
      }
      if (v && ["edit", "ready"].includes(this.screen)) this.paint(Math.floor(Date.now() / 1e3 * (v.shootTaps || 0) / 7), v.topicId);
      if (Date.now() - this.checkAt >= 1e3) {
        this.checkAt = Date.now();
        if (this.game.syncDaily() && ["room", "tasks"].includes(this.screen)) {
          this.remember();
          this.render();
        }
      }
    }
    destroy() {
      this.destroyed = true;
      this.game.save();
      this.platform.destroy();
      Laya.timer.clearAll(this);
      Laya.stage.offAllCaller(this);
      this.root.destroy(true);
      for (const frames of this.frames.values()) for (const frame of frames) frame.destroy();
      this.frames.clear();
    }
  };

  // src/Main.ts
  var { regClass } = Laya;
  var Main = class extends Laya.Script {
    constructor() {
      super(...arguments);
      this.app = null;
    }
    onStart() {
      if (!Laya.LayaEnv.isPlaying) return;
      Laya.stage.designWidth = 390;
      Laya.stage.designHeight = 844;
      Laya.stage.scaleMode = Laya.Browser.clientWidth / Laya.Browser.clientHeight > 0.8 ? Laya.Stage.SCALE_SHOWALL : Laya.Stage.SCALE_FIXED_WIDTH;
      Laya.stage.alignH = Laya.Stage.ALIGN_CENTER;
      Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE;
      this.app = new CreatorApp();
      this.app.start().catch((error) => {
        console.error("Creator startup failed", error);
        const label = new Laya.Text();
        label.text = "创作间加载失败，请重新进入游戏。";
        label.color = "#594a3d";
        label.fontSize = 18;
        label.wordWrap = true;
        label.pos(24, 240);
        label.width = 340;
        Laya.stage.addChild(label);
      });
    }
    onDestroy() {
      this.app?.destroy();
      this.app = null;
    }
  };
  Main = __decorateClass([
    regClass("e60XQm7tTY2BwFAdxb8D1g")
  ], Main);
})();
