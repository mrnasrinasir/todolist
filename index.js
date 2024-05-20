import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

// Declare database
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "permalist",
  password: "ENTER_PASSWORD_HERE",
  port: 5432,
});


db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1; // Default to user with ID 1

// Function that retrieves items for the current user
async function getItems(userId) {
  const result = await db.query("SELECT * FROM items WHERE user_id = $1", [userId]);
  return result.rows;
}

// Function that retrieves all users to be displayed in app.get("/") navigation bar
async function getUsers() {
  const result = await db.query("SELECT * FROM users");
  return result.rows;
}

// Function that retrieves the current user to display at the listTitle
async function getCurrentUser(userId) {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0];
}

app.get("/", async (req, res) => {
  try {
    const users = await getUsers();
    const currentuser = await getCurrentUser(currentUserId);
    const items = await getItems(currentUserId);

    res.render("index.ejs", {
      listTitle: currentuser.name + "'s To-Do List",
      listItems: items,
      users: users,
      currentUserId: currentUserId // Pass current user ID to the view
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add", async (req, res) => {
  const item = req.body.newItem;
  try {
    await db.query("INSERT INTO items (title, user_id) VALUES ($1, $2)", [item, currentUserId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/user", async (req, res) => {
  currentUserId = parseInt(req.body.user);
  res.redirect("/");
});

app.post("/edit", async (req, res) => {
  const item = req.body.updatedItemTitle;
  const id = req.body.updatedItemId;
  try {
    await db.query("UPDATE items SET title = $1 WHERE id = $2 AND user_id = $3", [item, id, currentUserId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/delete", async (req, res) => {
  const id = req.body.deleteItemId;
  try {
    await db.query("DELETE FROM items WHERE id = $1 AND user_id = $2", [id, currentUserId]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/new-user", async (req,res) => {
  res.render("newuser.ejs");
})

// Route to handle adding a new user
app.post("/add-user", async (req, res) => {
  const newUserName = req.body.newUserName;
  try {
    await db.query("INSERT INTO users (name) VALUES ($1)", [newUserName]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to handle deleting the current user and associated items
app.post("/delete-user", async (req, res) => {
  const userId = req.body.userId;
  try {
    // Delete associated items first
    await db.query("DELETE FROM items WHERE user_id = $1", [userId]);
    // Then delete the user
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
    currentUserId = 1; // Reset current user ID to default
    res.redirect("/");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
