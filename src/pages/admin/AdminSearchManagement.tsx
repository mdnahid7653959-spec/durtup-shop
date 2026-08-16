import { useState, useEffect } from "react";
import {
  Search, Plus, Trash2, Edit2, Save, RefreshCw, TrendingUp, AlertTriangle,
  Sparkles, CheckCircle2, BarChart2, BookOpen, Sliders, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { synonymManager, SynonymRule } from "@/services/search/SynonymManager";
import { searchAnalytics, SearchMetricSummary } from "@/services/search/SearchAnalyticsService";

export default function AdminSearchManagement() {
  const [activeTab, setActiveTab] = useState("synonyms");
  const [synonyms, setSynonyms] = useState<SynonymRule[]>([]);
  const [analytics, setAnalytics] = useState<SearchMetricSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<SynonymRule>>({ term: "", synonyms: [] });
  const [synonymInput, setSynonymInput] = useState("");
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    await synonymManager.init();
    setSynonyms(synonymManager.getAllRules());

    const summary = await searchAnalytics.getAnalyticsSummary();
    setAnalytics(summary);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDialog = (rule?: SynonymRule) => {
    if (rule) {
      setEditingRule(rule);
      setSynonymInput(rule.synonyms.join(", "));
    } else {
      setEditingRule({ term: "", synonyms: [], category: "General", language: "bilingual" });
      setSynonymInput("");
    }
    setIsDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule.term?.trim()) {
      toast({ title: "Error", description: "Primary search term is required", variant: "destructive" });
      return;
    }

    const synList = synonymInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (synList.length === 0) {
      toast({ title: "Error", description: "At least one synonym is required", variant: "destructive" });
      return;
    }

    await synonymManager.saveRule({
      id: editingRule.id,
      term: editingRule.term.trim(),
      synonyms: synList,
      category: editingRule.category || "General",
      language: editingRule.language || "bilingual"
    });

    toast({ title: "Success", description: "Synonym rule saved successfully!" });
    setIsDialogOpen(false);
    loadData();
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm("Are you sure you want to delete this synonym rule?")) {
      await synonymManager.deleteRule(id);
      toast({ title: "Deleted", description: "Synonym rule deleted." });
      loadData();
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" /> AI Smart Search Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise-level search dictionary, bilingual synonyms, ranking rules & search analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Add Synonym Rule
          </Button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Searches</p>
              <h3 className="text-2xl font-bold mt-1">{analytics?.totalSearches || 0}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Live Firestore Analytics</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <BarChart2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Synonym Rules</p>
              <h3 className="text-2xl font-bold mt-1">{synonyms.length}</h3>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">EN & BN Dictionaries</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Trending Keywords</p>
              <h3 className="text-2xl font-bold mt-1">{analytics?.trendingKeywords?.length || 0}</h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Auto-ranking enabled</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-red-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Zero Result Rate</p>
              <h3 className="text-2xl font-bold mt-1">{analytics?.zeroResultPercentage || 0}%</h3>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">Optimization metric</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="synonyms" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" /> Synonyms
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-1.5">
            <Sliders className="h-4 w-4" /> Boost Rules
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Synonyms Dictionary */}
        <TabsContent value="synonyms" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Bilingual Synonym Dictionary (English & বাংলা)</CardTitle>
              <CardDescription>
                When a user searches for any synonym in a rule group, products matching the main term or related terms will automatically rank at the top.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border divide-y overflow-hidden">
                {synonyms.map((rule) => (
                  <div key={rule.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-primary">{rule.term}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {rule.language || "Bilingual"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {rule.category || "General"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rule.synonyms.map((syn, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border"
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(rule)}>
                        <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Analytics & Insights */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Most Searched Keywords
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analytics?.mostSearched.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-card text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-bold">{idx + 1}.</span> {item.query}
                    </span>
                    <Badge variant="secondary">{item.count} searches</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" /> Zero-Result Searches (Failed Terms)
                </CardTitle>
                <CardDescription>
                  Keywords users searched for that returned 0 products. Add these to your synonym dictionary or inventory!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {analytics?.zeroResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    No zero-result searches logged! All user queries returned matching products.
                  </div>
                ) : (
                  analytics?.zeroResults.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-rose-500/5 text-sm">
                      <span className="font-medium text-rose-700">{item.query}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingRule({ term: item.query, synonyms: [] });
                          setSynonymInput("");
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Synonym
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Boost Rules */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Intelligent Search Ranking & Boost Rules</CardTitle>
              <CardDescription>
                Configure the weight factors used by AI Search to calculate product relevance scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-xl space-y-2 bg-muted/30">
                  <h4 className="font-semibold text-sm">Exact Match Weight</h4>
                  <p className="text-xs text-muted-foreground">Score assigned when user search matches exact Product Name or SKU.</p>
                  <Badge variant="default" className="text-sm">+100 Points</Badge>
                </div>
                <div className="p-4 border rounded-xl space-y-2 bg-muted/30">
                  <h4 className="font-semibold text-sm">Synonym Match Weight</h4>
                  <p className="text-xs text-muted-foreground">Score assigned when term matches English/Bangla synonym dictionary.</p>
                  <Badge variant="default" className="text-sm">+85 Points</Badge>
                </div>
                <div className="p-4 border rounded-xl space-y-2 bg-muted/30">
                  <h4 className="font-semibold text-sm">Category / Brand Match</h4>
                  <p className="text-xs text-muted-foreground">Score assigned when query matches category name or brand.</p>
                  <Badge variant="default" className="text-sm">+60 Points</Badge>
                </div>
                <div className="p-4 border rounded-xl space-y-2 bg-muted/30">
                  <h4 className="font-semibold text-sm">Popularity & Rating Boost</h4>
                  <p className="text-xs text-muted-foreground">Bonus points computed from total sales count and customer reviews.</p>
                  <Badge variant="default" className="text-sm">+5 to +30 Points</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Synonym Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule.id ? "Edit Synonym Rule" : "Add New Synonym Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Primary Product Term (e.g. "Motorcycle" or "Mobile Phone")
              </label>
              <Input
                placeholder="e.g. Motorcycle"
                value={editingRule.term || ""}
                onChange={(e) => setEditingRule({ ...editingRule, term: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1">
                Synonyms (Comma-separated in English or বাংলা)
              </label>
              <Input
                placeholder="e.g. Bike, Motorbike, Two Wheeler, বাইক, মোটরসাইকেল"
                value={synonymInput}
                onChange={(e) => setSynonymInput(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Separate multiple terms with commas. Include both English and Bangla equivalents!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule}>
              <Save className="h-4 w-4 mr-2" /> Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
