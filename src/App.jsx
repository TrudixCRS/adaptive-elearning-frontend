import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "./api";
import Admin from "./pages/Admin";

/* -------------------------------
   Small UI helpers
--------------------------------*/
function Button({ children, className = "", ...props }) {
  return (
    <button {...props} className={`btn ${className}`}>
      {children}
    </button>
  );
}

function Input({ className = "", ...props }) {
  return <input {...props} className={`input ${className}`} />;
}

/* -------------------------------
   Header
--------------------------------*/
function Header({ authed, onLogout, showAdmin, onAdmin }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="logo">🎓</span>
        <span className="title">Adaptive eLearning</span>
      </div>

      <div className="header-actions">
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
    </header>
  );
}

/* -------------------------------
   Auth Card
--------------------------------*/
function AuthCard({ onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "register") {
        await api.register(email, password, fullName);
        // optional: auto-login after register
      }
      await api.login(email, password);
      onAuthed();
    } catch (e2) {
      setErr(e2?.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth">
        <h2>{mode === "login" ? "Login" : "Create account"}</h2>

        <form onSubmit={submit} className="form">
          {mode === "register" ? (
            <Input
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          ) : null}

          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {err ? <div className="error">{err}</div> : null}

          <Button disabled={loading} type="submit" className="btn-primary">
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Register"}
          </Button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              <span>No account?</span>
              <Button className="btn-link" onClick={() => setMode("register")}>
                Register
              </Button>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <Button className="btn-link" onClick={() => setMode("login")}>
                Login
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------
   Course List
--------------------------------*/
function CourseList({ onSelect }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const data = await api.listCourses();
        if (alive) setRows(data || []);
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load courses");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="pad">Loading courses…</div>;
  if (err) return <div className="pad error">{err}</div>;

  return (
    <div className="pad">
      <h2>Courses</h2>
      <div className="grid">
        {rows.map((c) => (
          <div key={c.id} className="card course">
            <h3>{c.title}</h3>
            <p>{c.description}</p>
            <Button className="btn-primary" onClick={() => onSelect(c.id)}>
              Open
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------
   Course Detail + Lesson Viewer
--------------------------------*/
function CourseDetail({ courseId, onBack }) {
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [openLessonId, setOpenLessonId] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const data = await api.getCourse(courseId);
        if (alive) setCourse(data);
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load course");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (!openLessonId) {
      setLesson(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setErr("");
        const data = await api.getLesson(openLessonId);
        if (alive) setLesson(data);
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load lesson");
      }
    })();
    return () => {
      alive = false;
    };
  }, [openLessonId]);

  if (loading) return <div className="pad">Loading…</div>;
  if (err) return <div className="pad error">{err}</div>;
  if (!course) return <div className="pad">No course.</div>;

  return (
    <div className="pad">
      <div className="row">
        <Button className="btn-ghost" onClick={onBack}>
          ← Back
        </Button>
        <h2 style={{ margin: 0 }}>{course.title}</h2>
      </div>

      <p className="muted">{course.description}</p>

      <div className="split">
        <div className="card">
          <h3>Lessons</h3>
          <div className="list">
            {(course.lessons || []).map((l) => (
              <Button
                key={l.id}
                className={`btn-ghost ${
                  openLessonId === l.id ? "active" : ""
                }`}
                onClick={() => setOpenLessonId(l.id)}
              >
                {l.title}
              </Button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Lesson</h3>
          {lesson ? (
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {lesson.content || ""}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="muted">Select a lesson…</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------
   App
--------------------------------*/
export default function App() {
  const [authed, setAuthed] = useState(!!api.getToken());
  const [me, setMe] = useState(null);
  const [screen, setScreen] = useState("courses"); // courses | course | admin
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    if (!authed) {
      setMe(null);
      return;
    }
    let alive = true;
    api
      .me()
      .then((u) => {
        if (alive) setMe(u);
      })
      .catch(() => {
        if (alive) setMe(null);
      });
    return () => {
      alive = false;
    };
  }, [authed]);

  const isAdmin = useMemo(() => me?.role === "admin", [me]);

  function onAuthed() {
    setAuthed(true);
    setScreen("courses");
    setSelectedCourse(null);
  }

  function onLogout() {
    api.logout();
    setAuthed(false);
    setScreen("courses");
    setSelectedCourse(null);
  }

  function openCourse(id) {
    setSelectedCourse(id);
    setScreen("course");
  }

  function backToCourses() {
    setSelectedCourse(null);
    setScreen("courses");
  }

  function openAdmin() {
    setSelectedCourse(null);
    setScreen("admin");
  }

  if (!authed) {
    return (
      <>
        <Header authed={false} />
        <AuthCard onAuthed={onAuthed} />
        <Style />
      </>
    );
  }

  return (
    <>
      <Header
        authed={true}
        onLogout={onLogout}
        showAdmin={isAdmin}
        onAdmin={openAdmin}
      />

      {screen === "admin" ? (
        <Admin />
      ) : screen === "course" && selectedCourse ? (
        <CourseDetail courseId={selectedCourse} onBack={backToCourses} />
      ) : (
        <CourseList onSelect={openCourse} />
      )}

      <Style />
    </>
  );
}

/* -------------------------------
   Styles
--------------------------------*/
function Style() {
  return (
    <style>{`
      :root{--bg:#0b1020;--card:#111a33;--txt:#eaf0ff;--muted:#aab5d6;--pri:#6ea8fe;--border:rgba(255,255,255,.08)}
      *{box-sizing:border-box}
      body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:radial-gradient(1200px 600px at 10% 10%,rgba(110,168,254,.12),transparent),var(--bg);color:var(--txt)}
      .header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);backdrop-filter:blur(8px);position:sticky;top:0;background:rgba(11,16,32,.65)}
      .brand{display:flex;align-items:center;gap:10px}
      .logo{font-size:20px}
      .title{font-weight:700;letter-spacing:.2px}
      .header-actions{display:flex;gap:10px}
      .pad{padding:18px;max-width:1050px;margin:0 auto}
      .auth-wrap{padding:30px 18px;max-width:520px;margin:0 auto}
      .card{background:rgba(17,26,51,.85);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
      .auth h2{margin:0 0 12px}
      .form{display:flex;flex-direction:column;gap:10px}
      .input{padding:12px 12px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--txt);outline:none}
      .input:focus{border-color:rgba(110,168,254,.55);box-shadow:0 0 0 3px rgba(110,168,254,.15)}
      .btn{cursor:pointer;border-radius:12px;padding:10px 12px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--txt)}
      .btn:hover{border-color:rgba(110,168,254,.35)}
      .btn-primary{background:rgba(110,168,254,.20);border-color:rgba(110,168,254,.55)}
      .btn-ghost{background:transparent}
      .btn-link{background:transparent;border:0;padding:6px 8px;color:var(--pri);text-decoration:underline}
      .btn[disabled]{opacity:.6;cursor:not-allowed}
      .error{color:#ffb3b3}
      .muted{color:var(--muted)}
      .auth-switch{margin-top:12px;display:flex;align-items:center;gap:8px;color:var(--muted)}
      h2,h3{margin:0 0 10px}
      p{margin:6px 0 12px}
      .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:12px}
      .course h3{margin-bottom:6px}
      .row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
      .split{display:grid;grid-template-columns:1fr 2fr;gap:12px}
      @media (max-width:900px){.split{grid-template-columns:1fr}}
      .list{display:flex;flex-direction:column;gap:8px}
      .active{border-color:rgba(110,168,254,.55);background:rgba(110,168,254,.12)}
      .markdown{line-height:1.55}
      .markdown a{color:var(--pri)}
      .markdown code{background:rgba(255,255,255,.06);padding:2px 6px;border-radius:8px}
      .markdown pre{background:rgba(255,255,255,.06);padding:12px;border-radius:12px;overflow:auto}
    `}</style>
  );
}
