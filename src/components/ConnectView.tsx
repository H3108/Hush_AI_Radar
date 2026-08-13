import React, { useState, useEffect } from 'react';
import { BookOpen, Check, Code, Copy, Cpu, ExternalLink, Globe, Rss, Terminal, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ConnectViewProps {
  initialTab?: 'rss' | 'api' | 'skill';
}

export const ConnectView: React.FC<ConnectViewProps> = ({ initialTab = 'rss' }) => {
  const [activeTab, setActiveTab] = useState<'rss' | 'api' | 'skill'>(initialTab);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const rssUrl = `${baseUrl}/rss.xml`;

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const pythonSnippet = `import requests

# Query Hush AI Radar Open API (v1) for real-time AI signals
res = requests.get("${baseUrl}/api/v1/signals/latest", params={
    "limit": 10,
    "category": "all"
})
data = res.json()

for sig in data["signals"]:
    print(f"[{sig['heatScore']}🔥] {sig['title']} ({sig['source']})")`;

  const curlSignals = `curl -X GET "${baseUrl}/api/v1/signals/latest?limit=20" \\
  -H "Accept: application/json"`;

  const curlClusters = `curl -X GET "${baseUrl}/api/v1/clusters/latest" \\
  -H "Accept: application/json"`;

  const claudeCodeSkill = `{
  "name": "hush-ai-radar",
  "description": "Fetch real-time zero-noise AI intelligence, frontier LLM updates, and research papers",
  "endpoint": "${baseUrl}/api/v1/signals/latest",
  "method": "GET"
}`;

  const cursorRule = `# Hush AI Radar Integration Rule
Always consult the Hush AI Radar API for latest AI models and breaking research:
GET ${baseUrl}/api/v1/signals/latest?limit=10`;

  const openApiYaml = `openapi: 3.1.0
info:
  title: Hush AI Radar Intelligence Skill
  version: 1.1.0
  description: Real-time AI radar open API & skill endpoints for AI agents.
servers:
  - url: ${baseUrl}
paths:
  /api/v1/signals/latest:
    get:
      summary: Fetch latest approved AI intelligence signals
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
        - name: category
          in: query
          schema: { type: string, enum: [all, giants, opensource, paper, product, media] }
      responses:
        '200':
          description: List of high-heat signals.
  /api/v1/clusters/latest:
    get:
      summary: Fetch real-time grouped event clusters
  /api/v1/models/latest:
    get:
      summary: Fetch curated model and ArXiv paper entries`;

  return (
    <div className="flex-1 p-4 bg-[#0B0D10] space-y-4 overflow-y-auto max-h-[calc(100vh-140px)] font-mono-code">
      {/* Top Header & Sub Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#1E232D] pb-3">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-[#A855F7]" />
            <span>{t.groupConnect || 'CONNECT 开放连接中心'}</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            External API, RSS Feed Subscription, and AI Agent Skill Interfaces.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-[#12151B] p-1 border border-[#1E232D] rounded text-xs">
          <button
            onClick={() => setActiveTab('rss')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rss'
                ? 'bg-[#F97316]/20 text-[#F97316] font-bold border border-[#F97316]/40'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            <span>{t.navRssFeed || 'RSS Feed'}</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'api'
                ? 'bg-[#06B6D4]/20 text-[#06B6D4] font-bold border border-[#06B6D4]/40'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>{t.navOpenApi || 'Open API'}</span>
          </button>

          <button
            onClick={() => setActiveTab('skill')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'skill'
                ? 'bg-[#A855F7]/20 text-[#A855F7] font-bold border border-[#A855F7]/40'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t.navAgentSkill || 'Agent Skill'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RSS FEED */}
      {activeTab === 'rss' && (
        <div className="space-y-4">
          <div className="bg-[#12151B] border border-[#1E232D] rounded p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
              <div className="flex items-center gap-2">
                <Rss className="w-5 h-5 text-[#F97316]" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">RSS 2.0 Feed Subscription</h3>
                  <span className="text-xs text-[#6B7280]">Standard RSS XML for Feed Readers & Automation Daemons</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold">
                LIVE XML
              </span>
            </div>

            {/* RSS Link Box */}
            <div className="p-3 bg-[#0B0D10] border border-[#1E232D] rounded flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#D1D5DB] overflow-x-auto w-full">
                <Globe className="w-4 h-4 text-[#F97316] flex-shrink-0" />
                <span className="text-[#9CA3AF]">Endpoint:</span>
                <span className="text-[#10B981] font-bold underline select-all">{rssUrl}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleCopy(rssUrl, 'rss_url')}
                  className="px-3 py-1.5 bg-[#1E232D] hover:bg-[#2B3545] text-white rounded text-xs flex items-center gap-1.5 cursor-pointer border border-[#2B3545]"
                >
                  {copiedSection === 'rss_url' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'rss_url' ? t.copied : 'Copy Feed Link'}</span>
                </button>

                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-[#F97316]/20 text-[#F97316] hover:bg-[#F97316]/30 border border-[#F97316]/40 rounded text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open RSS XML</span>
                </a>
              </div>
            </div>

            {/* Supported Readers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-[#9CA3AF]">
              <div className="p-2.5 bg-[#0B0D10] border border-[#1E232D] rounded text-center">
                <div className="text-white font-bold">NetNewsWire</div>
                <div className="text-[10px] text-[#6B7280]">macOS / iOS</div>
              </div>
              <div className="p-2.5 bg-[#0B0D10] border border-[#1E232D] rounded text-center">
                <div className="text-white font-bold">Feedly</div>
                <div className="text-[10px] text-[#6B7280]">Web / Mobile</div>
              </div>
              <div className="p-2.5 bg-[#0B0D10] border border-[#1E232D] rounded text-center">
                <div className="text-white font-bold">Reeder 5</div>
                <div className="text-[10px] text-[#6B7280]">Apple Ecosystem</div>
              </div>
              <div className="p-2.5 bg-[#0B0D10] border border-[#1E232D] rounded text-center">
                <div className="text-white font-bold">Readwise Reader</div>
                <div className="text-[10px] text-[#6B7280]">AI Document Hub</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPEN API */}
      {activeTab === 'api' && (
        <div className="space-y-4">
          <div className="bg-[#12151B] border border-[#1E232D] rounded p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#06B6D4]" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Hush AI Radar Open API (v1)</h3>
                  <span className="text-xs text-[#6B7280]">Public JSON Endpoints for AI Agents & Custom Dashboard Widgets</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 font-bold">
                NO API KEY REQUIRED
              </span>
            </div>

            {/* Endpoints Table */}
            <div className="space-y-3">
              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#10B981]/20 text-[#10B981] font-bold rounded text-[10px]">GET</span>
                    <span className="text-white font-bold">/api/v1/signals/latest</span>
                  </div>
                  <span className="text-[#6B7280] text-[11px]">Latest AI intelligence signals</span>
                </div>
                <p className="text-[11px] text-[#9CA3AF]">
                  Query parameters: <code className="text-[#06B6D4]">limit</code> (default 20), <code className="text-[#06B6D4]">category</code> (all, giants, opensource, paper, product, media).
                </p>
              </div>

              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#10B981]/20 text-[#10B981] font-bold rounded text-[10px]">GET</span>
                    <span className="text-white font-bold">/api/v1/clusters/latest</span>
                  </div>
                  <span className="text-[#6B7280] text-[11px]">Active grouped event clusters</span>
                </div>
              </div>

              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-[#10B981]/20 text-[#10B981] font-bold rounded text-[10px]">GET</span>
                    <span className="text-white font-bold">/api/v1/models/latest</span>
                  </div>
                  <span className="text-[#6B7280] text-[11px]">Curated model & ArXiv database entries</span>
                </div>
              </div>
            </div>

            {/* cURL Commands */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#06B6D4]">
                  <span className="font-bold">cURL Signals Request</span>
                  <button
                    onClick={() => handleCopy(curlSignals, 'curl_sig')}
                    className="text-[#9CA3AF] hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedSection === 'curl_sig' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'curl_sig' ? t.copied : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-[#12151B] border border-[#1E232D] rounded text-[11px] text-[#10B981] overflow-x-auto">
                  {curlSignals}
                </pre>
              </div>

              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#06B6D4]">
                  <span className="font-bold">cURL Clusters Request</span>
                  <button
                    onClick={() => handleCopy(curlClusters, 'curl_cls')}
                    className="text-[#9CA3AF] hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedSection === 'curl_cls' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'curl_cls' ? t.copied : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-[#12151B] border border-[#1E232D] rounded text-[11px] text-[#10B981] overflow-x-auto">
                  {curlClusters}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AGENT SKILL */}
      {activeTab === 'skill' && (
        <div className="space-y-4">
          <div className="bg-[#12151B] border border-[#1E232D] rounded p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#A855F7]" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase">Agent Skill & Integration Hub</h3>
                  <span className="text-xs text-[#6B7280]">Connect Claude Code, Cursor, Custom GPTs, and LangChain Agents</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-xs bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30 font-bold">
                OPENAPI 3.1
              </span>
            </div>

            {/* Integration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Claude Code Skill */}
              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#A855F7]">
                  <span className="font-bold flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    Claude Code Skill Config
                  </span>
                  <button
                    onClick={() => handleCopy(claudeCodeSkill, 'claude')}
                    className="text-[#9CA3AF] hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedSection === 'claude' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'claude' ? t.copied : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-[#12151B] border border-[#1E232D] rounded text-[11px] text-[#A855F7] overflow-x-auto">
                  {claudeCodeSkill}
                </pre>
              </div>

              {/* Cursor Rules */}
              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#3B82F6]">
                  <span className="font-bold flex items-center gap-1.5">
                    <Code className="w-4 h-4" />
                    Cursor Rules (.cursor/rules)
                  </span>
                  <button
                    onClick={() => handleCopy(cursorRule, 'cursor')}
                    className="text-[#9CA3AF] hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedSection === 'cursor' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'cursor' ? t.copied : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-[#12151B] border border-[#1E232D] rounded text-[11px] text-[#3B82F6] overflow-x-auto">
                  {cursorRule}
                </pre>
              </div>
            </div>

            {/* Python Snippet & OpenAPI Spec */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#10B981]">
                  <span className="font-bold">Python LangChain / AutoGPT Integration</span>
                  <button
                    onClick={() => handleCopy(pythonSnippet, 'python')}
                    className="text-[#9CA3AF] hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedSection === 'python' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'python' ? t.copied : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-[#12151B] border border-[#1E232D] rounded text-[11px] text-[#10B981] overflow-x-auto">
                  {pythonSnippet}
                </pre>
              </div>

              <div className="bg-[#0B0D10] border border-[#1E232D] rounded p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#EAB308]">
                  <span className="font-bold">OpenAPI 3.1 YAML Schema</span>
                  <button
                    onClick={() => handleCopy(openApiYaml, 'openapi')}
                    className="text-[#9CA3AF] hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedSection === 'openapi' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === 'openapi' ? t.copied : 'Copy Schema'}</span>
                  </button>
                </div>
                <pre className="p-2.5 bg-[#12151B] border border-[#1E232D] rounded text-[11px] text-[#EAB308] overflow-x-auto max-h-[140px]">
                  {openApiYaml}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AgentSkillView = ConnectView;
