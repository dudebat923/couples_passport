import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "digital_passports",
  password: "12SeptembeR!@",
  port: 5432,
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

async function checkVisistedCountries() {
  const result = await db.query("SELECT countries.country_code\n" +
      "FROM global_passports AS gp\n" +
      "JOIN countries ON countries.id = gp.country_id\n" +
      "WHERE user_id = $1", [currentUserId]);

  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });

  return countries;
}

async function checkVisistedStates() {
  const result = await db.query("SELECT states.state_code\n" +
      "FROM state_passports AS sp\n" +
      "JOIN states ON states.id = sp.state_id\n" +
      "WHERE user_id = $1", [currentUserId]);
  let states = [];
  result.rows.forEach((state) => {
    states.push(state.state_code);
  });
  return states;
}

async function loadWorldMap(res) {
  const countries = await checkVisistedCountries();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: users[currentUserId - 1].color,
  });
}

async function loadStateMap(res) {
  const states = await checkVisistedStates();
  res.render("united_states.ejs", {
    states: states,
    total: states.length,
    users: users,
    color: users[currentUserId - 1].color,
  });
}

app.get("/", async (req, res) => {
  if (currentMap === 1) {
    await loadWorldMap(res);
  } else {
    await loadStateMap(res);
  }
});

app.post("/add", async (req, res) => {
  if (currentMap === 1) {
    const input = req.body["country"];

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
        console.log(err);
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    const input = req.body["state"];

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
        console.log(err);
      }
    } catch (err) {
      console.log(err);
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
