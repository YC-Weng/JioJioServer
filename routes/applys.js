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

const outputReqStringWithOR = (arr, s, dot) => {
  if (dot){
    var newArr = arr.map(x => `${s} = '${x}'`);
    return "(" + newArr.join(" OR ") + ")";
  }
  else{
    var newArr = arr.map(x => `${s} = ${x}`);
    return "(" + newArr.join(" OR ") + ")";
  }
}

router.get('/', async (req, res, next) => {
  const params = [];
  const applicant = req.query.applicant == null ? `` : outputReqStringWithOR(req.query.applicant.split('!'),`applicant`,false);
  if (applicant != ``) params.push(applicant);
  const posterid = req.query.posterid == null ? `` : outputReqStringWithOR(req.query.posterid.split('!'),`posterid`,false);
  if (posterid != ``) params.push(posterid);
  const process = req.query.process == null ? `` : outputReqStringWithOR(req.query.process.split('!'),`process`,false);
  if (process != ``) params.push(process);
  const postid = req.query.postid == null ? `` : outputReqStringWithOR(req.query.postid.split('!'),`postid`,false);
  if (postid != ``) params.push(postid);

  const param = params.length == 0 ? `` : `WHERE ${params.join(' AND ')}`;

  const client = new pg.Client(dbData);
  await client.connect();
  const sql = `SELECT * FROM apply ${param} ORDER BY last_modified DESC`;
  const result = await client.query(sql);
  client.end();
  if (result.rowCount == 0) res.send({status:"no apply found"});
  else res.send({apply:result.rows,status:"ok"});
}
);

router.get('/profileandpost', async (req, res, next) => {
  const params = [];
  const applicant = req.query.applicant == null ? `` : `apply.applicant = ${req.query.applicant}`;
  if (applicant != ``) params.push(applicant);
  const process = req.query.process == null ? `` : `apply.process = ${req.query.process}`;
  if (process != ``) params.push(process);
  const posterid = req.query.posterid == null ? `` : `apply.posterid = ${req.query.posterid}`;
  if (posterid != ``) params.push(posterid);
  
  if ((applicant == `` && posterid == ``) || process == ``) res.status(400).send({status:"missing any of applicant or posterid ,or process"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();
    const param = params.join(' AND ');
    const sql = `SELECT * FROM apply WHERE ${param}`;
    var result = await client.query(sql);
    if (result.rowCount == 0) res.send({status:"No apply found"});
    else{
      for (let i=0;i<result.rowCount;i++){
        const info = `postid, sport, place, people, tags, memo, posterid, participant, to_char(start_time, 'YYYY-MM-DD HH24:MI') AS start_time, to_char(end_time, 'YYYY-MM-DD HH24:MI') AS end_time, to_char(create_time, 'YYYY-MM-DD HH24:MI') AS create_time`;
        const rst1 = await client.query(`SELECT ${info} FROM posts WHERE postid = ${result.rows[i].postid}`);
        const rst2 = posterid == `` ? await client.query(`SELECT * FROM profile WHERE userid = ${rst1.rows[0].posterid}`) :
                                      await client.query(`SELECT * FROM profile WHERE userid = ${result.rows[i].applicant}`); 
                                           
        result.rows[i] = posterid == `` ? {applyid:result.rows[i].applyid,post:rst1.rows[0],posterprofile:rst2.rows[0],avatar:rst2.rows[0].avatar} :
                                          {applyid:result.rows[i].applyid,post:rst1.rows[0],applicantprofile:rst2.rows[0],avatar:rst2.rows[0].avatar};
      }
        client.end();
        res.send({result:result.rows,status:"ok"});
    }
  }
})

router.post('/update', async (req, res, next) => {
  const applyid = req.query.applyid == null ? `` : `${req.query.applyid}`;
  const process = req.query.process == null ? `` : `${req.query.process}`;
  if (applyid == `` || process == ``) res.status(400).send({status:"missing process or applyid"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();
    var result = await client.query(`SELECT applicant,postid,process from apply WHERE applyid = ${applyid}`);
    if (result.rowCount == 0){
      client.end();
      res.send({status:"no apply found"});
    }
    else{
      if (process == 1 && result.rows[0].process != 1){
        var result2 = await client.query(`SELECT people,cardinality(participant),participant from posts WHERE postid = ${result.rows[0].postid}`);
        if (result2.rows[0].cardinality + 1 <= result2.rows[0].people) {
          await client.query(`UPDATE apply SET process = 1, last_modified = (SELECT(NOW())) WHERE applyid = ${applyid}`);
          const newParticipant = result2.rows[0].participant;
          newParticipant.push(result.rows[0].applicant);
          result = await client.query(`UPDATE posts SET participant = ARRAY [${newParticipant.join(',')}], last_modified = (SELECT(NOW())) WHERE postid = ${result.rows[0].postid} RETURNING *`);
          client.end();
          res.send({posts:result.rows[0],status:"ok"});
        }
        else {
          result = await client.query(`UPDATE apply SET process = -2, last_modified = (SELECT(NOW())) WHERE applyid = ${applyid} RETURNING *`);
          client.end();
          res.send({apply:result.rows[0],status:"that jiojio is full"});
        }
      }
      else if (result.rows[0].process == 1){
        client.end();
        res.send({status:"you are already in that jiojio"});
      }
      else{
        await client.query(`UPDATE apply SET process = -1, last_modified = (SELECT(NOW())) WHERE applyid = ${applyid}`);
        client.end();
        res.send({status:"ok"});
      }
    }
  }
})

router.post('/create', async (req, res, next) => {
  const applicant = req.query.applicant == null ? `` : `${req.query.applicant}`;
  const postid = req.query.postid == null ? `` : `${req.query.postid}`;
  if (applicant == `` || postid == ``) res.status(400).send({status:"missing applicant or postid"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();
    var result = await client.query(`SELECT posterid FROM posts WHERE postid = ${postid}`);
    if (result.rowCount == 0){
      client.end();
      res.send({status:"post not found"});
    }
    else{
      var result2 = await client.query(`SELECT * from apply WHERE applicant = ${applicant} AND postid = ${postid}`);
      var result3 = await client.query(`SELECT cardinality(participant),people from posts WHERE postid = ${postid}`);
      if (result3.rows[0].cardinality >= result3.rows[0].people) {
        if (result2.rowCount == 0){
          result2 = await client.query(`SELECT MAX(applyid) FROM apply`);
          result = await client.query(`INSERT INTO apply VALUES (${result2.rows[0].max+1},${postid},${applicant},${result.rows[0].posterid},-2,(SELECT NOW())) RETURNING *`);
          client.end();
          res.send({apply:result.rows[0],status:"that jiojio is full"});
        }
        else{
          if (result2.rows[0].process == 1){
            client.end();
            res.send({status:"you are already in this jiojio"});
          }
          else{
            await client.query(`UPDATE apply SET process = -2, last_modified = (SELECT(NOW())) WHERE applicant = ${applicant} AND postid = ${postid}`);
            client.end();
            res.send({status:"that jiojio is full"});
          }
        }
      }
      else{
        if (result2.rowCount == 0){
          result2 = await client.query(`SELECT MAX(applyid) FROM apply`);
          result = await client.query(`INSERT INTO apply VALUES (${result2.rows[0].max+1},${postid},${applicant},${result.rows[0].posterid},0,(SELECT NOW())) RETURNING *`);
          client.end();
          res.send({apply:result.rows[0],status:"ok"});
        }
        else{
          if (result2.rows[0].process == 1){
            client.end();
            res.send({status:"you are already in this jiojio"});
          }
          else{
            const result = await client.query(`UPDATE apply SET process = 0, last_modified = (SELECT(NOW())) WHERE applicant = ${applicant} AND postid = ${postid} RETURNING *`);
            client.end();
            res.send({apply:result.rows[0],status:"ok"});
          }
        }
      }
    }
  }
})

// router.post('/deleteapply', async (req, res, next) => {
//   const applyid = req.query.applyid == null ? `` : `${req.query.applyid}`;
//   if (applyid == ``) res.status(400).send({status:"missing applyid"});
//   else{
//     const client = new pg.Client(dbData);
//     await client.connect();
//     await client.query(`DELETE FROM apply WHERE applyid = ${applyid}`);
//     client.end();
//     res.send({status:"ok"});
//   }
// })

module.exports = router;
