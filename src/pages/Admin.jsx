import { useEffect, useState } from "react";
import { getMe } from "../api.js";

export default function Admin({ onBack }) {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((e) => setErr(e.message || "Not allowed / not logged in"));
  }, []);

  return (
    <div className="card">
      <div className="row space">
        <div className="h2">Admin</div>
        <button className="btn" onClick={onBack}>Back</button>
      </div>

      {err ? <div className="error">{err}</div> : null}
      {!err && !me ? <div className="hint">Loading...</div> : null}

      {me && me.role !== "admin" ? (
        <div className="error">Forbidden (not an admin)</div>
      ) : null}

      {me && me.role === "admin" ? (
        <div className="hint">✅ Admin panel ready.</div>
      ) : null}
    </div>
  );
}
