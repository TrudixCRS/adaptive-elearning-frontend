import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import React, { useMemo, useState, useEffect } from "react";
import { api, getToken, setToken, clearToken } from "./api.js";
import Admin from "./pages/Admin.jsx";

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Button({ children, ...props }) {
  return (
    <button className="btn" {...props}>
      {children}
    </button>
  );
}

function Input(props) {
  return <input className="input" {...props} />;
}

function Select(props) {
  return <select className="input" {...props} />;
}

function Header({ onLogout, authed, isAdmin, onOpenAdmin }) {
  return (
    <div className="header">
      <div>
        <div className="title">Adaptive E-Learning</div>
        <div className="sub">Personalised learning paths (demo)</div>
      </div>

      <div className="headerActions">
        {authed && isAdmin ? <Button onClick={onOpenAdmin}>Admin</Button> : null}
        {authed ? <Button onClick={onLogout}>Logout</Button> : null}
      </div>
    </div>
  );
}

function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register(email, password, fullName);
      }
      const res = await api.login(email, password);
      setToken(res.access_token);
      onAuthed();
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="row space">
        <div className="h2">{mode === "login" ? "Login" : "Create account"}</div>
        <div className="row">
          <Button onClick={() => setMode("login")} disabled={mode === "login"}>
            Login
          </Button>
          <Button onClick={() => setMode("register")} disabled={mode === "register"}>
            Register
          </Button>
        </div>
      </div>

      <form onSubmit={submit} className="stack">
        {mode === "register" && (
          <div>
            <label className="label">Full name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Cristian Ion"
            />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {err ? <div className="error">{err}</div> : null}

        <Button type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Login" : "Register & Login"}
        </Button>

        <div className="hint">
          Tip: Backend must be running and <code>VITE_API_BASE</code> must match it.
        </div>
      </form>
    </Card>
  );
}

function Courses({ onSelectCourse }) {
  const [courses, setCourses] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setBusy(true);
        setErr("");
        const data = await api.listCourses();
        if (!ignore) setCourses(data);
      } catch (e) {
        if (!ignore) setErr(e.message || String(e));
      } finally {
        if (!ignore) setBusy(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div>
      <div className="h2">Courses</div>
      {busy ? <div className="hint">Loading...</div> : null}
      {err ? <div className="error">{err}</div> : null}

      <div className="grid">
        {courses.map((c) => (
          <Card key={c.id}>
            <div className="h3">{c.title}</div>
            <div className="hint">{c.description}</div>
            <div style={{ marginTop: 12 }}>
              <Button onClick={() => onSelectCourse(c)}>Open</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CoursePage({ course, onBack, onOpenLesson }) {
  return (
    <Card>
      <div className="row space">
        <Button onClick={onBack}>← Back</Button>
        <div className="h2">{course.title}</div>
        <div />
      </div>

      <div className="hint" style={{ marginTop: 8 }}>
        {course.description}
      </div>

      <div className="layout" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="h3">Lessons</div>
          <div className="hint">Select a lesson...</div>

          <div style={{ marginTop: 12 }}>
            {(course.modules || []).flatMap((m) => m.lessons || []).map((l) => (
              <div key={l.id} className="row space" style={{ marginTop: 8 }}>
                <div>{l.title}</div>
                <Button onClick={() => onOpenLesson(l.id)}>Open</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="h3">Lesson</div>
          <div className="hint">Select a lesson...</div>
        </div>
      </div>
    </Card>
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
            {lesson?.lesson_type ? <div className="pill">Type: {lesson.lesson_type}</div> : null}
            {lesson?.difficulty ? <div className="pill">Difficulty: {lesson.difficulty}</div> : null}
            {isCompleted ? <div className="pill">✅ Completed</div> : <div className="pill">⏳ In progress</div>}
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
            <div className="hint">
              Quiz UI coming next. For now, content can include questions in Markdown below.
              <hr className="hr" />
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : isInteractive ? (
            <div className="hint">
              Interactive UI coming next. For now, we render the instructions as Markdown.
              <hr className="hr" />
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export default function App() {
  const [authedTick, setAuthedTick] = useState(0);
  const authed = useMemo(() => !!getToken(), [authedTick]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [openLessonId, setOpenLessonId] = useState(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  async function refreshMe() {
    try {
      const me = await api.me();
      setIsAdmin(me?.role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }

  async function onAuthed() {
    setAuthedTick((x) => x + 1);
    await refreshMe();
  }

  function logout() {
    clearToken();
    setSelectedCourse(null);
    setOpenLessonId(null);
    setShowAdmin(false);
    setIsAdmin(false);
    setAuthedTick((x) => x + 1);
  }

  useEffect(() => {
    if (authed) refreshMe();
  }, [authed]);

  return (
    <div className="page">
      <Header
        authed={authed}
        isAdmin={isAdmin}
        onOpenAdmin={() => setShowAdmin(true)}
        onLogout={logout}
      />

      {!authed ? (
        <Auth onAuthed={onAuthed} />
      ) : showAdmin ? (
        <Admin onBack={() => setShowAdmin(false)} />
      ) : openLessonId ? (
        <LessonViewer
          lessonId={openLessonId}
          onBack={() => setOpenLessonId(null)}
          onCompleted={() => {}}
          onNext={() => {}}
          nextLesson={null}
          isCompleted={false}
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
    </div>
  );
}
