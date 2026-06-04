import { useState, useRef, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://tmlhnmnxfvzjximrjchl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbGhubW54ZnZ6anhpbXJqY2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTg5NzgsImV4cCI6MjA5NjA3NDk3OH0.7WPuWsFpQYOQMF4h54zkmtihvSMyrI_9qIUpghLILgA";

const CAT_KEY = "tasksuiyoichi-categories";
const DEFAULT_CATS = ["家事", "買い物", "お出かけ"];
const ASSIGNEES_ALL = ["はやて", "ひとみ", "ふたり"];
const ASSIGNEES = ["はやて", "ひとみ"];

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

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Confetti({ active }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) return;
    setParticles(Array.from({ length: 18 }, (_, i) => ({
      id: i, x: Math.random() * 100,
      color: ["#f4a7b9","#a8d5ba","#c3b1e1","#f9d89c","#a8c8f0"][i % 5],
      delay: Math.random() * 0.3, size: 5 + Math.random() * 5
    })));
    const t = setTimeout(() => setParticles([]), 1100);
    return () => clearTimeout(t);
  }, [active]);
  if (!particles.length) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, overflow: "hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: "40%",
          width: p.size, height: p.size, borderRadius: "50%", background: p.color,
          animation: `fall 0.9s ease-out ${p.delay}s forwards`
        }} />
      ))}
      <style>{`@keyframes fall{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(120px) scale(0.5);opacity:0}}`}</style>
    </div>
  );
}

function TaskItem({ task, onUpdate, onDelete, categories }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoAuthor, setMemoAuthor] = useState("はやて");
  const [boom, setBoom] = useState(false);

  const toggleDone = () => {
    if (!task.done) setBoom(true);
    onUpdate({ ...task, done: !task.done });
    setTimeout(() => setBoom(false), 100);
  };
  const toggleFlag = () => onUpdate({ ...task, flagged: !task.flagged });

  const addMemo = () => {
    if (!memo.trim()) return;
    onUpdate({ ...task, memos: [...(task.memos||[]), { text: memo.trim(), at: new Date().toISOString(), author: memoAuthor }] });
    setMemo("");
  };

  const setAssignee = (a) => onUpdate({ ...task, assignee: task.assignee === a ? null : a });
  const setCategory = (c) => onUpdate({ ...task, category: task.category === c ? null : c });

  const progress = task.done ? 100 : Math.min(90, (task.memos||[]).length * 20);
  const assigneeColor = { "はやて": "#a8c8f0", "ひとみ": "#f4a7b9", "ふたり": "#a8d5ba" };

  return (
    <>
      <Confetti active={boom} />
      <div style={{ borderBottom: `1px solid ${task.flagged ? "#ffd6d6" : "#f0f0f0"}`, background: task.flagged ? "#fffafa" : "transparent" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 0", gap: 10 }}>
          <button onClick={toggleFlag} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: 0, flexShrink: 0,
            opacity: task.flagged ? 1 : 0.2, color: "#e05"
          }}>🚩</button>
          <button onClick={toggleDone} style={{
            width: 22, height: 22, borderRadius: "50%",
            border: `1.5px solid ${task.done ? "#aaa" : "#333"}`,
            background: task.done ? "#aaa" : "transparent",
            cursor: "pointer", flexShrink: 0, fontSize: 12,
            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
          }}>{task.done && "✓"}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div style={{
                fontSize: 14, color: task.done ? "#aaa" : "#111",
                textDecoration: task.done ? "line-through" : "none",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160
              }}>{task.title}</div>
              {task.assignee && (
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: (assigneeColor[task.assignee]||"#eee")+"66", color: "#555" }}>{task.assignee}</span>
              )}
              {task.category && (
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#f5f5f5", color: "#888" }}>{task.category}</span>
              )}
            </div>
            <div style={{ marginTop: 5, height: 3, background: "#f0f0f0", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${progress}%`, background: task.done ? "#aaa" : (task.flagged ? "#e05" : "#333"), transition: "width 0.4s" }} />
            </div>
          </div>
          <button onClick={() => setOpen(o => !o)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#aaa", padding: "0 4px", whiteSpace: "nowrap"
          }}>
            {(task.memos||[]).length > 0 ? `メモ ${task.memos.length}` : "メモ"}
            <span style={{ marginLeft: 4, display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
          </button>
          <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 16, padding: "0 2px" }}>×</button>
        </div>

        {open && (
          <div style={{ paddingBottom: 14, paddingLeft: 34 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {ASSIGNEES_ALL.map(a => (
                <button key={a} onClick={() => setAssignee(a)} style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${task.assignee === a ? "#333" : "#e0e0e0"}`,
                  background: task.assignee === a ? "#111" : "transparent",
                  color: task.assignee === a ? "#fff" : "#888", fontFamily: "inherit"
                }}>{a}</button>
              ))}
            </div>
            {categories.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${task.category === c ? "#333" : "#e0e0e0"}`,
                    background: task.category === c ? "#111" : "transparent",
                    color: task.category === c ? "#fff" : "#888", fontFamily: "inherit"
                  }}>{c}</button>
                ))}
              </div>
            )}
            {(task.memos||[]).map((m, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6 }}>{m.text}</div>
                <div style={{ fontSize: 11, color: "#bbb" }}>
                  {m.author && <span style={{ fontWeight: 600, marginRight: 4 }}>{m.author}</span>}
                  {formatDate(m.at)}
                </div>
              </div>
            ))}
            {(task.memos||[]).length === 0 && <div style={{ fontSize: 13, color: "#ccc", marginBottom: 8 }}>まだメモがありません</div>}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {ASSIGNEES.map(a => (
                <button key={a} onClick={() => setMemoAuthor(a)} style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${memoAuthor === a ? "#333" : "#e0e0e0"}`,
                  background: memoAuthor === a ? "#111" : "transparent",
                  color: memoAuthor === a ? "#fff" : "#888", fontFamily: "inherit"
                }}>{a}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={memo} onChange={e => setMemo(e.target.value)} onKeyDown={e => e.key === "Enter" && addMemo()}
                placeholder="進捗メモを追加..."
                style={{ flex: 1, border: "none", borderBottom: "1px solid #e0e0e0", padding: "6px 0", fontSize: 13, outline: "none", background: "transparent", color: "#333" }}
              />
              <button onClick={addMemo} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", fontWeight: 600 }}>追加</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function TasksTab({ tasks, setTasks, trash, setTrash, categories, setCategories }) {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState(null);
  const [showFlagged, setShowFlagged] = useState(false);
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [newCat, setNewCat] = useState("");
  const inputRef = useRef();

  const addTask = async () => {
    if (!input.trim()) return;
    const newTask = { title: input.trim(), done: false, flagged: false, memos: [], assignee: null, category: null };
    setInput("");
    try {
      await sbFetch("/tasks", { method: "POST", body: JSON.stringify(newTask) });
    } catch {}
    inputRef.current?.focus();
  };

  const updateTask = async (updated) => {
    setTasks(t => t.map(x => x.id === updated.id ? updated : x));
    try {
      await sbFetch(`/tasks?id=eq.${updated.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: updated.title, done: updated.done, flagged: updated.flagged, memos: updated.memos, assignee: updated.assignee, category: updated.category }),
        prefer: "return=minimal"
      });
    } catch {}
  };

  const deleteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) setTrash(tr => [{ ...task, deletedAt: new Date().toISOString() }, ...tr]);
    setTasks(t => t.filter(x => x.id !== id));
    try {
      await sbFetch(`/tasks?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    } catch {}
  };

  const addCategory = () => {
    if (!newCat.trim() || categories.includes(newCat.trim())) return;
    setCategories(c => [...c, newCat.trim()]); setNewCat("");
  };
  const deleteCategory = (c) => {
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
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
          placeholder="新しいタスク..."
          style={{ flex: 1, border: "none", outline: "none", fontSize: 14, background: "transparent", color: "#111" }}
        />
        <button onClick={addTask} style={{
          background: "#111", border: "none", borderRadius: 6, color: "#fff", fontSize: 20, width: 32, height: 32,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>+</button>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, alignItems: "center" }}>
        {[["all","すべて"],["todo","未完了"],["done","完了"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "4px 0",
            color: filter === v ? "#111" : "#bbb",
            borderBottom: filter === v ? "1.5px solid #111" : "1.5px solid transparent", fontFamily: "inherit"
          }}>{l}</button>
        ))}
        <button onClick={() => setShowFlagged(f => !f)} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "4px 0", marginLeft: "auto",
          color: showFlagged ? "#e05" : "#ccc", fontFamily: "inherit"
        }}>🚩 重要</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <button onClick={() => setCatFilter(null)} style={{
          fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer",
          border: `1px solid ${catFilter === null ? "#333" : "#e0e0e0"}`,
          background: catFilter === null ? "#111" : "transparent",
          color: catFilter === null ? "#fff" : "#888", fontFamily: "inherit"
        }}>すべて</button>
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(catFilter === c ? null : c)} style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${catFilter === c ? "#333" : "#e0e0e0"}`,
            background: catFilter === c ? "#111" : "transparent",
            color: catFilter === c ? "#fff" : "#888", fontFamily: "inherit"
          }}>{c}</button>
        ))}
        <button onClick={() => setShowCatEditor(o => !o)} style={{
          fontSize: 11, padding: "3px 10px", borderRadius: 10, cursor: "pointer",
          border: "1px dashed #ccc", background: "transparent", color: "#aaa", fontFamily: "inherit"
        }}>＋編集</button>
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
            <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()}
              placeholder="新しいカテゴリ..."
              style={{ flex: 1, border: "none", borderBottom: "1px solid #e0e0e0", padding: "5px 0", fontSize: 13, outline: "none", background: "transparent" }}
            />
            <button onClick={addCategory} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", fontWeight: 600 }}>追加</button>
          </div>
        </div>
      )}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>
          {showFlagged ? "重要なタスクはありません" : filter === "done" ? "完了したタスクはありません" : "タスクがありません"}
        </div>
      )}
      {filtered.map(task => (
        <TaskItem key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} categories={categories} />
      ))}
    </div>
  );
}

function PostsTab({ posts, setPosts }) {
  const [input, setInput] = useState("");
  const [author, setAuthor] = useState("はやて");
  const [commentInputs, setCommentInputs] = useState({});
  const [commentAuthors, setCommentAuthors] = useState({});
  const [openComments, setOpenComments] = useState({});

  const addPost = async () => {
    if (!input.trim()) return;
    const newPost = { author, content: input.trim(), created_at: new Date().toISOString(), likes: {}, comments: [] };
    setPosts(p => [{ ...newPost, id: Date.now() }, ...p]);
    setInput("");
    try {
      await sbFetch("/posts", { method: "POST", body: JSON.stringify({ author: newPost.author, content: newPost.content, likes: newPost.likes, comments: newPost.comments }) });
    } catch {}
  };

  const toggleLike = async (postId, who) => {
    setPosts(ps => ps.map(p => {
      if (p.id !== postId) return p;
      const likes = { ...p.likes };
      likes[who] = !likes[who];
      return { ...p, likes };
    }));
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const likes = { ...post.likes };
    likes[who] = !likes[who];
    try {
      await sbFetch(`/posts?id=eq.${postId}`, { method: "PATCH", body: JSON.stringify({ likes }), prefer: "return=minimal" });
    } catch {}
  };

  const addComment = async (postId) => {
    const text = commentInputs[postId] || "";
    const ca = commentAuthors[postId] || "はやて";
    if (!text.trim()) return;
    const newComment = { id: Date.now(), author: ca, text: text.trim(), at: new Date().toISOString() };
    setPosts(ps => ps.map(p => {
      if (p.id !== postId) return p;
      return { ...p, comments: [...(p.comments||[]), newComment] };
    }));
    setCommentInputs(c => ({ ...c, [postId]: "" }));
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    try {
      await sbFetch(`/posts?id=eq.${postId}`, { method: "PATCH", body: JSON.stringify({ comments: [...(post.comments||[]), newComment] }), prefer: "return=minimal" });
    } catch {}
  };

  const likeCount = (likes) => Object.values(likes||{}).filter(Boolean).length;

  return (
    <div>
      <div style={{ background: "#fafafa", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {ASSIGNEES.map(a => (
            <button key={a} onClick={() => setAuthor(a)} style={{
              fontSize: 12, padding: "4px 12px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${author === a ? "#333" : "#e0e0e0"}`,
              background: author === a ? "#111" : "transparent",
              color: author === a ? "#fff" : "#888", fontFamily: "inherit"
            }}>{a}</button>
          ))}
        </div>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="なにかつぶやく..." rows={3}
          style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 14, background: "transparent", color: "#111", fontFamily: "inherit", lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={addPost} style={{
            background: "#111", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, padding: "6px 16px",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 600
          }}>投稿</button>
        </div>
      </div>
      {posts.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>まだ投稿がありません</div>}
      {posts.map(p => (
        <div key={p.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: p.author === "はやて" ? "#a8c8f0" : "#f4a7b9",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, color: "#555", flexShrink: 0
            }}>{p.author[0]}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{p.author}</span>
            <span style={{ fontSize: 11, color: "#bbb" }}>{formatDate(p.created_at)}</span>
          </div>
          <div style={{ fontSize: 14, color: "#333", lineHeight: 1.7, paddingLeft: 38, marginBottom: 10 }}>{p.content}</div>
          <div style={{ display: "flex", gap: 16, paddingLeft: 38, marginBottom: 8, alignItems: "center" }}>
            {ASSIGNEES.map(who => (
              <button key={who} onClick={() => toggleLike(p.id, who)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 12,
                color: p.likes?.[who] ? "#e05" : "#bbb", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4
              }}>
                {p.likes?.[who] ? "♥" : "♡"} {who}
              </button>
            ))}
            {likeCount(p.likes) > 0 && <span style={{ fontSize: 12, color: "#e05" }}>{likeCount(p.likes)}件のいいね</span>}
            <button onClick={() => setOpenComments(o => ({ ...o, [p.id]: !o[p.id] }))} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#bbb", fontFamily: "inherit", marginLeft: "auto"
            }}>
              💬 {(p.comments||[]).length > 0 ? `${p.comments.length}件` : "コメント"}
            </button>
          </div>
          {openComments[p.id] && (
            <div style={{ paddingLeft: 38 }}>
              {(p.comments||[]).map(c => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#555", marginRight: 6 }}>{c.author}</span>
                  <span style={{ fontSize: 13, color: "#333" }}>{c.text}</span>
                  <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>{formatDate(c.at)}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                {ASSIGNEES.map(a => (
                  <button key={a} onClick={() => setCommentAuthors(ca => ({ ...ca, [p.id]: a }))} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${(commentAuthors[p.id]||"はやて") === a ? "#333" : "#e0e0e0"}`,
                    background: (commentAuthors[p.id]||"はやて") === a ? "#111" : "transparent",
                    color: (commentAuthors[p.id]||"はやて") === a ? "#fff" : "#888", fontFamily: "inherit"
                  }}>{a}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={commentInputs[p.id] || ""}
                  onChange={e => setCommentInputs(c => ({ ...c, [p.id]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addComment(p.id)}
                  placeholder="コメントを追加..."
                  style={{ flex: 1, border: "none", borderBottom: "1px solid #e0e0e0", padding: "5px 0", fontSize: 13, outline: "none", background: "transparent" }}
                />
                <button onClick={() => addComment(p.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#333", fontWeight: 600 }}>送信</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TrashTab({ trash, setTrash, setTasks }) {
  const restoreTask = async (item) => {
    const { deletedAt, ...task } = item;
    setTrash(t => t.filter(x => x.id !== item.id));
    try {
      await sbFetch("/tasks", { method: "POST", body: JSON.stringify({ title: task.title, done: task.done, flagged: task.flagged||false, memos: task.memos||[], assignee: task.assignee, category: task.category }) });
    } catch {}
  };

  const clearTrash = () => setTrash([]);

  return (
    <div>
      {trash.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#ccc", fontSize: 13 }}>ゴミ箱は空です</div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={clearTrash} style={{
              background: "none", border: "1px solid #e0e0e0", borderRadius: 8,
              fontSize: 12, color: "#aaa", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit"
            }}>すべて削除</button>
          </div>
          {trash.map(item => (
            <div key={item.id} style={{ borderBottom: "1px solid #f0f0f0", padding: "14px 0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#aaa", textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#ccc", marginTop: 3 }}>削除日時: {formatDate(item.deletedAt)}</div>
              </div>
              <button onClick={() => restoreTask(item)} style={{
                background: "#111", border: "none", borderRadius: 8,
                color: "#fff", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0
              }}>復元</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [posts, setPosts] = useState([]);
  const [trash, setTrash] = useState([]);
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CAT_KEY) || JSON.stringify(DEFAULT_CATS)); } catch { return DEFAULT_CATS; }
  });
  const pollRef = useRef();

  useEffect(() => { localStorage.setItem(CAT_KEY, JSON.stringify(categories)); }, [categories]);

  const fetchAll = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([
        sbFetch("/tasks?order=created_at.asc"),
        sbFetch("/posts?order=created_at.desc")
      ]);
      setTasks(t || []);
      setPosts(p || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  const trashCount = trash.length;

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ padding: "28px 0 0" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111", letterSpacing: -0.5 }}>タスク水洋一</div>
        </div>
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #f0f0f0", marginTop: 12 }}>
          {[["tasks","タスク"],["posts","つぶやき"],["trash", `🗑️${trashCount > 0 ? ` ${trashCount}` : ""}`]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "10px 16px",
              color: tab === v ? "#111" : "#bbb",
              borderBottom: tab === v ? "2px solid #111" : "2px solid transparent",
              fontFamily: "inherit", fontWeight: tab === v ? 600 : 400, marginBottom: -1
            }}>{l}</button>
          ))}
        </div>
        {tab === "tasks" && <TasksTab tasks={tasks} setTasks={setTasks} trash={trash} setTrash={setTrash} categories={categories} setCategories={setCategories} />}
        {tab === "posts" && <PostsTab posts={posts} setPosts={setPosts} />}
        {tab === "trash" && <TrashTab trash={trash} setTrash={setTrash} setTasks={setTasks} />}
        <div style={{ marginTop: 32, fontSize: 12, color: "#ccc", textAlign: "center", paddingBottom: 40 }}>
          URLをLINEで共有 · 4秒ごとに自動更新
        </div>
      </div>
    </div>
  );
}
