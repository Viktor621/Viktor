"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

interface ReferenceOption {
  id: number;
  name: string;
  slug: string;
}

interface ToolItem {
  id: number;
  name: string;
  slug: string;
  link?: string;
  documentation_link?: string;
  description?: string;
  how_to_use?: string;
  examples?: string;
  image_url?: string;
  documentation_markdown?: string;
  categories: ReferenceOption[];
  roles: ReferenceOption[];
  tags: ReferenceOption[];
}

interface ToolFormState {
  name: string;
  link: string;
  documentation_link: string;
  description: string;
  how_to_use: string;
  examples: string;
  image_url: string;
  documentation_markdown: string;
  categories: number[];
  roles: number[];
  tags: number[];
  image: File | null;
}

type SectionKey = "dashboard" | "tools" | "add" | "profile";
type TextField = "name" | "link" | "documentation_link" | "description" | "how_to_use" | "examples" | "image_url" | "documentation_markdown";

const emptyForm = (): ToolFormState => ({
  name: "",
  link: "",
  documentation_link: "",
  description: "",
  how_to_use: "",
  examples: "",
  image_url: "",
  documentation_markdown: "",
  categories: [],
  roles: [],
  tags: [],
  image: null,
});

export default function HomePage() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [categories, setCategories] = useState<ReferenceOption[]>([]);
  const [roles, setRoles] = useState<ReferenceOption[]>([]);
  const [tags, setTags] = useState<ReferenceOption[]>([]);
  const [form, setForm] = useState<ToolFormState>(emptyForm());
  const [editingToolId, setEditingToolId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState<{ search: string; category: string; role: string; tag: string }>({ search: "", category: "", role: "", tag: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auth, setAuth] = useState<{ token: string | null; user: { name: string; email: string } | null }>({ token: null, user: null });
  const [authForm, setAuthForm] = useState<{ name: string; email: string; password: string; mode: "login" | "register" }>({ name: "", email: "", password: "", mode: "login" });

  const loadData = async (activeFilters = filters) => {
    const params = new URLSearchParams();
    if (activeFilters.search) params.set("search", activeFilters.search);
    if (activeFilters.category) params.set("category", activeFilters.category);
    if (activeFilters.role) params.set("role", activeFilters.role);
    if (activeFilters.tag) params.set("tag", activeFilters.tag);

    const headers = auth.token ? { Authorization: `Bearer ${auth.token}` } : undefined;

    const [toolsRes, categoriesRes, rolesRes, tagsRes] = await Promise.all([
      fetch(`http://localhost:8201/api/tools${params.toString() ? `?${params.toString()}` : ""}`, { headers }),
      fetch("http://localhost:8201/api/categories"),
      fetch("http://localhost:8201/api/roles"),
      fetch("http://localhost:8201/api/tags"),
    ]);

    const [toolsData, categoriesData, rolesData, tagsData] = await Promise.all([
      toolsRes.json(),
      categoriesRes.json(),
      rolesRes.json(),
      tagsRes.json(),
    ]);

    setTools(toolsData.data ?? []);
    setCategories(categoriesData.data ?? []);
    setRoles(rolesData.data ?? []);
    setTags(tagsData.data ?? []);
  };

  useEffect(() => {
    void loadData();
    void fetch("http://localhost:8201/api/seed-references", { method: "POST" }).catch(() => undefined);
  }, [auth.token]);

  const openCreateModal = () => {
    setEditingToolId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
    setActiveSection("add");
  };

  const openEditModal = (tool: ToolItem) => {
    setEditingToolId(tool.id);
    setForm({
      name: tool.name,
      link: tool.link ?? "",
      documentation_link: tool.documentation_link ?? "",
      description: tool.description ?? "",
      how_to_use: tool.how_to_use ?? "",
      examples: tool.examples ?? "",
      image_url: tool.image_url ?? "",
      documentation_markdown: tool.documentation_markdown ?? "",
      categories: tool.categories.map((category) => category.id),
      roles: tool.roles.map((role) => role.id),
      tags: tool.tags.map((tag) => tag.id),
      image: null,
    });
    setIsModalOpen(true);
    setActiveSection("add");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingToolId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.token) {
      setMessage("Please log in first.");
      setActiveSection("profile");
      return;
    }

    setMessage("Saving...");
    setIsSubmitting(true);

    const endpoint = editingToolId ? `http://localhost:8201/api/tools/${editingToolId}` : "http://localhost:8201/api/tools";
    const method = editingToolId ? "PUT" : "POST";

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("link", form.link);
    formData.append("documentation_link", form.documentation_link);
    formData.append("description", form.description);
    formData.append("how_to_use", form.how_to_use);
    formData.append("examples", form.examples);
    formData.append("image_url", form.image_url);
    formData.append("documentation_markdown", form.documentation_markdown);
    formData.append("categories", JSON.stringify(form.categories));
    formData.append("roles", JSON.stringify(form.roles));
    formData.append("tags", JSON.stringify(form.tags));
    if (form.image) {
      formData.append("image", form.image);
    }

    const response = await fetch(endpoint, {
      method,
      headers: { Authorization: `Bearer ${auth.token}` },
      body: formData,
    });

    if (response.ok) {
      setMessage(editingToolId ? "Tool updated successfully." : "Tool added successfully.");
      setEditingToolId(null);
      setForm(emptyForm());
      setIsModalOpen(false);
      await loadData();
      setActiveSection("tools");
    } else {
      setMessage("Failed to save the tool.");
    }

    setIsSubmitting(false);
  };

  const handleDeleteTool = async (toolId: number) => {
    if (!window.confirm("Delete this tool?")) {
      return;
    }

    const response = await fetch(`http://localhost:8201/api/tools/${toolId}`, {
      method: "DELETE",
      headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
    });
    if (response.ok) {
      setMessage("Tool deleted.");
      await loadData();
    } else {
      setMessage("Failed to delete the tool.");
    }
  };

  const toggleSelection = (field: "categories" | "roles" | "tags", value: number) => {
    setForm((prev: ToolFormState) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((item: number) => item !== value) : [...prev[field], value],
    }));
  };

  const handleTextChange = (field: TextField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev: ToolFormState) => ({ ...prev, [field]: event.target.value }));
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const endpoint = authForm.mode === "register" ? "http://localhost:8201/api/register" : "http://localhost:8201/api/login";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: authForm.name,
        email: authForm.email,
        password: authForm.password,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      const token = data.data?.token;
      setAuth({ token, user: data.data?.user ?? null });
      setMessage(authForm.mode === "register" ? "Account created. You can now add tools." : "Logged in successfully.");
      setActiveSection("profile");
    } else {
      setMessage(data.message || "Authentication failed.");
    }
  };

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev: typeof filters) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = async () => {
    await loadData(filters);
  };

  const roleLabel = auth.user ? "Contributor" : "Guest";

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="w-full rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl lg:w-72 lg:shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 text-lg text-cyan-300">🤖</div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">AI Tool Hub</p>
              <h1 className="text-xl font-semibold">Explore tools</h1>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">Current role</p>
            <p className="mt-1 text-lg font-semibold">{roleLabel}</p>
            <p className="mt-2 text-sm text-slate-400">{auth.user ? auth.user.email : "Log in to create and manage content"}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {[
              { key: "dashboard", label: "Dashboard", description: "Overview" },
              { key: "tools", label: "Tool list", description: "Browse & filter" },
              { key: "add", label: "Add tool", description: "Create new entry" },
              { key: "profile", label: "Profile", description: "Account" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === "add") {
                    openCreateModal();
                  } else {
                    setActiveSection(item.key as SectionKey);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${activeSection === item.key ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200" : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800"}`}
              >
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span className="block text-xs text-slate-400">{item.description}</span>
                </span>
                <span className="text-lg">›</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm text-slate-400">Library</p>
            <div className="mt-3 flex justify-between text-sm">
              <span>Tools</span>
              <span className="font-semibold text-white">{tools.length}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>Categories</span>
              <span className="font-semibold text-white">{categories.length}</span>
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Dashboard</p>
                <h2 className="mt-2 text-3xl font-semibold">Organize AI tools with clarity</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">A calm, responsive workspace for browsing, adding and managing AI tools by role, category and tag.</p>
              </div>
              <button type="button" onClick={openCreateModal} className="rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950">
                + Add new tool
              </button>
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100">
              {message}
            </div>
          ) : null}

          {activeSection === "dashboard" ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Total tools</p>
                <p className="mt-2 text-3xl font-semibold">{tools.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Categories</p>
                <p className="mt-2 text-3xl font-semibold">{categories.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Roles</p>
                <p className="mt-2 text-3xl font-semibold">{roles.length}</p>
              </div>
            </div>
          ) : null}

          {activeSection === "tools" || activeSection === "dashboard" ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Tool library</h3>
                  <p className="mt-1 text-sm text-slate-400">Search and filter by name, category, role or tag.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={filters.search}
                    onChange={(event) => handleFilterChange("search", event.target.value)}
                    placeholder="Search tools"
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={() => void handleApplyFilters()} className="rounded-2xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">
                    Apply filters
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <select value={filters.category} onChange={(event) => handleFilterChange("category", event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <select value={filters.role} onChange={(event) => handleFilterChange("role", event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">All roles</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                <select value={filters.tag} onChange={(event) => handleFilterChange("tag", event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
                  <option value="">All tags</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {tools.map((tool) => (
                  <article key={tool.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{tool.name}</h4>
                        <p className="mt-2 text-sm text-slate-400">{tool.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEditModal(tool)} className="rounded-xl border border-slate-700 px-2 py-1 text-xs">Edit</button>
                        <button type="button" onClick={() => void handleDeleteTool(tool.id)} className="rounded-xl border border-rose-700 px-2 py-1 text-xs text-rose-300">Delete</button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {tool.categories.map((category) => (
                        <span key={category.id} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">{category.name}</span>
                      ))}
                      {tool.roles.map((role) => (
                        <span key={role.id} className="rounded-full bg-cyan-900/50 px-2.5 py-1 text-xs text-cyan-200">{role.name}</span>
                      ))}
                      {tool.tags.map((tag) => (
                        <span key={tag.id} className="rounded-full bg-fuchsia-900/50 px-2.5 py-1 text-xs text-fuchsia-200">{tag.name}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeSection === "add" ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{editingToolId ? "Edit tool" : "Add a new tool"}</h3>
                  <p className="mt-1 text-sm text-slate-400">Capture links, docs, roles, categories and examples in one place.</p>
                </div>
                {editingToolId ? <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-700 px-3 py-2 text-sm">Close</button> : null}
              </div>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Name</span>
                    <input required value={form.name} onChange={handleTextChange("name")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Link</span>
                    <input value={form.link} onChange={handleTextChange("link")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Official documentation</span>
                    <input value={form.documentation_link} onChange={handleTextChange("documentation_link")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span>Image URL</span>
                    <input value={form.image_url} onChange={handleTextChange("image_url")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm">
                  <span>Upload image</span>
                  <input type="file" accept="image/*" onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.files?.[0] ?? null }))} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>

                <label className="flex flex-col gap-2 text-sm">
                  <span>Description</span>
                  <textarea value={form.description} onChange={handleTextChange("description")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>How it is used</span>
                  <textarea value={form.how_to_use} onChange={handleTextChange("how_to_use")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Real examples</span>
                  <textarea value={form.examples} onChange={handleTextChange("examples")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Documentation markdown</span>
                  <textarea value={form.documentation_markdown} onChange={handleTextChange("documentation_markdown")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>

                <div className="grid gap-4 md:grid-cols-3">
                  <fieldset className="rounded-2xl border border-slate-800 p-3">
                    <legend className="px-1 text-sm font-semibold text-cyan-400">Categories</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories.map((category) => (
                        <button key={category.id} type="button" onClick={() => toggleSelection("categories", category.id)} className={`rounded-full px-3 py-1 text-sm ${form.categories.includes(category.id) ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="rounded-2xl border border-slate-800 p-3">
                    <legend className="px-1 text-sm font-semibold text-cyan-400">Roles</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <button key={role.id} type="button" onClick={() => toggleSelection("roles", role.id)} className={`rounded-full px-3 py-1 text-sm ${form.roles.includes(role.id) ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="rounded-2xl border border-slate-800 p-3">
                    <legend className="px-1 text-sm font-semibold text-cyan-400">Tags</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button key={tag.id} type="button" onClick={() => toggleSelection("tags", tag.id)} className={`rounded-full px-3 py-1 text-sm ${form.tags.includes(tag.id) ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">
                    {isSubmitting ? "Saving..." : editingToolId ? "Update tool" : "Save tool"}
                  </button>
                  <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm">Cancel</button>
                </div>
              </form>
            </div>
          ) : null}

          {activeSection === "profile" ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Profile</h3>
                  <p className="mt-1 text-sm text-slate-400">Quick access to your account and contribution status.</p>
                </div>
                <div className="rounded-2xl border border-cyan-700/40 bg-cyan-950/40 px-3 py-2 text-sm text-cyan-200">
                  {auth.user ? `Signed in as ${auth.user.name}` : "Not signed in"}
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <form onSubmit={handleAuthSubmit} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <h4 className="text-lg font-semibold">Account access</h4>
                  {authForm.mode === "register" ? (
                    <input value={authForm.name} onChange={(event) => setAuthForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Full name" className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  ) : null}
                  <input required value={authForm.email} onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  <input required type="password" value={authForm.password} onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Password" className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="submit" className="rounded-2xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">{authForm.mode === "register" ? "Register" : "Login"}</button>
                    <button type="button" onClick={() => setAuthForm((prev) => ({ ...prev, mode: prev.mode === "login" ? "register" : "login" }))} className="rounded-2xl border border-slate-700 px-3 py-2 text-sm">Switch to {authForm.mode === "login" ? "register" : "login"}</button>
                  </div>
                </form>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <h4 className="text-lg font-semibold">What you can do</h4>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    <li>• Browse the full tool library</li>
                    <li>• Add tools with categories and roles</li>
                    <li>• Edit or delete your own entries</li>
                    <li>• Use filters for fast discovery</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{editingToolId ? "Edit tool" : "Add a new tool"}</h3>
                <p className="mt-1 text-sm text-slate-400">All fields stay accessible and readable on smaller screens.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-700 px-3 py-2 text-sm">Close</button>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm">
                  <span>Name</span>
                  <input required value={form.name} onChange={handleTextChange("name")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Link</span>
                  <input value={form.link} onChange={handleTextChange("link")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Official documentation</span>
                  <input value={form.documentation_link} onChange={handleTextChange("documentation_link")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span>Image URL</span>
                  <input value={form.image_url} onChange={handleTextChange("image_url")} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span>Upload image</span>
                <input type="file" accept="image/*" onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.files?.[0] ?? null }))} className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>Description</span>
                <textarea value={form.description} onChange={handleTextChange("description")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>How it is used</span>
                <textarea value={form.how_to_use} onChange={handleTextChange("how_to_use")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>Real examples</span>
                <textarea value={form.examples} onChange={handleTextChange("examples")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>Documentation markdown</span>
                <textarea value={form.documentation_markdown} onChange={handleTextChange("documentation_markdown")} className="min-h-24 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <fieldset className="rounded-2xl border border-slate-800 p-3">
                  <legend className="px-1 text-sm font-semibold text-cyan-400">Categories</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button key={category.id} type="button" onClick={() => toggleSelection("categories", category.id)} className={`rounded-full px-3 py-1 text-sm ${form.categories.includes(category.id) ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                        {category.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="rounded-2xl border border-slate-800 p-3">
                  <legend className="px-1 text-sm font-semibold text-cyan-400">Roles</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <button key={role.id} type="button" onClick={() => toggleSelection("roles", role.id)} className={`rounded-full px-3 py-1 text-sm ${form.roles.includes(role.id) ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                        {role.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="rounded-2xl border border-slate-800 p-3">
                  <legend className="px-1 text-sm font-semibold text-cyan-400">Tags</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button key={tag.id} type="button" onClick={() => toggleSelection("tags", tag.id)} className={`rounded-full px-3 py-1 text-sm ${form.tags.includes(tag.id) ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={isSubmitting} className="rounded-2xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : editingToolId ? "Update tool" : "Save tool"}
                </button>
                <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-700 px-4 py-2 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
