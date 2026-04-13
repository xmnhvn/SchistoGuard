const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";
const PROTECTED_ACCOUNT_EMAIL = (process.env.PROTECTED_ACCOUNT_EMAIL || "").trim().toLowerCase();
const ENABLE_SELF_SIGNUP = String(process.env.ENABLE_SELF_SIGNUP || "false").toLowerCase() === "true";
const ADMIN_UNLOCK_MINUTES = parseInt(process.env.ADMIN_UNLOCK_MINUTES || "10", 10);
const LOGIN_MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || "5", 10);
const LOGIN_LOCK_MINUTES = parseInt(process.env.LOGIN_LOCK_MINUTES || "15", 10);
const MAX_PROFILE_PHOTO_LENGTH = 2 * 1024 * 1024;

function debugLog(...args) {
  if (!isProduction) {
    console.log(...args);
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email || "").toLowerCase());
}

function isStrongPassword(password) {
  // Minimum 8 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special char.
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return strongPasswordRegex.test(password || "");
}

function isProtectedAccountEmail(email) {
  if (!PROTECTED_ACCOUNT_EMAIL) return false;
  return String(email || "").trim().toLowerCase() === PROTECTED_ACCOUNT_EMAIL;
}

function isProtectedUser(user) {
  return !!(user && (user.isProtected === true || user.isProtected === 1 || isProtectedAccountEmail(user.email)));
}

function ensureCsrfToken(req) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
}

function writeAuditLog(req, action, targetUserId = null, metadata = null) {
  const actorUserId = req.session?.userId || null;
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;
  const userAgent = req.headers["user-agent"] || null;
  const metadataText = metadata ? JSON.stringify(metadata) : null;

  db.run(
    `INSERT INTO audit_logs (actorUserId, action, targetUserId, ipAddress, userAgent, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [actorUserId, action, targetUserId, ipAddress, userAgent, metadataText],
    () => {}
  );
}

router.get("/csrf-token", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const csrfToken = ensureCsrfToken(req);
  return res.json({ success: true, csrfToken });
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  const sessionValid = req.session && req.session.userId;
  debugLog("🔐 Auth Check:", {
    hasSession: !!req.session,
    userId: !!req.session?.userId,
    isValid: sessionValid,
    timestamp: new Date().toISOString()
  });
  
  if (sessionValid) {
    next();
  } else {
    res.status(401).json({ 
      success: false, 
      message: "Not authenticated - please log in again"
    });
  }
};

// Middleware to check if user is authorized for admin (just need to be logged in)
const isAdmin = (req, res, next) => {
  const hasSession = !!req.session;
  const hasUserId = req.session?.userId;
  const hasAdminRole = req.session?.role === "admin";
  const adminUnlockedUntil = Number(req.session?.adminUnlockedUntil || 0);
  const hasTemporaryAdminUnlock = adminUnlockedUntil > Date.now();
  const isAuthorized = hasSession && hasUserId && (hasAdminRole || hasTemporaryAdminUnlock);
  
  debugLog("👤 Admin Check:", {
    hasSession,
    userId: !!hasUserId,
    hasRole: !!req.session?.role,
    hasTemporaryAdminUnlock,
    isAuthorized,
    timestamp: new Date().toISOString()
  });
  
  if (isAuthorized) {
    next();
  } else {
    const reason = !hasSession
      ? 'no session'
      : !hasUserId
        ? 'no userId'
        : (!hasAdminRole && !hasTemporaryAdminUnlock)
          ? 'not admin role and no admin unlock'
          : 'unknown';
    res.status(403).json({ 
      success: false, 
      message: `Admin access required. (${reason})`
    });
  }
};

// Temporarily unlock admin actions for a non-admin authenticated user.
const handleAdminUnlock = (req, res) => {
  const { adminEmail, adminPassword } = req.body;

  if (!adminEmail || !adminPassword) {
    return res.status(400).json({
      success: false,
      message: "Admin email and password are required"
    });
  }

  db.get(
    "SELECT id, email, password, role FROM users WHERE email = ? AND role = ?",
    [adminEmail, "admin"],
    async (err, adminUser) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      if (!adminUser) {
        return res.status(401).json({ success: false, message: "Invalid admin credentials" });
      }

      try {
        const passwordMatch = await bcrypt.compare(adminPassword, adminUser.password);
        if (!passwordMatch) {
          return res.status(401).json({ success: false, message: "Invalid admin credentials" });
        }

        const unlockUntil = Date.now() + Math.max(1, ADMIN_UNLOCK_MINUTES) * 60 * 1000;
        req.session.adminUnlockedUntil = unlockUntil;
        req.session.adminUnlockedBy = adminUser.id;

        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ success: false, message: "Failed to save admin unlock session" });
          }

          writeAuditLog(req, "admin_unlock", adminUser.id, {
            unlockedUntil: unlockUntil,
            unlockMinutes: Math.max(1, ADMIN_UNLOCK_MINUTES)
          });

          return res.json({
            success: true,
            message: `Admin access unlocked for ${Math.max(1, ADMIN_UNLOCK_MINUTES)} minutes`,
            unlockedUntil: new Date(unlockUntil).toISOString()
          });
        });
      } catch (compareErr) {
        return res.status(500).json({ success: false, message: compareErr.message });
      }
    }
  );
};

router.post("/admin/unlock", isAuthenticated, handleAdminUnlock);
// Compatibility alias for older/newer frontend builds.
router.post("/admin/verify", isAuthenticated, handleAdminUnlock);

// Login endpoint
router.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  // Validate role for login
  if (!["admin", "bhw", "municipal_health_officer"].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid role. Allowed roles: admin, bhw, municipal_health_officer" 
    });
  }

  // Find user by email for per-account lockout checks.
  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }

      const lockUntil = Number(user.lockUntil || 0);
      if (lockUntil > Date.now()) {
        const remainingMinutes = Math.max(1, Math.ceil((lockUntil - Date.now()) / 60000));
        return res.status(423).json({
          success: false,
          message: `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`
        });
      }

      // Compare password
      try {
        const roleMatch = user.role === role;
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!roleMatch || !passwordMatch) {
          const nextAttempts = Number(user.failedLoginAttempts || 0) + 1;
          if (nextAttempts >= Math.max(1, LOGIN_MAX_ATTEMPTS)) {
            const nextLockUntil = Date.now() + Math.max(1, LOGIN_LOCK_MINUTES) * 60 * 1000;
            db.run(
              "UPDATE users SET failedLoginAttempts = ?, lockUntil = ? WHERE id = ?",
              [0, nextLockUntil, user.id],
              () => {}
            );
          } else {
            db.run(
              "UPDATE users SET failedLoginAttempts = ?, lockUntil = ? WHERE id = ?",
              [nextAttempts, 0, user.id],
              () => {}
            );
          }

          return res.status(401).json({ 
            success: false, 
            message: "Invalid email or password" 
          });
        }

        // Reset failed attempts on successful login.
        db.run(
          "UPDATE users SET failedLoginAttempts = ?, lockUntil = ? WHERE id = ?",
          [0, 0, user.id],
          () => {}
        );

        // Set session
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.firstName = user.firstName;
        req.session.lastName = user.lastName;
        ensureCsrfToken(req);

        debugLog("✅ Session created for authenticated user");

        // Save session before sending response
        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ success: false, message: "Failed to save session: " + saveErr.message });
          }
          
          res.json({
            success: true,
            message: "Login successful",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              organization: user.organization,
              lastView: user.lastView || 'dashboard',
              profilePhoto: user.profilePhoto || null
            }
          });
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  );
});

// Signup endpoint
router.post("/signup", (req, res) => {
  if (!ENABLE_SELF_SIGNUP) {
    return res.status(403).json({
      success: false,
      message: "Self-signup is disabled. Please contact an administrator to create your account."
    });
  }

  const { email, password, confirmPassword, role, firstName, lastName, organization } = req.body;

  // Validate role - only BHW and Municipal Health Officer allowed
  if (!["bhw", "municipal_health_officer"].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      message: "Only Barangay Health Workers and Municipal Health Officers can create accounts" 
    });
  }

  // Validate input
  if (!email || !password || !firstName || !lastName || !organization) {
    return res.status(400).json({ 
      success: false, 
      message: "All fields are required" 
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address"
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "Passwords do not match" 
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    });
  }

  // Check if email already exists
  db.get("SELECT id FROM users WHERE email = ?", [email], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }

    // Hash password
    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      db.run(
        `INSERT INTO users (email, password, firstName, lastName, role, organization)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, firstName, lastName, role, organization],
        function (err, result) {
          if (err) {
            return res.status(500).json({ success: false, message: err.message });
          }

          const createdUserId = result?.lastID ?? this?.lastID;

          // Set session
          req.session.userId = createdUserId;
          req.session.email = email;
          req.session.role = role;
          req.session.firstName = firstName;
          req.session.lastName = lastName;
          ensureCsrfToken(req);

          // Save session before sending response
          req.session.save((saveErr) => {
            if (saveErr) {
              return res.status(500).json({ success: false, message: "Failed to save session: " + saveErr.message });
            }
            
            res.json({
              success: true,
              message: "Account created successfully",
              user: {
                id: createdUserId,
                email,
                firstName,
                lastName,
                role,
                organization
              }
            });
          });
        }
      );
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Admin create user endpoint (both Municipal Health Officer and BHW - does not change current session)
router.post("/admin/create-user", isAdmin, (req, res) => {
  const { email, password, confirmPassword, role, firstName, lastName, organization } = req.body;

  if (!["bhw", "municipal_health_officer"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Only Barangay Health Workers and Municipal Health Officers can be created"
    });
  }

  if (!email || !password || !firstName || !lastName || !organization) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address"
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    });
  }

  db.get("SELECT id FROM users WHERE email = ?", [email], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        `INSERT INTO users (email, password, firstName, lastName, role, organization)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, firstName, lastName, role, organization],
        function (insertErr, result) {
          if (insertErr) {
            return res.status(500).json({ success: false, message: insertErr.message });
          }

          const createdUserId = result?.lastID ?? this?.lastID;
          writeAuditLog(req, "admin_create_user", createdUserId, {
            email,
            role,
            organization
          });
          return res.json({
            success: true,
            message: "User account created successfully",
            user: {
              id: createdUserId,
              email,
              firstName,
              lastName,
              role,
              organization
            }
          });
        }
      );
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Admin update any user's password (including protected account)
router.post("/admin/users/:id/password", isAdmin, (req, res) => {
  const userId = req.params.id;
  const { newPassword, confirmNewPassword } = req.body;

  if (!newPassword || !confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirmation are required"
    });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    });
  }

  db.get("SELECT id FROM users WHERE id = ?", [userId], async (findErr, user) => {
    if (findErr) {
      return res.status(500).json({ success: false, message: findErr.message });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ success: false, message: updateErr.message });
        }

        writeAuditLog(req, "admin_update_password", Number(userId), {
          targetUserId: Number(userId)
        });

        return res.json({
          success: true,
          message: "User password updated successfully"
        });
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Session check endpoint
// Session check endpoint
router.get("/session", (req, res) => {
  debugLog("🔍 Session Check:", {
    hasSession: !!req.session,
    userId: !!req.session?.userId,
    timestamp: new Date().toISOString()
  });
  
  if (req.session && req.session.userId) {
    // Fetch latest user data including lastView
    db.get(
      "SELECT id, email, role, firstName, lastName, lastView, profilePhoto FROM users WHERE id = ?",
      [req.session.userId],
      (err, user) => {
        if (err || !user) {
          debugLog("⚠ Session check: user not found or DB error");
          return res.json({ loggedIn: false });
        }
        
        debugLog("✓ Session valid");
        res.json({
          loggedIn: true,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            lastView: user.lastView || 'dashboard',
            profilePhoto: user.profilePhoto || null
          }
        });
      }
    );
  } else {
    debugLog("✗ No valid session found");
    res.json({ loggedIn: false });
  }
});

// Update last view
router.put("/lastview", isAuthenticated, (req, res) => {
  const { lastView } = req.body;
  
  if (!lastView) {
    return res.status(400).json({ success: false, message: "lastView is required" });
  }
  
  db.run(
    "UPDATE users SET lastView = ? WHERE id = ?",
    [lastView, req.session.userId],
    (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, lastView });
    }
  );
});

// Change current user's password
router.post("/change-password", isAuthenticated, (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ success: false, message: "All password fields are required" });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ success: false, message: "New passwords do not match" });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    });
  }

  db.get("SELECT id, password FROM users WHERE id = ?", [req.session.userId], async (err, user) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    try {
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ success: false, message: updateErr.message });
        }

        return res.json({ success: true, message: "Password updated successfully" });
      });
    } catch (compareErr) {
      return res.status(500).json({ success: false, message: compareErr.message });
    }
  });
});

// Logout endpoint
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// Get current user (protected)
router.get("/me", isAuthenticated, (req, res) => {
  db.get(
    "SELECT id, email, firstName, lastName, role, organization, profilePhoto FROM users WHERE id = ?",
    [req.session.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, user });
    }
  );
});

// Save/update current user's profile photo
router.put("/profile-photo", isAuthenticated, (req, res) => {
  const { profilePhoto } = req.body || {};

  if (profilePhoto !== null && profilePhoto !== undefined && typeof profilePhoto !== "string") {
    return res.status(400).json({ success: false, message: "profilePhoto must be a string or null" });
  }

  if (typeof profilePhoto === "string") {
    if (!profilePhoto.startsWith("data:image/")) {
      return res.status(400).json({ success: false, message: "profilePhoto must be a valid image data URL" });
    }

    if (profilePhoto.length > MAX_PROFILE_PHOTO_LENGTH) {
      return res.status(400).json({ success: false, message: "Profile photo is too large" });
    }
  }

  const nextProfilePhoto = typeof profilePhoto === "string" ? profilePhoto : null;

  db.run(
    "UPDATE users SET profilePhoto = ? WHERE id = ?",
    [nextProfilePhoto, req.session.userId],
    (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ success: false, message: updateErr.message });
      }

      return res.json({
        success: true,
        message: nextProfilePhoto ? "Profile photo updated successfully" : "Profile photo removed successfully",
        profilePhoto: nextProfilePhoto,
      });
    }
  );
});

// Get all users (admin endpoint - both Municipal Health Officer and BHW)
router.get("/users", isAdmin, (req, res) => {
  debugLog("GET /users endpoint hit");
  
  db.all(
    "SELECT id, email, firstName, lastName, role, organization, isProtected, createdAt FROM users ORDER BY createdAt DESC",
    [],
    (err, users) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ success: false, message: err.message });
      }
      debugLog("✓ Fetched users:", users?.length || 0);
      const usersWithProtectionFlag = (users || []).map((user) => ({
        ...user,
        isProtected: isProtectedUser(user)
      }));

      res.json({ success: true, users: usersWithProtectionFlag });
    }
  );
});

// Delete user (admin endpoint - both Municipal Health Officer and BHW)
router.delete("/users/:id", isAdmin, (req, res) => {
  const userId = req.params.id;
  
  // Prevent deleting own account
  if (parseInt(userId) === req.session.userId) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete your own account"
    });
  }

  db.get("SELECT id, email, isProtected FROM users WHERE id = ?", [userId], (findErr, targetUser) => {
    if (findErr) {
      return res.status(500).json({ success: false, message: findErr.message });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (isProtectedUser(targetUser)) {
      return res.status(403).json({
        success: false,
        message: "Protected default account cannot be deleted"
      });
    }

    db.run("DELETE FROM users WHERE id = ?", [userId], (deleteErr, result) => {
      if (deleteErr) {
        return res.status(500).json({ success: false, message: deleteErr.message });
      }

      if (!result || result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      writeAuditLog(req, "admin_delete_user", Number(userId), {
        deletedEmail: targetUser.email
      });

      res.json({
        success: true,
        message: "User deleted successfully"
      });
    });
  });
});

// Get recent security audit logs (admin endpoint)
router.get("/admin/audit-logs", isAdmin, (req, res) => {
  const requestedLimit = parseInt(String(req.query.limit || "50"), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;

  db.all(
    `SELECT id, actorUserId, action, targetUserId, ipAddress, userAgent, metadata, timestamp
     FROM audit_logs
     ORDER BY timestamp DESC
     LIMIT ?`,
    [limit],
    (err, logs) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      const safeLogs = (logs || []).map((log) => {
        let parsedMetadata = null;
        try {
          parsedMetadata = log.metadata ? JSON.parse(log.metadata) : null;
        } catch {
          parsedMetadata = null;
        }

        return {
          ...log,
          metadata: parsedMetadata,
        };
      });

      return res.json({ success: true, logs: safeLogs });
    }
  );
});

module.exports = router;
