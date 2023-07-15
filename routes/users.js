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

router.get('/all', async (req, res, next) => {
  const client = new pg.Client(dbData);
  await client.connect();
  const result = await client.query(`SELECT * FROM profile `);
  client.end();
  res.send({profile:result.rows,status:"ok"});
})

router.get('/', async (req, res, next) => {
  const userid = req.query.userid == null ? -1 : req.query.userid;
  if (userid==-1) res.status(400).send({status:"missing userid"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();
    const result = await client.query(`SELECT * FROM profile WHERE userid = ${userid}`);

    if (result.rowCount == 0) res.send({status:"User NotFound"});
    else {
      var rtn = result.rows[0];
      if (result.rows[0].avatar != 0) {
        const rst = await client.query(`SELECT img FROM image WHERE id = ${result.rows[0].avatar}`);
        var arr = [];
        for (let i=0;i<rst.rows[0].img.length;i++){
          arr.push(rst.rows[0].img[i].toString(16))
          if (arr[i].length < 2) arr[i]='0' + arr[i];
        }
        rtn.avatar=arr;
      }
      if (result.rows[0].photo1 != 0) {
        const rst = await client.query(`SELECT img FROM image WHERE id = ${result.rows[0].photo1}`);
        var arr = [];
        for (let i=0;i<rst.rows[0].img.length;i++){
          arr.push(rst.rows[0].img[i].toString(16))
          if (arr[i].length < 2) arr[i]='0' + arr[i];
        }
        rtn.photo1=arr;
      }
      if (result.rows[0].photo2 != 0) {
        const rst = await client.query(`SELECT img FROM image WHERE id = ${result.rows[0].photo2}`);
        var arr = [];
        for (let i=0;i<rst.rows[0].img.length;i++){
          arr.push(rst.rows[0].img[i].toString(16))
          if (arr[i].length < 2) arr[i]='0' + arr[i];
        }
        rtn.photo2=arr;
      }
      if (result.rows[0].photo3 != 0) {
        const rst = await client.query(`SELECT img FROM image WHERE id = ${result.rows[0].photo3}`);
        var arr = [];
        for (let i=0;i<rst.rows[0].img.length;i++){
          arr.push(rst.rows[0].img[i].toString(16))
          if (arr[i].length < 2) arr[i]='0' + arr[i];
        }
        rtn.photo3=arr;
      }
      if (result.rows[0].photo4 != 0) {
        const rst = await client.query(`SELECT img FROM image WHERE id = ${result.rows[0].photo4}`);
        var arr = [];
        for (let i=0;i<rst.rows[0].img.length;i++){
          arr.push(rst.rows[0].img[i].toString(16))
          if (arr[i].length < 2) arr[i]='0' + arr[i];
        }
        rtn.photo4=arr;
      }
      if (result.rows[0].photo5 != 0) {
        const rst = await client.query(`SELECT img FROM image WHERE id = ${result.rows[0].photo5}`);
        var arr = [];
        for (let i=0;i<rst.rows[0].img.length;i++){
          arr.push(rst.rows[0].img[i].toString(16))
          if (arr[i].length < 2) arr[i]='0' + arr[i];
        }
        rtn.photo5=arr;
      }
      if (result.rows[0].photo6 != 0) {
        const rst = await client.query(`SELECT img FROM image WHERE id = ${result.rows[0].photo6}`);
        var arr = [];
        for (let i=0;i<rst.rows[0].img.length;i++){
          arr.push(rst.rows[0].img[i].toString(16))
          if (arr[i].length < 2) arr[i]='0' + arr[i];
        }
        rtn.photo6=arr;
      }
      res.send({status:"ok",profile:rtn})
    }

    client.end();
  }
});

router.get('/fromaccount', async (req, res, next) => {
  const account = req.query.account == null ? -1 : req.query.account;
  if (account==-1) res.status(400).send({status:"missing account"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();
    const result = await client.query(`SELECT userid FROM users WHERE account = '${account}'`);
    client.end();
    if (result.rowCount == 0) res.send({status:"User NotFound"});
    else res.send({userid:result.rows[0].userid,status:"ok"});
  }
});

router.post('/update', async (req, res, next) => {
  if (req.query.userid == null) res.status(400).send({status:"missing userid"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();

    const userid = `userid = ${req.query.userid}`;
    const schoolgrade = req.query.schoolgrade == null ? `` : `, schoolgrade = '${req.query.schoolgrade}'`;
    const name = req.query.name == null ? `` : `, name = '${req.query.name}'`;
    const intro = req.query.intro == null ? `` : `, intro = '${req.query.intro}'`;
    const sports = req.query.oftenparticipate == null ? [] : req.query.oftenparticipate.split('!');
    const temp = sports.length == 0 ? `` : `'${sports.join("','")}'`;
    const sport = sports.length == 0 ? `` : `, oftenparticipate = ARRAY[${temp}]`;
    const avater = req.query.avatar == null ? `` : `, avatar = ${req.query.avatar}`;
    const sql = `UPDATE profile SET ${userid}${schoolgrade}${name}${intro}${sport}${avater} WHERE ${userid} RETURNING *`;

    const result = await client.query(sql);
    client.end();

    if (result.rowCount == 0) res.send({status: "userid Notfound"});
    else res.send({profile:result.rows[0],status: "ok"});
  }
})

router.post('/create', async (req, res, next) => {
  if (req.query.account == null || req.query.schoolgrade == null || req.query.name == null) res.status(400).send({status:"missing schoolgrade or name or account"});
  else{
      const client = new pg.Client(dbData);
      await client.connect();
      const rstt = await client.query(`SELECT MAX(userid) from users`);

      const rst = await client.query(`INSERT INTO users VALUES (${rstt.rows[0].max+1},'${req.query.account}') RETURNING userid`);

      const userid = [`userid`, `${rst.rows[0].userid}`];
      const schoolgrade = [`, schoolgrade`, `, '${req.query.schoolgrade}'`];
      const name = [`, name`, `, '${req.query.name}'`];
      const avatar = req.query.avatar == null ? [`, avatar`,`0`] : [`, avatar`, `, ${req.query.avatar}`];
      const intro = req.query.intro == null ? [``, ``] : [`, intro`, ` , '${req.query.intro}'`];
      const photo = [`,photo1,photo2,photo3,photo4,photo5,photo6`,`,0,0,0,0,0,0`];
      const sql = `INSERT INTO profile (${userid[0]}${schoolgrade[0]}${name[0]}${intro[0]}${avatar[0]}${photo[0]}) VALUES (${userid[1]}${schoolgrade[1]}${name[1]}${intro[1]}${avatar[1]}${photo[1]}) RETURNING *`;

      result = await client.query(sql);
      client.end();

      res.send({profile:result.rows[0],status:"ok"});
  }
})

module.exports = router;
