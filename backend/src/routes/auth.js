const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: "Not authenticated" });
  }
};

// Login endpoint
router.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  // Validate role - only BHW and LGU allowed
  if (!["bhw", "lgu"].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      message: "Only Barangay Health Workers and LGU Officers can login" 
    });
  }

  // Find user by email and role
  db.get(
    "SELECT * FROM users WHERE email = ? AND role = ?",
    [email, role],
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

      // Compare password
      try {
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ 
            success: false, 
            message: "Invalid email or password" 
          });
        }

        // Set session
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.firstName = user.firstName;
        req.session.lastName = user.lastName;

        res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organization: user.organization
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  );
});

// Signup endpoint
router.post("/signup", (req, res) => {
  const { email, password, confirmPassword, role, firstName, lastName, organization } = req.body;

  // Validate role - only BHW and LGU allowed
  if (!["bhw", "lgu"].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      message: "Only Barangay Health Workers and LGU Officers can create accounts" 
    });
  }

  // Validate input
  if (!email || !password || !firstName || !lastName || !organization) {
    return res.status(400).json({ 
      success: false, 
      message: "All fields are required" 
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "Passwords do not match" 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must be at least 6 characters" 
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
        }
      );
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

// Admin create user endpoint (does not change current session)
router.post("/admin/create-user", isAuthenticated, (req, res) => {
  const { email, password, confirmPassword, role, firstName, lastName, organization } = req.body;

  if (!["bhw", "lgu"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Only Barangay Health Workers and LGU Officers can be created"
    });
  }

  if (!email || !password || !firstName || !lastName || !organization) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
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

// Session check endpoint
router.get("/session", (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      loggedIn: true,
      user: {
        id: req.session.userId,
        email: req.session.email,
        role: req.session.role,
        firstName: req.session.firstName,
        lastName: req.session.lastName
      }
    });
  } else {
    res.json({ loggedIn: false });
  }
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
    "SELECT id, email, firstName, lastName, role, organization FROM users WHERE id = ?",
    [req.session.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, user });
    }
  );
});

// Get all users (protected)
router.get("/users", isAuthenticated, (req, res) => {
  console.log("GET /users endpoint hit by user:", req.session.userId);
  
  // First, try a simple count to verify table exists and has data
  db.get("SELECT COUNT(*) as count FROM users", [], (countErr, countResult) => {
    if (countErr) {
      console.error("Error counting users:", countErr);
    } else {
      console.log("Total users in database:", countResult);
    }
    
    // Now fetch all users
    db.all(
      "SELECT id, email, firstName, lastName, role, organization, createdAt FROM users ORDER BY createdAt DESC",
      [],
      (err, users) => {
        if (err) {
          console.error("Error fetching users:", err);
          return res.status(500).json({ success: false, message: err.message });
        }
        console.log("Fetched users from DB:", users);
        console.log("Number of users:", users?.length || 0);
        res.json({ success: true, users });
      }
    );
  });
});

// Delete user (protected)
router.delete("/users/:id", isAuthenticated, (req, res) => {
  const userId = req.params.id;
  
  // Prevent deleting own account
  if (parseInt(userId) === req.session.userId) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete your own account"
    });
  }

  db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  });
});

module.exports = router;
