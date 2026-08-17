import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminDb } from "@/lib/adminDb";
import { Gift, Star, Trophy, Users, Plus, Trash2, Edit, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  reward_value: any;
  is_active: boolean;
}

interface LoyaltyMember {
  id: string;
  user_id: string;
  points: number;
  lifetime_points: number;
  tier: string;
  user_email?: string;
}

export default function AdminLoyalty() {
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    pointsPerOrder: 10,
    pointsPerDollar: 1,
    bronzeThreshold: 0,
    silverThreshold: 500,
    goldThreshold: 2000,
    platinumThreshold: 5000
  });

  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    points_required: 100,
    reward_type: "discount",
    reward_value: { discount_percent: 10 }
  });

  useEffect(() => {
    fetchData();
    loadLoyaltySettings();
  }, []);

  const loadLoyaltySettings = async () => {
    try {
      const { data } = await adminDb.select("site_settings", {
        filters: [{ col: "key", op: "eq", value: "loyalty_settings" }],
        limit: 1,
      });
      if (data && data.length > 0 && data[0].value) {
        const saved = typeof data[0].value === "string" ? JSON.parse(data[0].value) : data[0].value;
        setSettings((prev) => ({ ...prev, ...saved }));
      }
    } catch (e) {
      console.error("Error loading loyalty settings:", e);
    }
  };

  const saveLoyaltySettings = async () => {
    try {
      await adminDb.upsert("site_settings", {
        key: "loyalty_settings",
        value: settings,
      });
      toast({ title: "Settings saved", description: "Loyalty program settings updated successfully." });
    } catch (e) {
      toast({ title: "Error saving settings", description: String(e), variant: "destructive" });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, membersRes] = await Promise.all([
        adminDb.select<LoyaltyReward>("loyalty_rewards", { orderBy: { col: "points_required" } }),
        adminDb.select<LoyaltyMember>("loyalty_points", { orderBy: { col: "lifetime_points", ascending: false }, limit: 50 }),
      ]);
      if (rewardsRes.data) setRewards(rewardsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
    } catch (error) {
      console.error("Error fetching loyalty data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveReward = async () => {
    const data = {
      name: rewardForm.name,
      description: rewardForm.description,
      points_required: rewardForm.points_required,
      reward_type: rewardForm.reward_type,
      reward_value: rewardForm.reward_value,
      is_active: true,
    };
    if (editingReward) {
      await adminDb.update("loyalty_rewards", data, { id: editingReward.id });
      toast({ title: "Reward updated" });
    } else {
      await adminDb.insert("loyalty_rewards", data);
      toast({ title: "Reward created" });
    }
    setRewardDialogOpen(false);
    setEditingReward(null);
    setRewardForm({ name: "", description: "", points_required: 100, reward_type: "discount", reward_value: { discount_percent: 10 } });
    fetchData();
  };

  const toggleReward = async (id: string, isActive: boolean) => {
    await adminDb.update("loyalty_rewards", { is_active: !isActive }, { id });
    fetchData();
  };

  const deleteReward = async (id: string) => {
    if (!confirm("Delete this reward?")) return;
    await adminDb.remove("loyalty_rewards", { id });
    fetchData();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "platinum": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "gold": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "silver": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default: return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    }
  };

  const stats = {
    totalMembers: members.length,
    platinum: members.filter(m => m.tier === "platinum").length,
    gold: members.filter(m => m.tier === "gold").length,
    silver: members.filter(m => m.tier === "silver").length
  };

  if (loading) {
    return (
      <AdminLayout title="Loyalty Program">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Loyalty Program">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.platinum}</p>
                  <p className="text-sm text-muted-foreground">Platinum</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.gold}</p>
                  <p className="text-sm text-muted-foreground">Gold</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Star className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.silver}</p>
                  <p className="text-sm text-muted-foreground">Silver</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rewards" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="rewards">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Loyalty Rewards</CardTitle>
                    <CardDescription>Configure rewards customers can redeem with points</CardDescription>
                  </div>
                  <Button onClick={() => setRewardDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reward
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => (
                    <Card key={reward.id} className={`${!reward.is_active ? "opacity-60" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Gift className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium">{reward.name}</h3>
                              <p className="text-sm text-muted-foreground">{reward.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={reward.is_active}
                            onCheckedChange={() => toggleReward(reward.id, reward.is_active)}
                          />
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <Badge variant="secondary">{reward.points_required} points</Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingReward(reward);
                                setRewardForm({
                                  name: reward.name,
                                  description: reward.description || "",
                                  points_required: reward.points_required,
                                  reward_type: reward.reward_type,
                                  reward_value: reward.reward_value || {}
                                });
                                setRewardDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteReward(reward.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {rewards.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No rewards configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Loyalty Members</CardTitle>
                <CardDescription>Top members by lifetime points</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Current Points</TableHead>
                      <TableHead>Lifetime Points</TableHead>
                      <TableHead>Tier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No loyalty members yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.user_id.slice(0, 8)}...</TableCell>
                          <TableCell>{member.points.toLocaleString()}</TableCell>
                          <TableCell>{member.lifetime_points.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={getTierColor(member.tier)}>
                              {member.tier.charAt(0).toUpperCase() + member.tier.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Loyalty Settings
                </CardTitle>
                <CardDescription>Configure how points are earned and tier thresholds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Points Earning</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Points per order</Label>
                        <Input
                          type="number"
                          value={settings.pointsPerOrder}
                          onChange={(e) => setSettings({ ...settings, pointsPerOrder: Number(e.target.value) })}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Points per ৳100 spent</Label>
                        <Input
                          type="number"
                          value={settings.pointsPerDollar}
                          onChange={(e) => setSettings({ ...settings, pointsPerDollar: Number(e.target.value) })}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">Tier Thresholds (Lifetime Points)</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColor("bronze")}>Bronze</Badge>
                        <Input
                          type="number"
                          value={settings.bronzeThreshold}
                          onChange={(e) => setSettings({ ...settings, bronzeThreshold: Number(e.target.value) })}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColor("silver")}>Silver</Badge>
                        <Input
                          type="number"
                          value={settings.silverThreshold}
                          onChange={(e) => setSettings({ ...settings, silverThreshold: Number(e.target.value) })}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColor("gold")}>Gold</Badge>
                        <Input
                          type="number"
                          value={settings.goldThreshold}
                          onChange={(e) => setSettings({ ...settings, goldThreshold: Number(e.target.value) })}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={getTierColor("platinum")}>Platinum</Badge>
                        <Input
                          type="number"
                          value={settings.platinumThreshold}
                          onChange={(e) => setSettings({ ...settings, platinumThreshold: Number(e.target.value) })}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={saveLoyaltySettings}>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reward Dialog */}
      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReward ? "Edit Reward" : "Add Reward"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reward Name</Label>
              <Input
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="10% Discount"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Get 10% off your next order"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points Required</Label>
                <Input
                  type="number"
                  value={rewardForm.points_required}
                  onChange={(e) => setRewardForm({ ...rewardForm, points_required: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reward Type</Label>
                <Select
                  value={rewardForm.reward_type}
                  onValueChange={(v) => setRewardForm({ ...rewardForm, reward_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="free_shipping">Free Shipping</SelectItem>
                    <SelectItem value="product">Free Product</SelectItem>
                    <SelectItem value="coupon">Coupon Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveReward}>Save Reward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
