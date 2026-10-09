// @ts-nocheck
// V0.1 game rules — valid TypeScript and JavaScript, buildable without runtime dependencies.
export const NICHES=['搞笑','游戏','美食','知识'];
export const STATS={sense:'网感',creativity:'创作力',speed:'制作速度',luck:'幸运',operation:'运营力',business:'商业能力'};
const data=[
['搞笑','AI帮我过了一天',96,3,1],['搞笑','社恐挑战陌生人聊天',74,2,3],['搞笑','一天只说反话',61,1,3],['搞笑','室友的离谱生活习惯',56,1,0],['搞笑','周末无厘头短剧',62,2,0],['搞笑','反转结局挑战',78,2,4],['搞笑','假装过上顶流生活',68,2,4],['搞笑','用一个表情演完整剧情',52,1,0],
['游戏','新游戏极限挑战',89,3,2],['游戏','零装备通关尝试',72,2,0],['游戏','队友迷惑行为大赏',75,2,3],['游戏','萌新打败老玩家',77,2,4],['游戏','冷门游戏挖宝',49,1,0],['游戏','一命通关系列',58,2,0],['游戏','版本更新神操作',92,3,1],['游戏','粉丝投票挑战',60,1,3],
['美食','10元吃一天',82,2,3],['美食','夜市最强小吃',70,2,0],['美食','便利店隐藏吃法',64,1,0],['美食','超辣料理挑战',80,3,2],['美食','深夜食堂故事',53,1,0],['美食','一人食治愈料理',57,1,0],['美食','网红店真假测评',76,2,3],
['知识','三分钟讲清热门科技',83,3,2],['知识','每天学一个冷知识',50,1,0],['知识','辟谣生活小误区',64,2,0],['知识','为什么手机电池衰减',58,1,0],['知识','AI工具效率实测',87,3,2],['知识','简单理财常识',52,2,0],['知识','小学生也能懂的科学',48,1,0]];
export const TOPICS=data.map((d,i)=>({id:'T'+String(i+1).padStart(3,'0'),niche:d[0],title:d[1],heat:d[2],competition:d[3],duration:d[4]}));
export const MODES=[
{id:'casual',name:'随手拍',seconds:30,cost:0,opening:-1,completion:-2,engagement:1,sharing:0,follow:.9,desc:'免费 · 快速试水'},
{id:'twist',name:'反转整活',seconds:45,cost:0,opening:7,completion:-1,engagement:2,sharing:7,follow:1,desc:'高传播 · 随机波动'},
{id:'premium',name:'精致制作',seconds:90,cost:30,opening:3,completion:9,engagement:3,sharing:3,follow:1.08,desc:'高完播 · 花费30'},
{id:'tutorial',name:'干货教学',seconds:60,cost:10,opening:-1,completion:7,engagement:3,sharing:4,follow:1.2,desc:'易转粉 · 花费10'},
{id:'emotion',name:'情绪共鸣',seconds:40,cost:0,opening:2,completion:1,engagement:8,sharing:6,follow:1.1,desc:'高互动 · 易疲劳'}];
export const POOLS=[
{name:'初始测试',min:200,max:800,threshold:43,exp:0},
{name:'小流量推荐',min:2000,max:20000,threshold:47,exp:10},
{name:'热门推荐',min:100000,max:1000000,threshold:56,exp:25},
{name:'全站热门',min:1000000,max:10000000,threshold:66,exp:50},
{name:'现象级爆款',min:10000000,max:100000000,threshold:77,exp:100}];
export const EVENTS=[
{title:'神秘大V点赞',desc:'一位大博主点赞了你的作品。',choices:[['礼貌互动',0,2,70,0,0],['趁热联动',0,-2,140,0,0]]},
{title:'热搜突袭',desc:'一个新热点突然冲上榜单。',choices:[['立即跟拍',0,-1,0,0,4],['先做调研',0,0,0,20,2]]},
{title:'有人二创你的视频',desc:'评论区讨论要不要回应。',choices:[['转发感谢',0,2,100,0,0],['保持沉默',0,0,0,20,0]]},
{title:'粉丝催更',desc:'粉丝问下一条什么时候发？',choices:[['认真回复',0,3,40,0,0],['预告大制作',0,0,0,0,3]]},
{title:'评论区争论',desc:'一条误读评论引发争论。',choices:[['耐心解释',0,5,0,15,0],['忽略争论',0,-2,0,0,0]]},
{title:'小品牌发来合作',desc:'对方愿意支付合作预算。',choices:[['接下合作',100,-2,0,0,0],['暂时婉拒',0,3,0,20,0]]},
{title:'标题造成误会',desc:'你的标题可能引导了错误理解。',choices:[['公开澄清',-15,6,0,0,0],['修改标题',0,3,0,10,0]]},
{title:'家人不理解',desc:'家人认为你应该找一份稳定工作。',choices:[['展示作品成果',0,1,0,35,0],['埋头继续拍',0,0,0,0,2]]},
{title:'朋友想合作',desc:'老朋友提出拍一条合辑。',choices:[['一起出镜',0,0,110,0,2],['下次再说',0,0,0,20,0]]},
{title:'热搜猎手抢先发布',desc:'对手抢先发了同一选题。',choices:[['换个新角度',0,0,0,10,4],['硬碰硬',0,-1,0,0,-2]]}];
