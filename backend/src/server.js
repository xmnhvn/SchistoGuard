
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Persistent session store using SQLite
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './' }),
  secret: "schistoguard-secret-key", // Change this to a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

app.use("/api/sensors", require("./routes/sensors"));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
