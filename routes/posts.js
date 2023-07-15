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

const checkTimeValid = (time) => {
  var valid = false;
  if (time.length == 5){
    if (time[0]>2020&&time[0]<2030&&time[1]>0&&time[1]<13&&time[2]>0&&time[2]<32&&time[3]>=0&&time[3]<=24&&time[4]>=0&&time[4]<=60) valid = true;
  }
  return valid;
}

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

router.get('/', async(req, res, next) => {
  const params = [];
  const postid = req.query.postid == null ? `` : outputReqStringWithOR(req.query.postid.split('!'),`postid`,false);
  if (postid != ``) params.push(postid);
  const posterid = req.query.posterid == null ? `` : outputReqStringWithOR(req.query.posterid.split('!'),`posterid`,false);
  if (posterid != ``) params.push(posterid);
  const place = req.query.place == null ? `` : outputReqStringWithOR(req.query.place.split('!'),`place`,true);
  if (place != ``) params.push(place);
  const sport = req.query.sport == null ? `` : outputReqStringWithOR(req.query.sport.split('!'),`sport`,true);
  if (sport != ``) params.push(sport);
  const participant = req.query.participant == null ? `` : 
                      req.query.participant.split('!').length != 1 ? `` : `(${req.query.participant} = ANY (participant))`;
  if (participant != ``) params.push(participant);
  const finish = req.query.finish == null ? `` :
                 req.query.finish == 1 ? `( end_time < (SELECT NOW()) )` :
                 req.query.finish == 0 ? `( end_time > (SELECT NOW()) )` : ``;
  if (finish != ``) params.push(finish);
  var start = req.query.start == null ? [] : req.query.start.split('!');
  if (start != [] && start.length == 5) {start = `start_time > '${start[0]}-${start[1]}-${start[2]} ${start[3]}:${start[4]}+8'`; params.push(start);}
  var end = req.query.end == null ? [] : req.query.end.split('!');
  if (end != [] && end.length == 5) {end = `end_time < '${end[0]}-${end[1]}-${end[2]} ${end[3]}:${end[4]}+8'`; params.push(end);}
  const param = params.length == 0 ? `` : `WHERE ${params.join(" AND ")}`;

  const order = req.query.order == null ? ` ORDER BY last_modified DESC` :
                req.query.order == "starttimedesc" ? ` ORDER BY start_time DESC` :
                req.query.order == "starttimeasc" ? ` ORDER BY start_time ASC` :
                req.query.order == "createtimedesc" ? ` ORDER BY create_time DESC` :
                req.query.order == "createtimeasc" ? ` ORDER BY create_time ASC` : ` ORDER BY last_modified DESC`;
  
  const info = `postid, sport, place, people, tags, memo, posterid, participant, to_char(start_time, 'YYYY-MM-DD HH24:MI') AS start_time, to_char(end_time, 'YYYY-MM-DD HH24:MI') AS end_time, to_char(create_time, 'YYYY-MM-DD HH24:MI') AS create_time`;
  const sql = `SELECT ${info} FROM posts ${param} ${order}`;

  const client = new pg.Client(dbData);
  await client.connect();
  var result = await client.query(sql);
  if (result.rowCount == 0) res.send({status:"post not found"});
  else {
    for (let i=0;i<result.rows.length;i++){
      const rst = await client.query(`SELECT avatar FROM profile WHERE userid = ${result.rows[i].posterid}`);

      result.rows[i].posteravatar=rst.rows[0].avatar;
    }
    client.end();
    res.send({post:result.rows,status:"ok"});
  }
})

router.post('/update', async (req, res, next) => {
    if (req.query.postid == null) res.status(400).send({status:"missing postid"});
    else{
      const params = [];
      params.push(`postid = ${req.query.postid}`);
      if (req.query.sport != null) params.push(`sport = '${req.query.sport}'`);
      if (req.query.place != null) params.push(`place = '${req.query.place}'`);
      if (req.query.starttime != null){
        const starttime = req.query.starttime.split('!');
        if (checkTimeValid(starttime)) params.push(`start_time = '${starttime[0]}-${starttime[1]}-${starttime[2]} ${starttime[3]}:${starttime[4]}+8'`);
      }
      if (req.query.endtime != null){
        const endtime = req.query.endtime.split('!');
        if (checkTimeValid(endtime)) params.push(`end_time = '${endtime[0]}-${endtime[1]}-${endtime[2]} ${endtime[3]}:${endtime[4]}+8'`);
      }
      if (req.query.people != null) params.push(`people = ${req.query.people}`);
      if (req.query.memo != null) params.push(`memo = '${req.query.memo}'`)
      // var participantidd = req.query.participant == null ? [] : req.query.participantid.split('!');
      // participantidd = participantidd.join(',');
      // if (req.query.participant != null) params.push(`participant = ARRAY[${participantidd}]`);
      var tags = req.query.tags == null ? [] : req.query.tags.split('!');
      tags = "'" + tags.join("','") + "'";
      if (req.query.tags != null) params.push(`tags = ARRAY[${tags}]`);
      params.push(`last_modified = (SELECT NOW())`);
       
      const client = new pg.Client(dbData);
      await client.connect();
        
      const sql = `UPDATE posts SET ${params.join(',')} WHERE postid = ${req.query.postid} RETURNING *`;
        
      result = await client.query(sql);
      client.end();

      if (result.rowCount == 0) res.send({status:"post not found"});
      else res.send({post:result.rows[0],status:"ok"});
    }
})

router.post('/create', async (req, res, next) => {
    if (req.query.posterid == null || req.query.sport == null || req.query.place == null ||
        req.query.starttime == null || req.query.endtime == null || req.query.people == null) res.status(400).send({status:"missing posterid or sport or place or starttime or endtime or people"});
    else{
      const starttime = req.query.starttime.split('!');
      const endtime = req.query.endtime.split('!');
      if (checkTimeValid(starttime) == false || checkTimeValid(endtime) == false) res.status(400).send({status:"starttime or endtime invalid"});
      else {
        const client = new pg.Client(dbData);
        await client.connect();
        var result = await client.query(`SELECT MAX(postid) FROM posts`);

        var keys = [`postid`,`posterid`,`sport`,`place`,`people`,`start_time`,`end_time`,`participant`];
        var params = [`${result.rows[0].max+1}`,`${req.query.posterid}`,`'${req.query.sport}'`,`'${req.query.place}'`,`${req.query.people}`,`'${starttime[0]}-${starttime[1]}-${starttime[2]} ${starttime[3]}:${starttime[4]}+8'`,`'${endtime[0]}-${endtime[1]}-${endtime[2]} ${endtime[3]}:${endtime[4]}+8'`,`ARRAY[${req.query.posterid}]`];
        if (req.query.memo != null){
          keys.push(`memo`);
          params.push(`'${req.query.memo}'`);
        }
        if (req.query.tags != null){
          keys.push(`tags`);
          var tags = req.query.tags.split('!');
          tags = "'" + tags.join("','") + "'";
          params.push(`ARRAY[${tags}]`);
        }
        keys.push(`last_modified`);
        keys.push(`create_time`);
        params.push(`(SELECT NOW())`);
        params.push(`(SELECT NOW())`);
        const key = keys.join(',');
        const param = params.join(',');
  
        const result2 = await client.query(`SELECT MAX(applyid) FROM apply`);
        await client.query(`INSERT INTO apply (applyid,postid,applicant,posterid,process,last_modified) VALUES (${result2.rows[0].max+1},${result.rows[0].max+1},${req.query.posterid},${req.query.posterid},1,(SELECT NOW()))`);

        const sql = `INSERT INTO posts (${key}) VALUES (${param}) RETURNING *`;
        result = await client.query(sql);
        client.end();

        res.send({post:result.rows[0],status:"ok"});
      }
      
    }
})

router.post('/deleteparticipant', async (req, res, next) => {
  const postid = req.query.postid == null ? `` : `${req.query.postid}`;
  const participant = req.query.participant == null ? `` : `${req.query.participant}`;
  if (postid == `` || participant == ``) res.status(400).send({status:"missing postid or participant"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();
    var result = await client.query(`SELECT * from posts WHERE postid = ${postid}`);
    if (result.rowCount == 0) res.send({status:"post not found"});
    else{
      var i, index = -1;
      if (result.rows[0].participant.length > 0){
        for (i = 0; i < result.rows[0].participant.length; i++) {
          if (participant == result.rows[0].participant[i]) index = i;
        }
      }
      if (index == -1) res.send({status:"participant not found"});
      else{
        if (result.rows[0].participant.length == 1 && index == 0){
          await client.query(`DELETE FROM apply WHERE postid = ${postid} AND applicant = ${participant}`);
          result = await client.query(`UPDATE posts SET participant = ARRAY[]::Integer[] WHERE postid = ${postid} RETURNING *`);
          client.end();
          res.send({post:result.rows[0],status:"ok"});
        }
        else{
        result.rows[0].participant.splice(index,1);
        await client.query(`DELETE FROM apply WHERE postid = ${postid} AND applicant = ${participant}`);
        result = await client.query(`UPDATE posts SET participant = ARRAY [${result.rows[0].participant.join(',')}] WHERE postid = ${postid} RETURNING *`);
        client.end();
        res.send({post:result.rows[0],status:"ok"});
        }
      }
    }
  }
})

router.post('/deletepost', async (req, res, next) => {
  const postid = req.query.postid == null ? `` : `${req.query.postid}`;
  if (postid == ``) res.status(400).send({status:"missing postid"});
  else{
    const client = new pg.Client(dbData);
    await client.connect();
    await client.query(`DELETE FROM posts WHERE postid = ${postid}`);
    await client.query(`DELETE FROM apply WHERE postid = ${postid}`);
    client.end();
    res.send({status:"ok"});
  }
})

module.exports = router;
