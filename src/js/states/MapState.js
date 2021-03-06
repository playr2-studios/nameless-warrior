import GLOBALS from '../core/Globals';
import config from 'config';
import Character from '../game/Character';
import Map from '../game/Map';
import Dialog from '../game/Dialog';
import Utils from '../core/Utils';

export default class MapState extends Phaser.State {
  init(options) {
    this.player = null;

    this.game.stage.smoothing = false;

    $(window).unbind('keydown');

    if(!this.isCity) {
      this.enemies = [];

      this.music = this.game.add.audio(GLOBALS.MUSICS.SAD_DESCENT);
      this.music.loop = true;
    } else {
      this.npcs = [];

      this.music = this.game.add.audio(GLOBALS.MUSICS.SAD_TOWN);
      this.music.loop = true;
    }

    this.options = options;

    this.$overlayLoading = $('.game__wrapper__overlay--loading');
    this.$overlayLoading.removeClass('active');

    this.$overlayDead = $('.game__wrapper__overlay--grey');
    this.$overlayDead.removeClass('active');

    this.$saveText = $('.game-menu__message');

    this.$gameTimeHours = $('.game__time-hours');
    this.$gameTimeMinutes = $('.game__time-minutes');
    this.$gameTimeType = $('.game__time-type');
    this.$overlayNight = $('.game__wrapper__overlay--night');

    this.$saveBtn = $('.game-menu__save-btn');
    this.$autoSaveCheckbox = $('.game__option--autosave');
    this.autoSave = (localStorage.getItem('NWarriorAutoSave') === 'true');

    this.$saveBtn.unbind('click');

    this.musicOn = (localStorage.getItem('NWarriorMusic') === 'true');
    this.$musicCheckbox = $('.game__option--music');

    this.controlsOn = (localStorage.getItem('NWarriorControls') === 'true');
    this.$controlsCheckbox = $('.game__option--controls');

    this.$autoSaveCheckbox.prop('checked', this.autoSave);
    this.$musicCheckbox.prop('checked', this.musicOn);
    this.$controlsCheckbox.prop('checked', this.controlsOn);

    if(this.musicOn) {
      if(this.music) {
        this.music.volume = 0.3;
        this.music.play();
      }
    }

    this.shouldChangeMap = true;
    this.deadDialog = false;

    this.playerPositionThreshold = 32;
  }

  create() {
    this.debug = false;

		this.game.time.advancedTiming = true;

    this.map = new Map(this.game, {map: this.mapName, isHouse: this.isHouse, isCity: this.isCity});

    this.playerPosition = this.getPlayerPosition();

    this.playerFirstPosition = this.playerPosition;

    this.player = new Character(this.game, this.options.characterData, GLOBALS.PLAYER, this.playerPosition.x, this.playerPosition.y, this.map);

    this.handleTime();

    if(this.options.previousMap) {
      this.player.turnSprite(this.playerInitialDirection);
    }

    if(!this.isCity) {
      this.setupEnemies();
    }

    this.map.renderLastLayer();

    this.addMapTransitions();

    this.bind();

    if(!this.player.firstDialog) {
      this.welcome = new Dialog(
        {
          lines: [
            "Welcome to the ruthless, desolated and cute world of <strong>Nameless Warrior Beta</strong>!",
            "If you have any suggestions or want to report any bug, please send me an email :D (andresan2006@gmail.com)",
            "Go to the <strong>Status</strong> menu to see your character status. Go to <strong>Help</strong> to see the keyboard controls and the description of the status"
          ]
        },
        () => {
          this.player.firstDialog = true;
        }
      );
    }
  }

  setupEnemies() {
    const enemyStrength = (this.player.characterClass === GLOBALS.ARCHER) ? 10 : 6;

    this.enemies.push(new Character(this.game, {characterClass: GLOBALS.ENEMIES.SLIME, isHostile: true, health: 70, currentHealth: 70, strength: enemyStrength, dexterity: 5}, GLOBALS.ENEMY, 450, 450, this.map));
    this.enemies.push(new Character(this.game, {characterClass: GLOBALS.ENEMIES.MUSHROOM, isHostile: true, health: 70, currentHealth: 70, strength: enemyStrength, dexterity: 5}, GLOBALS.ENEMY, 150, 150, this.map));
    this.enemies.push(new Character(this.game, {characterClass: GLOBALS.ENEMIES.SLIME, isHostile: true, health: 70, currentHealth: 70, strength: enemyStrength, dexterity: 5}, GLOBALS.ENEMY, 450, 950, this.map));
    this.enemies.push(new Character(this.game, {characterClass: GLOBALS.ENEMIES.MUSHROOM, isHostile: true, health: 70, currentHealth: 70, strength: enemyStrength, dexterity: 5}, GLOBALS.ENEMY, 550, 350, this.map));
    this.enemies.push(new Character(this.game, {characterClass: GLOBALS.ENEMIES.SLIME, isHostile: true, health: 70, currentHealth: 70, strength: enemyStrength, dexterity: 5}, GLOBALS.ENEMY, 750, 950, this.map));

    if(this.player.characterClass === GLOBALS.ARCHER) {
      this.enemies.push(new Character(this.game, {characterClass: GLOBALS.ENEMIES.MUSHROOM, isHostile: true, health: 70, currentHealth: 70, strength: enemyStrength, dexterity: 5}, GLOBALS.ENEMY, 250, 650, this.map));
    }
  }

	update() {
    if(!this.isCity) {
      if(this.player.characterClass === GLOBALS.ARCHER) {
        for (let arrow in this.player.arrows) {
          if(this.player.arrows[arrow] !== null) {
            this.game.physics.arcade.collide(this.player.arrows[arrow].object, this.enemies, (player, enemy) => {
              player = (player.key === "arrow") ? this.player : player;

              this.player.arrows[arrow].object.destroy();
              this.player.arrows[arrow].destroyed = true;

              this.collisionHandler(player, enemy);
            });
          }
        }
      } else {
        this.game.physics.arcade.collide(this.player, this.enemies, this.collisionHandler);
      }
    }

    if(this.player) {
      this.game.physics.arcade.collide(this.player, this.map.collideLayer);
      this.game.physics.arcade.collide(this.player, this.map.groundLayer);
    }

    if(this.enemies) {
      for (let key in this.enemies) {
        if(this.enemies[key].alive) {
          this.game.physics.arcade.collide(this.enemies[key], this.map.collideLayer);

          this.enemies[key].checkPlayerPosition(this.player);
        }
      }
    }

    if(this.npcs) {
      this.game.physics.arcade.collide(this.player, this.npcs);

      for (let key in this.npcs) {
        this.npcs[key].checkPlayerPosition(this.player);

        if(this.npcs[key].playerAside) {
          this.npcAside = this.npcs[key];
        } else {
          this.npcAside = null;
        }
      }
    }

    if(!this.deadDialog && !this.player.alive) {
      this.$overlayDead.addClass('active');

      if(this.enemies) {
        for (let key in this.enemies) {
          clearInterval(this.enemies[key].randomWalkInterval);
          this.enemies[key].kill();
        }
      }

      this.deadDialog = new Dialog(
        {
          lines: [
            "You are dead! Like everything else in your life, you have failed!"
          ]
        },
        () => {
          this.player.currentHealth = this.player.health;
          this.player.saveCharacterStatus(this.mapName, () => {
            setTimeout(() => {
              this.changeMap('UselessCity', GLOBALS.DIRECTIONS.UP, 0, {x: 300, y: 300});
            }, 1000);
          });
        }
      );
    }
	}

	render() {
    this.game.debug.text('fps: '+this.game.time.fps || '--', 35, 20, "#fff");

    if(this.player && this.debug) {
        this.game.debug.bodyInfo(this.player, 32, 32);
        this.game.debug.body(this.player);
    }

    if(this.enemies && this.debug) {
      for (let key in this.enemies) {
        const enemy = this.enemies[key];

        this.game.debug.body(enemy);
      }
    }
	}

  getPlayerPosition() {
    if(this.options.previousMap) {
      let initialPosition = 0,
          position;

      if(this.options.firstPositionThreshold) {
        initialPosition += this.options.firstPositionThreshold;
      }

      switch(this.options.enterDirection) {
        case GLOBALS.DIRECTIONS.UP:
          this.playerInitialDirection = GLOBALS.DIRECTIONS.UP;
          position = {x: this.options.playerLastPosition.x + 16, y: initialPosition}

          break;

        case GLOBALS.DIRECTIONS.DOWN:
          this.playerInitialDirection = GLOBALS.DIRECTIONS.DOWN;
          position =  {x: this.options.playerLastPosition.x + 16, y: this.map.tilemap.heightInPixels - initialPosition}

          break;

        case GLOBALS.DIRECTIONS.LEFT:
          this.playerInitialDirection = GLOBALS.DIRECTIONS.RIGHT;
          position = {x: initialPosition, y: this.options.playerLastPosition.y + 16}

          break;

        case GLOBALS.DIRECTIONS.RIGHT:
          this.playerInitialDirection = GLOBALS.DIRECTIONS.LEFT;
          position = {x: this.map.tilemap.widthInPixels - initialPosition, y: this.options.playerLastPosition.y + 16}

          break;
      }

      if(this.options.enterPosition) {
        return this.options.enterPosition;
      } else {
        return position;
      }
    } else {
      if(this.options.characterData.lastPositionX !== 0) {
        return {x: this.options.characterData.lastPositionX, y: this.options.characterData.lastPositionY};
      } else {
        return {x: 300, y: 300};
      }
    }
  }

  collisionHandler(player, enemy) {
    if(player.attacking || player.characterClass === GLOBALS.ARCHER) {
      enemy.receiveAttack(player);
    }
  }

  bind() {
    this.$helpLink = $('[data-target="#formbox-help"]');
    this.$statusLink = $('[data-target="#formbox-status"]');

    this.saveCharacterInterval = setInterval(() => {
      if(this.autoSave) {
        this.player.saveCharacterStatus(this.mapName, () => {
          this.$saveText.removeClass('hide');

          setTimeout(() => {
            this.$saveText.addClass('hide');
          }, 3000);
        });
      }
    }, 10000);

    this.player.updateCharacterStatusFormbox();

    this.$saveBtn.on('click', () => {
      this.player.saveCharacterStatus(this.mapName, () => {
        this.$saveText.removeClass('hide');

        setTimeout(() => {
          this.$saveText.addClass('hide');
        }, 3000);
      });
    });

    this.$autoSaveCheckbox.change((e) => {
      if(this.$autoSaveCheckbox.is(':checked')) {
        this.autoSave = true;
        localStorage.setItem('NWarriorAutoSave', true);
      } else {
        this.autoSave = false;
        localStorage.setItem('NWarriorAutoSave', false);
      }
    });

    this.$controlsCheckbox.change((e) => {
      if(this.$controlsCheckbox.is(':checked')) {
        this.controlsOn = true;
        localStorage.setItem('NWarriorControls', true);
      } else {
        this.controlsOn = false;
        localStorage.setItem('NWarriorControls', false);
      }
    });

    this.$musicCheckbox.change((e) => {
      if(this.$musicCheckbox.is(':checked')) {
        this.musicOn = true;
        localStorage.setItem('NWarriorMusic', true);

        if(this.music) {
          this.music.play();
        }
      } else {
        this.musicOn = false
        localStorage.setItem('NWarriorMusic', false);

        if(this.music) {
          this.music.stop();
        }
      }

    });

    this.timeInverval = setInterval(() => {
      this.handleTime();
    }, 5000);

    $(window).on('keydown', ev => {
      const key = ev.keyCode,
            actionKey = (this.controlsOn) ? GLOBALS.KEY_CODES.L : GLOBALS.KEY_CODES.A;

      switch(key) {
        case actionKey:
          if(!this.isCity) {
            if(!this.player.attacking) {
              this.player.attack();
            }
          } else if(this.npcAside && !this.npcAside.talking) {
            this.npcAside.talk(this.player);
          }

          break;

        case GLOBALS.KEY_CODES.ONE:
          this.$statusLink.click();

          break;

        case GLOBALS.KEY_CODES.TWO:
          this.$helpLink.click();

          break;
      }
    });
  }

  addMapTransitions() {
    this.willChangeMap = false;
  }

  killDialogs() {
    if(this.welcome) {
      this.welcome.kill();
    }

    if(this.deadDialog) {
      this.deadDialog.kill();
    }

    for (let key in this.npcs) {
      if(this.npcs[key].talking) {
        this.npcs[key].talking.kill();
      }
    }
  }

  changeMap(state, enterDirection, threshold, enterPosition) {
    if(!this.shouldChangeMap) {return;}

    this.killDialogs();

    setTimeout(() => {
      this.$overlayLoading.addClass('active');
      this.$overlayNight.removeClass('active');
      this.$overlayDead.removeClass('active');
    }, 50);

    this.shouldChangeMap = false;
    this.autoSave = false;

    this.player.saveCharacterStatus(this.mapName, () => {
      if(this.music) {
        this.music.stop();
        this.music = null;
      }

      clearInterval(this.saveCharacterInterval);
      clearInterval(this.timeInverval);

      for (let key in this.enemies) {
        clearInterval(this.enemies[key].randomWalkInterval);
      }

      const playerCurrentPosition = {
        x: this.player.body.x,
        y: this.player.body.y
      }

      if(!this.willChangeMap) {
        this.willChangeMap = true;

        const characterId = localStorage.getItem('NWarriorCharID'),
              url = config.apiURL+'characters/'+characterId,
              data = {};

        data.token = localStorage.getItem('NWarriorToken');

        $.ajax({
          type: "get",
          url: url,
          data: data,
          success: (data) => {
            data.classNumber = data.characterClass;
      	    data.characterClass = Utils.formatClass(data.characterClass);

            const options = {
              characterData: data,
              previousMap: this.mapName,
              enterDirection: enterDirection,
              enterPosition: enterPosition,
              playerLastPosition: playerCurrentPosition,
              firstPositionThreshold: threshold
            }

            setTimeout(() => {
              this.game.state.start(state, true, false, options);
            }, 100);
          }
        });
      }
    });
  }

  handleTime() {
    const hours = Utils.addZero(this.player.gameTimeHours),
          minutes = Utils.addZero(this.player.gameTimeMinutes),
          date = new Date();

    date.setUTCHours(hours);
    date.setUTCMinutes(minutes);

    date.setUTCMinutes(date.getUTCMinutes() + 5);

    this.player.gameTimeHours = Utils.addZero(date.getUTCHours());
    this.player.gameTimeMinutes = Utils.addZero(date.getUTCMinutes());

    this.$gameTimeHours.html(this.player.gameTimeHours);
    this.$gameTimeMinutes.html(this.player.gameTimeMinutes);
    this.$gameTimeType.html((this.player.gameTimeHours >= 12) ? 'PM' : 'AM');

    if(!this.isHouse) {
      this.setNightOverlay(this.player.gameTimeHours);
    }
  }

  setNightOverlay(hours) {
    if(hours >= 18 || hours <= 6) {
      this.$overlayNight.addClass('active');

      if(!this.isHouse) {
        let opacity;

        if(hours == 18) {
          opacity = 0.25;
        } else if(hours == 19) {
          opacity = 0.40;
        } else if (hours >= 20 || (hours >= 0 && hours <= 4)) {
          opacity = 0.65;
        } else if (hours == 5 || hours == 6) {
          opacity = 0.35;
        }

        this.$overlayNight.css('opacity', opacity);
      }
    } else {
      this.$overlayNight.removeClass('active');
    }
  }
}
