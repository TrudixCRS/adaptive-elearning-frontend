import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "./api";
import Admin from "./pages/Admin";

function lsKey(courseId) {
  const t = api.getToken() || "anon";
  return `aelp_progress_${t.slice(0, 12)}_${courseId}`;
}
function loadProgress(courseId) {
  try {
    const raw = localStorage.getItem(lsKey(courseId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function saveProgress(courseId, map) {
  try {
    localStorage.setItem(lsKey(courseId), JSON.stringify(map || {}));
  } catch {}
}

function Card({ children, className = "", ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

function Button({ children, className = "", ...props }) {
  return (
    <button className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
}

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function Header({ authed, onLogout, showAdmin, onAdmin }) {
  return (
    <div className="header">
      <div>
        <div className="title">Adaptive E-Learning</div>
        <div className="sub">Personalised learning paths (demo)</div>
      </div>
      <div className="row">
        {authed ? (
          <>
            {showAdmin ? (
              <Button onClick={onAdmin} className="btn-ghost">
                Admin
              </Button>
            ) : null}

            <Button onClick={onLogout} className="btn-ghost">
              Logout
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Auth({ onAuthed }) {
  const [mode, setMode] = useState("register"); // register|login
  const [fullName, setFullName] = useState("Cristian Ion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register(email, password, fullName);
      }
      const r = await api.login(email, password);
      api.setToken(r.access_token);
      onAuthed();
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="h2">{mode === "register" ? "Create account" : "Login"}</div>
        <div className="seg">
          <button className={mode === "login" ? "segOn" : ""} onClick={() => setMode("login")} type="button">
            Login
          </button>
          <button className={mode === "register" ? "segOn" : ""} onClick={() => setMode("register")} type="button">
            Register
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="form">
        {mode === "register" ? (
          <>
            <label>Full name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </>
        ) : null}

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />

        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />

        {err ? <div className="err">{err}</div> : null}

        <Button disabled={busy} className="btn-primary" type="submit">
          {busy ? "Please wait..." : mode === "register" ? "Register & Login" : "Login"}
        </Button>

        <div className="hint">Tip: Backend must be running and VITE_API_BASE must match it.</div>
      </form>
    </Card>
  );
}

function Courses({ onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr("");
    setBusy(true);
    try {
      const r = await api.listCourses();
      setCourses(r || []);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="h2">Courses</div>
        <Button onClick={load} disabled={busy}>
          Refresh
        </Button>
      </div>

      {err ? <div className="err">{err}</div> : null}

      <div className="list">
        {courses.map((c) => (
          <div className="listItem" key={c.id}>
            <div>
              <div className="itemTitle">{c.title}</div>
              <div className="itemSub">{c.description}</div>
            </div>
            <Button className="btn-primary" onClick={() => onSelectCourse(c)}>
              Open
            </Button>
          </div>
        ))}
        {!courses.length && !busy ? <div className="hint">No courses yet. Run the seed.</div> : null}
      </div>
    </Card>
  );
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="pwrap" title={`${done}/${total} completed`}>
      <div className="prow">
        <div className="pmeta">
          <span className="pnum">{pct}%</span>
          <span className="pmuted">
            {done}/{total} lessons
          </span>
        </div>
      </div>
      <div className="pbar">
        <div className="pfill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CourseShell({
  course,
  onBackToCourses,
  openLessonId,
  setOpenLessonId,
}) {
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [recMode, setRecMode] = useState("adaptive");
  const [rec, setRec] = useState(null);

  const [progressMap, setProgressMap] = useState(() => loadProgress(course.id));

  // keep localStorage in sync
  useEffect(() => {
    saveProgress(course.id, progressMap);
  }, [course.id, progressMap]);

  async function loadCourse() {
    setErr("");
    setBusy(true);
    try {
      const r = await api.getCourse(course.id);
      setDetail(r);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadCourse();
    // load persisted progress for this course
    setProgressMap(loadProgress(course.id));
    // reset recommendation when switching courses
    setRec(null);
  }, [course?.id]);

  const flatLessons = useMemo(() => {
    const out = [];
    (detail?.modules || []).forEach((m) => {
      (m.lessons || []).forEach((l) => out.push({ ...l, module_id: m.id, module_title: m.title }));
    });
    // assumes backend already sends in order (sort_order); if not, you can sort here
    return out;
  }, [detail]);

  const totalLessons = flatLessons.length;
  const completedCount = useMemo(() => {
    return flatLessons.reduce((acc, l) => acc + (progressMap[l.id] ? 1 : 0), 0);
  }, [flatLessons, progressMap]);

  const currentLesson = useMemo(() => {
    return flatLessons.find((l) => l.id === openLessonId) || null;
  }, [flatLessons, openLessonId]);

  const nextUncompleted = useMemo(() => {
    // baseline: first uncompleted in the flattened order
    return flatLessons.find((l) => !progressMap[l.id]) || null;
  }, [flatLessons, progressMap]);

  const nextAfterCurrent = useMemo(() => {
    if (!openLessonId) return nextUncompleted;
    const idx = flatLessons.findIndex((l) => l.id === openLessonId);
    if (idx < 0) return nextUncompleted;
    for (let i = idx + 1; i < flatLessons.length; i++) {
      if (!progressMap[flatLessons[i].id]) return flatLessons[i];
    }
    // if no later uncompleted, fallback to first uncompleted anywhere
    return nextUncompleted;
  }, [openLessonId, flatLessons, progressMap, nextUncompleted]);

  async function getRec() {
    setErr("");
    setBusy(true);
    try {
      const r = await api.nextRecommendation(course.id, recMode);
      setRec(r);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function markLocalCompleted(lessonId) {
    setProgressMap((prev) => ({ ...(prev || {}), [lessonId]: true }));
  }

  function openLesson(lessonId) {
    setOpenLessonId(lessonId);
  }

  function openNextLesson() {
    const target = openLessonId ? nextAfterCurrent : nextUncompleted;
    if (target?.id) openLesson(target.id);
  }

  const sidebar = (
    <div className="sidebar">
      <div className="sbTop">
        <Button onClick={onBackToCourses} className="btn-ghost">
          ← Courses
        </Button>

        <div className="sbTitle">{course.title}</div>
        <div className="sbSub">{course.description}</div>

        <ProgressBar done={completedCount} total={totalLessons} />

        <div className="sbActions">
          <Button className="btn-primary" onClick={openNextLesson} disabled={!nextUncompleted}>
            {openLessonId ? "Next lesson" : "Start / Continue"}
          </Button>
          <Button onClick={loadCourse} disabled={busy}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="sbList">
        {(detail?.modules || []).map((m) => (
          <div className="sbModule" key={m.id}>
            <div className="sbModuleTitle">{m.title}</div>
            <div className="sbLessons">
              {(m.lessons || []).map((l) => {
                const done = !!progressMap[l.id];
                const active = l.id === openLessonId;
                return (
                  <button
                    key={l.id}
                    className={`sbLesson ${active ? "sbLessonOn" : ""}`}
                    onClick={() => openLesson(l.id)}
                    type="button"
                  >
                    <div className={`dot ${done ? "dotDone" : ""}`}>{done ? "✓" : ""}</div>
                    <div className="sbLessonText">
                      <div className="sbLessonTitle">{l.title}</div>
                      <div className="sbLessonMeta">
                        <span>{l.lesson_type}</span>
                        <span>•</span>
                        <span>Lvl {l.difficulty}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {err ? <div className="err" style={{ marginTop: 12 }}>{err}</div> : null}
    </div>
  );

  const main = (
    <div className="main">
      {!openLessonId ? (
        <>
          <Card className="hero">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="h1">Welcome back 👋</div>
                <div className="hint" style={{ marginTop: 6 }}>
                  Pick a lesson from the left, or use <b>Start / Continue</b> to jump to your next uncompleted lesson.
                </div>
              </div>
              <div className="kpi">
                <div className="kpiNum">{completedCount}</div>
                <div className="kpiLab">completed</div>
              </div>
            </div>

            <div className="heroGrid">
              <div className="heroCard">
                <div className="heroLabel">Next up (baseline)</div>
                <div className="heroValue">{nextUncompleted ? nextUncompleted.title : "All done 🎉"}</div>
                <div className="heroSub">
                  {nextUncompleted ? `${nextUncompleted.lesson_type} • Lvl ${nextUncompleted.difficulty}` : "You can review lessons anytime."}
                </div>
                <Button className="btn-primary" onClick={openNextLesson} disabled={!nextUncompleted}>
                  Open next
                </Button>
              </div>

              <div className="heroCard">
                <div className="heroLabel">Adaptive recommendation</div>
                <div className="heroSub">Uses your existing backend endpoint.</div>
                <div className="row" style={{ marginTop: 10 }}>
                  <select value={recMode} onChange={(e) => setRecMode(e.target.value)} className="select" style={{ minWidth: 160 }}>
                    <option value="adaptive">Adaptive</option>
                    <option value="baseline">Baseline</option>
                  </select>
                  <Button className="btn-primary" onClick={getRec} disabled={busy}>
                    Get recommendation
                  </Button>
                </div>

                {rec ? (
                  <div className="recBox" style={{ marginTop: 12 }}>
                    <div className="recTitle">{rec.title}</div>
                    <div className="row">
                      <Pill>Type: {rec.lesson_type}</Pill>
                      <Pill>Difficulty: {rec.difficulty}</Pill>
                      {rec.score !== undefined ? <Pill>Score: {Number(rec.score).toFixed(3)}</Pill> : null}
                    </div>
                    <div className="recReason">
                      <b>Reason:</b> {rec.reason}
                    </div>
                    <Button className="btn-primary" onClick={() => openLesson(rec.lesson_id)}>
                      Open this lesson
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <Card>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="h2">Course overview</div>
                <div className="hint">Modules and lessons are shown in the sidebar. This view is your “dashboard”.</div>
              </div>
              <Button onClick={loadCourse} disabled={busy}>
                Refresh
              </Button>
            </div>

            <div className="overview">
              {(detail?.modules || []).map((m) => (
                <div key={m.id} className="ovModule">
                  <div className="ovTitle">{m.title}</div>
                  <div className="ovSub">{(m.lessons || []).length} lessons</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <LessonViewer
          lessonId={openLessonId}
          onBack={() => setOpenLessonId(null)}
          onCompleted={(id) => {
            markLocalCompleted(id);
          }}
          onNext={() => {
            openNextLesson();
          }}
          nextLesson={nextAfterCurrent}
          isCompleted={!!progressMap[openLessonId]}
        />
      )}
    </div>
  );

  return (
    <div className="layout">
      {sidebar}
      {main}
    </div>
  );
}

function QuizRenderer({ lesson, onPassed }) {
  let payload = null;
  try {
    payload = JSON.parse(lesson?.content || "{}");
  } catch {
    payload = null;
  }

  const questions = payload?.questions || [];
  const [answers, setAnswers] = useState(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const passMark = payload?.passMark ?? 0.6;

  useEffect(() => {
    // reset when lesson changes
    setAnswers(questions.map(() => null));
    setSubmitted(false);
    setScore(null);
  }, [lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions.length) {
    return (
      <div className="hint">
        <b>Quiz lesson</b> but no quiz JSON found in <code>lesson.content</code>.
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          Expected JSON: {"{"}"questions":[{"{"}"q":"...","options":["A","B"],"answerIndex":0,"explain":"..."{"}"}]{"}"}
        </div>
      </div>
    );
  }

  function pick(qi, oi) {
    if (submitted) return;
    setAnswers((prev) => {
      const copy = [...prev];
      copy[qi] = oi;
      return copy;
    });
  }

  async function submit() {
    const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.answerIndex ? 1 : 0), 0);
    const s = questions.length ? correct / questions.length : 0;
    setScore(s);
    setSubmitted(true);

    if (s >= passMark) {
      await onPassed(s); // caller will save score + mark completed
    }
  }

  return (
    <div>
      {questions.map((q, qi) => (
        <div key={qi} style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900 }}>
            {qi + 1}. {q.q}
          </div>

          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {q.options.map((opt, oi) => {
              const chosen = answers[qi] === oi;
              const correct = submitted && oi === q.answerIndex;
              const wrong = submitted && chosen && oi !== q.answerIndex;

              return (
                <button
                  key={oi}
                  className={"btn " + (chosen ? "btn-primary" : "")}
                  onClick={() => pick(qi, oi)}
                  type="button"
                  style={{
                    textAlign: "left",
                    border: wrong ? "2px solid #ff5f6d" : correct ? "2px solid #2be4a7" : undefined,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {submitted && q.explain ? (
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              <em>{q.explain}</em>
            </div>
          ) : null}
        </div>
      ))}

      <div className="row" style={{ marginTop: 16 }}>
        <Button
          className="btn-primary"
          onClick={submit}
          disabled={submitted || answers.some((a) => a === null)}
        >
          Submit quiz
        </Button>

        {submitted && score !== null ? (
          <div>
            Score: <b>{Math.round(score * 100)}%</b>{" "}
            {score >= passMark ? "✅ Passed" : "❌ Not passed"}
          </div>
        ) : null}
      </div>

      {submitted && score !== null && score < passMark ? (
        <div className="hint" style={{ marginTop: 10 }}>
          Tip: review the previous lesson and try again.
        </div>
      ) : null}
    </div>
  );
}


function LessonViewer({ lessonId, onBack, onCompleted, onNext, nextLesson, isCompleted }) {
  const [lesson, setLesson] = useState(null);
  const [err, setErr] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr("");
    setDoneMsg("");
    setBusy(true);
    try {
      const r = await api.getLesson(lessonId);
      setLesson(r);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function markCompleted() {
    try {
      setDoneMsg("");
      await api.markCompleted(lessonId);
      onCompleted?.(lessonId);
      setDoneMsg("✅ Lesson marked as completed!");
    } catch (e) {
      setDoneMsg(e.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, [lessonId]);

  const content = lesson?.content || "";
  const isVideo = lesson?.lesson_type === "video" && /^https?:\/\//i.test(content.trim());
  const isQuiz = lesson?.lesson_type === "quiz";
  const isInteractive = lesson?.lesson_type === "interactive";

  return (
    <Card>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 260 }}>
          <div className="h2">{lesson?.title || "Lesson"}</div>
          <div className="row" style={{ marginTop: 8 }}>
            {lesson?.lesson_type ? <Pill>Type: {lesson.lesson_type}</Pill> : null}
            {lesson?.difficulty ? <Pill>Difficulty: {lesson.difficulty}</Pill> : null}
            {isCompleted ? <Pill>✅ Completed</Pill> : <Pill>⏳ In progress</Pill>}
          </div>
        </div>

        <div className="row">
          <Button className="btn-primary" onClick={markCompleted} disabled={!lesson || busy}>
            Mark completed
          </Button>
          <Button className="btn-primary" onClick={onNext} disabled={!nextLesson}>
            Next lesson
          </Button>
          <Button onClick={onBack}>Back</Button>
        </div>
      </div>

      {err ? <div className="err">{err}</div> : null}
      {doneMsg ? <div className="ok">{doneMsg}</div> : null}

      {!lesson && busy ? <div className="hint">Loading lesson...</div> : null}

      {lesson ? (
        <div className="lessonBody">
          {isVideo ? (
            <div className="videoWrap">
              <iframe
                src={content.trim()}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isQuiz ? (
            <QuizRenderer
              lesson={lesson}
              onPassed={async (s) => {
                // save score + mark completed
                await api.markCompleted(lesson.id, s);
                onCompleted?.(lesson.id);
                setDoneMsg(`✅ Quiz passed! Saved score: ${Math.round(s * 100)}%`);
              }}
            />
          ) : isInteractive ? (
            <div className="hint">
              Interactive UI coming next. For now, we render the instructions as Markdown.
              <hr className="hr" />
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "No content yet."}</ReactMarkdown>
          )}

          {nextLesson ? (
            <div className="nextCard">
              <div className="nextTop">
                <div>
                  <div className="nextLabel">Up next</div>
                  <div className="nextTitle">{nextLesson.title}</div>
                  <div className="nextSub">
                    {nextLesson.lesson_type} • Lvl {nextLesson.difficulty}
                  </div>
                </div>
                <Button className="btn-primary" onClick={onNext}>
                  Open next
                </Button>
              </div>
            </div>
          ) : (
            <div className="hint" style={{ marginTop: 14 }}>
              🎉 You’ve completed all lessons in this course (or none remain uncompleted).
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!api.getToken());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [openLessonId, setOpenLessonId] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);


  function onAuthed() {
    setAuthed(true);
  }

  function logout() {
    api.clearToken();
    setAuthed(false);
    setSelectedCourse(null);
    setOpenLessonId(null);
    setAdminOpen(false);
    setAuthedTick((x) => x + 1);
  }

useEffect(() => {
  let ignore = false;

  async function loadMe() {
    if (!getToken()) {
      setIsAdmin(false);
      return;
    }
    try {
      const me = await api.me();
      if (!ignore) setIsAdmin(me?.role === "admin");
    } catch {
      if (!ignore) setIsAdmin(false);
    }
  }

  loadMe();
  return () => {
    ignore = true;
  };
}, [authedTick]);

  return (
    <div className="page">
      <Header
        authed={authed}
        onLogout={logout}
        showAdmin={isAdmin}
        onAdmin={() => setAdminOpen(true)}
      />
      {!authed ? (
        <Auth onAuthed={onAuthed} />
      ) : adminOpen ? (
        <Admin />
      ) : openLessonId ? (
        <LessonViewer
          lessonId={openLessonId}
          onBack={() => setOpenLessonId(null)}
          onMarkComplete={async (id) => {
            await api.markCompleted(id);
            alert("Marked completed ✅");
          }}
        />
      ) : selectedCourse ? (
        <CoursePage
          course={selectedCourse}
          onBack={() => setSelectedCourse(null)}
          onOpenLesson={(id) => setOpenLessonId(id)}
        />
      ) : (
        <Courses onSelectCourse={setSelectedCourse} />
      )}

      <div className="footer">
        Backend URL: <code>{import.meta.env.VITE_API_BASE}</code>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
:root{
  --bg:#070b16;
  --panel:#0c1224;
  --panel2:#0f1730;
  --text:#e8ecff;
  --muted:#aab4e6;
  --border:rgba(255,255,255,.08);
  --border2:rgba(255,255,255,.12);
  --primary:#6ea8ff;
  --primary2:#2f6bff;
  --danger:#ff5f6d;
  --ok:#2be4a7;
}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(900px 500px at 30% 10%, rgba(110,168,255,.12), transparent 60%), var(--bg); color:var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;}
.page{max-width:1200px;margin:0 auto;padding:32px 18px 60px;}
.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px}
.title{font-size:26px;font-weight:800;letter-spacing:.2px}
.sub{color:var(--muted);margin-top:4px}

.card{
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid var(--border);
  box-shadow: 0 12px 35px rgba(0,0,0,.4);
  border-radius:16px;
  padding:18px;
  margin-top:14px;
}
.h1{font-size:22px;font-weight:900}
.h2{font-size:18px;font-weight:800}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.form{display:flex;flex-direction:column;gap:10px;margin-top:10px}
label{font-size:12px;color:var(--muted)}
input, .select{
  width:100%;
  background: rgba(0,0,0,.22);
  color:var(--text);
  border:1px solid var(--border2);
  border-radius:10px;
  padding:10px 12px;
  outline:none;
}
input:focus, .select:focus{border-color: rgba(110,168,255,.45)}
.btn{
  border:1px solid var(--border2);
  background: rgba(0,0,0,.18);
  color:var(--text);
  padding:10px 12px;
  border-radius:12px;
  cursor:pointer;
}
.btn:hover{border-color: rgba(110,168,255,.35)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn-primary{
  background: linear-gradient(180deg, rgba(110,168,255,.35), rgba(47,107,255,.25));
  border-color: rgba(110,168,255,.45);
}
.btn-ghost{background:transparent}

.err{
  margin-top:10px;
  padding:10px 12px;
  border-radius:12px;
  background: rgba(255,95,109,.12);
  border:1px solid rgba(255,95,109,.35);
  color:#ffd5da;
}
.ok{
  margin-top:10px;
  padding:10px 12px;
  border-radius:12px;
  background: rgba(43,228,167,.10);
  border:1px solid rgba(43,228,167,.35);
  color:#c7ffe9;
}
.hint{color:var(--muted);font-size:12px;margin-top:8px}
.footer{margin-top:18px;color:var(--muted);font-size:12px}

.list{display:flex;flex-direction:column;gap:10px;margin-top:10px}
.listItem{
  display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:12px;border-radius:14px;border:1px solid var(--border);
  background: rgba(0,0,0,.16);
}
.itemTitle{font-weight:800}
.itemSub{color:var(--muted);font-size:12px;margin-top:2px}
.seg{display:flex;border:1px solid var(--border2);border-radius:12px;overflow:hidden}
.seg button{border:none;background:transparent;color:var(--muted);padding:8px 12px;cursor:pointer}
.segOn{background: rgba(110,168,255,.18) !important;color: var(--text) !important}
.pill{font-size:12px;color:var(--muted);border:1px solid var(--border2);padding:4px 8px;border-radius:999px;background: rgba(0,0,0,.14)}

.layout{
  display:grid;
  grid-template-columns: 340px 1fr;
  gap: 14px;
  align-items:start;
}
@media (max-width: 980px){
  .layout{grid-template-columns: 1fr}
}

.sidebar{
  position: sticky;
  top: 18px;
  align-self: start;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
  overflow: hidden;
}
.sbTop{padding:14px 14px 12px;border-bottom:1px solid var(--border)}
.sbTitle{font-weight:900;font-size:16px;margin-top:10px}
.sbSub{color:var(--muted);font-size:12px;margin-top:4px;line-height:1.35}
.sbActions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}

.sbList{max-height: calc(100vh - 260px); overflow:auto; padding: 12px 10px;}
.sbModule{margin-bottom:14px}
.sbModuleTitle{font-weight:900;color:var(--text);font-size:13px;margin:8px 6px}
.sbLessons{display:flex;flex-direction:column;gap:8px}
.sbLesson{
  width:100%;
  display:flex;
  gap:10px;
  align-items:flex-start;
  text-align:left;
  border:1px solid var(--border);
  background: rgba(0,0,0,.16);
  color:var(--text);
  padding:10px 10px;
  border-radius:14px;
  cursor:pointer;
}
.sbLesson:hover{border-color: rgba(110,168,255,.25)}
.sbLessonOn{
  border-color: rgba(110,168,255,.45);
  background: rgba(110,168,255,.08);
}
.dot{
  width:22px;height:22px;border-radius:999px;
  border:1px solid var(--border2);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;color:var(--muted);
  background: rgba(0,0,0,.20);
  flex: 0 0 auto;
  margin-top: 2px;
}
.dotDone{
  border-color: rgba(43,228,167,.55);
  color: rgba(43,228,167,1);
  background: rgba(43,228,167,.10);
}
.sbLessonText{min-width:0}
.sbLessonTitle{font-weight:900;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sbLessonMeta{display:flex;gap:8px;color:var(--muted);font-size:12px;margin-top:3px}

.main{min-width:0}
.hero{margin-top:0}
.heroGrid{
  margin-top:14px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 980px){
  .heroGrid{grid-template-columns: 1fr}
}
.heroCard{
  border:1px solid var(--border);
  background: rgba(0,0,0,.14);
  border-radius:14px;
  padding:12px;
}
.heroLabel{color:var(--muted);font-size:12px}
.heroValue{font-weight:900;margin-top:6px}
.heroSub{color:var(--muted);font-size:12px;margin-top:4px}
.kpi{border:1px solid var(--border);background:rgba(0,0,0,.14);padding:10px 12px;border-radius:14px;text-align:center}
.kpiNum{font-weight:900;font-size:18px}
.kpiLab{color:var(--muted);font-size:12px}

.overview{
  margin-top:12px;
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 980px){
  .overview{grid-template-columns: 1fr}
}
.ovModule{
  border:1px solid var(--border);
  background: rgba(0,0,0,.14);
  border-radius:14px;
  padding:12px;
}
.ovTitle{font-weight:900}
.ovSub{color:var(--muted);font-size:12px;margin-top:4px}

.pwrap{margin-top:12px}
.pmeta{display:flex;gap:10px;align-items:baseline}
.pnum{font-weight:900}
.pmuted{color:var(--muted);font-size:12px}
.pbar{
  margin-top:8px;
  height:10px;
  border-radius:999px;
  background: rgba(255,255,255,.08);
  border: 1px solid var(--border);
  overflow:hidden;
}
.pfill{
  height:100%;
  background: linear-gradient(90deg, rgba(110,168,255,.85), rgba(47,107,255,.75));
}

.recBox{margin-top:12px;padding:12px;border-radius:14px;border:1px solid rgba(110,168,255,.35);background: rgba(110,168,255,.08)}
.recTitle{font-weight:900;margin-bottom:8px}
.recReason{margin-top:8px;color:var(--muted);font-size:12px}

.lessonBody{margin-top:14px;line-height:1.6}
.lessonBody h1,.lessonBody h2,.lessonBody h3{margin:14px 0 8px}
.lessonBody pre{overflow:auto;padding:12px;border-radius:12px;background: rgba(0,0,0,.35);border:1px solid var(--border)}
.lessonBody code{background: rgba(255,255,255,.06);padding:2px 6px;border-radius:8px}
.hr{border:none;border-top:1px solid var(--border);margin:12px 0}

.videoWrap{position:relative;width:100%;padding-top:56.25%;border-radius:14px;overflow:hidden;border:1px solid var(--border)}
.videoWrap iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}

.nextCard{
  margin-top: 16px;
  border: 1px solid var(--border);
  background: rgba(0,0,0,.14);
  border-radius: 14px;
  padding: 12px;
}
.nextTop{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
.nextLabel{color:var(--muted);font-size:12px}
.nextTitle{font-weight:900;margin-top:4px}
.nextSub{color:var(--muted);font-size:12px;margin-top:3px}
`;
