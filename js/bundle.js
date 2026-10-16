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
  function isValidSaveState(s) {
    return !!(s?.version === 1 && Array.isArray(s.works) && s.works.every((w) => w && typeof w === "object" && !Array.isArray(w)) && s.stats && Object.keys(STAT_LABELS).every((k) => Number.isFinite(s.stats[k]) && s.stats[k] >= 1) && ["fans", "wallet", "views", "points"].every((k) => Number.isFinite(s[k]) && s[k] >= 0) && (!s.active || ["shoot", "edit", "ready", "live", "ended"].includes(s.active.phase)));
  }
  var CreatorGame = class _CreatorGame {
    constructor(state = initial(), storage = null, clock = Date.now) {
      this.clock = clock;
      this.s = state;
      this.storage = storage;
      this.storageFailed = false;
      this.lastPersistedAt = 0;
      migrateStudio(this.s);
      migrateTasks(this.s);
      ensureDaily(this.s, this.clock());
    }
    static load(storage, clock = Date.now) {
      try {
        const s = JSON.parse(storage.getItem(SAVE_KEY) || "null");
        if (isValidSaveState(s)) {
          const g = new _CreatorGame(s, storage, clock);
          g.tick(clock());
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
        this.lastPersistedAt = this.clock();
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
    beginShoot(now = this.clock()) {
      const v = this.s.active;
      if (v?.phase !== "shoot" || v.shootAt) return false;
      v.shootAt = now;
      v.shootTaps = 0;
      v.shootSmooth = 0;
      v.shootLast = 0;
      this.save();
      return true;
    }
    shootTap(now = this.clock()) {
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
    capture(now = this.clock()) {
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
    tick(now = this.clock()) {
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
      v.editAt = Math.max(v.editAt, now);
      if (v.remaining === 0) {
        v.phase = "ready";
        this.save();
      } else if (now - this.lastPersistedAt >= 1e3 || !this.lastPersistedAt) this.save();
      return v.phase === "ready";
    }
    edit(kind = "tap", now = this.clock()) {
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

  // src/platform/RecoverableStorage.ts
  var RecoverableStorage = class {
    constructor(backend, key, valid) {
      this.backend = backend;
      this.key = key;
      this.valid = valid;
      this.recovered = false;
      this.backupAvailable = true;
    }
    read(key) {
      try {
        return this.backend.getItem(key);
      } catch {
        return null;
      }
    }
    getItem(key) {
      if (key !== this.key) return this.backend.getItem(key);
      const primary = this.read(key);
      if (primary && this.valid(primary)) return primary;
      const backup = this.read(key + ":backup");
      if (backup && this.valid(backup)) {
        this.recovered = true;
        return backup;
      }
      return null;
    }
    setItem(key, value) {
      if (key === this.key) {
        if (!this.valid(value)) throw new Error("Invalid game save");
        const previous = this.read(key);
        if (previous === value) return;
        if (previous && this.valid(previous)) {
          try {
            this.backend.setItem(key + ":backup", previous);
            this.backupAvailable = this.backend.getItem(key + ":backup") === previous;
          } catch {
            this.backupAvailable = false;
          }
        }
      }
      this.backend.setItem(key, value);
      if (this.backend.getItem(key) !== value) throw new Error("Save not persisted");
    }
  };

  // src/platform/Runtime.ts
  function detectHost(scope) {
    for (const [kind, api] of [["wechat", scope.wx], ["douyin", scope.tt]])
      if (api && (typeof api.getWindowInfo === "function" || typeof api.getSystemInfoSync === "function")) return { kind, api };
    return { kind: "engine" };
  }
  function windowInfo(host) {
    try {
      if (host?.getWindowInfo) return host.getWindowInfo();
    } catch {
    }
    try {
      return host?.getSystemInfoSync?.();
    } catch {
      return void 0;
    }
  }
  var VisibilityGate = class {
    constructor(hidden, shown) {
      this.hidden = hidden;
      this.shown = shown;
      this.visible = true;
      this.alive = true;
    }
    set(visible) {
      if (!this.alive || this.visible === visible) return;
      this.visible = visible;
      if (visible) this.shown();
      else this.hidden();
    }
    destroy() {
      this.alive = false;
    }
  };
  function viewLayout(stageWidth, stageHeight, info) {
    let top = 0, bottom = 0, left = 0, right = 0;
    const a = info?.safeArea;
    if (info && a && Number.isFinite(info.windowWidth) && info.windowWidth > 0 && Number.isFinite(info.windowHeight) && info.windowHeight > 0 && [a.left, a.right, a.top, a.bottom].every(Number.isFinite) && a.left >= 0 && a.top >= 0 && a.right > a.left && a.bottom > a.top) {
      const sx = stageWidth / info.windowWidth, sy = stageHeight / info.windowHeight;
      left = Math.min(a.left * sx, stageWidth / 3);
      right = Math.max(0, stageWidth - Math.min(info.windowWidth, a.right) * sx);
      top = Math.min(a.top * sy, stageHeight / 3);
      bottom = Math.max(0, stageHeight - Math.min(info.windowHeight, a.bottom) * sy);
      right = Math.min(right, stageWidth / 3);
      bottom = Math.min(bottom, stageHeight / 3);
    }
    const width = Math.max(1, stageWidth - left - right), available = Math.max(1, stageHeight - top - bottom);
    const scale = Math.min(1, width / 390, available / 680);
    return { x: left + (width - 390 * scale) / 2, y: top, scale, height: available / scale, bottom };
  }

  // src/Platform.ts
  var PREFERENCES = "creator-simulator-preferences-v1";
  var Platform = class _Platform {
    constructor(scope = globalThis) {
      this.raw = { getItem: (key) => Laya.LocalStorage.getItem(key), setItem: (key, value) => Laya.LocalStorage.setItem(key, value) };
      this.storage = new RecoverableStorage(this.raw, SAVE_KEY, (value) => {
        try {
          return isValidSaveState(JSON.parse(value));
        } catch {
          return false;
        }
      });
      this.soundMuted = false;
      this.lastSound = 0;
      this.gate = null;
      this.callbacks = null;
      this.nativeLifecycle = false;
      this.settingsFailed = false;
      this.onHide = () => {
        this.gate?.set(false);
      };
      this.onShow = () => {
        this.gate?.set(true);
      };
      this.onBlur = () => {
        this.callbacks?.checkpoint();
      };
      this.onFocus = () => {
        if (!this.nativeLifecycle && Laya.stage.isVisibility) this.gate?.set(true);
      };
      this.onVisibility = () => {
        if (!this.nativeLifecycle) this.gate?.set(Laya.stage.isVisibility);
      };
      this.onResize = () => {
        Laya.timer.callLater(this, this.flushResize);
      };
      this.host = detectHost(scope);
      try {
        this.soundMuted = JSON.parse(this.raw.getItem(PREFERENCES) || "{}").muted === true;
      } catch {
      }
      Laya.SoundManager.soundMuted = this.soundMuted;
    }
    static configureStage() {
      Laya.stage.designWidth = 390;
      Laya.stage.designHeight = 844;
      const mode = Laya.Browser.clientWidth / Laya.Browser.clientHeight > 0.8 ? Laya.Stage.SCALE_SHOWALL : Laya.Stage.SCALE_FIXED_WIDTH;
      if (Laya.stage.scaleMode !== mode) Laya.stage.scaleMode = mode;
      Laya.stage.alignH = Laya.Stage.ALIGN_CENTER;
      Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE;
    }
    layout() {
      return viewLayout(Laya.stage.width, Laya.stage.height, windowInfo(this.host.api));
    }
    get muted() {
      return this.soundMuted;
    }
    sound(kind = "tap") {
      if (this.soundMuted || Date.now() - this.lastSound < 35) return;
      this.lastSound = Date.now();
      try {
        Laya.SoundManager.playSound("resources/audio/" + kind + ".wav", 1);
      } catch {
      }
      if (kind === "viral") {
        try {
          this.host.api?.vibrateShort?.({ fail: () => {
          } });
        } catch {
        }
      }
    }
    mute() {
      this.soundMuted = !this.soundMuted;
      Laya.SoundManager.soundMuted = this.soundMuted;
      const value = JSON.stringify({ muted: this.soundMuted });
      try {
        this.raw.setItem(PREFERENCES, value);
        this.settingsFailed = this.raw.getItem(PREFERENCES) !== value;
      } catch {
        this.settingsFailed = true;
      }
      return this.soundMuted;
    }
    bindLifecycle(callbacks) {
      this.destroy();
      this.callbacks = callbacks;
      this.gate = new VisibilityGate(() => {
        try {
          Laya.SoundManager.stopAllSound();
        } catch {
        }
        this.callbacks?.hidden();
      }, () => this.callbacks?.shown());
      const host = this.host.api;
      if (host?.onHide && host.offHide && host.onShow && host.offShow) {
        try {
          host.onHide(this.onHide);
          host.onShow(this.onShow);
          this.nativeLifecycle = true;
        } catch {
          this.unbindHost();
        }
      }
      if (host?.onWindowResize && host.offWindowResize) {
        try {
          host.onWindowResize(this.onResize);
        } catch {
        }
      }
      Laya.stage.on(Laya.Event.BLUR, this, this.onBlur);
      Laya.stage.on(Laya.Event.FOCUS, this, this.onFocus);
      Laya.stage.on(Laya.Event.VISIBILITY_CHANGE, this, this.onVisibility);
      Laya.stage.on(Laya.Event.RESIZE, this, this.onResize);
      this.onVisibility();
    }
    flushResize() {
      _Platform.configureStage();
      this.callbacks?.resize();
    }
    unbindHost() {
      const host = this.host.api;
      for (const [name, fn] of [["offHide", this.onHide], ["offShow", this.onShow], ["offWindowResize", this.onResize]]) {
        try {
          host?.[name]?.(fn);
        } catch {
        }
      }
    }
    destroy() {
      this.gate?.destroy();
      this.gate = null;
      this.unbindHost();
      Laya.stage.offAllCaller(this);
      Laya.timer.clearAll(this);
      this.nativeLifecycle = false;
      this.callbacks = null;
    }
  };

  // src/platform/ResourceLoader.ts
  var ResourceLoader = class {
    constructor(groups, load, get) {
      this.groups = groups;
      this.load = load;
      this.get = get;
      this.pending = /* @__PURE__ */ new Map();
    }
    urls(group) {
      if (!Object.prototype.hasOwnProperty.call(this.groups, group)) throw new Error("Unknown resource group: " + group);
      return this.groups[group].map((file) => "resources/" + file);
    }
    ready(groups) {
      return groups.every((group) => this.urls(group).every((url) => !!this.get(url)));
    }
    async ensure(groups) {
      await Promise.all([...new Set(groups)].map((group) => this.ensureGroup(group)));
    }
    ensureGroup(group) {
      const urls = this.urls(group);
      if (urls.every((url) => !!this.get(url))) return Promise.resolve();
      const current = this.pending.get(group);
      if (current) return current;
      const task = Promise.resolve().then(() => this.load(urls.filter((url) => !this.get(url)))).then(() => {
        if (urls.some((url) => !this.get(url))) throw new Error("Resource group incomplete: " + group);
      });
      this.pending.set(group, task);
      const clear = () => {
        if (this.pending.get(group) === task) this.pending.delete(group);
      };
      task.then(clear, clear);
      return task;
    }
  };

  // src/generated/Catalog.ts
  var CATALOG = { "groups": { "boot": ["creator-avatar-v102.webp", "creator-brush-v07.woff2"], "room_0": ["room-interior-v103.webp"], "room_lamp": ["room-interior-lamp-v103.webp"], "room_1": ["room-cozy-v130.webp"], "room_2": ["room-studio-v130.webp"], "topic_cat": ["creator-dance-v105-laya.webp"], "topic_pose": ["creator-expressions-v105-laya.webp"], "topic_dance": ["creator-xingqiyao-v106-laya.webp"] }, "atlases": { "cat": { "file": "creator-dance-v105-laya.webp", "count": 24 }, "pose": { "file": "creator-expressions-v105-laya.webp", "count": 12 }, "dance": { "file": "creator-xingqiyao-v106-laya.webp", "count": 24 } } };

  // src/UI.ts
  var palette = { ink: "#3f4b36", muted: "#7c805f", cream: "#fff3d1", paper: "#e0dfba", green: "#587943", light: "#dce5b4", peach: "#f3bb53", line: "#c2bb8c", border: "#a59565" };
  function surface(node, w, h, top, bottom, border, radius = 14, shadow = 3) {
    const g = node.graphics;
    if (shadow) g.drawRoundRect(0, shadow, w, h, radius, radius, radius, radius, "#897a50");
    g.drawRoundRect(0, 0, w, h, radius, radius, radius, radius, bottom, border, 2);
    const a = [1, 3, 5].map((i) => parseInt(top.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(bottom.slice(i, i + 2), 16));
    for (let i = 0; i < 18; i++) {
      const y = 2 + (h - 4) * i / 18, dh = (h - 4) / 18 + 0.3, r = Math.max(1, radius - 2);
      const edge = Math.min(y - 2, h - 2 - y - dh), inset = edge < r ? r - Math.sqrt(Math.max(0, r * r - (r - Math.max(0, edge)) ** 2)) : 0;
      const color = "#" + a.map((v, n) => Math.round(v + (b[n] - v) * i / 17).toString(16).padStart(2, "0")).join("");
      g.drawRect(2 + inset, y, Math.max(1, w - 4 - inset * 2), dh, color);
    }
    g.drawRoundRect(0, 0, w, h, radius, radius, radius, radius, null, border, 2);
    g.drawRoundRect(3, 3, w - 6, h - 6, Math.max(2, radius - 3), Math.max(2, radius - 3), Math.max(2, radius - 3), Math.max(2, radius - 3), null, "#fff5d180", 1);
  }
  function box(parent, x, y, w, h, color = palette.cream, radius = 18, name = "") {
    const node = new Laya.Sprite();
    node.name = name;
    node.pos(x, y);
    node.size(w, h);
    if (radius >= 12 && (color === palette.cream || color === palette.light)) surface(node, w, h, color === palette.cream ? "#fff7df" : "#e2e8bd", color, palette.border, radius);
    else node.graphics.drawRoundRect(0, 0, w, h, radius, radius, radius, radius, color);
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
    node.leading = 4;
    node.pos(x, y);
    node.size(w, h);
    node.mouseEnabled = false;
    parent.addChild(node);
    return node;
  }
  function centered(parent, value, x, y, w, size = 16, color = palette.ink, bold = false, h = 36) {
    const node = text(parent, value, x, y, w, size, color, bold, h);
    node.align = "center";
    node.valign = "middle";
    return node;
  }
  function button(parent, name, label, x, y, w, h, action, enabled = true, primary = true) {
    const node = new Laya.Sprite();
    node.name = name;
    node.pos(x, y);
    node.size(w, h);
    parent.addChild(node);
    surface(node, w, h, primary ? "#ffdc7a" : "#c2d297", primary ? "#f0b448" : "#8eaa64", primary ? "#ffe9a7" : "#eef2c9", 13, primary ? 5 : 3);
    const caption = centered(node, label, 8, 0, w - 16, 14, primary ? "#684a24" : "#fff6d5", true, h);
    caption.name = "button-caption";
    node.mouseEnabled = enabled;
    node.alpha = enabled ? 1 : 0.5;
    if (enabled) {
      let startX = 0, startY = 0;
      node.on(Laya.Event.MOUSE_DOWN, node, () => {
        startX = Laya.stage.mouseX;
        startY = Laya.stage.mouseY;
        node.scale(0.985, 0.985);
      });
      node.on(Laya.Event.MOUSE_UP, node, () => node.scale(1, 1));
      node.on(Laya.Event.MOUSE_OUT, node, () => node.scale(1, 1));
      node.on(Laya.Event.CLICK, node, (e) => {
        e.stopPropagation();
        node.scale(1, 1);
        if (Math.hypot(Laya.stage.mouseX - startX, Laya.stage.mouseY - startY) < 14) action();
      });
    }
    return node;
  }
  function progress2(parent, x, y, w, ratio) {
    const node = box(parent, x, y, w, 9, palette.line, 4);
    const fill = Math.max(0, Math.min(1, ratio)) * w;
    if (fill > 0) node.graphics.drawRoundRect(0, 0, fill, 9, 4, 4, 4, 4, "#87a85e");
    return node;
  }
  function image(parent, url, x, y, w, h, cover = false, anchorX = 0.5) {
    const texture = Laya.loader.getRes(url);
    const node = new Laya.Sprite();
    node.pos(x, y);
    node.size(w, h);
    node.mouseEnabled = false;
    if (texture) {
      const factor = cover ? Math.max(w / texture.width, h / texture.height) : Math.min(w / texture.width, h / texture.height);
      const tw = texture.width * factor, th = texture.height * factor;
      node.graphics.drawImage(texture, (w - tw) * anchorX, (h - th) / 2, tw, th);
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

  // src/generated/VectorArt.ts
  var VECTOR_ART = { "chevron": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 9, 5], ["lineTo", 16, 12], ["lineTo", 9, 19]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "mask": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 3, 4], ["lineTo", 4.125, 4.527], ["lineTo", 5.25, 4.984], ["lineTo", 6.375, 5.371], ["lineTo", 7.5, 5.688], ["lineTo", 8.625, 5.934], ["lineTo", 9.75, 6.109], ["lineTo", 10.875, 6.215], ["lineTo", 12, 6.25], ["lineTo", 13.125, 6.215], ["lineTo", 14.25, 6.109], ["lineTo", 15.375, 5.934], ["lineTo", 16.5, 5.688], ["lineTo", 17.625, 5.371], ["lineTo", 18.75, 4.984], ["lineTo", 19.875, 4.527], ["lineTo", 21, 4], ["lineTo", 21, 12], ["lineTo", 20.943, 13.09], ["lineTo", 20.777, 14.109], ["lineTo", 20.512, 15.059], ["lineTo", 20.156, 15.938], ["lineTo", 19.718, 16.746], ["lineTo", 19.207, 17.484], ["lineTo", 18.631, 18.152], ["lineTo", 18, 18.75], ["lineTo", 17.322, 19.277], ["lineTo", 16.605, 19.734], ["lineTo", 15.86, 20.121], ["lineTo", 15.094, 20.438], ["lineTo", 14.316, 20.684], ["lineTo", 13.535, 20.859], ["lineTo", 12.76, 20.965], ["lineTo", 12, 21], ["lineTo", 11.24, 20.965], ["lineTo", 10.465, 20.859], ["lineTo", 9.684, 20.684], ["lineTo", 8.906, 20.438], ["lineTo", 8.14, 20.121], ["lineTo", 7.395, 19.734], ["lineTo", 6.678, 19.277], ["lineTo", 6, 18.75], ["lineTo", 5.369, 18.152], ["lineTo", 4.793, 17.484], ["lineTo", 4.282, 16.746], ["lineTo", 3.844, 15.938], ["lineTo", 3.488, 15.059], ["lineTo", 3.223, 14.109], ["lineTo", 3.057, 13.09], ["lineTo", 3, 12], ["lineTo", 3, 4], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 7, 10], ["lineTo", 9, 10], ["moveTo", 15, 10], ["lineTo", 17, 10], ["moveTo", 8, 15], ["lineTo", 8.397, 15.352], ["lineTo", 8.836, 15.656], ["lineTo", 9.31, 15.914], ["lineTo", 9.812, 16.125], ["lineTo", 10.339, 16.289], ["lineTo", 10.883, 16.406], ["lineTo", 11.438, 16.477], ["lineTo", 12, 16.5], ["lineTo", 12.562, 16.477], ["lineTo", 13.117, 16.406], ["lineTo", 13.661, 16.289], ["lineTo", 14.188, 16.125], ["lineTo", 14.69, 15.914], ["lineTo", 15.164, 15.656], ["lineTo", 15.603, 15.352], ["lineTo", 16, 15]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "gamepad": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 7, 6], ["lineTo", 17, 6], ["lineTo", 17.561, 6.135], ["lineTo", 18.113, 6.518], ["lineTo", 18.648, 7.114], ["lineTo", 19.156, 7.891], ["lineTo", 19.629, 8.814], ["lineTo", 20.059, 9.85], ["lineTo", 20.435, 10.965], ["lineTo", 20.75, 12.125], ["lineTo", 20.995, 13.297], ["lineTo", 21.16, 14.447], ["lineTo", 21.238, 15.542], ["lineTo", 21.219, 16.547], ["lineTo", 21.094, 17.429], ["lineTo", 20.855, 18.154], ["lineTo", 20.494, 18.689], ["lineTo", 20, 19], ["lineTo", 19.625, 19.131], ["lineTo", 19.252, 19.158], ["lineTo", 18.882, 19.094], ["lineTo", 18.516, 18.953], ["lineTo", 18.156, 18.747], ["lineTo", 17.803, 18.49], ["lineTo", 17.459, 18.195], ["lineTo", 17.125, 17.875], ["lineTo", 16.803, 17.543], ["lineTo", 16.494, 17.213], ["lineTo", 16.2, 16.897], ["lineTo", 15.922, 16.609], ["lineTo", 15.661, 16.363], ["lineTo", 15.42, 16.17], ["lineTo", 15.199, 16.045], ["lineTo", 15, 16], ["lineTo", 9, 16], ["lineTo", 8.801, 16.045], ["lineTo", 8.58, 16.17], ["lineTo", 8.339, 16.363], ["lineTo", 8.078, 16.609], ["lineTo", 7.8, 16.897], ["lineTo", 7.506, 17.213], ["lineTo", 7.197, 17.543], ["lineTo", 6.875, 17.875], ["lineTo", 6.541, 18.195], ["lineTo", 6.197, 18.49], ["lineTo", 5.844, 18.747], ["lineTo", 5.484, 18.953], ["lineTo", 5.118, 19.094], ["lineTo", 4.748, 19.158], ["lineTo", 4.375, 19.131], ["lineTo", 4, 19], ["lineTo", 3.506, 18.689], ["lineTo", 3.145, 18.154], ["lineTo", 2.906, 17.429], ["lineTo", 2.781, 16.547], ["lineTo", 2.762, 15.542], ["lineTo", 2.84, 14.447], ["lineTo", 3.005, 13.297], ["lineTo", 3.25, 12.125], ["lineTo", 3.565, 10.965], ["lineTo", 3.941, 9.85], ["lineTo", 4.371, 8.814], ["lineTo", 4.844, 7.891], ["lineTo", 5.352, 7.114], ["lineTo", 5.887, 6.518], ["lineTo", 6.439, 6.135], ["lineTo", 7, 6], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 6, 10], ["lineTo", 6, 14], ["moveTo", 4, 12], ["lineTo", 8, 12], ["moveTo", 15, 11], ["lineTo", 15.01, 11], ["moveTo", 18, 13], ["lineTo", 18.01, 13]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "bowl": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 3, 10], ["lineTo", 21, 10], ["lineTo", 20.954, 11.266], ["lineTo", 20.818, 12.439], ["lineTo", 20.598, 13.522], ["lineTo", 20.297, 14.516], ["lineTo", 19.92, 15.421], ["lineTo", 19.471, 16.24], ["lineTo", 18.954, 16.974], ["lineTo", 18.375, 17.625], ["lineTo", 17.737, 18.194], ["lineTo", 17.045, 18.682], ["lineTo", 16.303, 19.091], ["lineTo", 15.516, 19.422], ["lineTo", 14.687, 19.677], ["lineTo", 13.822, 19.857], ["lineTo", 12.925, 19.965], ["lineTo", 12, 20], ["lineTo", 11.075, 19.965], ["lineTo", 10.178, 19.857], ["lineTo", 9.313, 19.677], ["lineTo", 8.484, 19.422], ["lineTo", 7.697, 19.091], ["lineTo", 6.955, 18.682], ["lineTo", 6.263, 18.194], ["lineTo", 5.625, 17.625], ["lineTo", 5.046, 16.974], ["lineTo", 4.529, 16.24], ["lineTo", 4.08, 15.421], ["lineTo", 3.703, 14.516], ["lineTo", 3.402, 13.522], ["lineTo", 3.182, 12.439], ["lineTo", 3.046, 11.266], ["lineTo", 3, 10], ["closePath"], ["moveTo", 6, 21], ["lineTo", 18, 21], ["moveTo", 9, 2], ["lineTo", 9, 7], ["moveTo", 15, 2], ["lineTo", 15, 7]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "book": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 12, 5], ["lineTo", 11.426, 4.483], ["lineTo", 10.832, 4.055], ["lineTo", 10.22, 3.708], ["lineTo", 9.594, 3.438], ["lineTo", 8.956, 3.237], ["lineTo", 8.309, 3.102], ["lineTo", 7.656, 3.024], ["lineTo", 7, 3], ["lineTo", 6.344, 3.022], ["lineTo", 5.691, 3.086], ["lineTo", 5.044, 3.185], ["lineTo", 4.406, 3.312], ["lineTo", 3.78, 3.464], ["lineTo", 3.168, 3.633], ["lineTo", 2.574, 3.813], ["lineTo", 2, 4], ["lineTo", 2, 19], ["lineTo", 2.574, 18.813], ["lineTo", 3.168, 18.633], ["lineTo", 3.78, 18.464], ["lineTo", 4.406, 18.312], ["lineTo", 5.044, 18.185], ["lineTo", 5.691, 18.086], ["lineTo", 6.344, 18.022], ["lineTo", 7, 18], ["lineTo", 7.656, 18.024], ["lineTo", 8.309, 18.102], ["lineTo", 8.956, 18.237], ["lineTo", 9.594, 18.438], ["lineTo", 10.22, 18.708], ["lineTo", 10.832, 19.055], ["lineTo", 11.426, 19.483], ["lineTo", 12, 20], ["lineTo", 12.574, 19.483], ["lineTo", 13.168, 19.055], ["lineTo", 13.78, 18.708], ["lineTo", 14.406, 18.438], ["lineTo", 15.044, 18.237], ["lineTo", 15.691, 18.102], ["lineTo", 16.344, 18.024], ["lineTo", 17, 18], ["lineTo", 17.656, 18.022], ["lineTo", 18.309, 18.086], ["lineTo", 18.956, 18.185], ["lineTo", 19.594, 18.312], ["lineTo", 20.22, 18.464], ["lineTo", 20.832, 18.633], ["lineTo", 21.426, 18.813], ["lineTo", 22, 19], ["lineTo", 22, 4], ["lineTo", 21.426, 3.813], ["lineTo", 20.832, 3.633], ["lineTo", 20.22, 3.464], ["lineTo", 19.594, 3.312], ["lineTo", 18.956, 3.185], ["lineTo", 18.309, 3.086], ["lineTo", 17.656, 3.022], ["lineTo", 17, 3], ["lineTo", 16.344, 3.024], ["lineTo", 15.691, 3.102], ["lineTo", 15.044, 3.237], ["lineTo", 14.406, 3.438], ["lineTo", 13.78, 3.708], ["lineTo", 13.168, 4.055], ["lineTo", 12.574, 4.483], ["lineTo", 12, 5], ["closePath"], ["moveTo", 12, 5], ["lineTo", 12, 20]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "chat": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 21, 11], ["lineTo", 20.954, 11.92], ["lineTo", 20.817, 12.814], ["lineTo", 20.595, 13.676], ["lineTo", 20.293, 14.503], ["lineTo", 19.914, 15.29], ["lineTo", 19.463, 16.032], ["lineTo", 18.945, 16.725], ["lineTo", 18.364, 17.364], ["lineTo", 17.725, 17.945], ["lineTo", 17.032, 18.463], ["lineTo", 16.29, 18.914], ["lineTo", 15.503, 19.293], ["lineTo", 14.676, 19.595], ["lineTo", 13.814, 19.817], ["lineTo", 12.92, 19.954], ["lineTo", 12, 20], ["lineTo", 3, 20], ["lineTo", 5, 16], ["lineTo", 4.556, 15.396], ["lineTo", 4.167, 14.765], ["lineTo", 3.836, 14.111], ["lineTo", 3.56, 13.438], ["lineTo", 3.341, 12.749], ["lineTo", 3.179, 12.047], ["lineTo", 3.074, 11.337], ["lineTo", 3.026, 10.621], ["lineTo", 3.034, 9.904], ["lineTo", 3.1, 9.189], ["lineTo", 3.222, 8.48], ["lineTo", 3.402, 7.779], ["lineTo", 3.64, 7.092], ["lineTo", 3.935, 6.42], ["lineTo", 4.287, 5.769], ["lineTo", 4.697, 5.141], ["lineTo", 5.158, 4.549], ["lineTo", 5.659, 4.004], ["lineTo", 6.199, 3.508], ["lineTo", 6.772, 3.06], ["lineTo", 7.376, 2.662], ["lineTo", 8.007, 2.315], ["lineTo", 8.662, 2.021], ["lineTo", 9.338, 1.78], ["lineTo", 10.03, 1.594], ["lineTo", 10.736, 1.463], ["lineTo", 11.452, 1.388], ["lineTo", 12.175, 1.371], ["lineTo", 12.902, 1.413], ["lineTo", 13.628, 1.514], ["lineTo", 14.35, 1.677], ["lineTo", 15.066, 1.901], ["lineTo", 15.761, 2.183], ["lineTo", 16.421, 2.518], ["lineTo", 17.046, 2.902], ["lineTo", 17.632, 3.332], ["lineTo", 18.179, 3.806], ["lineTo", 18.684, 4.319], ["lineTo", 19.145, 4.869], ["lineTo", 19.561, 5.454], ["lineTo", 19.928, 6.07], ["lineTo", 20.246, 6.714], ["lineTo", 20.512, 7.383], ["lineTo", 20.725, 8.074], ["lineTo", 20.882, 8.784], ["lineTo", 20.981, 9.511], ["lineTo", 21.021, 10.25], ["lineTo", 21, 11], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 8, 9], ["lineTo", 16, 9], ["moveTo", 8, 13], ["lineTo", 13, 13]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "share": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 14, 3], ["lineTo", 21, 3], ["lineTo", 21, 10], ["moveTo", 21, 3], ["lineTo", 10, 14], ["moveTo", 10, 5], ["lineTo", 4, 5], ["lineTo", 4, 21], ["lineTo", 20, 21], ["lineTo", 20, 15]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "bulb": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 9, 18], ["lineTo", 15, 18], ["moveTo", 9, 21], ["lineTo", 15, 21], ["moveTo", 8, 14], ["lineTo", 7.035, 12.679], ["lineTo", 6.375, 11.355], ["lineTo", 5.996, 10.049], ["lineTo", 5.875, 8.781], ["lineTo", 5.988, 7.572], ["lineTo", 6.312, 6.441], ["lineTo", 6.824, 5.411], ["lineTo", 7.5, 4.5], ["lineTo", 8.316, 3.73], ["lineTo", 9.25, 3.121], ["lineTo", 10.277, 2.694], ["lineTo", 11.375, 2.469], ["lineTo", 12.52, 2.466], ["lineTo", 13.688, 2.707], ["lineTo", 14.855, 3.211], ["lineTo", 16, 4], ["lineTo", 16.67, 4.75], ["lineTo", 17.189, 5.496], ["lineTo", 17.571, 6.237], ["lineTo", 17.828, 6.969], ["lineTo", 17.974, 7.689], ["lineTo", 18.021, 8.395], ["lineTo", 17.984, 9.083], ["lineTo", 17.875, 9.75], ["lineTo", 17.707, 10.394], ["lineTo", 17.494, 11.012], ["lineTo", 17.249, 11.6], ["lineTo", 16.984, 12.156], ["lineTo", 16.714, 12.677], ["lineTo", 16.451, 13.16], ["lineTo", 16.209, 13.602], ["lineTo", 16, 14], ["lineTo", 15, 16], ["lineTo", 9, 16], ["lineTo", 8, 14], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "clock": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 3, 12], ["lineTo", 3.046, 11.08], ["lineTo", 3.183, 10.186], ["lineTo", 3.405, 9.324], ["lineTo", 3.707, 8.497], ["lineTo", 4.086, 7.71], ["lineTo", 4.537, 6.968], ["lineTo", 5.055, 6.275], ["lineTo", 5.636, 5.636], ["lineTo", 6.275, 5.055], ["lineTo", 6.968, 4.537], ["lineTo", 7.71, 4.086], ["lineTo", 8.497, 3.707], ["lineTo", 9.324, 3.405], ["lineTo", 10.186, 3.183], ["lineTo", 11.08, 3.046], ["lineTo", 12, 3], ["lineTo", 12.92, 3.046], ["lineTo", 13.814, 3.183], ["lineTo", 14.676, 3.405], ["lineTo", 15.503, 3.707], ["lineTo", 16.29, 4.086], ["lineTo", 17.032, 4.537], ["lineTo", 17.725, 5.055], ["lineTo", 18.364, 5.636], ["lineTo", 18.945, 6.275], ["lineTo", 19.463, 6.968], ["lineTo", 19.914, 7.71], ["lineTo", 20.293, 8.497], ["lineTo", 20.595, 9.324], ["lineTo", 20.817, 10.186], ["lineTo", 20.954, 11.08], ["lineTo", 21, 12], ["lineTo", 20.954, 12.92], ["lineTo", 20.817, 13.814], ["lineTo", 20.595, 14.676], ["lineTo", 20.293, 15.503], ["lineTo", 19.914, 16.29], ["lineTo", 19.463, 17.032], ["lineTo", 18.945, 17.725], ["lineTo", 18.364, 18.364], ["lineTo", 17.725, 18.945], ["lineTo", 17.032, 19.463], ["lineTo", 16.29, 19.914], ["lineTo", 15.503, 20.293], ["lineTo", 14.676, 20.595], ["lineTo", 13.814, 20.817], ["lineTo", 12.92, 20.954], ["lineTo", 12, 21], ["lineTo", 11.08, 20.954], ["lineTo", 10.186, 20.817], ["lineTo", 9.324, 20.595], ["lineTo", 8.497, 20.293], ["lineTo", 7.71, 19.914], ["lineTo", 6.968, 19.463], ["lineTo", 6.275, 18.945], ["lineTo", 5.636, 18.364], ["lineTo", 5.055, 17.725], ["lineTo", 4.537, 17.032], ["lineTo", 4.086, 16.29], ["lineTo", 3.707, 15.503], ["lineTo", 3.405, 14.676], ["lineTo", 3.183, 13.814], ["lineTo", 3.046, 12.92], ["lineTo", 3, 12]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 12, 6], ["lineTo", 12, 12], ["lineTo", 16, 14]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "clover": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 12, 12], ["lineTo", 9.934, 11.877], ["lineTo", 8.223, 11.533], ["lineTo", 6.845, 11.005], ["lineTo", 5.781, 10.328], ["lineTo", 5.01, 9.54], ["lineTo", 4.512, 8.678], ["lineTo", 4.265, 7.777], ["lineTo", 4.25, 6.875], ["lineTo", 4.446, 6.008], ["lineTo", 4.832, 5.213], ["lineTo", 5.388, 4.526], ["lineTo", 6.094, 3.984], ["lineTo", 6.928, 3.624], ["lineTo", 7.871, 3.482], ["lineTo", 8.902, 3.595], ["lineTo", 10, 4], ["lineTo", 12, 7], ["lineTo", 14, 4], ["lineTo", 15.098, 3.595], ["lineTo", 16.129, 3.482], ["lineTo", 17.072, 3.624], ["lineTo", 17.906, 3.984], ["lineTo", 18.612, 4.526], ["lineTo", 19.168, 5.213], ["lineTo", 19.554, 6.008], ["lineTo", 19.75, 6.875], ["lineTo", 19.735, 7.777], ["lineTo", 19.488, 8.678], ["lineTo", 18.99, 9.54], ["lineTo", 18.219, 10.328], ["lineTo", 17.155, 11.005], ["lineTo", 15.777, 11.533], ["lineTo", 14.066, 11.877], ["lineTo", 12, 12], ["lineTo", 14.066, 12.123], ["lineTo", 15.777, 12.467], ["lineTo", 17.155, 12.995], ["lineTo", 18.219, 13.672], ["lineTo", 18.99, 14.46], ["lineTo", 19.488, 15.322], ["lineTo", 19.735, 16.223], ["lineTo", 19.75, 17.125], ["lineTo", 19.554, 17.992], ["lineTo", 19.168, 18.787], ["lineTo", 18.612, 19.474], ["lineTo", 17.906, 20.016], ["lineTo", 17.072, 20.376], ["lineTo", 16.129, 20.518], ["lineTo", 15.098, 20.405], ["lineTo", 14, 20], ["lineTo", 12, 17], ["lineTo", 10, 20], ["lineTo", 8.902, 20.405], ["lineTo", 7.871, 20.518], ["lineTo", 6.928, 20.376], ["lineTo", 6.094, 20.016], ["lineTo", 5.388, 19.474], ["lineTo", 4.832, 18.787], ["lineTo", 4.446, 17.992], ["lineTo", 4.25, 17.125], ["lineTo", 4.265, 16.223], ["lineTo", 4.512, 15.322], ["lineTo", 5.01, 14.46], ["lineTo", 5.781, 13.672], ["lineTo", 6.845, 12.995], ["lineTo", 8.223, 12.467], ["lineTo", 9.934, 12.123], ["lineTo", 12, 12], ["closePath"], ["moveTo", 12, 12], ["lineTo", 20, 21]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "lock": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 7, 10], ["lineTo", 17, 10], ["lineTo", 17.307, 10.015], ["lineTo", 17.605, 10.061], ["lineTo", 17.892, 10.135], ["lineTo", 18.168, 10.236], ["lineTo", 18.43, 10.362], ["lineTo", 18.677, 10.512], ["lineTo", 18.908, 10.685], ["lineTo", 19.121, 10.879], ["lineTo", 19.315, 11.092], ["lineTo", 19.488, 11.323], ["lineTo", 19.638, 11.57], ["lineTo", 19.764, 11.832], ["lineTo", 19.865, 12.108], ["lineTo", 19.939, 12.395], ["lineTo", 19.985, 12.693], ["lineTo", 20, 13], ["lineTo", 20, 18], ["lineTo", 19.985, 18.307], ["lineTo", 19.939, 18.605], ["lineTo", 19.865, 18.892], ["lineTo", 19.764, 19.168], ["lineTo", 19.638, 19.43], ["lineTo", 19.488, 19.677], ["lineTo", 19.315, 19.908], ["lineTo", 19.121, 20.121], ["lineTo", 18.908, 20.315], ["lineTo", 18.677, 20.488], ["lineTo", 18.43, 20.638], ["lineTo", 18.168, 20.764], ["lineTo", 17.892, 20.865], ["lineTo", 17.605, 20.939], ["lineTo", 17.307, 20.985], ["lineTo", 17, 21], ["lineTo", 7, 21], ["lineTo", 6.693, 20.985], ["lineTo", 6.395, 20.939], ["lineTo", 6.108, 20.865], ["lineTo", 5.832, 20.764], ["lineTo", 5.57, 20.638], ["lineTo", 5.323, 20.488], ["lineTo", 5.092, 20.315], ["lineTo", 4.879, 20.121], ["lineTo", 4.685, 19.908], ["lineTo", 4.512, 19.677], ["lineTo", 4.362, 19.43], ["lineTo", 4.236, 19.168], ["lineTo", 4.135, 18.892], ["lineTo", 4.061, 18.605], ["lineTo", 4.015, 18.307], ["lineTo", 4, 18], ["lineTo", 4, 13], ["lineTo", 4.015, 12.693], ["lineTo", 4.061, 12.395], ["lineTo", 4.135, 12.108], ["lineTo", 4.236, 11.832], ["lineTo", 4.362, 11.57], ["lineTo", 4.512, 11.323], ["lineTo", 4.685, 11.092], ["lineTo", 4.879, 10.879], ["lineTo", 5.092, 10.685], ["lineTo", 5.323, 10.512], ["lineTo", 5.57, 10.362], ["lineTo", 5.832, 10.236], ["lineTo", 6.108, 10.135], ["lineTo", 6.395, 10.061], ["lineTo", 6.693, 10.015], ["lineTo", 7, 10], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 8, 10], ["lineTo", 8, 6], ["lineTo", 8.021, 5.591], ["lineTo", 8.081, 5.194], ["lineTo", 8.18, 4.811], ["lineTo", 8.314, 4.443], ["lineTo", 8.483, 4.093], ["lineTo", 8.683, 3.764], ["lineTo", 8.913, 3.456], ["lineTo", 9.172, 3.172], ["lineTo", 9.456, 2.913], ["lineTo", 9.764, 2.683], ["lineTo", 10.093, 2.483], ["lineTo", 10.443, 2.314], ["lineTo", 10.811, 2.18], ["lineTo", 11.194, 2.081], ["lineTo", 11.591, 2.021], ["lineTo", 12, 2], ["lineTo", 12.409, 2.021], ["lineTo", 12.806, 2.081], ["lineTo", 13.189, 2.18], ["lineTo", 13.557, 2.314], ["lineTo", 13.907, 2.483], ["lineTo", 14.236, 2.683], ["lineTo", 14.544, 2.913], ["lineTo", 14.828, 3.172], ["lineTo", 15.087, 3.456], ["lineTo", 15.317, 3.764], ["lineTo", 15.517, 4.093], ["lineTo", 15.686, 4.443], ["lineTo", 15.82, 4.811], ["lineTo", 15.919, 5.194], ["lineTo", 15.979, 5.591], ["lineTo", 16, 6], ["lineTo", 16, 10], ["moveTo", 12, 14], ["lineTo", 12, 17]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "leaf": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 20, 3], ["lineTo", 17.821, 2.728], ["lineTo", 15.787, 2.654], ["lineTo", 13.903, 2.765], ["lineTo", 12.172, 3.047], ["lineTo", 10.599, 3.487], ["lineTo", 9.189, 4.072], ["lineTo", 7.947, 4.789], ["lineTo", 6.875, 5.625], ["lineTo", 5.979, 6.566], ["lineTo", 5.264, 7.6], ["lineTo", 4.733, 8.712], ["lineTo", 4.391, 9.891], ["lineTo", 4.242, 11.122], ["lineTo", 4.291, 12.393], ["lineTo", 4.542, 13.69], ["lineTo", 5, 15], ["lineTo", 5.663, 16.195], ["lineTo", 6.506, 17.15], ["lineTo", 7.498, 17.863], ["lineTo", 8.609, 18.328], ["lineTo", 9.808, 18.541], ["lineTo", 11.064, 18.498], ["lineTo", 12.347, 18.194], ["lineTo", 13.625, 17.625], ["lineTo", 14.868, 16.786], ["lineTo", 16.045, 15.674], ["lineTo", 17.125, 14.283], ["lineTo", 18.078, 12.609], ["lineTo", 18.873, 10.649], ["lineTo", 19.479, 8.396], ["lineTo", 19.865, 5.848], ["lineTo", 20, 3], ["closePath"], ["moveTo", 4, 21], ["lineTo", 16, 8]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "play": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 9, 6], ["lineTo", 19, 12], ["lineTo", 9, 18], ["lineTo", 9, 6], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "heart": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 20.8, 4.6], ["lineTo", 20.61, 4.419], ["lineTo", 20.411, 4.247], ["lineTo", 20.205, 4.087], ["lineTo", 19.992, 3.937], ["lineTo", 19.773, 3.798], ["lineTo", 19.548, 3.671], ["lineTo", 19.316, 3.554], ["lineTo", 19.08, 3.449], ["lineTo", 18.838, 3.356], ["lineTo", 18.593, 3.275], ["lineTo", 18.343, 3.205], ["lineTo", 18.09, 3.148], ["lineTo", 17.833, 3.104], ["lineTo", 17.574, 3.071], ["lineTo", 17.313, 3.052], ["lineTo", 17.05, 3.045], ["lineTo", 16.787, 3.052], ["lineTo", 16.526, 3.071], ["lineTo", 16.267, 3.104], ["lineTo", 16.01, 3.148], ["lineTo", 15.757, 3.205], ["lineTo", 15.507, 3.275], ["lineTo", 15.262, 3.356], ["lineTo", 15.02, 3.449], ["lineTo", 14.784, 3.554], ["lineTo", 14.552, 3.671], ["lineTo", 14.327, 3.798], ["lineTo", 14.108, 3.937], ["lineTo", 13.895, 4.087], ["lineTo", 13.689, 4.247], ["lineTo", 13.49, 4.419], ["lineTo", 13.3, 4.6], ["lineTo", 12, 5.9], ["lineTo", 10.7, 4.6], ["lineTo", 10.297, 4.236], ["lineTo", 9.868, 3.92], ["lineTo", 9.416, 3.653], ["lineTo", 8.946, 3.435], ["lineTo", 8.46, 3.265], ["lineTo", 7.963, 3.144], ["lineTo", 7.458, 3.071], ["lineTo", 6.95, 3.047], ["lineTo", 6.442, 3.071], ["lineTo", 5.937, 3.144], ["lineTo", 5.44, 3.265], ["lineTo", 4.954, 3.435], ["lineTo", 4.484, 3.653], ["lineTo", 4.032, 3.92], ["lineTo", 3.603, 4.236], ["lineTo", 3.2, 4.6], ["lineTo", 2.836, 5.003], ["lineTo", 2.52, 5.432], ["lineTo", 2.253, 5.884], ["lineTo", 2.035, 6.354], ["lineTo", 1.865, 6.84], ["lineTo", 1.744, 7.337], ["lineTo", 1.671, 7.842], ["lineTo", 1.647, 8.35], ["lineTo", 1.671, 8.858], ["lineTo", 1.744, 9.363], ["lineTo", 1.865, 9.86], ["lineTo", 2.035, 10.346], ["lineTo", 2.253, 10.816], ["lineTo", 2.52, 11.268], ["lineTo", 2.836, 11.697], ["lineTo", 3.2, 12.1], ["lineTo", 12, 21], ["lineTo", 20.8, 12.1], ["lineTo", 20.981, 11.91], ["lineTo", 21.153, 11.711], ["lineTo", 21.313, 11.505], ["lineTo", 21.463, 11.292], ["lineTo", 21.602, 11.073], ["lineTo", 21.729, 10.848], ["lineTo", 21.846, 10.616], ["lineTo", 21.951, 10.38], ["lineTo", 22.044, 10.138], ["lineTo", 22.125, 9.893], ["lineTo", 22.195, 9.643], ["lineTo", 22.252, 9.39], ["lineTo", 22.296, 9.133], ["lineTo", 22.329, 8.874], ["lineTo", 22.348, 8.613], ["lineTo", 22.355, 8.35], ["lineTo", 22.348, 8.087], ["lineTo", 22.329, 7.826], ["lineTo", 22.296, 7.567], ["lineTo", 22.252, 7.31], ["lineTo", 22.195, 7.057], ["lineTo", 22.125, 6.807], ["lineTo", 22.044, 6.562], ["lineTo", 21.951, 6.32], ["lineTo", 21.846, 6.084], ["lineTo", 21.729, 5.852], ["lineTo", 21.602, 5.627], ["lineTo", 21.463, 5.408], ["lineTo", 21.313, 5.195], ["lineTo", 21.153, 4.989], ["lineTo", 20.981, 4.79], ["lineTo", 20.8, 4.6], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "coin": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 4, 6], ["lineTo", 4.041, 5.693], ["lineTo", 4.163, 5.395], ["lineTo", 4.36, 5.108], ["lineTo", 4.629, 4.832], ["lineTo", 4.966, 4.57], ["lineTo", 5.366, 4.323], ["lineTo", 5.827, 4.092], ["lineTo", 6.343, 3.879], ["lineTo", 6.911, 3.685], ["lineTo", 7.527, 3.512], ["lineTo", 8.187, 3.362], ["lineTo", 8.886, 3.236], ["lineTo", 9.621, 3.135], ["lineTo", 10.388, 3.061], ["lineTo", 11.182, 3.015], ["lineTo", 12, 3], ["lineTo", 12.818, 3.015], ["lineTo", 13.612, 3.061], ["lineTo", 14.379, 3.135], ["lineTo", 15.114, 3.236], ["lineTo", 15.813, 3.362], ["lineTo", 16.473, 3.512], ["lineTo", 17.089, 3.685], ["lineTo", 17.657, 3.879], ["lineTo", 18.173, 4.092], ["lineTo", 18.634, 4.323], ["lineTo", 19.034, 4.57], ["lineTo", 19.371, 4.832], ["lineTo", 19.64, 5.108], ["lineTo", 19.837, 5.395], ["lineTo", 19.959, 5.693], ["lineTo", 20, 6], ["lineTo", 19.959, 6.307], ["lineTo", 19.837, 6.605], ["lineTo", 19.64, 6.892], ["lineTo", 19.371, 7.168], ["lineTo", 19.034, 7.43], ["lineTo", 18.634, 7.677], ["lineTo", 18.173, 7.908], ["lineTo", 17.657, 8.121], ["lineTo", 17.089, 8.315], ["lineTo", 16.473, 8.488], ["lineTo", 15.813, 8.638], ["lineTo", 15.114, 8.764], ["lineTo", 14.379, 8.865], ["lineTo", 13.612, 8.939], ["lineTo", 12.818, 8.985], ["lineTo", 12, 9], ["lineTo", 11.182, 8.985], ["lineTo", 10.388, 8.939], ["lineTo", 9.621, 8.865], ["lineTo", 8.886, 8.764], ["lineTo", 8.187, 8.638], ["lineTo", 7.527, 8.488], ["lineTo", 6.911, 8.315], ["lineTo", 6.343, 8.121], ["lineTo", 5.827, 7.908], ["lineTo", 5.366, 7.677], ["lineTo", 4.966, 7.43], ["lineTo", 4.629, 7.168], ["lineTo", 4.36, 6.892], ["lineTo", 4.163, 6.605], ["lineTo", 4.041, 6.307], ["lineTo", 4, 6]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 4, 6], ["lineTo", 4, 11], ["lineTo", 4.18, 11.703], ["lineTo", 4.688, 12.312], ["lineTo", 5.477, 12.828], ["lineTo", 6.5, 13.25], ["lineTo", 7.711, 13.578], ["lineTo", 9.062, 13.812], ["lineTo", 10.508, 13.953], ["lineTo", 12, 14], ["lineTo", 13.492, 13.953], ["lineTo", 14.938, 13.812], ["lineTo", 16.289, 13.578], ["lineTo", 17.5, 13.25], ["lineTo", 18.523, 12.828], ["lineTo", 19.312, 12.312], ["lineTo", 19.82, 11.703], ["lineTo", 20, 11], ["lineTo", 20, 6], ["moveTo", 4, 11], ["lineTo", 4, 16], ["lineTo", 4.18, 16.703], ["lineTo", 4.688, 17.312], ["lineTo", 5.477, 17.828], ["lineTo", 6.5, 18.25], ["lineTo", 7.711, 18.578], ["lineTo", 9.062, 18.812], ["lineTo", 10.508, 18.953], ["lineTo", 12, 19], ["lineTo", 13.492, 18.953], ["lineTo", 14.938, 18.812], ["lineTo", 16.289, 18.578], ["lineTo", 17.5, 18.25], ["lineTo", 18.523, 17.828], ["lineTo", 19.312, 17.312], ["lineTo", 19.82, 16.703], ["lineTo", 20, 16], ["lineTo", 20, 11]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "home": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 3, 10], ["lineTo", 12, 3], ["lineTo", 21, 10], ["lineTo", 21, 20], ["lineTo", 3, 20], ["lineTo", 3, 10], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 9, 20], ["lineTo", 9, 13], ["lineTo", 15, 13], ["lineTo", 15, 20]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "growth": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 3, 20], ["lineTo", 3, 4], ["moveTo", 3, 20], ["lineTo", 21, 20], ["moveTo", 6, 15], ["lineTo", 11, 10], ["lineTo", 15, 13], ["lineTo", 21, 5], ["moveTo", 15, 5], ["lineTo", 21, 5], ["lineTo", 21, 11]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "film": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 6, 4], ["lineTo", 18, 4], ["lineTo", 18.307, 4.015], ["lineTo", 18.605, 4.061], ["lineTo", 18.892, 4.135], ["lineTo", 19.168, 4.236], ["lineTo", 19.43, 4.362], ["lineTo", 19.677, 4.512], ["lineTo", 19.908, 4.685], ["lineTo", 20.121, 4.879], ["lineTo", 20.315, 5.092], ["lineTo", 20.488, 5.323], ["lineTo", 20.638, 5.57], ["lineTo", 20.764, 5.832], ["lineTo", 20.865, 6.108], ["lineTo", 20.939, 6.395], ["lineTo", 20.985, 6.693], ["lineTo", 21, 7], ["lineTo", 21, 17], ["lineTo", 20.985, 17.307], ["lineTo", 20.939, 17.605], ["lineTo", 20.865, 17.892], ["lineTo", 20.764, 18.168], ["lineTo", 20.638, 18.43], ["lineTo", 20.488, 18.677], ["lineTo", 20.315, 18.908], ["lineTo", 20.121, 19.121], ["lineTo", 19.908, 19.315], ["lineTo", 19.677, 19.488], ["lineTo", 19.43, 19.638], ["lineTo", 19.168, 19.764], ["lineTo", 18.892, 19.865], ["lineTo", 18.605, 19.939], ["lineTo", 18.307, 19.985], ["lineTo", 18, 20], ["lineTo", 6, 20], ["lineTo", 5.693, 19.985], ["lineTo", 5.395, 19.939], ["lineTo", 5.108, 19.865], ["lineTo", 4.832, 19.764], ["lineTo", 4.57, 19.638], ["lineTo", 4.323, 19.488], ["lineTo", 4.092, 19.315], ["lineTo", 3.879, 19.121], ["lineTo", 3.685, 18.908], ["lineTo", 3.512, 18.677], ["lineTo", 3.362, 18.43], ["lineTo", 3.236, 18.168], ["lineTo", 3.135, 17.892], ["lineTo", 3.061, 17.605], ["lineTo", 3.015, 17.307], ["lineTo", 3, 17], ["lineTo", 3, 7], ["lineTo", 3.015, 6.693], ["lineTo", 3.061, 6.395], ["lineTo", 3.135, 6.108], ["lineTo", 3.236, 5.832], ["lineTo", 3.362, 5.57], ["lineTo", 3.512, 5.323], ["lineTo", 3.685, 5.092], ["lineTo", 3.879, 4.879], ["lineTo", 4.092, 4.685], ["lineTo", 4.323, 4.512], ["lineTo", 4.57, 4.362], ["lineTo", 4.832, 4.236], ["lineTo", 5.108, 4.135], ["lineTo", 5.395, 4.061], ["lineTo", 5.693, 4.015], ["lineTo", 6, 4], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 10, 8], ["lineTo", 16, 12], ["lineTo", 10, 16], ["lineTo", 10, 8], ["closePath"], ["moveTo", 3, 8], ["lineTo", 6, 8], ["moveTo", 3, 16], ["lineTo", 6, 16], ["moveTo", 18, 8], ["lineTo", 21, 8], ["moveTo", 18, 16], ["lineTo", 21, 16]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "computer": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 5, 3], ["lineTo", 19, 3], ["lineTo", 19.204, 3.01], ["lineTo", 19.403, 3.041], ["lineTo", 19.595, 3.09], ["lineTo", 19.778, 3.157], ["lineTo", 19.953, 3.241], ["lineTo", 20.118, 3.342], ["lineTo", 20.272, 3.457], ["lineTo", 20.414, 3.586], ["lineTo", 20.543, 3.728], ["lineTo", 20.658, 3.882], ["lineTo", 20.759, 4.047], ["lineTo", 20.843, 4.222], ["lineTo", 20.91, 4.405], ["lineTo", 20.959, 4.597], ["lineTo", 20.99, 4.796], ["lineTo", 21, 5], ["lineTo", 21, 14], ["lineTo", 20.99, 14.204], ["lineTo", 20.959, 14.403], ["lineTo", 20.91, 14.595], ["lineTo", 20.843, 14.778], ["lineTo", 20.759, 14.953], ["lineTo", 20.658, 15.118], ["lineTo", 20.543, 15.272], ["lineTo", 20.414, 15.414], ["lineTo", 20.272, 15.543], ["lineTo", 20.118, 15.658], ["lineTo", 19.953, 15.759], ["lineTo", 19.778, 15.843], ["lineTo", 19.595, 15.91], ["lineTo", 19.403, 15.959], ["lineTo", 19.204, 15.99], ["lineTo", 19, 16], ["lineTo", 5, 16], ["lineTo", 4.796, 15.99], ["lineTo", 4.597, 15.959], ["lineTo", 4.405, 15.91], ["lineTo", 4.222, 15.843], ["lineTo", 4.047, 15.759], ["lineTo", 3.882, 15.658], ["lineTo", 3.728, 15.543], ["lineTo", 3.586, 15.414], ["lineTo", 3.457, 15.272], ["lineTo", 3.342, 15.118], ["lineTo", 3.241, 14.953], ["lineTo", 3.157, 14.778], ["lineTo", 3.09, 14.595], ["lineTo", 3.041, 14.403], ["lineTo", 3.01, 14.204], ["lineTo", 3, 14], ["lineTo", 3, 5], ["lineTo", 3.01, 4.796], ["lineTo", 3.041, 4.597], ["lineTo", 3.09, 4.405], ["lineTo", 3.157, 4.222], ["lineTo", 3.241, 4.047], ["lineTo", 3.342, 3.882], ["lineTo", 3.457, 3.728], ["lineTo", 3.586, 3.586], ["lineTo", 3.728, 3.457], ["lineTo", 3.882, 3.342], ["lineTo", 4.047, 3.241], ["lineTo", 4.222, 3.157], ["lineTo", 4.405, 3.09], ["lineTo", 4.597, 3.041], ["lineTo", 4.796, 3.01], ["lineTo", 5, 3], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 8, 21], ["lineTo", 16, 21], ["moveTo", 12, 16], ["lineTo", 12, 21], ["moveTo", 7, 12], ["lineTo", 17, 12]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "phone": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 9, 2], ["lineTo", 15, 2], ["lineTo", 15.307, 2.015], ["lineTo", 15.605, 2.061], ["lineTo", 15.892, 2.135], ["lineTo", 16.168, 2.236], ["lineTo", 16.43, 2.362], ["lineTo", 16.677, 2.512], ["lineTo", 16.908, 2.685], ["lineTo", 17.121, 2.879], ["lineTo", 17.315, 3.092], ["lineTo", 17.488, 3.323], ["lineTo", 17.638, 3.57], ["lineTo", 17.764, 3.832], ["lineTo", 17.865, 4.108], ["lineTo", 17.939, 4.395], ["lineTo", 17.985, 4.693], ["lineTo", 18, 5], ["lineTo", 18, 19], ["lineTo", 17.985, 19.307], ["lineTo", 17.939, 19.605], ["lineTo", 17.865, 19.892], ["lineTo", 17.764, 20.168], ["lineTo", 17.638, 20.43], ["lineTo", 17.488, 20.677], ["lineTo", 17.315, 20.908], ["lineTo", 17.121, 21.121], ["lineTo", 16.908, 21.315], ["lineTo", 16.677, 21.488], ["lineTo", 16.43, 21.638], ["lineTo", 16.168, 21.764], ["lineTo", 15.892, 21.865], ["lineTo", 15.605, 21.939], ["lineTo", 15.307, 21.985], ["lineTo", 15, 22], ["lineTo", 9, 22], ["lineTo", 8.693, 21.985], ["lineTo", 8.395, 21.939], ["lineTo", 8.108, 21.865], ["lineTo", 7.832, 21.764], ["lineTo", 7.57, 21.638], ["lineTo", 7.323, 21.488], ["lineTo", 7.092, 21.315], ["lineTo", 6.879, 21.121], ["lineTo", 6.685, 20.908], ["lineTo", 6.512, 20.677], ["lineTo", 6.362, 20.43], ["lineTo", 6.236, 20.168], ["lineTo", 6.135, 19.892], ["lineTo", 6.061, 19.605], ["lineTo", 6.015, 19.307], ["lineTo", 6, 19], ["lineTo", 6, 5], ["lineTo", 6.015, 4.693], ["lineTo", 6.061, 4.395], ["lineTo", 6.135, 4.108], ["lineTo", 6.236, 3.832], ["lineTo", 6.362, 3.57], ["lineTo", 6.512, 3.323], ["lineTo", 6.685, 3.092], ["lineTo", 6.879, 2.879], ["lineTo", 7.092, 2.685], ["lineTo", 7.323, 2.512], ["lineTo", 7.57, 2.362], ["lineTo", 7.832, 2.236], ["lineTo", 8.108, 2.135], ["lineTo", 8.395, 2.061], ["lineTo", 8.693, 2.015], ["lineTo", 9, 2], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 10, 5], ["lineTo", 14, 5], ["moveTo", 11, 18], ["lineTo", 13, 18]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "equipment": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 7, 21], ["lineTo", 9, 13], ["moveTo", 17, 21], ["lineTo", 15, 13], ["moveTo", 12, 13], ["lineTo", 12, 21]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 6, 5], ["lineTo", 18, 5], ["lineTo", 18.204, 5.01], ["lineTo", 18.403, 5.041], ["lineTo", 18.595, 5.09], ["lineTo", 18.778, 5.157], ["lineTo", 18.953, 5.241], ["lineTo", 19.118, 5.342], ["lineTo", 19.272, 5.457], ["lineTo", 19.414, 5.586], ["lineTo", 19.543, 5.728], ["lineTo", 19.658, 5.882], ["lineTo", 19.759, 6.047], ["lineTo", 19.843, 6.222], ["lineTo", 19.91, 6.405], ["lineTo", 19.959, 6.597], ["lineTo", 19.99, 6.796], ["lineTo", 20, 7], ["lineTo", 20, 12], ["lineTo", 19.99, 12.204], ["lineTo", 19.959, 12.403], ["lineTo", 19.91, 12.595], ["lineTo", 19.843, 12.778], ["lineTo", 19.759, 12.953], ["lineTo", 19.658, 13.118], ["lineTo", 19.543, 13.272], ["lineTo", 19.414, 13.414], ["lineTo", 19.272, 13.543], ["lineTo", 19.118, 13.658], ["lineTo", 18.953, 13.759], ["lineTo", 18.778, 13.843], ["lineTo", 18.595, 13.91], ["lineTo", 18.403, 13.959], ["lineTo", 18.204, 13.99], ["lineTo", 18, 14], ["lineTo", 6, 14], ["lineTo", 5.796, 13.99], ["lineTo", 5.597, 13.959], ["lineTo", 5.405, 13.91], ["lineTo", 5.222, 13.843], ["lineTo", 5.047, 13.759], ["lineTo", 4.882, 13.658], ["lineTo", 4.728, 13.543], ["lineTo", 4.586, 13.414], ["lineTo", 4.457, 13.272], ["lineTo", 4.342, 13.118], ["lineTo", 4.241, 12.953], ["lineTo", 4.157, 12.778], ["lineTo", 4.09, 12.595], ["lineTo", 4.041, 12.403], ["lineTo", 4.01, 12.204], ["lineTo", 4, 12], ["lineTo", 4, 7], ["lineTo", 4.01, 6.796], ["lineTo", 4.041, 6.597], ["lineTo", 4.09, 6.405], ["lineTo", 4.157, 6.222], ["lineTo", 4.241, 6.047], ["lineTo", 4.342, 5.882], ["lineTo", 4.457, 5.728], ["lineTo", 4.586, 5.586], ["lineTo", 4.728, 5.457], ["lineTo", 4.882, 5.342], ["lineTo", 5.047, 5.241], ["lineTo", 5.222, 5.157], ["lineTo", 5.405, 5.09], ["lineTo", 5.597, 5.041], ["lineTo", 5.796, 5.01], ["lineTo", 6, 5], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 9.5, 9.5], ["lineTo", 9.513, 9.244], ["lineTo", 9.551, 8.996], ["lineTo", 9.612, 8.757], ["lineTo", 9.696, 8.527], ["lineTo", 9.802, 8.308], ["lineTo", 9.927, 8.102], ["lineTo", 10.071, 7.91], ["lineTo", 10.232, 7.732], ["lineTo", 10.41, 7.571], ["lineTo", 10.602, 7.427], ["lineTo", 10.808, 7.302], ["lineTo", 11.027, 7.196], ["lineTo", 11.257, 7.112], ["lineTo", 11.496, 7.051], ["lineTo", 11.744, 7.013], ["lineTo", 12, 7], ["lineTo", 12.256, 7.013], ["lineTo", 12.504, 7.051], ["lineTo", 12.743, 7.112], ["lineTo", 12.973, 7.196], ["lineTo", 13.192, 7.302], ["lineTo", 13.398, 7.427], ["lineTo", 13.59, 7.571], ["lineTo", 13.768, 7.732], ["lineTo", 13.929, 7.91], ["lineTo", 14.073, 8.102], ["lineTo", 14.198, 8.308], ["lineTo", 14.304, 8.527], ["lineTo", 14.388, 8.757], ["lineTo", 14.449, 8.996], ["lineTo", 14.487, 9.244], ["lineTo", 14.5, 9.5], ["lineTo", 14.487, 9.756], ["lineTo", 14.449, 10.004], ["lineTo", 14.388, 10.243], ["lineTo", 14.304, 10.473], ["lineTo", 14.198, 10.692], ["lineTo", 14.073, 10.898], ["lineTo", 13.929, 11.09], ["lineTo", 13.768, 11.268], ["lineTo", 13.59, 11.429], ["lineTo", 13.398, 11.573], ["lineTo", 13.192, 11.698], ["lineTo", 12.973, 11.804], ["lineTo", 12.743, 11.888], ["lineTo", 12.504, 11.949], ["lineTo", 12.256, 11.987], ["lineTo", 12, 12], ["lineTo", 11.744, 11.987], ["lineTo", 11.496, 11.949], ["lineTo", 11.257, 11.888], ["lineTo", 11.027, 11.804], ["lineTo", 10.808, 11.698], ["lineTo", 10.602, 11.573], ["lineTo", 10.41, 11.429], ["lineTo", 10.232, 11.268], ["lineTo", 10.071, 11.09], ["lineTo", 9.927, 10.898], ["lineTo", 9.802, 10.692], ["lineTo", 9.696, 10.473], ["lineTo", 9.612, 10.243], ["lineTo", 9.551, 10.004], ["lineTo", 9.513, 9.756], ["lineTo", 9.5, 9.5]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 7, 5], ["lineTo", 7, 3], ["lineTo", 12, 3], ["lineTo", 12, 5]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "pen": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 4, 15], ["lineTo", 15, 4], ["lineTo", 20, 9], ["lineTo", 9, 20], ["lineTo", 3, 21], ["lineTo", 4, 15], ["closePath"], ["moveTo", 12, 7], ["lineTo", 17, 12]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "arrow": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 4, 12], ["lineTo", 20, 12], ["moveTo", 14, 6], ["lineTo", 20, 12], ["lineTo", 14, 18]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "gift": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 4, 8], ["lineTo", 20, 8], ["lineTo", 20.102, 8.005], ["lineTo", 20.202, 8.02], ["lineTo", 20.297, 8.045], ["lineTo", 20.389, 8.079], ["lineTo", 20.477, 8.121], ["lineTo", 20.559, 8.171], ["lineTo", 20.636, 8.228], ["lineTo", 20.707, 8.293], ["lineTo", 20.772, 8.364], ["lineTo", 20.829, 8.441], ["lineTo", 20.879, 8.523], ["lineTo", 20.921, 8.611], ["lineTo", 20.955, 8.703], ["lineTo", 20.98, 8.798], ["lineTo", 20.995, 8.898], ["lineTo", 21, 9], ["lineTo", 21, 11], ["lineTo", 20.995, 11.102], ["lineTo", 20.98, 11.202], ["lineTo", 20.955, 11.297], ["lineTo", 20.921, 11.389], ["lineTo", 20.879, 11.477], ["lineTo", 20.829, 11.559], ["lineTo", 20.772, 11.636], ["lineTo", 20.707, 11.707], ["lineTo", 20.636, 11.772], ["lineTo", 20.559, 11.829], ["lineTo", 20.477, 11.879], ["lineTo", 20.389, 11.921], ["lineTo", 20.297, 11.955], ["lineTo", 20.202, 11.98], ["lineTo", 20.102, 11.995], ["lineTo", 20, 12], ["lineTo", 4, 12], ["lineTo", 3.898, 11.995], ["lineTo", 3.798, 11.98], ["lineTo", 3.703, 11.955], ["lineTo", 3.611, 11.921], ["lineTo", 3.523, 11.879], ["lineTo", 3.441, 11.829], ["lineTo", 3.364, 11.772], ["lineTo", 3.293, 11.707], ["lineTo", 3.228, 11.636], ["lineTo", 3.171, 11.559], ["lineTo", 3.121, 11.477], ["lineTo", 3.079, 11.389], ["lineTo", 3.045, 11.297], ["lineTo", 3.02, 11.202], ["lineTo", 3.005, 11.102], ["lineTo", 3, 11], ["lineTo", 3, 9], ["lineTo", 3.005, 8.898], ["lineTo", 3.02, 8.798], ["lineTo", 3.045, 8.703], ["lineTo", 3.079, 8.611], ["lineTo", 3.121, 8.523], ["lineTo", 3.171, 8.441], ["lineTo", 3.228, 8.364], ["lineTo", 3.293, 8.293], ["lineTo", 3.364, 8.228], ["lineTo", 3.441, 8.171], ["lineTo", 3.523, 8.121], ["lineTo", 3.611, 8.079], ["lineTo", 3.703, 8.045], ["lineTo", 3.798, 8.02], ["lineTo", 3.898, 8.005], ["lineTo", 4, 8], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 5, 12], ["lineTo", 5, 21], ["lineTo", 19, 21], ["lineTo", 19, 12], ["moveTo", 12, 8], ["lineTo", 12, 21], ["moveTo", 12, 8], ["lineTo", 10.132, 7.879], ["lineTo", 8.637, 7.549], ["lineTo", 7.487, 7.057], ["lineTo", 6.656, 6.453], ["lineTo", 6.119, 5.784], ["lineTo", 5.848, 5.1], ["lineTo", 5.817, 4.447], ["lineTo", 6, 3.875], ["lineTo", 6.371, 3.432], ["lineTo", 6.902, 3.166], ["lineTo", 7.569, 3.126], ["lineTo", 8.344, 3.359], ["lineTo", 9.201, 3.915], ["lineTo", 10.113, 4.842], ["lineTo", 11.055, 6.187], ["lineTo", 12, 8], ["closePath"], ["moveTo", 12, 8], ["lineTo", 13.868, 7.879], ["lineTo", 15.363, 7.549], ["lineTo", 16.513, 7.057], ["lineTo", 17.344, 6.453], ["lineTo", 17.881, 5.784], ["lineTo", 18.152, 5.1], ["lineTo", 18.183, 4.447], ["lineTo", 18, 3.875], ["lineTo", 17.629, 3.432], ["lineTo", 17.098, 3.166], ["lineTo", 16.431, 3.126], ["lineTo", 15.656, 3.359], ["lineTo", 14.799, 3.915], ["lineTo", 13.887, 4.842], ["lineTo", 12.945, 6.187], ["lineTo", 12, 8], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "check": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 5, 12], ["lineTo", 9, 16], ["lineTo", 19, 6]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "target": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 3, 12], ["lineTo", 3.046, 11.08], ["lineTo", 3.183, 10.186], ["lineTo", 3.405, 9.324], ["lineTo", 3.707, 8.497], ["lineTo", 4.086, 7.71], ["lineTo", 4.537, 6.968], ["lineTo", 5.055, 6.275], ["lineTo", 5.636, 5.636], ["lineTo", 6.275, 5.055], ["lineTo", 6.968, 4.537], ["lineTo", 7.71, 4.086], ["lineTo", 8.497, 3.707], ["lineTo", 9.324, 3.405], ["lineTo", 10.186, 3.183], ["lineTo", 11.08, 3.046], ["lineTo", 12, 3], ["lineTo", 12.92, 3.046], ["lineTo", 13.814, 3.183], ["lineTo", 14.676, 3.405], ["lineTo", 15.503, 3.707], ["lineTo", 16.29, 4.086], ["lineTo", 17.032, 4.537], ["lineTo", 17.725, 5.055], ["lineTo", 18.364, 5.636], ["lineTo", 18.945, 6.275], ["lineTo", 19.463, 6.968], ["lineTo", 19.914, 7.71], ["lineTo", 20.293, 8.497], ["lineTo", 20.595, 9.324], ["lineTo", 20.817, 10.186], ["lineTo", 20.954, 11.08], ["lineTo", 21, 12], ["lineTo", 20.954, 12.92], ["lineTo", 20.817, 13.814], ["lineTo", 20.595, 14.676], ["lineTo", 20.293, 15.503], ["lineTo", 19.914, 16.29], ["lineTo", 19.463, 17.032], ["lineTo", 18.945, 17.725], ["lineTo", 18.364, 18.364], ["lineTo", 17.725, 18.945], ["lineTo", 17.032, 19.463], ["lineTo", 16.29, 19.914], ["lineTo", 15.503, 20.293], ["lineTo", 14.676, 20.595], ["lineTo", 13.814, 20.817], ["lineTo", 12.92, 20.954], ["lineTo", 12, 21], ["lineTo", 11.08, 20.954], ["lineTo", 10.186, 20.817], ["lineTo", 9.324, 20.595], ["lineTo", 8.497, 20.293], ["lineTo", 7.71, 19.914], ["lineTo", 6.968, 19.463], ["lineTo", 6.275, 18.945], ["lineTo", 5.636, 18.364], ["lineTo", 5.055, 17.725], ["lineTo", 4.537, 17.032], ["lineTo", 4.086, 16.29], ["lineTo", 3.707, 15.503], ["lineTo", 3.405, 14.676], ["lineTo", 3.183, 13.814], ["lineTo", 3.046, 12.92], ["lineTo", 3, 12]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 7, 12], ["lineTo", 7.026, 11.489], ["lineTo", 7.102, 10.992], ["lineTo", 7.225, 10.513], ["lineTo", 7.393, 10.054], ["lineTo", 7.603, 9.617], ["lineTo", 7.854, 9.204], ["lineTo", 8.142, 8.82], ["lineTo", 8.464, 8.464], ["lineTo", 8.82, 8.142], ["lineTo", 9.204, 7.854], ["lineTo", 9.617, 7.603], ["lineTo", 10.054, 7.393], ["lineTo", 10.513, 7.225], ["lineTo", 10.992, 7.102], ["lineTo", 11.489, 7.026], ["lineTo", 12, 7], ["lineTo", 12.511, 7.026], ["lineTo", 13.008, 7.102], ["lineTo", 13.487, 7.225], ["lineTo", 13.946, 7.393], ["lineTo", 14.383, 7.603], ["lineTo", 14.796, 7.854], ["lineTo", 15.18, 8.142], ["lineTo", 15.536, 8.464], ["lineTo", 15.858, 8.82], ["lineTo", 16.146, 9.204], ["lineTo", 16.397, 9.617], ["lineTo", 16.607, 10.054], ["lineTo", 16.775, 10.513], ["lineTo", 16.898, 10.992], ["lineTo", 16.974, 11.489], ["lineTo", 17, 12], ["lineTo", 16.974, 12.511], ["lineTo", 16.898, 13.008], ["lineTo", 16.775, 13.487], ["lineTo", 16.607, 13.946], ["lineTo", 16.397, 14.383], ["lineTo", 16.146, 14.796], ["lineTo", 15.858, 15.18], ["lineTo", 15.536, 15.536], ["lineTo", 15.18, 15.858], ["lineTo", 14.796, 16.146], ["lineTo", 14.383, 16.397], ["lineTo", 13.946, 16.607], ["lineTo", 13.487, 16.775], ["lineTo", 13.008, 16.898], ["lineTo", 12.511, 16.974], ["lineTo", 12, 17], ["lineTo", 11.489, 16.974], ["lineTo", 10.992, 16.898], ["lineTo", 10.513, 16.775], ["lineTo", 10.054, 16.607], ["lineTo", 9.617, 16.397], ["lineTo", 9.204, 16.146], ["lineTo", 8.82, 15.858], ["lineTo", 8.464, 15.536], ["lineTo", 8.142, 15.18], ["lineTo", 7.854, 14.796], ["lineTo", 7.603, 14.383], ["lineTo", 7.393, 13.946], ["lineTo", 7.225, 13.487], ["lineTo", 7.102, 13.008], ["lineTo", 7.026, 12.511], ["lineTo", 7, 12]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 12, 12], ["lineTo", 21, 3]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "spark": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 12, 2], ["lineTo", 15, 9], ["lineTo", 22, 12], ["lineTo", 15, 15], ["lineTo", 12, 22], ["lineTo", 9, 15], ["lineTo", 2, 12], ["lineTo", 9, 9], ["lineTo", 12, 2], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "calendar": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 6, 5], ["lineTo", 18, 5], ["lineTo", 18.307, 5.015], ["lineTo", 18.605, 5.061], ["lineTo", 18.892, 5.135], ["lineTo", 19.168, 5.236], ["lineTo", 19.43, 5.362], ["lineTo", 19.677, 5.512], ["lineTo", 19.908, 5.685], ["lineTo", 20.121, 5.879], ["lineTo", 20.315, 6.092], ["lineTo", 20.488, 6.323], ["lineTo", 20.638, 6.57], ["lineTo", 20.764, 6.832], ["lineTo", 20.865, 7.108], ["lineTo", 20.939, 7.395], ["lineTo", 20.985, 7.693], ["lineTo", 21, 8], ["lineTo", 21, 18], ["lineTo", 20.985, 18.307], ["lineTo", 20.939, 18.605], ["lineTo", 20.865, 18.892], ["lineTo", 20.764, 19.168], ["lineTo", 20.638, 19.43], ["lineTo", 20.488, 19.677], ["lineTo", 20.315, 19.908], ["lineTo", 20.121, 20.121], ["lineTo", 19.908, 20.315], ["lineTo", 19.677, 20.488], ["lineTo", 19.43, 20.638], ["lineTo", 19.168, 20.764], ["lineTo", 18.892, 20.865], ["lineTo", 18.605, 20.939], ["lineTo", 18.307, 20.985], ["lineTo", 18, 21], ["lineTo", 6, 21], ["lineTo", 5.693, 20.985], ["lineTo", 5.395, 20.939], ["lineTo", 5.108, 20.865], ["lineTo", 4.832, 20.764], ["lineTo", 4.57, 20.638], ["lineTo", 4.323, 20.488], ["lineTo", 4.092, 20.315], ["lineTo", 3.879, 20.121], ["lineTo", 3.685, 19.908], ["lineTo", 3.512, 19.677], ["lineTo", 3.362, 19.43], ["lineTo", 3.236, 19.168], ["lineTo", 3.135, 18.892], ["lineTo", 3.061, 18.605], ["lineTo", 3.015, 18.307], ["lineTo", 3, 18], ["lineTo", 3, 8], ["lineTo", 3.015, 7.693], ["lineTo", 3.061, 7.395], ["lineTo", 3.135, 7.108], ["lineTo", 3.236, 6.832], ["lineTo", 3.362, 6.57], ["lineTo", 3.512, 6.323], ["lineTo", 3.685, 6.092], ["lineTo", 3.879, 5.879], ["lineTo", 4.092, 5.685], ["lineTo", 4.323, 5.512], ["lineTo", 4.57, 5.362], ["lineTo", 4.832, 5.236], ["lineTo", 5.108, 5.135], ["lineTo", 5.395, 5.061], ["lineTo", 5.693, 5.015], ["lineTo", 6, 5], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 7, 2], ["lineTo", 7, 8], ["moveTo", 17, 2], ["lineTo", 17, 8], ["moveTo", 3, 11], ["lineTo", 21, 11], ["moveTo", 8, 15], ["lineTo", 11, 15]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "flame": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 12, 2], ["lineTo", 12.408, 3.069], ["lineTo", 12.875, 4.035], ["lineTo", 13.389, 4.914], ["lineTo", 13.938, 5.719], ["lineTo", 14.51, 6.465], ["lineTo", 15.094, 7.168], ["lineTo", 15.678, 7.841], ["lineTo", 16.25, 8.5], ["lineTo", 16.799, 9.159], ["lineTo", 17.312, 9.832], ["lineTo", 17.779, 10.535], ["lineTo", 18.188, 11.281], ["lineTo", 18.525, 12.086], ["lineTo", 18.781, 12.965], ["lineTo", 18.943, 13.931], ["lineTo", 19, 15], ["lineTo", 18.964, 15.716], ["lineTo", 18.858, 16.411], ["lineTo", 18.685, 17.082], ["lineTo", 18.45, 17.725], ["lineTo", 18.155, 18.337], ["lineTo", 17.805, 18.914], ["lineTo", 17.402, 19.453], ["lineTo", 16.95, 19.95], ["lineTo", 16.453, 20.402], ["lineTo", 15.914, 20.805], ["lineTo", 15.337, 21.155], ["lineTo", 14.725, 21.45], ["lineTo", 14.082, 21.685], ["lineTo", 13.411, 21.858], ["lineTo", 12.716, 21.964], ["lineTo", 12, 22], ["lineTo", 11.284, 21.964], ["lineTo", 10.589, 21.858], ["lineTo", 9.918, 21.685], ["lineTo", 9.275, 21.45], ["lineTo", 8.663, 21.155], ["lineTo", 8.086, 20.805], ["lineTo", 7.547, 20.402], ["lineTo", 7.05, 19.95], ["lineTo", 6.598, 19.453], ["lineTo", 6.195, 18.914], ["lineTo", 5.845, 18.337], ["lineTo", 5.55, 17.725], ["lineTo", 5.315, 17.082], ["lineTo", 5.142, 16.411], ["lineTo", 5.036, 15.716], ["lineTo", 5, 15], ["lineTo", 5.023, 14.438], ["lineTo", 5.09, 13.877], ["lineTo", 5.198, 13.319], ["lineTo", 5.344, 12.766], ["lineTo", 5.525, 12.218], ["lineTo", 5.738, 11.678], ["lineTo", 5.981, 11.146], ["lineTo", 6.25, 10.625], ["lineTo", 6.542, 10.115], ["lineTo", 6.855, 9.619], ["lineTo", 7.186, 9.137], ["lineTo", 7.531, 8.672], ["lineTo", 7.888, 8.224], ["lineTo", 8.254, 7.795], ["lineTo", 8.625, 7.386], ["lineTo", 9, 7], ["lineTo", 9.023, 7.704], ["lineTo", 9.088, 8.322], ["lineTo", 9.191, 8.861], ["lineTo", 9.328, 9.328], ["lineTo", 9.494, 9.731], ["lineTo", 9.686, 10.076], ["lineTo", 9.897, 10.372], ["lineTo", 10.125, 10.625], ["lineTo", 10.365, 10.843], ["lineTo", 10.611, 11.033], ["lineTo", 10.861, 11.203], ["lineTo", 11.109, 11.359], ["lineTo", 11.352, 11.51], ["lineTo", 11.584, 11.662], ["lineTo", 11.802, 11.823], ["lineTo", 12, 12], ["lineTo", 12.352, 11.437], ["lineTo", 12.656, 10.873], ["lineTo", 12.914, 10.306], ["lineTo", 13.125, 9.734], ["lineTo", 13.289, 9.157], ["lineTo", 13.406, 8.572], ["lineTo", 13.477, 7.979], ["lineTo", 13.5, 7.375], ["lineTo", 13.477, 6.76], ["lineTo", 13.406, 6.131], ["lineTo", 13.289, 5.488], ["lineTo", 13.125, 4.828], ["lineTo", 12.914, 4.151], ["lineTo", 12.656, 3.455], ["lineTo", 12.352, 2.739], ["lineTo", 12, 2], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "cut": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 2, 6], ["lineTo", 2.015, 5.693], ["lineTo", 2.061, 5.395], ["lineTo", 2.135, 5.108], ["lineTo", 2.236, 4.832], ["lineTo", 2.362, 4.57], ["lineTo", 2.512, 4.323], ["lineTo", 2.685, 4.092], ["lineTo", 2.879, 3.879], ["lineTo", 3.092, 3.685], ["lineTo", 3.323, 3.512], ["lineTo", 3.57, 3.362], ["lineTo", 3.832, 3.236], ["lineTo", 4.108, 3.135], ["lineTo", 4.395, 3.061], ["lineTo", 4.693, 3.015], ["lineTo", 5, 3], ["lineTo", 5.307, 3.015], ["lineTo", 5.605, 3.061], ["lineTo", 5.892, 3.135], ["lineTo", 6.168, 3.236], ["lineTo", 6.43, 3.362], ["lineTo", 6.677, 3.512], ["lineTo", 6.908, 3.685], ["lineTo", 7.121, 3.879], ["lineTo", 7.315, 4.092], ["lineTo", 7.488, 4.323], ["lineTo", 7.638, 4.57], ["lineTo", 7.764, 4.832], ["lineTo", 7.865, 5.108], ["lineTo", 7.939, 5.395], ["lineTo", 7.985, 5.693], ["lineTo", 8, 6], ["lineTo", 7.985, 6.307], ["lineTo", 7.939, 6.605], ["lineTo", 7.865, 6.892], ["lineTo", 7.764, 7.168], ["lineTo", 7.638, 7.43], ["lineTo", 7.488, 7.677], ["lineTo", 7.315, 7.908], ["lineTo", 7.121, 8.121], ["lineTo", 6.908, 8.315], ["lineTo", 6.677, 8.488], ["lineTo", 6.43, 8.638], ["lineTo", 6.168, 8.764], ["lineTo", 5.892, 8.865], ["lineTo", 5.605, 8.939], ["lineTo", 5.307, 8.985], ["lineTo", 5, 9], ["lineTo", 4.693, 8.985], ["lineTo", 4.395, 8.939], ["lineTo", 4.108, 8.865], ["lineTo", 3.832, 8.764], ["lineTo", 3.57, 8.638], ["lineTo", 3.323, 8.488], ["lineTo", 3.092, 8.315], ["lineTo", 2.879, 8.121], ["lineTo", 2.685, 7.908], ["lineTo", 2.512, 7.677], ["lineTo", 2.362, 7.43], ["lineTo", 2.236, 7.168], ["lineTo", 2.135, 6.892], ["lineTo", 2.061, 6.605], ["lineTo", 2.015, 6.307], ["lineTo", 2, 6]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 2, 18], ["lineTo", 2.015, 17.693], ["lineTo", 2.061, 17.395], ["lineTo", 2.135, 17.108], ["lineTo", 2.236, 16.832], ["lineTo", 2.362, 16.57], ["lineTo", 2.512, 16.323], ["lineTo", 2.685, 16.092], ["lineTo", 2.879, 15.879], ["lineTo", 3.092, 15.685], ["lineTo", 3.323, 15.512], ["lineTo", 3.57, 15.362], ["lineTo", 3.832, 15.236], ["lineTo", 4.108, 15.135], ["lineTo", 4.395, 15.061], ["lineTo", 4.693, 15.015], ["lineTo", 5, 15], ["lineTo", 5.307, 15.015], ["lineTo", 5.605, 15.061], ["lineTo", 5.892, 15.135], ["lineTo", 6.168, 15.236], ["lineTo", 6.43, 15.362], ["lineTo", 6.677, 15.512], ["lineTo", 6.908, 15.685], ["lineTo", 7.121, 15.879], ["lineTo", 7.315, 16.092], ["lineTo", 7.488, 16.323], ["lineTo", 7.638, 16.57], ["lineTo", 7.764, 16.832], ["lineTo", 7.865, 17.108], ["lineTo", 7.939, 17.395], ["lineTo", 7.985, 17.693], ["lineTo", 8, 18], ["lineTo", 7.985, 18.307], ["lineTo", 7.939, 18.605], ["lineTo", 7.865, 18.892], ["lineTo", 7.764, 19.168], ["lineTo", 7.638, 19.43], ["lineTo", 7.488, 19.677], ["lineTo", 7.315, 19.908], ["lineTo", 7.121, 20.121], ["lineTo", 6.908, 20.315], ["lineTo", 6.677, 20.488], ["lineTo", 6.43, 20.638], ["lineTo", 6.168, 20.764], ["lineTo", 5.892, 20.865], ["lineTo", 5.605, 20.939], ["lineTo", 5.307, 20.985], ["lineTo", 5, 21], ["lineTo", 4.693, 20.985], ["lineTo", 4.395, 20.939], ["lineTo", 4.108, 20.865], ["lineTo", 3.832, 20.764], ["lineTo", 3.57, 20.638], ["lineTo", 3.323, 20.488], ["lineTo", 3.092, 20.315], ["lineTo", 2.879, 20.121], ["lineTo", 2.685, 19.908], ["lineTo", 2.512, 19.677], ["lineTo", 2.362, 19.43], ["lineTo", 2.236, 19.168], ["lineTo", 2.135, 18.892], ["lineTo", 2.061, 18.605], ["lineTo", 2.015, 18.307], ["lineTo", 2, 18]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 8, 8], ["lineTo", 21, 20], ["moveTo", 8, 16], ["lineTo", 21, 4]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "image": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 6, 3], ["lineTo", 18, 3], ["lineTo", 18.307, 3.015], ["lineTo", 18.605, 3.061], ["lineTo", 18.892, 3.135], ["lineTo", 19.168, 3.236], ["lineTo", 19.43, 3.362], ["lineTo", 19.677, 3.512], ["lineTo", 19.908, 3.685], ["lineTo", 20.121, 3.879], ["lineTo", 20.315, 4.092], ["lineTo", 20.488, 4.323], ["lineTo", 20.638, 4.57], ["lineTo", 20.764, 4.832], ["lineTo", 20.865, 5.108], ["lineTo", 20.939, 5.395], ["lineTo", 20.985, 5.693], ["lineTo", 21, 6], ["lineTo", 21, 18], ["lineTo", 20.985, 18.307], ["lineTo", 20.939, 18.605], ["lineTo", 20.865, 18.892], ["lineTo", 20.764, 19.168], ["lineTo", 20.638, 19.43], ["lineTo", 20.488, 19.677], ["lineTo", 20.315, 19.908], ["lineTo", 20.121, 20.121], ["lineTo", 19.908, 20.315], ["lineTo", 19.677, 20.488], ["lineTo", 19.43, 20.638], ["lineTo", 19.168, 20.764], ["lineTo", 18.892, 20.865], ["lineTo", 18.605, 20.939], ["lineTo", 18.307, 20.985], ["lineTo", 18, 21], ["lineTo", 6, 21], ["lineTo", 5.693, 20.985], ["lineTo", 5.395, 20.939], ["lineTo", 5.108, 20.865], ["lineTo", 4.832, 20.764], ["lineTo", 4.57, 20.638], ["lineTo", 4.323, 20.488], ["lineTo", 4.092, 20.315], ["lineTo", 3.879, 20.121], ["lineTo", 3.685, 19.908], ["lineTo", 3.512, 19.677], ["lineTo", 3.362, 19.43], ["lineTo", 3.236, 19.168], ["lineTo", 3.135, 18.892], ["lineTo", 3.061, 18.605], ["lineTo", 3.015, 18.307], ["lineTo", 3, 18], ["lineTo", 3, 6], ["lineTo", 3.015, 5.693], ["lineTo", 3.061, 5.395], ["lineTo", 3.135, 5.108], ["lineTo", 3.236, 4.832], ["lineTo", 3.362, 4.57], ["lineTo", 3.512, 4.323], ["lineTo", 3.685, 4.092], ["lineTo", 3.879, 3.879], ["lineTo", 4.092, 3.685], ["lineTo", 4.323, 3.512], ["lineTo", 4.57, 3.362], ["lineTo", 4.832, 3.236], ["lineTo", 5.108, 3.135], ["lineTo", 5.395, 3.061], ["lineTo", 5.693, 3.015], ["lineTo", 6, 3], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 6, 8], ["lineTo", 6.01, 7.796], ["lineTo", 6.041, 7.597], ["lineTo", 6.09, 7.405], ["lineTo", 6.157, 7.222], ["lineTo", 6.241, 7.047], ["lineTo", 6.342, 6.882], ["lineTo", 6.457, 6.728], ["lineTo", 6.586, 6.586], ["lineTo", 6.728, 6.457], ["lineTo", 6.882, 6.342], ["lineTo", 7.047, 6.241], ["lineTo", 7.222, 6.157], ["lineTo", 7.405, 6.09], ["lineTo", 7.597, 6.041], ["lineTo", 7.796, 6.01], ["lineTo", 8, 6], ["lineTo", 8.204, 6.01], ["lineTo", 8.403, 6.041], ["lineTo", 8.595, 6.09], ["lineTo", 8.778, 6.157], ["lineTo", 8.953, 6.241], ["lineTo", 9.118, 6.342], ["lineTo", 9.272, 6.457], ["lineTo", 9.414, 6.586], ["lineTo", 9.543, 6.728], ["lineTo", 9.658, 6.882], ["lineTo", 9.759, 7.047], ["lineTo", 9.843, 7.222], ["lineTo", 9.91, 7.405], ["lineTo", 9.959, 7.597], ["lineTo", 9.99, 7.796], ["lineTo", 10, 8], ["lineTo", 9.99, 8.204], ["lineTo", 9.959, 8.403], ["lineTo", 9.91, 8.595], ["lineTo", 9.843, 8.778], ["lineTo", 9.759, 8.953], ["lineTo", 9.658, 9.118], ["lineTo", 9.543, 9.272], ["lineTo", 9.414, 9.414], ["lineTo", 9.272, 9.543], ["lineTo", 9.118, 9.658], ["lineTo", 8.953, 9.759], ["lineTo", 8.778, 9.843], ["lineTo", 8.595, 9.91], ["lineTo", 8.403, 9.959], ["lineTo", 8.204, 9.99], ["lineTo", 8, 10], ["lineTo", 7.796, 9.99], ["lineTo", 7.597, 9.959], ["lineTo", 7.405, 9.91], ["lineTo", 7.222, 9.843], ["lineTo", 7.047, 9.759], ["lineTo", 6.882, 9.658], ["lineTo", 6.728, 9.543], ["lineTo", 6.586, 9.414], ["lineTo", 6.457, 9.272], ["lineTo", 6.342, 9.118], ["lineTo", 6.241, 8.953], ["lineTo", 6.157, 8.778], ["lineTo", 6.09, 8.595], ["lineTo", 6.041, 8.403], ["lineTo", 6.01, 8.204], ["lineTo", 6, 8]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 3, 17], ["lineTo", 8, 12], ["lineTo", 12, 16], ["lineTo", 16, 9], ["lineTo", 21, 17]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "chart": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 4, 20], ["lineTo", 4, 4], ["moveTo", 4, 20], ["lineTo", 21, 20], ["moveTo", 8, 16], ["lineTo", 8, 11], ["moveTo", 13, 16], ["lineTo", 13, 7], ["moveTo", 18, 16], ["lineTo", 18, 3]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "mail": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 6, 5], ["lineTo", 18, 5], ["lineTo", 18.307, 5.015], ["lineTo", 18.605, 5.061], ["lineTo", 18.892, 5.135], ["lineTo", 19.168, 5.236], ["lineTo", 19.43, 5.362], ["lineTo", 19.677, 5.512], ["lineTo", 19.908, 5.685], ["lineTo", 20.121, 5.879], ["lineTo", 20.315, 6.092], ["lineTo", 20.488, 6.323], ["lineTo", 20.638, 6.57], ["lineTo", 20.764, 6.832], ["lineTo", 20.865, 7.108], ["lineTo", 20.939, 7.395], ["lineTo", 20.985, 7.693], ["lineTo", 21, 8], ["lineTo", 21, 16], ["lineTo", 20.985, 16.307], ["lineTo", 20.939, 16.605], ["lineTo", 20.865, 16.892], ["lineTo", 20.764, 17.168], ["lineTo", 20.638, 17.43], ["lineTo", 20.488, 17.677], ["lineTo", 20.315, 17.908], ["lineTo", 20.121, 18.121], ["lineTo", 19.908, 18.315], ["lineTo", 19.677, 18.488], ["lineTo", 19.43, 18.638], ["lineTo", 19.168, 18.764], ["lineTo", 18.892, 18.865], ["lineTo", 18.605, 18.939], ["lineTo", 18.307, 18.985], ["lineTo", 18, 19], ["lineTo", 6, 19], ["lineTo", 5.693, 18.985], ["lineTo", 5.395, 18.939], ["lineTo", 5.108, 18.865], ["lineTo", 4.832, 18.764], ["lineTo", 4.57, 18.638], ["lineTo", 4.323, 18.488], ["lineTo", 4.092, 18.315], ["lineTo", 3.879, 18.121], ["lineTo", 3.685, 17.908], ["lineTo", 3.512, 17.677], ["lineTo", 3.362, 17.43], ["lineTo", 3.236, 17.168], ["lineTo", 3.135, 16.892], ["lineTo", 3.061, 16.605], ["lineTo", 3.015, 16.307], ["lineTo", 3, 16], ["lineTo", 3, 8], ["lineTo", 3.015, 7.693], ["lineTo", 3.061, 7.395], ["lineTo", 3.135, 7.108], ["lineTo", 3.236, 6.832], ["lineTo", 3.362, 6.57], ["lineTo", 3.512, 6.323], ["lineTo", 3.685, 6.092], ["lineTo", 3.879, 5.879], ["lineTo", 4.092, 5.685], ["lineTo", 4.323, 5.512], ["lineTo", 4.57, 5.362], ["lineTo", 4.832, 5.236], ["lineTo", 5.108, 5.135], ["lineTo", 5.395, 5.061], ["lineTo", 5.693, 5.015], ["lineTo", 6, 5], ["closePath"]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }, { "path": [["moveTo", 3, 6], ["lineTo", 12, 13], ["lineTo", 21, 6]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "trophy": { "width": 24, "height": 24, "shapes": [{ "path": [["moveTo", 8, 3], ["lineTo", 16, 3], ["lineTo", 16, 10], ["lineTo", 15.979, 10.409], ["lineTo", 15.919, 10.806], ["lineTo", 15.82, 11.189], ["lineTo", 15.686, 11.557], ["lineTo", 15.517, 11.907], ["lineTo", 15.317, 12.236], ["lineTo", 15.087, 12.544], ["lineTo", 14.828, 12.828], ["lineTo", 14.544, 13.087], ["lineTo", 14.236, 13.317], ["lineTo", 13.907, 13.517], ["lineTo", 13.557, 13.686], ["lineTo", 13.189, 13.82], ["lineTo", 12.806, 13.919], ["lineTo", 12.409, 13.979], ["lineTo", 12, 14], ["lineTo", 11.591, 13.979], ["lineTo", 11.194, 13.919], ["lineTo", 10.811, 13.82], ["lineTo", 10.443, 13.686], ["lineTo", 10.093, 13.517], ["lineTo", 9.764, 13.317], ["lineTo", 9.456, 13.087], ["lineTo", 9.172, 12.828], ["lineTo", 8.913, 12.544], ["lineTo", 8.683, 12.236], ["lineTo", 8.483, 11.907], ["lineTo", 8.314, 11.557], ["lineTo", 8.18, 11.189], ["lineTo", 8.081, 10.806], ["lineTo", 8.021, 10.409], ["lineTo", 8, 10], ["lineTo", 8, 3], ["closePath"], ["moveTo", 8, 5], ["lineTo", 3, 5], ["lineTo", 3, 8], ["lineTo", 3.034, 8.551], ["lineTo", 3.135, 9.076], ["lineTo", 3.297, 9.575], ["lineTo", 3.516, 10.047], ["lineTo", 3.787, 10.489], ["lineTo", 4.107, 10.9], ["lineTo", 4.471, 11.28], ["lineTo", 4.875, 11.625], ["lineTo", 5.314, 11.935], ["lineTo", 5.783, 12.209], ["lineTo", 6.279, 12.445], ["lineTo", 6.797, 12.641], ["lineTo", 7.332, 12.796], ["lineTo", 7.881, 12.908], ["lineTo", 8.438, 12.977], ["lineTo", 9, 13], ["moveTo", 16, 5], ["lineTo", 21, 5], ["lineTo", 21, 8], ["lineTo", 20.966, 8.551], ["lineTo", 20.865, 9.076], ["lineTo", 20.703, 9.575], ["lineTo", 20.484, 10.047], ["lineTo", 20.213, 10.489], ["lineTo", 19.893, 10.9], ["lineTo", 19.529, 11.28], ["lineTo", 19.125, 11.625], ["lineTo", 18.686, 11.935], ["lineTo", 18.217, 12.209], ["lineTo", 17.721, 12.445], ["lineTo", 17.203, 12.641], ["lineTo", 16.668, 12.796], ["lineTo", 16.119, 12.908], ["lineTo", 15.562, 12.977], ["lineTo", 15, 13], ["moveTo", 12, 14], ["lineTo", 12, 20], ["moveTo", 7, 21], ["lineTo", 17, 21]], "fill": "none", "stroke": "currentColor", "lineWidth": 1.8 }] }, "gear_lamp": { "width": 120, "height": 160, "shapes": [{ "path": [["moveTo", 20, 152], ["lineTo", 20.207, 151.489], ["lineTo", 20.813, 150.992], ["lineTo", 21.798, 150.513], ["lineTo", 23.143, 150.054], ["lineTo", 24.828, 149.617], ["lineTo", 26.831, 149.204], ["lineTo", 29.134, 148.82], ["lineTo", 31.716, 148.464], ["lineTo", 34.556, 148.142], ["lineTo", 37.636, 147.854], ["lineTo", 40.934, 147.603], ["lineTo", 44.43, 147.393], ["lineTo", 48.105, 147.225], ["lineTo", 51.939, 147.102], ["lineTo", 55.91, 147.026], ["lineTo", 60, 147], ["lineTo", 64.09, 147.026], ["lineTo", 68.061, 147.102], ["lineTo", 71.895, 147.225], ["lineTo", 75.57, 147.393], ["lineTo", 79.066, 147.603], ["lineTo", 82.364, 147.854], ["lineTo", 85.444, 148.142], ["lineTo", 88.284, 148.464], ["lineTo", 90.866, 148.82], ["lineTo", 93.169, 149.204], ["lineTo", 95.172, 149.617], ["lineTo", 96.857, 150.054], ["lineTo", 98.202, 150.513], ["lineTo", 99.187, 150.992], ["lineTo", 99.793, 151.489], ["lineTo", 100, 152], ["lineTo", 99.793, 152.511], ["lineTo", 99.187, 153.008], ["lineTo", 98.202, 153.487], ["lineTo", 96.857, 153.946], ["lineTo", 95.172, 154.383], ["lineTo", 93.169, 154.796], ["lineTo", 90.866, 155.18], ["lineTo", 88.284, 155.536], ["lineTo", 85.444, 155.858], ["lineTo", 82.364, 156.146], ["lineTo", 79.066, 156.397], ["lineTo", 75.57, 156.607], ["lineTo", 71.895, 156.775], ["lineTo", 68.061, 156.898], ["lineTo", 64.09, 156.974], ["lineTo", 60, 157], ["lineTo", 55.91, 156.974], ["lineTo", 51.939, 156.898], ["lineTo", 48.105, 156.775], ["lineTo", 44.43, 156.607], ["lineTo", 40.934, 156.397], ["lineTo", 37.636, 156.146], ["lineTo", 34.556, 155.858], ["lineTo", 31.716, 155.536], ["lineTo", 29.134, 155.18], ["lineTo", 26.831, 154.796], ["lineTo", 24.828, 154.383], ["lineTo", 23.143, 153.946], ["lineTo", 21.798, 153.487], ["lineTo", 20.813, 153.008], ["lineTo", 20.207, 152.511], ["lineTo", 20, 152]], "fill": "#3e3e3429", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 35, 38], ["lineTo", 35.129, 34.728], ["lineTo", 35.508, 31.551], ["lineTo", 36.124, 28.484], ["lineTo", 36.965, 25.544], ["lineTo", 38.017, 22.747], ["lineTo", 39.27, 20.108], ["lineTo", 40.709, 17.645], ["lineTo", 42.322, 15.373], ["lineTo", 44.098, 13.307], ["lineTo", 46.022, 11.465], ["lineTo", 48.084, 9.862], ["lineTo", 50.269, 8.515], ["lineTo", 52.566, 7.439], ["lineTo", 54.962, 6.65], ["lineTo", 57.444, 6.165], ["lineTo", 60, 6], ["lineTo", 62.556, 6.165], ["lineTo", 65.038, 6.65], ["lineTo", 67.434, 7.439], ["lineTo", 69.731, 8.515], ["lineTo", 71.916, 9.862], ["lineTo", 73.978, 11.465], ["lineTo", 75.902, 13.307], ["lineTo", 77.678, 15.373], ["lineTo", 79.291, 17.645], ["lineTo", 80.73, 20.108], ["lineTo", 81.983, 22.747], ["lineTo", 83.035, 25.544], ["lineTo", 83.876, 28.484], ["lineTo", 84.492, 31.551], ["lineTo", 84.871, 34.728], ["lineTo", 85, 38], ["lineTo", 84.871, 41.272], ["lineTo", 84.492, 44.449], ["lineTo", 83.876, 47.516], ["lineTo", 83.035, 50.456], ["lineTo", 81.983, 53.253], ["lineTo", 80.73, 55.892], ["lineTo", 79.291, 58.355], ["lineTo", 77.678, 60.627], ["lineTo", 75.902, 62.693], ["lineTo", 73.978, 64.535], ["lineTo", 71.916, 66.138], ["lineTo", 69.731, 67.485], ["lineTo", 67.434, 68.561], ["lineTo", 65.038, 69.35], ["lineTo", 62.556, 69.835], ["lineTo", 60, 70], ["lineTo", 57.444, 69.835], ["lineTo", 54.962, 69.35], ["lineTo", 52.566, 68.561], ["lineTo", 50.269, 67.485], ["lineTo", 48.084, 66.138], ["lineTo", 46.022, 64.535], ["lineTo", 44.098, 62.693], ["lineTo", 42.322, 60.627], ["lineTo", 40.709, 58.355], ["lineTo", 39.27, 55.892], ["lineTo", 38.017, 53.253], ["lineTo", 36.965, 50.456], ["lineTo", 36.124, 47.516], ["lineTo", 35.508, 44.449], ["lineTo", 35.129, 41.272], ["lineTo", 35, 38]], "fill": "#fff3bd", "stroke": "#747663", "lineWidth": 6 }, { "path": [["moveTo", 43, 38], ["lineTo", 43.088, 35.546], ["lineTo", 43.345, 33.163], ["lineTo", 43.764, 30.863], ["lineTo", 44.336, 28.658], ["lineTo", 45.052, 26.56], ["lineTo", 45.903, 24.581], ["lineTo", 46.882, 22.734], ["lineTo", 47.979, 21.029], ["lineTo", 49.186, 19.48], ["lineTo", 50.495, 18.099], ["lineTo", 51.897, 16.897], ["lineTo", 53.383, 15.886], ["lineTo", 54.945, 15.079], ["lineTo", 56.574, 14.488], ["lineTo", 58.262, 14.124], ["lineTo", 60, 14], ["lineTo", 61.738, 14.124], ["lineTo", 63.426, 14.488], ["lineTo", 65.055, 15.079], ["lineTo", 66.617, 15.886], ["lineTo", 68.103, 16.897], ["lineTo", 69.505, 18.099], ["lineTo", 70.814, 19.48], ["lineTo", 72.021, 21.029], ["lineTo", 73.118, 22.734], ["lineTo", 74.097, 24.581], ["lineTo", 74.948, 26.56], ["lineTo", 75.664, 28.658], ["lineTo", 76.236, 30.863], ["lineTo", 76.655, 33.163], ["lineTo", 76.912, 35.546], ["lineTo", 77, 38], ["lineTo", 76.912, 40.454], ["lineTo", 76.655, 42.837], ["lineTo", 76.236, 45.137], ["lineTo", 75.664, 47.342], ["lineTo", 74.948, 49.44], ["lineTo", 74.097, 51.419], ["lineTo", 73.118, 53.266], ["lineTo", 72.021, 54.971], ["lineTo", 70.814, 56.52], ["lineTo", 69.505, 57.901], ["lineTo", 68.103, 59.103], ["lineTo", 66.617, 60.114], ["lineTo", 65.055, 60.921], ["lineTo", 63.426, 61.512], ["lineTo", 61.738, 61.876], ["lineTo", 60, 62], ["lineTo", 58.262, 61.876], ["lineTo", 56.574, 61.512], ["lineTo", 54.945, 60.921], ["lineTo", 53.383, 60.114], ["lineTo", 51.897, 59.103], ["lineTo", 50.495, 57.901], ["lineTo", 49.186, 56.52], ["lineTo", 47.979, 54.971], ["lineTo", 46.882, 53.266], ["lineTo", 45.903, 51.419], ["lineTo", 45.052, 49.44], ["lineTo", 44.336, 47.342], ["lineTo", 43.764, 45.137], ["lineTo", 43.345, 42.837], ["lineTo", 43.088, 40.454], ["lineTo", 43, 38]], "fill": "#fff9e9", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 60, 72], ["lineTo", 60, 132], ["moveTo", 36, 145], ["lineTo", 60, 132], ["lineTo", 85, 145]], "fill": "none", "stroke": "#73715d", "lineWidth": 6 }, { "path": [["moveTo", 29, 147], ["lineTo", 29.16, 146.387], ["lineTo", 29.63, 145.791], ["lineTo", 30.394, 145.216], ["lineTo", 31.436, 144.665], ["lineTo", 32.742, 144.14], ["lineTo", 34.294, 143.645], ["lineTo", 36.079, 143.183], ["lineTo", 38.08, 142.757], ["lineTo", 40.281, 142.37], ["lineTo", 42.668, 142.025], ["lineTo", 45.224, 141.724], ["lineTo", 47.933, 141.472], ["lineTo", 50.782, 141.27], ["lineTo", 53.752, 141.122], ["lineTo", 56.83, 141.031], ["lineTo", 60, 141], ["lineTo", 63.17, 141.031], ["lineTo", 66.248, 141.122], ["lineTo", 69.218, 141.27], ["lineTo", 72.067, 141.472], ["lineTo", 74.776, 141.724], ["lineTo", 77.332, 142.025], ["lineTo", 79.719, 142.37], ["lineTo", 81.92, 142.757], ["lineTo", 83.921, 143.183], ["lineTo", 85.706, 143.645], ["lineTo", 87.258, 144.14], ["lineTo", 88.564, 144.665], ["lineTo", 89.606, 145.216], ["lineTo", 90.37, 145.791], ["lineTo", 90.84, 146.387], ["lineTo", 91, 147], ["lineTo", 90.84, 147.613], ["lineTo", 90.37, 148.209], ["lineTo", 89.606, 148.784], ["lineTo", 88.564, 149.335], ["lineTo", 87.258, 149.86], ["lineTo", 85.706, 150.355], ["lineTo", 83.921, 150.817], ["lineTo", 81.92, 151.243], ["lineTo", 79.719, 151.63], ["lineTo", 77.332, 151.975], ["lineTo", 74.776, 152.276], ["lineTo", 72.067, 152.528], ["lineTo", 69.218, 152.73], ["lineTo", 66.248, 152.878], ["lineTo", 63.17, 152.969], ["lineTo", 60, 153], ["lineTo", 56.83, 152.969], ["lineTo", 53.752, 152.878], ["lineTo", 50.782, 152.73], ["lineTo", 47.933, 152.528], ["lineTo", 45.224, 152.276], ["lineTo", 42.668, 151.975], ["lineTo", 40.281, 151.63], ["lineTo", 38.08, 151.243], ["lineTo", 36.079, 150.817], ["lineTo", 34.294, 150.355], ["lineTo", 32.742, 149.86], ["lineTo", 31.436, 149.335], ["lineTo", 30.394, 148.784], ["lineTo", 29.63, 148.209], ["lineTo", 29.16, 147.613], ["lineTo", 29, 147]], "fill": "#676957", "stroke": "none", "lineWidth": 1.8 }] }, "gear_tripod": { "width": 120, "height": 160, "shapes": [{ "path": [["moveTo", 20, 152], ["lineTo", 20.207, 151.489], ["lineTo", 20.813, 150.992], ["lineTo", 21.798, 150.513], ["lineTo", 23.143, 150.054], ["lineTo", 24.828, 149.617], ["lineTo", 26.831, 149.204], ["lineTo", 29.134, 148.82], ["lineTo", 31.716, 148.464], ["lineTo", 34.556, 148.142], ["lineTo", 37.636, 147.854], ["lineTo", 40.934, 147.603], ["lineTo", 44.43, 147.393], ["lineTo", 48.105, 147.225], ["lineTo", 51.939, 147.102], ["lineTo", 55.91, 147.026], ["lineTo", 60, 147], ["lineTo", 64.09, 147.026], ["lineTo", 68.061, 147.102], ["lineTo", 71.895, 147.225], ["lineTo", 75.57, 147.393], ["lineTo", 79.066, 147.603], ["lineTo", 82.364, 147.854], ["lineTo", 85.444, 148.142], ["lineTo", 88.284, 148.464], ["lineTo", 90.866, 148.82], ["lineTo", 93.169, 149.204], ["lineTo", 95.172, 149.617], ["lineTo", 96.857, 150.054], ["lineTo", 98.202, 150.513], ["lineTo", 99.187, 150.992], ["lineTo", 99.793, 151.489], ["lineTo", 100, 152], ["lineTo", 99.793, 152.511], ["lineTo", 99.187, 153.008], ["lineTo", 98.202, 153.487], ["lineTo", 96.857, 153.946], ["lineTo", 95.172, 154.383], ["lineTo", 93.169, 154.796], ["lineTo", 90.866, 155.18], ["lineTo", 88.284, 155.536], ["lineTo", 85.444, 155.858], ["lineTo", 82.364, 156.146], ["lineTo", 79.066, 156.397], ["lineTo", 75.57, 156.607], ["lineTo", 71.895, 156.775], ["lineTo", 68.061, 156.898], ["lineTo", 64.09, 156.974], ["lineTo", 60, 157], ["lineTo", 55.91, 156.974], ["lineTo", 51.939, 156.898], ["lineTo", 48.105, 156.775], ["lineTo", 44.43, 156.607], ["lineTo", 40.934, 156.397], ["lineTo", 37.636, 156.146], ["lineTo", 34.556, 155.858], ["lineTo", 31.716, 155.536], ["lineTo", 29.134, 155.18], ["lineTo", 26.831, 154.796], ["lineTo", 24.828, 154.383], ["lineTo", 23.143, 153.946], ["lineTo", 21.798, 153.487], ["lineTo", 20.813, 153.008], ["lineTo", 20.207, 152.511], ["lineTo", 20, 152]], "fill": "#3e3e3429", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 60, 55], ["lineTo", 60, 150], ["moveTo", 59, 65], ["lineTo", 24, 147], ["moveTo", 62, 65], ["lineTo", 97, 147]], "fill": "#000000", "stroke": "#4c554c", "lineWidth": 7 }, { "path": [["moveTo", 37, 18], ["lineTo", 84, 18], ["lineTo", 84, 57], ["lineTo", 37, 57], ["lineTo", 37, 18], ["closePath"]], "fill": "#777d70", "stroke": "#3e473e", "lineWidth": 4 }, { "path": [["moveTo", 47, 10], ["lineTo", 73, 10], ["lineTo", 73.511, 10.026], ["lineTo", 74.008, 10.102], ["lineTo", 74.487, 10.225], ["lineTo", 74.946, 10.393], ["lineTo", 75.383, 10.603], ["lineTo", 75.796, 10.854], ["lineTo", 76.18, 11.142], ["lineTo", 76.536, 11.464], ["lineTo", 76.858, 11.82], ["lineTo", 77.146, 12.204], ["lineTo", 77.397, 12.617], ["lineTo", 77.607, 13.054], ["lineTo", 77.775, 13.513], ["lineTo", 77.898, 13.992], ["lineTo", 77.974, 14.489], ["lineTo", 78, 15], ["lineTo", 78, 49], ["lineTo", 77.974, 49.511], ["lineTo", 77.898, 50.008], ["lineTo", 77.775, 50.487], ["lineTo", 77.607, 50.946], ["lineTo", 77.397, 51.383], ["lineTo", 77.146, 51.796], ["lineTo", 76.858, 52.18], ["lineTo", 76.536, 52.536], ["lineTo", 76.18, 52.858], ["lineTo", 75.796, 53.146], ["lineTo", 75.383, 53.397], ["lineTo", 74.946, 53.607], ["lineTo", 74.487, 53.775], ["lineTo", 74.008, 53.898], ["lineTo", 73.511, 53.974], ["lineTo", 73, 54], ["lineTo", 47, 54], ["lineTo", 46.489, 53.974], ["lineTo", 45.992, 53.898], ["lineTo", 45.513, 53.775], ["lineTo", 45.054, 53.607], ["lineTo", 44.617, 53.397], ["lineTo", 44.204, 53.146], ["lineTo", 43.82, 52.858], ["lineTo", 43.464, 52.536], ["lineTo", 43.142, 52.18], ["lineTo", 42.854, 51.796], ["lineTo", 42.603, 51.383], ["lineTo", 42.393, 50.946], ["lineTo", 42.225, 50.487], ["lineTo", 42.102, 50.008], ["lineTo", 42.026, 49.511], ["lineTo", 42, 49], ["lineTo", 42, 15], ["lineTo", 42.026, 14.489], ["lineTo", 42.102, 13.992], ["lineTo", 42.225, 13.513], ["lineTo", 42.393, 13.054], ["lineTo", 42.603, 12.617], ["lineTo", 42.854, 12.204], ["lineTo", 43.142, 11.82], ["lineTo", 43.464, 11.464], ["lineTo", 43.82, 11.142], ["lineTo", 44.204, 10.854], ["lineTo", 44.617, 10.603], ["lineTo", 45.054, 10.393], ["lineTo", 45.513, 10.225], ["lineTo", 45.992, 10.102], ["lineTo", 46.489, 10.026], ["lineTo", 47, 10], ["closePath"]], "fill": "#b7b99d", "stroke": "#3f4941", "lineWidth": 3 }, { "path": [["moveTo", 49, 15], ["lineTo", 71, 15], ["lineTo", 71.204, 15.01], ["lineTo", 71.403, 15.041], ["lineTo", 71.595, 15.09], ["lineTo", 71.778, 15.157], ["lineTo", 71.953, 15.241], ["lineTo", 72.118, 15.342], ["lineTo", 72.272, 15.457], ["lineTo", 72.414, 15.586], ["lineTo", 72.543, 15.728], ["lineTo", 72.658, 15.882], ["lineTo", 72.759, 16.047], ["lineTo", 72.843, 16.222], ["lineTo", 72.91, 16.405], ["lineTo", 72.959, 16.597], ["lineTo", 72.99, 16.796], ["lineTo", 73, 17], ["lineTo", 73, 46], ["lineTo", 72.99, 46.204], ["lineTo", 72.959, 46.403], ["lineTo", 72.91, 46.595], ["lineTo", 72.843, 46.778], ["lineTo", 72.759, 46.953], ["lineTo", 72.658, 47.118], ["lineTo", 72.543, 47.272], ["lineTo", 72.414, 47.414], ["lineTo", 72.272, 47.543], ["lineTo", 72.118, 47.658], ["lineTo", 71.953, 47.759], ["lineTo", 71.778, 47.843], ["lineTo", 71.595, 47.91], ["lineTo", 71.403, 47.959], ["lineTo", 71.204, 47.99], ["lineTo", 71, 48], ["lineTo", 49, 48], ["lineTo", 48.796, 47.99], ["lineTo", 48.597, 47.959], ["lineTo", 48.405, 47.91], ["lineTo", 48.222, 47.843], ["lineTo", 48.047, 47.759], ["lineTo", 47.882, 47.658], ["lineTo", 47.728, 47.543], ["lineTo", 47.586, 47.414], ["lineTo", 47.457, 47.272], ["lineTo", 47.342, 47.118], ["lineTo", 47.241, 46.953], ["lineTo", 47.157, 46.778], ["lineTo", 47.09, 46.595], ["lineTo", 47.041, 46.403], ["lineTo", 47.01, 46.204], ["lineTo", 47, 46], ["lineTo", 47, 17], ["lineTo", 47.01, 16.796], ["lineTo", 47.041, 16.597], ["lineTo", 47.09, 16.405], ["lineTo", 47.157, 16.222], ["lineTo", 47.241, 16.047], ["lineTo", 47.342, 15.882], ["lineTo", 47.457, 15.728], ["lineTo", 47.586, 15.586], ["lineTo", 47.728, 15.457], ["lineTo", 47.882, 15.342], ["lineTo", 48.047, 15.241], ["lineTo", 48.222, 15.157], ["lineTo", 48.405, 15.09], ["lineTo", 48.597, 15.041], ["lineTo", 48.796, 15.01], ["lineTo", 49, 15], ["closePath"]], "fill": "#d9e8d6", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 56, 54], ["lineTo", 66, 54]], "fill": "#000000", "stroke": "#444d40", "lineWidth": 3 }] }, "gear_mic": { "width": 120, "height": 160, "shapes": [{ "path": [["moveTo", 20, 152], ["lineTo", 20.207, 151.489], ["lineTo", 20.813, 150.992], ["lineTo", 21.798, 150.513], ["lineTo", 23.143, 150.054], ["lineTo", 24.828, 149.617], ["lineTo", 26.831, 149.204], ["lineTo", 29.134, 148.82], ["lineTo", 31.716, 148.464], ["lineTo", 34.556, 148.142], ["lineTo", 37.636, 147.854], ["lineTo", 40.934, 147.603], ["lineTo", 44.43, 147.393], ["lineTo", 48.105, 147.225], ["lineTo", 51.939, 147.102], ["lineTo", 55.91, 147.026], ["lineTo", 60, 147], ["lineTo", 64.09, 147.026], ["lineTo", 68.061, 147.102], ["lineTo", 71.895, 147.225], ["lineTo", 75.57, 147.393], ["lineTo", 79.066, 147.603], ["lineTo", 82.364, 147.854], ["lineTo", 85.444, 148.142], ["lineTo", 88.284, 148.464], ["lineTo", 90.866, 148.82], ["lineTo", 93.169, 149.204], ["lineTo", 95.172, 149.617], ["lineTo", 96.857, 150.054], ["lineTo", 98.202, 150.513], ["lineTo", 99.187, 150.992], ["lineTo", 99.793, 151.489], ["lineTo", 100, 152], ["lineTo", 99.793, 152.511], ["lineTo", 99.187, 153.008], ["lineTo", 98.202, 153.487], ["lineTo", 96.857, 153.946], ["lineTo", 95.172, 154.383], ["lineTo", 93.169, 154.796], ["lineTo", 90.866, 155.18], ["lineTo", 88.284, 155.536], ["lineTo", 85.444, 155.858], ["lineTo", 82.364, 156.146], ["lineTo", 79.066, 156.397], ["lineTo", 75.57, 156.607], ["lineTo", 71.895, 156.775], ["lineTo", 68.061, 156.898], ["lineTo", 64.09, 156.974], ["lineTo", 60, 157], ["lineTo", 55.91, 156.974], ["lineTo", 51.939, 156.898], ["lineTo", 48.105, 156.775], ["lineTo", 44.43, 156.607], ["lineTo", 40.934, 156.397], ["lineTo", 37.636, 156.146], ["lineTo", 34.556, 155.858], ["lineTo", 31.716, 155.536], ["lineTo", 29.134, 155.18], ["lineTo", 26.831, 154.796], ["lineTo", 24.828, 154.383], ["lineTo", 23.143, 153.946], ["lineTo", 21.798, 153.487], ["lineTo", 20.813, 153.008], ["lineTo", 20.207, 152.511], ["lineTo", 20, 152]], "fill": "#3e3e3429", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 26, 139], ["lineTo", 26.176, 138.08], ["lineTo", 26.691, 137.186], ["lineTo", 27.529, 136.324], ["lineTo", 28.672, 135.497], ["lineTo", 30.104, 134.71], ["lineTo", 31.807, 133.968], ["lineTo", 33.764, 133.275], ["lineTo", 35.958, 132.636], ["lineTo", 38.373, 132.055], ["lineTo", 40.99, 131.537], ["lineTo", 43.794, 131.086], ["lineTo", 46.766, 130.707], ["lineTo", 49.889, 130.405], ["lineTo", 53.148, 130.183], ["lineTo", 56.524, 130.046], ["lineTo", 60, 130], ["lineTo", 63.476, 130.046], ["lineTo", 66.852, 130.183], ["lineTo", 70.111, 130.405], ["lineTo", 73.234, 130.707], ["lineTo", 76.206, 131.086], ["lineTo", 79.01, 131.537], ["lineTo", 81.627, 132.055], ["lineTo", 84.042, 132.636], ["lineTo", 86.236, 133.275], ["lineTo", 88.193, 133.968], ["lineTo", 89.896, 134.71], ["lineTo", 91.328, 135.497], ["lineTo", 92.471, 136.324], ["lineTo", 93.309, 137.186], ["lineTo", 93.824, 138.08], ["lineTo", 94, 139], ["lineTo", 93.824, 139.92], ["lineTo", 93.309, 140.814], ["lineTo", 92.471, 141.676], ["lineTo", 91.328, 142.503], ["lineTo", 89.896, 143.29], ["lineTo", 88.193, 144.032], ["lineTo", 86.236, 144.725], ["lineTo", 84.042, 145.364], ["lineTo", 81.627, 145.945], ["lineTo", 79.01, 146.463], ["lineTo", 76.206, 146.914], ["lineTo", 73.234, 147.293], ["lineTo", 70.111, 147.595], ["lineTo", 66.852, 147.817], ["lineTo", 63.476, 147.954], ["lineTo", 60, 148], ["lineTo", 56.524, 147.954], ["lineTo", 53.148, 147.817], ["lineTo", 49.889, 147.595], ["lineTo", 46.766, 147.293], ["lineTo", 43.794, 146.914], ["lineTo", 40.99, 146.463], ["lineTo", 38.373, 145.945], ["lineTo", 35.958, 145.364], ["lineTo", 33.764, 144.725], ["lineTo", 31.807, 144.032], ["lineTo", 30.104, 143.29], ["lineTo", 28.672, 142.503], ["lineTo", 27.529, 141.676], ["lineTo", 26.691, 140.814], ["lineTo", 26.176, 139.92], ["lineTo", 26, 139]], "fill": "#565c50", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 60, 94], ["lineTo", 60, 137]], "fill": "#000000", "stroke": "#545c4d", "lineWidth": 8 }, { "path": [["moveTo", 33, 50], ["lineTo", 33, 74], ["lineTo", 33.606, 80.328], ["lineTo", 35.32, 85.812], ["lineTo", 37.983, 90.453], ["lineTo", 41.438, 94.25], ["lineTo", 45.524, 97.203], ["lineTo", 50.086, 99.312], ["lineTo", 54.964, 100.578], ["lineTo", 60, 101], ["lineTo", 65.036, 100.578], ["lineTo", 69.914, 99.312], ["lineTo", 74.476, 97.203], ["lineTo", 78.562, 94.25], ["lineTo", 82.017, 90.453], ["lineTo", 84.68, 85.812], ["lineTo", 86.394, 80.328], ["lineTo", 87, 74], ["lineTo", 87, 50]], "fill": "none", "stroke": "#5e6658", "lineWidth": 5 }, { "path": [["moveTo", 60, 17], ["lineTo", 60, 17], ["lineTo", 61.738, 17.088], ["lineTo", 63.426, 17.345], ["lineTo", 65.055, 17.764], ["lineTo", 66.617, 18.336], ["lineTo", 68.103, 19.052], ["lineTo", 69.505, 19.903], ["lineTo", 70.814, 20.882], ["lineTo", 72.021, 21.979], ["lineTo", 73.118, 23.186], ["lineTo", 74.097, 24.495], ["lineTo", 74.948, 25.897], ["lineTo", 75.664, 27.383], ["lineTo", 76.236, 28.945], ["lineTo", 76.655, 30.574], ["lineTo", 76.912, 32.262], ["lineTo", 77, 34], ["lineTo", 77, 68], ["lineTo", 76.912, 69.738], ["lineTo", 76.655, 71.426], ["lineTo", 76.236, 73.055], ["lineTo", 75.664, 74.617], ["lineTo", 74.948, 76.103], ["lineTo", 74.097, 77.505], ["lineTo", 73.118, 78.814], ["lineTo", 72.021, 80.021], ["lineTo", 70.814, 81.118], ["lineTo", 69.505, 82.097], ["lineTo", 68.103, 82.948], ["lineTo", 66.617, 83.664], ["lineTo", 65.055, 84.236], ["lineTo", 63.426, 84.655], ["lineTo", 61.738, 84.912], ["lineTo", 60, 85], ["lineTo", 60, 85], ["lineTo", 58.262, 84.912], ["lineTo", 56.574, 84.655], ["lineTo", 54.945, 84.236], ["lineTo", 53.383, 83.664], ["lineTo", 51.897, 82.948], ["lineTo", 50.495, 82.097], ["lineTo", 49.186, 81.118], ["lineTo", 47.979, 80.021], ["lineTo", 46.882, 78.814], ["lineTo", 45.903, 77.505], ["lineTo", 45.052, 76.103], ["lineTo", 44.336, 74.617], ["lineTo", 43.764, 73.055], ["lineTo", 43.345, 71.426], ["lineTo", 43.088, 69.738], ["lineTo", 43, 68], ["lineTo", 43, 34], ["lineTo", 43.088, 32.262], ["lineTo", 43.345, 30.574], ["lineTo", 43.764, 28.945], ["lineTo", 44.336, 27.383], ["lineTo", 45.052, 25.897], ["lineTo", 45.903, 24.495], ["lineTo", 46.882, 23.186], ["lineTo", 47.979, 21.979], ["lineTo", 49.186, 20.882], ["lineTo", 50.495, 19.903], ["lineTo", 51.897, 19.052], ["lineTo", 53.383, 18.336], ["lineTo", 54.945, 17.764], ["lineTo", 56.574, 17.345], ["lineTo", 58.262, 17.088], ["lineTo", 60, 17], ["closePath"]], "fill": "#717b69", "stroke": "#434d41", "lineWidth": 4 }, { "path": [["moveTo", 49, 33], ["lineTo", 71, 33], ["moveTo", 48, 42], ["lineTo", 72, 42], ["moveTo", 48, 51], ["lineTo", 72, 51], ["moveTo", 48, 60], ["lineTo", 72, 60]], "fill": "#000000", "stroke": "#b5baa0", "lineWidth": 3 }] }, "gear_computer": { "width": 120, "height": 160, "shapes": [{ "path": [["moveTo", 20, 152], ["lineTo", 20.207, 151.489], ["lineTo", 20.813, 150.992], ["lineTo", 21.798, 150.513], ["lineTo", 23.143, 150.054], ["lineTo", 24.828, 149.617], ["lineTo", 26.831, 149.204], ["lineTo", 29.134, 148.82], ["lineTo", 31.716, 148.464], ["lineTo", 34.556, 148.142], ["lineTo", 37.636, 147.854], ["lineTo", 40.934, 147.603], ["lineTo", 44.43, 147.393], ["lineTo", 48.105, 147.225], ["lineTo", 51.939, 147.102], ["lineTo", 55.91, 147.026], ["lineTo", 60, 147], ["lineTo", 64.09, 147.026], ["lineTo", 68.061, 147.102], ["lineTo", 71.895, 147.225], ["lineTo", 75.57, 147.393], ["lineTo", 79.066, 147.603], ["lineTo", 82.364, 147.854], ["lineTo", 85.444, 148.142], ["lineTo", 88.284, 148.464], ["lineTo", 90.866, 148.82], ["lineTo", 93.169, 149.204], ["lineTo", 95.172, 149.617], ["lineTo", 96.857, 150.054], ["lineTo", 98.202, 150.513], ["lineTo", 99.187, 150.992], ["lineTo", 99.793, 151.489], ["lineTo", 100, 152], ["lineTo", 99.793, 152.511], ["lineTo", 99.187, 153.008], ["lineTo", 98.202, 153.487], ["lineTo", 96.857, 153.946], ["lineTo", 95.172, 154.383], ["lineTo", 93.169, 154.796], ["lineTo", 90.866, 155.18], ["lineTo", 88.284, 155.536], ["lineTo", 85.444, 155.858], ["lineTo", 82.364, 156.146], ["lineTo", 79.066, 156.397], ["lineTo", 75.57, 156.607], ["lineTo", 71.895, 156.775], ["lineTo", 68.061, 156.898], ["lineTo", 64.09, 156.974], ["lineTo", 60, 157], ["lineTo", 55.91, 156.974], ["lineTo", 51.939, 156.898], ["lineTo", 48.105, 156.775], ["lineTo", 44.43, 156.607], ["lineTo", 40.934, 156.397], ["lineTo", 37.636, 156.146], ["lineTo", 34.556, 155.858], ["lineTo", 31.716, 155.536], ["lineTo", 29.134, 155.18], ["lineTo", 26.831, 154.796], ["lineTo", 24.828, 154.383], ["lineTo", 23.143, 153.946], ["lineTo", 21.798, 153.487], ["lineTo", 20.813, 153.008], ["lineTo", 20.207, 152.511], ["lineTo", 20, 152]], "fill": "#3e3e3429", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 16, 31], ["lineTo", 104, 31], ["lineTo", 104, 96], ["lineTo", 16, 96], ["lineTo", 16, 31], ["closePath"]], "fill": "#778175", "stroke": "#444f46", "lineWidth": 4 }, { "path": [["moveTo", 24, 37], ["lineTo", 96, 37], ["lineTo", 96.204, 37.01], ["lineTo", 96.403, 37.041], ["lineTo", 96.595, 37.09], ["lineTo", 96.778, 37.157], ["lineTo", 96.953, 37.241], ["lineTo", 97.118, 37.342], ["lineTo", 97.272, 37.457], ["lineTo", 97.414, 37.586], ["lineTo", 97.543, 37.728], ["lineTo", 97.658, 37.882], ["lineTo", 97.759, 38.047], ["lineTo", 97.843, 38.222], ["lineTo", 97.91, 38.405], ["lineTo", 97.959, 38.597], ["lineTo", 97.99, 38.796], ["lineTo", 98, 39], ["lineTo", 98, 86], ["lineTo", 97.99, 86.204], ["lineTo", 97.959, 86.403], ["lineTo", 97.91, 86.595], ["lineTo", 97.843, 86.778], ["lineTo", 97.759, 86.953], ["lineTo", 97.658, 87.118], ["lineTo", 97.543, 87.272], ["lineTo", 97.414, 87.414], ["lineTo", 97.272, 87.543], ["lineTo", 97.118, 87.658], ["lineTo", 96.953, 87.759], ["lineTo", 96.778, 87.843], ["lineTo", 96.595, 87.91], ["lineTo", 96.403, 87.959], ["lineTo", 96.204, 87.99], ["lineTo", 96, 88], ["lineTo", 24, 88], ["lineTo", 23.796, 87.99], ["lineTo", 23.597, 87.959], ["lineTo", 23.405, 87.91], ["lineTo", 23.222, 87.843], ["lineTo", 23.047, 87.759], ["lineTo", 22.882, 87.658], ["lineTo", 22.728, 87.543], ["lineTo", 22.586, 87.414], ["lineTo", 22.457, 87.272], ["lineTo", 22.342, 87.118], ["lineTo", 22.241, 86.953], ["lineTo", 22.157, 86.778], ["lineTo", 22.09, 86.595], ["lineTo", 22.041, 86.403], ["lineTo", 22.01, 86.204], ["lineTo", 22, 86], ["lineTo", 22, 39], ["lineTo", 22.01, 38.796], ["lineTo", 22.041, 38.597], ["lineTo", 22.09, 38.405], ["lineTo", 22.157, 38.222], ["lineTo", 22.241, 38.047], ["lineTo", 22.342, 37.882], ["lineTo", 22.457, 37.728], ["lineTo", 22.586, 37.586], ["lineTo", 22.728, 37.457], ["lineTo", 22.882, 37.342], ["lineTo", 23.047, 37.241], ["lineTo", 23.222, 37.157], ["lineTo", 23.405, 37.09], ["lineTo", 23.597, 37.041], ["lineTo", 23.796, 37.01], ["lineTo", 24, 37], ["closePath"]], "fill": "#b3c6b3", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 28, 44], ["lineTo", 55, 44], ["lineTo", 55, 66], ["lineTo", 28, 66], ["lineTo", 28, 44], ["closePath"]], "fill": "#e9dbad", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 62, 46], ["lineTo", 92, 46], ["moveTo", 62, 53], ["lineTo", 82, 53], ["moveTo", 27, 75], ["lineTo", 91, 75], ["moveTo", 27, 81], ["lineTo", 75, 81]], "fill": "#000000", "stroke": "#617c68", "lineWidth": 4 }, { "path": [["moveTo", 16, 96], ["lineTo", 3, 120], ["lineTo", 117, 120], ["lineTo", 104, 96], ["lineTo", 16, 96], ["closePath"]], "fill": "#a8b09e", "stroke": "#576252", "lineWidth": 3 }, { "path": [["moveTo", 20, 104], ["lineTo", 98, 104], ["moveTo", 16, 110], ["lineTo", 103, 110]], "fill": "#000000", "stroke": "#6a7763", "lineWidth": 3 }, { "path": [["moveTo", 48, 114], ["lineTo", 73, 114]], "fill": "#000000", "stroke": "#64725e", "lineWidth": 4 }] }, "gear_camera": { "width": 120, "height": 160, "shapes": [{ "path": [["moveTo", 20, 152], ["lineTo", 20.207, 151.489], ["lineTo", 20.813, 150.992], ["lineTo", 21.798, 150.513], ["lineTo", 23.143, 150.054], ["lineTo", 24.828, 149.617], ["lineTo", 26.831, 149.204], ["lineTo", 29.134, 148.82], ["lineTo", 31.716, 148.464], ["lineTo", 34.556, 148.142], ["lineTo", 37.636, 147.854], ["lineTo", 40.934, 147.603], ["lineTo", 44.43, 147.393], ["lineTo", 48.105, 147.225], ["lineTo", 51.939, 147.102], ["lineTo", 55.91, 147.026], ["lineTo", 60, 147], ["lineTo", 64.09, 147.026], ["lineTo", 68.061, 147.102], ["lineTo", 71.895, 147.225], ["lineTo", 75.57, 147.393], ["lineTo", 79.066, 147.603], ["lineTo", 82.364, 147.854], ["lineTo", 85.444, 148.142], ["lineTo", 88.284, 148.464], ["lineTo", 90.866, 148.82], ["lineTo", 93.169, 149.204], ["lineTo", 95.172, 149.617], ["lineTo", 96.857, 150.054], ["lineTo", 98.202, 150.513], ["lineTo", 99.187, 150.992], ["lineTo", 99.793, 151.489], ["lineTo", 100, 152], ["lineTo", 99.793, 152.511], ["lineTo", 99.187, 153.008], ["lineTo", 98.202, 153.487], ["lineTo", 96.857, 153.946], ["lineTo", 95.172, 154.383], ["lineTo", 93.169, 154.796], ["lineTo", 90.866, 155.18], ["lineTo", 88.284, 155.536], ["lineTo", 85.444, 155.858], ["lineTo", 82.364, 156.146], ["lineTo", 79.066, 156.397], ["lineTo", 75.57, 156.607], ["lineTo", 71.895, 156.775], ["lineTo", 68.061, 156.898], ["lineTo", 64.09, 156.974], ["lineTo", 60, 157], ["lineTo", 55.91, 156.974], ["lineTo", 51.939, 156.898], ["lineTo", 48.105, 156.775], ["lineTo", 44.43, 156.607], ["lineTo", 40.934, 156.397], ["lineTo", 37.636, 156.146], ["lineTo", 34.556, 155.858], ["lineTo", 31.716, 155.536], ["lineTo", 29.134, 155.18], ["lineTo", 26.831, 154.796], ["lineTo", 24.828, 154.383], ["lineTo", 23.143, 153.946], ["lineTo", 21.798, 153.487], ["lineTo", 20.813, 153.008], ["lineTo", 20.207, 152.511], ["lineTo", 20, 152]], "fill": "#3e3e3429", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 60, 85], ["lineTo", 60, 146], ["moveTo", 60, 103], ["lineTo", 30, 146], ["moveTo", 60, 103], ["lineTo", 91, 146]], "fill": "#000000", "stroke": "#52594e", "lineWidth": 5 }, { "path": [["moveTo", 30, 43], ["lineTo", 92, 43], ["lineTo", 93.022, 43.052], ["lineTo", 94.015, 43.203], ["lineTo", 94.974, 43.45], ["lineTo", 95.892, 43.786], ["lineTo", 96.767, 44.207], ["lineTo", 97.591, 44.708], ["lineTo", 98.361, 45.284], ["lineTo", 99.071, 45.929], ["lineTo", 99.716, 46.639], ["lineTo", 100.292, 47.409], ["lineTo", 100.793, 48.233], ["lineTo", 101.214, 49.108], ["lineTo", 101.55, 50.026], ["lineTo", 101.797, 50.985], ["lineTo", 101.948, 51.978], ["lineTo", 102, 53], ["lineTo", 102, 86], ["lineTo", 101.948, 87.022], ["lineTo", 101.797, 88.015], ["lineTo", 101.55, 88.974], ["lineTo", 101.214, 89.892], ["lineTo", 100.793, 90.767], ["lineTo", 100.292, 91.591], ["lineTo", 99.716, 92.361], ["lineTo", 99.071, 93.071], ["lineTo", 98.361, 93.716], ["lineTo", 97.591, 94.292], ["lineTo", 96.767, 94.793], ["lineTo", 95.892, 95.214], ["lineTo", 94.974, 95.55], ["lineTo", 94.015, 95.797], ["lineTo", 93.022, 95.948], ["lineTo", 92, 96], ["lineTo", 30, 96], ["lineTo", 28.978, 95.948], ["lineTo", 27.985, 95.797], ["lineTo", 27.026, 95.55], ["lineTo", 26.108, 95.214], ["lineTo", 25.233, 94.793], ["lineTo", 24.409, 94.292], ["lineTo", 23.639, 93.716], ["lineTo", 22.929, 93.071], ["lineTo", 22.284, 92.361], ["lineTo", 21.708, 91.591], ["lineTo", 21.207, 90.767], ["lineTo", 20.786, 89.892], ["lineTo", 20.45, 88.974], ["lineTo", 20.203, 88.015], ["lineTo", 20.052, 87.022], ["lineTo", 20, 86], ["lineTo", 20, 53], ["lineTo", 20.052, 51.978], ["lineTo", 20.203, 50.985], ["lineTo", 20.45, 50.026], ["lineTo", 20.786, 49.108], ["lineTo", 21.207, 48.233], ["lineTo", 21.708, 47.409], ["lineTo", 22.284, 46.639], ["lineTo", 22.929, 45.929], ["lineTo", 23.639, 45.284], ["lineTo", 24.409, 44.708], ["lineTo", 25.233, 44.207], ["lineTo", 26.108, 43.786], ["lineTo", 27.026, 43.45], ["lineTo", 27.985, 43.203], ["lineTo", 28.978, 43.052], ["lineTo", 30, 43], ["closePath"]], "fill": "#535e4e", "stroke": "#394537", "lineWidth": 4 }, { "path": [["moveTo", 35, 43], ["lineTo", 45, 27], ["lineTo", 75, 27], ["lineTo", 85, 43]], "fill": "#66725d", "stroke": "#394537", "lineWidth": 4 }, { "path": [["moveTo", 40, 68], ["lineTo", 40.124, 65.546], ["lineTo", 40.488, 63.163], ["lineTo", 41.079, 60.863], ["lineTo", 41.886, 58.658], ["lineTo", 42.897, 56.56], ["lineTo", 44.099, 54.581], ["lineTo", 45.48, 52.734], ["lineTo", 47.029, 51.029], ["lineTo", 48.734, 49.48], ["lineTo", 50.581, 48.099], ["lineTo", 52.56, 46.897], ["lineTo", 54.658, 45.886], ["lineTo", 56.863, 45.079], ["lineTo", 59.163, 44.488], ["lineTo", 61.546, 44.124], ["lineTo", 64, 44], ["lineTo", 66.454, 44.124], ["lineTo", 68.837, 44.488], ["lineTo", 71.137, 45.079], ["lineTo", 73.342, 45.886], ["lineTo", 75.44, 46.897], ["lineTo", 77.419, 48.099], ["lineTo", 79.266, 49.48], ["lineTo", 80.971, 51.029], ["lineTo", 82.52, 52.734], ["lineTo", 83.901, 54.581], ["lineTo", 85.103, 56.56], ["lineTo", 86.114, 58.658], ["lineTo", 86.921, 60.863], ["lineTo", 87.512, 63.163], ["lineTo", 87.876, 65.546], ["lineTo", 88, 68], ["lineTo", 87.876, 70.454], ["lineTo", 87.512, 72.837], ["lineTo", 86.921, 75.137], ["lineTo", 86.114, 77.342], ["lineTo", 85.103, 79.44], ["lineTo", 83.901, 81.419], ["lineTo", 82.52, 83.266], ["lineTo", 80.971, 84.971], ["lineTo", 79.266, 86.52], ["lineTo", 77.419, 87.901], ["lineTo", 75.44, 89.103], ["lineTo", 73.342, 90.114], ["lineTo", 71.137, 90.921], ["lineTo", 68.837, 91.512], ["lineTo", 66.454, 91.876], ["lineTo", 64, 92], ["lineTo", 61.546, 91.876], ["lineTo", 59.163, 91.512], ["lineTo", 56.863, 90.921], ["lineTo", 54.658, 90.114], ["lineTo", 52.56, 89.103], ["lineTo", 50.581, 87.901], ["lineTo", 48.734, 86.52], ["lineTo", 47.029, 84.971], ["lineTo", 45.48, 83.266], ["lineTo", 44.099, 81.419], ["lineTo", 42.897, 79.44], ["lineTo", 41.886, 77.342], ["lineTo", 41.079, 75.137], ["lineTo", 40.488, 72.837], ["lineTo", 40.124, 70.454], ["lineTo", 40, 68]], "fill": "#9cae8f", "stroke": "#394537", "lineWidth": 5 }, { "path": [["moveTo", 48, 68], ["lineTo", 48.083, 66.364], ["lineTo", 48.325, 64.775], ["lineTo", 48.719, 63.242], ["lineTo", 49.257, 61.772], ["lineTo", 49.931, 60.373], ["lineTo", 50.733, 59.054], ["lineTo", 51.654, 57.823], ["lineTo", 52.686, 56.686], ["lineTo", 53.823, 55.654], ["lineTo", 55.054, 54.733], ["lineTo", 56.373, 53.931], ["lineTo", 57.772, 53.257], ["lineTo", 59.242, 52.719], ["lineTo", 60.775, 52.325], ["lineTo", 62.364, 52.083], ["lineTo", 64, 52], ["lineTo", 65.636, 52.083], ["lineTo", 67.225, 52.325], ["lineTo", 68.758, 52.719], ["lineTo", 70.228, 53.257], ["lineTo", 71.627, 53.931], ["lineTo", 72.946, 54.733], ["lineTo", 74.177, 55.654], ["lineTo", 75.314, 56.686], ["lineTo", 76.346, 57.823], ["lineTo", 77.267, 59.054], ["lineTo", 78.069, 60.373], ["lineTo", 78.743, 61.772], ["lineTo", 79.281, 63.242], ["lineTo", 79.675, 64.775], ["lineTo", 79.917, 66.364], ["lineTo", 80, 68], ["lineTo", 79.917, 69.636], ["lineTo", 79.675, 71.225], ["lineTo", 79.281, 72.758], ["lineTo", 78.743, 74.228], ["lineTo", 78.069, 75.627], ["lineTo", 77.267, 76.946], ["lineTo", 76.346, 78.177], ["lineTo", 75.314, 79.314], ["lineTo", 74.177, 80.346], ["lineTo", 72.946, 81.267], ["lineTo", 71.627, 82.069], ["lineTo", 70.228, 82.743], ["lineTo", 68.758, 83.281], ["lineTo", 67.225, 83.675], ["lineTo", 65.636, 83.917], ["lineTo", 64, 84], ["lineTo", 62.364, 83.917], ["lineTo", 60.775, 83.675], ["lineTo", 59.242, 83.281], ["lineTo", 57.772, 82.743], ["lineTo", 56.373, 82.069], ["lineTo", 55.054, 81.267], ["lineTo", 53.823, 80.346], ["lineTo", 52.686, 79.314], ["lineTo", 51.654, 78.177], ["lineTo", 50.733, 76.946], ["lineTo", 49.931, 75.627], ["lineTo", 49.257, 74.228], ["lineTo", 48.719, 72.758], ["lineTo", 48.325, 71.225], ["lineTo", 48.083, 69.636], ["lineTo", 48, 68]], "fill": "#344c46", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 52, 62], ["lineTo", 52.041, 61.387], ["lineTo", 52.163, 60.791], ["lineTo", 52.36, 60.216], ["lineTo", 52.629, 59.665], ["lineTo", 52.966, 59.14], ["lineTo", 53.366, 58.645], ["lineTo", 53.827, 58.183], ["lineTo", 54.343, 57.757], ["lineTo", 54.911, 57.37], ["lineTo", 55.527, 57.025], ["lineTo", 56.187, 56.724], ["lineTo", 56.886, 56.472], ["lineTo", 57.621, 56.27], ["lineTo", 58.388, 56.122], ["lineTo", 59.182, 56.031], ["lineTo", 60, 56], ["lineTo", 60.818, 56.031], ["lineTo", 61.612, 56.122], ["lineTo", 62.379, 56.27], ["lineTo", 63.114, 56.472], ["lineTo", 63.813, 56.724], ["lineTo", 64.473, 57.025], ["lineTo", 65.089, 57.37], ["lineTo", 65.657, 57.757], ["lineTo", 66.173, 58.183], ["lineTo", 66.634, 58.645], ["lineTo", 67.034, 59.14], ["lineTo", 67.371, 59.665], ["lineTo", 67.64, 60.216], ["lineTo", 67.837, 60.791], ["lineTo", 67.959, 61.387], ["lineTo", 68, 62], ["lineTo", 67.959, 62.613], ["lineTo", 67.837, 63.209], ["lineTo", 67.64, 63.784], ["lineTo", 67.371, 64.335], ["lineTo", 67.034, 64.86], ["lineTo", 66.634, 65.355], ["lineTo", 66.173, 65.817], ["lineTo", 65.657, 66.243], ["lineTo", 65.089, 66.63], ["lineTo", 64.473, 66.975], ["lineTo", 63.813, 67.276], ["lineTo", 63.114, 67.528], ["lineTo", 62.379, 67.73], ["lineTo", 61.612, 67.878], ["lineTo", 60.818, 67.969], ["lineTo", 60, 68], ["lineTo", 59.182, 67.969], ["lineTo", 58.388, 67.878], ["lineTo", 57.621, 67.73], ["lineTo", 56.886, 67.528], ["lineTo", 56.187, 67.276], ["lineTo", 55.527, 66.975], ["lineTo", 54.911, 66.63], ["lineTo", 54.343, 66.243], ["lineTo", 53.827, 65.817], ["lineTo", 53.366, 65.355], ["lineTo", 52.966, 64.86], ["lineTo", 52.629, 64.335], ["lineTo", 52.36, 63.784], ["lineTo", 52.163, 63.209], ["lineTo", 52.041, 62.613], ["lineTo", 52, 62]], "fill": "#b5d2ba", "stroke": "none", "lineWidth": 1.8 }, { "path": [["moveTo", 30, 49], ["lineTo", 38, 49], ["lineTo", 38.204, 49.01], ["lineTo", 38.403, 49.041], ["lineTo", 38.595, 49.09], ["lineTo", 38.778, 49.157], ["lineTo", 38.953, 49.241], ["lineTo", 39.118, 49.342], ["lineTo", 39.272, 49.457], ["lineTo", 39.414, 49.586], ["lineTo", 39.543, 49.728], ["lineTo", 39.658, 49.882], ["lineTo", 39.759, 50.047], ["lineTo", 39.843, 50.222], ["lineTo", 39.91, 50.405], ["lineTo", 39.959, 50.597], ["lineTo", 39.99, 50.796], ["lineTo", 40, 51], ["lineTo", 40, 53], ["lineTo", 39.99, 53.204], ["lineTo", 39.959, 53.403], ["lineTo", 39.91, 53.595], ["lineTo", 39.843, 53.778], ["lineTo", 39.759, 53.953], ["lineTo", 39.658, 54.118], ["lineTo", 39.543, 54.272], ["lineTo", 39.414, 54.414], ["lineTo", 39.272, 54.543], ["lineTo", 39.118, 54.658], ["lineTo", 38.953, 54.759], ["lineTo", 38.778, 54.843], ["lineTo", 38.595, 54.91], ["lineTo", 38.403, 54.959], ["lineTo", 38.204, 54.99], ["lineTo", 38, 55], ["lineTo", 30, 55], ["lineTo", 29.796, 54.99], ["lineTo", 29.597, 54.959], ["lineTo", 29.405, 54.91], ["lineTo", 29.222, 54.843], ["lineTo", 29.047, 54.759], ["lineTo", 28.882, 54.658], ["lineTo", 28.728, 54.543], ["lineTo", 28.586, 54.414], ["lineTo", 28.457, 54.272], ["lineTo", 28.342, 54.118], ["lineTo", 28.241, 53.953], ["lineTo", 28.157, 53.778], ["lineTo", 28.09, 53.595], ["lineTo", 28.041, 53.403], ["lineTo", 28.01, 53.204], ["lineTo", 28, 53], ["lineTo", 28, 51], ["lineTo", 28.01, 50.796], ["lineTo", 28.041, 50.597], ["lineTo", 28.09, 50.405], ["lineTo", 28.157, 50.222], ["lineTo", 28.241, 50.047], ["lineTo", 28.342, 49.882], ["lineTo", 28.457, 49.728], ["lineTo", 28.586, 49.586], ["lineTo", 28.728, 49.457], ["lineTo", 28.882, 49.342], ["lineTo", 29.047, 49.241], ["lineTo", 29.222, 49.157], ["lineTo", 29.405, 49.09], ["lineTo", 29.597, 49.041], ["lineTo", 29.796, 49.01], ["lineTo", 30, 49], ["closePath"]], "fill": "#e1d7a9", "stroke": "none", "lineWidth": 1.8 }] } };

  // src/Artwork.ts
  function artwork(parent, name, x, y, w, h, color = "#7f6936") {
    const node = new Laya.Sprite(), spec = VECTOR_ART[name];
    node.name = "art:" + name;
    node.pos(x, y);
    node.size(w, h);
    node.mouseEnabled = false;
    parent.addChild(node);
    if (!spec) return node;
    const visual = new Laya.Sprite();
    visual.mouseEnabled = false;
    visual.scale(w / spec.width, h / spec.height);
    node.addChild(visual);
    for (const shape of spec.shapes) {
      const fill = shape.fill === "currentColor" ? color : shape.fill, stroke = shape.stroke === "currentColor" ? color : shape.stroke;
      visual.graphics.drawPath(0, 0, shape.path, fill === "none" ? null : { fillStyle: fill }, stroke === "none" ? null : { strokeStyle: stroke, lineWidth: shape.lineWidth, lineJoin: "round", lineCap: "round" });
    }
    return node;
  }
  var icon = (parent, name, x, y, size = 22, color = "#7f6936") => artwork(parent, name, x, y, size, size, color);

  // src/CreatorApp.ts
  var num = (n) => n >= 1e8 ? (n / 1e8).toFixed(2) + "亿" : n >= 1e4 ? (n / 1e4).toFixed(2) + "万" : Math.floor(n).toLocaleString("zh-CN");
  var DESC = { sense: "提升推流与爆火概率", luck: "提高稀有爆火概率", filming: "提高作品基础质量", editing: "缩短剪辑并增强加速", trend: "提升热点作品爆火概率", persistence: "降低下一条的沉没概率" };
  var CreatorApp = class {
    constructor() {
      this.platform = new Platform();
      this.game = CreatorGame.load(this.platform.storage);
      this.background = new Laya.Sprite();
      this.root = new Laya.Sprite();
      this.view = this.platform.layout();
      // Missing resources bypass cached failure records so retries reach the host.
      this.resources = new ResourceLoader(CATALOG.groups, (urls) => Laya.loader.load(urls, { ignoreCache: true }), (url) => Laya.loader.getRes(url));
      this.busy = false;
      this.target = "room";
      this.requestId = 0;
      this.toast = new Laya.Sprite();
      this.screen = this.phase();
      this.tab = "growth";
      this.labels = {};
      this.performer = null;
      this.lastFrame = -1;
      this.editProgress = null;
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
      this.resize = () => {
        if (!this.destroyed) this.go(this.busy ? this.target : this.screen);
      };
      this.hide = () => {
        this.game.save();
        this.remember();
        this.suspended = true;
        this.drag = null;
      };
      this.show = () => {
        if (this.destroyed) return;
        this.suspended = false;
        this.game.tick();
        if (this.game.s.active) this.screen = this.phase();
        this.game.syncDaily();
        this.go(this.screen);
      };
      this.render = () => {
        if (this.destroyed || this.busy) return;
        this.position();
        this.root.cacheAs = this.screen === "room" ? "bitmap" : "none";
        this.drag = null;
        this.modal = false;
        this.panel = null;
        this.labels = {};
        this.performer = null;
        this.editProgress = null;
        this.lastFrame = -1;
        this.root.destroyChildren();
        this.background.destroyChildren();
        this.background.pos((Laya.stage.width - 390) / 2, 0);
        box(this.background, 0, 0, 390, Laya.stage.height, palette.paper, 0);
        this.root.name = "creator-game:" + this.screen;
        if (this.screen !== "room") {
          box(this.root, 0, 0, 390, this.h, palette.paper, 0);
          const shell = box(this.root, 14, 88, 362, this.h - 101, palette.cream, 19, "game-screen");
          shell.mouseEnabled = false;
        }
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
      return this.view.height;
    }
    phase() {
      return this.game.s.active?.phase === "ended" ? "result" : this.game.s.active?.phase || "room";
    }
    async start() {
      Laya.stage.bgColor = palette.paper;
      this.background.name = "creator-background";
      this.background.mouseEnabled = false;
      this.background.cacheAs = "bitmap";
      Laya.stage.addChild(this.background);
      Laya.stage.addChild(this.root);
      this.platform.bindLifecycle({ hidden: this.hide, shown: this.show, checkpoint: () => this.game.save(), resize: this.resize });
      Laya.stage.on(Laya.Event.MOUSE_UP, this, this.endPull);
      Laya.stage.on(Laya.Event.KEY_DOWN, this, this.keyDown);
      Laya.timer.loop(50, this, this.tick);
      this.game.tick();
      this.go(this.phase());
    }
    groups(screen) {
      const groups = ["boot"];
      if (screen === "room") groups.push(this.game.s.studio.tier ? "room_" + this.game.s.studio.tier : this.game.s.lamp ? "room_lamp" : "room_0");
      if (screen === "equipment") {
        groups.push("room_" + this.game.s.studio.tier);
        if (ROOMS[this.game.s.studio.tier + 1]) groups.push("room_" + (this.game.s.studio.tier + 1));
      }
      if (screen === "phone") groups.push("topic_cat");
      if (["shoot", "edit", "ready", "live"].includes(screen)) groups.push("topic_" + (this.game.s.active?.topicId || "cat"));
      return groups;
    }
    position() {
      this.view = this.platform.layout();
      this.root.pos(this.view.x, this.view.y);
      this.root.scale(this.view.scale, this.view.scale);
      this.root.size(390, this.h);
    }
    loading(failed = false) {
      this.position();
      this.root.destroyChildren();
      this.root.name = failed ? "creator-game:load-error" : "creator-game:loading";
      box(this.root, 0, 0, 390, this.h, palette.paper, 0);
      text(this.root, failed ? "画面暂时没加载好" : "正在整理你的创作间…", 28, this.h / 2 - 90, 334, 22, palette.ink, true, 65).align = "center";
      text(this.root, failed ? "进度已保留，点一下再试试。" : "马上就好。", 28, this.h / 2 - 15, 334, 14, palette.muted).align = "center";
      if (failed) button(this.root, "retry-load", "重新加载", 70, this.h / 2 + 55, 250, 55, () => this.go(this.target));
    }
    keyDown(e) {
      if (!this.busy && !this.suspended && !this.modal && (e.keyCode === 32 || e.keyCode === 13) && this.screen === "shoot") this.dance();
    }
    remember() {
      if (this.panel && !this.panel.destroyed) this.positions[this.screen + ":" + this.tab] = this.panel.vScrollBar?.value || 0;
    }
    go(screen) {
      if (this.destroyed) return;
      this.remember();
      this.target = screen;
      const id = ++this.requestId, groups = this.groups(screen);
      const activate = () => {
        if (this.destroyed || id !== this.requestId) return;
        this.game.tick();
        const next = ["shoot", "edit", "ready", "live", "result"].includes(screen) ? this.phase() : screen;
        this.busy = false;
        if (this.screen !== next) this.phaseEnteredAt = Date.now();
        this.screen = next;
        this.render();
        if (this.platform.storage.recovered) {
          this.platform.storage.recovered = false;
          this.game.save();
          this.hint("已恢复上次保存的创作进度");
        }
      };
      if (this.resources.ready(groups)) {
        activate();
        return;
      }
      this.busy = true;
      this.loading();
      this.resources.ensure(groups).then(activate, () => {
        if (!this.destroyed && id === this.requestId) this.loading(true);
      });
    }
    header() {
      const badge = box(this.root, 16, 19, 194, 52, palette.cream, 16, "player-badge");
      image(badge, "resources/creator-avatar-v102.webp", -5, -17, 61, 71, true, 0.5);
      text(badge, this.game.title, 48, 8, 144, 13, palette.ink, true, 21);
      text(badge, "第 " + (this.game.s.works.length + 1) + " 条创作", 48, 29, 140, 9, palette.muted, false, 20);
      const level = box(badge, 13, 37, 22, 22, "#6b8956", 11);
      level.graphics.drawCircle(11, 11, 10, null, "#fff1b3", 2);
      centered(level, String(this.game.s.works.length + 1), 0, 0, 22, 10, "#fff2c9", true, 22);
      for (const [i, name, value, label] of [[0, "heart", num(this.game.s.fans), "粉丝"], [1, "coin", num(this.game.s.wallet), "资金"]]) {
        const row = box(this.root, 226, 20 + i * 29, 149, 24, "#3d5437", 12, "resource:" + name);
        row.graphics.drawRoundRect(0, 0, 149, 24, 12, 12, 12, 12, null, "#a6b082", 1);
        const medal = box(row, -5, -3, 29, 29, i ? "#edc25f" : "#e99682", 14);
        medal.graphics.drawCircle(14.5, 14.5, 13.5, null, "#fff2be", 2);
        icon(medal, name, 5, 5, 19, i ? "#9c702b" : "#fff4da");
        text(row, value, 31, 2, 84, 14, "#fff5d6", true, 22);
        text(row, label, 119, 5, 29, 9, "#e2e7bb", false, 18);
      }
    }
    steps() {
      const bar = box(this.root, 16, 90, 358, 50, "#607e49", 16, "creation-steps");
      bar.graphics.drawRect(0, 25, 358, 25, "#607e49");
      bar.graphics.drawLine(0, 50, 358, 50, "#3f6134", 3);
      button(this.root, "home", "‹", 26, 98, 32, 32, () => this.home());
      const current = { phone: 0, shoot: 1, edit: 2, ready: 3, live: 3, result: 4 }[this.screen] || 0;
      ["选题", "拍视频", "剪辑", "发布"].forEach((name, i) => {
        const x = 68 + i * 74;
        if (current === i) box(this.root, x, 95, 69, 40, "#3e6036", 9);
        const circle = box(this.root, x + 25, 98, 19, 19, current === i ? "#f3c160" : "#87a569", 9);
        centered(circle, current > i ? "✓" : String(i + 1), 0, 0, 19, 11, current === i ? "#705327" : "#f5f4d0", true, 19);
        centered(this.root, name, x, 118, 69, 10, current === i ? "#ffe2a2" : "#e4ecc6", true, 16);
      });
    }
    panelHeader() {
      button(this.root, "home", "‹", 26, 101, 34, 34, () => this.home());
      centered(this.root, { growth: "你的创作能力", works: "作品档案", equipment: "我的创作间", tasks: "成长手账" }[this.screen] || "", 70, 99, 285, 21, palette.green, true, 40);
    }
    home() {
      if (this.game.s.active) this.hint("先完成当前作品，进度会自动保存");
      else this.go("room");
    }
    room() {
      const s = this.game.s, url = "resources/" + (s.studio.tier ? this.game.room.art : s.lamp ? "room-interior-lamp-v103.webp" : "room-interior-v103.webp");
      image(this.background, url, 0, 0, 390, Laya.stage.height, true, 1);
      const shade = box(this.background, 0, Laya.stage.height * 0.78, 390, Laya.stage.height * 0.22, "#292d22", 0);
      shade.alpha = 0.16;
      this.header();
      const tag = box(this.root, 17, 91, 148, 25, "#43583b", 8);
      icon(tag, "home", 7, 5, 15, "#f7e9be");
      text(tag, this.game.room.name, 28, 3, 114, 11, "#fff1cf", true, 22);
      button(this.root, "sound-toggle", this.platform.muted ? "静" : "音", 338, 91, 34, 28, () => {
        this.platform.mute();
        this.render();
        if (this.platform.settingsFailed) this.hint("声音设置已生效，这次未能保存");
      }, true, false);
      const quest = this.game.quest, task = button(this.root, "tasks", "", 16, 127, 358, 62, () => this.go("tasks"), true, false);
      task.graphics.clear();
      surface(task, 358, 62, "#7c985c", "#587744", "#bdcb91", 13, 3);
      const mark = box(task, 10, 13, 29, 36, "#f2c663", 5);
      centered(mark, quest?.status === "ready" ? "✓" : "!", 0, 0, 29, 24, "#85612a", true, 36);
      text(task, quest?.status === "ready" ? "任务完成 · 可领奖" : "当前任务", 49, 10, 202, 9, "#dce8ba", false, 18);
      text(task, quest?.title || "继续刷新纪录", 49, 29, 232, 14, "#fff4d1", true, 26);
      const count = box(task, 287, 16, 60, 30, "#39572f", 8);
      centered(count, quest ? quest.status === "ready" ? "领取奖励" : num(Math.min(quest.current, quest.target)) + " / " + num(quest.target) : "查看", 1, 0, 58, 10, "#fff3c9", true, 30);
      const sceneTag = box(this.root, 17, 203, 190, 23, "#425537", 8);
      sceneTag.alpha = 0.86;
      text(sceneTag, s.studio.tier ? this.game.room.name + " · 品质 +" + this.game.room.quality : s.lamp ? "补光灯已装备 · 品质 +10%" : "我的第一间出租屋", 9, 3, 177, 9, "#fff1cc", false, 20);
      const texture = Laya.loader.getRes(url), scale = Math.max(390 / texture.width, Laya.stage.height / texture.height);
      const worldX = 390 - texture.width * scale + texture.width * scale * 0.835;
      const x = ((Laya.stage.width - 390) / 2 + worldX - this.view.x) / this.view.scale;
      const worldY = (Laya.stage.height - texture.height * scale) / 2 + texture.height * scale * 0.463;
      const y = (worldY - this.view.y) / this.view.scale;
      for (const gear of EQUIPMENT.filter((e) => s.studio.gear[e.id] && (e.id !== "lamp" || s.studio.tier > 0))) {
        const gx = 390 - texture.width * scale + texture.width * scale * gear.x;
        const gy = (Laya.stage.height - texture.height * scale) / 2 + texture.height * scale * gear.y;
        artwork(this.background, "gear_" + gear.id, gx - 22, gy - 40, 44, 59);
      }
      const px = Math.max(55, Math.min(335, x)), py = Math.max(265, Math.min(this.h - 295, y));
      const halo = box(this.root, px - 27, py - 29, 54, 54, "#ffe68b00", 27);
      halo.graphics.drawCircle(27, 27, 25, null, "#ffd66566", 9);
      halo.graphics.drawCircle(27, 27, 23, null, "#fff3a3", 3);
      centered(this.root, "▼", px - 20, py - 53, 40, 27, "#ffda6c", true, 32);
      const phone = button(this.root, "phone", (this.game.unlocked ? "继续创作" : "点击开始") + "  ›", Math.max(18, Math.min(266, px - 80)), py + 34, 111, 42, () => this.go("phone"));
      icon(phone, "phone", 9, 11, 17, "#835e28");
      const phoneCaption = phone.getChildByName("button-caption");
      phoneCaption.x = 27;
      phoneCaption.width = 78;
      const dy = this.h - (this.game.unlocked ? 224 : 199), dialogue = box(this.root, 16, dy, 358, 95, palette.cream, 13, "character-dialogue");
      image(dialogue, "resources/creator-avatar-v102.webp", -12, -63, 111, 158);
      const name = box(dialogue, 96, 6, 58, 21, "#6c8b54", 6);
      centered(name, "小博主", 0, 0, 58, 10, "#fff4cf", true, 21);
      text(dialogue, this.game.unlocked ? "下一条，一定会更精彩！" : "我的顶流之路，现在开始！", 96, 33, 252, 13, palette.ink, true, 26);
      text(dialogue, "点击桌上的手机，拍一条表演视频。", 96, 62, 247, 10, palette.muted, false, 22);
      centered(dialogue, "▼", 331, 75, 20, 9, "#9b8d59", false, 14);
      if (this.game.unlocked) [["growth", "成长", "growth", s.points + " 点"], ["works", "作品", "film", s.works.length + " 条"], ["equipment", "创作间", "bulb", "升级与装备"]].forEach(([id, label, art, detail], i) => {
        const b = button(this.root, id, "", 18 + i * 122, this.h - 98, 110, 75, () => this.go(id), true, false);
        b.graphics.clear();
        surface(b, 110, 75, "#f8eabd", "#e7cd97", "#99865b", 13);
        icon(b, art, 43, 6, 24, "#78925d");
        centered(b, label, 0, 33, 110, 12, palette.ink, true, 20);
        centered(b, detail, 0, 54, 110, 9, palette.muted, false, 16);
      });
      else {
        for (const [i, label] of ["成长", "作品", "装备"].entries()) {
          icon(this.root, "lock", 55 + i * 117, this.h - 62, 13, "#ecdfb5");
          text(this.root, label, 74 + i * 117, this.h - 64, 56, 12, "#f1e5c0", true, 22);
        }
        centered(this.root, "完成首条作品后解锁", 30, this.h - 37, 330, 9, "#f3e4bc", false, 20);
      }
    }
    title(kicker, title, copy) {
      centered(this.root, title, 29, 151, 332, 19, palette.green, true, 32);
      centered(this.root, copy, 30, 185, 330, 10, palette.muted, false, 28);
    }
    phone() {
      const title = centered(this.root, "想拍什么类型的视频？", 28, 152, 334, 26, palette.green, false, 40);
      title.font = "creator-brush-v07";
      const sh = Math.min(285, this.h - 425), card = box(this.root, 28, 201, 334, sh, palette.light, 17, "topic-preview");
      card.graphics.drawEllipse(167, sh - 38, 80, 8, "#9aab7538", null, 0);
      this.performer = this.character(card, 0, "cat", (334 - (sh - 28) * 256 / 352) / 2, 7, sh - 28);
      const sticker = box(card, 13, 16, 64, 27, "#fff3c5", 5);
      sticker.rotation = -5;
      centered(sticker, this.game.first ? "新手挑战" : "今日灵感", 0, 0, 64, 10, palette.ink, true, 27);
      centered(card, "♫", 270, 25, 45, 32, "#b68c47", false, 45);
      const y = 201 + sh;
      if (this.game.first) {
        icon(this.root, "gift", 104, y + 19, 19, "#bc8739");
        text(this.root, "首次完成 ¥ 120 ＋ 成长点", 129, y + 19, 226, 11, "#9b783b", true, 25);
        const b = button(this.root, "start:cat", "开始拍摄   →", 28, y + 61, 334, 53, () => this.startVideo("cat"));
        icon(b, "equipment", 92, 17, 19, "#805a28");
      } else TOPICS.forEach((t, i) => {
        const b = button(this.root, "start:" + t.id, "", 28 + i * 114, y + 27, 106, 99, () => this.startVideo(t.id), true, i === 2);
        icon(b, t.id === "dance" ? "flame" : t.id === "pose" ? "spark" : "film", 41, 12, 24, "#7b6837");
        centered(b, t.tag, 2, 43, 102, 12, i === 2 ? "#775023" : "#fff5d0", true, 24);
        centered(b, t.heat ? "热度 +" + t.heat : "随心记录", 1, 73, 104, 9, i === 2 ? "#8e6d34" : "#e7edcd", false, 18);
      });
    }
    startVideo(topic) {
      if (this.game.start(topic)) {
        this.platform.sound();
        this.go("shoot");
      }
    }
    stageArt(y, height, tap) {
      const view = box(this.root, 28, y, 334, height, this.screen === "shoot" ? "#e4d9e8" : palette.light, 17, "performance-stage");
      const floor = box(view, 3, height * 0.72, 328, height * 0.28 - 3, this.screen === "shoot" ? "#c8b8ce" : "#c2d099", 0);
      floor.mouseEnabled = false;
      const ph = Math.min(height - 22, 285), pw = ph * 256 / 352;
      this.performer = this.character(view, this.game.s.active?.shootTaps || 0, this.game.s.active?.topicId || "cat", (334 - pw) / 2, height - ph - 7, ph);
      if (tap) {
        view.mouseEnabled = true;
        view.on(Laya.Event.MOUSE_DOWN, view, (e) => {
          e.stopPropagation();
          tap();
        });
      }
    }
    character(parent, frame, topic, x, y, height) {
      const node = new Laya.Sprite();
      node.pos(x, y);
      node.size(height * 256 / 352, height);
      node.mouseEnabled = false;
      parent.addChild(node);
      this.drawFrame(node, frame, topic);
      return node;
    }
    drawFrame(node, frame, topic) {
      const spec = CATALOG.atlases[topic];
      if (!spec) return;
      const texture = Laya.loader.getRes("resources/" + spec.file);
      if (!texture) return;
      const i = (Math.floor(frame) % spec.count + spec.count) % spec.count;
      node.name = "performer:frame:" + i;
      node.graphics.clear();
      node.scrollRect = new Laya.Rectangle(0, 0, node.width, node.height);
      node.graphics.drawImage(texture, -(i % 4) * node.width, -Math.floor(i / 4) * node.height, node.width * 4, node.height * spec.count / 4);
    }
    paint(frame, topic, width, height) {
      if (!this.performer || this.performer.destroyed) return;
      const count = CATALOG.atlases[topic]?.count || 24, i = Math.floor(frame) % count;
      if (i === this.lastFrame) return;
      this.lastFrame = i;
      if (width && height) this.performer.size(width, height);
      this.drawFrame(this.performer, frame, topic);
    }
    shoot() {
      this.title("7 秒翻页表演", this.game.s.active.topicId === "pose" ? "连点屏幕，演出你的表情包！" : "连点屏幕，让小博主跳起来！", "每点一下换一帧，点得越快，动作越流畅。");
      const sh = Math.min(340, this.h - 430);
      this.stageArt(220, sh, () => this.dance());
      this.labels.time = text(this.root, "", 44, 233, 290, 14, "#8b4c6b", true);
      const card = box(this.root, 28, 233 + sh, 334, 81, palette.cream, 14);
      this.labels.score = text(card, "", 13, 10, 310, 14, palette.green, true, 25);
      this.labels.taps = text(card, "", 13, 45, 310, 10, palette.muted, false, 22);
      this.labels.rating = text(card, "", 205, 13, 116, 10, "#a98a43", true, 22);
      button(this.root, "dance", this.game.s.active.shootAt ? "继续点击 · 推进动作" : "开始 7 秒拍摄", 28, this.h - 99, 334, 53, () => this.dance());
      this.updateShoot();
    }
    dance() {
      if (this.screen !== "shoot" || this.modal || this.busy || this.suspended) return;
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
      if (this.labels.rating) this.labels.rating.text = this.game.shootScore() >= 85 ? "丝滑连舞" : this.game.shootScore() >= 55 ? "动作连贯" : "逐帧表演";
    }
    editView() {
      this.title("剪辑挑战", "剪出一个高光瞬间", "点亮三段胶片，剪出你的高光。");
      const sh = Math.min(240, (this.h - 440) * 0.65), y = 220 + sh;
      this.stageArt(220, sh, () => this.edit("tap"));
      const overlay = box(this.root, 31, y - 29, 328, 26, palette.green, 0);
      icon(overlay, "cut", 102, 5, 16, "#fff3ca");
      centered(overlay, "点击加速剪辑", 115, 0, 140, 11, "#fff3ca", true, 26);
      text(this.root, "剪辑剩余", 29, y + 13, 128, 11, palette.muted, false, 32);
      this.labels.edit = text(this.root, "", 212, y + 9, 148, 24, palette.green, true, 38);
      this.labels.edit.align = "right";
      this.editProgress = progress2(this.root, 28, y + 51, 334, 0);
      const film = box(this.root, 28, y + 78, 334, 117, "#526841", 8, "highlight-film");
      for (let n = 0; n < 25; n++) {
        box(film, 7 + n * 13, 4, 7, 5, "#fff0c6", 0);
        box(film, 7 + n * 13, 108, 7, 5, "#fff0c6", 0);
      }
      [["open", "开头", "pen"], ["highlight", "高光", "spark"], ["end", "结尾", "film"]].forEach(([id, label, art], i) => {
        const included = this.game.s.active.cuts.includes(id), b = button(film, "cut:" + id, "", 5 + i * 109, 13, 106, 91, () => this.edit(id), !included, false);
        this.character(b, this.game.s.active.shootTaps || 0, this.game.s.active.topicId, 28, 2, 62);
        icon(b, included ? "check" : art, 82, 7, 15, "#f9efbe");
        centered(b, label, 0, 59, 106, 11, "#fff1cd", true, 19);
        centered(b, included ? "已加入" : "−1.8秒 · +品质", 0, 77, 106, 8, "#eff0cb", false, 14);
      });
      centered(this.root, "✓ 拍摄 " + this.game.s.active.shot + " 分 · " + this.game.s.active.cuts.length + " / 3 个高光已加入", 28, y + 199, 334, 9, palette.muted, false, 16);
      button(this.root, "edit", "点击加速剪辑", 28, this.h - 87, 334, 46, () => this.edit("tap"));
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
      if (this.labels.edit) this.labels.edit.text = (this.game.s.active.remaining / 1e3).toFixed(1) + " 秒";
      const bar = this.editProgress;
      if (bar) {
        bar.graphics.clear();
        bar.graphics.drawRoundRect(0, 0, 334, 9, 4, 4, 4, 4, palette.line);
        bar.graphics.drawRoundRect(0, 0, 334 * (1 - this.game.s.active.remaining / this.game.s.active.editTotal), 9, 4, 4, 4, 4, "#85a35d");
      }
    }
    ready() {
      this.title("准备发布", "准备冲击热门！", "剪辑完成，让更多人发现你的作品。");
      const sh = Math.min(300, this.h - 430);
      this.stageArt(230, sh);
      const medal = box(this.root, 311, 242, 37, 37, "#9ebc6e", 18);
      icon(medal, "check", 8, 8, 22, "#fff4ca");
      const score = box(this.root, 28, 248 + sh, 334, 61, palette.cream, 14);
      icon(score, "equipment", 18, 20, 22, "#a28142");
      text(score, "拍摄 " + this.game.s.active.shot + " 分", 51, 19, 130, 13, palette.green, true);
      icon(score, "film", 185, 20, 22, "#a28142");
      text(score, this.game.s.active.cuts.length + " / 3 高光", 217, 19, 110, 13, palette.green, true);
      const b = button(this.root, "publish", "发布视频   →", 28, this.h - 99, 334, 53, () => {
        if (Date.now() - this.phaseEnteredAt < 450) return;
        if (this.game.publish()) {
          this.platform.sound("capture");
          this.go("live");
        }
      });
      icon(b, "share", 90, 17, 20, "#815d29");
    }
    live() {
      const v = this.game.s.active, k = Math.min(1, (this.h - 280) / 564);
      const feed = box(this.root, 28, 150, 334, this.h - 280, "#fff0cc", 0, "feed");
      feed.mouseEnabled = true;
      feed.on(Laya.Event.MOUSE_DOWN, this, (e) => {
        this.drag = { x: Laya.stage.mouseX, y: Laya.stage.mouseY, id: e.touchId };
      });
      text(feed, "推荐挑战", 0, 0, 200, 10, palette.muted, true, 21);
      text(feed, "第 " + v.round + " 轮反馈", 245, 0, 89, 10, palette.muted, false, 21);
      const preview = box(feed, 0, 27 * k, 334, 112 * k, palette.light, 13, "feed-preview");
      this.performer = this.character(preview, v.shootTaps || 0, v.topicId, 8, 3, 106 * k);
      text(preview, v.title, 101, 28 * k, 225, 13, palette.green, true, 43);
      text(preview, "内容质量 " + v.quality, 101, 79 * k, 200, 10, palette.muted, false, 24);
      const status = box(feed, 0, 154 * k, 334, 73 * k, v.event === "爆火" ? "#efcf8d" : "#e7deb4", 14, "algorithm-status");
      icon(status, v.event === "爆火" ? "flame" : "chart", 17, 15 * k, 34 * k, "#9aa35c");
      text(status, v.event === "爆火" ? "爆款诞生！" : v.event, 62, 10 * k, 260, 22, palette.green, true, 32);
      text(status, v.event === "推流" ? "更多观众正在发现你的作品" : "作品正在接受观众的这一轮反馈", 62, 45 * k, 262, 9, palette.muted, false, 22);
      centered(feed, "当前播放量", 0, 248 * k, 334, 10, palette.muted, true, 24);
      centered(feed, num(v.views), 0, 275 * k, 334, 48, palette.green, true, 65);
      centered(feed, "本轮 +" + num(v.history[v.history.length - 1].delta) + " 播放", 0, 343 * k, 334, 10, "#ac8a40", false, 24);
      const metrics = box(feed, 0, 383 * k, 334, 65 * k, "#ede5bf", 13);
      for (const [i, art, value, label] of [[0, "heart", num(v.likes), "点赞"], [1, "chat", num(v.comments), "评论"], [2, "growth", "+" + num(v.fans), "新增粉丝"]]) {
        icon(metrics, art, 26 + i * 109, 12 * k, 18, "#b88b42");
        text(metrics, value, 52 + i * 109, 12 * k, 60, 12, palette.green, true, 22);
        centered(metrics, label, i * 109, 38 * k, 109, 9, palette.muted, false, 20);
      }
      const chartY = 476 * k, chartH = 48 * k;
      feed.graphics.drawLine(0, chartY + chartH, 334, chartY + chartH, "#98ab6d", 1);
      v.history.forEach((row, i) => box(feed, 6 + i * 35, chartY + chartH * (1 - row.target / v.views), 29, Math.max(3, chartH * row.target / v.views), "#90ad61", 4));
      centered(this.root, "↓ 向下滑动，刷新一次数据", 28, this.h - 146, 334, 11, "#80935e", true, 24);
      const b = button(this.root, "refresh", "刷新一次数据", 28, this.h - 106, 334, 48, () => this.refresh(), true, false);
      icon(b, "chart", 94, 13, 20, "#fff3c9");
      centered(this.root, v.round ? "成长与创作，影响下一轮推荐的机会" : "首条作品：体验推荐过程，从小小播放开始", 28, this.h - 45, 334, 9, palette.muted, false, 18);
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
      const medal = box(this.root, 169, 158, 52, 52, "#a2bb72", 26);
      icon(medal, "trophy", 12, 12, 28, "#fff3c7");
      centered(this.root, "第 " + v.id + " 条作品 · " + v.event, 28, 222, 334, 10, palette.muted, false, 23);
      const title = centered(this.root, v.id === 1 ? "首条创作成功！" : "本次创作完成！", 28, 247, 334, 27, palette.green, false, 46);
      title.font = "creator-brush-v07";
      const card = box(this.root, 28, 306, 334, Math.max(235, this.h - 456), palette.cream, 19);
      centered(card, num(v.views), 0, 13, 334, 42, palette.green, true, 59);
      centered(card, "最终播放", 0, 76, 334, 10, palette.muted, false, 24);
      const rewards = [["heart", "新增粉丝", "+" + num(r.fans)], ["coin", "作品收入", "¥ " + r.income], ["gift", "首创奖励", "¥ " + r.grant], ["growth", "成长点", "+" + r.points]];
      rewards.forEach(([art, label, value], i) => {
        const y = 112 + i * 31;
        icon(card, art, 24, y, 19, "#ad8b43");
        text(card, label, 53, y, 145, 12, palette.muted, false, 25);
        text(card, value, 217, y - 2, 100, 16, palette.green, true, 29);
      });
      centered(this.root, "拍摄 +1 · 剪辑 +1 · 坚持 +1", 28, this.h - 129, 334, 10, "#958745", true, 24);
      const b = button(this.root, "claim", "领取，回到出租屋   →", 28, this.h - 93, 334, 52, () => {
        if (Date.now() - this.phaseEnteredAt < 450) return;
        const reward = this.game.claim();
        if (!reward) return;
        this.platform.sound("viral");
        this.go("room");
        this.hint("新增 " + reward.fans + " 位粉丝，成长 +" + reward.points + " 点");
      });
      icon(b, "gift", 53, 16, 20, "#8d642d");
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
      const panel = this.scroll(), banner = box(panel, 10, 4, 338, 46, "#e4dfb4", 12);
      icon(banner, "growth", 14, 12, 23, palette.green);
      text(banner, "可分配成长点", 47, 12, 222, 13, palette.green, true);
      text(banner, String(this.game.s.points), 276, 7, 55, 24, palette.green, true);
      const arts = ["target", "clover", "equipment", "cut", "flame", "leaf"];
      Object.entries(STAT_LABELS).forEach(([key, label], i) => {
        const card = box(panel, 10 + i % 2 * 174, 68 + Math.floor(i / 2) * 189, 164, 171, palette.cream, 15);
        icon(card, arts[i], 63, 13, 34, "#879b60");
        centered(card, label + "  " + this.game.s.stats[key], 5, 56, 154, 15, palette.green, true, 26);
        centered(card, DESC[key], 8, 89, 148, 10, palette.muted, false, 29);
        button(card, "upgrade:" + key, "＋ 升级", 18, 126, 128, 33, () => {
          if (this.game.upgrade(key)) {
            this.remember();
            this.platform.sound();
            this.render();
          }
        }, this.game.s.points > 0 && this.game.s.stats[key] < 50, false);
      });
    }
    works() {
      const panel = this.scroll();
      let y = 3;
      for (const v of [...this.game.s.works].reverse()) {
        const h = 119 + v.history.length * 26, card = box(panel, 10, y, 338, h, palette.cream, 16);
        const badge = box(card, 12, 15, 39, 39, "#e7e5bc", 10);
        icon(badge, "film", 8, 8, 23, "#84965b");
        text(card, v.title, 63, 13, 259, 14, palette.green, true, 30);
        text(card, num(v.views) + " 播放 · +" + num(v.fans) + " 粉丝", 63, 46, 259, 11, palette.green, false, 26);
        text(card, "拍摄 " + v.shot + " 分 · 内容质量 " + v.quality, 16, 83, 306, 10, palette.muted);
        v.history.forEach((row, i) => {
          icon(card, row.event === "爆火" ? "flame" : "chart", 19, 114 + i * 26, 14, "#9aa467");
          text(card, row.event, 42, 110 + i * 26, 105, 11, palette.muted);
          text(card, "+" + num(row.delta) + " 播放", 177, 110 + i * 26, 145, 11, palette.green);
        });
        y += h + 14;
      }
    }
    equipment() {
      const panel = this.scroll(), s = this.game.s, next = ROOMS[s.studio.tier + 1];
      const wallet = box(panel, 10, 2, 338, 43, "#ece3c4", 12);
      icon(wallet, "coin", 13, 10, 21);
      text(wallet, "可用钱币  " + num(s.wallet), 44, 11, 200, 12, palette.green, true);
      text(wallet, num(s.fans) + " 粉丝", 249, 12, 86, 10, palette.muted);
      const card = box(panel, 10, 62, 338, next ? 407 : 281, palette.cream, 18);
      image(card, "resources/" + this.game.room.art, 3, 3, 332, 173, true);
      const tag = box(card, 13, 136, 205, 26, "#4b6541", 8);
      text(tag, "当前 · " + this.game.room.name, 9, 4, 190, 12, "#fff1cf", true, 23);
      text(card, next ? "下一步：" + next.name : "专业工作室已建成", 15, 190, 310, 18, palette.green, true, 32);
      text(card, next ? "内容质量 +" + next.quality + " · 剪辑耗时缩短" + Math.round((1 - next.editFactor) * 100) + "%" : "内容质量 +4 · 剪辑耗时缩短10%", 15, 229, 310, 11, palette.muted, false, 26);
      if (next) {
        const preview = box(card, 15, 269, 308, 64, "#eee9cd", 11);
        image(preview, "resources/" + next.art, 6, 5, 76, 54, true);
        text(preview, num(next.fans) + " 粉丝 · " + next.price + " 钱币", 94, 7, 207, 11, palette.muted, false, 25);
        text(preview, "改善墙面、床铺与创作环境", 94, 32, 207, 10, palette.muted, false, 23);
        button(card, "buy-room", s.fans < next.fans ? num(next.fans) + "粉丝解锁" : s.wallet < next.price ? "还差 " + num(next.price - s.wallet) + " 钱币" : "升级房间 · " + next.price + " 钱币", 15, 349, 308, 43, () => {
          if (this.game.upgradeRoom()) {
            this.platform.sound("viral");
            this.go("room");
          }
        }, s.fans >= next.fans && s.wallet >= next.price);
      }
      let y = card.y + card.height + 22;
      text(panel, "我的创作装备", 12, y, 224, 16, palette.green, true);
      text(panel, "购买一次，持续生效", 225, y + 3, 119, 9, palette.muted);
      y += 43;
      EQUIPMENT.forEach((e, i) => {
        const owned = s.studio.gear[e.id], item = box(panel, 10 + i % 2 * 174, y + Math.floor(i / 2) * 231, 164, 214, owned ? palette.light : palette.cream, 15);
        artwork(item, "gear_" + e.id, 49, 7, 66, 88);
        centered(item, e.name, 6, 101, 152, 13, palette.green, true, 24);
        centered(item, e.benefit, 6, 133, 152, 10, palette.muted, false, 31);
        const reason = owned ? "✓ 已装备" : s.fans < e.fans ? num(e.fans) + "粉丝解锁" : s.wallet < e.price ? "还差 " + num(e.price - s.wallet) + " 钱币" : "购买 · " + e.price + " 钱币";
        button(item, "buy:" + e.id, reason, 9, 172, 146, 31, () => {
          if (this.game.buyEquipment(e.id)) {
            this.remember();
            this.platform.sound();
            this.render();
            this.hint("新装备已摆进房间，下一条作品开始生效");
          }
        }, !owned && s.fans >= e.fans && s.wallet >= e.price, false);
      });
      y += Math.ceil(EQUIPMENT.length / 2) * 231;
      button(panel, "equipment-tasks", "查看升级任务与补助 →", 10, y + 1, 338, 46, () => this.go("tasks"), true, false);
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
        icon(card, "gift", 15, 171, 16, "#aa8a44");
        text(card, t.workReward ? "120 钱币 · 首条作品结算领取" : (t.coins ? t.coins + " 钱币 " : "") + (t.points ? t.points + " 成长点" : "") + (t.badge ? " · 纪念徽章" : ""), 39, 168, 199, 11, palette.green, false, 38);
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
      if (this.suspended || this.destroyed || this.busy) return;
      const v = this.game.s.active;
      if (v && ["shoot", "edit"].includes(v.phase)) {
        this.game.tick();
        if (this.phase() !== this.screen) {
          this.platform.sound("capture");
          this.go(this.phase());
        } else if (this.screen === "shoot") this.updateShoot();
        else this.updateEdit();
      }
      if (v && ["edit", "ready", "live"].includes(this.screen)) this.paint(Math.floor(Date.now() / 1e3 * (v.shootTaps || 0) / 7), v.topicId);
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
      this.requestId++;
      this.game.save();
      this.platform.destroy();
      Laya.timer.clearAll(this);
      Laya.stage.offAllCaller(this);
      this.root.destroy(true);
      this.background.destroy(true);
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
      Platform.configureStage();
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
