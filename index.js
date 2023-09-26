const express = require('express')
const bodyparser = require('body-parser')
const fs = require('fs');
const path = require('path')
const mysql = require('mysql2')
const multer = require('multer')
const csv = require('fast-csv');
const app = express()
const ejs = require('ejs');

app.set('view engine', 'ejs');

app.use(express.static("./public"))
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({
    extended: true
}))

// Database connection
const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "filecsv"
})

const PORT = 5001
app.listen(PORT, () => console.log(`Node app serving on port: ${PORT}`))

const storage = multer.diskStorage({
    destination: (req, file, callBack) => {
        callBack(null, './uploads/')
    },
    filename: (req, file, callBack) => {
        callBack(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({
    storage: storage
});

function uploadCsv(uriFile) {
    let stream = fs.createReadStream(uriFile);
    let csvDataColl = [];
    let fileStream = csv
        .parse()
        .on("data", function (data) {
            csvDataColl.push(data);
        })
        .on("end", function () {
            csvDataColl.shift();

            pool.getConnection((error, connection) => {
                if (error) {
                    console.error(error);
                } else {
                    let query = 'INSERT INTO registers (Name,Age,Country) VALUES ?';
                    connection.query(query, [csvDataColl], (error, res) => {
                        console.log(error || res);
                    });
                }
            });

            fs.unlinkSync(uriFile)

        });

    stream.pipe(fileStream);
}

// Get all the data from registers table and render it to the index.ejs

app.get('/', async (req, res) => {
    let data = [];

    pool.getConnection((error, connection) => {
        if (error) {
            console.error(error);
        } else {
            let query = 'SELECT * FROM registers';
            connection.query(query, (error, data) => {
                console.log(data)
                res.render('index', {data: data});
            });
        }
    });



});


app.get('/data-imported', (req, res) => {
    res.sendFile(__dirname + '/data-imported.html');
});

app.post('/import-csv', upload.single("import-csv"), (req, res) => {
    uploadCsv(__dirname + '/uploads/' + req.file.filename);
    res.redirect('/data-imported');
});