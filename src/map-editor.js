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
            "WHERE user_id = $1"
        );

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

    // Adds a user/territory combination to the database
    static async addVisitedTerritory (mapIndex, userId, territory) {
        const errorHead = (mapIndex === 1 ? 'Country' : 'State');

        const codeQuery = (mapIndex === 1 ?
            "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';"
            :
            "SELECT state_code FROM states WHERE LOWER(state_name) LIKE '%' || $1 || '%';"
            );

        const insertQuery = (mapIndex === 1 ?
            "INSERT INTO global_passports (user_id, country_id) SELECT $1, countries.id FROM countries WHERE countries.country_code = $2"
            :
            "INSERT INTO state_passports (user_id, state_id) SELECT $1, states.id FROM states WHERE states.state_code = $2"
        );

        try {
            const result = await db.query(codeQuery, [territory.toLowerCase()] );

            const data = result.rows[0];
            const territoryCode = (mapIndex === 1 ? data.country_code : data.state_code);
            try {
                await db.query(insertQuery, [userId, territoryCode] );
            } catch (err) {
                return `${errorHead} has already been added, try again`;
            }
        } catch (err) {
            return `${errorHead} name does not exist, try again`;
        }
    }

    static async deleteVisitedTerritory (mapIndex, userId, territory) {
        const errorHead = (mapIndex === 1 ? 'Country' : 'State');

        const getTerritoryQuery = (mapIndex === 1 ?
                "SELECT id FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';"
                :
                "SELECT id FROM states WHERE LOWER(state_name) LIKE '%' || $1 || '%';"
        );

        const deleteQuery = (mapIndex === 1 ?
                "DELETE FROM global_passports WHERE user_id = $1 AND country_id = $2"
                :
                "DELETE FROM state_passports WHERE user_id = $1 AND state_id = $2"
        );

        try {
            const result = await db.query(getTerritoryQuery, [territory.toLowerCase()] );

            const data = result.rows[0];
            const territoryId = data.id;
            const deleteResult = await db.query(deleteQuery, [userId, territoryId]);

            if (deleteResult.rowCount === 0) {
                return `${errorHead} was never visited`;
            }
        } catch (err) {
            return `${errorHead} name does not exist, try again`;
        }
    }
}