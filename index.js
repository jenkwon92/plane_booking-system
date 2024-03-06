/*  Code Adapted from
 *    Hussein Nasser
 *    https://github.com/hnasr/javascript_playground/tree/master/booking-system
 *    https://www.youtube.com/watch?v=_95dCYv2Xv4
 */

const express = require("express");
const mysql = require("mysql2/promise");

const port = process.env.PORT || 8800;
const app = new express();

const dbConfigLocal = {
  host: "localhost",
  user: "root",
  password: "Password",
  database: "lab_example",
  multipleStatements: false,
  namedPlaceholders: true,
};

var database = mysql.createPool(dbConfigLocal);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
//get all seats
app.get("/seats", async (req, res) => {
  const result = await database.query(
    "select plane_seat_id AS id, description, (occupied_by IS NOT NULL) AS isbooked, IFNULL(occupied_by,'') AS name from plane_seat"
  );
  console.log("hit to /seats");
  console.log(result[0]);
  res.send(result[0]);
});

function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

app.get("/random", async (req, res) => {
  let id = randRange(1, 20);
  const name = "me";
  await bookSeat(id, name, req, res);
});

//book a seat give the seatId and your name
app.get("/:id/:name", async (req, res) => {
  const id = req.params.id;
  const name = req.params.name;

  await bookSeat(id, name, req, res);
  //res.redirect("/");
});

async function bookSeat(id, name, req, res) {
  let conn = null;
  try {
    conn = await database.getConnection();
    console.log(
      "details - connection: " +
        conn.threadId +
        " plane_seat_id: " +
        id +
        " booking by: " +
        name
    );
    //begin transaction

    //getting the row to make sure it is not booked
    const sql =
      "SELECT plane_seat_id FROM plane_seat where plane_seat_id = :id and occupied_by IS NULL;";
    let selectParams = {
      id: id,
    };
    const result = await conn.query(sql, selectParams);

    //if no rows found then the operation should fail can't book
    if (result[0].length === 0) {
      res.send({ error: "Seat already booked" });
      //end transaction with a rollback
      conn.release();
      return;
    }
    await sleep(500);

    //if we get the row, we are safe to update
    const sqlU =
      "update plane_seat set occupied_by = CONCAT(IFNULL(occupied_by,''), :name) where plane_seat_id = :id";
    let updateParams = {
      id: id,
      name: name,
    };
    const updateResult = await conn.query(sqlU, updateParams);

    //end transaction (commit)
    conn.release();
    //console.log("update result: ");
    //console.log(updateResult);
    res.send(updateResult);
  } catch (ex) {
    //end transaction - error (rollback)
    if (conn != null) {
      conn.release();
    }
    console.log(ex);
    res.sendStatus(500);
    res.send({ error: "exception ex" });
  }
}

app.listen(port, () => console.log("Listening on " + port));
