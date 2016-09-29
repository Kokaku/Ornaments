var mongodb = require('mongodb');
const express = require('express');
const bodyParser= require('body-parser');

const app = express();
var MongoClient = mongodb.MongoClient;
var url = 'mongodb://localhost:27017/ornaments';

app.use(bodyParser.urlencoded({extended: true}));

app.listen(3000, function() {
    console.log('listening on 3000');
});

app.use('/public', express.static('public'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.post('/annotatedPages', function(req, res) {
    var position;
    if(req.body.position == 'Infinity') {
        position = Infinity;
    } else {
        position = parseInt(req.body.position);
    }
    var limit = parseInt(req.body.limit);
    getAnnotatedPages(res, position, limit);
});

app.get('/nextRandomPage', function(req, res) {
    getRandomPage(res);
});

app.post('/newOrnament', function(req, res) {
    res.send("");
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


app.post('/editOrnament', function(req, res) {
    res.send("");
    var editedArray = {};
    editedArray["ornaments."+req.body["id"]] = {
        "x": req.body["x"],
        "y": req.body["y"],
        "w": req.body["w"],
        "h": req.body["h"]
    };

    var editQuery = {"$set": editedArray};

    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
        } else {
            db.collection('annotatedPages').updateOne(
                {"_id": req.body["page"]},
                editQuery,
                function () {
                    db.close();
                });
        }
    });
});

function getAnnotatedPages(httpRes, position, limit) {
    MongoClient.connect(url, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
            httpRes.send("");
        } else {
            var annotatedPages = db.collection('annotatedPages');

            annotatedPages.count(function (err, annotatedPagesCount) {
                if (err) {
                    console.log("Cannot load annotated pages:", err);
                } else {
                    if (position == Infinity) {
                        position = annotatedPagesCount-limit;
                        if(position < 0 ) {
                            position = 0;
                        }
                    }
                    annotatedPages.find().skip(position).limit(-limit).toArray(function (err, result) {
                        if (err) {
                            console.log("Cannot load annotated pages:", err);
                        } else if (result.length) {
                            httpRes.send({
                                res: result,
                                position: position+result.length-1,
                                annotatedPagesCount: annotatedPagesCount
                            })
                        } else {
                            httpRes.send("")
                        }

                        db.close();
                    });
                }
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
            httpRes.send("");
            db.close();
        } else if (result.length) {
            var pageUrl = result[randomInt(result.length)]["pages"]["url"];

            db.collection('annotatedPages').find({_id: pageUrl}).count(function (err, pageCount) {
                if (err) {
                    console.log("Cannot fetch annotatedPages:", err);
                    httpRes.send("");
                    db.close();
                } else if (pageCount != 0) {
                    console.log("redraw: " + pageUrl);
                    getRandomBook(httpRes, db, booksCount);
                } else {
                    console.log("send: " + pageUrl);
                    httpRes.send(pageUrl);
                    savePage(db, pageUrl);
                }
            });
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