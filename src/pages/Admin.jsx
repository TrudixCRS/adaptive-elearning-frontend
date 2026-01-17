import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Admin({ onClose }) {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const my = await api.me();
      setMe(my);

      // only load users if admin
      if (my?.role === "admin") {
        const list = await api.adminListUsers();
        setUsers(list);
      }
    } catch (e) {
      setErr(e.message || "Failed");
    }
  }

  async function changeRole(userId, role) {
    setErr("");
    try {
      await api.adminSetRole(userId, role);
      const list = await api.adminListUsers();
      setUsers(list);
    } catch (e) {
      setErr(e.message || "Failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Admin</h2>
        <button className="btn" onClick={onClose}>Back</button>
      </div>

      {err ? (
        <div style={{ marginTop: 10, color: "crimson" }}>{err}</div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        <b>Signed in as:</b>{" "}
        {me ? `${me.full_name || me.email} (${me.role})` : "Loading..."}
      </div>

      {me?.role !== "admin" ? (
        <div style={{ marginTop: 12 }}>
          You are not an admin. (Nothing to manage here.)
        </div>
      ) : (
        <>
          <h3 style={{ marginTop: 18 }}>Users</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div><b>{u.full_name || "(no name)"}</b></div>
                    <div style={{ opacity: 0.8 }}>{u.email}</div>
                    <div style={{ opacity: 0.8 }}>Role: <b>{u.role}</b></div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      className="btn"
                      onClick={() => changeRole(u.id, "student")}
                      disabled={u.role === "student"}
                    >
                      Make student
                    </button>
                    <button
                      className="btn"
                      onClick={() => changeRole(u.id, "admin")}
                      disabled={u.role === "admin"}
                    >
                      Make admin
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
