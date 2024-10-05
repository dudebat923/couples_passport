import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});
db.connect();

export default class MapEditor {
    // Returns a list of territories a user has visited
    static async checkVisitedTerritories (mapIndex, userId) {
        const query = (mapIndex === 1 ? "SELECT countries.country_code\n" +
            "FROM global_passports AS gp\n" +
            "JOIN countries ON countries.id = gp.country_id\n" +
            "WHERE user_id = $1"
            :
            "SELECT states.state_code\n" +
            "FROM state_passports AS sp\n" +
            "JOIN states ON states.id = sp.state_id\n" +
            "WHERE user_id = $1");

        const result = await db.query(query, [userId]);
        let territories = [];

        if (mapIndex === 1) {
            result.rows.forEach((country) => {
                territories.push(country.country_code);
            });
        } else {
            result.rows.forEach((state) => {
                territories.push(state.state_code);
            });
        }

        return territories;
    }
}