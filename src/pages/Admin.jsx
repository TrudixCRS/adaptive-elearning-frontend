import { useEffect, useState } from "react";
import { getMe } from "../api";

export default function Admin() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setErr("Not allowed / not logged in"));
  }, []);

  if (err) return <div>{err}</div>;
  if (!me) return <div>Loading...</div>;

  if (me.role !== "admin") return <div>Forbidden</div>;

  return <div>Admin panel here</div>;
}
