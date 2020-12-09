const express = require('express');
const app = express();
const sqlite3 = require('sqlite3');
const path = require('path');
const bodyParser = require('body-parser')

const dbPath = "app/db/database.sqlite3";

//　リクエストのbodyをパースする設定
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//publicディレクトリを静的ファイル群のルートディレクトリとして設定
app.use(express.static(path.join(__dirname, 'public')))

/**
 * Get all users
 */
app.get('/api/v1/users', (req, res) => {
  const db = new sqlite3.Database(dbPath);

  db.all('SELECT * FROM users', (err, rows) => {
    res.json(rows);
  });

  db.close;
});

/**
 * Get following users
 */
app.get('/api/v1/users/:id/following', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const id = req.params.id;

  db.all(`SELECT * FROM following LEFT JOIN users ON following.followed_id = users.id WHERE following_id = ${id}`, (err, row) => {
    if(!row || !row.length){
      res.status(404).send({error: "Not Found!"})
    } else {
      res.status(200).json(row);
    }
  });

  db.close;
});
/**
 * Get following users
 */
app.get('/api/v1/users/:id/followers', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const id = req.params.id;

  db.all(`SELECT * FROM following LEFT JOIN users ON following.followed_id = users.id WHERE followed_id = ${id}`, (err, row) => {
    if(!row || !row.length){
      res.status(404).send({error: "Not Found!"})
    } else {
      res.status(200).json(row);
    }
  });

  db.close;
});

/**
 * follow a user
 */
app.post('/api/v1/users/:id1/following/:id2', async(req, res) => {

  const db = new sqlite3.Database(dbPath);
  const id1 = req.params.id1;
  const id2 = req.params.id2;

  if(id1===id2){
    res.status(404).send({error: "自分をフォローすることはできません"});
    return;
  }

  const userExists = (uid) => {
    return  new Promise((resolve, reject)=>{
      db.get(`SELECT * FROM users WHERE id = ${uid}`, (err, row) => {
        if (!row) {
          reject();
        }else{
          resolve();
        }
      });
    });
  }

  Promise.all([userExists(id1),userExists(id2)]).then(followAUser).catch(()=>{
    res.status(404).send({error: "指定されたユーザーが見つかりません"})
  });


  function followAUser () {

    db.get(`SELECT * FROM following WHERE following_id = ${id1} AND followed_id = ${id2}`, async (err, row) => {
      if(row){
      // res.status(404).json(row)
        res.status(404).send({error: `ユーザー${id1}がユーザー${id2}をすでにフォローしています`})
      } else {
        try {
          await run(`INSERT INTO following (following_id, followed_id) VALUES ("${id1}","${id2}")`, db );

          res.status(201).send({message: `ユーザー${id1}がユーザー${id2}をフォローしました`});
        }catch(e) {
          res.status(500).send({error: e});
        }
        db.close();
      }
    });
  }


});

/**
 * unfollow a user
 */
app.delete('/api/v1/users/:id1/following/:id2', async(req, res) => {

  const db = new sqlite3.Database(dbPath);
  const id1 = req.params.id1;
  const id2 = req.params.id2;

  if(id1===id2){
    res.status(404).send({error: "リクエストエラー"});
    return;
  }

  const userExists = (uid) => {
    return  new Promise((resolve, reject)=>{
      db.get(`SELECT * FROM users WHERE id = ${uid}`, (err, row) => {
        if (!row) {
          reject();
        }else{
          resolve();
        }
      });
    });
  }

  Promise.all([userExists(id1),userExists(id2)]).then(followAUser).catch(()=>{
    res.status(404).send({error: "指定されたユーザーが見つかりません"})
  });


  function followAUser () {

    db.get(`SELECT * FROM following WHERE following_id = ${id1} AND followed_id = ${id2}`, async (err, row) => {
      if(!row){
      // res.status(404).json(row)
        res.status(404).send({error: `ユーザー${id1}がユーザー${id2}をフォローしていません`})
      } else {
        try {
          await run(`DELETE FROM following WHERE following_id = ${id1} AND followed_id = ${id2}`, db );

          res.status(201).send({message: `ユーザー${id1}がユーザー${id2}のフォローを解除しました`});
        }catch(e) {
          res.status(500).send({error: e});
        }
        db.close();
      }
    });
  }


});

/**
 * get a following user's info
 */
app.get('/api/v1/users/:id1/following/:id2', async(req, res) => {

  const db = new sqlite3.Database(dbPath);
  const id1 = req.params.id1;
  const id2 = req.params.id2;

  if(id1===id2){
    res.status(404).send({error: "リクエストエラー"});
    return;
  }

  const userExists = (uid) => {
    return  new Promise((resolve, reject)=>{
      db.get(`SELECT * FROM users WHERE id = ${uid}`, (err, row) => {
        if (!row) {
          reject();
        }else{
          resolve();
        }
      });
    });
  }

  Promise.all([userExists(id1),userExists(id2)]).then(getAUser).catch(()=>{
    res.status(404).send({error: "指定されたユーザーが見つかりません"})
  });


  function getAUser () {
    db.get(`SELECT * FROM following WHERE following_id = ${id1} AND followed_id = ${id2}`, (err, row) => {
      if(!row){
      // res.status(404).json(row)
        res.status(404).send({error: `ユーザー${id1}がユーザー${id2}をフォローしていません`})
      } else {

        db.get(`SELECT * FROM users WHERE id = ${id2}`, (err, row) => {
          if(!row){
            res.status(404).send({error: "Not Found!"})
          } else {

            res.status(200).json(row);
          }
        });
      }
    });
  }


});




/**
 * Get a user
 */
app.get('/api/v1/users/:id', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const id = req.params.id;

  db.get(`SELECT * FROM users WHERE id = ${id}`, (err, row) => {
    if(!row){
      res.status(404).send({error: "Not Found!"})
    } else {

      res.status(200).json(row);
    }
  });

  db.close;
});

/**
 * Search users matching keyword
 */
app.get('/api/v1/search', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const keyword = req.query.q;

  db.all(`SELECT * FROM users WHERE name LIKE "%${keyword}%"`, (err, rows) => {
    res.json(rows);
  });

  db.close;
});

const run = async (sql, db) => {
  return new Promise((resolve, reject) => {
    db.run(sql, (err)=>{
      if(err) {
        return reject(err);
      } else {
        return resolve();
      }

    })
  })
}

/**
 * Create a new user
 */
app.post('/api/v1/users', async(req, res) => {
  if(!req.body.name || req.body.name === ""){
    res.status(400).send({error: "ユーザー名が指定されていません"})
  }else{
    const db = new sqlite3.Database(dbPath);

    const name = req.body.name;
    const profile = req.body.profile ? req.body.profile : "";
    const dateOfBirth = req.body.date_of_birth ? req.body.date_of_birth : "";

    try {
      await run(`INSERT INTO users (name, profile, date_of_birth) VALUES ("${name}","${profile}","${dateOfBirth}")`,
        db
      );

      res.status(201).send({message: "新規ユーザーを作成しました！"});
    }catch(e) {
      res.status(500).send({error: e});
    }
    db.close();
  }

});



/**
 * Update user data
 */
app.put('/api/v1/users/:id', async(req, res) => {

  if(!req.body.name || req.body.name === ""){
    res.status(400).send({error: "ユーザー名が指定されていません"})
  }else{
    const db = new sqlite3.Database(dbPath);
    const id = req.params.id;

    //現在のユーザー情報を取得する
    db.get(`SELECT * FROM users WHERE id = ${id}`, async (err, row) => {

      if (!row) {
        res.status(404).send({error: "指定されたユーザーが見つかりません"})
      }else {
        const name = req.body.name ? req.body.name: row.name;
        const profile = req.body.profile ? req.body.profile : row.profile;
        const dateOfBirth = req.body.date_of_birth ? req.body.date_of_birth : row.dateOfBirth;

        try {
          await run(
            `UPDATE users SET name="${name}", profile="${profile}", date_of_birth="${dateOfBirth}" WHERE id = ${id}`,
            db,
          );
          res.status(200).send({message: "ユーザー情報を更新しました"})
        } catch (e) {
          res.status(500).send({error: e})
        }
      }
    });

    db.close();
  }
})


/**
 * Delete user data
 */
app.delete('/api/v1/users/:id', async(req, res) => {
  const db = new sqlite3.Database(dbPath);
  const id = req.params.id;

  //現在のユーザー情報を取得する
  db.get(`SELECT * FROM users WHERE id = ${id}`, async (err, row) => {

    if (!row) {
      res.status(404).send({error: "指定されたユーザーが見つかりません"})
    }else {
      try {
        await run(`DELETE FROM users WHERE id = ${id}`, db);
        res.status(200).send({message: "ユーザーを削除しました"});
      } catch(e) {
        res.status(500).send({error: e});
      }
    }
  });


  db.close();

})

const port = process.env.PORT || 3000;
app.listen(port);
console.log("Listen on port: "+port);