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

router.get('/', async(req,res,next) => {
    const name = req.query.name == null ? `` : `WHERE name like '%${req.query.name}%'`;
    const client = new pg.Client(dbData);
    await client.connect();
    const result = await client.query(`SELECT * FROM tags ${name} ORDER BY times DESC`);
    client.end();
    if (result.rowCount == 0) res.send({status:"tags not found"});
    else res.send({tags:result.rows,status:"ok"});
})

router.post('/update', async(req,res,next) => {
    const name = req.query.name == null ? [] : req.query.name.split('!');
    if (name.length == 0) res.status(400).send({status:"missing name"});
    else{
        const client = new pg.Client(dbData);
        await client.connect();
        var i;
        for (i=0;i<name.length;i++){
            const result = await client.query(`SELECT * FROM tags WHERE name = '${name[i]}'`);
            if (result.rowCount == 0) await client.query(`INSERT INTO tags VALUES ('${name[i]}',1)`);
            else await client.query(`UPDATE tags SET times = ${result.rows[0].times+1} WHERE name = '${name[i]}'`);
        }
        res.send({status:"ok"});
        
    }
})

module.exports = router;