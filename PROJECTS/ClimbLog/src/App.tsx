import { useEffect, useState } from "react";
import "./App.css";
import { RouteEntryRepository } from "./data/route-entry-repository";
import { getGradesForClimbType } from "./domain/grades/grades";
import type { ClimbResult, ClimbType, RouteEntry } from "./domain/models/climb";
import {
  getDefaultAttemptCount,
  getResultsForClimbType,
} from "./domain/rules/route-entry-rules";
const label: Record<ClimbResult, string> = {
  onsight: "Onsight",
  flash: "Flash",
  send: "Send",
  attempt: "尝试",
};
export default function App() {
  const [db, setDb] = useState<RouteEntryRepository>();
  const [items, setItems] = useState<RouteEntry[]>([]);
  const [type, setType] = useState<ClimbType>("boulder");
  const [grade, setGrade] = useState("V0");
  const [result, setResult] = useState<ClimbResult>("flash");
  const [count, setCount] = useState(1);
  const [filter, setFilter] = useState<"all" | ClimbType>("all");
  useEffect(() => {
    RouteEntryRepository.open().then(async (r) => {
      setDb(r);
      setItems(await r.list());
    });
  }, []);
  const show =
    filter === "all" ? items : items.filter((x) => x.climbType === filter);
  const done = items.filter((x) => x.result !== "attempt").length;
  function switchType(t: ClimbType) {
    setType(t);
    setGrade(getGradesForClimbType(t)[0].code);
    setResult("flash");
    setCount(1);
  }
  async function save() {
    if (!db) return;
    const now = new Date().toISOString();
    await db.put({
      id: crypto.randomUUID(),
      climbType: type,
      gradeSystem: type === "boulder" ? "v-scale" : "french",
      gradeCode: grade,
      result,
      attemptCount: count,
      climbedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    setItems(await db.list());
  }
  async function remove(id: string) {
    if (db && confirm("确定删除这条记录吗？")) {
      await db.delete(id);
      setItems(await db.list());
    }
  }
  return (
    <main>
      <header>
        <span className="eyebrow">CLIMB · LOG · GROW</span>
        <h1>ClimbLog</h1>
        <p>每一次尝试，都算数。</p>
      </header>
      <section className="stats">
        <div>
          <strong>{items.length}</strong>
          <span>线路记录</span>
        </div>
        <div>
          <strong>{done}</strong>
          <span>已完成</span>
        </div>
        <div>
          <strong>
            {items.length ? Math.round((done / items.length) * 100) : 0}%
          </strong>
          <span>完成率</span>
        </div>
      </section>
      <section className="card">
        <h2>快速记录</h2>
        <label>攀岩类型</label>
        <div className="segments">
          <button
            className={type === "boulder" ? "active" : ""}
            onClick={() => switchType("boulder")}
          >
            抱石
          </button>
          <button
            className={type === "sport" ? "active" : ""}
            onClick={() => switchType("sport")}
          >
            难度攀登
          </button>
        </div>
        <label>难度</label>
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          {getGradesForClimbType(type).map((x) => (
            <option key={x.code}>{x.code}</option>
          ))}
        </select>
        <label>结果</label>
        <div className="chips">
          {getResultsForClimbType(type).map((x) => (
            <button
              key={x}
              className={result === x ? "active" : ""}
              onClick={() => {
                setResult(x);
                setCount(getDefaultAttemptCount(x));
              }}
            >
              {label[x]}
            </button>
          ))}
        </div>
        <label>尝试次数</label>
        <input
          type="number"
          value={count}
          disabled={result === "flash" || result === "onsight"}
          min={result === "send" ? 2 : 1}
          onChange={(e) => setCount(Number(e.target.value))}
        />
        <button className="primary" onClick={save}>
          保存记录
        </button>
      </section>
      <section className="recent">
        <h2>历史记录</h2>
        <div className="chips">
          {(["all", "boulder", "sport"] as const).map((x) => (
            <button
              key={x}
              className={filter === x ? "active" : ""}
              onClick={() => setFilter(x)}
            >
              {x === "all" ? "全部" : x === "boulder" ? "抱石" : "难度"}
            </button>
          ))}
        </div>
        {show.length === 0 ? (
          <p className="empty">暂无符合条件的记录。</p>
        ) : (
          show.map((x) => (
            <article key={x.id}>
              <b>{x.gradeCode}</b>
              <span>
                {x.climbType === "boulder" ? "抱石" : "难度"} ·{" "}
                {label[x.result]} · {x.attemptCount} 次
              </span>
              <button onClick={() => remove(x.id)}>删除</button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
