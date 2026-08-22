import fs from 'node:fs/promises';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const OUT = '/Users/daweijunwang/chess project/Chesstong_MIT_Maker_Portfolio_2min.pptx';
const RENDER = '/Users/daweijunwang/chess project/.tmp_mit_portfolio/render';
const p = Presentation.create({slideSize:{width:1280,height:720}});
const C={navy:'#10253F',ink:'#172033',muted:'#596579',blue:'#2F80ED',cyan:'#27B8C7',gold:'#F2B84B',cream:'#F7F4EC',white:'#FFFFFF',line:'#D9E1EA',green:'#32A071',red:'#E85B5B'};

function box(s,x,y,w,h,fill=C.white,r=18,line='none'){return s.shapes.add({geometry:r?'roundRect':'rect',position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:line,width:line==='none'?0:1},borderRadius:'rounded-xl'});}
function txt(s,text,x,y,w,h,size=24,color=C.ink,bold=false,align='left'){const o=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{style:'solid',fill:'none',width:0}});o.text=text;o.text.style={fontSize:size,color,bold,alignment:align,typeface:'Aptos'};return o;}
function title(s,kicker,headline,sub=''){txt(s,kicker.toUpperCase(),64,42,520,24,14,C.blue,true);txt(s,headline,64,78,1150,66,38,C.ink,true);if(sub)txt(s,sub,64,150,1120,40,20,C.muted,false);}
function footer(s,n){txt(s,String(n).padStart(2,'0'),1190,674,36,20,14,C.muted,true,'right');}
function addNotes(s,script){s.speakerNotes.textFrame.setText(script+'\n\n[Sources]\n- 项目仓库 README.md、LLM_ENGINEERING_NOTES.md、源代码与本地页面。');s.speakerNotes.setVisible(true);}
function browserFrame(s,x,y,w,h,label){box(s,x,y,w,h,C.white,18,C.line);box(s,x,y,w,38,C.navy,18);txt(s,'●  ●  ●',x+16,y+8,90,20,14,'#DDE6EF');txt(s,label,x+120,y+8,w-140,20,13,C.white,false);}
function chessboard(s,x,y,size){const q=size/8;const black=['♜','♞','♝','♛','♚','♝','♞','♜'];const white=['♖','♘','♗','♕','♔','♗','♘','♖'];for(let r=0;r<8;r++)for(let c=0;c<8;c++){box(s,x+c*q,y+r*q,q,q,(r+c)%2? '#7294A8':'#E6E1D0',0);const p=r===0?black[c]:r===1?'♟':r===6?'♙':r===7?white[c]:'';if(p)txt(s,p,x+c*q,y+r*q+q*0.09,q,q*0.8,Math.max(18,q*0.58),r<2?C.navy:C.white,true,'center');}}

// 1
{
 const s=p.slides.add();s.background.fill=C.cream;
 txt(s,'CHESSTONG / 棋童',64,46,420,28,16,C.blue,true);txt(s,'我做了一个让初学者听懂每一步棋的平台',64,150,820,120,50,C.navy,true);txt(s,'高中生独立制作 · AI 国际象棋学习平台 · Maker Portfolio 参考底稿',68,286,900,36,22,C.muted);
 box(s,900,94,270,430,C.navy,28);txt(s,'♞',930,115,210,180,130,C.gold,true,'center');txt(s,'2:00',930,314,210,70,48,C.white,true,'center');txt(s,'不出镜 · 全程录屏',930,404,210,35,20,'#DCE7F3',true,'center');txt(s,'动机  →  实机演示  →  技术  →  影响',68,546,790,36,25,C.ink,true);txt(s,'目标：120 秒内证明“我为什么做、我做了什么、它真的能运行”。',68,595,860,32,20,C.muted);footer(s,1);
 addNotes(s,'00:00–00:12｜棋童是我为四到十岁国际象棋初学者制作的智能学习平台。我六岁开始学棋，发现真正让初学者放弃的，往往不是兴趣，而是听不懂专业术语，也看不到持续进步。');
}
//2
{
 const s=p.slides.add();s.background.fill=C.white;title(s,'Why','问题不是不会下，而是听不懂、难坚持');
 txt(s,'学生',70,238,180,32,25,C.blue,true);txt(s,'“为什么这步错了？”',70,286,300,42,26,C.ink,true);txt(s,'传统题库只告诉对错，缺少学生能理解的解释。',70,345,330,80,20,C.muted);
 txt(s,'家长',470,238,180,32,25,C.cyan,true);txt(s,'“我不会棋，怎么陪？”',470,286,330,42,26,C.ink,true);txt(s,'通过进度、周报和建议，家长不懂棋也能参与。',470,345,320,80,20,C.muted);
 txt(s,'老师',870,238,180,32,25,C.gold,true);txt(s,'“课后练习如何追踪？”',870,286,330,42,26,C.ink,true);txt(s,'作业、班级与学习数据形成可追踪的闭环。',870,345,310,80,20,C.muted);
 box(s,64,506,1152,90,C.navy,18);txt(s,'我的设计原则：反馈清楚、数据可追踪、关键依赖失效时系统仍然可用。',98,532,1080,38,25,C.white,true,'center');footer(s,2);
 addNotes(s,'00:12–00:27｜我把问题拆成三个角色：学生需要即时反馈；家长需要可读的学习数据；老师需要课后任务和班级追踪。我的设计原则，是让反馈清楚、让数据可追踪，并让系统在关键依赖不可用时仍然可用。');
}
//3
{
 const s=p.slides.add();s.background.fill=C.cream;title(s,'Product','一个平台连接学习、对战与监督','录屏建议：先展示首页，再快速切到学习训练页。');
 browserFrame(s,64,214,760,390,'chesstong.com / 首页');txt(s,'♜ 棋童',92,268,230,42,32,C.navy,true);txt(s,'用棋童掌握国际象棋',92,326,520,54,36,C.ink,true);txt(s,'从开局原则到残局技巧，从 AI 对弈到真人 PK',92,388,600,32,19,C.muted);box(s,92,448,170,52,C.blue,14);txt(s,'开始训练',112,461,130,28,19,C.white,true,'center');
 const items=[['学习中心','开局·中局·残局'],['题库训练','300+分级题+错题复盘'],['AI讲解','四段式儿童化反馈'],['AI对弈','Stockfish 1–20级'],['实时对战','WebSocket+断线重连'],['任务竞技','任务·积分·排行榜'],['家长老师','周报·作业·班级追踪'],['双端与部署','Web+Flutter+Docker']];items.forEach((it,i)=>{const yy=218+i*49;txt(s,String(i+1).padStart(2,'0'),862,yy,45,24,15,C.blue,true);txt(s,it[0],915,yy,125,24,18,C.ink,true);txt(s,it[1],1044,yy+1,175,24,14,C.muted);});footer(s,3);
 addNotes(s,'00:27–00:42｜这是平台首页。用户可以进入学习中心、三百多道分级战术题、AI 对弈、真人对战、任务和排行榜；家长与老师还可以查看周报、布置作业并追踪进度。接下来我重点演示最核心的学习闭环。');
}
//4
{
 const s=p.slides.add();s.background.fill=C.white;title(s,'Live demo','实机演示：做题 → 判定 → 儿童化讲解','录屏建议：实际拖动一步棋，点击“提交”，再打开“AI讲解”。');
 browserFrame(s,64,206,800,430,'学习训练 / 战术题');chessboard(s,92,264,310);txt(s,'白方走 · 找到最佳着法',438,270,350,34,25,C.ink,true);txt(s,'提示：先观察对方国王周围的防守子力。',438,320,340,62,19,C.muted);box(s,438,408,145,50,C.blue,12);txt(s,'提交答案',451,420,120,26,18,C.white,true,'center');box(s,602,408,145,50,C.gold,12);txt(s,'AI 讲解',615,420,120,26,18,C.navy,true,'center');
 box(s,900,222,300,366,C.cream,18);txt(s,'AI 不只说“错了”',928,253,246,34,25,C.navy,true);txt(s,'① 思路\n先找将军与强制着法\n\n② 关键点\n这个棋子像被钉在原地\n\n③ 常见误区\n不要只看眼前吃子\n\n④ 下一步\n再做一道同主题题目',928,310,240,240,19,C.ink);footer(s,4);
 addNotes(s,'00:42–01:07｜我选择一道战术题，直接在棋盘上走子并提交。系统先判断答案，再让 AI 用四段结构解释：思路、关键点、常见误区和下一步。比如“牵制”不会只给定义，而会解释成：这个棋子后面保护着更重要的棋子，就像被钉在原地一样。');
}
//5
{
 const s=p.slides.add();s.background.fill=C.cream;title(s,'Live demo','实机演示：Stockfish 给出走法，LLM 解释原因','录屏建议：进入 AI 对弈，调难度，点击“走法建议”，展示返回结果。');
 browserFrame(s,64,210,770,416,'AI 对弈 / 走法建议');chessboard(s,92,265,300);txt(s,'难度  8 / 20',430,272,300,32,23,C.ink,true);box(s,430,326,310,14,'#D8E1EA',7);box(s,430,326,124,14,C.blue,7);box(s,430,375,200,52,C.blue,12);txt(s,'获取走法建议',449,388,162,26,18,C.white,true,'center');txt(s,'建议：Nf3',430,468,260,38,28,C.green,true);txt(s,'理由：发展轻子、控制中心，并为王车易位做准备。',430,516,330,70,19,C.muted);
 txt(s,'引擎负责“算准”',900,260,260,36,28,C.navy,true);txt(s,'Stockfish 搜索局面，输出最佳候选走法。',900,314,280,60,19,C.muted);txt(s,'模型负责“讲懂”',900,414,260,36,28,C.navy,true);txt(s,'LLM 把评估结果转化为儿童能执行的建议。',900,468,280,70,19,C.muted);footer(s,5);
 addNotes(s,'01:07–01:27｜在人机对战中，我可以调节 Stockfish 难度。点击走法建议后，引擎负责计算更准确的候选走法，大语言模型负责解释为什么。这样的工具协作，把“算得准”和“讲得懂”结合在一起。');
}
//6
{
 const s=p.slides.add();s.background.fill=C.white;title(s,'Engineering','系统可以运行，也能在 AI 不可用时继续服务');
 const xs=[70,320,570,820,1070], labels=[['Web / Flutter','交互界面'],['Fastify','REST + WS'],['Stockfish','棋力计算'],['Qwen / Ollama','儿童化解释'],['SQLite WAL','学习记忆']];
 for(let i=0;i<5;i++){if(i<4){box(s,xs[i]+154,335,88,8,C.line,4);txt(s,'→',xs[i]+182,313,35,30,24,C.blue,true,'center');}box(s,xs[i],274,170,150,i===0?C.navy:C.cream,18,C.line);txt(s,labels[i][0],xs[i]+12,306,146,34,22,i===0?C.white:C.ink,true,'center');txt(s,labels[i][1],xs[i]+12,354,146,27,16,i===0?'#DCE7F3':C.muted,false,'center');}
 txt(s,'4 级回退',70,486,230,40,32,C.red,true);txt(s,'Ollama → Qwen API → Stockfish → 本地规则',292,488,700,36,26,C.ink,true);txt(s,'关键词过滤 · 超时熔断 · 输出校验 · WebSocket 断线重连',292,540,780,32,19,C.muted);footer(s,6);
 addNotes(s,'01:27–01:46｜技术上，前端通过 Fastify 和 WebSocket 连接 Stockfish、Qwen 或本地 Ollama，并用 SQLite 保存学习轨迹。为了让演示和真实使用都更稳定，我设计了四级回退：模型不可用时，系统仍能依靠 Stockfish 或本地规则继续反馈，同时加入超时、过滤和输出校验。');
}
//7
{
 const s=p.slides.add();s.background.fill=C.navy;txt(s,'WHAT I MADE',64,48,300,24,14,C.gold,true);txt(s,'我做的不只是一个下棋网站',64,104,890,64,43,C.white,true);txt(s,'而是一座连接孩子、家长和老师的学习桥梁。',64,174,1030,52,34,'#DCE7F3',true);
 const stats=[['300+','分级战术题'],['3','AI 学习角色'],['4级','稳定回退'],['8','Flutter 核心页面']];stats.forEach((v,i)=>{const x=64+i*286;txt(s,v[0],x,330,250,70,47,C.gold,true);txt(s,v[1],x,405,250,32,20,C.white,true);});txt(s,'优势：反馈清楚｜数据可追踪｜引擎与模型协作｜AI 失效仍可运行｜覆盖三类用户',64,500,1140,38,21,C.white,true);txt(s,'下一步：收集真实用户反馈，评估解释质量，并扩展到更多课堂场景。',64,566,1100,36,22,C.white,true);txt(s,'chesstong.com  ·  GitHub / project documentation',64,628,760,28,17,'#AFC1D4');footer(s,7);
 addNotes(s,'01:46–02:00｜目前平台已经包含三百多道题、三个 AI 学习角色、四级回退和八个 Flutter 核心页面。它的优势是反馈清楚、数据可追踪、引擎与模型协作，而且 AI 不可用时仍能继续服务。下一步，我会收集真实用户反馈，评估解释质量，并扩展到更多课堂场景。');
}

await fs.mkdir(RENDER,{recursive:true});
for (const [i,s] of p.slides.items.entries()) { const b=await p.export({slide:s,format:'png',scale:1}); await fs.writeFile(`${RENDER}/slide-${i+1}.png`,new Uint8Array(await b.arrayBuffer())); }
const pptx=await PresentationFile.exportPptx(p); await pptx.save(OUT);
console.log(OUT);
