$(function(){
    var Fireworks = function(){
        var self = this;
        var socket = io();
        var $window = $(window);

        var rand = function(rMi, rMa){
            return ~~((Math.random()*(rMa-rMi+1))+rMi);
        }
        var hitTest = function(x1, y1, w1, h1, x2, y2, w2, h2){
            return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
        }

        //canvas动画函数
        window.requestAnimFrame=function(){
            return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||
            window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a){window.setTimeout(a,1E3/60)}
        }();


        //烟花初始化
        self.init = function(){ 
            self.canvas = document.createElement('canvas');             
            self.canvas.width = self.cw = $window.innerWidth();
            self.canvas.height = self.ch = $window.innerHeight();         
            self.particles = [];    
            self.partCount = 50;
            self.fireworks = [];    
            self.mx = self.cw/2;
            self.my = self.ch/2;
            self.currentHue = 30;
            self.partSpeed = 5;
            self.partSpeedVariance = 10;
            self.partWind = 50;
            self.partFriction = 5;
            self.partGravity = 1;
            self.hueMin = 0;
            self.hueMax = 360;
            self.fworkSpeed = 10;
            self.fworkAccel = 10;
            self.hueVariance = 30;
            self.flickerDensity = 25;
            self.showShockwave = true;
            self.showTarget = false;
            self.clearAlpha = 25;

            $(document.body).append(self.canvas);
                self.ctx = self.canvas.getContext('2d');
                self.ctx.lineCap = 'round';
                self.ctx.lineJoin = 'round';
                self.lineWidth = 2;
                self.bindEvents();          
                self.canvasLoop();
                self.canvas.onselectstart = function() {
                    return false;
                };
        };      


        //创造烟花效果的粒子
        self.createParticles = function(x,y, hue){
            var countdown = self.partCount;
            while(countdown--){
                var newParticle = {
                    x: x,
                    y: y,
                    coordLast: [
                        {x: x, y: y},
                        {x: x, y: y},
                        {x: x, y: y}
                    ],
                    angle: rand(0, 360),
                    speed: rand(((self.partSpeed - self.partSpeedVariance) <= 0) ? 1 : self.partSpeed - self.partSpeedVariance, (self.partSpeed + self.partSpeedVariance)),
                    friction: 1 - self.partFriction/100,
                    gravity: self.partGravity/2,
                    hue: rand(hue-self.hueVariance, hue+self.hueVariance),
                    brightness: rand(50, 80),
                    alpha: rand(40,100)/100,
                    decay: rand(10, 50)/1000,
                    wind: (rand(0, self.partWind) - (self.partWind/2))/25,
                    lineWidth: self.lineWidth
                };              
                self.particles.push(newParticle);
            }
        };

        //更新烟花的粒子->烟花爆炸
        self.updateParticles = function(){
            var i = self.particles.length;
            while(i--){
                var p = self.particles[i];
                var radians = p.angle * Math.PI / 180;
                var vx = Math.cos(radians) * p.speed;
                var vy = Math.sin(radians) * p.speed;
                p.speed *= p.friction;                  
                p.coordLast[2].x = p.coordLast[1].x;
                p.coordLast[2].y = p.coordLast[1].y;
                p.coordLast[1].x = p.coordLast[0].x;
                p.coordLast[1].y = p.coordLast[0].y;
                p.coordLast[0].x = p.x;
                p.coordLast[0].y = p.y;
                p.x += vx;
                p.y += vy;
                p.y += p.gravity;
                p.angle += p.wind;              
                p.alpha -= p.decay;
                if(!hitTest(0,0,self.cw,self.ch,p.x-p.radius, p.y-p.radius, p.radius*2, p.radius*2) || p.alpha < .05){                  
                    self.particles.splice(i, 1);    
                }
            }
        }


        //画粒子
        self.drawParticles = function(){
            var i = self.particles.length;
            while(i--){
                var p = self.particles[i];                          
                var coordRand = (rand(1,3)-1);
                self.ctx.beginPath();                               
                self.ctx.moveTo(Math.round(p.coordLast[coordRand].x), Math.round(p.coordLast[coordRand].y));
                self.ctx.lineTo(Math.round(p.x), Math.round(p.y));
                self.ctx.closePath();               
                self.ctx.strokeStyle = 'hsla('+p.hue+', 100%, '+p.brightness+'%, '+p.alpha+')';
                self.ctx.stroke();             
                if(self.flickerDensity > 0){
                    var inverseDensity = 50 - self.flickerDensity;                  
                    if(rand(0, inverseDensity) === inverseDensity){
                        self.ctx.beginPath();
                        self.ctx.arc(Math.round(p.x), Math.round(p.y), rand(p.lineWidth,p.lineWidth+3)/2, 0, Math.PI*2, false)
                        self.ctx.closePath();
                        var randAlpha = rand(50,100)/100;
                        self.ctx.fillStyle = 'hsla('+p.hue+', 100%, '+p.brightness+'%, '+randAlpha+')';
                        self.ctx.fill();
                    }   
                }
            }
        }


        //创造烟花
        self.createFireworks = function(startX, startY, targetX, targetY){
            var newFirework = {
                x: startX,
                y: startY,
                startX: startX,
                startY: startY,
                hitX: false,
                hitY: false,
                coordLast: [
                    {x: startX, y: startY},
                    {x: startX, y: startY},
                    {x: startX, y: startY}
                ],
                targetX: targetX,
                targetY: targetY,
                speed: self.fworkSpeed,
                angle: Math.atan2(targetY - startY, targetX - startX),
                shockwaveAngle: Math.atan2(targetY - startY, targetX - startX)+(90*(Math.PI/180)),
                acceleration: self.fworkAccel/100,
                hue: self.currentHue,
                brightness: rand(50, 80),
                alpha: rand(50,100)/100,
                lineWidth: self.lineWidth
            }          
            self.fireworks.push(newFirework);
        }

        //更新烟花
        self.updateFireworks = function(){
            var i = self.fireworks.length;
            while(i--){
                var f = self.fireworks[i];
                self.ctx.lineWidth = f.lineWidth;
                vx = Math.cos(f.angle) * f.speed,
                vy = Math.sin(f.angle) * f.speed;
                f.speed *= 1 + f.acceleration;              
                f.coordLast[2].x = f.coordLast[1].x;
                f.coordLast[2].y = f.coordLast[1].y;
                f.coordLast[1].x = f.coordLast[0].x;
                f.coordLast[1].y = f.coordLast[0].y;
                f.coordLast[0].x = f.x;
                f.coordLast[0].y = f.y;
                if(f.startX >= f.targetX){
                    if(f.x + vx <= f.targetX){
                        f.x = f.targetX;
                        f.hitX = true;
                    } else {
                        f.x += vx;
                    }
                } else {
                    if(f.x + vx >= f.targetX){
                        f.x = f.targetX;
                        f.hitX = true;
                    } else {
                        f.x += vx;
                    }
                }
                if(f.startY >= f.targetY){
                    if(f.y + vy <= f.targetY){
                        f.y = f.targetY;
                        f.hitY = true;
                    } else {
                        f.y += vy;
                    }
                } else {
                    if(f.y + vy >= f.targetY){
                        f.y = f.targetY;
                        f.hitY = true;
                    } else {
                        f.y += vy;
                    }
                }               
                if(f.hitX && f.hitY){
                    self.createParticles(f.targetX, f.targetY, f.hue);
                    self.fireworks.splice(i, 1);
                }
            };
        };

        //绘制烟花
        self.drawFireworks = function(){

            var i = self.fireworks.length;
            self.ctx.globalCompositeOperation = 'lighter';
            while(i--){
                var f = self.fireworks[i];      
                self.ctx.lineWidth = f.lineWidth;
                var coordRand = (rand(1,3)-1);                  
                self.ctx.beginPath();                           
                self.ctx.moveTo(Math.round(f.coordLast[coordRand].x), Math.round(f.coordLast[coordRand].y));
                self.ctx.lineTo(Math.round(f.x), Math.round(f.y));
                self.ctx.closePath();
                self.ctx.strokeStyle = 'hsla('+f.hue+', 100%, '+f.brightness+'%, '+f.alpha+')';
                self.ctx.stroke();  
                if(self.showTarget){
                    self.ctx.save();
                    self.ctx.beginPath();
                    self.ctx.arc(Math.round(f.targetX), Math.round(f.targetY), rand(1,8), 0, Math.PI*2, false)
                    self.ctx.closePath();
                    self.ctx.lineWidth = 1;
                    self.ctx.stroke();
                    self.ctx.restore();
                }
                if(self.showShockwave){
                    self.ctx.save();
                    self.ctx.translate(Math.round(f.x), Math.round(f.y));
                    self.ctx.rotate(f.shockwaveAngle);
                    self.ctx.beginPath();
                    self.ctx.arc(0, 0, 1*(f.speed/5), 0, Math.PI, true);
                    self.ctx.strokeStyle = 'hsla('+f.hue+', 100%, '+f.brightness+'%, '+rand(25, 60)/100+')';
                    self.ctx.lineWidth = f.lineWidth;
                    self.ctx.stroke();
                    self.ctx.restore();
                }
            };
        };

        //事件绑定
        self.bindEvents = function(){
                //窗口调整
                $window.on('resize', function(){
                    socket.emit('resize');
                });
                //按下鼠标
                $(self.canvas).on('mousedown touchstart', function(e){

                    var data = {
                            'pageX':e.pageX,
                            'pageY':e.pageY
                        };
                    socket.emit('mouse down' , data);
                });
                //释放鼠标
                $(self.canvas).on('mouseup touchend', function(){
                    socket.emit('mouse up');
                });

                $window.on('keydown', function(e){
                    socket.emit('keydown space' , e.keyCode);
                });
        }

        function keyDown(data){
            
            if(data['data'] === 32){
                var tk = new Teamkill();
                tk.run();
            }
        }


        function windowResize(){          
            clearTimeout(self.timeout);
            self.timeout = setTimeout(function() {
                self.canvas.width = self.cw = $window.innerWidth();
                self.canvas.height = self.ch = $window.innerHeight();
                self.ctx.lineCap = 'round';
                self.ctx.lineJoin = 'round';
            }, 100);
        }

        function mouseDown(data){
            $('#boom').get(0).play();
            self.mx = data['data']['pageX'] - self.canvas.offsetLeft;
            self.my = data['data']['pageY'] - self.canvas.offsetTop;
            self.currentHue = rand(self.hueMin, self.hueMax);
            self.createFireworks(self.cw/2, self.ch, self.mx, self.my);     
            $(self.canvas).on('mousemove.fireworks touchmove.fireworks', function(e){
                var data = {
                    'pageX':e.pageX,
                    'pageY':e.pageY
                };
                $(e).attr('disabled' , 'true');
                setTimeout(function(){
                    $(e).attr('disabled' , 'false');
                },5);
                // self.mx = e.pageX - self.canvas.offsetLeft;
                // self.my = e.pageY - self.canvas.offsetTop;
                // self.currentHue = rand(self.hueMin, self.hueMax);
                // self.createFireworks(self.cw/2, self.ch, self.mx, self.my);  
                socket.emit('mousemove.fireworks touchmove.fireworks' , data);            
            });      
        }

        function mouseMove(data){
            self.mx = data['data']['pageX'] - self.canvas.offsetLeft;
            self.my = data['data']['pageY'] - self.canvas.offsetTop;
            self.currentHue = rand(self.hueMin, self.hueMax);
            self.createFireworks(self.cw/2, self.ch, self.mx, self.my);                                 
        }

        function mouseUp(){
            $(self.canvas).off('mousemove.fireworks touchmove.fireworks');  
        }
    
        socket.on('resize', function(e){
            windowResize();
        });
        socket.on('mouse down', function(e){
            mouseDown(e);
        });
        socket.on('mousemove.fireworks touchmove.fireworks', function(e){
            mouseMove(e);
        });
        socket.on('mouse up', function(){
            mouseUp();
        });

        socket.on('keydown space', function(e){
            keyDown(e);
        });

        //清除函数
        self.clear = function(){
            self.particles = [];
            self.fireworks = [];
            self.ctx.clearRect(0, 0, self.cw, self.ch);
        };
        
        //动画函数
        self.canvasLoop = function(){
            requestAnimFrame(self.canvasLoop, self.canvas);         
            self.ctx.globalCompositeOperation = 'destination-out';
            self.ctx.fillStyle = 'rgba(0,0,0,'+self.clearAlpha/100+')';
            self.ctx.fillRect(0,0,self.cw,self.ch);
            self.updateFireworks();
            self.updateParticles();
            self.drawFireworks();           
            self.drawParticles();
        };
        //启动函数->初始化
        self.init();        
    }
    //初始化烟花对象
    var fworks = new Fireworks();
})


    Math.Tau = Math.PI * 2;

    var request = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || function(cb) {
        return setTimeout(cb, 40)
    };

    var Teamkill = function() {
        var text = 'THANK YOU , FUNPLUS';
        var font = 'Helvetica';
        var fontSize = 100;

        var compositionAtop = 'source-atop';
        var compositionNormal = 'source-over';

        var canvas = document.getElementById('canvas2');
        var engine = canvas.getContext('2d');
        var canvasData = null;

        var patternCanvas = document.createElement('canvas');
        var patternEngine = patternCanvas.getContext('2d');

        var pixels = [];
        var pixelStops = [];
        var moveSpeed = 2;
        var speedTicker = 1;

        var targetLook = 1;
        var targetLookReverse = targetLook * 2;

        var drawMode = false;
        var speed = 1;
        var speedX = 1;
        var speedY = 1;

        var sensitivity = 3; //pixelcount:  window.innerWidth * window.innerHeight / (sensitivity ^ 2)
        var pixelMultiplier = 1;
        var pixelSize = 2; //zurzeit wird dies ignoriert, dass pixel manuel geschrieben werden (performancegr¨¹nde)

        var highlightTickerStart = 0;
        var highlightTicker = highlightTickerStart;
        var highlightTickerMax = 60 * 3;
        var color = 'rgb(200, 200, 200)';
        //#FFD700

        var gradient = null;
        var changeTime = 3000;

        var textBound = {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        };

        this.run = function() {
            setTimeout(changeDrawMode, 3000);

            canvas.setAttribute('width', window.innerWidth);
            canvas.setAttribute('height', window.innerHeight);

            patternCanvas.setAttribute('width', window.innerWidth);
            patternCanvas.setAttribute('height', window.innerHeight);

            patternEngine.fillStyle = '#fff';
            patternEngine.font = 'italic bold '.concat(fontSize).concat('px ').concat(font);

            gradient = engine.createLinearGradient(0, 0, window.innerWidth, 0);

            for (var i = 0, max = 10, color = null; i < max; i++) {
                color = 'hsl('.concat(360 / max * i).concat(', 50%, 50%)');
                gradient.addColorStop(i / max || 0, color);
            }

            setup();
            tick();
        };

        var setup = function() {
            prepareText();
            generatePixels();
        };

        var changeDrawMode = function() {
            speedTicker = 1;
            drawMode = !drawMode;

            if (drawMode) {

                highlightTicker = highlightTickerStart;

                for (var i = 0; i < pixels.length; i++) {
                    pixels[i].moveX = 0;
                    pixels[i].moveY = 0;
                }
            }
        };

        var prepareText = function() {
            pixelStops = [];

            var m = patternEngine.measureText(text);
            patternEngine.clearRect(0, 0, window.innerWidth, window.innerHeight);
            patternEngine.fillText(text, window.innerWidth / 2 - m.width / 2, window.innerHeight / 4 - fontSize / 2);

            var imgData = patternEngine.getImageData(0, 0, window.innerWidth, window.innerHeight);

            textBound.left = window.innerWidth/2  - m.width / 2;
            textBound.top = window.innerHeight/2  - fontSize / 2 - fontSize;
            textBound.width = m.width;
            textBound.height = fontSize;

            for (var y = 0; y < window.innerHeight; y += sensitivity) {
                for (var x = 0; x < window.innerWidth; x += sensitivity) {
                    if (imgData.data[4 * (y * window.innerWidth + x)] != 0) {
                        pixelStops.push({
                            x: x,
                            y: y,
                            color: 'hsl(' + (360 / textBound.width * x - textBound.left) + ', 50%, 50%)'
                        });
                    }
                }
            }
        };

        var generatePixels = function() {
            pixels = [];

            for (var i = 0, max = Math.ceil(pixelStops.length * pixelMultiplier); i < max; i++) {

                var speed = Math.random() * 10;
                var split = Math.random();
                var speedX = (0.5 - Math.random()) < 0 ? split * speed : 0 - split * speed;
                var speedY = (0.5 - Math.random()) < 0 ? (1 - split) * speed : 0 - (1 - split) * speed;

                pixels.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    dirX: speedX,
                    dirY: speedY,
                    split: split,
                    oldX: 0,
                    oldY: 0,
                    moveX: 0,
                    moveY: 0
                });
            }
        };

        var tick = function() {
            engine.clearRect(0, 0, window.innerWidth, window.innerHeight);

            if (drawMode) {
                speedTicker += 0.01;
                speed = moveSpeed + speedTicker;
                speedX = window.innerWidth / window.innerHeight * speed;
                speedY = window.innerWidth / window.innerHeight * speed;
            }

            engine.fillStyle = color;

            var moving = false;
            for (var i = 0; i < pixels.length; i++) {

                if (i < pixelStops.length) {
                    engine.fillStyle = pixelStops[i].color;
                    //engine.fillStyle = 'hsl(150, 50%, 50%)';
                } else {
                    engine.fillStyle = color;
                }

                //engine.fillStyle = 'hsl(' + (360 / window.innerWidth * pixels[i].x) + ', 50%, 50%)';

                if (drawMode) {
                    if (i < pixelStops.length) {
                        if (drawText(i)) {
                            moving = true;
                        }
                    } else {
                        drawNormal(pixels[i]);
                    }
                } else {
                    drawNormal(pixels[i]);
                }

            }

            if (drawMode && !moving) {
                drawHighlight();
            }

            request(tick);
        };

        var drawHighlight = function() {
            highlightTicker++;

            if (highlightTicker > 0 && highlightTicker <= highlightTickerMax) {
                engine.globalCompositeOperation = compositionAtop;
                engine.fillStyle = '#fff';

                var w = 10;
                var left = textBound.left - 20 + ((textBound.width + 40) / highlightTickerMax * highlightTicker);

                engine.fillRect(left, textBound.top - 20, w, textBound.height + 40);
                engine.fillRect(left + w + 5, textBound.top - 20, 5, textBound.height + 40);
                engine.globalCompositeOperation = compositionNormal;

               /* if (highlightTicker == highlightTickerMax) {
                    setTimeout(changeDrawMode, 1000);
                    setTimeout(changeDrawMode, changeTime);
                }*/
            }
        };

        var drawText = function(pixelIterator) {
            arc(pixels[pixelIterator].x, pixels[pixelIterator].y);
            engine.fill();

            return textMoving(pixelIterator);
        };

        var range = function(pixel, target, dim) {
            return Math.abs(pixel[dim] - target[dim]);
        };

        var textMoving = function(pixelIterator) {
            var moving = false;
            var target = pixelStops[pixelIterator];
            var pixel = pixels[pixelIterator];

            //redundant, in loop klatschen

            if (target.x == pixel.x) {
                //do nothing
            } else if (range(pixel, target, 'x') < targetLookReverse) {
                pixel.x = target.x;
            } else {
                if (pixel.x > target.x) {
                    if (pixel.moveX > 0) {
                        pixel.moveX -= targetLookReverse;
                    } else {
                        pixel.moveX -= targetLook;
                    }
                } else {
                    if (pixel.moveX < 0) {
                        pixel.moveX += targetLookReverse;
                    } else {
                        pixel.moveX += targetLook;
                    }
                }

                moving = true;
                pixel.x += pixel.moveX;
            }

            if (target.y == pixel.y) {
                //do nothing
            } else if (range(pixel, target, 'y') < targetLookReverse) {
                pixel.y = target.y;
            } else {
                if (pixel.y > target.y) {
                    if (pixel.moveY > 0) {
                        pixel.moveY -= targetLookReverse;
                    } else {
                        pixel.moveY -= targetLook;
                    }
                } else {
                    if (pixel.moveY < 0) {
                        pixel.moveY += targetLookReverse;
                    } else {
                        pixel.moveY += targetLook;
                    }
                }

                moving = true;
                pixel.y += pixel.moveY;
            }

            return moving;
        };

        var drawNormal = function(pixel) {
            move(pixel);
            bound(pixel);

            arc(pixel.x, pixel.y);

            engine.fill();
        };

        var arc = function(x, y) {
            x = x | 0;
            y = y | 0;

            engine.fillRect(x, y, pixelSize, pixelSize);
        };

        var move = function(pixel) {
            pixel.x += pixel.dirX;
            pixel.y += pixel.dirY;
        };

        var bound = function(pixel) {
            if (pixel.x < 0) {
                pixel.dirX = Math.abs(pixel.dirX);
            } else if (pixel.x > window.innerWidth) {
                pixel.dirX = 0 - pixel.dirX;
            }

            if (pixel.y < 0) {
                pixel.dirY = Math.abs(pixel.dirY);
            } else if (pixel.y > window.innerHeight) {
                pixel.dirY = 0 - pixel.dirY;
            }
        };
    };
    


