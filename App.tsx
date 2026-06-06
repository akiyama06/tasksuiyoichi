import React, { useState, useEffect, useCallback, useRef } from "react";


const SUPABASE_URL = "https://tmlhnmnxfvzjximrjchl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbGhubW54ZnZ6anhpbXJqY2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTg5NzgsImV4cCI6MjA5NjA3NDk3OH0.7WPuWsFpQYOQMF4h54zkmtihvSMyrI_9qIUpghLILgA";
const CAT_KEY = "tasksuiyoichi-categories";
const ME_KEY = "tasksuiyoichi-me";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...(options.headers || {})
    }
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const ASSIGNEES_ALL = ["はやて", "ひとみ", "ふたり"];
const ASSIGNEES = ["はやて", "ひとみ"];
const DEFAULT_CATS = ["家事", "買い物", "お出かけ"];
const FOR_OPTIONS = ["はやて", "ひとみ", "ふたり"];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

function fmt(n) { return "¥" + Math.round(n).toLocaleString(); }

function Linkify({ text }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part)
          ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: "#4096ff", wordBreak: "break-all" }}>{part}</a>
          : part
      )}
    </span>
  );
}

function Confetti({ active }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) return;
    setParticles(Array.from({ length: 40 }, (_, i) => ({
      id: i, x: 10 + Math.random() * 80,
      color: ["#f4a7b9","#a8d5ba","#c3b1e1","#f9d89c","#a8c8f0","#ff6b6b","#ffd93d"][i % 7],
      delay: Math.random() * 0.4, size: 6 + Math.random() * 8,
      round: Math.random() > 0.5
    })));
    const t = setTimeout(() => setParticles([]), 1800);
    return () => clearTimeout(t);
  }, [active]);
  if (!particles.length) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: "30%",
          width: p.size, height: p.size, background: p.color,
          borderRadius: p.round ? "50%" : "2px",
          animation: `fall 1.4s ease-out ${p.delay}s forwards`
        }} />
      ))}
      <style>{`@keyframes fall{0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1}100%{transform:translateY(200px) rotate(720deg) scale(0.2);opacity:0}}`}</style>
    </div>
  );
}

function UserSelect({ onSelect }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 8 }}>タスク水洋一</div>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 40 }}>どちらですか？</div>
      <div style={{ display: "flex", gap: 16 }}>
        {ASSIGNEES.map(name => (
          <button key={name} onClick={() => onSelect(name)} style={{
            width: 120, height: 120, borderRadius: 20, border: "2px solid #e0e0e0", background: "#fafafa",
            cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10
          }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: name === "はやて" ? "#a8c8f0" : "#f4a7b9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#555" }}>{name[0]}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskItem({ task, onUpdate, onDelete, categories, me }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoAuthor, setMemoAuthor] = useState(me);
  const [memoRead, setMemoRead] = useState(false);

  const unreadMemos = (task.memos||[]).filter(m => m.author && m.author !== me);
  const hasUnread = unreadMemos.length > 0 && !memoRead;
  const taskUnread = task.created_by && task.created_by !== me && !(task.read_by||[]).includes(me);

  const toggleDone = () => onUpdate({ ...task, done: !task.done });
  const toggleFlag = () => onUpdate({ ...task, flagged: !task.flagged });
  const addMemo = () => {
    if (!memo.trim()) return;
    onUpdate({ ...task, memos: [...(task.memos||[]), { text: memo.trim(), at: new Date().toISOString(), author: memoAuthor }] });
    setMemo("");
  };
  const setAssignee = a => onUpdate({ ...task, assignee: task.assignee === a ? null : a });
  const setCategory = c => onUpdate({ ...task, category: task.category === c ? null : c });
  const progress = task.done ? 100 : Math.min(90, (task.memos||[]).length * 20);
  const assigneeColor = { "はやて": "#a8c8f0", "ひとみ": "#f4a7b9", "ふたり": "#a8d5ba" };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) { setMemoRead(true); }
    if (next && taskUnread) {
      onUpdate({ ...task, read_by: [...new Set([...(task.read_by||[]), me])] });
    }
  };

  return (
    <div style={{ borderBottom: `1px solid ${task.flagged ? "#ffd6d6" : "#f0f0f0"}`, background: task.flagged ? "#fffafa" : "transparent" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "14px 0", gap: 10 }}>
        <button onClick={toggleFlag} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: 0, flexShrink: 0, opacity: task.flagged ? 1 : 0.2 }}>🚩</button>
        <button onClick={toggleDone} style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px solid ${task.done ? "#aaa" : "#333"}`, background: task.done ? "#aaa" : "transparent", cursor: "pointer", flexShrink: 0, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>{task.done && "✓"}</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, color: task.done ? "#aaa" : "#111", textDecoration: task.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{task.title}</div>
            {taskUnread && <span style={{ fontSize: 9, color: "#fff", background: "#e05", borderRadius: 10, padding: "1px 5px" }}>NEW</span>}
            {task.assignee && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: (assigneeColor[task.assignee]||"#eee")+"66", color: "#555" }}>{task.assignee}</span>}
            {task.category && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#f5f5f5", color: "#888" }}>{task.category}</span>}
          </div>
          <div style={{ marginTop: 5, height: 3, background: "#f0f0f0", borderRadius: 2 }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${progress}%`, background: task.done ? "#aaa" : (task.flagged ? "#e05" : "#333"), transition: "width 0.4s" }} />
          </div>
        </div>
        <button onClick={handleOpen} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: (hasUnread||taskUnread) ? "#e05" : "#aaa", padding: "0 4px", whiteSpace: "nowrap", position: "relative" }}>
          {(task.memos||[]).length > 0 ? `メモ ${task.memos.length}` : "メモ"}
          {(hasUnread||taskUnread) && <span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "#e05" }} />}
          <span style={{ marginLeft: 4, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
        </button>
        <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16, padding: "0 2px" }}>×</button>
      </div>
      {open && (
        <div style={{ paddingBottom: 14, paddingLeft: 34 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {ASSIGNEES_ALL.map(a => (
              <button key={a} onClick={() => setAssignee(a)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer", border: `1px solid ${task.assignee === a ? "#333" : "#e0e0e0"}`, background: task.assignee === a ? "#111" : "transparent", color: task.assignee === a ? "#fff" : "#888", fontFamily: "inherit" }}>{a}</button>
            ))}
          </div>
          {categories.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCategory(c)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer", border: `1px solid ${task.category === c ? "#333" : "#e0e0e0"}`, background: task.category === c ? "#111" : "transparent", color: task.category === c ? "#fff" : "#888", fontFamily: "inherit" }}>{c}</button>
              ))}
            </div>
          )}
          {(task.memos||[]).map((m, i) => (
            <div key={i} style={{ marginBottom: 10, background: m.author && m.author !== me ? "#fff8f5" : "transparent", borderRadius: 6, padding: "4px 6px" }}>
              <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>{m.text}</div>
              <div style={{ fontSize: 11, color: "#bbb" }}>
                {m.author && <span style={{ fontWeight: 600, marginRight: 4, color: m.author !== me ? "#e05" : "#888" }}>{m.author}</span>}
                {formatDate(m.at)}
              </div>
            </div>
          ))}
          {(task.memos||[]).length === 0 && <div style={{ fontSize: 13, color: "#ccc", marginBottom: 8 }}>まだメモがありません</div>}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {ASSIGNEES.map(a => (
              <button key={a} onClick={() => setMemoAuthor(a)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer", border: `1px solid ${memoAuthor === a ? "#333" : "#e0e0e0"}`, background: memoAuthor === a ? "#111" : "transparent", color: memoAuthor === a ? "#fff" : "#888", fontFamily: "inherit" }}>{a}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={memo} onChange={e => setMemo(e.target.value)} onKeyDown={e => e.key === "Enter" && addMemo()} placeholder="進捗メモを追加..." style={{ flex: 1, border: "none", borderBottom: "1px solid #e0e0e0", padding: "6px 0", fontSize: 13, outline: "none", background: "transparent", color: "#333" }} />
            <button onClick={addMemo} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", fontWeight: 600 }}>追加</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TasksTab({ me, tasks, setTasks, trash, setTrash, categories, setCategories, fetchAll }) {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState(null);
  const [showFlagged, setShowFlagged] = useState(false);
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [newCat, setNewCat] = useState("");

  const addTask = async () => {
    const title = input.trim();
    if (!title) return;
    setInput("");
    try {
      await sbFetch("/tasks", { method: "POST", body: JSON.stringify({ title, done: false, flagged: false, memos: [], assignee: null, category: null, created_by: me, read_by: [me] }) });
      fetchAll();
    } catch(e) { alert("タスク追加エラー: " + e.message); }
  };
  const updateTask = async u => {
    setTasks(t => t.map(x => x.id === u.id ? u : x));
    try {
      await sbFetch(`/tasks?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ title: u.title, done: u.done, flagged: u.flagged, memos: u.memos, assignee: u.assignee, category: u.category, read_by: u.read_by }), prefer: "return=minimal" });
    } catch {}
  };
  const deleteTask = async id => {
    const task = tasks.find(t => t.id === id);
    if (task) setTrash(tr => [{ ...task, deletedAt: new Date().toISOString() }, ...tr]);
    setTasks(t => t.filter(x => x.id !== id));
    try { await sbFetch(`/tasks?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); } catch {}
  };
  const addCategory = () => {
    if (!newCat.trim() || categories.includes(newCat.trim())) return;
    setCategories(c => [...c, newCat.trim()]); setNewCat("");
  };
  const deleteCategory = c => {
    setCategories(cats => cats.filter(x => x !== c));
    setTasks(t => t.map(task => task.category === c ? { ...task, category: null } : task));
  };

  let filtered = tasks.filter(t => filter === "all" ? true : filter === "done" ? t.done : !t.done);
  if (catFilter) filtered = filtered.filter(t => t.category === catFilter);
  if (showFlagged) filtered = filtered.filter(t => t.flagged);
  const doneCount = tasks.filter(t => t.done).length;
  const flaggedCount = tasks.filter(t => t.flagged && !t.done).length;

  return (
    <div>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
        {tasks.length === 0 ? "タスクを追加してください" : `${doneCount} / ${tasks.length} 完了`}
        {flaggedCount > 0 && <span style={{ marginLeft: 8, color: "#e05" }}>🚩 {flaggedCount}件</span>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "2px solid #111", paddingBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="新しいタスク..." style={{ flex: 1, border: "none", outline: "none", fontSize: 14, background: "transparent", color: "#111" }} />
        <button onClick={addTask} style={{ background: "#111", border: "none", borderRadius: 6, color: "#fff", fontSize: 20, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, alignItems: "center" }}>
        {[["all","すべて"],["todo","未完了"],["done","完了"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "4px 0", color: filter === v ? "#111" : "#bbb", borderBottom: filter === v ? "1.5px solid #111" : "1.5px solid transparent", fontFamily: "inherit" }}>{l}</button>
        ))}
        <button onClick={() => setShowFlagged(f => !f)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "4px 0", marginLeft: "auto", color: showFlagged ? "#e05" : "#ccc", fontFamily: "inherit" }}>🚩 重要</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <button onClick={() => setCatFilter(null)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer", border: `1px solid ${catFilter === null ? "#333" : "#e0e0e0"}`, background: catFilter === null ? "#111" : "transparent", color: catFilter === null ? "#fff" : "#888", fontFamily: "inherit" }}>すべて</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(catFilter === c ? null : c)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer", border: `1px solid ${catFilter === c ? "#333" : "#e0e0e0"}`, background: catFilter === c ? "#111" : "transparent", color: catFilter === c ? "#fff" : "#888", fontFamily: "inherit" }}>{c}</button>
        ))}
        <button onClick={() => setShowCatEditor(o => !o)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer", border: "1px dashed #ccc", background: "transparent", color: "#aaa", fontFamily: "inherit" }}>＋編集</button>
      </div>
      {showCatEditor && (
        <div style={{ background: "#fafafa", borderRadius: 12, padding: "14px 16px", marginBottom: 16, border: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>カテゴリ管理</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {categories.map(c => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: "2px 8px 2px 10px", fontSize: 12 }}>
                {c}
                <button onClick={() => deleteCategory(c)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} placeholder="新しいカテゴリ..." style={{ flex: 1, border: "none", borderBottom: "1px solid #e0e0e0", padding: "5px 0", fontSize: 13, outline: "none", background: "transparent" }} />
            <button onClick={addCategory} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", fontWeight: 600 }}>追加</button>
          </div>
        </div>
      )}
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>{showFlagged ? "重要なタスクはありません" : filter === "done" ? "完了したタスクはありません" : "タスクがありません"}</div>}
      {filtered.map(task => (
        <TaskItem key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} categories={categories} me={me} />
      ))}
    </div>
  );
}

function PostsTab({ me, posts, setPosts, postsTrash, setPostsTrash, fetchAll }) {
  const [input, setInput] = useState("");
  const [author, setAuthor] = useState(me);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentAuthors, setCommentAuthors] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [readIds, setReadIds] = useState([]);

  const markRead = ids => setReadIds(prev => Array.from(new Set([...prev, ...ids])));

  useEffect(() => { markRead(posts.map(p => p.id)); }, []);

  const addPost = async () => {
    if (!input.trim()) return;
    const cnt = input.trim();
    setInput("");
    try {
      await sbFetch("/posts", { method: "POST", body: JSON.stringify({ author, content: cnt, likes: {}, comments: [], created_by: author, read_by: [author] }) });
      fetchAll();
    } catch(e) { alert("投稿エラー: " + e.message); }
  };

  const deletePost = async id => {
    const post = posts.find(x => x.id === id);
    if (post) setPostsTrash(t => [{ ...post, deletedAt: new Date().toISOString() }, ...t]);
    setPosts(prev => prev.filter(x => x.id !== id));
    try { await sbFetch(`/posts?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); } catch {}
  };

  const toggleLike = async (postId, who) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const likes = { ...post.likes, [who]: !post.likes?.[who] };
    setPosts(ps => ps.map(p => p.id !== postId ? p : { ...p, likes }));
    try { await sbFetch(`/posts?id=eq.${postId}`, { method: "PATCH", body: JSON.stringify({ likes }), prefer: "return=minimal" }); } catch {}
  };

  const addComment = async (postId) => {
    const text = commentInputs[postId] || "";
    const ca = commentAuthors[postId] || me;
    if (!text.trim()) return;
    const newComment = { id: Date.now(), author: ca, text: text.trim(), at: new Date().toISOString(), read_by: [ca] };
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const comments = [...(post.comments||[]), newComment];
    setPosts(ps => ps.map(p => p.id !== postId ? p : { ...p, comments }));
    setCommentInputs(c => ({ ...c, [postId]: "" }));
    markRead([`comment_${newComment.id}`]);
    try { await sbFetch(`/posts?id=eq.${postId}`, { method: "PATCH", body: JSON.stringify({ comments }), prefer: "return=minimal" }); } catch {}
  };

  const handleOpenComments = (postId) => {
    const next = !openComments[postId];
    setOpenComments(o => ({ ...o, [postId]: next }));
    if (next) {
      const post = posts.find(p => p.id === postId);
      if (post) markRead((post.comments||[]).map(c => `comment_${c.id}`));
    }
  };

  const isUnread = p => p.author !== me && !readIds.includes(p.id);
  const hasUnreadComment = p => (p.comments||[]).some(c => c.author !== me && !readIds.includes(`comment_${c.id}`));
  const likeCount = likes => Object.values(likes||{}).filter(Boolean).length;

  return (
    <div>
      <div style={{ background: "#fafafa", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {ASSIGNEES.map(a => (
            <button key={a} onClick={() => setAuthor(a)} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${author === a ? "#333" : "#e0e0e0"}`, background: author === a ? "#111" : "transparent", color: author === a ? "#fff" : "#888", fontFamily: "inherit" }}>{a}</button>
          ))}
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="なにかつぶやく..." rows={3}
          style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 14, background: "transparent", color: "#111", fontFamily: "inherit", lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={addPost} style={{ background: "#111", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, padding: "6px 16px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>投稿</button>
        </div>
      </div>
      {posts.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>まだ投稿がありません</div>}
      {posts.map(p => (
        <div key={p.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0", background: isUnread(p) ? "#fff8f5" : "transparent", borderLeft: isUnread(p) ? "3px solid #e05" : "3px solid transparent", paddingLeft: isUnread(p) ? 10 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: p.author === "はやて" ? "#a8c8f0" : "#f4a7b9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#555", flexShrink: 0 }}>{p.author[0]}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{p.author}</span>
            <span style={{ fontSize: 11, color: "#bbb" }}>{formatDate(p.created_at)}</span>
            {isUnread(p) && <span style={{ fontSize: 10, color: "#fff", background: "#e05", borderRadius: 10, padding: "1px 6px" }}>NEW</span>}
            <button onClick={() => deletePost(p.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 14, padding: "0 2px" }}>×</button>
          </div>
          <div style={{ fontSize: 14, color: "#333", lineHeight: 1.7, paddingLeft: 38, marginBottom: 10 }}><Linkify text={p.content} /></div>
          <div style={{ display: "flex", gap: 16, paddingLeft: 38, marginBottom: 8, alignItems: "center" }}>
            {ASSIGNEES.map(who => (
              <button key={who} onClick={() => toggleLike(p.id, who)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: p.likes?.[who] ? "#e05" : "#bbb", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                {p.likes?.[who] ? "♥" : "♡"} {who}
              </button>
            ))}
            {likeCount(p.likes) > 0 && <span style={{ fontSize: 12, color: "#e05" }}>{likeCount(p.likes)}件のいいね</span>}
            <button onClick={() => handleOpenComments(p.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: hasUnreadComment(p) && !openComments[p.id] ? "#e05" : "#bbb", fontFamily: "inherit", marginLeft: "auto" }}>
              💬 {(p.comments||[]).length > 0 ? `${p.comments.length}件` : "コメント"}
              {hasUnreadComment(p) && !openComments[p.id] && <span style={{ marginLeft: 4, fontSize: 10, color: "#fff", background: "#e05", borderRadius: 10, padding: "1px 5px" }}>NEW</span>}
            </button>
          </div>
          {openComments[p.id] && (
            <div style={{ paddingLeft: 38 }}>
              {(p.comments||[]).map(c => (
                <div key={c.id} style={{ marginBottom: 8, background: c.author !== me && !readIds.includes(`comment_${c.id}`) ? "#fff0ee" : "transparent", borderRadius: 6, padding: "3px 6px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: c.author !== me ? "#e05" : "#555", marginRight: 6 }}>{c.author}</span>
                  <span style={{ fontSize: 13, color: "#333" }}>{c.text}</span>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>{formatDate(c.at)}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                {ASSIGNEES.map(a => (
                  <button key={a} onClick={() => setCommentAuthors(ca => ({ ...ca, [p.id]: a }))} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, cursor: "pointer", border: `1px solid ${(commentAuthors[p.id]||me) === a ? "#333" : "#e0e0e0"}`, background: (commentAuthors[p.id]||me) === a ? "#111" : "transparent", color: (commentAuthors[p.id]||me) === a ? "#fff" : "#888", fontFamily: "inherit" }}>{a}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={commentInputs[p.id] || ""} onChange={e => setCommentInputs(c => ({ ...c, [p.id]: e.target.value }))} onKeyDown={e => e.key === "Enter" && addComment(p.id)} placeholder="コメントを追加..." style={{ flex: 1, border: "none", borderBottom: "1px solid #e0e0e0", padding: "5px 0", fontSize: 13, outline: "none", background: "transparent" }} />
                <button onClick={() => addComment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", fontWeight: 600 }}>送信</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function calcSettlement(expenses) {
  let hB=0,tB=0,hP=0,tP=0;
  expenses.forEach(e => {
    if (e.for_who==="はやて") hB+=e.amount;
    else if (e.for_who==="ひとみ") tB+=e.amount;
    else { hB+=Math.floor(e.amount/2); tB+=Math.ceil(e.amount/2); }
    if (e.paid_by==="はやて") hP+=e.amount; else tP+=e.amount;
  });
  const hBal=hP-hB, tBal=tP-tB;
  let settler=null,receiver=null,settleAmt=0;
  if (hBal>0){settler="ひとみ";receiver="はやて";settleAmt=hBal;}
  else if(tBal>0){settler="はやて";receiver="ひとみ";settleAmt=tBal;}
  return {hP,tP,hB,tB,hBal,tBal,settler,receiver,settleAmt};
}

function MoneyTab({ me, expenses, setExpenses, expTrash, setExpTrash, fetchAll }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(me);
  const [forWho, setForWho] = useState("ふたり");
  const [showConfirm, setShowConfirm] = useState(false);
  const [cracker, setCracker] = useState(false);

  const addExpense = async () => {
    const amt = parseInt(amount.replace(/[^0-9]/g, ""));
    const t = title.trim();
    if (!t || isNaN(amt) || amt <= 0) return;
    setTitle(""); setAmount("");
    try {
      await sbFetch("/expenses", { method: "POST", body: JSON.stringify({ type: "expense", title: t, amount: amt, paid_by: paidBy, for_who: forWho, settler: "", receiver: "", settle_amount: 0 }) });
      fetchAll();
    } catch(e) { alert("追加エラー: " + e.message); }
  };

  const deleteExpense = async id => {
    const item = expenses.find(x => x.id === id);
    if (item) setExpTrash(t => [{ ...item, deletedAt: new Date().toISOString() }, ...t]);
    setExpenses(prev => prev.filter(x => x.id !== id));
    try { await sbFetch(`/expenses?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); } catch {}
  };

  const restoreExpense = async id => {
    const item = expTrash.find(x => x.id === id);
    if (!item) return;
    const { deletedAt, ...rest } = item;
    setExpTrash(t => t.filter(x => x.id !== id));
    try {
      await sbFetch("/expenses", { method: "POST", body: JSON.stringify({ type: "expense", title: rest.title, amount: rest.amount, paid_by: rest.paid_by, for_who: rest.for_who, settler: "", receiver: "", settle_amount: 0 }) });
      fetchAll();
    } catch {}
  };

  const confirmSettle = async () => {
    setShowConfirm(false);
    // Delete all expenses from Supabase
    try {
      await Promise.all(expenses.map(e => sbFetch(`/expenses?id=eq.${e.id}`, { method: "DELETE", prefer: "return=minimal" })));
    } catch {}
    setExpenses([]);
    setCracker(true);
    setTimeout(() => setCracker(false), 100);
    fetchAll();
  };

  const { hP, tP, hB, tB, hBal, tBal, settler, receiver, settleAmt } = calcSettlement(expenses);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const forBg = { "はやて": "#e3f2fd", "ひとみ": "#fce4ec", "ふたり": "#e8f5e9" };
  const forTxt = { "はやて": "#1565c0", "ひとみ": "#880e4f", "ふたり": "#1b5e20" };
  const paidBg = { "はやて": "#e3f2fd", "ひとみ": "#fce4ec" };
  const paidTxt = { "はやて": "#1565c0", "ひとみ": "#880e4f" };

  return (
    <div>
      <Confetti active={cracker} />
      <>
          {expenses.length > 0 && (
            <div style={{ background: "#fafafa", borderRadius: 14, padding: 16, marginBottom: 20, border: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>精算状況</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                {ASSIGNEES.map(name => {
                  const paid = name === "はやて" ? hP : tP;
                  const burden = name === "はやて" ? hB : tB;
                  const bal = name === "はやて" ? hBal : tBal;
                  return (
                    <div key={name} style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #f0f0f0" }}>
                      <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>{name}</div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>支払: <span style={{ fontWeight: 600, color: "#111" }}>{fmt(paid)}</span></div>
                      <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>負担: <span style={{ fontWeight: 600, color: "#111" }}>{fmt(burden)}</span></div>
                      <div style={{ fontSize: 11, marginTop: 4, color: bal >= 0 ? "#4caf50" : "#e05", fontWeight: 600 }}>{bal >= 0 ? "+" : ""}{fmt(bal)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 13, textAlign: "center", padding: "10px", background: "#fff", borderRadius: 10, border: "1px solid #f0f0f0", marginBottom: 8 }}>
                {settleAmt === 0
                  ? <span style={{ color: "#4caf50", fontWeight: 600 }}>精算不要 🎉</span>
                  : <span><span style={{ fontWeight: 700, color: "#e05" }}>{settler}</span>{" → "}<span style={{ fontWeight: 700 }}>{receiver}</span>{" に "}<span style={{ fontSize: 18, fontWeight: 700 }}>{fmt(settleAmt)}</span>{" 支払う"}</span>
                }
              </div>
              <div style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginBottom: 10 }}>合計 {fmt(total)}</div>
              <button onClick={() => setShowConfirm(true)} style={{ width: "100%", background: "#111", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, padding: "10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✓ 精算する</button>
            </div>
          )}

          {showConfirm && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: "#fff", borderRadius: 18, padding: 24, width: "100%", maxWidth: 320, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 10 }}>精算の確認</div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 20, lineHeight: 1.7 }}>
                  {settleAmt === 0 ? "精算不要です。支出を全消去しますか？" :
                    <><span style={{ fontWeight: 700, color: "#e05" }}>{settler}</span> が <span style={{ fontWeight: 700, color: "#e05" }}>{receiver}</span> に <span style={{ fontWeight: 700 }}>{fmt(settleAmt)}</span> 支払い、全消去します。よろしいですか？</>
                  }
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={confirmSettle} style={{ background: "#111", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, padding: "12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>精算する 🎉</button>
                  <button onClick={() => setShowConfirm(false)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 10, color: "#aaa", fontSize: 13, padding: "12px", cursor: "pointer", fontFamily: "inherit" }}>キャンセル</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: "#fafafa", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>支出を追加</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>支払った人</div>
              <div style={{ display: "flex", gap: 6 }}>
                {ASSIGNEES.map(a => (
                  <button key={a} onClick={() => setPaidBy(a)} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${paidBy === a ? "#333" : "#e0e0e0"}`, background: paidBy === a ? "#111" : "transparent", color: paidBy === a ? "#fff" : "#888", fontFamily: "inherit" }}>{a}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>誰のための支出</div>
              <div style={{ display: "flex", gap: 6 }}>
                {FOR_OPTIONS.map(a => (
                  <button key={a} onClick={() => setForWho(a)} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${forWho === a ? "#333" : "#e0e0e0"}`, background: forWho === a ? "#111" : "transparent", color: forWho === a ? "#fff" : "#888", fontFamily: "inherit" }}>{a}</button>
                ))}
              </div>
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="内容（例：スーパー、外食）"
              style={{ width: "100%", border: "none", borderBottom: "1px solid #e0e0e0", padding: "8px 0", fontSize: 14, outline: "none", background: "transparent", marginBottom: 10, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", borderBottom: "1px solid #e0e0e0" }}>
                <span style={{ fontSize: 14, color: "#aaa", marginRight: 4 }}>¥</span>
                <input value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && addExpense()} placeholder="金額" type="number"
                  style={{ flex: 1, border: "none", padding: "8px 0", fontSize: 14, outline: "none", background: "transparent" }}
                />
              </div>
              <button onClick={addExpense} style={{ background: "#111", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>追加</button>
            </div>
          </div>

          {expenses.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc", fontSize: 13 }}>支出がありません</div>}
          {expenses.map(item => (
            <div key={item.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "12px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: paidBg[item.paid_by]||"#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: paidTxt[item.paid_by]||"#555", flexShrink: 0 }}>{(item.paid_by||"?")[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: "#888" }}>{item.paid_by}が支払</span>
                  <span style={{ fontSize: 10, color: forTxt[item.for_who], background: forBg[item.for_who], borderRadius: 8, padding: "1px 6px" }}>{item.for_who}</span>
                  <span style={{ fontSize: 10, color: "#bbb" }}>{formatDateShort(item.created_at)}</span>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111", flexShrink: 0 }}>{fmt(item.amount)}</div>
              <button onClick={() => deleteExpense(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16, padding: "0 2px", flexShrink: 0 }}>×</button>
            </div>
          ))}
      </>
    </div>
  );
}


function PostsTrashTab({ postsTrash, setPostsTrash }) {
  const restorePost = item => {
    const { deletedAt, ...post } = item;
    setPostsTrash(t => t.filter(x => x.id !== item.id));
  };
  return (
    <div>
      {postsTrash.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>ゴミ箱は空です</div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setPostsTrash([])} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 12, color: "#aaa", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>すべて削除</button>
          </div>
          {postsTrash.map(item => (
            <div key={item.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "14px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: item.author === "はやて" ? "#a8c8f0" : "#f4a7b9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#555", flexShrink: 0 }}>{(item.author||"?")[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#aaa", textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.content}</div>
                <div style={{ fontSize: 11, color: "#ccc", marginTop: 3 }}>{item.author} · 削除: {formatDate(item.deletedAt)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ExpTrashTab({ expTrash, setExpTrash, setExpenses, fetchAll }) {
  const restoreExpense = async id => {
    const item = expTrash.find(x => x.id === id);
    if (!item) return;
    const { deletedAt, ...rest } = item;
    setExpTrash(t => t.filter(x => x.id !== id));
    try {
      await sbFetch("/expenses", { method: "POST", body: JSON.stringify({ type: "expense", title: rest.title, amount: rest.amount, paid_by: rest.paid_by, for_who: rest.for_who, settler: "", receiver: "", settle_amount: 0 }) });
      fetchAll();
    } catch {}
  };
  return (
    <div>
      {expTrash.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>ゴミ箱は空です</div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setExpTrash([])} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 12, color: "#aaa", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>すべて削除</button>
          </div>
          {expTrash.map(item => (
            <div key={item.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "12px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#aaa", textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#ccc", marginTop: 2 }}>{fmt(item.amount)} · {item.paid_by}が支払 · 削除: {formatDateShort(item.deletedAt)}</div>
              </div>
              <button onClick={() => restoreExpense(item.id)} style={{ background: "#111", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>復元</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function TrashTab({ trash, setTrash, setTasks, fetchAll }) {
  const restoreTask = async item => {
    const { deletedAt, ...task } = item;
    setTrash(t => t.filter(x => x.id !== item.id));
    try {
      await sbFetch("/tasks", { method: "POST", body: JSON.stringify({ title: task.title, done: task.done, flagged: task.flagged||false, memos: task.memos||[], assignee: task.assignee, category: task.category, created_by: task.created_by, read_by: task.read_by||[] }) });
      fetchAll();
    } catch {}
  };
  return (
    <div>
      {trash.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>ゴミ箱は空です</div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setTrash([])} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 12, color: "#aaa", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>すべて削除</button>
          </div>
          {trash.map(item => (
            <div key={item.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "14px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#aaa", textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#ccc", marginTop: 3 }}>削除: {formatDate(item.deletedAt)}</div>
              </div>
              <button onClick={() => restoreTask(item)} style={{ background: "#111", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>復元</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}


const MAIN_TABS = ["tasks", "posts", "money"];

function SwipeHandler({ tab, setTab, children }) {
  const startX = React.useRef(0);
  const startY = React.useRef(0);

  const onTouchStart = e => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = e => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    const idx = MAIN_TABS.findIndex(t => tab === t || tab === t + "-trash" || (t === "tasks" && tab === "task-trash"));
    if (dx < 0 && idx < MAIN_TABS.length - 1) setTab(MAIN_TABS[idx + 1]);
    if (dx > 0 && idx > 0) setTab(MAIN_TABS[idx - 1]);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(() => localStorage.getItem(ME_KEY) || null);
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [trash, setTrash] = useState([]);
  const [postsTrash, setPostsTrash] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expTrash, setExpTrash] = useState([]);
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CAT_KEY) || JSON.stringify(DEFAULT_CATS)); } catch { return DEFAULT_CATS; }
  });
  const pollRef = useRef();

  useEffect(() => { localStorage.setItem(CAT_KEY, JSON.stringify(categories)); }, [categories]);

  const fetchAll = useCallback(async () => {
    if (!me) return;
    try {
      const [t, p, e] = await Promise.all([
        sbFetch("/tasks?order=created_at.asc"),
        sbFetch("/posts?order=created_at.desc"),
        sbFetch("/expenses?order=created_at.desc")
      ]);
      setTasks(t || []);
      setPosts(p || []);
      setExpenses(e || []);
    } catch {}
  }, [me]);

  useEffect(() => {
    if (!me) return;
    fetchAll();
    pollRef.current = setInterval(fetchAll, 4000);
    return () => clearInterval(pollRef.current);
  }, [me, fetchAll]);

  const handleSelectUser = name => {
    setMe(name);
    localStorage.setItem(ME_KEY, name);
  };

  const handleLogout = () => {
    setMe(null);
    localStorage.removeItem(ME_KEY);
  };

  const tasksUnread = me ? tasks.filter(t => !t.done && t.created_by && t.created_by !== me && !(t.read_by||[]).includes(me)).length : 0;
  const postsUnread = me && tab !== "posts" ? posts.filter(p => !(p.read_by||[]).includes(me)).length : 0;

  if (!me) return <UserSelect onSelect={handleSelectUser} />;

  const tabStyle = v => ({
    background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "10px 14px",
    color: tab === v ? "#111" : "#bbb",
    borderBottom: tab === v ? "2px solid #111" : "2px solid transparent",
    fontFamily: "inherit", fontWeight: tab === v ? 600 : 400, marginBottom: -1, position: "relative"
  });

  return (
    <SwipeHandler tab={tab} setTab={setTab}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ padding: "28px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>タスク水洋一</div>
          <button onClick={handleLogout} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 20, fontSize: 11, color: "#aaa", padding: "3px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: me === "はやて" ? "#a8c8f0" : "#f4a7b9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#555" }}>{me[0]}</div>
            {me}
          </button>
        </div>

        {(() => {
          const TABS = [
            ["tasks","タスク",tasksUnread,"#a8c8f0"],
            ["task-trash","🗑️",trash.length,"#a8c8f0"],
            ["posts","つぶやき",postsUnread,"#f4a7b9"],
            ["posts-trash","🗑️",postsTrash.length,"#f4a7b9"],
            ["money","お金",0,"#a8d5ba"],
            ["exp-trash","🗑️",expTrash.length,"#a8d5ba"],
          ];
          return (
            <div style={{ marginTop: 12, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {TABS.map(([v, l, badge, color]) => {
                  const isActive = tab === v;
                  const isTrash = v.includes("trash");
                  return (
                    <button key={v} onClick={() => setTab(v)} style={{
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      fontSize: isTrash ? 12 : 13,
                      padding: isTrash ? "5px 8px" : "6px 14px",
                      borderRadius: 20,
                      background: isActive ? color : `${color}33`,
                      color: isActive ? "#fff" : "#666",
                      fontWeight: isActive ? 600 : 400,
                      flexShrink: 0,
                      position: "relative",
                      transition: "all 0.2s",
                      marginRight: isTrash ? 8 : 0
                    }}>
                      {l}
                      {badge > 0 && <span style={{ position: "absolute", top: -2, right: -2, background: "#e05", color: "#fff", borderRadius: 10, fontSize: 8, padding: "1px 4px", fontWeight: 700 }}>{badge}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {tab === "tasks" && <TasksTab me={me} tasks={tasks} setTasks={setTasks} trash={trash} setTrash={setTrash} categories={categories} setCategories={setCategories} fetchAll={fetchAll} />}
        {tab === "task-trash" && <TrashTab trash={trash} setTrash={setTrash} setTasks={setTasks} fetchAll={fetchAll} />}
        {tab === "posts" && <PostsTab me={me} posts={posts} setPosts={setPosts} postsTrash={postsTrash} setPostsTrash={setPostsTrash} fetchAll={fetchAll} />}
        {tab === "posts-trash" && <PostsTrashTab postsTrash={postsTrash} setPostsTrash={setPostsTrash} />}
        {tab === "money" && <MoneyTab me={me} expenses={expenses} setExpenses={setExpenses} expTrash={expTrash} setExpTrash={setExpTrash} fetchAll={fetchAll} />}
        {tab === "exp-trash" && <ExpTrashTab expTrash={expTrash} setExpTrash={setExpTrash} setExpenses={setExpenses} fetchAll={fetchAll} />}

        <div style={{ marginTop: 32, fontSize: 12, color: "#ccc", textAlign: "center", paddingBottom: 40 }}>
          ログイン中: {me} · 4秒ごとに自動更新
        </div>
      </div>
    </SwipeHandler>
  );
}
