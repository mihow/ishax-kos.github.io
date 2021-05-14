'use strict';

(function() {
    "use strict";
    const GRAVITY = 0.5;
    const GROUND = 420;
    var canvas_element;
    var draw_context;
    var playerInstance;
    var END = 3072;
    var actors = [];
    var current_background;
    var current_map = map_level1;
    var start_time = 0
    var play_time_tracker
    var score_tracker
    var last_score_tracker
    var modal_play_again


    // This object contains all the game's visual assets
    var Graphics = {
        add(name) {
            if (name in this) {
                return this[name];
            }
            else {
                let g = new Image();
                g.src = "graphics/" + name + ".png";
                this[name] = g;
                return g;
            }
        }
    }
    Graphics.add("background");
    Graphics.add("background2");
    Graphics.add("chad-nr");
    Graphics.add("chad-nl");
    Graphics.add("chad-dr");
    Graphics.add("chad-dl");
    Graphics.add("gobbo-r");
    Graphics.add("gobbo-l");
    Graphics.add("health");
    Graphics.add("wizard_health");
    Graphics.add("hit-l");
    Graphics.add("hit-r");
    Graphics.add("wizard-l");
    Graphics.add("wizard-r");
    Graphics.add("spell1");
    Graphics.add("spell2");


    // Draw an image to the canvas
    function drawImage(image, position = [0,0]) {
        draw_context.drawImage(image, position[0], position[1]);
    }
    


    // This object contains all the game's audio
    var Sounds = { 
        bgm: undefined,
        bgm_play(name) {
            this[this.bgm].loop = false;
            this[this.bgm].pause();
            this[name].loop = true;
            this[name].play();
            this.bgm = name;
        },
        add(name) {
            if (name in this) {
                return this[name];
            }
            else {
                let s = new Audio();
                s.src = "sounds/" + name + ".ogg";
                this[name] = s;
                return s;
            }
        }
    }
    Sounds.add("gob_hurt");
    Sounds.add("wizard_hurt");
    Sounds.add("hurt");
    Sounds.add("sword_swing1");
    Sounds.add("sword_swing2");
    Sounds.add("shield_thump");
    Sounds.add("spell3");
    Sounds.add("warp2");
    Sounds.add("level_music");
    Sounds.add("wizard_music");
    Sounds["level_music"].loop = true;
    Sounds["wizard_music"].loop = true;
    Sounds.bgm = "level_music";


    // Get the time since the game began as a formatted string
    function get_time() {
        let d = new Date();
        if (start_time != 0) {
            d.setTime(Date.now() - start_time);
        } else {
            d.setTime(0);
        }
        return d.getMinutes().toString().padStart(2,"0") + ":" + d.getSeconds().toString().padStart(2,"0");
    }


    // Apply a change to the player's score
    function update_score(value){
        playerInstance.score = Math.max(0, playerInstance.score + value);
        score_tracker.innerText = playerInstance.score;
    }


    // Determines if an attack hits something.
    function check_hit(self, target_class, hit_rect, action = function() {}) {
        actors.forEach( function(actr) {
            if (actr != self && actr instanceof target_class) {
                let res = actr.intersects_rect(hit_rect);
                if (res) {
                    console.log(target_class.className);
                    actr.is_stabbed(hit_rect, res);
                return true;
                }
            }
        });
    }
    

    // (hitbox rectangle) Returns an object's bounding box (position and size) as two points
    function hb_rect(self,value) {
        switch (value) {
            case 0: return self.pos[0] - self.width/2;
            case 1: return self.pos[1] - self.height;
            case 2: return self.pos[0] + self.width/2;
            case 3: return self.pos[1];
        }
    }

    
    // The base class for objects that move and do things.
    /**It should be noted that these actors run off of a behavior system
     * where a function representing the current behavior is stored in a
     * variable and executed here in the super class. These functions are
     * prefixed with "bhv_".
     * **/
    class Actor {
        constructor(posx, posy = GROUND) {
            this.pos = [posx, posy];
            this.health = 1.0;
            
            this.accel = 0.0;
            this.dir = 1.0;
            this.jumpfall = -6.0;
            this.fastfall = false;
            this.height = 128;
            this.width = 128;
            this.bhv_time = 0;
            this.behavior = this.bhv_normal;
            this.stab_box;
            this.paused = false;
        }


        // Get or alter motion without handling acceleration and direction independantly
        motion() {
            return this.accel * this.dir;
        }
        set_motion(motion) {
            this.accel = Math.abs(motion);
            this.dir = Math.sign(motion);
        }
        add_motion(motion) {
            this.accel += Math.abs(motion);
            this.dir = Math.sign(motion);
        }

        
        // Handle input
        input() {}


        // check if a rectangle intersects with this actor
        intersects_rect(rect) {
            console.log("hitbox",hb_rect(this,0));
            console.log("rectpos",rect[0]);
            if ((hb_rect(rect,0) >= hb_rect(this,0) && hb_rect(rect,0) <= hb_rect(this,2))
            ||  (hb_rect(rect,2) >= hb_rect(this,0) && hb_rect(rect,2) <= hb_rect(this,2))) {
                if ((hb_rect(rect,1)   >= hb_rect(this,1) && hb_rect(rect,1)   <= hb_rect(this,3))
                ||  (hb_rect(rect,3)-1 >= hb_rect(this,1) && hb_rect(rect,3)-1 <= hb_rect(this,3))) {
                    console.log("hit");
                    return true;
                }
                else {console.log("xhit")}
            }
            else {console.log("nohit")}
            return false;
        }


        // Tests whether the actor is on the ground (at one point the ground height wasnt going to be constant)
        on_ground() {
            return this.pos[1] >= GROUND;
        }


        // apply the force of gravity
        do_gravity() {
            this.jumpfall = Math.min(this.jumpfall, 12.0); // max fallspeed
            this.pos[1] += this.jumpfall;
            if (this.on_ground()) {
                this.pos[1] = GROUND;
                this.jumpfall = 0.0;
            }
            else {
                if (Math.abs(this.jumpfall) < 0.2) {//This is so the actor doesn't hang in the air so long.
                    this.jumpfall = -this.jumpfall;
                }
                if (this.fastfall) this.jumpfall += GRAVITY*2;
                else this.jumpfall += GRAVITY;
            }
        }


        // base behavior
        bhv_normal() {
            // console.log("norm")
        }

        
        // code that is run every frame.
        update() {
            this.pos[0] += this.accel * this.dir * 4.0;
            this.pos[0] = Math.max(0, Math.min(END, this.pos[0]));
            this.do_gravity();
            this.behavior();
            this.bhv_time += 1;
        }


        // drawing code that is run every frame.
        doDraw(offset) {
            if (this.stab_box != undefined) {
                let p = [hb_rect(this.stab_box,0) - offset, hb_rect(this.stab_box,1)];
                if (this.stab_box.dir == 1) {
                    drawImage(Graphics["hit-r"], p);
                }
                else {
                    drawImage(Graphics["hit-l"], p);
                }
                // draw_window.fillRect(p[0],p[1], this.stab_box.width,this.stab_box.height)
            }
            // draw_window.fillRect(hb_rect(this, 0),hb_rect(this, 1), this.width,this.height)
        }


        // Code to be run when an actor reaches 0 health
        onDeath() {}
    }


    // The actor controlled by the player
    class Player extends Actor {
        constructor(posx, posy = GROUND) {
            super(posx, posy);
            this.health = 4.0;
            this.stance = 1;
            this.dir_input = 0.0;
            this.height = 128;
            this.width = 64;
            this.invuln = 0;
            var self = this;
            document.addEventListener("keydown", function(ev) {if (!ev.repeat) self.input(ev,  1)}, true);
            document.addEventListener("keyup",   function(ev) {if (!ev.repeat) self.input(ev, -1)}, true);
            this.score = 0;
        }


        // Handle input, in this case 
        input(ev, delta = 0) {
            ev.stopPropagation();
            let key = ev.which;
            key += ev.location * 256;
            if (delta == 2) {
                key = 32;
            }
            switch (key) {
                case 13: { // key enter (Jump) is pressed
                    if (this.on_ground() && delta == 1) {
                        this.jumpfall = -12.0;
                        this.fastfall = false;
                    } else {
                        if (delta == -1) {
                            this.jumpfall += Math.max(2.0, this.jumpfall);
                            this.fastfall = true;
                        }
                    }
                } break

                case 222: case 528: if (delta > 0) { // key Lshift (Attack) is pressed
                    console.log("stab input");
                    if (this.behavior != this.bhv_stab) {
                        this.behavior = this.bhv_stab;
                        this.bhv_time = 0;
                    }
                } break

                case 68: { // key D (Right) is pressed
                    this.dir_input += delta;
                } break
                
                case 65: {// key A (left) is pressed
                    this.dir_input -= delta;
                } break

                case 83: { // key S (Down) is pressed
                    if (delta ==  1) this.stance = 0;
                    if (delta == -1) this.stance = 1;
                } break

                case 87: { // key W (up) is pressed (Debug only)
                    actors.forEach( function(value, i) {
                        console.log(value.pos);
                        console.log("gob no", i);
                    });
                }
            }
            this.dir_input = Math.min(Math.max(-1,this.dir_input), 1.0);
        }


        // check if a rectangle intersects with this player, or his shield
        intersects_rect(rect) {
            var shield_t, shield_b;
            if (this.stance == 1) {
                shield_t = hb_rect(this,1) + 64;
                shield_b = hb_rect(this,3);
            }
            if (this.stance == 0) {
                shield_t = hb_rect(this,1);
                shield_b = hb_rect(this,3) - 64;
            }
            hb_rect(this,1)
            if ((hb_rect(rect,0) >= hb_rect(this,0) && hb_rect(rect,0) <= hb_rect(this,2))
            ||  (hb_rect(rect,2) >= hb_rect(this,0) && hb_rect(rect,2) <= hb_rect(this,2))) {
                if (this.dir != rect.dir) {
                    if ((hb_rect(rect,1)   >= shield_t && hb_rect(rect,1)   <= shield_b)
                    ||  (hb_rect(rect,3)-1 >= shield_t && hb_rect(rect,3)-1 <= shield_b)) {
                        console.log("s-hit");
                        return 2;
                    }
                }
                if ((hb_rect(rect,1)   >= hb_rect(this,1) && hb_rect(rect,1)   <= hb_rect(this,3))
                ||  (hb_rect(rect,3)-1 >= hb_rect(this,1) && hb_rect(rect,3)-1 <= hb_rect(this,3))) {
                    console.log("hit");
                    return true;
                }
                else {console.log("xhit")}
            }
            else {console.log("nohit")}
            return false;
        }

        
        // Code to be run when the player is stabbed
        is_stabbed(hitbox, result) {
            if (playerInstance.invuln <= 0) {
                if (result == 2) {
                    console.log("shield");
                    Sounds["shield_thump"].play();
                    // this means the goblin hit your shield
                }
                else {
                    console.log("stab");
                    playerInstance.health -= hitbox.damage;
                    playerInstance.invuln = 15.0;
                    Sounds["hurt"].play();
                    update_score(-5);
                }
                if (hitbox instanceof Spell) {
                    hitbox.damage = 0;
                    hitbox.pos[1] = 1000;
                }
            }
        }


        // Player's Normal behavior
        //   (things like controls need to be run allong side behaviors 
        //    like attacking, so they are not in here but in update.)
        bhv_normal() {
        }


        // Attack an enemy
        bhv_stab() {
            if (this.bhv_time == 1) {
                Sounds["sword_swing1"].play();
                let s = {pos: [0,0], width: 64, height: 32, dir: this.dir, damage: 1.0};
                switch (this.stance) {
                    case 0: s.pos = [this.pos[0] + (this.dir*64), this.pos[1] - 16];
                    break;
                    case 1: s.pos = [this.pos[0] + (this.dir*64), this.pos[1] - 80];
                    break;
                }
                
                this.stab_box = s;
                check_hit(this, Enemy, s);
            }
            if (this.bhv_time >= 40) {
                this.behavior = this.bhv_normal;
                this.bhv_time = 0;
                this.stab_box = undefined;
            }
        }


        // Process a frame
        update() {
            if (this.dir_input != 0) {
                this.add_motion(this.dir_input * 0.1);
            }
            else {
                this.accel = 0;
            }
            this.accel = Math.min(1.25, this.accel);
            if (this.invuln > 0) {
                this.invuln -= 1.0;
            }
            this.bhv_time += 1;
            super.update(this);
        }


        // drawing code that is run every frame.
        doDraw(offset) {
            super.doDraw(offset);
            let pp = [this.pos[0] - 64 - offset, this.pos[1] - 128];
            let image = "chad-";
            if (this.stance == 0){
                image+="n";
            } else {
                image+="d";
            }
            if (this.dir == 1){
                image+="r";
            } else {
                image+="l";
            }
            drawImage(Graphics[image], pp);

            for (let i=0; i < this.health; i+=1) { // hud
                drawImage(Graphics["health"], [8, 8 + i*32]);
            }
        }


        // Code to be run when the player reaches 0 health
        onDeath() {
            change_map(map_game_over);
        }
    }


    // The base class for all enemies (you could even call it "The root of all evil" haha).
    class Enemy extends Actor {}
    

    // The class that defines what a goblin is
    class EnemyGoblin extends Enemy {
        constructor(posx, posy) {
            super(posx, posy);
            // this.sprite = Graphics["gobbo"];
            this.height = 64;
            this.width = 64;
            this.health = 2.0;
            this.dash_dist = 0.0;
            this.dir = -1;
        }
        
        
        // Code to be run when the goblin is stabbed
        is_stabbed(hitbox, result) {
            this.health -= hitbox.damage;
            Sounds["gob_hurt"].play();
        }


        // a goblins's Normal behavior
        bhv_normal() {
            if (Math.abs(playerInstance.pos[0] - this.pos[0]) < 200) {
                if (this.bhv_time == 20) {
                    if (playerInstance.dir != this.dir && Math.random() >= 0.5) {
                        this.behavior = this.bhv_flank;
                        this.bhv_time = 0;
                    }
                }
                if (this.bhv_time == 60) {
                    this.behavior = this.bhv_stab;
                    this.bhv_time = 0;
                }
            }
            let dist = playerInstance.pos[0] - this.pos[0];
            if (Math.abs(dist) < 400) {
                this.dir = Math.sign(dist);
                if (Math.abs(dist) < 70) { //retreat
                    this.accel -= 0.1;
                }
                if (Math.abs(dist) > 90 && this.accel < 1.0) { //approach
                    this.accel += 0.2;
                }
                this.bhv_time = this.bhv_time % 60;

            }
        }


        // Attack the player
        bhv_stab() {
            if (this.bhv_time == 1) {
                Sounds["sword_swing2"].play();
                let s = {pos: [0,0], width: 64, height: 32, dir: this.dir, damage: 1.0};
                s.pos = [this.pos[0] + (this.dir*64), this.pos[1] - 16];
                this.stab_box = s;
                check_hit(this, Player, s);
            }
            if (this.bhv_time >= 30) {
                this.behavior = this.bhv_normal;
                this.bhv_time = 0;
                this.stab_box = undefined;
            }
        }


        // Try to get behind the player
        bhv_flank() {
            if (this.bhv_time == 1) {
                console.log("flank");
                this.dash_dist = Math.abs(this.pos[0] - playerInstance.pos[0]);
            }
            this.accel = this.dash_dist * 0.03;


            if (this.bhv_time >= 17) {
                this.behavior = this.bhv_normal;
                this.bhv_time = Math.floor( 31 + Math.random() * 10 );
            }
        }


        // Process a frame
        update() {
            super.update(this);

            this.accel *= 0.75;
        }

        
        // drawing code that is run every frame.
        doDraw(offset) {
            super.doDraw(offset);
            let pp = [this.pos[0] - 64 - offset, this.pos[1] - 128];
            let image = "gobbo-";
            if (this.dir == 1){
                image+="r";
            } else {
                image+="l";
            }
            drawImage(Graphics[image], pp);
            
        }


        // Code to be run when a goblin reaches 0 health
        onDeath() {
            update_score(10);
        }
        
    }

    
    // The class that defines what Gurnok the wizard is
    class EnemyWizard extends Enemy {
        constructor(posx, posy) {
            super(posx, posy);
            this.height = 192;
            this.width = 80;
            this.health = 6.0;
            this.spell;
            this.stance = 1;
        }


        // Code to be run when the player is stabbed
        is_stabbed(hitbox, result) {
            this.health -= hitbox.damage;
            Sounds["wizard_hurt"].play();
        }


        // Player's Normal behavior
        bhv_normal() {
            if (this.on_ground()) {
                actors.forEach(function(act) {
                    if (act != undefined) {
                        act.paused = false;
                    } 
                })
                this.behavior = this.bhv_spell;
                this.bhv_time = 0;
                if (this.bhv_time >= 40) {
                    this.behavior = this.bhv_spell;
                    this.bhv_time = 0;
                }
            } else {
                actors.forEach(function(act) {
                    if (act != undefined) {
                        act.paused = true;
                    } 
                })
                this.paused = false;
            }
        }
        

        // the Wizard casts a spell
        bhv_spell() {
            if (this.bhv_time == 1) {
                this.stance = Math.ceil(Math.random()*2);
                Sounds["spell3"].play();
            }
            if (this.bhv_time < 18) {
                let pp = [this.pos[0] + 32*Math.sin(this.bhv_time), this.pos[1] + 32*Math.cos(this.bhv_time) + 16 - 64 * this.stance];
                drawImage(Graphics["spell1"], pp);
            }
            if (this.bhv_time == 20) {
                let pp = [this.pos[0] + this.dir*32, this.pos[1] + 48 - 64 * this.stance];
                
                this.spell = new Spell(pp[0], pp[1], this.dir);
            }
            
            if (this.bhv_time >= 40) {
                this.behavior = this.bhv_warp;
                this.bhv_time = 0;
            }
        }


        // the Wizard teleports
        bhv_warp() {
            if (this.bhv_time == 10) {
                Sounds["warp2"].play();
            }
            if (this.bhv_time == 16 ) {
                let newx = 0;
                while (true) {
                    newx = Math.random() * 800 + 48;
                    if (Math.abs(playerInstance.pos[0] - newx) > 200) break;
                }
                this.pos[0] = newx;
            }


            if (this.bhv_time >= 40) {
                this.behavior = this.bhv_normal;
                this.bhv_time = 0;
            }
        }


        
        // Process a frame
        update() {
            this.dir = Math.sign(playerInstance.pos[0] - this.pos[0]);

            super.update(this);
            if (this.spell != undefined) {
                this.spell.update();
            }
        }

        
        // drawing code that is run every frame.
        doDraw(offset) {
            super.doDraw(offset);
            let pp = [this.pos[0] - 64 - offset, this.pos[1] - 256];
            let image = "wizard-";
            if (this.dir == 1){
                image+="r";
            } else {
                image+="l";
            }
            drawImage(Graphics[image], pp);
            if (this.spell != undefined) {
                this.spell.doDraw(offset);
            }
            // draw_window.
            for (let i=0; i < this.health; i+=1) { // hud
                drawImage(Graphics["wizard_health"], [canvas_element.width-40, 8 + i*32]);
            }
            
        }


        // Code to be run when an actor reaches 0 health
        onDeath() {
            update_score(80)
            change_map(map_victory);
        }
    }


    // A class that provides a hitbox and behavior for the wizards spells
    // Note: this and the following classes do not inherit actor.
    class Spell {
        constructor(posx = 0, posy = GROUND, dir) {
            this.pos = [posx, posy];
            this.width = 32;
            this.height = 32;
            this.dir = dir;
            this.life_time = 0;
            this.damage = 1.0;
        }


        // Process a frame
        update() {
            this.pos[0] += this.dir * 8.0;
            this.life_time++;
            check_hit(this, Player, this);
        }
        

        // drawing code that is run every frame.
        doDraw(offset) {
            let pp = [this.pos[0] - 16 - offset, this.pos[1] - 32];
            if ((this.life_time % 16) < 8) {
                drawImage(Graphics["spell1"], pp);
            } else {
                drawImage(Graphics["spell2"], pp);
            }
            // draw_context.fillStyle = "#f007"
            // draw_context.fillRect(hb_rect(this, 0),hb_rect(this, 1),this.width,this.height)
        }
    }


    // The class that draws the title
    class TitleCard {
        constructor() {
            this.grad1 = draw_context.createLinearGradient(0, 100, 0, 300);
            this.grad1.addColorStop(0, "#a00");
            this.grad1.addColorStop(0.4, "#fa7");

            this.grad2 = draw_context.createLinearGradient(0, 100, 0, 300);
            this.grad2.addColorStop(0, "#f00");
            this.grad2.addColorStop(1, "#700");
            this.health = 1.0;
        }


        // Process a frame
        update() {}


        // drawing code that is run every frame.
        doDraw() {
            draw_context.fillStyle = "#00007777";
            draw_context.fillRect(0,0, canvas_element.width,canvas_element.height);
            draw_context.lineWidth = 40;
            draw_context.lineJoin = "round";
            draw_context.textAlign = "center";
            draw_context.font = "70px Lemon";
            draw_context.strokeStyle = this.grad1;
            draw_context.strokeText("The Bane of", canvas_element.width/2, 150);
            draw_context.font = "160px Lemon";
            draw_context.strokeText("Gurnok", canvas_element.width/2, 260);
            
            draw_context.fillStyle = "#FA5";
            draw_context.font = "70px Lemon";
            draw_context.fillText("The Bane of", canvas_element.width/2, 150);
            draw_context.fillStyle = this.grad2;
            draw_context.font = "160px Lemon";
            draw_context.fillText("Gurnok", canvas_element.width/2, 260);
        }
    }


    // Class to display large fancy text
    class BigText {
        constructor(text, vertical = 260, color1 = "#0f0", color2 = "#ff0") {
            this.text = text;
            this.vertical = vertical;
            this.grad1 = draw_context.createLinearGradient(0, vertical-100, 0, vertical);
            this.grad1.addColorStop(0, color1);
            this.grad1.addColorStop(1, color2);
        }


        // Process a frame
        update() {}


        // drawing code that is run every frame.
        doDraw() {
            console.log("big game over");
            draw_context.fillStyle = "#000F";
            draw_context.fillRect(0,0, canvas_element.width,canvas_element.height);
            draw_context.lineWidth = 20;
            draw_context.lineJoin = "round";
            draw_context.textAlign = "center";
            draw_context.font = "80px Lemon";
            draw_context.strokeStyle = "#fff";
            draw_context.strokeText(this.text, canvas_element.width/2, this.vertical);
            draw_context.lineWidth = 10;
            draw_context.strokeStyle = "#000";
            draw_context.strokeText(this.text, canvas_element.width/2, this.vertical);
            
            draw_context.fillStyle = this.grad1;
            draw_context.fillText(this.text, canvas_element.width/2, this.vertical);
        }
    }


    // Class to display small ordinary text
    class SubText {
        constructor(text, vertical = 330) {
            this.text = text;
            this.vertical = vertical;
            this.health = 1.0;
        }


        // Process a frame
        update() {}


        // drawing code that is run every frame.
        doDraw() {
            draw_context.strokeStyle = "#000";
            draw_context.fillStyle = "#eee";
            draw_context.font = "40px Times";
            draw_context.lineWidth = 10;
            draw_context.strokeText(this.text, canvas_element.width/2, this.vertical);
            draw_context.fillText(this.text, canvas_element.width/2, this.vertical);
        }
    }


    // Class to display text and change the map when the user clicks
    class Continue {
        constructor(text,map) {
            function input(ev) {
                change_map(map);
                update_score(0);
                canvas_element.removeEventListener("click", input);
            }
            canvas_element.addEventListener("click", input);
            this.text = text;
            this.life_time = 0;
        }


        // Process a frame
        update() {
            this.life_time++;
        }


        // drawing code that is run every frame.
        doDraw() {
            let v = Math.min(Math.floor(Math.abs((this.life_time%120)-60.0)*(16/60)),15);
            draw_context.strokeStyle = "#000" + v.toString(16);
            draw_context.fillStyle = "#FFF" + v.toString(16);
            draw_context.font = "40px Times";
            draw_context.lineWidth = 10;
            draw_context.strokeText(this.text, canvas_element.width/2, 400);
            draw_context.fillText(this.text, canvas_element.width/2, 400);
        }
    }


    // the following functions are not to be called directly
    // initialize the title screen
    function map_title() {
        current_background = Graphics["background2"];
        actors.push( new TitleCard() );
        actors.push( new Continue("Click to play!", map_level1) );
        playerInstance = new Player(100);
        start_time = 0;
    }

    
    // initialize the title screen
    function map_trans_wis() {
        current_background = Graphics["background2"];
        actors.push( new BigText("Level 1 Complete") );
        actors.push( new SubText("Hmmm... Gurnok must be close.", 330) );
        actors.push( new Continue("Click to continue!", map_wizard1) );
    }


    // The win state
    function map_victory() {
        current_background = Graphics["background2"];
        actors.push( new BigText("Congratulations!", 200) );
        actors.push( new SubText("You have beaten the game.", 280) );
        actors.push( new SubText("Final Score: " + playerInstance.score + "    Play Time: " + get_time(), 330) );
        // actors.push( new Continue("Click to play again!", map_title) );
        modal_play_again.style.display = "block";
        start_time = 0;
        last_score_tracker.innerText = score_tracker.innerText;
        score_tracker.innerText = 0;
    }


    // The lose state
    function map_game_over() {
        current_background = Graphics["background2"];
        actors.push( new BigText("GAME OVER", 200, "#f00", "#f70") );
        actors.push( new SubText("Gurnok will regin again!", 270) );
        actors.push( new SubText("Final Score: " + playerInstance.score + "    Play Time: " + get_time(), 330) );
        // actors.push( new Continue("Click to retry", map_title) );
        modal_play_again.style.display = "block";
        start_time = 0;
        last_score_tracker.innerText = score_tracker.innerText;
        score_tracker.innerText = 0;
    }
    

    // Initialize level 1
    function map_level1() {
        start_time = Date.now();
        playerInstance.pos[0] = 300;
        playerInstance.dir = 1;
        actors.push( playerInstance );
        actors.push( new EnemyGoblin(800) );
        actors.push( new EnemyGoblin(1400) );
        actors.push( new EnemyGoblin(1425) );
        actors.push( new EnemyGoblin(1450) );
        actors.push( new EnemyGoblin(2200) );
        actors.push( new EnemyGoblin(2210) );
        actors.push( new EnemyGoblin(2220) );
        // actors.push( new EnemyWizard(100) );
        current_background = Graphics["background"];
        Sounds.bgm_play("level_music");
    }
    
    
    // Initialize wizzard map
    function map_wizard1() {
        playerInstance.pos[0] = 200;
        actors.push( playerInstance );
        actors.push( new EnemyGoblin(800) );
        actors.push( new EnemyWizard(700, -400) );
        current_background = Graphics["background2"];
        Sounds.bgm_play("wizard_music");
    }


    //this is how the previous few functions are called:
    // Transition to another map
    function change_map(map) {
        Sounds[Sounds.bgm].pause();
        actors = [];
        current_map = map;
        current_map();
    }


    // Update the game every frame, draw the scene, tell actors to draw themselves
    function loop() {
        play_time_tracker.innerText = get_time();
        let offset = 0;// How far everything should be scrolled horizontally.
        if (playerInstance != undefined) {
            offset = Math.min(Math.max(0, playerInstance.pos[0] - canvas_element.width/2), current_background.width - canvas_element.width);
        }
        
        drawImage(current_background, [-offset, 0]);

        // remove dead actors
        for (let i = actors.length-1; i >= 0; i--) {
            if (actors[i] != undefined && actors[i].health <= 0) {
                let actor = actors[i];
                console.log("name", actor.className);
                actors[i] = undefined;
                actor.onDeath();
            }
        }
        let gob_count = 0
        actors.forEach( function(actor) {
            if (actor != undefined && !actor.paused) {
                actor.update();
                if (actor instanceof EnemyGoblin) {
                    gob_count++;
                }
            }
        });

        if (gob_count == 0 && current_map == map_level1) {
            change_map(map_trans_wis);
        }

        actors.forEach( function(actor) {
            if (actor != undefined) {
                actor.doDraw(offset);
            }
        });
        
        setTimeout(loop, 1000/60);
    }

    
    // The equivalent of the main() entrypoint
    window.onload = function() {
        canvas_element = document.getElementById("display_window");
        draw_context = canvas_element.getContext("2d");
        change_map(map_title);
        setTimeout(loop, 1000/60);
        play_time_tracker = document.getElementById("playtime");
        score_tracker = document.getElementById("score");
        last_score_tracker = document.getElementById("lastscore");
        modal_play_again = document.getElementById("play_again");
        document.getElementById("btn_again").onclick = function() {
            change_map(map_title);
            update_score(0);
            modal_play_again.style.display = "none";
        }
    }
}())
