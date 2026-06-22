import { useState, useEffect, FormEvent } from "react";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  Plus, 
  Sparkles, 
  ClipboardCheck, 
  Construction, 
  Search, 
  X, 
  Wrench, 
  ShieldCheck, 
  Coins, 
  Compass,
  ArrowRight,
  Info,
  Loader2,
  RefreshCw
} from "lucide-react";

// Types matching backend schema
interface AIDiagnostic {
  riskLevel: string;
  safetyRating: string;
  mechanisms: string;
  repairUrgency: string;
  traditionalRemedy: string;
  notes: string;
}

interface Damage {
  id: string;
  part: string;
  type: string;
  level: string;
  desc: string;
  aiDiagnostic?: AIDiagnostic;
}

interface TechnicalStep {
  id: string;
  element: string;
  technique: string;
  materials: string;
  specification: string;
  aiOptimizedTip?: {
    optimizedSteps: string[];
    craftRequirement: string;
    structuralCheck: string;
    modernMaterialsAcceptable: string;
  };
}

interface OnSiteWarning {
  complianceCheck: string;
  alertLevel: string;
  hazardAnalysis: string;
  rectificationInstruction: string;
}

interface Supervision {
  id: string;
  date: string;
  inspector: string;
  nodeName: string;
  status: string;
  issueDesc: string;
  rectificationPlan: string;
  onSiteWarning?: OnSiteWarning;
}

interface Project {
  id: string;
  name: string;
  location: string;
  era: string;
  structureType: string;
  status: "现状评估中" | "保护方案设计中" | "保护过程监督中" | string;
  createdAt: string;
  assessment: {
    safetyClass: string;
    assessor: string;
    assessDate: string;
    damages: Damage[];
    overallDiagnostic: string;
  };
  conservationPlan: {
    principles: string[];
    technicalSteps: TechnicalStep[];
    budgetEstimate: number;
    designedBy: string;
    approvedDate: string | null;
  };
  supervisions: Supervision[];
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "evaluation" | "plan" | "supervision">("overview");
  
  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Modal forms states
  const [showAddProject, setShowAddProject] = useState<boolean>(false);
  
  // New Project Form
  const [newProjName, setNewProjName] = useState("");
  const [newProjLoc, setNewProjLoc] = useState("");
  const [newProjEra, setNewProjEra] = useState("清代 (公元1644-1912年)");
  const [newProjStructure, setNewProjStructure] = useState("传统砖木混合结构体系");

  // New Damage Form
  const [newDmgPart, setNewDmgPart] = useState("");
  const [newDmgType, setNewDmgType] = useState("");
  const [newDmgLevel, setNewDmgLevel] = useState("中度");
  const [newDmgDesc, setNewDmgDesc] = useState("");

  // New Plan Step Form
  const [newStepElement, setNewStepElement] = useState("");
  const [newStepTechnique, setNewStepTechnique] = useState("");
  const [newStepMaterials, setNewStepMaterials] = useState("");
  const [newStepSpec, setNewStepSpec] = useState("");

  // Main Plan Info Form
  const [planDesigner, setPlanDesigner] = useState("");
  const [planBudget, setPlanBudget] = useState<number>(0);

  // New Supervision Log Form
  const [newSupNode, setNewSupNode] = useState("");
  const [newSupInspector, setNewSupInspector] = useState("");
  const [newSupStatus, setNewSupStatus] = useState("合格");
  const [newSupIssues, setNewSupIssues] = useState("");
  const [newSupRectificationPlan, setNewSupRectificationPlan] = useState("");

  // Fetch all projects at load
  const fetchProjects = async (autoSelectId?: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length > 0) {
          if (autoSelectId && data.some((p: Project) => p.id === autoSelectId)) {
            setSelectedProjectId(autoSelectId);
          } else if (!selectedProjectId || !data.some((p: Project) => p.id === selectedProjectId)) {
            setSelectedProjectId(data[0].id);
          }
        }
      } else {
        setErrorMessage("获取项目失败");
      }
    } catch (err) {
      setErrorMessage("连接服务器失败，正在以本地模拟运行。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  // Sync state values when changing active project
  useEffect(() => {
    if (activeProject) {
      setPlanDesigner(activeProject.conservationPlan.designedBy || "");
      setPlanBudget(activeProject.conservationPlan.budgetEstimate || 0);
    }
  }, [selectedProjectId, projects]);

  // Handle Add Project
  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjLoc) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjName,
          location: newProjLoc,
          era: newProjEra,
          structureType: newProjStructure
        })
      });
      if (res.ok) {
        const created = await res.json();
        setNewProjName("");
        setNewProjLoc("");
        setShowAddProject(false);
        await fetchProjects(created.id);
        setActiveTab("overview");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle addition & triggering AI diagnosis of damages
  const handleAddDamageAssessment = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newDmgPart || !newDmgType || !newDmgDesc) return;

    setAiLoading(true);
    try {
      // 1. Run server side Gemini AI Diagnosis dynamically
      const aiRes = await fetch("/api/gemini/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: newDmgPart,
          type: newDmgType,
          level: newDmgLevel,
          desc: newDmgDesc
        })
      });

      let aiDiagnosticResult = null;
      if (aiRes.ok) {
        aiDiagnosticResult = await aiRes.json();
      }

      // 2. Append new damage log with diagnostics
      const newDmgItem: Damage = {
        id: `dmg-${Date.now()}`,
        part: newDmgPart,
        type: newDmgType,
        level: newDmgLevel,
        desc: newDmgDesc,
        aiDiagnostic: aiDiagnosticResult || undefined
      };

      const updatedDamages = [...activeProject.assessment.damages, newDmgItem];
      const isProjectReadyToTransition = updatedDamages.length > 0;

      // Calculate initial overall assessment text if empty
      let overallDiag = activeProject.assessment.overallDiagnostic;
      if (!overallDiag) {
        overallDiag = `${activeProject.name}目前在${newDmgPart}存在${newDmgType}（等级：${newDmgLevel}），亟需介入合理的修缮性保护设计。`;
      }

      // Save to DB
      const saveRes = await fetch(`/api/projects/${activeProject.id}/assessment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safetyClass: newDmgLevel === "严重" ? "C级 (局部严重危险)" : "B级 (轻微破损)",
          assessor: "李徽 (现场特约AI辅助勘察)",
          assessDate: new Date().toISOString().split("T")[0],
          damages: updatedDamages,
          overallDiagnostic: overallDiag
        })
      });

      if (saveRes.ok) {
        setNewDmgPart("");
        setNewDmgType("");
        setNewDmgDesc("");
        await fetchProjects(activeProject.id);
      }
    } catch (err) {
      console.error("AI diagnostics failed:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Execute Gemini Diagnose manually on older damage item that lacks it
  const handleTriggerSingleDiagnose = async (dmgItem: Damage) => {
    if (!activeProject) return;
    setAiLoading(true);
    try {
      const aiRes = await fetch("/api/gemini/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: dmgItem.part,
          type: dmgItem.type,
          level: dmgItem.level,
          desc: dmgItem.desc
        })
      });

      if (aiRes.ok) {
        const aiDiagnosticResult = await aiRes.json();
        const updatedDamages = activeProject.assessment.damages.map(d => {
          if (d.id === dmgItem.id) {
            return { ...d, aiDiagnostic: aiDiagnosticResult };
          }
          return d;
        });

        await fetch(`/api/projects/${activeProject.id}/assessment`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            damages: updatedDamages
          })
        });
        await fetchProjects(activeProject.id);
      }
    } catch (err) {
      console.error("Single diagnostic link failed", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Preset Materials values for design speed
  const applyPresetMaterial = (preset: { n: string; t: string; m: string; s: string }) => {
    setNewStepElement(preset.n);
    setNewStepTechnique(preset.t);
    setNewStepMaterials(preset.m);
    setNewStepSpec(preset.s);
  };

  const materialPresets = [
    { n: "建筑底部松木基础", t: "灌浆固结与基础包固", m: "熟石灰块、2%糯米熟浆、洗净天然中粗砂、矾水", s: "配合比采用 1:0.4:2 石灰糯米砂浆进行深层压力灌注，终凝周期控制在15日以上，保证在潮湿环境下的天然矿物胶结强度。" },
    { n: "大梁及金柱受力件", t: "传统五瓣墩接与槽销拼接", m: "优质陈化期3年樟子松、桐油、生漆、隐蔽式不锈钢异形抱箍", s: "墩接处重合面不得小于1.5倍立柱直径，榫口咬合面贴敷两重麻丝并在底仗大漆内调灰面进行无缝嵌合。" },
    { n: "外沿红砖及女儿墙", t: "剔凿补砌与元宝缝勾灰缝", m: "传统工艺复原烧结红砖、高柔陈化消石灰粉、大颗石英砂", s: "缝深开槽不低于2.5厘米。灰缝呈向内弧度的平滑水波元宝形以顺利泄流。禁用任何酸性硅酸盐灰色水泥。" }
  ];

  // Handle addition & triggering AI optimization for design plan steps
  const handleAddPlanStep = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newStepElement || !newStepTechnique || !newStepMaterials) return;

    setAiLoading(true);
    try {
      // 1. Trigger Gemini Plan Optimizer
      const aiRes = await fetch("/api/gemini/optimize-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          element: newStepElement,
          technique: newStepTechnique,
          materials: newStepMaterials,
          specification: newStepSpec
        })
      });

      let aiTips = null;
      if (aiRes.ok) {
        aiTips = await aiRes.json();
      }

      const newStep: TechnicalStep = {
        id: `step-${Date.now()}`,
        element: newStepElement,
        technique: newStepTechnique,
        materials: newStepMaterials,
        specification: newStepSpec,
        aiOptimizedTip: aiTips || undefined
      };

      const updatedSteps = [...activeProject.conservationPlan.technicalSteps, newStep];

      // Save to database
      const saveRes = await fetch(`/api/projects/${activeProject.id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicalSteps: updatedSteps,
          designedBy: planDesigner || activeProject.conservationPlan.designedBy || "智能辅助设计规划局",
          budgetEstimate: planBudget || activeProject.conservationPlan.budgetEstimate || 50
        })
      });

      if (saveRes.ok) {
        setNewStepElement("");
        setNewStepTechnique("");
        setNewStepMaterials("");
        setNewStepSpec("");
        await fetchProjects(activeProject.id);
      }
    } catch (err) {
      console.error("AI optimized plan failed", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Execute Gemini Project Plan optimization for older nodes that lack details
  const handleTriggerSinglePlanOptimize = async (stepItem: TechnicalStep) => {
    if (!activeProject) return;
    setAiLoading(true);
    try {
      const aiRes = await fetch("/api/gemini/optimize-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          element: stepItem.element,
          technique: stepItem.technique,
          materials: stepItem.materials,
          specification: stepItem.specification
        })
      });

      if (aiRes.ok) {
        const aiTips = await aiRes.json();
        const updatedSteps = activeProject.conservationPlan.technicalSteps.map(s => {
          if (s.id === stepItem.id) {
            return { ...s, aiOptimizedTip: aiTips };
          }
          return s;
        });

        await fetch(`/api/projects/${activeProject.id}/plan`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technicalSteps: updatedSteps
          })
        });
        await fetchProjects(activeProject.id);
      }
    } catch (err) {
      console.error("Plan node optimization failed", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Submit / Lock design plan and unlock Supervision stage (Phase 3)
  const handleApproveAndPublishPlan = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designedBy: planDesigner || "古建保护设计规划局",
          budgetEstimate: Number(planBudget) || 120,
          approvedDate: new Date().toISOString().split("T")[0] // Triggers state change: -> 保护过程监督中
        })
      });

      if (res.ok) {
        await fetchProjects(activeProject.id);
        setActiveTab("supervision");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Supervision report additions + triggering AI auditing
  const handleAddSupervisionLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newSupNode || !newSupIssues) return;

    setAiLoading(true);
    try {
      // 1. Run dynamic AI inspection auditor
      const aiRes = await fetch("/api/gemini/audit-supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeName: newSupNode,
          inspector: newSupInspector || "驻场监督监理长",
          siteIssues: newSupIssues
        })
      });

      let aiAuditingResult = null;
      if (aiRes.ok) {
        aiAuditingResult = await aiRes.json();
      }

      // 2. Save supervision to backend
      const saveRes = await fetch(`/api/projects/${activeProject.id}/supervision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          inspector: newSupInspector || "驻场监督监理长",
          nodeName: newSupNode,
          status: newSupStatus,
          issueDesc: newSupIssues,
          rectificationPlan: newSupRectificationPlan || "建立工艺配比重试规范，清理不合格接触面并在监理下重新铺筑。",
          onSiteWarning: aiAuditingResult || undefined
        })
      });

      if (saveRes.ok) {
        setNewSupNode("");
        setNewSupInspector("");
        setNewSupIssues("");
        setNewSupRectificationPlan("");
        await fetchProjects(activeProject.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // Helper values for damage rendering state
  const totalDamages = activeProject?.assessment?.damages?.length || 0;
  const criticalDamages = activeProject?.assessment?.damages?.filter(d => d.level === "严重")?.length || 0;
  const totalSteps = activeProject?.conservationPlan?.technicalSteps?.length || 0;
  const totalSupervisions = activeProject?.supervisions?.length || 0;
  const alertSupervisions = activeProject?.supervisions?.filter(s => s.status === "限期整改")?.length || 0;

  return (
    <div className="flex h-screen w-full bg-[#FDFBF7] text-[#2C2C2C] font-sans overflow-hidden">
      
      {/* 1. SIDEBAR PANEL */}
      <aside className="w-80 bg-[#F5F2ED] border-r border-[#E5E0D8] flex flex-col h-full overflow-hidden select-none">
        
        {/* Title logo block */}
        <div className="p-6 border-b border-[#E5E0D8]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#5A5A40] text-white rounded-xl shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[#5A5A40] font-serif font-bold text-lg leading-tight tracking-wide">
                建筑保护辅助系统
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#8B7E66] mt-0.5 font-semibold">
                Heritage Conservation AI
              </p>
            </div>
          </div>
        </div>

        {/* Create new project trigger button */}
        <div className="p-4">
          <button 
            id="add-project-btn"
            onClick={() => setShowAddProject(true)}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#5A5A40] hover:bg-[#434330] text-[#FDFBF7] rounded-xl text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
          >
            <Plus className="w-4 h-4" />
            <span>登记历史保护建筑</span>
          </button>
        </div>

        {/* Project Selector Lists */}
        <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-4">
          <div className="px-2 text-[10px] uppercase tracking-wider text-[#8B7E66] font-bold mb-1">
            保护对象总览 ({projects.length})
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-[#8B7E66]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>载入项目中...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-4 border border-dashed border-[#E5E0D8] rounded-xl text-center text-xs text-[#8B7E66]">
              暂未注册建筑，请点击上方按钮录入。
            </div>
          ) : (
            projects.map((proj) => {
              const isSelected = proj.id === selectedProjectId;
              return (
                <div
                  id={`project-card-${proj.id}`}
                  key={proj.id}
                  onClick={() => {
                    setSelectedProjectId(proj.id);
                    setActiveTab("overview");
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected 
                      ? "bg-white border-[#5A5A40] shadow-md" 
                      : "bg-[#F5F2ED] hover:bg-[#EAE5DC] border-[#E5E0D8] hover:border-[#D0C9BD]"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h3 className="font-serif font-bold text-xs text-[#2C2C2C] line-clamp-1 leading-normal">
                      {proj.name}
                    </h3>
                  </div>

                  <div className="flex items-center text-[10px] text-[#8B7E66] space-x-1 mb-2">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{proj.location}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#8B7E66]">{proj.era}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      proj.status === "现状评估中" 
                        ? "bg-[#EAE6DF] text-[#8B7E66] border border-[#D5CFC6]"
                        : proj.status === "保护方案设计中"
                        ? "text-[#C36B4D] bg-[#FDF1EE] border border-[#F5DDD7]"
                        : "text-[#5A5A40] bg-[#EFF2E9] border border-[#DEE5D5]"
                    }`}>
                      {proj.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Static Logged in Expert User segment */}
        <div className="p-4 border-t border-[#E5E0D8] bg-[#EAE5DC]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#5A5A40] border-2 border-white flex items-center justify-center text-white font-serif font-bold text-xs">
              刘
            </div>
            <div>
              <p className="text-xs font-bold text-[#2C2C2C]">刘工 (专家级驻场)</p>
              <p className="text-[10px] text-[#8B7E66]">文化遗产一级评估审核人</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Dynamic header with targeted selected project block details */}
        <header className="h-20 border-b border-[#E5E0D8] bg-white flex items-center justify-between px-8 shrink-0">
          {activeProject ? (
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#F5F2ED] rounded-lg">
                <Compass className="w-5 h-5 text-[#5A5A40]" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#8B7E66] font-semibold">
                  Heritage conservation project target
                </p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-base font-serif font-bold text-[#5A5A40]">
                    {activeProject.name}
                  </h2>
                  <span className="text-xs text-[#8B7E66]">({activeProject.location})</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-[#8B7E66]">请选择或创建一个项目开始辅助保护</p>
            </div>
          )}

          {/* Quick sync & state button utilities */}
          <div className="flex items-center space-x-3">
            <button 
              id="refresh-btn"
              onClick={() => fetchProjects(selectedProjectId)}
              className="p-2 bg-[#F5F2ED] hover:bg-[#E5E0D8] rounded-full text-[#5A5A40] transition-colors focus:outline-none"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="hidden md:flex flex-col items-end text-right text-[10px] text-[#8B7E66] border-l border-[#E5E0D8] pl-3">
              <span>公元2026 监控总控台</span>
              <span className="font-mono text-[#5A5A40] font-semibold">● 数据库连接正常</span>
            </div>
          </div>
        </header>

        {/* Primary Project Details Workspace */}
        {activeProject ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#FDFBF7]">
            
            {/* Elegant Tab bar reflecting full-lifecycle phase: Overview -> Phase 1 -> Phase 2 -> Phase 3 */}
            <div className="bg-[#F5F2ED] px-8 py-2.5 border-b border-[#E5E0D8] flex items-center justify-between shrink-0">
              <nav className="flex space-x-1.5">
                <button
                  id="tab-overview"
                  onClick={() => setActiveTab("overview")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeTab === "overview"
                      ? "bg-white text-[#5A5A40] shadow-sm font-bold"
                      : "text-[#8B7E66] hover:bg-[#EAE5DC] hover:text-[#5A5A40]"
                  }`}
                >
                  项目全景概览
                </button>
                <button
                  id="tab-evaluation"
                  onClick={() => setActiveTab("evaluation")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center space-x-2 ${
                    activeTab === "evaluation"
                      ? "bg-white text-[#5A5A40] shadow-sm font-bold"
                      : "text-[#8B7E66] hover:bg-[#EAE5DC] hover:text-[#5A5A40]"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#E5E0D8] text-[9px] font-bold flex items-center justify-center text-[#5A5A40]">1</span>
                  <span>现状评估</span>
                </button>
                <button
                  id="tab-plan"
                  onClick={() => setActiveTab("plan")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center space-x-2 ${
                    activeTab === "plan"
                      ? "bg-white text-[#5A5A40] shadow-sm font-bold"
                      : "text-[#8B7E66] hover:bg-[#EAE5DC] hover:text-[#5A5A40]"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#E5E0D8] text-[9px] font-bold flex items-center justify-center text-[#5A5A40]">2</span>
                  <span>保护方案设计</span>
                </button>
                <button
                  id="tab-supervision"
                  onClick={() => setActiveTab("supervision")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center space-x-2 ${
                    activeTab === "supervision"
                      ? "bg-white text-[#5A5A40] shadow-sm font-bold"
                      : "text-[#8B7E66] hover:bg-[#EAE5DC] hover:text-[#5A5A40]"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-[#E5E0D8] text-[9px] font-bold flex items-center justify-center text-[#5A5A40]">3</span>
                  <span>施工及保护监督</span>
                </button>
              </nav>

              {/* Status bar indication */}
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-[#8B7E66]">项目管控状态:</span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-serif ${
                  activeProject.status === "现状评估中" 
                    ? "bg-[#EAE6DF] text-[#8B7E66] border border-[#D5CFC6]"
                    : activeProject.status === "保护方案设计中"
                    ? "text-[#C36B4D] bg-[#FDF1EE] border border-[#F5DDD7]"
                    : "text-[#5A5A40] bg-[#EFF2E9] border border-[#DEE5D5]"
                }`}>
                  {activeProject.status}
                </span>
              </div>
            </div>

            {/* MAIN INNER SCROLLER FRAME */}
            <div className="flex-1 overflow-y-auto p-8 animate-fade-in">
              
              {/* TOP MASTER METRICS INFO CARD (Show everywhere in overview or tab) */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 text-red-800 text-xs rounded-xl flex items-center space-x-2 border border-red-200">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SECTION: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Summary Bento Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm flex flex-col justify-between">
                      <div className="text-[10px] uppercase font-bold text-[#8B7E66] mb-3">建筑基本档案</div>
                      <div className="space-y-2">
                        <p className="text-xs text-[#2C2C2C]"><strong className="text-[#5A5A40]">建造年代: </strong>{activeProject.era}</p>
                        <p className="text-xs text-[#2C2C2C]"><strong className="text-[#5A5A40]">结构类型: </strong>{activeProject.structureType}</p>
                        <p className="text-xs text-[#2C2C2C]"><strong className="text-[#5A5A40]">立项时间: </strong>{new Date(activeProject.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="bg-[#F5F5F0] p-5 rounded-2xl border border-[#E5E0D8] shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] uppercase font-bold text-[#8B7E66]">Phase 1: 现状残损</span>
                        <span className="bg-[#5A5A40] text-white text-[9px] font-mono px-2 py-0.5 rounded-full">{totalDamages} 处登记</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-serif font-bold text-[#5A5A40]">{totalDamages}</p>
                        <p className="text-[11px] text-[#8B7E66]">其中严重等级残损点: <span className="font-bold text-[#C36B4D]">{criticalDamages}</span> 处</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("evaluation")}
                        className="mt-4 text-left text-xs font-bold text-[#5A5A40] hover:underline flex items-center"
                      >
                        <span>病害评估登记</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </div>

                    <div className="bg-[#F5F2ED] p-5 rounded-2xl border border-[#E5E0D8] shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] uppercase font-bold text-[#8B7E66]">Phase 2: 方案深度</span>
                        <span className="bg-[#C36B4D] text-white text-[9px] font-mono px-2 py-0.5 rounded-full">{totalSteps} 步保护技术</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-serif font-bold text-[#C36B4D]">¥ {activeProject.conservationPlan.budgetEstimate || "还未预算"} 万</p>
                        <p className="text-[11px] text-[#8B7E66]">规划设计人: {activeProject.conservationPlan.designedBy || "未设指定"}</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("plan")}
                        className="mt-4 text-left text-xs font-bold text-[#C36B4D] hover:underline flex items-center"
                      >
                        <span>编辑拟定方案</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] uppercase font-bold text-[#8B7E66]">Phase 3: 过程监督</span>
                        <span className="bg-red-500 text-white text-[9px] font-mono px-2 py-0.5 rounded-full">{totalSupervisions} 条监控</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-serif font-bold text-[#2C2C2C]">{totalSupervisions}</p>
                        <p className="text-[11px] text-[#8B7E66]">异常限期整改点: <span className="font-bold text-red-600">{alertSupervisions}</span> 次</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab("supervision")}
                        className="mt-4 text-left text-xs font-bold text-[#5A5A40] hover:underline flex items-center"
                      >
                        <span>看视巡检记录</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </div>
                  </div>

                  {/* High Quality Traditional Architecture Design Guideline overview */}
                  <div className="bg-white rounded-3xl p-6 border border-[#E5E0D8] shadow-sm">
                    <h3 className="text-base font-serif font-bold text-[#5A5A40] mb-3 flex items-center">
                      <ShieldCheck className="w-5 h-5 mr-2 text-[#5A5A40]" />
                      保护项目总纲 & 修缮原则
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                      <div className="p-3.5 bg-[#FBF9F5] rounded-xl border border-[#E5E0D8]">
                        <p className="font-bold text-xs text-[#5A5A40] mb-1">1. 安全性与原载荷</p>
                        <p className="text-[11px] text-[#8B7E66] leading-relaxed">在实施任何替换前必须对构件上部梁架结构卸荷物理支撑。不以临时刚化为由破坏整体结构弹性机制。</p>
                      </div>
                      <div className="p-3.5 bg-[#FBF9F5] rounded-xl border border-[#E5E0D8]">
                        <p className="font-bold text-xs text-[#5A5A40] mb-1">2. 最小物理干预</p>
                        <p className="text-[11px] text-[#8B7E66] leading-relaxed">保留完好的未腐化材料，仅对关键发生开裂糟朽局部进行微创墩接、配箍及加固锚结。</p>
                      </div>
                      <div className="p-3.5 bg-[#FBF9F5] rounded-xl border border-[#E5E0D8]">
                        <p className="font-bold text-xs text-[#5A5A40] mb-1">3. 可逆性技术选用</p>
                        <p className="text-[11px] text-[#8B7E66] leading-relaxed">首要选用天然材料作黏接勾砂缝。外加辅助结构后续可方便拆卸，绝不形成永久损毁残留。</p>
                      </div>
                      <div className="p-3.5 bg-[#FBF9F5] rounded-xl border border-[#E5E0D8]">
                        <p className="font-bold text-xs text-[#5A5A40] mb-1">4. 传统工艺延续</p>
                        <p className="text-[11px] text-[#8B7E66] leading-relaxed">坚持使用煮制糯米浆、桐油石灰、元宝缝等传统作法。严厉禁止施工队使用不相容硅酸盐灰色水泥。</p>
                      </div>
                    </div>
                  </div>

                  {/* Visual Status Timeline Progress Tracker */}
                  <div className="bg-white rounded-3xl p-6 border border-[#E5E0D8] shadow-sm text-center">
                    <h4 className="text-xs uppercase font-extrabold text-[#8B7E66] tracking-widest mb-6">全生命生命周期流程实时阶段进度</h4>
                    
                    <div className="relative flex flex-col md:flex-row justify-between items-center max-w-2xl mx-auto gap-4">
                      {/* Line connector in background */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#E5E0D8] -translate-y-1/2 hidden md:block z-0" />
                      
                      <div className="relative z-10 bg-white px-4 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-[#5A5A40] text-[#FDFBF7] flex items-center justify-center font-bold text-sm shadow-md">01</div>
                        <p className="text-xs font-serif font-bold text-[#5A5A40] mt-2">1. 现状病害评估</p>
                        <p className="text-[10px] text-[#8B7E66]">{totalDamages} 损伤点登记</p>
                      </div>

                      <div className={`relative z-10 bg-white px-4 flex flex-col items-center ${
                        activeProject.status === "现状评估中" ? "opacity-40" : ""
                      }`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                          activeProject.status !== "现状评估中" ? "bg-[#C36B4D] text-white" : "bg-[#F5F2ED] text-[#8B7E66] border border-[#E5E0D8]"
                        }`}>02</div>
                        <p className="text-xs font-serif font-bold text-[#2C2C2C] mt-2">2. 修复方案设计与AI评审</p>
                        <p className="text-[10px] text-[#8B7E66]">{totalSteps} 步优化细节</p>
                      </div>

                      <div className={`relative z-10 bg-white px-4 flex flex-col items-center ${
                        activeProject.status !== "保护过程监督中" ? "opacity-40" : ""
                      }`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                          activeProject.status === "保护过程监督中" ? "bg-green-700 text-white" : "bg-[#F5F2ED] text-[#8B7E66] border border-[#E5E0D8]"
                        }`}>03</div>
                        <p className="text-xs font-serif font-bold text-[#2C2C2C] mt-2">3. 现场施工环境监督</p>
                        <p className="text-[10px] text-[#8B7E66]">{totalSupervisions} 日巡回录入</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* SECTION: PHASE 1 -现状评估 */}
              {activeTab === "evaluation" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Form to Log Damage */}
                  <div className="lg:col-span-5 bg-[#F5F5F0] rounded-3xl p-6 border border-[#E5E0D8] shadow-inner">
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#E5E0D8] text-[#5A5A40] text-[10px] font-bold mb-2 uppercase tracking-widest">
                        Phase 01
                      </span>
                      <h3 className="text-[#5A5A40] font-serif font-bold text-lg">建筑现状评估病害登记</h3>
                      <p className="text-xs text-[#8B7E66]">登记建筑各部位裂缝、糟朽、变形情况，系统将调用大语言模型提供学术化的病理分析及材料处方。</p>
                    </div>

                    <form onSubmit={handleAddDamageAssessment} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#5A5A40] mb-1">构件位置 (如：第二层东北角立柱底、正吻)</label>
                        <input
                          id="dmg-part-input"
                          type="text"
                          required
                          value={newDmgPart}
                          onChange={(e) => setNewDmgPart(e.target.value)}
                          placeholder="例如: 正殿前中檐斗拱柱头"
                          className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2C2C2C]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#5A5A40] mb-1">病害残损类型</label>
                          <input
                            id="dmg-type-input"
                            type="text"
                            required
                            value={newDmgType}
                            onChange={(e) => setNewDmgType(e.target.value)}
                            placeholder="例如: 顺纹纵向通长劈裂"
                            className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2C2C2C]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#5A5A40] mb-1">残损评估等级</label>
                          <select
                            id="dmg-level-select"
                            value={newDmgLevel}
                            onChange={(e) => setNewDmgLevel(e.target.value)}
                            className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2C2C2C]"
                          >
                            <option value="轻度">轻度级病态 (仅需监测)</option>
                            <option value="中度">中度级残损 (常规治理)</option>
                            <option value="严重">严重级损伤 (紧急抢险)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#5A5A40] mb-1">病害尺寸、深度及表观破坏描述</label>
                        <textarea
                          id="dmg-desc-input"
                          required
                          rows={4}
                          value={newDmgDesc}
                          onChange={(e) => setNewDmgDesc(e.target.value)}
                          placeholder="例如：西北侧立柱根部大面积糟朽，深度约3.8厘米；并顺沿向上裂缝开裂1.2米，敲击呈明显空鼓，承受柱荷载异常，出现微小倾斜趋势。"
                          className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#5A5A40] text-[#2C2C2C] resize-none"
                        />
                      </div>

                      <button
                        id="diagnose-submit-btn"
                        type="submit"
                        disabled={aiLoading}
                        className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#434330] text-[#FDFBF7] rounded-xl text-xs font-bold shadow transition-colors flex items-center justify-center space-x-2"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>AI 智能测算病理及古建处方中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>登记并调用 AI 专家智能诊断</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Active Damage Cards List */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-serif font-bold text-[#5A5A40]">
                        已登记的部位和病害破坏档案 ({totalDamages})
                      </h4>
                      <span className="text-[11px] text-[#8B7E66]">审核师: {activeProject.assessment.assessor || "未派指定"}</span>
                    </div>

                    {!activeProject?.assessment?.damages || activeProject.assessment.damages.length === 0 ? (
                      <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-[#E5E0D8] text-xs text-[#8B7E66]">
                        目前无登记病害，请先在左侧录入第一处现状病损部位开始智能检测。
                      </div>
                    ) : (
                      activeProject.assessment.damages.map((dmg) => (
                        <div key={dmg.id} className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm space-y-4">
                          
                          {/* Heading summary */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-serif font-extrabold text-sm text-[#2C2C2C]">{dmg.part}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  dmg.level === "严重" 
                                    ? "bg-red-100 text-red-800 border border-red-200" 
                                    : dmg.level === "中度" 
                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-200" 
                                    : "bg-green-100 text-green-800 border border-green-200"
                                }`}>
                                  {dmg.level}残损
                                </span>
                              </div>
                              <p className="text-xs text-[#C36B4D] font-medium mt-1 font-mono">病害病名: {dmg.type}</p>
                            </div>
                            
                            {/* Run ai diagnosis button if missing */}
                            {!dmg.aiDiagnostic && (
                              <button
                                onClick={() => handleTriggerSingleDiagnose(dmg)}
                                disabled={aiLoading}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#EFF2E9] hover:bg-[#DEE5D5] text-[#5A5A40] text-[10px] rounded-lg font-bold border border-[#DEE5D5]"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
                                <span>补做 AI 诊断</span>
                              </button>
                            )}
                          </div>

                          {/* Raw User logged description */}
                          <div className="text-xs text-[#2C2C2C] bg-[#FBF9F5] p-3 rounded-xl border border-[#E5E0D8] leading-relaxed">
                            <span className="font-bold text-[#8B7E66] block text-[10px] uppercase mb-1">外展现状病害描述:</span>
                            {dmg.desc}
                          </div>

                          {/* Gemini Assisted Advanced Diagnostic output block */}
                          {dmg.aiDiagnostic && (
                            <div className="border border-[#CCD6C0] bg-[#EFF4EA] rounded-xl p-4 space-y-3">
                              <div className="flex justify-between items-center text-xs font-serif font-bold text-[#5A5A40] border-b border-[#CCD6C0] pb-2">
                                <span className="flex items-center">
                                  <Sparkles className="w-4 h-4 mr-1 text-[#5A5A40]" />
                                  文物局评估级 AI 病理智能诊断建议书
                                </span>
                                <span className="text-[10px] bg-white px-2 py-0.5 rounded text-[#8B7E66] font-mono">
                                  安全级别估算出: {dmg.aiDiagnostic.safetyRating}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <p className="font-bold text-[#5A5A40] mb-0.5">● 破坏分子物理/真菌退化机制:</p>
                                  <p className="text-[11px] text-[#2C2C2C] leading-relaxed">{dmg.aiDiagnostic.mechanisms}</p>
                                </div>
                                <div>
                                  <p className="font-bold text-[#5A5A40] mb-0.5">● 应循传统古法治本建议:</p>
                                  <p className="text-[11px] text-[#2C2C2C] leading-relaxed">{dmg.aiDiagnostic.traditionalRemedy}</p>
                                </div>
                              </div>

                              <div className="bg-white p-2.5 rounded-lg text-[10px] leading-normal border border-[#E5E0D8]">
                                <strong className="text-[#C36B4D]">📌 勘察支撑物理安全说明:</strong> {dmg.aiDiagnostic.notes}
                              </div>
                            </div>
                          )}

                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              {/* SECTION: PHASE 2 - 保护方案设计 */}
              {activeTab === "plan" && (
                <div className="space-y-6">
                  
                  {/* Master info planner config cards */}
                  <div className="bg-white p-6 rounded-3xl border border-[#E5E0D8] shadow-sm flex flex-wrap justify-between items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-serif font-bold text-[#5A5A40]">修缮施工总体预算与设计方签名</h3>
                      <p className="text-xs text-[#8B7E66]">配置保护工程的负责单位、大规划估算，锁死之后自动进驻至 Phase 3 施工期。</p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#8B7E66] mb-1">设计规划师/单位</label>
                        <input 
                          type="text"
                          value={planDesigner}
                          onChange={(e) => setPlanDesigner(e.target.value)}
                          placeholder="例如: 园林古建筑研究院"
                          className="bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-[#8B7E66] mb-1">总经费估算 (万元)</label>
                        <input 
                          type="number"
                          value={planBudget}
                          onChange={(e) => setPlanBudget(Number(e.target.value))}
                          placeholder="预算"
                          className="w-24 bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] focus:outline-none"
                        />
                      </div>

                      {/* LOCK DESIGN PLAN ACTION */}
                      <button
                        onClick={handleApproveAndPublishPlan}
                        className="py-2.5 px-5 bg-[#C36B4D] hover:bg-[#A95034] text-white rounded-xl text-xs font-bold transition-colors shadow-md mt-4"
                      >
                        批准方案并开启在场监督
                      </button>
                    </div>
                  </div>

                  {/* Design Steps columns layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Add Custom Step Node (Form) */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#D5D0C6] shadow-sm">
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 rounded-full bg-[#E5E0D8] text-[#5A5A40] text-[10px] font-bold mb-2 uppercase tracking-widest">
                          Phase 02
                        </span>
                        <h4 className="text-sm font-serif font-bold text-[#5A5A40]">添加/构拟现场保护施工工艺步法</h4>
                        <p className="text-xs text-[#8B7E66] mt-1">
                          您可以选择快速应用下方的传统矿物/木柴修缮配料预置，也可以自己输入规格。
                        </p>
                      </div>

                      {/* Material Presets Quick Select Grid */}
                      <div className="mb-4 bg-[#F9F7F3] p-3 rounded-xl border border-[#E5E0D8]">
                        <p className="text-[10px] uppercase font-bold text-[#8B7E66] mb-2">快速应用传统复原配方套件:</p>
                        <div className="flex flex-col gap-1.5">
                          {materialPresets.map((preset, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => applyPresetMaterial(preset)}
                              className="text-left text-[11px] px-2.5 py-1.5 bg-white hover:bg-[#EAE5DC] text-[#2C2C2C] rounded-lg border border-[#E5E0D8] truncate font-medium transition-colors"
                            >
                              ⚙️ {preset.n} ({preset.t})
                            </button>
                          ))}
                        </div>
                      </div>

                      <form onSubmit={handleAddPlanStep} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">受修部位名称 (如：西北根柱)</label>
                          <input
                            type="text"
                            required
                            value={newStepElement}
                            onChange={(e) => setNewStepElement(e.target.value)}
                            placeholder="修补点及位置"
                            className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">拟采维修工艺</label>
                          <input
                            type="text"
                            required
                            value={newStepTechnique}
                            onChange={(e) => setNewStepTechnique(e.target.value)}
                            placeholder="例如: 扁销落叶松墩接法"
                            className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">修缮配料选用/陈化比例</label>
                          <input
                            type="text"
                            required
                            value={newStepMaterials}
                            onChange={(e) => setNewStepMaterials(e.target.value)}
                            placeholder="例如: 消石灰、火山灰磨粉、石英河砂"
                            className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">施工工法与强度规格约束标准</label>
                          <textarea
                            rows={3}
                            value={newStepSpec}
                            onChange={(e) => setNewStepSpec(e.target.value)}
                            placeholder="例如: 熟石灰水沉化期不小于90日；大漆生漆中均匀注入麻灰捣密。不掺水灰，硬度保持适中。"
                            className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs focus:outline-none resize-none text-[#2C2C2C]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={aiLoading}
                          className="w-full py-2.5 bg-[#C36B4D] hover:bg-[#A95034] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-2"
                        >
                          {aiLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>AI 专家深度复核分析技术配比中...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>添加方案步骤并经由 AI 精准优化</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Right list: Already designed steps */}
                    <div className="lg:col-span-7 space-y-4">
                      <h4 className="text-sm font-serif font-bold text-[#5A5A40]">
                        历史工艺节点修缮复原技术清单 ({totalSteps})
                      </h4>

                      {!activeProject?.conservationPlan?.technicalSteps || activeProject.conservationPlan.technicalSteps.length === 0 ? (
                        <div className="bg-[#FAF8F5] p-12 text-center rounded-2xl border border-[#E5E0D8] text-xs text-[#8B7E66]">
                          此项目暂未登记修缮步骤方案，请选择左侧传统预置砂浆、原木或者手写录入一键开始。
                        </div>
                      ) : (
                        activeProject.conservationPlan.technicalSteps.map((step) => (
                          <div key={step.id} className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] uppercase bg-[#E5E0D8] font-bold text-[#5A5A40] px-2 py-0.5 rounded mr-1">
                                  节点件: {step.element}
                                </span>
                                <h5 className="font-serif font-extrabold text-xs text-[#2C2C2C] mt-2">
                                  采用工艺: {step.technique}
                                </h5>
                              </div>

                              {!step.aiOptimizedTip && (
                                <button
                                  onClick={() => handleTriggerSinglePlanOptimize(step)}
                                  className="text-[10px] text-[#5A5A40] bg-[#EFF2E9] border border-[#DEE5D5] px-2 py-1 rounded hover:bg-[#DEE5D5] font-bold flex items-center shrink-0"
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  AI 重新复核
                                </button>
                              )}
                            </div>

                            <p className="text-xs text-[#8B7E66] font-medium font-mono">
                              🛠️ 配比及用材: {step.materials}
                            </p>
                            
                            {step.specification && (
                              <div className="text-xs text-[#2C2C2C] bg-[#FBF9F5] p-3 rounded-lg border border-[#E5E0D8]">
                                <strong className="text-[10px] uppercase text-[#8B7E66] block">原本技术标准:</strong>
                                {step.specification}
                              </div>
                            )}

                            {/* Optimization Advice card from model parameters */}
                            {step.aiOptimizedTip && (
                              <div className="border border-[#CCD6C0] bg-[#EFF4EA] p-4 rounded-xl space-y-3 mt-2">
                                <p className="text-xs font-serif font-extrabold text-[#5A5A40] flex items-center">
                                  <Sparkles className="w-4 h-4 mr-1 text-[#5A5A40]" />
                                  AI 文保准则专家组优化指示意见:
                                </p>

                                {typeof step.aiOptimizedTip === "string" ? (
                                  <p className="text-[11px] leading-relaxed text-[#2C2C2C]">{step.aiOptimizedTip}</p>
                                ) : (
                                  <>
                                    <div className="text-[11px] text-[#2C2C2C] space-y-1.5">
                                      <p className="font-bold text-[#5A5A40]">● 水化养护与配比指标标准要求 (Craftsmanship):</p>
                                      <p className="text-[11px] leading-relaxed">{step.aiOptimizedTip.craftRequirement}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-[11px] pt-1">
                                      <div>
                                        <p className="font-bold text-[#5A5A40] mb-0.5">● 近代大跨结构/力学校验:</p>
                                        <p className="text-[10px] text-[#2C2C2C] leading-normal">{step.aiOptimizedTip.structuralCheck}</p>
                                      </div>
                                      <div>
                                        <p className="font-bold text-[#5A5A40] mb-0.5">● 现代科技聚合物相容准入:</p>
                                        <p className="text-[10px] text-[#2C2C2C] leading-normal">{step.aiOptimizedTip.modernMaterialsAcceptable}</p>
                                      </div>
                                    </div>

                                    {step.aiOptimizedTip.optimizedSteps && Array.isArray(step.aiOptimizedTip.optimizedSteps) && step.aiOptimizedTip.optimizedSteps.length > 0 && (
                                      <div className="bg-white p-2.5 rounded text-[10px] border border-[#CCD6C0]">
                                        <p className="font-bold text-[#C36B4D] mb-1">🔍 现场关键控制路径 (Key Points):</p>
                                        <ul className="list-disc pl-4 space-y-0.5 text-[#2C2C2C]">
                                          {step.aiOptimizedTip.optimizedSteps.map((opt, i) => (
                                            <li key={i}>{opt}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                          </div>
                        ))
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* SECTION: PHASE 3 - 保护过程监督 */}
              {activeTab === "supervision" && (
                <div className="space-y-6">
                  
                  {activeProject.status !== "保护过程监督中" && !activeProject.conservationPlan.approvedDate ? (
                    <div className="p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3">
                      <AlertTriangle className="w-10 h-10 mx-auto text-amber-600" />
                      <h4 className="text-base font-serif font-bold text-amber-900">保护方案尚未发布。目前还不能录入现场监理巡检报告。</h4>
                      <p className="text-xs text-amber-800 max-w-md mx-auto">
                        为了保护程序的正规和严谨性，施工现场一切开工必须建立在已有完整保护方案之上。请先回至「Phase 2 保护方案设计」配置并点击「批准方案并开启在场监督」激活施工过程监督控制！
                      </p>
                      <button
                        onClick={() => setActiveTab("plan")}
                        className="mt-2 py-2 px-4 bg-[#C36B4D] hover:bg-[#A95034] text-white rounded-xl text-xs font-bold transition-all"
                      >
                        去配置并审批保护设计
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left side: reporting site incidents / logs */}
                      <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E5E0D8] shadow-sm">
                        <div className="mb-4">
                          <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-[10px] font-bold rounded-full mb-1 uppercase tracking-widest">
                            Live Inspector
                          </span>
                          <h4 className="text-sm font-serif font-bold text-[#5A5A40]">填报工地现场监理巡检日志</h4>
                        </div>

                        <form onSubmit={handleAddSupervisionLog} className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">巡查验收节点/工序</label>
                              <input
                                type="text"
                                required
                                value={newSupNode}
                                onChange={(e) => setNewSupNode(e.target.value)}
                                placeholder="如: 墩接拼口隐蔽工程"
                                className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">驻场记录员</label>
                              <input
                                type="text"
                                value={newSupInspector}
                                onChange={(e) => setNewSupInspector(e.target.value)}
                                placeholder="例如: 陈洋行"
                                className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">合格状态判定</label>
                            <select
                              value={newSupStatus}
                              onChange={(e) => setNewSupStatus(e.target.value)}
                              className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] focus:outline-none"
                            >
                              <option value="合格">合格批准 (完美切合非水泥矿物工艺)</option>
                              <option value="限期整改">限期整改 (发现工艺偏差/混用水泥/未卸荷)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-[#5A5A40] mb-0.5">现场实况与材料违规操作描述</label>
                            <textarea
                              rows={4}
                              required
                              value={newSupIssues}
                              onChange={(e) => setNewSupIssues(e.target.value)}
                              placeholder="例如: 监理到场巡查时，发现施工工人为了追求快速硬化，私自在已经风干的消石灰砂浆中掺混了部分外购的普通水泥，比例约占15%。导致凝固砂浆呈灰色突兀、由于水泥膨胀硬度高，严重不透风不合文物准则。"
                              className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs text-[#2C2C2C] focus:outline-none resize-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={aiLoading}
                            className="w-full py-2.5 bg-[#5A5A40] hover:bg-[#434330] text-[#FDFBF7] rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2"
                          >
                            {aiLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>AI 文保规章法律合规审计中...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>提呈并由 AI 审查开出纠偏整改令</span>
                              </>
                            )}
                          </button>
                        </form>
                      </div>

                      {/* Right list: Already logged inspection warnings */}
                      <div className="lg:col-span-7 space-y-4">
                        <h4 className="text-sm font-serif font-bold text-[#5A5A40]">现场安全红线巡视日志 ({totalSupervisions})</h4>

                        {!activeProject?.supervisions || activeProject.supervisions.length === 0 ? (
                          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-[#E5E0D8] text-xs text-[#8B7E66]">
                            在开工期间，暂未发现违规或任何质量巡视上报记录。施工正常。
                          </div>
                        ) : (
                          activeProject.supervisions.map((sup) => (
                            <div key={sup.id} className="bg-white p-5 rounded-2xl border border-[#E5E0D8] shadow-sm space-y-3">
                              
                              <div className="flex justify-between items-center bg-[#FBF9F5] p-2 rounded-lg border border-[#E5E0D8]">
                                <div className="text-xs">
                                  <span className="font-bold text-[#5A5A40]">工序: [ {sup.nodeName} ]</span>
                                  <span className="text-[10px] text-[#8B7E66] ml-2">({sup.date})</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  sup.status === "合格"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800 animate-pulse"
                                }`}>
                                  {sup.status}
                                </span>
                              </div>

                              <div className="text-xs leading-normal">
                                <strong className="text-[#8B7E66] block text-[10px] mb-0.5">工况/违规缺陷行为记录 (监工 {sup.inspector}):</strong>
                                <p className="text-[#2C2C2C]">{sup.issueDesc}</p>
                              </div>

                              {/* AI Law and compliance action warnings */}
                              {sup.onSiteWarning && (
                                <div className="border border-red-200 bg-red-50 p-4 rounded-xl space-y-2">
                                  <div className="flex justify-between items-center border-b border-red-200 pb-1.5 text-xs font-bold text-red-950">
                                    <span className="flex items-center">
                                      <AlertTriangle className="w-4 h-4 mr-1 text-red-600" />
                                      AI 联合文物局古建监督审计判定:
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-bold">
                                      {sup.onSiteWarning.alertLevel}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-red-950 space-y-2">
                                    <div>
                                      <strong className="text-red-900 block font-serif font-bold">● 长周期隐形破坏与碱化剥蚀物理危害:</strong>
                                      <p className="leading-relaxed mt-0.5">{sup.onSiteWarning.hazardAnalysis}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-red-200 text-xs">
                                      <strong className="text-red-700 block font-bold mb-1">🛠️ 古建监理权威限期整改令:</strong>
                                      <p className="text-red-950 leading-relaxed font-serif">{sup.onSiteWarning.rectificationInstruction}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Bottom beautiful regulatory footer */}
            <footer className="h-12 bg-[#F5F2ED] border-t border-[#E5E0D8] px-8 flex items-center justify-between shrink-0 select-none text-[10px] text-[#8B7E66]">
              <div className="flex items-center space-x-3">
                <span>数字化最后测绘标本更新: {new Date().toLocaleDateString()}</span>
                <span className="h-3 w-px bg-[#E5E0D8]"></span>
                <span className="text-[#5A5A40] font-bold">● 文物数字档案馆总库直连端</span>
              </div>
              <span>© {new Date().getFullYear()} 中国历史古迹保护多阶段智能决策辅助监管系统</span>
            </footer>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7] text-center p-8">
            <Building2 className="w-16 h-16 text-[#8B7E66] mb-4 animate-bounce" />
            <h3 className="font-serif font-bold text-lg text-[#5A5A40]">暂未选择建筑保护项目</h3>
            <p className="text-xs text-[#8B7E66] mt-1 max-w-sm">
              古建筑是有生命的，需要我们用科学、严谨、符合文物保护准则的高效流程去呵护。点击左上角「登记历史保护建筑」开启您的全生命流程现状评估之旅吧。
            </p>
          </div>
        )}

      </main>

      {/* 3. modal dialog to register new preservation targets */}
      {showAddProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FDFBF7] rounded-3xl border border-[#E5E0D8] max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-[#2C2C2C]">
            <div className="flex justify-between items-center border-b border-[#E5E0D8] pb-3">
              <h3 className="font-serif font-bold text-base text-[#5A5A40]">登记录入新的历史保护建筑</h3>
              <button 
                onClick={() => setShowAddProject(false)}
                className="p-1 hover:bg-[#F5F2ED] rounded-full text-[#8B7E66]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5A5A40] mb-1">历史文物/古建筑/历史街区主体名称</label>
                <input
                  id="new-proj-name-input"
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="例如: 嘉兴南湖烟雨楼大雄宝殿梁架部"
                  className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5A5A40] mb-1">地理及所属行政规划位置</label>
                <input
                  id="new-proj-loc-input"
                  type="text"
                  required
                  value={newProjLoc}
                  onChange={(e) => setNewProjLoc(e.target.value)}
                  placeholder="例如: 浙江省嘉兴市南湖区"
                  className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5A5A40] mb-1">建造所属历史朝代/年份</label>
                  <select
                    id="new-proj-era-select"
                    value={newProjEra}
                    onChange={(e) => setNewProjEra(e.target.value)}
                    className="w-full bg-white border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    <option value="宋代 (辽金契丹辽金式)">宋代 (辽金契丹辽金式)</option>
                    <option value="元代 (粗犷简率柱起式)">元代 (粗犷简率柱起式)</option>
                    <option value="明代 (抬梁斗拱规整式)">明代 (抬梁斗拱规整式)</option>
                    <option value="清代 (公元1644-1912年)">清代 (公元1644-1912年)</option>
                    <option value="二十世纪早期 (民国西式清水洋大楼)">二十世纪早期 (民国西式清水洋大楼)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5A5A40] mb-1">木构/砌体结构类型</label>
                  <input
                    id="new-proj-struct-input"
                    type="text"
                    required
                    value={newProjStructure}
                    onChange={(e) => setNewProjStructure(e.target.value)}
                    placeholder="例如: 多檐纯木穿斗抬梁构架"
                    className="w-full bg-[#F5F2ED] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddProject(false)}
                  className="px-4 py-2 hover:bg-[#F5F2ED] text-xs font-bold rounded-xl text-[#8B7E66]"
                >
                  取消
                </button>
                <button
                  id="new-proj-submit"
                  type="submit"
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#434330] text-white text-xs font-bold rounded-xl shadow"
                >
                  确认档案注册
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
