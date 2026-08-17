import React, { useState } from "react";
import { EnterpriseAdminLayout } from "@/components/admin/enterprise/EnterpriseAdminLayout";
import { AdminAIModuleService } from "@/services/admin/AdminAIModuleService";
import { Sparkles, Copy, CheckCircle2, ShieldAlert, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const EnterpriseAIStudio: React.FC = () => {
  const { toast } = useToast();
  const [prodName, setProdName] = useState("Men Leather Jacket");
  const [category, setCategory] = useState("Fashion");
  const [keywords, setKeywords] = useState("genuine leather, premium zip, slim fit");
  const [aiOutput, setAiOutput] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    const descRes = await AdminAIModuleService.generateProductDescription(prodName, category, keywords);
    const seoRes = await AdminAIModuleService.generateSEOTags(prodName, category);
    setAiOutput({ ...descRes, ...seoRes });
    setIsGenerating(false);
    toast({ title: "AI Generated", description: "Product description and SEO tags created." });
  };

  return (
    <EnterpriseAdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              Enterprise AI Studio & Content Generator
              <Badge className="bg-purple-500/10 border border-purple-500/30 text-purple-400">GEMINI AI</Badge>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Generate AI product descriptions, automated SEO meta titles, and evaluate order fraud risks.
            </p>
          </div>
        </div>

        {/* AI GENERATOR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Copywriter & SEO Builder Input
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Product Title</label>
                <Input
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Category</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Key Features / Attributes</label>
                <Input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <Button
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2 rounded-xl"
              >
                <Sparkles className="h-4 w-4" />
                {isGenerating ? "Generating Content..." : "Generate AI Copy & SEO"}
              </Button>
            </div>
          </div>

          {/* OUTPUT */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Generated AI Copy & SEO Metadata
            </h3>

            {aiOutput ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">AI Description</span>
                  <p className="text-slate-200">{aiOutput.description}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">SEO Meta Title</span>
                  <p className="text-emerald-400 font-bold">{aiOutput.metaTitle}</p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Keywords</span>
                  <p className="text-purple-400 font-bold">{aiOutput.keywords.join(", ")}</p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Click Generate to create AI content
              </div>
            )}
          </div>
        </div>
      </div>
    </EnterpriseAdminLayout>
  );
};
