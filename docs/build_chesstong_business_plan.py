from __future__ import annotations

import html
import zipfile
from pathlib import Path


OUT = Path("docs/Chesstong国际象棋智能学习平台商业计划书.docx")


def esc(text: str) -> str:
    return html.escape(text, quote=False)


def r(text: str, bold: bool = False, size: int | None = None, color: str | None = None) -> str:
    props = []
    if bold:
        props.append("<w:b/>")
    if size:
        props.append(f'<w:sz w:val="{size * 2}"/>')
        props.append(f'<w:szCs w:val="{size * 2}"/>')
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    props.append('<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/>')
    pr = f"<w:rPr>{''.join(props)}</w:rPr>"
    return f"<w:r>{pr}<w:t>{esc(text)}</w:t></w:r>"


def p(
    text: str = "",
    style: str = "Normal",
    align: str | None = None,
    before: int | None = None,
    after: int | None = None,
    line: int | None = None,
    bold: bool = False,
    size: int | None = None,
    color: str | None = None,
    page_break_before: bool = False,
) -> str:
    ppr = [f'<w:pStyle w:val="{style}"/>']
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    spacing = []
    if before is not None:
        spacing.append(f'w:before="{before}"')
    if after is not None:
        spacing.append(f'w:after="{after}"')
    if line is not None:
        spacing.append(f'w:line="{line}" w:lineRule="auto"')
    if spacing:
        ppr.append(f"<w:spacing {' '.join(spacing)}/>")
    if page_break_before:
        ppr.append("<w:pageBreakBefore/>")
    return f"<w:p><w:pPr>{''.join(ppr)}</w:pPr>{r(text, bold=bold, size=size, color=color)}</w:p>"


def bullet(text: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
        '<w:spacing w:after="80" w:line="290" w:lineRule="auto"/></w:pPr>'
        f"{r(text)}</w:p>"
    )


def numbered(text: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>'
        '<w:spacing w:after="80" w:line="290" w:lineRule="auto"/></w:pPr>'
        f"{r(text)}</w:p>"
    )


def h1(text: str, page_break_before: bool = False) -> str:
    return p(text, style="Heading1", before=360, after=200, color="2E74B5", bold=True, page_break_before=page_break_before)


def h2(text: str) -> str:
    return p(text, style="Heading2", before=240, after=120, color="2E74B5", bold=True)


def callout(text: str) -> str:
    return (
        '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="6" w:color="B7C9DC"/>'
        '<w:left w:val="single" w:sz="6" w:color="B7C9DC"/>'
        '<w:bottom w:val="single" w:sz="6" w:color="B7C9DC"/>'
        '<w:right w:val="single" w:sz="6" w:color="B7C9DC"/>'
        '<w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>'
        '<w:tblCellMar><w:top w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/>'
        '<w:start w:w="180" w:type="dxa"/><w:end w:w="180" w:type="dxa"/></w:tblCellMar></w:tblPr>'
        '<w:tblGrid><w:gridCol w:w="9360"/></w:tblGrid><w:tr><w:tc>'
        '<w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:fill="F4F6F9"/></w:tcPr>'
        f'{p(text, after=0, line=300, bold=True, color="1F3A5F")}'
        "</w:tc></w:tr></w:tbl>"
    )


def table(rows: list[tuple[str, str]], widths: tuple[int, int] = (2300, 7060)) -> str:
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    trs = []
    for i, (left, right) in enumerate(rows):
        fill = "F2F4F7" if i == 0 else "FFFFFF"
        cells = []
        for j, text in enumerate((left, right)):
            is_header = i == 0
            cells.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{widths[j]}" w:type="dxa"/>'
                f'<w:shd w:fill="{fill}"/></w:tcPr>'
                f'{p(text, after=0, line=280, bold=is_header, color="1F4D78" if is_header else None)}'
                "</w:tc>"
            )
        trs.append("<w:tr>" + "".join(cells) + "</w:tr>")
    return (
        '<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="D0D7DE"/>'
        '<w:left w:val="single" w:sz="4" w:color="D0D7DE"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="D0D7DE"/>'
        '<w:right w:val="single" w:sz="4" w:color="D0D7DE"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="D0D7DE"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="D0D7DE"/></w:tblBorders>'
        '<w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/>'
        '<w:start w:w="140" w:type="dxa"/><w:end w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr>'
        f"<w:tblGrid>{grid}</w:tblGrid>{''.join(trs)}</w:tbl>"
    )


body: list[str] = []
body.append(p("Chesstong 国际象棋智能学习平台", style="Title", align="center", after=80, size=26, color="0B2545", bold=True))
body.append(p("商业计划书（社会效益导向版）", style="Subtitle", align="center", after=260, size=15, color="555555"))
body.append(p("项目定位：帮助 4-10 岁、三级之前的国际象棋初学者更轻松地理解、练习和坚持。", align="center", after=300, size=11, color="555555"))
body.append(callout("这份计划书的重点不是先讲盈利，而是讲清楚为什么这个项目值得做：它来自真实的学棋经历，服务真实的初学者，也希望让家长和老师更容易参与孩子的成长。"))
body.append(p())
body.append(table([
    ("项目概览", "内容"),
    ("项目名称", "Chesstong 国际象棋智能学习平台"),
    ("当前阶段", "平台已上线，并获得渝中区国际象棋协会认可"),
    ("服务对象", "4-10 岁、三级之前的国际象棋初学者，以及他们的家长和老师"),
    ("核心价值", "用大语言模型把专业棋类语言讲清楚，同时让家长和老师能在线监督学习过程"),
    ("现阶段重点", "优先服务更多初学者，强调社会效益；未来再逐步探索高级学习者的个性化 AI 学棋 Agent")
]))

body.append(h1("一、项目背景", page_break_before=True))
body.append(p("我从六年级开始学习国际象棋。刚开始接触这项运动时，我很快发现，国际象棋并不是只靠兴趣就能一直学下去的。它需要理解很多规则、术语和思考方法，也需要长期练习。对于初学者来说，真正难的地方常常不是“不想学”，而是“听不懂、看不懂、没有人持续陪着练”。"))
body.append(p("国际象棋里有很多专业词，比如“牵制”“闪击”“双重攻击”“弱格”“子力协调”等。老师在课堂上讲过以后，孩子可能当时觉得懂了，但回家做题时仍然不知道为什么这一招是好棋，为什么另一步不行。很多线上题库也只是告诉学生答案正确或错误，却没有把背后的思路讲清楚。"))
body.append(p("我自己也遇到过这种情况。一道题做错后，看到答案时觉得“原来是这样”，但如果没人解释，我其实并没有真正明白。后来我发现，只有当有人用我能听懂的话把思路拆开讲，我才会真正掌握。也因为有这样的经历，我希望做一个工具，帮助更多初学者降低理解门槛。"))
body.append(p("另外，家长的支持在学棋过程中非常重要。低龄孩子能不能坚持练习，不只取决于老师课堂上讲得好不好，也取决于课后有没有人关注、鼓励和监督。可是很多家长并不懂国际象棋，他们愿意支持孩子，却不知道孩子今天练了什么、有没有进步、错在哪里。Chesstong 希望解决的就是这些现实问题。"))

body.append(h1("二、项目想解决的痛点"))
for item in [
    "专业语言难理解：初学者经常听到术语，但不一定真正理解术语背后的棋理。",
    "做题后缺少解释：很多平台只给结果，不解释为什么这一步对、为什么其他走法不合适。",
    "家长难以参与：家长想监督孩子学习，但自己不懂棋，很难判断孩子是否真的在进步。",
    "老师课后管理不方便：线下课堂结束后，老师很难持续了解每个学生的练习情况。",
    "孩子容易中途放弃：如果反馈不及时、内容太难，低龄学习者很容易从“感兴趣”变成“看不懂”。",
]:
    body.append(bullet(item))

body.append(h1("三、项目介绍"))
body.append(p("Chesstong 是一个面向国际象棋初学者的智能学习平台。它不是只做一个题库，也不是单纯的人机对战工具，而是希望把孩子学习、AI 讲解、家长监督和老师管理连接起来。"))
body.append(p("目前平台已经上线，已有在线注册登录、学习中心、题库训练、AI 智能讲解、人机对战、走法建议、复盘分析、积分排行榜、家长中心、老师班级管理、学习计划和学习报告等功能。"))
body.append(p("项目已经获得渝中区国际象棋协会的认可，并开始帮助那里的初学者学习国际象棋。接下来，我希望先把渝中区的试点做好，再逐步推广到重庆更多地方，让更多孩子能使用这个平台。"))

body.append(h1("四、核心创新点"))
body.append(h2("1. 用大语言模型解释专业术语"))
body.append(p("Chesstong 最大的创新点，是用大语言模型把初学者听不懂的专业语言翻译成更容易理解的表达。比如“牵制”这个概念，传统解释可能比较抽象，但 AI 可以用更像老师陪在旁边讲题的方式解释：这个棋子后面保护着更重要的棋子，所以它现在不能随便走，就像被钉在原地一样。"))
body.append(p("这样的表达更适合低龄初学者，也能让孩子不是只记住一个词，而是真正理解这个词在棋盘上代表什么。"))
body.append(h2("2. 每道题都尽量讲清楚思路"))
body.append(p("学生做题以后，平台不只是显示“正确”或“错误”，还会解释这道题考察什么知识点、正确答案为什么成立、错误思路可能在哪里、下次遇到类似局面应该怎么想。这样可以减少机械刷题，让做题真正变成学习。"))
body.append(h2("3. 家长和老师在线监督"))
body.append(p("平台会记录孩子的学习情况，让家长看到练习数量、正确率、积分变化和学习计划。家长即使不懂棋，也能知道孩子有没有坚持。老师也可以通过班级管理功能了解学生课后练习情况，让线下教学和线上练习连接起来。"))
body.append(h2("4. 专注初学者，而不是一开始就追求高阶竞技"))
body.append(p("很多棋类平台更偏向竞技或高手训练，但 Chesstong 现在主要服务 4-10 岁、三级之前的学习者。这个阶段最需要的是兴趣、理解和坚持，而不是复杂的高级理论。"))

body.append(h1("五、目标用户"))
for item in [
    "4-10 岁国际象棋初学者：尤其是刚入门、三级之前的孩子。",
    "初学者家长：希望支持孩子学棋，但自己不一定懂棋的家长。",
    "国际象棋老师：需要了解学生课后练习情况、布置任务和管理班级的老师。",
    "协会和培训机构：可以把平台作为初学者学习和普及推广的辅助工具。",
]:
    body.append(bullet(item))

body.append(h1("六、当前进展"))
body.append(table([
    ("进展方向", "目前情况"),
    ("产品开发", "平台已经上线，核心学习、做题、AI 讲解、人机对战、家长中心和老师管理功能已具备"),
    ("社会认可", "项目已获得渝中区国际象棋协会认可"),
    ("实际应用", "正在帮助当地初学者学习国际象棋"),
    ("下一步", "继续优化初学者体验，从渝中区逐步推广到重庆更多区域")
], widths=(2600, 6760)))

body.append(h1("七、发展目标"))
body.append(numbered("短期目标：继续在渝中区完善平台，让更多初学者能够使用 Chesstong 学棋，并根据真实反馈优化 AI 讲解和家长监督功能。"))
body.append(numbered("中期目标：从渝中区推广到重庆更多区域，服务更多 4-10 岁、三级之前的国际象棋学习者。"))
body.append(numbered("长期目标：形成一个真正有社会价值的少儿国际象棋智能学习平台，让更多孩子可以更轻松、更有信心地进入国际象棋世界。"))

body.append(h1("八、社会效益"))
body.append(p("现阶段，Chesstong 最看重的是社会效益。这个项目首先希望帮助更多孩子接触并坚持学习国际象棋。国际象棋对逻辑思维、专注力、计算能力和抗压能力都有帮助，如果学习门槛能够降低，就会有更多孩子从中受益。"))
body.append(p("其次，Chesstong 可以帮助初学者更好地理解知识。很多孩子不是学不会，而是缺少适合他们年龄和水平的解释方式。大语言模型可以把复杂的专业语言变得更容易理解。"))
body.append(p("第三，平台能让家长更好地陪伴孩子。家长不用成为专业棋手，也可以通过学习数据看到孩子有没有练习、有没有进步，从而给孩子更具体的鼓励。"))
body.append(p("第四，平台可以帮助老师提高教学效率。老师能够更清楚地看到学生的课后练习情况，更有针对性地安排教学。"))
body.append(p("最后，项目也有助于国际象棋在重庆青少年群体中的普及。它可以让更多初学者迈过最难的入门阶段，让国际象棋不只是少数孩子的兴趣，而是更多孩子可以接触到的思维训练方式。"))

body.append(h1("九、未来可能的经济效益"))
body.append(p("虽然 Chesstong 目前主要关注社会效益，但未来也可以在不影响公益和普及目标的前提下，探索适度的经济效益。"))
body.append(p("一个比较有潜力的方向，是为更高级的学习者提供由大语言模型搭建的个人学棋 Agent。这个 Agent 可以根据学生的错题、对局记录、水平目标和训练时间，生成个性化学习计划，像一个长期陪伴的 AI 教练一样帮助学生进步。"))
for item in [
    "高级学习者个人 AI 学棋助手",
    "个性化复盘报告和训练计划",
    "等级考试专项训练包",
    "老师或机构的班级管理高级功能",
    "面向家庭的会员制增值服务",
]:
    body.append(bullet(item))
body.append(p("这些方向可以作为未来商业化探索。但在现阶段，项目更重要的是把基础功能做好，让更多初学者真正用得上、看得懂、坚持得下去。"))

body.append(h1("十、实施计划"))
body.append(table([
    ("阶段", "主要任务"),
    ("第一阶段：继续打磨渝中区试点", "收集初学者、家长和老师反馈，优化题库难度、AI 讲解表达和家长监督页面"),
    ("第二阶段：扩大到重庆更多区域", "与更多老师、机构和协会合作，推动平台进入更多初学者课堂和课后练习场景"),
    ("第三阶段：完善个性化学习能力", "根据学生错题和练习记录，逐步增强个性化推荐和 AI 学棋 Agent 能力"),
    ("第四阶段：探索可持续运营", "在保持社会效益为主的基础上，尝试高级功能和机构服务，支持平台长期维护")
], widths=(2700, 6660)))

body.append(h1("十一、可能风险与应对"))
for item in [
    "AI 讲解不够准确：通过题库标准答案、老师审核和持续优化提示词来提高可靠性。",
    "低龄用户坚持度不高：通过积分、阶段目标、家长反馈和更清楚的讲解来增加学习动力。",
    "家长不懂平台数据：把数据做成更直观的学习报告，不只显示数字，也给出简单建议。",
    "推广速度过快导致服务跟不上：先从渝中区试点做扎实，再逐步扩大到重庆。",
]:
    body.append(bullet(item))

body.append(h1("十二、总结"))
body.append(p("Chesstong 是一个来自我个人真实学棋经历的项目。我从六年级开始学习国际象棋，所以很清楚初学者一开始会遇到什么困难：术语难懂、做题没解释、课后没人监督、家长想帮却不知道怎么帮。"))
body.append(p("我希望 Chesstong 能成为一个连接孩子、家长和老师的平台。它用大语言模型帮助孩子理解难懂的专业知识，用学习数据帮助家长监督和鼓励孩子，也用班级管理帮助老师提高课后管理效率。"))
body.append(p("目前项目已经上线，并获得渝中区国际象棋协会认可。未来，我希望它能从渝中区出发，逐步走向重庆，帮助更多 4-10 岁、三级之前的国际象棋初学者，让他们更容易入门，更愿意坚持，也更有信心继续学下去。"))


styles = """
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/><w:qFormat/>
    <w:pPr><w:spacing w:after="160" w:line="320" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/><w:qFormat/>
    <w:pPr><w:spacing w:before="0" w:after="80"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:sz w:val="52"/><w:color w:val="0B2545"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/><w:qFormat/>
    <w:pPr><w:spacing w:after="220"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="30"/><w:color w:val="555555"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="360" w:after="200"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:b/><w:sz w:val="26"/><w:color w:val="2E74B5"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="540" w:hanging="280"/><w:spacing w:after="80" w:line="290" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/></w:rPr>
  </w:style>
</w:styles>
"""

numbering = """
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="280"/></w:pPr>
      <w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:eastAsia="Symbol"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:abstractNum w:abstractNumId="2">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>
      <w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="280"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>
"""

document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
 <w:body>
   {''.join(body)}
   <w:sectPr>
     <w:pgSz w:w="12240" w:h="15840"/>
     <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
     <w:cols w:space="720"/>
     <w:docGrid w:linePitch="360"/>
   </w:sectPr>
 </w:body>
</w:document>
"""

content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""

rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""

document_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"""

core = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
 <dc:title>Chesstong 国际象棋智能学习平台商业计划书</dc:title>
 <dc:creator>Chesstong 项目团队</dc:creator>
 <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
 <dcterms:created xsi:type="dcterms:W3CDTF">2026-06-19T00:00:00Z</dcterms:created>
 <dcterms:modified xsi:type="dcterms:W3CDTF">2026-06-19T00:00:00Z</dcterms:modified>
</cp:coreProperties>
"""

app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
 <Application>Codex</Application>
 <DocSecurity>0</DocSecurity>
 <ScaleCrop>false</ScaleCrop>
 <Company>Chesstong</Company>
</Properties>
"""

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("_rels/.rels", rels)
    z.writestr("word/document.xml", document)
    z.writestr("word/_rels/document.xml.rels", document_rels)
    z.writestr("word/styles.xml", styles)
    z.writestr("word/numbering.xml", numbering)
    z.writestr("docProps/core.xml", core)
    z.writestr("docProps/app.xml", app)

print(OUT)
