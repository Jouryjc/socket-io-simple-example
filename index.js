var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8080;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));



io.on('connection', function (socket) {

    socket.on('resize', function (e) {   
        socket.broadcast.emit('resize');
        socket.emit('resize');
    });

    socket.on('mouse down', function (data) {  
        socket.emit('mouse down', {
            data:data
        });
        socket.broadcast.emit('mouse down', {
            data:data
        });
    });
    socket.on('mousemove.fireworks touchmove.fireworks', function (data) {   
        socket.broadcast.emit('mousemove.fireworks touchmove.fireworks', {
            data:data
        });
        socket.emit('mousemove.fireworks touchmove.fireworks', {
            data:data
        });
    });
    socket.on('mouse up', function (e) {   
        socket.broadcast.emit('mouse up');
        socket.emit('mouse up');
    });

     socket.on('keydown space', function (e) {   
        socket.broadcast.emit('keydown space' , {
            data:e
        });
        socket.emit('keydown space' , {
            data:e
        });
    });
})