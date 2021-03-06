'use strict';

/*
 * scoutnextroom is called when the number of rooms is < possible rooms
 *
 * Random walk to find a room with 'threshold' distance and two sources.
 * Claims the controller and room revive will drop in.
 */

roles.scoutnextroom = {};

roles.scoutnextroom.getPartConfig = function(room, energy, heal) {
  var parts = [MOVE, CLAIM];
  return room.getPartConfig(energy, parts);
};

roles.scoutnextroom.energyBuild = function(room, energy) {
  return 650;
};

roles.scoutnextroom.execute = function(creep) {
  if (creep.memory.claimRoom) {
    creep.moveTo(creep.room.controller);
    let returnCode = creep.claimController(creep.room.controller);
    if (returnCode == OK) {
      delete Memory.next_room;
      creep.suicide();
    }
    return true;
  }

  if (!creep.memory.target || creep.memory.target === null || creep.memory.target.roomName != creep.room.name) {
    let hostileCreeps = creep.room.getEnemys();

    let opponentRoom = hostileCreeps.length > 0;
    if (creep.room.name != creep.memory.base) {
      opponentRoom = opponentRoom || (creep.room.controller && creep.room.controller.my);

      // TODO No way to controller doesn't mean it is an opponentRoom
      //      if (creep.room.controller) {
      //        var path = creep.pos.findPathTo(creep.room.controller.pos);
      //        if (path.length === 0) {
      //          creep.log('Can not find way to controller');
      //          opponentRoom = true;
      //        } else {
      //
      //          let lastPos = path[path.length - 1];
      //          if (!creep.room.controller.pos.isEqualTo(lastPos.x, lastPos.y)) {
      //            creep.log('Can not find way to controller');
      //            opponentRoom = true;
      //          }
      //        }
      //      }
    }

    let checkNewRoom = function(creep, opponentRoom) {
      if (creep.room.name == creep.memory.base) {
        return false;
      }

      if (opponentRoom) {
        return false;
      }

      var targets = [];
      if (!creep.room.controller) {
        creep.log('No controller');
        return false;
      }
      var sources = creep.room.find(FIND_SOURCES);
      if (sources.length < 2) {
        creep.log('Not enought sources');
        return false;
      }

      for (let roomName of Memory.myRooms) {
        let distance = Game.map.getRoomLinearDistance(creep.room.name, roomName);
        if (distance < config.nextRoom.minNewRoomDistance) {
          creep.log('To close to: ' + roomName + ' ' + distance);
          return false;
        }
      }

      creep.memory.claimRoom = true;
      creep.moveTo(creep.room.controller.pos);
      creep.log('claim');
      return true;
    };

    if (checkNewRoom(creep, opponentRoom)) {
      return true;
    }
    var exits = Game.map.describeExits(creep.room.name);

    let handleTarget = function(creep, exits) {
      var offset = Math.floor(Math.random() * 4);

      if (!creep.memory.base) {
        return false;
      }

      for (var i = 0; i < 4; i++) {
        // Don't go back
        var direction = (((offset + i) % 4) * 2) + 1;
        if (direction == (creep.memory.dir + 4) % 8) {
          continue;
        }

        var roomName = exits[direction];
        if (typeof(roomName) == 'undefined') {
          continue;
        }

        var exit = creep.room.findExitTo(roomName);
        if (exit == -2) {
          continue;
        }

        var exit_pos = creep.pos.findClosestByPath(exit, {
          ignoreCreeps: true
        });

        if (!exit_pos) {
          continue;
        }

        var route = Game.map.findRoute(creep.memory.base, roomName);
        var max_route = 10;
        if (route.length > max_route) {
          continue;
        }

        // Way blocked
        let search = PathFinder.search(
          creep.pos,
          exit_pos, {
            maxRooms: 1
          });
        if (search.incomplete) {
          continue;
        }

        creep.memory.target = exit_pos;
        creep.memory.dir = direction;
        return true;
      }
      return false;
    };

    if (opponentRoom || !handleTarget(creep, exits)) {
      // Go back, no other way
      if (!creep.memory.dir) {
        creep.memory.dir = Math.floor(Math.random() * 8);
      }
      var roomName = exits[(creep.memory.dir + 4) % 8];
      if (!roomName) {
        creep.memory.dir = Math.floor(Math.random() * 8);
      }
      var exit_to = creep.room.findExitTo(roomName);
      var exit = creep.pos.findClosestByRange(exit_to);
      creep.memory.target = exit;
      creep.memory.dir = (creep.memory.dir + 4) % 8;
    }
  }

  let targetPosObject;
  try {
    targetPosObject = new RoomPosition(creep.memory.target.x, creep.memory.target.y, creep.room.name);
  } catch (e) {
    creep.log(JSON.stringify(creep.memory));
    throw e;
  }
  let search = PathFinder.search(
    creep.pos, {
      pos: targetPosObject,
      range: 1
    }, {
      // TODO Can prevent the creep move through the room (base: W1N7, room: W2N7, private server)
      roomCallback: creep.room.getAvoids(creep.room, {
        //        pos: targetPosObject,
        scout: true
      }),
      maxRooms: 1
    }
  );

  if (search.incomplete || search.path.length === 0) {
    creep.say('incomplete');
    creep.moveTo(targetPosObject);
    return true;
  }
  creep.say(creep.pos.getDirectionTo(search.path[0]));
  let returnCode = creep.move(creep.pos.getDirectionTo(search.path[0]));
};
