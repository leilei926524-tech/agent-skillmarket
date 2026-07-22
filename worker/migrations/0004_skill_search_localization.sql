ALTER TABLE skills ADD COLUMN search_aliases_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE skills ADD COLUMN localizations_json TEXT NOT NULL DEFAULT '{}';

UPDATE skills SET
  search_aliases_json = json_array('定价', '价格', '折扣', '报价', '销售审批', '合同折扣', 'discount approval', 'deal desk'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '销售折扣审批规则',
    'description', '根据折扣比例、合同金额、期限和预付款条件，给出批准、还价或升级审批的确定结果。',
    'category', '销售运营',
    'riskSummary', '由 GOKUI 维护的确定性示例，不会调用外部工具，也不需要账号或密钥。'
  ))
WHERE slug = 'deal-desk-discount-guardrails';

UPDATE skills SET
  search_aliases_json = json_array('发票', '开票', '跨境账单', '付款条款', '对账', '财务清单', 'invoice checklist', 'payment terms'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '跨境发票检查清单',
    'description', '根据跨境服务账单生成文件与付款条款清单，不替代法律或税务建议。',
    'category', '财务运营',
    'riskSummary', '由 GOKUI 维护的操作清单，不会调用外部工具；输出不构成法律或税务建议。'
  ))
WHERE slug = 'cross-border-invoice-checklist';

UPDATE skills SET
  search_aliases_json = json_array('风控', '安全', '注入', '提示词攻击', '提示词注入', '越权', '指令劫持', 'prompt injection', 'agent safety'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '提示词注入检查',
    'description', '在不可信文本进入 Agent 前，识别指令劫持、凭证套取和破坏性操作等常见风险。',
    'category', '安全',
    'riskSummary', '由 GOKUI 维护的启发式检查，只识别常见模式，不能替代完整安全审查。'
  ))
WHERE slug = 'prompt-injection-triage';

UPDATE skills SET
  search_aliases_json = json_array('用户研究', '客户研究', '用户访谈', '客户访谈', '访谈', '客户声音', '为什么不购买', '购买原因', '需求洞察', 'customer interviews', 'voice of customer'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '客户研究',
    'description', '从访谈、评论、客服对话和公开社区资料中提炼客户原话、真实需求与购买动机。',
    'category', '研究',
    'riskSummary', '说明与参考资料型 Skill。在线研究仍需核验来源，并妥善处理访谈和客户资料。'
  ))
WHERE slug = 'customer-research';

UPDATE skills SET
  search_aliases_json = json_array('文案', '营销文案', '网站文案', '落地页', '转化', '定位', '写文案', 'landing page copy', 'conversion copy'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '转化文案写作',
    'description', '围绕受众、价值、证据、顾虑和下一步行动，撰写或重构网站与落地页文案。',
    'category', '营销',
    'riskSummary', '说明与参考资料型 Skill。发布前仍需人工核对事实、证据与承诺。'
  ))
WHERE slug = 'conversion-copywriting';

UPDATE skills SET
  search_aliases_json = json_array('埋点', '数据分析', '事件追踪', '转化追踪', '归因', 'ga4', 'gtm', '产品分析', 'analytics plan', 'tracking plan'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '数据埋点方案',
    'description', '为 GA4、GTM、Segment、Mixpanel 等工具设计事件、转化、归因和验收方案。',
    'category', '数据分析',
    'riskSummary', '规划本身风险较低，但实际接入分析工具可能改动生产埋点并向第三方传输用户数据。'
  ))
WHERE slug = 'analytics-tracking-plan';

UPDATE skills SET
  search_aliases_json = json_array('网站质量', '网页质量', '网站检查', '网站审计', '性能', '可访问性', 'seo', 'lighthouse', 'web audit'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '网站质量全面检查',
    'description', '按照 Lighthouse 导向的清单检查网站性能、可访问性、SEO 和现代 Web 实践。',
    'category', '网站质量',
    'riskSummary', '包含一个已审查、只读取本地 HTML 的脚本；运行任何附带脚本前仍应先查看内容。'
  ))
WHERE slug = 'web-quality-audit';

UPDATE skills SET
  search_aliases_json = json_array('react 性能', 'next.js 性能', '前端性能', '渲染性能', '重渲染', '打包体积', 'bundle', 'react optimization'),
  localizations_json = json_object('zh-CN', json_object(
    'title', 'React 性能指南',
    'description', '应用 Vercel 工程实践，按优先级优化 React 与 Next.js 的数据请求、打包、渲染和重渲染。',
    'category', 'Web 开发',
    'riskSummary', '说明与参考资料型 Skill；已审版本没有需要自动执行的外部脚本。'
  ))
WHERE slug = 'vercel-react-best-practices';

UPDATE skills SET
  search_aliases_json = json_array('react 架构', '组件设计', '组件组合', '复合组件', '状态提升', 'react 19', 'composition patterns', 'compound components'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '可扩展的 React 组件组合',
    'description', '使用复合组件、状态提升、明确变体和 React 19 模式，把僵硬组件重构为灵活 API。',
    'category', 'Web 开发',
    'riskSummary', '说明与参考资料型 Skill；已审版本无需联网拉取或执行外部工具。'
  ))
WHERE slug = 'vercel-composition-patterns';

UPDATE skills SET
  search_aliases_json = json_array('前端设计', '网页设计', '界面设计', '视觉设计', '字体', '排版', 'ui 设计', 'frontend design'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '有辨识度的前端设计',
    'description', '通过明确的视觉系统、字体、布局和标志性细节，避免千篇一律的模板式界面。',
    'category', '设计',
    'riskSummary', '说明型 Skill。它会建议修改界面代码与视觉素材，应用到生产前应预览并人工复核。'
  ))
WHERE slug = 'distinctive-frontend-design';

UPDATE skills SET
  search_aliases_json = json_array('mcp', 'mcp server', 'mcp 服务', 'agent 工具', '工具服务', 'api 集成', '模型上下文协议', 'tool integration'),
  localizations_json = json_object('zh-CN', json_object(
    'title', 'MCP 服务构建指南',
    'description', '指导外部 API 与服务的 MCP Server 设计、实现、测试和评估。',
    'category', 'Agent 基础设施',
    'riskSummary', '会指导创建可访问外部 API 的服务。必须限制工具权限、保护凭证，并在部署前审查代码。'
  ))
WHERE slug = 'mcp-server-builder';

UPDATE skills SET
  search_aliases_json = json_array('代码审查', '安全审查', '变更审查', '差异审查', '攻击面', 'blast radius', 'security review', 'git diff'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '代码变更安全审查',
    'description', '结合风险、历史、测试覆盖、影响范围和攻击场景，集中审查真正危险的代码变更。',
    'category', '安全',
    'riskSummary', '需要读取仓库、运行 shell 并写入报告。用于风险审查，不应在含敏感代码的环境中盲目运行。'
  ))
WHERE slug = 'differential-security-review';

UPDATE skills SET
  search_aliases_json = json_array('供应链安全', '依赖审计', '依赖风险', 'npm 风险', '软件包风险', 'dependency audit', 'supply chain security'),
  localizations_json = json_object('zh-CN', json_object(
    'title', '软件供应链风险检查',
    'description', '根据维护状态、所有权、使用量、发布记录和高风险能力，找出需要深入审查的依赖。',
    'category', '安全',
    'riskSummary', '需要读取仓库、运行 shell 并写入报告。它只做风险筛选，不等于主动漏洞扫描。'
  ))
WHERE slug = 'supply-chain-risk-auditor';

UPDATE skills SET
  search_aliases_json = json_array('可观测性', 'agent 监控', 'llm 监控', '模型延迟', 'token 成本', '调用追踪', '链路追踪', 'agent observability'),
  localizations_json = json_object('zh-CN', json_object(
    'title', 'LLM 与 Agent 可观测性',
    'description', '利用 Elastic 中已有数据调查模型延迟、Token 成本、回答质量、调用链和多步 Agent 工作流。',
    'category', '可观测性',
    'riskSummary', '需要读取 Elastic 中的遥测数据。应使用只读权限，并避免把提示词、用户内容或凭证写入报告。'
  ))
WHERE slug = 'llm-agent-observability';

UPDATE skills SET
  search_aliases_json = json_array('rag', '检索增强', '向量检索', 'nvidia rag', 'rag 部署', 'ai 基础设施', '知识库问答', 'retrieval augmented generation'),
  localizations_json = json_object('zh-CN', json_object(
    'title', 'NVIDIA RAG 部署指南',
    'description', '处理 NVIDIA RAG Blueprint 的部署、配置、排障、评估和日常运维。',
    'category', 'AI 工程',
    'riskSummary', '可能涉及 shell、容器、云服务与生产配置。运行命令和修改基础设施前必须人工确认。'
  ))
WHERE slug = 'nvidia-rag-blueprint';
