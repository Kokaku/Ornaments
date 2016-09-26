var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/ornaments';
const express = require('express');
const bodyParser= require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.listen(3000, function() {
    console.log('listening on 3000');
});

app.use('/public', express.static('public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/annotatedPages', function(req, res) {
    getAnnotatedPages(res);
});

app.get('/nextRandomPage', function(req, res) {
    getRandomPage(res);
});

app.post('/newOrnament', function(req, res) {
    console.log("newOrnament");
    console.log(req.body);

    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
        } else {
            db.collection('annotatedPages').updateOne(
                {"_id": req.body["page"]},
                {
                    "$push": {
                        "ornaments": {
                            "x": req.body["x"],
                            "y": req.body["y"],
                            "w": req.body["w"],
                            "h": req.body["h"]
                        }
                    }
                }, function () {
                    db.close();
                });
        }
    });

});

function getAnnotatedPages(httpRes) {
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
            httpRes.send("");
        } else {
            var annotatedPages = db.collection('annotatedPages');
            annotatedPages.find().limit(-5).toArray(function (err, result) {
                if (err) {
                    console.log("Cannot load annotated pages:", err);
                } else if (result.length) {
                    console.log('Found:', result);
                    httpRes.send(result)
                } else {
                    httpRes.send("")
                }

                db.close();
            });
        }
    });
}

function getRandomPage(httpRes) {
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
            httpRes.send("");
        } else {
            db.collection('books').find().count(function (err, booksCount) {
                if (err) {
                    console.log("Cannot fetch booksCount:", err);
                    httpRes.send("");
                } else {
                    getRandomBook(httpRes, db, booksCount);
                }
            });
        }
    });
}

function getRandomBook(httpRes, db, booksCount) {
    db.collection('books').find({}, {_id: 1, pageCount: 1}).limit(-1).skip(randomInt(booksCount)).next(function (err, result) {
        if (err) {
            console.log("Cannot get a random book:", err);
            httpRes.send("");
        } else {
            getRandomPageInBook(httpRes, db, result['_id'], booksCount);
        }
    });
}

function getRandomPageInBook(httpRes, db, bookId, booksCount) {
    db.collection('books').aggregate([
        {$match: {_id: bookId}},
        { $unwind : "$pages" },
        {$project: {"pages.url" : 1}}]).toArray(function (err, result) {

        if (err) {
            console.log("Cannot get random page:", err);
            db.close();
        } else if (result.length) {
            var pageUrl = result[randomInt(result.length)]["pages"]["url"];
            /*
            if (pageUrl already draw) {
                getRandomBook(httpRes, books, booksCount);
            }
             //*/
            httpRes.send(pageUrl);
            savePage(db, pageUrl);
        } else {
            db.close();
        }
    });

}

function savePage(db, pageUrl) {
    var annotatedPages = db.collection('annotatedPages');
    annotatedPages.insertOne({_id: pageUrl, ornaments: []}, function (err, result) {
        if (err) {
            console.log("Cannot insert new annotated page:", err);
        }

        db.close();
    });
}

function randomInt(max) {
    return Math.floor(Math.random() * max);
}