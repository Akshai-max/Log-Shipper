from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST
from pydantic import BaseModel
from typing import Optional
from urllib.parse import urlparse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

total_events = Counter("total_events", "Total logged events", ["machine_id", "event"])
time_spent_seconds = Counter("time_spent_seconds", "Total time spent", ["machine_id", "domain"])
active_users = Gauge("active_users", "Number of unique active machines")
tab_switch_count = Counter("tab_switch_count", "Tab switches per machine", ["machine_id"])
suspicious_activity_count = Counter("suspicious_activity_count", "Suspicious high-severity events", ["machine_id"])

import time

clients_db = {}
restricted_domains = set()

class RestrictionRequest(BaseModel):
    domain: str

class UserInfo(BaseModel):
    email: str
    name: str

class LogEntry(BaseModel):
    machine_id: str
    user: Optional[str] = "unknown"
    user_name: Optional[str] = "Unknown User"
    event: str
    url: str
    timestamp: Optional[str] = ""
    duration_ms: Optional[int] = 0
    severity: Optional[str] = "low"
    session_id: Optional[str] = None
    focus_loss_count: Optional[int] = 0

@app.post("/log")
async def receive_log(log: LogEntry):
    domain = urlparse(log.url).netloc or log.url if log.url else "unknown"

    total_events.labels(machine_id=log.machine_id, event=log.event).inc()
    
    # Update Security Score
    score_increment = 0
    if log.severity in ["high", "critical"]:
        score_increment += 10
        suspicious_activity_count.labels(machine_id=log.machine_id).inc()
    if log.focus_loss_count > 5:
        score_increment += 2

    # Aggregation
    m_id = log.machine_id
    now = int(time.time())
    
    if m_id not in clients_db:
        clients_db[m_id] = {
            "machine_id": m_id,
            "user": log.user,
            "last_seen": now,
            "total_events": 0,
            "suspicious_score": 0,
            "domains": {},
            "activity_timeline": []
        }
        active_users.set(len(clients_db))
    
    client = clients_db[m_id]
    if log.user and log.user != "unknown":
        client["user"] = log.user
    if log.user_name and log.user_name != "Unknown User":
        client["user_name"] = log.user_name
    client["last_seen"] = now
    client["total_events"] += 1
    client["suspicious_score"] += score_increment
    
    client["activity_timeline"].append({"time": now, "event": log.event, "domain": domain})
    client["activity_timeline"] = client["activity_timeline"][-100:]
    
    if domain not in client["domains"]:
        client["domains"][domain] = {"tab_switch_count": 0, "time_spent": 0}
        
    if log.event == "tab_switch":
        client["domains"][domain]["tab_switch_count"] += 1
    elif log.event == "time_spent":
        client["domains"][domain]["time_spent"] += log.duration_ms / 1000.0

    return {"status": "success"}

@app.post("/user-info")
async def register_user_info(info: UserInfo):
    # This endpoint can be used for explicit registration
    # For now, we mainly rely on /log to update the DB, 
    # but we'll store this if we can map it to a machine later.
    return {"status": "success", "received": info}

@app.get("/clients")
def get_clients_summary():
    now = int(time.time())
    summary = []
    for m_id, data in clients_db.items():
        latest_act = "Idle"
        if data["activity_timeline"]:
            latest_act = data["activity_timeline"][-1]["domain"]
            
        summary.append({
            "machine_id": m_id,
            "user": data.get("user", "unknown"),
            "user_name": data.get("user_name", "Unknown User"),
            "status": "active" if (now - data["last_seen"]) < 60 else "idle",
            "total_events": data["total_events"],
            "last_seen": data["last_seen"],
            "suspicious_score": data["suspicious_score"],
            "latest_activity": latest_act
        })
    return summary

@app.get("/client/{machine_id}")
def get_client_detail(machine_id: str):
    if machine_id not in clients_db:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Client not found")
        
    data = clients_db[machine_id]
    return {
        "machine_id": machine_id,
        "user": data.get("user", "unknown"),
        "user_name": data.get("user_name", "Unknown User"),
        "domains": data["domains"],
        "alerts": ["High Suspicious Activity"] if data["suspicious_score"] > 30 else [],
        "activity_timeline": data["activity_timeline"]
    }

@app.get("/tree")
def get_tree():
    # Maintain legacy tree support for Grafana/UI mapped from clients_db
    tree = {}
    for m_id, c_data in clients_db.items():
        tree[m_id] = {
            "domains": {
                dom: {"time_spent": dom_data["time_spent"], "events": dom_data["tab_switch_count"]}
                for dom, dom_data in c_data["domains"].items()
            },
            "alerts": ["High Suspicious Activity"] if c_data["suspicious_score"] > 30 else []
        }
    return tree

@app.get("/stats")
def get_stats():
    machines, domains, tab_switches = set(), {}, {}
    for m_id, c_data in clients_db.items():
        machines.add(m_id)
        tab_switches[m_id] = 0
        for dom, dom_data in c_data["domains"].items():
            tab_switches[m_id] += dom_data["tab_switch_count"]
            domains[dom] = domains.get(dom, 0) + dom_data["tab_switch_count"]
            
    return {
        "machines": list(machines),
        "tab_switch_count": tab_switches,
        "domains": domains
    }

@app.get("/restrictions")
def get_restrictions():
    return list(restricted_domains)

@app.post("/restrictions/add")
def add_restriction(req: RestrictionRequest):
    domain = req.domain.lower().strip()
    if not domain:
        return {"status": "error", "message": "Empty domain"}
    
    # Extract domain from URL if needed
    if "://" in domain:
        parsed = urlparse(domain)
        domain = parsed.netloc
    elif "/" in domain:
        domain = domain.split("/")[0]
        
    # Strip 'www.' to ensure 'reddit.com' covers all subdomains
    if domain.startswith("www."):
        domain = domain[4:]
        
    if domain:
        restricted_domains.add(domain)
    return {"status": "success", "restricted_domains": list(restricted_domains)}

@app.post("/restrictions/remove")
def remove_restriction(req: RestrictionRequest):
    domain = req.domain.lower().strip()
    if domain in restricted_domains:
        restricted_domains.remove(domain)
    return {"status": "success", "restricted_domains": list(restricted_domains)}

@app.get("/metrics")
def get_metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
