import React, { useEffect, useState, useCallback } from "react";
import API from "../../utils/api";
import { HiPlus, HiX, HiTrash, HiPencil, HiSearch, HiPhone, HiCash, HiClipboardList, HiCalendar } from "react-icons/hi";
import { toast } from "react-toastify";
import "./AdminEmployees.css";

const EMP_TYPES = [
  { value: "tailor", label: "Tailor" },
  { value: "embroideryWorker", label: "Embroidery Worker" },
  { value: "productionManager", label: "Production Manager" },
  { value: "dyeingStaff", label: "Dyeing Staff" },
];

const TASK_TYPES = ["embroidery", "stitching", "dyeing", "finishing", "cutting", "quality-check", "other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const emptyEmpForm = {
  name: "", phone: "", type: "tailor", specialization: "",
  salary: 0, address: "", cnic: "", emergencyContact: "", notes: "",
};

const emptyTaskForm = {
  title: "", description: "", assignedTo: "", type: "stitching",
  priority: "medium", dueDate: "",
};

const AdminEmployees = () => {
  const [view, setView] = useState("employees"); // employees | tasks
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [productivity, setProductivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("");

  // Modals
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empForm, setEmpForm] = useState(emptyEmpForm);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [submitting, setSubmitting] = useState(false);

  // Attendance modal
  const [attModal, setAttModal] = useState(null);
  const [attForm, setAttForm] = useState({ date: new Date().toISOString().split("T")[0], status: "present", notes: "" });

  // Salary modal
  const [salaryModal, setSalaryModal] = useState(null);
  const [salaryForm, setSalaryForm] = useState({ month: "", baseSalary: 0, bonus: 0, deductions: 0, status: "pending" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;

      const [empRes, prodRes] = await Promise.all([
        API.get("/employees", { params }),
        API.get("/employees/productivity"),
      ]);
      setEmployees(empRes.data);
      setProductivity(prodRes.data);

      const taskParams = {};
      if (taskStatusFilter) taskParams.status = taskStatusFilter;
      const taskRes = await API.get("/employees/tasks/all", { params: taskParams });
      setTasks(taskRes.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [typeFilter, search, taskStatusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getInitials = (name) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
  const formatType = (t) => EMP_TYPES.find(e => e.value === t)?.label || t;

  // Employee CRUD
  const openNewEmp = () => { setEditingEmp(null); setEmpForm(emptyEmpForm); setShowEmpModal(true); };
  const openEditEmp = (emp) => {
    setEditingEmp(emp);
    setEmpForm({ name: emp.name, phone: emp.phone || "", type: emp.type, specialization: emp.specialization || "", salary: emp.salary || 0, address: emp.address || "", cnic: emp.cnic || "", emergencyContact: emp.emergencyContact || "", notes: emp.notes || "" });
    setShowEmpModal(true);
  };

  const handleEmpSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      if (editingEmp) { await API.put(`/employees/${editingEmp._id}`, empForm); toast.success("Employee updated!"); }
      else { await API.post("/employees", empForm); toast.success("Employee added!"); }
      setShowEmpModal(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    setSubmitting(false);
  };

  const handleDeleteEmp = async (id) => {
    if (!window.confirm("Delete this employee and all their tasks?")) return;
    try { await API.delete(`/employees/${id}`); toast.success("Deleted"); fetchData(); }
    catch (err) { toast.error("Failed"); }
  };

  // Task CRUD
  const openNewTask = (empId) => {
    setTaskForm({ ...emptyTaskForm, assignedTo: empId || "" });
    setShowTaskModal(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await API.post("/employees/tasks", taskForm);
      toast.success("Task assigned!"); setShowTaskModal(false); fetchData();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
    setSubmitting(false);
  };

  const updateTaskStatus = async (taskId, status) => {
    try { await API.put(`/employees/tasks/${taskId}`, { status }); toast.success(`Task ${status}`); fetchData(); }
    catch (err) { toast.error("Failed"); }
  };

  const deleteTask = async (taskId) => {
    try { await API.delete(`/employees/tasks/${taskId}`); toast.success("Task deleted"); fetchData(); }
    catch (err) { toast.error("Failed"); }
  };

  // Attendance
  const handleAttendance = async () => {
    try {
      await API.post(`/employees/${attModal._id}/attendance`, attForm);
      toast.success("Attendance recorded"); setAttModal(null); fetchData();
    } catch (err) { toast.error("Failed"); }
  };

  // Salary
  const openSalary = (emp) => {
    const now = new Date();
    setSalaryModal(emp);
    setSalaryForm({ month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`, baseSalary: emp.salary || 0, bonus: 0, deductions: 0, status: "pending" });
  };

  const handleSalary = async () => {
    try {
      await API.post(`/employees/${salaryModal._id}/salary`, salaryForm);
      toast.success("Salary record saved"); setSalaryModal(null); fetchData();
    } catch (err) { toast.error("Failed"); }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="gradient-text">Employee Management</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => openNewTask()}>
            <HiClipboardList /> Assign Task
          </button>
          <button className="btn btn-gold" onClick={openNewEmp}>
            <HiPlus /> Add Employee
          </button>
        </div>
      </div>

      {/* Productivity Stats */}
      {productivity && (
        <div className="prod-stats">
          <div className="prod-stat-card"><div className="prod-stat-value" style={{ color: "var(--gold)" }}>{productivity.totalEmployees}</div><div className="prod-stat-label">Active Staff</div></div>
          <div className="prod-stat-card"><div className="prod-stat-value" style={{ color: "var(--info)" }}>{productivity.tasksByStatus?.find(t => t._id === "pending")?.count || 0}</div><div className="prod-stat-label">Pending Tasks</div></div>
          <div className="prod-stat-card"><div className="prod-stat-value" style={{ color: "var(--warning)" }}>{productivity.tasksByStatus?.find(t => t._id === "in-progress")?.count || 0}</div><div className="prod-stat-label">In Progress</div></div>
          <div className="prod-stat-card"><div className="prod-stat-value" style={{ color: "var(--success)" }}>{productivity.tasksByStatus?.find(t => t._id === "completed")?.count || 0}</div><div className="prod-stat-label">Completed</div></div>
          <div className="prod-stat-card"><div className="prod-stat-value" style={{ color: "var(--error)" }}>{productivity.overdueTasks}</div><div className="prod-stat-label">Overdue</div></div>
        </div>
      )}

      {/* View Tabs */}
      <div className="emp-view-tabs">
        <button className={`emp-view-tab ${view === "employees" ? "active" : ""}`} onClick={() => setView("employees")}>Employees</button>
        <button className={`emp-view-tab ${view === "tasks" ? "active" : ""}`} onClick={() => setView("tasks")}>Tasks</button>
      </div>

      {view === "employees" && (
        <>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <HiSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="form-input" style={{ paddingLeft: 40 }} placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: "auto", minWidth: 160 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {EMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Employee Cards */}
          {loading ? <div className="spinner" /> : (
            employees.length === 0 ? (
              <div className="empty-state"><h3>No employees yet</h3></div>
            ) : (
              <div className="emp-grid">
                {employees.map((emp, idx) => (
                  <div key={emp._id} className={`emp-card ${emp.type}`} style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className={`emp-status-dot ${emp.isActive ? "active" : "inactive"}`} />
                    <div className="emp-card-header">
                      <div className={`emp-avatar ${emp.type}`}>{getInitials(emp.name)}</div>
                      <div className="emp-card-info">
                        <h3>{emp.name}</h3>
                        <span className={`emp-type-badge ${emp.type}`}>{formatType(emp.type)}</span>
                      </div>
                    </div>
                    <div className="emp-card-details">
                      {emp.phone && <div className="emp-detail-row"><HiPhone /> {emp.phone}</div>}
                      {emp.specialization && <div className="emp-detail-row"><HiClipboardList /> {emp.specialization}</div>}
                      <div className="emp-detail-row"><HiCash /> Rs.{(emp.salary || 0).toLocaleString()}/month</div>
                    </div>
                    <div className="emp-card-footer">
                      <span className={`emp-pending-badge ${emp.pendingTasks > 0 ? "has-tasks" : "no-tasks"}`}>
                        {emp.pendingTasks > 0 ? `${emp.pendingTasks} pending` : "No pending tasks"}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn-edit" title="Attendance" onClick={() => { setAttModal(emp); setAttForm({ date: new Date().toISOString().split("T")[0], status: "present", notes: "" }); }} style={{ padding: "5px 7px", fontSize: "0.75rem" }}><HiCalendar /></button>
                        <button className="btn-edit" title="Salary" onClick={() => openSalary(emp)} style={{ padding: "5px 7px", fontSize: "0.75rem" }}><HiCash /></button>
                        <button className="btn-edit" title="Assign Task" onClick={() => openNewTask(emp._id)} style={{ padding: "5px 7px", fontSize: "0.75rem" }}><HiPlus /></button>
                        <button className="btn-edit" title="Edit" onClick={() => openEditEmp(emp)} style={{ padding: "5px 7px" }}><HiPencil /></button>
                        <button className="btn-delete" title="Delete" onClick={() => handleDeleteEmp(emp._id)} style={{ padding: "5px 7px" }}><HiTrash /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {view === "tasks" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {["", "pending", "in-progress", "completed", "cancelled"].map(s => (
              <button key={s} className={`btn btn-sm ${taskStatusFilter === s ? "btn-gold" : "btn-outline"}`} onClick={() => setTaskStatusFilter(s)}>
                {s || "All"}
              </button>
            ))}
          </div>
          {loading ? <div className="spinner" /> : (
            <div className="task-list">
              {tasks.length === 0 ? <div className="empty-state"><h3>No tasks</h3></div> : tasks.map((task, idx) => (
                <div key={task._id} className="task-item" style={{ animationDelay: `${idx * 0.03}s` }}>
                  <div className="task-info">
                    <h4><span className={`priority-dot ${task.priority}`} />{task.title}</h4>
                    <div className="task-meta">
                      <span>Assigned: {task.assignedTo?.name || "—"}</span>
                      <span>Type: {task.type}</span>
                      {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </div>
                  <div className="task-actions">
                    <select className="form-select" value={task.status} onChange={(e) => updateTaskStatus(task._id, e.target.value)} style={{ width: 130, padding: "5px 10px", fontSize: "0.78rem" }}>
                      {["pending", "in-progress", "completed", "cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="btn-delete" onClick={() => deleteTask(task._id)} style={{ padding: "5px 7px" }}><HiTrash /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Employee Modal */}
      {showEmpModal && (
        <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>{editingEmp ? "Edit Employee" : "Add Employee"}</h2>
              <button className="modal-close" onClick={() => setShowEmpModal(false)}><HiX /></button>
            </div>
            <form onSubmit={handleEmpSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" required value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={empForm.type} onChange={e => setEmpForm({ ...empForm, type: e.target.value })}>{EMP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Specialization</label><input className="form-input" value={empForm.specialization} placeholder="e.g. Zardozi work" onChange={e => setEmpForm({ ...empForm, specialization: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Monthly Salary (Rs.)</label><input className="form-input" type="number" min="0" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">CNIC</label><input className="form-input" value={empForm.cnic} onChange={e => setEmpForm({ ...empForm, cnic: e.target.value })} /></div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}><label className="form-label">Address</label><input className="form-input" value={empForm.address} onChange={e => setEmpForm({ ...empForm, address: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Emergency Contact</label><input className="form-input" value={empForm.emergencyContact} onChange={e => setEmpForm({ ...empForm, emergencyContact: e.target.value })} /></div>
              </div>
              <button type="submit" className="btn btn-gold" style={{ width: "100%", marginTop: 12 }} disabled={submitting}>{submitting ? "Saving..." : editingEmp ? "Update" : "Add Employee"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h2>Assign Task</h2><button className="modal-close" onClick={() => setShowTaskModal(false)}><HiX /></button></div>
            <form onSubmit={handleTaskSubmit}>
              <div className="form-group"><label className="form-label">Task Title</label><input className="form-input" required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Embroider dupatta panel" /></div>
              <div className="form-group"><label className="form-label">Assign To</label><select className="form-select" required value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}><option value="">Select Employee</option>{employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({formatType(emp.type)})</option>)}</select></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={taskForm.type} onChange={e => setTaskForm({ ...taskForm, type: e.target.value })}>{TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Priority</label><select className="form-select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={taskForm.description} rows={2} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
              <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={submitting}>{submitting ? "Assigning..." : "Assign Task"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attModal && (
        <div className="modal-overlay" onClick={() => setAttModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header"><h2>Record Attendance</h2><button className="modal-close" onClick={() => setAttModal(null)}><HiX /></button></div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}><strong style={{ color: "var(--text-primary)" }}>{attModal.name}</strong></p>
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={attForm.date} onChange={e => setAttForm({ ...attForm, date: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value })}>{["present", "absent", "leave", "half-day"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Notes</label><input className="form-input" value={attForm.notes} onChange={e => setAttForm({ ...attForm, notes: e.target.value })} /></div>
            <button className="btn btn-gold" style={{ width: "100%" }} onClick={handleAttendance}>Save Attendance</button>
          </div>
        </div>
      )}

      {/* Salary Modal */}
      {salaryModal && (
        <div className="modal-overlay" onClick={() => setSalaryModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header"><h2>Salary Record</h2><button className="modal-close" onClick={() => setSalaryModal(null)}><HiX /></button></div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}><strong style={{ color: "var(--text-primary)" }}>{salaryModal.name}</strong></p>
            <div className="form-group"><label className="form-label">Month</label><input className="form-input" type="month" value={salaryForm.month} onChange={e => setSalaryForm({ ...salaryForm, month: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group"><label className="form-label">Base Salary</label><input className="form-input" type="number" value={salaryForm.baseSalary} onChange={e => setSalaryForm({ ...salaryForm, baseSalary: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Bonus</label><input className="form-input" type="number" value={salaryForm.bonus} onChange={e => setSalaryForm({ ...salaryForm, bonus: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Deductions</label><input className="form-input" type="number" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: Number(e.target.value) })} /></div>
              <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={salaryForm.status} onChange={e => setSalaryForm({ ...salaryForm, status: e.target.value })}>{["pending", "paid", "partial"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div style={{ textAlign: "right", marginBottom: 16, fontWeight: 700, color: "var(--gold)", fontSize: "1.1rem" }}>
              Total: Rs.{((salaryForm.baseSalary || 0) + (salaryForm.bonus || 0) - (salaryForm.deductions || 0)).toLocaleString()}
            </div>
            <button className="btn btn-gold" style={{ width: "100%" }} onClick={handleSalary}>Save Salary Record</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployees;
