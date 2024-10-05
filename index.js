import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import MapEditor from "./src/map-editor.js";

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT || 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

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

app.post("/add", async (req, res) => {
  if (currentMap === 1) {
    const input = req.body["country"];
    const countries = MapEditor.checkVisitedTerritories(1, currentUserId);

    try {
      const result = await db.query(
          "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
          [input.toLowerCase()]
      );

      const data = result.rows[0];
      const countryCode = data.country_code;
      try {
        await db.query(
            "INSERT INTO global_passports (user_id, country_id) SELECT $1, countries.id FROM countries WHERE countries.country_code = $2",
            [currentUserId, countryCode]
        );
        res.redirect("/");
      } catch (err) {
        res.redirect("/?error=" + encodeURIComponent('Country has already been added, try again.'));
      }
    } catch (err) {
      res.redirect("/?error=" + encodeURIComponent('Country name does not exist, try again.'));
    }
  } else {
    const input = req.body["state"];
    const states = MapEditor.checkVisitedTerritories(2, currentUserId);

    try {
      const result = await db.query(
          "SELECT state_code FROM states WHERE LOWER(state_name) LIKE '%' || $1 || '%';",
          [input.toLowerCase()]
      );

      const data = result.rows[0];
      const stateCode = data.state_code;
      try {
        await db.query(
            "INSERT INTO state_passports (user_id, state_id) SELECT $1, states.id FROM states WHERE states.state_code = $2",
            [currentUserId, stateCode]
        );
        res.redirect("/");
      } catch (err) {
        res.redirect("/?error=" + encodeURIComponent('State has already been added, try again.'));
      }
    } catch (err) {
      res.redirect("/?error=" + encodeURIComponent('State name does not exist, try again.'));
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
