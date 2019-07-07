// Dependency
var express  = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var app      = express();
var server   = require('http').Server(app);
var io       = require('socket.io')(server);

// Config
app.use(bodyParser.json({
    limit: '10mb'
}));
app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: false
}));
app.use(bodyParser.json());
app.use(function(req,res,next){
    req.io = io;
    next();
});

// Static files path
app.use(express.static(__dirname + '/public'));

mongoose.connect("mongodb+srv://gentur:rutneg@cluster0-3npte.gcp.mongodb.net/realtime_chart",{ useNewUrlParser: true });


var schema = mongoose.Schema({name: {type:String,required: true}});
var Vote = mongoose.model('Vote', schema);

var Userschema = mongoose.Schema({
    username: {type:String,required: true},
    password: {type:String,required: true}
});
var User = mongoose.model('User', Userschema);

// Render homepage.
app.get('/', function(req, res) {
    res.sendfile('index.html');
});

// Route for voting
app.post('/vote', function(req, res) {
    var field = [{name: req.body.name}];
    // console.log(req.body)

    var newVote = new Vote(field[0]);

    newVote.save(function(err, data) {
        if (err) {
            console.log(`error save data :${err}`)
        } else {
            // console.log(`Saved. data = ${data}`);
            Vote.aggregate(

                [{ "$group": {
                    "_id": "$name",
                    "total_vote": { "$sum": 1 }
                }}],
        
                function(err, results) {
                    if (err) throw err;
                    // console.log(`data socket: ${results}`);
                    User.aggregate([
                        {
                            $sort:{_id:1}
                        }
                    ]
                    ,(err, hasil)=>{
                        if (err || hasil.length == 0) {
                            console.log("no user found")
                        } else {
                            // console.log(hasil)
                            for (let index = 0; index < hasil.length; index++) {
                                let username = hasil[index].username
                                let password = hasil[index].password
                                req.io.sockets.emit(`vote${username}${password}`, results)                  
                            }

                        }
                    })
                }
                );
        }
    });

    res.send({'message': 'Successfully added.'});
});

app.get('/data', function(req, res) {
    Vote.find().exec(function(err, msgs) {
        res.json(msgs);
    });
});

/*
Socket.io Setting
*/

io.on('connection', function (socket) {
    User.aggregate([
        {
            $sort:{_id:1}
        }
    ]
    ,(err, hasil)=>{
        if (err || hasil.length == 0) {
            console.log("no user found")
        } else {
            // console.log(hasil)
        Vote.aggregate(

            [{ "$group": {
                "_id": "$name",
                "total_vote": { "$sum": 1 }
            }}],
    
            function(err, results) {
                // console.log(results)
                if (err) throw err;
    
                for (let index = 0; index < hasil.length; index++) {
                    let username = hasil[index].username
                    let password = hasil[index].password
                    socket.emit(`vote${username}${password}`, results)
                }
            }
            )

        }
    })


    // Vote.aggregate(

    //     [{ "$group": {
    //         "_id": "$name",
    //         "total_vote": { "$sum": 1 }
    //     }}],

    //     function(err, results) {
    //         if (err) throw err;

    //         socket.emit('vote', results);
    //     }
    //     )

});

// Start
server.listen(3000);
console.log('Open http://localhost:3000');
