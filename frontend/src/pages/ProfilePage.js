import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import { HiUser, HiMail, HiPhone, HiPencil, HiShieldCheck } from "react-icons/hi";
import { toast } from "react-toastify";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name: form.name, phone: form.phone });
      toast.success("Profile updated!");
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    }
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setChangingPwd(true);
    try {
      await API.put("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success("Password changed successfully!");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPwdForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    }
    setChangingPwd(false);
  };

  const userInitial = user?.name?.charAt(0).toUpperCase() || "?";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "long" })
    : "—";

  return (
    <div className="profile-page">
      <div className="container">
        <div className="page-header">
          <h1 style={{ fontFamily: "var(--font-display)" }}>
            My <span className="gradient-text">Profile</span>
          </h1>
          <p>Manage your account details</p>
        </div>

        <div className="profile-card">
          {/* Avatar + Basic Info */}
          <div className="profile-card-header">
            <div className="profile-avatar">{userInitial}</div>
            <div className="profile-info">
              <h2>{user?.name}</h2>
              <p>{user?.email}</p>
              <span className="profile-role-badge">{user?.role}</span>
            </div>
            {!editing && (
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <HiPencil /> Edit
              </button>
            )}
          </div>

          {/* Profile Details / Edit Form */}
          {editing ? (
            <form onSubmit={handleSave} className="profile-edit-form">
              <div className="form-group">
                <label className="form-label"><HiUser style={{ verticalAlign: "middle" }} /> Full Name</label>
                <input className="form-input" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required placeholder="Your full name" />
              </div>
              <div className="form-group">
                <label className="form-label"><HiPhone style={{ verticalAlign: "middle" }} /> Phone</label>
                <input className="form-input" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="03XX-XXXXXXX" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="profile-detail-row">
                <span className="profile-detail-label"><HiUser /> Full Name</span>
                <span className="profile-detail-value">{user?.name}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label"><HiMail /> Email</span>
                <span className="profile-detail-value">{user?.email}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label"><HiPhone /> Phone</span>
                <span className="profile-detail-value">{user?.phone || "Not set"}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label"><HiShieldCheck /> Role</span>
                <span className="profile-detail-value" style={{ textTransform: "capitalize" }}>{user?.role}</span>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="profile-card" style={{ marginTop: 20 }}>
          <div className="profile-card-header" style={{ borderBottom: showPwdForm ? "1px solid var(--border)" : "none", paddingBottom: showPwdForm ? 16 : 0 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", margin: 0 }}>Security</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0" }}>Change your password</p>
            </div>
            {!showPwdForm && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowPwdForm(true)}>Change Password</button>
            )}
          </div>
          {showPwdForm && (
            <form onSubmit={handleChangePassword} className="profile-edit-form" style={{ marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" required
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" required minLength={6}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" required
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-gold" disabled={changingPwd}>
                  {changingPwd ? "Changing..." : "Change Password"}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowPwdForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
