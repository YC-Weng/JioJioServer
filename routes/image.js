var pg = require('pg');
var express = require('express');
var router = express.Router();
const multer = require('multer');

const dbData = {
  host:'db-test-1.c2sb2wzpumsd.us-west-2.rds.amazonaws.com',
  port:5432,
  database:'team18',
  user:'postgres',
  password:'team18demo3'
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 10*1024*1024
  },
  fileFilter (req, file, callback) {
    callback(null, true);
  }
})

router.get('/', async (req,res,next) => {
  const id = req.query.id == null ? 0 : req.query.id;
  if (id == 0) res.status(400).send({status:"missing id"});
  else {
    const client = new pg.Client(dbData);
    await client.connect();
    const result = await client.query(`SELECT img FROM image WHERE id = ${id}`);
    client.end();
    if (result.rowCount == 0) res.send({status:"image not found"});
    else {
      var arr = [];
      for (let i=0;i<result.rows[0].img.length;i++){
        arr.push(result.rows[0].img[i].toString(16))
        if (arr[i].length < 2) arr[i]='0' + arr[i];
      }
      res.send({status:"ok",image:arr});
    }
  }
})

router.post('/upload',upload.single('image'), async (req, res, next) => {
  var arr = [];
  for (let i=0;i<req.file.buffer.length;i++){
    arr.push(req.file.buffer[i].toString(16))
    if (arr[i].length < 2) arr[i]='0' + arr[i];
  }
  const client = new pg.Client(dbData);
  await client.connect();
  const result = await client.query(`SELECT MAX(id) from image`)
  const img = "E'\\\\x" + arr.join('') + "'";
  await client.query(`INSERT INTO image VALUES (${img},${result.rows[0].max+1})`);
  client.end();
  res.send({status:"ok",id:result.rows[0].max+1});
})

router.post('/update',upload.single('image'), async (req, res, next) => {
  const userid = req.query.userid == null ? `` : `userid = ${req.query.userid}`;
  const photo = req.query.photo == null ? `` :
                req.query.photo == 0 ? `avatar` : `photo${req.query.photo}`;
  if (userid == `` || photo == ``) res.status(400).send({status:"missing userid or photo"});
  else{
    var arr = [];
    for (let i=0;i<req.file.buffer.length;i++){
      arr.push(req.file.buffer[i].toString(16))
      if (arr[i].length < 2) arr[i]='0' + arr[i];
    }
    const img = "E'\\\\x" + arr.join('') + "'";
    const client = new pg.Client(dbData);
    await client.connect();
    const rst = await client.query(`SELECT ${photo} as t FROM profile WHERE ${userid}`);
    
    if (rst.rows[0].t == 0){
      const result = await client.query(`SELECT MAX(id) from image`)
      await client.query(`INSERT INTO image VALUES (${img},${result.rows[0].max+1})`);
      await client.query(`UPDATE profile SET ${photo} = ${result.rows[0].max+1} WHERE ${userid}`);
    }
    else await client.query(`UPDATE image SET img = ${img} WHERE id = ${rst.rows[0].t}`);
    
    client.end();
    res.send({status:"ok"});
  }

})

module.exports = router;