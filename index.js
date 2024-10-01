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

let users = [
  { id: 1, name: "Together", color: "palevioletred" },
  { id: 2, name: "Tyler", color: "mediumseagreen" },
  { id: 3, name: "Monica", color: "dodgerblue" },
];

async function checkVisistedCountries() {
  const result = await db.query("SELECT countries.country_code\n" +
      "FROM global_passports AS gp\n" +
      "JOIN countries ON countries.id = gp.country_id\n" +
      "WHERE user_id = $1", [1]);
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
      "WHERE user_id = $1", [1]);
  let states = [];
  result.rows.forEach((state) => {
    states.push(state.state_code);
  });
  return states;
}

app.get("/", async (req, res) => {
  const countries = await checkVisistedCountries();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: "teal",
  });
});

app.post("/add", async (req, res) => {
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
        "INSERT INTO visited_countries (country_code) VALUES ($1)",
        [countryCode]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {});

app.post("/switch", async (req, res) => {
  console.log(req.body);
  if (req.body.map === 'world') {
    const countries = await checkVisistedCountries();
    res.render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: "teal",
    });
  } else if (req.body.map === 'united states') {
    const states = await checkVisistedStates();
    res.render("united_states.ejs", {
      states: states,
      total: states.length,
      users: users,
      color: "teal",
    });
  } else {
    res.status(400).send("Unknown map state");
  }
})

// app.post("/new", async (req, res) => {
//   //Hint: The RETURNING keyword can return the data that was inserted.
//   //https://www.postgresql.org/docs/current/dml-returning.html
// });

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
