var pg = require('pg');
var express = require('express');
var router = express.Router();

const dbData = {
  host:'db-test-1.c2sb2wzpumsd.us-west-2.rds.amazonaws.com',
  port:5432,
  database:'team18',
  user:'postgres',
  password:'team18demo3'
};

router.get('/', async (req, res, next) => {
  const sport = req.query.sport == null ? `` : `sport = '${req.query.sport}'`;
  const condition = sport == `` ? `` : `WHERE ${sport}`;
  const client = new pg.Client(dbData);
  await client.connect();
  const result = await client.query(`SELECT * FROM place ${condition}`);
  client.end();
  res.send({place:result.rows,status:"ok"});

});

module.exports = router;
