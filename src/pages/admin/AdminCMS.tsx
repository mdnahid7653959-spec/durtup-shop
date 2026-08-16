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
import { supabase } from "@/lib/firebaseAdapter";
import { FileText, Image, Layout, Plus, Edit, Trash2, Eye, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

interface Banner {
  id: string;
  title: string;
  image_url: string;
  position: string;
  is_active: boolean;
}

export default function AdminCMS() {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const { toast } = useToast();

  const [pageForm, setPageForm] = useState({
    title: "",
    slug: "",
    content: "",
    is_published: false,
    meta_title: "",
    meta_description: ""
  });

  const [postForm, setPostForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    status: "draft",
    meta_title: "",
    meta_description: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pagesRes, postsRes, bannersRes] = await Promise.all([
        supabase.from("cms_pages").select("*").order("updated_at", { ascending: false }),
        supabase.from("blog_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("cms_banners").select("*").order("sort_order")
      ]);

      if (pagesRes.data) setPages(pagesRes.data);
      if (postsRes.data) setPosts(postsRes.data);
      if (bannersRes.data) setBanners(bannersRes.data);
    } catch (error) {
      console.error("Error fetching CMS data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const savePage = async () => {
    const data = {
      title: pageForm.title,
      slug: pageForm.slug || generateSlug(pageForm.title),
      content: pageForm.content,
      is_published: pageForm.is_published,
      meta_title: pageForm.meta_title || null,
      meta_description: pageForm.meta_description || null
    };

    if (editingPage) {
      await supabase.from("cms_pages").update(data).eq("id", editingPage.id);
      toast({ title: "Page updated" });
    } else {
      await supabase.from("cms_pages").insert(data);
      toast({ title: "Page created" });
    }

    setPageDialogOpen(false);
    setEditingPage(null);
    setPageForm({ title: "", slug: "", content: "", is_published: false, meta_title: "", meta_description: "" });
    fetchData();
  };

  const savePost = async () => {
    const data = {
      title: postForm.title,
      slug: postForm.slug || generateSlug(postForm.title),
      content: postForm.content,
      excerpt: postForm.excerpt || null,
      status: postForm.status,
      meta_title: postForm.meta_title || null,
      meta_description: postForm.meta_description || null,
      published_at: postForm.status === "published" ? new Date().toISOString() : null
    };

    if (editingPost) {
      await supabase.from("blog_posts").update(data).eq("id", editingPost.id);
      toast({ title: "Post updated" });
    } else {
      await supabase.from("blog_posts").insert(data);
      toast({ title: "Post created" });
    }

    setPostDialogOpen(false);
    setEditingPost(null);
    setPostForm({ title: "", slug: "", content: "", excerpt: "", status: "draft", meta_title: "", meta_description: "" });
    fetchData();
  };

  const deletePage = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    await supabase.from("cms_pages").delete().eq("id", id);
    fetchData();
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    fetchData();
  };

  const getStatusBadge = (isPublished: boolean) => {
    return isPublished ? "default" : "secondary";
  };

  if (loading) {
    return (
      <AdminLayout title="Content Management">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Content Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pages.length}</p>
                  <p className="text-sm text-muted-foreground">Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{posts.length}</p>
                  <p className="text-sm text-muted-foreground">Blog Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Image className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{banners.length}</p>
                  <p className="text-sm text-muted-foreground">Banners</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Layout className="h-5 w-5 text-purple-600" />
                </div>
              <div>
                  <p className="text-2xl font-bold">{pages.filter(p => p.is_published).length}</p>
                  <p className="text-sm text-muted-foreground">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pages" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pages">Static Pages</TabsTrigger>
            <TabsTrigger value="blog">Blog Posts</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
          </TabsList>

          <TabsContent value="pages">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Static Pages</CardTitle>
                    <CardDescription>Manage About, Privacy Policy, Terms, etc.</CardDescription>
                  </div>
                  <Button onClick={() => setPageDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Page
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No pages yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      pages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell className="font-medium">{page.title}</TableCell>
                          <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(page.is_published) as any}>{page.is_published ? "Published" : "Draft"}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(page.updated_at), "PP")}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <a href={`/${page.slug}`} target="_blank">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingPage(page);
                                  setPageForm({
                                    title: page.title,
                                    slug: page.slug,
                                    content: page.content || "",
                                    is_published: page.is_published,
                                    meta_title: page.meta_title || "",
                                    meta_description: page.meta_description || ""
                                  });
                                  setPageDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deletePage(page.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="blog">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Blog Posts</CardTitle>
                    <CardDescription>Manage news and articles</CardDescription>
                  </div>
                  <Button onClick={() => setPostDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Post
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No blog posts yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      posts.map((post) => (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">{post.title}</TableCell>
                          <TableCell className="text-muted-foreground">/blog/{post.slug}</TableCell>
                          <TableCell>
                            <Badge variant={post.status === "published" ? "default" : "secondary"}>{post.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {post.published_at ? format(new Date(post.published_at), "PP") : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingPost(post);
                                  setPostForm({
                                    title: post.title,
                                    slug: post.slug,
                                    content: "",
                                    excerpt: post.excerpt || "",
                                    status: post.status,
                                    meta_title: "",
                                    meta_description: ""
                                  });
                                  setPostDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deletePost(post.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banners">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Homepage Banners</CardTitle>
                    <CardDescription>Manage promotional banners and sliders</CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/admin/marketing">Manage in Marketing</a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {banners.map((banner) => (
                    <Card key={banner.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        {banner.image_url ? (
                          <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No Image
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2" variant={banner.is_active ? "default" : "secondary"}>
                          {banner.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-medium">{banner.title}</h3>
                        <p className="text-sm text-muted-foreground">Position: {banner.position}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {banners.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No banners configured</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Page Dialog */}
      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Edit Page" : "New Page"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={pageForm.title}
                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value, slug: generateSlug(e.target.value) })}
                  placeholder="About Us"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={pageForm.slug}
                  onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                  placeholder="about-us"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={pageForm.content}
                onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                placeholder="Page content..."
                rows={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 flex items-center gap-2">
                <Label>Published</Label>
                <Switch 
                  checked={pageForm.is_published} 
                  onCheckedChange={(v) => setPageForm({ ...pageForm, is_published: v })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input
                  value={pageForm.meta_title}
                  onChange={(e) => setPageForm({ ...pageForm, meta_title: e.target.value })}
                  placeholder="SEO title"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={pageForm.meta_description}
                onChange={(e) => setPageForm({ ...pageForm, meta_description: e.target.value })}
                placeholder="SEO description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPageDialogOpen(false); setEditingPage(null); }}>
              Cancel
            </Button>
            <Button onClick={savePage}>Save Page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value, slug: generateSlug(e.target.value) })}
                  placeholder="Post Title"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={postForm.slug}
                  onChange={(e) => setPostForm({ ...postForm, slug: e.target.value })}
                  placeholder="post-title"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Textarea
                value={postForm.excerpt}
                onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                placeholder="Brief summary..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={postForm.content}
                onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                placeholder="Post content..."
                rows={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={postForm.status} onValueChange={(v) => setPostForm({ ...postForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPostDialogOpen(false); setEditingPost(null); }}>
              Cancel
            </Button>
            <Button onClick={savePost}>Save Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
