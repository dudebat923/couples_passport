import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import MapEditor from "./src/map-editor.js";

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let currentMap = 1;

let users = [
  { id: 1, name: "Together", color: "palevioletred" },
  { id: 2, name: "Tyler", color: "mediumseagreen" },
  { id: 3, name: "Monica", color: "dodgerblue" },
];

async function loadWorldMap(res, err) {
  const countries = await MapEditor.checkVisitedTerritories(1, currentUserId);
  const config = {
    countries: countries,
    total: countries.length,
    users: users,
    color: users[currentUserId - 1].color,
  };

  if (err) {
    config.error = err;
  }

  res.render("index.ejs", config);
}

async function loadStateMap(res, err) {
  const states = await MapEditor.checkVisitedTerritories(2, currentUserId);
  const config = {
    states: states,
    total: states.length,
    users: users,
    color: users[currentUserId - 1].color,
  }

  if (err) {
    config.error = err;
  }

  res.render("united_states.ejs", config);
}

app.get("/", async (req, res) => {
  if (currentMap === 1) {
    await loadWorldMap(res, req.query.error);
  } else {
    await loadStateMap(res, req.query.error);
  }
});

app.post("/submit", async (req, res) => {
  // Add a territory
  if (req.body['operation'] === 'add') {
    const errorMessage = await MapEditor.addVisitedTerritory(currentMap, currentUserId, req.body["territory"]);
    if (errorMessage) {
      res.redirect("/?error=" + encodeURIComponent(errorMessage));
    } else {
      if (Number(currentUserId) === 1) {
        // Add territory for everyone if the current user is "together"
        for (let i = 2; i <= 3; i++) {
          await MapEditor.addVisitedTerritory(currentMap, i, req.body["territory"]);
        }
      }
      res.redirect("/");
    }
  }

  // Delete a territory
  else {
    const errorMessage = await MapEditor.deleteVisitedTerritory(currentMap, currentUserId, req.body["territory"]);
    if (errorMessage) {
      res.redirect("/?error=" + encodeURIComponent(errorMessage));
    } else {
      res.redirect("/");
    }
  }
});

app.post("/user", async (req, res) => {
  currentUserId = req.body.user;
  res.redirect('/');
});

app.post("/switch", async (req, res) => {
  if (req.body.map === 'world') {
    currentMap = 1;
  } else if (req.body.map === 'united states') {
    currentMap = 2;
  } else {
    res.status(400).send("Unknown map state");
    return;
  }

  res.redirect("/");
})

// app.post("/new", async (req, res) => {
//   //Hint: The RETURNING keyword can return the data that was inserted.
//   //https://www.postgresql.org/docs/current/dml-returning.html
// });

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
