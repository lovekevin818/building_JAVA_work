import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to get database path
const DB_PATH = path.join(process.cwd(), "src", "preservation_db.json");

// Read helper
function readDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading database:", error);
  }
  return [];
}

// Write helper
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

// Lazy-loaded, crash-safe Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    console.warn("GEMINI_API_KEY environment variable is not defined or is placeholder. Falling back to expert mock system.");
    return null;
  }
  try {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    return aiInstance;
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// --- PROJECT API ROUTES ---

// 1. Get all projects
app.get("/api/projects", (req, res) => {
  const data = readDb();
  res.json(data);
});

// 2. Get specific project
app.get("/api/projects/:id", (req, res) => {
  const data = readDb();
  const project = data.find((p: any) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  res.json(project);
});

// 3. Create a new project
app.post("/api/projects", (req, res) => {
  const { name, location, era, structureType } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: "Name and Location are required" });
  }

  const data = readDb();
  const newProject = {
    id: `proj-${Date.now()}`,
    name,
    location,
    era: era || "不明历史年代",
    structureType: structureType || "木结构/砖瓦结构",
    status: "现状评估中",
    createdAt: new Date().toISOString(),
    assessment: {
      safetyClass: "未评估",
      assessor: "",
      assessDate: "",
      damages: [],
      overallDiagnostic: ""
    },
    conservationPlan: {
      principles: [
        "尊重原真性",
        "不改变文物原状",
        "最小干预原则"
      ],
      technicalSteps: [],
      budgetEstimate: 0,
      designedBy: "",
      approvedDate: null
    },
    supervisions: []
  };

  data.unshift(newProject);
  writeDb(data);
  res.status(201).json(newProject);
});

// 4. Update project status / basic info
app.put("/api/projects/:id", (req, res) => {
  const data = readDb();
  const index = data.findIndex((p: any) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Project not found" });
  }

  data[index] = { ...data[index], ...req.body };
  writeDb(data);
  res.json(data[index]);
});

// 5. Add / Update damage assessment log
app.put("/api/projects/:id/assessment", (req, res) => {
  const { safetyClass, assessor, assessDate, damages, overallDiagnostic } = req.body;
  const data = readDb();
  const index = data.findIndex((p: any) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Project not found" });
  }

  data[index].assessment = {
    ...data[index].assessment,
    safetyClass: safetyClass ?? data[index].assessment.safetyClass,
    assessor: assessor ?? data[index].assessment.assessor,
    assessDate: assessDate ?? data[index].assessment.assessDate,
    damages: damages ?? data[index].assessment.damages,
    overallDiagnostic: overallDiagnostic ?? data[index].assessment.overallDiagnostic
  };

  // If we updated to have overall diagnostic, trigger status transition if applicable
  if (data[index].status === "现状评估中" && statisticsCompleted(data[index].assessment)) {
    data[index].status = "保护方案设计中";
  }

  writeDb(data);
  res.json(data[index]);
});

function statisticsCompleted(assessment: any) {
  return assessment.safetyClass !== "未评估" && assessment.overallDiagnostic && assessment.damages && assessment.damages.length > 0;
}

// 6. Update conservation plan
app.put("/api/projects/:id/plan", (req, res) => {
  const { principles, technicalSteps, budgetEstimate, designedBy, approvedDate } = req.body;
  const data = readDb();
  const index = data.findIndex((p: any) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Project not found" });
  }

  data[index].conservationPlan = {
    ...data[index].conservationPlan,
    principles: principles ?? data[index].conservationPlan.principles,
    technicalSteps: technicalSteps ?? data[index].conservationPlan.technicalSteps,
    budgetEstimate: budgetEstimate !== undefined ? Number(budgetEstimate) : data[index].conservationPlan.budgetEstimate,
    designedBy: designedBy ?? data[index].conservationPlan.designedBy,
    approvedDate: approvedDate ?? data[index].conservationPlan.approvedDate
  };

  if (approvedDate && data[index].status === "保护方案设计中") {
    data[index].status = "保护过程监督中";
  }

  writeDb(data);
  res.json(data[index]);
});

// 7. Add supervision record
app.post("/api/projects/:id/supervision", (req, res) => {
  const { date, inspector, nodeName, status, issueDesc, rectificationPlan, onSiteWarning } = req.body;
  const data = readDb();
  const index = data.findIndex((p: any) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Project not found" });
  }

  const newSupervision = {
    id: `sup-${Date.now()}`,
    date: date || new Date().toISOString().split("T")[0],
    inspector: inspector || "现场监理员",
    nodeName: nodeName || "基础巡检",
    status: status || "合格",
    issueDesc: issueDesc || "",
    rectificationPlan: rectificationPlan || "",
    onSiteWarning: onSiteWarning || null
  };

  if (!data[index].supervisions) {
    data[index].supervisions = [];
  }
  data[index].supervisions.unshift(newSupervision);
  writeDb(data);
  res.status(201).json(data[index]);
});

// --- AI INTELLIGENT ASSISTANTS ENDPOINTS (GEMINI API) ---

// Route 1: Status Assessment AI Damage Diagnostician
app.post("/api/gemini/diagnose", async (req, res) => {
  const { part, type, level, desc, materialFamily } = req.body;

  if (!part || !type || !desc) {
    return res.status(400).json({ error: "Parameters 'part', 'type', and 'desc' are required." });
  }

  const client = getAIClient();
  const isMock = !client;

  if (isMock) {
    // Generate intelligent detailed Mock based on input keywords
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(1200);

    const isWood = desc.includes("木") || part.includes("柱") || part.includes("梁") || part.includes("铺作") || (materialFamily && materialFamily === "wood");
    let mechanisms = "";
    let traditionalRemedy = "";
    let notes = "";
    let safetyRating = "B级-轻微破损";
    let riskLevel = "中";

    if (isWood) {
      mechanisms = "木构件长期遭受温湿度周期循环，由于水气渗漏出现褐腐真菌寄居，导致纤维素水解，丧失承重拉伸力。再加上节点承载力集中分布不均，导致顺纹向应力撕裂劈细缝。";
      traditionalRemedy = "视残损程度，底部采用传统'大漆生漆调面灰墩接工艺'或落叶松落桦嵌槽卯固。中部劈裂部分做不锈钢隠蔽环箍锚结，防腐液高压灌注。";
      notes = "墩接或落入支撑前，必须先进行临时木支撑架地仗受力卸荷。必须保留不小于1.5倍直径的墩接长度。";
      safetyRating = level === "严重" ? "C级-局部危险" : "B级-轻微破损";
      riskLevel = level === "严重" ? "高" : "中";
    } else {
      mechanisms = "清代民国时期清水砖墙的典型病害。毛细作用将地下碱性高矿化可溶盐离子带到墙面。蒸发脱水结晶带来极高膨胀应力，使砖表皮酥碱、粉化剥落。";
      traditionalRemedy = "利用纯蒸馏水贴敷无纺布进行物理多级脱盐法。剔凿酥化深度超过2cm的旧青砖，用等高古青砖及陈化消石灰砂浆砌补。";
      notes = "绝对禁止使用水泥灰缝，水泥硬度高且不透水，会使两侧侧面古砖再次加速风化受损。";
      safetyRating = level === "严重" ? "C级-局部危险" : "B级-轻微破损";
      riskLevel = level === "严重" ? "高" : "中";
    }

    return res.json({
      isMock: true,
      riskLevel,
      safetyRating,
      mechanisms,
      repairUrgency: level === "严重" ? "紧急" : "常规",
      traditionalRemedy,
      notes
    });
  }

  try {
    const prompt = `你是一位在中国文物古迹及古建筑/历史建筑保护学界工作20年、深谙《中国文物古迹保护准则》和传统古建筑营造法式的特级结构工程师。
请针对以下反馈的建筑构件残损现状进行专业、详尽、学术化的病害及病理诊断：

- 构件部位: ${part}
- 残损病害类型: ${type}
- 残损评估等级: ${level}
- 构件残损描述: ${desc}

请按照以下JSON格式返回病理诊断结果，严禁包含任何其他文字或Markdown标记，只返回合法的完整的JSON字符串本身。

{
  "riskLevel": "高" / "中" / "低",
  "safetyRating": "A级-基本安全" / "B级-轻微破损" / "C级-局部危险" / "D级-整体危险",
  "mechanisms": "用极其学术、专业的古建修缮学词汇阐述该病害形成的深层物理学、化学或微生物退化机制（如褐腐菌纤维水解、泛碱、应力集中剥夺等，约120字）；",
  "repairUrgency": "紧急" / "常规" / "监测",
  "traditionalRemedy": "给出符合中国修旧如旧、最小干预传统营造工艺（如：局部嵌补、落叶松扁销墩接、碳纤维筋锚固扣、糯米熟石灰浆灌浆固结、贴敷脱盐法等，50-80字）；",
  "notes": "现场施工或勘察时的关键结构工程与安全防范注意事项（如结构卸荷支撑、防碱化处理、环境位移高频激光监测等，50-80字）"
}`;

    const response = await client!.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini diagnose error:", err);
    res.status(500).json({ error: "Gemini API diagnostic failed", details: err.message });
  }
});

// Route 2: Conservation Plan Optimization Expert
app.post("/api/gemini/optimize-plan", async (req, res) => {
  const { element, technique, materials, specification } = req.body;

  if (!element || !technique || !materials) {
    return res.status(400).json({ error: "Parameters 'element', 'technique', and 'materials' are required." });
  }

  const client = getAIClient();
  const isMock = !client;

  if (isMock) {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(1200);

    return res.json({
      isMock: true,
      optimizedSteps: [
        `工艺优化：在应用 ${technique} 前，必须对周边关联面做应力应变激光探测。`,
        `材料校验：所填 ${materials} 应当经过耐寒耐冻融及比表面积活性比化学检测，并在修补面保留应力缓冲缝。`,
        `最小干预落实：对残损不明显的周边原构件建立背部无损微标，登记年轮及原材料矿石特征，符合原真可识别。`
      ],
      craftRequirement: "传统消石灰浆熟化需要至少3个月，熟石灰中氢氧化钙需要吸收空气中二氧化碳缓慢重碳化，绝对严禁通过添加快干性水泥来加速硬化；木构件结合处必须配合大漆及原麻灰腻子防腐填缝。",
      structuralCheck: "在进行该构件的刚接和连接替换时，节点连接强度会有变化。计算提示抗压刚度在工艺补强后会回升35%，需密切预防连接面拉伸抗弯破坏，防范产生不均匀抗剪切错变。",
      modernMaterialsAcceptable: "因坚持文物最小干预和真实性原则，本节点原则上严禁外露使用碳纤维或环氧树脂。但为了保证内部承载，可考虑将直径2mm的超细隐蔽式碳纤维拉筋预埋入木筋空槽中粘结，这在学界被归为微创可逆加固手段。"
    });
  }

  try {
    const prompt = `你是一位在中国文物古迹及古建筑保护和历史风貌建筑活化利用学界享有盛誉的可持续保护规划首席大师。
审阅以下古建筑修缮项目中针对某构件拟议的保护恢复工程技术方案：

- 修复构件/部位: ${element}
- 修缮拟定技术: ${technique}
- 使用传统/现代材料: ${materials}
- 修缮性能标准或规格描述: ${specification}

请依据中国历史古迹修缮技术规范（《中国文物古迹保护准则》），对该技术、材料选择及性能强度做出一份高水平、建设性的AI大师级评审及改进报告。

请按照以下JSON格式返回诊断结果，严禁包含任何其他辅助说明，只返回合法的完整的JSON：

{
  "optimizedSteps": [
    "第一条优化控制点：建议将传统的某法改良为更精确的手段以缩减原表面剥离深度；",
    "第二条控制点：...",
    "第三条控制点：..."
  ],
  "craftRequirement": "给出最精确的配料和养护指标（如三合土配比、熟石灰淋置陈化时间、大漆腻子干燥湿度、竹销钉锁紧角、抹面砂浆层涂刷周期及温度需求，约120字）；",
  "structuralCheck": "从结构力学（木构件抗拉抗剪剪力流、梁柱受压偏心变位、砖石抗拉刚合面、地基承载差）对修缮截面或形式进行力学刚化校验评估，约100字；",
  "modernMaterialsAcceptable": "对拟方案是否适合掺入现代聚合物（环氧树脂/碳纤维复合/硅烷改性憎水剂等）做出明确规范性的合规性阐述（如文物不改变现状、呼吸性透气性、可逆改造等界线评估，约100字）"
}`;

    const response = await client!.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini optimize plan error:", err);
    res.status(500).json({ error: "Gemini plan optimization failed", details: err.message });
  }
});

// Route 3: Construction Supervision / Inspection Auditor
app.post("/api/gemini/audit-supervision", async (req, res) => {
  const { nodeName, inspector, siteIssues } = req.body;

  if (!nodeName || !siteIssues) {
    return res.status(400).json({ error: "Parameters 'nodeName' and 'siteIssues' are required." });
  }

  const client = getAIClient();
  const isMock = !client;

  if (isMock) {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await delay(1200);

    const isNonCompliant = siteIssues.includes("水") || siteIssues.includes("水泥") || siteIssues.includes("短") || siteIssues.includes("偏") || siteIssues.includes("未达到") || siteIssues.includes("不均匀");
    return res.json({
      isMock: true,
      complianceCheck: isNonCompliant ? "不合规" : "正常",
      alertLevel: isNonCompliant ? "红色预警" : "正常",
      hazardAnalysis: `针对'${nodeName}'的现场问题。主要原因为其破坏了我国历史古建筑营造规范，在不相容的材料膨胀系数和刚度下，新施作材料会引发古原木/原青砖四周急剧产生应力错切。无熟化到位的消石灰也会在后期持续吸水膨胀，撑破修缮面。`,
      rectificationInstruction: "强硬责令即刻拆除不合格部位，彻底清除残留不相容废料，按照原大师级技术规范材料方案。所有配料由监理全程双签确认。对关键荷载应力截面进行千分表或激光扫描复核验证，重新提请隐蔽工程核准验收。"
    });
  }

  try {
    const prompt = `你是一位在中国文物局及中国文保监理协会具有极高考学和执法权能的资深古建筑工程总监理工程师。
目前收到一笔来自施工监察工地现场发回的施工偏离与隐患现场问题报告。请针对其进行工程合规法律审核、力学病害预警评估以及整改指派：

- 施工/验收节点: ${nodeName}
- 填报工长或监理人: ${inspector || "现场监理"}
- 发现的现场问题或不合规现象描述: ${siteIssues}

请依据《中华人民共和国文物保护法》、《文物保护工程监理规程》进行研制审查。

请按照以下JSON格式返回结果，严禁包含任何其他文字或标记，只返回合法的完整的JSON：

{
  "complianceCheck": "不合规" / "存在隐患" / "正常",
  "alertLevel": "红色预警" / "黄色预警" / "正常",
  "hazardAnalysis": "详细、严苛地学术剖析该不合规行为（如私自掺水泥、未脱水熟化、五瓣墩接长度不足、榫卯搭接太少等）会在长期（3-10年）对文物和建筑安全结构、酸碱结晶、材料弹性相容、水分运动物理产生何种严重的破坏性质，约120字；",
  "rectificationInstruction": "给出作为极高权威总监的严厉、清晰、具备法律和工艺程序效力的工程整改指示（包含开工砸除、基面清洗、强制清退违规料具、重新配比试样双监、建立位移观测器监测备案等具体指令，约120字）"
}`;

    const response = await client!.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini supervision audit error:", err);
    res.status(500).json({ error: "Gemini supervision audit failed", details: err.message });
  }
});


// Vite middleware / client-serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booting. System run successfully, listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
